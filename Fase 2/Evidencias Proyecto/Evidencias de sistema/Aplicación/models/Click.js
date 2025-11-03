// models/Click.js
import mongoose from "mongoose";

const clickSchema = new mongoose.Schema({
  idProducto: { type: String, required: true },
  titulo: { type: String, required: true },
  marca: { type: String },
  precio: { type: Number },
  supermercado: { type: String },
  link: { type: String },
  imagen: { type: String },
  usuario: { type: String }, // correo o id del usuario
  fecha: { type: Date, default: Date.now },
});

export default mongoose.model("Click", clickSchema);
