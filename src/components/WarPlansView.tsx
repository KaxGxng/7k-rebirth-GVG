import React, { useState } from 'react';
import {
  Calendar,
  Swords,
  Plus,
  Star,
  CheckCircle2,
  Trash2,
  Edit3,
  User,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { WarPlan, TargetHouse } from '../types';

interface WarPlansViewProps {
  plans: WarPlan[];
  targets: TargetHouse[];
  isAdmin: boolean;
  onSavePlan: (plan: { memberName: string; slots: any[] }) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
}

export const WarPlansView: React.FC<WarPlansViewProps> = ({
  plans,
  targets,
  isAdmin,
  onSavePlan,
  onDeletePlan,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WarPlan | null>(null);

  const [memberName, setMemberName] = useState('');
  const [slot1Target, setSlot1Target] = useState('');
  const [slot1Note, setSlot1Note] = useState('');
  const [slot1Stars, setSlot1Stars] = useState<0 | 1 | 2 | 3>(0);

  const [slot2Target, setSlot2Target] = useState('');
  const [slot2Note, setSlot2Note] = useState('');
  const [slot2Stars, setSlot2Stars] = useState<0 | 1 | 2 | 3>(0);

  const [slot3Target, setSlot3Target] = useState('');
  const [slot3Note, setSlot3Note] = useState('');
  const [slot3Stars, setSlot3Stars] = useState<0 | 1 | 2 | 3>(0);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openAddModal = (plan?: WarPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setMemberName(plan.memberName);
      setSlot1Target(plan.slots[0]?.targetHouseId || '');
      setSlot1Note(plan.slots[0]?.note || '');
      setSlot1Stars(plan.slots[0]?.starsWon || 0);

      setSlot2Target(plan.slots[1]?.targetHouseId || '');
      setSlot2Note(plan.slots[1]?.note || '');
      setSlot2Stars(plan.slots[1]?.starsWon || 0);

      setSlot3Target(plan.slots[2]?.targetHouseId || '');
      setSlot3Note(plan.slots[2]?.note || '');
      setSlot3Stars(plan.slots[2]?.starsWon || 0);
    } else {
      setEditingPlan(null);
      setMemberName('');
      setSlot1Target('');
      setSlot1Note('');
      setSlot1Stars(0);
      setSlot2Target('');
      setSlot2Note('');
      setSlot2Stars(0);
      setSlot3Target('');
      setSlot3Note('');
      setSlot3Stars(0);
    }
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      setErrorMsg('กรุณาระบุชื่อสมาชิกกิลด์');
      return;
    }
    setSaving(true);
    try {
      const slots = [
        {
          slotNumber: 1,
          targetHouseId: slot1Target || undefined,
          note: slot1Note.trim(),
          starsWon: slot1Stars,
          status: slot1Stars > 0 ? 'success' : 'pending',
        },
        {
          slotNumber: 2,
          targetHouseId: slot2Target || undefined,
          note: slot2Note.trim(),
          starsWon: slot2Stars,
          status: slot2Stars > 0 ? 'success' : 'pending',
        },
        {
          slotNumber: 3,
          targetHouseId: slot3Target || undefined,
          note: slot3Note.trim(),
          starsWon: slot3Stars,
          status: slot3Stars > 0 ? 'success' : 'pending',
        },
      ];
      await onSavePlan({ memberName: memberName.trim(), slots });
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'บันทึกแผนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const getTargetLabel = (targetId?: string) => {
    if (!targetId) return 'ยังไม่ได้เลือกบ้าน';
    const t = targets.find((x) => x.id === targetId);
    if (!t) return 'บ้านที่ไม่ระบุ';
    return t.isFortress
      ? `ป้อมปราการ ${t.houseNo} (${t.customName || 'ป้อมหลัก'})`
      : `บ้านที่ ${t.houseNo} (${t.customName || 'บ้านทั่วไป'})`;
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <span>แผนสงครามกิลด์ (War Plans & Target Assignments)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            วางแผนแบ่งเป้าหมายการตี 3 ไม้ของสมาชิกแต่ละคนในกิลด์วอร์
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAddModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มแผนบุกของฉัน</span>
        </button>
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">ยังไม่มีแผนบุกสำหรับรอบนี้</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            สมาชิกในกิลด์สามารถกดปุ่ม &quot;+ เพิ่มแผนบุกของฉัน&quot; เพื่อจองบ้านที่จะตี 3 ไม้ได้เลย
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const totalStars = plan.slots.reduce((sum, s) => sum + (s.starsWon || 0), 0);
            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{plan.memberName}</h4>
                      <span className="text-[10px] text-slate-400">จองตี 3 ไม้</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-yellow-400 bg-yellow-500/15 px-2.5 py-0.5 rounded-lg border border-yellow-500/30">
                      ⭐ {totalStars} / 9 ดาว
                    </span>

                    <button
                      type="button"
                      onClick={() => openAddModal(plan)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="แก้ไขแผน"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {(isAdmin || true) && (
                      <button
                        type="button"
                        onClick={() => onDeletePlan(plan.id)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        title="ลบแผน"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 Attack Slots */}
                <div className="space-y-2">
                  {plan.slots.map((slot, sIdx) => {
                    const target = targets.find((t) => t.id === slot.targetHouseId);
                    return (
                      <div
                        key={sIdx}
                        className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-extrabold text-amber-400 shrink-0">
                            ไม้ {slot.slotNumber}:
                          </span>
                          <span className="font-medium text-slate-200 truncate">
                            {getTargetLabel(slot.targetHouseId)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {slot.note && (
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded truncate max-w-[120px]">
                              {slot.note}
                            </span>
                          )}
                          <div className="flex items-center text-yellow-400">
                            {[1, 2, 3].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  (slot.starsWon || 0) >= star
                                    ? 'fill-yellow-400'
                                    : 'text-slate-700 fill-none'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Plan Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl my-8 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>{editingPlan ? 'แก้ไขแผนบุกสงคราม' : 'สร้างแผนบุกสงครามของฉัน'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ชื่อสมาชิกในกิลด์ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="เช่น มังกรทมิฬ, Sephiroth..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Slot 1 */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
                <span className="text-xs font-bold text-amber-400">ไม้ที่ 1</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={slot1Target}
                    onChange={(e) => setSlot1Target(e.target.value)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                  >
                    <option value="">-- เลือกบ้านศัตรู --</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.isFortress ? `ป้อม ${t.houseNo}` : `บ้าน ${t.houseNo}`}{' '}
                        {t.customName ? `(${t.customName})` : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    value={slot1Stars}
                    onChange={(e) => setSlot1Stars(Number(e.target.value) as any)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-yellow-400 font-bold"
                  >
                    <option value={0}>0 ดาว (ยังไม่ตี / พลาด)</option>
                    <option value={1}>⭐ 1 ดาว</option>
                    <option value={2}>⭐⭐ 2 ดาว</option>
                    <option value={3}>⭐⭐⭐ 3 ดาว (ชนะสมบูรณ์)</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={slot1Note}
                  onChange={(e) => setSlot1Note(e.target.value)}
                  placeholder="โน้ต เช่น ใช้ทีมสปีดตี, สกิล 1 ปิดฉาก..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-200"
                />
              </div>

              {/* Slot 2 */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
                <span className="text-xs font-bold text-amber-400">ไม้ที่ 2</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={slot2Target}
                    onChange={(e) => setSlot2Target(e.target.value)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                  >
                    <option value="">-- เลือกบ้านศัตรู --</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.isFortress ? `ป้อม ${t.houseNo}` : `บ้าน ${t.houseNo}`}{' '}
                        {t.customName ? `(${t.customName})` : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    value={slot2Stars}
                    onChange={(e) => setSlot2Stars(Number(e.target.value) as any)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-yellow-400 font-bold"
                  >
                    <option value={0}>0 ดาว (ยังไม่ตี / พลาด)</option>
                    <option value={1}>⭐ 1 ดาว</option>
                    <option value={2}>⭐⭐ 2 ดาว</option>
                    <option value={3}>⭐⭐⭐ 3 ดาว (ชนะสมบูรณ์)</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={slot2Note}
                  onChange={(e) => setSlot2Note(e.target.value)}
                  placeholder="โน้ตไม้ 2..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-200"
                />
              </div>

              {/* Slot 3 */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
                <span className="text-xs font-bold text-amber-400">ไม้ที่ 3</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={slot3Target}
                    onChange={(e) => setSlot3Target(e.target.value)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                  >
                    <option value="">-- เลือกบ้านศัตรู --</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.isFortress ? `ป้อม ${t.houseNo}` : `บ้าน ${t.houseNo}`}{' '}
                        {t.customName ? `(${t.customName})` : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    value={slot3Stars}
                    onChange={(e) => setSlot3Stars(Number(e.target.value) as any)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-yellow-400 font-bold"
                  >
                    <option value={0}>0 ดาว (ยังไม่ตี / พลาด)</option>
                    <option value={1}>⭐ 1 ดาว</option>
                    <option value={2}>⭐⭐ 2 ดาว</option>
                    <option value={3}>⭐⭐⭐ 3 ดาว (ชนะสมบูรณ์)</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={slot3Note}
                  onChange={(e) => setSlot3Note(e.target.value)}
                  placeholder="โน้ตไม้ 3..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกแผน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
