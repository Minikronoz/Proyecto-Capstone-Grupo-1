// scripts/unimarc.mjs — versión Atlas compatible
// ===============================================
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

import { connectDB, getDB, closeDB } from "../config/db.js";
// Removido import de PriceHistory ya que usamos MongoDB nativo
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE = "unimarc";

// =============================================================
// 🏷️ MARCAS CONOCIDAS (igual que antes)
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


const CATEGORIAS = [
  // ["https://www.unimarc.cl/category/frutas-y-verduras", "Frutas y Verduras"],
  ["https://www.unimarc.cl/despensa", "Despensa"],
  // ["https://www.unimarc.cl/category/lacteos-huevos-y-refrigerados", "Lácteos, Huevos y Refrigerados"],
  // ["https://www.unimarc.cl/category/quesos-y-fiambres", "Quesos y Fiambres"],
  // ["https://www.unimarc.cl/category/panaderia-y-pasteleria", "Panadería y Pastelería"],
  // ["https://www.unimarc.cl/category/congelados", "Congelados"],
  // ["https://www.unimarc.cl/category/desayuno-y-dulces", "Desayuno y Dulces"],
  // ["https://www.unimarc.cl/category/bebidas-y-licores", "Bebidas y Licores"],
  // ["https://www.unimarc.cl/category/limpieza", "Limpieza"],
  // ["https://www.unimarc.cl/category/perfumeria", "Perfumería"],
  // ["https://www.unimarc.cl/category/bebes-y-ninos", "Bebés y Niños"],
  // ["https://www.unimarc.cl/category/mascotas", "Mascotas"],
  // ["https://www.unimarc.cl/category/hogar", "Hogar"],
];

// 🧮 Convierte "$1.990" → 1990
const parsePrice = (s) => (s ? parseInt(s.replace(/\D/g, ""), 10) : null);

// 🎨 Barra de progreso visual
function renderProgressBar(current, total, prefix = "Progreso") {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

// 🧩 Extraer productos desde el DOM de Unimarc (igual que antes)
async function extraerProductos(page, store, MARCAS_CONOCIDAS) {
  return await page.$$eval(
    "section[id^='shelf__vertical'], div[class*='ProductCard']",
    (els, { store, MARCAS_CONOCIDAS }) => {
      const detectarMarca = (titulo = "") => {
        const texto = titulo.toLowerCase();
        const match = MARCAS_CONOCIDAS.find((m) =>
          texto.includes(m.toLowerCase())
        );
        return match || "Sin marca";
      };

      const productos = [];

      for (const el of els) {
        const nombre =
          el.querySelector("p.Shelf_nameProduct__0KIRG, p[class*='product-name']")?.innerText?.trim() || "";

        let brand =
          el.querySelector("p.Shelf_brandText__vmuWJ, p[class*='brand']")?.innerText?.trim() || "";

        if (!brand || brand.length < 2) brand = detectarMarca(nombre);

        const price =
          el.querySelector("p[id^='listPrice__offerPrice--discountprice'], p[class*='offer-price']")?.innerText?.trim() ||
          el.querySelector("p.Text_text--primary__lzNzV")?.innerText?.trim() ||
          "";

        const priceNormal =
          el.querySelector("p[id^='listPrice__offerPrice--listprice'], p[class*='list-price']")?.innerText?.trim() || "";

        const pricePerUnit =
          el.querySelector("div.ListPrice_listPrice__grp5x p.Text_text--gray-light__QsyHK")?.innerText?.trim() || "";

        const quantity =
          el.querySelector("div#shelf__ppum p, p[class*='unit']")?.innerText?.trim() || "";

        const img = el.querySelector("img")?.src || "";
        let link = el.querySelector("a[href*='/product/']")?.getAttribute("href") || "";

        if (!nombre || !price) continue;

        if (link && !link.startsWith("http")) link = `https://www.unimarc.cl${link}`;

        productos.push({
          title: nombre,
          brand,
          store,
          formattedPrice: price,
          priceNormal,
          pricePerUnit,
          quantity,
          image: img,
          link,
        });
      }

      return productos;
    },
    { store, MARCAS_CONOCIDAS }
  );
}
// 🧩 Función principal (main) — versión Atlas (sin Mongoose)
async function main() {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🛒 Iniciando scraping: ${STORE.toUpperCase()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // 🔗 Conexión MongoDB Atlas nativa
  await connectDB();
  const db = getDB();
  console.log(`[${STORE}] ✅ Conectado correctamente a MongoDB Atlas`);

  const colProductos = db.collection("productos");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  let totalGlobal = 0;
  let nuevosGlobal = 0;
  let actualizadosGlobal = 0;

for (const [url, categoria] of CATEGORIAS) {
  console.log(`\n[${STORE}] 🟢 Iniciando categoría: ${categoria}`);

  try {
    console.log(`[${STORE}] 🌐 Abriendo: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    let productosCategoria = [];
    let paginaActual = 1;

    // � Procesar todas las páginas
    while (true) {
      console.log(`[${STORE}] 📄 Procesando página ${paginaActual}`);
      
      // Esperar a que los productos se carguen
      try {
        await page.waitForSelector("section[id^='shelf__vertical']", { timeout: 30000 });
        
        // Esperar un momento adicional para asegurar que todo se cargue
        await page.waitForTimeout(3000);
        
        // Extraer productos de la página actual
        const productosPagina = await extraerProductos(page, STORE, MARCAS_CONOCIDAS);
        productosCategoria.push(...productosPagina);
        
        console.log(`[${STORE}] ✅ Página ${paginaActual}: ${productosPagina.length} productos encontrados`);
        console.log(`[${STORE}] 📊 Total acumulado: ${productosCategoria.length} productos`);

        // Verificar si hay más páginas
        const siguientePagina = await page.$(`a[href*='page=${paginaActual + 1}']`);
        
        if (siguientePagina) {
          // Ir a la siguiente página
          await siguientePagina.click();
          console.log(`[${STORE}] ➡️ Navegando a página ${paginaActual + 1}...`);
          await page.waitForTimeout(5000); // Esperar a que la nueva página cargue
          paginaActual++;
        } else {
          console.log(`[${STORE}] 🏁 Última página alcanzada`);
          break;
        }
      } catch (error) {
        console.error(`[${STORE}] ⚠️ Error en página ${paginaActual}:`, error.message);
        break;
      }
    }

    console.log(
      `[${STORE}] 🧮 Total detectados en "${categoria}": ${productosCategoria.length}`
    );

    // 💾 Guardar productos en MongoDB Atlas
    let nuevos = 0,
      actualizados = 0,
      revisados = 0;

    for (const prod of productosCategoria) {
      const priceNum = parsePrice(prod.formattedPrice);
      if (isNaN(priceNum)) continue;

      const existente = await colProductos.findOne({
        link: prod.link,
        store: STORE,
      });

      if (existente) {
        const precioAnterior = existente.currentPrice;
        const cambio = precioAnterior !== priceNum;

        if (cambio) {
          await colProductos.updateOne(
            { _id: existente._id },
            {
              $set: {
                formattedPrice: prod.formattedPrice,
                priceNormal: prod.priceNormal,
                pricePerUnit: prod.pricePerUnit,
                quantity: prod.quantity,
                image: prod.image,
                link: prod.link,
                lastUpdate: new Date(),
                currentPrice: priceNum
              }
            }
          );

          await db.collection("priceHistory").insertOne({
            productId: existente._id,
            store: STORE,
            price: priceNum,
            previousPrice: precioAnterior || null,
            variation: precioAnterior
              ? Number(
                  (
                    ((priceNum - precioAnterior) / precioAnterior) *
                    100
                  ).toFixed(2)
                )
              : 0,
            offerDescription: prod.offerDescription || null,
            fecha: new Date(),
          });

          actualizados++;
        }
      } else {
        const resultado = await colProductos.insertOne({
          title: prod.title,
          brand: prod.brand,
          store: STORE,
          currentPrice: priceNum,
          formattedPrice: prod.formattedPrice,
          priceNormal: prod.priceNormal,
          pricePerUnit: prod.pricePerUnit,
          quantity: prod.quantity,
          image: prod.image,
          link: prod.link,
          categoria: categoria,
          lastUpdate: new Date(),
          createdAt: new Date()
        });

        await db.collection("priceHistory").insertOne({
          productId: resultado.insertedId,
          store: STORE,
          price: priceNum,
          previousPrice: null,
          variation: 0,
          offerDescription: prod.offerDescription || null,
          fecha: new Date(),
        });

        nuevos++;
      }

      revisados++;
      renderProgressBar(revisados, productosCategoria.length, `[${STORE}] Guardando`);
    }

    process.stdout.write("\n");
    totalGlobal += productosCategoria.length;
    nuevosGlobal += nuevos;
    actualizadosGlobal += actualizados;

    console.log(
      `[${STORE}] ✅ ${categoria}: Nuevos ${nuevos}, Actualizados ${actualizados}`
    );
  } catch (err) {
    console.error(`[${STORE}] ❌ Error en categoría "${categoria}":`, err.message);
  }
}


  // 📊 Resumen y cierre final
  console.log(`\n📈 RESULTADOS TOTALES`);
  console.log(`[${STORE}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧾 Total productos procesados: ${totalGlobal}`);
  console.log(`🆕 Nuevos: ${nuevosGlobal}, 🔄 Actualizados: ${actualizadosGlobal}`);
  console.log(`✅ Scraping completado con éxito`);

  try {
    await actualizarScrapingArchivo({
      store: STORE,
      nuevos: nuevosGlobal,
      actualizados: actualizadosGlobal,
      totalProductos: totalGlobal,
      fecha: new Date(),
    });
    console.log(`[${STORE}] 🧾 Archivo de scraping actualizado correctamente`);
  } catch (err) {
    console.warn(
      `[${STORE}] ⚠️ No se pudo actualizar el archivo de scraping:`,
      err.message
    );
  }

  await browser.close();
  await closeDB();
  console.log(`[${STORE}] 🔒 Conexión cerrada correctamente con MongoDB Atlas`);
  console.log(`[${STORE}] 🚀 Proceso finalizado exitosamente`);
}

// 🏁 Ejecutar script principal
main().catch((err) => {
  console.error(`[${STORE}] ❌ Error global:`, err);
  process.exit(1);
});