
// ===============================================
// 🛒 Scraper Tottus — versión estable 2025 (LIMPIA SIN MARCAS)
// ===============================================
import { firefox } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";
import { parsePriceUnitario, renderProgressBar } from "../utils/scraperBase.js";
import { connectDB, getDB, closeDB } from "../config/db.js";

dotenv.config();

// 📌 Configuración base
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE = "tottus";

// =============================================================
// 🏷️ MARCAS CONOCIDAS (global unificado)
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

  // 🧹 LIMPIEZAS Y HOGAR
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

// =============================================================
// 🆔 Generar ID global normalizado
// =============================================================
function generarGlobalId(title, brand) {
  const normalizar = (txt) =>
    txt?.toLowerCase()?.normalize("NFD")?.replace(/[\u0300-\u036f]/g, "")?.replace(/[^a-z0-9]/g, "")?.trim() || "";

  const extraerUnidad = (txt) => {
    const match = txt?.match(/(\d+)(\s)?(g|gr|kg|ml|lt|l|kg|unidad|un|pack)/i);
    return match ? match[0].toLowerCase() : "";
  };

  const tituloNorm = normalizar(title);
  const unidad = extraerUnidad(title);
  const brandNorm = normalizar(brand);
  const cadena = `${brandNorm}_${tituloNorm}_${unidad}`;

  return crypto.createHash("md5").update(cadena).digest("hex").substring(0, 12);
}

// =============================================================
// 📌 Categorías activas (puedes habilitar más)
// =============================================================
const CATEGORIAS = [
  ["https://www.tottus.cl/tottus-cl/lista/CATG27055/Despensa", "Despensa"]
];

// =============================================================
// 🧩 Utilidades
// =============================================================
async function aceptarCookies(page) {
  try {
    const btn = page.locator("#onetrust-accept-btn-handler, button:has-text('Aceptar')");
    if ((await btn.count()) > 0) {
      await btn.click();
      console.log(`[${STORE}] 🍪 Cookies aceptadas`);
      await page.waitForTimeout(2000);
    }
  } catch {
    console.log(`[${STORE}] ⚠️ No se detectaron cookies`);
  }
}

function detectarMarca(title = "") {
  const t = title.toLowerCase();
  const marca = MARCAS_CONOCIDAS.find((m) => t.includes(m.toLowerCase()));
  return marca || "Sin marca";
}

// =============================================================
// 🔍 Scraper por categoría
// =============================================================
async function scrapeCategoria(page, url, categoria, colProductos, colPriceHistory) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${STORE}] 🟢 Iniciando categoría: ${categoria}`);
  console.log(`[${STORE}] 🌐 URL: ${url}`);

  const productos = [];
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
  await aceptarCookies(page);
  await page.waitForTimeout(3000);

  let pagina = 1;
  let totalAnterior = 0;
  let intentosIguales = 0;

  while (true) {
    console.log(`[${STORE}] 📄 Página ${pagina}`);

    // Scroll profundo
    await page.evaluate(async () => {
      const delay = (ms) => new Promise((res) => setTimeout(res, ms));
      let lastHeight = 0;
      for (let i = 0; i < 25; i++) {
        window.scrollBy(0, window.innerHeight);
        await delay(500);
        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) break;
        lastHeight = newHeight;
      }
    });

    await page.waitForTimeout(2000);

    // Extraer tarjetas
    const pageProducts = await page.$$eval(
      ".pod.pod-4_GRID",
      (cards, MARCAS) =>
        cards
          .map((item) => {
            try {
              const title = item.querySelector(".pod-subTitle")?.innerText?.trim();
              if (!title) return null;

              let brand = item.querySelector(".pod-title")?.innerText?.trim() || "";
              if (!brand) {
                const t = title.toLowerCase();
                const found = MARCAS.find((m) => t.includes(m.toLowerCase()));
                brand = found || "Sin marca";
              }

              const price = item.querySelector(".copy10.primary.medium")?.innerText?.trim();
              if (!price) return null;

              const priceNormal = item.querySelector(".pod-previousPrice")?.innerText?.trim()?.replace(/[()]/g, "") || null;
              const pricePerUnit = item.querySelector(".copy12.secondary.medium")?.innerText?.trim() || null;
              const offerDescription = item.querySelector(".badge-container span, .discount-tag, .promo-tag")?.innerText?.trim() || null;

              let image =
                item.querySelector("img")?.getAttribute("src") ||
                item.querySelector("img")?.getAttribute("data-src") || "";
              if (image.startsWith("//")) image = "https:" + image;
              if (image.startsWith("/")) image = "https://www.tottus.cl" + image;

              let href = item.querySelector(".pod-subTitle a")?.getAttribute("href") || "";
              if (!href) href = item.querySelector("img[src]")?.closest("a")?.getAttribute("href") || "";
              if (!href) href = item.querySelector("a[href]")?.getAttribute("href") || "";
              const link = href.startsWith("http") ? href : `https://www.tottus.cl${href}`;
              if (link === "https://www.tottus.cl") return null;

              return { title, brand, price, priceNormal, pricePerUnit, offerDescription, image, link };
            } catch {
              return null;
            }
          })
          .filter(Boolean),
      MARCAS_CONOCIDAS
    );

    const nuevosDetectados = pageProducts.length - totalAnterior;
    if (nuevosDetectados <= 0) intentosIguales++;
    else intentosIguales = 0;

    productos.push(...pageProducts);
    totalAnterior = productos.length;
    console.log(`[${STORE}] 🔍 Productos acumulados: ${productos.length}`);

    const next = page.locator("#testId-pagination-bottom-arrow-right");
    if ((await next.count()) > 0 && (await next.isEnabled())) {
      await next.click();
      pagina++;
      await page.waitForTimeout(3000);
    } else if (intentosIguales >= 2) {
      console.log(`[${STORE}] 🚩 Fin detectado.`);
      break;
    } else {
      await page.waitForTimeout(2000);
    }
  }

  console.log(`[${STORE}] 🧾 Total detectados: ${productos.length}`);

  // Filtrar duplicados
  const productosUnicos = [...new Map(productos.map((p) => [p.link, p])).values()];
  console.log(`[${STORE}] 🧹 Únicos: ${productosUnicos.length}`);

  // Guardar en BD
  let nuevos = 0,
    actualizados = 0,
    revisados = 0;

  for (const prod of productosUnicos) {
    const precioNum = parsePriceUnitario(prod.price);
    if (!precioNum) continue;

    const existente = await colProductos.findOne({ link: prod.link, store: STORE });

    if (existente) {
      if (existente.currentPrice !== precioNum) {
        await colProductos.updateOne(
          { _id: existente._id },
          {
            $set: {
              title: prod.title,
              brand: prod.brand,
              currentPrice: precioNum,
              formattedPrice: prod.price,
              priceNormal: prod.priceNormal,
              pricePerUnit: prod.pricePerUnit,
              offerDescription: prod.offerDescription,
              image: prod.image,
              lastUpdate: new Date(),
              categoria
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
          offerDescription: prod.offerDescription,
          fecha: new Date()
        });

        actualizados++;
      } else {
        await colProductos.updateOne({ _id: existente._id }, { $set: { lastUpdate: new Date() } });
      }
    } else {
      const insert = await colProductos.insertOne({
        globalId: generarGlobalId(prod.title, prod.brand),
        title: prod.title,
        brand: prod.brand,
        store: STORE,
        currentPrice: precioNum,
        formattedPrice: prod.price,
        priceNormal: prod.priceNormal,
        pricePerUnit: prod.pricePerUnit,
        offerDescription: prod.offerDescription,
        image: prod.image,
        link: prod.link,
        categoria,
        createdAt: new Date(),
        lastUpdate: new Date()
      });

      await colPriceHistory.insertOne({
        productId: insert.insertedId,
        store: STORE,
        price: precioNum,
        previousPrice: null,
        variation: 0,
        offerDescription: prod.offerDescription,
        fecha: new Date()
      });
      nuevos++;
    }

    revisados++;
    renderProgressBar(revisados, productosUnicos.length, `[${STORE}] Guardando ${categoria}`);
  }

  return { nuevos, actualizados, revisados };
}

// =============================================================
// 🚀 MAIN
// =============================================================
async function main() {
  await connectDB();
  const db = getDB();
  const colProductos = db.collection("productos");
  const colPriceHistory = db.collection("priceHistory");

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125 Safari/537.36"
  });
  const page = await context.newPage();

  let totalNuevos = 0,
    totalActualizados = 0,
    totalRevisados = 0;

  try {
    for (const [url, categoria] of CATEGORIAS) {
      const stats = await scrapeCategoria(page, url, categoria, colProductos, colPriceHistory);
      totalNuevos += stats.nuevos;
      totalActualizados += stats.actualizados;
      totalRevisados += stats.revisados;
    }
  } catch (err) {
    console.error(`[${STORE}] ❌ Error global:`, err.message);
    await page.screenshot({ path: join(__dirname, "error-tottus.png"), fullPage: true });
  } finally {
    const totalDB = await colProductos.countDocuments({ store: STORE });

    await browser.close();
    await closeDB();

    console.log(`\n[${STORE}] 🧮 Resumen final`);
    console.log(`Nuevos: ${totalNuevos}`);
    console.log(`Actualizados: ${totalActualizados}`);
    console.log(`Revisados: ${totalRevisados}`);
    console.log(`Total BD: ${totalDB}`);

    await actualizarScrapingArchivo({
      store: STORE,
      nuevos: totalNuevos,
      actualizados: totalActualizados,
      revisados: totalRevisados,
      totalProductos: totalDB
    });

    console.log(`[${STORE}] 🧾 Archivo actualizado`);
  }
}

main().catch((err) => console.error(`[${STORE}] ERROR GLOBAL`, err));
