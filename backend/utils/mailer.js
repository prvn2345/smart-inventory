const nodemailer = require('nodemailer');
const User = require('../models/User');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send low stock email alert to admins
 */
const sendLowStockEmail = async (products) => {
  try {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
      console.log('📧 Email not configured, skipping email alert');
      return;
    }

    // Get all admin users with email notifications enabled
    const admins = await User.find({
      role: 'admin',
      emailNotifications: true,
      isActive: true,
    });

    if (admins.length === 0) return;

    const transporter = createTransporter();

    const productRows = products
      .map(
        (p) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${p.name}</td>
          <td style="padding:8px;border:1px solid #ddd">${p.sku}</td>
          <td style="padding:8px;border:1px solid #ddd;color:${p.stock.current === 0 ? 'red' : 'orange'};font-weight:bold">
            ${p.stock.current}
          </td>
          <td style="padding:8px;border:1px solid #ddd">${p.stock.minimum}</td>
          <td style="padding:8px;border:1px solid #ddd">${p.stock.current === 0 ? '🔴 Out of Stock' : '🟡 Low Stock'}</td>
        </tr>`
      )
      .join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
        <div style="background:#ef4444;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">⚠️ Low Stock Alert - Smart Inventory</h2>
        </div>
        <div style="padding:20px;background:#f9fafb;border:1px solid #e5e7eb">
          <p>The following products require immediate attention:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Product</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left">SKU</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Current Stock</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Min Stock</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Status</th>
              </tr>
            </thead>
            <tbody>${productRows}</tbody>
          </table>
          <p style="margin-top:20px;color:#6b7280;font-size:14px">
            This is an automated alert from Smart Inventory Management System.
          </p>
        </div>
      </div>
    `;

    for (const admin of admins) {
      const emailTo = admin.notificationEmail || admin.email;
      await transporter.sendMail({
        from: `"Smart Inventory" <${process.env.EMAIL_USER}>`,
        to: emailTo,
        subject: `⚠️ Low Stock Alert - ${products.length} product(s) need attention`,
        html,
      });
    }

    console.log(`📧 Low stock email sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error('❌ Email send error:', error.message);
  }
};

module.exports = { sendLowStockEmail };
