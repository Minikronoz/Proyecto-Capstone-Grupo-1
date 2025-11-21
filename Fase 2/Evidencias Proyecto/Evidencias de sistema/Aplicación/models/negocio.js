// models/Negocio.js
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

export const Negocio = {
  //  Obtener todos los negocios registrados en todos los usuarios
  async findAll() {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    return users.flatMap((u) =>
      (u.negocios || []).map((n) => ({
        ...n,
        duenioId: u._id,
        duenioNombre: u.nombre || "",
        duenioCorreo: u.correo || "",
      }))
    );
  },

  //  Buscar un negocio por nombre o ID
  async findOne(filter) {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    for (const u of users) {
      const negocio = (u.negocios || []).find(
        (n) =>
          (filter.nombre && n.nombre === filter.nombre) ||
          (filter._id && n._id?.toString() === filter._id.toString())
      );
      if (negocio)
        return {
          ...negocio,
          duenioId: u._id,
          duenioNombre: u.nombre || "",
          duenioCorreo: u.correo || "",
        };
    }
    return null;
  },

  //  Agregar un negocio a un usuario
  async addToUser(userId, negocioData) {
    const db = getDB();
    const nuevoNegocio = {
      _id: new ObjectId(),
      nombre: negocioData.nombre || "Negocio sin nombre",
      giro: negocioData.giro || "",
      comuna: negocioData.comuna || "",
      sector: negocioData.sector || "",
      creadoEn: new Date(),
    };

    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $push: { negocios: nuevoNegocio } }
      );

    return nuevoNegocio;
  },

  //  Actualizar datos de un negocio (por nombre o ID)
  async updateOne(filter, update) {
    const db = getDB();
    const user = await db
      .collection("users")
      .findOne({ "negocios.nombre": filter.nombre });

    if (!user) return null;

    await db.collection("users").updateOne(
      { "negocios.nombre": filter.nombre },
      { $set: { "negocios.$": { ...update, nombre: filter.nombre } } }
    );

    return this.findOne(filter);
  },

  //  Eliminar un negocio por nombre o ID
  async deleteOne(nombreNegocio) {
    const db = getDB();
    const result = await db
      .collection("users")
      .updateOne(
        { "negocios.nombre": nombreNegocio },
        { $pull: { negocios: { nombre: nombreNegocio } } }
      );

    return result.modifiedCount > 0;
  },
};
