import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { syncGamePatchCatalog } from './patchSync.mjs';
import {
  isSupabaseConfigured,
  loadGuildsFromSupabase,
  saveGuildToSupabase,
  deleteGuildFromSupabase,
  SUPABASE_TABLE_SQL,
} from './supabase.mjs';
import { fetchAndConvert7KNote } from './noteImporter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'gvg-db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

function createSeedData() {
  const now = new Date().toISOString();
  return {
    guilds: {
      meta7k: {
        short_id: 'meta7k',
        name: '7K Re:BIRTH Meta GVG (โพยตัวอย่าง)',
        admin_key: '1234',
        viewer_key: '',
        viewer_locked: false,
        created_at: now,
        combos: [
          {
            id: 'combo-tank-meta-1',
            houseNo: 1,
            isFortress: true,
            customName: 'ป้อมหัวกิลด์ (ถึกโรซี่)',
            enemyTeam: {
              strategyId: '1-4',
              teamType: 'tanky',
              skillOrder: [
                { charIndex: 0, skillType: 'B', order: 1 },
                { charIndex: 2, skillType: 'T', order: 2 },
                { charIndex: 1, skillType: 'B', order: 3 },
              ],
              front: {
                characters: [{ index: 0, name: 'ลูดี้ awake' }],
              },
              back: {
                characters: [
                  { index: 1, name: 'เกลลิดัส' },
                  { index: 2, name: 'โรซี่' },
                ],
              },
              pets: ['อีรีน', 'วินดี้', 'ลู', null, null],
            },
            counterTeams: [
              {
                id: 'counter-tank-1',
                order: 0,
                strategyId: '1-4',
                skillOrder: [
                  { charIndex: 1, skillType: 'B', order: 1 },
                  { charIndex: 2, skillType: 'T', order: 2 },
                  { charIndex: 1, skillType: 'T', order: 3 },
                ],
                front: {
                  characters: [
                    {
                      index: 0,
                      name: 'พาลานอส',
                      description: 'บล็อค 100% >> เลือด >> ป้องกัน (ยืนค้ำรับดาเมจ)',
                      equip: {
                        sets: ['นายประตู', 'อัศวินศักดิ์สิทธิ์'],
                        rings: ['แหวนแห่งการคีนชีพ', 'แหวนอมตะ', 'แหวนกำแพงเหล็ก'],
                      },
                    },
                  ],
                },
                back: {
                  characters: [
                    {
                      index: 1,
                      name: 'ซองจินอู',
                      description: 'คริเรท 100% >> คริดาเมจ >> โจมตี (เจาะเกราะทีมถึก)',
                      equip: {
                        sets: ['นักฆ่า', 'ผู้ไล่ล่า'],
                        rings: ['แหวนแห่งอำนาจ', 'แหวนแห่งการปราบปราม', 'แหวนเวทย์มน'],
                      },
                    },
                    {
                      index: 2,
                      name: 'เคลมิส awake',
                      description: 'เลือด >> บล็อค >> ต้านทานสถานะ (เร่งเทิร์น + ล้างดีบัฟ)',
                      equip: {
                        sets: ['อัศวินศักดิ์สิทธิ์', 'ผู้ปรับสมดุล'],
                        rings: ['แหวนแห่งสุขภาพ', 'แหวนแห่งการคีนชีพ'],
                      },
                    },
                  ],
                },
                pets: ['คารัม', 'ไพค์', 'ครี', null, null],
                note: 'เปิดด้วยสกิลล่างคางแหลม (ซองจินอู) เพื่อเจาะโล่ลูดี้ จากนั้นใช้สกิลบนเคลมิสเร่งสกิล แล้วปิดด้วยสกิลบนซองจินอู ระวังโดนป๋าเกลลิดัสแช่แข็งหากไม่มีแหวนต้านทาน',
              },
              {
                id: 'counter-tank-2',
                order: 1,
                strategyId: '2-3',
                skillOrder: [
                  { charIndex: 2, skillType: 'T', order: 1 },
                  { charIndex: 3, skillType: 'B', order: 2 },
                  { charIndex: 0, skillType: 'B', order: 3 },
                ],
                front: {
                  characters: [
                    {
                      index: 0,
                      name: 'ซุนหงอคง',
                      description: 'โจมตี >> คริ >> เลือด (ร่างแยกปั่นป่วนแนวหลัง)',
                      equip: {
                        sets: ['ผู้บัญชาการ', 'นักฆ่า'],
                        rings: ['แหวนแห่งการคีนชีพ', 'แหวนแห่งพลังกายใจ'],
                      },
                    },
                  ],
                },
                back: {
                  characters: [
                    {
                      index: 2,
                      name: 'ยอนฮี',
                      description: 'โจมตีเวทย์ >> จุดอ่อน >> แม่นยำ (หลับยกทีม + ทะลวงเกราะ)',
                      equip: {
                        sets: ['ผู้ไล่ล่า', 'หมอผี'],
                        rings: ['แหวนแห่งความฝัน', 'แหวนเวทย์มน', 'แหวนแห่งอำนาจ'],
                      },
                    },
                    {
                      index: 3,
                      name: 'เมลคีร์',
                      description: 'เลือด >> เข้าเป้า >> โจมตีเวทย์',
                      equip: {
                        sets: ['หมอผี', 'อัศวินศักดิ์สิทธิ์'],
                        rings: ['แหวนอมตะ', 'แหวนกาลเวลา'],
                      },
                    },
                  ],
                },
                pets: ['ยอนจี', 'ยู', null, null, null],
                note: 'ใช้ยอนฮีสกิลบนกล่อมหลับแล้วตามด้วยเมลคีร์ลดเทิร์นบัฟอมตะของโรซี่ หงอคงคอยเก็บตกตัวที่หลุดออกมา',
              },
            ],
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'combo-phys-speed-2',
            houseNo: 2,
            isFortress: false,
            customName: 'บ้านสปีดแฝดลิง',
            enemyTeam: {
              strategyId: '2-3',
              teamType: 'physical',
              skillOrder: [
                { charIndex: 0, skillType: 'T', order: 1 },
                { charIndex: 2, skillType: 'B', order: 2 },
                { charIndex: 3, skillType: 'T', order: 3 },
              ],
              front: {
                characters: [
                  { index: 0, name: 'พาลานอส' },
                  { index: 1, name: 'ซุนหงอคง' },
                ],
              },
              back: {
                characters: [{ index: 2, name: 'บรันซ์ & บรันเซล' }],
              },
              pets: ['ไพค์', 'คารัม', null, null, null],
            },
            counterTeams: [
              {
                id: 'counter-phys-1',
                order: 0,
                strategyId: '1-4',
                skillOrder: [
                  { charIndex: 0, skillType: 'T', order: 1 },
                  { charIndex: 1, skillType: 'B', order: 2 },
                  { charIndex: 2, skillType: 'T', order: 3 },
                ],
                front: {
                  characters: [
                    {
                      index: 0,
                      name: 'แร็ดกริด',
                      description: 'บล็อค >> ป้องกัน >> เลือด (ยานแม่กางเกราะสะท้อนดาเมจ)',
                      equip: {
                        sets: ['นายประตู', 'ผู้พิทักษ์'],
                        rings: ['แหวนกำแพงเหล็ก', 'แหวนแห่งการคีนชีพ', 'แหวนแห่งโอกาส'],
                      },
                    },
                  ],
                },
                back: {
                  characters: [
                    {
                      index: 1,
                      name: 'เกลลิดัส',
                      description: 'เลือด >> บล็อค >> โจมตี (ป๋าเกลเคาน์เตอร์แช่แข็งแฝด & ลิง)',
                      equip: {
                        sets: ['อัศวินศักดิ์สิทธิ์', 'นายประตู'],
                        rings: ['แหวนแห่งทุ่งหิมะ', 'แหวนอมตะ', 'แหวนแห่งสุขภาพ'],
                      },
                    },
                    {
                      index: 2,
                      name: 'จูริ',
                      description: 'โจมตี >> จุดอ่อน >> คริ (ตัดฮีล + สวนกลับ)',
                      equip: {
                        sets: ['ผู้ไล่ล่า', 'นักฆ่า'],
                        rings: ['แหวนแห่งอำนาจ', 'แหวนเวทย์มน'],
                      },
                    },
                  ],
                },
                pets: ['อีรีน', 'ลู', 'ดอจ', null, null],
                note: 'เอาแร็ดกริด (ยานแม่) ยืนหน้ารับสปีดของแฝดกับลิง พอแฝดพุ่งเข้ามาจะติดแช่แข็งจากพาสซีฟป๋าเกลลิดัสทันที จากนั้นกดสกิลล่างเกลลิดัสและจูริเก็บกวาด',
              },
            ],
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'combo-magic-3',
            houseNo: 3,
            isFortress: false,
            customName: 'บ้านเวทย์หลับยอนฮี',
            enemyTeam: {
              strategyId: '1-4',
              teamType: 'magic',
              skillOrder: [
                { charIndex: 1, skillType: 'T', order: 1 },
                { charIndex: 2, skillType: 'B', order: 2 },
                { charIndex: 0, skillType: 'B', order: 3 },
              ],
              front: {
                characters: [{ index: 0, name: 'วาเนสซา' }],
              },
              back: {
                characters: [
                  { index: 1, name: 'ยอนฮี' },
                  { index: 2, name: 'เมลคีร์' },
                ],
              },
              pets: ['ยอนจี', 'เดลโล่', null, null, null],
            },
            counterTeams: [
              {
                id: 'counter-magic-1',
                order: 0,
                strategyId: '4-1',
                skillOrder: [
                  { charIndex: 4, skillType: 'B', order: 1 },
                  { charIndex: 4, skillType: 'T', order: 2 },
                  { charIndex: 1, skillType: 'T', order: 3 },
                ],
                front: {
                  characters: [
                    {
                      index: 1,
                      name: 'บรันซ์ & บรันเซล',
                      description: 'สปีด >> โจมตี >> คริ',
                      equip: {
                        sets: ['ผู้บัญชาการ'],
                        rings: ['แหวนอมตะ', 'แหวนเวทย์มน'],
                      },
                    },
                    {
                      index: 2,
                      name: 'ออร์ก้า awake',
                      description: 'สปีด >> เข้าเป้า >> โจมตี',
                      equip: {
                        sets: ['หมอผี'],
                        rings: ['แหวนกาลเวลา', 'แหวนแห่งการคีนชีพ'],
                      },
                    },
                  ],
                },
                back: {
                  characters: [
                    {
                      index: 4,
                      name: 'ไคล์',
                      description: 'โจมตี >> คริ 100% >> จุดอ่อน (โซ่กวาดแถวหลังยอนฮี)',
                      equip: {
                        sets: ['นักฆ่า', 'ผู้ไล่ล่า'],
                        rings: ['แหวนแห่งอำนาจ', 'แหวนอมตะ', 'แหวนช่วงชิงปราสาท'],
                      },
                    },
                  ],
                },
                pets: ['เดลโล่', 'คารัม', null, null, null],
                note: 'อัดสปีดชิงเปิดก่อนด้วยสกิลล่างไคล์ + สกิลบนไคล์ เพื่อล้วงยอนฮีและเมลคีร์ด้านหลังให้ตายก่อนได้ออกสกิล',
              },
            ],
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    },
  };
}

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.guilds) data.guilds = {};
    if (!data.guilds.meta7k) {
      const seed = createSeedData();
      data.guilds.meta7k = seed.guilds.meta7k;
      saveDb(data);
    }
    for (const gid of Object.keys(data.guilds)) {
      const g = data.guilds[gid];
      if (!g.combos) g.combos = [];
      if (!g.targets) g.targets = [];
      if (!g.plans) g.plans = [];

      if (gid === 'meta7k' && Array.isArray(g.combos)) {
        if (g.combos[0] && !g.combos[0].houseNo) {
          g.combos[0].houseNo = 1;
          g.combos[0].isFortress = true;
          g.combos[0].customName = 'ป้อมหัวกิลด์ (ถึกโรซี่)';
        }
        if (g.combos[1] && (!g.combos[1].houseNo || g.combos[1].houseNo === 2)) {
          g.combos[1].houseNo = 5;
          g.combos[1].isFortress = false;
          g.combos[1].customName = 'บ้านสปีดแฝดลิง';
        }
        if (g.combos[2] && (!g.combos[2].houseNo || g.combos[2].houseNo === 3)) {
          g.combos[2].houseNo = 6;
          g.combos[2].isFortress = false;
          g.combos[2].customName = 'บ้านเวทย์หลับยอนฮี';
        }
      }

      // Ensure every target house and defense formula is also visible in combos
      if (Array.isArray(g.targets) && Array.isArray(g.combos)) {
        for (const t of g.targets) {
          const comboId = t.id.startsWith('combo-') ? t.id : `combo-${t.id}`;
          const existing = g.combos.find(
            (c) => c.id === comboId || c.id === t.id || (t.houseNo && c.houseNo === t.houseNo)
          );
          if (!existing) {
            g.combos.push({
              id: comboId,
              houseNo: t.houseNo,
              isFortress: Boolean(t.isFortress),
              customName: t.customName || (t.isFortress ? `ป้อม ${t.houseNo}` : `บ้านที่ ${t.houseNo}`),
              enemyTeam: t.enemyTeam || {
                strategyId: '1-4',
                teamType: 'tanky',
                skillOrder: [],
                front: { characters: [] },
                back: { characters: [] },
                pets: [null, null, null, null, null],
              },
              counterTeams: (t.counters || []).map((c, idx) => ({
                id: c.id || `counter-${t.id}-${idx}`,
                order: c.order ?? idx,
                strategyId: c.strategyId || '1-4',
                skillOrder: c.skillOrder || [],
                front: c.front || { characters: [] },
                back: c.back || { characters: [] },
                pets: c.pets || [null, null, null, null, null],
                note: c.note || '',
                likes: c.likes || 0,
              })),
              createdAt: t.createdAt || new Date().toISOString(),
              updatedAt: t.updatedAt || new Date().toISOString(),
            });
          }
        }
        // Deduplicate combos by houseNo
        const seenHouses = new Set();
        g.combos = g.combos.filter((c) => {
          if (!c.houseNo) return true;
          if (seenHouses.has(c.houseNo)) return false;
          seenHouses.add(c.houseNo);
          return true;
        });
        g.combos.sort((a, b) => (a.houseNo || 999) - (b.houseNo || 999));
      }
      if (!g.schedule) {
        g.schedule = {
          warDays: ['อังคาร', 'พฤหัสบดี', 'เสาร์'],
          warStartTime: '12:00',
          warEndTime: '23:59',
          currentSeasonName: 'Season 1 (พรีซีซัน)',
          announcement: 'อย่าลืมตีให้ครบคนละ 3 ไม้ก่อน 23:59 น. นะครับ!',
        };
      }
    }
    return data;
  } catch (err) {
    console.error('Error loading DB, re-initializing seed:', err);
    return createSeedData();
  }
}

function saveDb(db, targetGuildShortId = null) {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);

  if (isSupabaseConfigured()) {
    if (targetGuildShortId && db.guilds && db.guilds[targetGuildShortId]) {
      saveGuildToSupabase(db.guilds[targetGuildShortId]).catch((err) => {
        console.error(`Failed to sync guild ${targetGuildShortId} to Supabase:`, err.message);
      });
    } else if (db.guilds) {
      for (const guild of Object.values(db.guilds)) {
        saveGuildToSupabase(guild).catch((err) => {
          console.error(`Failed to sync guild ${guild.short_id} to Supabase:`, err.message);
        });
      }
    }
  }
}

function generateShortId(db) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!db.guilds[id]) return id;
  }
  return crypto.randomUUID().slice(0, 8);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Clean up duplicate equipSets / equipRings in catalog.json on boot if needed
  const catalogPath = path.join(ROOT_DIR, 'src', 'data', 'catalog.json');
  if (fs.existsSync(catalogPath)) {
    try {
      const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      const dedupByName = (arr) => {
        const seen = new Set();
        return (arr || []).filter((item) => {
          if (seen.has(item.name)) return false;
          seen.add(item.name);
          return true;
        });
      };
      const prevSetLen = (cat.equipSets || []).length;
      const prevRingLen = (cat.equipRings || []).length;
      cat.characters = dedupByName(cat.characters);
      cat.pets = dedupByName(cat.pets);
      cat.equipSets = dedupByName(cat.equipSets);
      cat.equipRings = dedupByName(cat.equipRings);
      if (cat.equipSets.length !== prevSetLen || cat.equipRings.length !== prevRingLen) {
        fs.writeFileSync(catalogPath, JSON.stringify(cat, null, 2), 'utf8');
        console.log(`Deduplicated catalog.json: ${cat.equipSets.length} sets, ${cat.equipRings.length} rings.`);
      }
    } catch (e) {
      console.warn('Could not deduplicate catalog.json:', e.message);
    }
  }

  // Ensure DB is initialized
  const db = loadDb();

  // Supabase boot sync
  if (isSupabaseConfigured()) {
    try {
      console.log('🔌 Supabase is configured. Checking remote database...');
      const remoteGuilds = await loadGuildsFromSupabase();
      if (remoteGuilds && Object.keys(remoteGuilds).length > 0) {
        console.log(`📥 Loaded ${Object.keys(remoteGuilds).length} guilds from Supabase.`);
        for (const [id, rGuild] of Object.entries(remoteGuilds)) {
          db.guilds[id] = rGuild;
        }
        for (const [id, lGuild] of Object.entries(db.guilds)) {
          if (!remoteGuilds[id]) {
            console.log(`📤 Pushing local guild "${id}" to Supabase...`);
            await saveGuildToSupabase(lGuild);
          }
        }
        saveDb(db);
      } else if (remoteGuilds && Object.keys(remoteGuilds).length === 0) {
        console.log('📤 Supabase table is empty. Initializing Supabase with current guilds...');
        for (const lGuild of Object.values(db.guilds)) {
          console.log(`📤 Seeding guild "${lGuild.short_id}" to Supabase...`);
          await saveGuildToSupabase(lGuild);
        }
      }
    } catch (err) {
      console.warn('⚠️ Supabase initial sync warning:', err.message);
    }
  } else {
    console.log('ℹ️ Running with local JSON database storage (SUPABASE_URL and SUPABASE_KEY not set).');
  }

  // Check current patch metadata & Netmarble Forum updates
  app.get('/api/patch/status', (req, res) => {
    try {
      const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      res.json({
        patchMeta: cat.patchMeta || null,
        totalCharacters: (cat.characters || []).length,
        totalPets: (cat.pets || []).length,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger live sync with Game Data Files & Netmarble Forum
  app.post('/api/patch/sync', async (req, res) => {
    try {
      const result = await syncGamePatchCatalog({ forceDownload: Boolean(req.body?.force) });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message || 'ซิงค์แพตช์ไม่สำเร็จ' });
    }
  });

  // Add or update a character in catalog.json (supports base64 image upload or URL)
  app.post('/api/catalog/character', (req, res) => {
    try {
      const { name, tier, aliases, imageBase64, imageUrl } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'กรุณาระบุชื่อตัวละคร' });
      }
      const cleanName = String(name).trim();
      const cleanTier = tier || 'ทองบน';
      const tierLabels = {
        'O7K': 'O7K',
        'awake': 'Awake',
        'ทองบน': 'ทองบน',
        'ทองล่าง': 'ทองล่าง',
        'epic awake': 'Epic Awake',
        'อีปิค': 'อีปิค',
      };

      let finalImageUrl = imageUrl || '';
      if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/')) {
        const assetsDir = path.join(ROOT_DIR, 'public', 'assets', 'catalog');
        fs.mkdirSync(assetsDir, { recursive: true });
        const extMatch = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
        const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'webp';
        const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
        const fileName = `custom_char_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(assetsDir, fileName), Buffer.from(base64Data, 'base64'));
        finalImageUrl = `/assets/catalog/${fileName}`;
      }

      const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      const aliasList = Array.isArray(aliases)
        ? aliases.map((a) => String(a).trim()).filter(Boolean)
        : String(aliases || '')
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean);

      const existingIdx = (cat.characters || []).findIndex((c) => c.name === cleanName);
      const charObj = {
        name: cleanName,
        tier: cleanTier,
        tierLabel: tierLabels[cleanTier] || cleanTier,
        imageUrl: finalImageUrl || (existingIdx >= 0 ? cat.characters[existingIdx].imageUrl : ''),
        aliases: aliasList,
      };

      if (existingIdx >= 0) {
        cat.characters[existingIdx] = charObj;
      } else {
        cat.characters.unshift(charObj);
      }

      fs.writeFileSync(catalogPath, JSON.stringify(cat, null, 2), 'utf8');
      res.json({ ok: true, character: charObj });
    } catch (err) {
      res.status(500).json({ error: err.message || 'บันทึกตัวละครไม่สำเร็จ' });
    }
  });

  // List public / featured guilds for Landing Page
  app.get('/api/guilds/public', (req, res) => {
    const db = loadDb();
    const list = Object.values(db.guilds).map((g) => ({
      short_id: g.short_id,
      name: g.name,
      viewer_locked: Boolean(g.viewer_locked),
      combo_count: (g.combos || []).length,
      created_at: g.created_at,
    }));
    res.json({ guilds: list });
  });

  // Create guild
  app.post('/api/guild/create', (req, res) => {
    const { name, admin_key } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อกิลด์' });
    }
    const db = loadDb();
    const short_id = generateShortId(db);
    const cleanAdminKey = admin_key && String(admin_key).trim() ? String(admin_key).trim() : crypto.randomUUID().replace(/-/g, '').slice(0, 12);

    db.guilds[short_id] = {
      short_id,
      name: String(name).trim().slice(0, 50),
      admin_key: cleanAdminKey,
      viewer_key: '',
      viewer_locked: false,
      created_at: new Date().toISOString(),
      combos: [],
    };
    saveDb(db);
    res.json({
      short_id,
      name: db.guilds[short_id].name,
      admin_key: cleanAdminKey,
    });
  });

  // Verify admin key
  app.post('/api/guild/verify', (req, res) => {
    const { short_id, admin_key } = req.body || {};
    const db = loadDb();
    const guild = db.guilds[short_id];
    if (!guild) {
      return res.status(404).json({ valid: false, error: 'ไม่พบกิลด์นี้' });
    }
    const valid = Boolean(admin_key && guild.admin_key === String(admin_key).trim());
    res.json({ valid });
  });

  // Verify viewer key
  app.post('/api/guild/verify-viewer', (req, res) => {
    const { short_id, viewer_key } = req.body || {};
    const db = loadDb();
    const guild = db.guilds[short_id];
    if (!guild) {
      return res.status(404).json({ valid: false, error: 'ไม่พบกิลด์นี้' });
    }
    if (!guild.viewer_locked) {
      return res.json({ valid: true });
    }
    const input = String(viewer_key || '').trim();
    const valid = Boolean(input && (guild.viewer_key === input || guild.admin_key === input));
    res.json({ valid });
  });

  // Update admin key
  app.put('/api/guild/:shortId/admin-key', (req, res) => {
    const { shortId } = req.params;
    const headerKey = req.header('X-Admin-Key') || '';
    const { new_admin_key } = req.body || {};
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== headerKey) {
      return res.status(401).json({ error: 'รหัสแอดมินไม่ถูกต้อง' });
    }
    if (!new_admin_key || String(new_admin_key).trim().length < 4) {
      return res.status(400).json({ error: 'รหัสผ่านแอดมินต้องมีอย่างน้อย 4 ตัวอักษร' });
    }
    guild.admin_key = String(new_admin_key).trim();
    saveDb(db);
    res.json({ ok: true });
  });

  // Update viewer lock
  app.put('/api/guild/:shortId/viewer-lock', (req, res) => {
    const { shortId } = req.params;
    const headerKey = req.header('X-Admin-Key') || '';
    const { viewer_locked, viewer_key } = req.body || {};
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== headerKey) {
      return res.status(401).json({ error: 'รหัสแอดมินไม่ถูกต้อง' });
    }
    if (typeof viewer_key === 'string') {
      guild.viewer_key = viewer_key.trim();
    }
    if (typeof viewer_locked === 'boolean') {
      guild.viewer_locked = viewer_locked;
    }
    saveDb(db);
    res.json({
      ok: true,
      viewer_locked: guild.viewer_locked,
      viewer_key: guild.viewer_key,
    });
  });

  // Get guild data & combos
  app.get('/api/guild/:shortId', (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const viewerKey = req.header('X-Viewer-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) {
      return res.status(404).json({ error: 'ไม่พบกิลด์นี้ในระบบ' });
    }
    const isAdmin = Boolean(adminKey && guild.admin_key === adminKey);
    const isViewerAuthorized =
      !guild.viewer_locked ||
      isAdmin ||
      Boolean(viewerKey && (guild.viewer_key === viewerKey || guild.admin_key === viewerKey));

    if (!isViewerAuthorized) {
      return res.status(403).json({
        error: 'viewer_locked',
        short_id: guild.short_id,
        name: guild.name,
        viewer_locked: true,
      });
    }

    res.json({
      short_id: guild.short_id,
      name: guild.name,
      viewer_locked: Boolean(guild.viewer_locked),
      viewer_key: isAdmin ? guild.viewer_key : undefined,
      is_admin: isAdmin,
      combos: guild.combos || [],
      targets: guild.targets || [],
      plans: guild.plans || [],
      schedule: guild.schedule || {
        warDays: ['อังคาร', 'พฤหัสบดี', 'เสาร์'],
        warStartTime: '12:00',
        warEndTime: '23:59',
        currentSeasonName: 'Season 1 (พรีซีซัน)',
        announcement: 'อย่าลืมตีให้ครบคนละ 3 ไม้ก่อน 23:59 น. นะครับ!',
      },
    });
  });

  // Get single combo
  app.get('/api/guild/:shortId/combos/:comboId', (req, res) => {
    const { shortId, comboId } = req.params;
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    const combo = (guild.combos || []).find((c) => c.id === comboId);
    if (!combo) return res.status(404).json({ error: 'ไม่พบข้อมูลทีมนี้' });
    res.json(combo);
  });

  // Create combo
  app.post('/api/guild/:shortId/combos', (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถเพิ่มทีมได้' });
    }
    const { enemyTeam, counterTeams, houseNo, isFortress, customName } = req.body || {};
    if (!enemyTeam) {
      return res.status(400).json({ error: 'ข้อมูลทีมเป้าหมายไม่ถูกต้อง' });
    }
    const now = new Date().toISOString();
    const newCombo = {
      id: `combo-${crypto.randomUUID().slice(0, 8)}`,
      houseNo: houseNo !== undefined && houseNo !== null && houseNo !== '' ? Number(houseNo) : undefined,
      isFortress: Boolean(isFortress),
      customName: customName ? String(customName).trim() : '',
      enemyTeam,
      counterTeams: Array.isArray(counterTeams) ? counterTeams : [],
      createdAt: now,
      updatedAt: now,
    };
    guild.combos.unshift(newCombo);
    saveDb(db);
    res.json(newCombo);
  });

  // Update combo (enemyTeam and/or counterTeams)
  app.put('/api/guild/:shortId/combos/:comboId', (req, res) => {
    const { shortId, comboId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถแก้ไขข้อมูลได้' });
    }
    const idx = (guild.combos || []).findIndex((c) => c.id === comboId);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบทีมเป้าหมายนี้' });

    const existing = guild.combos[idx];
    const { enemyTeam, counterTeams, houseNo, isFortress, customName } = req.body || {};
    const updated = {
      ...existing,
      houseNo: houseNo !== undefined ? (houseNo === '' || houseNo === null ? undefined : Number(houseNo)) : existing.houseNo,
      isFortress: isFortress !== undefined ? Boolean(isFortress) : existing.isFortress,
      customName: customName !== undefined ? String(customName).trim() : existing.customName,
      enemyTeam: enemyTeam ?? existing.enemyTeam,
      counterTeams: Array.isArray(counterTeams) ? counterTeams : existing.counterTeams,
      updatedAt: new Date().toISOString(),
    };
    guild.combos[idx] = updated;
    saveDb(db);
    res.json(updated);
  });

  // Delete combo
  app.delete('/api/guild/:shortId/combos/:comboId', (req, res) => {
    const { shortId, comboId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถลบทีมได้' });
    }
    guild.combos = (guild.combos || []).filter((c) => c.id !== comboId);
    saveDb(db);
    res.json({ ok: true });
  });

  // Rename guild
  app.put('/api/guild/:shortId/name', (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const { name } = req.body || {};
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'รหัสแอดมินไม่ถูกต้อง' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อกิลด์' });
    }
    guild.name = String(name).trim().slice(0, 50);
    saveDb(db);
    res.json({ ok: true, name: guild.name });
  });

  // Export Guild Data Backup
  app.get('/api/guild/:shortId/export', (req, res) => {
    const { shortId } = req.params;
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      short_id: guild.short_id,
      name: guild.name,
      combos: guild.combos || [],
      targets: guild.targets || [],
      plans: guild.plans || [],
      schedule: guild.schedule || null,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="7k-gvg-backup-${shortId}-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.send(JSON.stringify(exportData, null, 2));
  });

  // Import / Restore Guild Data
  app.post('/api/guild/:shortId/import', (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถกู้คืนข้อมูลได้' });
    }

    const { combos, targets, plans, schedule, mode = 'merge' } = req.body || {};

    if (!Array.isArray(combos) && !Array.isArray(targets) && !schedule) {
      return res.status(400).json({ error: 'ไฟล์ข้อมูลสำรองไม่ถูกต้อง' });
    }

    if (mode === 'replace') {
      if (Array.isArray(combos)) guild.combos = combos;
      if (Array.isArray(targets)) guild.targets = targets;
      if (Array.isArray(plans)) guild.plans = plans;
      if (schedule) guild.schedule = schedule;
    } else {
      // Merge mode
      if (Array.isArray(combos)) {
        guild.combos = guild.combos || [];
        for (const c of combos) {
          const idx = guild.combos.findIndex((existing) => existing.id === c.id);
          if (idx !== -1) {
            guild.combos[idx] = c;
          } else {
            guild.combos.push(c);
          }
        }
      }
      if (schedule) {
        guild.schedule = { ...(guild.schedule || {}), ...schedule };
      }
    }

    saveDb(db);
    res.json({ ok: true, guild });
  });

  // Download full DB backup
  app.get('/api/admin/backup-full', (req, res) => {
    const db = loadDb();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gvg-db-full-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.send(JSON.stringify(db, null, 2));
  });

  // Create target house
  app.post('/api/guild/:shortId/targets', (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถเพิ่มบ้านศัตรูได้' });
    }
    guild.targets = guild.targets || [];
    const { houseNo, customName, isFortress, enemyTeam, tags, note, counters } = req.body || {};
    if (!enemyTeam) {
      return res.status(400).json({ error: 'ข้อมูลทีมตั้งรับไม่ถูกต้อง' });
    }
    const now = new Date().toISOString();
    const newTarget = {
      id: `target-${crypto.randomUUID().slice(0, 8)}`,
      houseNo: Number(houseNo) || guild.targets.length + 1,
      customName: customName ? String(customName).trim() : '',
      isFortress: Boolean(isFortress),
      stars: 0,
      status: 'unattacked',
      tags: Array.isArray(tags) ? tags : [],
      note: note ? String(note).trim() : '',
      enemyTeam,
      counters: Array.isArray(counters) ? counters : [],
      createdAt: now,
      updatedAt: now,
    };
    guild.targets.unshift(newTarget);
    saveDb(db);
    res.json(newTarget);
  });

  // Update target house
  app.put('/api/guild/:shortId/targets/:targetId', (req, res) => {
    const { shortId, targetId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    guild.targets = guild.targets || [];
    const idx = guild.targets.findIndex((t) => t.id === targetId);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบข้อมูลบ้านศัตรูนี้' });

    const isAdmin = guild.admin_key === adminKey;
    const existing = guild.targets[idx];
    const {
      houseNo,
      customName,
      isFortress,
      stars,
      status,
      tags,
      note,
      enemyTeam,
      counters,
      assignedTo,
    } = req.body || {};

    if (!isAdmin && (enemyTeam || houseNo !== undefined)) {
      return res.status(401).json({ error: 'เฉพาะแอดมินที่สามารถแก้ไขทีมตั้งรับของบ้านได้' });
    }

    const updated = {
      ...existing,
      houseNo: houseNo !== undefined ? Number(houseNo) : existing.houseNo,
      customName: customName !== undefined ? String(customName).trim() : existing.customName,
      isFortress: isFortress !== undefined ? Boolean(isFortress) : existing.isFortress,
      stars: stars !== undefined ? Number(stars) : existing.stars,
      status: status || existing.status,
      tags: tags !== undefined ? (Array.isArray(tags) ? tags : []) : existing.tags,
      note: note !== undefined ? String(note).trim() : existing.note,
      enemyTeam: enemyTeam || existing.enemyTeam,
      counters: counters !== undefined ? counters : existing.counters,
      assignedTo: assignedTo !== undefined ? String(assignedTo).trim() : existing.assignedTo,
      updatedAt: new Date().toISOString(),
    };
    guild.targets[idx] = updated;
    saveDb(db);
    res.json(updated);
  });

  // Delete target house
  app.delete('/api/guild/:shortId/targets/:targetId', (req, res) => {
    const { shortId, targetId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถลบบ้านศัตรูได้' });
    }
    guild.targets = (guild.targets || []).filter((t) => t.id !== targetId);
    saveDb(db);
    res.json({ ok: true });
  });

  // Like a counter in target house
  app.post('/api/guild/:shortId/targets/:targetId/counters/:counterId/like', (req, res) => {
    const { shortId, targetId, counterId } = req.params;
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    guild.targets = guild.targets || [];
    const target = guild.targets.find((t) => t.id === targetId);
    if (!target) return res.status(404).json({ error: 'ไม่พบข้อมูลบ้านศัตรูนี้' });
    const counter = (target.counters || []).find((c) => c.id === counterId);
    if (!counter) return res.status(404).json({ error: 'ไม่พบทีมแก้นี้' });

    counter.likes = (counter.likes || 0) + 1;
    saveDb(db);
    res.json({ ok: true, likes: counter.likes });
  });

  // Plans: Add or Update Plan
  app.post('/api/guild/:shortId/plans', (req, res) => {
    const { shortId } = req.params;
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    guild.plans = guild.plans || [];
    const { memberName, slots } = req.body || {};
    if (!memberName || !String(memberName).trim()) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อสมาชิก' });
    }
    const cleanName = String(memberName).trim();
    const existingIdx = guild.plans.findIndex(
      (p) => p.memberName.toLowerCase() === cleanName.toLowerCase()
    );
    const now = new Date().toISOString();
    const planObj = {
      id:
        existingIdx >= 0 ? guild.plans[existingIdx].id : `plan-${crypto.randomUUID().slice(0, 8)}`,
      memberName: cleanName,
      slots: Array.isArray(slots) ? slots : [],
      updatedAt: now,
    };
    if (existingIdx >= 0) {
      guild.plans[existingIdx] = planObj;
    } else {
      guild.plans.push(planObj);
    }
    saveDb(db);
    res.json(planObj);
  });

  // Delete Plan
  app.delete('/api/guild/:shortId/plans/:planId', (req, res) => {
    const { shortId, planId } = req.params;
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    guild.plans = (guild.plans || []).filter((p) => p.id !== planId);
    saveDb(db);
    res.json({ ok: true });
  });

  // Schedule: Update
  app.put('/api/guild/:shortId/schedule', (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถแก้ไขตารางวอร์ได้' });
    }
    guild.schedule = req.body || {};
    saveDb(db);
    res.json({ ok: true, schedule: guild.schedule });
  });

  // Delete guild
  app.delete('/api/guild/:shortId', (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'รหัสแอดมินไม่ถูกต้อง' });
    }
    delete db.guilds[shortId];
    saveDb(db);
    if (isSupabaseConfigured()) {
      deleteGuildFromSupabase(shortId).catch((err) => {
        console.error('Error deleting guild from Supabase:', err.message);
      });
    }
    res.json({ ok: true });
  });

  // Supabase status & table DDL
  app.get('/api/supabase/status', (req, res) => {
    res.json({
      configured: isSupabaseConfigured(),
      sql: SUPABASE_TABLE_SQL,
      supabaseUrlSet: Boolean(process.env.SUPABASE_URL),
      supabaseKeySet: Boolean(
        process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    });
  });

  // Sync 7K-Note formulas into guild
  app.post('/api/guild/:shortId/sync-7knote', async (req, res) => {
    const { shortId } = req.params;
    const adminKey = req.header('X-Admin-Key') || '';
    const db = loadDb();
    const guild = db.guilds[shortId];
    if (!guild) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    if (guild.admin_key !== adminKey) {
      return res.status(401).json({ error: 'เฉพาะแอดมินกิลด์เท่านั้นที่สามารถซิงค์โพยได้' });
    }
    const { guildCode = '4ZyeEGMZ', replace = true } = req.body || {};
    try {
      const imported = await fetchAndConvert7KNote(guildCode);
      if (replace) {
        guild.targets = imported.targets;
        guild.combos = imported.combos;
      } else {
        // Merge mode: update or append
        guild.targets = guild.targets || [];
        guild.combos = guild.combos || [];
        for (const t of imported.targets) {
          const idx = guild.targets.findIndex((x) => x.houseNo === t.houseNo);
          if (idx >= 0) guild.targets[idx] = t;
          else guild.targets.push(t);
        }
        for (const c of imported.combos) {
          const idx = guild.combos.findIndex((x) => x.houseNo === c.houseNo);
          if (idx >= 0) guild.combos[idx] = c;
          else guild.combos.push(c);
        }
      }
      guild.updated_at = new Date().toISOString();
      saveDb(db, shortId);
      res.json({
        ok: true,
        message: `ซิงค์โพยสำเร็จ ${imported.targets.length} บ้าน`,
        count: imported.targets.length,
        targets: guild.targets,
        combos: guild.combos,
      });
    } catch (err) {
      console.error('Error syncing 7k-note:', err);
      res.status(500).json({ error: err.message || 'ซิงค์โพยล้มเหลว' });
    }
  });

  // AI Vision Screenshot Scanner: Analyze screenshot & build team
  app.post('/api/ai/scan-team', async (req, res) => {
    try {
      const { imageBase64, apiKey: clientApiKey, mode = 'enemy', demoMode } = req.body || {};
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY || '';

      // Fallback/Demo mode if no API key or explicitly requested
      if (demoMode || !apiKey) {
        const demoPresets = [
          {
            strategyId: '1-4',
            teamType: 'tanky',
            houseNo: 1,
            isFortress: true,
            customName: 'ป้อม 1 (ทีมถึกโรซี่-ลูดี้)',
            frontCharacters: [{ index: 0, name: 'ลูดี้ awake' }],
            backCharacters: [
              { index: 1, name: 'เกลลิดัส' },
              { index: 2, name: 'โรซี่' },
              { index: 3, name: 'พาลานอส' },
              { index: 4, name: 'มิเลีย' },
            ],
            pets: ['อีรีน', 'วินดี้', null, null, null],
            explanation:
              'ตรวจพบทีมถึกเมต้า หน้า 1 หลัง 4 โดยมีลูดี้ยืนค้ำแถวหน้า และแถวหลังมีโรซี่ช่วยชุบชีวิตพร้อมเกลลิดัสแช่แข็ง',
            recommendedCounter: {
              strategyId: '1-4',
              frontCharacters: [
                { index: 0, name: 'พาลานอส', description: 'บล็อค 100% >> เลือด (ค้ำรับดาเมจแนวหน้า)' },
              ],
              backCharacters: [
                { index: 1, name: 'ซองจินอู', description: 'คริ 100% >> คริดาเมจ (เจาะเกราะทะลวงทีมถึก)' },
                { index: 2, name: 'เคลมิส awake', description: 'เร่งเทิร์นบัฟอมตะ + ล้างสถานะ' },
                { index: 3, name: 'ยอนฮี', description: 'หลับยกทีม + ดาเมจทะลวงเวทย์' },
                { index: 4, name: 'เมลคีร์', description: 'ลดเทิร์นบัฟอมตะของโรซี่' },
              ],
              pets: ['คารัม', 'ไพค์', null, null, null],
              skillOrder: [
                { charIndex: 1, skillType: 'B', order: 1 },
                { charIndex: 2, skillType: 'T', order: 2 },
                { charIndex: 1, skillType: 'T', order: 3 },
              ],
              note: 'เปิดด้วยสกิลล่างซองจินอูเจาะโล่ลูดี้ แล้วเร่งเทิร์นด้วยเคลมิสเพื่อปลดอมตะโรซี่',
            },
            isDemo: true,
            message: 'วิเคราะห์ในโหมดตัวอย่าง (ใส่ Gemini API Key ฟรี เพื่อให้ AI วิเคราะห์รูปจริงแบบเรียลไทม์)',
          },
          {
            strategyId: '2-3',
            teamType: 'speed',
            houseNo: 5,
            isFortress: false,
            customName: 'บ้านสปีดแฝดลิง',
            frontCharacters: [
              { index: 0, name: 'พาลานอส' },
              { index: 1, name: 'ซุนหงอคง' },
            ],
            backCharacters: [
              { index: 2, name: 'บรันซ์ & บรันเซล' },
              { index: 3, name: 'แทโอ' },
              { index: 4, name: 'เอซ' },
            ],
            pets: ['ไพค์', 'คารัม', null, null, null],
            explanation:
              'ตรวจพบทีมสปีดกายภาพ หน้า 2 หลัง 3 อาศัยความไวของบรันซ์ & บรันเซล และการสวนกลับของหงอคง/แทโอ',
            recommendedCounter: {
              strategyId: '1-4',
              frontCharacters: [
                { index: 0, name: 'แร็ดกริด', description: 'บล็อคสูง + ยานแม่สะท้อนดาเมจตัดสปีด' },
              ],
              backCharacters: [
                { index: 1, name: 'โรซี่', description: 'ฮีลและคืนชีพอัศวิน' },
                { index: 2, name: 'ลูดี้ awake', description: 'บัฟเกราะป้องกันทีม' },
                { index: 3, name: 'จูริ', description: 'ดาเมจสวนกลับความเสียหาย' },
                { index: 4, name: 'เกลลิดัส', description: 'แช่แข็งหยุดการเคลื่อนไหว' },
              ],
              pets: ['อีรีน', 'วินดี้', null, null, null],
              skillOrder: [
                { charIndex: 0, skillType: 'T', order: 1 },
                { charIndex: 1, skillType: 'B', order: 2 },
                { charIndex: 4, skillType: 'T', order: 3 },
              ],
              note: 'ใช้ทีมถึกสวนกลับรับดาเมจสปีดรอบแรก แล้วใช้เกลลิดัสแช่แข็งเพื่อหยุดสปีด',
            },
            isDemo: true,
            message: 'วิเคราะห์ในโหมดตัวอย่าง (ใส่ Gemini API Key ฟรี เพื่อให้ AI วิเคราะห์รูปจริงแบบเรียลไทม์)',
          },
        ];
        const chosen = demoPresets[Math.floor(Math.random() * demoPresets.length)];
        return res.json({ ok: true, ...chosen });
      }

      if (!imageBase64) {
        return res.status(400).json({ error: 'กรุณาส่งรูปภาพ (imageBase64)' });
      }

      let mimeType = 'image/jpeg';
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        cleanBase64 = parts[1];
      }

      let characterNames = [];
      let petNames = [];
      try {
        const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        characterNames = (cat.characters || []).map((c) => c.name);
        petNames = (cat.pets || []).map((p) => p.name);
      } catch (e) {
        // ignore
      }

      const prompt = `You are an expert Seven Knights Re:BIRTH (7K Re:BIRTH) mobile game assistant.
Analyze this in-game screenshot. The screenshot depicts a Seven Knights battle preparation, defense team, target house, or formation.

TASK:
1. Detect the 5 heroes forming the team and their exact positions.
2. Match character names strictly to this list of known Seven Knights characters:
${characterNames.slice(0, 140).join(', ')}
(If awakened form, append 'awake' like 'ลูดี้ awake' if applicable).
3. Identify formation StrategyId: "1-4", "2-3", "3-2", or "4-1".
   - "1-4": slot 0 is Front; slots 1, 2, 3, 4 are Back.
   - "2-3": slots 0, 1 are Front; slots 2, 3, 4 are Back.
   - "3-2": slots 0, 1, 2 are Front; slots 3, 4 are Back.
   - "4-1": slots 0, 1, 2, 3 are Front; slot 4 is Back.
4. Detect TeamType: "tanky" | "speed" | "magic" | "physical" | "hybrid"
5. Detect any visible pets from: ${petNames.slice(0, 40).join(', ')}
6. If any house number (e.g. 1-30) or fortress flag is visible or indicated, extract it.
7. Recommend an effective counter team against this detected team with 5 counter heroes, formation, skill order, and tactical advice note in Thai.

Return ONLY pure valid JSON in this exact structure:
{
  "strategyId": "1-4",
  "teamType": "tanky",
  "houseNo": 1,
  "isFortress": true,
  "customName": "ป้อมหัวกิลด์",
  "frontCharacters": [{ "index": 0, "name": "ลูดี้ awake" }],
  "backCharacters": [
    { "index": 1, "name": "โรซี่" },
    { "index": 2, "name": "เกลลิดัส" }
  ],
  "pets": ["อีรีน", null, null, null, null],
  "explanation": "วิเคราะห์ทีมที่พบในรูป...",
  "recommendedCounter": {
    "strategyId": "1-4",
    "frontCharacters": [{ "index": 0, "name": "พาลานอส", "description": "บล็อค 100% ยืนค้ำ" }],
    "backCharacters": [
      { "index": 1, "name": "ซองจินอู", "description": "เจาะเกราะทีมถึก" }
    ],
    "pets": ["คารัม", null, null, null, null],
    "skillOrder": [{ "charIndex": 1, "skillType": "B", "order": 1 }],
    "note": "เทคนิคการตีทีมนี้..."
  }
}`;

      // Dynamically discover which models are enabled for this specific API key
      let candidateModels = [
        'gemini-2.0-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-8b',
        'gemini-1.5-flash',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro',
        'gemini-2.5-pro',
      ];

      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { headers: { 'x-goog-api-key': apiKey } }
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const dynamicList = (listData.models || [])
            .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map((m) => m.name.replace(/^models\//, ''));

          if (dynamicList.length > 0) {
            console.log('[AI Vision] Models discovered from API key:', dynamicList);
            const preferred = [
              'gemini-2.0-flash',
              'gemini-2.5-flash',
              'gemini-2.0-flash-lite',
              'gemini-1.5-flash-latest',
              'gemini-1.5-flash-8b',
              'gemini-1.5-flash',
              'gemini-1.5-pro-latest',
              'gemini-1.5-pro',
              'gemini-2.5-pro',
            ];
            dynamicList.sort((a, b) => {
              const idxA = preferred.indexOf(a);
              const idxB = preferred.indexOf(b);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return 0;
            });
            candidateModels = dynamicList;
          }
        } else {
          const listErr = await listRes.json().catch(() => ({}));
          console.warn('[AI Vision] ListModels check error:', listErr);
          if (listErr.error?.message?.includes('API key not valid')) {
            return res.status(400).json({
              error: 'API Key ไม่ถูกต้อง กรุณาตรวจสอบหรือสร้าง API Key ใหม่จาก Google AI Studio (https://aistudio.google.com)',
            });
          }
        }
      } catch (err) {
        console.warn('[AI Vision] ListModels check network error:', err.message);
      }

      let lastError = null;
      let resultJson = null;

      for (const model of candidateModels) {
        for (const apiVer of ['v1beta', 'v1']) {
          try {
            const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inline_data: {
                          mime_type: mimeType,
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.2,
                  response_mime_type: 'application/json',
                },
              }),
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              lastError = errData.error?.message || response.statusText;
              console.warn(`[AI Vision] ${apiVer} / ${model} error:`, lastError);
              continue;
            }

            const geminiData = await response.json();
            const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText) {
              const cleanText = candidateText
                .replace(/^```json\s*/i, '')
                .replace(/```\s*$/, '')
                .trim();
              try {
                resultJson = JSON.parse(cleanText);
              } catch {
                const match = cleanText.match(/\{[\s\S]*\}/);
                if (match) resultJson = JSON.parse(match[0]);
              }
              if (resultJson) {
                console.log(`[AI Vision] Success using model ${model} (${apiVer})`);
                break;
              }
            }
          } catch (err) {
            lastError = err.message;
            console.warn(`[AI Vision] Exception on ${apiVer}/${model}:`, err.message);
          }
        }
        if (resultJson) break;
      }

      if (!resultJson) {
        return res.status(502).json({
          error: `Gemini API ไม่สามารถวิเคราะห์รูปได้: ${lastError || 'โปรดตรวจสอบ API Key หรือความชัดเจนของรูปภาพ'}`,
        });
      }

      return res.json({
        ok: true,
        ...resultJson,
        isDemo: false,
      });
    } catch (err) {
      console.error('Error in /api/ai/scan-team:', err);
      res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ' });
    }
  });

  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.RAILWAY_ENVIRONMENT);
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`7K Re:BIRTH GVG Server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
