"use client";

import { initializeApp, getApps } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  projectId: "examdesign",
  appId: "1:33533626287:web:daa8effcdaf129290ed15a",
  storageBucket: "examdesign.firebasestorage.app",
  apiKey: "AIzaSyCTmUiCIlMtGfwGSS-XkocjhT1qVmJitrY",
  authDomain: "examdesign.firebaseapp.com",
  messagingSenderId: "33533626287",
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, "examdesign");
export const functions = getFunctions(app, "europe-west1");

let emulatorsConnected = false;

export function connectFirebaseEmulatorsIfNeeded() {
  if (emulatorsConnected || typeof window === "undefined") {
    return;
  }

  if (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return;
  }

  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    emulatorsConnected = true;
  } catch {
    emulatorsConnected = true;
  }
}
