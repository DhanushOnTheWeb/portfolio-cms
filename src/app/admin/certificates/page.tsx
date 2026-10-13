'use client';

import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  FileText,
  X,
  Check,
  ShieldCheck,
  Trophy,
  Medal,
} from 'lucide-react';
import {
  fetchPortfolioData,
  getLocalStore,
  saveCertificate,
  removeCertificate,
  saveCertificateOrders,
} from '@/lib/portfolio-service';
import { CertificateAchievement, AchievementType } from '@/lib/types';
import { FileUploadZone } from '@/components/FileUploadZone';
import { DynamicLinksAdder } from '@/components/DynamicLinksAdder';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ReorderControls } from '@/components/ReorderButtons';
import { useToast } from '@/components/Toast';
import { revalidatePortfolio } from '@/app/actions';

const EMPTY_CERT: Omit<CertificateAchievement, 'id'> = {
  title: '',
  issuer: '',
  issue_date: '2024',
  credential_url: '',
  certificate_file_url: '',
  lor_loa_urls: [],
  type: 'certificate',
  order_index: 0,
  is_visible: true,
};

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<CertificateAchievement[]>(() => {
    if (typeof window === 'undefined') return [];
    const local = getLocalStore();
    return [...(local.certificates_achievements || [])].sort((a, b) => a.order_index - b.order_index);
  });
  const [activeType, setActiveType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Partial<CertificateAchievement>>(EMPTY_CERT);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { toast } = useToast();

  const loadData = async (force = false) => {
    const res = await fetchPortfolioData({ force });
    const sorted = [...(res.data.certificates_achievements || [])].sort((a, b) => a.order_index - b.order_index);
    setCerts(sorted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCerts =
    activeType === 'all'
      ? certs
      : certs.filter((c) => c.type === activeType);

  const handleOpenCreate = () => {
    setEditingCert({
      ...EMPTY_CERT,
      type: (activeType !== 'all' ? activeType : 'certificate') as AchievementType,
      order_index: certs.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cert: CertificateAchievement) => {
    setEditingCert({ ...cert });
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert.title || !editingCert.issuer) {
      toast('Please enter title and issuing authority', 'error');
      return;
    }

    setSaving(true);
    try {
      await saveCertificate(editingCert);
      await revalidatePortfolio('/admin/certificates');
      toast(editingCert.id ? 'Certificate updated!' : 'New credential added!', 'success');
      setModalOpen(false);
      loadData(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save certificate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await removeCertificate(deleteTargetId);
      await revalidatePortfolio('/admin/certificates');
      toast('Certificate record deleted', 'info');
      setDeleteTargetId(null);
      loadData(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete certificate', 'error');
    }
  };

  const handleToggleVisibility = async (cert: CertificateAchievement) => {
    const updated = { ...cert, is_visible: !cert.is_visible };
    await saveCertificate(updated);
    await revalidatePortfolio('/admin/certificates');
    toast(
      updated.is_visible ? `"${cert.title}" published` : `"${cert.title}" hidden`,
      'info'
    );
    loadData();
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= certs.length) return;

    const list = [...certs];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    setCerts(list);
    await saveCertificateOrders(list);
    await revalidatePortfolio('/admin/certificates');
    toast('Certificate sequence reordered', 'success');
  };

  const getTypeIcon = (type: AchievementType) => {
    switch (type) {
      case 'award':
        return <Trophy size={18} color="#f59e0b" />;
      case 'merit':
        return <Medal size={18} color="#06b6d4" />;
      default:
        return <ShieldCheck size={18} color="#10b981" />;
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
            Certificates & <span className="gradient-text">Achievements Manager</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage certifications, professional credentials, awards, LORs, and verification files.
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
          <span>Add Credential / Award</span>
        </button>
      </div>

      {/* Type Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-dim)',
          paddingBottom: '12px',
        }}
      >
        {[
          { id: 'all', label: 'All Credentials' },
          { id: 'certificate', label: 'Certifications' },
          { id: 'award', label: 'Industry Awards' },
          { id: 'merit', label: 'Merit & Hackathons' },
        ].map((t) => {
          const isActive = activeType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveType(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.5)' : 'var(--border-dim)'}`,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.825rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading && certs.length === 0 ? (
        <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading credentials...</div>
      ) : filteredCerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No certificates found in this filter. Click &ldquo;Add Credential / Award&rdquo; to add one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredCerts.map((cert, idx) => (
            <div
              key={cert.id}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                opacity: cert.is_visible ? 1 : 0.65,
                borderLeft: `4px solid ${
                  cert.type === 'award'
                    ? 'var(--amber)'
                    : cert.type === 'merit'
                    ? 'var(--cyan)'
                    : 'var(--emerald)'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getTypeIcon(cert.type)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.05rem' }}>{cert.title}</h3>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.07)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {cert.type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Issuer: <strong style={{ color: '#e2e8f0' }}>{cert.issuer}</strong></span>
                    <span>•</span>
                    <span>Date: {cert.issue_date}</span>
                    {cert.lor_loa_urls && cert.lor_loa_urls.length > 0 && (
                      <>
                        <span>•</span>
                        <span style={{ color: 'var(--cyan)' }}>
                          {cert.lor_loa_urls.length} Attached Link(s)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <ReorderControls
                  index={idx}
                  total={filteredCerts.length}
                  isVisible={cert.is_visible}
                  onMoveUp={() => handleMove(idx, 'up')}
                  onMoveDown={() => handleMove(idx, 'down')}
                  onToggleVisibility={() => handleToggleVisibility(cert)}
                />

                <div style={{ height: '24px', width: '1px', background: 'var(--border-dim)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Verify Credential"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                      }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  {cert.certificate_file_url && (
                    <a
                      href={cert.certificate_file_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open Certificate PDF / Image"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary-light)',
                        display: 'flex',
                      }}
                    >
                      <FileText size={14} />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cert)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: 'var(--primary-light)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(cert.id)}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      color: '#fb7185',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '640px', padding: '30px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingCert.id ? 'Edit Achievement' : 'Add Credential / Award'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="cms-label">Achievement Title</label>
                <input type="text" required placeholder="e.g. AWS Certified Solutions Architect - Professional" className="cms-input" value={editingCert.title || ''} onChange={(e) => setEditingCert({ ...editingCert, title: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="cms-label">Issuing Authority / Jury</label>
                  <input type="text" required placeholder="e.g. Amazon Web Services" className="cms-input" value={editingCert.issuer || ''} onChange={(e) => setEditingCert({ ...editingCert, issuer: e.target.value })} />
                </div>
                <div>
                  <label className="cms-label">Issue Date</label>
                  <input type="text" required placeholder="e.g. Nov 2024" className="cms-input" value={editingCert.issue_date || ''} onChange={(e) => setEditingCert({ ...editingCert, issue_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="cms-label">Credential Category Type</label>
                <select className="cms-select" value={editingCert.type || 'certificate'} onChange={(e) => setEditingCert({ ...editingCert, type: e.target.value as AchievementType })}>
                  <option value="certificate">Certification (Industry Accredited)</option>
                  <option value="award">Industry Award (Awwwards, Design, Tech)</option>
                  <option value="merit">Merit & Hackathon (Competitions, Honors)</option>
                </select>
              </div>

              <div>
                <label className="cms-label">Official Verification URL</label>
                <input type="url" placeholder="https://..." className="cms-input" value={editingCert.credential_url || ''} onChange={(e) => setEditingCert({ ...editingCert, credential_url: e.target.value })} />
              </div>

              {/* Certificate File Upload */}
              <FileUploadZone
                label="Certificate Document / Badge (PDF or WebP/PNG)"
                value={editingCert.certificate_file_url}
                onChange={(url) => setEditingCert({ ...editingCert, certificate_file_url: url })}
                folder="certificates"
                hint="Upload PDF certification diploma or high-res credential badge."
                allowPdf={true}
              />

              {/* Dynamic Field Adders for LOR, LOA, Transcripts */}
              <DynamicLinksAdder
                label="Supplementary Links (LOR, LOA, Transcripts, Press)"
                links={editingCert.lor_loa_urls || []}
                onChange={(links) => setEditingCert({ ...editingCert, lor_loa_urls: links })}
                presetLabels={[
                  'Letter of Recommendation (LOR)',
                  'Letter of Appreciation (LOA)',
                  'Verification Transcript',
                  'Winner Press Release',
                  'Case Study Link',
                ]}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '9px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" disabled={saving} className="gradient-glow-btn" style={{ padding: '9px 20px', borderRadius: 'var(--radius-md)', cursor: saving ? 'wait' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save Credential'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Certificate Record?"
        description="Are you sure you want to remove this credential and its associated verification links?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
