// actualizaradmin.js
import bcrypt from "bcrypt";
import { connectDB, getDB } from "./config/db.js";

async function actualizarAdmin() {
  try {
    await connectDB();
    const db = getDB();

    const correoAdmin = "admin@sistema.com";
    const nuevaPassword = "123456"; // 🔑 Contraseña nueva (puedes cambiarla)
    const hash = await bcrypt.hash(nuevaPassword, 10);

    // ✅ Buscar tanto por "correo" como por "email"
    const existente = await db.collection("users").findOne({
      $or: [{ correo: correoAdmin }, { email: correoAdmin }]
    });

    if (existente) {
      // 🔹 Si existe → actualizamos
      await db.collection("users").updateOne(
        { _id: existente._id },
        {
          $set: {
            correo: correoAdmin,
            contraseña: hash,
            role: "admin",
            nombre: "Administrador",
            apellido: "",
            actualizadoEn: new Date(),
          },
        }
      );
      console.log("🔄 Admin actualizado correctamente.");
    } else {
      // 🔹 Si no existe → lo creamos
      await db.collection("users").insertOne({
        correo: correoAdmin,
        contraseña: hash,
        role: "admin",
        nombre: "Administrador",
        apellido: "",
        genero: "—",
        region: "Biobío",
        comuna: "Concepción",
        sector: "Centro",
        tieneNegocio: false,
        negocios: [],
        creadoEn: new Date(),
      });
      console.log("🆕 Admin creado correctamente.");
    }

    console.log("📧 Correo:", correoAdmin);
    console.log("🔑 Contraseña:", nuevaPassword);
    console.log("✅ Listo para iniciar sesión como admin.");
    process.exit();
  } catch (err) {
    console.error("❌ Error al actualizar admin:", err);
    process.exit(1);
  }
}

actualizarAdmin();
