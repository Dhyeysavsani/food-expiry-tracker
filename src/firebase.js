import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your project's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6IpwCc-cG9K-EUCPrMCzMCRlFMWcc2Vs",
  authDomain: "food-expiry-tracker-b949e.firebaseapp.com",
  projectId: "food-expiry-tracker-b949e",
  storageBucket: "food-expiry-tracker-b949e.firebasestorage.app",
  messagingSenderId: "629829644964",
  appId: "1:629829644964:web:ca7861af6919b212762c31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service and auth service
const db = getFirestore(app);
const auth = getAuth(app);

// Export the instances to be used in other files
export { db, auth };