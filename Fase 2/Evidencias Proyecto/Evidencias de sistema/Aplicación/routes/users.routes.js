import express from "express";
import path from "path";
import {
  listUsers,
  registrarUsuario,
  mostrarFormularioRegistro,
  mostrarLogin,
  iniciarSesion,
  mostrarOlvidePassword,
  enviarResetPassword,
  mostrarPrincipal,
  obtenerUsuarios,
  obtenerNegocios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  obtenerNegocioPorNombre,
  actualizarNegocio,
  eliminarUsuario,
  eliminarNegocio,
  obtenerNegociosConDuenio
} from "../controllers/users.controller.js";
import { verificarAdmin } from "../middlewares/authAdmin.js";
import { verificarSesionUsuario } from "../middlewares/authUser.js";

const router = express.Router();

// ============================
// Páginas HTML
// ============================
router.get("/", (req, res) => {
  res.redirect("/catalogo");
});

router.get("/login", mostrarLogin);
router.post("/login", iniciarSesion);
router.get("/registrar", mostrarFormularioRegistro);
router.post("/registrar", registrarUsuario);
router.get("/olvide", mostrarOlvidePassword);
router.post("/olvide", enviarResetPassword);
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Error al cerrar sesión:", err);
      return res.status(500).send("Error al cerrar sesión");
    }

    // Eliminar cookie de sesión
    res.clearCookie("connect.sid");

    // Redirigir al login
    res.redirect("/login");
  });
});
// Solo el ADMIN puede entrar al panel principal
router.get("/principal", verificarAdmin, mostrarPrincipal);

// Solo usuarios logueados (cualquier rol) pueden editar perfil
router.get("/editar-perfil", verificarSesionUsuario, (req, res) => {
  res.sendFile(path.resolve("views/editar-perfil.html"));
});

// ============================
// API REST JSON
// ============================

// Verificar sesión activa
router.get("/api/sesion-activa", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  } else {
    return res.status(401).json({ message: "No hay sesión activa" });
  }
});

router.get("/api/usuarios", obtenerUsuarios);
router.get("/api/negocios", obtenerNegocios);
router.get("/api/negocios-con-duenio", obtenerNegociosConDuenio);
router.get("/api/usuarios/:id", obtenerUsuarioPorId);
router.put("/api/usuarios/:id", actualizarUsuario);
router.put("/api/negocios/nombre/:nombre", actualizarNegocio);
router.delete("/api/usuarios/:id", eliminarUsuario);
router.delete("/api/negocios/nombre/:nombre", eliminarNegocio);
router.get("/api/negocios/nombre/:nombre", obtenerNegocioPorNombre);

// ============================
// Página catálogo
// ============================
router.get("/catalogo", (req, res) => {
  res.sendFile(path.resolve("views/catalogo.html"));
});

export default router;
