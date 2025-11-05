import { firefox } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import conectarDB from "../config/db.mongoose.js";
import Producto from "../models/Producto.js";
import PriceHistory from "../models/PriceHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parsePrice = (priceStr) => (priceStr ? parseInt(priceStr.replace(/[^0-9]/g, ""), 10) : null);


const MARCAS_CONOCIDAS = [
    // 🥫 Alimentos y abarrotes
    "Gourmet","Nestlé","Colún","Soprole","Watts","Carozzi","Lucchetti","Ideal","Loncoleche",
    "PF","Soprole","Quillayes","Natura","Savory","Tres Montes","Bonafide","Ambrosoli",
    "Maggi","Knorr","Arcor","Costa","Fruna","Trencito","Sahne Nuss","Livean","Sello Rojo",
    "Dos Caballos","Tucapel","Tottus","Unimarc","Acuenta","Iansa","Miraflores","Malloa",
    "San Jorge","La Preferida","Chef","Cisne","La Fama","Luigi","Dos Alamos","Carmen",
    "Sol del Valle","Anita","Maruchan","Nissin","Maggi","Don Vittorio","Ravioli",
    "Pancho Villa","Deyco","Ideal","BredenMaster","Super Pollo","Agrosuper","San Remo",
    "Surlat","Natura","Hellmann’s","Girasol","Pampero","Tres Ositos","Loncofrut","Caricia",
    "Dominó","Supremo","Universal","Noble","Nissin","Marco Polo","Dos Caballos","Maravilla",
    "Havanna","Nature Valley","Tronky","Marinela","Bimbo","Negrita","Costa","Super 8",
    "Super Cerdo","Serrano","Cecinas Llanquihue","PF Listo","Pronto","Wasil","Caserita",
    "Maruchan","Nissin","Knorr","Aji-no-men","Yungay","Don Juan","San José","San Jorge",
    "Artesanos del Sur","Santa Rosa","Kunstmann","Valdivia","Baltica","Royal Guard",
    "Heineken","Cristal","Escudo","Budweiser","Corona","Becker","Bavaria","Sol",
    "Cusqueña","Andes","Coca-Cola","Pepsi","Fanta","Sprite","Bilz","Pap","Kem","Ginger Ale",
    "Canada Dry","Red Bull","Monster","Watts Life","Ades","Watts Natural","Cola Cao",
    "Milo","Nescafé","Dolca","Café Gold","Café Do Brasil","Juan Valdez","Starbucks",
    "Té Supremo","Té Twinings","Té Lipton","Té McKay","Té Hornimans","Cruz de Malta",
    "Taragüi","La Virginia","Dos Caballos","Selecta","Campanario","Mistral","Capel","Alto del Carmen",
    "Piscola","Ron Barceló","Bacardi","Absolut","Smirnoff","Baileys","Casillero del Diablo",
    "Santa Rita","Concha y Toro","Undurraga","Misiones de Rengo","Gato","Frontera","Toro de Piedra",
    "Montes","Chilensis","120","Tarapacá","Santa Carolina","Emilia","Clos de Pirque","Valdivieso",
  
    // 🍪 Snacks y dulces
    "Evercrisp","Lay’s","Doritos","Cheetos","Ramitas","Kryzpo","Pringles","Super 8","Negrita",
    "Trencito","Costa","Morocha","Chocman","Mckay","Fruna","Milo","Bon o Bon",
    "Sonrisa","Chiky","Oreo","Club Social","Mini Chips Ahoy","Tofi","Tronky","Tita","Manjarate",
  
    // 🧀 Lácteos, embutidos, refrigerados
    "Soprole","Colún","Quillayes","Loncoleche","Natura","Nido","Surlat","Parmalat",
    "Soprole Light","Yoplait","La Vaquita","Danone","Yoghito",
    "Kraft","Philadelphia","Soprole Kids","Livean Yogurt","Yoghurt Griego","Delisur",
    "Cecinas Llanquihue","PF","Serrano","Receta del Abuelo","Receta Artesanal","Agrosuper",
    "Super Cerdo","Receta Sureña","San Jorge","Don Juan","La Crianza","Luchetti Ready",
  
    // 🧽 Aseo hogar y limpieza
    "Omo","Ariel","Ace","Drive","Tide","BioLimpio","Poett","Lysol","Mr Músculo",
    "Virutex","Elite","Confort","Nova","Scott","Cotidian","Sussex","Dove","Rexona",
    "Palmolive","Protex","Nivea","Eucerin","Colgate","Signal","Oral-B","Listerine",
    "Harpic","Glade","Raid","Baygon","Off","Poett","Fabuloso","Clorox","Virutex Pro",
    "Brasso","Cif","Comfort","Soft","Downy","Vanish","Lisoform","Limpiol","Sapolio",
    "Duracell","Energizer","Tork","Elite Professional",
  
    // 🍞 Panadería y congelados
    "Ideal","BredenMaster","Marraqueta","Santa Isabel Pan","Tottus Bakery","Doña Isidora",
    "Emporio Natural","Rosenberg","Mister Bread","Granja del Sol","La Crianza","Agrosuper",
    "PF Listo","Soprole Ready","LoncoSur","Miraflores Congelados",
  
    // 🧴 Cuidado personal
    "Pantene","Head & Shoulders","Sedal","Tresemmé","Dove","Nivea","Rexona","Axe","Old Spice",
    "Gillette","Always","Kotex","Nosotras","Carefree","Pampers","Huggies",
    "Babysec","Simond’s","Neutrogena","Protex","Colgate","Listerine","Sensodyne",
  
    // 🐾 Mascotas
    "Master Dog","Master Cat","Champion Dog","Champion Cat","Purina","Dog Chow","Cat Chow",
    "Pro Plan","Pedigree","Whiskas","Nutrique","Fancy Feast","Equilibrio","Dogourmet"
  ];

// 🔹 Barra de progreso
function renderProgressBar(current, total, prefix = "💾 Guardando productos") {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

async function main() {
  const store = "acuenta";
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🛒 Iniciando scraping: ${store.toUpperCase()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // 🔹 Conexión a MongoDB
  try {
    await conectarDB();
    console.log(`[${store}] ✅ Conectado correctamente a MongoDB Atlas`);
  } catch (err) {
    console.error(`[${store}] ❌ Error al conectar con MongoDB:`, err.message);
    return;
  }

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  let nuevos = 0;
  let actualizados = 0;
  let revisados = 0;
  const productos = [];

  try {
    const url = "https://www.acuenta.cl/ca/despensa/05";
    console.log(`[${store}] 🌐 Navegando a: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

    console.log(`[${store}] ⏳ Esperando render de productos...`);
    await page.waitForSelector(".card-product-vertical", { timeout: 60000 });
    console.log(`[${store}] ✅ Productos visibles detectados.`);

    console.log(`[${store}] 🔄 Scrolleando para cargar todos los productos...`);
    let prevHeight = 0, retries = 0, iter = 1;

    while (retries < 5) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === prevHeight) retries++;
      else retries = 0;
      prevHeight = newHeight;
      console.log(`[${store}] ⏳ Scroll ${iter}/10 completado...`);
      iter++;
    }

    console.log(`[${store}] 🔍 Extrayendo información de productos...`);
    const pageProducts = await page.$$eval(".card-product-vertical", (items, MARCAS_CONOCIDAS) =>
      items
        .map((item) => {
          try {
            const title = item.querySelector(".prod__name")?.innerText?.trim() || "";
            if (!title) return null;

            let brand =
              item.querySelector(".prod__brand")?.innerText?.trim() ||
              item.querySelector(".prod__brand-name")?.innerText?.trim() ||
              null;

            if (!brand) {
              const found = MARCAS_CONOCIDAS.find((m) =>
                title.toLowerCase().includes(m.toLowerCase())
              );
              brand = found || "Sin marca";
            }

            const priceStr = item.querySelector(".base__price")?.innerText?.trim() || "";
            const image = item.querySelector("img")?.src || "";

            if (!priceStr || !image) return null;

            const productCode = image.match(/productos\/(\d+)/)?.[1] || "";
            const link = productCode
              ? `https://www.acuenta.cl/p/${title
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9\-]/g, "")}-${productCode}`
              : "https://www.acuenta.cl/";

            const priceUnitEl = Array.from(item.querySelectorAll("p span")).find((span) =>
              /\/(kg|g|l|ml)/i.test(span.innerText)
            );
            const pricePerUnit = priceUnitEl?.innerText?.trim() || null;

            return {
              title,
              brand,
              price: priceStr,
              image,
              link,
              store: "acuenta",
              pricePerUnit,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean),
      MARCAS_CONOCIDAS
    );

    if (!pageProducts.length) throw new Error("No se encontraron productos.");
    productos.push(...pageProducts);

    console.log(`[${store}] 📦 Productos recolectados: ${productos.length}`);
    console.log(`[${store}] 💾 Guardando información en la base de datos...`);

    // 🔹 Guardar productos
    for (const [i, prod] of productos.entries()) {
      const precioNum = parsePrice(prod.price);
      if (!precioNum || isNaN(precioNum)) continue;

      const existente = await Producto.findOne({ link: prod.link, store });
      if (existente) {
        if (existente.currentPrice !== precioNum) {
          existente.currentPrice = precioNum;
          existente.formattedPrice = prod.price;
          existente.lastUpdate = new Date();
          await existente.save();
          await PriceHistory.create({ productId: existente._id, price: precioNum });
          actualizados++;
        }
      } else {
        await Producto.create({
          ...prod,
          currentPrice: precioNum,
          formattedPrice: prod.price,
          lastUpdate: new Date(),
          categoria: "Despensa",
        });
        nuevos++;
      }

      revisados++;
      renderProgressBar(revisados, productos.length);
    }

    // 📊 Total actual
    const totalDB = await Producto.countDocuments({ store });
    console.log(`\n[${store}] 📦 Total actual en MongoDB (${store}): ${totalDB} productos`);

    console.log(`\n[${store}] 📈 RESULTADOS`);
    console.log(`[${store}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Nuevos: ${nuevos}, Actualizados: ${actualizados}`);
    console.log(`👁️ Revisados hoy: ${revisados}`);
    console.log(`✅ Scraping completado con éxito.`);
  } catch (err) {
    console.error(`[${store}] ❌ ERROR durante el scraping:`, err.message);
    try {
      await page.screenshot({ path: join(__dirname, "error-acuenta.png"), fullPage: true });
      console.log(`[${store}] 📸 Screenshot guardado: error-acuenta.png`);
    } catch (e) {
      console.error(`[${store}] ⚠️ No se pudo capturar screenshot:`, e.message);
    }
  } finally {
    // ✅ Guardar resumen del scraping
    try {
      const totalProductos = await Producto.countDocuments({ store });
      await actualizarScrapingArchivo({
        store,
        nuevos,
        actualizados,
        totalProductos,
      });
    } catch (err) {
      console.error(`[${store}] ⚠️ No se pudo registrar scraping:`, err.message);
    }

    await browser.close();
    await mongoose.disconnect();
    console.log(`[${store}] 🔒 Conexión cerrada correctamente.`);
    console.log(`[${store}] 🚀 Proceso finalizado (${store.toUpperCase()})`);
  }
}

main()
  .then(() => console.log("[acuenta] ✅ Script completado sin reinicio."))
  .catch((err) => console.error("[acuenta ERROR GLOBAL]", err));
