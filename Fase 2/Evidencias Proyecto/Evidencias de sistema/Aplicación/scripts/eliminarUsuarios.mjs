import { connectDB, getDB } from "../config/db.js";

async function main() {
  await connectDB();
  const db = getDB();
  const col = db.collection("users");

  const result = await col.deleteMany({
    direccion: { $regex: /(Av\.|Calle|Pasaje)/i },
    correo: { $regex: /\d\d@(gmail|hotmail|outlook|yahoo)\.com$/i },
    edad: { $gte: 18, $lte: 70 }
  });

  console.log(`🗑️ Usuarios ficticios eliminados: ${result.deletedCount}`);

  process.exit();
}

main().catch(err => console.error("❌ ERROR:", err));
