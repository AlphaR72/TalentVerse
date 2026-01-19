import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBkrv8DkFjdFMnmbQCQ4TpTR3txemW9W-s",
  authDomain: "talentverse-4841a.firebaseapp.com",
  projectId: "talentverse-4841a",
  storageBucket: "talentverse-4841a.firebasestorage.app",
  messagingSenderId: "665395470314",
  appId: "1:665395470314:web:674b13f05f2a225de35c93",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
