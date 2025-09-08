import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { PlusIcon, PencilIcon, TrashIcon, BarsArrowDownIcon, FoodIcon, TransportIcon, ShoppingIcon, EntertainmentIcon, HomeIcon, MedicalIcon, EducationIcon, TransferIcon, OtherIcon } from './icons';
import { SwipeToDelete } from './SwipeToDelete';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';

interface TransactionListProps {
  resetToken?: number;
  transactions: Transaction[];
  onRecordClick: (recordName: string) => void;
  onAddClick: () => void;
  onEditClick: (transaction: Transaction) => void;
  onDeleteClick: (transactionId: string) => void;
  onBulkChangeCategory?: (ids: string[], category: Category) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const CatIcon: React.FC<{ cat: Category; className?: string }> = ({ cat, className }) => {
  const common = className || 'w-4 h-4';
  switch (cat) {
    case Category.Food: return <FoodIcon className={common} />;
    case Category.Transport: return <TransportIcon className={common} />;
    case Category.Shopping: return <ShoppingIcon className={common} />;
    case Category.Entertainment: return <EntertainmentIcon className={common} />;
    case Category.Home: return <HomeIcon className={common} />;
    case Category.Medical: return <MedicalIcon className={common} />;
    case Category.Education: return <EducationIcon className={common} />;
    case Category.Transfer: return <TransferIcon className={common} />;
    default: return <OtherIcon className={common} />;
  }
};

export const CategoryBadge: React.FC<{ category: Transaction['category'] }> = React.memo(({ category }) => (
  <span
    className="px-2 py-1 text-xs font-semibold leading-tight rounded-full whitespace-nowrap max-w-[9rem] truncate inline-flex items-center gap-1"
    style={{ 
      backgroundColor: `${CATEGORY_COLORS[category]}22`,
      color: CATEGORY_COLORS[category]
    }}
    title={category}
  >
    <CatIcon cat={category} className="w-5 h-5" />
    <span className="hidden sm:inline">{category}</span>
  </span>
));

export const LeadingCat: React.FC<{ category: Category }> = React.memo(({ category }) => (
  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-700 shrink-0">
    <CatIcon cat={category} className="w-6 h-6" />
  </span>
));


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

export const TransactionList: React.FC<TransactionListProps> = ({ resetToken, transactions, onRecordClick, onAddClick, onEditClick, onDeleteClick, onBulkChangeCategory, onBulkDelete }) => {
  const [query, setQuery] = useState('');
  const [sortByAddedTime, setSortByAddedTime] = useState(false);
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
    // Build the flat list once; include month headers when not sorting by added time
    if (!sortByAddedTime) {
      const groups = new Map<string, Transaction[]>();
      for (const t of filtered) {
        const ym = (t.date || '').slice(0, 7);
        if (!groups.has(ym)) groups.set(ym, []);
        groups.get(ym)!.push(t);
      }
      const sortedMonths = Array.from(groups.keys()).sort((a, b) => (a < b ? 1 : -1));
      const flat: FlatItem[] = [];
      for (const ym of sortedMonths) {
        flat.push({ type: 'header', key: `h-${ym}`, month: ym });
        for (const t of groups.get(ym)!) {
          flat.push({ type: 'item', key: t.id, tx: t });
        }
      }
      return flat;
    }
    // Sort by addedAt (desc) without month headers
    return filtered
      .slice()
      .sort((a, b) => {
        const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return tb - ta;
      })
      .map(tx => ({ type: 'item', key: tx.id, tx }));
  }, [filtered, sortByAddedTime]);

  const getMobileItemSize = (index: number) => {
    const it = items[index];
    if (it.type === 'header') return 36; // header row height
    // Card height tuned to avoid overlap in most cases
    return 100;
  };

  const listRef = useRef<any>(null);
  const desktopListRef = useRef<any>(null);
  // Containers to measure available heights for virtualized lists
  const mobileContainerRef = useRef<HTMLDivElement | null>(null);
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  const [mobileHeight, setMobileHeight] = useState(0);
  const [desktopHeight, setDesktopHeight] = useState(0);
  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Observe container sizes so List uses exact available height (no magic constants)
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const setup = (el: HTMLElement | null, set: (h: number) => void) => {
      if (!el) return;
      const update = () => set(el.clientHeight);
      update();
      const hasRO = typeof window !== 'undefined' && 'ResizeObserver' in window;
      if (hasRO) {
        const RO = (window as any).ResizeObserver;
        const ro = new RO(() => update());
        ro.observe(el);
        cleanups.push(() => ro.disconnect());
      } else {
        window.addEventListener('resize', update);
        cleanups.push(() => window.removeEventListener('resize', update));
      }
    };
    setup(mobileContainerRef.current, setMobileHeight);
    setup(desktopContainerRef.current, setDesktopHeight);
    return () => { cleanups.forEach(fn => fn()); };
    // Re-evaluate when layout-affecting state changes
  }, [items.length, selectMode]);

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleIds = useMemo(() => filtered.map(t => t.id), [filtered]);
  const toggleAll = () => {
    setSelectedIds(prev => {
      if (prev.size === allVisibleIds.length) return new Set();
      return new Set(allVisibleIds);
    });
  };
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const confirmBulk = (cat: Category) => {
    if (onBulkChangeCategory && selectedIds.size > 0) {
      onBulkChangeCategory(Array.from(selectedIds), cat);
    }
    setShowBulkModal(false);
    exitSelectMode();
  };
  const doBulkDelete = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      exitSelectMode();
    }
  };

  useEffect(() => {
    // Reset cached measurements when items change to prevent stale rows/headers
    listRef.current?.resetAfterIndex?.(0, true);
  desktopListRef.current?.resetAfterIndex?.(0, true);
  }, [items]);

  // Scroll to top on external reset (e.g., tab switch)
  useEffect(() => {
    try {
      const el: HTMLElement | undefined = listRef.current?._outerRef || listRef.current?._scrollingContainer;
      el?.scrollTo?.({ top: 0, behavior: 'auto' });
    } catch {}
    try {
      const el2: HTMLElement | undefined = desktopListRef.current?._outerRef || desktopListRef.current?._scrollingContainer;
      el2?.scrollTo?.({ top: 0, behavior: 'auto' });
    } catch {}
  }, [resetToken]);

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
    const handleRowClick = () => {
      if (selectMode) {
        toggleOne(t.id);
      } else {
        onRecordClick(t.name);
      }
    };
    return (
      <div style={style} className="px-0">
  <SwipeToDelete className="bg-white p-3 md:rounded-lg md:border md:border-gray-200 border-b border-gray-100 transition-colors rounded-none" onDelete={() => onDeleteClick(t.id)}>
          <div
            onClick={handleRowClick}
            role="button"
            aria-label={`查看 ${t.name} 的记录`}
          >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <LeadingCat category={t.category} />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate max-w-[12rem]" title={t.name}>{t.name}</p>
                <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                  <span className="hidden sm:inline">{t.date.replace('T', ' ')}</span>
                  {t.location && <span className="truncate" title={t.location}>{t.location}</span>}
                </div>
              </div>
              {t.location && (
                <></>
              )}
              {sortByAddedTime && t.addedAt && (
                <p className="text-xs text-gray-400 mt-1">添加于 {new Date(t.addedAt).toLocaleString()}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-mono font-semibold text-gray-900">¥{t.amount.toFixed(2)}</span>
              {!selectMode ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onEditClick(t); }}
                  title="编辑"
                  className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md active:bg-blue-50"
                  aria-label={`编辑 ${t.name}`}
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              ) : (
                selectedIds.has(t.id) ? (
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="inline-block w-8 h-8" aria-hidden="true"></span>
                )
              )}
            </div>
          </div>
          </div>
        </SwipeToDelete>
      </div>
    );
  };

  // Desktop virtualized row renderer (md+)
  const getDesktopItemSize = (index: number) => {
    const it = items[index];
    return it.type === 'header' ? 44 : 64;
  };

  const DesktopRow = ({ index, style }: ListChildComponentProps) => {
    const it = items[index];
    if (it.type === 'header') {
      return (
        <div style={style} className="bg-gray-50">
          <div className="px-6 py-3 text-sm md:text-base font-semibold text-gray-700 text-center">
            {formatMonthLabel(it.month)}
          </div>
        </div>
      );
    }
    const t = it.tx;
    return (
      <div style={style} className="bg-white border-b group transition-colors hover:bg-gray-50">
        <div className="grid grid-cols-[45%_7rem_11rem_8rem_7rem] items-center">
          <div
            className="px-6 py-3 font-medium text-gray-900 cursor-pointer align-top min-w-0"
            onClick={() => onRecordClick(t.name)}
            title="点击查看此项目的所有记录"
          >
            <div className="flex items-start gap-3 min-w-0">
              <LeadingCat category={t.category} />
              <div className="min-w-0">
                <div className="truncate" title={t.name}>{t.name}</div>
                {t.location && <div className="text-xs text-gray-500 truncate" title={t.location}>{t.location}</div>}
                {sortByAddedTime && t.addedAt && (
                  <div className="text-xs text-gray-400">添加于 {new Date(t.addedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-3 cursor-pointer" onClick={() => onRecordClick(t.name)}>
            <LeadingCat category={t.category} />
          </div>
          <div className="px-6 py-3 whitespace-nowrap cursor-pointer" onClick={() => onRecordClick(t.name)}>{t.date.replace('T', ' ')}</div>
          <div className="px-6 py-3 text-right font-mono text-gray-900 cursor-pointer" onClick={() => onRecordClick(t.name)}>
            ¥{t.amount.toFixed(2)}
          </div>
          <div className="px-6 py-3 text-center">
            {selectMode ? (
              selectedIds.has(t.id) ? (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : (
                <span className="inline-block w-6 h-6" aria-hidden="true"></span>
              )
            ) : (
              <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEditClick(t); }} title="编辑" className="text-blue-500 hover:text-blue-700 p-1">
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteClick(t.id); }} title="删除" className="text-red-500 hover:text-red-700 p-1">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="md:bg-white md:p-6 p-0 md:rounded-xl md:shadow-md h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <div className="relative flex-1 min-w-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称/地点/分类/日期/金额"
            className={`block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${query ? 'pr-8' : ''}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清空"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setSelectMode(s => { if (s) setSelectedIds(new Set()); return !s; })}
          className={`shrink-0 px-3 py-2 rounded-lg border ${selectMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >{selectMode ? '取消' : '多选'}</button>
        <button
          onClick={() => setSortByAddedTime(v => !v)}
          className={`shrink-0 p-2 rounded-lg border ${sortByAddedTime ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          title={sortByAddedTime ? '按添加时间降序（激活）' : '按账单日期分组'}
          aria-pressed={sortByAddedTime}
          aria-label={sortByAddedTime ? '切换为按月份分组' : '切换为按添加时间排序'}
        >
          <BarsArrowDownIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onAddClick}
          title="新增记录"
          aria-label="新增记录"
          className="shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      {/* 桌面端顶部批量条：移动端隐藏；进入多选后移动端只显示底部条 */}
      {selectMode && (
        <div className="mb-3 items-center justify-between gap-2 hidden md:flex">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" checked={selectedIds.size === allVisibleIds.length && allVisibleIds.length > 0}
                onChange={toggleAll} />
              <span>全选</span>
            </label>
            <span>已选 {selectedIds.size} 项</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={selectedIds.size === 0}
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1.5 rounded-md bg-amber-500 disabled:bg-amber-300 text-white text-sm"
            >批量改分类</button>
            <button onClick={exitSelectMode} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm">退出</button>
          </div>
        </div>
      )}

      {/* Content area fills remaining height */}
      <div className="flex-1 min-h-0">
        {/* Mobile edge-to-edge list with grouping + virtualization */}
  <div className="md:hidden h-full" ref={mobileContainerRef}>
          {items.length > 0 ? (
            <div className="-mx-4 md:mx-0 h-full">
              <List
                ref={listRef}
    height={Math.max(0, mobileHeight)}
                itemCount={items.length}
                itemSize={getMobileItemSize}
                itemKey={(index) => items[index].key}
                width={'100%'}
                className="overflow-auto"
                style={{ overflowX: 'hidden' }}
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

      {/* Mobile fixed bottom bulk bar (above bottom nav) */}
      {selectMode && (
        <div className="md:hidden fixed left-0 right-0 z-40 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.1rem)' }}>
          <div className="bg-white/95 pointer-events-auto">
            <div className="px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}>
              <div className="text-xs text-gray-600 text-center">已选 {selectedIds.size} 项</div>
              <div className="mt-2 grid grid-cols-3 gap-4 items-center">
                {/* 全选图标 */}
                <button
                  className="p-2 rounded-full border border-gray-300 justify-self-start"
                  onClick={toggleAll}
                  title={selectedIds.size === allVisibleIds.length && allVisibleIds.length > 0 ? '全不选' : '全选'}
                >
                  {/* 使用列表图标代表全选 */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </button>
                {/* 批量改分类图标 */}
                <button
                  className="p-2 rounded-full border border-gray-300 disabled:opacity-50 justify-self-center"
                  disabled={selectedIds.size === 0}
                  onClick={() => setShowBulkModal(true)}
                  title="批量修改分类"
                >
                  {/* 标签/分类图标 */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V6a3 3 0 0 1 3-3h1.5M21 16.5V18a3 3 0 0 1-3 3h-1.5M3 12h18M7.5 3v3m9 15v-3" />
                  </svg>
                </button>
                {/* 批量删除图标 */}
                <button
                  className="p-2 rounded-full border border-gray-300 text-red-600 disabled:opacity-50 justify-self-end"
                  disabled={selectedIds.size === 0}
                  onClick={doBulkDelete}
                  title="批量删除"
                >
                  <TrashIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Desktop/tablet virtualized list */}
        <div className="hidden md:flex md:flex-col h-full">
          {items.length > 0 ? (
            <div className="md:bg-white md:rounded-xl md:shadow-md overflow-hidden flex flex-col h-full">
              <div className="sticky top-0 z-10 bg-gray-100 text-xs text-gray-700 uppercase grid grid-cols-[45%_7rem_11rem_8rem_7rem] px-6 py-3">
                <div>名称</div>
                <div>分类</div>
                <div>日期</div>
                <div className="text-right">金额</div>
                <div className="text-center">操作</div>
              </div>
        <div className="flex-1 min-h-0" ref={desktopContainerRef}>
                <List
                  ref={desktopListRef}
          height={Math.max(0, desktopHeight)}
                  itemCount={items.length}
                  itemSize={getDesktopItemSize}
                  itemKey={(index) => items[index].key}
                  width={'100%'}
                  className="overflow-auto"
                  style={{ overflowX: 'hidden' }}
                >
                  {DesktopRow}
                </List>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="font-semibold">未找到匹配的记录</p>
              <p className="mt-1 text-sm">换个关键词试试，或清空搜索。</p>
            </div>
          )}
        </div>
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">批量修改分类</h3>
              <p className="text-sm text-gray-500 mt-0.5">已选 {selectedIds.size} 项</p>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {(Object.values(Category) as Category[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => confirmBulk(cat)}
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title={`设为 ${cat}`}
                    aria-label={`设为 ${cat}`}
                  >
                    <CategoryBadge category={cat} />
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowBulkModal(false)} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
