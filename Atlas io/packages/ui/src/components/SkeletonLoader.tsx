import React from 'react';
import { twMerge } from 'tailwind-merge';

export const SkeletonLoader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(
        "animate-pulse rounded-[12px] bg-[#1A1D24] border border-[rgba(244,241,234,0.05)]",
        className
      )}
      {...props}
    />
  );
};
