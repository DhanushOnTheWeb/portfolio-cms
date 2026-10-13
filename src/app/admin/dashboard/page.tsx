'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Cpu,
  Layers,
  Award,
  User,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Database,
  ExternalLink,
  HardDrive,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { fetchPortfolioData, getLocalStore } from '@/lib/portfolio-service';
import { PortfolioData } from '@/lib/types';
import { initialPortfolioData } from '@/lib/mock-data';
import { revalidatePortfolio } from '@/app/actions';
import { useToast } from '@/components/Toast';

export default function AdminDashboardPage() {
  const [data, setData] = useState<PortfolioData>(() => {
    if (typeof window === 'undefined') return initialPortfolioData;
    return getLocalStore();
  });
  const [isLiveSupabase, setIsLiveSupabase] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadData = async (force = false) => {
    const result = await fetchPortfolioData({ force });
    setData(result.data);
    setIsLiveSupabase(result.isLiveSupabase);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalProjects = data.projects.length;
  const featuredProjects = data.projects.filter((p) => p.featured).length;
  const totalSkills = data.skills.length;
  const totalExperience = data.work_experience.length;
  const totalCertificates = data.certificates_achievements.length;

  const statCards = [
    {
      title: 'Projects Showcase',
      count: totalProjects,
      subtitle: `${featuredProjects} Featured on 3D Tilt Grid`,
      icon: FolderGit2,
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.25)',
      href: '/admin/projects',
      actionText: 'Manage Projects',
    },
    {
      title: 'Skills & Tech Stack',
      count: totalSkills,
      subtitle: 'Languages, Tools & Architecture',
      icon: Cpu,
      color: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.25)',
      href: '/admin/skills',
      actionText: 'Manage Skills',
    },
    {
      title: 'Work & Education',
      count: totalExperience + data.education.length,
      subtitle: `${totalExperience} Roles • ${data.education.length} Degrees`,
      icon: Layers,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.25)',
      href: '/admin/timeline',
      actionText: 'Manage Timeline',
    },
    {
      title: 'Certificates & Awards',
      count: totalCertificates,
      subtitle: 'Credentials, LOR & Honors',
      icon: Award,
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.25)',
      href: '/admin/certificates',
      actionText: 'Manage Awards',
    },
  ];

  return (
    <div>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>
            System <span className="gradient-text">Overview & Telemetry</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Welcome back, {data.profile.full_name || 'Architect'}. Manage real-time 3D portfolio content and storage.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => loadData(true)}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-dim)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="gradient-glow-btn"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <span>Preview 3D Portfolio</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: stat.glow,
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stat.title}
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginTop: '4px' }}>
                    {stat.count}
                  </div>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: `${stat.color}1a`,
                    border: `1px solid ${stat.color}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                  }}
                >
                  <Icon size={22} />
                </div>
              </div>

              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  {stat.subtitle}
                </p>
                <Link
                  href={stat.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.825rem',
                    color: stat.color,
                    fontWeight: 600,
                  }}
                >
                  <span>{stat.actionText}</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Quick Actions & System Connectivity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Quick Edit Links */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Sparkles size={20} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.2rem' }}>Quick Actions</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              href="/admin/projects"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
                color: '#fff',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={16} color="var(--primary-light)" />
                <span>Upload New Project Showcase</span>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </Link>

            <Link
              href="/admin/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
                color: '#fff',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(6, 182, 212, 0.12)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={16} color="var(--cyan)" />
                <span>Update Hero Intro, Avatar & Resume PDF</span>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </Link>

            <Link
              href="/admin/skills"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
                color: '#fff',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={16} color="var(--emerald)" />
                <span>Add / Reorder Skills & Adjust Proficiency</span>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </Link>

            <Link
              href="/admin/certificates"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
                color: '#fff',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={16} color="var(--amber)" />
                <span>Attach Certificates, LOR & Awards</span>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </Link>
          </div>
        </div>

        {/* System & Database Status */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Activity size={20} color="var(--cyan)" />
            <h3 style={{ fontSize: '1.2rem' }}>Storage & Database Telemetry</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: isLiveSupabase ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                border: `1px solid ${isLiveSupabase ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  {isLiveSupabase ? 'Supabase PostgreSQL & Auth' : 'Active Demo Sandbox'}
                </span>
                <span style={{ fontSize: '0.75rem', color: isLiveSupabase ? '#34d399' : '#818cf8', fontWeight: 600 }}>
                  {isLiveSupabase ? 'Operational (RLS Active)' : 'Dual Mode Active'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isLiveSupabase
                  ? 'All mutations commit directly to Supabase with Row Level Security and automatic timestamp triggers.'
                  : 'To link live PostgreSQL, paste your SUPABASE_URL and SUPABASE_ANON_KEY into .env.local and run the migration script.'}
              </p>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  Storage Bucket: portfolio-media
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 600 }}>
                  5MB Max • WebP Auto-Compress
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Accepts PNG, JPG, WebP, SVG, and PDF documents. Client-side canvas dynamically compresses high-res captures before upload.
              </p>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  Next.js ISR Cache Revalidation
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 600 }}>
                  revalidatePath(&lsquo;/&rsquo;)
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Every edit, reorder, or draft toggle immediately purges cached public static routes with zero rebuild delays.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
