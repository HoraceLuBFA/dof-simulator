
import React, { useMemo } from 'react';
import { useOpticalStore } from '../../store/useOpticalStore';
import { calculateOptics, SENSOR_DATA, getSensorDimensions } from '../../utils/optics';
import clsx from 'clsx';

export const MathPanel: React.FC = () => {
  const { focalLength, aperture, focusDistance, sensorType } = useOpticalStore();
  
  const metrics = useMemo(() => 
    calculateOptics(focalLength, aperture, focusDistance, sensorType),
    [focalLength, aperture, focusDistance, sensorType]
  );

  const sensor = SENSOR_DATA[sensorType];

  // Calculate Horizontal Field of View
  const fov = useMemo(() => {
      const { width } = getSensorDimensions(sensorType);
      // FOV = 2 * atan(sensorWidth / (2 * focalLength))
      // Result in radians, convert to degrees
      return (2 * Math.atan(width / (2 * focalLength)) * (180 / Math.PI));
  }, [sensorType, focalLength]);

  const formatNum = (n: number) => {
    if (n === Infinity) return '∞';
    return n.toFixed(2);
  };

  return (
    <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col gap-4 font-mono text-sm h-full overflow-y-auto">
      <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-2 border-b border-slate-700 pb-2">Physics Engine</h3>
      
      {/* Row 1: Hyperfocal & Total DoF */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Hyperfocal Distance">
              <span>Hyperfocal (<i>H</i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">H = f²/(N·c) + f</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-cyan-300 font-bold text-lg">
               {formatNum(metrics.hyperfocalDistance)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Total Depth of Field">
              <span>Total DoF (<i>D<sub>total</sub></i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">D_total = Df - Dn</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-white font-bold text-lg">
               {formatNum(metrics.totalDepth)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
      </div>

      {/* Row 2: Near & Far Limits */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Near Focus Limit">
              <span>Near Limit (<i>D<sub>n</sub></i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">Dn = H·s / (H + s - f)</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-emerald-300 font-bold text-lg">
                {formatNum(metrics.nearLimit)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Far Focus Limit">
              <span>Far Limit (<i>D<sub>f</sub></i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">Df = H·s / (H - s + f)</span>
            </div>
             <div className={clsx("p-2 bg-slate-900 rounded border border-slate-700 font-bold text-lg", metrics.farLimit === Infinity ? "text-yellow-400" : "text-rose-300")}>
                {formatNum(metrics.farLimit)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
      </div>

      {/* Row 3: DoF Front & Behind */}
      <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col">
                <span>DoF Front</span>
                <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">s - Dn</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-emerald-200 font-bold text-lg">
                {formatNum(metrics.dofInFront)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col">
                <span>DoF Behind</span>
                <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">Df - s</span>
            </div>
             <div className={clsx("p-2 bg-slate-900 rounded border border-slate-700 font-bold text-lg", metrics.dofBehind === Infinity ? "text-yellow-200" : "text-rose-200")}>
                {formatNum(metrics.dofBehind)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
          </div>
      </div>

      {/* Row 4: CoC & FOV */}
      <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-slate-700">
        <div className="bg-slate-700/30 p-2 rounded border border-slate-600/50">
            <div className="text-xs text-slate-400 flex flex-col">
              <span>CoC Limit (<i>c</i>)</span>
              <span className="text-[10px] text-slate-500/70 font-mono mt-0.5">Sensor Constant</span>
            </div>
            <div className="text-white font-bold text-lg">{sensor.coc.toFixed(3)} <span className="text-xs font-normal text-slate-400">mm</span></div>
        </div>
        <div className="bg-slate-700/30 p-2 rounded border border-slate-600/50">
            <div className="text-xs text-slate-400 flex flex-col">
              <span>H-FOV (<i>α</i>)</span>
              <span className="text-[10px] text-slate-500/70 font-mono mt-0.5">α = 2·atan(w / 2f)</span>
            </div>
            <div className="text-white font-bold text-lg">{fov.toFixed(1)}°</div>
        </div>
      </div>
    </div>
  );
};
