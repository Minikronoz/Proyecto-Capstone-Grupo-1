// firebase-admin-config.js
import admin from "firebase-admin";
import fetch from "node-fetch";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log(" Firebase Admin inicializado correctamente");
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Función alternativa: obtener usuario por email usando REST
export async function getUserDataByEmail(email) {
  const url = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/usuarios/${email}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    console.error(" Error consultando usuario Firestore REST:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.fields ? Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k, Object.values(v)[0]])) : null;
}

export { db };
