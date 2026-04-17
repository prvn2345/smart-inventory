const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const Order = require('../models/Order');
const InventoryLog = require('../models/InventoryLog');
const { protect } = require('../middleware/auth');

// @route   GET /api/reports/inventory/pdf
// @desc    Export inventory report as PDF
// @access  Private
router.get('/inventory/pdf', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#1e40af').text('Smart Inventory Management', { align: 'center' });
    doc.fontSize(14).fillColor('#374151').text('Inventory Report', { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary
    const lowStock = products.filter((p) => p.stock.current <= p.stock.minimum).length;
    const outOfStock = products.filter((p) => p.stock.current === 0).length;
    const totalValue = products.reduce((sum, p) => sum + p.stock.current * p.price.cost, 0);

    doc.fontSize(12).fillColor('#111827').text('Summary', { underline: true });
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Total Products: ${products.length}`);
    doc.text(`Low Stock: ${lowStock}`);
    doc.text(`Out of Stock: ${outOfStock}`);
    doc.text(`Total Inventory Value: ₹${totalValue.toFixed(2)}`);
    doc.moveDown(1);

    // Table header
    const tableTop = doc.y;
    const cols = { name: 40, sku: 200, category: 290, stock: 370, min: 420, price: 470 };

    doc.fontSize(9).fillColor('#1e40af');
    doc.text('Product Name', cols.name, tableTop, { width: 155 });
    doc.text('SKU', cols.sku, tableTop, { width: 85 });
    doc.text('Category', cols.category, tableTop, { width: 75 });
    doc.text('Stock', cols.stock, tableTop, { width: 45 });
    doc.text('Min', cols.min, tableTop, { width: 45 });
    doc.text('Value', cols.price, tableTop, { width: 70 });

    doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke('#e5e7eb');
    doc.moveDown(0.5);

    // Table rows
    products.forEach((product, i) => {
      if (doc.y > 720) {
        doc.addPage();
        doc.y = 40;
      }

      const y = doc.y;
      const isLow = product.stock.current <= product.stock.minimum;
      const textColor = isLow ? '#ef4444' : '#374151';

      doc.fontSize(8).fillColor(i % 2 === 0 ? '#f9fafb' : '#ffffff');
      doc.rect(40, y - 2, 515, 16).fill();

      doc.fillColor(textColor);
      doc.text(product.name.substring(0, 28), cols.name, y, { width: 155 });
      doc.text(product.sku, cols.sku, y, { width: 85 });
      doc.text(product.category, cols.category, y, { width: 75 });
      doc.text(String(product.stock.current), cols.stock, y, { width: 45 });
      doc.text(String(product.stock.minimum), cols.min, y, { width: 45 });
      doc.text(`₹${(product.stock.current * product.price.cost).toFixed(2)}`, cols.price, y, { width: 70 });

      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/inventory/excel
// @desc    Export inventory as Excel
// @access  Private
router.get('/inventory/excel', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });

    const data = products.map((p) => ({
      Name: p.name,
      SKU: p.sku,
      Barcode: p.barcode,
      Category: p.category,
      'Current Stock': p.stock.current,
      'Min Stock': p.stock.minimum,
      'Max Stock': p.stock.maximum,
      Unit: p.unit,
      'Cost Price': p.price.cost,
      'Selling Price': p.price.selling,
      'Stock Value': `₹${(p.stock.current * p.price.cost).toFixed(2)}`,
      Status: p.stock.current === 0 ? 'Out of Stock' : p.stock.current <= p.stock.minimum ? 'Low Stock' : 'OK',
      'Supplier Name': p.supplier?.name || '',
      'Last Updated': p.updatedAt.toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/sales/pdf
// @desc    Export sales report as PDF
// @access  Private
router.get('/sales/pdf', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { type: 'sale', status: 'completed' };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(100);
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1e40af').text('Smart Inventory Management', { align: 'center' });
    doc.fontSize(14).fillColor('#374151').text('Sales Report', { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(12).fillColor('#111827').text('Summary', { underline: true });
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Total Orders: ${orders.length}`);
    doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
    doc.moveDown(1);

    // Orders table
    const cols = { num: 40, date: 130, customer: 230, items: 360, total: 460 };
    doc.fontSize(9).fillColor('#1e40af');
    doc.text('Order #', cols.num, doc.y, { width: 85 });
    doc.text('Date', cols.date, doc.y, { width: 95 });
    doc.text('Customer', cols.customer, doc.y, { width: 125 });
    doc.text('Items', cols.items, doc.y, { width: 95 });
    doc.text('Total', cols.total, doc.y, { width: 90 });
    doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke('#e5e7eb');
    doc.moveDown(0.5);

    orders.forEach((order, i) => {
      if (doc.y > 720) { doc.addPage(); doc.y = 40; }
      const y = doc.y;
      doc.fontSize(8).fillColor(i % 2 === 0 ? '#f9fafb' : '#ffffff').rect(40, y - 2, 515, 16).fill();
      doc.fillColor('#374151');
      doc.text(order.orderNumber, cols.num, y, { width: 85 });
      doc.text(new Date(order.createdAt).toLocaleDateString(), cols.date, y, { width: 95 });
      doc.text(order.customer?.name || 'Walk-in', cols.customer, y, { width: 125 });
      doc.text(String(order.items.length), cols.items, y, { width: 95 });
      doc.text(`₹${order.totalAmount.toFixed(2)}`, cols.total, y, { width: 90 });
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
