import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Play, Pause, Activity, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Job {
  id: string;
  type: string;
  status: string;
  created_at: string;
  payload?: any;
}

export default function HqAutopilot() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("atlas_background_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();

    const channel = supabase.channel('jobs-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atlas_background_jobs' }, fetchJobs)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const toggleAutopilot = () => {
    setIsActive(!isActive);
    toast(isActive ? "Autopilot paused" : "Autopilot activated", {
      icon: isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-500" />
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen text-foreground p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-emerald-500" /> Autopilot Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage autonomous sourcing, AI generation, and outreach delivery rules.
          </p>
        </div>
        <Button onClick={toggleAutopilot} variant={isActive ? "destructive" : "default"} className="gap-2">
          {isActive ? <><Pause className="w-4 h-4" /> Pause Engine</> : <><Play className="w-4 h-4" /> Start Engine</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Status</div>
          <div className="text-xl font-semibold flex items-center gap-2">
            {isActive ? (
              <><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span> Active</>
            ) : (
              <><div className="w-3 h-3 rounded-full bg-muted-foreground/50" /> Paused</>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Queue Size</div>
          <div className="text-xl font-semibold">{jobs.filter(j => j.status === 'pending').length} items</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Processed Today</div>
          <div className="text-xl font-semibold">{jobs.filter(j => j.status === 'completed').length}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-md overflow-hidden">
        <div className="p-4 border-b border-border/60 bg-card">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Activity Log
          </h2>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm font-mono">No background jobs found.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div>
                    <div className="text-sm font-medium">{job.type}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{new Date(job.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                    job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    job.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {job.status === 'completed' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {job.status}</span> : job.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
