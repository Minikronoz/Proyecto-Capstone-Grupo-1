// ===============================================
// 📦 utils/scraperBase.js
// Base común para todos los scrapers (Jumbo, Tottus, Unimarc, A Cuenta)
// ===============================================

import Producto from "../models/Producto.js";
import { PriceHistory } from "../models/PriceHistory.js";


// ============================================================
// 1️⃣ Normalizador de precios
// ============================================================
export function parsePriceUnitario(priceStr = "") {
  if (!priceStr) return null;

  const texto = priceStr.replace(/\s+/g, "").toLowerCase();

  // 🧮 Caso combos: "2x$3000", "2 x $3.000", "3X$7500"
  const combo = texto.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    if (cantidad > 0 && total > 0) return Math.round(total / cantidad);
  }

  // 🧮 Caso normal: "$2.990", "$1,990 c/u"
  const normal = parseInt(texto.replace(/\D/g, ""), 10);
  return isNaN(normal) ? null : normal;
}

// ============================================================
// 2️⃣ Guardar o actualizar producto e historial
// ------------------------------------------------------------
// - Si no existe → crea producto + PriceHistory inicial
// - Si existe y cambia precio → actualiza + nuevo PriceHistory
// - Si no cambia → actualiza solo lastUpdate
// ============================================================
export async function guardarProductoNormalizado(prod, store, categoria = "General") {
  try {
    const precioUnitario = parsePriceUnitario(prod.price || prod.formattedPrice);
    if (!precioUnitario || isNaN(precioUnitario)) {
      console.warn(`[${store}] ⚠️ Producto sin precio válido: ${prod.title || "Sin título"}`);
      return { status: "skip" };
    }

    const linkLimpio = (prod.link || "").trim();
    if (!linkLimpio) {
      console.warn(`[${store}] ⚠️ Producto sin link, omitido: ${prod.title}`);
      return { status: "skip" };
    }

    const existente = await Producto.findOne({ link: linkLimpio, store });

    if (existente) {
      // 🔹 Caso: precio cambió
      if (existente.currentPrice !== precioUnitario) {
        const anterior = existente.currentPrice;
        existente.currentPrice = precioUnitario;
        existente.formattedPrice = prod.price || prod.formattedPrice;
        existente.lastUpdate = new Date();
        await existente.save();

        const variacion = anterior ? ((precioUnitario - anterior) / anterior) * 100 : 0;

        await PriceHistory.create({
          productId: existente._id,
          store,
          price: precioUnitario,
          previousPrice: anterior,
          variation: Number(variacion.toFixed(2)),
          offerDescription: prod.offerDescription || null,
        });

        return { status: "updated", producto: existente.title, variacion };
      }

      // 🔹 Caso: mismo precio → solo refrescar lastUpdate
      existente.lastUpdate = new Date();
      await existente.save();
      return { status: "unchanged", producto: existente.title };
    }

    // 🔹 Caso: producto nuevo
    const nuevo = await Producto.create({
      title: prod.title || "Sin título",
      brand: prod.brand || "Sin marca",
      store,
      currentPrice: precioUnitario,
      formattedPrice: prod.price || prod.formattedPrice,
      image: prod.image || "",
      link: linkLimpio,
      categoria,
      lastUpdate: new Date(),
    });

    await PriceHistory.create({
      productId: nuevo._id,
      store,
      price: precioUnitario,
      previousPrice: null,
      variation: 0,
    });

    return { status: "new", producto: nuevo.title };
  } catch (err) {
    console.error(`[${store}] ❌ Error al guardar producto "${prod.title}":`, err.message);
    return { status: "error", producto: prod.title || "Desconocido" };
  }
}

// ============================================================
// 3️⃣ Barra de progreso visual en consola
export function renderProgressBar(current, total, prefix = "💾 Guardando productos") {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}
