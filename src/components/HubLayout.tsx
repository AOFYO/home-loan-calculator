import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, ModuleId } from './Sidebar';

interface HubLayoutProps {
  currentModule: ModuleId;
  onModuleChange: (id: ModuleId) => void;
  children: React.ReactNode;
}

export function HubLayout({ currentModule, onModuleChange, children }: HubLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden print:h-auto print:overflow-visible print:bg-white print:block">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar
          currentModule={currentModule}
          onModuleChange={onModuleChange}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
        />
      </div>

      {/* Main content area — offset by sidebar width on desktop */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} print:ml-0 print:overflow-visible print:h-auto print:block`}>
        {/* Top bar (mobile only) */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-white border-b border-slate-200 shrink-0 shadow-sm print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          <span className="ml-3 font-semibold text-slate-800">My Tools</span>
        </header>

        {/* Module content */}
        <main className="flex-1 overflow-y-auto print:overflow-visible print:h-auto print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
