# Build a debug APK for Eduaitor (Capacitor + Android)
# Prerequisites: JDK 17+, Android SDK (via Android Studio), ANDROID_HOME set
#
# Default: loads LIVE Netlify site (git push → Netlify deploy → app updates, no rebuild)
# Offline / store-style bundle:  .\scripts\build-apk.ps1 -Offline

param(
  [switch]$Offline
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$LiveUrl = "https://admineduaitor.netlify.app"
$ConfigPath = Join-Path $Root "capacitor.config.json"

# Prefer Microsoft OpenJDK 21 (Capacitor 7), then 17
$jdk = Get-ChildItem "C:\Program Files\Microsoft\jdk-21*" -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $jdk) {
  $jdk = Get-ChildItem "C:\Program Files\Microsoft\jdk-17*" -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
}
if ($jdk) {
  $env:JAVA_HOME = $jdk.FullName
  $env:Path = "$($jdk.FullName)\bin;$env:Path"
  Write-Host "JAVA_HOME=$($env:JAVA_HOME)"
}

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path $defaultSdk) {
    $env:ANDROID_HOME = $defaultSdk
    $env:ANDROID_SDK_ROOT = $defaultSdk
  }
}

if (-not $env:ANDROID_HOME) {
  Write-Error @"
ANDROID_HOME is not set and SDK not found at %LOCALAPPDATA%\Android\Sdk.

1) Install Android Studio
2) Open it once → More Actions → SDK Manager → install Android SDK
3) Re-run this script
"@
}

$localProps = Join-Path $Root "android\local.properties"
$sdkEscaped = $env:ANDROID_HOME.Replace("\", "\\")
"sdk.dir=$sdkEscaped" | Set-Content -Path $localProps -Encoding ASCII

# Ensure capacitor.config matches live vs offline mode
$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
if (-not $config.server) {
  $config | Add-Member -NotePropertyName server -NotePropertyValue ([pscustomobject]@{}) -Force
}
if ($Offline) {
  Write-Host "==> OFFLINE mode: bundling local dist (no live URL)"
  if ($config.server.PSObject.Properties.Name -contains "url") {
    $config.server.PSObject.Properties.Remove("url")
  }
} else {
  Write-Host "==> LIVE mode: app will load $LiveUrl"
  $config.server | Add-Member -NotePropertyName url -NotePropertyValue $LiveUrl -Force
  $config.server | Add-Member -NotePropertyName cleartext -NotePropertyValue $false -Force
  $config.server | Add-Member -NotePropertyName androidScheme -NotePropertyValue "https" -Force
  $config.server | Add-Member -NotePropertyName allowNavigation -NotePropertyValue @(
    "admineduaitor.netlify.app",
    "*.netlify.app",
    "eduaitor-api.onrender.com"
  ) -Force
}
$config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8

Write-Host "==> Building web assets (mode=apk)..."
npm run build:apk

Write-Host "==> Syncing Capacitor Android..."
npx cap sync android

Write-Host "==> Assembling debug APK..."
Set-Location (Join-Path $Root "android")
.\gradlew.bat assembleDebug --no-daemon

$apk = Join-Path $Root "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
  Copy-Item -Force $apk (Join-Path $Root "eduaitor.apk")
  Write-Host ""
  Write-Host "APK ready:"
  Write-Host $apk
  Write-Host (Join-Path $Root "eduaitor.apk")
  if (-not $Offline) {
    Write-Host ""
    Write-Host "This APK loads the live site. After you push to git and Netlify finishes,"
    Write-Host "force-close and reopen the app (or pull-to-refresh) - no reinstall needed."
  }
} else {
  Write-Error "APK not found after build."
}
