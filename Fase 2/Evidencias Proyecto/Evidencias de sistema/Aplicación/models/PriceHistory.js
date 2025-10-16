import mongoose from 'mongoose';

const priceHistorySchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);

export default PriceHistory;