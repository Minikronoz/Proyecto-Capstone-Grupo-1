// =============================================================
// 📁 controllers/users.controller.js — versión limpia Atlas (FINAL)
// =============================================================
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// =============================================================
// 👥 Obtener todos los usuarios
// =============================================================
export async function obtenerUsuarios(req, res) {
  try {
    const db = getDB();
    const usuarios = await db.collection("users").find().toArray();
    res.json(usuarios);
  } catch (err) {
    console.error("❌ Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
}

// =============================================================
// 👤 Obtener usuario por ID
// =============================================================
export async function obtenerUsuarioPorId(req, res) {
  try {
    const db = getDB();
    const usuario = await db.collection("users").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!usuario)
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.json(usuario);
  } catch (err) {
    console.error("❌ Error usuario por ID:", err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
}

// =============================================================
// ✏️ Actualizar usuario
// =============================================================
export async function actualizarUsuario(req, res) {
  try {
    const db = getDB();
    const id = req.params.id;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "ID inválido" });

    const datos = req.body;
    datos.actualizadoEn = new Date();

    await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: datos }
    );

    res.json({ ok: true, mensaje: "Usuario actualizado" });
  } catch (err) {
    console.error("❌ Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

// =============================================================
// 📄 Vistas
// =============================================================
export function mostrarOlvidePassword(req, res) {
  res.sendFile("views/forgot.html", { root: process.cwd() });
}

export function historico(req, res) {
  res.sendFile("views/historico.html", { root: process.cwd() });
}

// =============================================================
// 🏪 NEGOCIOS — Obtener negocios con dueño
// =============================================================
export async function obtenerNegociosConDuenio(req, res) {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();

    const negocios = users.flatMap((u) => {
      if (!Array.isArray(u.negocios) || u.negocios.length === 0) return [];

      return u.negocios.map((n) => ({
        _id: n._id ? n._id.toString() : null,
        nombre: n.nombre || "(sin nombre)",
        giro: n.giro || "—",
        comuna: n.comuna || "—",
        sector: n.sector || "—",
        duenioNombre: `${u.nombre || ""} ${u.apellido || ""}`.trim() || "—",
        duenioCorreo: u.correo || "—",
        duenioId: u._id.toString(),
      }));
    });

    res.json(negocios);
  } catch (err) {
    console.error("❌ Error al obtener negocios:", err);
    res.status(500).json({ error: "Error al obtener negocios con dueños" });
  }
}
