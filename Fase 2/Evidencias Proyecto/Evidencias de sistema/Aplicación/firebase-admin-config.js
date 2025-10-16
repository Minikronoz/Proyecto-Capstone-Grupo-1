// Archivo: firebase-admin-config.js

import admin from 'firebase-admin';
// Se corrige la ruta y se actualiza la sintaxis de 'assert' a 'with'
import serviceAccount from './firebase-service-account.json' with { type: 'json' };

// Inicializamos la conexión de administrador
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Exportamos la conexión a Firestore para usarla en otras partes
const db = admin.firestore();

export { db };