import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Swords,
  Shield,
  Search,
  Share2,
  Plus,
  ArrowRight,
  Lock,
  Sparkles,
  History,
  Trash2,
  KeyRound,
} from 'lucide-react';
import {
  createGuild,
  fetchPublicGuilds,
  getRecentGuilds,
  removeRecentGuild,
  saveRecentGuild,
  setAdminKey,
  type RecentGuild,
} from '../lib/api';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [guildName, setGuildName] = useState('');
  const [customAdminKey, setCustomAdminKey] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [recentGuilds, setRecentGuilds] = useState<RecentGuild[]>([]);
  const [publicGuilds, setPublicGuilds] = useState<
    { short_id: string; name: string; viewer_locked: boolean; combo_count: number }[]
  >([]);

  useEffect(() => {
    setRecentGuilds(getRecentGuilds());
    fetchPublicGuilds()
      .then(setPublicGuilds)
      .catch(() => {});
  }, []);

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guildName.trim();
    if (!trimmed) {
      setError('กรุณาตั้งชื่อกิลด์ของคุณ');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await createGuild(trimmed, customAdminKey.trim() || undefined);
      setAdminKey(res.short_id, res.admin_key);
      saveRecentGuild({
        short_id: res.short_id,
        name: res.name,
        is_admin: true,
      });
      navigate(`/g/${res.short_id}?setup=1`);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถสร้างโพยกิลด์ได้');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500/30">
      {/* Decorative Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-rose-500/10 blur-[130px] rounded-full" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/7k_logo.webp"
              alt="7K Re:BIRTH"
              className="w-10 h-10 rounded-xl object-contain bg-slate-900 p-1 border border-amber-500/30"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  7K <span className="text-amber-400">RE:BIRTH</span>
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  GVG
                </span>
              </div>
              <p className="text-xs text-slate-400">ระบบจัดการโพย Guild War และทีมแก้ทาง</p>
            </div>
          </div>

          <Link
            to="/g/meta7k"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ดูโพย Meta ตัวอย่าง</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 py-10 sm:py-14 space-y-12">
        {/* Hero & Create Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Swords className="w-3.5 h-3.5" />
              <span>Seven Knights Re:BIRTH • Guild War Helper</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              สร้างโพยตี{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                Guild War
              </span>{' '}
              สำหรับกิลด์ของคุณใน 10 วินาที
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              บันทึกทีมป้องกันของศัตรู จัดวางแผนการรบ (1-4, 2-3, 3-2, 4-1) กำหนดลำดับการออกสกิล
              บน/ล่าง เซ็ตอุปกรณ์ และแหวน พร้อมค้นหาด่วนด้วยชื่อตัวละครหรือชื่อเล่น เช่น{' '}
              <span className="text-amber-300 font-semibold">
                ลิง, ป๋าเกล, พาลานอส, คางแหลม, แฝด, ยานแม่
              </span>
            </p>

            {/* Quick Demo Banner */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                    พร้อมใช้งานทันที
                  </span>
                  <span className="text-sm font-bold text-white">
                    7K Re:BIRTH Meta GVG (โพยตัวอย่าง)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  มีทีมตัวอย่างครบทั้งทีมถึก ทีมเวทย์ และทีมสปีดกายภาพ (รหัสแอดมินทดสอบ:{' '}
                  <code className="text-amber-300 font-bold">1234</code>)
                </p>
              </div>
              <Link
                to="/g/meta7k"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all"
              >
                <span>เปิดดูโพยตัวอย่าง</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Create Guild Form Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" />
                  <span>สร้างโพยกิลด์ใหม่</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ไม่ต้องสมัครสมาชิก ได้รับลิงก์เฉพาะกิลด์สำหรับแชร์ให้สมาชิกทันที
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateGuild} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ชื่อกิลด์ของคุณ <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={guildName}
                    onChange={(e) => setGuildName(e.target.value)}
                    placeholder="เช่น SevenKnightsTH, Immortal, กิลด์เทพ..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ตั้งรหัสผู้ดูแล (Admin Password){' '}
                    <span className="text-slate-500 font-normal">(เว้นว่างเพื่อสุ่มอัตโนมัติ)</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customAdminKey}
                      onChange={(e) => setCustomAdminKey(e.target.value)}
                      placeholder="เช่น 1234 หรือรหัสลับสำหรับหัวกิลด์..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>{creating ? 'กำลังสร้างโพยกิลด์...' : 'เริ่มสร้างโพยกิลด์ทันที'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Recent & Public Guilds */}
        {(recentGuilds.length > 0 || publicGuilds.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recently Visited Guilds */}
            {recentGuilds.length > 0 && (
              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>โพยกิลด์ที่คุณเคยเข้าชมล่าสุด</span>
                </h3>
                <div className="space-y-2">
                  {recentGuilds.map((g) => (
                    <div
                      key={g.short_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-amber-500/40 transition-all"
                    >
                      <Link to={`/g/${g.short_id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">{g.name}</span>
                          {g.is_admin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">/g/{g.short_id}</div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/g/${g.short_id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                        >
                          เปิดดู
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            removeRecentGuild(g.short_id);
                            setRecentGuilds(getRecentGuilds());
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          title="ลบออกจากประวัติ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Guilds in Server */}
            {publicGuilds.length > 0 && (
              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>โพยกิลด์ในระบบ ({publicGuilds.length})</span>
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {publicGuilds.map((g) => (
                    <Link
                      key={g.short_id}
                      to={`/g/${g.short_id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-amber-500/40 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">{g.name}</span>
                          {g.viewer_locked && (
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          ทีมศัตรู {g.combo_count} ทีม • รหัสกิลด์: {g.short_id}
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-bold shrink-0">
                        เข้าดูโพย →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">ค้นหาด้วยชื่อเล่น & ประเภททีม</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              พิมพ์ค้นหาทีมศัตรูได้ทันทีทั้งชื่อจริงและชื่อเล่นที่คนไทยคุ้นเคย เช่น ลิง, เกล, ป๋า,
              พาลานอส, คางแหลม, แฝด, ยานแม่ พร้อมตัวกรอง ถึก / เวทย์ / กายภาพ
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">จัดแผน 1-4 ถึง 4-1 & ลำดับสกิล</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              รองรับแผนการรบจริงใน Seven Knights Re:BIRTH กำหนดคิวสกิล บน/ล่าง (1-2-3) เซ็ตอุปกรณ์
              และแหวนครบทั้ง 32 วงในเกม
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">แชร์ลิงก์เดียว & ล็อกรหัสดูโพยได้</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ส่งลิงก์ให้สมาชิกกิลด์เปิดดูผ่านมือถือหรือคอมได้ทันที มีระบบรหัสแอดมินแยกกับรหัสดูโพยป้องกันกิลด์คู่แข่งแอบส่อง
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
