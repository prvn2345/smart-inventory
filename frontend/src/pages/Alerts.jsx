import { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StockBadge from '../components/ui/StockBadge';
import toast from 'react-hot-toast';

const Alerts = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await productsAPI.getLowStock();
      setLowStockProducts(res.data.data);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const outOfStock = lowStockProducts.filter((p) => p.stock.current === 0);
  const lowStock = lowStockProducts.filter((p) => p.stock.current > 0 && p.stock.current <= p.stock.minimum);

  if (loading) return <LoadingSpinner size="lg" text="Loading alerts..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle size={24} className="text-yellow-500" />
            Stock Alerts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lowStockProducts.length} product(s) need attention
          </p>
        </div>
        <button
          onClick={() => fetchAlerts(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {lowStockProducts.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Good!</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">No low stock alerts at this time.</p>
        </div>
      ) : (
        <>
          {/* Out of stock */}
          {outOfStock.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Out of Stock ({outOfStock.length})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {outOfStock.map((product) => (
                  <AlertCard key={product._id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Low stock */}
          {lowStock.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Low Stock ({lowStock.length})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStock.map((product) => (
                  <AlertCard key={product._id} product={product} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AlertCard = ({ product }) => {
  const isOut = product.stock.current === 0;
  const percentage = product.stock.maximum > 0
    ? (product.stock.current / product.stock.maximum) * 100
    : 0;

  return (
    <div className={`card p-4 border-l-4 ${isOut ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-red-100 dark:bg-red-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
            <Package size={18} className={isOut ? 'text-red-600' : 'text-yellow-600'} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
            <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
          </div>
        </div>
        <StockBadge status={product.stockStatus} current={product.stock.current} minimum={product.stock.minimum} />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Current</span>
          <span className={`font-bold ${isOut ? 'text-red-600' : 'text-yellow-600'}`}>
            {product.stock.current} {product.unit}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Minimum</span>
          <span className="text-gray-700 dark:text-gray-300">{product.stock.minimum} {product.unit}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Reorder Point</span>
          <span className="text-gray-700 dark:text-gray-300">{product.stock.reorderPoint} {product.unit}</span>
        </div>

        {/* Stock bar */}
        <div className="mt-2">
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOut ? 'bg-red-500' : 'bg-yellow-500'}`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{percentage.toFixed(0)}% of max capacity</p>
        </div>

        {product.supplier?.name && (
          <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
            Supplier: {product.supplier.name}
          </p>
        )}
      </div>
    </div>
  );
};

export default Alerts;
