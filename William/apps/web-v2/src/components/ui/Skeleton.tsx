'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function Skeleton({
  className = '',
  width = '100%',
  height = '20px',
  borderRadius = '12px',
}: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`bg-stone-200/60 dark:bg-stone-800/60 ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`aurora-glass-card p-6 flex flex-col justify-between space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <Skeleton width="40%" height={16} />
        <Skeleton width={24} height={24} borderRadius="50%" />
      </div>
      <div className="space-y-2">
        <Skeleton width="70%" height={32} />
        <Skeleton width="90%" height={14} />
      </div>
      <div className="pt-2">
        <Skeleton width="100%" height={36} borderRadius="9999px" />
      </div>
    </div>
  );
}

export function SkeletonPill({ className = '' }: { className?: string }) {
  return <Skeleton width="100%" height={42} borderRadius="9999px" className={className} />;
}
