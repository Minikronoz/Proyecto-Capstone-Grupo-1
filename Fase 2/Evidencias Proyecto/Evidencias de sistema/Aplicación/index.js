// ==============================
// 🧩 DEPENDENCIAS BASE
// ==============================
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
import { connectDB } from "./config/db.js";

dotenv.config(); // ✅ Cargar variables de entorno primero

// ==============================
// 📦 IMPORTACIÓN DE RUTAS
// ==============================
import scrapeRoutes from "./routes/scrape.routes.js";
import usersRoutes from "./routes/users.routes.js";
import productosRoutes from "./routes/productos.js";
import catalogoRouter from "./routes/catalogo.js";
import clicksRoutes from "./routes/clicks.routes.js";
import estadisticasRoutes from "./routes/estadisticas.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import busquedasRoutes from "./routes/busquedas.routes.js"; // ✅ Ruta de búsquedas

// ==============================
// 📁 RUTAS Y ARCHIVOS BASE
// ==============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================
// 🚀 APP / SERVER / SOCKET.IO
// ==============================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// ==============================
// 🧠 CONEXIÓN A MONGODB ATLAS
// ==============================
try {
  await connectDB();
  console.log("✅ Conectado correctamente a MongoDB Atlas → Base de datos: duoc_user");
} catch (error) {
  console.error("❌ Error al conectar con la base de datos:", error.message);
  process.exit(1);
}

// ==============================
// ⚙️ MIDDLEWARES GLOBALES
// ==============================
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecreto123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI ||
        "mongodb+srv://duoc_user:7OtcjHwo0BDDcqih@cluster0.lkz5yof.mongodb.net/duoc_user",
      dbName: "duoc_user",
      collectionName: "sesiones",
      ttl: 60 * 60 * 2, // 2 horas
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
// 🔹 RUTAS API
// ==============================

// 🔸 Dashboard general
app.use("/api/dashboard", dashboardRoutes);

// 🔸 Scraping manual
app.use("/api/scrape", scrapeRoutes);

// 🔸 Productos, catálogo, clics, analítica y búsquedas
app.use("/api/productos", productosRoutes);
app.use("/api/catalogo", catalogoRouter);
app.use("/api/clicks", clicksRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/busquedas", busquedasRoutes); // ✅ Activa los endpoints de búsquedas

// 🔸 Usuarios y autenticación
app.use("/", usersRoutes);

// ==============================
// 🧰 SCRAPING MANUAL CON LOGS
// ==============================
app.post("/api/scrape/:supermercado", (req, res) => {
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
    console.log(`[${supermercado}] ${line}`);
    io.emit("scraping-log", `[${supermercado}] ${line}`);
  });

  proceso.stderr.on("data", (data) => {
    const err = data.toString().trim();
    console.error(`[${supermercado}] ❌ ${err}`);
    io.emit("scraping-log", `[${supermercado}] ❌ ${err}`);
  });

  proceso.on("close", (code) => {
    const msg = `[${supermercado}] 🚀 Proceso finalizado (código ${code})`;
    console.log(msg);
    io.emit("scraping-log", msg);
  });

  res.json({ message: `Scraping de ${supermercado} iniciado.` });
});

// ==============================
// 🌐 ARCHIVOS ESTÁTICOS / VISTAS
// ==============================
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.redirect("/catalogo"));
app.get("/catalogo", (req, res) => res.sendFile(path.join(__dirname, "views", "catalogo.html")));
app.get("/editar-perfil", (req, res) => res.sendFile(path.join(__dirname, "views", "editar-perfil.html")));
app.get("/historico", (req, res) => res.sendFile(path.join(__dirname, "views", "historico.html")));
app.get("/principal", (req, res) => res.sendFile(path.join(__dirname, "views", "principal.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "views", "dashboard.html")));

// ==============================
// 💬 SOCKET.IO (LOGS EN TIEMPO REAL)
// ==============================
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado vía Socket.io");
  socket.emit("scraping-log", "📡 Conexión establecida con el servidor.");

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado");
  });
});

// ==============================
// 🚀 SERVIDOR EN EJECUCIÓN
// ==============================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🌍 Servidor corriendo en http://localhost:${PORT}`);
});
