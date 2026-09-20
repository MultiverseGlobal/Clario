import React from 'react';
import { twMerge } from 'tailwind-merge';

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-[#1A1D24] text-[#9CA3AF] border-[rgba(244,241,234,0.1)]",
      success: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
      warning: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
      danger:  "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
      info:    "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20",
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
