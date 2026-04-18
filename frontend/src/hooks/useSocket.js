import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socketInstance = null;

export const useSocket = (onNotification, onStockUpdate) => {
  const handlersRef = useRef({ onNotification, onStockUpdate });

  useEffect(() => {
    handlersRef.current = { onNotification, onStockUpdate };
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!socketInstance) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.trim() !== ''
        ? import.meta.env.VITE_SOCKET_URL
        : 'http://localhost:5000';

      socketInstance = io(socketUrl, {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }

    const socket = socketInstance;

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('notification', (notification) => {
      handlersRef.current.onNotification?.(notification);

      // Show toast for important notifications
      if (notification.severity === 'error') {
        toast.error(notification.title, { duration: 5000 });
      } else if (notification.severity === 'warning') {
        toast(notification.title, { icon: '⚠️', duration: 4000 });
      } else if (notification.severity === 'success') {
        toast.success(notification.title, { duration: 3000 });
      }
    });

    socket.on('stock_update', (data) => {
      handlersRef.current.onStockUpdate?.(data);
    });

    socket.on('low_stock_alert', (products) => {
      if (products.length > 0) {
        toast(`${products.length} product(s) are low on stock`, { icon: '📦', duration: 4000 });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    return () => {
      socket.off('notification');
      socket.off('stock_update');
      socket.off('low_stock_alert');
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketInstance?.emit(event, data);
  }, []);

  return { emit };
};
