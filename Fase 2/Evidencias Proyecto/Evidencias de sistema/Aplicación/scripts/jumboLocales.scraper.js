// ======================================================================
//  SCRAPER LOCALES JUMBO — versión FINAL COMPLETA y ESTABLE
// ======================================================================
import { chromium } from "playwright";
import { getDB, connectDB } from "../config/db.js";

// Datos Chile
export const REGIONES_COMUNAS = {
  "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"],

  "Tarapacá": [
    "Iquique", "Alto Hospicio",
    "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"
  ],

  "Antofagasta": [
    "Antofagasta", "Mejillones", "Sierra Gorda", "Taltal",
    "Calama", "Ollagüe", "San Pedro de Atacama"
  ],

  "Atacama": [
    "Copiapó", "Caldera", "Tierra Amarilla",
    "Chañaral", "Diego de Almagro",
    "Vallenar", "Freirina", "Huasco", "Alto del Carmen"
  ],

  "Coquimbo": [
    "La Serena", "Coquimbo",
    "Andacollo", "La Higuera", "Paihuano", "Vicuña",
    "Ovalle", "Monte Patria", "Punitaqui", "Río Hurtado",
    "Illapel", "Canela", "Los Vilos", "Salamanca"
  ],

  "Valparaíso": [
    "Valparaíso","Viña del Mar","Concón","Quilpué","Villa Alemana",
    "Casablanca","Juan Fernández",
    "Quillota","La Calera","Hijuelas","Nogales",
    "San Antonio","Cartagena","El Tabo","El Quisco","Algarrobo",
    "San Felipe","Llaillay","Catemu","Panquehue","Putaendo","Santa María",
    "Los Andes","Calle Larga","Rinconada","San Esteban",
    "Isla de Pascua"
  ],

  "Metropolitana": [
    "Santiago","Providencia","Las Condes","Vitacura","Lo Barnechea",
    "Ñuñoa","Macul","La Florida","La Pintana","Puente Alto",
    "Maipú","Cerrillos","Cerro Navia","Estación Central","Huechuraba",
    "Independencia","La Cisterna","La Granja","Lo Espejo","Lo Prado",
    "Pedro Aguirre Cerda","Peñalolén","Pudahuel","Quilicura",
    "Quinta Normal","Recoleta","Renca","San Joaquín",
    "San Miguel","San Ramón","El Bosque",
    "Padre Hurtado","Peñaflor","Talagante","El Monte",
    "Lampa","Colina","Tiltil","Buin","Paine","San Bernardo"
  ],

  "O’Higgins": [
    "Rancagua","Machalí","Graneros","Mostazal","Olivar","Requínoa",
    "Rengo","Coinco","Coltauco","Doñihue","Peumo","Pichidegua",
    "San Vicente","San Fernando","Chimbarongo","Nancagua",
    "Placilla","Santa Cruz","Lolol","Pumanque","Palmilla",
    "Peralillo","La Estrella","Litueche","Marchihue","Navidad","Pichilemu"
  ],

  "Maule": [
    "Talca","San Clemente","Pelarco","Pencahue","Maule","San Rafael",
    "Curepto","Constitución",
    "Curicó","Teno","Romeral","Molina","Sagrada Familia",
    "Hualañé","Licantén","Vichuquén",
    "Linares","Yerbas Buenas","Colbún","Villa Alegre","San Javier",
    "Cauquenes","Chanco","Pelluhue",
  ],

  "Ñuble": [
    "Chillán","Chillán Viejo","Bulnes","El Carmen",
    "Pemuco","Pinto","Quillón","San Ignacio","Yungay",
    "Cobquecura","Coelemu","Ninhue","Portezuelo","Quirihue","Ránquil","Treguaco",
    "San Carlos","Coihueco","Ñiquén","San Fabián","San Nicolás"
  ],

  "Biobío": [
    "Concepción","Talcahuano","Hualpén","San Pedro de la Paz","Chiguayante",
    "Penco","Tomé","Santa Juana","Hualqui","Coronel","Lota",
    "Los Ángeles","Cabrero","Laja","Nacimiento","Negrete","Mulchén",
    "Quilaco","Quilleco","San Rosendo","Santa Bárbara","Tucapel","Yumbel",
    "Arauco","Cañete","Contulmo","Curanilahue","Lebu","Los Álamos","Tirúa"
  ],

  "La Araucanía": [
    "Temuco","Padre Las Casas","Cunco","Melipeuco",
    "Vilcún","Curarrehue","Pucón","Villarrica",
    "Angol","Collipulli","Curacautín","Ercilla","Lonquimay",
    "Los Sauces","Lumaco","Purén","Renaico","Traiguén","Victoria"
  ],

  "Los Ríos": [
    "Valdivia","Corral","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli",
    "La Unión","Futrono","Lago Ranco","Río Bueno"
  ],

  "Los Lagos": [
    "Puerto Montt","Cochamó","Fresia","Frutillar","Los Muermos","Llanquihue","Maullín","Puerto Varas",
    "Castro","Ancud","Chonchi","Curaco de Vélez","Dalcahue","Puqueldón","Queilén","Quemchi","Quellón","Quinchao",
    "Osorno","Puerto Octay","Purranque","Puyehue","Río Negro","San Juan de la Costa","San Pablo"
  ],

  "Aysén": [
    "Coyhaique","Lago Verde",
    "Aysén","Cisnes","Guaitecas",
    "Cochrane","O’Higgins","Tortel"
  ],

  "Magallanes": [
    "Punta Arenas","Laguna Blanca","Río Verde","San Gregorio",
    "Cabo de Hornos","Antártica",
    "Porvenir","Primavera","Timaukel",
    "Puerto Natales","Torres del Paine"
  ]
};


const STORE = "jumbo_locales";
const URL = "https://www.jumbo.cl/locales";

// =============================================================
//  Normalizar texto (elimina tildes y símbolos)
// =============================================================
function normalizar(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// =============================================================
//  Detectar Región y Comuna automáticamente
// =============================================================
function detectarRegionComuna(nombre, direccion) {
  let texto = normalizar(`${nombre} ${direccion}`);

  let regionEncontrada = null;
  let comunaEncontrada = null;

  for (const [region, comunas] of Object.entries(REGIONES_COMUNAS)) {
    for (const comuna of comunas) {
      if (texto.includes(normalizar(comuna))) {
        return { region, comuna };
      }
    }
  }

  // busco región suelta
  for (const region of Object.keys(REGIONES_COMUNAS)) {
    if (texto.includes(normalizar(region))) {
      return { region, comuna: null };
    }
  }

  return { region: null, comuna: null };
}

// =============================================================
//  Aceptar cookies
// =============================================================
async function aceptarCookiesSiAparecen(page) {
  try {
    const btn = await page.locator("#onetrust-accept-btn-handler");
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click({ force: true });
      console.log(`[${STORE}] 🍪 Cookies aceptadas`);
      await page.waitForTimeout(1500);
    }

    await page.evaluate(() => {
      const overlays = document.querySelectorAll("#onetrust-consent-sdk, .onetrust-pc-dark-filter");
      overlays.forEach(el => el.style.display = "none");
    });
  } catch {
    console.log(`[${STORE}] Sin cookies`);
  }
}

// =============================================================
//  Extraer cards de una página
// =============================================================
async function scrapeCards(page) {
  return await page.$$eval(
    ".localities-wrapper.bg-white.p-5.rounded-lg.cursor-pointer",
    (cards) =>
      cards.map(card => {
        try {
          const name = card.querySelector(".title-with-bar-text")?.innerText?.trim() || null;
          const direccion = card.querySelector(".text-lg.leading-5.py-4")?.innerText?.trim() || null;
          const info = card.querySelector(".text-base.leading-5.flex.gap-3")?.innerText?.trim() || null;

          return { name, direccion, info };
        } catch {
          return null;
        }
      }).filter(Boolean)
  );
}

// =============================================================
//  Paginación REAL y ESTABLE
// =============================================================
async function obtenerLocales(page) {
  let locales = [];
  let pageIndex = 1;

  while (true) {
    console.log(`\n[${STORE}]  Scrapeando página ${pageIndex}...`);
    await page.waitForTimeout(1500);

    const data = await scrapeCards(page);
    console.log(` Página ${pageIndex} → ${data.length} locales`);
    locales.push(...data);

    const botones = await page.$$(".page-number");
    if (botones.length === 0) {
      console.log(`[${STORE}] ❌ Sin paginador. Fin.`);
      break;
    }

    let activeIndex = -1;

    for (let i = 0; i < botones.length; i++) {
      const cls = await botones[i].getAttribute("class");
      if (cls && cls.includes("active")) {
        activeIndex = i;
        break;
      }
    }

    if (activeIndex === -1) {
      console.log(`[${STORE}] ❌ No se encontró página activa. Fin.`);
      break;
    }

    const nextIndex = activeIndex + 1;

    if (nextIndex >= botones.length) {
      console.log(`[${STORE}]  Última página.`);
      break;
    }

    console.log(`[${STORE}]  Cambiando a página ${pageIndex + 1}`);

    await botones[nextIndex].click().catch(() => {
      console.log(`[${STORE}]  Error al cambiar página. Fin.`);
    });

    await page.waitForTimeout(2500);
    pageIndex++;
  }

  // eliminar duplicados
  return locales.filter(
    (v, i, arr) => arr.findIndex(x => x.name === v.name) === i
  );
}

// =============================================================
//  MAIN
// =============================================================
async function main() {
  console.log(`\n🟢 Iniciando SCRAPER ${STORE.toUpperCase()}\n`);

  await connectDB();
  const db = getDB();
  const colLocales = db.collection("locales_jumbo");

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await aceptarCookiesSiAparecen(page);

  const locales = await obtenerLocales(page);
  console.log(`\n📦 Total locales extraídos: ${locales.length}\n`);

  let nuevos = 0;
  let actualizados = 0;

  for (const loc of locales) {

    // 🔍 Normalizar comuna y región ANTES de guardar
    const { region, comuna } = detectarRegionComuna(loc.name, loc.direccion);

    const existente = await colLocales.findOne({ name: loc.name });

    if (existente) {
      await colLocales.updateOne(
        { _id: existente._id },
        {
          $set: {
            ...loc,
            region,
            comuna,
            lastUpdate: new Date()
          }
        }
      );
      actualizados++;
    } else {
      await colLocales.insertOne({
        ...loc,
        region,
        comuna,
        lastUpdate: new Date()
      });
      nuevos++;
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" RESULTADOS FINALES LOCALES JUMBO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(` Nuevos: ${nuevos}`);
  console.log(` Actualizados: ${actualizados}`);
  console.log(` Total revisados: ${locales.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await browser.close();
  console.log(`\n[${STORE}]  Scraper finalizado\n`);
}

main().catch(err => console.error(`[${STORE}] ERROR GLOBAL`, err));
