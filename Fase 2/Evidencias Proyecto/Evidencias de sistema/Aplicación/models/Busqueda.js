// models/Busqueda.js
import { getDB } from "../config/db.js";

export const Busqueda = {
  // 🔹 Registrar una nueva búsqueda
  async insertOne(data) {
    const db = getDB();
    const nuevaBusqueda = {
      usuarioEmail: data.usuarioEmail,
      termino: data.termino?.trim() || "",
      palabrasClave: data.palabrasClave || [],
      fecha: new Date(),
    };
    return db.collection("busquedas").insertOne(nuevaBusqueda);
  },

  // 🔹 Obtener todas las búsquedas (opcional con filtros)
  async findAll(filtros = {}, limit = 100) {
    const db = getDB();
    return db
      .collection("busquedas")
      .find(filtros)
      .sort({ fecha: -1 })
      .limit(limit)
      .toArray();
  },

  // 🔹 Obtener las más populares
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

  // 🔹 Borrar todas (por si haces reseteo de métricas)
  async clearAll() {
    const db = getDB();
    return db.collection("busquedas").deleteMany({});
  },
};
