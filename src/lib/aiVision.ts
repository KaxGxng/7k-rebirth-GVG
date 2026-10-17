import { CHARACTERS, PETS, getCharacterInfo, getPetInfo } from './catalog';
import type { StrategyId, TeamType, CatalogCharacter, CatalogPet } from '../types';

const API_KEY_STORAGE = '7k_gemini_api_key';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  } catch {
    // ignore storage error
  }
}

/**
 * Resizes and compresses any pasted/uploaded image file to max 1280px
 * Returns base64 data URL (image/jpeg)
 */
export async function compressImageFile(
  fileOrBlob: File | Blob,
  maxDimension = 1280,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('รูปภาพไม่ถูกต้องหรือเสียหาย'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Generates an in-memory sample screenshot canvas to allow instant testing
 * even if the user does not have a screenshot on hand right now.
 */
export function generateSampleTeamCanvas(presetName: 'tank' | 'speed'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 960, 540);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e1b4b');
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);

  // Decorative border
  ctx.strokeStyle = '#4338ca';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, 928, 508);

  // Title
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(
    presetName === 'tank'
      ? '7K Re:BIRTH - GVG Guild War: House #1 (ป้อมหัวกิลด์ - ถึกโรซี่)'
      : '7K Re:BIRTH - GVG Guild War: House #5 (บ้านสปีดแฝดลิง)',
    40,
    60
  );

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  ctx.fillText(
    presetName === 'tank' ? 'Formation: 1-4 (Front 1, Back 4)' : 'Formation: 2-3 (Front 2, Back 3)',
    40,
    90
  );

  // Draw 5 hero portrait cards
  const heroes =
    presetName === 'tank'
      ? [
          { name: 'ลูดี้ awake', pos: 'Front #0', x: 120, y: 160 },
          { name: 'เกลลิดัส', pos: 'Back #1', x: 280, y: 160 },
          { name: 'โรซี่', pos: 'Back #2', x: 440, y: 160 },
          { name: 'พาลานอส', pos: 'Back #3', x: 600, y: 160 },
          { name: 'มิเลีย', pos: 'Back #4', x: 760, y: 160 },
        ]
      : [
          { name: 'พาลานอส', pos: 'Front #0', x: 160, y: 160 },
          { name: 'ซุนหงอคง', pos: 'Front #1', x: 320, y: 160 },
          { name: 'บรันซ์ & บรันเซล', pos: 'Back #2', x: 480, y: 160 },
          { name: 'แทโอ', pos: 'Back #3', x: 640, y: 160 },
          { name: 'เอซ', pos: 'Back #4', x: 800, y: 160 },
        ];

  heroes.forEach((h) => {
    // Card background
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(h.x - 60, h.y, 120, 180, 12);
    ctx.fill();
    ctx.stroke();

    // Circle avatar placeholder
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(h.x, h.y + 60, 42, 0, Math.PI * 2);
    ctx.fill();

    // Inner icon text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(h.name.slice(0, 3), h.x, h.y + 67);

    // Name text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(h.name, h.x, h.y + 130);

    // Position badge
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px sans-serif';
    ctx.fillText(h.pos, h.x, h.y + 155);
  });

  // Pet banner
  ctx.textAlign = 'left';
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(
    presetName === 'tank' ? '🐾 Pet: อีรีน, วินดี้' : '🐾 Pet: ไพค์, คารัม',
    40,
    460
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

export interface AiDetectedSlot {
  index: number;
  name: string;
  description?: string;
  catalogInfo?: CatalogCharacter;
}

export interface AiDetectedTeam {
  strategyId: StrategyId;
  teamType: TeamType;
  houseNo?: number;
  isFortress?: boolean;
  customName?: string;
  frontCharacters: AiDetectedSlot[];
  backCharacters: AiDetectedSlot[];
  pets: (string | null)[];
  explanation?: string;
}

export interface AiRecommendedCounter {
  strategyId: StrategyId;
  frontCharacters: AiDetectedSlot[];
  backCharacters: AiDetectedSlot[];
  pets: (string | null)[];
  skillOrder?: { charIndex: number; skillType: 'T' | 'B'; order: 1 | 2 | 3 }[];
  note?: string;
}

export interface AiScanResult {
  ok: boolean;
  strategyId: StrategyId;
  teamType: TeamType;
  houseNo?: number;
  isFortress?: boolean;
  customName?: string;
  frontCharacters: { index: number; name: string; description?: string }[];
  backCharacters: { index: number; name: string; description?: string }[];
  pets: (string | null)[];
  explanation?: string;
  recommendedCounter?: {
    strategyId: StrategyId;
    frontCharacters: { index: number; name: string; description?: string }[];
    backCharacters: { index: number; name: string; description?: string }[];
    pets: (string | null)[];
    skillOrder?: { charIndex: number; skillType: 'T' | 'B'; order: 1 | 2 | 3 }[];
    note?: string;
  };
  isDemo?: boolean;
  message?: string;
}

/**
 * Fuzzy matches character name against catalog
 */
export function resolveHeroFromCatalog(rawName: string): CatalogCharacter | undefined {
  if (!rawName) return undefined;
  const direct = getCharacterInfo(rawName);
  if (direct) return direct;

  const clean = rawName.toLowerCase().replace(/awake|epic|\s+/gi, '').trim();
  for (const c of CHARACTERS) {
    const cClean = c.name.toLowerCase().replace(/awake|epic|\s+/gi, '').trim();
    if (cClean === clean || cClean.includes(clean) || clean.includes(cClean)) {
      return c;
    }
    for (const al of c.aliases || []) {
      const alClean = al.toLowerCase().replace(/awake|epic|\s+/gi, '').trim();
      if (alClean === clean || alClean.includes(clean) || clean.includes(alClean)) {
        return c;
      }
    }
  }
  return undefined;
}

/**
 * Fuzzy matches pet name against catalog
 */
export function resolvePetFromCatalog(rawName: string): CatalogPet | undefined {
  if (!rawName) return undefined;
  const direct = getPetInfo(rawName);
  if (direct) return direct;

  const clean = rawName.toLowerCase().trim();
  for (const p of PETS) {
    if (p.name.toLowerCase() === clean) return p;
    for (const al of p.aliases || []) {
      if (al.toLowerCase() === clean) return p;
    }
  }
  return undefined;
}

/**
 * Calls backend /api/ai/scan-team with fallback support
 */
export async function scanScreenshotApi(payload: {
  imageBase64: string;
  apiKey?: string;
  mode?: 'enemy' | 'counter';
  demoMode?: boolean;
}): Promise<AiScanResult> {
  const res = await fetch('/api/ai/scan-team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'ไม่สามารถวิเคราะห์รูปภาพได้');
  }
  return data;
}
