import React from 'react';
import { twMerge } from 'tailwind-merge';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none rounded-[12px]";
    
    const variants = {
      primary: "bg-[#4F46E5] text-white hover:bg-[#4338CA] focus-visible:ring-[#4F46E5]/50",
      secondary: "bg-[#1A1D24] text-[#F4F1EA] hover:bg-[#282C35] border border-[rgba(244,241,234,0.1)]",
      quiet: "bg-transparent text-[#9CA3AF] hover:text-[#F4F1EA] hover:bg-[#1A1D24]",
      destructive: "bg-[#EF4444] text-white hover:bg-[#DC2626] focus-visible:ring-[#EF4444]/50",
    };
    
    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        className={twMerge(baseStyle, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
