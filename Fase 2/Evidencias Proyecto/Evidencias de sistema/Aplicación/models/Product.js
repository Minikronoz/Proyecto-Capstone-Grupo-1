
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  brand: { type: String, trim: true },
  store: { type: String, required: true },
  

  price: { type: Number, required: true }, 
  // 'offerDescription' guardará el texto de la oferta (ej: "2 x $2.000")
  offerDescription: { type: String, default: null }, 
  // 'pricePerUnitNormal' guardará el precio por medida del precio unitario (ej: "$1.590 x kg")
  pricePerUnitNormal: { type: String, default: null },
  // 'pricePerUnitOffer' guardará el precio por medida de la oferta (ej: "$1.000 x kg")
  pricePerUnitOffer: { type: String, default: null },
  image: { type: String },
  link: { type: String, required: true, unique: true },
  lastUpdate: { type: Date }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;