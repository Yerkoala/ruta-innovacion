
// firebaseconfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDn1Ge1-XJGFFjPvKFmEw2UpwpCJdawu1o",
  authDomain: "ruta-innovacion.firebaseapp.com",
  projectId: "ruta-innovacion",
  storageBucket: "ruta-innovacion.firebasestorage.app",
  messagingSenderId: "955331586496",
  appId: "1:955331586496:web:cff445bbfee46398450025"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
