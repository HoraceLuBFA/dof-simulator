
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useOpticalStore } from '../../store/useOpticalStore';
import { calculateOptics, getSensorDimensions } from '../../utils/optics';

export const SchematicView: React.FC = () => {
  const { 
    focalLength, aperture, focusDistance, sensorType,
    distBlue, distGreen, distRed,
    posBlueX, posGreenX, posRedX,
    setDistBlue, setDistGreen, setDistRed,
    setPosBlueX, setPosGreenX, setPosRedX,
    cameraX,
    resetScene
  } = useOpticalStore();

  const [dragging, setDragging] = useState<'blue' | 'green' | 'red' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Use ref for offset to avoid stale closures during drag
  const dragOffset = useRef<{ x: number, z: number }>({ x: 0, z: 0 });
  
  // Dynamic dimensions state
  const [dimensions, setDimensions] = useState({ width: 400, height: 200 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const metrics = useMemo(() => 
    calculateOptics(focalLength, aperture, focusDistance, sensorType),
    [focalLength, aperture, focusDistance, sensorType]
  );

  // Visualization Config
  const SVG_HEIGHT = dimensions.height;
  const SVG_WIDTH = dimensions.width;
  
  // --- ISOTROPIC SCALING ---
  // Define the real-world area we want to fit in the view
  const WORLD_WIDTH_METERS = 24; // +/- 12m
  const WORLD_DEPTH_METERS = 20; // 0 to 30m
  const TOP_PADDING = 40;
  const BOTTOM_PADDING = 5;
  
  // Calculate scale (Pixels per Meter) for both dimensions
  const scaleX = SVG_WIDTH / WORLD_WIDTH_METERS;
  const scaleZ = (SVG_HEIGHT - TOP_PADDING - BOTTOM_PADDING) / WORLD_DEPTH_METERS;
  
  // Use the smaller scale to ensure the defined world area fits entirely without distortion
  // But we prioritize width fill slightly for better usage of wide screens
  const PPM = Math.min(scaleX, scaleZ); 

  const CENTER_X = SVG_WIDTH / 2;
  const BOTTOM_Y = SVG_HEIGHT - BOTTOM_PADDING;

  // Mapping Functions
  const mapZ = (meters: number) => BOTTOM_Y - (meters * PPM);
  const mapX = (metersX: number) => CENTER_X + (metersX * PPM);

  // Inverse Mapping (Pixels -> Meters)
  const mapPixelsToZ = (py: number) => (BOTTOM_Y - py) / PPM;
  const mapPixelsToX = (px: number) => (px - CENTER_X) / PPM;


  // Frustum Calculation for Visualization
  const getFrustumHalfWidthPx = (zMeters: number) => {
    const { width } = getSensorDimensions(sensorType);
    const fovRad = Math.atan((width / 2) / focalLength); 
    const realHalfWidth = zMeters * Math.tan(fovRad);
    return realHalfWidth * PPM;
  };

  const getMousePos = (e: React.PointerEvent) => {
    if (!svgRef.current) return { z: 0, x: 0 };
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { z: 0, x: 0 };
    
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(ctm.inverse());
    
    return {
        z: mapPixelsToZ(svgP.y),
        x: mapPixelsToX(svgP.x)
    };
  };

  const handlePointerDown = (e: React.PointerEvent, obj: 'blue' | 'green' | 'red', currentZ: number, currentX: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (svgRef.current) {
        svgRef.current.setPointerCapture(e.pointerId);
    }
    const mouse = getMousePos(e);
    dragOffset.current = {
        z: currentZ - mouse.z,
        x: currentX - mouse.x
    };
    setDragging(obj);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;
    e.preventDefault();
    const mouse = getMousePos(e);
    
    // Calculate new Z
    let newZ = mouse.z + dragOffset.current.z;
    if (newZ < 0.5) newZ = 0.5;
    if (newZ > WORLD_DEPTH_METERS) newZ = WORLD_DEPTH_METERS;

    // Calculate new X
    let newX = mouse.x + dragOffset.current.x;
    const MAX_X_METERS = 10;
    if (newX < -MAX_X_METERS) newX = -MAX_X_METERS;
    if (newX > MAX_X_METERS) newX = MAX_X_METERS;

    if (dragging === 'blue') { setDistBlue(newZ); setPosBlueX(newX); }
    if (dragging === 'green') { setDistGreen(newZ); setPosGreenX(newX); }
    if (dragging === 'red') { setDistRed(newZ); setPosRedX(newX); }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(null);
    if (svgRef.current) {
        svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Camera Position
  const cameraSvgY = mapZ(0);
  const cameraSvgX = mapX(cameraX);
  
  const focusY = mapZ(focusDistance);
  const nearY = mapZ(metrics.nearLimit);
  
  // Frustum Drawing
  const farLimitMeters = WORLD_DEPTH_METERS + 5; 
  const frustumY = mapZ(farLimitMeters);
  const frustumW = getFrustumHalfWidthPx(farLimitMeters);
  
  const frustumPath = `
    M ${cameraSvgX} ${cameraSvgY}
    L ${cameraSvgX - frustumW} ${frustumY}
    M ${cameraSvgX} ${cameraSvgY}
    L ${cameraSvgX + frustumW} ${frustumY}
  `;

  // DoF Zone
  const cappedFar = Math.min(metrics.farLimit, farLimitMeters);
  const showFullFar = metrics.farLimit === Infinity || metrics.farLimit >= WORLD_DEPTH_METERS;

  const wNear = getFrustumHalfWidthPx(metrics.nearLimit);
  const wFar = showFullFar ? frustumW : getFrustumHalfWidthPx(cappedFar);
  const yFarReal = showFullFar ? frustumY : mapZ(cappedFar);

  const dofPath = `
    M ${cameraSvgX - wNear} ${nearY}
    L ${cameraSvgX + wNear} ${nearY}
    L ${cameraSvgX + wFar} ${yFarReal}
    L ${cameraSvgX - wFar} ${yFarReal}
    Z
  `;

  const objects = [
    { id: 'blue' as const, z: distBlue, x: posBlueX, color: '#3b82f6', label: 'Blue' },
    { id: 'green' as const, z: distGreen, x: posGreenX, color: '#10b981', label: 'Green' },
    { id: 'red' as const, z: distRed, x: posRedX, color: '#ef4444', label: 'Red' }
  ];

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] lg:min-h-0 overflow-hidden relative flex flex-col flex-1 select-none p-4 pt-12"
    >
        <p className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-cyan-300 bg-slate-900/80 px-2 py-1 rounded border border-cyan-800/60 backdrop-blur pointer-events-none">
          Schematic (Drag Points)
        </p>
      
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="cursor-crosshair touch-none"
      >
        
        {/* Grid Lines */}
        {Array.from({ length: 8 }).map((_, i) => {
          // 0, 5, 10, ...
          const z = i * 5;
          const y = mapZ(z);
          if (y < 10 || y > SVG_HEIGHT) return null;
          
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={SVG_WIDTH} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <text x={SVG_WIDTH - 25} y={y - 2} fill="#475569" fontSize="10" fontFamily="monospace">{z}m</text>
            </g>
          );
        })}
        
        {/* Center Axis Line */}
        <line x1={CENTER_X} y1={0} x2={CENTER_X} y2={SVG_HEIGHT} stroke="#1e293b" strokeWidth="1" />

        {/* Camera Frustum */}
        <path d={frustumPath} stroke="#334155" strokeWidth="1" fill="none" opacity="0.5" />
        
        {/* Angle Arc */}
        <path 
            d={`M ${cameraSvgX - 20} ${cameraSvgY - 60} Q ${cameraSvgX} ${cameraSvgY - 50} ${cameraSvgX + 20} ${cameraSvgY - 60}`} 
            stroke="#334155" strokeWidth="1" fill="none" opacity="0.2" 
        />

        {/* DoF Zone */}
        <path 
          d={dofPath} 
          fill="url(#dofGradient)"
          opacity="0.4"
        />
        
        {/* Focus Plane */}
        <line x1={0} y1={focusY} x2={SVG_WIDTH} y2={focusY} stroke="#ffffff" strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
        <text x="10" y={focusY - 5} fill="#ffffff" fontSize="10" className="font-mono">FOCUS PLANE</text>

        <defs>
          <linearGradient id="dofGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Draggable Objects */}
        {objects.map((obj) => {
            const y = mapZ(obj.z);
            const x = mapX(obj.x);
            return (
                <g 
                  key={obj.id} 
                  className="cursor-move"
                  onPointerDown={(e) => handlePointerDown(e, obj.id, obj.z, obj.x)}
                >
                    <circle cx={x} cy={y} r="20" fill="transparent" />
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={dragging === obj.id ? 9 : 7} 
                      fill={obj.color} 
                      stroke="white" 
                      strokeWidth="2"
                    />
                    <text x={x + 12} y={y + 4} fill={obj.color} fontSize="10" fontWeight="bold">
                        {obj.label} {obj.z.toFixed(1)}m
                    </text>
                </g>
            )
        })}

        {/* Camera Icon */}
        <path d={`M ${cameraSvgX - 10} ${cameraSvgY} L ${cameraSvgX + 10} ${cameraSvgY} L ${cameraSvgX} ${cameraSvgY - 10} Z`} fill="#cbd5e1" />
      </svg>

      <button 
        onClick={resetScene}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors active:scale-95"
      >
        Reset Position
      </button>
    </div>
  );
};
