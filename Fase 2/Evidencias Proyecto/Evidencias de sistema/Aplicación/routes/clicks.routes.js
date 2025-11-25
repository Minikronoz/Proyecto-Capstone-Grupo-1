// ==============================
//  routes/clicks.routes.js
// ==============================
import express from "express";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// =============================================
//  REGISTRO DE CLICKS DE PRODUCTOS  (CORREGIDO)
// =============================================
router.post("/registrar", async (req, res) => {
  try {
    const db = getDB();
    const { producto } = req.body;

    //  Validación mínima
    if (!producto || !producto.idProducto) {
      return res.status(400).json({ error: "Faltan datos esenciales del producto." });
    }

    // =============================================
    //  NORMALIZACIÓN DEL PRECIO
    // =============================================
    let precioFinal = 0;

    if (typeof producto.precio === "number" && !isNaN(producto.precio)) {
      precioFinal = producto.precio;
    } else if (typeof producto.precio === "string") {
      const limpio = producto.precio.replace(/[^\d,\.]/g, "").replace(",", ".");
      precioFinal = parseFloat(limpio) || 0;
    }

    // Normalización del precio por unidad
    let pricePerUnit = producto.pricePerUnit || null;

    // =============================================
    //  BUSCAR DATOS EN DB SI FALTAN
    // =============================================
    if (!precioFinal || precioFinal === 0 || !pricePerUnit) {
      let prodDB = null;

      if (ObjectId.isValid(producto.idProducto)) {
        prodDB = await db.collection("productos").findOne(
          { _id: new ObjectId(producto.idProducto) },
          { projection: { currentPrice: 1, pricePerUnit: 1 } }
        );
      }

      if (!prodDB && producto.link) {
        prodDB = await db.collection("productos").findOne(
          { link: producto.link },
          { projection: { currentPrice: 1, pricePerUnit: 1 } }
        );
      }

      if (prodDB) {
        precioFinal = Number(prodDB.currentPrice) || precioFinal;
        pricePerUnit = prodDB.pricePerUnit || pricePerUnit;
      }
    }


const sesion = req.session?.user || null;
let userData = null;


if (sesion?.correo) {
  userData = await db.collection("users").findOne({ correo: sesion.correo });
}

// ✓ Calcular edad
let edadCalculada = null;
if (userData?.fechaNacimiento) {
  const nacimiento = new Date(userData.fechaNacimiento);
  const hoy = new Date();
  edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edadCalculada--;
}


    // =============================================
    //  DOCUMENTO FINAL A GUARDAR
    // =============================================
    const now = new Date();

    const clickDoc = {
      //  Producto
      idProducto: producto.idProducto,
      titulo: producto.titulo || "",
      marca: producto.marca || "",
      precio: precioFinal,
      precioPorUnidad: pricePerUnit || null,
      supermercado: producto.supermercado || "",
      link: producto.link || "",
      imagen: producto.imagen || "",

      //  Información del usuario (NORMALIZADA)
      userId: userData?._id?.toString() || sesion?.id || null,
      userCorreo: userData?.correo || sesion?.correo || "anonimo@local.cl",
      userNombre: userData?.nombre || "Usuario",
      userApellido: userData?.apellido || "",
      userGenero: userData?.genero?.trim() || "No especificado",

      userRegion: userData?.region?.trim() === "Metropolitana"
        ? "Metropolitana de Santiago"
        : userData?.region?.trim() || "Sin región",
      userComuna: userData?.comuna?.trim() || "Sin comuna",
      userSector: userData?.sector?.trim() || "Sin sector",
      userEdad: edadCalculada,
      negocios: userData?.negocios || [],

      //  Fecha
      createdAt: now,
      fecha: now,

      //  Técnicos
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
      ua: req.headers["user-agent"] || null,
    };

    // =============================================
    //  GUARDAR CLICK
    // =============================================
    await db.collection("clicks").insertOne(clickDoc);

    console.log(`🟢 Click registrado: ${clickDoc.titulo} (${clickDoc.supermercado})`);

    return res.json({
      ok: true,
      msg: "Click registrado correctamente",
      precio: clickDoc.precio,
      precioPorUnidad: clickDoc.precioPorUnidad,
    });
  } catch (error) {
    console.error("❌ Error al registrar click:", error);
    return res.status(500).json({ error: "Error interno al registrar el click." });
  }
});

// =============================================
//  OBTENER ÚLTIMOS CLICKS
// =============================================
router.get("/ultimos", async (req, res) => {
  try {
    const db = getDB();

    const clicks = await db
      .collection("clicks")
      .find()
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json(clicks);
  } catch (error) {
    console.error("❌ Error al listar clicks:", error);
    res.status(500).json({ error: "No se pudieron obtener los clicks." });
  }
});

export default router;
