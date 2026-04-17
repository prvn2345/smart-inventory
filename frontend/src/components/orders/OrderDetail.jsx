import { Package } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const OrderDetail = ({ order }) => {
  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500">Order Number</p>
          <p className="font-mono font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500">Status</p>
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize mt-0.5 ${statusColors[order.status]}`}>
            {order.status}
          </span>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500">Type</p>
          <p className="font-medium text-gray-900 dark:text-white capitalize">{order.type}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500">Date</p>
          <p className="font-medium text-gray-900 dark:text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer */}
      {order.customer?.name && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 mb-1">Customer</p>
          <p className="font-medium text-gray-900 dark:text-white">{order.customer.name}</p>
          {order.customer.email && <p className="text-xs text-gray-500">{order.customer.email}</p>}
          {order.customer.phone && <p className="text-xs text-gray-500">{order.customer.phone}</p>}
        </div>
      )}

      {/* Items */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Order Items</p>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Package size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.productName}</p>
                  <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(item.totalPrice)}</p>
                <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <span className="font-semibold text-gray-900 dark:text-white">Total</span>
        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(order.totalAmount)}</span>
      </div>

      {order.notes && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{order.notes}</p>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
