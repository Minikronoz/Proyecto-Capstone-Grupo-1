import { connectDB, getDB } from "../config/db.js";

async function main() {
  await connectDB();
  const db = getDB();
  const col = db.collection("users");

  const result = await col.deleteMany({
    // Usuarios generados
    creadoEn: { $exists: true },
    actualizadoEn: { $exists: true },

    // Y que sean clientes/usuarios (no administradores reales)
    role: { $in: ["usuario", "cliente"] }
  });

  console.log(`🗑️ Usuarios de prueba eliminados: ${result.deletedCount}`);
  process.exit();
}

main().catch(err => console.error("❌ ERROR:", err));
