const mongoose = require('mongoose');

/**
 * RetailRecord stores the daily retail dataset rows.
 * Each row = one product × one store × one date.
 */
const retailRecordSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    storeId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    category: { type: String, required: true, index: true },
    region: { type: String, required: true, index: true },
    inventoryLevel: { type: Number, default: 0 },
    unitsSold: { type: Number, default: 0 },
    unitsOrdered: { type: Number, default: 0 },
    demandForecast: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    weatherCondition: { type: String, default: '' },
    holidayPromotion: { type: Boolean, default: false },
    competitorPricing: { type: Number, default: 0 },
    seasonality: { type: String, default: '' },
  },
  { timestamps: false }
);

// Compound index for fast queries
retailRecordSchema.index({ date: -1, storeId: 1, productId: 1 });
retailRecordSchema.index({ productId: 1, date: -1 });
retailRecordSchema.index({ storeId: 1, date: -1 });
retailRecordSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('RetailRecord', retailRecordSchema);
