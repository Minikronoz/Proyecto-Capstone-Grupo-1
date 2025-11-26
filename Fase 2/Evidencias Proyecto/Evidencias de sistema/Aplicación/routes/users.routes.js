// =======================================================
//  routes/users.routes.js — versión MongoDB Atlas (FINAL)
// =======================================================
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js";

// ✔ IMPORTS NECESARIOS
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import {
  obtenerNegociosConDuenio,
  actualizarNegocio,
  eliminarNegocio,
} from "../controllers/users.controller.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================================================
//  VISTAS
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
//  LOGIN (POST)
// =======================================================
// =======================================================
//  LOGIN (POST) — Arreglado para guardar datos completos
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

    // 🔐 GUARDAR SESIÓN con TODOS los datos necesarios
    req.session.user = {
      id: user._id.toString(),
      nombre: user.nombre,
      apellido: user.apellido || "",
      correo: user.correo,
      role: user.role || "usuario",

      // 📌 Información para métricas, dashboard y cotizaciones
      genero: user.genero || "No especificado",
      edad: user.edad || null,
      region: user.region || "",
      comuna: user.comuna || "",
      sector: user.sector || "",
      tieneNegocio: user.tieneNegocio || false,
      negocios: user.negocios || []
    };

    const redirect = user.role === "admin" ? "/principal" : "/catalogo";
    res.json({ ok: true, redirect });

  } catch (err) {
    console.error("❌ Error login:", err);
    res.status(500).json({ error: "Error interno" });
  }
});


// =======================================================
//  REGISTRO COMPLETO
// =======================================================
router.post("/registrar", async (req, res) => {
  try {
    const db = getDB();
    const {
      nombre,
      apellido,
      rut,
      fechaNacimiento,
      genero,
      region,
      comuna,
      sector,
      correo,
      contraseña,
      tieneNegocio
    } = req.body;

    console.log(" Datos recibidos:", req.body); // ← Para debug

    //  Validación de campos obligatorios
    if (!nombre || !correo || !contraseña) {
      return res.status(400).json({
        error: "Nombre, correo y contraseña son obligatorios"
      });
    }

    //  Verificar si el correo ya existe
    const existe = await db.collection("users").findOne({ correo: correo.toLowerCase().trim() });
    if (existe) {
      return res.status(409).json({
        error: "El correo ya está registrado"
      });
    }

    //  Calcular edad si se proporciona fecha de nacimiento
    let edad = null;
    if (fechaNacimiento) {
      const hoy = new Date();
      const nacimiento = new Date(fechaNacimiento);
      edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
    }

    //  Hashear contraseña
    const hash = await bcrypt.hash(contraseña, 10);

    //  Procesar negocios si existen
    const negocios = [];
    if (tieneNegocio === "on" || tieneNegocio === true || tieneNegocio === "true") {
      console.log(" Usuario tiene negocios, procesando...");
      
      // Buscar todos los campos de negocios en el body
      const negocioKeys = Object.keys(req.body).filter(k => k.startsWith("nombreNegocio_"));
      
      console.log(" Claves de negocios encontradas:", negocioKeys);

      negocioKeys.forEach(key => {
        const index = key.split("_")[1];
        const negocio = {
          nombre: req.body[`nombreNegocio_${index}`]?.trim() || null,
          rolTributario: req.body[`rolTributario_${index}`]?.trim() || null,
          giro: req.body[`giro_${index}`]?.trim() || null,
          telefono: req.body[`telefonoNegocio_${index}`]?.trim() || null,
          correo: req.body[`correoNegocio_${index}`]?.trim() || null,
          web: req.body[`webNegocio_${index}`]?.trim() || null,
          region: req.body[`regionNegocio_${index}`] || region,
          comuna: req.body[`comunaNegocio_${index}`] || comuna,
          sector: req.body[`sectorNegocio_${index}`] || sector,
        };

        // Solo agregar si tiene al menos nombre
        if (negocio.nombre) {
          negocios.push(negocio);
          console.log(" Negocio agregado:", negocio.nombre);
        }
      });
    }

    //  Crear el usuario completo
    const nuevoUsuario = {
      nombre: nombre.trim(),
      apellido: apellido?.trim() || null,
      rut: rut?.trim() || null,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
      edad: edad,
      genero: genero || null,
      region: region || null,
      comuna: comuna || null,
      sector: sector || null,
      correo: correo.toLowerCase().trim(),
      contraseña: hash,
      role: "usuario",
      tieneNegocio: negocios.length > 0,
      negocios: negocios,
      creadoEn: new Date(),
      actualizadoEn: null,
    };

    console.log("💾 Usuario a guardar:", {
      ...nuevoUsuario,
      contraseña: "[OCULTA]"
    });

    //  Insertar en MongoDB
    const resultado = await db.collection("users").insertOne(nuevoUsuario);

    console.log(" Usuario registrado exitosamente:", correo, "ID:", resultado.insertedId);

    res.json({
      ok: true,
      mensaje: "Usuario registrado correctamente",
      userId: resultado.insertedId
    });

  } catch (err) {
    console.error("❌ Error en registro:", err);
    res.status(500).json({
      error: "Error interno del servidor al registrar usuario"
    });
  }
});

// =======================================================
//  NEGOCIOS (DEBE IR ANTES de las rutas con :id)
// =======================================================

//  Obtener todos los negocios con dueño
router.get("/api/usuarios/negocios", obtenerNegociosConDuenio);

//  Actualizar negocio
router.put("/api/usuarios/:userId/negocios/:negocioId", actualizarNegocio);

//  Eliminar negocio
router.delete("/api/usuarios/:userId/negocios/:negocioId", eliminarNegocio);

// =======================================================
//  USUARIOS CRUD COMPLETO
// =======================================================

// Obtener todos
router.get("/api/usuarios", async (req, res) => {
  try {
    const db = getDB();
    
    // Parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Parámetro de búsqueda
    const search = req.query.search || "";
    
    // Filtro de búsqueda
    const filtro = search ? {
      $or: [
        { nombre: { $regex: search, $options: "i" } },
        { apellido: { $regex: search, $options: "i" } },
        { correo: { $regex: search, $options: "i" } },
        { region: { $regex: search, $options: "i" } },
        { comuna: { $regex: search, $options: "i" } }
      ]
    } : {};
    
    // Obtener usuarios
    const usuarios = await db.collection("users")
      .find(filtro)
      .sort({ creadoEn: -1 }) // Más recientes primero
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Contar total de usuarios
    const total = await db.collection("users").countDocuments(filtro);
    
    res.json({
      usuarios,
      paginacion: {
        page,
        limit,
        total,
        totalPaginas: Math.ceil(total / limit),
        desde: skip + 1,
        hasta: Math.min(skip + limit, total)
      }
    });
    
  } catch (error) {
    console.error("❌ Error obteniendo usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Obtener 1 usuario por ID (DEBE IR DESPUÉS de /negocios)
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
//  VERIFICAR SESIÓN ACTIVA
// =======================================================
router.get("/api/sesion-activa", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      ok: true,
      user: req.session.user,
    });
  }
  res.status(401).json({
    ok: false,
    message: "No hay sesión activa",
  });
});

router.get("/api/auth/yo", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      ok: true,
      user: req.session.user,
    });
  }
  res.status(401).json({
    ok: false,
    message: "No autenticado",
  });
});

// =======================================================
//  CERRAR SESIÓN
// =======================================================
router.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error cerrando sesión:", err);
      return res.status(500).json({
        ok: false,
        error: "Error al cerrar sesión",
      });
    }

    res.clearCookie("connect.sid");
    res.json({
      ok: true,
      message: "Sesión cerrada correctamente",
    });
  });
});

router.get("/yo", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ ok: false });
  }

  res.json({
    ok: true,
    user: req.session.user
  });
});

// =======================================================
//  NUEVO ENDPOINT: Obtener supermercados disponibles para el usuario
// =======================================================
router.get("/api/supermercados-disponibles", async (req, res) => {
  try {
    const db = getDB();
    
    // ✅ CORREGIDO: Verificar si hay sesión activa
    if (!req.session || !req.session.user || !req.session.user.id) {
      // Usuario no autenticado → mostrar todos
      return res.json({
        disponibles: ["unimarc", "tottus", "jumbo", "acuenta", "santaisabel"],
        mensaje: "Inicia sesión para ver supermercados en tu región"
      });
    }
    
    // ✅ CORREGIDO: Obtener usuario de la sesión
    const usuario = await db.collection("users").findOne(
      { _id: new ObjectId(req.session.user.id) }  // ← user.id en lugar de userId
    );
    
    if (!usuario || !usuario.region || !usuario.comuna) {
      return res.json({
        disponibles: ["unimarc", "tottus", "jumbo", "acuenta", "santaisabel"],
        mensaje: "Completa tu perfil para ver supermercados en tu región"
      });
    }
    
    console.log(`🔍 Buscando supermercados en ${usuario.comuna}, ${usuario.region}`); // ← Para debug
    
    // Buscar supermercados en la región/comuna del usuario
    const locales = await db.collection("locales_supermercados")
      .find({
        region: usuario.region,
        comuna: usuario.comuna
      })
      .toArray();
    
    console.log(`📍 Locales encontrados: ${locales.length}`); // ← Para debug
    
    // Extraer tiendas únicas
    const tiendasDisponibles = [...new Set(locales.map(l => l.tienda))];
    
    console.log(`🏪 Tiendas disponibles:`, tiendasDisponibles); // ← Para debug
    
    // Si no hay locales en la comuna exacta, buscar en toda la región
    let mensaje = "";
    if (tiendasDisponibles.length === 0) {
      const localesRegion = await db.collection("locales_supermercados")
        .find({ region: usuario.region })
        .toArray();
      
      const tiendasRegion = [...new Set(localesRegion.map(l => l.tienda))];
      
      console.log(`🗺️ Tiendas en región ${usuario.region}:`, tiendasRegion); // ← Para debug
      
      return res.json({
        disponibles: tiendasRegion,
        mensaje: `No hay supermercados en ${usuario.comuna}, mostrando los disponibles en ${usuario.region}`
      });
    }
    
    const todasLasTiendas = ["unimarc", "tottus", "jumbo", "acuenta", "santaisabel"];
    const noDisponibles = todasLasTiendas.filter(t => !tiendasDisponibles.includes(t));
    
    if (noDisponibles.length > 0) {
      mensaje = `Los siguientes supermercados no tienen locales en ${usuario.comuna}: ${noDisponibles.join(", ")}`;
    }
    
    res.json({
      disponibles: tiendasDisponibles,
      mensaje,
      usuario: {
        region: usuario.region,
        comuna: usuario.comuna
      }
    });
    
  } catch (error) {
    console.error("❌ Error obteniendo supermercados:", error);
    res.status(500).json({
      disponibles: ["unimarc", "tottus", "jumbo", "acuenta", "santaisabel"],
      mensaje: "Error al verificar disponibilidad"
    });
  }
});



export default router;
