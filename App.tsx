import React, { useState, useEffect } from 'react';
import { Menu, Save, Settings, MapPin, Calendar, RotateCcw, ArrowLeft, Search, X } from 'lucide-react';
import { UserInput, Gender, Record, CalendarType } from './types';
import { calculateBaZi, findDatesFromPillars, MatchingDate } from './services/baziCalculator';
import { analyzeBaZi } from './services/geminiService';
import { APP_STORAGE_KEY, ELEMENT_COLORS, CITIES, GAN, ZHI, LUNAR_MONTHS, LUNAR_DAYS } from './constants';
import { Button } from './components/Button';
import { PillarDisplay } from './components/PillarDisplay';
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
  const [showNotesModal, setShowNotesModal] = useState(false); // Moved notes to modal for space

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
    if (!showNotesModal) setShowNotesModal(true);
    const analysis = await analyzeBaZi(currentRecord);
    const newNotes = (noteDraft ? noteDraft + "\n\n--- AI 大师分析 ---\n" : "--- AI 大师分析 ---\n") + analysis;
    setNoteDraft(newNotes);
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
      selectedCityKey: rec.city || '不参考出生地 (北京时间)'
    });
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

  // --- UI Renders ---

  const renderInputGroup = (label: string, content: React.ReactNode) => (
    <div className="bg-white/80 border border-[#d6cda4] rounded-lg overflow-hidden mb-4 shadow-sm">
       <div className="bg-[#fffcf5] px-4 py-1.5 border-b border-[#ebe5ce] flex items-center gap-2">
          <span className="w-1 h-3 bg-[#8B0000] rounded-full"></span>
          <span className="text-xs text-[#5c4033] font-bold tracking-wider">{label}</span>
       </div>
       <div className="p-4">
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

  const renderForm = () => (
    <div className="flex flex-col h-full max-w-md mx-auto px-5 pt-8 pb-6">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-calligraphy text-[#8B0000] mb-1 drop-shadow-sm">八字排盘宝</h1>
        <p className="text-[#5c4033] text-[10px] uppercase tracking-[0.4em] opacity-70">Professional BaZi</p>
      </div>

      <div className="flex p-1 bg-[#eaddcf] rounded-lg mb-5 border border-[#d6cda4] shadow-inner">
        <button onClick={() => setInputMode('date')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${inputMode === 'date' ? 'bg-[#8B0000] text-[#fff8ea] shadow' : 'text-[#5c4033] hover:bg-white/30'}`}>
           <Calendar size={14} className="inline mr-1 mb-0.5" /> 日期排盘
        </button>
        <button onClick={() => setInputMode('manual')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${inputMode === 'manual' ? 'bg-[#8B0000] text-[#fff8ea] shadow' : 'text-[#5c4033] hover:bg-white/30'}`}>
           <RotateCcw size={14} className="inline mr-1 mb-0.5" /> 八字反推
        </button>
      </div>

      <form onSubmit={handleArrange} className="flex-1 relative">
        {renderInputGroup("基础信息 Basic Info", (
            <div className="space-y-4">
                <div className="flex gap-3">
                    <input type="text" placeholder="请输入姓名" value={input.name}
                        onChange={e => setInput({ ...input, name: e.target.value })}
                        className="flex-1 bg-transparent border-b border-[#d6cda4] p-2 text-[#450a0a] focus:border-[#8B0000] outline-none text-lg placeholder-[#a89f91]"
                    />
                    <div className="flex bg-[#eaddcf] rounded-lg p-1 gap-1">
                        {[Gender.MALE, Gender.FEMALE].map((g) => (
                        <button key={g} type="button" onClick={() => setInput({ ...input, gender: g })}
                            className={`px-3 py-1 rounded text-sm font-bold transition-all ${input.gender === g ? 'bg-[#8B0000] text-[#fff8ea]' : 'text-[#5c4033]'}`}>
                            {g}
                        </button>
                        ))}
                    </div>
                </div>
            </div>
        ))}

        {inputMode === 'date' ? (
            <>
                {renderInputGroup("出生时间 Birth Time", (
                    <div className="space-y-4">
                         <div className="flex justify-center mb-2">
                            <div className="bg-[#eaddcf] rounded-full p-0.5 flex gap-1 border border-[#d6cda4]">
                                {[CalendarType.SOLAR, CalendarType.LUNAR].map(t => (
                                    <button key={t} type="button" onClick={() => setInput({...input, calendarType: t})}
                                        className={`px-4 py-0.5 rounded-full text-xs font-bold transition-all ${input.calendarType === t ? 'bg-white text-[#8B0000] shadow-sm' : 'text-[#5c4033]'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                         </div>
                         <div className="grid grid-cols-5 gap-1 text-center">
                             {[
                               {l:'年', v:input.year, fn:(v:string)=>setInput({...input, year:Number(v)}), opt:years},
                               {l:'月', v:input.month, fn:(v:string)=>setInput({...input, month:Number(v)}), optC:getMonthOptions()},
                               {l:'日', v:input.day, fn:(v:string)=>setInput({...input, day:Number(v)}), optC:getDayOptions()},
                               {l:'时', v:input.hour, fn:(v:string)=>setInput({...input, hour:Number(v)}), opt:hours},
                               {l:'分', v:input.minute, fn:(v:string)=>setInput({...input, minute:Number(v)}), opt:minutes},
                             ].map((field: any, i) => (
                                 <div key={i} className="flex flex-col gap-1">
                                    <label className="text-[10px] text-[#8c7b75]">{field.l}</label>
                                    <select value={field.v} onChange={(e) => field.fn(e.target.value)}
                                        className="bg-transparent text-[#450a0a] font-bold text-sm p-1 border-b border-[#d6cda4] rounded-none text-center appearance-none">
                                        {field.opt ? field.opt.map((o:any)=><option key={o} value={o}>{o}</option>) : field.optC}
                                    </select>
                                 </div>
                             ))}
                         </div>
                    </div>
                ))}
                {renderInputGroup("真太阳时 True Solar Time", (
                    <div className="flex items-center gap-2">
                        <MapPin className="text-[#8B0000]" size={16} />
                        <select value={input.selectedCityKey} onChange={(e) => setInput({...input, selectedCityKey: e.target.value})}
                            className="flex-1 bg-transparent text-[#450a0a] text-sm outline-none border-b border-dashed border-[#d6cda4] py-1">
                            {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                    </div>
                ))}
                <div className="flex items-center justify-end px-2 mb-4">
                    <label className="flex items-center gap-2 text-xs text-[#5c4033] cursor-pointer">
                        <input type="checkbox" checked={input.autoSave} onChange={(e) => setInput({...input, autoSave: e.target.checked})}
                            className="rounded text-[#8B0000] focus:ring-[#8B0000] bg-transparent border-[#8B0000]" />
                        自动存档
                    </label>
                </div>
                <Button type="submit">立刻排盘 Generate</Button>
            </>
        ) : (
            <>
                {renderInputGroup("四柱反推 Reverse Engineering", (
                    <div className="grid grid-cols-4 gap-2">
                         {['年','月','日','时'].map((t,i) => (
                             <div key={i} className="text-center text-[#8c7b75] text-xs mb-1">{t}柱</div>
                         ))}
                         <div className="col-span-4 grid grid-cols-4 gap-2">
                             {[
                                 [pillars.yGan, pillars.yZhi, 'yGan', 'yZhi'],
                                 [pillars.mGan, pillars.mZhi, 'mGan', 'mZhi'],
                                 [pillars.dGan, pillars.dZhi, 'dGan', 'dZhi'],
                                 [pillars.hGan, pillars.hZhi, 'hGan', 'hZhi']
                             ].map(([gVal, zVal, gKey, zKey]: any, idx) => (
                                 <div key={idx} className="flex flex-col gap-1">
                                     <select className="bg-[#fffcf5] border border-[#d6cda4] rounded text-[#450a0a] p-1 text-center appearance-none"
                                        value={gVal} onChange={e => setPillars({...pillars, [gKey]: e.target.value})}>
                                        {GAN.map(g => <option key={g} value={g}>{g}</option>)}
                                     </select>
                                     <select className="bg-[#fffcf5] border border-[#d6cda4] rounded text-[#450a0a] p-1 text-center appearance-none"
                                        value={zVal} onChange={e => setPillars({...pillars, [zKey]: e.target.value})}>
                                        {ZHI.map(z => <option key={z} value={z}>{z}</option>)}
                                     </select>
                                 </div>
                             ))}
                         </div>
                    </div>
                ))}
                <Button type="button" onClick={handleSearchDates} isLoading={isSearching} variant="secondary">
                    <Search size={16} className="mr-2" /> 查询日期 Match Date
                </Button>
                
                {showDateResults && (
                    <div className="absolute inset-0 z-50 bg-[#fff8ea] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-[#8B0000]">
                        <div className="p-3 bg-[#8B0000] text-white flex justify-between items-center">
                            <h3 className="font-bold text-sm">匹配日期 ({foundDates.length})</h3>
                            <button onClick={() => setShowDateResults(false)}><X size={18}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white">
                            {foundDates.length === 0 ? (
                                <div className="text-center text-stone-500 mt-10 text-sm">未找到匹配日期</div>
                            ) : (
                                foundDates.map((d, idx) => (
                                    <button key={idx} onClick={() => selectFoundDate(d)}
                                        className="w-full bg-[#fffcf5] border border-[#d6cda4] p-2 rounded text-left hover:bg-[#f5ecd5] transition-colors">
                                        <div className="text-[#8B0000] font-bold">{d.year}年{d.month}月{d.day}日 <span className="text-stone-600 text-xs ml-2">{d.hour}时</span></div>
                                        <div className="text-[#5c4033] text-xs mt-1 font-mono bg-[#eaddcf] inline-block px-1 rounded">{d.ganZhi}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </>
        )}
      </form>
      <div className="text-center mt-4">
          <button onClick={() => setHistoryOpen(true)} className="text-[#8B0000] text-sm flex items-center justify-center gap-2 w-full py-2 opacity-80 hover:opacity-100">
              <Menu size={16} /> 查看历史档案
          </button>
      </div>
    </div>
  );

  const renderChart = () => {
    if (!currentRecord) return null;
    return (
      <div className="flex flex-col h-screen w-full bg-[#fff8ea] text-[#1c1917] overflow-hidden">
        {/* 1. Top Bar */}
        <div className="bg-[#8B0000] text-[#fff8ea] px-3 py-2 flex justify-between items-center shadow-md z-20 shrink-0">
          <button onClick={() => setView('form')} className="flex items-center gap-1 text-xs opacity-90 hover:opacity-100"><ArrowLeft size={14} /> 返回</button>
          <h2 className="font-calligraphy text-xl tracking-widest">八字排盘宝</h2>
          <button onClick={() => setHistoryOpen(true)}><Menu size={20} /></button>
        </div>

        {/* 2. Content Area - Flex layout to avoid double scrollbars */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Basic Info Strip */}
            <div className="px-4 py-2 bg-[#fffcf5] border-b border-[#eaddcf] shrink-0 flex justify-between items-start text-xs leading-tight">
                <div>
                    <div className="font-bold text-sm text-[#8B0000] mb-0.5">{currentRecord.name} <span className="text-stone-600 font-normal ml-1 text-[10px] border border-stone-300 px-1 rounded-full">{currentRecord.gender}</span></div>
                    <div className="text-stone-500">{currentRecord.chart.solarDateStr.split(' ')[0]}</div>
                </div>
                <div className="text-right">
                     <div className="text-stone-500">{currentRecord.chart.lunarDateStr.split(' ')[0]}</div>
                     <div className="text-[#8B0000] font-medium">{currentRecord.chart.solarTermStr}</div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 flex flex-col p-2 overflow-hidden">
                
                {/* Four Pillars - Compact Box */}
                <div className="bg-white/80 border border-[#d6cda4] rounded-lg p-2 shadow-sm shrink-0 mb-2">
                    <div className="grid grid-cols-4 gap-1 divide-x divide-dashed divide-[#eaddcf]">
                        {['年柱','月柱','日柱','时柱'].map((t,i) => (
                            <div key={i} className="text-center text-[10px] text-stone-400 mb-1">{t}</div>
                        ))}
                        <PillarDisplay title="年" pillar={currentRecord.chart.year} />
                        <PillarDisplay title="月" pillar={currentRecord.chart.month} />
                        <PillarDisplay title="日" pillar={currentRecord.chart.day} isDayMaster />
                        <PillarDisplay title="时" pillar={currentRecord.chart.hour} />
                    </div>
                </div>

                {/* Middle Strip */}
                <div className="flex justify-between text-[10px] text-stone-600 px-2 py-1 bg-[#f5ecd5] rounded mb-2 shrink-0 border border-[#eaddcf]">
                    <span>胎元: <b>{currentRecord.chart.taiYuan}</b></span>
                    <span>命宫: <b>{currentRecord.chart.mingGong}</b></span>
                    <span>身宫: <b>{currentRecord.chart.shenGong}</b></span>
                </div>

                <div className="text-center text-[10px] text-[#8B0000] font-medium mb-1 shrink-0">{currentRecord.chart.startLuckText}</div>

                {/* Da Yun - Fill remaining space */}
                <div className="flex-1 bg-white border border-[#d6cda4] rounded-lg shadow-inner overflow-x-auto overflow-y-hidden relative flex flex-col">
                     {/* Sticky Header for Yun Qian */}
                     <div className="absolute left-0 top-0 bottom-0 w-8 bg-[#fff8ea] border-r border-[#d6cda4] z-10 flex flex-col items-center pt-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                         <span className="text-[10px] text-[#8B0000] font-bold writing-vertical-lr">大运排盘</span>
                     </div>
                     
                     {/* Scrollable Horizontal Container */}
                     <div className="flex h-full pl-8 min-w-max">
                         
                         {/* Yun Qian Column */}
                         <div className="w-14 border-r border-dashed border-[#eaddcf] pt-2 flex flex-col items-center bg-stone-50/50">
                             <span className="text-[10px] text-stone-400 font-bold mb-2">运前</span>
                             <div className="flex flex-col gap-0.5 w-full items-center overflow-y-auto no-scrollbar">
                                 {currentRecord.chart.yunQian.map((ln, idx) => (
                                     <span key={idx} className="text-[9px] text-stone-400">{ln.ganZhi}</span>
                                 ))}
                             </div>
                         </div>

                         {/* Da Yun Columns */}
                         {currentRecord.chart.daYun.map((yun, idx) => (
                             <div key={idx} className={`w-14 border-r border-dashed border-[#eaddcf] pt-2 flex flex-col items-center ${idx < 2 ? 'bg-red-50/30' : ''}`}>
                                 {/* Header */}
                                 <div className="shrink-0 text-center mb-1">
                                    <div className="flex flex-col font-serif text-lg font-bold leading-none">
                                        <span className={ELEMENT_COLORS[yun.stemElement]}>{yun.stem}</span>
                                        <span className={ELEMENT_COLORS[yun.branchElement]}>{yun.branch}</span>
                                    </div>
                                    <div className="text-[9px] text-stone-500 mt-0.5">{yun.startAge}岁</div>
                                    <div className="text-[8px] text-stone-400 scale-90">{yun.startYear}</div>
                                 </div>
                                 
                                 {/* Liu Nian List - Scrollable if needed but fits mostly */}
                                 <div className="flex-1 w-full flex flex-col items-center gap-0.5 pb-2 overflow-y-auto no-scrollbar">
                                    {yun.liuNian.map((ln, lnIdx) => (
                                        <span key={lnIdx} className={`text-[9px] whitespace-nowrap ${lnIdx === 0 ? 'font-bold text-[#450a0a]' : 'text-stone-500'}`}>
                                            {ln.ganZhi}
                                        </span>
                                    ))}
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-[#fffcf5] border-t border-[#d6cda4] p-2 flex justify-around items-center gap-4 shrink-0 safe-area-bottom">
                <button onClick={() => setShowNotesModal(true)} className="flex flex-col items-center text-[#5c4033] text-[10px]">
                    <div className="p-2 bg-[#eaddcf] rounded-full mb-0.5"><Settings size={16}/></div>
                    大师批注
                </button>
                <button onClick={handleSaveRecord} className="flex-1 bg-[#8B0000] text-[#fff8ea] py-2.5 rounded-full font-bold shadow-md text-sm flex items-center justify-center gap-2">
                    <Save size={16} /> 保存档案
                </button>
            </div>

            {/* Notes Modal */}
            {showNotesModal && (
                <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-[#fff8ea] w-full max-w-md h-2/3 sm:h-auto sm:rounded-xl rounded-t-2xl flex flex-col shadow-2xl animate-slideUp">
                        <div className="p-3 border-b border-[#d6cda4] flex justify-between items-center bg-[#fffcf5] rounded-t-2xl">
                             <h3 className="font-bold text-[#8B0000]">命理分析与批注</h3>
                             <button onClick={() => setShowNotesModal(false)}><X size={20} className="text-stone-500"/></button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-stone-500">输入你的断语或使用AI辅助</span>
                                <button onClick={handleAIAnalyze} disabled={isAnalyzing} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded flex items-center gap-1">
                                    <Settings size={10} /> {isAnalyzing ? '推演中...' : 'AI 详批'}
                                </button>
                            </div>
                            <textarea 
                                className="w-full h-64 bg-white border border-[#d6cda4] rounded p-3 text-sm text-[#1c1917] shadow-inner focus:border-[#8B0000] outline-none leading-relaxed"
                                placeholder="在此记录..."
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                            />
                        </div>
                        <div className="p-3 border-t border-[#d6cda4] bg-[#fffcf5]">
                            <Button onClick={handleSaveRecord}>保存批注</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <HistoryDrawer 
            isOpen={historyOpen} 
            onClose={() => setHistoryOpen(false)}
            records={records}
            onSelect={loadRecord}
            onDelete={deleteRecord}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full">
      {view === 'form' ? renderForm() : renderChart()}
    </div>
  );
}

export default App;