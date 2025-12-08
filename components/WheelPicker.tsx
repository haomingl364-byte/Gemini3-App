import React, { useRef, useEffect, useState } from 'react';

interface WheelPickerProps {
  options: { label: string; value: number | string }[];
  value: number | string;
  onChange: (value: any) => void;
  label?: string; // e.g. "年"
  className?: string;
}

const ITEM_HEIGHT = 40; // Height of each item in px

export const WheelPicker: React.FC<WheelPickerProps> = ({ 
  options, 
  value, 
  onChange, 
  label,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<any>(null);

  // Initialize scroll position when value changes externally (and not scrolling)
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const selectedIndex = options.findIndex(o => o.value === value);
      if (selectedIndex !== -1) {
        // Only scroll if significantly different to avoid fighting with scroll events
        const currentScroll = containerRef.current.scrollTop;
        const targetScroll = selectedIndex * ITEM_HEIGHT;
        if (Math.abs(currentScroll - targetScroll) > 5) {
             containerRef.current.scrollTop = targetScroll;
        }
      }
    }
  }, [value, options, isScrolling]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    const scrollTop = e.currentTarget.scrollTop;
    // Calculate index immediately
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    // Immediate feedback (Fluidity)
    if (index >= 0 && index < options.length) {
         const newValue = options[index].value;
         if (newValue !== value) {
             onChange(newValue);
         }
    }

    // Snap detection (Snap only when scroll stops)
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
      if (index >= 0 && index < options.length) {
         if (containerRef.current) {
             containerRef.current.scrollTo({
                 top: index * ITEM_HEIGHT,
                 behavior: 'smooth'
             });
         }
      }
    }, 150); // Wait 150ms after last scroll event to snap
  };

  return (
    <div className={`relative h-[120px] w-full overflow-hidden ${className}`}>
        {/* Selection Highlight Bar (Center) */}
        <div className="absolute top-1/2 left-0 right-0 h-[40px] -translate-y-1/2 bg-[#eaddcf]/40 border-t border-b border-[#8B0000]/20 pointer-events-none z-0"></div>

        {/* Scroll Container */}
        <div 
            ref={containerRef}
            className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative z-10 py-[40px]" // padding top/bottom = (Height - ItemHeight)/2 = (120 - 40)/2 = 40
            onScroll={handleScroll}
        >
            {options.map((opt, i) => (
                <div 
                    key={opt.value} 
                    className={`h-[40px] flex items-center justify-center snap-center transition-all duration-150 cursor-pointer ${
                        opt.value === value 
                        ? 'text-[#8B0000] font-bold text-lg scale-110' 
                        : 'text-[#a89f91] text-sm scale-90 opacity-60'
                    }`}
                    onClick={() => {
                        if (containerRef.current) {
                            containerRef.current.scrollTo({
                                top: i * ITEM_HEIGHT,
                                behavior: 'smooth'
                            });
                            onChange(opt.value);
                        }
                    }}
                >
                    {opt.label}{label && <span className="text-xs ml-0.5 font-normal opacity-70">{label}</span>}
                </div>
            ))}
        </div>

        {/* Gradients for fading effect */}
        <div className="absolute top-0 left-0 right-0 h-[40px] bg-gradient-to-b from-[#fff8ea] to-transparent pointer-events-none z-20"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[40px] bg-gradient-to-t from-[#fff8ea] to-transparent pointer-events-none z-20"></div>
    </div>
  );
};