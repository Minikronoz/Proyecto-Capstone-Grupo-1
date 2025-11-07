// models/Producto.js
import mongoose from "mongoose";

const productoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  brand: { type: String },
  store: { type: String, required: true },
  currentPrice: { type: Number, required: true },
  formattedPrice: { type: String },
  priceNormal: { type: String },       // 💰 Precio original (tachado)
  pricePerUnit: { type: String },      // ⚖️ Precio por kg, lt, unidad, etc.
  categoria: { type: String },         // 🏷️ Categoría del producto
  image: { type: String },
  link: { type: String, required: true },
  lastUpdate: { type: Date, default: Date.now },
});

export default mongoose.model("Producto", productoSchema);
