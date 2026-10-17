import rawCatalog from '../data/catalog.json';
import type {
  CatalogCharacter,
  CatalogPet,
  CatalogEquipItem,
  StrategyId,
  TeamType,
  EnemyTeam,
  CounterTeam,
} from '../types';

function deduplicateByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

export const CHARACTERS: CatalogCharacter[] = deduplicateByName(rawCatalog.characters || []);
export const PETS: CatalogPet[] = deduplicateByName(rawCatalog.pets || []);
export const EQUIP_SETS: CatalogEquipItem[] = deduplicateByName(rawCatalog.equipSets || []);
export const EQUIP_RINGS: CatalogEquipItem[] = deduplicateByName(rawCatalog.equipRings || []);
export const PATCH_META = (rawCatalog as any).patchMeta || null;

const charByName = new Map<string, CatalogCharacter>();
for (const c of CHARACTERS) {
  charByName.set(c.name, c);
  const base = c.name.replace(/\s+awake(?:\s+epic)?$/i, '').trim();
  if (base && !charByName.has(base)) {
    charByName.set(base, c);
  }
  for (const al of c.aliases || []) {
    if (al && !charByName.has(al)) {
      charByName.set(al, c);
    }
  }
}
const petByName = new Map<string, CatalogPet>(PETS.map((p) => [p.name, p]));
const setByName = new Map<string, CatalogEquipItem>(EQUIP_SETS.map((s) => [s.name, s]));
const ringByName = new Map<string, CatalogEquipItem>(EQUIP_RINGS.map((r) => [r.name, r]));

export function getCharacterInfo(name?: string | null): CatalogCharacter | undefined {
  if (!name) return undefined;
  const trimmed = name.trim();
  return (
    charByName.get(trimmed) ||
    charByName.get(trimmed.replace(/\s+awake(?:\s+epic)?$/i, '').trim())
  );
}

export function registerCustomCharacter(char: CatalogCharacter): void {
  const idx = CHARACTERS.findIndex((c) => c.name === char.name);
  if (idx >= 0) {
    CHARACTERS[idx] = char;
  } else {
    CHARACTERS.unshift(char);
  }
  charByName.set(char.name.trim(), char);
}

export function getPetInfo(name?: string | null): CatalogPet | undefined {
  if (!name) return undefined;
  return petByName.get(name.trim());
}

export function getEquipSetInfo(name?: string | null): CatalogEquipItem | undefined {
  if (!name) return undefined;
  return setByName.get(name.trim());
}

export function getEquipRingInfo(name?: string | null): CatalogEquipItem | undefined {
  if (!name) return undefined;
  return ringByName.get(name.trim());
}

export const STRATEGIES: {
  id: StrategyId;
  name: string;
  frontIndices: number[];
  backIndices: number[];
}[] = [
  { id: '1-4', name: 'หน้า 1 หลัง 4', frontIndices: [0], backIndices: [1, 2, 3, 4] },
  { id: '2-3', name: 'หน้า 2 หลัง 3', frontIndices: [0, 1], backIndices: [2, 3, 4] },
  { id: '3-2', name: 'หน้า 3 หลัง 2', frontIndices: [0, 1, 2], backIndices: [3, 4] },
  { id: '4-1', name: 'หน้า 4 หลัง 1', frontIndices: [0, 1, 2, 3], backIndices: [4] },
];

export function getStrategyConfig(strategyId: StrategyId) {
  return STRATEGIES.find((s) => s.id === strategyId) || STRATEGIES[0];
}

export const TEAM_TYPES: {
  id: TeamType;
  label: string;
  badgeClass: string;
}[] = [
  {
    id: 'tanky',
    label: 'ถึก',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'magic',
    label: 'เวทย์',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  {
    id: 'physical',
    label: 'กายภาพ',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  {
    id: 'other',
    label: 'อื่น ๆ',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
];

export function getTeamTypeMeta(teamType?: TeamType) {
  return TEAM_TYPES.find((t) => t.id === teamType);
}

export const CHARACTER_TIERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'O7K', label: 'O7K' },
  { id: 'awake', label: 'Awake' },
  { id: 'ทองบน', label: 'ทองบน' },
  { id: 'ทองล่าง', label: 'ทองล่าง' },
  { id: 'epic awake', label: 'Epic Awake' },
  { id: 'อีปิค', label: 'อีปิค' },
];

export const PET_TIERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'เลเจนด์', label: 'เลเจนด์' },
  { id: 'อีปิค', label: 'อีปิค' },
];

export function normalizeQuery(q: string): string {
  return q.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase().normalize('NFC');
}

export function matchesCharacterSearch(char: CatalogCharacter, rawQuery: string): boolean {
  const q = normalizeQuery(rawQuery);
  if (!q) return true;
  if (char.name.toLowerCase().includes(q)) return true;
  return char.aliases.some((a) => a.toLowerCase().includes(q));
}

export function matchesPetSearch(pet: CatalogPet, rawQuery: string): boolean {
  const q = normalizeQuery(rawQuery);
  if (!q) return true;
  if (pet.name.toLowerCase().includes(q)) return true;
  return pet.aliases.some((a) => a.toLowerCase().includes(q));
}

export function matchesEquipSearch(item: CatalogEquipItem, rawQuery: string): boolean {
  const q = normalizeQuery(rawQuery);
  if (!q) return true;
  if (item.name.toLowerCase().includes(q)) return true;
  if (item.hint.toLowerCase().includes(q)) return true;
  return item.aliases.some((a) => a.toLowerCase().includes(q));
}

/**
 * Checks if an EnemyTeam (or any of its heroes/pets/aliases) matches a search query.
 * Supports multi-term search (e.g. "ลิง เกล" or "พาลานอส").
 */
export function matchesTeamQuery(team: EnemyTeam | CounterTeam, rawQuery: string): boolean {
  const clean = normalizeQuery(rawQuery);
  if (!clean) return true;

  // Split by space or comma to allow searching multiple heroes at once (e.g. "ลิง พาลานอส")
  const tokens = clean.split(/[\s,]+/).filter(Boolean);
  const allChars = [
    ...(team.front?.characters || []),
    ...(team.back?.characters || []),
  ].map((c) => c.name);
  const allPets = (team.pets || []).filter((p): p is string => Boolean(p));

  return tokens.every((token) => {
    const charMatch = allChars.some((cName) => {
      if (cName.toLowerCase().includes(token)) return true;
      const info = getCharacterInfo(cName);
      return info ? info.aliases.some((a) => a.toLowerCase().includes(token)) : false;
    });
    if (charMatch) return true;

    const petMatch = allPets.some((pName) => {
      if (pName.toLowerCase().includes(token)) return true;
      const info = getPetInfo(pName);
      return info ? info.aliases.some((a) => a.toLowerCase().includes(token)) : false;
    });
    return petMatch;
  });
}
