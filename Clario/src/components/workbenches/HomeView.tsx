import { useEffect, useState } from 'react';
import { listProjects, deleteProject, ClarioProject } from '../../lib/projectStore';
import { Play, Plus, Clock, FileVideo, Trash2 } from 'lucide-react';
import { ProjectCreationWizard } from './ProjectCreationWizard';

export function HomeView({ onSelectProject }: { onSelectProject: (p: ClarioProject) => void }) {
  const [projects, setProjects] = useState<ClarioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  const handleCreate = () => {
    setShowWizard(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
      load(); // Reload projects
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-12 animate-fade-in">
      
      <div className="flex items-end justify-between mb-12">
        <div>
          <h1 className="font-display text-5xl font-bold tracking-tight mb-3">Workspace</h1>
          <p className="text-secondary-foreground text-lg opacity-80">
            Recent editorial and analysis projects.
          </p>
        </div>
        <button onClick={handleCreate} className="pds-btn-primary max-w-[160px] hover-lift">
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
        <div className="flex flex-col items-center justify-center h-96 clario-glass-card border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 border border-border">
            <FileVideo className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">No Projects Found</h3>
          <p className="text-secondary-foreground max-w-md text-center mb-6 opacity-80">
            Your workspace is empty. Create a new project to start analyzing scripts and generating storyboards.
          </p>
          <button onClick={handleCreate} className="pds-btn-primary max-w-[160px] hover-lift">
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
              className="clario-glass-card hover-lift p-6 flex flex-col cursor-pointer group rounded-[16px] relative overflow-hidden"
            >
              {/* Subtle mesh background on hover for cards */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none clario-mesh-gradient mix-blend-overlay" />
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center border border-border shadow-sm">
                  <Play className="w-5 h-5 text-accent" />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleDelete(e, p.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="pds-status-badge active">
                    Active
                  </span>
                </div>
              </div>
              
              <h3 className="font-display text-2xl font-bold mb-2 group-hover:text-primary transition-colors relative z-10">
                {p.name}
              </h3>
              
              <div className="flex items-center text-xs text-muted-foreground mt-auto pt-6 font-mono relative z-10">
                <Clock className="w-3 h-3 mr-1" />
                Updated {new Date(p.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showWizard && (
        <ProjectCreationWizard 
          onClose={() => setShowWizard(false)} 
          onProjectCreated={(p) => {
            setShowWizard(false);
            onSelectProject(p);
          }} 
        />
      )}
    </div>
  );
}
