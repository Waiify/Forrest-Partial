import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {

 apiKey: "AIzaSyAK7NHYsVoFhzBFBqY7T0duC8YCjW69dqM",
  authDomain: "forrest-co-working-space.firebaseapp.com",
  projectId: "forrest-co-working-space",
  storageBucket: "forrest-co-working-space.firebasestorage.app",
  messagingSenderId: "543065291010",
  appId: "1:543065291010:web:d774de08746e63d8d12a1b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();