let io;

const setSocketIO = (socketIO) => {
  io = socketIO;
};

const getSocketIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

/**
 * Emit a notification to all connected clients
 */
const emitNotification = (notification) => {
  if (io) {
    io.emit('notification', notification);
  }
};

/**
 * Emit a stock update event
 */
const emitStockUpdate = (productData) => {
  if (io) {
    io.emit('stock_update', productData);
  }
};

/**
 * Emit a low stock alert
 */
const emitLowStockAlert = (products) => {
  if (io) {
    io.emit('low_stock_alert', products);
  }
};

module.exports = { setSocketIO, getSocketIO, emitNotification, emitStockUpdate, emitLowStockAlert };
