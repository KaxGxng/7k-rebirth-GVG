import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  KeyRound,
  Check,
  AlertCircle,
  RefreshCw,
  Swords,
  Shield,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type { StrategyId, TeamType, CatalogCharacter, CatalogPet } from '../types';
import {
  getStoredApiKey,
  setStoredApiKey,
  compressImageFile,
  generateSampleTeamCanvas,
  scanScreenshotApi,
  resolveHeroFromCatalog,
  resolvePetFromCatalog,
  type AiScanResult,
} from '../lib/aiVision';
import { STRATEGIES, TEAM_TYPES } from '../lib/catalog';

interface TeamScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'auto_combo' | 'enemy' | 'counter';
  initialImageBase64?: string;
  onApplyTeam: (data: {
    strategyId: StrategyId;
    teamType?: TeamType;
    houseNo?: number;
    isFortress?: boolean;
    customName?: string;
    front: { characters: { index: number; name: string; description?: string }[] };
    back: { characters: { index: number; name: string; description?: string }[] };
    pets: (string | null)[];
    note?: string;
    recommendedCounter?: {
      strategyId: StrategyId;
      front: { characters: { index: number; name: string; description?: string }[] };
      back: { characters: { index: number; name: string; description?: string }[] };
      pets: (string | null)[];
      skillOrder?: { charIndex: number; skillType: 'T' | 'B'; order: 1 | 2 | 3 }[];
      note?: string;
    };
  }) => void;
  onDirectSaveCombo?: (comboPayload: {
    houseNo?: number;
    isFortress?: boolean;
    customName?: string;
    enemyTeam: any;
    counterTeams: any[];
  }) => Promise<void>;
}

export const TeamScreenshotModal: React.FC<TeamScreenshotModalProps> = ({
  isOpen,
  onClose,
  mode = 'auto_combo',
  initialImageBase64,
  onApplyTeam,
  onDirectSaveCombo,
}) => {
  const [targetMode, setTargetMode] = useState<'auto_combo' | 'enemy' | 'counter'>(mode);
  const [imageBase64, setImageBase64] = useState<string>(initialImageBase64 || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiScanResult | null>(null);

  // API Key management
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey());
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [keyInputTemp, setKeyInputTemp] = useState<string>(getStoredApiKey());
  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImageBase64) {
      setImageBase64(initialImageBase64);
    }
  }, [initialImageBase64]);

  // Global paste handler when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            try {
              setLoadingStep('กำลังบีบอัดรูปภาพที่วาง...');
              const compressed = await compressImageFile(file);
              setImageBase64(compressed);
              setError(null);
              setResult(null);
            } catch (err: any) {
              setError(err.message || 'เกิดข้อผิดพลาดในการโหลดรูปภาพ');
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoadingStep('กำลังอ่านไฟล์รูปภาพ...');
      const compressed = await compressImageFile(file);
      setImageBase64(compressed);
      setError(null);
      setResult(null);
    } catch (err: any) {
      setError(err.message || 'อ่านรูปภาพไม่สำเร็จ');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        setLoadingStep('กำลังประมวลผลรูปภาพ...');
        const compressed = await compressImageFile(file);
        setImageBase64(compressed);
        setError(null);
        setResult(null);
      } catch (err: any) {
        setError(err.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
      }
    }
  };

  const handleSaveKey = () => {
    setStoredApiKey(keyInputTemp);
    setApiKey(keyInputTemp.trim());
    setShowKeyInput(false);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const handleUseSample = (type: 'tank' | 'speed') => {
    const sample = generateSampleTeamCanvas(type);
    setImageBase64(sample);
    setError(null);
    setResult(null);
  };

  const handleStartAnalysis = async () => {
    if (!imageBase64) {
      setError('กรุณาวางรูปภาพหรือเลือกรูปก่อนทำการวิเคราะห์');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const steps = [
      '🔍 กำลังสแกนตำแหน่งฟอร์เมชันและฮีโร่ในรูปภาพ...',
      '⚡ กำลังตรวจสอบแคตตาล็อกตัวละคร 7K Re:BIRTH...',
      '🛡️ กำลังคำนวณจุดแข็งและวิเคราะห์สูตรแก้ทาง...',
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setLoadingStep(steps[stepIndex]);
    }, 1200);

    try {
      const res = await scanScreenshotApi({
        imageBase64,
        apiKey: apiKey || undefined,
        mode: targetMode === 'counter' ? 'counter' : 'enemy',
        demoMode: !apiKey,
      });

      clearInterval(stepInterval);
      setResult(res);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'การวิเคราะห์รูปภาพล้มเหลว โปรดลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    onApplyTeam({
      strategyId: result.strategyId,
      teamType: result.teamType,
      houseNo: result.houseNo,
      isFortress: result.isFortress,
      customName: result.customName,
      front: { characters: result.frontCharacters || [] },
      back: { characters: result.backCharacters || [] },
      pets: result.pets || [],
      note: result.explanation,
      recommendedCounter: result.recommendedCounter
        ? {
            strategyId: result.recommendedCounter.strategyId,
            front: { characters: result.recommendedCounter.frontCharacters || [] },
            back: { characters: result.recommendedCounter.backCharacters || [] },
            pets: result.recommendedCounter.pets || [],
            skillOrder: result.recommendedCounter.skillOrder,
            note: result.recommendedCounter.note,
          }
        : undefined,
    });
    onClose();
  };

  const handleDirectSave = async () => {
    if (!result || !onDirectSaveCombo) return;

    const enemyTeam = {
      strategyId: result.strategyId,
      teamType: result.teamType,
      front: { characters: result.frontCharacters || [] },
      back: { characters: result.backCharacters || [] },
      pets: result.pets || [],
    };

    const counterTeams = result.recommendedCounter
      ? [
          {
            id: 'counter-ai-' + Date.now(),
            order: 0,
            strategyId: result.recommendedCounter.strategyId,
            skillOrder: result.recommendedCounter.skillOrder || [],
            front: { characters: result.recommendedCounter.frontCharacters || [] },
            back: { characters: result.recommendedCounter.backCharacters || [] },
            pets: result.recommendedCounter.pets || [],
            note: result.recommendedCounter.note || 'สร้างสูตรแก้ทางโดยอัตโนมัติจากระบบ AI',
          },
        ]
      : [];

    await onDirectSaveCombo({
      houseNo: result.houseNo,
      isFortress: result.isFortress,
      customName: result.customName,
      enemyTeam,
      counterTeams,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  แคปรูปจัดทีมอัตโนมัติ (AI Screenshot to Team)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI Vision
                </span>
              </div>
              <p className="text-xs text-slate-400">
                แคปรูปหน้าจอเกมแล้วกด <b>Ctrl + V</b> หรือวางรูป AI จะอ่านตัวละครและจัดทีมให้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Target Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTargetMode('auto_combo')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                targetMode === 'auto_combo'
                  ? 'bg-purple-950/40 border-purple-500/80 text-white shadow-lg shadow-purple-950/30'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">สร้างโพยครบวงจร</p>
                <p className="text-[10px] text-slate-400">อ่านทีมศัตรู + ออกสูตรแก้ทาง</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTargetMode('enemy')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                targetMode === 'enemy'
                  ? 'bg-amber-950/40 border-amber-500/80 text-white shadow-lg shadow-amber-950/30'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">จัดเฉพาะทีมศัตรู (บ้านกัน)</p>
                <p className="text-[10px] text-slate-400">ใส่ลงในฟอร์มทีมศัตรู</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTargetMode('counter')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                targetMode === 'counter'
                  ? 'bg-blue-950/40 border-blue-500/80 text-white shadow-lg shadow-blue-950/30'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Swords className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">จัดเฉพาะทีมแก้ทาง</p>
                <p className="text-[10px] text-slate-400">ใส่ลงในฟอร์มสูตรแก้</p>
              </div>
            </button>
          </div>

          {/* API Key Status / Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">
                  Gemini Vision AI Engine:
                </span>
                {apiKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <Check className="w-3 h-3" /> เชื่อมต่อคีย์ส่วนตัวแล้ว
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    โหมดทดลอง (Demo)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline"
                >
                  {apiKey ? 'เปลี่ยน API Key' : '🔑 ใส่ Gemini API Key (ฟรี)'}
                </button>
              </div>
            </div>

            {keySavedToast && (
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> บันทึก Gemini API Key เรียบร้อยแล้ว!
              </p>
            )}

            {showKeyInput && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <p className="text-[11px] text-slate-400">
                  Google ให้ใช้งาน Gemini Vision API ฟรี โดยสามารถสร้าง Key ได้ใน 30 วินาทีที่ Google AI Studio:
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyInputTemp}
                    onChange={(e) => setKeyInputTemp(e.target.value)}
                    placeholder="วาง Gemini API Key ที่นี่ (AIzaSy...)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                  >
                    บันทึก
                  </button>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 cursor-pointer"
                  >
                    <span>รับคีย์ฟรี</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Main Dropzone / Paste Area */}
          {!imageBase64 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-700 hover:border-purple-500/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-purple-950/10 min-h-[220px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>

              <h4 className="text-sm sm:text-base font-extrabold text-white mb-1">
                กด <kbd className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700 text-xs font-mono">Ctrl + V</kbd> เพื่อวางรูปแคปหน้าจอได้ทันที
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                หรือคลิกเพื่อเลือกไฟล์รูปภาพ / ลากรูปแคปหน้าจอเกม Seven Knights Re:BIRTH มาวางที่นี่
              </p>

              {/* Sample preset buttons */}
              <div
                className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] text-slate-500">หรือลองทดสอบด้วยรูปตัวอย่าง:</span>
                <button
                  type="button"
                  onClick={() => handleUseSample('tank')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  🧪 ตัวอย่าง 1: ป้อมถึกโรซี่ (1-4)
                </button>
                <button
                  type="button"
                  onClick={() => handleUseSample('speed')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  🧪 ตัวอย่าง 2: บ้านสปีดแฝด (2-3)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview & Controls */}
              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col md:flex-row items-center gap-4 p-4">
                <div className="relative max-h-56 max-w-sm rounded-xl overflow-hidden border border-slate-800 bg-black shrink-0">
                  <img
                    src={imageBase64}
                    alt="Screenshot Preview"
                    className="max-h-56 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageBase64('');
                      setResult(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-slate-300 hover:text-rose-400 border border-slate-700"
                    title="ลบรูปภาพนี้"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-400" />
                      <span>รูปภาพพร้อมสำหรับการวิเคราะห์</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      กดปุ่มด้านล่างเพื่อให้ AI ตรวจสอบฮีโร่ ฟอร์เมชัน สัตว์เลี้ยง และคำนวณการจัดทีม
                    </p>
                  </div>

                  {!result && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleStartAnalysis}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{loadingStep || 'กำลังประมวลผล...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>🚀 วิเคราะห์รูปและจัดทีมทันที (Analyze Now)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const res = await scanScreenshotApi({
                      imageBase64,
                      demoMode: true,
                      mode: targetMode === 'counter' ? 'counter' : 'enemy',
                    });
                    setResult(res);
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] cursor-pointer transition-colors shadow"
              >
                🎯 ลองใช้โหมดจำลอง (Demo)
              </button>
            </div>
          )}

          {/* Analysis Results View */}
          {result && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>ผลลัพธ์การวิเคราะห์ทีมจากรูปภาพ</span>
                </h4>
                {result.isDemo && (
                  <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                    💡 โหมดตัวอย่าง
                  </span>
                )}
              </div>

              {/* Detected Team Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                      🛡️ ทีมที่ตรวจพบในรูป
                    </span>
                    {result.houseNo && (
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        {result.isFortress ? `🏰 ป้อมที่ ${result.houseNo}` : `🏠 บ้านที่ ${result.houseNo}`}
                        {result.customName ? ` - ${result.customName}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                      แผน: {STRATEGIES.find((s) => s.id === result.strategyId)?.name || result.strategyId}
                    </span>
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                      ประเภท:{' '}
                      {TEAM_TYPES.find((t) => t.id === result.teamType)?.label || result.teamType}
                    </span>
                  </div>
                </div>

                {/* 5 Heroes Grid */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    รายชื่ออัศวินที่ตรวจจับได้ (5 ช่อง):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      ...(result.frontCharacters || []).map((c) => ({ ...c, row: 'แถวหน้า' })),
                      ...(result.backCharacters || []).map((c) => ({ ...c, row: 'แถวหลัง' })),
                    ]
                      .sort((a, b) => a.index - b.index)
                      .map((char) => {
                        const heroInfo = resolveHeroFromCatalog(char.name);
                        return (
                          <div
                            key={char.index}
                            className="rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 flex flex-col items-center text-center relative group"
                          >
                            <span className="absolute top-1.5 left-2 text-[10px] font-bold text-slate-500">
                              #{char.index}
                            </span>
                            <span className="absolute top-1.5 right-2 text-[9px] font-semibold text-purple-400 bg-purple-500/10 px-1 rounded">
                              {char.row}
                            </span>

                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-500/40 bg-slate-800 my-2">
                              {heroInfo?.imageUrl ? (
                                <img
                                  src={heroInfo.imageUrl}
                                  alt={char.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-300">
                                  {char.name.slice(0, 2)}
                                </div>
                              )}
                            </div>

                            <p className="text-xs font-bold text-white truncate max-w-full">
                              {char.name}
                            </p>
                            {heroInfo?.tierLabel && (
                              <span className="text-[9px] text-amber-400 font-extrabold mt-0.5">
                                {heroInfo.tierLabel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Pets */}
                {result.pets && result.pets.some(Boolean) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-slate-400">🐾 สัตว์เลี้ยง:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {result.pets.filter(Boolean).map((p, idx) => {
                        const petInfo = resolvePetFromCatalog(p!);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                          >
                            {petInfo?.imageUrl && (
                              <img
                                src={petInfo.imageUrl}
                                alt={p!}
                                className="w-3.5 h-3.5 rounded-full object-cover"
                              />
                            )}
                            <span>{p}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {result.explanation && (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
                    <b>วิเคราะห์จุดเด่น:</b> {result.explanation}
                  </div>
                )}
              </div>

              {/* Recommended Counter Team (If Auto Combo mode) */}
              {result.recommendedCounter && targetMode === 'auto_combo' && (
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-950/90 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs sm:text-sm font-extrabold text-amber-300">
                        ⚡ สูตรทีมแก้ทางที่แนะนำ (AI Recommended Counter)
                      </h5>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
                      แผน:{' '}
                      {STRATEGIES.find((s) => s.id === result.recommendedCounter?.strategyId)?.name ||
                        result.recommendedCounter?.strategyId}
                    </span>
                  </div>

                  {/* Counter Heroes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      ...(result.recommendedCounter.frontCharacters || []).map((c) => ({
                        ...c,
                        row: 'แถวหน้า',
                      })),
                      ...(result.recommendedCounter.backCharacters || []).map((c) => ({
                        ...c,
                        row: 'แถวหลัง',
                      })),
                    ]
                      .sort((a, b) => a.index - b.index)
                      .map((char) => {
                        const heroInfo = resolveHeroFromCatalog(char.name);
                        return (
                          <div
                            key={char.index}
                            className="rounded-xl border border-amber-500/20 bg-slate-900/95 p-2.5 flex flex-col items-center text-center"
                          >
                            <span className="text-[9px] font-semibold text-amber-400 mb-1">
                              {char.row} (#{char.index})
                            </span>
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/50 bg-slate-800 mb-1.5">
                              {heroInfo?.imageUrl ? (
                                <img
                                  src={heroInfo.imageUrl}
                                  alt={char.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-amber-300">
                                  {char.name.slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-bold text-white truncate max-w-full">
                              {char.name}
                            </p>
                            {char.description && (
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                                {char.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Note */}
                  {result.recommendedCounter.note && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                      <b className="text-amber-400">💡 เทคนิคแนะนำ:</b>{' '}
                      {result.recommendedCounter.note}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-800/80 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2">
            {result && onDirectSaveCombo && targetMode === 'auto_combo' && (
              <button
                type="button"
                onClick={handleDirectSave}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกเป็นโพยลงกิลด์ทันที</span>
              </button>
            )}

            {result && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>เปิดปรับแต่งต่อใน Team Builder</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
