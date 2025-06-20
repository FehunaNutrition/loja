// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2Jb52gjMxgsTberU4agAsUha0reSPn1Y",
  authDomain: "fehunanutrition-66517.firebaseapp.com",
  projectId: "fehunanutrition-66517",
  storageBucket: "fehunanutrition-66517.firebasestorage.app",
  messagingSenderId: "451850993095",
  appId: "1:451850993095:web:d5775071d829a087fcede2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
