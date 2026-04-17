import { useState, useEffect } from 'react';
import { ordersAPI, productsAPI } from '../../services/api';
import { Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';

const OrderForm = ({ onSuccess, onCancel }) => {
  const [type, setType] = useState('sale');
  const [items, setItems] = useState([{ product: null, quantity: 1, search: '', results: [] }]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const searchProducts = async (index, query) => {
    if (!query || query.length < 2) {
      const newItems = [...items];
      newItems[index].results = [];
      setItems(newItems);
      return;
    }
    try {
      const res = await productsAPI.getAll({ search: query, limit: 5 });
      const newItems = [...items];
      newItems[index].results = res.data.data;
      setItems(newItems);
    } catch {}
  };

  const selectProduct = (index, product) => {
    const newItems = [...items];
    newItems[index].product = product;
    newItems[index].search = product.name;
    newItems[index].results = [];
    setItems(newItems);
  };

  const updateQuantity = (index, qty) => {
    const newItems = [...items];
    newItems[index].quantity = parseInt(qty) || 1;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product: null, quantity: 1, search: '', results: [] }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getTotal = () => {
    return items.reduce((sum, item) => {
      if (!item.product) return sum;
      const price = type === 'sale' ? item.product.price.selling : item.product.price.cost;
      return sum + price * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.product);
    if (validItems.length === 0) {
      toast.error('Add at least one product');
      return;
    }
    setLoading(true);
    try {
      await ordersAPI.create({
        type,
        items: validItems.map((i) => ({ product: i.product._id, quantity: i.quantity })),
        customer,
        notes,
      });
      toast.success('Order created successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order type */}
      <div>
        <label className="label">Order Type</label>
        <div className="grid grid-cols-3 gap-2">
          {['sale', 'purchase', 'return'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-2 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                type === t
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Products</label>
          <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <Plus size={13} /> Add item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-8 text-sm"
                    placeholder="Search product..."
                    value={item.search}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].search = e.target.value;
                      newItems[index].product = null;
                      setItems(newItems);
                      searchProducts(index, e.target.value);
                    }}
                  />
                </div>
                {item.results.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {item.results.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => selectProduct(index, p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{p.sku} — Stock: {p.stock.current}</span>
                      </button>
                    ))}
                  </div>
                )}
                {item.product && (
                  <p className="text-xs text-gray-500 mt-1">
                    Price: {formatCurrency(type === 'sale' ? item.product.price.selling : item.product.price.cost)} | Stock: {item.product.stock.current}
                  </p>
                )}
              </div>

              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateQuantity(index, e.target.value)}
                className="input w-20 text-sm"
                placeholder="Qty"
              />

              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:text-red-600 mt-0.5">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(getTotal())}</span>
      </div>

      {/* Customer info */}
      {type === 'sale' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Info (Optional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className="input text-sm" placeholder="Customer name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <input type="email" className="input text-sm" placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            <input className="input text-sm" placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
        </div>
      )}

      <div>
        <label className="label">Notes</label>
        <textarea className="input resize-none text-sm" rows={2} placeholder="Order notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Creating...' : 'Create Order'}
        </button>
      </div>
    </form>
  );
};

export default OrderForm;
