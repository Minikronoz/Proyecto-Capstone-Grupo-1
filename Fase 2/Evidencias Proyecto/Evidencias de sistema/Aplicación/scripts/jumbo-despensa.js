// =============================================================
// 🛒 Scraper Jumbo — versión extendida con priceNormal y pricePerUnit
// =============================================================
import { chromium } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getDB, connectDB } from "../config/db.js";
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";
import crypto from "crypto";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE = "jumbo";

// =============================================================
// 🏷️ MARCAS CONOCIDAS (set global unificado para todos los supermercados)
// =============================================================
const MARCAS_CONOCIDAS = [
  // 🥦 FRUTAS Y VERDURAS
  "Hass","Dole","Chiquita","Del Monte","Clementina","Zespri","Royal Gala","Granny Smith","Fuji",
  "Pink Lady","Honeycrisp","Perales del Sur","Agrícola Garcés","Rucaray","San Clemente","Valle Frutal","Prunesco","Agrozzi",

  // 🥛 LÁCTEOS
  "Colún","Soprole","Loncoleche","Nestlé","Quillayes","Danone","Savory","Natura","Surlat","Watts",
  "Soprole Next","Soprole Gold","Soprole Sin Lactosa","Colún Light","Colún Kids","Colún Deslactosado",
  "Parmalat","Verónica","Lácteos Muu","Vivo","Valle Verde","La Vaquita","La Fuente","Lacnor",

  // 🍞 PAN, PASTELERÍA Y CEREALES
  "Ideal","Marraqueta","Castaño","BredenMaster","Fruna","Costa","Ambrosoli","Nestlé","Kellogg’s","Chocapic",
  "Fitness","Trencito","Milo","Nesquik","Quaker","Avena Quaker","Avena Gourmet","Quaker Cereal","Quaker Mix",
  "Gran Cereal","Lucchetti","Arcor","Tres Montes","Nutra Bien","Dulzura","McKay","Super 8","Sahne Nuss","Negrita",
  "Tronky","Cereal Mix","Corn Flakes","All-Bran","Zucaritas","Choco Krispis","Chokita","Tritón","Costa Rama","Fruna Mix",

  // 🍝 DESPENSA Y ABARROTES
  "Carozzi","Lucchetti","Maggi","Knorr","Maruchan","Nissin","Don Vittorio","Rama","Hellmann’s","Calaf","Bonafide",
  "Ambrosoli","La Preferida","Molitalia","Panco","Selecta","PF","Luchetti","Tucapel","Tres Montes","Malloa",
  "Sibarita","Acuenta","Lider","Tottus","Jumbo","Unimarc","Great Value","Cuisine & Co","Favorita","Tika","Granja Sur",
  "Santa Isabel","Soprole","Natura","Puratos","Coronilla","Dos Caballos","Anita","Soprole Gourmet","Malloa Mix",
  "Primor","Cocinero","Coopol","Maravilla","San Jorge","Río Bueno","La Crianza","Agrosuper","Super Pollo","Don Juan",
  "La Preferida","Super Cerdo","PF Listo","Lys","Luchetti","Carozzi Integral","La Trattoria","Molitalia","Sopraval",
  "Chester","Super Rico","La Salteña","Knorr Natural","Maggi Jugoso al Sartén","Maggi Sazonador","Maggi Caldo","Italiana",

  // 🧃 BEBIDAS, AGUAS Y JUGOS
  "Coca-Cola","Pepsi","Fanta","Sprite","Bilz","Pap","Kem","Inca Kola","Watts","Livean","Cachantún","Benedictino",
  "Andina","Vital","Dasani","Guallarauco","Watts Light","Watts Néctar","Watt’s Zero","Néctar Fruna","Néctar Andina del Valle",
  "Andina del Valle","Bilz y Pap","CCU","Nestlé Pure Life","Lipton","Nestea","Powerade","Gatorade","Monster","Red Bull",
  "Vive 100","Volt","Adrenaline Rush","Mr. Big","Energetic","Kem Extreme","Canada Dry","7Up","Crush","Paso de los Toros",

  // 🍺 VINOS Y LICORES
  "Concha y Toro","Casillero del Diablo","Gato Negro","Reservado","Santa Rita","Tarapacá","120","Frontera","Cousiño Macul",
  "Misiones de Rengo","Espíritu de Chile","Castillo de Molina","Undurraga","Don Melchor","Carmen","Montes","Veramonte",
  "Santa Carolina","Marqués de Casa Concha","Los Boldos","San Pedro","Tres Medallas","Toro de Piedra","Mistral",
  "Pisco Alto del Carmen","Capel","Horcón Quemado","Espíritu de los Andes","Flor de Caña","Absolut","Smirnoff",
  "Johnnie Walker","Jack Daniel’s","Ballantine’s","Chivas Regal","Becker","Escudo","Heineken","Budweiser","Stella Artois",
  "Kunstmann","Austral","Cristal","Baltica","Sol","Corona","Royal Guard","Tuborg","Coors","Tiger Beer",

  // 🧴 PERFUMERÍA Y CUIDADO PERSONAL
  "Rexona","Dove","Axe","Palmolive","Nivea","Pantene","Head & Shoulders","Sedal","L’Oréal","Garnier","Eucerin",
  "Neutrogena","Simple","Gillette","Oral-B","Colgate","Close-Up","Protex","Lux","Johnson’s","Baby Dove","Always",
  "Kotex","Nosotras","Ladysoft","Poise","Carefree","Huggies","Pampers","Babysec","Elite","Confort","Scott","Cotidian",
  "Plenitud","Listerine","Sensodyne","Colgate Total","Pepsodent","Signal","Asepxia","Clear","Tío Nacho","Bioexpert",
  "Pantene Pro-V","L’Oréal Paris","Revlon","Maybelline","Natura","Avon","Ésika","Cyzone","Belcorp","Simonds","Davene",

  // 🧹 LIMPIEZA Y HOGAR
  "Omo","Ace","Drive","Ariel","Magia Blanca","Quix","Cif","Poett","Lysoform","Lysol","Mr. Músculo","Clorox",
  "Virutex","VirutexPro","Elite Professional","Confort","Scott","Nova","Babysec","Higienol","Softy","Sapolio",
  "Virutex Home","Sapolio Multiuso","Limpiol","Chispa","Poett Sensaciones","Lustrasol","Patito","Raid","Baygon",
  "Off","Fuy","Bosque Verde","BioClean","Frosch","Brasso","Harpic","Duck","Easy Off","Glade","Air Wick",
  "Ambi Pur","Febreze","Vanish","Tide","Downy","Suavitel","Brillante","OMO Matic","OMO Active","OMO Ultra","Drive Max",

  // 🐶🐱 MASCOTAS
  "Master Dog","Master Cat","Purina","Dog Chow","Cat Chow","Pro Plan","Whiskas","Pedigree","Felix","Dogui","Champion Dog",
  "Champion Cat","Ricocan","Cachupín","Mimaskot","Nutra-Nuggets","Natural Trainer","Taste of the Wild","Royal Canin",
  "Purina One","Equilibrio","Eukanuba","Excellent","Old Prince","Bocaditos","Canbo","Cat Selection","Hills","Dog Star",

  // 💡 HOGAR Y VARIOS
  "Duracell","Energizer","Philips","Osram","Tefal","Thomas","Midea","Ursus Trotter","Sindelen","Recco","Oster",
  "Samsung","LG","Xiaomi","Sony","HP","Lenovo","Acer","Dell","Apple","Huawei","Asus","JBL","Panasonic","Sharp",
  "Whirlpool","Electrolux","Mabe","Fensa","Bosch","Indurama","Daewoo","Moulinex","Brita","RCA","Imaco",

  // 🧃 SUPERMERCADOS Y MARCAS PROPIAS
  "Jumbo","Unimarc","Tottus","Lider","Acuenta","Ekono","SuperBodega","Central Mayorista","Express de Lider",
  "Great Value","Cuisine & Co","Tottus Selection","Jumbo Basics","A Cuenta","Unimarc Marca Propia","Super Cerdo",
  "PF","La Crianza","Agrosuper","Santa Isabel","OK Market","Big John","Spid35","Cornershop","Fazil","Rappi","PedidosYa"
];


function generarGlobalId(title, brand) {
  const normalizar = (txt) =>
    txt
      ?.toLowerCase()
      ?.normalize("NFD")
      ?.replace(/[\u0300-\u036f]/g, "")
      ?.replace(/[^a-z0-9]/g, "")
      ?.trim() || "";

  const extraerUnidad = (txt) => {
    const match = txt?.match(/(\d+)(\s)?(g|gr|kg|ml|lt|l)/i);
    return match ? match[0].toLowerCase() : "";
  };

  const tituloNorm = normalizar(title);
  const unidad = extraerUnidad(title);
  const brandNorm = normalizar(brand);
  const cadena = `${brandNorm}_${tituloNorm}_${unidad}`;

  return crypto.createHash("md5").update(cadena).digest("hex").substring(0, 12);
}


// =============================================================
// 💰 Conversión de precios: "$1.990" / "$1.990$3.710" / "2x$3.000"
// =============================================================
function parsePrice(priceString = "") {
  if (!priceString) return null;

  const texto = priceString.replace(/\s+/g, "").toLowerCase();

  // 🟦 1) Si es combo tipo "2x$3000"
  const combo = texto.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    return cantidad > 0 ? Math.round(total / cantidad) : null;
  }

  // 🟥 2) Capturar SOLO el primer precio del string (importante en Jumbo)
  const primerPrecio = texto.match(/\$?([\d\.]+)/);
  if (!primerPrecio) return null;

  // 🟩 3) Convertir ese primer precio a número
  const num = parseInt(primerPrecio[1].replace(/\D/g, ""), 10);
  return isNaN(num) ? null : num;
}

// =============================================================
// 🧠 Detección automática de marcas conocidas
// =============================================================
function detectarMarca(title = "") {
  const t = title.toLowerCase();
  const marcaEncontrada = MARCAS_CONOCIDAS.find((m) =>
    t.includes(m.toLowerCase())
  );
  return marcaEncontrada
    ? marcaEncontrada.replace(/^Cerveza\s+/i, "").trim()
    : "Sin marca";
}
// =============================================================
// 📊 Barra de progreso
// =============================================================
function renderProgressBar(current, total, prefix = `[${STORE}]`) {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r${prefix} [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

// =============================================================
// 🍪 Aceptar cookies y limpiar overlays OneTrust
// =============================================================
async function aceptarCookiesSiAparecen(page) {
  try {
    const btn = await page.locator("#onetrust-accept-btn-handler, button:has-text('Aceptar')");
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click({ force: true });
      console.log(`[${STORE}] 🍪 Cookies aceptadas`);
      await page.waitForTimeout(1500);
    }

    // 🔹 Limpieza manual de overlays que bloquean clics
    await page.evaluate(() => {
      const overlays = document.querySelectorAll("#onetrust-consent-sdk, .onetrust-pc-dark-filter");
      overlays.forEach((el) => (el.style.display = "none"));
    });
    await page.waitForTimeout(500);
  } catch (err) {
    console.log(`[${STORE}] ⚠️ No se detectaron cookies: ${err.message}`);
  }
}

// =============================================================
// 🧭 Categorías a recorrer
// =============================================================
const CATEGORIES = [
  // { name: "Experiencias Jumbo",       url: "https://www.jumbo.cl/experiencias-jumbo" },
  // { name: "Frutas y Verduras",        url: "https://www.jumbo.cl/frutas-y-verduras" },
  // { name: "Lácteos, Huevos y Congelados", url: "https://www.jumbo.cl/lacteos-huevos-y-congelados" },
  // { name: "Quesos y Fiambres",        url: "https://www.jumbo.cl/quesos-y-fiambres" },
  { name: "Despensa",                 url: "https://www.jumbo.cl/despensa" },
  // { name: "Carnes y Pescados",        url: "https://www.jumbo.cl/carnes-y-pescados" },
  // { name: "Panadería y Pastelería",   url: "https://www.jumbo.cl/panaderia-y-pasteleria" },
  // { name: "Licores, Bebidas y Aguas", url: "https://www.jumbo.cl/licores-bebidas-y-aguas" },
  // { name: "Chocolates, Galletas y Snacks", url: "https://www.jumbo.cl/chocolates-galletas-y-snacks" },
  // { name: "Limpieza",                 url: "https://www.jumbo.cl/limpieza" },
  // { name: "Cuidado Personal y Bebé",  url: "https://www.jumbo.cl/cuidado-personal-y-bebe" },
  // { name: "Mascotas",                 url: "https://www.jumbo.cl/mascotas" }
];


// =============================================================
// 🔍 Scraper por categoría
// =============================================================
async function scrapeCategoria(page, categoria, colProductos, colPriceHistory) {
  const { name, url } = categoria;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${STORE}] 🟢 Categoría: ${name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  let nuevos = 0, actualizados = 0, revisados = 0;
  const productos = [];

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await aceptarCookiesSiAparecen(page);
    await page.waitForTimeout(2500);

    let hasNext = true, pagina = 1;
    while (hasNext) {
      await aceptarCookiesSiAparecen(page);

      // 🔄 Scroll para lazy load
      await page.evaluate(async () => {
        const delay = (ms) => new Promise((res) => setTimeout(res, ms));
        for (let i = 0; i < 10; i++) {
          window.scrollBy(0, window.innerHeight);
          await delay(400);
        }
      });
      await page.waitForTimeout(1500);

      await page.waitForSelector("div.border.rounded-t-lg.flex a[href*='/p']", { timeout: 60000 });

      const items = await page.$$eval("div.border.rounded-t-lg.flex a[href*='/p']", (cards) =>
        cards.map((el) => {
          try {
            // ❌ Detectar productos no disponibles / agotados
            const textoCompleto = el.innerText.toLowerCase();
            const agotado = textoCompleto.includes("agotado") || textoCompleto.includes("no disponible");

            // ❌ Detectar tarjeta gris/inactiva mediante clases
            const clase = el.getAttribute("class") || "";
            const tarjetaBloqueada = clase.includes("opacity") || clase.includes("disabled") || clase.includes("pointer-events");

            if (agotado || tarjetaBloqueada) return null; // 🛑 Ignorar sin stock

            // 🧠 Selectores limpios
            const title = el.querySelector("h2.product-card-name")?.innerText?.trim() || null;
            const brand = el.querySelector("p.text-sm.text-gray-500")?.innerText?.trim() || "Sin marca";
            const price = el.querySelector("div.flex.items-baseline.text-neutral700.font-bold")?.innerText?.trim() || null;
            const priceNormal = el.querySelector(".line-through, .text-neutral500")?.innerText?.trim() || null;
            const pricePerUnit = el.querySelector(".ppum-price-container span")?.innerText?.trim() || null;
            const image = el.querySelector("img")?.src || "";
            const href = el.getAttribute("href") || "";
            const link = href.startsWith("http") ? href : `https://www.jumbo.cl${href}`;

            // ⚠️ Validación final
            if (!title || !price) return null;
            
            return { title, brand, price, priceNormal, pricePerUnit, image, link };

          } catch {
            return null;
          }
        }).filter(Boolean)
      );



      console.log(`[${STORE}] Página ${pagina} (${name}) → ${items.length} productos`);
      productos.push(...items);

      const nextBtn = await page.$(`button.page-number:has-text("${pagina + 1}")`);
      if (nextBtn) {
        await nextBtn.scrollIntoViewIfNeeded();
        await nextBtn.click().catch(() => console.log(`[${STORE}] ⚠️ Error al hacer click, reintenta...`));
        await page.waitForTimeout(3000);
        pagina++;
      } else hasNext = false;
    }

    // 🧹 Eliminar duplicados
    const unicos = productos.filter((p, i, arr) => arr.findIndex((x) => x.link === p.link) === i);

for (const [i, prod] of unicos.entries()) {
  const precioNum = parsePrice(prod.price);
  if (isNaN(precioNum) || !prod.link) continue;

  const marcaDetectada = prod.brand || detectarMarca(prod.title);
  const globalId = generarGlobalId(prod.title, marcaDetectada);
  const { unitValue, unitName } = procesarUnit(prod.pricePerUnit);

  // 📌 Buscar si ya existe en BD
  const existente = await colProductos.findOne({ globalId, store: STORE });

  if (existente) {
    // 📌 Si el precio cambió → actualizar
    if (existente.currentPrice !== precioNum) {
              await colProductos.updateOne(
          { _id: existente._id },
          {
            $set: {
              currentPrice: precioNum,
              formattedPrice: prod.price,
              priceNormal: prod.priceNormal || null,
              pricePerUnit: prod.pricePerUnit || null,
              unitValue,
              unitName,
              offerDescription: prod.offerDescription || null,
              image: prod.image,
              link: prod.link,
              categoria: name,
              lastUpdate: new Date()
            }
          }
        );

      await colPriceHistory.insertOne({
        productId: existente._id,
        store: STORE,
        price: precioNum,
        previousPrice: existente.currentPrice || null,
        variation: existente.currentPrice
          ? Number((((precioNum - existente.currentPrice) / existente.currentPrice) * 100).toFixed(2))
          : 0,
        offerDescription: prod.offerDescription || null,
        fecha: new Date()
      });

      actualizados++;
    }
  } else {
    // 📌 Insertar nuevo producto
    const result = await colProductos.insertOne({
          globalId,
          title: prod.title,
          brand: marcaDetectada,
          store: STORE,
          currentPrice: precioNum,
          formattedPrice: prod.price,
          priceNormal: prod.priceNormal || null,
          pricePerUnit: prod.pricePerUnit || null,
          unitValue,
          unitName,
          offerDescription: prod.offerDescription || null,
          image: prod.image,
          link: prod.link,
          categoria: name,
          lastUpdate: new Date()
        });

    nuevos++;

    await colPriceHistory.insertOne({
      productId: result.insertedId,
      store: STORE,
      price: precioNum,
      previousPrice: null,
      variation: 0,
      offerDescription: prod.offerDescription || null,
      fecha: new Date()
    });
  }

  revisados++;
  renderProgressBar(revisados, unicos.length, `[${STORE}] ${name}`);
}


    console.log(`\n[${STORE}] ✅ ${name}: Nuevos ${nuevos}, Actualizados ${actualizados}, Revisados ${revisados}`);
    return { nuevos, actualizados, revisados };
  } catch (err) {
    console.error(`[${STORE}] ❌ Error en ${name}:`, err.message);
    await page.screenshot({ path: join(__dirname, `error-${STORE}-${name}.png`), fullPage: true });
    return { nuevos: 0, actualizados: 0, revisados: 0 };
  }
}
function procesarUnit(pricePerUnit = "") {
  if (!pricePerUnit) return { unitValue: null, unitName: null };

  // Ej: "$698 x 10g" → ["$698", "10g"]
  const match = pricePerUnit.match(/([\d\.]+).*?x\s*([\d]+)(g|kg|ml|l|lt)/i);
  if (!match) return { unitValue: null, unitName: null };

  let valor = parseInt(match[1].replace(/\D/g, ""), 10);
  let cantidad = parseInt(match[2], 10);
  let unidad = match[3].toLowerCase();

  // Estandarizar unidades
  if (unidad === "kg") {
    cantidad *= 1000;
    unidad = "g";
  }
  if (unidad === "l" || unidad === "lt") {
    cantidad *= 1000;
    unidad = "ml";
  }

  return {
    unitValue: valor,
    unitName: `${cantidad}${unidad}`
  };
}

// =============================================================
// 🚀 MAIN
// =============================================================
async function main() {
  console.log(`\n🟢 Iniciando SCRAPER ${STORE.toUpperCase()}\n`);
  await connectDB();
  const db = getDB();
  console.log(`[${STORE}] ✅ Conectado a MongoDB Atlas`);

  const colProductos = db.collection("productos");
  const colPriceHistory = db.collection("priceHistory");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();

  let totalNuevos = 0, totalActualizados = 0, totalRevisados = 0;

  for (const cat of CATEGORIES) {
    const r = await scrapeCategoria(page, cat, colProductos, colPriceHistory);
    totalNuevos += r.nuevos;
    totalActualizados += r.actualizados;
    totalRevisados += r.revisados;
    await page.waitForTimeout(4000 + Math.random() * 3000);
  }

  const totalDB = await colProductos.countDocuments({ store: STORE });
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${STORE}] 📊 RESULTADOS FINALES`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Nuevos: ${totalNuevos}`);
  console.log(`Actualizados: ${totalActualizados}`);
  console.log(`Revisados hoy: ${totalRevisados}`);
  console.log(`Total en Atlas (${STORE}): ${totalDB}`);
  console.log(`[${STORE}] ✅ Scraping completado correctamente\n`);

  await actualizarScrapingArchivo({
    store: STORE,
    nuevos: totalNuevos,
    actualizados: totalActualizados,
    totalProductos: totalDB
  });

  await browser.close();
  console.log(`[${STORE}] 🔒 Conexión cerrada correctamente`);
}

main().catch((err) => console.error(`[${STORE}] ERROR GLOBAL`, err));