import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Edit3, Shield, Megaphone, Check } from 'lucide-react';
import type { GuildSchedule } from '../types';

interface WarScheduleViewProps {
  schedule?: GuildSchedule;
  isAdmin: boolean;
  onUpdateSchedule: (schedule: Partial<GuildSchedule>) => Promise<void>;
}

export const WarScheduleView: React.FC<WarScheduleViewProps> = ({
  schedule,
  isAdmin,
  onUpdateSchedule,
}) => {
  const [editing, setEditing] = useState(false);
  const [warDays, setWarDays] = useState<string[]>(
    schedule?.warDays || ['อังคาร', 'พฤหัสบดี', 'เสาร์']
  );
  const [startTime, setStartTime] = useState(schedule?.warStartTime || '12:00');
  const [endTime, setEndTime] = useState(schedule?.warEndTime || '23:59');
  const [seasonName, setSeasonName] = useState(
    schedule?.currentSeasonName || 'Guild War Season 1 (พรีซีซัน)'
  );
  const [announcement, setAnnouncement] = useState(
    schedule?.announcement ||
      'เป้าหมายวันนี้: ลุยเก็บป้อม 1-3 ให้แตกก่อน 21:00 น. ตีให้ครบคนละ 3 ไม้นะครับ!'
  );
  const [saving, setSaving] = useState(false);

  // Live timer countdown simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const allWeekDays = [
    'จันทร์',
    'อังคาร',
    'พุธ',
    'พฤหัสบดี',
    'ศุกร์',
    'เสาร์',
    'อาทิตย์',
  ];

  const toggleDay = (day: string) => {
    setWarDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateSchedule({
        warDays,
        warStartTime: startTime,
        warEndTime: endTime,
        currentSeasonName: seasonName.trim(),
        announcement: announcement.trim(),
      });
      setEditing(false);
    } catch (err: any) {
      alert(err?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* 1. Season & Countdown Card */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Shield className="w-3.5 h-3.5" />
              <span>{schedule?.currentSeasonName || 'Seven Knights Re:BIRTH War'}</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              รอบสงครามกิลด์ประจำวัน
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              เปิดให้บุกเวลา {schedule?.warStartTime || '12:00'} – {schedule?.warEndTime || '23:59'} น.
            </p>
          </div>

          {/* Countdown Clock */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">เวลานับถอยหลังปิดวอร์</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-wider">
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Announcement Banner */}
      <div className="rounded-2xl border border-sky-500/30 bg-slate-900/80 p-5 space-y-2 shadow-md">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-sky-400 flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span>ประกาศยุทธศาสตร์สงครามกิลด์ (คำสั่งจากแอดมิน)</span>
          </h4>
          {isAdmin && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>แก้ไขประกาศ & ตาราง</span>
            </button>
          )}
        </div>
        <p className="text-sm text-slate-200 font-medium leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
          {schedule?.announcement || 'ยังไม่มีประกาศพิเศษสำหรับรอบนี้'}
        </p>
      </div>

      {/* 3. Weekly War Schedule Days */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>ตารางวันสงครามกิลด์ในแต่ละสัปดาห์</span>
          </h4>
          <span className="text-xs text-slate-400">Seven Knights Re:BIRTH GVG Days</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
          {allWeekDays.map((day) => {
            const isWarDay = (schedule?.warDays || ['อังคาร', 'พฤหัสบดี', 'เสาร์']).includes(
              day
            );
            return (
              <div
                key={day}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isWarDay
                    ? 'border-amber-400 bg-amber-500/15 text-white shadow-sm'
                    : 'border-slate-800/80 bg-slate-950/50 text-slate-500'
                }`}
              >
                <div className="text-xs font-bold">{day}</div>
                <div
                  className={`text-[10px] mt-1 font-semibold ${
                    isWarDay ? 'text-amber-300' : 'text-slate-600'
                  }`}
                >
                  {isWarDay ? '🔥 วันวอร์' : 'พักวอร์'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Schedule Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setEditing(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl my-8 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>แก้ไขตารางสงคราม & ประกาศกิลด์</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ชื่อซีซัน / กิจกรรม
                </label>
                <input
                  type="text"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  วันที่มีสงครามกิลด์ (คลิกเพื่อเลือก/ยกเลิก)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allWeekDays.map((day) => {
                    const selected = warDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    เวลาเริ่มวอร์
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    เวลาสิ้นสุดวอร์
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ข้อความประกาศสงครามถึงสมาชิก
                </label>
                <textarea
                  rows={3}
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
