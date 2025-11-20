
import React from 'react';
import { useOpticalStore } from '../../store/useOpticalStore';
import { Slider } from '../UI/Slider';
import { SensorType } from '../../types';
import { getSensorDimensions } from '../../utils/optics';

export const ControlPanel: React.FC = () => {
  const { 
    focalLength, setFocalLength,
    aperture, setAperture,
    focusDistance, setFocusDistance,
    sensorType, setSensorType,
    setPreset
  } = useOpticalStore();

  return (
    <div className="relative p-6 pt-12 h-full flex flex-col gap-6 overflow-y-auto">
      <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-amber-300 bg-slate-900/80 px-2 py-1 rounded border border-amber-800/60 backdrop-blur">
        Optical Variables
      </span>

      {/* Quick Presets */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {(['portrait', 'landscape', 'macro'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className="px-2 py-1 text-xs font-bold uppercase rounded bg-slate-800 hover:bg-cyan-900 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {/* Sensor Type */}
        <label className="text-xs text-slate-400 font-mono block mb-1">Sensor Format</label>
        <select 
            value={sensorType}
            onChange={(e) => setSensorType(e.target.value as SensorType)}
            className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
        >
            {Object.values(SensorType).map((t) => {
                const dims = getSensorDimensions(t);
                return (
                    <option key={t} value={t}>
                        {t} ({dims.width}×{dims.height}mm)
                    </option>
                );
            })}
        </select>
      </div>

      <div className="space-y-6">
        <Slider
          label="Focal Length"
          value={focalLength}
          min={18}
          max={200}
          step={1}
          unit=" mm"
          onChange={setFocalLength}
        />
        
        <Slider
          label="Aperture"
          value={aperture}
          min={1.2}
          max={22}
          step={0.1}
          unit="ƒ "
          unitPosition="prefix"
          onChange={setAperture}
        />

        <Slider
          label="Focus Distance"
          value={focusDistance}
          min={0.5}
          max={30}
          step={0.1}
          unit=" m"
          onChange={setFocusDistance}
        />
      </div>

    </div>
  );
};
