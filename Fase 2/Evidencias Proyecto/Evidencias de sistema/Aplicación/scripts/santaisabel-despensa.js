// ======================================================================
//  SCRAPER SANTA ISABEL — DESPENSA (FORMATO ESTÁNDAR SISTEMA)
// ======================================================================

import { chromium } from "playwright";
import { connectDB, getDB } from "../config/db.js";
import crypto from "crypto";
import { parsePriceUnitario } from "../utils/scraperBase.js";
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";

const URL = "https://www.santaisabel.cl/despensa";
const CATEGORIA = "Despensa";
const CATEGORIA_SLUG = "despensa";
const STORE = "santaisabel";

// 🛡️ User Agents anti-bloqueos
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/119 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118 Safari/537.36"
];

// =============================================================
// 🔐 globalId (mismo criterio que en otros scrapers)
// =============================================================
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
//  Normalizar texto de precio para evitar valores locos
//    (ej: "$2.990 $3.710" → toma solo el primer precio)
// =============================================================
function normalizarTextoPrecio(precioText = "") {
  if (!precioText) return "";

  // Busca el primer patrón tipo $2.990, 2.990, $2990, etc.
  const match = precioText.match(/\$?\s*[\d\.]+/);
  return match ? match[0].trim() : precioText.trim();
}

// ======================================================================
//  FUNCIÓN PRINCIPAL
// ======================================================================
async function scrapeSantaIsabel() {
  await connectDB();
  const db = getDB();
  const productosDB = db.collection("productos");
  const historialDB = db.collection("priceHistory");

  const browser = await chromium.launch({
    headless: false, // lo dejamos false como tenías para depurar visualmente
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"]
  });

  const page = await browser.newPage({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  });

  console.log(`\n[${STORE}] 🛒 Abriendo Santa Isabel Despensa...`);
  await page.goto(URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);

  //  Aceptar Cookies fuerza bruta
  try {
    await page.waitForFunction(() => {
      return [...document.querySelectorAll("button")].some((b) =>
        b.innerText.includes("Aceptar")
      );
    }, { timeout: 8000 });

    await page.evaluate(() => {
      const botones = [...document.querySelectorAll("button")];
      const btn = botones.find((b) =>
        b.innerText.includes("Aceptar todas las cookies") ||
        b.innerText.includes("Aceptar")
      );
      if (btn) btn.click();
    });

    console.log(`[${STORE}]  Cookies aceptadas.`);
    await page.waitForTimeout(1500);
  } catch {
    console.log(`[${STORE}] ⚠️ No apareció modal de cookies.`);
  }

  await page.waitForSelector("a.product-card", { timeout: 20000 });
  console.log(`[${STORE}]  Productos visibles, iniciando scraping...`);

  // 📌 Paginación
  let totalPaginas = 1;
  try {
    totalPaginas = await page.$$eval(".page-number", (btns) => btns.length || 1);
  } catch {
    console.log(`[${STORE}] ⚠️ No se detectaron botones de página, se asume 1 página.`);
  }

  console.log(`[${STORE}] 📄 Total de páginas detectadas: ${totalPaginas}`);

  // Contadores globales
  let nuevos = 0;
  let actualizados = 0;
  let revisados = 0;

  // ======================================================================
  //  RECORRER PÁGINAS
  // ======================================================================
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    console.log(`➡️ [${STORE}] Procesando página ${pagina}/${totalPaginas}`);

    try {
      if (pagina > 1) {
        // Primera página ya cargada; el resto se navega
        try {
          await page.click(`.page-number:nth-child(${pagina})`);
        } catch {
          await page.evaluate((i) => {
            document.querySelectorAll(".page-number")[i - 1]?.click();
          }, pagina);
        }

        await page.waitForFunction(
          () => document.querySelectorAll("a.product-card").length > 0,
          { timeout: 8000 }
        );

        await page.waitForTimeout(1000);
      }
    } catch (err) {
      console.log(`[${STORE}] ⚠️ Error navegando a página ${pagina}: ${err.message}`);
      continue;
    }

    // ======================================================================
    //EXTRACCIÓN DE DATOS (SIN PARSEAR NÚMEROS AQUÍ)
// ======================================================================
    let productos = [];
    for (let intento = 0; intento < 3; intento++) {
      productos = await page.$$eval("a.product-card", (cards) =>
        cards.map((c) => {
          try {
            const precioText =
              c.querySelector(".prices-main-price")?.textContent?.trim() || null;
            const pricePerUnitText =
              c.querySelector(".ppum-price-container span")?.textContent?.trim() ||
              null;
            const imgEl = c.querySelector("img.lazy-image");

            let image = imgEl?.getAttribute("src") || null;
            if (image && image.startsWith("//")) {
              image = "https:" + image;
            }

            const linkHref = c.getAttribute("href");
            const link = linkHref
              ? linkHref.startsWith("http")
                ? linkHref
                : "https://www.santaisabel.cl" + linkHref
              : null;

            const title =
              c.querySelector(".product-card-name")?.textContent?.trim() || null;
            const brand =
              c.querySelector(".product-card-brand")?.textContent?.trim() ||
              "Sin marca";

            return {
              title,
              brand,
              store: "santaisabel",
              formattedPrice: precioText,
              priceNormal: null,
              pricePerUnit: pricePerUnitText,
              image,
              link,
              categoria: "Despensa",
              categoriaSlug: "despensa",
              lastUpdate: new Date()
            };
          } catch {
            return null;
          }
        }).filter(Boolean)
      );

      //  Filtro rápido: solo productos con título y string de precio
      productos = productos.filter((p) => p.title && p.formattedPrice);

      if (productos.length > 0) break;
      console.log(`[${STORE}] 🔁 Reintentando carga (intento ${intento + 1})...`);
      await page.waitForTimeout(1500);
    }

    console.log(
      `[${STORE}] 📦 Productos capturados en página ${pagina}: ${productos.length}`
    );

    // ======================================================================
    //  GUARDAR EN BD + HISTORIAL (CON PARSER UNIFICADO)
// ======================================================================
    for (const p of productos) {
      if (!p.title || !p.formattedPrice) continue;

      //  Limpiamos el texto para evitar que se mezclen dos precios
      const textoPrecioLimpio = normalizarTextoPrecio(p.formattedPrice);

      //  Aplicamos el parser estándar (soporta "2x$3.000", etc.)
      const precioNum = parsePriceUnitario(textoPrecioLimpio);
      if (!precioNum || isNaN(precioNum) || precioNum <= 0) continue;

      const marcaDetectada = p.brand || "Sin marca";
      const globalId = generarGlobalId(p.title, marcaDetectada);

      const existente = await productosDB.findOne({ globalId, store: STORE });

      if (existente) {
        // Solo registrar si cambió el precio
        if (existente.currentPrice !== precioNum) {
          await productosDB.updateOne(
            { _id: existente._id },
            {
              $set: {
                globalId,
                title: p.title,
                brand: marcaDetectada,
                store: STORE,
                currentPrice: precioNum,
                formattedPrice: p.formattedPrice,
                pricePerUnit: p.pricePerUnit || null,
                priceNormal: p.priceNormal || null,
                image: p.image,
                link: p.link,
                categoria: CATEGORIA,
                categoriaSlug: CATEGORIA_SLUG,
                lastUpdate: new Date()
              }
            }
          );

          await historialDB.insertOne({
            productId: existente._id,
            store: STORE,
            price: precioNum,
            previousPrice: existente.currentPrice || null,
            variation: existente.currentPrice
              ? Number(
                  (((precioNum - existente.currentPrice) / existente.currentPrice) *
                    100
                  ).toFixed(2)
                )
              : 0,
            fecha: new Date()
          });

          actualizados++;

        } else {

          await productosDB.updateOne(
            { _id: existente._id },
            { $set: { lastUpdate: new Date() } }
          );
        }
      } else {
        const now = new Date();
        const result = await productosDB.insertOne({
          globalId,
          title: p.title,
          brand: marcaDetectada,
          store: STORE,
          currentPrice: precioNum,
          formattedPrice: p.formattedPrice,
          pricePerUnit: p.pricePerUnit || null,
          priceNormal: p.priceNormal || null,
          image: p.image,
          link: p.link,
          categoria: CATEGORIA,
          categoriaSlug: CATEGORIA_SLUG,
          lastUpdate: now,
          createdAt: now
        });

        nuevos++;


        await historialDB.insertOne({
          productId: result.insertedId,
          store: STORE,
          price: precioNum,
          previousPrice: null,
          variation: 0,
          fecha: new Date()
        });
      }

      revisados++;
    }

    console.log(
      `[${STORE}] ✅ Página ${pagina} procesada. Lleva revisados acumulados: ${revisados}`
    );
  }

  const totalDB = await productosDB.countDocuments({ store: STORE });

  console.log(`\n📊 ${STORE.toUpperCase()} — RESULTADOS`);
  console.log(`🆕 Nuevos: ${nuevos}`);
  console.log(`♻️ Actualizados: ${actualizados}`);
  console.log(`🔎 Revisados: ${revisados}`);
  console.log(`📦 Total en Atlas: ${totalDB}`);
  console.log(`⏱️ Finalizado: ${new Date().toLocaleString("es-CL")}\n`);

  try {
    await actualizarScrapingArchivo({
      store: STORE,
      nuevos,
      actualizados,
      totalProductos: totalDB,
      fecha: new Date()
    });
    console.log(`[${STORE}] 🧾 Archivo de scraping actualizado correctamente`);
  } catch (err) {
    console.warn(
      `[${STORE}] ⚠️ No se pudo actualizar archivo de scraping:`,
      err.message
    );
  }

  await browser.close();
  console.log(`[${STORE}] 🔒 Navegador cerrado — Scraper Santa Isabel finalizado`);
}

scrapeSantaIsabel().catch((err) => {
  console.error(`[${STORE}] ERROR GLOBAL`, err);
});
