import React from 'react';
import { X, Shield, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import type { CounterTeam } from '../types';
import {
  getCharacterInfo,
  getEquipRingInfo,
  getEquipSetInfo,
  getStrategyConfig,
} from '../lib/catalog';
import { TeamFormationView } from './TeamFormationView';

interface CounterDetailModalProps {
  counterTeam: CounterTeam | null;
  index: number;
  onClose: () => void;
}

export const CounterDetailModal: React.FC<CounterDetailModalProps> = ({
  counterTeam,
  index,
  onClose,
}) => {
  if (!counterTeam) return null;

  const strategy = getStrategyConfig(counterTeam.strategyId);
  const allChars = [
    ...(counterTeam.front?.characters || []).map((c) => ({ ...c, row: 'หน้า (F)' })),
    ...(counterTeam.back?.characters || []).map((c) => ({ ...c, row: 'หลัง (B)' })),
  ].sort((a, b) => a.index - b.index);

  const sortedSkills = [...(counterTeam.skillOrder || [])].sort((a, b) => a.order - b.order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
              ทีมแก้ทาง #{index + 1}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">รายละเอียดทีมสู้</h3>
            <span className="text-xs text-slate-400">({strategy.name})</span>
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
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Formation & Skill Order Summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-xs font-semibold text-slate-400 mb-2">
              รูปแบบทีม ({strategy.id} - {strategy.name}) & ลำดับการกดสกิล
            </div>
            <TeamFormationView
              strategyId={counterTeam.strategyId}
              frontCharacters={counterTeam.front?.characters || []}
              backCharacters={counterTeam.back?.characters || []}
              pets={counterTeam.pets || []}
              skillOrder={counterTeam.skillOrder || []}
              showSkillButtons={true}
            />

            {/* Skill Sequence Flow */}
            {sortedSkills.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-amber-400 mr-1">ลำดับสกิลแนะนำ:</span>
                {sortedSkills.map((sk, idx) => {
                  const slotChar = allChars.find((c) => c.index === sk.charIndex);
                  const charInfo = getCharacterInfo(slotChar?.name);
                  return (
                    <React.Fragment key={`${sk.charIndex}-${sk.skillType}`}>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                          {sk.order}
                        </span>
                        {charInfo?.imageUrl && (
                          <img
                            src={charInfo.imageUrl}
                            alt={slotChar?.name}
                            className="w-5 h-5 rounded-md object-cover"
                          />
                        )}
                        <span className="text-xs font-medium text-slate-200">
                          {slotChar?.name || `ช่อง ${sk.charIndex + 1}`}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            sk.skillType === 'T'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {sk.skillType === 'T' ? 'สกิลบน' : 'สกิลล่าง'}
                        </span>
                      </div>
                      {idx < sortedSkills.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Play Guide / Note */}
          {counterTeam.note && counterTeam.note.trim() && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm mb-1.5">
                <BookOpen className="w-4 h-4" />
                <span>คำแนะนำ / วิธีการเล่น</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {counterTeam.note}
              </p>
            </div>
          )}

          {/* Per-Hero Equipment & Stat Priority */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>อุปกรณ์สวมใส่และออฟชั่นแนะนำรายตัว</span>
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {allChars.map((slotChar) => {
                const charInfo = getCharacterInfo(slotChar.name);
                const sets = slotChar.equip?.sets || [];
                const rings = slotChar.equip?.rings || [];
                const hasDetails =
                  sets.length > 0 || rings.length > 0 || Boolean(slotChar.description?.trim());

                return (
                  <div
                    key={slotChar.index}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col sm:flex-row gap-3.5 items-start"
                  >
                    {/* Hero Avatar & Position */}
                    <div className="flex items-center gap-3 min-w-[150px]">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500/50 bg-slate-900 shrink-0">
                        {charInfo?.imageUrl ? (
                          <img
                            src={charInfo.imageUrl}
                            alt={slotChar.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                            {slotChar.name}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{slotChar.name}</div>
                        <div className="text-[11px] text-slate-400">
                          แถว{slotChar.row} • ช่องที่ {slotChar.index + 1}
                        </div>
                      </div>
                    </div>

                    {/* Equip & Stat Details */}
                    <div className="flex-1 space-y-2.5 w-full">
                      {slotChar.description?.trim() && (
                        <div className="text-xs bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-amber-200/90">
                          <span className="text-slate-400 font-medium mr-1.5">ออฟชั่น:</span>
                          {slotChar.description}
                        </div>
                      )}

                      {sets.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400 min-w-[52px]">
                            เซ็ตอุปกรณ์:
                          </span>
                          {sets.map((setName, i) => {
                            const setInfo = getEquipSetInfo(setName);
                            return (
                              <div
                                key={`${setName}-${i}`}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-xs"
                              >
                                {setInfo?.imageUrl && (
                                  <img
                                    src={setInfo.imageUrl}
                                    alt={setName}
                                    className="w-5 h-5 rounded object-cover"
                                  />
                                )}
                                <span className="font-medium text-slate-200">{setName}</span>
                                {setInfo?.hint && (
                                  <span className="text-[10px] text-amber-400">
                                    ({setInfo.hint})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {rings.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400 min-w-[52px]">
                            แหวน:
                          </span>
                          {rings.map((ringName, i) => {
                            const ringInfo = getEquipRingInfo(ringName);
                            return (
                              <div
                                key={`${ringName}-${i}`}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/30 text-xs"
                              >
                                {ringInfo?.imageUrl && (
                                  <img
                                    src={ringInfo.imageUrl}
                                    alt={ringName}
                                    className="w-5 h-5 rounded object-cover"
                                  />
                                )}
                                <span className="font-medium text-amber-200">{ringName}</span>
                                {ringInfo?.hint && (
                                  <span className="text-[10px] text-amber-400/80">
                                    ({ringInfo.hint})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!hasDetails && (
                        <div className="text-xs text-slate-500 italic flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>ไม่ได้ระบุเซ็ตอุปกรณ์หรือแหวนเฉพาะเจาะจง</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
