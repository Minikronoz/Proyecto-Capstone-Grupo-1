// controllers/historico.controller.js
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

/**
 *  Historial de precios por tienda (últimos X días)
 */
export const obtenerHistoricoPorTienda = async (req, res) => {
  try {
    const { store } = req.params;
    const dias = parseInt(req.query.dias) || 7;

    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const db = getDB();

    const historial = await db.collection("priceHistory").aggregate([
      {
        $match: {
          store: store.toLowerCase(),
          date: { $gte: desde },
          variation: { $ne: 0 },
        },
      },

      //  NORMALIZAR productId → ObjectId si corresponde
      {
        $addFields: {
          productIdObj: {
            $cond: [
              { $regexMatch: { input: { $toString: "$productId" }, regex: /^[0-9a-fA-F]{24}$/ } },
              { $toObjectId: "$productId" },
              "$productId"
            ]
          }
        }
      },

      //  JOIN con productos
      {
        $lookup: {
          from: "productos",
          localField: "productIdObj",
          foreignField: "_id",
          as: "producto",
        },
      },
      { $unwind: { path: "$producto", preserveNullAndEmptyArrays: true } },

      { $sort: { date: -1 } },

      //  Formato final limpio
      {
        $project: {
          nombre: { $ifNull: ["$producto.title", "Producto desconocido"] },
          marca: "$producto.brand",
          store: 1,
          price: 1,
          previousPrice: 1,
          variation: 1,
          offerDescription: 1,
          fecha: "$date",
          imagen: "$producto.image",
          link: "$producto.link",
        },
      },
    ]).toArray();

    res.json(historial);
  } catch (err) {
    console.error(" Error al obtener histórico:", err);
    res.status(500).json({ error: "Error al obtener histórico de precios" });
  }
};
