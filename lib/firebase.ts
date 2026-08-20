import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDK-MXg8s6EBQuH4Il7miNLN1bQkiXUXeU",
  authDomain: "centralzapi.firebaseapp.com",
  projectId: "centralzapi",
  storageBucket: "centralzapi.firebasestorage.app",
  messagingSenderId: "1053898999297",
  appId: "1:1053898999297:web:cb2914f5ac346976da2200",
  measurementId: "G-LN98L8WLQ9"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
