"use client";

import React, { useState } from "react";
import { CalendarBlank, Check, Plus } from "@phosphor-icons/react";
import type { ScheduleItem } from "@/lib/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";

interface UpcomingScheduleProps {
  items: ScheduleItem[];
  isLoading?: boolean;
  onToggleItem?: (id: string, currentStatus: boolean) => void;
  onAddItem?: (title: string) => void;
}

export const UpcomingSchedule: React.FC<UpcomingScheduleProps> = ({
  items,
  isLoading = false,
  onToggleItem,
  onAddItem,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  if (isLoading) {
    return <SkeletonCard />;
  }

  const handleToggle = (id: string, currentStatus: boolean) => {
    if (onToggleItem) {
      onToggleItem(id, currentStatus);
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      if (onAddItem) {
        onAddItem(newTitle.trim());
      }
      setNewTitle("");
      setIsAdding(false);
    }
  };

  return (
    <div className="aurora-glass-card p-6 w-full flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-[var(--aurora-text-sub)]">
          <CalendarBlank size={16} weight="bold" className="text-[var(--aurora-text-muted)]" />
          <span>Upcoming Schedule</span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 rounded-full hover:bg-black/5 text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-main)] transition-colors cursor-pointer"
          title="Add Event"
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>

      {/* Inline Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddEvent} 
            className="mb-3 flex items-center gap-2 overflow-hidden"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Event title..."
              autoFocus
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white/70 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 outline-none text-[var(--aurora-text-main)]"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs rounded-xl bg-orange-500 text-white font-semibold cursor-pointer"
            >
              Add
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Item List */}
      <div className="space-y-3.5 flex-1 relative">
        {items.length === 0 ? (
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-xs text-[var(--aurora-text-muted)] py-4 text-center"
          >
            No upcoming schedule items.
          </motion.p>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                key={item.id}
                onClick={() => handleToggle(item.id, item.completed)}
                className={`group flex items-start gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                  item.completed ? "opacity-45" : "hover:bg-white/40 dark:hover:bg-white/5"
                }`}
              >
                {/* Left Accent Bar */}
                <div
                  className={`w-1 h-8 rounded-full transition-colors mt-0.5 ${
                    item.completed
                      ? "bg-emerald-500"
                      : "bg-stone-800 dark:bg-stone-200 group-hover:bg-orange-500"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-bold text-[var(--aurora-text-main)] truncate ${
                        item.completed ? "line-through" : ""
                      }`}
                    >
                      {item.time} <span className="font-semibold">• {item.title}</span>
                    </p>
                    {item.completed && <Check size={14} className="text-emerald-500" />}
                  </div>
                  <p className="text-[11px] text-[var(--aurora-text-sub)] mt-0.5 truncate">
                    {item.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

