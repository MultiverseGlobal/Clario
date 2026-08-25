import React, { useState } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";

interface ThreadInputProps {
  onSubmit?: (text: string) => void;
  disabled?: boolean;
}

export function ThreadInput({ onSubmit, disabled }: ThreadInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit?.(value);
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-8 pt-4 bg-background">
      <div 
        className="relative flex items-center bg-surface-1 border border-border-strong rounded-2xl shadow-md focus-within:shadow-lg focus-within:border-primary/50 transition-all duration-300"
      >
        <button className="pl-4 pr-2 text-muted hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-l-2xl">
          <Plus className="w-5 h-5" />
        </button>
        
        <input 
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask a follow-up or provide new context..."
          className="w-full py-4 px-2 bg-transparent border-none outline-none text-foreground text-sm font-medium placeholder:text-muted/50 disabled:opacity-50"
        />
        
        <div className="pr-4 flex items-center gap-2">
          <div className="hidden sm:flex">
            <Kbd>Return</Kbd>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ring-offset-2 disabled:opacity-50 disabled:hover:scale-100"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
