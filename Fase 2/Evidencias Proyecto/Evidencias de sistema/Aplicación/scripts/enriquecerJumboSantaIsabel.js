import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { REGIONES_COMUNAS } from "../data/regionesComunas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear mapeo inverso: comuna -> región
const COMUNAS_REGIONES = {};
for (const [region, comunas] of Object.entries(REGIONES_COMUNAS)) {
  comunas.forEach(comuna => {
    COMUNAS_REGIONES[comuna.toLowerCase()] = region;
  });
}

// Mapeo manual de casos especiales
const CASOS_ESPECIALES = {
  "lo barnechea": { comuna: "Lo Barnechea", region: "Metropolitana" },
  "chicureo": { comuna: "Colina", region: "Metropolitana" },
  "la dehesa": { comuna: "Lo Barnechea", region: "Metropolitana" },
  "los trapenses": { comuna: "Lo Barnechea", region: "Metropolitana" },
  "pie andino": { comuna: "Lo Barnechea", region: "Metropolitana" },
  "puertas de chicureo": { comuna: "Colina", region: "Metropolitana" },
  "el belloto": { comuna: "Quilpué", region: "Valparaíso" },
  "con con": { comuna: "Concón", region: "Valparaíso" },
  "concon": { comuna: "Concón", region: "Valparaíso" },
  "reñaca": { comuna: "Viña del Mar", region: "Valparaíso" },
  "14 norte": { comuna: "Talca", region: "Maule" },
  "concha y toro": { comuna: "Puente Alto", region: "Metropolitana" },
  "independencia": { comuna: "Independencia", region: "Metropolitana" },
  "los jardines del sur": { comuna: "San Bernardo", region: "Metropolitana" },
  "miraflores": { comuna: "La Florida", region: "Metropolitana" },
  "la florida": { comuna: "La Florida", region: "Metropolitana" },
  "vicuña mackenna": { comuna: "La Florida", region: "Metropolitana" },
  "plaza puente": { comuna: "Puente Alto", region: "Metropolitana" },
  "santo domingo": { comuna: "Puente Alto", region: "Metropolitana" },
  "copiapó": { comuna: "Copiapó", region: "Atacama" },
  "pedro de valdivia": { comuna: "Copiapó", region: "Atacama" },
  "mall del trebol": { comuna: "Talcahuano", region: "Biobío" },
  "mall del centro": { comuna: "Concepción", region: "Biobío" },
  "chamisero": { comuna: "Colina", region: "Metropolitana" },
  "santa maría": { comuna: "Colina", region: "Metropolitana" }
};

// Mapeo para Santa Isabel (nombres de tienda → comuna real)
const SANTA_ISABEL_MAPEO = {
  "14 de febrero": "Concepción",
  "agua santa": "Puente Alto",
  "alcázar": "Maipú",
  "alcázar, ciudad satélite": "Maipú", // ✅ AGREGADO
  "alessandri": "Talca",
  "almirante riveros": "Concepción",
  "anibal pinto": "Valparaíso",
  "apoquindo": "Las Condes",
  "artesanos": "Las Condes",
  "balmaceda": "Concepción",
  "bandera": "Santiago",
  "barros arana": "Concepción",
  "bilbao": "Ñuñoa",
  "bosques de san francisco": "Huechuraba",
  "calera de tango": "Calera de Tango", // ✅ AGREGADO
  "camilo henríquez": "Talca",
  "carlos valdovinos": "Lo Espejo",
  "carrera": "Linares",
  "catamarca": "Santiago",
  "caupolicán": "Chillán",
  "centro rex": "Valdivia",
  "chacabuco": "Antofagasta",
  "cienfuegos": "Valparaíso",
  "ciudad satélite": "Maipú",
  "collao": "Coquimbo",
  "colín": "Valparaíso",
  "colón": "Talca",
  "compañía": "Concepción",
  "consistorial": "Peñalolén",
  "curacaví": "Curacaví", // ✅ AGREGADO
  "curauma": "Valparaíso",
  "césar ercilla": "Chillán",
  "diagonal": "Temuco",
  "diego portales": "Puerto Montt",
  "doñihue": "Doñihue", // ✅ AGREGADO
  "dorsal": "Independencia",
  "down town": "Santiago",
  "el gabino": "La Florida",
  "el peñón": "La Florida",
  "el roble": "Concepción",
  "eucaliptus": "Peñalolén",
  "fleming": "Padre Hurtado",
  "franklin": "Santiago",
  "freire": "Valdivia",
  "grajales": "Chillán",
  "grecia": "Ñuñoa",
  "huérfanos": "Santiago",
  "intermodal": "La Serena",
  "j.j.perez": "Rancagua",
  "la cantera": "Peñalolén",
  "la cisterna": "La Cisterna",
  "la cisterna, paradero 18": "La Cisterna", // ✅ AGREGADO
  "la cruz": "Valparaíso",
  "la farfana": "Maipú",
  "la herradura": "Coquimbo",
  "la islita": "Valdivia",
  "la pintana": "La Pintana", // ✅ AGREGADO
  "la travesía": "San Pedro de la Paz",
  "la unión": "La Unión", // ✅ AGREGADO
  "labranza": "Temuco",
  "larraín": "La Reina",
  "las compañías": "Rancagua",
  "las mariposas": "Temuco",
  "las palmas": "Limache",
  "las rejas": "Estación Central",
  "lo campino": "Quilicura",
  "lo marcoleta": "Talca",
  "lomas de san andrés": "Concepción",
  "los boldos": "Chillán",
  "los carreras": "Linares",
  "los dominicos": "Las Condes",
  "los pensamientos": "La Florida",
  "los pinos": "Maipú",
  "mall el trébol": "Talcahuano", // ✅ AGREGADO
  "mall marina": "Viña del Mar",
  "manso": "Valdivia",
  "manuel montt": "Chillán",
  "mapocho": "Santiago",
  "merced": "Santiago",
  "mulchén": "Mulchén", // ✅ AGREGADO
  "ochagavía": "Santiago",
  "p. aguirre cerda": "Concepción",
  "pajarito las parcelas": "Maipú",
  "pajarito vespucio": "Pudahuel",
  "palomar": "Temuco",
  "pascual baburizza": "Valparaíso",
  "patio la reina": "La Reina",
  "pedro fontova": "Cerrillos",
  "pedro montt": "Valparaíso",
  "peñablanca": "Peñaflor", // ✅ AGREGADO (Peña Blanca está en Peñaflor)
  "pirque": "Pirque", // ✅ AGREGADO
  "placeres": "Valparaíso",
  "plaza don carlos": "Antofagasta",
  "plaza echaurren": "Valparaíso",
  "plazuela independencia": "Puente Alto",
  "portugal": "Santiago",
  "prat": "Coquimbo",
  "rahue": "Osorno",
  "renato rocca": "Pudahuel",
  "renca": "Renca", // ✅ AGREGADO
  "república de chile": "Antofagasta",
  "rodríguez": "Curicó",
  "san diego": "Santiago",
  "san joaquín": "San Joaquín",
  "san pablo": "Quinta Normal",
  "san pedro del mar": "San Pedro de la Paz",
  "santa isabel quilín": "Macul",
  "sargento silva": "Puerto Montt",
  "sevilla": "Temuco",
  "talagante": "Talagante", // ✅ AGREGADO
  "tarapacá": "Santiago",
  "tobalaba": "La Florida",
  "trinidad": "La Reina",
  "troncos viejos": "San Pedro de la Paz",
  "uno poniente": "Talca",
  "urmeneta": "Valparaíso",
  "uruguay": "Concepción",
  "valle grande": "La Serena",
  "valle volcanes": "Maipú",
  "vega monumental": "Valparaíso",
  "villa el teniente": "Rancagua",
  "villanelo": "Valdivia",
  "vivaceta": "Conchalí",
  "viña arlegui": "Viña del Mar",
  "yungay": "Osorno"
};

function detectarComuna(nombre, direccion, tienda) {
  const texto = `${nombre} ${direccion}`.toLowerCase();
  
  // 1. Buscar en casos especiales primero
  for (const [clave, datos] of Object.entries(CASOS_ESPECIALES)) {
    if (texto.includes(clave)) {
      return datos;
    }
  }
  
  // 2. Para Santa Isabel, buscar en el mapeo específico
  if (tienda === "Santa Isabel") {
    const nombreLimpio = nombre.toLowerCase().trim();
    if (SANTA_ISABEL_MAPEO[nombreLimpio]) {
      const comuna = SANTA_ISABEL_MAPEO[nombreLimpio];
      const region = COMUNAS_REGIONES[comuna.toLowerCase()];
      if (region) {
        return { comuna, region };
      }
    }
  }
  
  // 3. Buscar en direccion primero (más confiable)
  for (const [comuna, region] of Object.entries(COMUNAS_REGIONES)) {
    const regex = new RegExp(`\\b${comuna}\\b`, 'i');
    if (regex.test(direccion.toLowerCase())) {
      return { comuna: capitalizar(comuna), region };
    }
  }
  
  // 4. Buscar en nombre completo
  for (const [comuna, region] of Object.entries(COMUNAS_REGIONES)) {
    const regex = new RegExp(`\\b${comuna}\\b`, 'i');
    if (regex.test(texto)) {
      return { comuna: capitalizar(comuna), region };
    }
  }
  
  // 5. Coincidencia parcial como último recurso
  for (const [comuna, region] of Object.entries(COMUNAS_REGIONES)) {
    if (texto.includes(comuna)) {
      return { comuna: capitalizar(comuna), region };
    }
  }
  
  return { comuna: "Sin comuna", region: "Sin región" };
}

function capitalizar(str) {
  return str.split(' ').map(palabra => 
    palabra.charAt(0).toUpperCase() + palabra.slice(1)
  ).join(' ');
}

function enriquecerJSON(tienda, archivoEntrada) {
  console.log(`\n🔄 Procesando ${tienda}...`);
  
  const inputPath = path.join(__dirname, "../data", archivoEntrada);
  
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️ Archivo no encontrado: ${archivoEntrada}`);
    return { procesados: 0, sinComuna: 0 };
  }
  
  const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  let locales = Array.isArray(data) ? data : [];
  
  let procesados = 0;
  let sinComuna = 0;
  
  locales = locales.map(local => {
    const { comuna, region } = detectarComuna(
      local.nombre || "", 
      local.direccion || "",
      tienda
    );
    
    procesados++;
    if (comuna === "Sin comuna") {
      sinComuna++;
      console.log(`   ⚠️ Sin comuna: "${local.nombre}" - "${local.direccion}"`);
    }
    
    return {
      ...local,
      comuna,
      region
    };
  });
  
  // 💾 Sobrescribir el archivo original
  fs.writeFileSync(inputPath, JSON.stringify(locales, null, 2), "utf-8");
  console.log(`✅ ${tienda}: ${procesados} locales actualizados (${sinComuna} sin comuna)`);
  
  return { procesados, sinComuna };
}

// 🚀 Ejecutar
console.log("\n📍 Enriqueciendo Jumbo y Santa Isabel con comunas y regiones...");
console.log(`📚 Usando ${Object.keys(COMUNAS_REGIONES).length} comunas + ${Object.keys(CASOS_ESPECIALES).length} casos especiales\n`);

const resultados = [
  enriquecerJSON("Jumbo", "jumbo_stores.json"),
  enriquecerJSON("Santa Isabel", "santaisabel_stores.json")
];

const totalProcesados = resultados.reduce((sum, r) => sum + r.procesados, 0);
const totalSinComuna = resultados.reduce((sum, r) => sum + r.sinComuna, 0);

console.log(`\n📊 Resumen:`);
console.log(`   Total locales procesados: ${totalProcesados}`);
console.log(`   Locales con comuna detectada: ${totalProcesados - totalSinComuna}`);
console.log(`   Locales sin comuna: ${totalSinComuna}`);

console.log("\n✅ Archivos actualizados correctamente");
console.log("💡 Ahora puedes ejecutar: node scripts/cargar-JSON-tiendas.js");