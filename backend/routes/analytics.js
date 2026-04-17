const express = require('express');
const router = express.Router();
const RetailRecord = require('../models/RetailRecord');
const Product = require('../models/Product');
const Order = require('../models/Order');
const InventoryLog = require('../models/InventoryLog');
const { protect } = require('../middleware/auth');

// @route   GET /api/analytics/dashboard
// @desc    Dashboard KPI summary
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Latest date in dataset
    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();

    const [
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalOrders,
      recentLogs,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock.current', '$stock.minimum'] } }),
      Product.countDocuments({ isActive: true, 'stock.current': 0 }),
      Order.countDocuments({ status: 'completed' }),
      InventoryLog.find().sort({ createdAt: -1 }).limit(10),
    ]);

    // Total units sold from RetailRecord (last 30 days of dataset)
    const thirtyDaysBeforeLatest = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const salesAgg = await RetailRecord.aggregate([
      { $match: { date: { $gte: thirtyDaysBeforeLatest } } },
      {
        $group: {
          _id: null,
          totalUnitsSold: { $sum: '$unitsSold' },
          totalRevenue: { $sum: { $multiply: ['$unitsSold', { $multiply: ['$price', { $subtract: [1, { $divide: ['$discount', 100] }] }] }] } },
          totalOrdered: { $sum: '$unitsOrdered' },
          avgDemandForecast: { $avg: '$demandForecast' },
        },
      },
    ]);

    // Inventory value
    const inventoryValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$stock.current', '$price'] } } } },
    ]);

    // Today's orders (from Order collection)
    const todaySales = await Order.aggregate([
      { $match: { type: 'sale', status: 'completed', createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalOrders,
        inventoryValue: inventoryValue[0]?.total || 0,
        monthSales: todaySales[0] || { total: 0, count: 0 },
        retailStats: salesAgg[0] || { totalUnitsSold: 0, totalRevenue: 0, totalOrdered: 0, avgDemandForecast: 0 },
        recentActivity: recentLogs,
        latestDataDate: latestDate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/sales
// @desc    Sales trend from RetailRecord
// @access  Private
router.get('/sales', protect, async (req, res) => {
  try {
    const { period = 'daily', storeId, category } = req.query;

    const match = {};
    if (storeId && storeId !== 'all') match.storeId = storeId;
    if (category && category !== 'all') match.category = category;

    let groupBy;
    if (period === 'daily') {
      // Last 60 days
      const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
      const latestDate = latestRecord?.date || new Date();
      match.date = { $gte: new Date(latestDate.getTime() - 60 * 24 * 60 * 60 * 1000) };
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' } };
    } else if (period === 'weekly') {
      const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
      const latestDate = latestRecord?.date || new Date();
      match.date = { $gte: new Date(latestDate.getTime() - 90 * 24 * 60 * 60 * 1000) };
      groupBy = { year: { $year: '$date' }, week: { $week: '$date' } };
    } else {
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' } };
    }

    const salesData = await RetailRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupBy,
          unitsSold: { $sum: '$unitsSold' },
          unitsOrdered: { $sum: '$unitsOrdered' },
          revenue: {
            $sum: {
              $multiply: [
                '$unitsSold',
                { $multiply: ['$price', { $subtract: [1, { $divide: ['$discount', 100] }] }] },
              ],
            },
          },
          avgDemandForecast: { $avg: '$demandForecast' },
          records: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);

    res.json({ success: true, data: salesData, period });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/inventory-distribution
// @desc    Inventory by category
// @access  Private
router.get('/inventory-distribution', protect, async (req, res) => {
  try {
    const distribution = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock.current' },
          totalValue: { $sum: { $multiply: ['$stock.current', '$price'] } },
          avgPrice: { $avg: '$price' },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);
    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/inventory-trends
// @desc    Inventory level trends over time from RetailRecord
// @access  Private
router.get('/inventory-trends', protect, async (req, res) => {
  try {
    const { productId, storeId } = req.query;

    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();
    const ninetyDaysAgo = new Date(latestDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const match = { date: { $gte: ninetyDaysAgo } };
    if (productId && productId !== 'all') match.productId = productId;
    if (storeId && storeId !== 'all') match.storeId = storeId;

    const trends = await RetailRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          avgInventory: { $avg: '$inventoryLevel' },
          totalSold: { $sum: '$unitsSold' },
          totalOrdered: { $sum: '$unitsOrdered' },
          date: { $first: '$date' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/top-products
// @desc    Top products by units sold
// @access  Private
router.get('/top-products', protect, async (req, res) => {
  try {
    const { limit = 10, storeId } = req.query;

    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();
    const thirtyDaysAgo = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const match = { date: { $gte: thirtyDaysAgo } };
    if (storeId && storeId !== 'all') match.storeId = storeId;

    const topProducts = await RetailRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$productId' },
          category: { $first: '$category' },
          totalUnitsSold: { $sum: '$unitsSold' },
          totalRevenue: {
            $sum: {
              $multiply: [
                '$unitsSold',
                { $multiply: ['$price', { $subtract: [1, { $divide: ['$discount', 100] }] }] },
              ],
            },
          },
          avgInventory: { $avg: '$inventoryLevel' },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'productId',
          as: 'productInfo',
        },
      },
      {
        $addFields: {
          productName: { $ifNull: [{ $arrayElemAt: ['$productInfo.name', 0] }, '$_id'] },
        },
      },
    ]);

    res.json({ success: true, data: topProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/stock-status
// @desc    Stock status counts
// @access  Private
router.get('/stock-status', protect, async (req, res) => {
  try {
    const [ok, low, out] = await Promise.all([
      Product.countDocuments({ isActive: true, $expr: { $gt: ['$stock.current', '$stock.minimum'] } }),
      Product.countDocuments({
        isActive: true,
        $expr: { $and: [{ $lte: ['$stock.current', '$stock.minimum'] }, { $gt: ['$stock.current', 0] }] },
      }),
      Product.countDocuments({ isActive: true, 'stock.current': 0 }),
    ]);
    res.json({ success: true, data: { ok, low, out_of_stock: out } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/by-store
// @desc    Sales breakdown by store
// @access  Private
router.get('/by-store', protect, async (req, res) => {
  try {
    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();
    const thirtyDaysAgo = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const storeData = await RetailRecord.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$storeId',
          totalUnitsSold: { $sum: '$unitsSold' },
          totalRevenue: {
            $sum: {
              $multiply: [
                '$unitsSold',
                { $multiply: ['$price', { $subtract: [1, { $divide: ['$discount', 100] }] }] },
              ],
            },
          },
          avgInventory: { $avg: '$inventoryLevel' },
          totalOrdered: { $sum: '$unitsOrdered' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    res.json({ success: true, data: storeData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/by-region
// @desc    Sales breakdown by region
// @access  Private
router.get('/by-region', protect, async (req, res) => {
  try {
    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();
    const thirtyDaysAgo = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const regionData = await RetailRecord.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$region',
          totalUnitsSold: { $sum: '$unitsSold' },
          totalRevenue: {
            $sum: {
              $multiply: [
                '$unitsSold',
                { $multiply: ['$price', { $subtract: [1, { $divide: ['$discount', 100] }] }] },
              ],
            },
          },
          avgInventory: { $avg: '$inventoryLevel' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    res.json({ success: true, data: regionData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/seasonal
// @desc    Sales by season and weather
// @access  Private
router.get('/seasonal', protect, async (req, res) => {
  try {
    const [seasonData, weatherData, holidayData] = await Promise.all([
      RetailRecord.aggregate([
        { $group: { _id: '$seasonality', totalSold: { $sum: '$unitsSold' }, avgForecast: { $avg: '$demandForecast' }, count: { $sum: 1 } } },
        { $sort: { totalSold: -1 } },
      ]),
      RetailRecord.aggregate([
        { $group: { _id: '$weatherCondition', totalSold: { $sum: '$unitsSold' }, avgForecast: { $avg: '$demandForecast' } } },
        { $sort: { totalSold: -1 } },
      ]),
      RetailRecord.aggregate([
        { $group: { _id: '$holidayPromotion', totalSold: { $sum: '$unitsSold' }, avgForecast: { $avg: '$demandForecast' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ success: true, data: { seasonData, weatherData, holidayData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/demand-vs-actual
// @desc    Demand forecast vs actual sales comparison
// @access  Private
router.get('/demand-vs-actual', protect, async (req, res) => {
  try {
    const { productId, storeId } = req.query;

    const latestRecord = await RetailRecord.findOne().sort({ date: -1 }).select('date');
    const latestDate = latestRecord?.date || new Date();
    const ninetyDaysAgo = new Date(latestDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const match = { date: { $gte: ninetyDaysAgo } };
    if (productId && productId !== 'all') match.productId = productId;
    if (storeId && storeId !== 'all') match.storeId = storeId;

    const data = await RetailRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          actualSold: { $sum: '$unitsSold' },
          demandForecast: { $avg: '$demandForecast' },
          date: { $first: '$date' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
