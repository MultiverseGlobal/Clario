export function CompassLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-14 space-y-3.5">
      <div className="relative">
        <div className="absolute inset-0 rounded-full border border-primary/20 scale-125" />
        <svg className="h-10 w-10 text-primary compass-spin relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill="currentColor" fillOpacity="0.25" />
          <line x1="12" y1="2" x2="12" y2="4" strokeLinecap="round" />
          <line x1="12" y1="20" x2="12" y2="22" strokeLinecap="round" />
          <line x1="2" y1="12" x2="4" y2="12" strokeLinecap="round" />
          <line x1="20" y1="12" x2="22" y2="12" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-[10px] font-mono tracking-widest text-muted-foreground/80 uppercase animate-pulse">
        Orienting loop…
      </div>
    </div>
  );
}
