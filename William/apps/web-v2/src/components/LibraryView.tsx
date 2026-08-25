'use client';

import React, { useState } from 'react';
import type { LibraryItem } from '@/lib/types';
import { BookOpen, Lightbulb, Notepad, File, Plus } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICON: Record<string, React.ElementType> = {
  lesson: BookOpen,
  idea:   Lightbulb,
  note:   Notepad,
};

const TYPE_COLOR: Record<string, string> = {
  lesson: '#6366f1',
  idea:   '#f59e0b',
  note:   '#10b981',
};

interface Props { 
  items: LibraryItem[];
  onUpdate?: (updatedItem: any) => void;
}

export function LibraryView({ items, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("note");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !onUpdate) return;
    
    const newItem: LibraryItem = {
      id: `lib_${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
      author: 'You',
      dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      tags: [newType]
    };
    
    onUpdate(newItem);
    setNewTitle("");
    setNewContent("");
    setIsAdding(false);
  };

  return (
    <div className="page-content">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="page-title">Library</h1>
          <p className="page-subtitle mb-0">Everything William has preserved — lessons, ideas, notes.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="aurora-glass-pill px-4 py-2 flex items-center gap-2 text-sm font-semibold text-[var(--aurora-text-main)] transition-colors hover:bg-white/40 dark:hover:bg-white/10"
        >
          <Plus size={16} weight="bold" /> Add Note
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden aurora-glass-card p-5"
            onSubmit={handleAdd}
          >
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Title..." 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border)] py-2 text-[var(--aurora-text-main)] outline-none font-semibold"
                autoFocus
                required
              />
              <textarea 
                placeholder="What's on your mind?"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full bg-transparent border-none py-2 text-sm text-[var(--aurora-text-secondary)] outline-none resize-none h-20"
                required
              />
              <div className="flex justify-between items-center mt-2">
                <select 
                  value={newType} 
                  onChange={e => setNewType(e.target.value)}
                  className="bg-transparent border border-[var(--border)] text-sm rounded-md px-2 py-1 outline-none text-[var(--aurora-text-main)]"
                >
                  <option value="note">Note</option>
                  <option value="idea">Idea</option>
                  <option value="lesson">Lesson</option>
                </select>
                <button type="submit" className="bg-[var(--accent)] text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                  Save to Library
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {items.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your library is empty.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        <AnimatePresence>
          {items.map(item => {
            const Icon = TYPE_ICON[item.type] ?? File;
            const color = TYPE_COLOR[item.type] ?? '#71717a';
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={item.id} 
                className="card" 
                style={{ cursor: 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color,
                  }}>
                    <Icon size={16} weight="duotone" />
                  </div>
                  <span className="badge">{item.type}</span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{item.content}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {item.tags.map(tag => (
                    <span key={tag} className="badge" style={{ fontSize: 10 }}>{tag}</span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>{item.dateAdded}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
