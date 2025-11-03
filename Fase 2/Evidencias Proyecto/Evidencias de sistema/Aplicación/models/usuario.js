// models/Usuario.js
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

class Usuario {
  static async find() {
    const db = getDB();
    return db.collection("users").find().toArray();
  }

  static async findById(id) {
    const db = getDB();
    return db.collection("users").findOne({ _id: new ObjectId(id) });
  }

  static async findByIdAndUpdate(id, data, opts = {}) {
    const db = getDB();
    await db.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: data });
    return this.findById(id);
  }
}

export default Usuario;
