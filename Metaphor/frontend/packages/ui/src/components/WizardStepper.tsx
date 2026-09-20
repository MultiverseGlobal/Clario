import React from 'react';
import { twMerge } from 'tailwind-merge';

export type WizardStep = {
  id: string;
  label: string;
  description?: string;
};

export type WizardStepperProps = {
  steps: WizardStep[];
  currentStepId: string;
  className?: string;
};

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStepId,
  className
}) => {
  const currentIndex = steps.findIndex(s => s.id === currentStepId);

  return (
    <div className={twMerge("w-full py-4", className)}>
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[rgba(244,241,234,0.1)] -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#4F46E5] -z-10 transition-all duration-300" 
          style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-[#111318] px-2 relative">
              <div 
                className={twMerge(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 border-2",
                  isCompleted ? "bg-[#4F46E5] border-[#4F46E5] text-white" : 
                  isCurrent ? "bg-[#111318] border-[#4F46E5] text-[#4F46E5]" : 
                  "bg-[#111318] border-[rgba(244,241,234,0.2)] text-[#6B7280]"
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"></path></svg>
                ) : (
                  idx + 1
                )}
              </div>
              <div className="text-center absolute top-10 w-32 -left-12">
                <span className={twMerge(
                  "text-xs font-medium whitespace-nowrap",
                  isCurrent ? "text-[#F4F1EA]" : "text-[#9CA3AF]"
                )}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
