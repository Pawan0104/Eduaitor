# EduAItor / Capacitor R8 keep rules
# https://developer.android.com/topic/performance/app-optimization/enable-app-optimization

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Capacitor v3+ plugins
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Capacitor v2 (legacy)
-keep @com.getcapacitor.NativePlugin public class * {
    @com.getcapacitor.PluginMethod public <methods>;
}

# Cordova plugins (if any)
-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}
-dontwarn org.apache.cordova.**

# Main activity
-keep class eduaitor.app.MainActivity { *; }

# AndroidX / WebView
-keep class androidx.webkit.** { *; }
-dontwarn androidx.webkit.**
