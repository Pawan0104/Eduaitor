/**
 * Device biometric login helpers (Capacitor Android / iOS only).
 * Credentials are stored in the OS Keystore / Keychain after fingerprint/face enroll.
 */
import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

const SERVER = "eduaitor.app.login";
const META_KEY = "eduaitor_biometric_meta";

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeMeta(meta) {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    // ignore
  }
}

export async function getBiometricAvailability() {
  if (!isNativeApp()) {
    return { isAvailable: false, hasCredentials: false, biometryType: 0 };
  }
  try {
    const avail = await NativeBiometric.isAvailable();
    let hasCredentials = false;
    try {
      const saved = await NativeBiometric.isCredentialsSaved({ server: SERVER });
      hasCredentials = Boolean(saved?.isSaved ?? saved);
    } catch {
      hasCredentials = Boolean(readMeta()?.enabled);
    }
    return {
      isAvailable: Boolean(avail?.isAvailable),
      hasCredentials,
      biometryType: avail?.biometryType || 0,
      strongBiometryIsAvailable: Boolean(avail?.strongBiometryIsAvailable),
    };
  } catch {
    return { isAvailable: false, hasCredentials: false, biometryType: 0 };
  }
}

/**
 * After a successful password login, store credentials for biometric unlock.
 */
export async function enableBiometricLogin({
  username,
  password,
  portal,
  schoolId = null,
  mode = "other",
}) {
  if (!isNativeApp()) return false;
  const user = String(username || "").trim();
  const pass = String(password || "");
  if (!user || !pass) return false;

  const avail = await NativeBiometric.isAvailable();
  if (!avail?.isAvailable) {
    throw new Error("Biometric authentication is not available on this device");
  }

  await NativeBiometric.verifyIdentity({
    reason: "Confirm to enable biometric login on this device",
    title: "Enable biometric login",
    subtitle: "Eduaitor",
    description: "Use your fingerprint or face to unlock next time",
    negativeButtonText: "Cancel",
  });

  await NativeBiometric.setCredentials({
    username: user,
    password: pass,
    server: SERVER,
  });

  writeMeta({
    enabled: true,
    portal: portal || "staff",
    schoolId: schoolId || null,
    mode: mode || "other",
    username: user,
  });
  return true;
}

export async function disableBiometricLogin() {
  if (!isNativeApp()) return;
  try {
    await NativeBiometric.deleteCredentials({ server: SERVER });
  } catch {
    // ignore
  }
  writeMeta(null);
}

/**
 * Prompt biometric unlock and return { username, password, portal, schoolId, mode }.
 */
export async function unlockWithBiometric() {
  if (!isNativeApp()) {
    throw new Error("Biometric login is only available in the mobile app");
  }

  const avail = await NativeBiometric.isAvailable();
  if (!avail?.isAvailable) {
    throw new Error("Biometric authentication is not available");
  }

  await NativeBiometric.verifyIdentity({
    reason: "Log in to Eduaitor",
    title: "Biometric login",
    subtitle: "Eduaitor",
    description: "Verify your identity to continue",
    negativeButtonText: "Cancel",
  });

  const credentials = await NativeBiometric.getCredentials({ server: SERVER });
  const meta = readMeta() || {};
  if (!credentials?.username || !credentials?.password) {
    throw new Error("No saved biometric credentials. Sign in with password once.");
  }

  return {
    username: credentials.username,
    password: credentials.password,
    portal: meta.portal || "staff",
    schoolId: meta.schoolId || null,
    mode: meta.mode || "other",
  };
}

export function biometricLabel(biometryType) {
  // Capgo BiometryType: 0 NONE, 1 TOUCH_ID, 2 FACE_ID, 3 FINGERPRINT, 4 FACE_AUTHENTICATION, 5 IRIS
  if (biometryType === 2 || biometryType === 4) return "Face unlock";
  if (biometryType === 1 || biometryType === 3) return "Fingerprint";
  if (biometryType === 5) return "Iris unlock";
  return "Biometric login";
}
