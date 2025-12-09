import React, { useState, useMemo } from 'react';
import { Record } from '../types';
import { X, Clock, Trash2, Search, Folder, ChevronRight, Download, Upload, MapPin, Edit3 } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: Record[];
  onSelect: (record: Record) => void;
  onEdit: (record: Record) => void; 
  onDelete: (id: string) => void;
  onImport: () => void;
  onBackup: (e: React.MouseEvent) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, records, onSelect, onEdit, onDelete, onImport, onBackup }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('全部');

  // Compute unique groups from records
  const groups = useMemo(() => {
    const uniqueGroups = new Set(records.map(r => r.group || '默认分组'));
    return ['全部', ...Array.from(uniqueGroups).sort()];
  }, [records]);

  // Filter records based on search and group
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Search Filter (Split by space for multi-term search)
      const rawTerm = searchTerm.trim().toLowerCase();
      const recGroup = rec.group || '默认分组';
      
      let matchesSearch = true;
      if (rawTerm) {
          const terms = rawTerm.split(/\s+/); // Split by whitespace
          
          // Construct searchable string
          const chartStr = `
            ${rec.chart.year.stem}${rec.chart.year.branch}
            ${rec.chart.month.stem}${rec.chart.month.branch}
            ${rec.chart.day.stem}${rec.chart.day.branch}
            ${rec.chart.hour.stem}${rec.chart.hour.branch}
          `.replace(/\s+/g, ''); 
          
          const fullSearchText = `${rec.name.toLowerCase()} ${recGroup.toLowerCase()} ${chartStr}`;
          
          // Check if ALL terms are present
          matchesSearch = terms.every(t => fullSearchText.includes(t));
      }

      // Group Filter
      const matchesGroup = selectedGroup === '全部' || recGroup === selectedGroup;
      
      return matchesSearch && matchesGroup;
    });
  }, [records, searchTerm, selectedGroup]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Content */}
      <div className="relative w-[85%] max-w-sm h-full bg-[#fffcf5] shadow-2xl flex flex-col font-sans animate-slideLeft border-l border-[#d6cda4] pt-[env(safe-area-inset-top)]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#d6cda4] flex justify-between items-center bg-[#fff8ea] shrink-0">
          <h2 className="text-lg font-bold text-[#8B0000] font-serif flex items-center gap-2">
            <Clock size={18} /> 历史档案
          </h2>
          <button onClick={onClose} className="text-[#8B0000]/50 hover:text-[#8B0000] transition-colors p-1 rounded-full hover:bg-[#8B0000]/10">
            <X size={24} />
          </button>
        </div>

        {/* Search & Filter Area */}
        <div className="p-3 bg-[#fffcf5] border-b border-[#ebe5ce] space-y-3 shrink-0">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a89f91]" size={14} />
                <input 
                    type="text" 
                    placeholder="搜姓名 或八字(如:甲子 丙寅)..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-[#d6cda4] rounded-full py-2 pl-9 pr-4 text-sm text-[#450a0a] focus:border-[#8B0000] focus:ring-1 focus:ring-[#8B0000]/20 outline-none placeholder-[#d6cda4] transition-all"
                />
            </div>

            {/* Group Pills - Horizontal Scroll */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                {groups.map(group => (
                    <button
                        key={group}
                        onClick={() => setSelectedGroup(group)}
                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-sm ${
                            selectedGroup === group 
                            ? 'bg-[#8B0000] text-[#fff8ea] border-[#8B0000]' 
                            : 'bg-white text-[#5c4033] border-[#d6cda4] hover:border-[#8B0000]/50'
                        }`}
                    >
                        {group}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
            
            {/* Records List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#fdfbf6] overscroll-contain">
              {filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-[#a89f91] space-y-2">
                    <Search size={32} opacity={0.2} />
                    <span className="text-xs">暂无匹配记录</span>
                </div>
              ) : (
                filteredRecords.map((rec) => (
                  <div 
                    key={rec.id} 
                    onClick={() => { onSelect(rec); onClose(); }}
                    className="bg-white border border-[#e5e0d0] rounded-lg shadow-sm p-3 active:scale-[0.98] active:bg-[#fff8ea] transition-all relative group cursor-pointer hover:shadow-md hover:border-[#d6cda4]"
                  >
                    {/* Top Row: Name, Gender & Group Badge */}
                    <div className="flex justify-between items-start mb-2 pr-12"> {/* pr-12 to make room for actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-[#450a0a]">{rec.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rec.gender === '乾造' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                                {rec.gender}
                            </span>
                            {(rec.group && rec.group !== '默认分组') && (
                                <span className="text-[10px] text-[#8B0000] bg-[#fff8ea] px-1.5 py-0.5 rounded border border-[#eaddcf] font-bold">
                                    {rec.group}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons (Edit & Delete) - Positioned Top Right */}
                    <div className="absolute top-3 right-3 flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(rec); onClose(); }}
                            className="text-[#a89f91] hover:text-[#8B0000] p-1.5 rounded-full hover:bg-[#eaddcf] transition-colors"
                            title="编辑案例"
                        >
                            <Edit3 size={15} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }}
                            className="text-[#a89f91] hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                            title="删除案例"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>

                    {/* Middle Row: Date Details */}
                    <div className="text-xs text-[#5c4033] space-y-0.5 mb-2 font-mono opacity-80">
                        <div className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#d6cda4]"></span>
                            {rec.birthDate} {rec.birthTime}
                        </div>
                        {/* BaZi Row */}
                        <div className="flex items-center gap-2 text-sm text-[#450a0a] font-serif font-medium mt-1 pl-2 border-l-2 border-[#d6cda4]/50">
                             <span>{rec.chart.year.stem}{rec.chart.year.branch}</span>
                             <span>{rec.chart.month.stem}{rec.chart.month.branch}</span>
                             <span>{rec.chart.day.stem}{rec.chart.day.branch}</span>
                             <span>{rec.chart.hour.stem}{rec.chart.hour.branch}</span>
                        </div>
                    </div>

                    <ChevronRight className="absolute right-2 bottom-3 text-[#d6cda4]/50 group-hover:text-[#d6cda4] transition-colors" size={16} />
                  </div>
                ))
              )}
            </div>

        </div>
        
        {/* Footer Actions */}
        <div className="p-3 border-t border-[#d6cda4] bg-[#fffcf5] flex gap-2 shrink-0">
            <button 
                onClick={onBackup}
                className="flex-1 flex items-center justify-center gap-1 bg-[#eaddcf] text-[#5c4033] py-2 rounded text-xs font-bold hover:bg-[#d6cda4] transition-colors"
            >
                <Download size={14} /> 备份数据
            </button>
            <button 
                onClick={onImport}
                className="flex-1 flex items-center justify-center gap-1 bg-[#8B0000] text-white py-2 rounded text-xs font-bold hover:bg-[#7a0000] transition-colors"
            >
                <Upload size={14} /> 恢复数据
            </button>
        </div>

        {/* Stats */}
        <div className="pb-4 pt-1 text-center text-[10px] text-[#a89f91] bg-[#fffcf5] shrink-0">
            共 {records.length} 条档案
        </div>
      </div>
    </div>
  );
};