// models/Busqueda.js
import { getDB } from "../config/db.js";

export const Busqueda = {
  //  Registrar una nueva búsqueda (CON DATOS DEL USUARIO)
  async insertOne(data) {
    const db = getDB();

    const user = data.usuario || {}; // ⚠ Se pasa desde el backend al llamar

    const nuevaBusqueda = {
      termino: data.termino?.trim() || "",
      palabrasClave: data.palabrasClave || [],
      fecha: new Date(),

      // 🎯 Datos completos del usuario
      usuarioEmail: user.correo || "anonimo@local.cl",
      usuarioGenero: user.genero || "No especificado",
      usuarioEdad: user.edad || null,
      usuarioRegion: user.region || "",
      usuarioComuna: user.comuna || "",
      usuarioSector: user.sector || "",
      usuarioTieneNegocio: user.tieneNegocio || false,
      negocios: user.negocios || []
    };

    return db.collection("busquedas").insertOne(nuevaBusqueda);
  },

  //  Obtener todas las búsquedas (opcional con filtros)
  async findAll(filtros = {}, limit = 100) {
    const db = getDB();
    return db
      .collection("busquedas")
      .find(filtros)
      .sort({ fecha: -1 })
      .limit(limit)
      .toArray();
  },

  //  Obtener las más populares
  async topBusquedas(limit = 10) {
    const db = getDB();
    return db
      .collection("busquedas")
      .aggregate([
        { $match: { termino: { $exists: true, $ne: "" } } },
        { $group: { _id: "$termino", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: limit },
      ])
      .toArray();
  },

  // 🔹 Limpiar búsqueda (por si reseteas métricas)
  async clearAll() {
    const db = getDB();
    return db.collection("busquedas").deleteMany({});
  },
};
