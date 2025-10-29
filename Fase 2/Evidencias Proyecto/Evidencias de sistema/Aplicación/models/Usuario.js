// Archivo: Aplicación/models/Usuario.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const negocioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  rolTributario: { type: String, required: true },
  giro: { type: String },
  region: { type: String },
  comuna: { type: String },
  sector: { type: String },
});

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  apellido: { type: String, required: true, trim: true },
  rut: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }, 
  fechaNacimiento: { type: String },
  sexo: { type: String },
  region: { type: String },
  comuna: { type: String },
  role: { type: String, enum: ['usuario', 'cliente', 'admin'], default: 'usuario' },
  tieneNegocio: { type: Boolean, default: false },
  negocios: [negocioSchema]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual para calcular la edad
usuarioSchema.virtual('edad').get(function() {
  if (!this.fechaNacimiento) return null;
  const fechaNac = new Date(this.fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  return edad;
});

// Middleware para encriptar la contraseña ANTES de guardarla
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Usuario = mongoose.model('Usuario', usuarioSchema);
export default Usuario;