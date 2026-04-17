const cron = require('node-cron');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { emitLowStockAlert, emitNotification } = require('./socket');
const { sendLowStockEmail } = require('./mailer');

/**
 * Check for low stock products and create notifications
 */
const checkLowStock = async () => {
  try {
    console.log('🔍 Running low stock check...');

    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock.current', '$stock.minimum'] },
    }).select('name sku stock category');

    if (lowStockProducts.length === 0) {
      console.log('✅ No low stock products found');
      return;
    }

    console.log(`⚠️  Found ${lowStockProducts.length} low stock products`);

    // Create notifications for each low stock product
    for (const product of lowStockProducts) {
      const isOutOfStock = product.stock.current === 0;

      // Check if a recent notification already exists (within last hour)
      const recentNotif = await Notification.findOne({
        product: product._id,
        type: isOutOfStock ? 'out_of_stock' : 'low_stock',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      });

      if (!recentNotif) {
        const notification = await Notification.create({
          type: isOutOfStock ? 'out_of_stock' : 'low_stock',
          title: isOutOfStock ? `Out of Stock: ${product.name}` : `Low Stock Alert: ${product.name}`,
          message: isOutOfStock
            ? `${product.name} (${product.sku}) is completely out of stock!`
            : `${product.name} (${product.sku}) has only ${product.stock.current} units left (minimum: ${product.stock.minimum})`,
          severity: isOutOfStock ? 'error' : 'warning',
          product: product._id,
          metadata: {
            currentStock: product.stock.current,
            minimumStock: product.stock.minimum,
            sku: product.sku,
          },
        });

        // Emit real-time notification
        emitNotification(notification);
      }
    }

    // Emit low stock alert with product list
    emitLowStockAlert(lowStockProducts);

    // Send email alert
    await sendLowStockEmail(lowStockProducts);
  } catch (error) {
    console.error('❌ Error in low stock check:', error.message);
  }
};

/**
 * Start all cron jobs
 */
const startCronJobs = () => {
  const interval = process.env.STOCK_CHECK_INTERVAL || 5;

  // Run low stock check every X minutes
  cron.schedule(`*/${interval} * * * *`, checkLowStock);
  console.log(`⏰ Cron job started: Low stock check every ${interval} minutes`);

  // Run once on startup
  setTimeout(checkLowStock, 5000);
};

module.exports = { startCronJobs, checkLowStock };
