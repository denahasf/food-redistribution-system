import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDJNPRzAHenoKoM3OWDjHgwJEgl36YRZeM",
  authDomain: "food-redistribution-app-5575f.firebaseapp.com",
  projectId: "food-redistribution-app-5575f",
  storageBucket: "food-redistribution-app-5575f.firebasestorage.app",
  messagingSenderId: "168325780357",
  appId: "1:168325780357:web:540ce33fe3e53ca71faaec",
  measurementId: "G-3RP9STS21F",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
