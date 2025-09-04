import React from 'react';
import { Transaction } from '../types';
import { XIcon } from './icons';

interface RecordDetailModalProps {
  recordName: string;
  transactions: Transaction[];
  onClose: () => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ recordName, transactions, onClose }) => {
  if (transactions.length === 0) {
    return null;
  }
  
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">交易详情</h3>
            <p className="text-sm text-gray-500 truncate" title={recordName}>名称: {recordName}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="关闭"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {transactions.length > 0 ? (
            <ul className="space-y-3">
              {transactions.map(t => (
                <li key={t.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-700">{t.date.replace('T', ' ')}</p>
                    {t.location && <p className="text-xs text-gray-500">{t.location}</p>}
                  </div>
                  <p className="font-mono font-semibold text-gray-800">¥{t.amount.toFixed(2)}</p>
                </li>
              ))}
            </ul>
          ) : (
             <p className="text-center text-gray-500 py-8">无相关记录</p>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 rounded-b-xl flex justify-between items-center">
            <span className="font-semibold text-gray-800">总计</span>
            <span className="font-mono font-bold text-xl text-gray-900">¥{totalAmount.toFixed(2)}</span>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
