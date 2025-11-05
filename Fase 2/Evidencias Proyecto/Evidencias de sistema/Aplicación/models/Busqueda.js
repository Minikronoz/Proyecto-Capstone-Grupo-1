// models/Busqueda.js
import mongoose from "mongoose";

const BusquedaSchema = new mongoose.Schema({
  usuarioEmail: { type: String, required: true },
  termino: { type: String, required: true },
  palabrasClave: [String],
  fecha: { type: Date, default: Date.now },
});

export default mongoose.model("Busqueda", BusquedaSchema);
