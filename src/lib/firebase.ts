import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Config from provisioned project settings
const firebaseConfig = {
  apiKey: "AIzaSyC4oynTUkONN2dkKULz0lOpIteo2qNNC9E",
  authDomain: "just-contact-stgzl.firebaseapp.com",
  projectId: "just-contact-stgzl",
  storageBucket: "just-contact-stgzl.firebasestorage.app",
  messagingSenderId: "678864359997",
  appId: "1:678864359997:web:a4b380d1d72b4a1a1f1054"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific database ID if provided
export const db = getFirestore(app, "ai-studio-0db50271-c777-4020-802f-ade8ccbfc976");

export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
