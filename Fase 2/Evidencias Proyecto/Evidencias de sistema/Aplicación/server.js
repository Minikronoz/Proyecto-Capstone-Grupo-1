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