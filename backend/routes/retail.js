const express = require('express');
const router = express.Router();
const RetailRecord = require('../models/RetailRecord');
const { protect } = require('../middleware/auth');

// @route   GET /api/retail/records
// @desc    Get retail records with filters
// @access  Private
router.get('/records', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, storeId, productId, category, startDate, endDate } = req.query;
    const query = {};

    if (storeId && storeId !== 'all') query.storeId = storeId;
    if (productId && productId !== 'all') query.productId = productId;
    if (category && category !== 'all') query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      RetailRecord.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
      RetailRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/retail/stores
// @desc    Get all store IDs
// @access  Private
router.get('/stores', protect, async (req, res) => {
  try {
    const stores = await RetailRecord.distinct('storeId');
    res.json({ success: true, data: stores.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/retail/regions
// @desc    Get all regions
// @access  Private
router.get('/regions', protect, async (req, res) => {
  try {
    const regions = await RetailRecord.distinct('region');
    res.json({ success: true, data: regions.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/retail/product-history/:productId
// @desc    Get full history for a product across all stores
// @access  Private
router.get('/product-history/:productId', protect, async (req, res) => {
  try {
    const { storeId, days = 90 } = req.query;
    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();
    const startDate = new Date(latestDate.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);

    const match = {
      productId: req.params.productId,
      date: { $gte: startDate },
    };
    if (storeId && storeId !== 'all') match.storeId = storeId;

    const records = await RetailRecord.find(match).sort({ date: 1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
