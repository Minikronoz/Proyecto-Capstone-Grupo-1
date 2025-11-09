// ===============================================
// 🛒 Scraper Tottus — versión estable 2025 (CORREGIDA)
// ===============================================
import { firefox } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";
import { parsePriceUnitario, renderProgressBar } from "../utils/scraperBase.js";
import { connectDB, getDB, closeDB } from "../config/db.js";

dotenv.config();
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




const CATEGORIAS = [
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27090/Navidad", "Navidad"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27091/Electro-y-Tecnologia", "Electro y Tecnología"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27092/Vestuario", "Vestuario"],
  ["https://www.tottus.cl/tottus-cl/lista/CATG27055/Despensa", "Despensa"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27093/Carnes", "Carnes"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27070/Frutas-y-Verduras", "Frutas y Verduras"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27139/Lacteos--y-Quesos", "Lácteos y Quesos"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27094/Desayunos-y-Dulces", "Desayunos y Dulces"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27095/Fiambres-y-Huevos", "Fiambres y Huevos"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27096/Bebidas-y-Jugos", "Bebidas y Jugos"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27097/Platos-Preparados", "Platos Preparados"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27075/Panaderia-y-Pasteleria", "Panadería y Pastelería"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27098/Cervezas", "Cervezas"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27084/Vinos-y-Licores", "Vinos y Licores"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27073/Congelados", "Congelados"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27099/Pescados-y-Mariscos", "Pescados y Mariscos"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27100/Aseo-y-Limpieza", "Aseo y Limpieza"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27101/Belleza", "Belleza"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27102/Cuidado-Personal", "Cuidado Personal"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27103/Mundo-Bebe", "Mundo Bebé"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27078/Mascotas", "Mascotas"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27079/Hogar-y-Ferreteria", "Hogar y Ferretería"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27104/Escolares-y-Libreria", "Escolares y Librería"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27105/Jugueteria", "Juguetería"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27106/Deporte-y-Aire-Libre", "Deporte y Aire Libre"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27107/Celebraciones", "Celebraciones"],
  // ["https://www.tottus.cl/tottus-cl/lista/CATG27108/Marcas-Tottus", "Marcas Tottus"]
];


// =============================================================
// 🧭 Utilidades
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

  // 🔹 Scroll automático hasta el fondo con control de carga
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

  // ✅ =============================================================
  // 🧹 FIX 1: Volver al selector original ('.pod.pod-4_GRID')
  //    PERO con una lógica de extracción de links corregida.
  // ✅ =============================================================
  const pageProducts = await page.$$eval(".pod.pod-4_GRID", (cards, MARCAS) =>
    cards.map((item) => {
      try {
        const title = item.querySelector(".pod-subTitle")?.innerText?.trim() || "";
        if (!title) return null;

        let brand = item.querySelector(".pod-title")?.innerText?.trim() || "";
        if (!brand) {
          const t = title.toLowerCase();
          const found = MARCAS.find((m) => t.includes(m.toLowerCase()));
          brand = found || "Sin marca";
        }

        const price = item.querySelector(".copy10.primary.medium")?.innerText?.trim() || "";
        if (!price) return null;

        const priceNormal = item.querySelector(".pod-previousPrice")?.innerText?.trim()?.replace(/[()]/g, "") || null;
        const pricePerUnit = item.querySelector(".copy12.secondary.medium")?.innerText?.trim() || null;
        const offerDescription = item.querySelector(".badge-container span, .discount-tag, .promo-tag")?.innerText?.trim() || null;

        let image =
          item.querySelector("img")?.getAttribute("src") ||
          item.querySelector("img")?.getAttribute("data-src") || "";
        if (image.startsWith("//")) image = "https:" + image;
        if (image.startsWith("/")) image = "https://www.tottus.cl" + image;

        // ✅ CORRECCIÓN DEL LINK: Buscar el link en el título o en la imagen
        // Esto evita tomar links genéricos de la tarjeta.
        let href = item.querySelector(".pod-subTitle a")?.getAttribute("href") || "";
        if (!href) {
            href = item.querySelector("img[src]")?.closest('a')?.getAttribute("href") || "";
        }
        // Fallback al selector genérico (que era el problemático)
        if (!href) {
            href = item.querySelector("a[href]")?.getAttribute("href") || "";
        }
        
        const link = href.startsWith("http") ? href : `https://www.tottus.cl${href}`;
        // Filtro para links malos
        if (link === "https://www.tottus.cl") return null;

        return { title, brand, price, priceNormal, pricePerUnit, offerDescription, image, link };
      } catch {
        return null;
      }
    }).filter(Boolean),
    MARCAS_CONOCIDAS
  );

  // 🔹 Evitar duplicados y detectar fin real
  const nuevosDetectados = pageProducts.length - totalAnterior;
  if (nuevosDetectados <= 0) intentosIguales++;
  else intentosIguales = 0;

  productos.push(...pageProducts);
  totalAnterior = productos.length;

  console.log(`[${STORE}] 🔍 Productos acumulados: ${productos.length}`);

  // 🔹 Intentar avanzar con el botón si existe
  const next = page.locator("#testId-pagination-bottom-arrow-right");
  const hayBoton = await next.count();

  if (hayBoton > 0 && (await next.isEnabled())) {

    // 🔹 Cerrar pop-up de encuesta (Tottus)
    await page.evaluate(() => {
      const popup = document.querySelector("#kampyleInviteContainer");
      if (popup) popup.remove();
      const overlay = document.querySelector("#MDigitalInvitationWrapper");
      if (overlay) overlay.remove();
    });
    
    await next.scrollIntoViewIfNeeded();
    await next.click();
    pagina++;
    await page.waitForTimeout(3000);
  } else if (intentosIguales >= 2) {
    console.log(`[${STORE}] 🚩 Fin detectado (sin nuevos productos en scroll).`);
    break;
  } else {
    await page.waitForTimeout(2000);
  }
}

  console.log(`[${STORE}] 🧾 Total detectados en "${categoria}": ${productos.length}`);

  // ✅ =============================================================
  // 🧹 FIX 2: Filtrar duplicados ANTES de guardar
  // ✅ =============================================================
  const productosUnicos = [...new Map(productos.map(p => [p.link, p])).values()];
  console.log(`[${STORE}] 🧹 Total únicos en "${categoria}": ${productosUnicos.length}`);


// =============================================================
// 💾 Guardar / Actualizar en Atlas (versión robusta con normalización)
// =============================================================
let nuevos = 0, actualizados = 0, revisados = 0;

for (const prod of productosUnicos) { // ✅ Usar productosUnicos
  // 🧩 Normalizar link
  let linkNormalizado = prod.link?.trim();
  if (linkNormalizado && !linkNormalizado.startsWith("http")) {
    linkNormalizado = `https://www.tottus.cl${linkNormalizado}`;
  }

  const precioNum = parsePriceUnitario(prod.price);
  if (!precioNum || !linkNormalizado || linkNormalizado === "https://www.tottus.cl") {
    continue; // Omitir productos sin precio o sin link válido
  }

  // 🔍 Buscar producto existente con link normalizado
  const existente = await colProductos.findOne({ link: linkNormalizado, store: STORE });

  if (existente) {
    // Solo actualizar si cambió el precio
    if (existente.currentPrice !== precioNum) {
      await colProductos.updateOne(
        { _id: existente._id },
        {
          $set: {
            title: prod.title?.trim() || "Sin título", // ✅ Asegurar que el título también se actualice
            brand: prod.brand || detectarMarca(prod.title), // ✅ Asegurar que la marca se actualice
            currentPrice: precioNum,
            formattedPrice: prod.price,
            priceNormal: prod.priceNormal || null,
            pricePerUnit: prod.pricePerUnit || null,
            offerDescription: prod.offerDescription || null,
            image: prod.image, // ✅ Asegurar que la imagen se actualice
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
        offerDescription: prod.offerDescription || null,
        fecha: new Date()
      });
      actualizados++;
    } else {
      // ✅ =============================================================
      // 🧹 FIX 3: Actualizar 'lastUpdate' aunque el precio no cambie
      // ✅ =============================================================
      await colProductos.updateOne(
        { _id: existente._id },
        { $set: { lastUpdate: new Date() } }
      );
    }
  } else {
    // ✅ Insertar nuevo producto (link limpio garantizado)
    const nuevoProd = {
      title: prod.title?.trim() || "Sin título",
      brand: prod.brand || detectarMarca(prod.title),
      store: STORE,
      currentPrice: precioNum,
      formattedPrice: prod.price,
      priceNormal: prod.priceNormal || null,
      pricePerUnit: prod.pricePerUnit || null,
      offerDescription: prod.offerDescription || null,
      image: prod.image,
      link: linkNormalizado,
      categoria,
      createdAt: new Date(),
      lastUpdate: new Date()
    };

    const insertResult = await colProductos.insertOne(nuevoProd);

    // 🧾 Primer histórico del producto
    await colPriceHistory.insertOne({
      productId: insertResult.insertedId,
      store: STORE,
      price: precioNum,
      previousPrice: null,
      variation: 0,
      offerDescription: prod.offerDescription || null,
      fecha: new Date()
    });

    nuevos++;
  }

  revisados++;
  renderProgressBar(revisados, productosUnicos.length, `[${STORE}] Guardando "${categoria}"`);
}


  console.log(`\n[${STORE}] ✅ Categoría finalizada: ${categoria}. Nuevos: ${nuevos}, Actualizados: ${actualizados}, Revisados: ${revisados}`);
  return { nuevos, actualizados, revisados };
}

// =============================================================
// 🚀 MAIN
// =============================================================
async function main() {
  console.log(`\n===============================================`);
  console.log(`[${STORE}] 🚀 Inicio de scraping completo`);
  console.log(`===============================================`);

  await connectDB();
  const db = getDB();
  const colProductos = db.collection("productos");
  const colPriceHistory = db.collection("priceHistory");

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();

  let totalNuevos = 0, totalActualizados = 0, totalRevisados = 0; // ✅ Añadido

  try {
    for (const categoriaArr of CATEGORIAS) {
      const [url, categoria] = categoriaArr;
      const stats = await scrapeCategoria(page, url, categoria, colProductos, colPriceHistory);
      totalNuevos += stats.nuevos;
      totalActualizados += stats.actualizados;
      totalRevisados += stats.revisados; // ✅ Añadido
    }
  } catch (err) {
    console.error(`[${STORE}] ❌ Error global:`, err.message);
    await page.screenshot({ path: join(__dirname, "error-tottus.png"), fullPage: true });
  } finally {
  // ✅ Primero calcula los totales antes de cerrar la DB
  const totalDB = await colProductos.countDocuments({ store: STORE });

  await browser.close();
  await closeDB(); // 🔒 ahora cerramos la conexión

  console.log(`\n[${STORE}] 🧮 Resumen final`);
  console.log(`Nuevos: ${totalNuevos}`);
  console.log(`Actualizados: ${totalActualizados}`);
  console.log(`Revisados: ${totalRevisados}`); // ✅ Añadido

  await actualizarScrapingArchivo({
    store: STORE,
    nuevos: totalNuevos,
    actualizados: totalActualizados,
    revisados: totalRevisados, // ✅ Pasar 'revisados' al log
    totalProductos: totalDB
  });

  console.log(`[${STORE}] 🧾 Archivo de scraping actualizado`);
  console.log(`[${STORE}] 🔒 Conexión cerrada correctamente`);
}
}

main().catch((err) => console.error(`[${STORE}] ERROR GLOBAL`, err));