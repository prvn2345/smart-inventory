import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Package, ChevronDown, BarChart2, ScanLine } from 'lucide-react';
import { productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StockBadge from '../components/ui/StockBadge';
import { formatCurrency } from '../utils/currency';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProductForm from '../components/products/ProductForm';
import StockAdjustModal from '../components/products/StockAdjustModal';
import ProductDetail from '../components/products/ProductDetail';
import toast from 'react-hot-toast';

const Products = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll({ page, limit: 20, search, category, status, sortBy, sortOrder });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, category, status, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(1), 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  useEffect(() => {
    productsAPI.getCategories().then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    try {
      await productsAPI.delete(product._id);
      toast.success('Product deleted');
      fetchProducts(pagination.page);
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedProduct(null);
    fetchProducts(pagination.page);
  };

  const handleAdjustSuccess = () => {
    setShowAdjust(false);
    setSelectedProduct(null);
    fetchProducts(pagination.page);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.total} total products</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setSelectedProduct(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-full sm:w-44">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-full sm:w-40">
            <option value="">All Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="input w-full sm:w-44"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="stock.current-asc">Stock: Low to High</option>
            <option value="stock.current-desc">Stock: High to Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading products..." />
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No products found</p>
            {isAdmin && (
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">
                Add your first product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-9 h-9 rounded-lg object-cover" />
                          ) : (
                            <Package size={16} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => { setSelectedProduct(product); setShowDetail(true); }}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block max-w-[180px]"
                          >
                            {product.name}
                          </button>
                          <p className="text-xs text-gray-400 font-mono">{product.productId || product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{product.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={`text-sm font-semibold ${
                          product.stock.current === 0 ? 'text-red-600' :
                          product.stock.current <= product.stock.minimum ? 'text-yellow-600' : 'text-gray-900 dark:text-white'
                        }`}>
                          {product.stock.current}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{product.unit}</span>
                        <p className="text-xs text-gray-400">min: {product.stock.minimum}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(product.price.selling)}</p>
                        <p className="text-xs text-gray-400">cost: {formatCurrency(product.price.cost)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge status={product.stockStatus} current={product.stock.current} minimum={product.stock.minimum} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedProduct(product); setShowAdjust(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Adjust stock"
                        >
                          <BarChart2 size={15} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => { setSelectedProduct(product); setShowForm(true); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="px-4 pb-4">
            <Pagination {...pagination} onPageChange={(p) => fetchProducts(p)} />
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelectedProduct(null); }}
        title={selectedProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <ProductForm
          product={selectedProduct}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setSelectedProduct(null); }}
        />
      </Modal>

      <Modal
        isOpen={showAdjust}
        onClose={() => { setShowAdjust(false); setSelectedProduct(null); }}
        title="Adjust Stock"
        size="sm"
      >
        {selectedProduct && (
          <StockAdjustModal
            product={selectedProduct}
            onSuccess={handleAdjustSuccess}
            onCancel={() => { setShowAdjust(false); setSelectedProduct(null); }}
          />
        )}
      </Modal>

      <Modal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedProduct(null); }}
        title="Product Details"
        size="lg"
      >
        {selectedProduct && <ProductDetail product={selectedProduct} />}
      </Modal>
    </div>
  );
};

export default Products;
