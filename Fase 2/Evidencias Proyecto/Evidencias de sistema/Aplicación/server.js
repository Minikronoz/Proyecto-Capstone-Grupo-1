import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const http = createServer(app);
const io = new Server(http, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.post('/api/scrape/:store', (req, res) => {
  const { store } = req.params;
  
  // Construir la ruta al script usando __dirname
  const scriptPath = join(__dirname, `catalogo-${store}`, `${store}-despensa.mjs`);
  
  console.log(`Ejecutando script: ${scriptPath}`);
  
  // Ejecutar el script desde la raíz del proyecto
  const process = spawn('node', [scriptPath], {
    cwd: __dirname // Esto asegura que el script se ejecute desde la raíz del proyecto
  });
  
  process.stdout.on('data', (data) => {
    const log = data.toString();
    io.emit('scrapingLog', {
      store,
      log,
      type: 'info'
    });
  });
  
  process.stderr.on('data', (data) => {
    const log = data.toString();
    io.emit('scrapingLog', {
      store,
      log: `ERROR: ${log}`,
      type: 'error'
    });
    // Emitir evento de error para detener el proceso
    io.emit('scrapingError', { store });
  });
  
  process.on('close', (code) => {
    console.log(`${store} proceso terminado con código:`, code);
    io.emit('scrapingComplete', { 
      store,
      success: code === 0
    });
    res.json({ 
      success: code === 0,
      message: code === 0 ? 'Proceso completado exitosamente' : 'Error en el proceso'
    });
  });
});

const PORT = 3001;
http.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});