// Archivo: Aplicación/routes/busquedas.js

import express from 'express';
import { db } from '../firebase-admin-config.js';
// La ruta correcta al modelo que está en la carpeta del backend
import Busqueda from '../models/Busqueda.js';

const router = express.Router();

// Ruta para guardar una nueva búsqueda
router.post('/', async (req, res) => {
  const { busqueda, userEmail } = req.body;

  if (!busqueda || !userEmail) {
    return res.status(400).json({ msg: 'Faltan datos (busqueda, userEmail)' });
  }

  try {
    const snapshot = await db.collection('usuarios').where('email', '==', userEmail).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ msg: 'Usuario no encontrado en Firestore' });
    }

    const userData = snapshot.docs[0].data();
    
    let edadCalculada = null;
    if (userData.fechaNacimiento) {
        const nacimiento = new Date(userData.fechaNacimiento);
        const hoy = new Date();
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
        edadCalculada = edad;
    }

    const nuevaBusqueda = new Busqueda({
      busqueda: busqueda,
      usuarioInfo: {
        usuarioRut: userData.rut,
        nombre: userData.nombre,
        apellido: userData.apellido,
        edad: edadCalculada,
        sexo: userData.sexo,
        region: userData.region,
        comuna: userData.comuna,
        sector: userData.sector,
      }
    });

    await nuevaBusqueda.save();
    res.status(201).json({ msg: 'Búsqueda registrada en MongoDB exitosamente' });

  } catch (error) {
    console.error('Error al registrar búsqueda:', error.message);
    res.status(500).send('Error del servidor');
  }
});

// Ruta para obtener todas las búsquedas
router.get('/', async (req, res) => {
  try {
    const todasLasBusquedas = await Busqueda.find({});

    const datosParaDashboard = todasLasBusquedas.map(item => ({
      id: item._id,
      busqueda: item.busqueda,
      fechaBusqueda: item.fechaBusqueda,
      ...item.usuarioInfo,
    }));

    res.json(datosParaDashboard);

  } catch (error) {
    console.error('Error al obtener las búsquedas desde MongoDB:', error.message);
    res.status(500).send('Error del servidor');
  }
});

export default router;