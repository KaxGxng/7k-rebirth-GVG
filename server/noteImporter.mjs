import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CACHED_FALLBACK = path.join(
  ROOT_DIR,
  '..',
  '..',
  '.gemini',
  'antigravity',
  'brain',
  'c05fc15b-d316-4958-92ca-6e003892c2f2',
  'scratch',
  '7k_note_data.json'
);

function mapFormation(frontNum) {
  if (frontNum === 1) return '1-4';
  if (frontNum === 2) return '2-3';
  if (frontNum === 3) return '3-2';
  if (frontNum === 4) return '4-1';
  return '1-4';
}

function mapTeamType(tags) {
  const t = (tags || []).join(' ');
  if (t.includes('ถึก')) return 'tanky';
  if (t.includes('สปีด')) return 'speed';
  if (t.includes('เวท')) return 'magic';
  if (t.includes('โจมตี') || t.includes('กาย')) return 'physical';
  return 'hybrid';
}

export async function fetchAndConvert7KNote(guildCode = '4ZyeEGMZ') {
  let rawData = null;
  try {
    const res = await fetch(`https://7k-note-api.krit7k.workers.dev/api/guild/${guildCode}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      rawData = await res.json();
    }
  } catch (err) {
    console.warn(`Could not fetch 7k-note API live (${err.message}), trying local cache...`);
  }

  if (!rawData && fs.existsSync(CACHED_FALLBACK)) {
    try {
      rawData = JSON.parse(fs.readFileSync(CACHED_FALLBACK, 'utf8'));
    } catch (e) {
      // ignore
    }
  }

  if (!rawData || !Array.isArray(rawData.targets)) {
    throw new Error('ไม่สามารถดึงข้อมูลโพยจาก 7K-Note ได้');
  }

  const convertedTargets = rawData.targets.map((t, idx) => {
    const houseNo = idx + 1;
    const strat = mapFormation(t.team?.front || 1);
    const frontLimit = t.team?.front || 1;
    const slots = t.team?.slots || [];
    const frontChars = [];
    const backChars = [];

    slots.forEach((name, i) => {
      if (!name) return;
      if (i < frontLimit) frontChars.push({ index: i, name });
      else backChars.push({ index: i, name });
    });

    const pets = [
      t.team?.pet || null,
      ...(t.team?.extras || [null, null, null, null]),
    ].slice(0, 5);

    const enemySkillOrder = (t.team?.skills || []).map((s, sIdx) => ({
      charIndex: s.slot,
      skillType: s.skill === 1 ? 'T' : 'B',
      order: sIdx + 1,
    }));

    const counters = (t.counters || []).map((c, cIdx) => {
      const cStrat = mapFormation(c.team?.front || 1);
      const cFrontLimit = c.team?.front || 1;
      const cSlots = c.team?.slots || [];
      const cFrontChars = [];
      const cBackChars = [];
      const heroNotesMap = {};

      (c.heroNotes || []).forEach((hn) => {
        if (hn.hero) heroNotesMap[hn.hero] = hn;
      });

      cSlots.forEach((name, i) => {
        if (!name) return;
        const hn = heroNotesMap[name] || {};
        let desc = hn.text || '';
        if (hn.stats && !desc) {
          const s = hn.stats;
          const parts = [];
          if (s.block) parts.push(`บล็อก ${s.block}%`);
          if (s.critRate) parts.push(`คริ ${s.critRate}%`);
          if (s.resist) parts.push(`ต้านทาน ${s.resist}%`);
          if (parts.length > 0) desc = parts.join(' | ');
        }
        const charObj = {
          index: i,
          name,
          description: desc,
          equip: {
            sets: hn.sets || [],
            rings: hn.rings || [],
          },
        };
        if (i < cFrontLimit) cFrontChars.push(charObj);
        else cBackChars.push(charObj);
      });

      const cPets = [
        c.team?.pet || null,
        ...(c.team?.extras || [null, null, null, null]),
      ].slice(0, 5);

      const skillOrder = (c.skills || []).map((s, sIdx) => ({
        charIndex: s.slot,
        skillType: s.skill === 1 ? 'T' : 'B',
        order: sIdx + 1,
      }));

      return {
        id: c.id || `counter-${houseNo}-${cIdx + 1}`,
        order: cIdx,
        strategyId: cStrat,
        likes: c.likes || 0,
        skillOrder,
        front: { characters: cFrontChars },
        back: { characters: cBackChars },
        pets: cPets,
        note: c.note || '',
      };
    });

    const isFortress = houseNo <= 3;
    const houseTitle = isFortress ? `ป้อมปราการที่ ${houseNo}` : `บ้านที่ ${houseNo}`;

    return {
      id: `target-${t.id || houseNo}`,
      houseNo,
      customName: houseTitle,
      isFortress,
      stars: 0,
      status: 'unattacked',
      tags: t.tags || [],
      note: t.note || '',
      assignedTo: '',
      enemyTeam: {
        strategyId: strat,
        teamType: mapTeamType(t.tags),
        skillOrder: enemySkillOrder,
        front: { characters: frontChars },
        back: { characters: backChars },
        pets,
      },
      counters,
    };
  });

  // Convert targets to combo cards (Left = counter, Right = house defense)
  const convertedCombos = convertedTargets.map((t) => ({
    id: `combo-${t.id}`,
    houseNo: t.houseNo,
    isFortress: t.isFortress,
    customName: t.customName,
    enemyTeam: t.enemyTeam,
    counterTeams: t.counters,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return {
    targets: convertedTargets,
    combos: convertedCombos,
    plans: Array.isArray(rawData.plans) ? rawData.plans : [],
    schedule: rawData.schedule || null,
  };
}
