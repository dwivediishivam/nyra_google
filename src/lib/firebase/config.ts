
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

// This function is written to be callable on both the client and server.
function initializeFirebase() {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const allVarsDefined = Object.values(firebaseConfig).every(val => val);

    if (!allVarsDefined) {
        console.warn("Firebase environment variables are not fully configured. Firebase services will be unavailable. Please check your .env.local file.");
        return { app: {} as FirebaseApp, db: {} as Firestore, auth: {} as Auth };
    }

    try {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(app);
        const auth = getAuth(app);
        return { app, db, auth };
    } catch (e) {
        console.error('Failed to initialize Firebase', e);
        return { app: {} as FirebaseApp, db: {} as Firestore, auth: {} as Auth };
    }
}

const { app, db, auth } = initializeFirebase();

export { app, db, auth };
