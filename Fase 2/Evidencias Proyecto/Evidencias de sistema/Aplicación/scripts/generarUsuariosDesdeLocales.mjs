// ======================================================================
// 🧑‍🤝‍🧑 GENERADOR DE USUARIOS FICTICIOS POR REGIÓN Y COMUNA
// ======================================================================
// ✔ Ahora usa el archivo oficial data/regionesComunas.js
// ✔ Genera 10 usuarios por comuna (solo si faltan)
// ✔ Base de datos "user", colección "users"
// ✔ Evita duplicados
// ✔ Correcciones completas
// ======================================================================

import { connectDB, getDB } from "../config/db.js";
import { REGIONES_COMUNAS } from "../data/regionesComunas.js";

// ======================================================================
// CONFIGURACIÓN
// ======================================================================
const USUARIOS_POR_COMUNA = 10;
const COLECCION_USUARIOS = "users";

// ======================================================================
// DATOS REALISTAS CHILENOS
// ======================================================================
const NOMBRES_HOMBRE = [
  "Carlos","Juan","Pedro","Diego","Felipe","José","Andrés","Matías","Jorge","Cristóbal",
  "Sebastián","Tomás","Nicolás","Francisco","Rodrigo","Pablo","Mauricio","Héctor","Luis","Patricio",
  "Miguel","Raúl","Ignacio","Bruno","Adrián","Esteban","Álvaro","Fabián","Roberto","Eduardo"
];

const NOMBRES_MUJER = [
  "Daniela","Camila","Francisca","Catalina","Fernanda","Valentina","Josefina","Constanza","María","Javiera",
  "Antonia","Isidora","Trinidad","Romina","Paula","Carolina","Claudia","Alejandra","Natalia","Sandra",
  "Florencia","Amparo","Pía","Belén","Lucía","Victoria","Elisa","Cecilia","Andrea","Lorena"
];

const APELLIDOS = [
  "González","Muñoz","Rojas","Díaz","Pérez","Soto","Contreras","Silva","Martínez","Sepúlveda",
  "Morales","Rodríguez","López","Fuentes","Torres","Araya","Flores","Espinoza","Castillo","Vargas",
  "Reyes","Campos","Figueroa","Salazar","Orellana","Navarrete","Cortés","Molina","Sanhueza","Aguilar"
];

const DOMINIOS_CORREO = ["gmail.com","hotmail.com","outlook.com","yahoo.com"];

// ======================================================================
// UTILIDADES
// ======================================================================
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function slugify(str = "") {
  if (!str) return "";
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function generarCorreo(nombre, apellido, comuna) {
  const base = `${slugify(nombre)}.${slugify(apellido)}`;
  const sufijo = `${slugify(comuna)}${randomInt(10, 99)}`;
  return `${base}.${sufijo}@${randomItem(DOMINIOS_CORREO)}`;
}

function generarDireccion(comuna) {
  const calles = [
    "Av. Libertador Bernardo O'Higgins","Av. Los Carrera","Av. Independencia","Calle 21 de Mayo","Calle Balmaceda",
    "Calle Prat","Pasaje Los Copihues","Pasaje Los Alerces","Av. Las Flores","Av. Las Palmeras","Camino Real",
    "Pasaje del Sol","Calle Los Álamos","Av. Central","Calle San Martín","Calle Los Olivos"
  ];
  return `${randomItem(calles)} ${randomInt(100, 9999)}, ${comuna}`;
}

function generarFechasActividad() {
  const ahora = Date.now();
  const hace90 = ahora - 90 * 86400000;
  const creado = new Date(randomInt(hace90, ahora));
  const login = Math.random() < 0.6 ? new Date(randomInt(creado.getTime(), ahora)) : creado;
  return { createdAt: creado, lastLogin: login };
}

function generarUsuario(region, comuna) {
  const esHombre = Math.random() < 0.5;
  const nombre = randomItem(esHombre ? NOMBRES_HOMBRE : NOMBRES_MUJER);
  const apellido = randomItem(APELLIDOS);
  const edad = randomInt(18, 70);
  const { createdAt, lastLogin } = generarFechasActividad();

  return {
    nombre,
    apellido,
    genero: esHombre ? "M" : "F",
    edad,
    correo: generarCorreo(nombre, apellido, comuna),
    region,
    comuna,
    direccion: generarDireccion(comuna),
    createdAt,
    lastLogin
  };
}

// ======================================================================
// MAIN
// ======================================================================
async function main() {
  console.log("\n🟢 Generando usuarios usando Regiones oficiales de Chile...\n");

  await connectDB();
  const db = getDB();
  const colUsuarios = db.collection(COLECCION_USUARIOS);

  let total = 0;

  for (const region in REGIONES_COMUNAS) {
    const comunas = REGIONES_COMUNAS[region];

    for (const comuna of comunas) {
      const existentes = await colUsuarios.countDocuments({ region, comuna });
      const faltan = USUARIOS_POR_COMUNA - existentes;

      if (faltan > 0) {
        console.log(`➕ ${region} / ${comuna} → Generando ${faltan} usuarios...`);
        const nuevos = Array.from({ length: faltan }).map(() => generarUsuario(region, comuna));
        await colUsuarios.insertMany(nuevos);
        total += nuevos.length;
      } else {
        console.log(`✔ ${region} / ${comuna} ya tiene ${existentes} usuarios.`);
      }
    }
  }

  console.log(`\n🎉 Finalizado. Se agregaron ${total} usuarios nuevos.`);
  console.log(`📌 Colección "${COLECCION_USUARIOS}" actualizada.\n`);
}

main().catch(err => console.error("❌ ERROR:", err));
