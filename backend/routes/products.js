const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const { emitStockUpdate, emitNotification } = require('../utils/socket');

// @route   GET /api/products
// @desc    Get all products with search, filter, pagination
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { isActive: true };

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Stock status filter
    if (status === 'low') {
      query.$expr = { $lte: ['$stock.current', '$stock.minimum'] };
    } else if (status === 'out') {
      query['stock.current'] = 0;
    } else if (status === 'ok') {
      query.$expr = { $gt: ['$stock.current', '$stock.minimum'] };
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/products/categories
// @desc    Get all unique categories
// @access  Private
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ success: true, data: categories.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/products/low-stock
// @desc    Get low stock products
// @access  Private
router.get('/low-stock', protect, async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock.current', '$stock.minimum'] },
    }).sort({ 'stock.current': 1 });

    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/products
// @desc    Create product
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.create(req.body);

    // Log inventory creation
    await InventoryLog.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      action: 'stock_in',
      quantity: product.stock.current,
      previousStock: 0,
      newStock: product.stock.current,
      reason: 'Initial stock',
      performedBy: req.user._id,
      performedByName: req.user.name,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'SKU already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Track changes for update history
    const changes = [];
    const trackFields = ['name', 'price', 'category', 'supplier', 'stock'];

    trackFields.forEach((field) => {
      const oldVal = JSON.stringify(product[field]);
      const newVal = JSON.stringify(req.body[field]);
      if (req.body[field] !== undefined && oldVal !== newVal) {
        changes.push({
          field,
          oldValue: product[field],
          newValue: req.body[field],
          updatedBy: req.user._id,
          updatedByName: req.user.name,
        });
      }
    });

    // Handle stock change logging
    const oldStock = product.stock.current;
    const newStock = req.body.stock?.current;

    if (newStock !== undefined && newStock !== oldStock) {
      const diff = newStock - oldStock;
      await InventoryLog.create({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        action: diff > 0 ? 'stock_in' : 'adjustment',
        quantity: Math.abs(diff),
        previousStock: oldStock,
        newStock,
        reason: req.body.adjustmentReason || 'Manual adjustment',
        performedBy: req.user._id,
        performedByName: req.user.name,
      });
    }

    // Add changes to update history
    if (changes.length > 0) {
      req.body.updateHistory = [...(product.updateHistory || []), ...changes];
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Emit real-time stock update
    emitStockUpdate({ productId: updated._id, stock: updated.stock, stockStatus: updated.stockStatus });

    // Check if now low stock and create notification
    if (updated.stockStatus === 'low' || updated.stockStatus === 'out_of_stock') {
      const notification = await Notification.create({
        type: updated.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'low_stock',
        title: `Stock Alert: ${updated.name}`,
        message: `${updated.name} stock updated to ${updated.stock.current} units`,
        severity: updated.stockStatus === 'out_of_stock' ? 'error' : 'warning',
        product: updated._id,
      });
      emitNotification(notification);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/products/:id/stock
// @desc    Quick stock adjustment
// @access  Private
router.patch('/:id/stock', protect, async (req, res) => {
  try {
    const { action, quantity, reason } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const oldStock = product.stock.current;
    let newStock = oldStock;

    if (action === 'add') newStock = oldStock + parseInt(quantity);
    else if (action === 'subtract') newStock = Math.max(0, oldStock - parseInt(quantity));
    else if (action === 'set') newStock = parseInt(quantity);

    product.stock.current = newStock;
    await product.save();

    await InventoryLog.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      action: action === 'add' ? 'stock_in' : action === 'subtract' ? 'stock_out' : 'adjustment',
      quantity: Math.abs(newStock - oldStock),
      previousStock: oldStock,
      newStock,
      reason: reason || 'Manual stock update',
      performedBy: req.user._id,
      performedByName: req.user.name,
    });

    emitStockUpdate({ productId: product._id, stock: product.stock, stockStatus: product.stockStatus });

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Soft delete product
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/products/:id/logs
// @desc    Get inventory logs for a product
// @access  Private
router.get('/:id/logs', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      InventoryLog.find({ product: req.params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      InventoryLog.countDocuments({ product: req.params.id }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
