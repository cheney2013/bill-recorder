import React, { useMemo, useRef, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { PencilIcon, TrashIcon, BarsArrowDownIcon } from './icons';
import { LeadingCat } from './TransactionList';
import { SwipeToDelete } from './SwipeToDelete';

interface CategoryChartProps {
  transactions: Transaction[];
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  onEditClick?: (transaction: Transaction) => void;
  onDeleteClick?: (transactionId: string) => void;
}

interface ChartData {
  name: string;
  value: number;
}

const RADIAN = Math.PI / 180;
const truncate = (s: string, max = 6) => (s && s.length > max ? s.slice(0, max) + '…' : s);
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  // Place label just outside the arc for a cleaner look
  const radius = outerRadius * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor: 'start' | 'end' = x > cx ? 'start' : 'end';
  return (
    <text x={x} y={y} fill="currentColor" textAnchor={textAnchor} dominantBaseline="central" className="text-xs font-semibold text-gray-600">
      {`${truncate(name)} ${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export const CategoryChart: React.FC<CategoryChartProps> = ({ transactions, currentMonth, setCurrentMonth, onEditClick, onDeleteClick }) => {

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => months.add(t.date.slice(0, 7)));
    const thisMonth = new Date().toISOString().slice(0, 7);
    if (!months.has(thisMonth)) {
        months.add(thisMonth);
    }
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const chartData = useMemo<ChartData[]>(() => {
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    const dataMap = new Map<string, number>();
    monthlyTransactions.forEach(t => {
      dataMap.set(t.category, (dataMap.get(t.category) || 0) + t.amount);
    });
    return Array.from(dataMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
  }, [transactions, currentMonth]);

  const totalAmount = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0).toFixed(2);
  }, [chartData]);
  
  const formattedMonth = new Date(currentMonth + '-01T00:00:00').toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' });

  const [sortByAmount, setSortByAmount] = useState(false);
  const monthlyTransactions = useMemo(() => {
    const list = transactions.filter(t => t.date.startsWith(currentMonth));
    if (sortByAmount) {
      return list.sort((a, b) => b.amount - a.amount);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentMonth, sortByAmount]);

  // no multi-select in chart view

  const currentIndex = useMemo(() => monthOptions.indexOf(currentMonth), [monthOptions, currentMonth]);
  const canPrev = currentIndex !== -1 && currentIndex < monthOptions.length - 1;
  const canNext = currentIndex !== -1 && currentIndex > 0;
  const gotoPrev = () => { if (canPrev) setCurrentMonth(monthOptions[currentIndex + 1]); };
  const gotoNext = () => { if (canNext) setCurrentMonth(monthOptions[currentIndex - 1]); };

  // Drag-to-switch with follow + snap
  const SLIDE_MS = 140; // shorter slide duration for snappier feel
  const startXRef = useRef<number | null>(null);
  const widthRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false); // only for tooltip suppression
  const dragXRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const outTimerRef = useRef<number | null>(null);
  const inTimerRef = useRef<number | null>(null);
  const animOffTimerRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const finishingRef = useRef(false);

  const applyTransform = (x: number, withTransition: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = withTransition ? `transform ${SLIDE_MS}ms ease-out` : 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  const clearTimers = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (outTimerRef.current) { clearTimeout(outTimerRef.current); outTimerRef.current = null; }
    if (inTimerRef.current) { clearTimeout(inTimerRef.current); inTimerRef.current = null; }
    if (animOffTimerRef.current) { clearTimeout(animOffTimerRef.current); animOffTimerRef.current = null; }
  };

  const hardReset = () => {
    finishingRef.current = false;
    startXRef.current = null;
    activePointerIdRef.current = null;
    dragXRef.current = 0;
    setDragging(false);
    setAnimating(false);
    applyTransform(0, false);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (animating || finishingRef.current) return; // don't start while animating
    if (activePointerIdRef.current != null) return; // single-pointer guard
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    activePointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    widthRef.current = containerRef.current?.getBoundingClientRect().width || 1;
    clearTimers();
    setDragging(true);
    setAnimating(false);
    dragXRef.current = 0;
    applyTransform(0, false);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current == null) return;
    if (activePointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 4) e.preventDefault();
    // Follow finger horizontally, clamp to width
    const w = widthRef.current;
    dragXRef.current = Math.max(-w, Math.min(w, dx));
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        applyTransform(dragXRef.current, false);
      });
    }
  };
  const finishDrag = (commit: boolean, direction: 'left' | 'right' | null) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const w = widthRef.current;
    if (commit && ((direction === 'left' && canNext) || (direction === 'right' && canPrev))) {
      // Slide out in drag direction
      setAnimating(true);
      applyTransform(direction === 'left' ? -w : w, true);
      // After slide-out, switch month, position off-screen opposite, then slide-in to 0
      outTimerRef.current = window.setTimeout(() => {
        if (direction === 'left') gotoNext(); else gotoPrev();
        // position new content just outside in opposite direction
        applyTransform(direction === 'left' ? w : -w, false);
        // next tick animate into place
        requestAnimationFrame(() => {
          applyTransform(0, true);
      // turn off animating quickly so tooltip comes back sooner
      animOffTimerRef.current = window.setTimeout(() => { setAnimating(false); }, 80);
      // end dragging after slide-in
      inTimerRef.current = window.setTimeout(() => {
            setDragging(false);
            finishingRef.current = false;
            activePointerIdRef.current = null;
            applyTransform(0, false); // ensure exact reset
          }, SLIDE_MS);
        });
      }, SLIDE_MS);
    } else {
      // Snap back
      setAnimating(true);
      applyTransform(0, true);
      outTimerRef.current = window.setTimeout(() => {
        setDragging(false);
        setAnimating(false);
        finishingRef.current = false;
        activePointerIdRef.current = null;
        applyTransform(0, false);
      }, SLIDE_MS - 10);
    }
    startXRef.current = null;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current == null) return;
    if (activePointerIdRef.current !== e.pointerId) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    const w = widthRef.current;
    const threshold = Math.max(60, w * 0.2);
    const x = dragXRef.current;
    const commitLeft = x < -threshold;
    const commitRight = x > threshold;
    finishDrag(commitLeft || commitRight, commitLeft ? 'left' : commitRight ? 'right' : null);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    finishDrag(false, null);
  };

  const onLostPointerCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    finishDrag(false, null);
  };

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (outTimerRef.current) clearTimeout(outTimerRef.current);
      if (inTimerRef.current) clearTimeout(inTimerRef.current);
    if (animOffTimerRef.current) clearTimeout(animOffTimerRef.current);
    };
  }, []);

  return (
    <div className="md:bg-white md:p-6 p-0 md:rounded-xl md:shadow-md">
      <div className="flex justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">分类支出</h2>
        </div>
  <div className="flex items-center gap-2">
          <select 
              value={currentMonth} 
              onChange={e => setCurrentMonth(e.target.value)}
              className="block w-40 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {monthOptions.map(month => (
              <option key={month} value={month}>{new Date(month + '-01T00:00:00').toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' })}</option>
            ))}
          </select>
        </div>
      </div>
      
      {chartData.length > 0 ? (
  <div className="relative" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onLostPointerCapture={onLostPointerCapture} style={{ touchAction: 'pan-y' }}>
          <div ref={containerRef} className="relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-sm text-gray-500">{formattedMonth}总支出</span>
               <span className="text-2xl font-bold text-gray-800">¥{totalAmount}</span>
            </div>
            <div className="-mx-6">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart margin={{ top: 24, bottom: 24, left: 28, right: 28 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
                cornerRadius={5}
                labelLine={true}
                label={renderCustomizedLabel}
                animationDuration={500}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]} className="focus:outline-none"/>
                ))}
              </Pie>
              {!dragging && !animating && <Tooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />}
              </PieChart>
            </ResponsiveContainer>
            </div>
          </div>
          </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          <p>当前月份无支出数据</p>
        </div>
      )}

        {/* 月度账单列表 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-800">{formattedMonth} 账单</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortByAmount(s => !s)}
                className={`p-2 rounded-md border text-gray-600 transition-all ${
                  sortByAmount
                    ? 'border-blue-500 bg-blue-100 text-blue-700 shadow-inner translate-y-[1px]'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                title={sortByAmount ? '按金额降序（激活）' : '正常排序（按时间）'}
                aria-pressed={sortByAmount}
              >
                <BarsArrowDownIcon className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-500">{monthlyTransactions.length} 条</span>
            </div>
          </div>
          {monthlyTransactions.length > 0 ? (
            <div className="-mx-4 md:mx-0">
              <ul className="divide-y divide-gray-100 md:divide-y-0 md:space-y-3">
                {monthlyTransactions.map((t) => (
                  <li key={t.id} className="py-0">
                    <SwipeToDelete className="w-full bg-white p-3 md:rounded-lg md:border md:border-gray-200 rounded-none" onDelete={() => onDeleteClick && onDeleteClick(t.id)}>
                      <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3 min-w-0">
                          <LeadingCat category={t.category} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[12rem]" title={t.name}>{t.name}</p>
                            {t.location && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate" title={t.location}>{t.location}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-0.5">{t.date.replace('T', ' ')}</p>
                          </div>
                        </div>
                      </div>
                        <div className="shrink-0 text-right flex flex-col items-end gap-2">
                          <span className="font-mono font-semibold text-gray-900">¥{t.amount.toFixed(2)}</span>
                          <button
                            onClick={() => onEditClick && onEditClick(t)}
                            title="编辑"
                            className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md active:bg-blue-50"
                            aria-label={`编辑 ${t.name}`}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </SwipeToDelete>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6">本月暂无记录</div>
          )}
        </div>

  {/* no mobile bulk bar or modal in chart view */}
    </div>
  );
};