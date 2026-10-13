'use client';

import React, { useEffect, useState } from 'react';
import { Save, User, FileText, CheckCircle2, Globe, Sparkles } from 'lucide-react';
import { GithubIcon, LinkedinIcon, TwitterIcon, InstagramIcon } from '@/components/SocialIcons';
import { fetchPortfolioData, saveProfileIntro } from '@/lib/portfolio-service';
import { ProfileIntro, SocialLinks } from '@/lib/types';
import { initialPortfolioData } from '@/lib/mock-data';
import { FileUploadZone } from '@/components/FileUploadZone';
import { AvatarSelector } from '@/components/AvatarSelector';
import { useToast } from '@/components/Toast';
import { revalidatePortfolio } from '@/app/actions';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileIntro>(initialPortfolioData.profile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPortfolioData().then((res) => {
      if (res.data.profile) {
        setProfile(res.data.profile);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (field: keyof ProfileIntro, val: unknown) => {
    setProfile((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleSocialChange = (network: keyof SocialLinks, val: string) => {
    setProfile((prev) => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [network]: val,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfileIntro(profile);
      await revalidatePortfolio('/admin/profile');
      toast('Hero profile details updated & revalidated!', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save profile changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading profile telemetry...</div>;
  }

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
            Hero & <span className="gradient-text">Profile Intro Editor</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage your personal branding, 3D hero tagline, avatar, resume PDF, and social channels.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="gradient-glow-btn"
          style={{
            padding: '11px 22px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Profile'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Core Profile Card */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
            <User size={20} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.2rem' }}>Identity & Hero Content</h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label className="cms-label">Full Name</label>
              <input
                type="text"
                required
                className="cms-input"
                value={profile.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="e.g. Alex Rivera"
              />
            </div>

            <div>
              <label className="cms-label">Status Badge (Live Hero Indicator)</label>
              <input
                type="text"
                className="cms-input"
                value={profile.status_badge}
                onChange={(e) => handleChange('status_badge', e.target.value)}
                placeholder="e.g. Open to Senior Architect Roles"
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="cms-label">Hero Tagline / Primary Role</label>
            <input
              type="text"
              required
              className="cms-input"
              value={profile.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              placeholder="e.g. Creative Technologist & 3D Web Engineer"
            />
          </div>

          <div>
            <label className="cms-label">Bio / About Statement</label>
            <textarea
              rows={4}
              required
              className="cms-textarea"
              value={profile.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Crafting hyper-interactive digital experiences..."
            />
          </div>
        </div>

        {/* 3D Animated Avatar Selection Card */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Sparkles size={20} color="var(--cyan)" />
            <h3 style={{ fontSize: '1.2rem' }}>Hero 3D Animated Figurine Avatar</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Select your 3D animated character figurine for the interactive 3D hero tilt card. Choose between 4 male and 4 female character designs.
          </p>

          <AvatarSelector
            value={profile.avatar_url || '/avatars/male-1.png'}
            onChange={(url) => handleChange('avatar_url', url)}
          />
        </div>

        {/* Resume & Curriculum Vitae Card */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <FileText size={20} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.2rem' }}>Resume & Curriculum Vitae (PDF)</h3>
          </div>
          <FileUploadZone
            label="Official Resume / CV Document"
            value={profile.resume_file_url}
            onChange={(url) => handleChange('resume_file_url', url)}
            folder="documents"
            accept="application/pdf"
            hint="Upload official PDF resume (Max 5MB). Directly downloadable from hero section."
            allowPdf={true}
          />
        </div>

        {/* Social Links Card */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
            <Globe size={20} color="var(--emerald)" />
            <h3 style={{ fontSize: '1.2rem' }}>Social & Public Channels</h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <label className="cms-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GithubIcon size={14} /> GitHub Profile URL
              </label>
              <input
                type="url"
                className="cms-input"
                placeholder="https://github.com/username"
                value={profile.social_links.github || ''}
                onChange={(e) => handleSocialChange('github', e.target.value)}
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LinkedinIcon size={14} /> LinkedIn Profile URL
              </label>
              <input
                type="url"
                className="cms-input"
                placeholder="https://linkedin.com/in/username"
                value={profile.social_links.linkedin || ''}
                onChange={(e) => handleSocialChange('linkedin', e.target.value)}
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TwitterIcon size={14} /> Twitter / X Profile URL
              </label>
              <input
                type="url"
                className="cms-input"
                placeholder="https://twitter.com/username"
                value={profile.social_links.twitter || ''}
                onChange={(e) => handleSocialChange('twitter', e.target.value)}
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <InstagramIcon size={14} /> Instagram Profile URL
              </label>
              <input
                type="url"
                className="cms-input"
                placeholder="https://instagram.com/username"
                value={profile.social_links.instagram || ''}
                onChange={(e) => handleSocialChange('instagram', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Floating Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="submit"
            disabled={saving}
            className="gradient-glow-btn"
            style={{
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            <Save size={18} />
            <span>{saving ? 'Publishing Changes...' : 'Save & Publish Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
