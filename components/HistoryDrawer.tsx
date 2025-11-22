import React from 'react';
import { Record } from '../types';
import { X, Clock, Trash2 } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: Record[];
  onSelect: (record: Record) => void;
  onDelete: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, records, onSelect, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* Content */}
      <div className="relative w-3/4 max-w-sm h-full bg-[#fffcf5] border-l border-[#d6cda4] shadow-2xl flex flex-col">
        <div className="p-4 border-b border-[#d6cda4] flex justify-between items-center bg-[#fff8ea]">
          <h2 className="text-lg font-bold text-[#8B0000] font-serif">档案记录</h2>
          <button onClick={onClose} className="text-[#8B0000]/50 hover:text-[#8B0000]">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {records.length === 0 ? (
            <div className="text-center text-[#8B0000]/30 mt-10">暂无记录</div>
          ) : (
            records.map((rec) => (
              <div 
                key={rec.id} 
                className="bg-white border border-[#e5e0d0] rounded shadow-sm p-3 active:bg-[#fefce8] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => {
                      onSelect(rec);
                      onClose();
                    }}
                  >
                    <h3 className="font-bold text-[#450a0a]">{rec.name}</h3>
                    <p className="text-xs text-stone-500 mt-1">{rec.gender} | {rec.chart.solarDateStr.split(' ')[0]}</p>
                    <p className="text-xs text-[#a89f91] mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(rec.id);
                    }}
                    className="p-2 text-[#8B0000]/70 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};