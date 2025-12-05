
import React, { useState, useMemo } from 'react';
import { Record } from '../types';
import { X, Clock, Trash2, Search, Folder, ChevronRight, User } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: Record[];
  onSelect: (record: Record) => void;
  onDelete: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, records, onSelect, onDelete }) => {
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
      // Search matches name OR group name
      const term = searchTerm.toLowerCase();
      const recGroup = rec.group || '默认分组';
      
      const matchesSearch = rec.name.toLowerCase().includes(term) || recGroup.toLowerCase().includes(term);
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
                    placeholder="搜索姓名或分组..." 
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#fdfbf6]">
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
                {/* Top Row: Name & Gender */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#450a0a]">{rec.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rec.gender === '乾造' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                            {rec.gender}
                        </span>
                    </div>
                    {/* Delete Button (visible on hover or always on mobile) */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }}
                        className="text-[#a89f91] hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Middle Row: Date Details */}
                <div className="text-xs text-[#5c4033] space-y-0.5 mb-3 font-mono opacity-80">
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#d6cda4]"></span>
                        {rec.birthDate} {rec.birthTime}
                    </div>
                    <div className="flex items-center gap-1">
                         <span className="w-1 h-1 rounded-full bg-[#d6cda4]"></span>
                         {rec.chart.year.stem}{rec.chart.year.branch}年 {rec.chart.month.stem}{rec.chart.month.branch}月 {rec.chart.day.stem}{rec.chart.day.branch}日
                    </div>
                </div>

                {/* Bottom Row: Group Badge & City */}
                <div className="flex justify-between items-end border-t border-[#f5f0e1] pt-2">
                    <div className="flex items-center gap-1 text-[10px] text-[#8B0000] bg-[#fff8ea] px-2 py-1 rounded-full border border-[#eaddcf]">
                        <Folder size={10} />
                        <span className="font-bold truncate max-w-[100px]">{rec.group || '默认分组'}</span>
                    </div>
                    
                    {rec.city && rec.city !== '不参考出生地 (北京时间)' && (
                        <div className="text-[10px] text-[#a89f91] truncate max-w-[80px]">
                            {rec.city}
                        </div>
                    )}
                </div>
                
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-[#d6cda4]/50 group-hover:text-[#d6cda4] transition-colors" size={20} />
              </div>
            ))
          )}
        </div>
        
        {/* Footer Stats */}
        <div className="p-2 border-t border-[#d6cda4] bg-[#fffcf5] text-center text-[10px] text-[#a89f91]">
            共 {records.length} 条档案
        </div>
      </div>
    </div>
  );
};
