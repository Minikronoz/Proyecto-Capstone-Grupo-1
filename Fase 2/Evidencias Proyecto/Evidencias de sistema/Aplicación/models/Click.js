import mongoose from "mongoose";

const ClickSchema = new mongoose.Schema(
  {
    // Información del producto clickeado
    title: { type: String, required: true },
    store: { type: String, required: true },
    currentPrice: { type: String },
    formattedPrice: { type: String },
    image: { type: String },
    link: { type: String },

    // Información del usuario que hizo el clic
    usuarioInfo: {
      usuarioRut: { type: String },
      nombre: { type: String },
      apellido: { type: String },
      edad: { type: Number },
      sexo: { type: String },
      region: { type: String },
      comuna: { type: String },
      sector: { type: String },
    },

    // Fecha del clic
    fechaClick: { type: Date, default: Date.now },
  },
  { collection: "clicks" }
);

export default mongoose.model("Click", ClickSchema);
