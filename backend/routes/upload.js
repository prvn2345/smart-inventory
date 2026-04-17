const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.csv', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Parse CSV/Excel rows into product objects
 */
const parseProductRow = (row) => ({
  name: row.name || row.Name,
  sku: (row.sku || row.SKU || '').toUpperCase(),
  barcode: row.barcode || row.Barcode || '',
  description: row.description || row.Description || '',
  category: row.category || row.Category || 'Uncategorized',
  price: {
    cost: parseFloat(row.cost_price || row['Cost Price'] || 0),
    selling: parseFloat(row.selling_price || row['Selling Price'] || 0),
  },
  stock: {
    current: parseInt(row.current_stock || row['Current Stock'] || 0),
    minimum: parseInt(row.min_stock || row['Min Stock'] || 10),
    maximum: parseInt(row.max_stock || row['Max Stock'] || 1000),
  },
  unit: row.unit || row.Unit || 'pcs',
  'supplier.name': row.supplier_name || row['Supplier Name'] || '',
});

// @route   POST /api/upload/bulk
// @desc    Bulk upload products via CSV/Excel
// @access  Private/Admin
router.post('/bulk', protect, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const products = [];
    const errors = [];

    if (ext === '.csv') {
      // Parse CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => products.push(parseProductRow(row)))
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      // Parse Excel
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      rows.forEach((row) => products.push(parseProductRow(row)));
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Insert products
    let created = 0;
    let updated = 0;

    for (const productData of products) {
      if (!productData.name || !productData.sku) {
        errors.push(`Skipped row: missing name or SKU`);
        continue;
      }

      try {
        const existing = await Product.findOne({ sku: productData.sku });
        if (existing) {
          await Product.findByIdAndUpdate(existing._id, productData);
          updated++;
        } else {
          await Product.create(productData);
          created++;
        }
      } catch (err) {
        errors.push(`Error with SKU ${productData.sku}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Bulk upload complete: ${created} created, ${updated} updated`,
      created,
      updated,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/image
// @desc    Upload product image
// @access  Private
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: imageUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/upload/template
// @desc    Download CSV template
// @access  Private
router.get('/template', protect, (req, res) => {
  const headers = 'name,sku,barcode,description,category,cost_price,selling_price,current_stock,min_stock,max_stock,unit,supplier_name\n';
  const sample = 'Sample Product,PROD-001,1234567890,Product description,Electronics,10.00,19.99,100,10,500,pcs,Supplier Co\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=product_template.csv');
  res.send(headers + sample);
});

module.exports = router;
