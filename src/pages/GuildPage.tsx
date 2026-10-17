import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Share2,
  Lock,
  Unlock,
  KeyRound,
  ArrowLeft,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Shield,
  Swords,
  Eye,
  Check,
  Copy,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  X,
} from 'lucide-react';
import type {
  GuildData,
  GuildCombo,
  EnemyTeam,
  CounterTeam,
  TeamType,
} from '../types';
import {
  TEAM_TYPES,
  getTeamTypeMeta,
  getStrategyConfig,
  getEquipRingInfo,
  getEquipSetInfo,
  matchesTeamQuery,
} from '../lib/catalog';
import {
  fetchGuild,
  getAdminKey,
  setAdminKey,
  getViewerKey,
  setViewerKey,
  verifyAdminKey,
  verifyViewerKey,
  updateAdminPassword,
  updateViewerLock,
  createComboApi,
  updateComboApi,
  deleteComboApi,
  deleteGuildApi,
  saveRecentGuild,
  removeRecentGuild,
} from '../lib/api';
import { TeamFormationView } from '../components/TeamFormationView';
import { TeamBuilderModal } from '../components/TeamBuilderModal';
import { CounterDetailModal } from '../components/CounterDetailModal';

export const GuildPage: React.FC = () => {
  const { shortId = '' } = useParams<{ shortId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [guild, setGuild] = useState<GuildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState<'ok' | 'viewer_locked' | 'not_found' | 'error'>(
    'ok'
  );
  const [lockedGuildName, setLockedGuildName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TeamType>('all');

  // Selected Combo Detail View
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);

  // Modals state
  const [builderModal, setBuilderModal] = useState<{
    mode: 'enemy' | 'counter';
    comboId?: string;
    initialEnemy?: EnemyTeam;
    initialCounter?: CounterTeam;
  } | null>(null);

  const [detailCounter, setDetailCounter] = useState<{
    team: CounterTeam;
    index: number;
  } | null>(null);

  // Admin & Viewer Security Modals
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminInputKey, setAdminInputKey] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [newAdminPass, setNewAdminPass] = useState('');

  const [showViewerLockModal, setShowViewerLockModal] = useState(false);
  const [viewerLockEnabled, setViewerLockEnabled] = useState(false);
  const [viewerLockPass, setViewerLockPass] = useState('');

  const [viewerUnlockInput, setViewerUnlockInput] = useState('');
  const [viewerUnlockError, setViewerUnlockError] = useState('');

  // Toast message
  const [toast, setToast] = useState<string | null>(null);

  // Theme state
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  const loadGuildData = useCallback(async () => {
    if (!shortId) return;
    setLoading(true);
    try {
      const res = await fetchGuild(shortId);
      if (res.status === 'not_found') {
        setPageStatus('not_found');
        setGuild(null);
      } else if (res.status === 'viewer_locked') {
        setPageStatus('viewer_locked');
        setLockedGuildName(res.lockedName || shortId);
        setGuild(null);
      } else if (res.status === 'ok' && res.data) {
        setPageStatus('ok');
        setGuild(res.data);
        setViewerLockEnabled(Boolean(res.data.viewer_locked));
        setViewerLockPass(res.data.viewer_key || '');
        saveRecentGuild({
          short_id: res.data.short_id,
          name: res.data.name,
          is_admin: res.data.is_admin,
        });
      }
    } catch (err: any) {
      setPageStatus('error');
      setErrorMsg(err?.message || 'ไม่สามารถโหลดข้อมูลโพยกิลด์ได้');
    } finally {
      setLoading(false);
    }
  }, [shortId]);

  useEffect(() => {
    loadGuildData();
  }, [loadGuildData]);

  useEffect(() => {
    if (searchParams.get('setup') === '1' && guild?.is_admin) {
      setShowSetupModal(true);
      setNewAdminPass(getAdminKey(shortId));
      const next = new URLSearchParams(searchParams);
      next.delete('setup');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, guild, shortId, setSearchParams]);

  const isAdmin = Boolean(guild?.is_admin);

  const selectedCombo = useMemo(
    () => (guild?.combos || []).find((c) => c.id === selectedComboId) || null,
    [guild, selectedComboId]
  );

  const filteredCombos = useMemo(() => {
    if (!guild?.combos) return [];
    return guild.combos.filter((combo) => {
      if (typeFilter !== 'all' && combo.enemyTeam.teamType !== typeFilter) {
        return false;
      }
      return matchesTeamQuery(combo.enemyTeam, searchQuery);
    });
  }, [guild, typeFilter, searchQuery]);

  // Handlers for Admin & Viewer Auth
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    const clean = adminInputKey.trim();
    if (!clean) return;
    const valid = await verifyAdminKey(shortId, clean);
    if (!valid) {
      setAdminAuthError('รหัสผู้ดูแลไม่ถูกต้อง');
      return;
    }
    setAdminKey(shortId, clean);
    setShowAdminLoginModal(false);
    setAdminInputKey('');
    showToast('เข้าสู่โหมดผู้ดูแลกิลด์เรียบร้อยแล้ว');
    await loadGuildData();
  };

  const handleAdminLogout = () => {
    setAdminKey(shortId, '');
    showToast('ออกจากโหมดผู้ดูแลแล้ว');
    loadGuildData();
  };

  const handleViewerUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setViewerUnlockError('');
    const clean = viewerUnlockInput.trim();
    if (!clean) return;
    // Check if it's viewer key or admin key
    const validViewer = await verifyViewerKey(shortId, clean);
    if (!validViewer) {
      setViewerUnlockError('รหัสดูโพยไม่ถูกต้อง');
      return;
    }
    const validAdmin = await verifyAdminKey(shortId, clean);
    if (validAdmin) {
      setAdminKey(shortId, clean);
    }
    setViewerKey(shortId, clean);
    setViewerUnlockInput('');
    await loadGuildData();
  };

  const handleSaveAdminPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminPass.trim();
    if (clean.length < 4) {
      alert('รหัสผู้ดูแลต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }
    try {
      const currentKey = getAdminKey(shortId);
      await updateAdminPassword(shortId, currentKey, clean);
      setAdminKey(shortId, clean);
      setShowSetupModal(false);
      showToast('บันทึกรหัสผู้ดูแลกิลด์เรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleSaveViewerLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewerLockEnabled && !viewerLockPass.trim()) {
      alert('กรุณาตั้งรหัสผ่านสำหรับดูโพยก่อนเปิดใช้งานการล็อก');
      return;
    }
    try {
      const currentKey = getAdminKey(shortId);
      const res = await updateViewerLock(
        shortId,
        currentKey,
        viewerLockEnabled,
        viewerLockPass.trim()
      );
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              viewer_locked: res.viewer_locked,
              viewer_key: res.viewer_key,
            }
          : prev
      );
      setShowViewerLockModal(false);
      showToast(
        res.viewer_locked ? 'เปิดล็อกรหัสดูโพยกิลด์แล้ว' : 'ปิดล็อกรหัสดูโพยกิลด์แล้ว'
      );
    } catch (err: any) {
      alert(err?.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    }
  };

  // Combo CRUD Handlers
  const handleSaveEnemyTeam = async (enemyTeam: EnemyTeam) => {
    if (!guild) return;
    if (builderModal?.comboId) {
      // Edit existing enemy team
      const updated = await updateComboApi(shortId, builderModal.comboId, { enemyTeam });
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              combos: prev.combos.map((c) => (c.id === updated.id ? updated : c)),
            }
          : prev
      );
      showToast('อัปเดตข้อมูลทีมเป้าหมายแล้ว');
    } else {
      // Create new enemy team
      const created = await createComboApi(shortId, enemyTeam, []);
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              combos: [created, ...prev.combos],
            }
          : prev
      );
      setSelectedComboId(created.id);
      showToast('เพิ่มทีมที่ต้องการตีเรียบร้อยแล้ว');
    }
  };

  const handleDeleteCombo = async (comboId: string) => {
    if (!window.confirm('ยืนยันการลบทีมเป้าหมายนี้และทีมแก้ทางทั้งหมดในหัวข้อนี้?')) return;
    try {
      await deleteComboApi(shortId, comboId);
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              combos: prev.combos.filter((c) => c.id !== comboId),
            }
          : prev
      );
      if (selectedComboId === comboId) {
        setSelectedComboId(null);
      }
      showToast('ลบทีมเป้าหมายเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err?.message || 'ลบทีมไม่สำเร็จ');
    }
  };

  const handleSaveCounterTeam = async (counterTeam: CounterTeam) => {
    if (!selectedCombo) return;
    const existingList = [...(selectedCombo.counterTeams || [])];
    const idx = existingList.findIndex((ct) => ct.id === counterTeam.id);
    if (idx !== -1) {
      existingList[idx] = counterTeam;
    } else {
      existingList.push({
        ...counterTeam,
        order: existingList.length,
      });
    }
    const updated = await updateComboApi(shortId, selectedCombo.id, {
      counterTeams: existingList,
    });
    setGuild((prev) =>
      prev
        ? {
            ...prev,
            combos: prev.combos.map((c) => (c.id === updated.id ? updated : c)),
          }
        : prev
    );
    showToast('บันทึกข้อมูลทีมแก้ทางเรียบร้อยแล้ว');
  };

  const handleDeleteCounterTeam = async (counterId: string) => {
    if (!selectedCombo) return;
    if (!window.confirm('ยืนยันการลบทีมแก้ทางนี้?')) return;
    const nextList = (selectedCombo.counterTeams || [])
      .filter((ct) => ct.id !== counterId)
      .map((ct, idx) => ({ ...ct, order: idx }));
    const updated = await updateComboApi(shortId, selectedCombo.id, {
      counterTeams: nextList,
    });
    setGuild((prev) =>
      prev
        ? {
            ...prev,
            combos: prev.combos.map((c) => (c.id === updated.id ? updated : c)),
          }
        : prev
    );
    showToast('ลบทีมแก้ทางแล้ว');
  };

  const handleMoveCounterTeam = async (index: number, direction: -1 | 1) => {
    if (!selectedCombo) return;
    const list = [...(selectedCombo.counterTeams || [])].sort((a, b) => a.order - b.order);
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const normalized = list.map((item, idx) => ({ ...item, order: idx }));
    const updated = await updateComboApi(shortId, selectedCombo.id, {
      counterTeams: normalized,
    });
    setGuild((prev) =>
      prev
        ? {
            ...prev,
            combos: prev.combos.map((c) => (c.id === updated.id ? updated : c)),
          }
        : prev
    );
  };

  const handleDeleteEntireGuild = async () => {
    if (
      !window.confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบโพยกิลด์ "${guild?.name}" อย่างถาวร? ข้อมูลทั้งหมดจะไม่สามารถกู้คืนได้`
      )
    )
      return;
    try {
      await deleteGuildApi(shortId);
      removeRecentGuild(shortId);
      navigate('/');
    } catch (err: any) {
      alert(err?.message || 'ลบโพยกิลด์ไม่สำเร็จ');
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/g/${shortId}`;
    navigator.clipboard.writeText(url);
    showToast('คัดลอกลิงก์โพยกิลด์แล้ว ส่งให้สมาชิกในกิลด์ได้เลย!');
  };

  // Render Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-slate-400">กำลังโหลดโพยกิลด์...</p>
        </div>
      </div>
    );
  }

  // Render Not Found
  if (pageStatus === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-white">ไม่พบโพยกิลด์นี้</h2>
          <p className="text-xs text-slate-400">
            รหัสกิลด์ <code className="text-amber-400">{shortId}</code> อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>
      </div>
    );
  }

  // Render Viewer Locked Screen
  if (pageStatus === 'viewer_locked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{lockedGuildName}</h2>
              <p className="text-xs text-slate-400">โพยกิลด์นี้ต้องใช้รหัสผ่านในการเข้าดู</p>
            </div>
          </div>

          {viewerUnlockError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {viewerUnlockError}
            </div>
          )}

          <form onSubmit={handleViewerUnlock} className="space-y-3">
            <input
              type="password"
              value={viewerUnlockInput}
              onChange={(e) => setViewerUnlockInput(e.target.value)}
              placeholder="กรอกรหัสดูโพย หรือ รหัสผู้ดูแลกิลด์..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              ปลดล็อกเข้าดูโพย
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <Link to="/" className="text-xs text-slate-400 hover:text-amber-400">
              ← กลับหน้าแรก 7K Combo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back & Guild Title */}
          <div className="flex items-center gap-3">
            {selectedCombo ? (
              <button
                type="button"
                onClick={() => setSelectedComboId(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors cursor-pointer"
                title="กลับไปหน้ารายการทีมทั้งหมด"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors"
                title="กลับหน้าหลัก"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white truncate max-w-[220px] sm:max-w-md">
                  {guild?.name}
                </h1>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    โหมดผู้ดูแล (Admin)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                    สมาชิก (Viewer)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                รหัสโพย: <code className="text-amber-400/90">{shortId}</code>
                {shortId === 'meta7k' && !isAdmin && (
                  <span className="ml-2 text-amber-300/90">
                    (กดปุ่ม "แอดมิน" มุมขวาบน กรอกรหัส <b>1234</b> เพื่อทดสอบเพิ่ม/แก้ไขทีม)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>แชร์ Link โพย</span>
            </button>

            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowViewerLockModal(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    guild?.viewer_locked
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {guild?.viewer_locked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                  <span>รหัสดูโพย</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewAdminPass(getAdminKey(shortId));
                    setShowSetupModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 cursor-pointer"
                  title="ตั้งค่ารหัสผู้ดูแล"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">รหัสแอดมิน</span>
                </button>

                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                >
                  ออกแอดมิน
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdminLoginModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>แอดมิน</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
              title="สลับโหมดสี"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        {/* VIEW 1: All Enemy Combos Feed */}
        {!selectedCombo ? (
          <>
            {/* Search & Add Team Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาทีมศัตรูจากชื่อตัวละคร, สัตว์เลี้ยง หรือชื่อเล่น (เช่น ลิง, เกล, พาลานอส, คางแหลม, แฝด)..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setBuilderModal({ mode: 'enemy' })}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มทีมที่ต้องการตี</span>
                </button>
              )}
            </div>

            {/* Filter Pills by Team Type */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ทั้งหมด ({guild?.combos?.length || 0})
                </button>
                {TEAM_TYPES.map((tt) => {
                  const count = (guild?.combos || []).filter(
                    (c) => c.enemyTeam.teamType === tt.id
                  ).length;
                  return (
                    <button
                      key={tt.id}
                      type="button"
                      onClick={() => setTypeFilter(tt.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        typeFilter === tt.id
                          ? `${tt.badgeClass} ring-1 ring-current`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tt.label} ({count})
                    </button>
                  );
                })}
              </div>

              <span className="text-xs text-slate-400">
                แสดง {filteredCombos.length} ทีมเป้าหมาย
              </span>
            </div>

            {/* Enemy Team Cards List */}
            {filteredCombos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center space-y-3">
                <Swords className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-base font-bold text-slate-300">
                  {searchQuery || typeFilter !== 'all'
                    ? 'ไม่พบทีมศัตรูที่ตรงกับเงื่อนไขการค้นหา'
                    : 'ยังไม่มีข้อมูลทีมศัตรูในโพยกิลด์นี้'}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isAdmin
                    ? 'กดปุ่ม "เพิ่มทีมที่ต้องการตี" เพื่อเริ่มสร้างรายการทีมป้องกันของศัตรูและเพิ่มทีมแก้ทางสำหรับสมาชิกกิลด์'
                    : 'เข้าสู่โหมดแอดมินกิลด์เพื่อเพิ่มทีมเป้าหมายและทีมแก้ทาง'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredCombos.map((combo) => {
                  const { enemyTeam, counterTeams = [] } = combo;
                  const typeMeta = getTeamTypeMeta(enemyTeam.teamType);
                  const strat = getStrategyConfig(enemyTeam.strategyId);

                  return (
                    <div
                      key={combo.id}
                      onClick={() => setSelectedComboId(combo.id)}
                      className="group rounded-2xl border border-slate-800/90 bg-slate-900/75 hover:bg-slate-900 hover:border-amber-500/50 p-4 sm:p-5 transition-all cursor-pointer shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-rose-400 flex items-center gap-1">
                            <Swords className="w-3.5 h-3.5" />
                            <span>ทีมป้องกันศัตรู</span>
                          </span>
                          {typeMeta && (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeMeta.badgeClass}`}
                            >
                              สาย{typeMeta.label}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-semibold">
                            แผน {strat.id} ({strat.name})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                            <span>ทีมแก้ทาง {counterTeams.length} ทีม</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </span>

                          {isAdmin && (
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setBuilderModal({
                                    mode: 'enemy',
                                    comboId: combo.id,
                                    initialEnemy: combo.enemyTeam,
                                  })
                                }
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                title="แก้ไขทีมศัตรู"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCombo(combo.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white cursor-pointer"
                                title="ลบทีมศัตรู"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Formation Preview */}
                      <TeamFormationView
                        strategyId={enemyTeam.strategyId}
                        frontCharacters={enemyTeam.front?.characters || []}
                        backCharacters={enemyTeam.back?.characters || []}
                        pets={enemyTeam.pets || []}
                        skillOrder={enemyTeam.skillOrder || []}
                        showSkillButtons={Boolean(enemyTeam.skillOrder?.length)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* VIEW 2: Selected Combo Detail (Target Enemy Team + Counter Teams List) */
          <div className="space-y-6">
            {/* Back button bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedComboId(null)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-amber-400 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับไปหน้ารายการทีมศัตรูทั้งหมด</span>
              </button>
            </div>

            {/* Target Enemy Team Card */}
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-extrabold">
                    เป้าหมายที่ต้องการตี (Enemy Team)
                  </span>
                  {getTeamTypeMeta(selectedCombo.enemyTeam.teamType) && (
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        getTeamTypeMeta(selectedCombo.enemyTeam.teamType)!.badgeClass
                      }`}
                    >
                      สาย{getTeamTypeMeta(selectedCombo.enemyTeam.teamType)!.label}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    แผน {selectedCombo.enemyTeam.strategyId} (
                    {getStrategyConfig(selectedCombo.enemyTeam.strategyId).name})
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBuilderModal({
                          mode: 'enemy',
                          comboId: selectedCombo.id,
                          initialEnemy: selectedCombo.enemyTeam,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>แก้ไขทีมเป้าหมาย</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCombo(selectedCombo.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </div>
                )}
              </div>

              <TeamFormationView
                strategyId={selectedCombo.enemyTeam.strategyId}
                frontCharacters={selectedCombo.enemyTeam.front?.characters || []}
                backCharacters={selectedCombo.enemyTeam.back?.characters || []}
                pets={selectedCombo.enemyTeam.pets || []}
                skillOrder={selectedCombo.enemyTeam.skillOrder || []}
                showSkillButtons={true}
              />
            </div>

            {/* Counter Teams Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <span>
                      ทีมที่ใช้ต่อสู้ได้ ({selectedCombo.counterTeams?.length || 0} ทีม)
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    คลิกที่การ์ดทีมแก้ทางเพื่อดูเซ็ตอุปกรณ์ แหวน ออฟชั่นแนะนำ และวิธีเรียงสกิลแบบละเอียด
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      setBuilderModal({
                        mode: 'counter',
                        comboId: selectedCombo.id,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มทีมแก้ทาง</span>
                  </button>
                )}
              </div>

              {!selectedCombo.counterTeams || selectedCombo.counterTeams.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-300">
                    ยังไม่มีทีมแก้ทางสำหรับทีมเป้าหมายนี้
                  </p>
                  {isAdmin && (
                    <p className="text-xs text-slate-500">
                      กดปุ่ม "เพิ่มทีมแก้ทาง" ด้านบนเพื่อแนะนำทีมที่ใช้ตีชนะทีมนี้
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {[...selectedCombo.counterTeams]
                    .sort((a, b) => a.order - b.order)
                    .map((counter, idx, arr) => {
                      const strat = getStrategyConfig(counter.strategyId);
                      const allCounterChars = [
                        ...(counter.front?.characters || []),
                        ...(counter.back?.characters || []),
                      ].sort((a, b) => a.index - b.index);

                      return (
                        <div
                          key={counter.id}
                          onClick={() => setDetailCounter({ team: counter, index: idx })}
                          className="group rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-900 hover:border-amber-500/50 p-4 sm:p-5 space-y-4 transition-all cursor-pointer"
                        >
                          {/* Top Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold">
                                ทีมแก้ทาง #{idx + 1}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-semibold">
                                แผน {strat.id} ({strat.name})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูอุปกรณ์ & วิธีเล่น</span>
                              </span>

                              {isAdmin && (
                                <div
                                  className="flex items-center gap-1 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveCounterTeam(idx, -1)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                                    title="เลื่อนขึ้น"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === arr.length - 1}
                                    onClick={() => handleMoveCounterTeam(idx, 1)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                                    title="เลื่อนลง"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setBuilderModal({
                                        mode: 'counter',
                                        comboId: selectedCombo.id,
                                        initialCounter: counter,
                                      })
                                    }
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                    title="แก้ไขทีมแก้ทาง"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCounterTeam(counter.id)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white cursor-pointer"
                                    title="ลบทีมแก้ทาง"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Formation & Skill Order */}
                          <TeamFormationView
                            strategyId={counter.strategyId}
                            frontCharacters={counter.front?.characters || []}
                            backCharacters={counter.back?.characters || []}
                            pets={counter.pets || []}
                            skillOrder={counter.skillOrder || []}
                            showSkillButtons={true}
                          />

                          {/* Quick Summary of Note & Hero Equipment */}
                          <div className="pt-2 border-t border-slate-800/60 space-y-2">
                            {counter.note && (
                              <div className="flex items-start gap-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                                <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <p className="line-clamp-2">{counter.note}</p>
                              </div>
                            )}

                            {/* Compact Equipment Badges per Hero */}
                            <div className="flex flex-wrap gap-2">
                              {allCounterChars.map((ch) => {
                                const sets = ch.equip?.sets || [];
                                const rings = ch.equip?.rings || [];
                                if (sets.length === 0 && rings.length === 0 && !ch.description) {
                                  return null;
                                }
                                return (
                                  <div
                                    key={ch.index}
                                    className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]"
                                  >
                                    <span className="font-bold text-white">{ch.name}:</span>
                                    {sets.map((s, i) => {
                                      const sInfo = getEquipSetInfo(s);
                                      return (
                                        <span
                                          key={`s-${i}`}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-200"
                                        >
                                          {sInfo?.imageUrl && (
                                            <img
                                              src={sInfo.imageUrl}
                                              alt={s}
                                              className="w-3.5 h-3.5 rounded object-cover"
                                            />
                                          )}
                                          {s}
                                        </span>
                                      );
                                    })}
                                    {rings.map((r, i) => {
                                      const rInfo = getEquipRingInfo(r);
                                      return (
                                        <span
                                          key={`r-${i}`}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                        >
                                          {rInfo?.imageUrl && (
                                            <img
                                              src={rInfo.imageUrl}
                                              alt={r}
                                              className="w-3.5 h-3.5 rounded object-cover"
                                            />
                                          )}
                                          {r}
                                        </span>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer with Delete Guild Option for Admin */}
      {isAdmin && shortId !== 'meta7k' && (
        <footer className="max-w-5xl w-full mx-auto px-4 py-6 border-t border-slate-900 flex justify-end">
          <button
            type="button"
            onClick={handleDeleteEntireGuild}
            className="inline-flex items-center gap-1.5 text-xs text-rose-400/70 hover:text-rose-400 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ลบโพยกิลด์นี้อย่างถาวร</span>
          </button>
        </footer>
      )}

      {/* Modal: Team Builder (Enemy or Counter) */}
      {builderModal && (
        <TeamBuilderModal
          mode={builderModal.mode}
          initialEnemyTeam={builderModal.initialEnemy}
          initialCounterTeam={builderModal.initialCounter}
          onClose={() => setBuilderModal(null)}
          onSaveEnemy={handleSaveEnemyTeam}
          onSaveCounter={handleSaveCounterTeam}
        />
      )}

      {/* Modal: Counter Team Full Detail */}
      {detailCounter && (
        <CounterDetailModal
          counterTeam={detailCounter.team}
          index={detailCounter.index}
          onClose={() => setDetailCounter(null)}
        />
      )}

      {/* Modal: Admin Login */}
      {showAdminLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowAdminLoginModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>เข้าสู่โหมดผู้ดูแลกิลด์ (Admin)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAdminLoginModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shortId === 'meta7k' && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                สำหรับโพยตัวอย่าง รหัสแอดมินคือ <b>1234</b>
              </div>
            )}

            {adminAuthError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {adminAuthError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                type="password"
                value={adminInputKey}
                onChange={(e) => setAdminInputKey(e.target.value)}
                placeholder="กรอกรหัสผู้ดูแลกิลด์..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  ยืนยันรหัสแอดมิน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Setup / Change Admin Password */}
      {showSetupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowSetupModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>ตั้งค่ารหัสผ่านผู้ดูแลกิลด์ (Admin Key)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              รหัสนี้ใช้สำหรับเพิ่ม แก้ไข หรือลบทีมในโพยกิลด์ กรุณาจดจำหรือคัดลอกเก็บไว้สำหรับแอดมินกิลด์
            </p>

            <form onSubmit={handleSaveAdminPass} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  placeholder="ตั้งรหัสแอดมินอย่างน้อย 4 ตัวอักษร..."
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newAdminPass);
                    showToast('คัดลอกรหัสแอดมินแล้ว');
                  }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title="คัดลอกรหัส"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  บันทึกรหัสผู้ดูแล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Viewer Lock Settings */}
      {showViewerLockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowViewerLockModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>ตั้งค่ารหัสผ่านสำหรับสมาชิกดูโพย</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowViewerLockModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              เมื่อเปิดใช้งาน สมาชิกที่เปิดลิงก์จะต้องกรอกรหัสดูโพยก่อนจึงจะเห็นข้อมูลทีม (แต่ไม่สามารถแก้ไขโพยได้)
            </p>

            <form onSubmit={handleSaveViewerLock} className="space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={viewerLockEnabled}
                  onChange={(e) => setViewerLockEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span className="text-xs font-bold text-slate-200">
                  เปิดใช้งานการล็อกรหัสผ่านก่อนดูโพย
                </span>
              </label>

              <div>
                <label className="block text-xs text-slate-400 mb-1">รหัสผ่านสำหรับสมาชิก</label>
                <input
                  type="text"
                  value={viewerLockPass}
                  onChange={(e) => setViewerLockPass(e.target.value)}
                  placeholder="ตั้งรหัสดูโพยสำหรับสมาชิกในกิลด์..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowViewerLockModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
