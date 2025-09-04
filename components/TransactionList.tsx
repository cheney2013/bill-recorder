import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { SwipeToDelete } from './SwipeToDelete';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';

interface TransactionListProps {
  transactions: Transaction[];
  onRecordClick: (recordName: string) => void;
  onAddClick: () => void;
  onEditClick: (transaction: Transaction) => void;
  onDeleteClick: (transactionId: string) => void;
}

export const CategoryBadge: React.FC<{ category: Transaction['category'] }> = ({ category }) => (
  <span
    className="px-2 py-1 text-xs font-semibold leading-tight rounded-full whitespace-nowrap max-w-[8rem] truncate inline-flex"
    style={{ 
      backgroundColor: `${CATEGORY_COLORS[category]}33`, // Add alpha for background
      color: CATEGORY_COLORS[category]
    }}
    title={category}
  >
    {category}
  </span>
);


type FlatItem =
  | { type: 'header'; key: string; month: string }
  | { type: 'item'; key: string; tx: Transaction };

const formatMonthLabel = (ym: string) => {
  try {
    return new Date(ym + '-01T00:00:00').toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  } catch {
    return ym;
  }
};

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onRecordClick, onAddClick, onEditClick, onDeleteClick }) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return transactions;
    return transactions.filter(t => {
      const name = (t.name || '').toLowerCase();
      const loc = (t.location || '').toLowerCase();
      const cat = String(t.category || '').toLowerCase();
      const date = (t.date || '').toLowerCase();
      const amount = String(t.amount || '');
      return (
        name.includes(q) ||
        loc.includes(q) ||
        cat.includes(q) ||
        date.includes(q) ||
        amount.includes(q)
      );
    });
  }, [transactions, q]);
  const items = useMemo<FlatItem[]>(() => {
    // Group by YYYY-MM, keep original order (assumed desc by date)
    const groups = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const ym = (t.date || '').slice(0, 7);
      if (!groups.has(ym)) groups.set(ym, []);
      groups.get(ym)!.push(t);
    }
    // Sort months desc
    const sortedMonths = Array.from(groups.keys()).sort((a, b) => (a < b ? 1 : -1));
    const flat: FlatItem[] = [];
    for (const ym of sortedMonths) {
      flat.push({ type: 'header', key: `h-${ym}`, month: ym });
      for (const t of groups.get(ym)!) {
        flat.push({ type: 'item', key: t.id, tx: t });
      }
    }
    return flat;
  }, [filtered]);

  const { monthOrder, monthGroups } = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const ym = (t.date || '').slice(0, 7);
      if (!groups.has(ym)) groups.set(ym, []);
      groups.get(ym)!.push(t);
    }
    const months = Array.from(groups.keys()).sort((a, b) => (a < b ? 1 : -1));
    return { monthOrder: months, monthGroups: groups };
  }, [filtered]);

  const getMobileItemSize = (index: number) => {
    const it = items[index];
    if (it.type === 'header') return 36; // header row height
    // Card height tuned to avoid overlap in most cases
    return 100;
  };

  const listRef = useRef<any>(null);

  useEffect(() => {
    // Reset cached measurements when items change to prevent stale rows/headers
    listRef.current?.resetAfterIndex?.(0, true);
  }, [items]);

  const RowMobile = ({ index, style }: ListChildComponentProps) => {
    const it = items[index];
    if (it.type === 'header') {
      return (
        <div style={style} className="px-0">
          <div className="text-base font-semibold text-gray-700 px-1 py-2 text-center">{formatMonthLabel(it.month)}</div>
        </div>
      );
    }
    const t = it.tx;
    return (
      <div style={style} className="px-0">
        <SwipeToDelete className="rounded-lg border border-gray-200 p-3 transition-colors bg-white" onDelete={() => onDeleteClick(t.id)}>
          <div
            onClick={() => onRecordClick(t.name)}
            role="button"
            aria-label={`查看 ${t.name} 的记录`}
          >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate max-w-[12rem]" title={t.name}>{t.name}</p>
                <CategoryBadge category={t.category} />
              </div>
              {t.location && (
                <p className="text-xs text-gray-500 mt-1 truncate" title={t.location}>{t.location}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{t.date.replace('T', ' ')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-mono font-semibold text-gray-900">¥{t.amount.toFixed(2)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onEditClick(t); }}
                title="编辑"
                className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md active:bg-blue-50"
                aria-label={`编辑 ${t.name}`}
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          </div>
        </SwipeToDelete>
      </div>
    );
  };
  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-md h-full">
      <div className="flex items-center justify-between gap-3 mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">交易全记录</h2>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称/地点/分类/日期/金额"
            className="block w-40 sm:w-56 md:w-72 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
          onClick={onAddClick}
          className="shrink-0 bg-blue-600 text-white font-semibold py-2 px-3 md:px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="hidden sm:inline">新增记录</span>
          <span className="sm:hidden">新增</span>
          </button>
        </div>
      </div>

      {/* Mobile card list with grouping + virtualization */}
  <div className="md:hidden">
        {items.length > 0 ? (
          <div>
            <List
              ref={listRef}
              height={Math.max(420, Math.round(window.innerHeight - 220))}
              itemCount={items.length}
              itemSize={getMobileItemSize}
              itemKey={(index) => items[index].key}
              width={'100%'}
              className="overflow-auto"
            >
              {RowMobile}
            </List>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p className="font-semibold">暂无记录</p>
            <p className="mt-1 text-sm">上传账单或手动新增一条记录。</p>
          </div>
        )}
      </div>

      {/* Desktop/tablet table */}
  <div className="hidden md:block overflow-x-auto">
  {filtered.length > 0 ? (
      <table className="w-full text-sm text-left text-gray-500 table-fixed">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
              <tr>
        <th scope="col" className="px-6 py-3 w-[45%]">名称</th>
        <th scope="col" className="px-6 py-3 w-28">分类</th>
        <th scope="col" className="px-6 py-3 w-44">日期</th>
        <th scope="col" className="px-6 py-3 text-right w-32">金额</th>
        <th scope="col" className="px-6 py-3 text-center w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {monthOrder.map((ym) => (
                monthGroups.get(ym) && monthGroups.get(ym)!.length > 0 ? (
                <React.Fragment key={`grp-${ym}`}>
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-6 py-3 text-sm md:text-base font-semibold text-gray-700 text-center">{formatMonthLabel(ym)}</td>
                  </tr>
                  {monthGroups.get(ym)!.map((t) => (
                    <tr
                      key={t.id}
                      className="bg-white border-b group transition-colors hover:bg-gray-50"
                    >
                      <td
                        className="px-6 py-4 font-medium text-gray-900 cursor-pointer align-top"
                        onClick={() => onRecordClick(t.name)}
                        title="点击查看此项目的所有记录"
                      >
                        <div className="min-w-0 max-w-full">
                          <div className="truncate" title={t.name}>{t.name}</div>
                          {t.location && <div className="text-xs text-gray-500 truncate" title={t.location}>{t.location}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => onRecordClick(t.name)}><CategoryBadge category={t.category} /></td>
                      <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onRecordClick(t.name)}>{t.date.replace('T', ' ')}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900 cursor-pointer" onClick={() => onRecordClick(t.name)}>
                        ¥{t.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); onEditClick(t); }} title="编辑" className="text-blue-500 hover:text-blue-700 p-1">
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteClick(t.id); }} title="删除" className="text-red-500 hover:text-red-700 p-1">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
                ) : null
              ))}
            </tbody>
          </table>
    ) : (
          <div className="text-center py-12 text-gray-500">
      <p className="font-semibold">未找到匹配的记录</p>
      <p className="mt-1 text-sm">换个关键词试试，或清空搜索。</p>
          </div>
        )}
      </div>
    </div>
  );
};
