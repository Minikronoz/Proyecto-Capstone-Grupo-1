// controllers/historico.controller.js
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

/**
 * 📊 Devuelve el historial reciente de precios por tienda.
 * Muestra las variaciones de los últimos 7 días (ajustable con ?dias=)
 */
export const obtenerHistoricoPorTienda = async (req, res) => {
  try {
    const { store } = req.params;
    const dias = parseInt(req.query.dias) || 7;

    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const db = getDB();

    // 🔹 Une historial con los datos de producto
    const historial = await db.collection("priceHistory").aggregate([
      {
        $match: {
          store: store.toLowerCase(),
          date: { $gte: desde },
          variation: { $ne: 0 },
        },
      },
      {
        $lookup: {
          from: "productos",
          localField: "productId",
          foreignField: "_id",
          as: "producto",
        },
      },
      { $unwind: { path: "$producto", preserveNullAndEmptyArrays: true } },
      { $sort: { date: -1 } },
      {
        $project: {
          nombre: { $ifNull: ["$producto.title", "Producto desconocido"] },
          marca: "$producto.brand",
          store: "$store",
          price: "$price",
          previousPrice: "$previousPrice",
          variation: "$variation",
          offerDescription: "$offerDescription",
          fecha: "$date",
          imagen: "$producto.image",
          link: "$producto.link",
        },
      },
    ]).toArray();

    res.json(historial);
  } catch (err) {
    console.error("❌ Error al obtener histórico:", err);
    res.status(500).json({ error: "Error al obtener histórico de precios" });
  }
};
