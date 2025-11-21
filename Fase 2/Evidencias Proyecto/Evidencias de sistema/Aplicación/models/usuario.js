// =======================================
//  models/User.js — Modelo Mongoose
// =======================================
import mongoose from "mongoose";

const NegocioSchema = new mongoose.Schema({
  nombre: { type: String, default: null },
  rolTributario: { type: String, default: null },
  giro: { type: String, default: null },
  telefono: { type: String, default: null },
  correo: { type: String, default: null },
  web: { type: String, default: null },
  region: { type: String, default: null },
  comuna: { type: String, default: null },
  sector: { type: String, default: null },
});

const UserSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    apellido: { type: String, default: null },

    rut: { type: String, default: null },
    fechaNacimiento: { type: Date, default: null },
    edad: { type: Number, default: null },

    genero: { type: String, default: null },
    region: { type: String, default: null },
    comuna: { type: String, default: null },
    sector: { type: String, default: null },

    correo: { type: String, required: true, unique: true },
    contraseña: { type: String, required: true },

    role: { type: String, default: "usuario" },

    tieneNegocio: { type: Boolean, default: false },

    negocios: { type: [NegocioSchema], default: [] },

    creadoEn: { type: Date, default: Date.now },
    actualizadoEn: { type: Date, default: null },
  },
  {
    collection: "users", // <- se asegura de apuntar a tu colección existente
  }
);

export default mongoose.model("User", UserSchema);
