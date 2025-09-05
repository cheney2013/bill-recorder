import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NewTransaction, Transaction, Category } from '../types';
import { analyzeBillImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { UploadIcon, SpinnerIcon, AlertIcon, XCircleIcon, DocumentIcon, PencilIcon, ListBulletIcon, TrashIcon } from './icons';
import { SwipeToDelete } from './SwipeToDelete';
import { CategoryBadge } from './TransactionList';
import { Toast } from './Toast';

interface BillUploaderProps {
  onAddTransactions: (transactions: NewTransaction[]) => Transaction[];
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  onEditInline?: (tx: Transaction) => void;
  onDeleteInline?: (id: string) => void;
  onBulkChangeInline?: (ids: string[], category: Category) => void;
  transactions?: Transaction[]; // global source to sync inline list after edits/deletes
}

interface Preview {
    url: string;
    name: string;
    isImage: boolean;
}

export const BillUploader: React.FC<BillUploaderProps> = ({ onAddTransactions, isLoading, setIsLoading, error, setError, onEditInline, onDeleteInline, onBulkChangeInline, transactions }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<Transaction[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const mobileBulkBarRef = useRef<HTMLDivElement>(null);
  const aboveContentRef = useRef<HTMLDivElement>(null); // wraps content above the lastAdded section
  const aboveListRef = useRef<HTMLDivElement>(null); // wraps header + desktop bulk bar above the scroll list
  const [listMaxPx, setListMaxPx] = useState<number | undefined>();
  const allVisibleIds = React.useMemo(() => lastAdded.map(t => t.id), [lastAdded]);
  const toggleAll = () => {
    setSelectedIds(prev => {
      if (prev.size === allVisibleIds.length) return new Set();
      return new Set(allVisibleIds);
    });
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const doBulkDeleteInline = () => {
    if (!onDeleteInline || selectedIds.size === 0) return;
    Array.from(selectedIds).forEach(id => onDeleteInline(id));
    setLastAdded(prev => prev.filter(t => !selectedIds.has(t.id)));
    exitSelectMode();
  };
  const confirmBulkInline = (cat: Category) => {
    if (!onBulkChangeInline || selectedIds.size === 0) { setShowBulkModal(false); return; }
    const ids = Array.from(selectedIds);
    onBulkChangeInline(ids, cat);
    // reflect in local lastAdded panel immediately
    setLastAdded(prev => prev.map(t => ids.includes(t.id) ? { ...t, category: cat } : t));
    setShowBulkModal(false);
    exitSelectMode();
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'application/pdf' || 
      file.type === 'text/plain' ||
      file.type === 'text/csv'
    );
    if (validFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);

    const newPreviewsPromises = validFiles.map(file => {
      return new Promise<Preview>(resolve => {
        const isImage = file.type.startsWith('image/');
        if (isImage) {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ url: reader.result as string, name: file.name, isImage: true });
          reader.readAsDataURL(file);
        } else {
          resolve({ url: '', name: file.name, isImage: false }); // No URL for non-images
        }
      });
    });

    Promise.all(newPreviewsPromises).then(newPreviews => {
        setPreviews(prev => [...prev, ...newPreviews]);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Allow re-selecting the same files
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setError('请先选择一个或多个账单文件。');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const results = await Promise.allSettled(
      selectedFiles.map(async (file) => {
        const base64Image = await fileToBase64(file);
        return await analyzeBillImage(base64Image, file.type);
      })
    );
    
    const successfulTransactions: NewTransaction[] = [];
    const errors: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulTransactions.push(...result.value);
      } else {
        const reason = result.reason as Error;
        errors.push(`文件 "${selectedFiles[index].name}" 处理失败: ${reason.message}`);
      }
    });
    
    if (successfulTransactions.length > 0) {
      const addedTxs = onAddTransactions(successfulTransactions);
      if (addedTxs.length > 0) {
        setToastMsg(`已添加 ${addedTxs.length} 条记录`);
        setLastAdded(addedTxs);
        // Reset scroll position and recompute height on next frame
        setTimeout(() => {
          try {
            listContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
          } catch {}
          try {
            // Force a fresh measure in case layout shifted
            (recomputeListMax as any)?.();
          } catch {}
        }, 0);
      }
    }
    
    if (errors.length > 0) {
      setError(errors.join('\n'));
    }
    
    setSelectedFiles([]);
    setPreviews([]);
  setIsLoading(false);
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
    if (event.dataTransfer.files) {
      addFiles(Array.from(event.dataTransfer.files));
    }
  }, [isLoading]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Keep lastAdded entries in sync with global transactions after edits or external deletes
  useEffect(() => {
    if (!transactions || lastAdded.length === 0) return;
    const entries: [string, Transaction][] = transactions.map(t => [t.id, t]);
    const map = new Map<string, Transaction>(entries);
    setLastAdded(prev => {
      let changed = false;
      const next: Transaction[] = [];
      for (const t of prev) {
        const u = map.get(t.id);
        if (!u) { changed = true; continue; }
        if (u !== t) changed = true;
        next.push(u);
      }
      return changed ? next : prev;
    });
  }, [transactions]);

  // Compute dynamic max height for the "本次新增" scroll area so it doesn't overlap the bottom nav or the mobile bulk bar.
  const recomputeListMax = useCallback(() => {
    if (!listContainerRef.current) return;
    const rect = listContainerRef.current.getBoundingClientRect();
    const viewportH = (window.visualViewport?.height ?? window.innerHeight);
    // Bottom overlays on mobile: bottom nav (h-16 => 64px) and optional mobile bulk bar when in selectMode
    const isMobile = window.matchMedia('(max-width: 767.98px)').matches;
    const BOTTOM_NAV_H = 64; // matches h-16
    let overlays = 0;
    if (isMobile) {
      overlays += BOTTOM_NAV_H;
      if (selectMode && mobileBulkBarRef.current) {
        overlays += mobileBulkBarRef.current.getBoundingClientRect().height;
      }
    }
    const margin = 12; // small breathing room
    const computed = Math.max(120, Math.floor(viewportH - rect.top - overlays - margin));
    setListMaxPx(computed);
  }, [selectMode]);

  useEffect(() => {
    // Recompute when list appears, window resizes, visual viewport/safe-area changes, select mode toggles
    const onResize = () => recomputeListMax();
    const onOrientation = () => recomputeListMax();
    recomputeListMax();
    // Observe dynamic height changes above
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => recomputeListMax()) : null;
    if (ro) {
      if (aboveContentRef.current) ro.observe(aboveContentRef.current);
      if (aboveListRef.current) ro.observe(aboveListRef.current);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientation);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [recomputeListMax, lastAdded.length, selectMode]);

  return (
  <div className="md:bg-white md:p-6 p-0 md:rounded-xl md:shadow-md">
      <div ref={aboveContentRef}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">上传账单</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div 
          className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-colors ${!isLoading ? 'cursor-pointer hover:border-blue-500' : ''}`}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            accept="image/*,application/pdf,text/plain,text/csv"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            disabled={isLoading}
          />
          {previews.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group aspect-square">
                   {preview.isImage ? (
                    <img src={preview.url} alt={`账单预览 ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <div className="w-full h-full rounded-md bg-gray-100 flex flex-col items-center justify-center p-2 text-center">
                        <DocumentIcon className="w-10 h-10 text-gray-400"/>
                        <p className="text-xs text-gray-600 mt-2 break-all line-clamp-2">{preview.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                    className="absolute top-0 right-0 -m-2 bg-red-500 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:hidden"
                    aria-label="Remove image"
                    disabled={isLoading}
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>
              ))}
              <div className="flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-50 min-h-full aspect-square">
                <UploadIcon className="w-8 h-8 mb-1"/>
                <p className="text-sm font-semibold">添加更多</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 py-6">
              <UploadIcon className="w-12 h-12 mb-2"/>
              <p className="font-semibold">点击或拖拽上传文件</p>
              <p className="text-sm">支持图片、PDF、文本文档、CSV</p>
            </div>
          )}
        </div>
        
        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-start gap-3" role="alert">
                <AlertIcon className="h-6 w-6 flex-shrink-0 mt-0.5"/>
                <div>
                    <p className="font-bold">错误</p>
                    {error.split('\n').map((line, i) => <p key={i} className="text-sm">{line}</p>)}
                </div>
            </div>
        )}

        <button
          type="submit"
          disabled={selectedFiles.length === 0 || isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              正在智能分析...
            </>
          ) : (
            `识别并添加 ${selectedFiles.length > 0 ? `${selectedFiles.length}个` : ''}文件`
          )}
        </button>
        </form>
      </div>

      {lastAdded.length > 0 && (
        <div className="mt-4">
          <div ref={aboveListRef}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">本次新增</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectMode(s => { if (s) setSelectedIds(new Set()); return !s; })}
                  className={`p-2 rounded-md border text-gray-600 transition-all ${
                    selectMode
                      ? 'border-blue-500 bg-blue-100 text-blue-700 shadow-inner translate-y-[1px]'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  title={selectMode ? '取消多选' : '多选'}
                  aria-pressed={selectMode}
                  aria-label={selectMode ? '取消多选' : '多选'}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-500">{lastAdded.length} 条</span>
              </div>
            </div>
            {/* 桌面端批量条（移动端隐藏） */}
            {selectMode && (
              <div className="mb-2 hidden md:flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                    <input type="checkbox" checked={selectedIds.size === allVisibleIds.length && allVisibleIds.length > 0} onChange={toggleAll} />
                    <span>全选</span>
                  </label>
                  <span>已选 {selectedIds.size} 项</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedIds.size === 0 || !onBulkChangeInline}
                    onClick={() => setShowBulkModal(true)}
                    className="px-3 py-1.5 rounded-md bg-amber-500 disabled:bg-amber-300 text-white text-sm"
                  >批量改分类</button>
                  <button
                    disabled={selectedIds.size === 0}
                    onClick={doBulkDeleteInline}
                    className="px-3 py-1.5 rounded-md bg-red-600 disabled:bg-red-300 text-white text-sm"
                  >批量删除</button>
                  <button onClick={exitSelectMode} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm">退出</button>
                </div>
              </div>
            )}
          </div>
          <div ref={listContainerRef} className="overflow-y-auto" style={listMaxPx ? { maxHeight: `${listMaxPx}px` } : undefined}>
            <ul>
              {lastAdded.map((t) => (
                <li key={t.id} className="py-0">
                  <SwipeToDelete
                    className="w-full bg-white p-3 md:rounded-lg md:border md:border-gray-200 border-b border-gray-100 rounded-none"
                    onDelete={() => onDeleteInline && onDeleteInline(t.id)}
                  >
                    <div className="flex items-start justify-between gap-3" onClick={() => selectMode ? toggleOne(t.id) : undefined} role="button" aria-label={selectMode ? (selectedIds.has(t.id) ? '取消选择' : '选择此项') : undefined}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate max-w-[12rem]" title={t.name}>{t.name}</p>
                          <CategoryBadge category={t.category} />
                        </div>
                        {t.location && (
                          <p className="text-xs text-gray-500 mt-1 truncate" title={t.location}>{t.location}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {t.date.replace('T', ' ')} · 添加于 {new Date(t.addedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-mono font-semibold text-gray-900">¥{t.amount.toFixed(2)}</span>
                        {selectMode ? (
                          selectedIds.has(t.id) ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-block w-8 h-8" aria-hidden="true"></span>
                          )
                        ) : (
                          onEditInline && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditInline(t); }}
                              title="编辑"
                              className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md active:bg-blue-50"
                              aria-label={`编辑 ${t.name}`}
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </SwipeToDelete>
                </li>
              ))}
            </ul>
          </div>
          {/* 移动端底部批量条（悬浮在底部导航上方） */}
          {selectMode && (
            <div ref={mobileBulkBarRef} className="md:hidden fixed left-0 right-0 z-40 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.1rem)' }}>
              <div className="bg-white/95 pointer-events-auto">
                <div className="px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}>
                  <div className="text-xs text-gray-600 text-center">已选 {selectedIds.size} 项</div>
                  <div className="mt-2 grid grid-cols-3 gap-4 items-center">
                    <button
                      className="p-2 rounded-full border border-gray-300 justify-self-start"
                      onClick={toggleAll}
                      title={selectedIds.size === allVisibleIds.length && allVisibleIds.length > 0 ? '全不选' : '全选'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </button>
                    <button
                      className="p-2 rounded-full border border-gray-300 disabled:opacity-50 justify-self-center"
                      disabled={selectedIds.size === 0 || !onBulkChangeInline}
                      onClick={() => setShowBulkModal(true)}
                      title="批量修改分类"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V6a3 3 0 0 1 3-3h1.5M21 16.5V18a3 3 0 0 1-3 3h-1.5M3 12h18M7.5 3v3m9 15v-3" />
                      </svg>
                    </button>
                    <button
                      className="p-2 rounded-full border border-gray-300 text-red-600 disabled:opacity-50 justify-self-end"
                      disabled={selectedIds.size === 0}
                      onClick={doBulkDeleteInline}
                      title="批量删除"
                    >
                      <TrashIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                    onClick={() => confirmBulkInline(cat)}
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

      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />)
      }
    </div>
  );
};