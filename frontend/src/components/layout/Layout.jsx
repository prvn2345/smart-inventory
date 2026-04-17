import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '../../hooks/useSocket';
import { notificationsAPI } from '../../services/api';
import { useEffect } from 'react';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  useEffect(() => {
    notificationsAPI.getAll({ limit: 1 })
      .then((res) => setUnreadCount(res.data.unreadCount || 0))
      .catch(() => {});
  }, []);

  const handleNotification = useCallback((notification) => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  useSocket(handleNotification, null);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          unreadCount={unreadCount}
          onUnreadCountChange={setUnreadCount}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet context={{ setUnreadCount }} />
        </main>
      </div>
    </div>
  );
};

export default Layout;
