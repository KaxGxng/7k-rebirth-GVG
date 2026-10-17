import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Shield,
  AlertCircle,
  Maximize2,
  Minimize2,
  Upload,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type {
  StrategyId,
  TeamType,
  SkillOrderEntry,
  SkillType,
  TeamCharacterSlot,
  EnemyTeam,
  CounterTeam,
  CatalogCharacter,
} from '../types';
import {
  CHARACTERS,
  PETS,
  EQUIP_SETS,
  EQUIP_RINGS,
  STRATEGIES,
  TEAM_TYPES,
  CHARACTER_TIERS,
  PET_TIERS,
  PATCH_META,
  getCharacterInfo,
  getStrategyConfig,
  matchesCharacterSearch,
  matchesPetSearch,
  matchesEquipSearch,
  registerCustomCharacter,
} from '../lib/catalog';
import { TeamFormationView } from './TeamFormationView';

interface TeamBuilderModalProps {
  mode: 'enemy' | 'counter';
  initialEnemyTeam?: EnemyTeam;
  initialCounterTeam?: CounterTeam;
  onClose: () => void;
  onSaveEnemy?: (team: EnemyTeam) => Promise<void>;
  onSaveCounter?: (team: CounterTeam) => Promise<void>;
}

export const TeamBuilderModal: React.FC<TeamBuilderModalProps> = ({
  mode,
  initialEnemyTeam,
  initialCounterTeam,
  onClose,
  onSaveEnemy,
  onSaveCounter,
}) => {
  const sourceTeam = mode === 'enemy' ? initialEnemyTeam : initialCounterTeam;

  const [strategyId, setStrategyId] = useState<StrategyId>(sourceTeam?.strategyId || '1-4');
  const [teamType, setTeamType] = useState<TeamType>(
    (mode === 'enemy' ? initialEnemyTeam?.teamType : undefined) || 'tanky'
  );

  // Store character slots in a map by slot index (0..4)
  const [charMap, setCharMap] = useState<Record<number, TeamCharacterSlot>>(() => {
    const map: Record<number, TeamCharacterSlot> = {};
    for (const c of sourceTeam?.front?.characters || []) {
      map[c.index] = {
        index: c.index,
        name: c.name,
        description: c.description || '',
        equip: {
          sets: [...(c.equip?.sets || [])],
          rings: [...(c.equip?.rings || [])],
        },
      };
    }
    for (const c of sourceTeam?.back?.characters || []) {
      map[c.index] = {
        index: c.index,
        name: c.name,
        description: c.description || '',
        equip: {
          sets: [...(c.equip?.sets || [])],
          rings: [...(c.equip?.rings || [])],
        },
      };
    }
    return map;
  });

  const [pets, setPets] = useState<(string | null)[]>(() => {
    const arr = Array.from({ length: 5 }, (_, i) => sourceTeam?.pets?.[i] || null);
    return arr;
  });

  const [skillOrder, setSkillOrder] = useState<SkillOrderEntry[]>(() => [
    ...(sourceTeam?.skillOrder || []),
  ]);

  const [note, setNote] = useState<string>(
    mode === 'counter' ? initialCounterTeam?.note || '' : ''
  );

  // Active slot being edited: either a character slot (0..4) or pet slot (0)
  const [activeSlot, setActiveSlot] = useState<{ type: 'char' | 'pet'; index: number }>({
    type: 'char',
    index: 0,
  });

  // Search & tier filter for picker
  const [pickerSearch, setPickerSearch] = useState('');
  const [charTierFilter, setCharTierFilter] = useState('all');
  const [petTierFilter, setPetTierFilter] = useState('all');
  const [expandedCatalog, setExpandedCatalog] = useState(true);
  const [catalogVersion, setCatalogVersion] = useState(0);

  // Custom Character Add/Upload Modal state
  const [showAddCharModal, setShowAddCharModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharTier, setNewCharTier] = useState('ทองบน');
  const [newCharAliases, setNewCharAliases] = useState('');
  const [newCharImageBase64, setNewCharImageBase64] = useState('');
  const [uploadingChar, setUploadingChar] = useState(false);

  // Patch Check & Sync Modal state
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [syncingPatch, setSyncingPatch] = useState(false);
  const [patchInfo, setPatchInfo] = useState<any>(PATCH_META);
  const [patchStatusMsg, setPatchStatusMsg] = useState('');

  // Equipment picker state for counter teams
  const [equipModalSlot, setEquipModalSlot] = useState<{
    charIndex: number;
    tab: 'sets' | 'rings';
  } | null>(null);
  const [equipSearch, setEquipSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const strategy = getStrategyConfig(strategyId);

  const placedChars = useMemo(
    () => Object.values(charMap).sort((a, b) => a.index - b.index),
    [charMap]
  );

  const usedCharNames = useMemo(
    () => new Set(placedChars.map((c) => c.name)),
    [placedChars]
  );

  const frontCharacters = useMemo(
    () =>
      strategy.frontIndices
        .map((idx) => charMap[idx])
        .filter((c): c is TeamCharacterSlot => Boolean(c)),
    [strategy, charMap]
  );

  const backCharacters = useMemo(
    () =>
      strategy.backIndices
        .map((idx) => charMap[idx])
        .filter((c): c is TeamCharacterSlot => Boolean(c)),
    [strategy, charMap]
  );

  const handleSelectCharFromCatalog = (charName: string) => {
    setErrorMsg('');
    const existingEntry = Object.values(charMap).find((c) => c.name === charName);
    if (existingEntry) {
      if (activeSlot.type === 'char' && existingEntry.index === activeSlot.index) {
        handleClearCharSlot(existingEntry.index);
        return;
      }
      setErrorMsg(`"${charName}" อยู่ในทีมแล้ว (ห้ามใส่ตัวละครซ้ำ)`);
      return;
    }

    const targetIndex = activeSlot.type === 'char' ? activeSlot.index : 0;
    const isReplacing = Boolean(charMap[targetIndex]);
    if (!isReplacing && placedChars.length >= 3) {
      setErrorMsg(
        'กิลด์วอร์ใส่ตัวละครได้สูงสุด 3 ตัวละครต่อทีม (คลิกช่องที่มีตัวละครเพื่อเปลี่ยน หรือกดกากบาทเพื่อลบออกก่อน)'
      );
      return;
    }

    setCharMap((prev) => ({
      ...prev,
      [targetIndex]: {
        index: targetIndex,
        name: charName,
        description: prev[targetIndex]?.description || '',
        equip: prev[targetIndex]?.equip || { sets: [], rings: [] },
      },
    }));

    const nextCount = isReplacing ? placedChars.length : placedChars.length + 1;
    if (nextCount < 3) {
      for (let i = 0; i < 5; i++) {
        const candidate = (targetIndex + 1 + i) % 5;
        if (!charMap[candidate] && candidate !== targetIndex) {
          setActiveSlot({ type: 'char', index: candidate });
          break;
        }
      }
    }
  };

  const handleClearCharSlot = (slotIndex: number) => {
    setCharMap((prev) => {
      const next = { ...prev };
      delete next[slotIndex];
      return next;
    });
    setSkillOrder((prev) => {
      const filtered = prev.filter((s) => s.charIndex !== slotIndex);
      return filtered
        .sort((a, b) => a.order - b.order)
        .map((s, idx) => ({ ...s, order: (idx + 1) as 1 | 2 | 3 }));
    });
  };

  const handleSelectPetFromCatalog = (petName: string) => {
    setErrorMsg('');
    setPets((prev) => {
      const next = [...prev];
      next[0] = next[0] === petName ? null : petName;
      return next;
    });
  };

  const handleClearPetSlot = (petIndex: number) => {
    setPets((prev) => {
      const next = [...prev];
      next[petIndex] = null;
      return next;
    });
  };

  const handleToggleSkillOrder = (charIndex: number, skillType: SkillType) => {
    if (!charMap[charIndex]) return;
    setSkillOrder((prev) => {
      const existingIdx = prev.findIndex(
        (s) => s.charIndex === charIndex && s.skillType === skillType
      );
      if (existingIdx !== -1) {
        const remaining = prev.filter((_, idx) => idx !== existingIdx);
        return remaining
          .sort((a, b) => a.order - b.order)
          .map((s, idx) => ({ ...s, order: (idx + 1) as 1 | 2 | 3 }));
      }
      if (prev.length >= 3) {
        setErrorMsg('ตั้งลำดับสกิลได้สูงสุด 3 สกิล (กดซ้ำที่ปุ่มเดิมเพื่อยกเลิกก่อน)');
        return prev;
      }
      const nextOrder = (prev.length + 1) as 1 | 2 | 3;
      return [...prev, { charIndex, skillType, order: nextOrder }];
    });
  };

  const updateHeroDescription = (charIndex: number, desc: string) => {
    setCharMap((prev) => {
      const existing = prev[charIndex];
      if (!existing) return prev;
      return {
        ...prev,
        [charIndex]: {
          ...existing,
          description: desc,
        },
      };
    });
  };

  const toggleHeroSet = (charIndex: number, setName: string) => {
    setCharMap((prev) => {
      const existing = prev[charIndex];
      if (!existing) return prev;
      const curSets = existing.equip?.sets || [];
      if (curSets.includes(setName)) {
        return {
          ...prev,
          [charIndex]: {
            ...existing,
            equip: {
              ...existing.equip,
              sets: curSets.filter((s) => s !== setName),
            },
          },
        };
      }
      if (curSets.length >= 3) return prev;
      return {
        ...prev,
        [charIndex]: {
          ...existing,
          equip: {
            ...existing.equip,
            sets: [...curSets, setName],
          },
        },
      };
    });
  };

  const toggleHeroRing = (charIndex: number, ringName: string) => {
    setCharMap((prev) => {
      const existing = prev[charIndex];
      if (!existing) return prev;
      const curRings = existing.equip?.rings || [];
      if (curRings.includes(ringName)) {
        return {
          ...prev,
          [charIndex]: {
            ...existing,
            equip: {
              ...existing.equip,
              rings: curRings.filter((r) => r !== ringName),
            },
          },
        };
      }
      if (curRings.length >= 3) return prev;
      return {
        ...prev,
        [charIndex]: {
          ...existing,
          equip: {
            ...existing.equip,
            rings: [...curRings, ringName],
          },
        },
      };
    });
  };

  const filteredChars = useMemo(() => {
    void catalogVersion;
    return CHARACTERS.filter((c) => {
      if (charTierFilter !== 'all' && c.tier !== charTierFilter) return false;
      return matchesCharacterSearch(c, pickerSearch);
    });
  }, [charTierFilter, pickerSearch, catalogVersion]);

  // Group characters by tier when showing 'all' so the user sees every tier clearly
  const groupedChars = useMemo(() => {
    const groups: { tierId: string; label: string; items: CatalogCharacter[] }[] = [];
    for (const t of CHARACTER_TIERS) {
      if (t.id === 'all') continue;
      const items = filteredChars.filter((c) => c.tier === t.id);
      if (items.length > 0) {
        groups.push({ tierId: t.id, label: t.label, items });
      }
    }
    return groups;
  }, [filteredChars]);

  const filteredPets = useMemo(() => {
    return PETS.filter((p) => {
      if (petTierFilter !== 'all' && p.tier !== petTierFilter) return false;
      return matchesPetSearch(p, pickerSearch);
    });
  }, [petTierFilter, pickerSearch]);

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewCharImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomChar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    setUploadingChar(true);
    try {
      const res = await fetch('/api/catalog/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCharName.trim(),
          tier: newCharTier,
          aliases: newCharAliases,
          imageBase64: newCharImageBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกตัวละครไม่สำเร็จ');
      registerCustomCharacter(data.character);
      setCatalogVersion((v) => v + 1);
      setShowAddCharModal(false);
      setNewCharName('');
      setNewCharAliases('');
      setNewCharImageBase64('');
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setUploadingChar(false);
    }
  };

  const handleSyncPatch = async () => {
    setSyncingPatch(true);
    setPatchStatusMsg('');
    try {
      const res = await fetch('/api/patch/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'อัปเดตแพตช์ไม่สำเร็จ');
      }
      setPatchInfo((prev: any) => ({
        ...prev,
        lastUpdated: data.lastUpdated,
        syncedAt: new Date().toISOString(),
        totalCharacters: data.totalCharacters,
        awakenedCharactersCount: data.awakenedCount,
        forumArticles: data.forumArticles || prev?.forumArticles || [],
      }));
      setPatchStatusMsg(
        `อัปเดตข้อมูลล่าสุดจากไฟล์เกม (${data.lastUpdated}) และ Netmarble Forum สำเร็จ! (ตัวละครทั้งหมด ${data.totalCharacters} ตัว / Awake ${data.awakenedCount} ตัว • ไม่มีตัวธรรมดาซ้ำ)`
      );
      setCatalogVersion((v) => v + 1);
    } catch (err: any) {
      setPatchStatusMsg(`เกิดข้อผิดพลาด: ${err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์'}`);
    } finally {
      setSyncingPatch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (placedChars.length === 0) {
      setErrorMsg('กรุณาเลือกตัวละครอย่างน้อย 1 ตัวละคร (สูงสุด 3 ตัวละคร)');
      return;
    }
    if (placedChars.length > 3) {
      setErrorMsg('ทีมกิลด์วอร์ใส่ได้สูงสุด 3 ตัวละคร');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'enemy' && onSaveEnemy) {
        const payload: EnemyTeam = {
          strategyId,
          teamType,
          skillOrder,
          front: {
            characters: frontCharacters.map((c) => ({ index: c.index, name: c.name })),
          },
          back: {
            characters: backCharacters.map((c) => ({ index: c.index, name: c.name })),
          },
          pets,
        };
        await onSaveEnemy(payload);
      } else if (mode === 'counter' && onSaveCounter) {
        const payload: CounterTeam = {
          id: initialCounterTeam?.id || `counter-${Date.now()}`,
          order: initialCounterTeam?.order ?? 0,
          strategyId,
          skillOrder,
          front: {
            characters: frontCharacters,
          },
          back: {
            characters: backCharacters,
          },
          pets,
          note: note.trim(),
        };
        await onSaveCounter(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const renderCharCard = (c: CatalogCharacter) => {
    const isUsed = usedCharNames.has(c.name);
    return (
      <button
        key={c.name}
        type="button"
        onClick={() => handleSelectCharFromCatalog(c.name)}
        className={`group flex flex-col items-center p-1.5 rounded-xl border transition-all cursor-pointer ${
          isUsed
            ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/50'
            : 'border-slate-800 bg-slate-900/70 hover:border-amber-500/50 hover:bg-slate-800/80'
        }`}
      >
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-slate-950 mb-1 border border-slate-800">
          {c.imageUrl ? (
            <img
              src={c.imageUrl}
              alt={c.name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-amber-300 px-1 text-center">
              {c.name}
            </div>
          )}
          {isUsed && (
            <div className="absolute inset-0 bg-amber-500/35 flex items-center justify-center">
              <Check className="w-5 h-5 text-white drop-shadow" />
            </div>
          )}
        </div>
        <span className="text-[11px] font-semibold text-slate-100 truncate w-full text-center">
          {c.name}
        </span>
        {c.aliases.length > 0 && (
          <span className="text-[9px] text-amber-400/90 truncate w-full text-center">
            ({c.aliases[0]})
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/95">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {mode === 'enemy'
                ? initialEnemyTeam
                  ? 'แก้ไขทีมเป้าหมาย (ศัตรู)'
                  : 'เพิ่มทีมที่ต้องการตี (ศัตรู)'
                : initialCounterTeam
                ? 'แก้ไขทีมที่ใช้ต่อสู้ (ทีมแก้ทาง)'
                : 'เพิ่มทีมที่ใช้ต่อสู้ (ทีมแก้ทาง)'}
            </h3>
            <p className="text-xs text-slate-400">
              คลิกเลือกช่องตำแหน่ง (สูงสุด 3 ตัวละคร) • กดปุ่ม บน/ล่าง เพื่อเรียงลำดับสกิล 1-2-3
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Controls: Strategy & Team Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Formation Selector */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                รูปแบบแผนการรบ (Formation)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STRATEGIES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStrategyId(st.id)}
                    className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      strategyId === st.id
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold shadow-sm'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-extrabold">{st.id}</div>
                    <div className="text-[10px] opacity-80">{st.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enemy Team Type Selector (only for enemy mode) */}
            {mode === 'enemy' ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  ประเภททีมศัตรู (ใช้กรองค้นหา)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TEAM_TYPES.map((tt) => (
                    <button
                      key={tt.id}
                      type="button"
                      onClick={() => setTeamType(tt.id)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        teamType === tt.id
                          ? `${tt.badgeClass} ring-1 ring-current`
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {tt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  คำแนะนำ / วิธีการเล่น (Note)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น เปิดด้วยสกิลล่างคางแหลม ตามด้วยสกิลบนเคลมิส ระวังติดแช่แข็ง..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>

          {/* Interactive Formation Stage */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400">
                  กำลังเลือก:{' '}
                  {activeSlot.type === 'char'
                    ? `ช่องตัวละครที่ ${activeSlot.index + 1} (${
                        strategy.frontIndices.includes(activeSlot.index) ? 'แถวหน้า F' : 'แถวหลัง B'
                      })`
                    : 'ช่องสัตว์เลี้ยงหลัก'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  ตัวละคร {placedChars.length}/3
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                คลิกที่ช่องตัวละครหรือช่องสัตว์เลี้ยงด้านขวา แล้วเลือกจากรายการด้านล่าง
              </p>
            </div>

            <TeamFormationView
              strategyId={strategyId}
              frontCharacters={frontCharacters}
              backCharacters={backCharacters}
              pets={pets}
              skillOrder={skillOrder}
              showSkillButtons={true}
              interactive={true}
              activeSlot={activeSlot}
              onSelectCharSlot={(idx) => setActiveSlot({ type: 'char', index: idx })}
              onClearCharSlot={handleClearCharSlot}
              onSelectPetSlot={(idx) => setActiveSlot({ type: 'pet', index: idx })}
              onClearPetSlot={handleClearPetSlot}
              onToggleSkillOrder={handleToggleSkillOrder}
            />
          </div>

          {/* Counter Team Per-Hero Equipment & Description Editor */}
          {mode === 'counter' && placedChars.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>ตั้งค่าอุปกรณ์สวมใส่ & ออฟชั่นแนะนำรายตัว (ไม่บังคับ)</span>
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {placedChars.map((slotChar) => {
                  const charInfo = getCharacterInfo(slotChar.name);
                  const sets = slotChar.equip?.sets || [];
                  const rings = slotChar.equip?.rings || [];
                  return (
                    <div
                      key={slotChar.index}
                      className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-3 flex flex-col md:flex-row gap-3 items-start md:items-center"
                    >
                      <div className="flex items-center gap-2.5 min-w-[140px]">
                        {charInfo?.imageUrl && (
                          <img
                            src={charInfo.imageUrl}
                            alt={slotChar.name}
                            className="w-10 h-10 rounded-lg object-cover border border-amber-500/40"
                          />
                        )}
                        <div>
                          <div className="text-xs font-bold text-white">{slotChar.name}</div>
                          <div className="text-[10px] text-slate-400">
                            ช่องที่ {slotChar.index + 1}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={slotChar.description || ''}
                          onChange={(e) => updateHeroDescription(slotChar.index, e.target.value)}
                          placeholder="รายละเอียดออฟชั่น เช่น บล็อค 100% >> ป้องกัน >> เลือด"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEquipSearch('');
                            setEquipModalSlot({ charIndex: slotChar.index, tab: 'sets' });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
                        >
                          เซ็ตอุปกรณ์ ({sets.length}/3)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEquipSearch('');
                            setEquipModalSlot({ charIndex: slotChar.index, tab: 'rings' });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-medium text-amber-300 cursor-pointer"
                        >
                          แหวน ({rings.length}/3)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Character / Pet Catalog Picker */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            {/* Mode Tabs: Character vs Pet + Add Custom Character Button */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlot((prev) =>
                      prev.type === 'char' ? prev : { type: 'char', index: 0 }
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeSlot.type === 'char'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  เลือกตัวละคร ({CHARACTERS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlot({ type: 'pet', index: 0 })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeSlot.type === 'pet'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  เลือกสัตว์เลี้ยง ({PETS.length})
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCharModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer"
                  title="อัปโหลดหรือเพิ่มตัวละครใหม่เข้าระบบ"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่ม/อัปโหลดรูปตัวละคร</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPatchModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold cursor-pointer"
                  title="ตรวจสอบและอัปเดตแพตช์ตัวละครล่าสุดจากไฟล์เกมและ Netmarble Forum"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>เช็คแพตช์ล่าสุด ({patchInfo?.lastUpdated || '2026-04-17'})</span>
                </button>
              </div>

              {/* Search Input & Expand Toggle */}
              <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder={
                      activeSlot.type === 'char'
                        ? 'ค้นหาตัวละคร หรือชื่อเล่น เช่น ลิง, เกล, คางแหลม...'
                        : 'ค้นหาชื่อสัตว์เลี้ยง เช่น อีรีน, ไพค์...'
                    }
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {pickerSearch && (
                    <button
                      type="button"
                      onClick={() => setPickerSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedCatalog((v) => !v)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1 shrink-0 cursor-pointer"
                  title={expandedCatalog ? 'ย่อรายการ' : 'แสดงทั้งหมด'}
                >
                  {expandedCatalog ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ย่อ</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ดูทั้งหมด</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tier Pills */}
            <div className="flex flex-wrap gap-1.5">
              {activeSlot.type === 'char'
                ? CHARACTER_TIERS.map((t) => {
                    const count =
                      t.id === 'all'
                        ? CHARACTERS.length
                        : CHARACTERS.filter((c) => c.tier === t.id).length;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCharTierFilter(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          charTierFilter === t.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {t.label} ({count})
                      </button>
                    );
                  })
                : PET_TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPetTierFilter(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        petTierFilter === t.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
            </div>

            {/* Characters / Pets Display */}
            <div
              className={`${
                expandedCatalog ? 'max-h-[460px]' : 'max-h-60'
              } overflow-y-auto pr-1 pt-1 space-y-4`}
            >
              {activeSlot.type === 'char' ? (
                charTierFilter === 'all' && !pickerSearch ? (
                  groupedChars.map((group) => (
                    <div key={group.tierId} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {group.label} ({group.items.length})
                        </span>
                        <div className="h-px flex-1 bg-slate-800" />
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 gap-2">
                        {group.items.map(renderCharCard)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 gap-2">
                    {filteredChars.map(renderCharCard)}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 gap-2">
                  {filteredPets.map((p) => {
                    const isUsed = pets[0] === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleSelectPetFromCatalog(p.name)}
                        className={`group flex flex-col items-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                          isUsed
                            ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/50'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-slate-950 mb-1">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                          {isUsed && (
                            <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white drop-shadow" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-200 truncate w-full text-center">
                          {p.name}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate w-full text-center">
                          {p.tierLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทีม'}
            </button>
          </div>
        </form>
      </div>

      {/* Sub-Modal: Add / Upload Custom Character Image */}
      {showAddCharModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowAddCharModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>เพิ่มตัวละครใหม่ / อัปเดตรูปตัวละคร</span>
                </h4>
                <p className="text-xs text-slate-400">
                  สามารถเพิ่มตัวละครใหม่พร้อมอัปโหลดรูปภาพเข้าสู่ระบบได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCharModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomChar} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ชื่อตัวละคร <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="เช่น คาร์ม่า awake, แทโอ awake..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ระดับตัวละคร (Tier)
                </label>
                <select
                  value={newCharTier}
                  onChange={(e) => setNewCharTier(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                >
                  {CHARACTER_TIERS.filter((t) => t.id !== 'all').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ชื่อเล่นสำหรับค้นหา (คั่นด้วยลูกน้ำ ,)
                </label>
                <input
                  type="text"
                  value={newCharAliases}
                  onChange={(e) => setNewCharAliases(e.target.value)}
                  placeholder="เช่น ลิง, หงอคง, wukong"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  เลือกรูปภาพตัวละคร (.webp, .png, .jpg)
                </label>
                <div className="flex items-center gap-3">
                  {newCharImageBase64 && (
                    <img
                      src={newCharImageBase64}
                      alt="Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-amber-400"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileSelect}
                    className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCharModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploadingChar}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  {uploadingChar ? 'กำลังบันทึก...' : 'บันทึกตัวละคร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal: Check & Sync Latest Game Patch + Netmarble Forum */}
      {showPatchModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPatchModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-sky-400" />
                  <span>สถานะแพตช์ตัวละครล่าสุด (Game Files & Netmarble Forum)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ซิงค์ข้อมูลจากไฟล์เกม Seven Knights Re:BIRTH และบอร์ดทางการ Netmarble
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPatchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เวอร์ชันไฟล์ข้อมูลเกมล่าสุด:</span>
                <span className="font-bold text-emerald-400">
                  {patchInfo?.lastUpdated || '2026-04-17'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">จำนวนตัวละครในระบบ:</span>
                <span className="font-bold text-white">
                  {CHARACTERS.length} ตัว (Awake{' '}
                  {CHARACTERS.filter((c) => c.tier === 'awake' || c.tier === 'epic awake').length}{' '}
                  ตัว)
                </span>
              </div>
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                • ตัวละครที่มีร่าง Awake แล้ว ระบบจะตัดร่างธรรมดาออกอัตโนมัติ (ไม่มีตัวซ้ำ)
                <br />• ตัด Akaza และ Doma ออกตามเงื่อนไข พร้อมไอคอนการ์ดทางการครบทุกตัว
              </div>
            </div>

            {patchStatusMsg && (
              <div className="rounded-xl bg-sky-500/15 border border-sky-500/30 px-3 py-2 text-xs text-sky-200">
                {patchStatusMsg}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-200">
                  ประกาศและอัปเดตล่าสุดจาก Netmarble Forum (sk_rebirth_gl)
                </h5>
                <a
                  href="https://forum.netmarble.com/sk_rebirth_gl"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>เปิดฟอรั่มทางการ</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(patchInfo?.forumArticles || []).map((art: any) => (
                  <a
                    key={art.id}
                    href={art.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">{art.title}</div>
                      {art.menuName && (
                        <span className="text-[10px] text-amber-400">{art.menuName}</span>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSyncPatch}
                disabled={syncingPatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-xs font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingPatch ? 'animate-spin' : ''}`} />
                <span>
                  {syncingPatch
                    ? 'กำลังดึงข้อมูลไฟล์เกม & Forum...'
                    : 'ซิงค์แพตช์ล่าสุดจากไฟล์เกม & Netmarble'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowPatchModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal for Hero Equipment Sets & Rings */}
      {equipModalSlot && charMap[equipModalSlot.charIndex] && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setEquipModalSlot(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">
                  เลือกอุปกรณ์สวมใส่: {charMap[equipModalSlot.charIndex].name}
                </h4>
                <p className="text-xs text-slate-400">เลือกได้สูงสุดอย่างละ 3 ชิ้น</p>
              </div>
              <button
                type="button"
                onClick={() => setEquipModalSlot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEquipModalSlot({ ...equipModalSlot, tab: 'sets' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  equipModalSlot.tab === 'sets'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                เซ็ตอุปกรณ์ ({charMap[equipModalSlot.charIndex].equip?.sets?.length || 0}/3)
              </button>
              <button
                type="button"
                onClick={() => setEquipModalSlot({ ...equipModalSlot, tab: 'rings' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  equipModalSlot.tab === 'rings'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                แหวน ({charMap[equipModalSlot.charIndex].equip?.rings?.length || 0}/3)
              </button>
              <input
                type="text"
                value={equipSearch}
                onChange={(e) => setEquipSearch(e.target.value)}
                placeholder="ค้นหา เช่น คริ, บล็อค, ตายเกิด, อมตะ..."
                className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-100"
              />
            </div>

            <div className="max-h-64 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
              {equipModalSlot.tab === 'sets'
                ? EQUIP_SETS.filter((s) => matchesEquipSearch(s, equipSearch)).map((s) => {
                    const selected = (
                      charMap[equipModalSlot.charIndex].equip?.sets || []
                    ).includes(s.name);
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => toggleHeroSet(equipModalSlot.charIndex, s.name)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-amber-400 bg-amber-500/20 text-white'
                            : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={s.imageUrl}
                          alt={s.name}
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{s.name}</div>
                          {s.hint && (
                            <div className="text-[10px] text-amber-400 truncate">({s.hint})</div>
                          )}
                        </div>
                      </button>
                    );
                  })
                : EQUIP_RINGS.filter((r) => matchesEquipSearch(r, equipSearch)).map((r) => {
                    const selected = (
                      charMap[equipModalSlot.charIndex].equip?.rings || []
                    ).includes(r.name);
                    return (
                      <button
                        key={r.name}
                        type="button"
                        onClick={() => toggleHeroRing(equipModalSlot.charIndex, r.name)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-amber-400 bg-amber-500/20 text-white'
                            : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{r.name}</div>
                          {r.hint && (
                            <div className="text-[10px] text-amber-400 truncate">({r.hint})</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEquipModalSlot(null)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
