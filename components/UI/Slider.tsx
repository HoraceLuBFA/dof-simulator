import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  unitPosition?: 'prefix' | 'suffix';
  displayValue?: string;
  onChange: (val: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  unit, 
  unitPosition = 'suffix',
  displayValue,
  onChange 
}) => {
  const formattedValue =
    displayValue ??
    (unitPosition === 'prefix'
      ? `${unit ?? ''}${value}`
      : `${value}${unit ?? ''}`);

  return (
    <div className="mb-4 group">
      <div className="flex justify-between mb-1 text-sm">
        <span className="text-slate-400 font-mono group-hover:text-cyan-400 transition-colors">{label}</span>
        <span className="text-cyan-400 font-bold font-mono">
          {formattedValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      />
    </div>
  );
};
