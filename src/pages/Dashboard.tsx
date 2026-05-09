import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, BarChart3, Lock, History, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import PortfolioDashboard from '@/components/PortfolioDashboard';
import VaultAnalytics from '@/components/VaultAnalytics';
import TransactionHistory from '@/components/TransactionHistory';

type TabKey = 'chat' | 'portfolio' | 'vault' | 'history';

const tabs: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'chat', label: 'AI Chat', icon: MessageSquare },
  { key: 'portfolio', label: 'Portfolio', icon: BarChart3 },
  { key: 'vault', label: 'Vault', icon: Lock },
  { key: 'history', label: 'History', icon: History },
];

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const navigate = useNavigate();

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'portfolio':
        return <PortfolioDashboard />;
      case 'vault':
        return <VaultAnalytics />;
      case 'history':
        return <TransactionHistory />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-16 flex flex-col h-screen">
        {/* Tab bar */}
        <div className="border-b border-border bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 py-2 overflow-x-auto">
              <button
                onClick={() => navigate('/voice')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-all whitespace-nowrap border border-primary/20 mr-1"
              >
                <Mic className="w-4 h-4" />
                Voice
              </button>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content — min-h-0 lets flex children scroll (otherwise panel can collapse to 0 height) */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full min-h-0">
            {activeTab === 'chat' ? (
              <div className="h-full min-h-0">{renderContent()}</div>
            ) : (
              <div className="py-6 overflow-y-auto h-full">{renderContent()}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;