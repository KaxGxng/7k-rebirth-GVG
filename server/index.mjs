import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { syncGamePatchCatalog } from './patchSync.mjs';

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
    return data;
  } catch (err) {
    console.error('Error loading DB, re-initializing seed:', err);
    return createSeedData();
  }
}

function saveDb(db) {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
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
  app.use(express.json({ limit: '5mb' }));

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
  loadDb();

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
    const { enemyTeam, counterTeams } = req.body || {};
    if (!enemyTeam) {
      return res.status(400).json({ error: 'ข้อมูลทีมเป้าหมายไม่ถูกต้อง' });
    }
    const now = new Date().toISOString();
    const newCombo = {
      id: `combo-${crypto.randomUUID().slice(0, 8)}`,
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
    const { enemyTeam, counterTeams } = req.body || {};
    const updated = {
      ...existing,
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
    res.json({ ok: true });
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
    console.log(`7K Re:BIRTH GVG Combo Server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
