import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseClient = null;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err.message);
      return null;
    }
  }
  return supabaseClient;
}

/**
 * Load all guilds from Supabase table 'guilds'
 */
export async function loadGuildsFromSupabase() {
  const sb = getSupabaseClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('guilds').select('*');
    if (error) {
      console.warn('Supabase guilds select error:', error.message);
      return null;
    }
    const map = {};
    for (const row of data || []) {
      map[row.short_id] = {
        short_id: row.short_id,
        name: row.name,
        admin_key: row.admin_key,
        viewer_key: row.viewer_key || '',
        viewer_locked: Boolean(row.viewer_locked),
        combos: Array.isArray(row.combos) ? row.combos : [],
        targets: Array.isArray(row.targets) ? row.targets : [],
        plans: Array.isArray(row.plans) ? row.plans : [],
        schedule: row.schedule || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }
    return map;
  } catch (err) {
    console.warn('loadGuildsFromSupabase exception:', err.message);
    return null;
  }
}

/**
 * Upsert guild into Supabase table 'guilds'
 */
export async function saveGuildToSupabase(guild) {
  const sb = getSupabaseClient();
  if (!sb || !guild || !guild.short_id) return false;
  try {
    const row = {
      short_id: guild.short_id,
      name: guild.name,
      admin_key: guild.admin_key,
      viewer_key: guild.viewer_key || '',
      viewer_locked: Boolean(guild.viewer_locked),
      combos: guild.combos || [],
      targets: guild.targets || [],
      plans: guild.plans || [],
      schedule: guild.schedule || {},
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('guilds').upsert(row, { onConflict: 'short_id' });
    if (error) {
      console.error('Supabase upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveGuildToSupabase exception:', err.message);
    return false;
  }
}

/**
 * Delete guild from Supabase
 */
export async function deleteGuildFromSupabase(shortId) {
  const sb = getSupabaseClient();
  if (!sb || !shortId) return false;
  try {
    const { error } = await sb.from('guilds').delete().eq('short_id', shortId);
    if (error) {
      console.error('Supabase delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteGuildFromSupabase exception:', err.message);
    return false;
  }
}

export const SUPABASE_TABLE_SQL = `-- รันคำสั่งนี้ใน Supabase SQL Editor เพื่อสร้างตารางเก็บข้อมูลกิลด์
CREATE TABLE IF NOT EXISTS guilds (
  short_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_key TEXT NOT NULL,
  viewer_key TEXT DEFAULT '',
  viewer_locked BOOLEAN DEFAULT FALSE,
  combos JSONB DEFAULT '[]'::jsonb,
  targets JSONB DEFAULT '[]'::jsonb,
  plans JSONB DEFAULT '[]'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- เปิด RLS และอนุญาตให้อ่านและเขียนข้อมูลได้
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write" ON guilds
  FOR ALL
  USING (true)
  WITH CHECK (true);
`;
