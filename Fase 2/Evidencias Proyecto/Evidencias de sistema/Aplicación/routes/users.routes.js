// =======================================================
// 📁 routes/users.routes.js — compatible con MongoDB Atlas
// =======================================================
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioPorId,
  actualizarUsuario,
  mostrarOlvidePassword,
  enviarResetPassword,
  obtenerUsuarios
} from "../controllers/users.controller.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================================================
// 🌐 Vistas
// =======================================================

// ✅ Página de login
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/login.html"));
});

// ✅ Página de registro
router.get("/registrar", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/registrar.html"));
});

// ✅ Página de edición de perfil
router.get("/editar-perfil", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/editar-perfil.html"));
});

// ✅ Página catálogo
router.get("/catalogo", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/catalogo.html"));
});

// ✅ Página catálogo
router.get("/principal", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/principal.html"));
});
// =======================================================
// 🔐 API de autenticación y usuarios
// =======================================================

// Iniciar sesión
router.post("/login", iniciarSesion);

// Registrar nuevo usuario
router.post("/registrar", registrarUsuario);

// Obtener sesión activa
router.get("/api/sesion-activa", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "No hay sesión activa" });
  res.json({ user: req.session.user });
});

// Obtener usuario por ID
router.get("/api/usuarios/:id", obtenerUsuarioPorId);
// ✅ Obtener todos los usuarios
router.get("/api/usuarios", obtenerUsuarios);
// Actualizar perfil de usuario
router.put("/api/usuarios/:id", actualizarUsuario);


// ✅ Middleware para proteger el acceso
function verificarSesion(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login"); // redirige si no hay sesión
  }
  next();
}

// ✅ Página del dashboard
router.get("/dashboard", verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/dashboard.html"));
});
// =======================================================
// 🧠 Recuperar Contraseña
// =======================================================
router.get("/olvide-password", mostrarOlvidePassword);
router.post("/olvide-password", enviarResetPassword);

export default router;
