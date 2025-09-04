import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon, BarsArrowDownIcon } from './icons';
import { CategoryBadge } from './TransactionList';

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

  const currentIndex = useMemo(() => monthOptions.indexOf(currentMonth), [monthOptions, currentMonth]);
  const canPrev = currentIndex !== -1 && currentIndex < monthOptions.length - 1;
  const canNext = currentIndex !== -1 && currentIndex > 0;
  const gotoPrev = () => { if (canPrev) setCurrentMonth(monthOptions[currentIndex + 1]); };
  const gotoNext = () => { if (canNext) setCurrentMonth(monthOptions[currentIndex - 1]); };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">分类支出</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={gotoPrev}
            disabled={!canPrev}
            className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            aria-label="上个月"
            title="上个月"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <select 
              value={currentMonth} 
              onChange={e => setCurrentMonth(e.target.value)}
              className="block w-40 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {monthOptions.map(month => (
              <option key={month} value={month}>{new Date(month + '-01T00:00:00').toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' })}</option>
            ))}
          </select>
          <button
            onClick={gotoNext}
            disabled={!canNext}
            className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            aria-label="下个月"
            title="下个月"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="relative">
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
              <Tooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
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
            <ul className="divide-y divide-gray-100">
              {monthlyTransactions.map((t) => (
                <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-nowrap">
                      <p className="font-medium text-gray-900 truncate min-w-0 flex-1" title={t.name}>{t.name}</p>
                      <CategoryBadge category={t.category} />
                    </div>
                    {t.location && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate" title={t.location}>{t.location}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">{t.date.replace('T', ' ')}</p>
                  </div>
                  <div className="shrink-0 text-right flex flex-col items-end gap-2">
                    <span className="font-mono font-semibold text-gray-900">¥{t.amount.toFixed(2)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEditClick && onEditClick(t)}
                        title="编辑"
                        className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md active:bg-blue-50"
                        aria-label={`编辑 ${t.name}`}
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDeleteClick && onDeleteClick(t.id)}
                        title="删除"
                        className="text-red-600 hover:text-red-700 p-1.5 rounded-md active:bg-red-50"
                        aria-label={`删除 ${t.name}`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-gray-500 py-6">本月暂无记录</div>
          )}
        </div>
    </div>
  );
};