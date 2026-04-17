const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const { emitStockUpdate, emitNotification } = require('../utils/socket');

// @route   GET /api/orders
// @desc    Get all orders with pagination
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product', 'name sku image');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/orders
// @desc    Create order and update stock
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, items, customer, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    // Validate products and calculate totals
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      }

      // Check stock for sales
      if (type === 'sale' && product.stock.current < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock.current}`,
        });
      }

      const unitPrice = type === 'sale' ? product.price.selling : product.price.cost;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      orderItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    // Create order
    const order = await Order.create({
      type,
      items: orderItems,
      totalAmount,
      customer,
      notes,
      status: 'completed',
      processedAt: new Date(),
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    // Update stock for each item
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      const oldStock = product.stock.current;
      let newStock = oldStock;

      if (type === 'sale') newStock = oldStock - item.quantity;
      else if (type === 'purchase') newStock = oldStock + item.quantity;
      else if (type === 'return') newStock = oldStock + item.quantity;

      product.stock.current = Math.max(0, newStock);
      await product.save();

      // Log inventory change
      await InventoryLog.create({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        action: type === 'sale' ? 'stock_out' : 'stock_in',
        quantity: item.quantity,
        previousStock: oldStock,
        newStock: product.stock.current,
        reason: `Order ${order.orderNumber}`,
        reference: order.orderNumber,
        performedBy: req.user._id,
        performedByName: req.user.name,
      });

      emitStockUpdate({ productId: product._id, stock: product.stock, stockStatus: product.stockStatus });

      // Check for low stock after sale
      if (type === 'sale' && product.stockStatus === 'low') {
        const notification = await Notification.create({
          type: product.stock.current === 0 ? 'out_of_stock' : 'low_stock',
          title: `Low Stock: ${product.name}`,
          message: `${product.name} is running low after order ${order.orderNumber}. Current: ${product.stock.current}`,
          severity: product.stock.current === 0 ? 'error' : 'warning',
          product: product._id,
          order: order._id,
        });
        emitNotification(notification);
      }
    }

    // Create order notification
    const orderNotif = await Notification.create({
      type: 'order',
      title: `New ${type} order created`,
      message: `Order ${order.orderNumber} for $${totalAmount.toFixed(2)} has been processed`,
      severity: 'success',
      order: order._id,
    });
    emitNotification(orderNotif);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'completed' ? { processedAt: new Date() } : {}) },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
