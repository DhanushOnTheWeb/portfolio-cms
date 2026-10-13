'use client';

import React, { useEffect, useState } from 'react';
import {
  Layers,
  Briefcase,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  ExternalLink,
  X,
  FileText,
} from 'lucide-react';
import {
  fetchPortfolioData,
  getLocalStore,
  saveExperience,
  removeExperience,
  saveExperienceOrders,
  saveEducation,
  removeEducation,
  saveEducationOrders,
} from '@/lib/portfolio-service';
import { WorkExperience, Education } from '@/lib/types';
import { FileUploadZone } from '@/components/FileUploadZone';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ReorderControls } from '@/components/ReorderButtons';
import { useToast } from '@/components/Toast';
import { revalidatePortfolio } from '@/app/actions';

const EMPTY_EXP: Omit<WorkExperience, 'id'> = {
  role: '',
  company: '',
  location: 'Remote',
  start_date: '2023',
  end_date: 'Present',
  is_current: true,
  description: '',
  certificate_url: '',
  order_index: 0,
  is_visible: true,
};

const EMPTY_EDU: Omit<Education, 'id'> = {
  institution: '',
  degree: '',
  score_or_cgpa: '',
  start_year: '2020',
  end_year: '2024',
  description: '',
  order_index: 0,
  is_visible: true,
};

export default function AdminTimelinePage() {
  const [tab, setTab] = useState<'experience' | 'education'>('experience');
  const [experiences, setExperiences] = useState<WorkExperience[]>(() => {
    if (typeof window === 'undefined') return [];
    const local = getLocalStore();
    return [...(local.work_experience || [])].sort((a, b) => a.order_index - b.order_index);
  });
  const [educations, setEducations] = useState<Education[]>(() => {
    if (typeof window === 'undefined') return [];
    const local = getLocalStore();
    return [...(local.education || [])].sort((a, b) => a.order_index - b.order_index);
  });
  const [loading, setLoading] = useState(false);

  // Experience modal
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Partial<WorkExperience>>(EMPTY_EXP);

  // Education modal
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Partial<Education>>(EMPTY_EDU);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'exp' | 'edu' } | null>(null);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  const loadData = async (force = false) => {
    const res = await fetchPortfolioData({ force });
    setExperiences([...(res.data.work_experience || [])].sort((a, b) => a.order_index - b.order_index));
    setEducations([...(res.data.education || [])].sort((a, b) => a.order_index - b.order_index));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Experience Actions ---
  const handleOpenCreateExp = () => {
    setEditingExp({
      ...EMPTY_EXP,
      order_index: experiences.length + 1,
    });
    setExpModalOpen(true);
  };

  const handleOpenEditExp = (exp: WorkExperience) => {
    setEditingExp({ ...exp });
    setExpModalOpen(true);
  };

  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExp.role || !editingExp.company) {
      toast('Please enter role and company name', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveExperience(editingExp);
      await revalidatePortfolio('/admin/timeline');
      toast(editingExp.id ? 'Experience updated!' : 'New position added to timeline!', 'success');
      setExpModalOpen(false);
      loadData(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save experience', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExpVisibility = async (exp: WorkExperience) => {
    const updated = { ...exp, is_visible: !exp.is_visible };
    await saveExperience(updated);
    await revalidatePortfolio('/admin/timeline');
    toast(updated.is_visible ? `"${exp.role}" published` : `"${exp.role}" hidden`, 'info');
    loadData(true);
  };

  const handleMoveExp = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= experiences.length) return;
    const list = [...experiences];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);
    setExperiences(list);
    await saveExperienceOrders(list);
    await revalidatePortfolio('/admin/timeline');
  };

  // --- Education Actions ---
  const handleOpenCreateEdu = () => {
    setEditingEdu({
      ...EMPTY_EDU,
      order_index: educations.length + 1,
    });
    setEduModalOpen(true);
  };

  const handleOpenEditEdu = (edu: Education) => {
    setEditingEdu({ ...edu });
    setEduModalOpen(true);
  };

  const handleSaveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEdu.institution || !editingEdu.degree) {
      toast('Please enter institution and degree title', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveEducation(editingEdu);
      await revalidatePortfolio('/admin/timeline');
      toast(editingEdu.id ? 'Education entry updated!' : 'New degree added to timeline!', 'success');
      setEduModalOpen(false);
      loadData(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save education', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEduVisibility = async (edu: Education) => {
    const updated = { ...edu, is_visible: !edu.is_visible };
    await saveEducation(updated);
    await revalidatePortfolio('/admin/timeline');
    toast(updated.is_visible ? `"${edu.degree}" published` : `"${edu.degree}" hidden`, 'info');
    loadData(true);
  };

  const handleMoveEdu = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= educations.length) return;
    const list = [...educations];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);
    setEducations(list);
    await saveEducationOrders(list);
    await revalidatePortfolio('/admin/timeline');
  };

  // --- Common Delete Confirm ---
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'exp') {
        await removeExperience(deleteTarget.id);
        toast('Experience entry deleted', 'info');
      } else {
        await removeEducation(deleteTarget.id);
        toast('Education record deleted', 'info');
      }
      await revalidatePortfolio('/admin/timeline');
      setDeleteTarget(null);
      loadData(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
    }
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
            Career & <span className="gradient-text">Timeline Manager</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage professional software engineering history, roles, degrees, and certificates.
          </p>
        </div>

        <button
          type="button"
          onClick={tab === 'experience' ? handleOpenCreateExp : handleOpenCreateEdu}
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
          <span>{tab === 'experience' ? 'Add Experience' : 'Add Degree'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-dim)',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('experience')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9999px',
            background: tab === 'experience' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            border: `1px solid ${tab === 'experience' ? 'rgba(99, 102, 241, 0.45)' : 'transparent'}`,
            color: tab === 'experience' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: tab === 'experience' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          <Briefcase size={16} color={tab === 'experience' ? 'var(--cyan)' : 'currentColor'} />
          <span>Work Experience ({experiences.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('education')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9999px',
            background: tab === 'education' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            border: `1px solid ${tab === 'education' ? 'rgba(99, 102, 241, 0.45)' : 'transparent'}`,
            color: tab === 'education' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: tab === 'education' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          <GraduationCap size={16} color={tab === 'education' ? 'var(--cyan)' : 'currentColor'} />
          <span>Academic & Degrees ({educations.length})</span>
        </button>
      </div>

      {/* Content for Tab 1: Experience */}
      {tab === 'experience' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {experiences.length === 0 ? (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No experience records found. Click &ldquo;Add Experience&rdquo; to populate.
            </div>
          ) : (
            experiences.map((exp, idx) => (
              <div
                key={exp.id}
                className="glass-panel glass-panel-hover"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  opacity: exp.is_visible ? 1 : 0.65,
                  borderLeft: exp.is_current ? '4px solid var(--emerald)' : '1px solid var(--border-dim)',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{exp.role}</h3>
                    <span style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: '0.9rem' }}>
                      @ {exp.company}
                    </span>
                    {exp.is_current && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontWeight: 600,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {exp.start_date} &ndash; {exp.is_current ? 'Present' : exp.end_date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> {exp.location}
                    </span>
                    {exp.certificate_url && (
                      <a
                        href={exp.certificate_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <FileText size={13} /> Doc Attached
                      </a>
                    )}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, maxWidth: '650px' }}>
                    {exp.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <ReorderControls
                    index={idx}
                    total={experiences.length}
                    isVisible={exp.is_visible}
                    onMoveUp={() => handleMoveExp(idx, 'up')}
                    onMoveDown={() => handleMoveExp(idx, 'down')}
                    onToggleVisibility={() => handleToggleExpVisibility(exp)}
                  />

                  <div style={{ height: '24px', width: '1px', background: 'var(--border-dim)' }} />

                  <button
                    type="button"
                    onClick={() => handleOpenEditExp(exp)}
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
                    onClick={() => setDeleteTarget({ id: exp.id, type: 'exp' })}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      color: '#fb7185',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    title="Delete Position"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content for Tab 2: Education */}
      {tab === 'education' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {educations.length === 0 ? (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No education records found. Click &ldquo;Add Degree&rdquo; to populate.
            </div>
          ) : (
            educations.map((edu, idx) => (
              <div
                key={edu.id}
                className="glass-panel glass-panel-hover"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  opacity: edu.is_visible ? 1 : 0.65,
                  borderLeft: '4px solid var(--primary)',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{edu.degree}</h3>
                    <span style={{ color: 'var(--primary-light)', fontWeight: 600, fontSize: '0.9rem' }}>
                      @ {edu.institution}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {edu.start_year} &ndash; {edu.end_year}
                    </span>
                    {edu.score_or_cgpa && (
                      <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                        Score: {edu.score_or_cgpa}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, maxWidth: '650px' }}>
                    {edu.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <ReorderControls
                    index={idx}
                    total={educations.length}
                    isVisible={edu.is_visible}
                    onMoveUp={() => handleMoveEdu(idx, 'up')}
                    onMoveDown={() => handleMoveEdu(idx, 'down')}
                    onToggleVisibility={() => handleToggleEduVisibility(edu)}
                  />

                  <div style={{ height: '24px', width: '1px', background: 'var(--border-dim)' }} />

                  <button
                    type="button"
                    onClick={() => handleOpenEditEdu(edu)}
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
                    onClick={() => setDeleteTarget({ id: edu.id, type: 'edu' })}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      color: '#fb7185',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    title="Delete Degree"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Experience Add/Edit Modal */}
      {expModalOpen && (
        <div className="modal-overlay" onClick={() => setExpModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '600px', padding: '30px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingExp.id ? 'Edit Experience' : 'Add Work Experience'}</h2>
              <button type="button" onClick={() => setExpModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveExp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="cms-label">Job Title / Role</label>
                  <input type="text" required placeholder="e.g. Lead Frontend Architect" className="cms-input" value={editingExp.role || ''} onChange={(e) => setEditingExp({ ...editingExp, role: e.target.value })} />
                </div>
                <div>
                  <label className="cms-label">Company Name</label>
                  <input type="text" required placeholder="e.g. HyperSphere Labs" className="cms-input" value={editingExp.company || ''} onChange={(e) => setEditingExp({ ...editingExp, company: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="cms-label">Location</label>
                  <input type="text" placeholder="e.g. San Francisco (Remote)" className="cms-input" value={editingExp.location || ''} onChange={(e) => setEditingExp({ ...editingExp, location: e.target.value })} />
                </div>
                <div>
                  <label className="cms-label">Start Date</label>
                  <input type="text" required placeholder="e.g. Jan 2023" className="cms-input" value={editingExp.start_date || ''} onChange={(e) => setEditingExp({ ...editingExp, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="cms-label">End Date</label>
                  <input type="text" disabled={editingExp.is_current} placeholder="Present" className="cms-input" value={editingExp.is_current ? 'Present' : (editingExp.end_date || '')} onChange={(e) => setEditingExp({ ...editingExp, end_date: e.target.value })} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={editingExp.is_current ?? false} onChange={(e) => setEditingExp({ ...editingExp, is_current: e.target.checked, end_date: e.target.checked ? 'Present' : '' })} />
                <span>I currently work in this role</span>
              </label>

              <div>
                <label className="cms-label">Impact & Responsibilities Description</label>
                <textarea rows={3} required placeholder="Spearheaded real-time 3D collaboration canvas handling 100k+ MAU..." className="cms-textarea" value={editingExp.description || ''} onChange={(e) => setEditingExp({ ...editingExp, description: e.target.value })} />
              </div>

              <FileUploadZone
                label="Experience Certificate or Verification (PDF/Image)"
                value={editingExp.certificate_url}
                onChange={(url) => setEditingExp({ ...editingExp, certificate_url: url })}
                folder="experience"
                hint="Upload offer letter, promotion certificate, or verification PDF."
                allowPdf={true}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setExpModalOpen(false)} style={{ padding: '9px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" disabled={saving} className="gradient-glow-btn" style={{ padding: '9px 20px', borderRadius: 'var(--radius-md)', cursor: saving ? 'wait' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save Role'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Education Add/Edit Modal */}
      {eduModalOpen && (
        <div className="modal-overlay" onClick={() => setEduModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '600px', padding: '30px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingEdu.id ? 'Edit Degree' : 'Add Degree / Education'}</h2>
              <button type="button" onClick={() => setEduModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveEdu} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="cms-label">Degree / Field of Study</label>
                  <input type="text" required placeholder="e.g. M.S. in Computer Science" className="cms-input" value={editingEdu.degree || ''} onChange={(e) => setEditingEdu({ ...editingEdu, degree: e.target.value })} />
                </div>
                <div>
                  <label className="cms-label">Institution / University</label>
                  <input type="text" required placeholder="e.g. Stanford University" className="cms-input" value={editingEdu.institution || ''} onChange={(e) => setEditingEdu({ ...editingEdu, institution: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="cms-label">CGPA / Score</label>
                  <input type="text" placeholder="e.g. 3.95 / 4.00" className="cms-input" value={editingEdu.score_or_cgpa || ''} onChange={(e) => setEditingEdu({ ...editingEdu, score_or_cgpa: e.target.value })} />
                </div>
                <div>
                  <label className="cms-label">Start Year</label>
                  <input type="text" required placeholder="e.g. 2017" className="cms-input" value={editingEdu.start_year || ''} onChange={(e) => setEditingEdu({ ...editingEdu, start_year: e.target.value })} />
                </div>
                <div>
                  <label className="cms-label">End Year</label>
                  <input type="text" required placeholder="e.g. 2019" className="cms-input" value={editingEdu.end_year || ''} onChange={(e) => setEditingEdu({ ...editingEdu, end_year: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="cms-label">Academic Description / Highlights</label>
                <textarea rows={3} placeholder="Research focus on hardware-accelerated shaders and distributed database consistency..." className="cms-textarea" value={editingEdu.description || ''} onChange={(e) => setEditingEdu({ ...editingEdu, description: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEduModalOpen(false)} style={{ padding: '9px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" disabled={saving} className="gradient-glow-btn" style={{ padding: '9px 20px', borderRadius: 'var(--radius-md)', cursor: saving ? 'wait' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save Degree'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Timeline Entry?"
        description="Are you sure you want to permanently remove this career history record?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
