import React from 'react';
import { DeletedItem, Transaction } from '../types';
import { CategoryBadge } from './TransactionList';
import { ChevronLeftIcon } from './icons';

interface TrashViewProps {
  items: DeletedItem[];
  onBack: () => void;
  onRestore: (tx: Transaction) => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ items, onBack, onRestore }) => {
  return (
    <div className="md:bg-white md:p-6 p-0 md:rounded-xl md:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 rounded-md border border-gray-200 hover:bg-gray-50" title="返回设置">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">回收站（保留3天）</h2>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="font-semibold">暂无可还原的记录</p>
          <p className="mt-1 text-sm">删除记录将在3天后自动清除。</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map(({ tx, deletedAt }) => (
            <li key={`${tx.id}-${deletedAt}`} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-nowrap">
                  <p className="font-medium text-gray-900 truncate min-w-0 flex-1" title={tx.name}>{tx.name}</p>
                  <CategoryBadge category={tx.category} />
                </div>
                {tx.location && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate" title={tx.location}>{tx.location}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">原日期：{tx.date.replace('T', ' ')}</p>
                <p className="text-xs text-gray-400">删除时间：{new Date(deletedAt).toLocaleString()}</p>
              </div>
              <div className="shrink-0 text-right flex flex-col items-end gap-2">
                <span className="font-mono font-semibold text-gray-900">¥{tx.amount.toFixed(2)}</span>
                <button
                  onClick={() => onRestore(tx)}
                  className="text-green-700 hover:text-green-800 p-1.5 rounded-md active:bg-green-50 border border-green-200"
                  title="还原"
                >
                  还原
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
