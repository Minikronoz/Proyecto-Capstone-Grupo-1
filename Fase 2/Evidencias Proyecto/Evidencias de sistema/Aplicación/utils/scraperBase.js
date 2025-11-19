// ===============================================
// 📦 utils/scraperBase.js
// Base común para todos los scrapers (Jumbo, Tottus, Unimarc, A Cuenta)
// ===============================================

import Producto from "../models/Producto.js";
import { PriceHistory } from "../models/PriceHistory.js";

// ============================================================
// 📌 Normalizador de precio por unidad (kg, g, ml, L…)
// ============================================================
export function procesarUnit(pricePerUnit = "") {
  if (!pricePerUnit) return { unitValue: null, unitName: null };

  const match = pricePerUnit.match(/([\d\.]+).*?(?:x|\/)\s*(\d+)?\s*(g|gr|kg|ml|l|lt)/i);
  if (!match) return { unitValue: null, unitName: null };

  let valor = parseInt(match[1].replace(/\D/g, ""), 10);
  let cantidad = parseInt(match[2], 10) || 1;
  let unidad = match[3].toLowerCase();

  // Convertir a g/ml para comparación
  if (unidad === "kg") { cantidad *= 1000; unidad = "g"; }
  if (unidad === "l" || unidad === "lt") { cantidad *= 1000; unidad = "ml"; }

  // ❌ si término es 1 unidad → ignorar (ej: "$4000/un")
  if (cantidad === 1 && (unidad === "" || unidad === "un")) {
    return { unitValue: null, unitName: null };
  }

  return {
    unitValue: valor,
    unitName: `${cantidad}${unidad}`
  };
}

// ============================================================
// 1️⃣ Normalizador de precios
// ============================================================
export function parsePriceUnitario(priceStr = "") {
  if (!priceStr) return null;

  const texto = priceStr.replace(/\s+/g, "").toLowerCase();
  if (texto.includes("-")) return null; // ❌ sin stock ($-, -, etc.)

  // 🧮 Combos: 2x$3000 → $1500 c/u
  const combo = texto.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    return cantidad > 0 && total > 0 ? Math.round(total / cantidad) : null;
  }

  // 🧮 Precio normal: "$2.990", "$1,990", "1.990 c/u"
  const normal = parseInt(texto.replace(/\D/g, ""), 10);
  return normal > 0 ? normal : null;
}return isNaN(normal) ? null : normal;


// ============================================================
// 2️⃣ Guardar o actualizar producto e historial
// ------------------------------------------------------------
// - Si no existe → crea producto + PriceHistory inicial
// - Si existe y cambia precio → actualiza + nuevo PriceHistory
// - Si no cambia → actualiza solo lastUpdate
// ============================================================
export async function guardarProductoNormalizado(prod, store, categoria = "General") {
  try {

    // ❌ Saltar productos sin precio real
        if (
          !prod.price && !prod.formattedPrice ||
          (prod.price || prod.formattedPrice).includes("-")
        ) {
          return { status: "skip" };
        }
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
const { unitValue, unitName } = procesarUnit(prod.pricePerUnit);

const nuevo = await Producto.create({
  title: prod.title || "Sin título",
  brand: prod.brand || "Sin marca",
  store,
  currentPrice: precioUnitario,
  formattedPrice: prod.price || prod.formattedPrice,
  priceNormal: prod.priceNormal || null,
  pricePerUnit: prod.pricePerUnit || null,
  unitValue,
  unitName,
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
// ⚡ Barra de progreso rápida (actualiza cada 5%)
// ============================================================
export function renderProgressBar(current, total, prefix = "💾 Guardando productos") {
  if (!total || total <= 0) return;

  const width = 30;
  const avance = current / total;
  const progress = Math.round(avance * width);

  // ⚡ Solo refrescar cada 5% o al finalizar
  const paso = Math.ceil(total * 0.05);
  if (current % paso !== 0 && current !== total) return;

  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = (avance * 100).toFixed(1).padStart(5);

  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

export function renderProgressFast(current, total, prefix = "💾 Guardando") {
  if (current % 50 !== 0 && current !== total) return; // cada 50 productos aprox.
  process.stdout.write(`\r${prefix} ${current}/${total}...`);
  if (current === total) process.stdout.write("\n");
}

