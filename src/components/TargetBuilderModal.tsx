import React, { useState } from 'react';
import { X, Shield, Plus, Check, Search } from 'lucide-react';
import type { StrategyId, TeamType, TargetHouse, EnemyTeam } from '../types';
import {
  CHARACTERS,
  PETS,
  STRATEGIES,
  TEAM_TYPES,
  CHARACTER_TIERS,
  PET_TIERS,
  getCharacterInfo,
  getPetInfo,
  getStrategyConfig,
  matchesCharacterSearch,
  matchesPetSearch,
} from '../lib/catalog';

interface TargetBuilderModalProps {
  initialTarget?: TargetHouse | null;
  onClose: () => void;
  onSave: (target: Partial<TargetHouse>) => Promise<void>;
}

export const TargetBuilderModal: React.FC<TargetBuilderModalProps> = ({
  initialTarget,
  onClose,
  onSave,
}) => {
  const [houseNo, setHouseNo] = useState<number>(initialTarget?.houseNo || 1);
  const [isFortress, setIsFortress] = useState<boolean>(initialTarget?.isFortress || false);
  const [customName, setCustomName] = useState<string>(initialTarget?.customName || '');
  const [tagsInput, setTagsInput] = useState<string>(
    initialTarget?.tags ? initialTarget.tags.join(', ') : 'กายภาพ'
  );
  const [note, setNote] = useState<string>(initialTarget?.note || '');

  // Team Type & Formation
  const [teamType, setTeamType] = useState<TeamType>(
    initialTarget?.enemyTeam?.teamType || 'physical'
  );
  const [strategyId, setStrategyId] = useState<StrategyId>(
    initialTarget?.enemyTeam?.strategyId || '1-4'
  );

  // Character slots (0..4)
  const [charSlots, setCharSlots] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const c of initialTarget?.enemyTeam?.front?.characters || []) {
      map[c.index] = c.name;
    }
    for (const c of initialTarget?.enemyTeam?.back?.characters || []) {
      map[c.index] = c.name;
    }
    return map;
  });

  const [selectedPet, setSelectedPet] = useState<string | null>(
    initialTarget?.enemyTeam?.pets?.[0] || 'อีรีน'
  );

  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [pickerTab, setPickerTab] = useState<'chars' | 'pets'>('chars');
  const [pickerSearch, setPickerSearch] = useState('');
  const [charTierFilter, setCharTierFilter] = useState('all');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const strategy = getStrategyConfig(strategyId);
  const placedCharCount = Object.keys(charSlots).length;

  const handleSelectChar = (name: string) => {
    setErrorMsg('');
    const existingSlot = Object.entries(charSlots).find(([_, n]) => n === name);
    if (existingSlot) {
      if (Number(existingSlot[0]) === activeSlotIndex) {
        // remove
        setCharSlots((prev) => {
          const next = { ...prev };
          delete next[activeSlotIndex];
          return next;
        });
        return;
      }
      setErrorMsg(`"${name}" อยู่ในทีมแล้ว`);
      return;
    }

    if (!charSlots[activeSlotIndex] && placedCharCount >= 3) {
      setErrorMsg('ทีมตั้งรับใส่ได้สูงสุด 3 ตัวละคร');
      return;
    }

    setCharSlots((prev) => ({
      ...prev,
      [activeSlotIndex]: name,
    }));

    // Auto advance to next empty slot if < 3
    if (placedCharCount + (charSlots[activeSlotIndex] ? 0 : 1) < 3) {
      for (let i = 0; i < 5; i++) {
        const nextIdx = (activeSlotIndex + 1 + i) % 5;
        if (!charSlots[nextIdx] && nextIdx !== activeSlotIndex) {
          setActiveSlotIndex(nextIdx);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (placedCharCount === 0) {
      setErrorMsg('กรุณาเลือกตัวละครอย่างน้อย 1 ตัวในทีมตั้งรับ (สูงสุด 3 ตัว)');
      return;
    }

    const frontChars = strategy.frontIndices
      .filter((idx) => charSlots[idx])
      .map((idx) => ({ index: idx, name: charSlots[idx] }));

    const backChars = strategy.backIndices
      .filter((idx) => charSlots[idx])
      .map((idx) => ({ index: idx, name: charSlots[idx] }));

    const enemyTeam: EnemyTeam = {
      strategyId,
      teamType,
      front: { characters: frontChars },
      back: { characters: backChars },
      pets: [selectedPet, null, null, null, null],
    };

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      await onSave({
        houseNo: Number(houseNo),
        isFortress,
        customName: customName.trim(),
        tags,
        note: note.trim(),
        enemyTeam,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'บันทึกบ้านศัตรูไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const filteredChars = CHARACTERS.filter((c) => {
    if (charTierFilter !== 'all' && c.tier !== charTierFilter) return false;
    return matchesCharacterSearch(c, pickerSearch);
  });

  const filteredPets = PETS.filter((p) => matchesPetSearch(p, pickerSearch));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 sm:p-6 space-y-5 my-8 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialTarget ? 'แก้ไขข้อมูลบ้านศัตรู' : 'เพิ่มบ้านศัตรูใหม่'}
              </h3>
              <p className="text-xs text-slate-400">
                กำหนดหมายเลขบ้าน ชื่อศัตรู และจัดทีมตั้งรับ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* House No & Fortress Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                หมายเลขบ้าน (1–30) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={houseNo}
                onChange={(e) => setHouseNo(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ชื่อผู้เล่นศัตรู / หมายเหตุบ้าน
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="เช่น NightRider, DemonHunter..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={isFortress}
                  onChange={(e) => setIsFortress(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-0"
                />
                <span className="text-xs font-bold text-rose-400">ป้อมปราการ (Fortress)</span>
              </label>
            </div>
          </div>

          {/* Tags & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                แท็กประเภททีม (คั่นด้วยลูกน้ำ ,)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="เช่น แทงก์, กายภาพ, เวท, สปีด"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                จุดควรระวัง / ข้อมูลเพิ่มเติม
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น บล็อค 100%, ระวังใบ้, อัลติแรง"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              แผนการจัดทัพ (Formation)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrategyId(s.id)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    strategyId === s.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Team Type Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              สายของทีม (Team Type)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TEAM_TYPES.map((tt) => (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => setTeamType(tt.id)}
                  className={`py-1.5 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    teamType === tt.id
                      ? `${tt.badgeClass} ring-1 ring-current`
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5 Slot Formation Field */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400">
                จัดตำแหน่งตัวละคร (ใส่ได้ 3 ตัวละคร: คลิกช่องเพื่อเลือก)
              </span>
              <span className="text-slate-400">เลือกแล้ว {placedCharCount}/3 ตัว</span>
            </div>

            <div className="flex items-center justify-center gap-3 py-2">
              {/* Pet Box */}
              <div
                onClick={() => setPickerTab('pets')}
                className={`w-14 h-18 rounded-xl border flex flex-col items-center justify-center p-1 cursor-pointer transition-all ${
                  pickerTab === 'pets'
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {selectedPet && getPetInfo(selectedPet)?.imageUrl ? (
                  <img
                    src={getPetInfo(selectedPet)!.imageUrl}
                    alt={selectedPet}
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">สัตว์เลี้ยง</span>
                )}
                <span className="text-[9px] text-slate-300 truncate w-full text-center mt-1">
                  {selectedPet || 'เลือกสัตว์'}
                </span>
              </div>

              <div className="h-10 w-px bg-slate-800" />

              {/* Front Slots */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-rose-400 uppercase">แถวหน้า</span>
                <div className="flex items-center gap-2">
                  {strategy.frontIndices.map((slotIdx) => {
                    const charName = charSlots[slotIdx];
                    const charInfo = getCharacterInfo(charName);
                    const isActive = activeSlotIndex === slotIdx && pickerTab === 'chars';
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => {
                          setActiveSlotIndex(slotIdx);
                          setPickerTab('chars');
                        }}
                        className={`w-14 h-18 rounded-xl border flex flex-col items-center justify-center p-1 relative transition-all cursor-pointer ${
                          isActive
                            ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50'
                            : charName
                            ? 'border-amber-500/40 bg-slate-900'
                            : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                        }`}
                      >
                        {charInfo?.imageUrl ? (
                          <img
                            src={charInfo.imageUrl}
                            alt={charName}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-slate-600 font-bold text-xs">+</span>
                        )}
                        <span className="text-[9px] text-slate-200 truncate w-full text-center mt-1">
                          {charName || `ช่อง ${slotIdx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Back Slots */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase">แถวหลัง</span>
                <div className="flex items-center gap-2">
                  {strategy.backIndices.map((slotIdx) => {
                    const charName = charSlots[slotIdx];
                    const charInfo = getCharacterInfo(charName);
                    const isActive = activeSlotIndex === slotIdx && pickerTab === 'chars';
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => {
                          setActiveSlotIndex(slotIdx);
                          setPickerTab('chars');
                        }}
                        className={`w-14 h-18 rounded-xl border flex flex-col items-center justify-center p-1 relative transition-all cursor-pointer ${
                          isActive
                            ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50'
                            : charName
                            ? 'border-amber-500/40 bg-slate-900'
                            : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                        }`}
                      >
                        {charInfo?.imageUrl ? (
                          <img
                            src={charInfo.imageUrl}
                            alt={charName}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-slate-600 font-bold text-xs">+</span>
                        )}
                        <span className="text-[9px] text-slate-200 truncate w-full text-center mt-1">
                          {charName || `ช่อง ${slotIdx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Catalog Picker */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerTab('chars')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    pickerTab === 'chars'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  เลือกฮีโร่
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTab('pets')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    pickerTab === 'pets'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  เลือกสัตว์เลี้ยง
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="ค้นหาชื่อตัวละคร..."
                  className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Chars Grid */}
            <div className="max-h-48 overflow-y-auto grid grid-cols-5 sm:grid-cols-7 gap-2 pr-1">
              {pickerTab === 'chars'
                ? filteredChars.map((c) => {
                    const isUsed = Object.values(charSlots).includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleSelectChar(c.name)}
                        className={`flex flex-col items-center p-1 rounded-xl border text-center transition-all cursor-pointer ${
                          isUsed
                            ? 'border-amber-400 bg-amber-500/20'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="text-[9px] font-semibold text-slate-200 truncate w-full mt-1">
                          {c.name}
                        </span>
                      </button>
                    );
                  })
                : filteredPets.map((p) => {
                    const isUsed = selectedPet === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedPet(p.name)}
                        className={`flex flex-col items-center p-1 rounded-xl border text-center transition-all cursor-pointer ${
                          isUsed
                            ? 'border-amber-400 bg-amber-500/20'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="text-[9px] font-semibold text-slate-200 truncate w-full mt-1">
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกบ้านศัตรู'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
