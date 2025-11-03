// actualizaradmin.js
import bcrypt from "bcrypt";
import { connectDB, getDB } from "./config/db.js";

async function actualizarAdmin() {
  try {
    await connectDB();
    const db = getDB();

    const nuevaPassword = "123456"; // la nueva contraseña del admin
    const hash = await bcrypt.hash(nuevaPassword, 10);

    // ✅ Asegura que el admin exista y tenga rol "admin"
    const resultado = await db.collection("users").updateOne(
      { correo: "admin@sistema.com" },
      {
        $set: {
          contraseña: hash,
          role: "admin",
          nombre: "Administrador",
          actualizadoEn: new Date(),
        },
      },
      { upsert: true } // 🔹 si no existe, lo crea
    );

    console.log("✅ Contraseña del admin actualizada o creada con éxito");
    console.log("📧 Correo: admin@sistema.com");
    console.log("🔑 Contraseña: 123456");
    console.log(`📦 Resultado: ${resultado.modifiedCount || resultado.upsertedCount} documento modificado o creado`);

    process.exit();
  } catch (err) {
    console.error("❌ Error al actualizar admin:", err);
    process.exit(1);
  }
}

actualizarAdmin();
