import React, { useMemo } from 'react';
import { useOpticalStore } from '../../store/useOpticalStore';
import { calculateOptics, SENSOR_DATA } from '../../utils/optics';
import clsx from 'clsx';

export const MathPanel: React.FC = () => {
  const { focalLength, aperture, focusDistance, sensorType } = useOpticalStore();
  
  const metrics = useMemo(() => 
    calculateOptics(focalLength, aperture, focusDistance, sensorType),
    [focalLength, aperture, focusDistance, sensorType]
  );

  const sensor = SENSOR_DATA[sensorType];

  const formatNum = (n: number) => {
    if (n === Infinity) return '∞';
    return n.toFixed(2);
  };

  return (
    <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col gap-4 font-mono text-sm h-full overflow-y-auto">
      <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-2 border-b border-slate-700 pb-2">Physics Engine</h3>
      
      {/* Hyperfocal Calculation */}
      <div className="space-y-1">
        <div className="text-xs text-slate-500">Hyperfocal Distance (H)</div>
        <div className="p-2 bg-slate-900 rounded border border-slate-700 text-cyan-300 overflow-x-auto whitespace-nowrap">
          H ≈ f² / (N × c) <br/>
          <span className="text-slate-400">= {focalLength}² / ({aperture} × {sensor.coc.toFixed(3)})</span> <br/>
          <span className="text-white font-bold text-lg">= {formatNum(metrics.hyperfocalDistance)}m</span>
        </div>
      </div>

      {/* Near Limit */}
      <div className="space-y-1">
        <div className="text-xs text-slate-500">Near Limit ($D_n$)</div>
        <div className="p-2 bg-slate-900 rounded border border-slate-700 text-emerald-300 overflow-x-auto">
            D_n = (H × s) / (H + (s - f)) <br/>
            <span className="text-white font-bold text-lg">= {formatNum(metrics.nearLimit)}m</span>
        </div>
      </div>

      {/* Far Limit */}
      <div className="space-y-1">
        <div className="text-xs text-slate-500">Far Limit ($D_f$)</div>
        <div className="p-2 bg-slate-900 rounded border border-slate-700 text-rose-300 overflow-x-auto">
             D_f = (H × s) / (H - (s - f)) <br/>
             <span className={clsx("font-bold text-lg", metrics.farLimit === Infinity ? "text-yellow-400" : "text-white")}>
                = {formatNum(metrics.farLimit)}m
             </span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-slate-700/30 p-2 rounded">
            <div className="text-xs text-slate-400">Total DoF</div>
            <div className="text-white font-bold">{formatNum(metrics.totalDepth)}m</div>
        </div>
        <div className="bg-slate-700/30 p-2 rounded">
            <div className="text-xs text-slate-400">CoC (mm)</div>
            <div className="text-white font-bold">{sensor.coc.toFixed(3)}</div>
        </div>
      </div>
    </div>
  );
};