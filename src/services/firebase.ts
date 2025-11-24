// src/services/firebase.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // Removed connectFirestoreEmulator
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'; 

const firebaseConfig = {
    apiKey: "AIzaSyDpERMUEG6z7JsFuz-0K_106v5pZamLSVk",
    authDomain: "fmyd-circular-eco-registration.firebaseapp.com",
    projectId: "fmyd-circular-eco-registration",
    storageBucket: "fmyd-circular-eco-registration.firebasestorage.app",
    messagingSenderId: "75870394524",
    appId: "1:75870394524:web:98ec8481ac5f5820a87559",
    measurementId: "G-0NNZQMP7TB"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// ✅ KEEP THIS BLOCK UNCOMMENTED AND ACTIVE.
// It uses your reCAPTCHA site key for production and automatically uses 
// the debug token for local development (since you registered it).
if (typeof window !== 'undefined') {
    try {
        // // 🚨 ADD THIS LINE TEMPORARILY TO PRINT THE TOKEN 🚨
        // (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider('6LdnMKYrAAAAABFmUxHLpIv9VagA73xNakZmWp_i'), 
            isTokenAutoRefreshEnabled: true 
        });
        console.log("App Check active.");
    } catch (e) {
        console.error("App Check initialization failed:", e);
    }
}