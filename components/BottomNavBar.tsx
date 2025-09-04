import React from 'react';
import { UploadIcon, ChartPieIcon, ListBulletIcon, SettingsIcon } from './icons';

type Tab = 'upload' | 'chart' | 'list' | 'settings';

interface BottomNavBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const navItems = [
    { id: 'list', label: '列表', icon: ListBulletIcon },
    { id: 'chart', label: '图表', icon: ChartPieIcon },
    { id: 'upload', label: '记账', icon: UploadIcon },
    { id: 'settings', label: '设置', icon: SettingsIcon },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab }) => {
    return (
                <nav
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
                        <div className="flex justify-around items-center h-16" role="tablist" aria-label="底部导航">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                                                        role="tab"
                                                        aria-selected={isActive}
                                                        onClick={() => {
                                                            // Ensure state update runs after click; avoid event swallowing due to focus changes
                                                            requestAnimationFrame(() => setActiveTab(item.id as Tab));
                                                        }}
                                                        className={`flex flex-col items-center justify-center w-full h-full text-sm font-medium transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
                        >
                            <item.icon className="w-6 h-6 mb-1" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
