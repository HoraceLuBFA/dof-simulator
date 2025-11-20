
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing';
import { World } from './World';
import { useOpticalStore } from '../../store/useOpticalStore';
import { getSensorDimensions, calculateBokehDiameterPx } from '../../utils/optics';
import { PerspectiveCamera as PerspectiveCameraImpl, Vector3, ACESFilmicToneMapping } from 'three';
import clsx from 'clsx';

// Logic for positioning the main camera in Viewfinder Mode
const CameraController = ({ mode }: { mode: 'studio' | 'viewfinder' }) => {
  const { focalLength, sensorType, cameraX, cameraY } = useOpticalStore();
  const { camera } = useThree();

  useEffect(() => {
    if (mode === 'viewfinder') {
      // Calculate Vertical FOV based on Sensor Size
      const sensorHeight = sensorType === 'Micro 4/3' ? 13 : (sensorType === 'APS-C' ? 16 : 24);
      
      // FOV Formula: 2 * atan(h / 2f)
      const fov = 2 * Math.atan(sensorHeight / (2 * focalLength)) * (180 / Math.PI);
      
      // Position camera based on store state (Truck/Pedestal movement)
      // Fixed Z depth (0.2)
      camera.position.set(cameraX, cameraY, 0.2); 
      // Look parallel to Z axis (Shift Optical Axis)
      camera.lookAt(cameraX, cameraY, -10); 
      
      if (camera instanceof PerspectiveCameraImpl) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    } else {
      // Studio Mode defaults
      if (camera instanceof PerspectiveCameraImpl) {
        camera.fov = 50;
        camera.updateProjectionMatrix();
      }
    }
  }, [focalLength, mode, sensorType, camera, cameraX, cameraY]);

  return null;
};

// Controls for Studio Mode: Handles Orbiting AND View Switching (Top/Side/Front)
const StudioControls = () => {
  const { studioView, setStudioView } = useOpticalStore();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const targetZ = -8; // Roughly center of the scene

    if (studioView === 'top') {
        camera.position.set(0.1, 35, targetZ); // Slight offset to avoid gimbal lock
        camera.lookAt(0, 0, targetZ);
        controls.target.set(0, 0, targetZ);
    } else if (studioView === 'side') {
        camera.position.set(35, 2, targetZ);
        camera.lookAt(0, 2, targetZ);
        controls.target.set(0, 2, targetZ);
    } else if (studioView === 'front') {
        camera.position.set(4, 5, 12); // A nice overview angle from front-right
        camera.lookAt(0, 2, -10);
        controls.target.set(0, 2, -5);
    }
    
    controls.update();
  }, [studioView, camera]);

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      enableDamping
      dampingFactor={0.05}
      onStart={() => setStudioView('free')} // Unlock view when user interacts
    />
  );
}

const PostProcessingEffects = ({ mode }: { mode: 'studio' | 'viewfinder' }) => {
  const { size, camera } = useThree(); // Access Viewport Dimensions
  const { 
    focalLength, aperture, focusDistance, sensorType,
    distBlue, distGreen, distRed,
    cameraX, cameraY
  } = useOpticalStore();
  
  // --- 1. PRECISE 3D TARGETING ---
  // Determine the exact 3D point the lens is focusing on.
  const targetVector = useMemo(() => {
    const CAM_Z = 0.2;
    
    // Known Object Positions (Must match World.tsx)
    const posBlue = new Vector3(0.3, 1.0, -distBlue);
    const posGreen = new Vector3(0, 1.0, -distGreen);
    const posRed = new Vector3(-1.5, 1.0, -distRed);
    
    const camPos = new Vector3(cameraX, cameraY, CAM_Z);

    // Calculate exact euclidean distance from camera to these object centers
    const distToBlue = camPos.distanceTo(posBlue);
    const distToGreen = camPos.distanceTo(posGreen);
    const distToRed = camPos.distanceTo(posRed);

    // Threshold for "snapping" (in meters)
    const SNAP_THRESHOLD = 0.8; 

    // If slider is close to the object's distance, snap to its vector
    if (Math.abs(focusDistance - distToBlue) < SNAP_THRESHOLD) return posBlue.toArray();
    if (Math.abs(focusDistance - distToGreen) < SNAP_THRESHOLD) return posGreen.toArray();
    if (Math.abs(focusDistance - distToRed) < SNAP_THRESHOLD) return posRed.toArray();

    // Default: Target a point along the camera's optical axis at the specified distance
    return [cameraX, cameraY, CAM_Z - focusDistance];
    
  }, [focusDistance, distBlue, distGreen, distRed, cameraX, cameraY]);

  
  // --- 2. BOKEH PHYSICS & NORMALIZATION ---
  const bokehScale = useMemo(() => {
    const { width: sensorWidthMm } = getSensorDimensions(sensorType);
    
    const focalLengthMm = focalLength;
    const fNumber = aperture;
    const viewportWidthPx = size.width;

    // Calculate actual focus distance (mm) from the camera to the target vector
    const camPos = new Vector3(camera.position.x, camera.position.y, camera.position.z);
    const targetVec = new Vector3(targetVector[0], targetVector[1], targetVector[2]);
    const actualDistanceMm = camPos.distanceTo(targetVec) * 1000;

    // 1. Calculate Physical CoC in Pixels (Max at infinity)
    const physicalCocPx = calculateBokehDiameterPx(
      Infinity, 
      { focalLengthMm, fNumber, focusDistanceMm: actualDistanceMm, sensorWidthMm },
      viewportWidthPx
    );

    // 2. Normalize for Shader
    // The PostProcessing shader expects a value roughly between 0-10.
    // 100px physical CoC is massive. We map 100px -> 6.0 intensity.
    const MAX_PHYSICAL_COC_PX = 100; 
    const MAX_SHADER_INTENSITY = 6.0; 

    const normalizedIntensity = (physicalCocPx / MAX_PHYSICAL_COC_PX) * MAX_SHADER_INTENSITY;
    
    // Clamp
    return Math.min(normalizedIntensity, MAX_SHADER_INTENSITY);

  }, [focalLength, aperture, targetVector, sensorType, size.width, camera.position]);

  if (mode === 'studio') return null;

  return (
    <EffectComposer multisampling={0}>
      <DepthOfField
        target={targetVector} 
        worldFocusRange={0.8} // Widen focus range (80cm) to ensure 3D object volume is sharp
        bokehScale={bokehScale}
        resolutionScale={1}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.4} />
    </EffectComposer>
  );
};

interface ExperienceProps {
  mode: 'studio' | 'viewfinder';
}

export const Experience: React.FC<ExperienceProps> = ({ mode }) => {
  const { moveCamera, resetCamera, setStudioView, studioView } = useOpticalStore();

  return (
    <div className="w-full h-full relative bg-black group overflow-hidden">
        
        {/* Overlay UI Label */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
            <div className="flex flex-col">
                {mode === 'studio' ? (
                     <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-slate-900/80 px-2 py-1 rounded border border-cyan-900/50 backdrop-blur">Studio View</span>
                ) : (
                     <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-slate-900/80 px-2 py-1 rounded border border-rose-900/50 backdrop-blur">Viewfinder</span>
                )}
            </div>
        </div>

        {/* Studio View Controls (Top/Side/Front) */}
        {mode === 'studio' && (
          <div className="absolute top-4 right-4 z-20 flex gap-1">
             {(['top', 'side', 'front'] as const).map((view) => (
               <button
                 key={view}
                 onClick={() => setStudioView(view)}
                 className={clsx(
                   "px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border transition-all",
                   studioView === view 
                    ? "bg-cyan-500 text-white border-cyan-400" 
                    : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                 )}
               >
                 {view}
               </button>
             ))}
          </div>
        )}

        {/* Viewfinder Controls & Overlay */}
        {mode === 'viewfinder' && (
          <>
            <div className="absolute inset-0 pointer-events-none z-10 border-[20px] border-black/20">
              {/* Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/30 opacity-50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/50 rounded-full" />
              
              {/* Rec Indicator */}
              <div className="absolute top-8 right-8 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white font-mono text-xs tracking-widest">REC</span>
              </div>

              {/* Rule of Thirds Grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 w-full h-full">
                  <div className="border-r border-b border-white/5" />
                  <div className="border-r border-b border-white/5" />
                  <div className="border-b border-white/5" />
                  <div className="border-r border-b border-white/5" />
                  <div className="border-r border-b border-white/5" />
                  <div className="border-b border-white/5" />
                  <div className="border-r border-white/5" />
                  <div className="border-r border-white/5" />
              </div>
            </div>

            {/* Camera Movement Controls */}
            <div className="absolute bottom-8 right-8 z-30 flex flex-col items-center gap-1">
                <button 
                  onClick={() => moveCamera(0, 0.1)} 
                  className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                  title="Move Up"
                >
                  ▲
                </button>
                <div className="flex gap-1">
                  <button 
                    onClick={() => moveCamera(-0.1, 0)}
                    className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                    title="Move Left"
                  >
                    ◀
                  </button>
                  <button 
                    onClick={resetCamera}
                    className="w-8 h-8 bg-slate-800/80 hover:bg-rose-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all font-bold"
                    title="Reset Position"
                  >
                    ●
                  </button>
                  <button 
                    onClick={() => moveCamera(0.1, 0)}
                    className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                    title="Move Right"
                  >
                    ▶
                  </button>
                </div>
                <button 
                  onClick={() => moveCamera(0, -0.1)}
                  className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                  title="Move Down"
                >
                  ▼
                </button>
                <div className="mt-1 text-[10px] text-white/50 font-mono uppercase tracking-wider text-center">Shift Axis</div>
            </div>
          </>
        )}

      <Canvas
        shadows
        dpr={[1, 2]} 
        gl={{ 
          antialias: true, 
          preserveDrawingBuffer: true,
          toneMapping: ACESFilmicToneMapping
        }}
      >
        <CameraController mode={mode} />
        <ambientLight intensity={0.2} />
        <World mode={mode} />
        
        <Suspense fallback={null}>
          <PostProcessingEffects mode={mode} />
        </Suspense>

        {/* Studio Controls Component */}
        {mode === 'studio' && <StudioControls />}
        
        {/* Initial Camera for Studio Mode */}
        {mode === 'studio' && (
          <PerspectiveCamera makeDefault position={[8, 5, 8]} fov={50} />
        )}
      </Canvas>
    </div>
  );
};
