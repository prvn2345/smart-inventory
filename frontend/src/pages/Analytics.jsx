import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { analyticsAPI, reportsAPI, retailAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Download, TrendingUp, BarChart3, Store, Globe, CloudSun, Tag } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatCurrencyCompact, CURRENCY_SYMBOL } from '../utils/currency';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const CATEGORY_COLORS = {
  Groceries: '#10b981', Toys: '#f59e0b', Electronics: '#3b82f6',
  Furniture: '#8b5cf6', Clothing: '#ef4444',
};

const Analytics = () => {
  const { isDark } = useTheme();
  const [salesData, setSalesData] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const [seasonalData, setSeasonalData] = useState(null);
  const [demandVsActual, setDemandVsActual] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => {
    retailAPI.getStores().then((r) => setStores(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [salesRes, distRes, topRes, storeRes, regionRes, seasonRes, demandRes] = await Promise.all([
          analyticsAPI.getSales({ period, storeId: selectedStore, category: selectedCategory }),
          analyticsAPI.getInventoryDistribution(),
          analyticsAPI.getTopProducts({ limit: 10, storeId: selectedStore }),
          analyticsAPI.getByStore(),
          analyticsAPI.getByRegion(),
          analyticsAPI.getSeasonal(),
          analyticsAPI.getDemandVsActual({ storeId: selectedStore }),
        ]);
        setSalesData(salesRes.data.data);
        setDistribution(distRes.data.data);
        setTopProducts(topRes.data.data);
        setStoreData(storeRes.data.data);
        setRegionData(regionRes.data.data);
        setSeasonalData(seasonRes.data.data);
        setDemandVsActual(demandRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [period, selectedStore, selectedCategory]);

  const chartSalesData = salesData.slice(-30).map((d) => ({
    name: period === 'daily' ? `${d._id.month}/${d._id.day}` :
          period === 'weekly' ? `W${d._id.week}` : `${d._id.year}/${d._id.month}`,
    unitsSold: d.unitsSold || 0,
    unitsOrdered: d.unitsOrdered || 0,
    revenue: parseFloat((d.revenue || 0).toFixed(0)),
    forecast: parseFloat((d.avgDemandForecast || 0).toFixed(1)),
  }));

  const demandChartData = demandVsActual.slice(-60).map((d) => ({
    name: `${d._id.month}/${d._id.day}`,
    actual: d.actualSold || 0,
    forecast: parseFloat((d.demandForecast || 0).toFixed(1)),
  }));

  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '8px',
    color: isDark ? '#f9fafb' : '#111827',
  };

  const downloadReport = async (type) => {
    setExporting(type);
    try {
      let res, filename;
      if (type === 'pdf') { res = await reportsAPI.inventoryPDF(); filename = 'inventory_report.pdf'; }
      else { res = await reportsAPI.inventoryExcel(); filename = 'inventory_report.xlsx'; }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} downloaded`);
    } catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading analytics..." />;

  const tabs = [
    { id: 'sales', label: 'Sales Trends', icon: TrendingUp },
    { id: 'demand', label: 'Demand vs Actual', icon: BarChart3 },
    { id: 'stores', label: 'By Store', icon: Store },
    { id: 'regions', label: 'By Region', icon: Globe },
    { id: 'seasonal', label: 'Seasonal', icon: CloudSun },
    { id: 'products', label: 'Top Products', icon: Tag },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Retail dataset insights — 73,100 records · 2022–2024</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadReport('pdf')} disabled={!!exporting} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} /> {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
          </button>
          <button onClick={() => downloadReport('excel')} disabled={!!exporting} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} /> {exporting === 'excel' ? 'Exporting...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex gap-1">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {p}
            </button>
          ))}
        </div>
        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="input w-36 text-sm py-1.5">
          <option value="all">All Stores</option>
          {stores.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input w-40 text-sm py-1.5">
          <option value="all">All Categories</option>
          {['Groceries', 'Toys', 'Electronics', 'Furniture', 'Clothing'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Sales Trends ── */}
      {activeTab === 'sales' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Units Sold & Revenue Over Time</h2>
            {chartSalesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartSalesData}>
                  <defs>
                    <linearGradient id="gSold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOrdered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="unitsSold" name="Units Sold" stroke="#3b82f6" strokeWidth={2} fill="url(#gSold)" />
                  <Area type="monotone" dataKey="unitsOrdered" name="Units Ordered" stroke="#10b981" strokeWidth={2} fill="url(#gOrdered)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-gray-400">No data</div>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartSalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(v, 0), 'Revenue']} />
                  <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Inventory by Category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={distribution} cx="50%" cy="50%" outerRadius={80} dataKey="totalStock" nameKey="_id" paddingAngle={3}>
                    {distribution.map((d, i) => <Cell key={i} fill={CATEGORY_COLORS[d._id] || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [v.toLocaleString(), p.payload._id]} />
                  <Legend formatter={(v, e) => <span style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 11 }}>{e.payload._id}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Demand vs Actual ── */}
      {activeTab === 'demand' && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Demand Forecast vs Actual Sales (Last 60 Days)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Comparing the dataset's built-in demand forecast against actual units sold
          </p>
          {demandChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={demandChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="actual" name="Actual Units Sold" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="forecast" name="Demand Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-[320px] flex items-center justify-center text-gray-400">No data</div>}
        </div>
      )}

      {/* ── By Store ── */}
      {activeTab === 'stores' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Store Performance Comparison (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={storeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="_id" tick={{ fontSize: 12, fill: axisColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [n === 'totalRevenue' ? formatCurrency(v, 0) : v.toLocaleString(), n === 'totalRevenue' ? 'Revenue' : n === 'totalUnitsSold' ? 'Units Sold' : 'Units Ordered']} />
                <Legend />
                <Bar dataKey="totalUnitsSold" name="Units Sold" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="totalOrdered" name="Units Ordered" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="totalRevenue" name="Revenue ($)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Store</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Units Sold</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Units Ordered</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Avg Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {storeData.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{s._id}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s.totalUnitsSold?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s.totalOrdered?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(s.totalRevenue, 0)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{s.avgInventory?.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── By Region ── */}
      {activeTab === 'regions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue by Region</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={regionData} cx="50%" cy="50%" outerRadius={100} dataKey="totalRevenue" nameKey="_id" paddingAngle={3} label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}>
                  {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [formatCurrency(v, 0), p.payload._id]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Units Sold by Region</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={regionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} />
                <YAxis type="category" dataKey="_id" width={60} tick={{ fontSize: 12, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="totalUnitsSold" name="Units Sold" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Seasonal ── */}
      {activeTab === 'seasonal' && seasonalData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Tag size={16} className="text-purple-500" /> Sales by Season
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seasonalData.seasonData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: axisColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="totalSold" name="Units Sold" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CloudSun size={16} className="text-blue-500" /> Sales by Weather
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seasonalData.weatherData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: axisColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="totalSold" name="Units Sold" fill="#06b6d4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Holiday vs Regular Sales</h2>
            <div className="space-y-4 mt-6">
              {seasonalData.holidayData.map((h) => (
                <div key={String(h._id)} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">
                    {h._id ? '🎉 Holiday/Promo' : '📅 Regular Day'}
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{h.totalSold?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">units sold</p>
                  <p className="text-xs text-gray-400 mt-1">Avg forecast: {h.avgForecast?.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Products ── */}
      {activeTab === 'products' && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top Products by Units Sold (Last 30 Days)</h2>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} />
                <YAxis type="category" dataKey="productName" width={160} tick={{ fontSize: 11, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [n === 'totalRevenue' ? formatCurrency(v, 0) : v.toLocaleString(), n === 'totalRevenue' ? 'Revenue' : 'Units Sold']} />
                <Legend />
                <Bar dataKey="totalUnitsSold" name="Units Sold" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                <Bar dataKey="totalRevenue" name="Revenue ($)" fill="#10b981" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[350px] flex items-center justify-center text-gray-400">No data</div>}
        </div>
      )}
    </div>
  );
};

export default Analytics;
