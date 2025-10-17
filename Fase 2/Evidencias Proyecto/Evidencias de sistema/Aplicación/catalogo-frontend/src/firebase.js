// Importamos lo que necesitamos
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 🔹 para Firestore
import { getAnalytics } from "firebase/analytics";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAF6lEPCBvLrLa2QSIiBJ1MVF8yAYVeEWM",
  authDomain: "sistema-de-reportes-4a05b.firebaseapp.com",
  projectId: "sistema-de-reportes-4a05b",
  storageBucket: "sistema-de-reportes-4a05b.firebasestorage.app",
  messagingSenderId: "1032166949458",
  appId: "1:1032166949458:web:38a48da4d2a06892de558b",
  measurementId: "G-L5VD3FLMF5"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Establecer persistencia local (mantiene sesión después de refrescar)
setPersistence(auth, browserLocalPersistence)
  .catch(error => console.error("Error configurando persistencia:", error));

const db = getFirestore(app);   //inicializamos Firestore
const analytics = getAnalytics(app);

export { app, auth, db };
