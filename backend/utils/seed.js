require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const User = require('../models/User');
const Product = require('../models/Product');
const RetailRecord = require('../models/RetailRecord');
const Order = require('../models/Order');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const Prediction = require('../models/Prediction');

// ─── Product metadata (names + descriptions per category) ────────────────────
const PRODUCT_META = {
  P0001: { name: 'Premium Grocery Bundle',     category: null, description: 'Assorted premium grocery items' },
  P0002: { name: 'Classic Toy Set',            category: null, description: 'Classic educational toy collection' },
  P0003: { name: 'Smart Electronics Kit',      category: null, description: 'Consumer electronics starter kit' },
  P0004: { name: 'Home Furniture Pack',        category: null, description: 'Essential home furniture set' },
  P0005: { name: 'Fashion Clothing Line',      category: null, description: 'Seasonal fashion clothing collection' },
  P0006: { name: 'Organic Food Selection',     category: null, description: 'Organic and natural food products' },
  P0007: { name: 'Kids Adventure Toys',        category: null, description: 'Adventure and outdoor toys for kids' },
  P0008: { name: 'Digital Gadgets Pro',        category: null, description: 'Professional digital gadgets and accessories' },
  P0009: { name: 'Living Room Essentials',     category: null, description: 'Complete living room furniture set' },
  P0010: { name: 'Casual Wear Collection',     category: null, description: 'Everyday casual clothing for all ages' },
  P0011: { name: 'Fresh Produce Box',          category: null, description: 'Fresh daily produce and vegetables' },
  P0012: { name: 'STEM Learning Toys',         category: null, description: 'Science and technology learning toys' },
  P0013: { name: 'Smart Home Devices',         category: null, description: 'Connected smart home electronics' },
  P0014: { name: 'Office Furniture Set',       category: null, description: 'Ergonomic office furniture collection' },
  P0015: { name: 'Sports Apparel Range',       category: null, description: 'Performance sports clothing and gear' },
  P0016: { name: 'Pantry Staples Pack',        category: null, description: 'Essential pantry and kitchen staples' },
  P0017: { name: 'Board Games Collection',     category: null, description: 'Family board games and puzzles' },
  P0018: { name: 'Audio Visual Equipment',     category: null, description: 'High-quality audio and visual devices' },
  P0019: { name: 'Bedroom Furniture Suite',    category: null, description: 'Complete bedroom furniture package' },
  P0020: { name: 'Designer Clothing Bundle',   category: null, description: 'Premium designer clothing selection' },
};

// ─── Parse CSV ────────────────────────────────────────────────────────────────
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
};

// ─── Main seed function ───────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      RetailRecord.deleteMany({}),
      Order.deleteMany({}),
      InventoryLog.deleteMany({}),
      Notification.deleteMany({}),
      Prediction.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // ── Create users ──────────────────────────────────────────────────────────
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@inventory.com',
      password: 'admin123',
      role: 'admin',
      emailNotifications: true,
    });
    await User.create({
      name: 'Store Manager',
      email: 'manager@inventory.com',
      password: 'manager123',
      role: 'staff',
    });
    await User.create({
      name: 'Staff Member',
      email: 'staff@inventory.com',
      password: 'staff123',
      role: 'staff',
    });
    console.log('👤 Users created (3)');

    // ── Read CSV ──────────────────────────────────────────────────────────────
    const csvPath = path.join(__dirname, '../../retail_store_inventory.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV not found at:', csvPath);
      process.exit(1);
    }

    console.log('📂 Reading CSV...');
    const rows = await parseCSV(csvPath);
    console.log(`📊 Loaded ${rows.length} rows from CSV`);

    // ── Build product catalog from CSV ────────────────────────────────────────
    // For each productId, find the most recent row to get current state
    const productMap = {};
    rows.forEach((row) => {
      const pid = row['Product ID'];
      const rowDate = new Date(row['Date']);
      if (!productMap[pid] || rowDate > productMap[pid]._date) {
        productMap[pid] = {
          _date: rowDate,
          productId: pid,
          category: row['Category'],
          price: parseFloat(row['Price']) || 0,
          discount: parseFloat(row['Discount']) || 0,
          competitorPricing: parseFloat(row['Competitor Pricing']) || 0,
          inventoryLevel: parseInt(row['Inventory Level']) || 0,
        };
      }
    });

    // Create Product documents
    const productDocs = [];
    for (const [pid, data] of Object.entries(productMap)) {
      const meta = PRODUCT_META[pid] || { name: `Product ${pid}`, description: '' };
      const doc = await Product.create({
        productId: data.productId,
        name: meta.name,
        category: data.category,
        price: data.price,
        discount: data.discount,
        competitorPricing: data.competitorPricing,
        description: meta.description,
        unit: data.category === 'Groceries' ? 'kg' : data.category === 'Clothing' ? 'pcs' : 'pcs',
        stock: {
          current: data.inventoryLevel,
          minimum: 50,
          maximum: 500,
          reorderPoint: 100,
        },
      });
      productDocs.push(doc);
    }
    console.log(`📦 ${productDocs.length} products created`);

    // Build productId → ObjectId map
    const pidToObjId = {};
    productDocs.forEach((p) => { pidToObjId[p.productId] = p._id; });

    // ── Import RetailRecords in batches ───────────────────────────────────────
    console.log('📋 Importing retail records (this may take a moment)...');
    const BATCH_SIZE = 2000;
    let imported = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
        date: new Date(row['Date']),
        storeId: row['Store ID'],
        productId: row['Product ID'],
        product: pidToObjId[row['Product ID']],
        category: row['Category'],
        region: row['Region'],
        inventoryLevel: parseInt(row['Inventory Level']) || 0,
        unitsSold: parseInt(row['Units Sold']) || 0,
        unitsOrdered: parseInt(row['Units Ordered']) || 0,
        demandForecast: parseFloat(row['Demand Forecast']) || 0,
        price: parseFloat(row['Price']) || 0,
        discount: parseFloat(row['Discount']) || 0,
        weatherCondition: row['Weather Condition'] || '',
        holidayPromotion: row['Holiday/Promotion'] === '1',
        competitorPricing: parseFloat(row['Competitor Pricing']) || 0,
        seasonality: row['Seasonality'] || '',
      }));

      await RetailRecord.insertMany(batch, { ordered: false });
      imported += batch.length;
      process.stdout.write(`\r  Imported ${imported}/${rows.length} records...`);
    }
    console.log(`\n✅ ${imported} retail records imported`);

    // ── Create inventory logs from CSV data ───────────────────────────────────
    // Use last 30 days of data for logs
    const thirtyDaysAgo = new Date('2023-12-01');
    const recentRows = rows.filter((r) => new Date(r['Date']) >= thirtyDaysAgo);

    const logs = recentRows.slice(0, 500).map((row) => ({
      product: pidToObjId[row['Product ID']],
      productName: PRODUCT_META[row['Product ID']]?.name || row['Product ID'],
      sku: row['Product ID'],
      action: parseInt(row['Units Sold']) > 0 ? 'stock_out' : 'stock_in',
      quantity: parseInt(row['Units Sold']) || parseInt(row['Units Ordered']) || 0,
      previousStock: parseInt(row['Inventory Level']) + parseInt(row['Units Sold']),
      newStock: parseInt(row['Inventory Level']),
      reason: `Store ${row['Store ID']} - ${row['Seasonality']} season`,
      reference: `${row['Store ID']}-${row['Date']}`,
      performedBy: admin._id,
      performedByName: admin.name,
      createdAt: new Date(row['Date']),
    }));
    await InventoryLog.insertMany(logs);
    console.log(`📋 ${logs.length} inventory logs created`);

    // ── Create sample orders from CSV sales data ──────────────────────────────
    const salesRows = rows
      .filter((r) => parseInt(r['Units Sold']) > 0)
      .slice(0, 200);

    let orderNum = 1;
    const orders = salesRows.map((row) => {
      const product = productDocs.find((p) => p.productId === row['Product ID']);
      if (!product) return null;
      const qty = parseInt(row['Units Sold']) || 1;
      const price = parseFloat(row['Price']) || product.price;
      const discountedPrice = price * (1 - (parseFloat(row['Discount']) || 0) / 100);
      return {
        orderNumber: `SO-${String(orderNum++).padStart(6, '0')}`,
        type: 'sale',
        status: 'completed',
        items: [{
          product: product._id,
          productName: product.name,
          sku: product.productId,
          quantity: qty,
          unitPrice: parseFloat(discountedPrice.toFixed(2)),
          totalPrice: parseFloat((discountedPrice * qty).toFixed(2)),
        }],
        totalAmount: parseFloat((discountedPrice * qty).toFixed(2)),
        customer: {
          name: `Store ${row['Store ID']} Customer`,
          email: `customer@${row['Store ID'].toLowerCase()}.com`,
        },
        notes: `${row['Seasonality']} season | ${row['Weather Condition']} weather${row['Holiday/Promotion'] === '1' ? ' | Holiday/Promo' : ''}`,
        createdAt: new Date(row['Date']),
        processedAt: new Date(row['Date']),
      };
    }).filter(Boolean);

    await Order.insertMany(orders);
    console.log(`🛒 ${orders.length} orders created`);

    // ── Create notifications for low stock products ───────────────────────────
    const lowStockProducts = productDocs.filter(
      (p) => p.stock.current <= p.stock.minimum
    );
    const notifications = lowStockProducts.map((p) => ({
      type: p.stock.current === 0 ? 'out_of_stock' : 'low_stock',
      title: p.stock.current === 0 ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`,
      message: `${p.name} (${p.productId}) has ${p.stock.current} units remaining (minimum: ${p.stock.minimum})`,
      severity: p.stock.current === 0 ? 'error' : 'warning',
      product: p._id,
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    console.log(`🔔 ${notifications.length} notifications created`);

    console.log('\n✅ Seed complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Admin:   admin@inventory.com   / admin123');
    console.log('📧 Manager: manager@inventory.com / manager123');
    console.log('📧 Staff:   staff@inventory.com   / staff123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

seed();
