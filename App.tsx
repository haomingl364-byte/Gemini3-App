
import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Save, Settings, MapPin, Calendar, RotateCcw, ArrowLeft, Search, X, Fingerprint, FolderInput, ChevronDown, Check, BookOpen, ChevronRight, Edit3 } from 'lucide-react';
import { UserInput, Gender, Record, CalendarType } from './types';
import { calculateBaZi, findDatesFromPillars, MatchingDate } from './services/baziCalculator';
import { analyzeBaZi } from './services/geminiService';
// Added STEM_ELEMENTS and BRANCH_ELEMENTS to imports
import { APP_STORAGE_KEY, ELEMENT_COLORS, CITIES, GAN, ZHI, LUNAR_MONTHS, LUNAR_DAYS, LUNAR_TIMES, STEM_ELEMENTS, BRANCH_ELEMENTS } from './constants';
import { Button } from './components/Button';
import { HistoryDrawer } from './components/HistoryDrawer';

const initialInput: UserInput = {
  name: '',
  gender: Gender.MALE,
  calendarType: CalendarType.SOLAR,
  year: 1990,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
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

const initialPillars: PillarSelection = {
    yGan: '甲', yZhi: '子',
    mGan: '丙', mZhi: '寅',
    dGan: '戊', dZhi: '辰',
    hGan: '壬', hZhi: '子'
};

function App() {
  const [view, setView] = useState<'form' | 'chart'>('form');
  const [inputMode, setInputMode] = useState<'date' | 'manual'>('date');
  const [input, setInput] = useState<UserInput>(initialInput);
  
  const [pillars, setPillars] = useState<PillarSelection>(initialPillars);
  const [foundDates, setFoundDates] = useState<MatchingDate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDateResults, setShowDateResults] = useState(false);

  const [currentRecord, setCurrentRecord] = useState<Record | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  const years = Array.from({length: 150}, (_, i) => 1900 + i);
  const hours = Array.from({length: 24}, (_, i) => i);
  const minutes = Array.from({length: 60}, (_, i) => i);
  
  useEffect(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) {
      try { setRecords(JSON.parse(saved)); } catch (e) { console.error("Failed to load records"); }
    }
  }, []);

  const saveRecordsToStorage = (newRecords: Record[]) => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newRecords));
    setRecords(newRecords);
  };

  const handleArrange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.name) { alert("请输入姓名"); return; }
    const chart = calculateBaZi(input);
    const newRecord: Record = {
      id: Date.now().toString(),
      name: input.name || '未命名',
      gender: input.gender,
      birthDate: `${input.year}-${input.month}-${input.day}`,
      birthTime: `${input.hour}:${input.minute}`,
      calendarType: input.calendarType,
      city: input.selectedCityKey,
      createdAt: Date.now(),
      chart: chart,
      notes: '',
      group: input.group || '默认分组'
    };
    setCurrentRecord(newRecord);
    setNoteDraft('');
    if (input.autoSave) {
        const newRecs = [newRecord, ...records];
        saveRecordsToStorage(newRecs);
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
    setShowNotesModal(false);
  };

  const handleAIAnalyze = async () => {
    if (!currentRecord) return;
    setIsAnalyzing(true);
    // If we are in the modal, keep it open, otherwise maybe just fill the text area
    // With the new layout, we might just want to fill the noteDraft and let user see it in the bottom section
    // But keeping the modal for full view is also fine.
    // Let's update noteDraft and save.
    
    const analysis = await analyzeBaZi(currentRecord);
    const timestamp = new Date().toLocaleString();
    const newNotes = (noteDraft ? noteDraft + `\n\n` : "") + `--- AI 大师分析 (${timestamp}) ---\n` + analysis;
    
    setNoteDraft(newNotes);
    
    // Auto save after AI
    const updatedRecord = { ...currentRecord, notes: newNotes };
    const newRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    saveRecordsToStorage(newRecords);
    setCurrentRecord(updatedRecord);
    
    setIsAnalyzing(false);
  };

  const loadRecord = (rec: Record) => {
    setCurrentRecord(rec);
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
    setHistoryOpen(false); // Close drawer on selection
    setView('chart');
  };

  const deleteRecord = (id: string) => {
    if (window.confirm("确定删除此记录吗？")) {
      const newRecords = records.filter(r => r.id !== id);
      saveRecordsToStorage(newRecords);
      if (currentRecord?.id === id) {
        setView('form');
        setCurrentRecord(null);
      }
    }
  };

  const handleSearchDates = () => {
      setIsSearching(true);
      setTimeout(() => {
          const results = findDatesFromPillars(
              pillars.yGan, pillars.yZhi, pillars.mGan, pillars.mZhi,
              pillars.dGan, pillars.dZhi, pillars.hGan, pillars.hZhi
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
              // Reset minute to 0 if switching to Lunar to keep it clean
              minute: mode === 'SOLAR' ? input.minute : 0 
          });
      }
  };

  const getCurrentModeKey = () => {
      if (inputMode === 'manual') return 'MANUAL';
      return input.calendarType === CalendarType.SOLAR ? 'SOLAR' : 'LUNAR';
  };

  // --- Computed Options ---
  const lunarTimeOptions = useMemo(() => {
    if (input.processEarlyLateRat) {
        return LUNAR_TIMES;
    }
    return LUNAR_TIMES.filter(t => t.value !== 23).map(t => 
        t.value === 0 ? { ...t, name: '子时 (23:00-01:00)' } : t
    );
  }, [input.processEarlyLateRat]);


  // --- UI Renders ---

  const renderInputGroup = (label: string | null, content: React.ReactNode) => (
    <div className="bg-white/80 border border-[#d6cda4] rounded-lg overflow-hidden mb-2 shadow-sm">
       {label && (
           <div className="bg-[#fffcf5] px-3 py-1.5 border-b border-[#ebe5ce] flex items-center gap-2">
              <span className="w-1 h-3 bg-[#8B0000] rounded-full"></span>
              <span className="text-xs text-[#5c4033] font-bold tracking-wider">{label}</span>
           </div>
       )}
       <div className="p-2">
          {content}
       </div>
    </div>
  );

  const getMonthOptions = () => {
      if (input.calendarType === CalendarType.LUNAR) {
          return LUNAR_MONTHS.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>);
      }
      return Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>);
  };
  const getDayOptions = () => {
      if (input.calendarType === CalendarType.LUNAR) {
          return LUNAR_DAYS.map((d, idx) => <option key={idx} value={idx + 1}>{d}</option>);
      }
      return Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}日</option>);
  };

  const renderForm = () => {
    const uniqueGroups = Array.from(new Set(records.map(r => r.group || '默认分组')))
        .filter(g => g !== '默认分组')
        .sort();
    
    return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto px-4 pt-2 pb-6 font-sans">
      <div className="text-center mb-1">
        <h1 className="text-3xl font-calligraphy text-[#8B0000] mb-0 drop-shadow-sm">玄青君八字</h1>
        <p className="text-[#5c4033] text-[9px] uppercase tracking-[0.3em] opacity-70">SIZHUBAZI</p>
      </div>

      <form onSubmit={handleArrange} className="relative mt-2 flex flex-col flex-1">
        {/* Form contents omitted for brevity as they are unchanged - keeping same input structure */}
        {renderInputGroup(null, (
            <div className="flex gap-3 items-center">
                <input type="text" placeholder="请输入姓名" value={input.name}
                    onChange={e => setInput({ ...input, name: e.target.value })}
                    className="flex-1 bg-transparent border-b border-[#d6cda4] py-1 px-2 text-[#450a0a] focus:border-[#8B0000] outline-none text-base placeholder-[#a89f91]"
                />
                <div className="flex bg-[#eaddcf] rounded-lg p-0.5 gap-0.5 shrink-0">
                    {[Gender.MALE, Gender.FEMALE].map((g) => (
                    <button key={g} type="button" onClick={() => setInput({ ...input, gender: g })}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${input.gender === g ? 'bg-[#8B0000] text-[#fff8ea]' : 'text-[#5c4033]'}`}>
                        {g}
                    </button>
                    ))}
                </div>
            </div>
        ))}

        <div className="flex justify-center mb-2">
            <div className="bg-[#eaddcf] rounded-full p-0.5 flex gap-1 border border-[#d6cda4] shadow-sm">
                {[
                    { key: 'SOLAR', label: '公历' },
                    { key: 'LUNAR', label: '农历' },
                    { key: 'MANUAL', label: '八字反推' }
                ].map((mode) => (
                    <button 
                        key={mode.key} 
                        type="button" 
                        onClick={() => handleModeSwitch(mode.key as any)}
                        className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${getCurrentModeKey() === mode.key ? 'bg-white text-[#8B0000] shadow-sm' : 'text-[#5c4033] hover:text-[#8B0000]/70'}`}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-white/80 border border-[#d6cda4] rounded-lg p-3 shadow-sm mb-2">
            {inputMode === 'date' ? (
                <div className="space-y-3">
                     <div className={`grid ${input.calendarType === CalendarType.LUNAR ? 'grid-cols-4' : 'grid-cols-5'} gap-1 text-center`}>
                         <div className="flex flex-col gap-1">
                             <select value={input.year} onChange={(e) => setInput({...input, year:Number(e.target.value)})}
                                 className="bg-transparent text-[#450a0a] font-bold text-sm p-1 border-b border-[#d6cda4] rounded-none text-center appearance-none outline-none focus:border-[#8B0000]">
                                 {years.map(y => <option key={y} value={y}>{y}</option>)}
                             </select>
                             <label className="text-[9px] text-[#8c7b75]">年</label>
                         </div>
                         <div className="flex flex-col gap-1">
                             <select value={input.month} onChange={(e) => setInput({...input, month:Number(e.target.value)})}
                                 className="bg-transparent text-[#450a0a] font-bold text-sm p-1 border-b border-[#d6cda4] rounded-none text-center appearance-none outline-none focus:border-[#8B0000]">
                                 {getMonthOptions()}
                             </select>
                             <label className="text-[9px] text-[#8c7b75]">月</label>
                         </div>
                         <div className="flex flex-col gap-1">
                             <select value={input.day} onChange={(e) => setInput({...input, day:Number(e.target.value)})}
                                 className="bg-transparent text-[#450a0a] font-bold text-sm p-1 border-b border-[#d6cda4] rounded-none text-center appearance-none outline-none focus:border-[#8B0000]">
                                 {getDayOptions()}
                             </select>
                             <label className="text-[9px] text-[#8c7b75]">日</label>
                         </div>
                         {input.calendarType === CalendarType.LUNAR ? (
                            <div className="flex flex-col gap-1 col-span-1">
                                <select value={input.hour} onChange={(e) => setInput({...input, hour:Number(e.target.value)})}
                                    className="bg-transparent text-[#450a0a] font-bold text-sm p-1 border-b border-[#d6cda4] rounded-none text-center appearance-none outline-none focus:border-[#8B0000]">
                                    {lunarTimeOptions.map((t) => (
                                        <option key={t.value} value={t.value}>{t.name}</option>
                                    ))}
                                </select>
                                <label className="text-[9px] text-[#8c7b75]">时辰</label>
                            </div>
                         ) : (
                            <>
                                <div className="flex flex-col gap-1">
                                     <select value={input.hour} onChange={(e) => setInput({...input, hour:Number(e.target.value)})}
                                         className="bg-transparent text-[#450a0a] font-bold text-sm p-1 border-b border-[#d6cda4] rounded-none text-center appearance-none outline-none focus:border-[#8B0000]">
                                         {hours.map(h => <option key={h} value={h}>{h}点</option>)}
                                     </select>
                                     <label className="text-[9px] text-[#8c7b75]">时</label>
                                </div>
                                <div className="flex flex-col gap-1">
                                     <select value={input.minute} onChange={(e) => setInput({...input, minute:Number(e.target.value)})}
                                         className="bg-transparent text-[#450a0a] font-bold text-sm p-1 border-b border-[#d6cda4] rounded-none text-center appearance-none outline-none focus:border-[#8B0000]">
                                         {minutes.map(m => <option key={m} value={m}>{m}分</option>)}
                                     </select>
                                     <label className="text-[9px] text-[#8c7b75]">分</label>
                                </div>
                            </>
                         )}
                     </div>
                     
                     {input.calendarType === CalendarType.LUNAR && (
                        <div className="flex justify-end border-t border-[#f0ebda] pt-2">
                             <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${input.processEarlyLateRat ? 'bg-[#8B0000] border-[#8B0000]' : 'border-[#a89f91]'}`}>
                                    {input.processEarlyLateRat && <Check size={10} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" 
                                    checked={input.processEarlyLateRat} 
                                    onChange={(e) => setInput({...input, processEarlyLateRat: e.target.checked})} 
                                />
                                <span className="text-[10px] text-[#5c4033] group-hover:text-[#8B0000] transition-colors">区分早晚子时</span>
                             </label>
                        </div>
                     )}

                     <div className="flex items-center gap-2 pt-2 border-t border-[#f0ebda]">
                        <MapPin className="text-[#8B0000]" size={14} />
                        <select value={input.selectedCityKey} onChange={(e) => setInput({...input, selectedCityKey: e.target.value})}
                            className="flex-1 bg-transparent text-[#450a0a] text-xs outline-none py-1">
                            {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                     </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                         {['年','月','日','时'].map((t,i) => (
                             <div key={i} className="text-center text-[#8c7b75] text-[10px]">{t}柱</div>
                         ))}
                         <div className="col-span-4 grid grid-cols-4 gap-2">
                             {[
                                 [pillars.yGan, pillars.yZhi, 'yGan', 'yZhi'],
                                 [pillars.mGan, pillars.mZhi, 'mGan', 'mZhi'],
                                 [pillars.dGan, pillars.dZhi, 'dGan', 'dZhi'],
                                 [pillars.hGan, pillars.hZhi, 'hGan', 'hZhi']
                             ].map(([gVal, zVal, gKey, zKey]: any, idx) => (
                                 <div key={idx} className="flex flex-col gap-1">
                                     <select className="bg-[#fffcf5] border border-[#d6cda4] rounded text-[#450a0a] p-1 text-center appearance-none text-sm font-bold"
                                        value={gVal} onChange={e => setPillars({...pillars, [gKey]: e.target.value})}>
                                        {GAN.map(g => <option key={g} value={g}>{g}</option>)}
                                     </select>
                                     <select className="bg-[#fffcf5] border border-[#d6cda4] rounded text-[#450a0a] p-1 text-center appearance-none text-sm font-bold"
                                        value={zVal} onChange={e => setPillars({...pillars, [zKey]: e.target.value})}>
                                        {ZHI.map(z => <option key={z} value={z}>{z}</option>)}
                                     </select>
                                 </div>
                             ))}
                         </div>
                    </div>
                    <Button type="button" onClick={handleSearchDates} isLoading={isSearching} variant="secondary" className="text-xs py-2">
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

        <div className="relative mb-2 z-20">
            <div className="bg-white/80 border border-[#d6cda4] rounded-lg overflow-hidden shadow-sm flex items-center">
                <div className="bg-[#fffcf5] px-3 py-2 border-r border-[#ebe5ce] flex items-center gap-2 min-w-[70px]">
                     <span className="w-1 h-3 bg-[#8B0000] rounded-full"></span>
                     <span className="text-xs text-[#5c4033] font-bold">分组</span>
                </div>
                <div className="flex-1 relative">
                     <input
                         type="text"
                         value={input.group}
                         onChange={(e) => setInput({...input, group: e.target.value})}
                         onFocus={() => setShowGroupSuggestions(true)}
                         onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
                         placeholder="输入或选择分组 (默认)"
                         className="w-full h-full px-3 py-2 text-sm bg-transparent outline-none text-[#450a0a]"
                     />
                     <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d6cda4] pointer-events-none" />
                </div>
            </div>
            {showGroupSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#fffcf5] border border-[#d6cda4] rounded-lg shadow-xl max-h-40 overflow-y-auto z-30">
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

        <div className="flex gap-3 mt-4 pt-2 border-t border-[#d6cda4]/30">
            <Button onClick={handleArrange} className="flex-[4] py-4 text-lg shadow-lg">
                立刻排盘
            </Button>
            <Button
                type="button"
                variant="secondary"
                onClick={() => setHistoryOpen(true)}
                className="flex-[1] py-4 text-sm shadow-md border-[#d6cda4]"
            >
                命例
            </Button>
        </div>

      </form>
    </div>
    );
  };

  const renderChart = () => {
    if (!currentRecord) return null;
    const { chart } = currentRecord;
    const currentYear = new Date().getFullYear();

    return (
      <div className="flex flex-col min-h-screen bg-[#fffbe6] pb-20 font-sans text-[#1c1917] select-none">
        {/* Custom Header matching the image */}
        <div className="sticky top-0 z-20 bg-[#961c1c] border-b border-[#700f0f] flex justify-between items-center h-12 px-2 shadow-md">
           <button onClick={() => setView('form')} className="px-3 py-1 bg-[#b93b3b] rounded border border-[#cf5454] text-white text-sm shadow">
              返回
           </button>
           <h1 className="font-calligraphy text-2xl text-white tracking-widest drop-shadow-md">八字排盘宝</h1>
           <button onClick={() => setHistoryOpen(true)} className="p-1.5 bg-[#b93b3b] rounded border border-[#cf5454] text-white shadow">
              <Menu size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
            
            {/* Top Text Info Section */}
            <div className="space-y-1 text-[13px] leading-tight text-[#333]">
                <div>出生时间：{chart.solarDateStr}</div>
                <div>出生时间：{chart.lunarDateStr}</div>
                <div>出生于 <span className="text-green-700 font-bold">{chart.solarTermStr.replace('出生于', '')} [节气]</span></div>
            </div>

            {/* Four Pillars Section - Compact & Centered */}
            <div className="mt-2 flex justify-center">
                <div className="w-full max-w-sm flex">
                    {/* Gender/Mode Label - Left Column - Aligned with Na Yin Row */}
                    <div className="w-10 flex items-start text-[15px] font-bold text-[#1c1917]">
                        {currentRecord.gender}：
                    </div>

                    {/* Pillars Grid */}
                    <div className="flex-1 grid grid-cols-4 gap-1 text-center relative">
                         {/* Na Yin Row */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`ny-${i}`} className="text-[11px] text-[#4a4a4a] h-5">{p.naYin}</div>
                         ))}
                         
                         {/* Ten God Row */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`tg-${i}`} className="text-[11px] text-[#4a4a4a] h-5">{p.stemTenGod}</div>
                         ))}
                         
                         {/* Stem Row */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`s-${i}`} className={`text-2xl font-bold ${ELEMENT_COLORS[p.stemElement]}`}>
                                 {p.stem}
                             </div>
                         ))}
                         
                         {/* Branch Row */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`b-${i}`} className={`text-2xl font-bold ${ELEMENT_COLORS[p.branchElement]}`}>
                                 {p.branch}
                             </div>
                         ))}
                         
                         {/* Hidden Stems List */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`hs-${i}`} className="flex flex-col items-center mt-1 space-y-0.5">
                                 {p.hiddenStems.map((hs, idx) => (
                                     <div key={idx} className="flex gap-0.5 items-center text-[11px] leading-none">
                                         <span className={`${ELEMENT_COLORS[hs.element]}`}>{hs.stem}</span>
                                         <span className="text-[#666] scale-90 origin-left">{hs.tenGod}</span>
                                     </div>
                                 ))}
                             </div>
                         ))}
                         
                         {/* Life Stage */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`ls-${i}`} className="mt-2 text-[12px] text-[#333]">{p.lifeStage}</div>
                         ))}

                         {/* Kong Wang Overlay (Right of Day/Hour) */}
                         <div className="absolute right-0 top-16 text-[11px] text-red-600 transform translate-x-2">
                             [{chart.dayKongWang}空]
                         </div>
                    </div>
                </div>
            </div>

            {/* Middle Info Block - Minimal, removed ShenSha */}
            <div className="mt-3 space-y-1 text-[12px] leading-snug">
                <div className="flex gap-2">
                    <span className="text-green-700">司令: {chart.renYuanSiLing} [设置]</span>
                </div>
            </div>

            {/* Da Yun Header */}
            <div className="mt-3 text-[13px]">
                <div className="text-[#333]">{chart.startLuckText} <span className="text-green-600">[设置]</span></div>
                <div className="text-[#333] text-[12px]">即每逢乙年清明后第7日交脱大运, 当前: <span className="text-[#961c1c] font-bold">丙申</span></div>
            </div>

            {/* Da Yun & Liu Nian Matrix - Horizontal Mode */}
            <div className="mt-2 overflow-x-auto">
                <div className="min-w-max">
                     <div className="flex">
                         {/* Header Column (Yun Qian) */}
                         <div className="flex flex-col w-12 items-center shrink-0">
                             <div className="h-4"></div>
                             <div className="h-4"></div>
                             <div className="h-4"></div>
                             <div className="h-8 flex items-center justify-center font-bold text-base text-[#1c1917]">运前</div>
                             <div className="h-4 text-[11px] text-[#333]">1</div>
                             <div className="h-4 text-[11px] text-[#333]">{chart.yunQian[0]?.year}</div>
                             {/* Vertical Liu Nian list for Yun Qian (Horizontal Text) */}
                             <div className="mt-2 flex flex-col items-center gap-1">
                                 {chart.yunQian.map((yn, idx) => {
                                     const isCurrent = yn.year === currentYear;
                                     return (
                                         <div key={idx} className={`flex items-center justify-center h-[18px] ${isCurrent ? 'text-[#961c1c] font-bold' : 'text-[#333]'}`}>
                                             <span className="text-[13px] tracking-widest">{yn.ganZhi}</span>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>

                         {/* Da Yun Columns */}
                         {chart.daYun.map((yun, idx) => {
                             // Highlight Logic
                             const nextYun = chart.daYun[idx + 1];
                             const isCurrentDaYun = currentYear >= yun.startYear && (!nextYun || currentYear < nextYun.startYear);
                             
                             return (
                             <div key={yun.index} className="flex flex-col w-12 items-center shrink-0">
                                 {/* Removed Life Stage Row */}
                                 <div className="h-4 text-[11px] text-[#333] scale-90 whitespace-nowrap">{yun.naYin.substring(0,3)}</div>
                                 <div className="h-4 text-[11px] text-[#333]">{yun.stemTenGod}</div>
                                 
                                 {/* Da Yun Pillar */}
                                 <div className={`h-8 flex items-center justify-center ${isCurrentDaYun ? 'text-[#961c1c] font-bold' : 'text-[#1c1917]'}`}>
                                     <span className="text-lg tracking-wide">{yun.ganZhi}</span>
                                 </div>
                                 
                                 {/* Age & Year */}
                                 <div className="h-4 text-[11px] text-[#333]">{yun.startAge}</div>
                                 <div className="h-4 text-[11px] text-[#333]">{yun.startYear}</div>

                                 {/* Liu Nian Vertical List */}
                                 <div className="mt-2 flex flex-col items-center gap-1">
                                     {yun.liuNian.map((ln, lnIdx) => {
                                         const isCurrentLiuNian = ln.year === currentYear;
                                         const textColor = isCurrentLiuNian ? 'text-[#961c1c] font-bold' : 'text-[#333]';
                                         
                                         return (
                                            <div key={lnIdx} className={`flex items-center justify-center h-[18px] ${textColor}`}>
                                                <span className="text-[13px] tracking-widest">{ln.ganZhi}</span>
                                            </div>
                                         );
                                     })}
                                 </div>
                             </div>
                         )})}
                     </div>
                </div>
            </div>

            {/* Master's Comment / Notes Section - Integrated into Bottom */}
            <div className="mt-8 mb-6 px-2">
                <div className="bg-white/60 border border-[#d6cda4] rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#e5e0d0]">
                        <h3 className="font-bold text-[#8B0000] text-sm flex items-center gap-2">
                            <Edit3 size={14}/> 命理师批注
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
                        className="w-full min-h-[120px] bg-transparent outline-none resize-none text-sm leading-relaxed text-[#450a0a] placeholder-[#a89f91]"
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
        onDelete={deleteRecord}
      />
      {view === 'form' ? renderForm() : renderChart()}
    </>
  );
}

export default App;
