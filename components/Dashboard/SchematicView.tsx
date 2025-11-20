
import React, { useMemo, useState, useRef } from 'react';
import { useOpticalStore } from '../../store/useOpticalStore';
import { calculateOptics, getSensorDimensions } from '../../utils/optics';

export const SchematicView: React.FC = () => {
  const { 
    focalLength, aperture, focusDistance, sensorType,
    distBlue, distGreen, distRed,
    setDistBlue, setDistGreen, setDistRed
  } = useOpticalStore();

  const [dragging, setDragging] = useState<'blue' | 'green' | 'red' | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragOffset = useRef<number>(0);

  const metrics = useMemo(() => 
    calculateOptics(focalLength, aperture, focusDistance, sensorType),
    [focalLength, aperture, focusDistance, sensorType]
  );

  // FOV Calculation
  const fovRad = useMemo(() => {
    const { width } = getSensorDimensions(sensorType);
    // tan(theta) = (w/2) / f
    return Math.atan((width / 2) / focalLength); 
  }, [sensorType, focalLength]);

  // Visualization Config
  const SVG_HEIGHT = 300;
  const SVG_WIDTH = 400;
  const MAX_DISTANCE_DISPLAY = 30;

  // Helper to map Real World Meters (Z) to SVG Y Pixels
  const mapZ = (meters: number) => {
    const ratio = meters / MAX_DISTANCE_DISPLAY;
    if (ratio > 1.2) return -20; 
    // 20px padding bottom
    return SVG_HEIGHT - (ratio * SVG_HEIGHT * 0.9) - 20; 
  };

  // Helper to map Mouse Y to Meters
  const mapYtoZ = (y: number) => {
    const ratio = (SVG_HEIGHT - 20 - y) / (SVG_HEIGHT * 0.9);
    let m = ratio * MAX_DISTANCE_DISPLAY;
    return m;
  };

  // Calculate Frustum Width at specific Z distance (in SVG pixels)
  const getFrustumHalfWidthX = (zMeters: number) => {
    // Real world width at Z = 2 * Z * tan(theta)
    const realHalfWidth = zMeters * Math.tan(fovRad);
    
    // Scale factor: How many pixels represent 1 meter of width?
    // This is arbitrary for the diagram, but we want it to fit the screen.
    // Let's say at MAX_DISTANCE_DISPLAY, the width is 90% of SVG_WIDTH.
    
    // Actually, we want to represent the ANGLE accurately relative to the Z-axis.
    // We can just normalize it.
    // Let's make the cone angle visually pleasing but proportional.
    // If we use 1:1 scale, it might be too narrow for telephoto.
    // Let's scale the "width" axis by a factor to make it visible.
    const X_SCALE = 15; 
    return realHalfWidth * X_SCALE;
  };


  const getMouseZ = (e: React.PointerEvent) => {
    if (!svgRef.current) return 0;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(ctm.inverse());
    return mapYtoZ(svgP.y);
  };

  const handlePointerDown = (e: React.PointerEvent, obj: 'blue' | 'green' | 'red', currentZ: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (svgRef.current) {
        svgRef.current.setPointerCapture(e.pointerId);
    }
    const mouseZ = getMouseZ(e);
    dragOffset.current = currentZ - mouseZ;
    setDragging(obj);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;
    e.preventDefault();
    const mouseZ = getMouseZ(e);
    let newZ = mouseZ + dragOffset.current;
    if (newZ < 0.5) newZ = 0.5;
    if (newZ > MAX_DISTANCE_DISPLAY) newZ = MAX_DISTANCE_DISPLAY;

    if (dragging === 'blue') setDistBlue(newZ);
    if (dragging === 'green') setDistGreen(newZ);
    if (dragging === 'red') setDistRed(newZ);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(null);
    if (svgRef.current) {
        svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const cameraY = SVG_HEIGHT - 20;
  const cameraX = SVG_WIDTH / 2;
  
  const focusY = mapZ(focusDistance);
  const nearY = mapZ(metrics.nearLimit);
  const farY = metrics.farLimit === Infinity ? 0 : mapZ(metrics.farLimit);

  // Frustum Points
  const farLimitMeters = 35; // Draw frustum slightly past max
  const frustumY = mapZ(farLimitMeters);
  const frustumW = getFrustumHalfWidthX(farLimitMeters);
  
  const frustumPath = `
    M ${cameraX} ${cameraY}
    L ${cameraX - frustumW} ${frustumY}
    M ${cameraX} ${cameraY}
    L ${cameraX + frustumW} ${frustumY}
  `;

  // DoF Zone (Trapezoid clipped to Frustum)
  const wNear = getFrustumHalfWidthX(metrics.nearLimit);
  const wFar = getFrustumHalfWidthX(Math.min(metrics.farLimit, farLimitMeters));
  const yFarReal = metrics.farLimit === Infinity ? 0 : mapZ(metrics.farLimit);

  const dofPath = `
    M ${cameraX - wNear} ${nearY}
    L ${cameraX + wNear} ${nearY}
    L ${cameraX + wFar} ${yFarReal}
    L ${cameraX - wFar} ${yFarReal}
    Z
  `;

  // Focus Plane Line (Clipped to Frustum)
  const wFocus = getFrustumHalfWidthX(focusDistance);

  const objects = [
    { id: 'blue' as const, z: distBlue, color: '#3b82f6', label: 'Blue' },
    { id: 'green' as const, z: distGreen, color: '#10b981', label: 'Green' },
    { id: 'red' as const, z: distRed, color: '#ef4444', label: 'Red' }
  ];

  return (
    <div className="w-full h-full min-h-[300px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative flex flex-col items-center justify-center select-none">
        <p className="absolute top-2 left-3 text-xs text-slate-500 font-mono uppercase pointer-events-none">Schematic (Drag Points)</p>
      
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="cursor-crosshair touch-none"
      >
        
        {/* Grid Lines */}
        {Array.from({ length: 7 }).map((_, i) => {
          const z = i * 5;
          const y = mapZ(z);
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={SVG_WIDTH} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <text x={SVG_WIDTH - 25} y={y - 2} fill="#475569" fontSize="10" fontFamily="monospace">{z}m</text>
            </g>
          );
        })}

        {/* Camera Frustum Lines */}
        <path d={frustumPath} stroke="#334155" strokeWidth="1" fill="none" opacity="0.5" />
        
        {/* Angle Arc at Camera */}
        <path 
            d={`M ${cameraX - 20} ${cameraY - 60} Q ${cameraX} ${cameraY - 50} ${cameraX + 20} ${cameraY - 60}`} 
            stroke="#334155" strokeWidth="1" fill="none" opacity="0.2" 
        />

        {/* Depth of Field Zone (Trapezoid) */}
        <path 
          d={dofPath} 
          fill="url(#dofGradient)"
          opacity="0.4"
        />
        
        {/* Focus Plane Line (Clipped) */}
        <line x1={cameraX - wFocus} y1={focusY} x2={cameraX + wFocus} y2={focusY} stroke="#ffffff" strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
        
        {/* TEXT */}
        <text x="10" y={focusY - 5} fill="#ffffff" fontSize="10" className="font-mono">FOCUS PLANE</text>

        {/* Gradient Def */}
        <defs>
          <linearGradient id="dofGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Physical Objects (Draggable) */}
        {objects.map((obj) => {
            const y = mapZ(obj.z);
            return (
                <g 
                  key={obj.id} 
                  className="cursor-ns-resize"
                  onPointerDown={(e) => handlePointerDown(e, obj.id, obj.z)}
                >
                    {/* Invisible larger hit area */}
                    <circle cx={SVG_WIDTH/2} cy={y} r="20" fill="transparent" />
                    {/* Visible dot */}
                    <circle 
                      cx={SVG_WIDTH/2} 
                      cy={y} 
                      r={dragging === obj.id ? 9 : 7} 
                      fill={obj.color} 
                      stroke="white" 
                      strokeWidth="2"
                    />
                    <text x={SVG_WIDTH/2 + 15} y={y + 4} fill={obj.color} fontSize="10" fontWeight="bold">
                        {obj.label} {obj.z.toFixed(1)}m
                    </text>
                </g>
            )
        })}

        {/* Camera Icon */}
        <path d={`M ${cameraX - 10} ${cameraY} L ${cameraX + 10} ${cameraY} L ${cameraX} ${cameraY - 10} Z`} fill="#cbd5e1" />
      </svg>
    </div>
  );
};
