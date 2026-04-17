import { useState } from 'react';
import { productsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Minus, RefreshCw } from 'lucide-react';

const StockAdjustModal = ({ product, onSuccess, onCancel }) => {
  const [action, setAction] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const getNewStock = () => {
    const qty = parseInt(quantity) || 0;
    if (action === 'add') return product.stock.current + qty;
    if (action === 'subtract') return Math.max(0, product.stock.current - qty);
    return qty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || parseInt(quantity) < 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    setLoading(true);
    try {
      await productsAPI.adjustStock(product._id, { action, quantity: parseInt(quantity), reason });
      toast.success('Stock updated successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{product.sku}</p>
        <p className="text-sm mt-1">
          Current stock: <span className="font-bold text-gray-900 dark:text-white">{product.stock.current} {product.unit}</span>
        </p>
      </div>

      {/* Action type */}
      <div>
        <label className="label">Action</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'add', label: 'Add', icon: Plus, color: 'green' },
            { value: 'subtract', label: 'Remove', icon: Minus, color: 'red' },
            { value: 'set', label: 'Set to', icon: RefreshCw, color: 'blue' },
          ].map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAction(value)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                action === value
                  ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-400`
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Quantity *</label>
        <input
          type="number"
          min="0"
          className="input"
          placeholder="Enter quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        {quantity && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            New stock will be: <span className="font-semibold text-gray-900 dark:text-white">{getNewStock()} {product.unit}</span>
          </p>
        )}
      </div>

      <div>
        <label className="label">Reason</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Received shipment, damaged goods..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Updating...' : 'Update Stock'}
        </button>
      </div>
    </form>
  );
};

export default StockAdjustModal;
