import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          "rounded-[20px] border border-[rgba(244,241,234,0.1)] bg-[#1A1D24] p-6",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
