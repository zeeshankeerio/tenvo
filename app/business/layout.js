'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/lib/context/LanguageContext';
import { FilterProvider } from '@/lib/context/FilterContext';
import { DataProvider } from '@/lib/context/DataContext';
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette';
import { useBusiness } from '@/lib/context/BusinessContext';
import { AgenticFloatingChatbot } from '@/components/layout/AgenticFloatingChatbot';

export default function BusinessLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { language } = useLanguage();
    const { business } = useBusiness();

    const sidebarWidth = isSidebarCollapsed ? '20' : '64';
    const marginClass = language === 'ur'
        ? (isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64')
        : (isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64');

    return (
        <FilterProvider>
            <DataProvider>
                <GlobalCommandPalette />
                <div className="h-screen bg-gray-50 flex overflow-hidden w-full">
                    {/* Sidebar */}
                    <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        isSidebarCollapsed={isSidebarCollapsed}
                        setIsSidebarCollapsed={setIsSidebarCollapsed}
                    />

                    {/* Main Content Area */}
                    <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ${marginClass}`}>
                        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

                        <main className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar">
                            {children}
                        </main>
                    </div>
                </div>
                <AgenticFloatingChatbot 
                    businessId={business?.id} 
                    businessName={business?.business_name} 
                    businessCategory={business?.category} 
                />
            </DataProvider>
        </FilterProvider>
    );
}
