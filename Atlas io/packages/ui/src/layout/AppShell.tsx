import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

export type AppShellProps = {
  appName: string;
  appDescription: string;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  user?: { name: string; email?: string } | null;
  onOpenPalette?: () => void;
  actions?: React.ReactNode;
  className?: string;
};

export const AppShell: React.FC<AppShellProps> = ({
  appName,
  appDescription,
  breadcrumbs,
  children,
  user,
  onOpenPalette,
  actions,
  className
}) => {
  return (
    <div className="min-h-screen bg-[#111318] text-[#F4F1EA] flex flex-col font-sans selection:bg-[#4F46E5]/30">
      {/* Unified Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[rgba(244,241,234,0.1)] bg-[#1A1D24]/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6 gap-4">
          
          {/* Left: Identity */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-[#F4F1EA]">{appName}</span>
                <span className="text-[10px] text-[#6B7280] font-mono uppercase tracking-widest">{appDescription}</span>
              </div>
            </div>
          </div>
          
          {/* Center: Search / Breadcrumbs */}
          <div className="flex-1 flex justify-center max-w-xl mx-auto">
            {breadcrumbs ? (
              <Breadcrumbs items={breadcrumbs} />
            ) : (
              <button
                onClick={onOpenPalette}
                className="w-full max-w-md hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-[#6B7280] bg-[#111318] border border-[rgba(244,241,234,0.1)] rounded-[10px] hover:border-[#4F46E5]/50 hover:text-[#F4F1EA] transition-colors"
              >
                <svg className="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <span className="flex-1 text-left">Search {appName}...</span>
                <kbd className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono bg-[#1A1D24] px-1.5 py-0.5 rounded border border-[rgba(244,241,234,0.1)]">⌘K</kbd>
              </button>
            )}
          </div>

          {/* Right: Actions & User */}
          <div className="flex items-center gap-4">
            {actions && <div className="hidden lg:flex items-center gap-2">{actions}</div>}
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5]/20 flex items-center justify-center text-[#4F46E5] font-medium text-sm border border-[#4F46E5]/30">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className={twMerge("flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8", className)}>
        {children}
      </main>
    </div>
  );
};
