import React from 'react';
import { Home, Search, Menu, X, ChevronRight } from 'lucide-react';

export type ModuleId = 'loan' | 'inspection';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'loan',
    label: 'คำนวณสินเชื่อบ้าน',
    icon: <Home size={20} />,
    description: 'เปรียบเทียบอัตราดอกเบี้ยธนาคาร',
  },
  {
    id: 'inspection',
    label: 'เปรียบเทียบตรวจบ้าน',
    icon: <Search size={20} />,
    description: 'AI วิเคราะห์รายงานตรวจบ้าน',
  },
];

interface SidebarProps {
  currentModule: ModuleId;
  onModuleChange: (id: ModuleId) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ currentModule, onModuleChange, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 bg-slate-900 text-white
          flex flex-col transition-all duration-300 ease-in-out
          ${isOpen ? 'w-64' : 'w-0 lg:w-16'}
          overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700 shrink-0">
          <div className={`flex items-center gap-2 ${isOpen ? 'opacity-100' : 'opacity-0 lg:opacity-0'} transition-opacity`}>
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold">MY</span>
            </div>
            <span className="font-semibold text-sm whitespace-nowrap">My Tools</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className={`px-3 mb-2 ${isOpen ? '' : 'lg:px-2'}`}>
            {!isOpen && (
              <div className="hidden lg:block h-px bg-slate-700 mb-2" />
            )}
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onModuleChange(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                title={!isOpen ? item.label : undefined}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  transition-colors duration-150 relative group
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <span className="shrink-0">{item.icon}</span>
                <div className={`transition-all duration-200 overflow-hidden ${isOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 lg:max-w-0'}`}>
                  <div className="text-sm font-medium whitespace-nowrap">{item.label}</div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">{item.description}</div>
                </div>
                {isActive && (
                  <ChevronRight size={14} className={`ml-auto shrink-0 ${isOpen ? '' : 'hidden'}`} />
                )}

                {/* Tooltip for collapsed state */}
                {!isOpen && (
                  <div className="
                    absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs
                    rounded whitespace-nowrap opacity-0 group-hover:opacity-100
                    pointer-events-none transition-opacity duration-150 hidden lg:block z-50
                    border border-slate-700 shadow-lg
                  ">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-slate-700 p-4 shrink-0 ${isOpen ? '' : 'lg:p-2'}`}>
          <div className={`text-xs text-slate-500 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'opacity-100' : 'opacity-0 lg:opacity-0'}`}>
            My Personal Hub v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
