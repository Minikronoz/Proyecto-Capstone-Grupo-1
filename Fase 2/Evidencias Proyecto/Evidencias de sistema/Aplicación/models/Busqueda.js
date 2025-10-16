// Archivo: Aplicación/models/Busqueda.js

import mongoose from 'mongoose';

const busquedaSchema = new mongoose.Schema({
  busqueda: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  fechaBusqueda: {
    type: Date,
    default: Date.now
  },
  usuarioInfo: {
    usuarioRut: { type: String },
    nombre: { type: String },
    apellido: { type: String },
    edad: { type: Number },
    sexo: { type: String },
    region: { type: String },
    comuna: { type: String },
    sector: { type: String }
  }
}, {
  timestamps: true
});

const Busqueda = mongoose.model('Busqueda', busquedaSchema);

export default Busqueda;