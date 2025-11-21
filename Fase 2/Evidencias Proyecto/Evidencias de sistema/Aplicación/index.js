// ============================================================
//  DEPENDENCIAS BASE
// ============================================================
import express from "express";
import http from "http";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { spawn } from "child_process";
import fs from "fs";
import  verificarSesionUsuario  from "./middlewares/authUser.js";
import {verificarAdmin} from "./middlewares/authAdmin.js";
import verificarCliente from "./middlewares/authCliente.js";
import { connectDB, getDB } from "./config/db.js";

dotenv.config();

// ============================================================
//  IMPORTACIÓN DE RUTAS API
// ============================================================
import scrapeRoutes from "./routes/scrape.routes.js";
import usersRoutes from "./routes/users.routes.js";
import productosRoutes from "./routes/productos.js";
import catalogoRouter from "./routes/catalogo.js";
import clicksRoutes from "./routes/clicks.routes.js";
import estadisticasRoutes from "./routes/estadisticas.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import busquedasRoutes from "./routes/busquedas.routes.js";
import historicoRoutes from "./routes/historico.routes.js";
import negociosRoutes from "./routes/negocios.routes.js";

// ============================================================
//  CONFIG PATHS
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
//  APP + SERVER + SOCKET.IO
// ============================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// ============================================================
//  CONEXIÓN A MONGODB ATLAS
// ============================================================
await connectDB();
console.log("📦 Conectado a MongoDB Atlas");

// ============================================================
//  MIDDLEWARES
// ============================================================
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
//  SESIONES
// ============================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecreto123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: "SistemaDeReportes",
      collectionName: "sesiones",
      ttl: 60 * 60 * 2,
    }),
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

// ==============================
// RUTAS API (ORDEN IMPORTANTE)
// ==============================

// Rutas de autenticación y sesión (PRIMERO)
app.use("/", usersRoutes); // Contiene /api/sesion-activa y /api/auth/yo

// Rutas específicas antes de las genéricas
app.use("/api/productos", productosRoutes); // Contiene /sugerencias, /:id/historico, etc.
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/scrape", scrapeRoutes);
app.use("/api/catalogo", catalogoRouter);
app.use("/api/clicks", clicksRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/busquedas", busquedasRoutes);
app.use("/api/negocios", negociosRoutes);

// Rutas de vistas HTML
app.use("/historico", historicoRoutes); 

// ============================================================
//  SCRAPING MANUAL
// ============================================================
app.post("/api/scrape/ejecutar/:supermercado", (req, res) => {
  const { supermercado } = req.params;
  const script = `scripts/${supermercado}-despensa.mjs`;

  if (!fs.existsSync(script)) {
    io.emit("scraping-log", `❌ Script no encontrado: ${script}`);
    return res.status(404).json({ message: "Script no encontrado" });
  }

  io.emit(
    "scraping-log",
    `[${new Date().toLocaleTimeString("es-CL", { hour12: false })}] 🟢 Iniciando scraping de ${supermercado}...`
  );

  const proceso = spawn("node", [script]);

  proceso.stdout.on("data", (data) => {
    const line = data.toString().trim();
    io.emit("scraping-log", `[${supermercado}] ${line}`);
  });

  proceso.stderr.on("data", (data) => {
    const err = data.toString().trim();
    io.emit("scraping-log", `[${supermercado}] ❌ ${err}`);
  });

  proceso.on("close", (code) => {
    io.emit("scraping-log", `[${supermercado}] 🚀 Finalizado (código ${code})`);
  });

  res.json({ message: `Scraping iniciado` });
});

// ============================================================
//  ARCHIVOS ESTÁTICOS + TODAS LAS VISTAS
// ============================================================
app.use(express.static(path.join(__dirname, "public")));

//  Página principal → catálogo
app.get("/", (req, res) => res.redirect("/catalogo"));

// Catálogo
app.get("/catalogo", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "catalogo.html"))
);

// Principal (admin)
app.get(
  "/principal",
  verificarSesionUsuario,
  verificarAdmin,
  (req, res) =>
    res.sendFile(path.join(__dirname, "views", "principal.html"))
);

// Dashboard Analítico
app.get("/dashboard",
  verificarSesionUsuario,
  verificarCliente,
  (req, res) =>
    res.sendFile(path.join(__dirname, "views", "dashboard.html"))
);

// LOGIN
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "login.html"))
);

// REGISTRO
app.get("/registrar", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "registrar.html"))
);

// EDITAR PERFIL
app.get("/editar-perfil", verificarSesionUsuario, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "editar-perfil.html"))
);

// RECUPERAR CONTRASEÑA
app.get("/forgot", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "forgot.html"))
);

// HISTÓRICO DE PRODUCTOS
app.get("/historico", verificarSesionUsuario, (req, res) =>
  res.sendFile(path.join(__dirname, "views", "historico.html"))
);

// ============================================================
//  SOCKET.IO
// ============================================================
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado");
  socket.emit("scraping-log", "📡 Conexión establecida con el servidor.");
  socket.on("disconnect", () => console.log("🔴 Cliente desconectado"));
});

// ============================================================
//  INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🌍 Servidor en http://localhost:${PORT}`);
});
