import { useEffect, useState } from 'react';
import { listProjects, deleteProject, saveProject, ClarioProject } from '../../lib/projectStore';
import { Play, Plus, Clock, FileVideo, Trash2, Edit2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { ProjectCreationWizard } from './ProjectCreationWizard';

export function HomeView({ 
  onSelectProject,
  onNavigatePhase
}: { 
  onSelectProject: (p: ClarioProject) => void;
  onNavigatePhase?: (phase: any) => void;
}) {
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

  const [projectToDelete, setProjectToDelete] = useState<ClarioProject | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<ClarioProject | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    setShowWizard(true);
  };

  const handleDelete = (e: React.MouseEvent, p: ClarioProject) => {
    e.stopPropagation();
    setProjectToDelete(p);
  };

  const handleEdit = (e: React.MouseEvent, p: ClarioProject) => {
    e.stopPropagation();
    setProjectToEdit(p);
    setEditName(p.name);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      load();
    }
  };

  const confirmEdit = async () => {
    if (projectToEdit && editName.trim()) {
      await saveProject({ ...projectToEdit, name: editName.trim() });
      setProjectToEdit(null);
      load();
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
                    onClick={(e) => handleEdit(e, p)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-foreground hover:bg-surface-3 rounded-lg"
                    title="Rename Project"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, p)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {(() => {
                    const hasResults = (p.harvestProject?.clean_assets?.length ?? 0) > 0
                      || (p.selectedAssets?.length ?? 0) > 0
                      || (p.trackItems?.length ?? 0) > 0;
                    return (
                      <span className={`pds-status-badge ${hasResults ? 'completed' : 'active'}`}>
                        {hasResults ? 'Processed' : 'Active'}
                      </span>
                    );
                  })()}
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

      <AnimatePresence>
      {showWizard && (
        <ProjectCreationWizard 
          onClose={() => setShowWizard(false)} 
          onProjectCreated={(p) => {
            setShowWizard(false);
            onSelectProject(p);
          }}
          onSaveToLibrary={(p) => {
            setShowWizard(false);
            onSelectProject(p);
            onNavigatePhase?.('reference_library');
          }}
        />
      )}
      </AnimatePresence>

      {projectToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setProjectToDelete(null)}>
          <div className="clario-glass-card max-w-sm w-full p-6 rounded-2xl shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold mb-2">Delete Project?</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{projectToDelete.name}"</span>?<br/>This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setProjectToDelete(null)}>Cancel</button>
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {projectToEdit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setProjectToEdit(null)}>
          <div className="clario-glass-card max-w-sm w-full p-6 rounded-2xl shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold mb-4">Rename Project</h3>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent mb-6"
              placeholder="Project Name"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && confirmEdit()}
            />
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setProjectToEdit(null)}>Cancel</button>
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20" onClick={confirmEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
