// ==============================
//  routes/estadisticas.routes.js
// ==============================
import express from "express";
import { getDB } from "../config/db.js";
import { buildMatchFilters } from "../utils/buildMatchFilters.js";

import {
  rankingProductosNuevos,
  indiceCompetitividad,
  cruceGeneroRegion,
  usuariosNuevosRecurrentes,
  productosCrecimiento,
  insights,
  palabrasTendencia,
  distribucionUsuariosRegion,
  obtenerBajasDePrecio,
  obtenerSubidasDePrecio,
  obtenerProductosVolatiles,
} from "../controllers/estadisticas.controller.js";

const router = express.Router();

// ======================================
//  HELPER GENÉRICO PARA AGGREGATE
// ======================================
async function aggregateClicks(pipeline) {
  const db = getDB();
  return db.collection("clicks").aggregate(pipeline).toArray();
}
// ======================================
//  PRODUCTOS MÁS CLICKEADOS
// ======================================
router.get("/productos-mas-clickeados", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: { ...match, titulo: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: { $toUpper: { $trim: { input: "$titulo", chars: " " } } },
          total: { $sum: 1 },
          store: { $first: "$supermercado" } // 🔥 SE AGREGA EL SUPERMERCADO
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /productos-mas-clickeados:", err);
    res.status(500).json({ error: err.message });
  }
});



// ======================================
//  CLICS POR SUPERMERCADO
// ======================================
router.get("/clics-por-supermercado", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: match },

      // 🔥 Normalización de supermercados (para evitar duplicados)
      {
        $addFields: {
          supermercadoNormalizado: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$supermercado", regex: /jumbo/i } }, then: "jumbo" },
                { case: { $regexMatch: { input: "$supermercado", regex: /unimarc/i } }, then: "unimarc" },
                { case: { $regexMatch: { input: "$supermercado", regex: /tottus/i } }, then: "tottus" },
                { case: { $regexMatch: { input: "$supermercado", regex: /a[\s]*cuenta|acuenta/i } }, then: "acuenta" },
                { case: { $regexMatch: { input: "$supermercado", regex: /santa[\s]*isabel|santaisabel/i } }, then: "santaisabel" }
              ],
              default: "otros"
            }
          }
        }
      },

      // 🔥 Agrupar por supermercado normalizado
      {
        $group: {
          _id: "$supermercadoNormalizado",
          total: { $sum: 1 }
        }
      },

      { $sort: { total: -1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /clics-por-supermercado:", err);
    res.status(500).json({ error: err.message });
  }
});



// ======================================
//  CLICS POR DÍA
// ======================================
router.get("/clics-por-dia", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /clics-por-dia:", err);
    res.status(500).json({ error: err.message });
  }
});
// ======================================
// USUARIOS POR EDAD
// ======================================
router.get("/usuarios-por-edad", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: { ...match, userEdad: { $exists: true } } },
      { $group: { _id: "$userEdad", total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /usuarios-por-edad:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
//  USUARIOS POR GÉNERO
// ======================================
router.get("/usuarios-por-genero", async (req, res) => {
  try {
    const db = getDB();
    const colecciones = await db.listCollections().toArray();
    const nombre = colecciones.some(c => c.name === "usuarios")
      ? "usuarios" : "users";

    const data = await db.collection(nombre).aggregate([
      {
        $match: {
          genero: { $exists: true, $ne: "" }
        }
      },
      { $group: { _id: "$genero", total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]).toArray();

    res.json(data.length ? data : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// ======================================
//  USUARIOS POR REGIÓN (Colección users / usuarios)
// ======================================
router.get("/usuarios-por-region", async (req, res) => {
  try {
    const db = getDB();

    // Detectar nombre correcto en Atlas
    const colecciones = await db.listCollections().toArray();
    const nombre = colecciones.some(c => c.name === "usuarios")
      ? "usuarios"
      : "users";

    const match = {};
    if (req.query.genero) match.genero = req.query.genero;
    if (req.query.region) match.region = req.query.region;

    const data = await db.collection(nombre).aggregate([
      {
        $match: {
          ...match,
          region: { $exists: true, $ne: "" }
        }
      },
      { $group: { _id: "$region", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray();

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /usuarios-por-region:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// PRODUCTOS POR TIEMPO (día / mes / año)
// ======================================
router.get("/productos-por-tiempo", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            titulo: "$titulo",
            dia: { $dayOfMonth: "$createdAtDate" },
            mes: { $month: "$createdAtDate" },
            año: { $year: "$createdAtDate" },
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id.año": 1, "_id.mes": 1, "_id.dia": 1 } }
    ]).toArray();

    // Agrupar por día → obtener el top producto del día
    const agrupado = {};
    data.forEach((d) => {
      const fecha = `${d._id.dia}/${d._id.mes}/${d._id.año}`;
      if (!agrupado[fecha]) agrupado[fecha] = [];
      agrupado[fecha].push({ producto: d._id.titulo, total: d.total });
    });

    const topPorDia = Object.entries(agrupado).map(([fecha, productos]) => {
      const top = productos.sort((a, b) => b.total - a.total)[0];
      return { _id: fecha, producto: top.producto, total: top.total };
    });

    res.json(topPorDia);

  } catch (err) {
    console.error("❌ Error en /productos-por-tiempo:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/volatiles", obtenerProductosVolatiles);


// ======================================
//  TENDENCIA SEMANAL (clics por semana ISO)
// ======================================
router.get("/tendencia-semanal", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            año: { $isoWeekYear: "$createdAtDate" },
            semana: { $isoWeek: "$createdAtDate" }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id.año": 1, "_id.semana": 1 } }
    ]).toArray();

    const respuesta = data.map((d) => ({
      _id: `Semana ${d._id.semana}/${d._id.año}`,
      total: d.total
    }));

    res.json(respuesta);

  } catch (err) {
    console.error("❌ Error en /tendencia-semanal:", err);
    res.status(500).json({ error: err.message });
  }
});
// ======================================
// TÉRMINOS DE BÚSQUEDA MÁS USADOS
// ======================================
router.get("/busquedas-top", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("busquedas").aggregate([
      { $match: { ...match, termino: { $exists: true, $ne: "" } } },
      { $group: { _id: "$termino", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /busquedas-top:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
//  BÚSQUEDAS POR DÍA
// ======================================
router.get("/busquedas-por-dia", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("busquedas").aggregate([
      { $match: { ...match, fecha: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /busquedas-por-dia:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
//  BÚSQUEDAS POR REGIÓN
// ======================================
router.get("/busquedas-por-region", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("busquedas").aggregate([
      { $match: { ...match, userRegion: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userRegion", total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /busquedas-por-region:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
//  USUARIOS ACTIVOS POR DÍA
// ======================================
router.get("/usuarios-activos-dia", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      { $match: { ...match, createdAt: { $exists: true } } },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
          usuariosUnicos: { $addToSet: "$userCorreo" }
        }
      },
      { $project: { _id: 1, totalUsuarios: { $size: "$usuariosUnicos" } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /usuarios-activos-dia:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
//  ACTIVIDAD POR HORA DEL DÍA
// ======================================
router.get("/actividad-por-hora", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: { $hour: "$createdAtDate" },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /actividad-por-hora:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
//  TOP PRODUCTOS POR GÉNERO (NORMALIZADO)
// ======================================
router.get("/top-productos-genero", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          titulo: { $exists: true, $ne: "" } // siempre obligamos a tener título
        }
      },

      //  Normalizar género
      {
        $addFields: {
          generoNormalizado: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$userGenero", regex: /masc/i } }, then: "Masculino" },
                { case: { $regexMatch: { input: "$userGenero", regex: /fem/i } }, then: "Femenino" },
                { case: { $regexMatch: { input: "$userGenero", regex: /otro|x|nb/i } }, then: "Otro" }
              ],
              default: "No especificado"
            }
          }
        }
      },

      //  Agrupar por género + producto
      {
        $group: {
          _id: { genero: "$generoNormalizado", producto: "$titulo" },
          total: { $sum: 1 }
        }
      },

      //  Re-agrupar: array de productos por género
      {
        $group: {
          _id: "$_id.genero",
          productos: {
            $push: {
              producto: "$_id.producto",
              total: "$total"
            }
          }
        }
      },

      //  Solo top 5 productos por género
      { $project: { productos: { $slice: ["$productos", 5] } } },

      // 🔽 Ordenar salida (Masculino, Femenino, Otro, No especificado)
      {
        $sort: {
          "_id": 1
        }
      }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /top-productos-genero:", err);
    res.status(500).json({ error: err.message });
  }
});
// ======================================
//  📌 SEGMENTACIÓN DEMOGRÁFICA (INTELIGENTE)
// ======================================
router.get("/segmentacion-productos", async (req, res) => {
  try {
    const db = getDB();
    const clicks = db.collection("clicks");

    // 🧠 Diccionario reutilizado de categorías
    const CATEGORIAS = {
      "Despensa": ["azucar","harina","pasta","fideos","arroz","aceite","sal","pan",
        "porotos","lentejas","arvejas","sopa","galletas","cereal","mayonesa",
        "mermelada","atun","conserva","manteca","pure","salsa","mani","avena"
      ],
      "Lácteos": ["leche","queso","yogurt","crema","mantequilla","margarina","manjar"],
      "Carnes": ["pollo","trutro","pechuga","carne","pescado","cerdo","hamburguesa"],
      "Bebidas": ["bebida","agua","jugo","coca","cola","te","cafe","cerveza","vino"],
      "Hogar": ["detergente","jabon","shampoo","papel","higienico","lavaloza","cloro"],
    };

    function detectarCategoria(nombre = "") {
      const clean = nombre
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      for (const [cat, palabras] of Object.entries(CATEGORIAS)) {
        if (palabras.some(p => clean.includes(p))) return cat;
      }
      return "Sin categoría";
    }

    const data = await clicks.aggregate([
      // ➕ Convertir idProducto a ObjectId si es necesario
      {
        $addFields: {
          idProdObj: {
            $cond: {
              if: { $eq: [{ $type: "$idProducto" }, "string"] },
              then: { $toObjectId: "$idProducto" },
              else: "$idProducto"
            }
          }
        }
      },

      // 🔗 Unir con la información del producto real
      {
        $lookup: {
          from: "productos",
          localField: "idProdObj",
          foreignField: "_id",
          as: "productoInfo"
        }
      },
      { $unwind: "$productoInfo" },

      // 🧮 Preparar campos (aquí no inferimos aún)
      {
        $project: {
          userGenero: 1,
          userEdad: 1,
          userComuna: 1,
          nombre: "$productoInfo.title"
        }
      }
    ]).toArray();

    // 🧠 INFERIR CATEGORÍA EN JS (100% control)
    const resultado = data.map(item => {
      return {
        comuna: item.userComuna ?? "No especificada",
        genero: item.userGenero ?? "No especificado",
        edad: item.userEdad ?? null,
        categoria: detectarCategoria(item.nombre),
      };
    });

    // 📊 Agrupar y contar
    const agrupado = {};
    resultado.forEach(r => {
      const key = `${r.comuna}|${r.genero}|${r.edad}|${r.categoria}`;
      if (!agrupado[key]) agrupado[key] = { ...r, totalClicks: 0 };
      agrupado[key].totalClicks++;
    });

    res.json({ ok: true, data: Object.values(agrupado) });

  } catch (err) {
    console.error("❌ Error en segmentación:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ======================================
//  TOP SUPERMERCADOS POR REGIÓN
// ======================================
router.get("/top-supermercados-region", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          userRegion: { $exists: true, $ne: "" },
          supermercado: { $exists: true, $ne: "" }
        }
      },
      { $group: { _id: { region: "$userRegion", supermercado: "$supermercado" }, total: { $sum: 1 } } },
      { $sort: { "_id.region": 1, total: -1 } },
      {
        $group: {
          _id: "$_id.region",
          topSupermercado: { $first: "$_id.supermercado" },
          total: { $first: "$total" }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /top-supermercados-region:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
//  EXPORTACIÓN DE RUTAS — CONTROLADORES EXTERNOS
// ======================================

//  Productos con mayor crecimiento
router.get("/productos-crecimiento", productosCrecimiento);

//  Palabras en tendencia (Machine Learning básico)
router.get("/palabras-tendencia", palabrasTendencia);

//  Ranking de productos nuevos (últimos 30 días)
router.get("/ranking-productos-nuevos", rankingProductosNuevos);

//  Índice de competitividad de precios
router.get("/indice-competitividad", indiceCompetitividad);

//  Cruce de género vs región
router.get("/cruce-genero-region", cruceGeneroRegion);

//  Usuarios nuevos vs recurrentes
router.get("/usuarios-nuevos-recurrentes", usuariosNuevosRecurrentes);

//  Insights del sistema
router.get("/insights", insights);

//  Distribución de usuarios por región
router.get("/distribucion-usuarios-region", distribucionUsuariosRegion);

//  Productos con baja de precio
router.get("/bajas", obtenerBajasDePrecio);

router.get("/subidas", obtenerSubidasDePrecio);


export default router;
