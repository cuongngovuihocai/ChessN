import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCs4cyVBv6pabEyqQQMA9dLkOLEh-w3VHQ",
  authDomain: "onlinegame-8851b.firebaseapp.com",
  projectId: "onlinegame-8851b",
  storageBucket: "onlinegame-8851b.firebasestorage.app",
  messagingSenderId: "154008063774",
  appId: "1:154008063774:web:e025bbfa5a8486f05f030f",
  databaseURL: "https://onlinegame-8851b-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
