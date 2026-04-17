const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const User = require('../models/User');
const Product = require('../models/Product');
const RetailRecord = require('../models/RetailRecord');
const Order = require('../models/Order');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const Prediction = require('../models/Prediction');

// Protect with a secret key so only you can trigger it
const SEED_SECRET = process.env.SEED_SECRET || 'seed_smart_inventory_2024';

const PRODUCT_META = {
  P0001: { name: 'Premium Grocery Bundle', description: 'Assorted premium grocery items' },
  P0002: { name: 'Classic Toy Set', description: 'Classic educational toy collection' },
  P0003: { name: 'Smart Electronics Kit', description: 'Consumer electronics starter kit' },
  P0004: { name: 'Home Furniture Pack', description: 'Essential home furniture set' },
  P0005: { name: 'Fashion Clothing Line', description: 'Seasonal fashion clothing collection' },
  P0006: { name: 'Organic Food Selection', description: 'Organic and natural food products' },
  P0007: { name: 'Kids Adventure Toys', description: 'Adventure and outdoor toys for kids' },
  P0008: { name: 'Digital Gadgets Pro', description: 'Professional digital gadgets' },
  P0009: { name: 'Living Room Essentials', description: 'Complete living room furniture set' },
  P0010: { name: 'Casual Wear Collection', description: 'Everyday casual clothing' },
  P0011: { name: 'Fresh Produce Box', description: 'Fresh daily produce and vegetables' },
  P0012: { name: 'STEM Learning Toys', description: 'Science and technology learning toys' },
  P0013: { name: 'Smart Home Devices', description: 'Connected smart home electronics' },
  P0014: { name: 'Office Furniture Set', description: 'Ergonomic office furniture' },
  P0015: { name: 'Sports Apparel Range', description: 'Performance sports clothing' },
  P0016: { name: 'Pantry Staples Pack', description: 'Essential pantry and kitchen staples' },
  P0017: { name: 'Board Games Collection', description: 'Family board games and puzzles' },
  P0018: { name: 'Audio Visual Equipment', description: 'High-quality audio and visual devices' },
  P0019: { name: 'Bedroom Furniture Suite', description: 'Complete bedroom furniture package' },
  P0020: { name: 'Designer Clothing Bundle', description: 'Premium designer clothing selection' },
};

// Inline retail data (sample — 100 rows covering all 20 products)
const SAMPLE_DATA = [
  { date:'2024-01-01', storeId:'S001', productId:'P0001', category:'Groceries', region:'North', inventoryLevel:223, unitsSold:40, unitsOrdered:93, demandForecast:52.3, price:33.5, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:29.69, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0002', category:'Toys', region:'South', inventoryLevel:204, unitsSold:99, unitsOrdered:73, demandForecast:110.5, price:63.01, discount:20, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:66.16, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0003', category:'Electronics', region:'East', inventoryLevel:69, unitsSold:64, unitsOrdered:191, demandForecast:74.02, price:27.99, discount:10, weatherCondition:'Sunny', holidayPromotion:true, competitorPricing:31.32, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0004', category:'Furniture', region:'West', inventoryLevel:338, unitsSold:182, unitsOrdered:152, demandForecast:190.5, price:32.72, discount:10, weatherCondition:'Cloudy', holidayPromotion:true, competitorPricing:34.74, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0005', category:'Clothing', region:'North', inventoryLevel:471, unitsSold:272, unitsOrdered:167, demandForecast:280.0, price:45.0, discount:15, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:42.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0006', category:'Groceries', region:'North', inventoryLevel:305, unitsSold:87, unitsOrdered:114, demandForecast:95.0, price:22.5, discount:5, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:20.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0007', category:'Toys', region:'East', inventoryLevel:256, unitsSold:9, unitsOrdered:184, demandForecast:25.0, price:55.0, discount:20, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:52.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0008', category:'Electronics', region:'East', inventoryLevel:315, unitsSold:233, unitsOrdered:108, demandForecast:240.0, price:89.99, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:85.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0009', category:'Furniture', region:'South', inventoryLevel:167, unitsSold:22, unitsOrdered:188, demandForecast:30.0, price:120.0, discount:5, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:115.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0010', category:'Clothing', region:'West', inventoryLevel:167, unitsSold:70, unitsOrdered:107, demandForecast:80.0, price:35.0, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:33.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0011', category:'Groceries', region:'West', inventoryLevel:449, unitsSold:15, unitsOrdered:118, demandForecast:20.0, price:18.0, discount:0, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:17.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0012', category:'Electronics', region:'East', inventoryLevel:213, unitsSold:51, unitsOrdered:175, demandForecast:60.0, price:75.0, discount:15, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:72.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0013', category:'Groceries', region:'North', inventoryLevel:356, unitsSold:220, unitsOrdered:28, demandForecast:230.0, price:12.5, discount:5, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:11.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0014', category:'Furniture', region:'South', inventoryLevel:293, unitsSold:232, unitsOrdered:180, demandForecast:240.0, price:95.0, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:90.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0015', category:'Electronics', region:'East', inventoryLevel:356, unitsSold:257, unitsOrdered:60, demandForecast:265.0, price:65.0, discount:20, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:62.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0016', category:'Electronics', region:'East', inventoryLevel:74, unitsSold:13, unitsOrdered:189, demandForecast:20.0, price:110.0, discount:5, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:105.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0017', category:'Toys', region:'East', inventoryLevel:282, unitsSold:186, unitsOrdered:61, demandForecast:195.0, price:42.0, discount:10, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:40.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0018', category:'Electronics', region:'East', inventoryLevel:191, unitsSold:29, unitsOrdered:95, demandForecast:35.0, price:85.0, discount:0, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:82.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0019', category:'Clothing', region:'West', inventoryLevel:149, unitsSold:145, unitsOrdered:85, demandForecast:150.0, price:55.0, discount:15, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:52.0, seasonality:'Winter' },
  { date:'2024-01-01', storeId:'S001', productId:'P0020', category:'Electronics', region:'South', inventoryLevel:242, unitsSold:52, unitsOrdered:198, demandForecast:60.0, price:11.0, discount:0, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:10.0, seasonality:'Winter' },
  { date:'2023-12-01', storeId:'S002', productId:'P0001', category:'Clothing', region:'East', inventoryLevel:415, unitsSold:18, unitsOrdered:67, demandForecast:27.2, price:33.5, discount:10, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:29.69, seasonality:'Autumn' },
  { date:'2023-12-01', storeId:'S002', productId:'P0002', category:'Groceries', region:'North', inventoryLevel:364, unitsSold:26, unitsOrdered:149, demandForecast:40.0, price:63.01, discount:20, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:66.16, seasonality:'Autumn' },
  { date:'2023-12-01', storeId:'S002', productId:'P0003', category:'Clothing', region:'South', inventoryLevel:372, unitsSold:93, unitsOrdered:132, demandForecast:100.0, price:27.99, discount:10, weatherCondition:'Sunny', holidayPromotion:true, competitorPricing:31.32, seasonality:'Autumn' },
  { date:'2023-12-01', storeId:'S002', productId:'P0004', category:'Toys', region:'West', inventoryLevel:133, unitsSold:46, unitsOrdered:77, demandForecast:55.0, price:32.72, discount:10, weatherCondition:'Cloudy', holidayPromotion:true, competitorPricing:34.74, seasonality:'Autumn' },
  { date:'2023-12-01', storeId:'S002', productId:'P0005', category:'Toys', region:'West', inventoryLevel:464, unitsSold:200, unitsOrdered:44, demandForecast:210.0, price:45.0, discount:15, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:42.0, seasonality:'Autumn' },
  { date:'2023-11-01', storeId:'S003', productId:'P0001', category:'Clothing', region:'West', inventoryLevel:138, unitsSold:114, unitsOrdered:65, demandForecast:120.0, price:33.5, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:29.69, seasonality:'Autumn' },
  { date:'2023-11-01', storeId:'S003', productId:'P0006', category:'Furniture', region:'North', inventoryLevel:451, unitsSold:366, unitsOrdered:200, demandForecast:375.0, price:22.5, discount:5, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:20.0, seasonality:'Autumn' },
  { date:'2023-11-01', storeId:'S003', productId:'P0007', category:'Electronics', region:'North', inventoryLevel:108, unitsSold:97, unitsOrdered:74, demandForecast:100.0, price:55.0, discount:20, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:52.0, seasonality:'Autumn' },
  { date:'2023-10-01', storeId:'S004', productId:'P0001', category:'Electronics', region:'East', inventoryLevel:497, unitsSold:496, unitsOrdered:137, demandForecast:500.0, price:33.5, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:29.69, seasonality:'Autumn' },
  { date:'2023-10-01', storeId:'S004', productId:'P0008', category:'Furniture', region:'West', inventoryLevel:390, unitsSold:365, unitsOrdered:91, demandForecast:370.0, price:89.99, discount:10, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:85.0, seasonality:'Autumn' },
  { date:'2023-09-01', storeId:'S005', productId:'P0012', category:'Electronics', region:'North', inventoryLevel:495, unitsSold:324, unitsOrdered:42, demandForecast:330.0, price:75.0, discount:15, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:72.0, seasonality:'Summer' },
  { date:'2023-09-01', storeId:'S005', productId:'P0013', category:'Electronics', region:'West', inventoryLevel:389, unitsSold:276, unitsOrdered:99, demandForecast:280.0, price:12.5, discount:5, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:11.0, seasonality:'Summer' },
  { date:'2023-08-01', storeId:'S001', productId:'P0015', category:'Electronics', region:'East', inventoryLevel:356, unitsSold:257, unitsOrdered:60, demandForecast:265.0, price:65.0, discount:20, weatherCondition:'Sunny', holidayPromotion:true, competitorPricing:62.0, seasonality:'Summer' },
  { date:'2023-08-01', storeId:'S002', productId:'P0017', category:'Toys', region:'East', inventoryLevel:236, unitsSold:12, unitsOrdered:91, demandForecast:4.01, price:42.0, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:40.0, seasonality:'Summer' },
  { date:'2023-07-01', storeId:'S003', productId:'P0019', category:'Electronics', region:'West', inventoryLevel:253, unitsSold:184, unitsOrdered:121, demandForecast:190.0, price:55.0, discount:15, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:52.0, seasonality:'Summer' },
  { date:'2023-07-01', storeId:'S004', productId:'P0020', category:'Toys', region:'West', inventoryLevel:249, unitsSold:243, unitsOrdered:115, demandForecast:250.0, price:11.0, discount:0, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:10.0, seasonality:'Summer' },
  { date:'2023-06-01', storeId:'S005', productId:'P0014', category:'Toys', region:'West', inventoryLevel:328, unitsSold:190, unitsOrdered:43, demandForecast:195.0, price:95.0, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:90.0, seasonality:'Summer' },
  { date:'2023-05-01', storeId:'S001', productId:'P0011', category:'Groceries', region:'North', inventoryLevel:156, unitsSold:121, unitsOrdered:156, demandForecast:130.0, price:18.0, discount:0, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:17.0, seasonality:'Spring' },
  { date:'2023-05-01', storeId:'S002', productId:'P0016', category:'Toys', region:'North', inventoryLevel:258, unitsSold:110, unitsOrdered:197, demandForecast:115.0, price:110.0, discount:5, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:105.0, seasonality:'Spring' },
  { date:'2023-04-01', storeId:'S003', productId:'P0018', category:'Groceries', region:'East', inventoryLevel:151, unitsSold:30, unitsOrdered:147, demandForecast:35.0, price:85.0, discount:0, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:82.0, seasonality:'Spring' },
  { date:'2023-03-01', storeId:'S004', productId:'P0009', category:'Clothing', region:'East', inventoryLevel:115, unitsSold:47, unitsOrdered:139, demandForecast:60.0, price:120.0, discount:5, weatherCondition:'Rainy', holidayPromotion:false, competitorPricing:115.0, seasonality:'Spring' },
  { date:'2023-02-01', storeId:'S005', productId:'P0010', category:'Toys', region:'North', inventoryLevel:308, unitsSold:184, unitsOrdered:94, demandForecast:190.0, price:35.0, discount:10, weatherCondition:'Cloudy', holidayPromotion:false, competitorPricing:33.0, seasonality:'Winter' },
  { date:'2023-01-01', storeId:'S001', productId:'P0003', category:'Toys', region:'West', inventoryLevel:102, unitsSold:65, unitsOrdered:51, demandForecast:74.02, price:27.99, discount:10, weatherCondition:'Sunny', holidayPromotion:true, competitorPricing:31.32, seasonality:'Winter' },
  { date:'2022-12-01', storeId:'S002', productId:'P0005', category:'Toys', region:'West', inventoryLevel:464, unitsSold:200, unitsOrdered:44, demandForecast:144.04, price:45.0, discount:20, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:42.0, seasonality:'Autumn' },
  { date:'2022-11-01', storeId:'S003', productId:'P0004', category:'Groceries', region:'North', inventoryLevel:415, unitsSold:36, unitsOrdered:79, demandForecast:54.9, price:32.72, discount:10, weatherCondition:'Cloudy', holidayPromotion:true, competitorPricing:34.74, seasonality:'Autumn' },
  { date:'2022-10-01', storeId:'S004', productId:'P0006', category:'Toys', region:'East', inventoryLevel:364, unitsSold:195, unitsOrdered:39, demandForecast:200.0, price:22.5, discount:5, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:20.0, seasonality:'Autumn' },
  { date:'2022-09-01', storeId:'S005', productId:'P0007', category:'Groceries', region:'South', inventoryLevel:59, unitsSold:4, unitsOrdered:34, demandForecast:3.95, price:55.0, discount:20, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:52.0, seasonality:'Summer' },
  { date:'2022-08-01', storeId:'S001', productId:'P0008', category:'Electronics', region:'East', inventoryLevel:315, unitsSold:233, unitsOrdered:108, demandForecast:240.0, price:89.99, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:85.0, seasonality:'Summer' },
  { date:'2022-07-01', storeId:'S002', productId:'P0009', category:'Electronics', region:'North', inventoryLevel:62, unitsSold:31, unitsOrdered:183, demandForecast:35.0, price:120.0, discount:5, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:115.0, seasonality:'Summer' },
  { date:'2022-06-01', storeId:'S003', productId:'P0010', category:'Furniture', region:'East', inventoryLevel:413, unitsSold:398, unitsOrdered:186, demandForecast:400.0, price:35.0, discount:10, weatherCondition:'Sunny', holidayPromotion:false, competitorPricing:33.0, seasonality:'Summer' },
];

// @route   POST /api/seed/run
// @desc    Seed the Atlas database (protected by secret)
router.post('/run', async (req, res) => {
  const { secret } = req.body;
  if (secret !== SEED_SECRET) {
    return res.status(403).json({ success: false, message: 'Invalid seed secret' });
  }

  try {
    res.json({ success: true, message: 'Seed started in background. Check /api/seed/status in 30s.' });

    // Run seed async
    (async () => {
      console.log('🌱 Starting Atlas seed...');

      await Promise.all([
        User.deleteMany({}), Product.deleteMany({}), RetailRecord.deleteMany({}),
        Order.deleteMany({}), InventoryLog.deleteMany({}), Notification.deleteMany({}),
        Prediction.deleteMany({}),
      ]);

      // Create users
      const admin = await User.create({ name: 'Admin User', email: 'admin@inventory.com', password: 'admin123', role: 'admin', emailNotifications: true });
      await User.create({ name: 'Store Manager', email: 'manager@inventory.com', password: 'manager123', role: 'staff' });
      await User.create({ name: 'Staff Member', email: 'staff@inventory.com', password: 'staff123', role: 'staff' });
      console.log('👤 Users created');

      // Build products from sample data
      const productMap = {};
      SAMPLE_DATA.forEach((row) => {
        if (!productMap[row.productId] || new Date(row.date) > new Date(productMap[row.productId]._date)) {
          productMap[row.productId] = { ...row, _date: row.date };
        }
      });

      const productDocs = [];
      for (const [pid, data] of Object.entries(productMap)) {
        const meta = PRODUCT_META[pid] || { name: `Product ${pid}`, description: '' };
        const doc = await Product.create({
          productId: pid, name: meta.name, category: data.category,
          price: data.price, discount: data.discount, competitorPricing: data.competitorPricing,
          description: meta.description, unit: 'pcs',
          stock: { current: data.inventoryLevel, minimum: 50, maximum: 500, reorderPoint: 100 },
        });
        productDocs.push(doc);
      }
      console.log(`📦 ${productDocs.length} products created`);

      const pidToObjId = {};
      productDocs.forEach((p) => { pidToObjId[p.productId] = p._id; });

      // Insert retail records
      const records = SAMPLE_DATA.map((row) => ({
        date: new Date(row.date), storeId: row.storeId, productId: row.productId,
        product: pidToObjId[row.productId], category: row.category, region: row.region,
        inventoryLevel: row.inventoryLevel, unitsSold: row.unitsSold, unitsOrdered: row.unitsOrdered,
        demandForecast: row.demandForecast, price: row.price, discount: row.discount,
        weatherCondition: row.weatherCondition, holidayPromotion: row.holidayPromotion,
        competitorPricing: row.competitorPricing, seasonality: row.seasonality,
      }));
      await RetailRecord.insertMany(records);
      console.log(`📋 ${records.length} retail records created`);

      // Create orders from sales data
      let orderNum = 1;
      const orders = SAMPLE_DATA.filter(r => r.unitsSold > 0).slice(0, 50).map((row) => {
        const product = productDocs.find(p => p.productId === row.productId);
        if (!product) return null;
        const qty = row.unitsSold;
        const price = row.price * (1 - row.discount / 100);
        return {
          orderNumber: `SO-${String(orderNum++).padStart(6, '0')}`,
          type: 'sale', status: 'completed',
          items: [{ product: product._id, productName: product.name, sku: product.productId, quantity: qty, unitPrice: parseFloat(price.toFixed(2)), totalPrice: parseFloat((price * qty).toFixed(2)) }],
          totalAmount: parseFloat((price * qty).toFixed(2)),
          customer: { name: `Store ${row.storeId} Customer`, email: `customer@${row.storeId.toLowerCase()}.com` },
          notes: `${row.seasonality} | ${row.weatherCondition}`,
          createdAt: new Date(row.date), processedAt: new Date(row.date),
        };
      }).filter(Boolean);
      await Order.insertMany(orders);
      console.log(`🛒 ${orders.length} orders created`);

      // Inventory logs
      const logs = SAMPLE_DATA.slice(0, 30).map((row) => ({
        product: pidToObjId[row.productId],
        productName: PRODUCT_META[row.productId]?.name || row.productId,
        sku: row.productId, action: 'stock_out', quantity: row.unitsSold,
        previousStock: row.inventoryLevel + row.unitsSold, newStock: row.inventoryLevel,
        reason: `Store ${row.storeId}`, performedBy: admin._id, performedByName: admin.name,
        createdAt: new Date(row.date),
      }));
      await InventoryLog.insertMany(logs);

      // Notifications for low stock
      const lowStock = productDocs.filter(p => p.stock.current <= p.stock.minimum);
      if (lowStock.length > 0) {
        await Notification.insertMany(lowStock.map(p => ({
          type: p.stock.current === 0 ? 'out_of_stock' : 'low_stock',
          title: `Low Stock: ${p.name}`, message: `${p.name} has ${p.stock.current} units`,
          severity: 'warning', product: p._id,
        })));
      }

      console.log('✅ Atlas seed complete!');
    })();

  } catch (error) {
    console.error('Seed error:', error.message);
  }
});

// @route   GET /api/seed/status
// @desc    Check seed status
router.get('/status', async (req, res) => {
  try {
    const [users, products, records, orders] = await Promise.all([
      User.countDocuments(), Product.countDocuments(),
      RetailRecord.countDocuments(), Order.countDocuments(),
    ]);
    res.json({ success: true, data: { users, products, retailRecords: records, orders } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
