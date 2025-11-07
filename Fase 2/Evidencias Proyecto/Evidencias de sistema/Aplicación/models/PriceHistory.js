// models/PriceHistory.js
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

export const PriceHistory = {
  async insertOne(data) {
    const db = getDB();
    const fecha = data.date ? new Date(data.date) : new Date();
    const day = fecha.toISOString().split("T")[0];
    const uniqueHash = `${data.productId}-${day}`;

    const record = {
      productId: new ObjectId(data.productId),
      store: data.store?.toLowerCase().trim() || "desconocido",
      price: Number(data.price) || 0,
      previousPrice: data.previousPrice ?? null,
      offerDescription: data.offerDescription || null,
      date: fecha,
      variation: Number(data.variation || 0),
      uniqueHash,
    };

    const col = db.collection("pricehistory");
    const existente = await col.findOne({ uniqueHash });
    if (existente) return existente;

    await col.insertOne(record);
    return record;
  },

  async findByProduct(productId, limit = 30) {
    const db = getDB();
    return db
      .collection("pricehistory")
      .find({ productId: new ObjectId(productId) })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
  },

  async findLatestByStore(store) {
    const db = getDB();
    return db
      .collection("pricehistory")
      .find({ store: store.toLowerCase() })
      .sort({ date: -1 })
      .limit(1)
      .toArray();
  },

  async promedioVariacionPorTienda() {
    const db = getDB();
    return db
      .collection("pricehistory")
      .aggregate([
        { $group: { _id: "$store", variacionPromedio: { $avg: "$variation" }, total: { $sum: 1 } } },
        { $sort: { variacionPromedio: -1 } },
      ])
      .toArray();
  },

  async limpiarAntiguos(dias = 90) {
    const db = getDB();
    const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const res = await db.collection("pricehistory").deleteMany({ date: { $lt: limite } });
    return res.deletedCount;
  },
};
