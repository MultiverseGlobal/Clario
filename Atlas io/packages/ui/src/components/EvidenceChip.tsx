import React from 'react';
import { twMerge } from 'tailwind-merge';

export type EvidenceChipProps = React.HTMLAttributes<HTMLDivElement> & {
  sourceName: string;
  confidence?: number; // 0 to 100
  date?: string;
};

export const EvidenceChip = React.forwardRef<HTMLDivElement, EvidenceChipProps>(
  ({ className, sourceName, confidence, date, ...props }, ref) => {
    
    const getConfidenceColor = (score: number) => {
      if (score >= 85) return 'text-[#10B981]';
      if (score >= 60) return 'text-[#F59E0B]';
      return 'text-[#EF4444]';
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          "inline-flex items-center gap-2 rounded-[12px] bg-[#111318] border border-[rgba(244,241,234,0.1)] px-3 py-1.5 text-xs text-[#9CA3AF]",
          className
        )}
        {...props}
      >
        <span className="font-medium text-[#F4F1EA]">{sourceName}</span>
        
        {confidence !== undefined && (
          <span className="flex items-center gap-1 border-l border-[rgba(244,241,234,0.1)] pl-2">
            <span className={getConfidenceColor(confidence)}>{confidence}%</span> match
          </span>
        )}
        
        {date && (
          <span className="border-l border-[rgba(244,241,234,0.1)] pl-2 opacity-80">
            {date}
          </span>
        )}
      </div>
    );
  }
);
EvidenceChip.displayName = 'EvidenceChip';
