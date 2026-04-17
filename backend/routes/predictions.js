const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Product = require('../models/Product');
const RetailRecord = require('../models/RetailRecord');
const { protect } = require('../middleware/auth');
const {
  linearRegressionPrediction,
  movingAveragePrediction,
  exponentialSmoothingPrediction,
} = require('../utils/prediction');

// @route   POST /api/predictions/generate/:productId
// @desc    Generate demand prediction for a product
// @access  Private
router.post('/generate/:productId', protect, async (req, res) => {
  try {
    const { algorithm = 'linear_regression', daysAhead = 30 } = req.body;
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get historical sales data from RetailRecord (last 90 days)
    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();
    const ninetyDaysAgo = new Date(latestDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const salesData = await RetailRecord.aggregate([
      {
        $match: {
          productId: product.productId,
          date: { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          quantity: { $sum: '$unitsSold' },
          demandForecast: { $avg: '$demandForecast' },
          date: { $first: '$date' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Use actual retail data
    let historicalData = salesData.map((d) => ({ date: d.date, quantity: d.quantity }));

    if (historicalData.length < 7) {
      // Fallback: use synthetic data if not enough history
      const baseQty = Math.max(1, Math.floor(product.stock.current / 10));
      historicalData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(latestDate.getTime() - (30 - i) * 24 * 60 * 60 * 1000),
        quantity: Math.max(0, baseQty + Math.floor(Math.random() * baseQty * 0.5 - baseQty * 0.25)),
      }));
    }

    // Run prediction algorithm
    let result;
    if (algorithm === 'moving_average') {
      result = movingAveragePrediction(historicalData, parseInt(daysAhead));
    } else if (algorithm === 'exponential_smoothing') {
      result = exponentialSmoothingPrediction(historicalData, parseInt(daysAhead));
    } else {
      result = linearRegressionPrediction(historicalData, parseInt(daysAhead));
    }

    // Save prediction
    const prediction = await Prediction.findOneAndUpdate(
      { product: product._id },
      {
        product: product._id,
        productName: product.name,
        sku: product.sku,
        historicalData,
        predictions: result.predictions,
        recommendedReorder: result.recommendedReorder,
        algorithm: result.algorithm,
        accuracy: result.accuracy,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/predictions
// @desc    Get all predictions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const predictions = await Prediction.find()
      .populate('product', 'name sku stock category')
      .sort({ generatedAt: -1 });
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/predictions/:productId
// @desc    Get prediction for a product
// @access  Private
router.get('/:productId', protect, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({ product: req.params.productId }).populate(
      'product',
      'name sku stock category'
    );
    if (!prediction) {
      return res.status(404).json({ success: false, message: 'No prediction found for this product' });
    }
    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
