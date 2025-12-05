import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Save, Settings, MapPin, Calendar, RotateCcw, ArrowLeft, Search, X, Fingerprint, FolderInput, ChevronDown, Check, BookOpen, ChevronRight, Edit3 } from 'lucide-react';
import { UserInput, Gender, Record, CalendarType } from './types';
import { calculateBaZi, findDatesFromPillars, MatchingDate } from './services/baziCalculator';
import { analyzeBaZi } from './services/geminiService';
import { APP_STORAGE_KEY, ELEMENT_COLORS, CITIES, GAN, ZHI, LUNAR_MONTHS, LUNAR_DAYS, LUNAR_TIMES, STEM_ELEMENTS, BRANCH_ELEMENTS } from './constants';
import { Button } from './components/Button';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PillarDisplay } from './components/PillarDisplay';

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

  const handleArrange = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto name generation logic
    let finalName = input.name.trim();
    if (!finalName) {
        finalName = generateNextCaseName(records);
        // Update input state solely for UI consistency, though not strictly required if we use finalName
        setInput(prev => ({ ...prev, name: finalName }));
    }

    const chart = calculateBaZi({ ...input, name: finalName });
    const newRecord: Record = {
      id: Date.now().toString(),
      name: finalName,
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
      // Validate all fields selected
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
              // Reset minute to 0 if switching to Lunar to keep it clean
              minute: mode === 'SOLAR' ? input.minute : 0 
          });
      }
  };

  const getCurrentModeKey = () => {
      if (inputMode === 'manual') return 'MANUAL';
      return input.calendarType === CalendarType.SOLAR ? 'SOLAR' : 'LUNAR';
  };

  // --- Helpers for Filtering & Options ---

  // Filter Branches based on Stem (Yang pairs with Yang, Yin with Yin)
  const getFilteredZhi = (selectedGan: string) => {
      if (!selectedGan) return []; // If no stem, maybe show none or all? Let's show empty to force Stem first.
      
      const ganIdx = GAN.indexOf(selectedGan);
      if (ganIdx === -1) return ZHI; // Should not happen

      // Even Gan (0, 2...) are Yang -> Filter for Even Zhi
      // Odd Gan (1, 3...) are Yin -> Filter for Odd Zhi
      const isYang = ganIdx % 2 === 0;
      
      return ZHI.filter((_, idx) => (idx % 2 === 0) === isYang);
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

  // Minimalist Input Group (No Box)
  const renderInputGroup = (content: React.ReactNode) => (
    <div className="mb-4 px-2">
       {content}
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
    // Added safe-area padding to top
    <div className="flex flex-col min-h-screen max-w-md mx-auto px-4 pt-[env(safe-area-inset-top)] pb-6 font-sans bg-[#fff8ea]">
      <div className="text-center mb-4 pt-4">
        <h1 className="text-3xl font-calligraphy text-[#8B0000] mb-0 drop-shadow-sm">玄青君八字</h1>
        <p className="text-[#5c4033] text-[9px] uppercase tracking-[0.3em] opacity-70">SIZHUBAZI</p>
      </div>

      <form onSubmit={handleArrange} className="relative mt-2 flex flex-col flex-1">
        
        {/* Name & Gender - Minimal */}
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

        {/* Mode Switcher - Minimal Pills */}
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

        {/* Dynamic Content Area */}
        <div className="px-2 mb-4">
            {inputMode === 'date' ? (
                <div className="space-y-6">
                     {/* Date Selectors */}
                     <div className={`grid ${input.calendarType === CalendarType.LUNAR ? 'grid-cols-4' : 'grid-cols-5'} gap-2 text-center`}>
                         {/* Year */}
                         <div className="flex flex-col gap-1 border-b border-[#d6cda4]">
                             <select value={input.year} onChange={(e) => setInput({...input, year:Number(e.target.value)})}
                                 className="bg-transparent text-[#450a0a] font-bold text-base p-1 text-center appearance-none outline-none">
                                 {years.map(y => <option key={y} value={y}>{y}</option>)}
                             </select>
                         </div>
                         
                         {/* Month */}
                         <div className="flex flex-col gap-1 border-b border-[#d6cda4]">
                             <select value={input.month} onChange={(e) => setInput({...input, month:Number(e.target.value)})}
                                 className="bg-transparent text-[#450a0a] font-bold text-base p-1 text-center appearance-none outline-none">
                                 {getMonthOptions()}
                             </select>
                         </div>

                         {/* Day */}
                         <div className="flex flex-col gap-1 border-b border-[#d6cda4]">
                             <select value={input.day} onChange={(e) => setInput({...input, day:Number(e.target.value)})}
                                 className="bg-transparent text-[#450a0a] font-bold text-base p-1 text-center appearance-none outline-none">
                                 {getDayOptions()}
                             </select>
                         </div>

                         {/* Hour */}
                         {input.calendarType === CalendarType.LUNAR ? (
                            <div className="flex flex-col gap-1 col-span-1 border-b border-[#d6cda4]">
                                <select value={input.hour} onChange={(e) => setInput({...input, hour:Number(e.target.value)})}
                                    className="bg-transparent text-[#450a0a] font-bold text-base p-1 text-center appearance-none outline-none">
                                    {lunarTimeOptions.map((t) => (
                                        <option key={t.value} value={t.value}>{t.name.split(' ')[0]}</option>
                                    ))}
                                </select>
                            </div>
                         ) : (
                            <>
                                <div className="flex flex-col gap-1 border-b border-[#d6cda4]">
                                     <select value={input.hour} onChange={(e) => setInput({...input, hour:Number(e.target.value)})}
                                         className="bg-transparent text-[#450a0a] font-bold text-base p-1 text-center appearance-none outline-none">
                                         {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                     </select>
                                </div>
                                <div className="flex flex-col gap-1 border-b border-[#d6cda4]">
                                     <select value={input.minute} onChange={(e) => setInput({...input, minute:Number(e.target.value)})}
                                         className="bg-transparent text-[#450a0a] font-bold text-base p-1 text-center appearance-none outline-none">
                                         {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                     </select>
                                </div>
                            </>
                         )}
                     </div>
                     
                     {/* Early/Late Rat Checkbox - Available for BOTH modes */}
                     <div className="flex justify-end pt-2">
                         <label className="flex items-center gap-2 cursor-pointer group select-none">
                            <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${input.processEarlyLateRat ? 'bg-[#8B0000] border-[#8B0000]' : 'border-[#a89f91]'}`}>
                                {input.processEarlyLateRat && <Check size={10} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" 
                                checked={input.processEarlyLateRat} 
                                onChange={(e) => setInput({...input, processEarlyLateRat: e.target.checked})} 
                            />
                            <span className="text-[11px] text-[#5c4033] group-hover:text-[#8B0000] transition-colors">区分早晚子时</span>
                         </label>
                     </div>

                     {/* Location */}
                     <div className="flex items-center gap-3 border-b border-[#d6cda4] pb-2">
                        <MapPin className="text-[#a89f91]" size={16} />
                        <select value={input.selectedCityKey} onChange={(e) => setInput({...input, selectedCityKey: e.target.value})}
                            className="flex-1 bg-transparent text-[#450a0a] text-sm outline-none">
                            {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                     </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Manual Pillar Selection */}
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
                                 // Calculate colors for selected values
                                 const gColor = gVal ? ELEMENT_COLORS[STEM_ELEMENTS[gVal]] : 'text-[#a89f91]';
                                 const zColor = zVal ? ELEMENT_COLORS[BRANCH_ELEMENTS[zVal]] : 'text-[#a89f91]';
                                 const filteredZhi = getFilteredZhi(gVal);

                                 return (
                                 <div key={idx} className="flex flex-col gap-3">
                                     {/* Stem Select */}
                                     <div className="relative border-b border-[#d6cda4]">
                                         <select 
                                            className={`w-full bg-transparent text-center appearance-none text-xl font-bold py-1 outline-none ${gColor}`}
                                            value={gVal} 
                                            onChange={e => {
                                                // Reset branch when stem changes to ensure validity
                                                setPillars({...pillars, [gKey]: e.target.value, [zKey]: ''});
                                            }}
                                         >
                                            <option value="">-</option>
                                            {GAN.map(g => (
                                                <option key={g} value={g} className={ELEMENT_COLORS[STEM_ELEMENTS[g]]}>{g}</option>
                                            ))}
                                         </select>
                                     </div>

                                     {/* Branch Select */}
                                     <div className="relative border-b border-[#d6cda4]">
                                        <select 
                                            className={`w-full bg-transparent text-center appearance-none text-xl font-bold py-1 outline-none ${zColor}`}
                                            value={zVal} 
                                            onChange={e => setPillars({...pillars, [zKey]: e.target.value})}
                                            disabled={!gVal} // Disable branch if no stem selected
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
                    
                    <Button type="button" onClick={handleSearchDates} isLoading={isSearching} variant="secondary" className="text-xs py-2 mt-4 bg-[#eaddcf]/50 border-none shadow-none text-[#5c4033] hover:text-[#8B0000]">
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

        {/* Group Selection - Minimal */}
        <div className="relative mb-2 px-2 z-20">
            <div className="flex items-center gap-3 border-b border-[#d6cda4] pb-2">
                <FolderInput className="text-[#a89f91]" size={16} />
                <div className="flex-1 relative">
                     <input
                         type="text"
                         value={input.group}
                         onChange={(e) => setInput({...input, group: e.target.value})}
                         onFocus={() => setShowGroupSuggestions(true)}
                         onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
                         placeholder="输入或选择分组 (默认)"
                         className="w-full bg-transparent outline-none text-[#450a0a] text-sm"
                     />
                     <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#d6cda4] pointer-events-none" />
                </div>
            </div>
            {/* Suggestions */}
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

        <div className="flex gap-3 mt-6 pt-2 pb-12">
            {/* Reduced height buttons: changed py-4 to py-2.5 */}
            <Button onClick={handleArrange} className="flex-[4] py-2.5 text-lg shadow-lg">
                立刻排盘
            </Button>
            <Button
                type="button"
                variant="secondary"
                onClick={() => setHistoryOpen(true)}
                className="flex-[1] py-2.5 text-sm shadow-md border-[#d6cda4]"
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
        {/* Custom Header matching the image - Added Safe Area Padding */}
        <div className="sticky top-0 z-20 bg-[#961c1c] border-b border-[#700f0f] flex justify-between items-center h-auto min-h-[48px] pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 px-2 shadow-md">
           <button onClick={() => setView('form')} className="px-3 py-1 bg-[#b93b3b] rounded border border-[#cf5454] text-white text-sm shadow">
              返回
           </button>
           <h1 className="font-calligraphy text-2xl text-white tracking-widest drop-shadow-md">玄青君八字</h1>
           <button onClick={() => setHistoryOpen(true)} className="p-1.5 bg-[#b93b3b] rounded border border-[#cf5454] text-white shadow">
              <Menu size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
            
            {/* Top Text Info Section - Unified text-[11px] */}
            <div className="space-y-1 text-[11px] leading-tight text-[#333]">
                <div>出生时间：{chart.solarDateStr}</div>
                <div>出生时间：{chart.lunarDateStr}</div>
                <div>出生于 <span className="text-green-700 font-bold">{chart.solarTermStr.replace('出生于', '')} [节气]</span></div>
            </div>

            {/* Four Pillars Section - Left Aligned Layout */}
            <div className="mt-2 pl-2">
                <div className="flex gap-2">
                    {/* Gender/Mode Label - Unified text-[11px] */}
                    <div className="w-10 flex items-start justify-start text-[11px] font-bold text-[#1c1917] mt-0.5 whitespace-nowrap">
                        {currentRecord.gender}：
                    </div>

                    {/* Pillars Grid */}
                    <div className="grid grid-cols-4 gap-0 text-center relative w-[280px]">
                         {/* Na Yin Row - Unified text-[11px] */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`ny-${i}`} className="text-[11px] text-[#4a4a4a] h-5">{p.naYin}</div>
                         ))}
                         
                         {/* Ten God Row - Unified text-[11px] */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`tg-${i}`} className="text-[11px] text-[#4a4a4a] h-5">{p.stemTenGod}</div>
                         ))}
                         
                         {/* Stem Row - Main 8 Characters keep large size */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`s-${i}`} className={`text-2xl font-bold ${ELEMENT_COLORS[p.stemElement]}`}>
                                 {p.stem}
                             </div>
                         ))}
                         
                         {/* Branch Row - Main 8 Characters keep large size */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`b-${i}`} className={`text-2xl font-bold ${ELEMENT_COLORS[p.branchElement]}`}>
                                 {p.branch}
                             </div>
                         ))}
                         
                         {/* Hidden Stems List - Unified text-[11px] */}
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
                         
                         {/* Life Stage - Unified text-[11px] */}
                         {[chart.year, chart.month, chart.day, chart.hour].map((p, i) => (
                             <div key={`ls-${i}`} className="mt-2 text-[11px] text-[#333]">{p.lifeStage}</div>
                         ))}

                         {/* Kong Wang Overlay - Unified text-[11px] */}
                         <div className="absolute right-0 top-16 text-[11px] text-red-600 transform translate-x-14">
                             [{chart.dayKongWang}空]
                         </div>
                    </div>
                </div>
            </div>

            {/* Middle Info Block - Unified text-[11px], reduced gap */}
            <div className="mt-0.5 space-y-0.5 text-[11px] leading-snug">
                <div className="flex gap-2">
                    <span className="text-green-700">司令: {chart.renYuanSiLing} [设置]</span>
                </div>
            </div>

            {/* Da Yun Header - Unified text-[11px] */}
            <div className="mt-0.5 text-[11px]">
                <div className="text-[#333]">{chart.startLuckText} <span className="text-green-600">[设置]</span></div>
                <div className="text-[#333] text-[11px]">即每逢乙年清明后第7日交脱大运, 当前: <span className="text-[#961c1c] font-bold">丙申</span></div>
            </div>

            {/* Da Yun & Liu Nian Matrix - Horizontal Mode */}
            {/* Added touch-action: pan-x to allow horizontal scroll without triggering page navigation */}
            <div className="mt-1 overflow-x-auto touch-pan-x">
                <div className="min-w-max">
                     <div className="flex">
                         {/* Header Column (Yun Qian) */}
                         <div className="flex flex-col w-12 items-center shrink-0">
                             <div className="h-4"></div>
                             <div className="h-4"></div>
                             {/* Reduced gap: removed spacer */}
                             <div className="h-8 flex items-center justify-center font-bold text-[11px] text-[#1c1917]">运前</div>
                             <div className="h-4 text-[11px] text-[#333]">1</div>
                             <div className="h-4 text-[11px] text-[#333]">{chart.yunQian[0]?.year}</div>
                             {/* Vertical Liu Nian list for Yun Qian */}
                             <div className="mt-2 flex flex-col items-center gap-1">
                                 {chart.yunQian.map((yn, idx) => {
                                     const isCurrent = yn.year === currentYear;
                                     return (
                                         <div key={idx} className={`flex items-center justify-center h-[18px] ${isCurrent ? 'text-[#961c1c] font-bold' : 'text-[#333]'}`}>
                                             <span className="text-[11px] tracking-widest">{yn.ganZhi}</span>
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
                                 {/* Unified text-[11px] */}
                                 <div className="h-4 text-[11px] text-[#333] scale-90 whitespace-nowrap">{yun.naYin}</div>
                                 <div className="h-4 text-[11px] text-[#333]">{yun.stemTenGod}</div>
                                 
                                 {/* Da Yun Pillar - Keep large? User said "all words one size EXCEPT 8 chars". 
                                     Usually Da Yun is prominent. I'll make it slightly larger than 11px but smaller than main, 
                                     or stick to 11px per strict instruction? 
                                     Instruction: "Besides Four Pillars 8 chars, ALL other words use one font size". 
                                     I will set Da Yun to text-[11px] as requested, but bold. */}
                                 <div className={`h-8 flex items-center justify-center ${isCurrentDaYun ? 'text-[#961c1c]' : 'text-[#1c1917]'} font-bold`}>
                                     <span className="text-[11px] tracking-wide">{yun.ganZhi}</span> 
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
                                                <span className="text-[11px] tracking-widest">{ln.ganZhi}</span>
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
                        <h3 className="font-bold text-[#8B0000] text-[11px] flex items-center gap-2">
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
                        className="w-full min-h-[120px] bg-transparent outline-none resize-none text-[11px] leading-relaxed text-[#450a0a] placeholder-[#a89f91]"
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