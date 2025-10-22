import express from "express";
import { db } from "../firebase-admin-config.js"; // Firestore (Firebase Admin)
import Click from "../models/Click.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log(" Datos recibidos del frontend:", req.body);

    const { title, store, currentPrice, formattedPrice, image, link, userEmail } = req.body;

    // Validación básica
    if (!title || !store || !userEmail) {
      return res.status(400).json({ msg: "Faltan datos (title, store o userEmail)" });
    }

    // Buscar usuario en Firestore por email
    const snapshot = await db.collection("usuarios").where("email", "==", userEmail).limit(1).get();

    if (snapshot.empty) {
      console.log(" Usuario no encontrado en Firestore:", userEmail);
      // En caso de no encontrar usuario, igual se guarda el clic pero sin datos personales
      const nuevoClick = new Click({
        title,
        store,
        currentPrice,
        formattedPrice,
        image,
        link,
        usuarioInfo: {},
      });

      await nuevoClick.save();
      console.log(" Clic guardado sin usuarioInfo (usuario no encontrado)");
      return res.status(201).json({ msg: "Clic guardado sin usuarioInfo (usuario no encontrado)" });
    }

    const userData = snapshot.docs[0].data();

    //  Calcular edad si existe fecha de nacimiento
    let edadCalculada = null;
    if (userData.fechaNacimiento) {
      const nacimiento = new Date(userData.fechaNacimiento);
      const hoy = new Date();
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
      edadCalculada = edad;
    }

    //  Crear nuevo clic con información del usuario y producto
    const nuevoClick = new Click({
      title,
      store,
      currentPrice,
      formattedPrice,
      image,
      link,
      usuarioInfo: {
        usuarioRut: userData.rut || "",
        nombre: userData.nombre || "",
        apellido: userData.apellido || "",
        edad: edadCalculada,
        sexo: userData.sexo || "",
        region: userData.region || "",
        comuna: userData.comuna || "",
        sector: userData.sector || "",
      },
    });

    await nuevoClick.save();

    console.log(" Clic guardado correctamente:", nuevoClick);
    res.status(201).json({ msg: "Clic guardado correctamente en MongoDB" });

  } catch (error) {
    console.error(" Error guardando clic:", error);
    res.status(500).json({
      error: "Error guardando clic en MongoDB",
      details: error.message,
      stack: error.stack,
    });
  }
});

export default router;
