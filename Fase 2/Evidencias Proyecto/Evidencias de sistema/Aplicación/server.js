import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import conectarDB from './config/db.js';
import Product from './models/Product.js';
import PriceHistory from './models/PriceHistory.js';
import Busqueda from './models/Busqueda.js'; // Importar el modelo de búsquedas
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const http = createServer(app);
const io = new Server(http, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// --- Conexión a Base de Datos ---
conectarDB();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Rutas de la API ---

// Ruta para obtener productos
app.get('/api/products', async (req, res) => {
  try {
    const { store } = req.query;
    let query = {};
    
    if (store) {
      query.store = store.toLowerCase();
    }
    
    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Ruta para obtener historial de precios de un producto
app.get('/api/products/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await PriceHistory.find({ productId: id }).sort({ date: -1 });
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// Endpoint para obtener historial de precios por título y tienda
app.get('/api/products/history', async (req, res) => {
  try {
    const { title, store } = req.query;
    
    if (!title || !store) {
      return res.status(400).json({ error: 'Se requieren parámetros title y store' });
    }
    
    // Primero buscar el producto actual
    const currentProduct = await Product.findOne({
      title: { $regex: new RegExp('^' + title + '$', 'i') },
      store: store
    });
    
    if (!currentProduct) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Buscar historial de precios
    const priceHistory = await PriceHistory.find({
      productId: currentProduct._id
    }).sort({ date: -1 });
    
    // Verificar si ya existe un registro para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentProductDate = new Date(currentProduct.lastUpdate);
    currentProductDate.setHours(0, 0, 0, 0);
    
    // Comprobar si ya existe un registro de hoy en el historial
    const hasTodayRecord = priceHistory.some(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    
    // Preparar respuesta, incluir el producto actual solo si no hay registro de hoy
    let result = [];
    
    if (!hasTodayRecord || currentProductDate.getTime() !== today.getTime()) {
      result.push({
        ...currentProduct.toObject(),
        date: currentProduct.lastUpdate
      });
    }
    
    // Añadir el historial
    result = [
      ...result,
      ...priceHistory.map(record => ({
        title: currentProduct.title,
        store: currentProduct.store,
        currentPrice: record.price,
        formattedPrice: `$${record.price}`,
        date: record.date,
        image: currentProduct.image,
        link: currentProduct.link
      }))
    ];
    
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo historial de precios:', error);
    res.status(500).json({ error: 'Error al obtener historial de precios' });
  }
});

// Ruta para guardar búsquedas
app.post('/api/busquedas', async (req, res) => {
  try {
    const { busqueda, usuarioInfo } = req.body;
    
    // Validar datos
    if (!busqueda || typeof busqueda !== 'string' || busqueda.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'El término de búsqueda es requerido' 
      });
    }
    
    // Crear nueva búsqueda
    const nuevaBusqueda = new Busqueda({
      busqueda: busqueda.toLowerCase().trim(),
      usuarioInfo: usuarioInfo || {}
    });
    
    // Guardar búsqueda en MongoDB
    await nuevaBusqueda.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Búsqueda registrada correctamente' 
    });
  } catch (error) {
    console.error('Error al guardar búsqueda:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al registrar la búsqueda' 
    });
  }
});

// --- Rutas para ejecutar scraping ---
app.post('/api/scrape/:store', (req, res) => {
  const { store } = req.params;
  let scriptPath;
  
  switch(store.toLowerCase()) {
    case 'unimarc':
      scriptPath = path.join(__dirname, 'catalogo-unimarc', 'unimarc-despensa.mjs');
      break;
    case 'tottus':
      scriptPath = path.join(__dirname, 'catalogo-tottus', 'tottus-despensa.mjs');
      break;
    case 'jumbo':
      scriptPath = path.join(__dirname, 'catalogo-jumbo', 'jumbo-despensa.mjs');
      break;
    case 'acuenta':
      scriptPath = path.join(__dirname, 'catalogo-acuenta', 'acuenta-despensa.mjs');
      break;
    default:
      return res.status(400).json({ error: 'Tienda no soportada' });
  }
  
  console.log(`Ejecutando script: ${scriptPath}`);
  
  // Crear un proceso hijo para ejecutar el script
  const scrapeProcess = spawn('node', [scriptPath]);
  
  let output = '';
  let errorOutput = '';
  
  scrapeProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    io.emit('scrape-progress', { store, message: chunk });
    console.log(`[${store}]: ${chunk}`);
  });
  
  scrapeProcess.stderr.on('data', (data) => {
    const chunk = data.toString();
    errorOutput += chunk;
    io.emit('scrape-error', { store, message: chunk });
    console.error(`[${store} ERROR]: ${chunk}`);
  });
  
  scrapeProcess.on('close', (code) => {
    console.log(`Proceso de scraping ${store} finalizado con código: ${code}`);
    if (code === 0) {
      io.emit('scrape-complete', { store, success: true });
      res.json({ success: true, message: `Scraping de ${store} completado` });
    } else {
      io.emit('scrape-complete', { store, success: false, error: errorOutput });
      res.status(500).json({ success: false, error: `Error en scraping de ${store}`, details: errorOutput });
    }
  });
});

// --- Endpoint para obtener datos del dashboard ---
app.get('/api/dashboard/data', async (req, res) => {
  try {
    // Obtener búsquedas
    const busquedas = await Busqueda.find({}).sort({ fechaBusqueda: -1 });
    
    // Obtener usuarios únicos (basados en la información de usuarios en las búsquedas)
    const usuariosUnicos = await Busqueda.aggregate([
      { $match: { 'usuarioInfo.usuarioRut': { $ne: null } } },
      { $group: { _id: '$usuarioInfo.usuarioRut', data: { $first: '$usuarioInfo' } } },
      { $project: { 
        _id: 0, 
        rut: '$_id', 
        nombre: '$data.nombre',
        apellido: '$data.apellido',
        edad: '$data.edad',
        sexo: '$data.sexo',
        region: '$data.region',
        comuna: '$data.comuna',
        sector: '$data.sector'
      }}
    ]);

    res.json({
      busquedas,
      usuarios: usuariosUnicos
    });
  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    res.status(500).json({ error: 'Error obteniendo datos del dashboard' });
  }
});

// Reemplaza el endpoint de /api/user/current con esta versión mejorada
app.get('/api/user/current', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // En una implementación completa, verificarías el token con Firebase Admin
    // Por ahora, para hacer pruebas, respondemos con datos de prueba
    // TODO: Implementar verificación real del token con admin.auth().verifyIdToken()
    
    // Simular datos del usuario para pruebas
    res.json({
      email: "usuario@ejemplo.com",
      nombre: "Usuario Ejemplo",
      tieneNegocio: true,
      negocios: [
        {
          region: "Metropolitana",
          comuna: "Santiago",
          sector: "Centro"
        }
      ]
    });
  } catch (error) {
    console.error('Error obteniendo datos del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- Socket.IO para actualizaciones en tiempo real ---
io.on('connection', (socket) => {
  console.log('Cliente conectado');
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});