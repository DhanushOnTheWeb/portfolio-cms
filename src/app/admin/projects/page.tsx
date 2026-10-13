'use client';

import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Star,
  Eye,
  EyeOff,
  Sparkles,
  X,
  Check,
  Tag,
} from 'lucide-react';
import { GithubIcon } from '@/components/SocialIcons';
import {
  fetchPortfolioData,
  saveProject,
  removeProject,
  saveProjectOrders,
} from '@/lib/portfolio-service';
import { Project } from '@/lib/types';
import { FileUploadZone } from '@/components/FileUploadZone';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ReorderControls } from '@/components/ReorderButtons';
import { useToast } from '@/components/Toast';
import { revalidatePortfolio } from '@/app/actions';

const EMPTY_PROJECT: Omit<Project, 'id'> = {
  title: '',
  short_description: '',
  long_description: '',
  cover_image_url: '',
  demo_link: '',
  github_link: '',
  tech_stack: ['React', 'Three.js', 'TypeScript'],
  featured: false,
  order_index: 0,
  is_visible: true,
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project>>(EMPTY_PROJECT);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    const res = await fetchPortfolioData();
    const sorted = [...(res.data.projects || [])].sort((a, b) => a.order_index - b.order_index);
    setProjects(sorted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingProject({
      ...EMPTY_PROJECT,
      order_index: projects.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingProject({ ...proj });
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject.title) {
      toast('Please enter a project title', 'error');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveProject(editingProject);
      await revalidatePortfolio('/admin/projects');

      toast(
        editingProject.id ? 'Project updated successfully!' : 'New project added to 3D showcase!',
        'success'
      );
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save project', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await removeProject(deleteTargetId);
      await revalidatePortfolio('/admin/projects');
      toast('Project removed', 'info');
      setDeleteTargetId(null);
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete project', 'error');
    }
  };

  const handleToggleVisibility = async (proj: Project) => {
    const updated = { ...proj, is_visible: !proj.is_visible };
    await saveProject(updated);
    await revalidatePortfolio('/admin/projects');
    toast(
      updated.is_visible ? `"${proj.title}" published live` : `"${proj.title}" switched to draft`,
      'info'
    );
    loadData();
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= projects.length) return;

    const list = [...projects];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    setProjects(list);
    await saveProjectOrders(list);
    await revalidatePortfolio('/admin/projects');
    toast('Project sequence reordered', 'success');
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const current = editingProject.tech_stack || [];
    if (!current.includes(tagInput.trim())) {
      setEditingProject({
        ...editingProject,
        tech_stack: [...current, tagInput.trim()],
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    const current = editingProject.tech_stack || [];
    setEditingProject({
      ...editingProject,
      tech_stack: current.filter((item) => item !== t),
    });
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '4px' }}>
            Projects <span className="gradient-text">Showcase Manager</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Create, edit, reorder, and toggle live/draft visibility for 3D spatial project cards.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="gradient-glow-btn"
          style={{
            padding: '11px 20px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          <span>Add New Project</span>
        </button>
      </div>

      {/* Projects Grid / List */}
      {loading ? (
        <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading projects database...</div>
      ) : projects.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <FolderGit2 size={36} color="var(--primary-light)" style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '8px' }}>No projects yet</p>
          <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Click &ldquo;Add New Project&rdquo; to showcase your first 3D creation.</p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="gradient-glow-btn"
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            Create Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {projects.map((proj, idx) => (
            <div
              key={proj.id}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                borderLeft: proj.featured ? '4px solid var(--cyan)' : '1px solid var(--border-dim)',
                opacity: proj.is_visible ? 1 : 0.65,
              }}
            >
              {/* Left thumbnail & metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: '280px' }}>
                <div
                  style={{
                    width: '90px',
                    height: '65px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: '#0d1124',
                    border: '1px solid var(--border-dim)',
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proj.cover_image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80'}
                    alt={proj.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{proj.title}</h3>
                    {proj.featured && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          color: 'var(--cyan)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Star size={10} fill="currentColor" /> Featured 3D
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: '0.825rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      maxWidth: '560px',
                      marginBottom: '8px',
                    }}
                  >
                    {proj.short_description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {proj.tech_stack?.map((t, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Actions, Reorder & Links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <ReorderControls
                  index={idx}
                  total={projects.length}
                  isVisible={proj.is_visible}
                  onMoveUp={() => handleMove(idx, 'up')}
                  onMoveDown={() => handleMove(idx, 'down')}
                  onToggleVisibility={() => handleToggleVisibility(proj)}
                />

                <div style={{ height: '24px', width: '1px', background: 'var(--border-dim)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {proj.demo_link && (
                    <a
                      href={proj.demo_link}
                      target="_blank"
                      rel="noreferrer"
                      title="Live Demo"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                      }}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}

                  {proj.github_link && (
                    <a
                      href={proj.github_link}
                      target="_blank"
                      rel="noreferrer"
                      title="GitHub Repository"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                      }}
                    >
                      <GithubIcon size={15} />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(proj)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: 'var(--primary-light)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(proj.id)}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      color: '#fb7185',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete Project"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Drawer Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', padding: '32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                borderBottom: '1px solid var(--border-dim)',
                paddingBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '1.35rem' }}>
                {editingProject.id ? 'Edit Project' : 'Create Project'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="cms-label">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aether 3D Engine & Spatial Canvas"
                  className="cms-input"
                  value={editingProject.title || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                />
              </div>

              <div>
                <label className="cms-label">Short Description (Card Teaser)</label>
                <input
                  type="text"
                  required
                  placeholder="Interactive WebGL spatial canvas with real-time physics..."
                  className="cms-input"
                  value={editingProject.short_description || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, short_description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="cms-label">Full Case Study / Description</label>
                <textarea
                  rows={3}
                  placeholder="In-depth breakdown of architecture, shaders, and performance benchmarks..."
                  className="cms-textarea"
                  value={editingProject.long_description || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, long_description: e.target.value })
                  }
                />
              </div>

              {/* Cover Image Drag & Drop Uploader */}
              <FileUploadZone
                label="Cover Image / 3D Render"
                value={editingProject.cover_image_url}
                onChange={(url) => setEditingProject({ ...editingProject, cover_image_url: url })}
                folder="projects"
                accept="image/png, image/jpeg, image/webp"
                hint="Auto-compresses to WebP. 16:9 ratio recommended."
                allowPdf={false}
              />

              {/* Tech Stack Tag Adder */}
              <div>
                <label className="cms-label">Tech Stack Tags</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Type tag (e.g. WebGL, Three.js) & press Add"
                    className="cms-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    style={{
                      padding: '0 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: 'var(--primary-light)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                  >
                    Add Tag
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {editingProject.tech_stack?.map((t, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#c7d2fe',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{t}</span>
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemoveTag(t)}
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="cms-label">Live Demo URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="cms-input"
                    value={editingProject.demo_link || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, demo_link: e.target.value })}
                  />
                </div>
                <div>
                  <label className="cms-label">GitHub Repository URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    className="cms-input"
                    value={editingProject.github_link || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, github_link: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Featured & Visibility checkboxes */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-dim)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={editingProject.featured ?? false}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, featured: e.target.checked })
                    }
                  />
                  <span>Featured Project (Highlighted in 3D Gallery)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={editingProject.is_visible ?? true}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, is_visible: e.target.checked })
                    }
                  />
                  <span>Live Visibility (Uncheck for Draft)</span>
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="gradient-glow-btn"
                  style={{
                    padding: '10px 22px',
                    borderRadius: 'var(--radius-md)',
                    cursor: saving ? 'wait' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {saving ? 'Saving...' : editingProject.id ? 'Update Project' : 'Publish Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Project?"
        description="Are you sure you want to permanently remove this project? This will delete the entry from the database."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
