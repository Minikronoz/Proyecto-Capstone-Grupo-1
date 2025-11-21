// models/Click.js
import { getDB } from "../config/db.js";

export const Click = {
  //  Registrar un clic (cuando el usuario interactúa con un producto)
  async insertOne(data) {
    const db = getDB();
    const nuevoClick = {
      idProducto: data.idProducto,
      titulo: data.titulo?.trim() || "Producto sin título",
      marca: data.marca || "",
      precio: Number(data.precio) || 0,
      supermercado: data.supermercado?.toLowerCase() || data.store?.toLowerCase() || "",
      link: data.link || "",
      imagen: data.imagen || "",
      usuario: data.usuario || data.userCorreo || "anonimo@test.cl",
      userCorreo: data.userCorreo || data.usuario || "anonimo@test.cl", // 🔸 usado por dashboard
      userGenero: data.userGenero || "No especificado",
      userRegion: data.userRegion || "Desconocida",
      userComuna: data.userComuna || "",
      userEdad: data.userEdad ? Number(data.userEdad) : null,
      createdAt: new Date(),
    };
    return db.collection("clicks").insertOne(nuevoClick);
  },

  //  Obtener todos los clics (con filtros opcionales)
  async findAll(filtros = {}, limit = 100) {
    const db = getDB();
    return db
      .collection("clicks")
      .find(filtros)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  //  Obtener los clics de un usuario por correo
  async findByUser(correo) {
    const db = getDB();
    return db
      .collection("clicks")
      .find({ userCorreo: correo })
      .sort({ createdAt: -1 })
      .toArray();
  },

  //  Eliminar todos los clics (para pruebas o limpieza)
  async clearAll() {
    const db = getDB();
    return db.collection("clicks").deleteMany({});
  },

  //  Métrica rápida: contar clics totales o por filtro
  async count(filtros = {}) {
    const db = getDB();
    return db.collection("clicks").countDocuments(filtros);
  },
};
