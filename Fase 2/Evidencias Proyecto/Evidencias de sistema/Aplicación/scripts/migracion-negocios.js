import dotenv from "dotenv";
dotenv.config(); // ✅ Cargar variables de entorno

import { connectDB, getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

async function migrarNegocios() {
  try {
    console.log("\n🔧 Iniciando migración de negocios...");
    console.log("🔍 Verificando MONGODB_URI:", process.env.MONGODB_URI ? "✅ Definida" : "❌ Undefined");
    
    if (!process.env.MONGODB_URI) {
      console.error("❌ ERROR: MONGODB_URI no está definida en .env");
      process.exit(1);
    }

    // ✅ Usar la misma conexión que el resto de la app
    await connectDB();
    const db = getDB();
    
    console.log("✅ Conectado a MongoDB");
    console.log(`📦 Base de datos: ${db.databaseName}\n`);

    const usuarios = await db.collection("users").find({ negocios: { $exists: true } }).toArray();

    console.log(`📊 Encontrados ${usuarios.length} usuarios con negocios\n`);

    let negociosActualizados = 0;
    let usuariosProcesados = 0;

    for (const usuario of usuarios) {
      if (!usuario.negocios || !Array.isArray(usuario.negocios)) continue;

      // ✅ Agregar _id a cada negocio que no lo tenga
      const negociosConId = usuario.negocios.map((negocio) => {
        if (!negocio._id) {
          return {
            _id: new ObjectId(), // ✅ Generar _id único
            ...negocio
          };
        }
        return negocio;
      });

      // ✅ Actualizar el usuario
      await db.collection("users").updateOne(
        { _id: usuario._id },
        { $set: { negocios: negociosConId } }
      );

      negociosActualizados += negociosConId.length;
      usuariosProcesados++;
      
      console.log(`✅ Usuario ${usuario.nombre} ${usuario.apellido}: ${negociosConId.length} negocios actualizados`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 Migración completada con éxito`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Usuarios procesados: ${usuariosProcesados}`);
    console.log(`📦 Negocios actualizados: ${negociosActualizados}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (error) {
    console.error("❌ Error en la migración:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrarNegocios();