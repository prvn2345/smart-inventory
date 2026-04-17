const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: String,
    sku: String,
    // Historical sales data used for prediction
    historicalData: [
      {
        date: Date,
        quantity: Number,
      },
    ],
    // Predicted demand for next N days
    predictions: [
      {
        date: Date,
        predictedQuantity: Number,
        confidence: Number, // 0-1
      },
    ],
    recommendedReorder: {
      type: Number,
      default: 0,
    },
    algorithm: {
      type: String,
      enum: ['linear_regression', 'moving_average', 'exponential_smoothing'],
      default: 'linear_regression',
    },
    accuracy: {
      type: Number, // MAPE percentage
      default: 0,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

predictionSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
