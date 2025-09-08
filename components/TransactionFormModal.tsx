import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, NewTransaction, Category } from '../types';
import { CATEGORIES } from '../constants';
import { CatIcon } from './icons';

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
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const isEdit = !!transaction;
  const [amountStr, setAmountStr] = useState<string>('0');

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
      setAmountStr(String(transaction.amount));
    } else {
      // Use last chosen category/location as convenient defaults
      try {
        const lastCategory = localStorage.getItem('lastCategory') as Category | null;
        setFormData({
          ...initialFormState,
          category: lastCategory && (Object.values(Category) as string[]).includes(lastCategory) ? (lastCategory as Category) : initialFormState.category,
          date: new Date().toISOString().slice(0, 16),
        });
      } catch {
        setFormData({ ...initialFormState, date: new Date().toISOString().slice(0, 16) });
      }
      setAmountStr('0');
    }
    setErrors({});
    // focus the name field shortly after open
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [transaction, isOpen]);

  // Evaluate simple + / - expression like "12+3.5-1"
  const evalExpression = (s: string): number => {
    if (!s) return 0;
    // keep only digits, +, -, .
    const clean = s.replace(/[^0-9+\-.]/g, '');
    if (!clean) return 0;
    // collapse multiple operators to the last one
    const normalized = clean.replace(/[+\-]{2,}/g, (m) => m[m.length - 1]);
    // handle leading + or -
    let total = 0;
    let current = '';
    let sign: 1 | -1 = 1;
    const flush = () => {
      if (current === '' || current === '.') return;
      const num = parseFloat(current);
      if (!isNaN(num)) total += sign * num;
      current = '';
    };
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === '+' || ch === '-') {
        flush();
        sign = ch === '+' ? 1 : -1;
      } else {
        // allow only one dot per number segment
        if (ch === '.' && current.includes('.')) continue;
        current += ch;
      }
    }
    flush();
    return Number.isFinite(total) ? total : 0;
  };

  const parsedAmount = useMemo(() => evalExpression(amountStr), [amountStr]);

  const isValid = useMemo(() => {
    return formData.name.trim().length > 0 && parsedAmount > 0 && !!formData.date;
  }, [formData.name, formData.date, parsedAmount]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = '名称不能为空';
  if (parsedAmount <= 0) newErrors.amount = '金额必须大于0';
    if (!formData.date) newErrors.date = '日期不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const attemptSave = () => {
    if (!validate()) return;
    const payload: Transaction | NewTransaction = transaction
      ? ({ ...formData, amount: parsedAmount, id: transaction.id } as Transaction)
      : ({ ...formData, amount: parsedAmount } as NewTransaction);
    onSave(payload);
    // remember quick defaults
    try {
      localStorage.setItem('lastCategory', formData.category);
      if (formData.location) localStorage.setItem('lastLocation', formData.location);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptSave();
  };

  // no-op: date is defaulted to now; picker opened via openDatePicker

  // Keypad handlers
  const onKey = (k: string) => {
    setAmountStr(prev => {
      let s = prev || '0';
      if (k === 'back') {
        s = s.length > 1 ? s.slice(0, -1) : '0';
        return s;
      }
      if (k === 'clear') return '0';
      if (k === '.') {
        const lastSeg = s.split(/[+\-]/).pop() || '';
        if (lastSeg.includes('.')) return s;
        return s.endsWith('.') ? s : s + '.';
      }
      if (k === '+' || k === '-') {
        // Replace trailing operator or append
        if (/[+\-]$/.test(s)) return s.replace(/[+\-]+$/, k);
        return s + k;
      }
      if (k === '=') {
        const v = evalExpression(s);
        // keep up to 2 decimals cleanly
        const out = Number.isFinite(v) ? (Math.round(v * 100) / 100).toString() : '0';
        return out;
      }
      if (k === 'done') {
        // no change to value; submit outside setState
        return s;
      }
      if (/^\d$/.test(k)) {
        if (s === '0') return k;
        // limit length to avoid overflow
        if (s.length > 12) return s;
        return s + k;
      }
      return s;
    });
    if (k === 'done') {
      attemptSave();
    }
  };

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      // Ensure value is set (default to now if empty)
      if (!el.value) el.value = new Date().toISOString().slice(0, 16);
      // @ts-ignore - showPicker is not in standard types yet
      if (typeof el.showPicker === 'function') {
        // @ts-ignore
        el.showPicker();
      } else {
        el.focus();
        el.click();
      }
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-0 md:p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white w-full h-full md:max-w-lg md:max-h-[90vh] md:rounded-xl md:shadow-2xl transform transition-all flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* Header (primary blue) */}
            <div className="px-4 py-3 bg-blue-600 text-white md:rounded-t-xl flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top + 10px)' }}>
              <div className="w-10" />
              <div className="text-base font-semibold">支出 ▾</div>
              <button type="button" onClick={onClose} className="text-white/80 hover:text-white text-sm">取消</button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Category grid */}
              <div className="grid grid-cols-4 gap-4">
                {CATEGORIES.map(cat => {
                  const selected = formData.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                      className="flex flex-col items-center gap-1"
                      aria-pressed={selected}
                      title={cat}
                    >
                      <span className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-200 ${selected ? 'ring-2 ring-blue-400 bg-blue-100' : ''}`}>
                        <CatIcon cat={cat} className="w-8 h-8 text-gray-700" />
                      </span>
                      <span className="text-xs text-gray-600">{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Note moved to bottom dock; removed here */}

              {/* location moved to bottom dock */}
              {/* Hidden native datetime-local for picker */}
              <input
                ref={dateInputRef}
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            {/* Bottom dock: amount + keypad */}
            <div className="border-t bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              {/* Remark left, amount right; vertically centered */}
              <div className="mb-3 flex items-center gap-3">
                <input
                  ref={nameInputRef}
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="备注：例如 麦当劳 / 打车 / 购物"
                  autoComplete="off"
                  className={`flex-1 border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base px-0 py-1 ${errors.name ? 'border-red-500' : ''}`}
                />
                <div className="shrink-0 text-right leading-none">
                  <div className="text-3xl font-semibold text-gray-900">{amountStr}</div>
                </div>
              </div>

              {/* Location just above keypad */}
              <div className="mb-2">
                <label htmlFor="location" className="text-xs text-gray-500">地点（可选）</label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="例如：美团、地铁站"
                  className="mt-1 block w-full border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base px-0"
                />
              </div>

              {/* Keypad */}
              {(() => {
                const hasOp = /[+\-]/.test(amountStr);
                const actionKey = hasOp ? '=' : '完成';
                const keys = ['7','8','9','今天','4','5','6','+','1','2','3','-','0','.','⌫', actionKey];
                return (
                  <div className="grid grid-cols-4 gap-2 select-none">
                    {keys.map((k) => {
                      const primary = k === '=' || k === '完成';
                      const secondary = ['今天','+','-','⌫'].includes(k);
                      const keyStyle = primary
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : secondary
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-white border';
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (k === '今天') { openDatePicker(); return; }
                            if (k === '⌫') { onKey('back'); return; }
                            if (k === '完成') { onKey('done'); return; }
                            if (k === '+' || k === '-' || k === '=' ) { onKey(k); return; }
                            onKey(k);
                          }}
                          className={`py-3 rounded-md ${keyStyle} active:scale-95 transition-transform`}
                        >
                          {k}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
        </form>
      </div>
    </div>
  );
};