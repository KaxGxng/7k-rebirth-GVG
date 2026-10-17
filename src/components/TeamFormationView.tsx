import React from 'react';
import { Plus, X, PawPrint } from 'lucide-react';
import type {
  StrategyId,
  SkillOrderEntry,
  SkillType,
  TeamCharacterSlot,
} from '../types';
import { getCharacterInfo, getPetInfo, getStrategyConfig } from '../lib/catalog';

interface TeamFormationViewProps {
  strategyId: StrategyId;
  frontCharacters: TeamCharacterSlot[];
  backCharacters: TeamCharacterSlot[];
  pets: (string | null)[];
  skillOrder?: SkillOrderEntry[];
  showSkillButtons?: boolean;
  interactive?: boolean;
  activeSlot?: { type: 'char' | 'pet'; index: number } | null;
  onSelectCharSlot?: (index: number) => void;
  onClearCharSlot?: (index: number) => void;
  onSelectPetSlot?: (index: number) => void;
  onClearPetSlot?: (index: number) => void;
  onToggleSkillOrder?: (charIndex: number, skillType: SkillType) => void;
  compact?: boolean;
}

/**
 * Returns the vertical step offset (in px) for each of the 5 slots in a formation,
 * matching 7K Combo's visual stagger between Front (F) and Back (B) rows.
 */
function getSlotStepOffset(strategyId: StrategyId, slotIndex: number, isCompact: boolean): number {
  const step = isCompact ? 8 : 11;
  switch (strategyId) {
    case '1-4':
      return [0, -1, 0, 0, -1][slotIndex] * step;
    case '2-3':
      return [0, 0, -1, 0, -1][slotIndex] * step;
    case '3-2':
      return [-1, 0, -1, 0, 0][slotIndex] * step;
    case '4-1':
      return [-1, 0, 0, -1, 0][slotIndex] * step;
    default:
      return 0;
  }
}

export const TeamFormationView: React.FC<TeamFormationViewProps> = ({
  strategyId,
  frontCharacters,
  backCharacters,
  pets,
  skillOrder = [],
  showSkillButtons = false,
  interactive = false,
  activeSlot = null,
  onSelectCharSlot,
  onClearCharSlot,
  onSelectPetSlot,
  onClearPetSlot,
  onToggleSkillOrder,
  compact = false,
}) => {
  const strategy = getStrategyConfig(strategyId);
  const charByIndex = new Map<number, TeamCharacterSlot>();
  for (const c of frontCharacters || []) charByIndex.set(c.index, c);
  for (const c of backCharacters || []) charByIndex.set(c.index, c);

  const getSkillBadgeOrder = (charIndex: number, skillType: SkillType): number | undefined => {
    return skillOrder.find((s) => s.charIndex === charIndex && s.skillType === skillType)?.order;
  };

  const renderCharSlot = (slotIndex: number, isFront: boolean) => {
    const slotChar = charByIndex.get(slotIndex);
    const charInfo = slotChar ? getCharacterInfo(slotChar.name) : undefined;
    const isSelected = activeSlot?.type === 'char' && activeSlot.index === slotIndex;
    const offsetPx = getSlotStepOffset(strategyId, slotIndex, compact);

    const topOrder = getSkillBadgeOrder(slotIndex, 'T');
    const bottomOrder = getSkillBadgeOrder(slotIndex, 'B');

    const boxSize = compact
      ? 'w-11 h-11 sm:w-13 sm:h-13'
      : 'w-12 h-12 sm:w-14 sm:h-14';

    return (
      <div
        key={slotIndex}
        style={{ transform: `translateY(${offsetPx}px)` }}
        className="flex flex-col items-center gap-1 transition-transform"
      >
        <div className="relative group">
          <button
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onSelectCharSlot?.(slotIndex)}
            title={slotChar?.name || `ช่องตัวละครที่ ${slotIndex + 1}`}
            className={`relative ${boxSize} rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'ring-2 ring-amber-400 border-amber-400 scale-105 shadow-lg shadow-amber-500/20'
                : isFront
                ? slotChar
                  ? 'border-rose-500/80 bg-rose-950/30 shadow-sm'
                  : 'border-dashed border-rose-500/40 bg-rose-500/5 hover:border-rose-400/70'
                : slotChar
                ? 'border-sky-500/80 bg-sky-950/30 shadow-sm'
                : 'border-dashed border-sky-500/40 bg-sky-500/5 hover:border-sky-400/70'
            } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {slotChar ? (
              charInfo?.imageUrl ? (
                <img
                  src={charInfo.imageUrl}
                  alt={slotChar.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-[10px] font-bold text-center px-1 leading-tight line-clamp-2">
                  {slotChar.name}
                </span>
              )
            ) : interactive ? (
              <Plus className="w-4 h-4 opacity-40" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
            )}

            {/* Equip indicator dot if hero has sets/rings configured */}
            {!interactive &&
              slotChar &&
              ((slotChar.equip?.sets && slotChar.equip.sets.length > 0) ||
                (slotChar.equip?.rings && slotChar.equip.rings.length > 0)) && (
                <span
                  className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-black/60"
                  title="มีการตั้งค่าอุปกรณ์สวมใส่"
                />
              )}
          </button>

          {/* Clear button in interactive mode */}
          {interactive && slotChar && onClearCharSlot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearCharSlot(slotIndex);
              }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow hover:bg-rose-500 z-10 cursor-pointer"
              title="นำตัวละครออก"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Hero short name */}
        <span className="max-w-[54px] sm:max-w-[60px] truncate text-[10px] font-medium text-slate-400 dark:text-slate-400 leading-tight h-3.5">
          {slotChar ? slotChar.name : ''}
        </span>

        {/* Skill Order Buttons (T / B) */}
        {showSkillButtons && (
          <div className="flex flex-col gap-0.5 w-full items-center mt-0.5">
            {(['T', 'B'] as SkillType[]).map((st) => {
              const orderNum = st === 'T' ? topOrder : bottomOrder;
              const isClickable = interactive && Boolean(slotChar);
              return (
                <button
                  key={st}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onToggleSkillOrder?.(slotIndex, st)}
                  className={`relative w-9 sm:w-10 h-4 rounded text-[9px] font-bold flex items-center justify-center border transition-all ${
                    !slotChar
                      ? 'opacity-20 border-slate-700 bg-slate-800/30 text-slate-500 cursor-not-allowed'
                      : orderNum
                      ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                      : interactive
                      ? 'border-slate-600 bg-slate-800/70 text-slate-300 hover:border-amber-400/60 cursor-pointer'
                      : 'border-slate-700/80 bg-slate-800/40 text-slate-500 cursor-default'
                  }`}
                  title={
                    st === 'T'
                      ? `สกิลบน (T)${orderNum ? ` - ลำดับที่ ${orderNum}` : ''}`
                      : `สกิลล่าง (B)${orderNum ? ` - ลำดับที่ ${orderNum}` : ''}`
                  }
                >
                  <span>{st === 'T' ? 'บน' : 'ล่าง'}</span>
                  {orderNum && (
                    <span className="ml-0.5 px-1 rounded-full bg-slate-950 text-amber-400 text-[8px] leading-tight">
                      {orderNum}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Normalize pets array to 5 slots (in GVG usually 1 main pet or up to 5 slots)
  const normalizedPets = Array.from({ length: 5 }, (_, i) => pets?.[i] || null);
  const visiblePetSlots = interactive
    ? [0] // In 7K Re:BIRTH GVG, each team uses 1 Main Pet (index 0)
    : normalizedPets.some((p, i) => i > 0 && p)
    ? [0, 1, 2, 3, 4].filter((i) => i === 0 || Boolean(normalizedPets[i]))
    : [0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-5">
      {/* Formation F & B Columns */}
      <div className="flex items-center gap-2.5 sm:gap-4 py-2">
        {/* Front Group (F) */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {strategy.frontIndices.map((idx) => renderCharSlot(idx, true))}
          </div>
          <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
            F (หน้า)
          </span>
        </div>

        {/* Divider */}
        <div className="h-14 w-px bg-slate-700/50 self-center" />

        {/* Back Group (B) */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {strategy.backIndices.map((idx) => renderCharSlot(idx, false))}
          </div>
          <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
            B (หลัง)
          </span>
        </div>
      </div>

      {/* Pet Slot(s) */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-800/80">
        {visiblePetSlots.map((petIdx) => {
          const petName = normalizedPets[petIdx];
          const petInfo = getPetInfo(petName);
          const isSelected = activeSlot?.type === 'pet' && activeSlot.index === petIdx;
          const isMain = petIdx === 0;
          return (
            <div key={petIdx} className="flex flex-col items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => interactive && onSelectPetSlot?.(petIdx)}
                  title={petName ? `สัตว์เลี้ยง: ${petName}` : 'เลือกสัตว์เลี้ยง'}
                  className={`relative ${
                    isMain
                      ? compact
                        ? 'w-11 h-11 sm:w-12 sm:h-12'
                        : 'w-12 h-12 sm:w-13 sm:h-13'
                      : 'w-9 h-9 sm:w-10 sm:h-10'
                  } rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'ring-2 ring-amber-400 border-amber-400 scale-105 shadow-lg shadow-amber-500/20'
                      : petName
                      ? 'border-amber-500/80 bg-amber-950/30'
                      : 'border-dashed border-amber-500/40 bg-amber-500/5 hover:border-amber-400/70'
                  } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {petName ? (
                    petInfo?.imageUrl ? (
                      <img
                        src={petInfo.imageUrl}
                        alt={petName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[9px] font-bold text-center px-1">{petName}</span>
                    )
                  ) : (
                    <PawPrint className="w-4 h-4 text-amber-400/50" />
                  )}
                </button>
                {interactive && petName && onClearPetSlot && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearPetSlot(petIdx);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow hover:bg-rose-500 z-10 cursor-pointer"
                    title="นำสัตว์เลี้ยงออก"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <span className="max-w-[52px] truncate text-[10px] font-medium text-amber-400/90 leading-tight h-3.5">
                {petName || (isMain ? 'สัตว์เลี้ยง' : '')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
