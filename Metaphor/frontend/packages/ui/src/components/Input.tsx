import React from 'react';
import { twMerge } from 'tailwind-merge';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[#9CA3AF]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={twMerge(
            "flex h-10 w-full rounded-[12px] border border-[rgba(244,241,234,0.1)] bg-[#111318] px-3 py-2 text-sm text-[#F4F1EA] transition-colors focus:outline-none focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[#EF4444] focus:border-[#EF4444]",
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p className={twMerge("text-xs", error ? "text-[#EF4444]" : "text-[#6B7280]")}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
