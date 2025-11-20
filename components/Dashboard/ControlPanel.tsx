import React from 'react';
import { useOpticalStore } from '../../store/useOpticalStore';
import { Slider } from '../UI/Slider';
import { SensorType } from '../../types';

export const ControlPanel: React.FC = () => {
  const { 
    focalLength, setFocalLength,
    aperture, setAperture,
    focusDistance, setFocusDistance,
    sensorType, setSensorType,
    setPreset
  } = useOpticalStore();

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Parameters</h2>
        <p className="text-xs text-slate-400">Adjust optical variables</p>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-3 gap-2">
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
            {Object.values(SensorType).map((t) => (
                <option key={t} value={t}>{t}</option>
            ))}
        </select>
      </div>

      <div className="space-y-6">
        <Slider
          label="Focal Length"
          value={focalLength}
          min={18}
          max={200}
          step={1}
          unit="mm"
          onChange={setFocalLength}
        />
        
        <Slider
          label="Aperture"
          value={aperture}
          min={1.2}
          max={22}
          step={0.1}
          unit=" ƒ"
          onChange={setAperture}
        />

        <Slider
          label="Focus Distance"
          value={focusDistance}
          min={0.5}
          max={30}
          step={0.1}
          unit="m"
          onChange={setFocusDistance}
        />
      </div>

      <div className="mt-auto p-3 bg-blue-900/20 border border-blue-900/50 rounded text-xs text-blue-200">
        <span className="font-bold">Tip:</span> Lower aperture (f/1.4) creates shallower depth of field. Higher focal lengths compress the background blur.
      </div>
    </div>
  );
};