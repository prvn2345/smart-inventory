import { useState, useRef } from 'react';
import { uploadAPI } from '../services/api';
import { Upload as UploadIcon, FileText, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Only CSV and Excel files are allowed');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadAPI.bulkUpload(formData);
      setResult(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await uploadAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Upload</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Import products from CSV or Excel files</p>
      </div>

      {/* Template download */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">Download Template</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Use our CSV template to format your data correctly</p>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={14} />
          Template CSV
        </button>
      </div>

      {/* Upload area */}
      <div className="card p-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
          <UploadIcon size={40} className={`mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          {file ? (
            <div>
              <p className="font-medium text-gray-900 dark:text-white flex items-center justify-center gap-2">
                <FileText size={16} className="text-blue-500" />
                {file.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Drop your file here or click to browse</p>
              <p className="text-sm text-gray-400 mt-1">Supports CSV, XLSX, XLS (max 10MB)</p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 flex gap-3">
            <button onClick={() => { setFile(null); setResult(null); }} className="btn-secondary flex-1">
              Clear
            </button>
            <button onClick={handleUpload} disabled={uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UploadIcon size={15} />
              )}
              {uploading ? 'Uploading...' : 'Upload Products'}
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Upload Results</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <CheckCircle size={18} className="text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="font-bold text-green-700 dark:text-green-400">{result.created}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <CheckCircle size={18} className="text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Updated</p>
                <p className="font-bold text-blue-700 dark:text-blue-400">{result.updated}</p>
              </div>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1 mb-2">
                <AlertCircle size={14} />
                {result.errors.length} error(s)
              </p>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">CSV Format Guide</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Column</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Required</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                ['name', 'Yes', 'Wireless Headphones'],
                ['sku', 'Yes', 'ELEC-001'],
                ['category', 'No', 'Electronics'],
                ['cost_price', 'Yes', '25.00'],
                ['selling_price', 'Yes', '59.99'],
                ['current_stock', 'No', '100'],
                ['min_stock', 'No', '10'],
                ['unit', 'No', 'pcs'],
                ['supplier_name', 'No', 'TechSupply Co'],
              ].map(([col, req, ex]) => (
                <tr key={col}>
                  <td className="py-2 font-mono text-xs text-blue-600 dark:text-blue-400">{col}</td>
                  <td className="py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${req === 'Yes' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {req}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Upload;
