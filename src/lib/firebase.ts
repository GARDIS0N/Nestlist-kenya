import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Config from provisioned project settings
const firebaseConfig = {
  apiKey: "AIzaSyCPAyl457-pdMvGCKn5EoSzUkCr52v_k_0",
  authDomain: "nestlist-kenya.firebaseapp.com",
  projectId: "nestlist-kenya",
  storageBucket: "nestlist-kenya.firebasestorage.app",
  messagingSenderId: "563580343799",
  appId: "1:563580343799:web:0583c27512fb13b8664af2",
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
