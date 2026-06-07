import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "",
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app, auth;

if (isFirebaseConfigured) {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Pre-warm: authStateReady() returns a Promise that resolves once Firebase
  // has checked its local token cache and established its internal state.
  // WHY: signInWithPopup has a ~200–400ms cold start the first time it runs
  // because the SDK lazily initialises its auth state. Calling authStateReady()
  // at module load (not on click) moves that work to page-load time so the
  // popup opens instantly when the user actually clicks "Sign in with Google".
  // We intentionally do not await — this is a fire-and-forget warm-up.
  auth.authStateReady().catch(() => {});
} else {
  console.warn('[Firebase] Not configured — running in dev mode. OTP will be simulated.');
  auth = null;
}

// Pre-create the GoogleAuthProvider at module level so it's instantiated once,
// not on every click. Also configure it here:
//   - prompt: 'select_account' forces the account picker to show immediately
//     instead of waiting for Google to silently check if the user is already signed in.
//     This removes the visible "checking..." delay users see before the picker appears.
const _googleProvider = isFirebaseConfigured ? (() => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
})() : null;

export { auth, isFirebaseConfigured };

// Phone auth: send OTP
export async function sendPhoneOtp(phone, recaptchaContainerId) {
  if (!isFirebaseConfigured) {
    console.log(`[DEV] OTP sent to ${phone} — use any 6-digit code`);
    return { verificationId: `dev:${phone}`, dev: true };
  }
  const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
  const result = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);
  return result;
}

// Phone auth: verify OTP and get Firebase token
export async function verifyPhoneOtp(confirmationResult, otp) {
  if (confirmationResult.dev) {
    const phone = confirmationResult.verificationId.replace('dev:', '');
    return { token: `dev:${phone}`, dev: true };
  }
  const result = await confirmationResult.confirm(otp);
  const token = await result.user.getIdToken();
  return { token };
}

// Google Sign-In — uses the pre-warmed provider instance
export async function signInWithGoogle() {
  if (!isFirebaseConfigured) {
    return { token: 'dev-google:demo@autospace.in', dev: true };
  }
  // _googleProvider is pre-created at module load with prompt:'select_account'
  const result = await signInWithPopup(auth, _googleProvider);
  const token  = await result.user.getIdToken();
  return { token, user: result.user };
}
