import React, { useState, useMemo } from 'react';
import {
  Shield,
  Swords,
  Star,
  ThumbsUp,
  Plus,
  Search,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Flame,
  Zap,
  Info,
  Calendar,
} from 'lucide-react';
import type { TargetHouse, TargetCounterTeam, EnemyTeam, CounterTeam } from '../types';
import { TeamFormationView } from './TeamFormationView';
import { getCharacterInfo, getPetInfo } from '../lib/catalog';

interface TargetsViewProps {
  targets: TargetHouse[];
  isAdmin: boolean;
  onAddTarget: () => void;
  onEditTarget: (target: TargetHouse) => void;
  onDeleteTarget: (targetId: string) => void;
  onAddCounterToTarget: (target: TargetHouse) => void;
  onViewCounterDetail: (team: CounterTeam, index: number, target: TargetHouse) => void;
  onLikeCounter: (targetId: string, counterId: string) => void;
  onUpdateStars: (targetId: string, stars: 0 | 1 | 2 | 3) => void;
  onAssignMember: (targetId: string, memberName: string) => void;
}

export const TargetsView: React.FC<TargetsViewProps> = ({
  targets,
  isAdmin,
  onAddTarget,
  onEditTarget,
  onDeleteTarget,
  onAddCounterToTarget,
  onViewCounterDetail,
  onLikeCounter,
  onUpdateStars,
  onAssignMember,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'fortress' | 'unattacked' | 'cleared' | 'needs_counter'
  >('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedHouseIds, setExpandedHouseIds] = useState<Set<string>>(new Set());

  // Editing assignee inline
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assigneeInput, setAssigneeInput] = useState('');

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = targets.length;
    const fortresses = targets.filter((t) => t.isFortress);
    const fortressesCleared = fortresses.filter((t) => t.stars >= 1).length;
    const clearedHouses = targets.filter((t) => !t.isFortress && t.stars >= 1).length;
    const totalHouses = targets.filter((t) => !t.isFortress).length;
    const totalStars = targets.reduce((sum, t) => sum + (t.stars || 0), 0);
    const maxStars = total * 3;
    const percentage = maxStars > 0 ? Math.round((totalStars / maxStars) * 100) : 0;

    return {
      total,
      fortressesCleared,
      totalFortresses: fortresses.length,
      clearedHouses,
      totalHouses,
      totalStars,
      maxStars,
      percentage,
    };
  }, [targets]);

  // All unique tags across targets
  const allTags = useMemo(() => {
    const set = new Set<string>();
    targets.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [targets]);

  const toggleExpand = (id: string) => {
    setExpandedHouseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTargets = useMemo(() => {
    return targets
      .filter((t) => {
        // Tag filter
        if (selectedTag !== 'all' && !(t.tags || []).includes(selectedTag)) return false;

        // Type filter
        if (filterType === 'fortress' && !t.isFortress) return false;
        if (filterType === 'unattacked' && t.stars > 0) return false;
        if (filterType === 'cleared' && t.stars === 0) return false;
        if (filterType === 'needs_counter' && (t.counters || []).length > 0) return false;

        // Search text
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        const houseLabel = t.isFortress ? `ป้อมปราการ ${t.houseNo}` : `บ้านที่ ${t.houseNo}`;
        if (houseLabel.toLowerCase().includes(q)) return true;
        if ((t.customName || '').toLowerCase().includes(q)) return true;
        if ((t.note || '').toLowerCase().includes(q)) return true;
        if ((t.assignedTo || '').toLowerCase().includes(q)) return true;
        if ((t.tags || []).some((tag) => tag.toLowerCase().includes(q))) return true;

        // Search in characters
        const enemyChars = [
          ...(t.enemyTeam?.front?.characters || []),
          ...(t.enemyTeam?.back?.characters || []),
        ];
        if (enemyChars.some((c) => c.name.toLowerCase().includes(q))) return true;

        return false;
      })
      .sort((a, b) => {
        // Fortresses first, then by houseNo
        if (a.isFortress && !b.isFortress) return -1;
        if (!a.isFortress && b.isFortress) return 1;
        return a.houseNo - b.houseNo;
      });
  }, [targets, filterType, selectedTag, search]);

  const handleSaveAssignee = (targetId: string) => {
    onAssignMember(targetId, assigneeInput.trim());
    setAssigningId(null);
    setAssigneeInput('');
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Summary Cards (Styled like 7K Note / Premium GVG) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Fortress Progress */}
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 p-4 shadow-lg shadow-rose-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>ป้อมปราการ</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
              {metrics.fortressesCleared} / {metrics.totalFortresses} แตก
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.fortressesCleared}
            </span>
            <span className="text-xs text-slate-400">/ {metrics.totalFortresses} ป้อม</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${
                  metrics.totalFortresses > 0
                    ? (metrics.fortressesCleared / metrics.totalFortresses) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Regular Houses Cleared */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 p-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>บ้านศัตรูที่ตีแตก</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {metrics.clearedHouses} / {metrics.totalHouses} หลัง
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.clearedHouses}
            </span>
            <span className="text-xs text-slate-400">/ {metrics.totalHouses} หลัง</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${
                  metrics.totalHouses > 0 ? (metrics.clearedHouses / metrics.totalHouses) * 100 : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Total Stars Won */}
        <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/40 via-slate-900/90 to-slate-950 p-4 shadow-lg shadow-yellow-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-yellow-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span>ดาวสะสมรวม</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
              {metrics.percentage}%
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.totalStars}
            </span>
            <span className="text-xs text-slate-400">/ {metrics.maxStars} ⭐</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.percentage}%` }}
            />
          </div>
        </div>

        {/* Total Targets Count */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900/90 to-slate-950 p-4 shadow-lg shadow-sky-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Swords className="w-4 h-4" />
              <span>เป้าหมายทั้งหมด</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
              วอร์ปัจจุบัน
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.total}</span>
            <span className="text-xs text-slate-400">เป้าหมายในระบบ</span>
          </div>
          <div className="text-[11px] text-sky-300/80 mt-2.5 truncate">
            {metrics.total - (metrics.clearedHouses + metrics.fortressesCleared)} หลังยังรอการบุก
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3.5 shadow-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาตามเลขบ้าน, ชื่อผู้เล่นศัตรู, ฮีโร่ในทีม, แท็ก..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'fortress', label: 'ป้อมปราการ' },
              { id: 'unattacked', label: 'ยังไม่ตี' },
              { id: 'cleared', label: 'ตีแตกแล้ว' },
              { id: 'needs_counter', label: 'ยังไม่มีทีมแก้' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  filterType === f.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}

            {isAdmin && (
              <button
                type="button"
                onClick={onAddTarget}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer ml-auto md:ml-2"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มบ้านศัตรู</span>
              </button>
            )}
          </div>
        </div>

        {/* Tags bar */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 mr-1">แท็ก:</span>
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                selectedTag === 'all'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Target Houses List */}
      {filteredTargets.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">ไม่พบบ้านศัตรูตามเงื่อนไขที่ค้นหา</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            ลองปรับเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;เพิ่มบ้านศัตรู&quot; เพื่อบันทึกบ้านใหม่ของกิลด์วอร์รอบนี้
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={onAddTarget}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มบ้านศัตรูใหม่</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTargets.map((target) => {
            const isExpanded = expandedHouseIds.has(target.id);
            const isCleared = target.stars >= 1;
            const countersCount = (target.counters || []).length;

            return (
              <div
                key={target.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  target.isFortress
                    ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-slate-900/90 to-slate-950'
                    : isCleared
                    ? 'border-amber-500/30 bg-slate-900/90'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                {/* Header Banner */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Fortress vs House Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                        target.isFortress
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{target.isFortress ? `ป้อมปราการ ${target.houseNo}` : `บ้านที่ ${target.houseNo}`}</span>
                    </span>

                    {/* Custom Player Name */}
                    {target.customName && (
                      <span className="text-sm font-bold text-white tracking-wide">
                        {target.customName}
                      </span>
                    )}

                    {/* Tags */}
                    {(target.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Stars Rating Selector (0 to 3 stars) */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 mr-1.5">ผลตี:</span>
                      {[1, 2, 3].map((starNum) => {
                        const active = (target.stars || 0) >= starNum;
                        return (
                          <button
                            key={starNum}
                            type="button"
                            onClick={() =>
                              onUpdateStars(
                                target.id,
                                (target.stars === starNum ? starNum - 1 : starNum) as any
                              )
                            }
                            className={`p-0.5 rounded hover:scale-110 transition-transform cursor-pointer ${
                              active
                                ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                            title={`ตั้งผลเป็น ${starNum} ดาว (คลิกซ้ำเพื่อลด)`}
                          >
                            <Star
                              className={`w-5 h-5 ${active ? 'fill-yellow-400' : 'fill-none'}`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Assignee / Member Booking */}
                    <div className="flex items-center gap-1.5 text-xs">
                      {assigningId === target.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={assigneeInput}
                            onChange={(e) => setAssigneeInput(e.target.value)}
                            placeholder="ระบุชื่อคนตี..."
                            className="w-28 px-2 py-1 rounded-lg bg-slate-950 border border-amber-400 text-xs text-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveAssignee(target.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                          >
                            ตกลง
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssigningId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningId(target.id);
                            setAssigneeInput(target.assignedTo || '');
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                            target.assignedTo
                              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="คลิกเพื่อระบุคนตีบ้านนี้"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{target.assignedTo ? `คนตี: ${target.assignedTo}` : '+ จองคนตี'}</span>
                        </button>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTarget(target)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="แก้ไขข้อมูลบ้านศัตรู"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTarget(target.id)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="ลบบ้านนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Enemy Formation Display */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    <div className="lg:col-span-5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <Shield className="w-4 h-4" />
                          <span>ทีมตั้งรับของบ้านนี้</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          แผน {target.enemyTeam.strategyId}
                        </span>
                      </div>

                      <TeamFormationView
                        team={target.enemyTeam}
                        type="enemy"
                        compact={false}
                        highlightChar={search}
                      />

                      {target.note && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
                          <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <span>{target.note}</span>
                        </div>
                      )}
                    </div>

                    {/* Counters Summary / Preview */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Swords className="w-4 h-4" />
                            <span>ทีมแก้ที่แนะนำ ({countersCount})</span>
                          </h4>
                          {countersCount > 0 && (
                            <span className="text-[11px] text-slate-400">
                              (มีคนกด 👍 โหวตทีมที่ชนะแล้ว)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAddCounterToTarget(target)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>เพิ่มทีมแก้</span>
                          </button>

                          {countersCount > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(target.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                            >
                              <span>{isExpanded ? 'ย่อ' : 'ดูทั้งหมด'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Counter Teams List */}
                      {countersCount === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center space-y-2 bg-slate-950/40">
                          <p className="text-xs text-slate-400">
                            ยังไม่มีสูตรทีมแก้สำหรับบ้านนี้ คลิกปุ่มด้านบนเพื่อเพิ่มทีมแก้
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {(isExpanded
                            ? target.counters
                            : target.counters.slice(0, 1)
                          ).map((counter, idx) => (
                            <div
                              key={counter.id || idx}
                              className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-slate-700 transition-all space-y-2.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-amber-300">
                                  สูตรแก้ที่ {idx + 1}
                                </span>

                                <div className="flex items-center gap-2">
                                  {/* Thumbs up vote */}
                                  <button
                                    type="button"
                                    onClick={() => onLikeCounter(target.id, counter.id)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer transition-all hover:scale-105"
                                    title="กดโหวตว่าทีมนี้ตีชนะจริง"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    <span>{counter.likes || 0}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onViewCounterDetail(counter, idx, target)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                                  >
                                    ดูออฟชั่น & ลำดับสกิล
                                  </button>
                                </div>
                              </div>

                              <TeamFormationView
                                team={counter}
                                type="counter"
                                compact={true}
                              />

                              {counter.note && (
                                <p className="text-[11px] text-slate-300 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                                  {counter.note}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
