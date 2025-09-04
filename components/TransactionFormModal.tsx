import React, { useState, useEffect } from 'react';
import { Transaction, NewTransaction, Category } from '../types';
import { CATEGORIES } from '../constants';
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

  useEffect(() => {
    if (transaction) {
      setFormData({
        name: transaction.name,
        category: transaction.category,
        amount: transaction.amount,
        date: transaction.date.slice(0, 16),
        location: transaction.location || '',
      });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
  }, [transaction, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
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
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                {transaction ? '编辑记录' : '新增记录'}
                </h3>
                <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="关闭"
                >
                <XIcon className="w-6 h-6" />
                </button>
            </div>

            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">名称</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.name ? 'border-red-500' : ''}`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">金额 (¥)</label>
                        <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleChange}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.amount ? 'border-red-500' : ''}`}
                            step="0.01"
                        />
                        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">日期</label>
                        <input type="datetime-local" name="date" id="date" value={formData.date} onChange={handleChange}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.date ? 'border-red-500' : ''}`}
                        />
                        {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                    </div>
                </div>

                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">分类</label>
                    <select name="category" id="category" value={formData.category} onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">地点 (可选)</label>
                    <input type="text" name="location" id="location" value={formData.location} onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                </div>

            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    取消
                </button>
                <button type="submit" className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    保存
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};