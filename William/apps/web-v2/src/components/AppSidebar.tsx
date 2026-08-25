'use client';

import {
  Broadcast, User, CompassRose, Books, Graph, Gear, Target
} from '@phosphor-icons/react';
import type { NavTab } from '@/app/page';

const NAV_ITEMS: { id: NavTab; label: string; Icon: React.ElementType }[] = [
  { id: 'pipeline',  label: 'Pipeline',  Icon: Target },
  { id: 'companion', label: 'Companion', Icon: Broadcast },
  { id: 'portrait',  label: 'Portrait',  Icon: User },
  { id: 'journeys',  label: 'Journeys',  Icon: CompassRose },
  { id: 'library',   label: 'Library',   Icon: Books },
  { id: 'world',     label: 'World',     Icon: Graph },
];

interface Props {
  activeTab: NavTab;
  onNav: (tab: NavTab) => void;
}

export function AppSidebar({ activeTab, onNav }: Props) {
  return (
    <aside className="app-sidebar">
      <div style={{ padding: '4px 8px 8px', marginBottom: 4 }}>
        <span className="sidebar-section-label">Navigation</span>
      </div>

      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`sidebar-item ${activeTab === id ? 'active' : ''}`}
          onClick={() => onNav(id)}
        >
          <Icon size={16} weight={activeTab === id ? 'fill' : 'regular'} />
          {label}
        </button>
      ))}

      <div className="sidebar-divider" style={{ marginTop: 'auto' }} />

      <button
        className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onNav('settings')}
      >
        <Gear size={16} weight={activeTab === 'settings' ? 'fill' : 'regular'} />
        Settings
      </button>
    </aside>
  );
}
