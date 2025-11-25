// ======================================================================
// GENERADOR DE USUARIOS COMPLETOS (SIN LIBRERÍAS EXTERNAS)
// ======================================================================

import { connectDB, getDB } from "../config/db.js";
import { REGIONES_COMUNAS } from "../data/regionesComunas.js";

// CONFIG
const USUARIOS_POR_COMUNA = 10;
const COLECCION_USUARIOS = "users";

// ========================== DATOS ===============================

const NOMBRES = [
  "Carlos","Juan","Pedro","Diego","Felipe","José","Andrés","Matías","Cristóbal","Tomás","Nicolás","Francisco",
  "Rodrigo","Pablo","Mauricio","Miguel","Bruno","Sebastián","Adrián","Álvaro","Camila","Valentina","Trinidad",
  "Daniela","Fernanda","Catalina","Antonia","Paula","Claudia","Natalia","Javiera","Florencia","Andrea","Lorena",
  "Alex","Sam","Ariel","Nico","Maxi","Dani"
];

const APELLIDOS = [
  "González","Muñoz","Rojas","Díaz","Pérez","Soto","Contreras","Silva","Martínez","Sepúlveda","Morales","López",
  "Fuentes","Torres","Araya","Flores","Espinoza","Castillo","Vargas","Reyes","Campos","Salazar","Orellana"
];

const GENEROS = ["Masculino", "Femenino", "Otro"];
const DOMINIOS = ["gmail.com","hotmail.com","outlook.com","yahoo.com"];
const SECTORES = ["Centro", "Norte", "Sur", "Oriente", "Poniente"];
const GIROS_NEGOCIO = ["Minimarket","Verdulería","Carnicería","Panadería","Botillería","Kiosco","Bazar"];

// ===================== UTILIDADES ===============================

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function generarRUTsegunNacimiento(fecha) {
  const año = parseInt(fecha.split("-")[0]);
  let base;

  if (año < 1980) base = randomInt(6000000, 9000000);
  else if (año < 2000) base = randomInt(10000000, 20000000);
  else base = randomInt(20000000, 26000000);

  let suma = 0, mul = 2, n = base;
  while (n > 0) { suma += (n % 10) * mul; mul = mul === 7 ? 2 : mul + 1; n = Math.floor(n / 10); }
  const d = 11 - (suma % 11);
  const dv = d === 11 ? "0" : d === 10 ? "K" : d;
  return `${base}-${dv}`;
}

function generarFechaNacimiento() {
  const hoy = new Date();
  const edad = randomInt(18,70);
  const nacimiento = new Date(hoy.getFullYear() - edad, randomInt(0,11), randomInt(1,28));
  return { fecha: nacimiento.toISOString().split("T")[0], edad };
}

function generarCorreo(nombre, apellido, comuna) {
  const base = `${nombre}.${apellido}`.toLowerCase().replace(/\s+/g,"");
  return `${base}.${comuna.toLowerCase().replace(/\s+/g,"")}${randomInt(10,99)}@${randomItem(DOMINIOS)}`;
}

// ===================== GENERAR NEGOCIOS ========================

function generarNegocio(region, comuna, dueñoCorreo) {
  return {
    nombre: `${randomItem(APELLIDOS)} Market`,
    giro: randomItem(GIROS_NEGOCIO),
    comuna,
    region,
    sector: randomItem(SECTORES),
    telefono: `9${randomInt(10000000, 99999999)}`,
    correo: dueñoCorreo,
    creadoEn: new Date()
  };
}

// ===================== GENERADOR COMPLETO ========================

async function generarUsuario(region, comuna) {
  const nombre = randomItem(NOMBRES);
  const apellido = randomItem(APELLIDOS);
  const { fecha, edad } = generarFechaNacimiento();
  const rut = generarRUTsegunNacimiento(fecha);
  const genero = randomItem(GENEROS);
  const sector = randomItem(SECTORES);

  const correo = generarCorreo(nombre, apellido, comuna);

  const ahora = new Date();

  const tieneNegocio = Math.random() < 0.25;
  const negocios = tieneNegocio ? [generarNegocio(region, comuna, correo)] : [];

  return {
    nombre,
    apellido,
    rut,
    fechaNacimiento: fecha,
    edad,
    genero,
    region,
    comuna,
    sector,
    correo,
    contraseña: "$2b$10$Ao7wJpn1EmGdwPI6NnBxPufYsS.rwBMmBCvMqtguLXsGC3nlOLpFu", // hash de "123456"
    role: "cliente",
    tieneNegocio,
    negocios,
    creadoEn: ahora,
    actualizadoEn: ahora
  };
}

// =========================== MAIN ================================

async function main() {
  console.log("\n🟢 Generando usuarios completos SIN instalar nada...\n");

  await connectDB();
  const db = getDB();
  const col = db.collection(COLECCION_USUARIOS);

  let totalFinal = 0;

  for (const region in REGIONES_COMUNAS) {
    for (const comuna of REGIONES_COMUNAS[region]) {
      const existentes = await col.countDocuments({ region, comuna });
      const faltan = USUARIOS_POR_COMUNA - existentes;

      if (faltan > 0) {
        console.log(`➕ ${region} / ${comuna} → ${faltan} usuarios`);
        const nuevos = [];
        for (let i = 0; i < faltan; i++) nuevos.push(await generarUsuario(region, comuna));
        await col.insertMany(nuevos);
        totalFinal += nuevos.length;
      }
    }
  }

  console.log(`\n🎉 Listo → ${totalFinal} usuarios agregados`);
  console.log(`📌 Colección "${COLECCION_USUARIOS}" actualizada.\n`);
}

main().catch(err => console.error("❌ ERROR:", err));
