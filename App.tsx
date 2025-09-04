import React, { useState, useMemo, useEffect } from 'react';
import { BillUploader } from './components/BillUploader';
import { TransactionList } from './components/TransactionList';
import { CategoryChart } from './components/CategoryChart';
import { Transaction, NewTransaction } from './types';
import { LogoIcon } from './components/icons';
import { RecordDetailModal } from './components/RecordDetailModal';
import { TransactionFormModal } from './components/TransactionFormModal';
import { BottomNavBar } from './components/BottomNavBar';
import { SettingsPanel } from './components/SettingsPanel';

type Tab = 'upload' | 'chart' | 'list' | 'settings';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const savedTransactions = localStorage.getItem('transactions');
      return savedTransactions ? JSON.parse(savedTransactions) : [];
    } catch (error) {
      console.error("Could not parse transactions from localStorage", error);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedRecordName, setSelectedRecordName] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState<Tab>('list');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error("Could not save transactions to localStorage", error);
    }
  }, [transactions]);

  const handleAddTransactions = (newTransactions: NewTransaction[]) => {
    const existingKeys = new Set(
        transactions.map(t => `${t.name}|${t.date}|${t.amount}`)
    );

    const uniqueNewTransactions = newTransactions.filter(
        t => !existingKeys.has(`${t.name}|${t.date}|${t.amount}`)
    );

    if (uniqueNewTransactions.length > 0) {
        const transactionsWithIds: Transaction[] = uniqueNewTransactions.map(t => ({
            ...t,
            id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
        }));
        setTransactions(prev => 
            [...transactionsWithIds, ...prev]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
    }
  };
  
  const handleShowRecordHistory = (recordName: string) => {
    setSelectedRecordName(recordName);
  };

  const handleCloseRecordModal = () => {
      setSelectedRecordName(null);
  };
  
  const handleOpenTransactionModal = (transaction: Transaction | null = null) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };
  
  const handleSaveTransaction = (transactionData: Transaction | NewTransaction) => {
    if ('id' in transactionData && transactionData.id) {
      setTransactions(prev => prev.map(t => t.id === transactionData.id ? transactionData as Transaction : t));
    } else {
      const newTransaction: Transaction = {
        ...transactionData,
        id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
      };
      setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
    handleCloseTransactionModal();
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const handleImportTransactions = (items: any[]) => {
    // Normalize and de-duplicate against existing
    const existingKeys = new Set(transactions.map(t => `${t.name}|${t.date}|${t.amount}`));
    const normalized = items
      .map((it: any) => {
        try {
          const name = String(it.name || '').trim();
          const amount = Number(it.amount);
          const date = String(it.date || '').slice(0, 16); // YYYY-MM-DDTHH:mm
          const category = it.category as any;
          const location = it.location ? String(it.location) : undefined;
          if (!name || !date || !isFinite(amount) || amount <= 0) return null;
          return { name, amount, date, category, location } as NewTransaction;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as NewTransaction[];

    const unique = normalized.filter(t => !existingKeys.has(`${t.name}|${t.date}|${t.amount}`));
    if (unique.length === 0) return;

    const withIds: Transaction[] = unique.map(t => ({
      ...t,
      id: new Date().getTime().toString() + Math.random().toString(36).slice(2, 9),
    }));
    setTransactions(prev =>
      [...withIds, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleClearAll = () => {
    setTransactions([]);
  };

  const recordHistory = useMemo(() => {
      if (!selectedRecordName) return [];
      return transactions
          .filter(t => t.name === selectedRecordName)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedRecordName]);

  const renderContent = () => {
    if (isMobile) {
      switch (activeTab) {
        case 'upload':
          return <BillUploader onAddTransactions={handleAddTransactions} isLoading={isLoading} setIsLoading={setIsLoading} error={error} setError={setError} />;
        case 'chart':
          return <CategoryChart transactions={transactions} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />;
        case 'list':
          return <TransactionList transactions={transactions} onRecordClick={handleShowRecordHistory} onAddClick={() => handleOpenTransactionModal()} onEditClick={(t) => handleOpenTransactionModal(t)} onDeleteClick={handleDeleteTransaction} />;
        case 'settings':
          return <SettingsPanel transactions={transactions} onImport={handleImportTransactions} onClearAll={handleClearAll} />;
        default:
          return null;
      }
    }
    // Desktop layout
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-8">
          <BillUploader onAddTransactions={handleAddTransactions} isLoading={isLoading} setIsLoading={setIsLoading} error={error} setError={setError} />
          <CategoryChart transactions={transactions} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
        </div>
        <div className="lg:col-span-2">
          <TransactionList transactions={transactions} onRecordClick={handleShowRecordHistory} onAddClick={() => handleOpenTransactionModal()} onEditClick={(t) => handleOpenTransactionModal(t)} onDeleteClick={handleDeleteTransaction} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <LogoIcon className="h-8 w-8 text-blue-600"/>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">智能账单分析</h1>
        </div>
      </header>

  <main className="container mx-auto p-4 md:p-8 pb-28 lg:pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>
        {renderContent()}
      </main>
      
      {selectedRecordName && (
          <RecordDetailModal
              recordName={selectedRecordName}
              transactions={recordHistory}
              onClose={handleCloseRecordModal}
          />
      )}
      
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleCloseTransactionModal}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
      />
      
      {isMobile && <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />}

      <footer className="text-center py-6 text-sm text-gray-500 hidden lg:block">
        <p>由 Gemini AI 驱动的智能记账应用</p>
      </footer>
    </div>
  );
};

export default App;
