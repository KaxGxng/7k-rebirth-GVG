import type { GuildData, GuildCombo, EnemyTeam, CounterTeam } from '../types';

export interface RecentGuild {
  short_id: string;
  name: string;
  is_admin?: boolean;
  visited_at: string;
}

const RECENT_GUILDS_KEY = '7k_combo_recent_guilds';

export function getAdminKey(shortId: string): string {
  return localStorage.getItem(`7k_admin_key_${shortId}`) || '';
}

export function setAdminKey(shortId: string, key: string): void {
  if (key) {
    localStorage.setItem(`7k_admin_key_${shortId}`, key.trim());
  } else {
    localStorage.removeItem(`7k_admin_key_${shortId}`);
  }
}

export function getViewerKey(shortId: string): string {
  return localStorage.getItem(`7k_viewer_key_${shortId}`) || '';
}

export function setViewerKey(shortId: string, key: string): void {
  if (key) {
    localStorage.setItem(`7k_viewer_key_${shortId}`, key.trim());
  } else {
    localStorage.removeItem(`7k_viewer_key_${shortId}`);
  }
}

export function getRecentGuilds(): RecentGuild[] {
  try {
    const raw = localStorage.getItem(RECENT_GUILDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentGuild(guild: { short_id: string; name: string; is_admin?: boolean }): void {
  try {
    const list = getRecentGuilds().filter((g) => g.short_id !== guild.short_id);
    list.unshift({
      short_id: guild.short_id,
      name: guild.name,
      is_admin: guild.is_admin,
      visited_at: new Date().toISOString(),
    });
    localStorage.setItem(RECENT_GUILDS_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {
    // ignore storage errors
  }
}

export function removeRecentGuild(shortId: string): void {
  try {
    const list = getRecentGuilds().filter((g) => g.short_id !== shortId);
    localStorage.setItem(RECENT_GUILDS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function fetchPublicGuilds(): Promise<
  { short_id: string; name: string; viewer_locked: boolean; combo_count: number }[]
> {
  const res = await fetch('/api/guilds/public');
  if (!res.ok) return [];
  const data = await res.json();
  return data.guilds || [];
}

export async function createGuild(name: string, adminKey?: string): Promise<{
  short_id: string;
  name: string;
  admin_key: string;
}> {
  const res = await fetch('/api/guild/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, admin_key: adminKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'สร้างโพยกิลด์ไม่สำเร็จ');
  return data;
}

export async function fetchGuild(shortId: string): Promise<{
  status: 'ok' | 'viewer_locked' | 'not_found';
  data?: GuildData;
  lockedName?: string;
}> {
  const adminKey = getAdminKey(shortId);
  const viewerKey = getViewerKey(shortId);
  const res = await fetch(`/api/guild/${encodeURIComponent(shortId)}`, {
    headers: {
      'X-Admin-Key': adminKey,
      'X-Viewer-Key': viewerKey,
    },
  });
  if (res.status === 404) {
    return { status: 'not_found' };
  }
  const json = await res.json();
  if (res.status === 403 && json.error === 'viewer_locked') {
    return { status: 'viewer_locked', lockedName: json.name };
  }
  if (!res.ok) {
    throw new Error(json.error || 'โหลดข้อมูลกิลด์ไม่สำเร็จ');
  }
  return { status: 'ok', data: json };
}

export async function verifyAdminKey(shortId: string, adminKey: string): Promise<boolean> {
  const res = await fetch('/api/guild/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ short_id: shortId, admin_key: adminKey }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.valid);
}

export async function verifyViewerKey(shortId: string, viewerKey: string): Promise<boolean> {
  const res = await fetch('/api/guild/verify-viewer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ short_id: shortId, viewer_key: viewerKey }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.valid);
}

export async function updateAdminPassword(
  shortId: string,
  currentAdminKey: string,
  newAdminKey: string
): Promise<void> {
  const res = await fetch(`/api/guild/${encodeURIComponent(shortId)}/admin-key`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': currentAdminKey,
    },
    body: JSON.stringify({ new_admin_key: newAdminKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'เปลี่ยนรหัสผู้ดูแลไม่สำเร็จ');
}

export async function updateViewerLock(
  shortId: string,
  adminKey: string,
  viewerLocked: boolean,
  viewerKey: string
): Promise<{ viewer_locked: boolean; viewer_key: string }> {
  const res = await fetch(`/api/guild/${encodeURIComponent(shortId)}/viewer-lock`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify({ viewer_locked: viewerLocked, viewer_key: viewerKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ตั้งค่ารหัสดูโพยไม่สำเร็จ');
  return data;
}

export async function createComboApi(
  shortId: string,
  enemyTeam: EnemyTeam,
  counterTeams: CounterTeam[] = []
): Promise<GuildCombo> {
  const res = await fetch(`/api/guild/${encodeURIComponent(shortId)}/combos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': getAdminKey(shortId),
    },
    body: JSON.stringify({ enemyTeam, counterTeams }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'เพิ่มทีมเป้าหมายไม่สำเร็จ');
  return data;
}

export async function updateComboApi(
  shortId: string,
  comboId: string,
  payload: { enemyTeam?: EnemyTeam; counterTeams?: CounterTeam[] }
): Promise<GuildCombo> {
  const res = await fetch(
    `/api/guild/${encodeURIComponent(shortId)}/combos/${encodeURIComponent(comboId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': getAdminKey(shortId),
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'บันทึกการแก้ไขไม่สำเร็จ');
  return data;
}

export async function deleteComboApi(shortId: string, comboId: string): Promise<void> {
  const res = await fetch(
    `/api/guild/${encodeURIComponent(shortId)}/combos/${encodeURIComponent(comboId)}`,
    {
      method: 'DELETE',
      headers: {
        'X-Admin-Key': getAdminKey(shortId),
      },
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'ลบทีมไม่สำเร็จ');
  }
}

export async function deleteGuildApi(shortId: string): Promise<void> {
  const res = await fetch(`/api/guild/${encodeURIComponent(shortId)}`, {
    method: 'DELETE',
    headers: {
      'X-Admin-Key': getAdminKey(shortId),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'ลบโพยกิลด์ไม่สำเร็จ');
  }
}
