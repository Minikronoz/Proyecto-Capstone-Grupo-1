import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

class Usuario {
  // 🧠 Obtener todos los usuarios
  static async find() {
    const db = getDB();
    return db.collection("users").find().toArray();
  }

  // 🧠 Buscar por ID
  static async findById(id) {
    const db = getDB();
    return db.collection("users").findOne({ _id: new ObjectId(id) });
  }

  // 🧠 Actualizar usuario
  static async findByIdAndUpdate(id, data, opts = {}) {
    const db = getDB();
    await db.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: data });
    return this.findById(id);
  }
}

export default Usuario;
