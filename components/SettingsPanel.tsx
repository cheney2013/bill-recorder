import React, { useRef, useState } from 'react';
import { Transaction, NewTransaction, Category } from '../types';

interface SettingsPanelProps {
  transactions: Transaction[];
  onImport: (items: any[]) => void;
  onClearAll: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ transactions, onImport, onClearAll }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(transactions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `transactions-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('已导出为 JSON 文件。');
      setError(null);
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e);
      setError(`导出失败：${msg}`);
      setMessage(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error('JSON 须为数组');
      onImport(json);
      setMessage(`已导入 ${json.length} 条记录。`);
      setError(null);
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e);
      setError(`导入失败：${msg}`);
      setMessage(null);
    } finally {
      e.target.value = '';
    }
  };

  const handleClear = () => {
    if (confirm('确定要清空所有记录吗？此操作不可撤销。')) {
      onClearAll();
      setMessage('已清空所有记录。');
      setError(null);
    }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">设置</h2>

      {message && (
        <div className="mb-3 text-sm text-green-700 bg-green-100 border border-green-300 rounded-md px-3 py-2">{message}</div>
      )}
      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">备份数据</h3>
          <p className="text-sm text-gray-500 mb-3">将当前所有账单记录导出为 JSON 文件。</p>
          <button onClick={handleExport} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">导出 JSON</button>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">恢复数据</h3>
          <p className="text-sm text-gray-500 mb-3">从 JSON 文件导入记录，自动去重。</p>
          <input type="file" accept="application/json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button onClick={handleImportClick} className="w-full bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-900">导入 JSON</button>
        </div>
      </div>

      <div className="mt-6 p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="font-medium text-red-800 mb-2">危险操作</h3>
        <p className="text-sm text-red-700 mb-3">清空本地的所有账单记录。</p>
        <button onClick={handleClear} className="w-full bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">清空所有记录</button>
      </div>
    </div>
  );
};
