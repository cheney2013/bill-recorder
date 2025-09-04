import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import { CATEGORY_COLORS } from '../constants';

interface CategoryChartProps {
  transactions: Transaction[];
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
}

interface ChartData {
  name: string;
  value: number;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const radius = outerRadius * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';

  return (
    <text x={x} y={y} fill="currentColor" textAnchor={textAnchor} dominantBaseline="central" className="text-xs font-semibold text-gray-600">
      {`${name} ${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export const CategoryChart: React.FC<CategoryChartProps> = ({ transactions, currentMonth, setCurrentMonth }) => {

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

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">分类支出</h2>
        <select 
            value={currentMonth} 
            onChange={e => setCurrentMonth(e.target.value)}
            className="block w-36 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {monthOptions.map(month => (
            <option key={month} value={month}>{new Date(month + '-01T00:00:00').toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' })}</option>
          ))}
        </select>
      </div>
      
      {chartData.length > 0 ? (
        <div className="relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-sm text-gray-500">{formattedMonth}总支出</span>
             <span className="text-2xl font-bold text-gray-800">¥{totalAmount}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
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
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          <p>当前月份无支出数据</p>
        </div>
      )}
    </div>
  );
};