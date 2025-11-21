// =============================================================
// CONTROLADOR: Estadísticas Generales del Sistema (versión MongoDB nativa)
// =============================================================
import { getDB } from "../config/db.js";
// 🏪 Ranking de supermercados por variedad de productos nuevos (Atlas compatible)
export const rankingProductosNuevos = async (req, res) => {
  try {
    const db = getDB();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30); // últimos 30 días

    // Detectar colección en Atlas (por si cambió el nombre)
    const colecciones = await db.listCollections().toArray();
    const nombreColeccion = colecciones.some(c => c.name === "productos")
      ? "productos"
      : "products"; // fallback si Atlas tiene otro nombre

    // Agrupar productos nuevos por supermercado
    const data = await db.collection(nombreColeccion).aggregate([
      {
        $match: {
          store: { $exists: true, $ne: null },
          $or: [
            { createdAt: { $gte: desde } },
            { lastUpdate: { $gte: desde } },
          ],
        },
      },
      {
        $group: {
          _id: "$store",          
          total: { $sum: 1 },     
        },
      },
      { $sort: { total: -1 } }
    ]).toArray();

    res.json(data.length ? data : []);
  } catch (error) {
    console.error(" Error en rankingProductosNuevos:", error);
    res.status(500).json({ error: "Error al calcular ranking de productos nuevos" });
  }
};

//  Índice de Competitividad — Ranking según precio promedio real del mercado
export const indiceCompetitividad = async (req, res) => {
  try {
    const db = getDB();

    // 🔎 Detectar colección correcta (compatibilidad con migraciones)
    const colecciones = await db.listCollections().toArray();
    const nombreColeccion = colecciones.some(c => c.name === "priceHistory")
      ? "priceHistory"
      : "pricehistories";

    const resultado = await db.collection(nombreColeccion).aggregate([

      // 1️ Solo registros válidos con precio y tienda
      {
        $match: {
          price: { $exists: true, $ne: null },
          store: { $exists: true, $ne: null }
        }
      },

      // 2️ Normalización: convertir strings y limpiar separadores de miles
      {
        $addFields: {
          priceNum: {
            $toDouble: {
              $replaceAll: { input: { $toString: "$price" }, find: ".", replacement: "" }
            }
          }
        }
      },

      // 3️ Filtrar datos corruptos después de convertir
      {
        $match: {
          priceNum: { $gte: 100, $lte: 300000 } // ✔ Rango real Chile
        }
      },

      // 4️ Normalizar nombre de tienda (evita "Acuenta", "ACuenta", etc.)
      {
        $addFields: {
          storeNorm: { $trim: { input: { $toLower: "$store" } } }
        }
      },

      // 5️ Agrupar por tienda → calcular promedio real
      {
        $group: {
          _id: "$storeNorm",
          promedio: { $avg: "$priceNum" },
          cantidad: { $sum: 1 }
        }
      },

      // 6️ Excluir rankings falsos por baja cantidad de datos
      {
        $match: { cantidad: { $gte: 50 } } 
      },

      // 7️ Ordenar de menor a mayor precio → más barato primero
      { $sort: { promedio: 1 } },

      // 8️ Proyección limpia + nombres bonitos finales
      {
        $project: {
          _id: 0,
          tienda: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "acuenta"] }, then: "A Cuenta" },
                { case: { $eq: ["$_id", "santaisabel"] }, then: "Santa Isabel" }
              ],
              default: { $toUpper: "$_id" }
            }
          },
          promedio: { $round: ["$promedio", 0] },
          cantidad: 1
        }
      }

    ]).toArray();

    res.json(resultado);

  } catch (err) {
    console.error(" Error en indiceCompetitividad:", err);
    res.status(500).json({ error: "Error al calcular índice de competitividad" });
  }
};



//  Cruce entre género y región (Atlas compatible y estándar)
export const cruceGeneroRegion = async (req, res) => {
  try {
    const db = getDB();

    // Detectar colección (usuarios)
    const colecciones = await db.listCollections().toArray();
    const nombreColeccion = colecciones.some(c => c.name === "usuarios")
      ? "usuarios"
      : "users"; // fallback si Atlas usa otro nombre

    // Agrupar usuarios por género y región
    const data = await db.collection(nombreColeccion).aggregate([
      {
        $match: {
          genero: { $exists: true, $ne: null },
          region: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: { genero: "$genero", region: "$region" },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          genero: "$_id.genero",
          region: "$_id.region",
          total: 1
        }
      },
      { $sort: { region: 1, genero: 1 } }
    ]).toArray();

    res.json(data.length ? data : []);
  } catch (error) {
    console.error(" Error en cruceGeneroRegion:", error);
    res.status(500).json({ error: "Error al generar cruce género-región" });
  }
};


//  Usuarios nuevos vs. recurrentes (Atlas compatible y estándar)
export const usuariosNuevosRecurrentes = async (req, res) => {
  try {
    const db = getDB();

    // Detectar la colección correcta
    const colecciones = await db.listCollections().toArray();
    const nombreColeccion = colecciones.some(c => c.name === "usuarios")
      ? "usuarios"
      : "users"; // fallback si Atlas usa otro nombre

    // Obtener la fecha del primer y último registro
    const usuarios = await db.collection(nombreColeccion)
      .find({ createdAt: { $exists: true } })
      .project({ correo: 1, createdAt: 1, lastLogin: 1 })
      .toArray();

    if (!usuarios.length) {
      return res.json([{ _id: "Nuevos", total: 0 }, { _id: "Recurrentes", total: 0 }]);
    }

    // Clasificar nuevos y recurrentes
    const nuevos = usuarios.filter(u => !u.lastLogin || u.createdAt === u.lastLogin).length;
    const recurrentes = usuarios.length - nuevos;

    // Enviar formato estándar compatible con renderChart()
    res.json([
      { _id: "Nuevos", total: nuevos },
      { _id: "Recurrentes", total: recurrentes }
    ]);
  } catch (error) {
    console.error(" Error en usuariosNuevosRecurrentes:", error);
    res.status(500).json({ error: "Error al calcular usuarios nuevos vs recurrentes" });
  }
};
//  Productos con mayor crecimiento (Atlas compatible)
export const productosCrecimiento = async (req, res) => {
  try {
    const db = getDB();

    // Detectar colección de histórico de precios
    const colecciones = await db.listCollections().toArray();
    const nombreColeccion = colecciones.some(c => c.name === "priceHistory")
      ? "priceHistory"
      : "pricehistories"; // fallback

    // 🔹 Periodo de comparación (últimos 14 días)
    const hoy = new Date();
    const hace14 = new Date();
    hace14.setDate(hoy.getDate() - 14);

    // Agrupar precios promedio por producto entre ambas fechas
    const data = await db.collection(nombreColeccion).aggregate([
      {
        $match: {
          lastUpdate: { $gte: hace14 },
          price: { $exists: true, $gt: 0 },
          store: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$producto",
          precioInicial: { $first: "$price" },
          precioFinal: { $last: "$price" }
        }
      },
      {
        $addFields: {
          crecimiento: {
            $cond: [
              { $eq: ["$precioInicial", 0] },
              0,
              { $multiply: [{ $divide: [{ $subtract: ["$precioFinal", "$precioInicial"] }, "$precioInicial"] }, 100] }
            ]
          }
        }
      },
      { $sort: { crecimiento: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          producto: "$_id",
          crecimiento: { $round: ["$crecimiento", 1] }
        }
      }
    ]).toArray();

    if (!data.length) {
      console.warn(" No se encontraron productos con crecimiento");
      return res.json([{ producto: "Sin crecimiento detectado", crecimiento: 0 }]);
    }

    res.json(data);
  } catch (error) {
    console.error(" Error en productosCrecimiento:", error);
    res.status(500).json({ error: "Error al calcular productos con mayor crecimiento" });
  }
};


/** Productos con baja de precio (últimos 7 días) */
export async function obtenerBajasDePrecio(req, res) {
  try {
    const db = getDB();
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const data = await db.collection("priceHistory")
      .aggregate([
        {
          $match: {
            fecha: { $gte: hace7dias },

            // Precio bajó
            $expr: { $lt: ["$price", "$previousPrice"] },

            // Filtros anti-scraping corrupto
            price: { $gte: 100, $lte: 200000 },
            previousPrice: { $gte: 100, $lte: 200000 }
          }
        },

        // Calcular diferencia
        {
          $addFields: {
            diferencia: { $subtract: ["$previousPrice", "$price"] }
          }
        },

        // Evitar bajas falsas exageradas
        {
          $match: {
            diferencia: { $lte: 50000 }
          }
        },

        // JOIN con productos
        {
          $lookup: {
            from: "productos",
            localField: "productId",
            foreignField: "_id",
            as: "producto"
          }
        },
        { $unwind: "$producto" },

        // Selección de campos
        {
          $project: {
            _id: 0,
            productId: 1,
            store: 1,
            precioAnterior: "$previousPrice",
            precioActual: "$price",
            diferencia: 1,
            fecha: 1,
            titulo: "$producto.title",
            image: "$producto.image",
            categoria: "$producto.categoria",
            link: "$producto.link",

          }
        },

        { $sort: { diferencia: -1 } }
      ])
      .toArray();

    res.json({ ok: true, data });

  } catch (err) {
    console.error(" Error en obtenerBajasDePrecio:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**  Productos con subida de precio (últimos 7 días) */
export async function obtenerSubidasDePrecio(req, res) {
  try {
    const db = getDB();
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const data = await db.collection("priceHistory")
      .aggregate([
        {
          $match: {
            fecha: { $gte: hace7dias },

            // Precio subió
            $expr: { $gt: ["$price", "$previousPrice"] },

            // Filtros anti-precios corruptos
            price: { $gte: 50, $lte: 500000 },
            previousPrice: { $gte: 50, $lte: 500000 }
          }
        },

        // Convertir strings a número
        {
          $addFields: {
            priceNum: {
              $cond: [
                { $eq: [{ $type: "$price" }, "string"] },
                { $toDouble: "$price" },
                "$price"
              ]
            },
            prevNum: {
              $cond: [
                { $eq: [{ $type: "$previousPrice" }, "string"] },
                { $toDouble: "$previousPrice" },
                "$previousPrice"
              ]
            }
          }
        },

        // Segundo filtro de seguridad
        {
          $match: {
            priceNum: { $gte: 50, $lte: 500000 },
            prevNum: { $gte: 50, $lte: 500000 }
          }
        },

        // Calcular diferencia real
        {
          $addFields: {
            diferencia: { $subtract: ["$priceNum", "$prevNum"] }
          }
        },

        // Evitar subidas falsas por scrap roto
        {
          $match: {
            diferencia: { $lte: 50000 }
          }
        },

        // JOIN productos
        {
          $lookup: {
            from: "productos",
            localField: "productId",
            foreignField: "_id",
            as: "producto"
          }
        },
        { $unwind: "$producto" },

        // Campos finales
        {
          $project: {
            _id: 0,
            productId: 1,
            store: 1,
            precioAnterior: "$prevNum",
            precioActual: "$priceNum",
            diferencia: 1,
            fecha: 1,
            titulo: "$producto.title",
            image: "$producto.image",
            categoria: "$producto.categoria",
            link: "$producto.link",

          }
        },

        { $sort: { diferencia: -1 } }
      ])
      .toArray();

    res.json({ ok: true, data });

  } catch (err) {
    console.error(" Error en obtenerSubidasDePrecio:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}



//  Insights del sistema (Atlas compatible)
export const insights = async (req, res) => {
  try {
    const db = getDB();

    //  Colecciones base
    const colecciones = await db.listCollections().toArray();
    const tieneClicks = colecciones.some(c => c.name === "clicks");
    const tieneBusquedas = colecciones.some(c => c.name === "busquedas");
    const tieneProductos = colecciones.some(c => c.name === "productos");

    const resultado = {
      topProducto: "Sin datos",
      topSupermercado: "Sin datos",
      topRegion: "Sin datos",
      topBusqueda: "Sin datos",
      usuariosUnicos: 0
    };

    //  Producto más consultado
    if (tieneClicks) {
      const topProd = await db.collection("clicks").aggregate([
        { $match: { titulo: { $exists: true, $ne: "" } } },
        { $group: { _id: "$titulo", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ]).toArray();
      if (topProd[0]) resultado.topProducto = topProd[0]._id;
    }

    //  Supermercado más activo
    if (tieneClicks) {
      const topSuper = await db.collection("clicks").aggregate([
        { $match: { supermercado: { $exists: true, $ne: "" } } },
        { $group: { _id: "$supermercado", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ]).toArray();
      if (topSuper[0]) resultado.topSupermercado = topSuper[0]._id;
    }

    //  Región más activa
    if (tieneClicks) {
      const topRegion = await db.collection("clicks").aggregate([
        { $match: { userRegion: { $exists: true, $ne: "" } } },
        { $group: { _id: "$userRegion", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ]).toArray();
      if (topRegion[0]) resultado.topRegion = topRegion[0]._id;
    }

    //  Término de búsqueda más usado
    if (tieneBusquedas) {
      const topBusqueda = await db.collection("busquedas").aggregate([
        { $match: { termino: { $exists: true, $ne: "" } } },
        { $group: { _id: "$termino", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ]).toArray();
      if (topBusqueda[0]) resultado.topBusqueda = topBusqueda[0]._id;
    }

    //  Usuarios únicos totales (sin distinct → versión Atlas)
    if (tieneClicks) {
      const usuarios = await db.collection("clicks").aggregate([
        { $match: { userCorreo: { $exists: true, $ne: "" } } },
        { $group: { _id: "$userCorreo" } },
        { $count: "total" }
      ]).toArray();
      resultado.usuariosUnicos = usuarios.length ? usuarios[0].total : 0;
    }

    res.json(resultado);
  } catch (error) {
    console.error(" Error en insights:", error);
    res.status(500).json({ error: "Error al generar insights del sistema" });
  }
};
//  Palabras en tendencia (última semana) — Atlas compatible
export const palabrasTendencia = async (req, res) => {
  try {
    const db = getDB();

    //  Calcular rango de la última semana
    const hoy = new Date();
    const hace7 = new Date();
    hace7.setDate(hoy.getDate() - 7);

    //  Confirmar si existe la colección "busquedas"
    const colecciones = await db.listCollections().toArray();
    const tieneBusquedas = colecciones.some(c => c.name === "busquedas");
    if (!tieneBusquedas) return res.json([]);

    //  Agrupar términos más buscados en la última semana
    const data = await db.collection("busquedas").aggregate([
      {
        $match: {
          fecha: { $gte: hace7 },
          termino: { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: { $toLower: "$termino" }, // agrupa términos sin diferenciar mayúsculas
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          termino: "$_id",
          total: 1
        }
      }
    ]).toArray();

    //  Si no hay resultados, devolver array vacío
    res.json(data.length ? data : []);
  } catch (error) {
    console.error(" Error en palabrasTendencia:", error);
    res.status(500).json({ error: "Error al calcular palabras en tendencia" });
  }
};


//  Distribución de usuarios por región (última semana) — Atlas compatible
export const distribucionUsuariosRegion = async (req, res) => {
  try {
    const db = getDB();

    //  Fechas: últimos 7 días
    const hoy = new Date();
    const hace7 = new Date();
    hace7.setDate(hoy.getDate() - 7);

    //  Verificar existencia de colección "clicks"
    const colecciones = await db.listCollections().toArray();
    const tieneClicks = colecciones.some(c => c.name === "clicks");
    if (!tieneClicks) return res.json([]);

    //  Agrupar por región considerando actividad de los últimos 7 días
    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          createdAt: { $gte: hace7 },
          userRegion: { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$userRegion",
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          region: "$_id",
          total: 1
        }
      }
    ]).toArray();

    res.json(data.length ? data : []);
  } catch (error) {
    console.error(" Error en distribucionUsuariosRegion:", error);
    res.status(500).json({ error: "Error al obtener distribución de usuarios por región" });
  }
};

