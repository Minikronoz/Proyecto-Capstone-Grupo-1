
import { firefox } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getDB, connectDB } from "../config/db.js";
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE = "acuenta";

// =============================================================
// 🏷️ MARCAS CONOCIDAS
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
// 💰 Conversión de precios
// =============================================================
const parsePrice = (priceStr = "") => {
  if (!priceStr) return null;
  const clean = priceStr.replace(/\s+/g, "").toLowerCase();
  const combo = clean.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    if (cantidad > 0 && total > 0) return Math.round(total / cantidad);
  }
  const num = parseInt(clean.replace(/\D/g, ""), 10);
  return isNaN(num) ? null : num;
};

// =============================================================
// 🧠 Detección automática de marcas conocidas
// =============================================================
function detectarMarca(title = "") {
  const t = title.toLowerCase();

  // Marcas propias Acuenta
  if (t.includes("acuenta")) return "Marca Propia Acuenta";

  // Búsqueda en marcas comerciales
  const marca = MARCAS_CONOCIDAS.find(m => t.includes(m.toLowerCase()));

  return marca ? marca : "Genérico / Sin Marca";
}

// =============================================================
// 🗂️ Categorías
// =============================================================
const CATEGORIAS = [
  // { nombre: "Promociones", url: "https://www.acuenta.cl/ca/promociones/01" },
  // { nombre: "Bodegazo", url: "https://www.acuenta.cl/ca/bodegazo/60" },
  // { nombre: "Marcas Propias", url: "https://www.acuenta.cl/ca/marcas-propias/20" },
  // { nombre: "Imperdibles", url: "https://www.acuenta.cl/ca/imperdibles/100" },
  // { nombre: "Mundo bebé", url: "https://www.acuenta.cl/ca/mundo-bebe/09" },
  { nombre: "Despensa", url: "https://www.acuenta.cl/ca/despensa/05" },
  // { nombre: "Carnes y Pescados", url: "https://www.acuenta.cl/ca/carnes-y-pescados/03" },
  // { nombre: "Aseo y limpieza", url: "https://www.acuenta.cl/ca/aseo-y-limpieza/11" },
  // { nombre: "Frescos y Lácteos", url: "https://www.acuenta.cl/ca/frescos-y-lacteos/07" },
  // { nombre: "El Bar", url: "https://www.acuenta.cl/ca/el-bar/14" },
  // { nombre: "Desayuno y Dulces", url: "https://www.acuenta.cl/ca/desayuno-y-dulces/12" },
  // { nombre: "Mascotas", url: "https://www.acuenta.cl/ca/mascotas/08" },
  // { nombre: "Bebidas y Snacks", url: "https://www.acuenta.cl/ca/bebidas-y-snacks/02" },
  // { nombre: "Congelados", url: "https://www.acuenta.cl/ca/congelados/04" },
  // { nombre: "Frutas y Verduras", url: "https://www.acuenta.cl/ca/frutas-y-verduras/06" },
  // { nombre: "Panadería y Pastelería", url: "https://www.acuenta.cl/ca/panaderia-y-pasteleria/10" },
  // { nombre: "Perfumería y Cuidado Personal", url: "https://www.acuenta.cl/ca/perfumeria-y-cuidado-personal/13" },
  // { nombre: "Hogar, entretención y tecnología", url: "https://www.acuenta.cl/ca/hogar-entretencion-y-tecnologia/47" }
];


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

function procesarUnit(pricePerUnit = "") {
  if (!pricePerUnit) return { unitValue: null, unitName: null };

  // Ejemplo: "$1.578/l"
  const match = pricePerUnit.match(/([\d\.]+).*?\/\s*([a-z]+)/i);
  if (!match) return { unitValue: null, unitName: null };

  let valor = parseInt(match[1].replace(/\D/g, ""), 10);
  let unidad = match[2].toLowerCase();

  // Convertir a ml/g
  if (unidad === "l") {
    unidad = "ml";
    valor = Math.round(valor); // valor por 1L → luego el cliente divide
  }
  if (unidad === "kg") {
    unidad = "g";
    valor = Math.round(valor);
  }

  return {
    unitValue: valor,
    unitName: unidad
  };
}

// =============================================================
// 🚀 MAIN
// =============================================================
async function main() {
  console.log(`\n🟢 Iniciando SCRAPER ${STORE.toUpperCase()}`);
  await connectDB();
  const db = getDB();
  console.log(`[${STORE}] ✅ Conectado a MongoDB Atlas`);

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();

  let nuevos = 0, actualizados = 0, revisados = 0;
  const productosMap = new Map();

  for (const cat of CATEGORIAS) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${STORE}] 🟢 Categoría: ${cat.nombre}`);
    console.log(`[${STORE}] 🌐 URL: ${cat.url}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let intentos = 0;
    let productos = [];

    // 🔁 Reintentos automáticos
    while (intentos < 5 && productos.length === 0) {
      try {
        intentos++;
        console.log(`[${STORE}] 🔄 Intento ${intentos}/5 en ${cat.nombre}`);
        const response = await page.goto(cat.url, { waitUntil: "domcontentloaded", timeout: 120000 });
        if (!response || response.status() >= 400) continue;

        await page.waitForTimeout(3000);

        const notFound = await page.$('text="Lo sentimos"');
        if (notFound) {
          console.warn(`[${STORE}] ⚠️ Página vacía (${cat.nombre})`);
          await page.reload();
          continue;
        }

        // 🔄 Scroll dinámico
        let sameCount = 0;
        while (sameCount < 3) {
          const before = await page.locator(".styles__StyledCard-sc-3jvmda-0").count();
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
          await page.waitForTimeout(1500);
          const after = await page.locator(".styles__StyledCard-sc-3jvmda-0").count();
          if (after === before) sameCount++;
          else sameCount = 0;
        }

        productos = await page.$$eval(".styles__StyledCard-sc-3jvmda-0", (cards) =>
          cards.map((card) => {
            try {
              const title = card.querySelector(".prod__name, .CardName__CardNameStyles-sc-147zxke-0")?.innerText?.trim() || "";
              const price = card.querySelector(".base__price, .CardBasePrice__CardBasePriceStyles-sc-1dlx87w-0")?.innerText?.trim() || "";
              const pricePerUnit = card.querySelector(".CardPum__CardPumStyles-sc-1vz27ac-0 span, .styles__PumStyles-sc-omx4ld-0 span")?.innerText?.trim() || null;
              const offerDescription = card.querySelector(".styles__PromoTagStyles-sc-q4v3s1-0 div")?.innerText?.trim() || null;
              const image = card.querySelector("img.ant-image-img, img.prod__figure__img")?.src || "";
              const href = card.querySelector("a.containerCard")?.getAttribute("href") || "";
              const link = href.startsWith("http") ? href : `https://www.acuenta.cl${href}`;
              return { title, price, pricePerUnit, offerDescription, image, link };
            } catch { return null; }
          }).filter(Boolean)
        );

      } catch (err) {
        console.error(`[${STORE}] ❌ Error en intento ${intentos}: ${err.message}`);
        await page.waitForTimeout(3000);
      }
    }

    if (!productos.length) {
      console.warn(`[${STORE}] ⚠️ No se logró extraer ${cat.nombre} tras 5 intentos.`);
      continue;
    }

    console.log(`[${STORE}] 🟢 ${productos.length} productos extraídos (${cat.nombre})`);
    for (const prod of productos) {
      if (!productosMap.has(prod.link)) productosMap.set(prod.link, { ...prod, categoria: cat.nombre });
    }
  }

  const productosFinal = Array.from(productosMap.values());
  console.log(`\n[${STORE}] 📦 Total productos únicos: ${productosFinal.length}`);

  const colProductos = db.collection("productos");
  const colPriceHistory = db.collection("priceHistory");

for (const [i, prod] of productosFinal.entries()) {
  if (!prod.image || prod.image.includes("default")) continue;

  const precioNum = parsePrice(prod.price);
  if (isNaN(precioNum)) continue;

  const { unitValue, unitName } = procesarUnit(prod.pricePerUnit);
  const marcaDetectada = detectarMarca(prod.title);
  const globalId = generarGlobalId(prod.title, marcaDetectada);


  // 📌 Buscar producto por globalId + store
  const existente = await colProductos.findOne({ globalId, store: STORE });

  if (existente) {
    // 📌 Si el precio cambió → actualizar e insertar al historial
    if (existente.currentPrice !== precioNum) {
      await colProductos.updateOne(
        { _id: existente._id },
        {
          $set: {
            globalId,
            title: prod.title,
            brand: marcaDetectada,
            currentPrice: precioNum,
            formattedPrice: prod.price,
            pricePerUnit: prod.pricePerUnit || null,
            offerDescription: prod.offerDescription || null,
            lastUpdate: new Date(),
            categoria: prod.categoria
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
    // 📌 Si no existe → insertar nuevo
      await colProductos.insertOne({
        globalId,
        title: prod.title,
        brand: marcaDetectada,
        store: STORE,
        currentPrice: precioNum,
        formattedPrice: prod.price,
        pricePerUnit: prod.pricePerUnit || null,
        unitValue,
        unitName,
        offerDescription: prod.offerDescription || null,
        image: prod.image,
        link: prod.link,
        categoria: prod.categoria,
        lastUpdate: new Date()
      });

    nuevos++;
  }

  revisados++;
  renderProgressBar(revisados, productosFinal.length, `[${STORE}]`);
}


  const totalDB = await colProductos.countDocuments({ store: STORE });
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${STORE}] 📊 RESULTADOS`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Nuevos: ${nuevos}`);
  console.log(`Actualizados: ${actualizados}`);
  console.log(`Revisados hoy: ${revisados}`);
  console.log(`Total Atlas: ${totalDB}`);

  // 💾 Guarda resumen global
  await actualizarScrapingArchivo({
    store: STORE,
    nuevos,
    actualizados,
    totalProductos: totalDB
  });

  console.log(`[${STORE}] 🧾 Archivo de scraping actualizado`);
  await browser.close();
  console.log(`[${STORE}] 🔒 Conexión cerrada correctamente`);
}

main().catch((err) => console.error(`[${STORE}] ERROR GLOBAL`, err));