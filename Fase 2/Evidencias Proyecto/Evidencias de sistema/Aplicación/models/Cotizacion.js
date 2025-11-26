// models/Cotizacion.js
import { getDB } from "../config/db.js";

export const Cotizacion = {
  // 📌 Guardar una nueva cotización
  async insertOne(carrito, usuario) {
    const db = getDB();

    const doc = {
      fecha: new Date(),
      carrito,

      // 🧾 Datos completos del usuario
      usuarioEmail: usuario.correo || "anonimo@local.cl",
      usuarioNombre: `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim(),
      usuarioGenero: usuario.genero || "No especificado",
      usuarioEdad: usuario.edad || null,
      usuarioRegion: usuario.region || "",
      usuarioComuna: usuario.comuna || "",
      usuarioSector: usuario.sector || "",
      usuarioTieneNegocio: usuario.tieneNegocio || false,
      negocios: usuario.negocios || [],

      // 📌 Identificador único de usuario
      userId: usuario._id || null
    };

    return db.collection("cotizaciones").insertOne(doc);
  },

  // 📎 Obtener cotizaciones por usuario
  async findByUser(correo) {
    const db = getDB();
    return db.collection("cotizaciones")
      .find({ usuarioEmail: correo })
      .sort({ fecha: -1 })
      .toArray();
  },

  // 📊 Obtener todas (para admins)
  async findAll(limit = 200) {
    const db = getDB();
    return db.collection("cotizaciones")
      .find({})
      .sort({ fecha: -1 })
      .limit(limit)
      .toArray();
  },

  // 🗑 Limpiar (para test o mantenimiento)
  async clearAll() {
    const db = getDB();
    return db.collection("cotizaciones").deleteMany({});
  }
};
