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
  Calendar,
  Clock,
  Trophy,
  Star,
  Settings,
  Database,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { TeamScreenshotModal } from '../components/TeamScreenshotModal';
import {
  importGuildBackupApi,
  sync7KNoteApi,
  getSupabaseStatus,
  type SupabaseStatus,
} from '../lib/api';
import type {
  GuildData,
  GuildCombo,
  EnemyTeam,
  CounterTeam,
  TeamType,
  TargetHouse,
  WarPlan,
  GuildSchedule,
  TargetCounterTeam,
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
  renameGuildApi,
  createTargetApi,
  updateTargetApi,
  deleteTargetApi,
  likeTargetCounterApi,
  createPlanApi,
  deletePlanApi,
  updateScheduleApi,
} from '../lib/api';
import { TeamFormationView } from '../components/TeamFormationView';
import { TeamBuilderModal } from '../components/TeamBuilderModal';
import { CounterDetailModal } from '../components/CounterDetailModal';
import { TargetBuilderModal } from '../components/TargetBuilderModal';
import { WarPlansView } from '../components/WarPlansView';
import { WarScheduleView } from '../components/WarScheduleView';

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

  // Tab navigation state: 'combos' (default) | 'schedule' | 'settings'
  const rawTab = searchParams.get('tab');
  const currentTab: 'combos' | 'schedule' | 'settings' =
    rawTab === 'schedule' || rawTab === 'settings' ? rawTab : 'combos';

  const setTab = (tab: 'combos' | 'schedule' | 'settings') => {
    setSelectedComboId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };


  // Target House modal state
  const [targetModal, setTargetModal] = useState<{
    open: boolean;
    target?: TargetHouse | null;
  }>({ open: false });

  // Adding counter directly to a target house
  const [targetCounterSlot, setTargetCounterSlot] = useState<TargetHouse | null>(null);

  // Rename Guild Modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  // Modals state
  const [builderModal, setBuilderModal] = useState<{
    mode: 'enemy' | 'counter';
    comboId?: string;
    initialEnemy?: EnemyTeam;
    initialCounter?: CounterTeam;
    initialHouseNo?: number;
    initialIsFortress?: boolean;
    initialCustomName?: string;
  } | null>(null);

  const [detailCounter, setDetailCounter] = useState<{
    team: CounterTeam;
    index: number;
    targetTitle?: string;
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

  // AI Screenshot Scanner Modal state
  const [showAiScanModal, setShowAiScanModal] = useState<boolean>(false);

  // Supabase & 7K-Note Sync state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing7KNote, setIsSyncing7KNote] = useState(false);
  const [showForceResync, setShowForceResync] = useState(false);

  const checkSupabase = useCallback(async () => {
    setCheckingSupabase(true);
    try {
      const status = await getSupabaseStatus();
      setSupabaseStatus(status);
    } catch {
      // ignore
    } finally {
      setCheckingSupabase(false);
    }
  }, []);

  useEffect(() => {
    checkSupabase();
  }, [checkSupabase]);

  const handleSync7KNote = async () => {
    if (!guild || isSyncing7KNote) return;
    const ok = window.confirm(
      'คุณต้องการดึงข้อมูลโพยและสูตรแก้ทาง 37 บ้านจาก 7K-Note (4ZyeEGMZ) เข้าสู่กิลด์นี้ใช่หรือไม่?\n\n' +
      '• บ้านศัตรูทั้ง 37 หลังจะถูกอัปเดตตรงตามเมต้าล่าสุด\n' +
      '• มีการจัดทีม หน้า/หลัง, สัตว์เลี้ยง, ลำดับสกิล, เซ็ตของ, แหวน และสเตตัสครบถ้วน'
    );
    if (!ok) return;

    setIsSyncing7KNote(true);
    try {
      const res = await sync7KNoteApi(shortId, '4ZyeEGMZ', true);
      setGuild((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          targets: res.targets,
          combos: res.combos,
        };
      });
      showToast(`⚡ ซิงค์โพยสำเร็จ ${res.count} หลัง!`);
      checkSupabase();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการซิงค์โพย');
    } finally {
      setIsSyncing7KNote(false);
    }
  };

  // Global paste screenshot listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          setShowAiScanModal(true);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

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

  const hasSyncedData = useMemo(
    () =>
      Boolean(
        guild &&
          ((guild.combos && guild.combos.length > 0) ||
            (guild.targets && guild.targets.length > 0))
      ),
    [guild]
  );

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (combo.houseNo && combo.houseNo.toString().includes(q)) return true;
        if (combo.customName && combo.customName.toLowerCase().includes(q)) return true;
        if (combo.isFortress && (q.includes('ป้อม') || q.includes('fort'))) return true;
        if (matchesTeamQuery(combo.enemyTeam, searchQuery)) return true;
        const matchesCounter = (combo.counterTeams || []).some((ct) =>
          matchesTeamQuery(ct, searchQuery)
        );
        if (matchesCounter) return true;
        return false;
      }
      return true;
    });
  }, [guild, typeFilter, searchQuery]);

  const sortedCombos = useMemo(() => {
    return [...filteredCombos].sort((a, b) => {
      if (a.isFortress && !b.isFortress) return -1;
      if (!a.isFortress && b.isFortress) return 1;
      if (a.isFortress && b.isFortress) {
        return (a.houseNo || 0) - (b.houseNo || 0);
      }
      if (a.houseNo && b.houseNo) {
        return a.houseNo - b.houseNo;
      }
      if (a.houseNo && !b.houseNo) return -1;
      if (!a.houseNo && b.houseNo) return 1;
      return 0;
    });
  }, [filteredCombos]);

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
  const handleSaveEnemyTeam = async (
    enemyTeam: EnemyTeam,
    extra?: { houseNo?: number; isFortress?: boolean; customName?: string }
  ) => {
    if (!guild) return;
    if (builderModal?.comboId) {
      // Edit existing enemy team
      const updated = await updateComboApi(shortId, builderModal.comboId, {
        enemyTeam,
        houseNo: extra?.houseNo,
        isFortress: extra?.isFortress,
        customName: extra?.customName,
      });
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              combos: prev.combos.map((c) => (c.id === updated.id ? updated : c)),
            }
          : prev
      );
      showToast('อัปเดตข้อมูลบ้านกันแล้ว');
    } else {
      // Create new enemy team
      const created = await createComboApi(
        shortId,
        enemyTeam,
        [],
        extra
      );
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              combos: [created, ...prev.combos],
            }
          : prev
      );
      setSelectedComboId(created.id);
      showToast('เพิ่มบ้านกันและสูตรแก้เรียบร้อยแล้ว');
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

  // Direct save combo generated from AI screenshot
  const handleDirectSaveAiCombo = async (payload: {
    houseNo?: number;
    isFortress?: boolean;
    customName?: string;
    enemyTeam: any;
    counterTeams: any[];
  }) => {
    try {
      const created = await createComboApi(
        shortId,
        payload.enemyTeam,
        payload.counterTeams || [],
        {
          houseNo: payload.houseNo,
          isFortress: payload.isFortress,
          customName: payload.customName,
        }
      );
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              combos: [created, ...prev.combos],
            }
          : prev
      );
      setSelectedComboId(created.id);
      showToast('⚡ สร้างโพยจากรูปแคปหน้าจอสำเร็จแล้ว!');
    } catch (err: any) {
      alert(err?.message || 'บันทึกโพยไม่สำเร็จ');
    }
  };

  // Open builder populated with AI scan result
  const handleApplyFromAiScan = (data: any) => {
    const enemyTeam: EnemyTeam = {
      strategyId: data.strategyId || '1-4',
      teamType: data.teamType || 'tanky',
      front: {
        characters: (data.front?.characters || []).map((c: any) => ({
          index: c.index,
          name: c.name,
          description: c.description || '',
        })),
      },
      back: {
        characters: (data.back?.characters || []).map((c: any) => ({
          index: c.index,
          name: c.name,
          description: c.description || '',
        })),
      },
      pets: data.pets || [null, null, null, null, null],
    };

    setBuilderModal({
      mode: 'enemy',
      initialEnemy: enemyTeam,
      initialHouseNo: data.houseNo,
      initialIsFortress: data.isFortress,
      initialCustomName: data.customName,
    });
  };

  // Import Backup JSON file
  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json.combos && !json.targets && !json.schedule) {
        alert('ไฟล์ข้อมูลไม่ถูกต้อง ไม่พบข้อมูลโพยกิลด์');
        return;
      }

      const count = json.combos?.length || 0;
      const doMerge = window.confirm(
        `พบข้อมูลโพย ${count} รายการในไฟล์สำรอง\n\nกด "ตกลง (OK)" เพื่อรวมข้อมูลเข้ากับของเดิม (Merge)\nกด "ยกเลิก (Cancel)" เพื่อแทนที่ของเดิมทั้งหมดด้วยไฟล์นี้ (Replace)`
      );

      const mode = doMerge ? 'merge' : 'replace';
      const updatedGuild = await importGuildBackupApi(shortId, json, mode);
      setGuild(updatedGuild);
      showToast(`กู้คืนข้อมูลโพยเรียบร้อยแล้ว (${mode === 'merge' ? 'รวมข้อมูล' : 'แทนที่ทั้งหมด'})`);
    } catch (err: any) {
      alert(`กู้คืนข้อมูลไม่สำเร็จ: ${err.message || 'ไฟล์เสียหาย'}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveCounterTeam = async (counterTeam: CounterTeam) => {
    if (targetCounterSlot) {
      const existingCounters = targetCounterSlot.counters || [];
      const newCounter: TargetCounterTeam = {
        ...counterTeam,
        likes: 0,
        userLiked: false,
      };
      const nextCounters = [...existingCounters, newCounter];
      try {
        const updated = await updateTargetApi(shortId, targetCounterSlot.id, {
          counters: nextCounters,
        });
        setGuild((prev) =>
          prev
            ? {
                ...prev,
                targets: (prev.targets || []).map((t) => (t.id === updated.id ? updated : t)),
              }
            : prev
        );
        setTargetCounterSlot(null);
        setBuilderModal(null);
        showToast('เพิ่มทีมแก้ในบ้านศัตรูสำเร็จ!');
      } catch (err: any) {
        alert(err?.message || 'เพิ่มทีมแก้ไม่สำเร็จ');
      }
      return;
    }

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

  // Targets Handlers
  const handleSaveTarget = async (targetData: Partial<TargetHouse>) => {
    try {
      if (targetModal.target) {
        const updated = await updateTargetApi(shortId, targetModal.target.id, targetData);
        setGuild((prev) =>
          prev
            ? {
                ...prev,
                targets: (prev.targets || []).map((t) => (t.id === updated.id ? updated : t)),
              }
            : prev
        );
        showToast('อัปเดตบ้านศัตรูสำเร็จ');
      } else {
        const created = await createTargetApi(shortId, targetData);
        setGuild((prev) =>
          prev
            ? {
                ...prev,
                targets: [created, ...(prev.targets || [])],
              }
            : prev
        );
        showToast('เพิ่มบ้านศัตรูสำเร็จ');
      }
      setTargetModal({ open: false });
    } catch (err: any) {
      alert(err?.message || 'บันทึกบ้านศัตรูไม่สำเร็จ');
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!window.confirm('ยืนยันการลบบ้านศัตรูนี้?')) return;
    try {
      await deleteTargetApi(shortId, targetId);
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              targets: (prev.targets || []).filter((t) => t.id !== targetId),
            }
          : prev
      );
      showToast('ลบบ้านศัตรูเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err?.message || 'ลบบ้านศัตรูไม่สำเร็จ');
    }
  };

  const handleLikeTargetCounter = async (targetId: string, counterId: string) => {
    try {
      const res = await likeTargetCounterApi(shortId, targetId, counterId);
      setGuild((prev) => {
        if (!prev) return prev;
        const nextTargets = (prev.targets || []).map((t) => {
          if (t.id !== targetId) return t;
          return {
            ...t,
            counters: (t.counters || []).map((c) =>
              c.id === counterId ? { ...c, likes: res.likes, userLiked: true } : c
            ),
          };
        });
        return { ...prev, targets: nextTargets };
      });
      showToast('กด 👍 โหวตทีมที่ชนะแล้ว!');
    } catch (err: any) {
      alert(err?.message || 'กดไลก์ไม่สำเร็จ');
    }
  };

  const handleUpdateTargetStars = async (targetId: string, stars: 0 | 1 | 2 | 3) => {
    try {
      const status = stars >= 1 ? 'cleared' : 'unattacked';
      const updated = await updateTargetApi(shortId, targetId, { stars, status });
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              targets: (prev.targets || []).map((t) => (t.id === updated.id ? updated : t)),
            }
          : prev
      );
      showToast(`บันทึกผลการตีเป็น ${stars} ดาวเรียบร้อย`);
    } catch (err: any) {
      alert(err?.message || 'อัปเดตดาวไม่สำเร็จ');
    }
  };

  const handleAssignTargetMember = async (targetId: string, memberName: string) => {
    try {
      const updated = await updateTargetApi(shortId, targetId, { assignedTo: memberName });
      setGuild((prev) =>
        prev
          ? {
              ...prev,
              targets: (prev.targets || []).map((t) => (t.id === updated.id ? updated : t)),
            }
          : prev
      );
      showToast(memberName ? `ระบุ ${memberName} เป็นคนตีบ้านนี้แล้ว` : 'ยกเลิกการจองคนตีแล้ว');
    } catch (err: any) {
      alert(err?.message || 'ระบุคนตีไม่สำเร็จ');
    }
  };

  // Plans Handlers
  const handleSavePlan = async (planData: { memberName: string; slots: any[] }) => {
    try {
      const saved = await createPlanApi(shortId, planData);
      setGuild((prev) => {
        if (!prev) return prev;
        const existingPlans = prev.plans || [];
        const idx = existingPlans.findIndex(
          (p) => p.id === saved.id || p.memberName.toLowerCase() === saved.memberName.toLowerCase()
        );
        const nextPlans =
          idx >= 0
            ? existingPlans.map((p, i) => (i === idx ? saved : p))
            : [...existingPlans, saved];
        return { ...prev, plans: nextPlans };
      });
      showToast('บันทึกแผนบุกเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err?.message || 'บันทึกแผนไม่สำเร็จ');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('ยืนยันการลบแผนบุกนี้?')) return;
    try {
      await deletePlanApi(shortId, planId);
      setGuild((prev) =>
        prev ? { ...prev, plans: (prev.plans || []).filter((p) => p.id !== planId) } : prev
      );
      showToast('ลบแผนบุกแล้ว');
    } catch (err: any) {
      alert(err?.message || 'ลบแผนไม่สำเร็จ');
    }
  };

  // Schedule Handler
  const handleUpdateSchedule = async (sched: Partial<GuildSchedule>) => {
    try {
      const updated = await updateScheduleApi(shortId, sched);
      setGuild((prev) => (prev ? { ...prev, schedule: updated } : prev));
      showToast('บันทึกตารางสงครามเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err?.message || 'บันทึกตารางวอร์ไม่สำเร็จ');
    }
  };

  // Guild Rename Handler
  const handleRenameGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameInput.trim()) return;
    try {
      const res = await renameGuildApi(shortId, renameInput.trim());
      setGuild((prev) => (prev ? { ...prev, name: res.name } : prev));
      setShowRenameModal(false);
      showToast('เปลี่ยนชื่อกิลด์เรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err?.message || 'เปลี่ยนชื่อกิลด์ไม่สำเร็จ');
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
              ← กลับหน้าแรก 7K RE:BIRTH GVG
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
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameInput(guild?.name || '');
                      setShowRenameModal(true);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    title="แก้ไขชื่อกิลด์"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
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

      {/* Top Tab Bar (7K Note Style) */}
      <nav className="sticky top-[57px] z-20 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
          <button
            type="button"
            onClick={() => setTab('combos')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'combos'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>โพยสูตรทีมแก้</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                currentTab === 'combos'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {guild?.combos?.length || 0}
            </span>
          </button>


          <button
            type="button"
            onClick={() => setTab('schedule')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'schedule'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>ตารางสงคราม</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>ตั้งค่ากิลด์</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">

        {/* TAB 2: สูตรทีมแก้ (Combos) */}
        {currentTab === 'combos' && (
          !selectedCombo ? (
          <>
            {/* Search & Add Team Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาบ้านกัน (เช่น บ้าน 1, ป้อม 2), ชื่อตัวละคร, สัตว์เลี้ยง หรือชื่อเล่น..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">

                {isAdmin && (
                  <>
                    {!hasSyncedData && (
                      <button
                        type="button"
                        onClick={handleSync7KNote}
                        disabled={isSyncing7KNote}
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs sm:text-sm border border-amber-500/30 cursor-pointer disabled:opacity-50 transition-all"
                        title="ดึงข้อมูลโพยและสูตร 37 บ้านจาก 7K-Note (4ZyeEGMZ)"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isSyncing7KNote ? 'กำลังซิงค์...' : '⚡ ซิงค์ 7K-Note (37 บ้าน)'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setBuilderModal({ mode: 'enemy' })}
                      className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มบ้านกันและสูตรแก้</span>
                    </button>
                  </>
                )}
              </div>
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
                แสดง {sortedCombos.length} บ้าน
              </span>
            </div>

            {/* Combo Matchup Cards List */}
            {sortedCombos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center space-y-3">
                <Swords className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-base font-bold text-slate-300">
                  {searchQuery || typeFilter !== 'all'
                    ? 'ไม่พบบ้านกันหรือสูตรทีมแก้ที่ตรงกับเงื่อนไขการค้นหา'
                    : 'ยังไม่มีข้อมูลบ้านกันหรือโพยสูตรแก้ในกิลด์นี้'}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isAdmin
                    ? 'กดปุ่ม "เพิ่มบ้านกันและสูตรแก้" เพื่อสร้างบ้านตั้งรับของศัตรูพร้อมระบุโพยทีมแก้ทาง'
                    : 'เข้าสู่โหมดแอดมินกิลด์เพื่อเพิ่มบ้านกันและทีมแก้ทาง'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sortedCombos.map((combo) => {
                  const { enemyTeam, counterTeams = [] } = combo;
                  const firstCounter = counterTeams[0];
                  const typeMeta = getTeamTypeMeta(enemyTeam.teamType);
                  const strat = getStrategyConfig(enemyTeam.strategyId);

                  return (
                    <div
                      key={combo.id}
                      onClick={() => setSelectedComboId(combo.id)}
                      className="group rounded-2xl border border-slate-800/90 bg-slate-900/80 hover:bg-slate-900 hover:border-amber-500/50 p-4 sm:p-5 transition-all cursor-pointer shadow-md space-y-4"
                    >
                      {/* Top Header: House / Fortress badge, Team Type, and Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                          {combo.isFortress ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-500/25 to-pink-500/25 border border-purple-500/50 text-purple-300 font-extrabold text-xs shadow-sm">
                              <span>🏰 ป้อมที่ {combo.houseNo || 1}</span>
                              {combo.customName && (
                                <span className="text-purple-200/80 font-normal">({combo.customName})</span>
                              )}
                            </span>
                          ) : combo.houseNo ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-extrabold text-xs">
                              <span>🏠 บ้านที่ {combo.houseNo}</span>
                              {combo.customName && (
                                <span className="text-blue-200/80 font-normal">({combo.customName})</span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                              <span>🛡️ บ้านกันทั่วไป</span>
                              {combo.customName && (
                                <span className="text-slate-400 font-normal">({combo.customName})</span>
                              )}
                            </span>
                          )}

                          {typeMeta && (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeMeta.badgeClass}`}
                            >
                              สาย{typeMeta.label}
                            </span>
                          )}

                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-semibold">
                            แผน {strat.id} ({strat.name})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 group-hover:bg-amber-500/25 transition-colors">
                            <span>ดูวิธีเล่น ({counterTeams.length} ทีมแก้)</span>
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
                                    initialHouseNo: combo.houseNo,
                                    initialIsFortress: combo.isFortress,
                                    initialCustomName: combo.customName,
                                  })
                                }
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                title="แก้ไขข้อมูลบ้านกัน"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCombo(combo.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white cursor-pointer"
                                title="ลบข้อมูลบ้านนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Two columns: LEFT = โพยที่แก้ (ทีมแก้ทาง), RIGHT = บ้านกัน (ทีมตั้งรับ) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                        {/* Left Column: โพยที่แก้ (ทีมแก้ทาง) */}
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 space-y-2.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-500/20">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1">
                                  <span>⚡ โพยที่แก้ (ทีมแก้ทาง)</span>
                                </span>
                                {counterTeams.length > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                                    สูตร #1
                                  </span>
                                )}
                              </div>

                              {counterTeams.length > 1 && (
                                <span className="text-[11px] text-amber-300/90 font-medium">
                                  + อีก {counterTeams.length - 1} สูตรแก้
                                </span>
                              )}
                            </div>

                            {firstCounter ? (
                              <div className="space-y-2">
                                <TeamFormationView
                                  strategyId={firstCounter.strategyId}
                                  frontCharacters={firstCounter.front?.characters || []}
                                  backCharacters={firstCounter.back?.characters || []}
                                  pets={firstCounter.pets || []}
                                  skillOrder={firstCounter.skillOrder || []}
                                  showSkillButtons={Boolean(firstCounter.skillOrder?.length)}
                                />
                                {firstCounter.note && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mt-2">
                                    <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <p className="truncate">{firstCounter.note}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="py-6 text-center space-y-2">
                                <div className="text-xs text-slate-400">ยังไม่มีสูตรทีมแก้สำหรับบ้านนี้</div>
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBuilderModal({ mode: 'counter', comboId: combo.id });
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>เพิ่มสูตรทีมแก้</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
                                    รอแอดมินหรือเพื่อนร่วมกิลด์ลงสูตรแก้
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[11px] text-emerald-400/90 font-medium">
                            <span>คลิกการ์ดเพื่อดูอุปกรณ์ & วิธีเล่น</span>
                            <span className="flex items-center gap-1 font-bold text-amber-300">
                              รายละเอียด ➔
                            </span>
                          </div>
                        </div>

                        {/* Right Column: บ้านกัน (ทีมตั้งรับ) */}
                        <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-3.5 space-y-2.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-500/20">
                              <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-xs font-extrabold text-rose-300">
                                  🛡️ บ้านกัน (ทีมตั้งรับศัตรู)
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                แผน {strat.id} ({strat.name})
                              </span>
                            </div>

                            <TeamFormationView
                              strategyId={enemyTeam.strategyId}
                              frontCharacters={enemyTeam.front?.characters || []}
                              backCharacters={enemyTeam.back?.characters || []}
                              pets={enemyTeam.pets || []}
                              skillOrder={enemyTeam.skillOrder || []}
                              showSkillButtons={Boolean(enemyTeam.skillOrder?.length)}
                            />
                          </div>

                          <div className="pt-2 border-t border-rose-500/15 flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                              {combo.isFortress
                                ? `ป้อมปราการที่ ${combo.houseNo || 1}`
                                : combo.houseNo
                                ? `บ้านเลขที่ ${combo.houseNo}`
                                : 'ทีมศัตรู'}
                            </span>
                            <span className="text-slate-400">
                              {enemyTeam.front?.characters?.length || 0}F / {enemyTeam.back?.characters?.length || 0}B
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* VIEW 2: Selected Combo Detail (Front/Left: Counter Teams + Back/Right: House Defense) */
          <div className="space-y-6">
            {/* Top House Bar & Back Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedComboId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>กลับหน้ารวมโพย</span>
                </button>

                {selectedCombo.isFortress ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/25 to-pink-500/25 border border-purple-500/50 text-purple-300 font-extrabold text-sm shadow-sm">
                    <span>🏰 ป้อมที่ {selectedCombo.houseNo || 1}</span>
                    {selectedCombo.customName && (
                      <span className="text-purple-200/80 font-normal">({selectedCombo.customName})</span>
                    )}
                  </span>
                ) : selectedCombo.houseNo ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-extrabold text-sm">
                    <span>🏠 บ้านที่ {selectedCombo.houseNo}</span>
                    {selectedCombo.customName && (
                      <span className="text-blue-200/80 font-normal">({selectedCombo.customName})</span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm">
                    <span>🛡️ บ้านกันทั่วไป</span>
                    {selectedCombo.customName && (
                      <span className="text-slate-400 font-normal">({selectedCombo.customName})</span>
                    )}
                  </span>
                )}

                {getTeamTypeMeta(selectedCombo.enemyTeam.teamType) && (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      getTeamTypeMeta(selectedCombo.enemyTeam.teamType)!.badgeClass
                    }`}
                  >
                    สาย{getTeamTypeMeta(selectedCombo.enemyTeam.teamType)!.label}
                  </span>
                )}
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
                        initialHouseNo: selectedCombo.houseNo,
                        initialIsFortress: selectedCombo.isFortress,
                        initialCustomName: selectedCombo.customName,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไขบ้านกัน</span>
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

            {/* Grid 2 Columns: LEFT = โพยที่แก้ (ทีมแก้ทาง), RIGHT = บ้านกัน (ทีมตั้งรับ) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: โพยที่แก้ (ทีมแก้ทาง) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                      <Swords className="w-5 h-5 text-emerald-400" />
                      <span>
                        ⚡ โพยที่แก้ (ทีมแก้ทาง) ({selectedCombo.counterTeams?.length || 0} ทีม)
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
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มทีมแก้ทาง</span>
                    </button>
                  )}
                </div>

                {!selectedCombo.counterTeams || selectedCombo.counterTeams.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center space-y-3">
                    <p className="text-sm font-bold text-slate-300">
                      ยังไม่มีทีมแก้ทางสำหรับบ้านนี้
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setBuilderModal({
                            mode: 'counter',
                            comboId: selectedCombo.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>เพิ่มสูตรทีมแก้</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
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
                            onClick={() =>
                              setDetailCounter({
                                team: counter,
                                index: idx,
                                targetTitle: selectedCombo.isFortress
                                  ? `ป้อมที่ ${selectedCombo.houseNo || 1}${selectedCombo.customName ? ` (${selectedCombo.customName})` : ''}`
                                  : selectedCombo.houseNo
                                  ? `บ้านที่ ${selectedCombo.houseNo}${selectedCombo.customName ? ` (${selectedCombo.customName})` : ''}`
                                  : `บ้านกัน${selectedCombo.customName ? ` (${selectedCombo.customName})` : ''}`,
                              })
                            }
                            className="group rounded-2xl border border-emerald-500/30 bg-emerald-950/10 hover:bg-slate-900 hover:border-amber-500/50 p-4 sm:p-5 space-y-4 transition-all cursor-pointer shadow-sm"
                          >
                            {/* Top Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold">
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

              {/* Right Column: บ้านกัน (ทีมตั้งรับศัตรู) */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
                <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900 p-5 space-y-3 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-extrabold flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>บ้านกัน (ทีมตั้งรับศัตรู)</span>
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setBuilderModal({
                            mode: 'enemy',
                            comboId: selectedCombo.id,
                            initialEnemy: selectedCombo.enemyTeam,
                            initialHouseNo: selectedCombo.houseNo,
                            initialIsFortress: selectedCombo.isFortress,
                            initialCustomName: selectedCombo.customName,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      {selectedCombo.isFortress
                        ? `ป้อมปราการที่ ${selectedCombo.houseNo || 1}`
                        : selectedCombo.houseNo
                        ? `บ้านเลขที่ ${selectedCombo.houseNo}`
                        : 'บ้านทั่วไป'}
                    </span>
                    {selectedCombo.customName && (
                      <span className="text-amber-300 font-semibold">
                        ({selectedCombo.customName})
                      </span>
                    )}
                    <span>• แผน {selectedCombo.enemyTeam.strategyId} ({getStrategyConfig(selectedCombo.enemyTeam.strategyId).name})</span>
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
              </div>
            </div>
          </div>
        )
      )}


        {/* TAB 4: ตารางสงคราม (Schedule) */}
        {currentTab === 'schedule' && (
          <WarScheduleView
            schedule={guild?.schedule}
            isAdmin={isAdmin}
            onUpdateSchedule={handleUpdateSchedule}
          />
        )}

        {/* TAB 5: ตั้งค่ากิลด์ (Settings) */}
        {currentTab === 'settings' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>ข้อมูลโพยกิลด์</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div>
                    <div className="text-slate-400">ชื่อกิลด์</div>
                    <div className="text-sm font-bold text-white">{guild?.name}</div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenameInput(guild?.name || '');
                        setShowRenameModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>เปลี่ยนชื่อ</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div>
                    <div className="text-slate-400">รหัสสั้น (Short ID)</div>
                    <div className="text-sm font-mono font-bold text-amber-400">{shortId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>คัดลอกลิงก์</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">บ้านกัน / โพยสูตรแก้</div>
                    <div className="text-lg font-extrabold text-white">
                      {guild?.combos?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">ทีมแก้ทางทั้งหมด</div>
                    <div className="text-lg font-extrabold text-amber-400">
                      {guild?.combos?.reduce((acc, c) => acc + (c.counterTeams?.length || 0), 0) || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin & Security Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>สิทธิ์และความปลอดภัย (Security)</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div>
                    <div className="font-bold text-white">
                      {isAdmin
                        ? 'กำลังใช้งานในโหมดผู้ดูแล (Admin)'
                        : 'กำลังใช้งานในโหมดสมาชิก (Viewer)'}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {isAdmin
                        ? 'คุณสามารถเพิ่ม/แก้ไข/ลบทีม และจัดการบ้านศัตรูได้ทั้งหมด'
                        : 'คุณสามารถเข้าดูและกดไลก์ทีมแก้ได้ แต่ต้องใช้รหัสแอดมินเพื่อแก้ไขข้อมูล'}
                    </div>
                  </div>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={handleAdminLogout}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold cursor-pointer"
                    >
                      ออกจากแอดมิน
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAdminLoginModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer"
                    >
                      ล็อกอินแอดมิน
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div>
                        <div className="font-bold text-white">รหัสผ่านผู้ดูแลกิลด์ (Admin Key)</div>
                        <div className="text-slate-400 text-[11px]">
                          เปลี่ยนรหัสแอดมินสำหรับส่งต่อให้หัวหน้ากิลด์คนอื่น
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewAdminPass(getAdminKey(shortId));
                          setShowSetupModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                      >
                        เปลี่ยนรหัส
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div>
                        <div className="font-bold text-white">
                          รหัสล็อกดูโพยสำหรับสมาชิก: {guild?.viewer_locked ? 'เปิดใช้งานอยู่' : 'ปิดอยู่'}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          ล็อกไม่ให้คนนอกที่ไม่มีรหัสผ่านเข้าดูข้อมูลโพยนี้
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowViewerLockModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                      >
                        ตั้งค่า
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Backup & Restore Data Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>สำรองและกู้คืนข้อมูล (Backup & Restore)</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                  ป้องกันข้อมูลหาย
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                คุณสามารถดาวน์โหลดข้อมูลโพยและสูตรทั้งหมดเก็บเป็นไฟล์ <code>.json</code> ไว้ในเครื่องคอมพิวเตอร์ได้ตลอดเวลา เพื่อความปลอดภัยเวลาอัปเดตโค้ดเวอร์ชันใหม่ หรือย้ายเซิร์ฟเวอร์
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Export Button */}
                <a
                  href={`/api/guild/${shortId}/export`}
                  download
                  className="flex flex-col p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1">
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    <span>📥 สำรองข้อมูล (Export JSON)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    ดาวน์โหลดข้อมูลบ้านและสูตรแก้ทั้งหมดเก็บไว้ในเครื่อง
                  </p>
                </a>

                {/* Import Button */}
                {isAdmin ? (
                  <label className="flex flex-col p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-950/40 text-left transition-all cursor-pointer group">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackupFile}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs mb-1">
                      <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                      <span>📤 กู้คืนข้อมูล (Restore JSON)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      นำเข้าไฟล์สำรองเพื่อกู้คืนโพยเดิมกลับมา
                    </p>
                  </label>
                ) : (
                  <div className="flex flex-col p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-left opacity-60">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs mb-1">
                      <Upload className="w-4 h-4" />
                      <span>📤 กู้คืนข้อมูล (แอดมินเท่านั้น)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      เข้าสู่ระบบแอดมินเพื่อกู้คืนข้อมูลสำรอง
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sync from 7K-Note Section */}
            {!hasSyncedData ? (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>ซิงค์โพยเมต้าจาก 7K-Note (37 บ้าน)</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                    ยังไม่มีข้อมูลโพย
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  ดึงข้อมูลบ้านศัตรูตั้งรับและสูตรแก้ทาง 37 บ้านจาก 7K-Note (ห้อง <code>4ZyeEGMZ</code>) เข้ามาในกิลด์ของคุณได้ทันที พร้อมตำแหน่งจัดแถวหน้า/หลัง, สัตว์เลี้ยง, ลำดับการกดสกิล, เซ็ตอุปกรณ์, แหวน และสเตตัสอย่างละเอียด
                </p>

                {isAdmin ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSync7KNote}
                      disabled={isSyncing7KNote}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSyncing7KNote ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>กำลังซิงค์โพยจาก 7K-Note...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-slate-950" />
                          <span>⚡ ซิงค์โพย 37 บ้านจาก 7K-Note ตอนนี้</span>
                        </>
                      )}
                    </button>
                    <a
                      href="https://7k-note.pages.dev/g/4ZyeEGMZ?tab=targets"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      <span>เปิดดูต้นฉบับ 7K-Note</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    🔒 ต้องเข้าสู่ระบบแอดมินเพื่อกดซิงค์โพยเข้ากิลด์นี้
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ดึงข้อมูลโพยและสูตรแก้ 37 บ้านเรียบร้อยแล้ว</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {showForceResync ? (
                      <button
                        type="button"
                        onClick={handleSync7KNote}
                        disabled={isSyncing7KNote}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        {isSyncing7KNote ? 'กำลังซิงค์...' : 'ยืนยันซิงค์ทับอีกครั้ง'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setShowForceResync((prev) => !prev)}
                      className="text-[11px] text-slate-400 hover:text-amber-400 underline cursor-pointer"
                    >
                      {showForceResync ? 'ซ่อนปุ่ม' : 'ต้องการซิงค์ทับใหม่อีกครั้ง?'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Supabase Database Connection & Migration Guide */}
            <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-sky-950/20 to-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  <span>ฐานข้อมูลคลาวด์ Supabase (ป้องกันข้อมูลหายถาวร 100%)</span>
                </h3>
                {supabaseStatus?.configured ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    เชื่อมต่อแล้ว (Cloud Sync)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Local Storage (ยังไม่ต่อ Supabase)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {supabaseStatus?.configured ? (
                  <span className="text-emerald-300 font-medium">
                    ระบบได้เชื่อมต่อกับฐานข้อมูล Supabase PostgreSQL เรียบร้อยแล้ว! ทุกครั้งที่มีการบันทึกบ้านหรือสูตรแก้ ข้อมูลจะถูกซิงค์ขึ้น Cloud ทันที ต่อให้อัปเดตโค้ดขึ้น Render หรือรีสตาร์ตเซิร์ฟเวอร์ ข้อมูลก็จะไม่หายอย่างแน่นอน 100%
                  </span>
                ) : (
                  <>
                    เนื่องจาก Render Free Tier จะลบไฟล์ดิสก์ทุกครั้งที่มีการ deploy โค้ดใหม่ เพื่อให้ข้อมูลทีมและโพยของคุณอยู่ถาวร ให้เชื่อมต่อกับ <b>Supabase PostgreSQL (ฟรีตลอดชีพ)</b> ตามขั้นตอนด้านล่างนี้:
                  </>
                )}
              </p>

              <div className="space-y-3 pt-1">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">1</span>
                      <span>สร้างตารางใน Supabase SQL Editor</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (supabaseStatus?.sql) {
                          navigator.clipboard.writeText(supabaseStatus.sql);
                          setCopiedSql(true);
                          setTimeout(() => setCopiedSql(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-500/30 text-sky-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>คัดลอกแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-32 border border-slate-800">
                    {supabaseStatus?.sql || `CREATE TABLE IF NOT EXISTS guilds (\n  short_id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  admin_key TEXT NOT NULL,\n  combos JSONB DEFAULT '[]'::jsonb,\n  targets JSONB DEFAULT '[]'::jsonb,\n  plans JSONB DEFAULT '[]'::jsonb,\n  schedule JSONB DEFAULT '{}'::jsonb,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);`}
                  </pre>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">2</span>
                    <span>ใส่ Environment Variables ใน Render Dashboard</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ไปที่ Render Dashboard &gt; Service ของคุณ &gt; แท็บ <b>Environment</b> แล้วเพิ่ม 2 ค่านี้:
                  </p>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                      <span className="text-amber-400">SUPABASE_URL</span>
                      <span className="text-slate-400">https://[your-project].supabase.co</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                      <span className="text-amber-400">SUPABASE_KEY</span>
                      <span className="text-slate-400">anon_key หรือ service_role_key</span>
                    </div>
                  </div>
                </div>

                {/* Refresh connection status button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400">
                    {supabaseStatus?.configured ? '🟢 ฐานข้อมูลออนไลน์และพร้อมใช้งาน' : '⚪ รอการเชื่อมต่อ'}
                  </div>
                  <button
                    type="button"
                    onClick={checkSupabase}
                    disabled={checkingSupabase}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingSupabase ? 'animate-spin' : ''}`} />
                    <span>ตรวจสอบสถานะ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            {isAdmin && shortId !== 'meta7k' && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-3">
                <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>ลบโพยกิลด์นี้อย่างถาวร</span>
                </h3>
                <p className="text-xs text-rose-200/70">
                  เมื่อลบแล้ว ข้อมูลบ้านศัตรู แผนสงคราม และสูตรแก้ทางทั้งหมดจะหายไปและไม่สามารถกู้คืนได้
                </p>
                <button
                  type="button"
                  onClick={handleDeleteEntireGuild}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  ยืนยันการลบโพยกิลด์
                </button>
              </div>
            )}
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

      {/* Modal: Target House Builder */}
      {targetModal.open && (
        <TargetBuilderModal
          initialTarget={targetModal.target}
          onClose={() => setTargetModal({ open: false, target: null })}
          onSave={handleSaveTarget}
        />
      )}

      {/* Modal: Team Builder (Enemy or Counter) */}
      {builderModal && (
        <TeamBuilderModal
          mode={builderModal.mode}
          initialEnemyTeam={builderModal.initialEnemy}
          initialCounterTeam={builderModal.initialCounter}
          initialHouseNo={builderModal.initialHouseNo}
          initialIsFortress={builderModal.initialIsFortress}
          initialCustomName={builderModal.initialCustomName}
          onClose={() => {
            setBuilderModal(null);
            setTargetCounterSlot(null);
          }}
          onSaveEnemy={handleSaveEnemyTeam}
          onSaveCounter={handleSaveCounterTeam}
        />
      )}

      {/* Modal: Rename Guild */}
      {showRenameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowRenameModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>แก้ไขชื่อกิลด์</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameGuild} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">ชื่อกิลด์</label>
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="ระบุชื่อกิลด์..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  บันทึกชื่อกิลด์
                </button>
              </div>
            </form>
          </div>
        </div>
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

      {/* AI Vision Screenshot Modal */}
      <TeamScreenshotModal
        isOpen={showAiScanModal}
        onClose={() => setShowAiScanModal(false)}
        mode="auto_combo"
        onApplyTeam={handleApplyFromAiScan}
        onDirectSaveCombo={isAdmin ? handleDirectSaveAiCombo : undefined}
      />
    </div>
  );
};
