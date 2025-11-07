// =============================================================
// 📁 controllers/users.controller.js — versión final Atlas
// =============================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================
// 🧍 Registrar nuevo usuario
// =============================================================
export async function registrarUsuario(req, res) {
  try {
    const {
      nombre, apellido, rut, fechaNacimiento, genero,
      region, comuna, sector, correo, contraseña, tieneNegocio
    } = req.body;

    const db = getDB();
    const users = db.collection("users");

    if (!correo || !contraseña)
      return res.status(400).send("Correo y contraseña requeridos");

    const existe = await users.findOne({ correo });
    if (existe) return res.status(400).send("El correo ya está registrado");

    const hash = await bcrypt.hash(contraseña, 10);

    // Calcular edad
    let edad = null;
    if (fechaNacimiento) {
      const nacimiento = new Date(fechaNacimiento);
      const hoy = new Date();
      edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    }

    // Cargar negocios dinámicamente
    const negocios = [];
    Object.keys(req.body).forEach((key) => {
      const match = key.match(/^nombreNegocio_(\d+)/);
      if (match) {
        const idx = match[1];
        negocios.push({
          nombre: req.body[`nombreNegocio_${idx}`] || null,
          rolTributario: req.body[`rolTributario_${idx}`] || null,
          giro: req.body[`giro_${idx}`] || null,
          telefono: req.body[`telefonoNegocio_${idx}`] || null,
          correo: req.body[`correoNegocio_${idx}`] || null,
          web: req.body[`webNegocio_${idx}`] || null,
          region: req.body[`regionNegocio_${idx}`] || null,
          comuna: req.body[`comunaNegocio_${idx}`] || null,
          sector: req.body[`sectorNegocio_${idx}`] || null,
        });
      }
    });

    // Insertar en MongoDB Atlas
    await users.insertOne({
      nombre,
      apellido,
      rut,
      fechaNacimiento,
      edad,
      genero,
      region,
      comuna,
      sector,
      correo,
      contraseña: hash,
      role: "usuario",
      tieneNegocio: tieneNegocio === "on" || tieneNegocio === "true",
      negocios: negocios.length > 0 ? negocios : [],
      creadoEn: new Date(),
    });

    console.log(`✅ Nuevo usuario registrado: ${correo}`);
    res.redirect("/login");
  } catch (err) {
    console.error("❌ Error al registrar usuario:", err);
    res.status(500).send("Error al registrar usuario: " + err.message);
  }
}

// =============================================================
// 🔐 LOGIN DE USUARIO
// =============================================================
export async function iniciarSesion(req, res) {
  try {
    const { correo, contraseña } = req.body;
    const db = getDB();
    const user = await db.collection("users").findOne({ correo });
    if (!user) return res.status(404).send("Usuario no encontrado");

    const coincide = await bcrypt.compare(contraseña, user.contraseña);
    if (!coincide) return res.status(401).send("Contraseña incorrecta");

    const role = user.role || (user.correo === "admin@sistema.com" ? "admin" : "usuario");
    req.session.user = {
      id: user._id.toString(),
      correo: user.correo,
      nombre: user.nombre,
      apellido: user.apellido,
      genero: user.genero,
      region: user.region,
      comuna: user.comuna,
      negocios: user.negocios || [],
      role,
    };

    req.session.save((err) => {
  if (err) return res.status(500).json({ error: "Error al guardar sesión" });

  console.log("✅ Sesión iniciada:", req.session.user);

  const redirectUrl = role === "admin" ? "/principal" : "/catalogo";
  res.json({ ok: true, redirect: redirectUrl, user: req.session.user });
});

  } catch (err) {
    console.error("❌ Error al iniciar sesión:", err);
    res.status(500).send("Error al iniciar sesión: " + err.message);
  }
}

// ✅ Obtener todos los usuarios (versión correcta)
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

export async function obtenerUsuarioPorId(req, res) {
  try {
    const db = getDB();
    const id = req.params.id;
    const usuario = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
}

export async function obtenerNegocios(req, res) {
  try {
    const db = getDB();
    const usuarios = await db.collection("users").find({ "negocios.0": { $exists: true } }).toArray();
    const negocios = usuarios.flatMap(u => u.negocios || []);
    res.json(negocios);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener negocios" });
  }
}

export async function obtenerNegocioPorNombre(req, res) {
  try {
    const db = getDB();
    const nombre = req.params.nombre;
    const usuario = await db.collection("users").findOne({ "negocios.nombre": nombre });
    if (!usuario) return res.status(404).json({ error: "Negocio no encontrado" });
    const negocio = usuario.negocios.find(n => n.nombre === nombre);
    res.json(negocio);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener negocio" });
  }
}

// =============================================================
// ✏️ Actualizar usuario
// =============================================================
export async function actualizarUsuario(req, res) {
  try {
    const db = getDB();
    const id = req.params.id;
    const { nombre, apellido, genero, region, comuna, sector, tieneNegocio } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const actualizacion = {
      nombre,
      apellido,
      genero,
      region,
      comuna,
      sector,
      tieneNegocio: tieneNegocio === "true" || tieneNegocio === true,
      actualizadoEn: new Date(),
    };

    const resultado = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: actualizacion }
    );

    if (resultado.matchedCount === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({ ok: true, mensaje: "Usuario actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

// =============================================================
// ❌ Eliminar usuario / negocio
// =============================================================
export async function eliminarUsuario(req, res) {
  try {
    const db = getDB();
    await db.collection("users").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar usuario: " + err.message });
  }
}

export async function eliminarNegocio(req, res) {
  try {
    const db = getDB();
    await db.collection("users").updateOne(
      { "negocios.nombre": req.params.nombre },
      { $pull: { negocios: { nombre: req.params.nombre } } }
    );
    res.json({ mensaje: "Negocio eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar negocio: " + err.message });
  }
}

// =============================================================
// 📊 Negocios con dueño (vista)
export async function obtenerNegociosConDuenio(req, res) {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();

    const negocios = users.flatMap((u) => {
      if (!Array.isArray(u.negocios) || u.negocios.length === 0) return [];
      return u.negocios.map((n) => ({
        nombre: n.nombre || "(sin nombre)",
        giro: n.giro || "—",
        comuna: n.comuna || "—",
        sector: n.sector || "—",
        duenioNombre: `${u.nombre || ""} ${u.apellido || ""}`.trim() || "—",
        duenioCorreo: u.correo || u.email || "—",
        duenioId: u._id.toString(),
      }));
    });

    res.json(negocios);
  } catch (err) {
    console.error("❌ Error al obtener negocios:", err);
    res.status(500).json({ error: "Error al obtener negocios con dueños" });
  }
}

// =============================================================
// 📋 VISTAS HTML
// =============================================================
export function mostrarLogin(req, res) {
  res.sendFile(path.resolve(__dirname, "../views/login.html"));
}

export function mostrarFormularioRegistro(req, res) {
  res.sendFile(path.resolve(__dirname, "../views/registrar.html"));
}

// =============================================================
// 🔑 Recuperar contraseña
// =============================================================
export async function mostrarOlvidePassword(req, res) {
  res.sendFile(path.resolve("views/olvide.html"));
}

export async function enviarResetPassword(req, res) {
  try {
    const { correo } = req.body;
    const db = getDB();

    const usuario = await db.collection("users").findOne({ correo });
    if (!usuario) return res.status(404).send("❌ Correo no encontrado en el sistema.");

    // 🔹 Simulación de envío del enlace (lógica real usaría nodemailer)
    console.log(`📧 Enlace de recuperación (simulado) enviado a: ${correo}`);

    res.send("✅ Se ha enviado un enlace de recuperación (simulado).");
  } catch (err) {
    console.error("❌ Error al enviar enlace:", err);
    res.status(500).send("Error interno al procesar la solicitud.");
  }
}

export async function mostrarPrincipal(req, res) {
  res.sendFile(path.resolve(__dirname, "../views/principal.html"));
}
