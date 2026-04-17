const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Groceries', 'Toys', 'Electronics', 'Furniture', 'Clothing'],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    competitorPricing: {
      type: Number,
      default: 0,
    },
    stock: {
      current: { type: Number, default: 0, min: 0 },
      minimum: { type: Number, default: 50 },
      maximum: { type: Number, default: 500 },
      reorderPoint: { type: Number, default: 100 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    unit: { type: String, default: 'pcs' },
    updateHistory: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedByName: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.stock.current === 0) return 'out_of_stock';
  if (this.stock.current <= this.stock.minimum) return 'low';
  if (this.stock.current <= this.stock.reorderPoint) return 'reorder';
  return 'ok';
});

// Virtual: effective price after discount
productSchema.virtual('effectivePrice').get(function () {
  return parseFloat((this.price * (1 - this.discount / 100)).toFixed(2));
});

// Virtual: profit margin vs competitor
productSchema.virtual('priceVsCompetitor').get(function () {
  if (!this.competitorPricing) return 0;
  return parseFloat(((this.price - this.competitorPricing) / this.competitorPricing * 100).toFixed(2));
});

productSchema.index({ category: 1 });
productSchema.index({ 'stock.current': 1 });
productSchema.index({ name: 'text', productId: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
