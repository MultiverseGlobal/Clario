import React from 'react';
import { twMerge } from 'tailwind-merge';

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, description, action, icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          "flex flex-col items-center justify-center p-12 text-center rounded-[20px] border border-dashed border-[rgba(244,241,234,0.15)] bg-[#1A1D24]/50",
          className
        )}
        {...props}
      >
        {icon && <div className="mb-4 text-[#9CA3AF] opacity-80">{icon}</div>}
        <h3 className="mb-2 text-lg font-medium text-[#F4F1EA]">{title}</h3>
        <p className="mb-6 max-w-sm text-sm text-[#9CA3AF] leading-relaxed">
          {description}
        </p>
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';
