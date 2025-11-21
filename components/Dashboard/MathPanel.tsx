
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
    <div className="relative p-6 pt-12 flex flex-col gap-3 font-mono text-sm h-full overflow-y-auto">
      <span className="absolute top-4 left-4 text-[10px] sm:text-xs font-sans font-bold uppercase tracking-wider text-cyan-300 bg-slate-900/80 px-2 py-1 rounded border border-cyan-800/60 backdrop-blur">
        Results
      </span>
      
      {/* Row 1: Hyperfocal & Total DoF */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Hyperfocal Distance">
              <span>Hyperfocal (<i>H</i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">H = f²/(N·c) + f</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-cyan-300 font-bold text-base leading-tight">
               {formatNum(metrics.hyperfocalDistance)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Total Depth of Field">
              <span>Total DoF (<i>D<sub>total</sub></i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">D_total = Df - Dn</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-white font-bold text-base leading-tight">
               {formatNum(metrics.totalDepth)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
      </div>

      {/* Row 2: Near & Far Limits */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Near Focus Limit">
              <span>Near Limit (<i>D<sub>n</sub></i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">Dn = H·s / (H + s - f)</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-emerald-300 font-bold text-base leading-tight">
                {formatNum(metrics.nearLimit)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col" title="Far Focus Limit">
              <span>Far Limit (<i>D<sub>f</sub></i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">Df = H·s / (H - s + f)</span>
            </div>
             <div className={clsx("p-2 bg-slate-900 rounded border border-slate-700 font-bold text-base leading-tight", metrics.farLimit === Infinity ? "text-yellow-400" : "text-rose-300")}>
                {formatNum(metrics.farLimit)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
        </div>
      </div>

      {/* Row 3: DoF Front & Behind */}
      <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col">
                <span>DoF Front</span>
                <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">s - Dn</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-emerald-200 font-bold text-base leading-tight">
                {formatNum(metrics.dofInFront)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col">
                <span>DoF Behind</span>
                <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">Df - s</span>
            </div>
             <div className={clsx("p-2 bg-slate-900 rounded border border-slate-700 font-bold text-base leading-tight", metrics.dofBehind === Infinity ? "text-yellow-200" : "text-rose-200")}>
                {formatNum(metrics.dofBehind)}<span className="text-xs ml-1 text-slate-500">m</span>
            </div>
          </div>
      </div>

      {/* Row 4: CoC & FOV */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col">
              <span>CoC Limit (<i>c</i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">Sensor Constant</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-white font-bold text-base leading-tight">
              {sensor.coc.toFixed(3)}<span className="text-xs ml-1 text-slate-500">mm</span>
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-xs text-slate-500 flex flex-col">
              <span>H-FOV (<i>α</i>)</span>
              <span className="text-[10px] text-slate-600 font-mono tracking-tighter mt-0.5">α = 2·atan(w / 2f)</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-700 text-white font-bold text-base leading-tight">
              {fov.toFixed(1)}°
            </div>
        </div>
      </div>
    </div>
  );
};
