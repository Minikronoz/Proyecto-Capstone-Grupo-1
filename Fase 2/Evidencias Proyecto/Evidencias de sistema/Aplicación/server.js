import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import conectarDB from './config/db.js';
import Product from './models/Product.js';
import PriceHistory from './models/PriceHistory.js';
import Busqueda from './models/Busqueda.js';
import Click from './models/Click.js';
import Usuario from './models/Usuario.js';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import authMiddleware from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const http = createServer(app);
const io = new SocketServer(http, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// --- Conexión a Base de Datos MongoDB ---
conectarDB();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);


/* =============================================================
    NUEVA RUTA: Guardar clics con datos de usuario desde MongoDB
   ============================================================= */
app.post('/api/clicks', async (req, res) => {
  try {
    console.log(" Datos recibidos:", req.body);
    const { title, store, currentPrice, formattedPrice, image, link, userEmail } = req.body;

    // Validar campos mínimos
    if (!title || !store || !link || !userEmail) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Buscar usuario en MongoDB
    const usuario = await Usuario.findOne({ email: userEmail });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener la edad del campo virtual
    const edadCalculada = usuario.edad;

    // Crear documento de clic en MongoDB
    const nuevoClick = new Click({
      title,
      store,
      currentPrice,
      formattedPrice,
      image,
      link,
      usuarioInfo: {
        usuarioRut: usuario.rut || "",
        nombre: usuario.nombre || "",
        apellido: usuario.apellido || "",
        edad: edadCalculada,
        sexo: usuario.sexo || "",
        region: usuario.region || "",
        comuna: usuario.comuna || "",
        sector: usuario.sector || ""
      }
    });

    await nuevoClick.save();

    console.log(" Clic guardado correctamente:", nuevoClick);
    res.status(201).json({ message: "Clic guardado correctamente", click: nuevoClick });

  } catch (error) {
    console.error(" Error guardando clic:", error);
    res.status(500).json({
      error: "Error guardando clic",
      details: error.message,
      stack: error.stack
    });
  }
});

/* =============================================================
    RUTA EXISTENTE: Obtener productos
   ============================================================= */
app.get('/api/products', async (req, res) => {
  try {
    const { store } = req.query;
    const query = store ? { store: store.toLowerCase() } : {};
    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

/* =============================================================
    RUTA EXISTENTE: Historial de precios por ID
   ============================================================= */
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

/* =============================================================
   RUTA EXISTENTE: Historial de precios por título y tienda
   ============================================================= */
app.get('/api/products/history', async (req, res) => {
  try {
    const { title, store } = req.query;

    if (!title || !store) {
      return res.status(400).json({ error: 'Se requieren parámetros title y store' });
    }

    const currentProduct = await Product.findOne({
      title: { $regex: new RegExp('^' + title + '$', 'i') },
      store
    });

    if (!currentProduct) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const priceHistory = await PriceHistory.find({ productId: currentProduct._id }).sort({ date: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentProductDate = new Date(currentProduct.lastUpdate);
    currentProductDate.setHours(0, 0, 0, 0);

    const hasTodayRecord = priceHistory.some(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });

    let result = [];

    if (!hasTodayRecord || currentProductDate.getTime() !== today.getTime()) {
      result.push({ ...currentProduct.toObject(), date: currentProduct.lastUpdate });
    }

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

/* =============================================================
    RUTA EXISTENTE: Guardar búsquedas
   ============================================================= */
app.post('/api/busquedas', async (req, res) => {
  try {
    const { busqueda, usuarioInfo } = req.body;

    if (!busqueda || typeof busqueda !== 'string' || busqueda.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'El término de búsqueda es requerido' });
    }

    const nuevaBusqueda = new Busqueda({
      busqueda: busqueda.toLowerCase().trim(),
      usuarioInfo: usuarioInfo || {}
    });

    await nuevaBusqueda.save();

    res.status(201).json({ success: true, message: 'Búsqueda registrada correctamente' });
  } catch (error) {
    console.error('Error al guardar búsqueda:', error);
    res.status(500).json({ success: false, error: 'Error al registrar la búsqueda' });
  }
});

/* =============================================================
   API para el Dashboard - Datos combinados
   ============================================================= */
app.get('/api/dashboard/data', async (req, res) => {
  try {
    // 1. Obtener todas las búsquedas de MongoDB
    const busquedas = await Busqueda.find().lean();
    
    // 2. Obtener todos los usuarios con su información
    const usuarios = await Usuario.find().lean();
    
    // Crear un Map con la información de usuarios incluyendo la edad calculada
    const usuariosSet = new Map();
    busquedas.forEach(b => {
      if (b.usuarioInfo && b.usuarioInfo.usuarioRut) {
        usuariosSet.set(b.usuarioInfo.usuarioRut, {
          rut: b.usuarioInfo.usuarioRut,
          nombre: b.usuarioInfo.nombre,
          apellido: b.usuarioInfo.apellido,
          sexo: b.usuarioInfo.sexo,
          edad: b.usuarioInfo.edad,
          region: b.usuarioInfo.region,
          comuna: b.usuarioInfo.comuna,
          sector: b.usuarioInfo.sector
        });
      }
    });
    
    // 3. Convertir el Map a array
    const usuariosMongoDB = Array.from(usuariosSet.values());
    
    // 4. Devolver respuesta combinada
    res.json({
      busquedas,
      usuarios: usuariosMongoDB
    });
    
  } catch (error) {
    console.error('Error obteniendo datos para dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener usuarios (protegida, solo admin)
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    // Verificar si el usuario es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'No autorizado' });
    }
    
    // Obtener usuarios de MongoDB
    const users = await Usuario.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

/* =============================================================
   Socket.IO
   ============================================================= */
io.on('connection', (socket) => {
  console.log('Cliente conectado para monitoreo de scraping');
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

/* =============================================================
   🔹 Iniciar servidor
   ============================================================= */
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

/* =============================================================
   RUTAS DE API PARA SCRAPING
   ============================================================= */

// Mapa para controlar los procesos de scraping activos
const scrapingProcesses = {
  tottus: { running: false },
  jumbo: { running: false },
  unimarc: { running: false },
  acuenta: { running: false }
};

// Función simulada de scraping (para demostración)
const runScraping = (store) => {
  return new Promise((resolve, reject) => {
    console.log(`Iniciando scraping real para ${store}...`);
    
    // Mapear tiendas a sus respectivos archivos de script
    const scriptPath = {
      'tottus': './catalogo-tottus/tottus-despensa.mjs',
      'jumbo': './catalogo-jumbo/jumbo-despensa.mjs',
      'unimarc': './catalogo-unimarc/unimarc-despensa.mjs',
      'acuenta': './catalogo-acuenta/acuenta-despensa.mjs'
    }[store];
    
    if (!scriptPath) {
      reject(new Error(`No se encontró un script para la tienda ${store}`));
      return;
    }
    
    // Notificar al cliente que el proceso está iniciando
    io.emit("scrape-progress", {
      store,
      message: "Iniciando proceso de scraping..."
    });
    
    // Ejecutar el script como proceso hijo
    const process = spawn('node', [scriptPath], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
    
    // Capturar la salida estándar del proceso (console.log)
    process.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`[${store}] ${message}`);
      
      // Enviar al cliente a través de Socket.IO
      io.emit("scrape-progress", {
        store,
        message: message
      });
    });
    
    // Capturar la salida de error del proceso (console.error)
    process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error(`[${store} ERROR] ${message}`);
      
      // Enviar al cliente como error
      io.emit("scrape-progress", {
        store,
        message: `ERROR: ${message}`,
        type: "error"
      });
    });
    
    // Manejar finalización del proceso
    process.on('close', (code) => {
      console.log(`Proceso de scraping de ${store} terminado con código ${code}`);
      scrapingProcesses[store].running = false;
      
      if (code === 0) {
        io.emit("scrape-complete", {
          store,
          success: true,
          message: `Proceso completado con éxito`
        });
        resolve(true);
      } else {
        io.emit("scrape-error", {
          store,
          message: `El proceso terminó con código de error: ${code}`
        });
        reject(new Error(`Proceso terminó con código ${code}`));
      }
    });
    
    // Manejar errores del proceso
    process.on('error', (err) => {
      console.error(`Error al ejecutar el script de ${store}:`, err);
      scrapingProcesses[store].running = false;
      io.emit("scrape-error", {
        store,
        message: err.message
      });
      reject(err);
    });
  });
};

// Endpoints para iniciar scraping
app.post('/api/scrape/:store', async (req, res) => {
  const { store } = req.params;
  
  // Verificar que sea una tienda válida
  if (!['tottus', 'jumbo', 'unimarc', 'acuenta'].includes(store)) {
    return res.status(400).json({ error: 'Tienda no válida' });
  }
  
  // Verificar si ya hay un proceso en ejecución
  if (scrapingProcesses[store].running) {
    return res.status(409).json({ error: 'Ya hay un proceso de scraping en ejecución para esta tienda' });
  }
  
  // Marcar como en ejecución
  scrapingProcesses[store].running = true;
  
  try {
    // Responder inmediatamente para no bloquear el cliente
    res.status(202).json({ message: `Scraping de ${store} iniciado` });
    
    // Iniciar el proceso de scraping en segundo plano
    runScraping(store).catch(error => {
      console.error(`Error en scraping de ${store}:`, error);
      scrapingProcesses[store].running = false;
      io.emit("scrape-error", {
        store,
        message: error.message || "Error desconocido"
      });
    });
  } catch (error) {
    console.error(`Error al iniciar scraping de ${store}:`, error);
    scrapingProcesses[store].running = false;
    res.status(500).json({ error: `Error al iniciar scraping: ${error.message}` });
  }
});

// Endpoint para verificar estado del scraping
app.get('/api/scrape/status/:store', (req, res) => {
  const { store } = req.params;
  
  if (!['tottus', 'jumbo', 'unimarc', 'acuenta'].includes(store)) {
    return res.status(400).json({ error: 'Tienda no válida' });
  }
  
  res.json({
    store,
    running: scrapingProcesses[store].running
  });
});
