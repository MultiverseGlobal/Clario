import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Inbox, Activity, CalendarDays, Target } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@pseudonyms/ui";
import { Button } from "@pseudonyms/ui";
import { Badge } from "@pseudonyms/ui";
import { EmptyState } from "@pseudonyms/ui";
import { supabase } from "@/integrations/supabase/client";

export default function HqToday() {
  const [pipelineMetrics, setPipelineMetrics] = useState({
    activeTargets: 0,
    openReplies: 0,
    dueTasks: 0,
    pipelineValue: "$0",
  });
  
  const [nextAction, setNextAction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        // Fetch uncontacted opportunities
        const { data: opps } = await supabase
          .from("atlas_opportunities")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("is_contacted", false)
          .order("fit_score", { ascending: false });
          
        const targets = opps || [];
        
        // Fetch outreach with status 'replied'
        const { data: outreach } = await supabase
          .from("atlas_outreach")
          .select("*")
          .eq("status", "replied");
          
        const replies = outreach || [];

        setPipelineMetrics({
          activeTargets: targets.length,
          openReplies: replies.length,
          dueTasks: targets.length > 0 ? 1 : 0, // Placeholder
          pipelineValue: `$${(targets.length * 15000).toLocaleString()}`, // Placeholder logic
        });
        
        // Determine the single next best action
        if (replies.length > 0) {
          setNextAction({
            type: 'reply',
            title: `Reply from ${replies[0].recipient_name}`,
            description: `They replied to your outreach regarding ${replies[0].company_name}. Follow up to move to the next stage.`,
            link: '/hq/outreach'
          });
        } else if (targets.length > 0) {
          setNextAction({
            type: 'target',
            title: `Contact ${targets[0].organization_name || 'Top Target'}`,
            description: `Highest fit score target awaiting initial outreach. Target intent score is ${targets[0].fit_score}.`,
            link: '/hq/radar'
          });
        } else {
          setNextAction(null);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodayData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading Today view...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--pds-text-primary)]">Today</h1>
        <p className="text-[var(--pds-text-muted)] mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Primary Action Card */}
      <section>
        <h2 className="text-sm font-semibold tracking-wide text-[var(--pds-text-muted)] uppercase mb-3">Single Best Action</h2>
        {nextAction ? (
          <Card className="border-[var(--pds-color-primary)]/30 bg-[var(--pds-color-primary)]/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                {nextAction.type === 'reply' ? <Inbox className="w-4 h-4 text-[var(--pds-color-primary)]" /> : <Target className="w-4 h-4 text-[var(--pds-color-primary)]" />}
                <Badge variant="primary">High Priority</Badge>
              </div>
              <CardTitle>{nextAction.title}</CardTitle>
              <CardDescription>{nextAction.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link to={nextAction.link}>
                <Button variant="primary">
                  Execute Action <ArrowUpRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <EmptyState 
            icon={<CheckCircle2 />}
            title="You're all caught up"
            description="No immediate actions required. Go find some new targets."
            action={{ label: "Go to Radar", onClick: () => {} }}
          />
        )}
      </section>

      {/* Metrics Grid */}
      <section>
        <h2 className="text-sm font-semibold tracking-wide text-[var(--pds-text-muted)] uppercase mb-3">Pipeline Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--pds-text-muted)] flex items-center justify-between">
                Active Targets
                <Target className="w-4 h-4 text-[var(--pds-text-muted)]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pipelineMetrics.activeTargets}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--pds-text-muted)] flex items-center justify-between">
                Open Replies
                <Inbox className="w-4 h-4 text-[var(--pds-text-muted)]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pipelineMetrics.openReplies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--pds-text-muted)] flex items-center justify-between">
                Due Tasks
                <CalendarDays className="w-4 h-4 text-[var(--pds-text-muted)]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pipelineMetrics.dueTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--pds-text-muted)] flex items-center justify-between">
                Pipeline Value
                <Activity className="w-4 h-4 text-[var(--pds-text-muted)]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--pds-color-success)]">{pipelineMetrics.pipelineValue}</div>
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
}
