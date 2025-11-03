// ==============================
// 📦 DEPENDENCIAS BASE
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

// 🔹 Conexión a BD
import { connectDB } from "./config/db.js";

// 🔹 Rutas
import scrapeRoutes from "./routes/scrape.routes.js";
import usersRoutes from "./routes/users.routes.js";
import productosRoutes from "./routes/productos.js";
import catalogoRouter from "./routes/catalogo.js";
import clicksRoutes from "./routes/clicks.routes.js";
import estadisticasRoutes from "./routes/estadisticas.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================
// Inicialización
// ==============================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// ==============================
// Middleware / Sesiones
// ==============================
app.set("trust proxy", 1);
app.use(
  cors({
    origin: "*", // abierto para desarrollo
    credentials: true,
  })
);
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
// Conexión a la Base de Datos
// ==============================
try {
  await connectDB();
  console.log("✅ Conectado correctamente a MongoDB Atlas → Base de datos: duoc_user");
} catch (error) {
  console.error("❌ Error al conectar con la base de datos:", error.message);
  process.exit(1);
}

// ==============================
// RUTAS API (ORDEN CORRECTO)
// ==============================

// ⚡️ Scraping primero
app.use("/api/scrape", scrapeRoutes);

// Luego las demás APIs
app.use("/api/productos", productosRoutes);

// ✅ Catálogo ajustado correctamente
app.use("/api/catalogo", catalogoRouter);

app.use("/api/clicks", clicksRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Usuarios al final (para no interceptar /api)
app.use("/", usersRoutes);

// ==============================
// Archivos estáticos
// ==============================
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// Vistas HTML
// ==============================
app.get("/", (req, res) => res.redirect("/catalogo"));

app.get("/catalogo", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "catalogo.html"))
);

app.get("/editar-perfil", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "editar-perfil.html"))
);

app.get("/historico", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "historico.html"))
);

app.get("/principal", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "principal.html"))
);

app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "dashboard.html"))
);

// ==============================
// Socket.io
// ==============================
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado vía Socket.io");
  socket.on("disconnect", () => console.log("🔴 Cliente desconectado"));
});

// ==============================
// Servidor
// ==============================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🌍 Servidor corriendo en http://localhost:${PORT}`);
});
