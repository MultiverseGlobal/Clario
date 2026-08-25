import React from "react";

export function CardSkeleton() {
  return (
    <div className="w-full p-6 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2" />
          <div className="space-y-2">
            <div className="w-32 h-4 rounded-md bg-surface-2" />
            <div className="w-20 h-3 rounded-md bg-surface-2/60" />
          </div>
        </div>
        <div className="w-16 h-6 rounded-full bg-surface-2" />
      </div>
      <div className="w-full h-12 rounded-lg bg-surface-2/40" />
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
        <div className="w-24 h-3 rounded-md bg-surface-2" />
        <div className="w-20 h-7 rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}

export function GraphSkeleton() {
  return (
    <div className="w-full h-full min-h-[500px] rounded-2xl bg-surface-1/50 border border-border-subtle animate-pulse p-8 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5" />
      <div className="flex items-center gap-8 mb-12">
        <div className="w-24 h-10 rounded-full bg-surface-2" />
        <div className="w-28 h-10 rounded-full bg-surface-2/80" />
        <div className="w-24 h-10 rounded-full bg-surface-2" />
      </div>
      <div className="flex items-center gap-16">
        <div className="w-32 h-12 rounded-2xl bg-surface-2" />
        <div className="w-36 h-14 rounded-2xl bg-surface-2/90" />
        <div className="w-32 h-12 rounded-2xl bg-surface-2" />
      </div>
      <div className="mt-12 flex items-center gap-6">
        <div className="w-20 h-4 rounded-md bg-surface-2/60" />
        <div className="w-24 h-4 rounded-md bg-surface-2/60" />
      </div>
    </div>
  );
}

export function InboxItemSkeleton() {
  return (
    <div className="w-full p-6 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-16 h-5 rounded-md bg-surface-2" />
          <div className="w-40 h-5 rounded-md bg-surface-2" />
        </div>
        <div className="flex gap-2">
          <div className="w-24 h-9 rounded-xl bg-surface-2" />
          <div className="w-20 h-9 rounded-xl bg-surface-2/60" />
        </div>
      </div>
      <div className="w-full h-14 rounded-xl bg-surface-2/40" />
      <div className="w-48 h-3 rounded-md bg-surface-2/60" />
    </div>
  );
}
