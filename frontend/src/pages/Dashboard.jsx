import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ShoppingCart, AlertTriangle, DollarSign,
  TrendingUp, Activity, ArrowRight, RefreshCw, Store,
  BarChart2, CloudRain, Tag,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import { analyticsAPI } from '../services/api';
import StatCard from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatCurrencyCompact } from '../utils/currency';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CATEGORY_COLORS = {
  Groceries: '#10b981',
  Toys: '#f59e0b',
  Electronics: '#3b82f6',
  Furniture: '#8b5cf6',
  Clothing: '#ef4444',
};

const Dashboard = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [seasonalData, setSeasonalData] = useState(null);
  const [stockStatus, setStockStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, salesRes, distRes, storeRes, seasonRes, statusRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getSales({ period: 'daily' }),
        analyticsAPI.getInventoryDistribution(),
        analyticsAPI.getByStore(),
        analyticsAPI.getSeasonal(),
        analyticsAPI.getStockStatus(),
      ]);
      setData(dashRes.data.data);
      setSalesData(salesRes.data.data);
      setDistribution(distRes.data.data);
      setStoreData(storeRes.data.data);
      setSeasonalData(seasonRes.data.data);
      setStockStatus(statusRes.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Format sales chart data
  const chartData = salesData.slice(-30).map((d) => ({
    name: `${d._id.month}/${d._id.day}`,
    unitsSold: d.unitsSold,
    revenue: parseFloat((d.revenue || 0).toFixed(0)),
    forecast: parseFloat((d.avgDemandForecast || 0).toFixed(0)),
  }));

  const pieData = distribution.map((d) => ({
    name: d._id,
    value: d.count,
    stock: d.totalStock,
    value2: d.totalValue,
  }));

  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '8px',
    color: isDark ? '#f9fafb' : '#111827',
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  const rs = data?.retailStats || {};
  const latestDate = data?.latestDataDate ? new Date(data.latestDataDate).toLocaleDateString() : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Retail Inventory Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Dataset: 5 Stores · 20 Products · 5 Categories · Latest: {latestDate}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={data?.totalProducts || 0}
          subtitle="Across all categories"
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Units Sold (30d)"
          value={(rs.totalUnitsSold || 0).toLocaleString()}
          subtitle="All stores combined"
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Low Stock Items"
          value={data?.lowStockCount || 0}
          subtitle="Below minimum threshold"
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrencyCompact(data?.inventoryValue || 0)}
          subtitle="Current stock value"
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Demand Forecast"
          value={(rs.avgDemandForecast || 0).toFixed(1)}
          subtitle="Units per day (30d avg)"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Units Ordered (30d)"
          value={(rs.totalOrdered || 0).toLocaleString()}
          subtitle="Replenishment orders"
          icon={BarChart2}
          color="green"
        />
        <StatCard
          title="Out of Stock"
          value={data?.outOfStockCount || 0}
          subtitle="Products at zero"
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Active Stores"
          value={5}
          subtitle="S001 – S005"
          icon={Store}
          color="purple"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily sales trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Daily Units Sold vs Demand Forecast</h2>
            <Link to="/analytics" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Full analytics <ArrowRight size={13} />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="unitsSold" name="Units Sold" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSold)" />
                <Area type="monotone" dataKey="forecast" name="Demand Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" fill="url(#colorForecast)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data available</div>
          )}
        </div>

        {/* Category distribution */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Products by Category</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val, name, props) => [val, props.payload.name]} />
                <Legend formatter={(v, e) => <span style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 11 }}>{e.payload.name}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store performance */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Store size={16} className="text-blue-500" />
            Store Performance (Last 30 Days)
          </h2>
          {storeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={storeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: axisColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val, name) => [name === 'totalRevenue' ? formatCurrency(val, 0) : val, name === 'totalRevenue' ? 'Revenue' : 'Units Sold']} />
                <Legend />
                <Bar dataKey="totalUnitsSold" name="Units Sold" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="totalRevenue" name="Revenue ($)" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

        {/* Seasonal + Stock status */}
        <div className="space-y-4">
          {/* Stock status */}
          {stockStatus && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Stock Status</h2>
              <div className="space-y-2.5">
                {[
                  { label: 'In Stock', value: stockStatus.ok, color: 'bg-green-500', total: data?.totalProducts },
                  { label: 'Low Stock', value: stockStatus.low, color: 'bg-yellow-500', total: data?.totalProducts },
                  { label: 'Out of Stock', value: stockStatus.out_of_stock, color: 'bg-red-500', total: data?.totalProducts },
                ].map(({ label, value, color, total }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{label}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: total ? `${(value / total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonal sales */}
          {seasonalData?.seasonData?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Tag size={15} className="text-purple-500" />
                Sales by Season
              </h2>
              <div className="space-y-2">
                {seasonalData.seasonData.map((s) => (
                  <div key={s._id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{s._id || 'Unknown'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{s.totalSold?.toLocaleString()} units</span>
                      <span className="text-xs text-gray-400">forecast: {s.avgForecast?.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity size={16} className="text-gray-400" />
            Recent Inventory Activity
          </h2>
        </div>
        <div className="space-y-2">
          {data?.recentActivity?.length > 0 ? (
            data.recentActivity.slice(0, 8).map((log) => (
              <div key={log._id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.action === 'stock_in' ? 'bg-green-500' :
                    log.action === 'stock_out' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="font-medium text-gray-900 dark:text-white">{log.productName}</span>
                  <span className="text-gray-500 dark:text-gray-400 capitalize">{log.action?.replace('_', ' ')}</span>
                  <span className="text-gray-500">({log.quantity} units)</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
