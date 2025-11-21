// ===============================================
// BulkWrite para guardar 1000+ productos en segundos
// ===============================================

import Producto from "../models/Producto.js";
import { PriceHistory } from "../models/PriceHistory.js";


// ============================================================
//  Normalizador de precio por unidad (kg, g, ml, L…)
// ============================================================
export function procesarUnit(pricePerUnit = "") {
  if (!pricePerUnit) return { unitValue: null, unitName: null };

  const match = pricePerUnit.match(/([\d\.]+).*?(?:x|\/)\s*(\d+)?\s*(g|gr|kg|ml|l|lt)/i);
  if (!match) return { unitValue: null, unitName: null };

  let valor = parseInt(match[1].replace(/\D/g, ""), 10);
  let cantidad = parseInt(match[2], 10) || 1;
  let unidad = match[3].toLowerCase();

  if (unidad === "kg") { cantidad *= 1000; unidad = "g"; }
  if (unidad === "l" || unidad === "lt") { cantidad *= 1000; unidad = "ml"; }

  if (cantidad === 1 && (unidad === "" || unidad === "un")) {
    return { unitValue: null, unitName: null };
  }

  return { unitValue: valor, unitName: `${cantidad}${unidad}` };
}


// ============================================================
//  Normalizador de precios (soporta combos, evita dobles "$")
// ============================================================
export function parsePriceUnitario(priceStr = "") {
  if (!priceStr) return null;

  const texto = priceStr.replace(/\s+/g, "").toLowerCase();
  if (texto.includes("-")) return null;

  //  Combo 2x, 3x, etc.
  const combo = texto.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    return cantidad > 0 && total > 0 ? Math.round(total / cantidad) : null;
  }

  //  SOLO PRIMER PRECIO (evita "$2990$3710")
  const primerPrecio = texto.match(/\$?([\d\.]+)/);
  if (!primerPrecio) return null;

  const normal = parseInt(primerPrecio[1].replace(/\D/g, ""), 10);
  return normal > 0 ? normal : null;
}



// ============================================================
//  BulkWrite Ultrarápido (inserta/actualiza en bloques)
// ============================================================
export async function guardarProductosBulk(productos, store, categoria = "General") {
  const opsProductos = [];
  const opsHistory = [];
  let skip = 0, nuevos = 0, actualizados = 0, sinCambio = 0;

  for (const prod of productos) {
    if (!prod.link || (!prod.price && !prod.formattedPrice)) { skip++; continue; }
    if ((prod.price || prod.formattedPrice).includes("-")) { skip++; continue; }

    const precioUnitario = parsePriceUnitario(prod.price || prod.formattedPrice);
    if (!precioUnitario || isNaN(precioUnitario) || precioUnitario <= 0) { skip++; continue; }

    const { unitValue, unitName } = procesarUnit(prod.pricePerUnit);
    const linkLimpio = prod.link.trim();

    opsProductos.push({
      updateOne: {
        filter: { link: linkLimpio, store },
        update: {
          $set: {
            title: prod.title || "Sin título",
            brand: prod.brand || "Sin marca",
            currentPrice: precioUnitario,
            formattedPrice: prod.price || prod.formattedPrice,
            priceNormal: prod.priceNormal || null,
            pricePerUnit: prod.pricePerUnit || null,
            unitValue,
            unitName,
            image: prod.image || "",
            categoria,
            lastUpdate: new Date()
          },
          $setOnInsert: { createdAt: new Date(), link: linkLimpio, store }
        },
        upsert: true
      }
    });
  }

// ============================================================
//  Guardar historial solo cuando cambia precio (más rápido)
// ============================================================
if (opsProductos.length > 0) {
  const res = await Producto.bulkWrite(opsProductos, { ordered: false });

  nuevos = res.upsertedCount;
  actualizados = res.modifiedCount;
  sinCambio = productos.length - nuevos - actualizados - skip;

  //  Guardar solo los productos modificados
  if (actualizados > 0) {
    const idsActualizados = Object.values(res.upsertedIds);

    const docsActualizados = await Producto.find(
      idsActualizados.length > 0
        ? { _id: { $in: idsActualizados }, store }
        : { store }
    )
    .select("_id currentPrice")
    .lean();

    for (const p of docsActualizados) {
      opsHistory.push({
        insertOne: {
          document: {
            productId: p._id,
            store,
            price: p.currentPrice,
            previousPrice: null, // opcional recuperar anterior
            variation: 0,
            fecha: new Date()
          }
        }
      });
    }

    if (opsHistory.length > 0) {
      await PriceHistory.bulkWrite(opsHistory, { ordered: false });
    }
  }
}


  return { nuevos, actualizados, skip, sinCambio, total: productos.length };
}


// ============================================================
//  Barra de progreso estándar (solo cada 5%)
// ============================================================
export function renderProgressBar(current, total, prefix = "⏳ Procesando") {
  if (!total || total <= 0) return;
  const width = 28;
  const progress = Math.round((current / total) * width);

  const pasoMinimo = Math.ceil(total * 0.05);
  if (current % pasoMinimo !== 0 && current !== total) return;

  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(0).padStart(3);

  process.stdout.write(`\r${prefix} [${bar}] ${percent}%`);
  if (current === total) process.stdout.write("\n");
}
