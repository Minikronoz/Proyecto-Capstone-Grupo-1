// models/Negocio.js
const { getDB } = require("../config/db");

class Negocio {
  static async find() {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    return users.flatMap(u => u.negocios || []);
  }

  static async findOne(filter) {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    for (const u of users) {
      const negocio = (u.negocios || []).find(n => n.nombre === filter.nombre);
      if (negocio) return negocio;
    }
    return null;
  }

  static async findOneAndUpdate(filter, update, opts = {}) {
    const db = getDB();
    const user = await db.collection("users").findOne({ "negocios.nombre": filter.nombre });
    if (!user) return null;

    await db.collection("users").updateOne(
      { "negocios.nombre": filter.nombre },
      { $set: { "negocios.$": { ...update, nombre: filter.nombre } } }
    );

    return this.findOne(filter);
  }
}

module.exports = Negocio;
