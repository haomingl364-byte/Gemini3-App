import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu, Save, Settings, MapPin, Calendar, RotateCcw, ArrowLeft, Search, X, Fingerprint, FolderInput, ChevronDown, Check, BookOpen, ChevronRight, Edit3, Download, Upload, FileText, Copy, ChevronLeft } from 'lucide-react';
import { UserInput, Gender, Record, CalendarType } from './types';
import { calculateBaZi, findDatesFromPillars, MatchingDate } from './services/baziCalculator';
import { analyzeBaZi } from './services/geminiService';
import { APP_STORAGE_KEY, ELEMENT_COLORS, CITIES, GAN, ZHI, LUNAR_MONTHS, LUNAR_DAYS, LUNAR_TIMES, STEM_ELEMENTS, BRANCH_ELEMENTS } from './constants';
import { Button } from './components/Button';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PillarDisplay } from './components/PillarDisplay';
import { WheelPicker } from './components/WheelPicker';

// Initialize with current date/time
const now = new Date();

const initialInput: UserInput = {
  name: '',
  gender: Gender.MALE,
  calendarType: CalendarType.SOLAR,
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
  isLeapMonth: false,
  selectedCityKey: '不参考出生地 (北京时间)',
  autoSave: true,
  group: '',
  processEarlyLateRat: true, // Default to true (Distinguish Early/Late Rat)
  manualYear: '甲子',
  manualMonth: '丙寅',
  manualDay: '戊辰',
  manualHour: '壬子'
};

interface PillarSelection {
    yGan: string; yZhi: string;
    mGan: string; mZhi: string;
    dGan: string; dZhi: string;
    hGan: string; hZhi: string;
}

// Initial pillars set to empty strings to represent "-"
const initialPillars: PillarSelection = {
    yGan: '', yZhi: '',
    mGan: '', mZhi: '',
    dGan: '', dZhi: '',
    hGan: '', hZhi: ''
};

function App() {
  const [view, setView] = useState<'form' | 'chart'>('form');
  const [inputMode, setInputMode] = useState<'date' | 'manual'>('date');
  const [input, setInput] = useState<UserInput>(initialInput);
  
  const [pillars, setPillars] = useState<PillarSelection>(initialPillars);
  const [foundDates, setFoundDates] = useState<MatchingDate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDateResults, setShowDateResults] = useState(false);

  // Wheel Expansion State
  const [isPickerExpanded, setIsPickerExpanded] = useState(false);

  const [currentRecord, setCurrentRecord] = useState<Record | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // Track if we are editing an existing record
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [pasteInput, setPasteInput] = useState('');

  // Real-time clock for display (Only used if needed, but wheel picker drives display now)
  const [currentTime, setCurrentTime] = useState(new Date());

  // New state for toast animations
  const [toastMsg, setToastMsg] = useState('');

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Textarea Ref for auto-grow
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const years = Array.from({length: 150}, (_, i) => 1900 + i);
  // Generate Wheel Options
  const yearOptions = years.map(y => ({ label: `${y}`, value: y }));
  
  const monthOptions = input.calendarType === CalendarType.LUNAR 
      ? LUNAR_MONTHS.map((m, i) => ({ label: m, value: i + 1 }))
      : Array.from({length: 12}, (_, i) => ({ label: `${i + 1}`, value: i + 1 }));

  const dayOptions = input.calendarType === CalendarType.LUNAR
      ? LUNAR_DAYS.map((d, i) => ({ label: d, value: i + 1 }))
      : Array.from({length: 31}, (_, i) => ({ label: `${i + 1}`, value: i + 1 }));

  const hourOptions = input.calendarType === CalendarType.LUNAR
      ? (input.processEarlyLateRat 
          ? LUNAR_TIMES.map(t => ({ label: t.name.split(' ')[0], value: t.value }))
          : LUNAR_TIMES.filter(t => t.value !== 23).map(t => ({ 
              label: t.value === 0 ? '子时' : t.name.split(' ')[0], 
              value: t.value 
            }))
        )
      : Array.from({length: 24}, (_, i) => ({ label: `${i}`, value: i }));

  const minuteOptions = Array.from({length: 60}, (_, i) => ({ label: `${i}`, value: i }));
  
  useEffect(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) {
      try { setRecords(JSON.parse(saved)); } catch (e) { console.error("Failed to load records"); }
    }
    
    // Timer for current time display
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Reset expansion when returning to form
  useEffect(() => {
      if (view === 'form') {
          setIsPickerExpanded(false);
      }
  }, [view]);

  // Auto-resize textarea when noteDraft changes
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [noteDraft, view]);

  // Calculate current BaZi for display (Driven by Wheel Inputs)
  const currentBaZi = useMemo(() => {
      try {
          return calculateBaZi(input);
      } catch (e) {
          return null;
      }
  }, [input]);

  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(''), 2500);
  };

  const saveRecordsToStorage = (newRecords: Record[]) => {
    try {
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newRecords));
        setRecords(newRecords);
    } catch (e) {
        console.error("Save failed", e);
        alert("保存失败，可能是存储空间不足");
    }
  };

  // Helper to generate next case name
  const generateNextCaseName = (currentRecords: Record[]) => {
      let maxNum = 0;
      const regex = /^案例(\d+)$/;
      currentRecords.forEach(r => {
          const match = r.name.match(regex);
          if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
          }
      });
      return `案例${maxNum + 1}`;
  };

  const handleReset = () => {
      setInput(initialInput);
      setPillars(initialPillars);
      setEditingId(null);
      setNoteDraft('');
      setPasteInput('');
      setCurrentRecord(null);
      setInputMode('date');
      setIsPickerExpanded(false); // Reset expansion
      showToast("已重置");
  };

  const handleSmartPaste = async () => {
      try {
          let text = pasteInput.trim();
          
          if (!text) {
              // Only read clipboard if manual input is empty
              text = await navigator.clipboard.readText();
              text = text ? text.trim() : '';
              if (!text) {
                  showToast("无内容");
                  return;
              }
          }

          let parsedYear, parsedMonth, parsedDay, parsedHour, parsedMinute;

          // Pattern 1: Compact Number (YYYYMMDDHHmm) e.g. 194910011500
          const compactRegex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/;
          const compactMatch = text.match(compactRegex);

          if (compactMatch) {
              parsedYear = parseInt(compactMatch[1], 10);
              parsedMonth = parseInt(compactMatch[2], 10);
              parsedDay = parseInt(compactMatch[3], 10);
              parsedHour = parseInt(compactMatch[4], 10);
              parsedMinute = parseInt(compactMatch[5], 10);
          } else {
              // Pattern 2: Flexible Text e.g. 2025年12月8日23:57 or 2025/12/08 23:57
              // Extract all number sequences
              const nums = text.match(/\d+/g);
              if (nums && nums.length >= 3) {
                  parsedYear = parseInt(nums[0], 10);
                  // Basic validation to check if first number is Year (e.g. > 1900)
                  if (parsedYear < 1000) { 
                      // If first number is small, maybe format is DD/MM/YYYY? 
                      // For simplicity, assume standard Chinese/ISO order YMD
                  }

                  parsedMonth = parseInt(nums[1], 10);
                  parsedDay = parseInt(nums[2], 10);
                  parsedHour = nums.length > 3 ? parseInt(nums[3], 10) : 12; // Default to noon
                  parsedMinute = nums.length > 4 ? parseInt(nums[4], 10) : 0;
              } else {
                  showToast("未能识别日期格式");
                  return;
              }
          }

          // Validate ranges
          if (parsedYear && parsedMonth >= 1 && parsedMonth <= 12 && parsedDay >= 1 && parsedDay <= 31) {
              setInput({
                  ...input,
                  calendarType: CalendarType.SOLAR, // Auto-detect usually implies Solar
                  year: parsedYear,
                  month: parsedMonth,
                  day: parsedDay,
                  hour: Math.min(23, Math.max(0, parsedHour || 0)),
                  minute: Math.min(59, Math.max(0, parsedMinute || 0))
              });
              setPasteInput(''); // Clear input after successful parse
              showToast("识别成功: " + parsedYear + "年" + parsedMonth + "月");
          } else {
              showToast("日期数值超出范围");
          }

      } catch (err) {
          console.error(err);
          // Fallback prompt if clipboard API fails
          const manualInput = window.prompt("请粘贴日期 (如 194910011500 或 2025年1月1日 12:00)");
          if (manualInput) {
             setPasteInput(manualInput);
             // Let the user click recognize again or recursively call? 
             // Simplest: just put it in the box
          }
      }
  };

  const handleArrange = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto name generation logic
    let finalName = input.name.trim();
    let isAutoNamed = false;

    if (!finalName) {
        // Only generate new name if not editing, or if editing and name is empty (keep old name? no, generate new)
        finalName = generateNextCaseName(records);
        isAutoNamed = true;
    }

    const chart = calculateBaZi({ ...input, name: finalName });
    
    // Construct the Record object
    const recordData: Record = {
      id: editingId || Date.now().toString(), // Use existing ID if editing
      name: finalName,
      gender: input.gender,
      birthDate: `${input.year}-${input.month}-${input.day}`,
      birthTime: `${input.hour}:${input.minute}`,
      calendarType: input.calendarType,
      city: input.selectedCityKey,
      createdAt: editingId ? (records.find(r => r.id === editingId)?.createdAt || Date.now()) : Date.now(),
      chart: chart,
      notes: editingId ? (records.find(r => r.id === editingId)?.notes || '') : '',
      group: input.group || '默认分组'
    };

    setCurrentRecord(recordData);
    if (!editingId) {
        setNoteDraft(''); // Clear notes for new record
    } else {
        setNoteDraft(recordData.notes); // Preserve notes for edited record
    }
    
    if (input.autoSave) {
        let newRecords;
        if (editingId) {
            // Update existing
            newRecords = records.map(r => r.id === editingId ? recordData : r);
            showToast("案例已更新");
        } else {
            // Create new
            newRecords = [recordData, ...records];
            setEditingId(recordData.id); // Switch to editing mode for the new record
        }
        saveRecordsToStorage(newRecords);
    }

    if (isAutoNamed && !editingId) {
        setInput(prev => ({ ...prev, name: '' }));
    } else {
        setInput(prev => ({ ...prev, name: finalName }));
    }

    setView('chart');
  };

  const handleSaveRecord = () => {
    if (!currentRecord) return;
    const updatedRecord = { ...currentRecord, notes: noteDraft };
    const exists = records.find(r => r.id === updatedRecord.id);
    let newRecords;
    if (exists) {
      newRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    } else {
      newRecords = [updatedRecord, ...records];
    }
    saveRecordsToStorage(newRecords);
    setCurrentRecord(updatedRecord);
    
    showToast("保存成功");
  };

  const handleAIAnalyze = async () => {
    if (!currentRecord) return;
    setIsAnalyzing(true);
    const analysis = await analyzeBaZi(currentRecord);
    const timestamp = new Date().toLocaleString();
    const newNotes = (noteDraft ? noteDraft + `\n\n` : "") + `--- AI 大师分析 (${timestamp}) ---\n` + analysis;
    
    setNoteDraft(newNotes);
    const updatedRecord = { ...currentRecord, notes: newNotes };
    const newRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    saveRecordsToStorage(newRecords);
    setCurrentRecord(updatedRecord);
    
    setIsAnalyzing(false);
  };

  const loadRecord = (rec: Record) => {
    setCurrentRecord(rec);
    setNoteDraft(rec.notes);
    
    // Populate form inputs so going back shows the record details
    const [y, m, d] = rec.birthDate.split('-').map(Number);
    const [h, min] = rec.birthTime.split(':').map(Number);
    
    setInput({
      ...input,
      name: rec.name,
      gender: rec.gender,
      year: y, month: m, day: d, hour: h, minute: min,
      calendarType: rec.calendarType || CalendarType.SOLAR,
      selectedCityKey: rec.city || '不参考出生地 (北京时间)',
      group: rec.group === '默认分组' ? '' : (rec.group || '')
    });

    // Important: Do NOT set editingId for simple viewing.
    // This ensures that "Back" -> "Arrange" creates a new copy or just views inputs,
    // rather than updating the historical record.
    setEditingId(null); 
    
    setView('chart');
    setHistoryOpen(false);
  };
  
  const handleEditRecord = (rec: Record) => {
    setEditingId(rec.id);
    setNoteDraft(rec.notes);
    const [y,m,d] = rec.birthDate.split('-').map(Number);
    const [h,min] = rec.birthTime.split(':').map(Number);
    
    setInput({
      ...input,
      name: rec.name,
      gender: rec.gender,
      year: y, month: m, day: d, hour: h, minute: min,
      calendarType: rec.calendarType || CalendarType.SOLAR,
      selectedCityKey: rec.city || '不参考出生地 (北京时间)',
      group: rec.group === '默认分组' ? '' : (rec.group || '')
    });
    
    setView('form');
    setHistoryOpen(false);
    showToast("已加载档案，请修改后排盘");
  };

  const deleteRecord = (id: string) => {
    if (window.confirm("确定删除此记录吗？")) {
      const newRecords = records.filter(r => r.id !== id);
      saveRecordsToStorage(newRecords);
      if (currentRecord?.id === id) {
        setView('form');
        setCurrentRecord(null);
        setEditingId(null);
      }
    }
  };

  // --- Backup & Restore Logic ---

  const handleBackup = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (records.length === 0) {
          alert("暂无记录可备份");
          return;
      }
      
      const fileName = `bazi_backup_${new Date().toISOString().slice(0,10)}.json`;
      const dataStr = JSON.stringify(records, null, 2);
      
      // Strategy 1: Web Share API with File
      if (navigator.canShare && navigator.share) {
          try {
              const file = new File([dataStr], fileName, { type: 'application/json' });
              const shareData = {
                  files: [file],
                  title: '八字数据备份',
              };
              if (navigator.canShare(shareData)) {
                  await navigator.share(shareData);
                  return;
              }
          } catch (err) {
              console.warn("Share File failed", err);
          }
      }

      // Strategy 2: Legacy Download
      try {
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast("已尝试下载备份文件");
          return;
      } catch (err) {
          console.warn("Legacy download failed", err);
      }
      
      // Strategy 3: Clipboard Fallback
      try {
          await navigator.clipboard.writeText(dataStr);
          alert("因系统限制无法直接导出文件。备份数据已复制到剪贴板，请粘贴到备忘录保存。");
      } catch (err) {
          alert("备份失败：无法导出文件也无法复制到剪贴板。");
      }
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = event.target?.result as string;
              const parsed = JSON.parse(json);
              
              if (Array.isArray(parsed)) {
                  const existingIds = new Set(records.map(r => r.id));
                  const newUniqueRecords = parsed.filter((r: Record) => !existingIds.has(r.id));
                  const combinedRecords = [...newUniqueRecords, ...records];
                  combinedRecords.sort((a, b) => b.createdAt - a.createdAt);
                  
                  saveRecordsToStorage(combinedRecords);
                  showToast(`成功导入 ${newUniqueRecords.length} 条记录`);
                  setShowSettings(false);
              } else {
                  alert("文件格式不正确");
              }
          } catch (err) {
              console.error(err);
              alert("导入失败：文件格式错误");
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };


  const handleSearchDates = () => {
      const p = pillars;
      if (!p.yGan || !p.yZhi || !p.mGan || !p.mZhi || !p.dGan || !p.dZhi || !p.hGan || !p.hZhi) {
          alert("请完整选择四柱干支");
          return;
      }

      setIsSearching(true);
      setTimeout(() => {
          const results = findDatesFromPillars(
              p.yGan, p.yZhi, p.mGan, p.mZhi,
              p.dGan, p.dZhi, p.hGan, p.hZhi
          );
          setFoundDates(results);
          setIsSearching(false);
          setShowDateResults(true);
      }, 100);
  };

  const selectFoundDate = (d: MatchingDate) => {
      setInput({
          ...input,
          calendarType: CalendarType.SOLAR,
          year: d.year, month: d.month, day: d.day, hour: d.hour, minute: 0,
          selectedCityKey: '不参考出生地 (北京时间)'
      });
      setInputMode('date');
      setShowDateResults(false);
  };

  const handleModeSwitch = (mode: 'SOLAR' | 'LUNAR' | 'MANUAL') => {
      if (mode === 'MANUAL') {
          setInputMode('manual');
      } else {
          setInputMode('date');
          setInput({ 
              ...input, 
              calendarType: mode === 'SOLAR' ? CalendarType.SOLAR : CalendarType.LUNAR,
              minute: mode === 'SOLAR' ? input.minute : 0 
          });
      }
  };

  const getCurrentModeKey = () => {
      if (inputMode === 'manual') return 'MANUAL';
      return input.calendarType === CalendarType.SOLAR ? 'SOLAR' : 'LUNAR';
  };

  const getFilteredZhi = (selectedGan: string) => {
      if (!selectedGan) return [];
      const ganIdx = GAN.indexOf(selectedGan);
      if (ganIdx === -1) return ZHI;
      const isYang = ganIdx % 2 === 0;
      return ZHI.filter((_, idx) => (idx % 2 === 0) === isYang);
  };

  const renderInputGroup = (content: React.ReactNode) => (
    <div className="mb-4 px-2">
       {content}
    </div>
  );
  
  // Helpers for 1:1 Display
  const getDisplayData = () => {
    if (!currentBaZi) return null;
    const year = input.year; // Use input directly
    const month = String(input.month).padStart(2, '0');
    const day = String(input.day).padStart(2, '0');
    const hour = String(input.hour).padStart(2, '0');
    const minute = String(input.minute).padStart(2, '0');
    
    // Format Lunar: "2025年十月十七 酉时"
    const lunarParts = currentBaZi.lunarDateStr.replace('农历', '').split('年');
    const lunarRest = lunarParts[1] || ''; 
    const [lunarDate, lunarTimePart] = lunarRest.split(', ');
    const lunarDisplay = `农历: ${year}年${lunarDate} ${lunarTimePart}`;
    
    const solarDisplay = `公历: ${year}年${month}月${day}日 ${hour}:${minute}`;
    
    return { lunarDisplay, solarDisplay };
  };

  const displayData = getDisplayData();

  const renderForm = () => {
    const uniqueGroups = Array.from(new Set(records.map(r => r.group || '默认分组')))
        .filter(g => g !== '默认分组')
        .sort();
    
    return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto px-4 pt-[env(safe-area-inset-top)] font-sans bg-[#fff8ea]">
      <div className="text-center mb-4 pt-4 relative">
        <h1 className="text-3xl font-calligraphy text-[#8B0000] mb-0 drop-shadow-sm">玄青君八字</h1>
        <p className="text-[#5c4033] text-[9px] uppercase tracking-[0.3em] opacity-70">SIZHUBAZI</p>
      </div>

      <form onSubmit={handleArrange} className="relative mt-2 flex flex-col flex-1">
        
        {renderInputGroup(
            <div className="flex gap-4 items-end border-b border-[#d6cda4] pb-2">
                <input type="text" placeholder="请输入姓名 (为空则自动命名)" value={input.name}
                    onChange={e => setInput({ ...input, name: e.target.value })}
                    className="flex-1 bg-transparent text-[#450a0a] focus:text-[#8B0000] outline-none text-lg placeholder-[#d6cda4]"
                />
                <div className="flex gap-2 shrink-0">
                    {[Gender.MALE, Gender.FEMALE].map((g) => (
                    <button key={g} type="button" onClick={() => setInput({ ...input, gender: g })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                            input.gender === g 
                            ? 'bg-[#8B0000] text-[#fff8ea] border-[#8B0000]' 
                            : 'bg-transparent text-[#a89f91] border-transparent hover:text-[#5c4033]'
                        }`}>
                        {g}
                    </button>
                    ))}
                </div>
            </div>
        )}

        <div className="flex justify-center mb-6">
            <div className="flex gap-1">
                {[
                    { key: 'SOLAR', label: '公历' },
                    { key: 'LUNAR', label: '农历' },
                    { key: 'MANUAL', label: '八字反推' }
                ].map((mode) => (
                    <button 
                        key={mode.key} 
                        type="button" 
                        onClick={() => handleModeSwitch(mode.key as any)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                            getCurrentModeKey() === mode.key 
                            ? 'text-[#8B0000] bg-[#eaddcf]/50' 
                            : 'text-[#a89f91] hover:text-[#5c4033]'
                        }`}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="px-2 mb-4">
            {inputMode === 'date' ? (
                <div className="space-y-2">
                     {/* Smart Recognition Bar */}
                     <div className="flex justify-between items-center px-2 mb-2 gap-2">
                         <input 
                             value={pasteInput}
                             onChange={(e) => setPasteInput(e.target.value)}
                             placeholder="格式：194910011500"
                             className="flex-1 bg-transparent border-b border-[#d6cda4] text-[10px] text-[#5c4033] placeholder-[#d6cda4] outline-none py-1"
                         />
                         <button 
                            type="button"
                            onClick={handleSmartPaste}
                            className="flex items-center gap-1 text-[10px] text-[#8B0000] bg-[#eaddcf]/40 hover:bg-[#eaddcf] px-2 py-1 rounded-full transition-colors whitespace-nowrap"
                         >
                            <FileText size={12} /> 识别日期
                         </button>
                     </div>

                     {/* Wheel Picker Interface */}
                     <div className="flex items-center justify-between">
                         <WheelPicker 
                             options={yearOptions} 
                             value={input.year} 
                             onChange={(v) => setInput({ ...input, year: Number(v) })} 
                             label="年"
                             className="flex-1"
                             expanded={isPickerExpanded}
                             onInteract={() => setIsPickerExpanded(true)}
                         />
                         <WheelPicker 
                             options={monthOptions} 
                             value={input.month} 
                             onChange={(v) => setInput({ ...input, month: Number(v) })} 
                             label={input.calendarType === CalendarType.SOLAR ? "月" : ""}
                             className="flex-1"
                             expanded={isPickerExpanded}
                             onInteract={() => setIsPickerExpanded(true)}
                         />
                         <WheelPicker 
                             options={dayOptions} 
                             value={input.day} 
                             onChange={(v) => setInput({ ...input, day: Number(v) })} 
                             label={input.calendarType === CalendarType.SOLAR ? "日" : ""}
                             className="flex-1"
                             expanded={isPickerExpanded}
                             onInteract={() => setIsPickerExpanded(true)}
                         />
                         <WheelPicker 
                             options={hourOptions} 
                             value={input.hour} 
                             onChange={(v) => setInput({ ...input, hour: Number(v) })} 
                             label={input.calendarType === CalendarType.SOLAR ? "时" : ""}
                             className="flex-1"
                             expanded={isPickerExpanded}
                             onInteract={() => setIsPickerExpanded(true)}
                         />
                         {input.calendarType === CalendarType.SOLAR && (
                             <WheelPicker 
                                 options={minuteOptions} 
                                 value={input.minute} 
                                 onChange={(v) => setInput({ ...input, minute: Number(v) })} 
                                 label="分"
                                 className="flex-1"
                                 expanded={isPickerExpanded}
                                 onInteract={() => setIsPickerExpanded(true)}
                             />
                         )}
                     </div>
                     
                     {/* 1:1 Current BaZi Display & Settings */}
                     {currentBaZi && displayData && (
                         <div className="mt-6 mb-2 flex justify-between items-start px-2">
                             {/* Left: BaZi & Dates */}
                             <div className="flex flex-col gap-0.5">
                                 <div className="flex gap-5 pl-1">
                                     {[currentBaZi.year, currentBaZi.month, currentBaZi.day, currentBaZi.hour].map((p, i) => (
                                         <div key={i} className="flex flex-col items-center gap-1">
                                             <span className={`text-xl font-light leading-none ${ELEMENT_COLORS[p.stemElement]}`}>{p.stem}</span>
                                             <span className={`text-xl font-light leading-none ${ELEMENT_COLORS[p.branchElement]}`}>{p.branch}</span>
                                         </div>
                                     ))}
                                 </div>
                                 <div className="text-[10px] text-stone-400 leading-tight font-sans tracking-wide pl-1 mt-0.5">
                                     <div>{displayData.lunarDisplay}</div>
                                     <div>{displayData.solarDisplay}</div>
                                 </div>
                             </div>

                             {/* Right: Settings */}
                             <div className="flex flex-col gap-3 pt-1">
                                 <label className="flex items-center justify-end gap-2 cursor-pointer group select-none">
                                    <span className="text-[11px] text-[#5c4033] group-hover:text-[#8B0000] transition-colors">早晚子时</span>
                                    <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${input.processEarlyLateRat ? 'bg-[#8B0000] border-[#8B0000]' : 'border-[#a89f91]'}`}>
                                        {input.processEarlyLateRat && <Check size={8} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" 
                                        checked={input.processEarlyLateRat} 
                                        onChange={(e) => setInput({...input, processEarlyLateRat: e.target.checked})} 
                                    />
                                </label>

                                <label className="flex items-center justify-end gap-2 cursor-pointer group select-none">
                                    <span className="text-[11px] text-[#5c4033] group-hover:text-[#8B0000] transition-colors">保存案例</span>
                                    <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${input.autoSave ? 'bg-[#8B0000] border-[#8B0000]' : 'border-[#a89f91]'}`}>
                                        {input.autoSave && <Check size={8} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" 
                                        checked={input.autoSave} 
                                        onChange={(e) => setInput({...input, autoSave: e.target.checked})} 
                                    />
                                </label>
                             </div>
                         </div>
                     )}

                     <div className="flex items-center gap-3 border-b border-[#d6cda4] pb-2 mt-4">
                        <MapPin className="text-[#a89f91]" size={16} />
                        <select value={input.selectedCityKey} onChange={(e) => setInput({...input, selectedCityKey: e.target.value})}
                            className="flex-1 bg-transparent text-[#450a0a] text-sm outline-none">
                            {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                     </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                         {['年','月','日','时'].map((t,i) => (
                             <div key={i} className="text-center text-[#8c7b75] text-xs font-serif">{t}柱</div>
                         ))}
                         <div className="col-span-4 grid grid-cols-4 gap-4">
                             {[
                                 [pillars.yGan, pillars.yZhi, 'yGan', 'yZhi'],
                                 [pillars.mGan, pillars.mZhi, 'mGan', 'mZhi'],
                                 [pillars.dGan, pillars.dZhi, 'dGan', 'dZhi'],
                                 [pillars.hGan, pillars.hZhi, 'hGan', 'hZhi']
                             ].map(([gVal, zVal, gKey, zKey]: any, idx) => {
                                 const gColor = gVal ? ELEMENT_COLORS[STEM_ELEMENTS[gVal]] : 'text-[#a89f91]';
                                 const zColor = zVal ? ELEMENT_COLORS[BRANCH_ELEMENTS[zVal]] : 'text-[#a89f91]';
                                 const filteredZhi = getFilteredZhi(gVal);

                                 return (
                                 <div key={idx} className="flex flex-col gap-3">
                                     <div className="relative border-b border-[#d6cda4]">
                                         <select 
                                            className={`w-full bg-transparent text-center appearance-none text-xl font-bold py-1 outline-none ${gColor}`}
                                            value={gVal} 
                                            onChange={e => {
                                                setPillars({...pillars, [gKey]: e.target.value, [zKey]: ''});
                                            }}
                                         >
                                            <option value="">-</option>
                                            {GAN.map(g => (
                                                <option key={g} value={g} className={ELEMENT_COLORS[STEM_ELEMENTS[g]]}>{g}</option>
                                            ))}
                                         </select>
                                     </div>

                                     <div className="relative border-b border-[#d6cda4]">
                                        <select 
                                            className={`w-full bg-transparent text-center appearance-none text-xl font-bold py-1 outline-none ${zColor}`}
                                            value={zVal} 
                                            onChange={e => setPillars({...pillars, [zKey]: e.target.value})}
                                            disabled={!gVal}
                                         >
                                            <option value="">-</option>
                                            {filteredZhi.map(z => (
                                                <option key={z} value={z} className={ELEMENT_COLORS[BRANCH_ELEMENTS[z]]}>{z}</option>
                                            ))}
                                         </select>
                                     </div>
                                 </div>
                             )})}
                         </div>
                    </div>
                    
                    <div className="flex justify-end mt-2 px-1">
                        <label className="flex items-center gap-2 cursor-pointer group select-none">
                            <span className="text-[11px] text-[#5c4033] group-hover:text-[#8B0000] transition-colors">保存案例</span>
                            <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${input.autoSave ? 'bg-[#8B0000] border-[#8B0000]' : 'border-[#a89f91]'}`}>
                                {input.autoSave && <Check size={8} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" 
                                checked={input.autoSave} 
                                onChange={(e) => setInput({...input, autoSave: e.target.checked})} 
                            />
                        </label>
                    </div>

                    <Button type="button" onClick={handleSearchDates} isLoading={isSearching} variant="secondary" className="text-xs py-2 mt-2 bg-[#eaddcf]/50 border-none shadow-none text-[#5c4033] hover:text-[#8B0000]">
                        <Search size={14} className="mr-2" /> 查询匹配日期
                    </Button>
                    
                    {showDateResults && (
                        <div className="absolute inset-x-4 top-20 z-50 bg-[#fff8ea] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-[#8B0000] max-h-[60vh]">
                            <div className="p-2 bg-[#8B0000] text-white flex justify-between items-center">
                                <h3 className="font-bold text-xs">匹配日期 ({foundDates.length})</h3>
                                <button onClick={() => setShowDateResults(false)}><X size={16}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white">
                                {foundDates.length === 0 ? (
                                    <div className="text-center text-stone-500 mt-4 text-xs">未找到匹配日期</div>
                                ) : (
                                    foundDates.map((d, idx) => (
                                        <button key={idx} onClick={() => selectFoundDate(d)}
                                            className="w-full bg-[#fffcf5] border border-[#d6cda4] p-2 rounded text-left hover:bg-[#f5ecd5] transition-colors">
                                            <div className="text-[#8B0000] font-bold text-sm">{d.year}年{d.month}月{d.day}日 <span className="text-stone-600 text-xs ml-2">{d.hour}时</span></div>
                                            <div className="text-[#5c4033] text-xs mt-1 font-mono bg-[#eaddcf] inline-block px-1 rounded">{d.ganZhi}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* RESTORED: Case Grouping Input */}
        <div className="relative mb-2 px-2 z-20">
            <div className="flex items-center gap-3 border-b border-[#d6cda4] pb-2">
                <FolderInput className="text-[#a89f91]" size={16} />
                <div className="flex-1 relative">
                     <input
                         type="text"
                         value={input.group}
                         onChange={(e) => setInput({...input, group: e.target.value})}
                         onFocus={() => {
                             setShowGroupSuggestions(true);
                             setIsPickerExpanded(false);
                         }}
                         onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
                         placeholder="输入或选择分组 (默认)"
                         className="w-full bg-transparent outline-none text-[#450a0a] text-sm"
                     />
                     <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#d6cda4] pointer-events-none" />
                </div>
            </div>
            {showGroupSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#fffcf5] border border-[#d6cda4] rounded shadow-lg max-h-40 overflow-y-auto z-30">
                     {['默认分组', ...uniqueGroups].map(g => (
                         <button
                             key={g}
                             type="button"
                             className="w-full text-left px-4 py-2 text-sm text-[#5c4033] hover:bg-[#eaddcf] hover:text-[#8B0000] transition-colors border-b border-[#f0ebda] last:border-0"
                             onClick={() => setInput({...input, group: g === '默认分组' ? '' : g})}
                         >
                             {g}
                         </button>
                     ))}
                </div>
            )}
        </div>

        <div className="flex-1"></div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 bg-[#fff8ea] z-30 pb-6 pt-2 px-1 border-t border-[#d6cda4]/30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2">
                <div className="flex-[1] flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowSettings(true)}
                        className="p-1.5 text-[#a89f91] hover:text-[#8B0000] hover:bg-[#eaddcf]/30 rounded-full transition-colors"
                    >
                    <Settings size={20} />
                    </button>
                </div>

                <Button onClick={handleArrange} className="flex-[7] h-9 p-0 text-base shadow-lg">
                    {editingId ? '更新排盘' : '立刻排盘'}
                </Button>
                
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setHistoryOpen(true)}
                    className="flex-[2] h-9 p-0 text-xs shadow-md border-[#d6cda4]"
                >
                    命例
                </Button>
            </div>
        </div>

      </form>
    </div>
    );
  };

  const renderChart = () => {
    if (!currentRecord) return null;
    const { chart } = currentRecord;
    const currentYear = new Date().getFullYear();

    let currentDaYunStr = "运前";
    if (chart.daYun.length > 0) {
        if (currentYear < chart.daYun[0].startYear) {
            currentDaYunStr = "运前";
        } else {
            const activeYun = chart.daYun.find((yun, idx) => {
                const nextYun = chart.daYun[idx + 1];
                return currentYear >= yun.startYear && (!nextYun || currentYear < nextYun.startYear);
            });
            if (activeYun) {
                currentDaYunStr = activeYun.ganZhi;
            } else {
                currentDaYunStr = chart.daYun[chart.daYun.length - 1].ganZhi; 
            }
        }
    }

    return (
      <div className="flex flex-col min-h-screen bg-[#fffbe6] pb-20 font-sans text-[#1c1917] select-none">
        {toastMsg && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-lg z-[80] flex items-center gap-2 shadow-2xl animate-fadeIn">
                <Check size={20} className="text-green-400" />
                <span className="font-bold">{toastMsg}</span>
            </div>
        )}

        <div className="sticky top-0 z-20 bg-[#961c1c] border-b border-[#700f0f] flex justify-between items-center h-auto min-h-[48px] pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 px-2 shadow-md">
           {/* Custom Wide Chevron Back Button */}
           <button onClick={() => { setView('form'); setEditingId(null); }} className="px-3 py-2 text-white hover:text-white/80 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4l-8 8 8 8" />
              </svg>
           </button>
           <h1 className="font-calligraphy text-2xl text-white tracking-widest drop-shadow-md">玄青君八字</h1>
           <button onClick={() => setHistoryOpen(true)} className="p-1 text-white hover:text-white/80 transition-colors">
              <Menu size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
            
            <div className="space-y-1 text-[15px] leading-tight text-[#333]">
                <div>出生时间：{chart.solarDateStr}</div>
                <div>出生时间：{chart.lunarDateStr}</div>
                <div>
                    出生于 <span className="text-green-700 font-bold">{chart.solarTermStr.replace('出生于', '')} [节气]</span>
                    <span className="ml-2 text-stone-500 text-sm">空亡：{chart.dayKongWang}</span>
                </div>
            </div>

            {/* Shift content left by removing padding-left and adjusting margin */}
            <div className="mt-2 pl-0">
                <div className="flex gap-2">
                    <div className="w-10 flex items-start justify-start text-[15px] font-bold text-[#1c1917] mt-1 whitespace-nowrap pl-1">
                        {currentRecord.gender}：
                    </div>

                    {/* Grid adjustments */}
                    <div className="grid grid-cols-4 gap-0 text-center relative w-full max-w-[320px]">
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`ny-${i}`} className="text-[15px] text-[#4a4a4a] h-6">{p.naYin}</div>
                         ))}
                         
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`tg-${i}`} className="text-[15px] text-[#4a4a4a] h-6">{p.stemTenGod}</div>
                         ))}
                         
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`s-${i}`} className={`text-2xl font-bold ${ELEMENT_COLORS[p.stemElement]}`}>
                                 {p.stem}
                             </div>
                         ))}
                         
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`b-${i}`} className={`text-2xl font-bold ${ELEMENT_COLORS[p.branchElement]}`}>
                                 {p.branch}
                             </div>
                         ))}
                         
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`hs-${i}`} className="flex flex-col items-center mt-1 space-y-0.5">
                                 {p.hiddenStems.map((hs, idx) => (
                                     <div key={idx} className="flex gap-0.5 items-center text-[15px] leading-none">
                                         <span className={`${ELEMENT_COLORS[hs.element]}`}>{hs.stem}</span>
                                         <span className="text-[#666] scale-90 origin-left">{hs.tenGod}</span>
                                     </div>
                                 ))}
                             </div>
                         ))}
                         
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`ls-${i}`} className="mt-2 text-[15px] text-[#333]">{p.lifeStage}</div>
                         ))}
                    </div>
                </div>
            </div>

            <div className="mt-1 space-y-0.5 text-[15px] leading-snug">
                <div className="flex gap-2">
                    <span className="text-green-700">司令: {chart.renYuanSiLing} [设置]</span>
                </div>
            </div>

            <div className="mt-1 text-[15px]">
                <div className="text-[#333]">{chart.startLuckText} <span className="text-green-600">[设置]</span></div>
                <div className="text-[#333]">即每逢乙年清明后第7日交脱大运, 当前: <span className="text-[#8B0000] font-bold">{currentDaYunStr}</span></div>
            </div>

            <div className="mt-1 overflow-x-auto touch-pan-x">
                <div className="min-w-max">
                     <div className="flex">
                         <div className="flex flex-col w-12 items-center shrink-0">
                             <div className="h-4"></div>
                             <div className="h-4"></div>
                             {(() => {
                                 const isCurrentYunQian = chart.yunQian.some(y => y.year === currentYear);
                                 const highlightColor = 'text-[#8B0000]'; 
                                 
                                 return (
                                     <>
                                        <div className={`h-8 flex items-center justify-center font-bold text-lg ${isCurrentYunQian ? highlightColor : 'text-[#1c1917]'}`}>运前</div>
                                        <div className="h-4 text-[15px] text-[#333]">1</div>
                                        <div className="h-4 text-[15px] text-[#333]">{chart.yunQian[0]?.year}</div>
                                        
                                        <div className="mt-2 flex flex-col items-center gap-1 touch-pan-y">
                                            {chart.yunQian.map((yn, idx) => {
                                                const isCurrent = yn.year === currentYear;
                                                const textColor = isCurrentYunQian 
                                                    ? (isCurrent ? `${highlightColor} font-bold` : highlightColor) 
                                                    : 'text-[#333]';
                                                
                                                return (
                                                    <div key={idx} className={`flex items-center justify-center h-[18px] ${textColor}`}>
                                                        <span className="text-[15px] tracking-widest">{yn.ganZhi}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                     </>
                                 );
                             })()}
                         </div>

                         {chart.daYun.map((yun, idx) => {
                             const nextYun = chart.daYun[idx + 1];
                             const isCurrentDaYun = currentYear >= yun.startYear && (!nextYun || currentYear < nextYun.startYear);
                             const highlightColor = 'text-[#8B0000]'; 
                             
                             return (
                             <div key={yun.index} className="flex flex-col w-12 items-center shrink-0">
                                 <div className="h-4 text-[15px] text-[#333] scale-90 whitespace-nowrap">{yun.naYin}</div>
                                 <div className="h-4 text-[15px] text-[#333]">{yun.stemTenGod}</div>
                                 
                                 <div className={`h-8 flex items-center justify-center ${isCurrentDaYun ? highlightColor : 'text-[#1c1917]'} font-bold`}>
                                     <span className="text-lg tracking-wide">{yun.ganZhi}</span> 
                                 </div>
                                 
                                 <div className="h-4 text-[15px] text-[#333]">{yun.startAge}</div>
                                 <div className="h-4 text-[15px] text-[#333]">{yun.startYear}</div>

                                 <div className="mt-2 flex flex-col items-center gap-1 touch-pan-y">
                                     {yun.liuNian.map((ln, lnIdx) => {
                                         const isCurrentLiuNian = ln.year === currentYear;
                                         const baseColor = isCurrentDaYun ? highlightColor : 'text-[#333]';
                                         const textColor = isCurrentLiuNian ? `${highlightColor} font-bold` : baseColor;
                                         
                                         return (
                                            <div key={lnIdx} className={`flex items-center justify-center h-[18px] ${textColor}`}>
                                                <span className="text-[15px] tracking-widest">{ln.ganZhi}</span>
                                            </div>
                                         );
                                     })}
                                 </div>
                             </div>
                         )})}
                     </div>
                </div>
            </div>

            <div className="mt-8 mb-6 px-2">
                <div className="bg-white/60 border border-[#d6cda4] rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#e5e0d0]">
                        <h3 className="font-bold text-[#8B0000] text-[17px] flex items-center gap-2">
                            <Edit3 size={18}/> 命理师批注
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleAIAnalyze} 
                                className="text-[10px] px-2 py-1 bg-[#eaddcf] text-[#5c4033] rounded hover:bg-[#d6cda4] transition-colors"
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? "AI推算中..." : "AI辅助批注"}
                            </button>
                            <button 
                                onClick={handleSaveRecord} 
                                className="text-[10px] px-3 py-1 bg-[#8B0000] text-white rounded shadow-sm hover:bg-[#7a0000] transition-colors"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                    <textarea
                        ref={textareaRef}
                        className="w-full min-h-[120px] bg-transparent outline-none resize-none text-[17px] leading-relaxed text-[#450a0a] placeholder-[#a89f91] overflow-hidden"
                        placeholder="在此输入命理分析..."
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                    />
                </div>
            </div>

        </div>
      </div>
    );
  };

  return (
    <>
      <HistoryDrawer 
        isOpen={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        records={records}
        onSelect={loadRecord}
        onEdit={handleEditRecord}
        onDelete={deleteRecord}
        onImport={handleRestoreClick}
        onBackup={handleBackup}
      />
      
      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#fffcf5] rounded-xl w-full max-w-xs border border-[#d6cda4] shadow-2xl relative overflow-hidden">
                <div className="bg-[#fff8ea] p-4 border-b border-[#e5e0d0] flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#8B0000] flex items-center gap-2">
                        <Settings size={18} /> 设置与数据
                    </h3>
                    <button onClick={() => setShowSettings(false)} className="text-[#a89f91] hover:text-[#5c4033]">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="space-y-3">
                        <label className="text-xs text-[#a89f91] font-bold uppercase tracking-wider block mb-2">数据管理</label>
                        <button 
                            type="button"
                            onClick={handleBackup}
                            className="w-full flex items-center justify-between bg-white border border-[#d6cda4] p-3 rounded-lg text-[#450a0a] hover:border-[#8B0000] hover:bg-[#fff8ea] transition-all group"
                        >
                            <span className="flex items-center gap-3 font-bold text-sm">
                                <span className="bg-[#eaddcf] p-1.5 rounded text-[#5c4033] group-hover:text-[#8B0000] transition-colors"><Download size={16}/></span>
                                备份所有数据
                            </span>
                            <ChevronRight size={16} className="text-[#d6cda4] group-hover:text-[#8B0000]"/>
                        </button>
                        
                        <button 
                            type="button"
                            onClick={handleRestoreClick}
                            className="w-full flex items-center justify-between bg-white border border-[#d6cda4] p-3 rounded-lg text-[#450a0a] hover:border-[#8B0000] hover:bg-[#fff8ea] transition-all group"
                        >
                             <span className="flex items-center gap-3 font-bold text-sm">
                                <span className="bg-[#eaddcf] p-1.5 rounded text-[#5c4033] group-hover:text-[#8B0000] transition-colors"><Upload size={16}/></span>
                                恢复数据 (导入)
                            </span>
                            <ChevronRight size={16} className="text-[#d6cda4] group-hover:text-[#8B0000]"/>
                        </button>
                    </div>

                    <div className="bg-[#fdfbf6] p-3 rounded border border-[#f0ebda] text-[11px] text-[#8c7b75] leading-relaxed">
                        <p className="flex items-start gap-1">
                            <FileText size={12} className="mt-0.5 shrink-0"/>
                            更新 App 前，请先点击“备份”将数据保存到手机“文件”中。如果无反应，将自动复制到剪贴板，请粘贴保存。更新完成后，点击“恢复”导入。
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".json,application/json"
      />

      {view === 'form' ? renderForm() : renderChart()}
    </>
  );
}

export default App;