import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { productsAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

const UNITS = ['pcs', 'kg', 'g', 'liter', 'ml', 'box', 'pack', 'dozen', 'meter', 'set'];

const ProductForm = ({ product, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(product?.image || '');
  const [uploadingImage, setUploadingImage] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: product ? {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      category: product.category,
      unit: product.unit,
      'price.cost': product.price.cost,
      'price.selling': product.price.selling,
      'stock.current': product.stock.current,
      'stock.minimum': product.stock.minimum,
      'stock.maximum': product.stock.maximum,
      'stock.reorderPoint': product.stock.reorderPoint,
      'supplier.name': product.supplier?.name,
      'supplier.email': product.supplier?.email,
      'supplier.phone': product.supplier?.phone,
      'location.warehouse': product.location?.warehouse,
      'location.shelf': product.location?.shelf,
    } : {
      unit: 'pcs',
      'stock.minimum': 10,
      'stock.maximum': 1000,
      'stock.reorderPoint': 20,
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await uploadAPI.uploadImage(formData);
      setImagePreview(res.data.url);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Restructure nested fields
      const payload = {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        description: data.description,
        category: data.category,
        unit: data.unit,
        image: imagePreview,
        price: { cost: parseFloat(data['price.cost']), selling: parseFloat(data['price.selling']) },
        stock: {
          current: parseInt(data['stock.current']),
          minimum: parseInt(data['stock.minimum']),
          maximum: parseInt(data['stock.maximum']),
          reorderPoint: parseInt(data['stock.reorderPoint']),
        },
        supplier: {
          name: data['supplier.name'],
          email: data['supplier.email'],
          phone: data['supplier.phone'],
        },
        location: {
          warehouse: data['location.warehouse'],
          shelf: data['location.shelf'],
        },
      };

      if (product) {
        await productsAPI.update(product._id, payload);
        toast.success('Product updated');
      } else {
        await productsAPI.create(payload);
        toast.success('Product created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Image upload */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
          {imagePreview ? (
            <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
          ) : (
            <Upload size={24} className="text-gray-400" />
          )}
        </div>
        <div>
          <label className="btn-secondary text-sm cursor-pointer">
            {uploadingImage ? 'Uploading...' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
          </label>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 10MB</p>
        </div>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Product Name *</label>
          <input className="input" placeholder="e.g. Wireless Headphones" {...register('name', { required: 'Name is required' })} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">SKU *</label>
          <input className="input font-mono uppercase" placeholder="PROD-001" {...register('sku', { required: 'SKU is required' })} />
          {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="label">Barcode</label>
          <input className="input font-mono" placeholder="1234567890" {...register('barcode')} />
        </div>

        <div>
          <label className="label">Category *</label>
          <input className="input" placeholder="Electronics" {...register('category', { required: 'Category is required' })} />
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
        </div>

        <div>
          <label className="label">Unit</label>
          <select className="input" {...register('unit')}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={2} placeholder="Product description..." {...register('description')} />
        </div>
      </div>

      {/* Pricing */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pricing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Cost Price ($) *</label>
            <input type="number" step="0.01" min="0" className="input" placeholder="0.00" {...register('price.cost', { required: true, min: 0 })} />
          </div>
          <div>
            <label className="label">Selling Price ($) *</label>
            <input type="number" step="0.01" min="0" className="input" placeholder="0.00" {...register('price.selling', { required: true, min: 0 })} />
          </div>
        </div>
      </div>

      {/* Stock */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Stock Levels</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Current Stock *</label>
            <input type="number" min="0" className="input" {...register('stock.current', { required: true, min: 0 })} />
          </div>
          <div>
            <label className="label">Minimum</label>
            <input type="number" min="0" className="input" {...register('stock.minimum')} />
          </div>
          <div>
            <label className="label">Maximum</label>
            <input type="number" min="0" className="input" {...register('stock.maximum')} />
          </div>
          <div>
            <label className="label">Reorder Point</label>
            <input type="number" min="0" className="input" {...register('stock.reorderPoint')} />
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Supplier Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Supplier Name</label>
            <input className="input" placeholder="Supplier Co." {...register('supplier.name')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="supplier@example.com" {...register('supplier.email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="+1-555-0100" {...register('supplier.phone')} />
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Storage Location</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Warehouse</label>
            <input className="input" placeholder="Warehouse A" {...register('location.warehouse')} />
          </div>
          <div>
            <label className="label">Shelf</label>
            <input className="input" placeholder="Shelf B-12" {...register('location.shelf')} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
