import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, NewTransaction, Category } from '../types';
import { CATEGORIES, CATEGORY_COLORS } from '../constants';
import { XIcon } from './icons';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction | NewTransaction) => void;
  transaction: Transaction | null;
}

const initialFormState: NewTransaction = {
  name: '',
  category: Category.Other,
  amount: 0,
  date: new Date().toISOString().slice(0, 16),
  location: '',
};

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  transaction,
}) => {
  const [formData, setFormData] = useState<NewTransaction>(initialFormState);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const isEdit = !!transaction;

  useEffect(() => {
    if (!isOpen) return;
    if (transaction) {
      setFormData({
        name: transaction.name,
        category: transaction.category,
        amount: transaction.amount,
        date: transaction.date.slice(0, 16),
        location: transaction.location || '',
      });
    } else {
      // Use last chosen category/location as convenient defaults
      try {
        const lastCategory = localStorage.getItem('lastCategory') as Category | null;
        const lastLocation = localStorage.getItem('lastLocation') || '';
        setFormData({
          ...initialFormState,
          category: lastCategory && (Object.values(Category) as string[]).includes(lastCategory) ? (lastCategory as Category) : initialFormState.category,
          location: lastLocation,
          date: new Date().toISOString().slice(0, 16),
        });
      } catch {
        setFormData({ ...initialFormState, date: new Date().toISOString().slice(0, 16) });
      }
    }
    setErrors({});
    // focus the name field shortly after open
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [transaction, isOpen]);

  const isValid = useMemo(() => {
    return formData.name.trim().length > 0 && formData.amount > 0 && !!formData.date;
  }, [formData]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? Math.abs(parseFloat(value) || 0) : value,
    }));
  };
  
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = '名称不能为空';
    if (formData.amount <= 0) newErrors.amount = '金额必须大于0';
    if (!formData.date) newErrors.date = '日期不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      if (transaction) {
        onSave({ ...formData, id: transaction.id });
      } else {
        onSave(formData);
      }
      // remember quick defaults
      try {
        localStorage.setItem('lastCategory', formData.category);
        if (formData.location) localStorage.setItem('lastLocation', formData.location);
      } catch {}
    }
  };

  const adjustAmount = (delta: number) => {
    setFormData(prev => ({ ...prev, amount: Math.max(0, Number((prev.amount + delta).toFixed(2))) }));
  };

  const setNow = () => {
    setFormData(prev => ({ ...prev, date: new Date().toISOString().slice(0, 16) }));
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
                <h3 className="text-lg font-semibold text-gray-900">{isEdit ? '编辑记录' : '新增记录'}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="关闭"
                >
                  <XIcon className="w-6 h-6" />
                </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">名称</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="例如：麦当劳外卖 / 打车 / 京东购物"
                      autoComplete="off"
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 placeholder-gray-400 ${errors.name ? 'border-red-500' : ''}`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">金额 (¥)</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            name="amount"
                            id="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            step="0.01"
                            min={0}
                            inputMode="decimal"
                            placeholder="0.00"
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.amount ? 'border-red-500' : ''}`}
                          />
                        </div>
                        {/* 快捷金额按钮已按需求移除 */}
                        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">日期</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="datetime-local"
                            name="date"
                            id="date"
                            value={formData.date}
                            onChange={handleChange}
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.date ? 'border-red-500' : ''}`}
                          />
                          <button type="button" onClick={setNow} className="shrink-0 px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">现在</button>
                        </div>
                        {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">分类</label>
          <div className="mt-1 flex flex-wrap gap-2 overflow-x-auto no-scrollbar py-1">
                      {CATEGORIES.map(cat => {
                        const color = CATEGORY_COLORS[cat];
                        const selected = formData.category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
              className="whitespace-nowrap rounded-full focus:outline-none"
                            aria-pressed={selected}
                            title={cat}
                          >
                            <span
                              className="px-2 py-1 text-xs font-semibold leading-tight rounded-full inline-flex"
                              style={{
                backgroundColor: selected ? `${color}44` : `${color}22`,
                                color: color,
                                border: selected ? `1px solid ${color}` : '1px solid transparent',
                              }}
                            >
                              {cat}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                </div>
                
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">地点 (可选)</label>
          <input type="text" name="location" id="location" value={formData.location} onChange={handleChange}
                        placeholder="例如：美团、饿了么、商场、地铁站"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                    />
                </div>

            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row sm:justify-end gap-3 sticky bottom-0">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    取消
                </button>
                <button type="submit" disabled={!isValid} className="py-2 px-4 bg-blue-600 disabled:bg-blue-300 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    保存
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};