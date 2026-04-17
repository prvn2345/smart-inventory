import { useState, useEffect } from 'react';
import { productsAPI } from '../../services/api';
import StockBadge from '../ui/StockBadge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Package, MapPin, User, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const ProductDetail = ({ product }) => {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    productsAPI.getLogs(product._id, { limit: 10 })
      .then((res) => setLogs(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, [product._id]);

  const actionColors = {
    stock_in: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    stock_out: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    adjustment: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    return: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    damage: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <Package size={28} className="text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{product.name}</h3>
          <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
          <div className="flex items-center gap-2 mt-1">
            <StockBadge status={product.stockStatus} current={product.stock.current} minimum={product.stock.minimum} />
            <span className="text-xs text-gray-400">{product.category}</span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Stock</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{product.stock.current} <span className="text-sm font-normal text-gray-500">{product.unit}</span></p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">Selling Price</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(product.price.selling)}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">Cost Price</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(product.price.cost)}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">Profit Margin</p>
          <p className="text-lg font-semibold text-green-600">{product.profitMargin}%</p>
        </div>
      </div>

      {/* Stock thresholds */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Min Stock', value: product.stock.minimum },
          { label: 'Reorder Point', value: product.stock.reorderPoint },
          { label: 'Max Stock', value: product.stock.maximum },
        ].map(({ label, value }) => (
          <div key={label} className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Supplier */}
      {product.supplier?.name && (
        <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <User size={16} className="text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{product.supplier.name}</p>
            {product.supplier.email && <p className="text-xs text-gray-500">{product.supplier.email}</p>}
            {product.supplier.phone && <p className="text-xs text-gray-500">{product.supplier.phone}</p>}
          </div>
        </div>
      )}

      {/* Location */}
      {(product.location?.warehouse || product.location?.shelf) && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <MapPin size={16} className="text-gray-400" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {[product.location.warehouse, product.location.shelf].filter(Boolean).join(' / ')}
          </p>
        </div>
      )}

      {/* Inventory logs */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Clock size={14} />
          Recent Activity
        </h4>
        {loadingLogs ? (
          <LoadingSpinner size="sm" />
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log._id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'text-gray-600 bg-gray-100'}`}>
                    {log.action.replace('_', ' ')}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{log.quantity} units</span>
                  {log.reason && <span className="text-gray-400 text-xs truncate max-w-[120px]">— {log.reason}</span>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
