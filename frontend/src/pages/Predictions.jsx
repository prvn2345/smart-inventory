import { useState, useEffect } from 'react';
import { predictionsAPI, productsAPI } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { TrendingUp, RefreshCw, Zap } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const Predictions = () => {
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [algorithm, setAlgorithm] = useState('linear_regression');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [allPredictions, setAllPredictions] = useState([]);

  useEffect(() => {
    productsAPI.getAll({ limit: 100 }).then((res) => setProducts(res.data.data)).catch(() => {});
    predictionsAPI.getAll().then((res) => setAllPredictions(res.data.data)).catch(() => {});
  }, []);

  const loadPrediction = async (productId) => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await predictionsAPI.getForProduct(productId);
      setPrediction(res.data.data);
    } catch {
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const generatePrediction = async () => {
    if (!selectedProduct) {
      toast.error('Select a product first');
      return;
    }
    setGenerating(true);
    try {
      const res = await predictionsAPI.generate(selectedProduct, { algorithm, daysAhead: 30 });
      setPrediction(res.data.data);
      toast.success('Prediction generated!');
      // Refresh all predictions list
      predictionsAPI.getAll().then((r) => setAllPredictions(r.data.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate prediction');
    } finally {
      setGenerating(false);
    }
  };

  const handleProductChange = (id) => {
    setSelectedProduct(id);
    setPrediction(null);
    if (id) loadPrediction(id);
  };

  // Build chart data: historical + predictions
  const chartData = prediction ? [
    ...prediction.historicalData.slice(-14).map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: d.quantity,
      predicted: null,
    })),
    ...prediction.predictions.slice(0, 14).map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: null,
      predicted: d.predictedQuantity,
    })),
  ] : [];

  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#374151' : '#f3f4f6';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap size={24} className="text-yellow-500" />
          AI Demand Predictions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          ML-powered stock demand forecasting using historical sales data
        </p>
      </div>

      {/* Controls */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedProduct}
            onChange={(e) => handleProductChange(e.target.value)}
            className="input flex-1"
          >
            <option value="">Select a product...</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
            ))}
          </select>

          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="input w-full sm:w-56">
            <option value="linear_regression">Linear Regression</option>
            <option value="moving_average">Moving Average</option>
            <option value="exponential_smoothing">Exponential Smoothing</option>
          </select>

          <button
            onClick={generatePrediction}
            disabled={generating || !selectedProduct}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            {generating ? 'Generating...' : 'Generate Prediction'}
          </button>
        </div>
      </div>

      {/* Prediction result */}
      {loading ? (
        <LoadingSpinner text="Loading prediction..." />
      ) : prediction ? (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Algorithm', value: prediction.algorithm.replace(/_/g, ' '), color: 'text-blue-600' },
              { label: 'Accuracy', value: `${prediction.accuracy.toFixed(1)}%`, color: 'text-green-600' },
              { label: 'Recommended Reorder', value: `${prediction.recommendedReorder} units`, color: 'text-orange-600' },
              { label: 'Generated', value: new Date(prediction.generatedAt).toLocaleDateString(), color: 'text-gray-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`font-semibold mt-1 capitalize ${color} dark:opacity-90`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Demand Forecast — {prediction.productName}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip
                  contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '8px', color: isDark ? '#f9fafb' : '#111827' }}
                />
                <Legend />
                <ReferenceLine x={prediction.historicalData.slice(-14).length - 1} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'Today', fill: '#6b7280', fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" name="Historical Sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="predicted" name="Predicted Demand" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Prediction table */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Next 14 Days Forecast</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Predicted Demand</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {prediction.predictions.slice(0, 14).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 text-gray-700 dark:text-gray-300">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="py-2 font-semibold text-gray-900 dark:text-white">{p.predictedQuantity} units</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.confidence * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{(p.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : selectedProduct ? (
        <div className="card p-10 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No prediction yet. Click "Generate Prediction" to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Product Predictions</h2>
          {allPredictions.length === 0 ? (
            <div className="card p-10 text-center">
              <TrendingUp size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No predictions generated yet. Select a product above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allPredictions.map((pred) => (
                <div key={pred._id} className="card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleProductChange(pred.product?._id)}>
                  <p className="font-medium text-gray-900 dark:text-white truncate">{pred.productName}</p>
                  <p className="text-xs text-gray-400 font-mono">{pred.sku}</p>
                  <div className="mt-3 flex justify-between text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Reorder Qty</p>
                      <p className="font-semibold text-orange-600">{pred.recommendedReorder} units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Accuracy</p>
                      <p className="font-semibold text-green-600">{pred.accuracy.toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 capitalize">{pred.algorithm.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Predictions;
