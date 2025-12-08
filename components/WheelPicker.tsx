import React, { useRef, useEffect } from 'react';

interface WheelPickerProps {
  options: { label: string; value: number | string }[];
  value: number | string;
  onChange: (value: any) => void;
  label?: string; // e.g. "年"
  className?: string;
  expanded?: boolean; // Controlled from parent
  onInteract?: () => void; // Trigger parent expansion
}

const ITEM_HEIGHT = 40; // Height of each item in px
// Config for Dynamic Expansion
const ROWS_STATIC = 3;
const ROWS_ACTIVE = 5;

const HEIGHT_STATIC = ITEM_HEIGHT * ROWS_STATIC; // 120px
const HEIGHT_ACTIVE = ITEM_HEIGHT * ROWS_ACTIVE; // 200px

const PADDING_STATIC = (HEIGHT_STATIC - ITEM_HEIGHT) / 2; // 40px
const PADDING_ACTIVE = (HEIGHT_ACTIVE - ITEM_HEIGHT) / 2; // 80px

export const WheelPicker: React.FC<WheelPickerProps> = ({ 
  options, 
  value, 
  onChange, 
  label,
  className = '',
  expanded = false,
  onInteract
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHapticIndex = useRef<number>(-1);
  const isInternalScroll = useRef(false);
  const lastEmittedValue = useRef<number | string | null>(null);

  // Initialize scroll position
  useEffect(() => {
    if (containerRef.current) {
      // If the new value matches what we just emitted via scroll, 
      // DO NOT force the scroll position. Let CSS snap finish smoothly.
      if (value === lastEmittedValue.current) {
          return;
      }

      const selectedIndex = options.findIndex(o => o.value === value);
      if (selectedIndex !== -1) {
        const targetScroll = selectedIndex * ITEM_HEIGHT;
        
        // Only adjust if significantly off to prevent fighting with scroll snap
        if (Math.abs(containerRef.current.scrollTop - targetScroll) > 5) {
             isInternalScroll.current = true;
             containerRef.current.scrollTop = targetScroll;
             // Reset internal flag after a short delay
             setTimeout(() => { isInternalScroll.current = false; }, 50);
        }
      }
    }
  }, [value, options]); // Removed expanded from dependency to avoid scroll jump on expand

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // If scroll was programmatically triggered by useEffect, ignore logic
    if (isInternalScroll.current) return;

    // NOTE: Removed onInteract() call here. 
    // Expansion should only happen on explicit touch/click, not momentum scroll.
    // This allows the picker to be collapsed externally (e.g. input focus) while still settling.
    
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    // Haptic Feedback & Value Update
    if (index !== lastHapticIndex.current) {
        // Haptic feedback (Vibration)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10); // Short vibration simulating a tick
        }
        
        lastHapticIndex.current = index;
        
        // Update value
        if (index >= 0 && index < options.length) {
             const newValue = options[index].value;
             if (newValue !== value) {
                 lastEmittedValue.current = newValue; // Track that we caused this change
                 onChange(newValue);
             }
        }
    }
  };

  const handleInteractionStart = () => {
      if (!expanded && onInteract) {
          onInteract();
      }
  };

  // Dynamic Styles
  const currentHeight = expanded ? HEIGHT_ACTIVE : HEIGHT_STATIC;
  const currentPadding = expanded ? PADDING_ACTIVE : PADDING_STATIC;

  return (
    <div 
        className={`relative w-full overflow-hidden select-none transition-all duration-300 ease-out ${className}`}
        style={{ 
            height: `${currentHeight}px`, 
            touchAction: 'pan-y' 
        }} 
    >
        {/* Selection Highlight Bar (Center) */}
        <div 
            className="absolute top-1/2 left-0 right-0 h-[40px] -translate-y-1/2 bg-[#8B0000]/5 rounded-sm pointer-events-none z-0 transition-colors duration-300"
        ></div>

        {/* Scroll Container */}
        <div 
            ref={containerRef}
            className="h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory no-scrollbar relative z-10 overscroll-contain"
            style={{ 
                paddingTop: `${currentPadding}px`, 
                paddingBottom: `${currentPadding}px`,
                transition: 'padding 0.3s ease-out', // Smooth padding animation to keep center alignment
                willChange: 'scroll-position'
            }}
            onScroll={handleScroll}
            onTouchStart={handleInteractionStart}
            onMouseDown={handleInteractionStart}
        >
            {options.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                    <div 
                        key={opt.value} 
                        className={`h-[40px] flex items-center justify-center snap-center transition-all duration-200 cursor-pointer w-full`}
                        onClick={() => {
                            if (containerRef.current) {
                                handleInteractionStart();
                                containerRef.current.scrollTo({
                                    top: i * ITEM_HEIGHT,
                                    behavior: 'smooth'
                                });
                            }
                        }}
                    >
                        <div className={`transition-all duration-200 flex items-center justify-center whitespace-nowrap ${
                            isSelected 
                            ? 'text-[#8B0000] font-bold text-xl scale-110 opacity-100' 
                            : 'text-[#a89f91] text-base scale-95 opacity-80 font-medium grayscale' 
                        }`}>
                           {opt.label}
                           {label && isSelected && <span className="text-[10px] ml-0.5 font-normal self-end mb-1 text-[#8B0000]/70">{label}</span>}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Gradients */}
        <div 
            className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[#fff8ea] via-[#fff8ea]/90 to-transparent pointer-events-none z-20 transition-all duration-300"
            style={{ height: expanded ? '24px' : '40px' }}
        ></div>
        <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#fff8ea] via-[#fff8ea]/90 to-transparent pointer-events-none z-20 transition-all duration-300"
            style={{ height: expanded ? '24px' : '40px' }}
        ></div>
    </div>
  );
};