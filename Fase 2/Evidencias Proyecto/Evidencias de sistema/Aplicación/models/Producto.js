// models/Producto.js
import mongoose from "mongoose";

const productoSchema = new mongoose.Schema({
  title: { type: String, required: true },    
  brand: { type: String },  
  store: { type: String, required: true },         
  currentPrice: { type: Number, required: true }, //  Precio actual en número
  formattedPrice: { type: String },   //  Precio formateado (con símbolo y formato local)
  priceNormal: { type: String },       //  Precio normal (sin oferta)
  pricePerUnit: { type: String },      //  Precio por kg, lt, unidad, etc.
  categoria: { type: String },         //  Categoría del producto
  image: { type: String },             //  URL de la imagen del producto
  link: { type: String, required: true }, //  URL del producto en el supermercado
  lastUpdate: { type: Date, default: Date.now },  //  Última fecha de actualización
});

export default mongoose.model("Producto", productoSchema);
