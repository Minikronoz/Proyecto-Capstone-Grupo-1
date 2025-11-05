import { chromium } from "playwright";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import conectarDB from "../config/db.mongoose.js";
import Producto from "../models/Producto.js";
import PriceHistory from "../models/PriceHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🧮 Convierte "$1.990" → 1990
const parsePrice = (s) => (s ? parseInt(s.replace(/\D/g, ""), 10) : null);

// 🏷️ Marcas conocidas (para reconocimiento)

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

// 🔹 Barra de progreso visual
function renderProgressBar(current, total, prefix = "Progreso") {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

// 🔍 Extrae productos desde el DOM
async function extraerProductos(page, store) {
  return await page.$$eval("article, div[data-testid*='product'], div", (els, data) => {
    const { MARCAS_CONOCIDAS, store } = data;
    const productos = [];
    const vistos = new Set();

    for (const el of els) {
      const texto = el.innerText || "";
      if (!texto.includes("$")) continue;

      const nombre =
        el.querySelector("h3, h2, .product-item__name")?.innerText?.trim() ||
        texto.split("\n").find((t) => t.length > 5 && !t.includes("$")) ||
        "Producto sin nombre";

      const precio =
        texto.match(/\$\s?[\d\.]+/)?.[0]?.trim() ||
        el.querySelector("span[class*='price'], div[class*='price']")?.innerText?.trim() ||
        "";

      const img = el.querySelector("img")?.src || "";
      const link = el.querySelector("a[href*='/product/'], a[href*='/producto/']")?.href || "";

      if (!precio || vistos.has(nombre + precio)) continue;

      const brand =
        MARCAS_CONOCIDAS.find((m) => nombre.toLowerCase().includes(m.toLowerCase())) || "Sin marca";

      productos.push({
        title: nombre,
        brand,
        store,
        image: img,
        link: link || "https://www.unimarc.cl/despensa",
        formattedPrice: precio,
      });

      vistos.add(nombre + precio);
    }
    return productos;
  }, { MARCAS_CONOCIDAS, store });
}

async function main() {
  const store = "unimarc";
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🛒 Iniciando scraping: ${store.toUpperCase()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await conectarDB();
  console.log(`[${store}] ✅ Conectado correctamente a MongoDB Atlas`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  try {
    console.log(`[${store}] 🌐 Cargando categoría Despensa...`);
    await page.goto("https://www.unimarc.cl/despensa", { waitUntil: "domcontentloaded" });

    const bodyText = await page.textContent("body").catch(() => "");
    if (bodyText.includes("404") || bodyText.includes("limpiando nuestros pasillos")) {
      console.log(`[${store}] ⚠️ Página 404 detectada — reintentando desde home.`);
      await page.goto("https://www.unimarc.cl", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      await page.locator("text=Categorías").first().click().catch(() => {});
      await page.waitForTimeout(1000);
      await page.locator("text=Despensa").first().click().catch(() => {});
      await page.waitForTimeout(4000);
    }

    console.log(`[${store}] ⏳ Esperando render dinámico de productos...`);
    let loaded = false;
    for (let i = 0; i < 20; i++) {
      const count = await page.$$eval("article, div[data-testid*='product']", els => els.length).catch(() => 0);
      if (count > 10) {
        console.log(`[${store}] ✅ Productos detectados (${count}) en intento ${i + 1}.`);
        loaded = true;
        break;
      }
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(2000);
    }

    if (!loaded) console.log(`[${store}] ⚠️ No se detectaron productos tras scroll inicial.`);

    // Detectar páginas (por si hay más)
    let totalPaginas = 1;
    try {
      const paginas = await page.$$eval("ul.pagination li button, ul.pagination li a", els => els.length);
      totalPaginas = paginas || 1;
    } catch {
      console.log(`[${store}] ⚠️ No se detectó barra de paginación (1 página).`);
    }
    console.log(`[${store}] 🧭 Total de páginas detectadas: ${totalPaginas}`);

    let todos = [];
    for (let i = 1; i <= totalPaginas; i++) {
      renderProgressBar(i - 1, totalPaginas, "📄 Procesando páginas");
      const productos = await extraerProductos(page, store);
      todos.push(...productos);

      if (i < totalPaginas) {
        const next = await page.$("button[aria-label*='Siguiente'], a[aria-label*='Siguiente']");
        if (!next) break;
        await next.click();
        await page.waitForTimeout(3000);
      }
    }
    renderProgressBar(totalPaginas, totalPaginas, "📄 Procesando páginas");

    const unicos = Array.from(
      new Map(
        todos.map(p => [
          `${p.title}_${p.brand}_${p.formattedPrice}`.toLowerCase(),
          p
        ])
      ).values()
    );

    console.log(`[${store}] 🧮 Total final de productos únicos: ${unicos.length}`);

    // 💾 Guardado MongoDB
    let nuevos = 0, actualizados = 0, revisados = 0;
    for (const prod of unicos) {
      const priceNum = parsePrice(prod.formattedPrice);
      if (isNaN(priceNum)) continue;
      const existente = await Producto.findOne({ title: prod.title, store });
      if (existente) {
        existente.formattedPrice = prod.formattedPrice;
        existente.lastUpdate = new Date();
        if (existente.currentPrice !== priceNum) {
          existente.currentPrice = priceNum;
          await PriceHistory.create({ productId: existente._id, price: priceNum });
          actualizados++;
        }
        await existente.save();
      } else {
        await Producto.create({
          ...prod,
          currentPrice: priceNum,
          lastUpdate: new Date(),
        });
        nuevos++;
      }
      revisados++;
      renderProgressBar(revisados, unicos.length, "💾 Guardando productos");
    }
    process.stdout.write("\n");

    // 📊 Consulta de total guardado en MongoDB
        const totalDB = await Producto.countDocuments({ store });
    console.log(`\n📦 Total actual en MongoDB (${store}): ${totalDB} productos`);

    console.log(`\n📈 RESULTADOS`);
    console.log(`[${store}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Nuevos: ${nuevos}, Actualizados: ${actualizados}`);
    console.log(`👁️ Revisados hoy: ${revisados}`);
    console.log(`✅ Scraping completado con éxito`);
  } catch (err) {
    console.error(`[${store}] ❌ ERROR GLOBAL:`, err.message);
    await page.screenshot({ path: join(__dirname, "unimarc-error.png"), fullPage: true });
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

main();
