'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, Plus, Edit2, Trash2, Sliders, X, Check, Eye, EyeOff, Layers, Sparkles } from 'lucide-react';
import {
  fetchPortfolioData,
  getLocalStore,
  saveSkill,
  removeSkill,
  saveSkillOrders,
} from '@/lib/portfolio-service';
import { Skill, SkillCategory } from '@/lib/types';
import { FileUploadZone } from '@/components/FileUploadZone';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ReorderControls } from '@/components/ReorderButtons';
import { useToast } from '@/components/Toast';
import { revalidatePortfolio } from '@/app/actions';

const EMPTY_SKILL: Omit<Skill, 'id'> = {
  name: '',
  category: 'language',
  icon_url: '',
  proficiency_level: 85,
  order_index: 0,
  is_visible: true,
};

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(() => {
    if (typeof window === 'undefined') return [];
    const local = getLocalStore();
    return [...(local.skills || [])].sort((a, b) => a.order_index - b.order_index);
  });
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Partial<Skill>>(EMPTY_SKILL);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { toast } = useToast();

  const loadData = async (force = false) => {
    const res = await fetchPortfolioData({ force });
    const sorted = [...(res.data.skills || [])].sort((a, b) => a.order_index - b.order_index);
    setSkills(sorted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSkills =
    activeCategory === 'all'
      ? skills
      : skills.filter((s) => s.category === activeCategory);

  const handleOpenCreate = () => {
    setEditingSkill({
      ...EMPTY_SKILL,
      category: (activeCategory !== 'all' ? activeCategory : 'language') as SkillCategory,
      order_index: skills.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill({ ...skill });
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill.name) {
      toast('Please enter a skill name', 'error');
      return;
    }

    setSaving(true);
    try {
      await saveSkill(editingSkill);
      await revalidatePortfolio('/admin/skills');
      toast(editingSkill.id ? 'Skill updated!' : 'New skill added to orbit!', 'success');
      setModalOpen(false);
      loadData(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save skill', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await removeSkill(deleteTargetId);
      await revalidatePortfolio('/admin/skills');
      toast('Skill removed', 'info');
      setDeleteTargetId(null);
      loadData(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete skill', 'error');
    }
  };

  const handleToggleVisibility = async (skill: Skill) => {
    const updated = { ...skill, is_visible: !skill.is_visible };
    await saveSkill(updated);
    await revalidatePortfolio('/admin/skills');
    toast(
      updated.is_visible ? `"${skill.name}" is now visible` : `"${skill.name}" hidden`,
      'info'
    );
    loadData();
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= skills.length) return;

    const list = [...skills];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    setSkills(list);
    await saveSkillOrders(list);
    await revalidatePortfolio('/admin/skills');
    toast('Skill sequence updated', 'success');
  };

  const categories = [
    { id: 'all', label: 'All Disciplines' },
    { id: 'language', label: 'Languages & WebGL' },
    { id: 'database', label: 'Databases & Storage' },
    { id: 'tool', label: 'Tools & DevOps' },
    { id: 'soft_skill', label: 'Architecture & Leadership' },
  ];

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
            Skills & <span className="gradient-text">Tech Orbit Manager</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure proficiency levels, SVG logos, discipline categories, and sequence ordering.
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
          <span>Add Skill</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '24px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-dim)',
        }}
      >
        {categories.map((c) => {
          const isActive = activeCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.5)' : 'var(--border-dim)'}`,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.825rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Skills Grid */}
      {loading && skills.length === 0 ? (
        <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading skills...</div>
      ) : filteredSkills.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Cpu size={32} color="var(--primary-light)" style={{ marginBottom: '10px' }} />
          <p style={{ fontSize: '0.95rem', color: '#f8fafc', marginBottom: '8px' }}>No skills in this category</p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="gradient-glow-btn"
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem' }}
          >
            Add Skill
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredSkills.map((skill, idx) => (
            <div
              key={skill.id}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: skill.is_visible ? 1 : 0.65,
                borderLeft: `4px solid ${
                  skill.category === 'language'
                    ? 'var(--primary)'
                    : skill.category === 'database'
                    ? 'var(--emerald)'
                    : skill.category === 'tool'
                    ? 'var(--cyan)'
                    : 'var(--amber)'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {skill.icon_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={skill.icon_url}
                        alt={skill.name}
                        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                      />
                    ) : (
                      <Cpu size={20} color="var(--primary-light)" />
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '2px' }}>{skill.name}</h4>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {skill.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <ReorderControls
                  index={idx}
                  total={filteredSkills.length}
                  isVisible={skill.is_visible}
                  onMoveUp={() => handleMove(idx, 'up')}
                  onMoveDown={() => handleMove(idx, 'down')}
                  onToggleVisibility={() => handleToggleVisibility(skill)}
                />
              </div>

              {/* Proficiency Level Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.775rem',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Proficiency</span>
                  <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{skill.proficiency_level}%</span>
                </div>
                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${skill.proficiency_level}%`,
                      background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(skill)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: 'var(--primary-light)',
                    cursor: 'pointer',
                    fontSize: '0.775rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(skill.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    color: '#fb7185',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Delete Skill"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px', padding: '30px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                borderBottom: '1px solid var(--border-dim)',
                paddingBottom: '14px',
              }}
            >
              <h2 style={{ fontSize: '1.25rem' }}>
                {editingSkill.id ? 'Edit Skill Telemetry' : 'Add Discipline to Tech Orbit'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="cms-label">Skill / Technology Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Three.js / WebGL, Rust, Distributed Systems"
                  className="cms-input"
                  value={editingSkill.name || ''}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                />
              </div>

              <div>
                <label className="cms-label">Category</label>
                <select
                  className="cms-select"
                  value={editingSkill.category || 'language'}
                  onChange={(e) =>
                    setEditingSkill({
                      ...editingSkill,
                      category: e.target.value as SkillCategory,
                    })
                  }
                >
                  <option value="language">Languages & WebGL (Core Execution)</option>
                  <option value="database">Databases & Storage (Persistence)</option>
                  <option value="tool">Tools & DevOps (Infrastructure)</option>
                  <option value="soft_skill">Architecture & Leadership (Domain Strategy)</option>
                </select>
              </div>

              {/* Proficiency Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="cms-label" style={{ marginBottom: 0 }}>
                    Proficiency Level
                  </label>
                  <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>
                    {editingSkill.proficiency_level ?? 85}%
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={editingSkill.proficiency_level ?? 85}
                  onChange={(e) =>
                    setEditingSkill({
                      ...editingSkill,
                      proficiency_level: Number(e.target.value),
                    })
                  }
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }}
                />
              </div>

              {/* Icon Uploader or SVG URL */}
              <FileUploadZone
                label="Technology Icon (SVG or PNG)"
                value={editingSkill.icon_url}
                onChange={(url) => setEditingSkill({ ...editingSkill, icon_url: url })}
                folder="skills"
                accept="image/svg+xml, image/png, image/webp"
                hint="SVG or transparent PNG recommended for crisp 3D orbit rendering."
                allowPdf={false}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-dim)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={editingSkill.is_visible ?? true}
                    onChange={(e) =>
                      setEditingSkill({ ...editingSkill, is_visible: e.target.checked })
                    }
                  />
                  <span>Publish to live Tech Orbit grid</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="gradient-glow-btn"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    cursor: saving ? 'wait' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {saving ? 'Saving...' : editingSkill.id ? 'Update Skill' : 'Save Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Skill?"
        description="Are you sure you want to remove this skill from your tech stack showcase?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
