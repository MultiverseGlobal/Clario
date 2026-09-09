import { useEffect, useState } from 'react';
import { listProjects, ClarioProject } from '../../lib/projectStore';
import { Play, Plus, Clock, FileVideo } from 'lucide-react';

export function HomeView({ onSelectProject }: { onSelectProject: (p: ClarioProject) => void }) {
  const [projects, setProjects] = useState<ClarioProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await listProjects();
        setProjects(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-12 animate-fade-in">
      
      <div className="flex items-end justify-between mb-12">
        <div>
          <h1 className="font-display text-5xl font-bold tracking-tight mb-3">Workspace</h1>
          <p className="text-secondary-foreground text-lg opacity-80">
            Recent editorial and analysis projects.
          </p>
        </div>
        <button className="pds-btn-primary max-w-[160px]">
          <Plus className="w-4 h-4 mr-1" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-xl skeleton-shimmer border border-border" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 pds-card border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 border border-border">
            <FileVideo className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">No Projects Found</h3>
          <p className="text-secondary-foreground max-w-md text-center mb-6 opacity-80">
            Your workspace is empty. Create a new project to start analyzing scripts and generating storyboards.
          </p>
          <button className="pds-btn-primary max-w-[160px]">
            <Plus className="w-4 h-4 mr-1" />
            New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p)}
              className="pds-data-card p-6 flex flex-col cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center border border-border">
                  <Play className="w-5 h-5 text-accent" />
                </div>
                <span className="pds-status-badge active">
                  Active
                </span>
              </div>
              
              <h3 className="font-display text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                {p.name}
              </h3>
              
              <div className="flex items-center text-xs text-muted-foreground mt-auto pt-6 font-mono">
                <Clock className="w-3 h-3 mr-1" />
                Updated {new Date(p.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
