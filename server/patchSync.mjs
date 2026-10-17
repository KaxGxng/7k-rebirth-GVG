import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'public', 'assets', 'catalog');
const CATALOG_PATH = path.join(ROOT_DIR, 'src', 'data', 'catalog.json');

const NEGILAB_BASE = 'https://negi-lab.com/gamewiki/SevenKnightsReBirth/';

// Thai community nicknames and common short names
const THAI_NICKNAMES = {
  'ซุนหงอคง': ['ลิง', 'หงอคง', 'เจี๊ยก', 'wukong'],
  'เกลลิดัส': ['ป๋า', 'เกล', 'gelidus'],
  'พาลานอส': ['พาลานอส', 'พารานอส', 'pallanus'],
  'ซองจินอู': ['คางแหลม', 'จินอู', 'sungjinwoo'],
  'บรันซ์ & บรันเซล': ['แฝด', 'หมาแฝด', 'แฝดมืด', 'branze', 'bransel'],
  'แร็ดกริด': ['ยานแม่', 'เรดกริด', 'radgrid'],
  'แรนด์กริด': ['แรนกริด', 'randgrid'],
  'เสี่ยวเฉียว': ['เสี่ยวเฉี่ยว', 'ตุ้ม', 'เสี่ยวเกียว', 'xiao qiao'],
  'โรซี่': ['พระแม่', 'rosie'],
  'พยัคฆ์เมฆา': ['กล้าหาญ', 'เสือ', 'พยัคฆ์', 'klahan'],
  'มิเลีย': ['มังกรน้ำ', 'milia'],
  'จูริ': ['juri'],
  'ไพร์': ['ไฟร์', 'fai'],
  'แทโอ': ['อีกา', 'teo'],
  'ไคล์': ['โซ่', 'kyle'],
  'คาร์ม่า': ['กงล้อ', 'karma'],
  'ริน': ['จักรพรรดินี', 'rin'],
  'ยอนฮี': ['ง่วง', 'yeonhee'],
  'เมลคีร์': ['melkir'],
  'วาเนสซา': ['นาฬิกาทราย', 'vanessa'],
  'ลูดี้': ['โล่ทอง', 'ลูดี้', 'ลูดี้ปลุก', 'rudy'],
  'เดลโลนส์': ['เคียว', 'เดล', 'เดลปลุก', 'dellons'],
  'คริส': ['ยมทูต', 'kris'],
  'ไอลีน': ['เจ๊', 'ไอลีนปลุก', 'eileene'],
  'ราเชล': ['ฟีนิกซ์', 'rachel'],
  'เจฟ': ['ขี่มังกร', 'jave'],
  'สไปค์': ['น้ำแข็ง', 'spike'],
  'เอซ': ['ซามูไร', 'ace'],
  'ลิโป้': ['ม้าเซ็กเธาว์', 'lu bu'],
  'ฮายอน': ['ฮายอน', 'ฮายอง', 'ตะเกียง', 'hayeon', 'hayoung'],
  'คามาโดะ ทันจิโร่': ['ทันจิโร่', 'คามาโดะ ทันจิโร่', 'tanjiro', 'ดาบพิฆาตอสูร'],
  'อางาซึมะ เซนอิทซึ': ['เซนอิซึ', 'เซ็นอิทสึ', 'อางาซึมะ เซนอิทซึ', 'zenitsu', 'ดาบพิฆาตอสูร'],
  'โคโจ ชิโนบุ': ['ชิโนบุ', 'โคโจ ชิโนบุ', 'เสาหลักแมลง', 'shinobu', 'ดาบพิฆาตอสูร'],
  'โทมิโอกะ กิยู': ['กิยู', 'โทมิโอกะ กิยู', 'เสาหลักวารี', 'giyu', 'ดาบพิฆาตอสูร'],
  'คลีโอ': ['ตลีโอ', 'คลีโอ', 'cleo'],
  'จูพี้': ['จูพี', 'จูพี้', 'jupy'],
  'ชานซะเลอร์': ['ชานชะเลอร์', 'ชานซะเลอร์', 'chancellor'],
  'เฟรยา': ['เฟรย่า', 'เฟรยา', 'freyja'],
  'ไป๋เจียว': ['ไป่เจียว', 'ไป๋เจียว', 'bai jiao'],
  'อีจูฮี': ['อีจูฉี', 'อีจูฮี', 'lee joohee'],
  'เซอิน': ['เซอิน', 'เชน', 'shane'],
  'แทอู๊ด': ['แทอู๊ด', 'deo'],
};

// Display name overrides for cleaner Thai UI where appropriate
const DISPLAY_NAME_OVERRIDES = {
  'คามาโดะ ทันจิโร่': 'ทันจิโร่',
  'อางาซึมะ เซนอิทซึ': 'เซนอิซึ',
  'โคโจ ชิโนบุ': 'ชิโนบุ',
  'โทมิโอกะ กิยู': 'กิยู',
};

const COLLAB_IDS = new Set(['401987', '401997', '402007', '402017']);
const EXCLUDED_EN_NAMES = new Set(['Akaza', 'Doma', 'Red Boil']);

/**
 * Fetches latest update notices from Official Netmarble Forum (forum.netmarble.com/tskgb)
 */
export async function fetchNetmarbleForumUpdates() {
  const endpoints = [
    'https://forum.netmarble.com/api/game/tskgb/official/forum/sk_rebirth_th/article/list?rows=6&start=0',
    'https://forum.netmarble.com/api/game/tskgb/official/forum/sk_rebirth_gl/article/list?rows=6&start=0',
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const articles = (data?.articleList || []).map((a) => ({
          id: a.id,
          title: a.title,
          createdAt: a.regDate ? new Date(a.regDate).toISOString() : '',
          url: `https://forum.netmarble.com/${a.forumId || 'sk_rebirth_gl'}/view/${a.menuSeq || 10}/${a.id}`,
        }));
        if (articles.length > 0) return articles;
      }
    } catch {
      // ignore and fallback
    }
  }
  return [];
}

/**
 * Syncs character catalog & portraits directly from Seven Knights Re:BIRTH game data files
 * hosted on negi-lab.com/gamewiki/SevenKnightsReBirth/
 * - Excludes Akaza, Doma, common, rare, unreleased
 * - Characters with Awake form only appear once (as their Awake form, no normal duplicate)
 */
export async function syncGamePatchCatalog({ forceDownload = false } = {}) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const [metaRes, thRes, enRes] = await Promise.all([
    fetch(`${NEGILAB_BASE}data/th/meta.json`),
    fetch(`${NEGILAB_BASE}data/th/character_list.json`),
    fetch(`${NEGILAB_BASE}data/en/character_list.json`),
  ]);

  if (!thRes.ok || !enRes.ok) {
    throw new Error('ไม่สามารถดึงข้อมูลแพตช์ตัวละครจากฐานข้อมูลไฟล์เกมได้');
  }

  const meta = metaRes.ok ? await metaRes.json() : { last_updated: new Date().toISOString() };
  const thList = await thRes.json();
  const enList = await enRes.json();
  const enById = new Map(enList.map((c) => [c.id, c]));

  const existingCatalog = fs.existsSync(CATALOG_PATH)
    ? JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
    : { characters: [], pets: [], equipSets: [], equipRings: [] };

  // Filter valid GVG characters (Epic, Legendary, Legendary+, Legendary++)
  // Exclude Akaza, Doma, Red Boil, common, rare, unreleased
  const validGameChars = thList.filter((c) => {
    if (c.unreleased) return false;
    if (c.rarity === 'common' || c.rarity === 'rare' || c.rarity === '不明') return false;
    const enName = enById.get(c.id)?.name || '';
    if (EXCLUDED_EN_NAMES.has(enName)) return false;
    return true;
  });

  // Download Card.webp icons in parallel batches of 20
  let downloadedCount = 0;
  for (let i = 0; i < validGameChars.length; i += 20) {
    const batch = validGameChars.slice(i, i + 20);
    await Promise.all(
      batch.map(async (c) => {
        const fileName = `negilab_${c.id}.webp`;
        const filePath = path.join(ASSETS_DIR, fileName);
        if (!forceDownload && fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
          return;
        }
        const imgUrl = `${NEGILAB_BASE}images/icon/Card/Tex_HeroIcon_${c.id}Card.webp`;
        const res = await fetch(imgUrl);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(filePath, buf);
          downloadedCount++;
        }
      })
    );
  }

  // Map each game character to its tier without ANY normal duplicates for Awakened heroes
  const tierOrder = ['O7K', 'awake', 'ทองบน', 'ทองล่าง', 'epic awake', 'อีปิค'];
  const tierLabels = {
    'O7K': 'O7K',
    'awake': 'Awake',
    'ทองบน': 'ทองบน',
    'ทองล่าง': 'ทองล่าง',
    'epic awake': 'Epic Awake',
    'อีปิค': 'อีปิค',
  };

  const newCharacters = validGameChars.map((c) => {
    const enObj = enById.get(c.id);
    const enName = enObj?.name || '';
    const baseThName = (DISPLAY_NAME_OVERRIDES[c.name] || c.name).trim();

    let tier = 'อีปิค';
    let displayName = baseThName;

    if (c.rarity === 'legendary++') {
      tier = 'O7K';
    } else if (c.awakened && (c.rarity === 'legendary+' || c.rarity === 'legendary')) {
      tier = 'awake';
      displayName = `${baseThName} awake`;
    } else if (c.awakened && c.rarity === 'epic') {
      tier = 'epic awake';
      displayName = `${baseThName} awake epic`;
    } else if (c.rarity === 'legendary+') {
      tier = 'ทองบน';
    } else if (c.rarity === 'legendary') {
      tier = 'ทองล่าง';
    } else {
      tier = 'อีปิค';
    }

    const aliases = Array.from(
      new Set(
        [
          c.name,
          baseThName,
          displayName,
          enName,
          c.subname,
          ...(THAI_NICKNAMES[c.name] || []),
          ...(THAI_NICKNAMES[baseThName] || []),
        ]
          .map((s) => (s ? String(s).trim() : ''))
          .filter((s) => s && s !== displayName)
      )
    );

    return {
      id: String(c.id),
      name: displayName,
      baseName: baseThName,
      tier,
      tierLabel: tierLabels[tier],
      awakened: Boolean(c.awakened),
      imageUrl: `/assets/catalog/negilab_${c.id}.webp`,
      aliases,
    };
  });

  // Sort by tier order, then put newest IDs (latest patch heroes) first within each tier!
  newCharacters.sort((a, b) => {
    const td = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    if (td !== 0) return td;
    // Sort newer character IDs first so latest patch characters are prominent, or by ID descending
    const idA = Number(a.id.slice(-4));
    const idB = Number(b.id.slice(-4));
    return idB - idA;
  });

  const forumArticles = await fetchNetmarbleForumUpdates();

  const updatedCatalog = {
    ...existingCatalog,
    patchMeta: {
      lastUpdated: meta.last_updated || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      totalCharacters: newCharacters.length,
      source: 'Seven Knights Re:BIRTH Game Files (negi-lab) & Netmarble Forum',
      forumUrl: 'https://forum.netmarble.com/tskgb',
      forumArticles,
    },
    characters: newCharacters,
  };

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(updatedCatalog, null, 2), 'utf8');
  return {
    patchMeta: updatedCatalog.patchMeta,
    totalCharacters: newCharacters.length,
    downloadedCount,
  };
}

// Allow running directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  syncGamePatchCatalog()
    .then((res) => console.log('Patch sync complete:', res))
    .catch((err) => {
      console.error('Patch sync error:', err);
      process.exit(1);
    });
}
