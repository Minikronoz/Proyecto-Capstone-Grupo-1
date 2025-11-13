// =======================================================
// 📁 routes/users.routes.js — versión MongoDB Atlas (FINAL)
// =======================================================
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js";

// ✔ IMPORTS NECESARIOS
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { obtenerNegociosConDuenio } from "../controllers/users.controller.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================================================
// 🌐 VISTAS
// =======================================================

router.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/login.html"))
);

router.get("/registrar", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/registrar.html"))
);

router.get("/editar-perfil", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/editar-perfil.html"))
);

router.get("/catalogo", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/catalogo.html"))
);

router.get("/principal", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/principal.html"))
);

router.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/dashboard.html"))
);

router.get("/olvide-password", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/forgot.html"))
);

// =======================================================
// 🔐 LOGIN (POST)
// =======================================================
router.post("/login", async (req, res) => {
  try {
    const db = getDB();
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña)
      return res.status(400).json({ error: "Faltan datos" });

    const user = await db.collection("users").findOne({ correo });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const passOK = await bcrypt.compare(contraseña, user.contraseña);
    if (!passOK) return res.status(401).json({ error: "Contraseña incorrecta" });

    // Guardar sesión
    req.session.user = {
      id: user._id.toString(),
      nombre: user.nombre,
      correo: user.correo,
      role: user.role || "usuario",
    };

    const redirect = user.role === "admin" ? "/principal" : "/catalogo";

    res.json({ ok: true, redirect });

  } catch (err) {
    console.error("❌ Error login:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// =======================================================
// 📝 REGISTRO
// =======================================================
router.post("/registrar", async (req, res) => {
  try {
    const db = getDB();
    const { nombre, apellido, correo, contraseña } = req.body;

    if (!nombre || !correo || !contraseña)
      return res.status(400).json({ error: "Faltan datos obligatorios" });

    const existe = await db.collection("users").findOne({ correo });
    if (existe)
      return res.status(409).json({ error: "El correo ya está registrado" });

    const hash = await bcrypt.hash(contraseña, 10);

    await db.collection("users").insertOne({
      nombre,
      apellido,
      correo,
      contraseña: hash,
      role: "usuario",
      negocios: [],
      creadoEn: new Date(),
    });

    res.json({ ok: true, mensaje: "Usuario registrado" });

  } catch (err) {
    console.error("❌ Error registro:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// =======================================================
// 👤 USUARIOS CRUD COMPLETO
// =======================================================

// Obtener todos
router.get("/api/usuarios", async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Obtener 1 usuario por ID
router.get("/api/usuarios/:id", async (req, res) => {
  try {
    const db = getDB();
    const id = req.params.id;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "ID inválido" });

    const user = await db.collection("users").findOne({
      _id: new ObjectId(id),
    });

    if (!user)
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// Actualizar usuario COMPLETO
router.put("/api/usuarios/:id", async (req, res) => {
  try {
    const db = getDB();
    const id = req.params.id;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "ID inválido" });

    const data = req.body;
    data.actualizadoEn = new Date();

    await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );

    res.json({ ok: true, mensaje: "Usuario actualizado" });
  } catch (err) {
    console.error("❌ Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ELIMINAR usuario
router.delete("/api/usuarios/:id", async (req, res) => {
  try {
    const db = getDB();
    const id = req.params.id;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "ID inválido" });

    await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    res.json({ ok: true, mensaje: "Usuario eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});


// =======================================================
// 🏪 NEGOCIOS
// =======================================================

// ✔ ESTA ES LA RUTA QUE FALTABA PARA QUE FUNCIONE EL PANEL
router.get("/api/negocios-con-duenio", obtenerNegociosConDuenio);

export default router;
