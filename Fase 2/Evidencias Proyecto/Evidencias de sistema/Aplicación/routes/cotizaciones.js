import express from "express";
import verificarSesionUsuario from "../middlewares/authUser.js";
import { getDB } from "../config/db.js";

const router = express.Router();

router.post("/guardar", verificarSesionUsuario, async (req, res) => {
  try {
    const db = getDB();
    const usuario = req.session.user; // 🔥 USAR LO QUE ESTÁ EN SESIÓN
    const carrito = req.body.carrito || [];

    if (!carrito.length) {
      return res.status(400).json({ ok: false, msg: "Carrito vacío" });
    }

    const doc = {
      // 📌 DATOS DEL USUARIO COMPLETOS
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido || "",
        correo: usuario.correo,

        genero: usuario.genero,
        edad: usuario.edad,
        region: usuario.region,
        comuna: usuario.comuna,
        sector: usuario.sector,
        tieneNegocio: usuario.tieneNegocio,
        negocios: usuario.negocios || []
      },

      carrito,

      fecha: new Date(),
    };

    const { insertedId } = await db.collection("cotizaciones").insertOne(doc);

    res.status(201).json({
      ok: true,
      msg: "Cotización guardada con éxito",
      id: insertedId,
    });

  } catch (err) {
    console.error("❌ Error guardando cotización:", err);
    res.status(500).json({ ok: false, msg: "Error al registrar cotización" });
  }
});

export default router;
