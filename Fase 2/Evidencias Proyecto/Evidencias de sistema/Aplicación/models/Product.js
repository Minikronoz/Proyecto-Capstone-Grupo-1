import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  brand: { type: String },
  store: { type: String, required: true },
  currentPrice: { type: Number, required: true },
  formattedPrice: { type: String },
  image: { type: String },
  link: { type: String, required: true, unique: true },
  lastUpdate: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

export default Product;