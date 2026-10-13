import { createClient } from './supabase/client';
import { initialPortfolioData } from './mock-data';
import {
  CertificateAchievement,
  Education,
  PortfolioData,
  ProfileIntro,
  Project,
  Skill,
  WorkExperience,
} from './types';

const STORAGE_KEY = 'portfolio_cms_store_v1';

/**
 * Validates whether a string is a standard UUID v4/RFC4122 format.
 * Postgres UUID column types reject non-UUID strings like 'skill_1728...'.
 */
export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Ensures an ID is a valid Postgres-compatible UUID.
 * Replaces any temporary or legacy non-UUID ID with a cryptographically secure UUID.
 */
export function ensureUUID(id?: string | null): string {
  if (id && isValidUUID(id)) return id;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let memoryCache: PortfolioData | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidatePortfolioCache() {
  lastFetchTimestamp = 0;
  memoryCache = null;
}

// Helper to get client localStorage safely and merge with defaults
export function getLocalStore(): PortfolioData {
  if (typeof window === 'undefined') {
    return memoryCache || initialPortfolioData;
  }
  if (memoryCache) {
    return memoryCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPortfolioData));
      memoryCache = initialPortfolioData;
      return initialPortfolioData;
    }
    const parsed = JSON.parse(raw);
    const data: PortfolioData = {
      profile: parsed.profile
        ? {
            ...initialPortfolioData.profile,
            ...parsed.profile,
            avatar_url:
              parsed.profile.avatar_url && !parsed.profile.avatar_url.includes('unsplash.com')
                ? parsed.profile.avatar_url
                : '/avatars/male-1.png',
          }
        : initialPortfolioData.profile,
      skills: Array.isArray(parsed.skills) ? parsed.skills : initialPortfolioData.skills,
      work_experience: Array.isArray(parsed.work_experience)
        ? parsed.work_experience
        : initialPortfolioData.work_experience,
      education: Array.isArray(parsed.education)
        ? parsed.education
        : initialPortfolioData.education,
      certificates_achievements: Array.isArray(parsed.certificates_achievements)
        ? parsed.certificates_achievements
        : initialPortfolioData.certificates_achievements,
      projects: Array.isArray(parsed.projects) ? parsed.projects : initialPortfolioData.projects,
    };
    memoryCache = data;
    return data;
  } catch (e) {
    console.error('Failed reading localStorage, using initial mock data', e);
    return initialPortfolioData;
  }
}

export function saveLocalStore(data: PortfolioData) {
  memoryCache = data;
  lastFetchTimestamp = Date.now();
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Dispatch events for immediate reactivity in current tab and across tabs
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: data }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('portfolio_sync_channel');
        bc.postMessage({ type: 'PORTFOLIO_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {
        // ignore BroadcastChannel errors in unsupported environments
      }
    }
  } catch (e) {
    console.error('Failed writing to localStorage', e);
  }
}

export async function fetchPortfolioData(options: { force?: boolean } = {}): Promise<{
  data: PortfolioData;
  isLiveSupabase: boolean;
}> {
  const now = Date.now();
  // Return cached data immediately if within TTL and not forced
  if (!options.force && memoryCache && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return {
      data: memoryCache,
      isLiveSupabase: true,
    };
  }

  const supabase = createClient();

  if (supabase) {
    try {
      const [
        profileRes,
        skillsRes,
        expRes,
        eduRes,
        certRes,
        projectsRes,
      ] = await Promise.all([
        supabase.from('profile_intro').select('*').limit(1).maybeSingle(),
        supabase.from('skills').select('*').order('order_index', { ascending: true }),
        supabase.from('work_experience').select('*').order('order_index', { ascending: true }),
        supabase.from('education').select('*').order('order_index', { ascending: true }),
        supabase.from('certificates_achievements').select('*').order('order_index', { ascending: true }),
        supabase.from('projects').select('*').order('order_index', { ascending: true }),
      ]);

      if (skillsRes.error) console.error('Supabase fetch skills warning:', skillsRes.error.message);
      if (expRes.error) console.error('Supabase fetch experience warning:', expRes.error.message);
      if (eduRes.error) console.error('Supabase fetch education warning:', eduRes.error.message);
      if (certRes.error) console.error('Supabase fetch certs warning:', certRes.error.message);
      if (projectsRes.error) console.error('Supabase fetch projects warning:', projectsRes.error.message);

      if (!profileRes.error) {
        const liveData: PortfolioData = {
          profile: profileRes.data || initialPortfolioData.profile,
          skills: !skillsRes.error && Array.isArray(skillsRes.data) ? skillsRes.data : [],
          work_experience: !expRes.error && Array.isArray(expRes.data) ? expRes.data : [],
          education: !eduRes.error && Array.isArray(eduRes.data) ? eduRes.data : [],
          certificates_achievements: !certRes.error && Array.isArray(certRes.data) ? certRes.data : [],
          projects: !projectsRes.error && Array.isArray(projectsRes.data) ? projectsRes.data : [],
        };
        // Update both in-memory cache and localStorage
        memoryCache = liveData;
        lastFetchTimestamp = Date.now();
        saveLocalStore(liveData);
        return {
          isLiveSupabase: true,
          data: liveData,
        };
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local store:', err);
    }
  }

  // Fallback local store
  const fallback = getLocalStore();
  return {
    isLiveSupabase: false,
    data: fallback,
  };
}

// ==================== PROFILE MUTATIONS ====================

export async function saveProfileIntro(profile: ProfileIntro): Promise<ProfileIntro> {
  const targetId = ensureUUID(profile.id || 'a0000000-0000-0000-0000-000000000001');
  const updatedProfile: ProfileIntro = {
    ...profile,
    id: targetId,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('profile_intro')
      .upsert(updatedProfile)
      .select()
      .single();

    if (error) {
      console.error('Supabase profile update rejected:', error.message);
      throw new Error(`Database error saving profile: ${error.message}`);
    }

    if (data) {
      const store = getLocalStore();
      store.profile = data;
      saveLocalStore(store);
      return data;
    }
  }

  const store = getLocalStore();
  store.profile = updatedProfile;
  saveLocalStore(store);
  return updatedProfile;
}

// ==================== SKILLS MUTATIONS ====================

export async function saveSkill(skill: Partial<Skill>): Promise<Skill> {
  const targetId = ensureUUID(skill.id);

  const skillRecord: Skill = {
    id: targetId,
    name: (skill.name || 'New Skill').trim(),
    category: skill.category || 'language',
    icon_url: skill.icon_url || '',
    proficiency_level: Number(skill.proficiency_level) || 80,
    order_index: Number(skill.order_index) || 0,
    is_visible: skill.is_visible ?? true,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('skills')
      .upsert(skillRecord)
      .select()
      .single();

    if (error) {
      console.error('Supabase skill update rejected:', error.message);
      throw new Error(`Database error saving skill: ${error.message}`);
    }

    if (data) {
      const store = getLocalStore();
      const index = store.skills.findIndex((s) => s.id === data.id);
      if (index >= 0) store.skills[index] = data;
      else store.skills.push(data);
      saveLocalStore(store);
      return data;
    }
  }

  const store = getLocalStore();
  const index = store.skills.findIndex((s) => s.id === skillRecord.id);
  if (index >= 0) {
    store.skills[index] = skillRecord;
  } else {
    store.skills.push(skillRecord);
  }
  saveLocalStore(store);
  return skillRecord;
}

export async function removeSkill(id: string): Promise<boolean> {
  const supabase = createClient();
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) {
      console.error('Supabase skill delete failed:', error.message);
      throw new Error(`Database error deleting skill: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.skills = store.skills.filter((s) => s.id !== id);
  saveLocalStore(store);
  return true;
}

export async function saveSkillOrders(skills: Skill[]): Promise<void> {
  const updated = skills.map((s, index) => ({
    ...s,
    id: ensureUUID(s.id),
    order_index: index + 1,
    updated_at: new Date().toISOString(),
  }));

  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.from('skills').upsert(updated);
    if (error) {
      console.error('Supabase skill reorder failed:', error.message);
      throw new Error(`Database error reordering skills: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.skills = updated;
  saveLocalStore(store);
}

// ==================== PROJECTS MUTATIONS ====================

export async function saveProject(project: Partial<Project>): Promise<Project> {
  const targetId = ensureUUID(project.id);

  const record: Project = {
    id: targetId,
    title: (project.title || 'Untitled Project').trim(),
    short_description: project.short_description || '',
    long_description: project.long_description || '',
    cover_image_url: project.cover_image_url || '',
    demo_link: project.demo_link || '',
    github_link: project.github_link || '',
    tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack : [],
    featured: project.featured ?? false,
    order_index: Number(project.order_index) || 0,
    is_visible: project.is_visible ?? true,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('projects')
      .upsert(record)
      .select()
      .single();

    if (error) {
      console.error('Supabase project update rejected:', error.message);
      throw new Error(`Database error saving project: ${error.message}`);
    }

    if (data) {
      const store = getLocalStore();
      const index = store.projects.findIndex((p) => p.id === data.id);
      if (index >= 0) store.projects[index] = data;
      else store.projects.push(data);
      saveLocalStore(store);
      return data;
    }
  }

  const store = getLocalStore();
  const index = store.projects.findIndex((p) => p.id === record.id);
  if (index >= 0) {
    store.projects[index] = record;
  } else {
    store.projects.push(record);
  }
  saveLocalStore(store);
  return record;
}

export async function removeProject(id: string): Promise<boolean> {
  const supabase = createClient();
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Supabase project delete failed:', error.message);
      throw new Error(`Database error deleting project: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.projects = store.projects.filter((p) => p.id !== id);
  saveLocalStore(store);
  return true;
}

export async function saveProjectOrders(projects: Project[]): Promise<void> {
  const updated = projects.map((p, index) => ({
    ...p,
    id: ensureUUID(p.id),
    order_index: index + 1,
    updated_at: new Date().toISOString(),
  }));

  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.from('projects').upsert(updated);
    if (error) {
      console.error('Supabase project reorder failed:', error.message);
      throw new Error(`Database error reordering projects: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.projects = updated;
  saveLocalStore(store);
}

// ==================== WORK EXPERIENCE MUTATIONS ====================

export async function saveExperience(exp: Partial<WorkExperience>): Promise<WorkExperience> {
  const targetId = ensureUUID(exp.id);

  const record: WorkExperience = {
    id: targetId,
    role: (exp.role || 'Software Engineer').trim(),
    company: (exp.company || 'Company Name').trim(),
    location: exp.location || 'Remote',
    start_date: exp.start_date || '2023',
    end_date: exp.end_date || 'Present',
    is_current: exp.is_current ?? false,
    description: exp.description || '',
    certificate_url: exp.certificate_url || '',
    order_index: Number(exp.order_index) || 0,
    is_visible: exp.is_visible ?? true,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('work_experience')
      .upsert(record)
      .select()
      .single();

    if (error) {
      console.error('Supabase experience update rejected:', error.message);
      throw new Error(`Database error saving work experience: ${error.message}`);
    }

    if (data) {
      const store = getLocalStore();
      const index = store.work_experience.findIndex((w) => w.id === data.id);
      if (index >= 0) store.work_experience[index] = data;
      else store.work_experience.push(data);
      saveLocalStore(store);
      return data;
    }
  }

  const store = getLocalStore();
  const index = store.work_experience.findIndex((w) => w.id === record.id);
  if (index >= 0) {
    store.work_experience[index] = record;
  } else {
    store.work_experience.push(record);
  }
  saveLocalStore(store);
  return record;
}

export async function removeExperience(id: string): Promise<boolean> {
  const supabase = createClient();
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('work_experience').delete().eq('id', id);
    if (error) {
      console.error('Supabase experience delete failed:', error.message);
      throw new Error(`Database error deleting work experience: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.work_experience = store.work_experience.filter((w) => w.id !== id);
  saveLocalStore(store);
  return true;
}

export async function saveExperienceOrders(items: WorkExperience[]): Promise<void> {
  const updated = items.map((w, index) => ({
    ...w,
    id: ensureUUID(w.id),
    order_index: index + 1,
    updated_at: new Date().toISOString(),
  }));

  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.from('work_experience').upsert(updated);
    if (error) {
      console.error('Supabase experience reorder failed:', error.message);
      throw new Error(`Database error reordering work experience: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.work_experience = updated;
  saveLocalStore(store);
}

// ==================== EDUCATION MUTATIONS ====================

export async function saveEducation(edu: Partial<Education>): Promise<Education> {
  const targetId = ensureUUID(edu.id);

  const record: Education = {
    id: targetId,
    institution: (edu.institution || 'University').trim(),
    degree: (edu.degree || 'Degree').trim(),
    score_or_cgpa: edu.score_or_cgpa || '',
    start_year: edu.start_year || '2020',
    end_year: edu.end_year || '2024',
    description: edu.description || '',
    order_index: Number(edu.order_index) || 0,
    is_visible: edu.is_visible ?? true,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('education')
      .upsert(record)
      .select()
      .single();

    if (error) {
      console.error('Supabase education update rejected:', error.message);
      throw new Error(`Database error saving education: ${error.message}`);
    }

    if (data) {
      const store = getLocalStore();
      const index = store.education.findIndex((e) => e.id === data.id);
      if (index >= 0) store.education[index] = data;
      else store.education.push(data);
      saveLocalStore(store);
      return data;
    }
  }

  const store = getLocalStore();
  const index = store.education.findIndex((e) => e.id === record.id);
  if (index >= 0) {
    store.education[index] = record;
  } else {
    store.education.push(record);
  }
  saveLocalStore(store);
  return record;
}

export async function removeEducation(id: string): Promise<boolean> {
  const supabase = createClient();
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('education').delete().eq('id', id);
    if (error) {
      console.error('Supabase education delete failed:', error.message);
      throw new Error(`Database error deleting education: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.education = store.education.filter((e) => e.id !== id);
  saveLocalStore(store);
  return true;
}

export async function saveEducationOrders(items: Education[]): Promise<void> {
  const updated = items.map((e, index) => ({
    ...e,
    id: ensureUUID(e.id),
    order_index: index + 1,
    updated_at: new Date().toISOString(),
  }));

  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.from('education').upsert(updated);
    if (error) {
      console.error('Supabase education reorder failed:', error.message);
      throw new Error(`Database error reordering education: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.education = updated;
  saveLocalStore(store);
}

// ==================== CERTIFICATES & AWARDS MUTATIONS ====================

export async function saveCertificate(cert: Partial<CertificateAchievement>): Promise<CertificateAchievement> {
  const targetId = ensureUUID(cert.id);

  const record: CertificateAchievement = {
    id: targetId,
    title: (cert.title || 'Certificate Title').trim(),
    issuer: (cert.issuer || 'Issuing Authority').trim(),
    issue_date: cert.issue_date || '2024',
    credential_url: cert.credential_url || '',
    certificate_file_url: cert.certificate_file_url || '',
    lor_loa_urls: Array.isArray(cert.lor_loa_urls) ? cert.lor_loa_urls : [],
    type: cert.type || 'certificate',
    order_index: Number(cert.order_index) || 0,
    is_visible: cert.is_visible ?? true,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('certificates_achievements')
      .upsert(record)
      .select()
      .single();

    if (error) {
      console.error('Supabase certificate update rejected:', error.message);
      throw new Error(`Database error saving certificate: ${error.message}`);
    }

    if (data) {
      const store = getLocalStore();
      const index = store.certificates_achievements.findIndex((c) => c.id === data.id);
      if (index >= 0) store.certificates_achievements[index] = data;
      else store.certificates_achievements.push(data);
      saveLocalStore(store);
      return data;
    }
  }

  const store = getLocalStore();
  const index = store.certificates_achievements.findIndex((c) => c.id === record.id);
  if (index >= 0) {
    store.certificates_achievements[index] = record;
  } else {
    store.certificates_achievements.push(record);
  }
  saveLocalStore(store);
  return record;
}

export async function removeCertificate(id: string): Promise<boolean> {
  const supabase = createClient();
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('certificates_achievements').delete().eq('id', id);
    if (error) {
      console.error('Supabase certificate delete failed:', error.message);
      throw new Error(`Database error deleting certificate: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.certificates_achievements = store.certificates_achievements.filter((c) => c.id !== id);
  saveLocalStore(store);
  return true;
}

export async function saveCertificateOrders(items: CertificateAchievement[]): Promise<void> {
  const updated = items.map((c, index) => ({
    ...c,
    id: ensureUUID(c.id),
    order_index: index + 1,
    updated_at: new Date().toISOString(),
  }));

  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.from('certificates_achievements').upsert(updated);
    if (error) {
      console.error('Supabase certificate reorder failed:', error.message);
      throw new Error(`Database error reordering certificates: ${error.message}`);
    }
  }

  const store = getLocalStore();
  store.certificates_achievements = updated;
  saveLocalStore(store);
}

// Reset Local Data
export function resetPortfolioToDefault(): PortfolioData {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPortfolioData));
    window.dispatchEvent(new CustomEvent('portfolio_updated', { detail: initialPortfolioData }));
  }
  return initialPortfolioData;
}
