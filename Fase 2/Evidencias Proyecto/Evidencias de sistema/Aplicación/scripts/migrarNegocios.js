// scripts/migrarNegocios.js
import { connectDB, getDB } from "../config/db.js";

await connectDB();
const db = getDB();

const users = await db.collection("users").find().toArray();
let count = 0;

for (const u of users) {
  if (Array.isArray(u.negocios) && u.negocios.length > 0) {
    for (const n of u.negocios) {
      await db.collection("negocios").updateOne(
        { nombre: n.nombre },
        {
          $set: {
            ...n,
            duenioCorreo: u.correo,
            duenioNombre: `${u.nombre} ${u.apellido || ""}`.trim(),
            duenioRegion: u.region,
            duenioComuna: u.comuna,
          },
        },
        { upsert: true }
      );
      count++;
    }
  }
}

console.log(`✅ Migración completada. ${count} negocios sincronizados.`);
process.exit();
