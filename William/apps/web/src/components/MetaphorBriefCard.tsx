import { useMetaphorPipeline } from '../hooks/useMetaphorPipeline';

export function MetaphorBriefCard() {
  const { brief, loading } = useMetaphorPipeline();

  if (loading) return null;
  if (!brief) return null;

  return (
    <div className="mb-8 border border-[#e5e7eb]/10 rounded-xl bg-[#000000] p-6 relative overflow-hidden text-white/90 font-mono">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      <h2 className="text-lg font-bold flex items-center gap-2 mb-4 tracking-tight">
        LIVE METAPHOR CONTEXT
      </h2>
      <p className="text-xs text-white/50 mb-6">
        William is executing based on global cognition from Metaphor OS.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div>
          <h3 className="text-sm font-semibold mb-3 tracking-widest text-emerald-400">ACTIVE GOALS</h3>
          <ul className="space-y-2">
            {brief.active_goals.length > 0 ? brief.active_goals.map((g, i) => (
              <li key={i} className="text-xs bg-white/5 px-3 py-2 rounded-md">{g}</li>
            )) : <li className="text-xs text-white/30 italic">None</li>}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 tracking-widest text-amber-400">CONSTRAINTS</h3>
          <ul className="space-y-2">
            {brief.active_constraints.length > 0 ? brief.active_constraints.map((c, i) => (
              <li key={i} className="text-xs bg-white/5 px-3 py-2 rounded-md">{c}</li>
            )) : <li className="text-xs text-white/30 italic">None</li>}
          </ul>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
        <h3 className="text-sm font-semibold mb-2 tracking-widest">RECOMMENDED FOCUS</h3>
        <div className="text-sm font-medium bg-white/10 px-4 py-3 rounded-lg border border-white/20">
          {brief.recommended_focus}
        </div>
      </div>
    </div>
  );
}
