import React from 'react';
import { Pillar, ElementType } from '../types';
import { ELEMENT_COLORS } from '../constants';

interface PillarDisplayProps {
  title: string; 
  pillar: Pillar;
  isDayMaster?: boolean;
}

export const PillarDisplay: React.FC<PillarDisplayProps> = ({ pillar }) => {
  const getStemColor = (type: ElementType) => ELEMENT_COLORS[type];
  const getBranchColor = (type: ElementType) => ELEMENT_COLORS[type];

  return (
    <div className="flex flex-col items-center text-center relative w-full">
      {/* 1. Stem Ten God (Top) - Very Small */}
      <div className="h-4 flex items-end justify-center mb-0.5">
        <span className="text-[9px] text-stone-500 font-medium scale-90 origin-bottom">
          {pillar.stemTenGod}
        </span>
      </div>

      {/* 2. Stem */}
      <div className={`text-xl font-serif font-bold leading-none ${getStemColor(pillar.stemElement)}`}>
        {pillar.stem}
      </div>

      {/* 3. Branch */}
      <div className={`text-xl font-serif font-bold leading-none mt-1 ${getBranchColor(pillar.branchElement)}`}>
        {pillar.branch}
      </div>

      {/* 4. Hidden Stems - Tighter vertical stacking */}
      <div className="flex flex-col w-full items-center mt-1 min-h-[45px] space-y-0">
        {pillar.hiddenStems.map((hs, idx) => (
          <div key={idx} className="flex items-center gap-0.5 text-[9px] leading-[1.1] w-full justify-center scale-90">
            <span className={`${ELEMENT_COLORS[hs.element]} font-bold`}>
              {hs.stem}
            </span>
            <span className="text-stone-400">
              {hs.tenGod}
            </span>
          </div>
        ))}
      </div>
      
      {/* 5. Life Stage */}
      <div className="w-full text-center mt-0.5">
        <span className="text-[10px] text-stone-600 block scale-90">
           {pillar.lifeStage}
        </span>
      </div>

      {/* 6. Kong Wang */}
      {pillar.kongWang && (
          <div className="text-[8px] text-red-500 scale-75 -mt-0.5">[空]</div>
      )}

      {/* 7. Shen Sha - Condensed */}
      <div className="mt-1 flex flex-col gap-0 w-full items-center border-t border-dotted border-stone-300 pt-0.5">
         {pillar.shenSha.map((sha, idx) => (
             <span key={idx} className={`text-[8px] leading-tight scale-90 whitespace-nowrap ${sha === '驿马' || sha === '咸池' ? 'text-red-700' : 'text-stone-400'}`}>
                 {sha}
             </span>
         ))}
      </div>
    </div>
  );
};