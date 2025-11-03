// routes/clicks.routes.js
import express from "express";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.post("/registrar", async (req, res) => {
  try {
    const db = getDB();
    const body = req.body;

    const producto = body?.producto || body;
    if (!producto?.idProducto) {
      return res.status(400).json({ error: "Faltan datos del producto" });
    }

    // 🔹 Intentar convertir el precio si llega en texto
    let precioFinal = 0;
    if (typeof producto.precio === "number" && !isNaN(producto.precio)) {
      precioFinal = producto.precio;
    } else if (typeof producto.precio === "string") {
      const limpio = producto.precio.replace(/[^\d,\.]/g, "").replace(",", ".");
      precioFinal = parseFloat(limpio) || 0;
    }

    // 🔹 Si sigue siendo 0, intentar buscar el precio real desde la colección productos
    let pricePerUnit = producto.pricePerUnit || null;
    if (!precioFinal || precioFinal === 0 || !pricePerUnit) {
      let prodDB = null;

      // Buscar por _id
      if (ObjectId.isValid(producto.idProducto)) {
        prodDB = await db
          .collection("productos")
          .findOne(
            { _id: new ObjectId(producto.idProducto) },
            { projection: { currentPrice: 1, pricePerUnit: 1 } }
          );
      }

      // Si no lo encontró por _id, buscar por link
      if (!prodDB && producto.link) {
        prodDB = await db
          .collection("productos")
          .findOne(
            { link: producto.link },
            { projection: { currentPrice: 1, pricePerUnit: 1 } }
          );
      }

      // Si lo encontró, usar sus precios
      if (prodDB) {
        if (prodDB.currentPrice) precioFinal = Number(prodDB.currentPrice) || 0;
        if (prodDB.pricePerUnit) pricePerUnit = prodDB.pricePerUnit;
      }
    }

    // 🔹 Buscar usuario activo por sesión
    const sesion = req.session?.user || null;
    let userData = null;

    if (sesion?.correo) {
      userData = await db.collection("users").findOne({ correo: sesion.correo });
    }

    // 🔹 Calcular edad actual si tiene fechaNacimiento
    let edadCalculada = null;
    if (userData?.fechaNacimiento) {
      const nacimiento = new Date(userData.fechaNacimiento);
      const hoy = new Date();
      edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edadCalculada--;
    }

    const now = new Date();

    const clickDoc = {
      idProducto: producto.idProducto,
      titulo: producto.titulo || "",
      marca: producto.marca || "",
      precio: precioFinal,
      precioPorUnidad: pricePerUnit || null,
      supermercado: producto.supermercado || "",
      link: producto.link || "",
      imagen: producto.imagen || "",

      // ✅ Datos del usuario logueado
      userId: userData?._id?.toString() || sesion?.id || null,
      userCorreo: userData?.correo || sesion?.correo || null,
      userNombre: userData?.nombre || null,
      userApellido: userData?.apellido || null,
      userRut: userData?.rut || null,
      userRegion: userData?.region || null,
      userComuna: userData?.comuna || null,
      userSector: userData?.sector || null,
      userGenero: userData?.genero || null,
      userFechaNacimiento: userData?.fechaNacimiento || null,
      userEdad: edadCalculada || null,
      negocios: userData?.negocios || [],

      createdAt: now,
      fecha: now.toISOString().slice(0, 10),
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
      ua: req.headers["user-agent"] || null,
    };

    await db.collection("clicks").insertOne(clickDoc);

    console.log(" Click guardado correctamente");

    return res.json({
      ok: true,
      msg: "Click guardado correctamente",
      precio: clickDoc.precio,
      precioPorUnidad: clickDoc.precioPorUnidad,
    });
  } catch (error) {
    console.error(" Error al registrar click:", error);
    return res.status(500).json({ error: "No se pudo registrar el click" });
  }
});

export default router;
