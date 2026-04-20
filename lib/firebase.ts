import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALkiGfz5VZ3pZbjTKi-MOIShnRgT7cs3I",
  authDomain: "flashcards-app-73917.firebaseapp.com",
  projectId: "flashcards-app-73917",
  storageBucket: "flashcards-app-73917.firebasestorage.app",
  messagingSenderId: "78835887404",
  appId: "1:78835887404:web:7145628e95c0273003d089"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);