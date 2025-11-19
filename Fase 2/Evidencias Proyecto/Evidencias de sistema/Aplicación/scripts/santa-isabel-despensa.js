// ======================================================================
// 🏪 SCRAPER SANTA ISABEL — DESPENSA (FORMATO ESTÁNDAR SISTEMA)
// ======================================================================

import { chromium } from "playwright";
import { connectDB, getDB } from "../config/db.js";
import crypto from "crypto";

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

// ======================================================================
// 🚀 FUNCIÓN PRINCIPAL
// ======================================================================
async function scrapeSantaIsabel() {
  await connectDB();
  const db = getDB();
  const productosDB = db.collection("productos");
  const historialDB = db.collection("priceHistory");

  const browser = await chromium.launch({
    headless: false, // 🔍 lo dejo false como tenías para depurar
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"]
  });

  const page = await browser.newPage({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  });

  console.log("🛒 Abriendo Santa Isabel...");
  await page.goto(URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);

  // 🥠 Aceptar Cookies fuerza bruta
  try {
    await page.waitForFunction(() => {
      return [...document.querySelectorAll("button")].some(b =>
        b.innerText.includes("Aceptar")
      );
    }, { timeout: 8000 });

    await page.evaluate(() => {
      const botones = [...document.querySelectorAll("button")];
      const btn = botones.find(b =>
        b.innerText.includes("Aceptar todas las cookies") ||
        b.innerText.includes("Aceptar")
      );
      if (btn) btn.click();
    });

    console.log("🍪 Cookies aceptadas.");
    await page.waitForTimeout(1500);
  } catch {
    console.log("⚠️ No apareció modal de cookies.");
  }

  await page.waitForSelector("a.product-card", { timeout: 20000 });
  console.log("👀 Productos visibles, iniciando scraping...");

  // 📌 Paginación
  let totalPaginas = 1;
  try {
    totalPaginas = await page.$$eval(".page-number", (btns) => btns.length);
  } catch {
    console.log("⚠️ No se detectaron botones de página, se asume 1 página.");
  }

  console.log(`📄 Total de páginas detectadas: ${totalPaginas}`);

  // Contadores globales
  let nuevos = 0;
  let actualizados = 0;
  let revisados = 0;

  // ======================================================================
  // 🔄 RECORRER PÁGINAS
  // ======================================================================
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    console.log(`➡️ Procesando página ${pagina}/${totalPaginas}`);

    try {
      if (pagina > 1) {
        // Para la primera página ya estamos ahí
        try {
          await page.click(`.page-number:nth-child(${pagina})`);
        } catch {
          await page.evaluate((i) => {
            document.querySelectorAll(".page-number")[i - 1]?.click();
          }, pagina);
        }

        await page.waitForFunction(() => {
          return document.querySelectorAll("a.product-card").length > 0;
        }, { timeout: 8000 });

        await page.waitForTimeout(1000);
      }
    } catch (err) {
      console.log(`⚠️ Error navegando a página ${pagina}: ${err.message}`);
      continue;
    }

    // ======================================================================
    // 🧠 EXTRACCIÓN DE DATOS
    // ======================================================================
    let productos = [];
    for (let intento = 0; intento < 3; intento++) {
productos = await page.$$eval("a.product-card", (cards) =>
  cards.map(c => {
    const precioText = c.querySelector(".prices-main-price")?.textContent?.trim() || null;
    const pricePerUnitText = c.querySelector(".ppum-price-container span")?.textContent?.trim() || null;
    const imgEl = c.querySelector("img.lazy-image");

    const currentPrice = precioText
      ? Number(precioText.replace(/[^0-9]/g, ""))
      : null;

    let image = imgEl?.getAttribute("src") || null;
    if (image && image.startsWith("//")) {
      image = "https:" + image;
    }

    const linkHref = c.getAttribute("href");
    const link = linkHref
      ? (linkHref.startsWith("http")
          ? linkHref
          : "https://www.santaisabel.cl" + linkHref)
      : null;

    return {
      title: c.querySelector(".product-card-name")?.textContent?.trim() || null,
      brand: c.querySelector(".product-card-brand")?.textContent?.trim() || "Sin marca",
      store: "santaisabel",               // ← FIX
      currentPrice,
      formattedPrice: precioText,
      priceNormal: null,
      pricePerUnit: pricePerUnitText,
      image,
      link,
      categoria: "Despensa",
      categoriaSlug: "despensa",
      lastUpdate: new Date()
    };
  })
);


      // 🔎 Filtro rápido: solo productos con título y precio válido
      productos = productos.filter(p => p.title && p.currentPrice !== null);

      if (productos.length > 0) break;
      console.log(`🔁 Reintentando carga (intento ${intento + 1})...`);
      await page.waitForTimeout(1500);
    }

    console.log(`📦 Productos capturados en página ${pagina}: ${productos.length}`);

    // ======================================================================
    // 💾 GUARDAR EN BD + HISTORIAL (NORMALIZADO CON globalId)
    // ======================================================================
    for (const p of productos) {
      if (!p.title || p.currentPrice === null) continue;

      const marcaDetectada = p.brand || "Sin marca";
      const globalId = generarGlobalId(p.title, marcaDetectada);

      const existente = await productosDB.findOne({ globalId, store: STORE });

      if (existente) {
        // Solo registrar si cambió el precio
        if (existente.currentPrice !== p.currentPrice) {
          await productosDB.updateOne(
            { _id: existente._id },
            {
              $set: {
                globalId,
                title: p.title,
                brand: marcaDetectada,
                store: STORE,
                currentPrice: p.currentPrice,
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
            price: p.currentPrice,
            previousPrice: existente.currentPrice || null,
            variation: existente.currentPrice
              ? Number(
                  (((p.currentPrice - existente.currentPrice) / existente.currentPrice) * 100).toFixed(2)
                )
              : 0,
            fecha: new Date()
          });

          actualizados++;
          console.log(`🔄 Precio actualizado: ${p.title}`);
        }
      } else {
        const now = new Date();
        const result = await productosDB.insertOne({
          globalId,
          title: p.title,
          brand: marcaDetectada,
          store: STORE,
          currentPrice: p.currentPrice,
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
        console.log(`🆕 Nuevo producto agregado: ${p.title}`);

        await historialDB.insertOne({
          productId: result.insertedId,
          store: STORE,
          price: p.currentPrice,
          previousPrice: null,
          variation: 0,
          fecha: new Date()
        });
      }

      revisados++;
    }

    console.log(`✅ Página ${pagina} procesada. Lleva revisados: ${revisados}`);
  }

  const totalDB = await productosDB.countDocuments({ store: STORE });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 RESULTADOS SANTA ISABEL — DESPENSA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Nuevos:        ${nuevos}`);
  console.log(`Actualizados:  ${actualizados}`);
  console.log(`Revisados hoy: ${revisados}`);
  console.log(`Total en Atlas (${STORE}): ${totalDB}`);

  await browser.close();
  console.log("✔️ Scraping COMPLETO para Santa Isabel Despensa");
}

scrapeSantaIsabel().catch(console.error);
