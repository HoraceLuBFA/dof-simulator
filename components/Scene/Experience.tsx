
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import clsx from 'clsx';

import { World } from './World';
import { useOpticalStore } from '../../store/useOpticalStore';
import { getSensorDimensions, calculateBokehDiameterPx } from '../../utils/optics';

// Workaround for missing types in the THREE namespace
const T = THREE as any;

/**
 * CameraController
 * - Studio: 固定 50° 视角
 * - Viewfinder: 按传感器高度和焦距计算垂直 FOV，并允许 X/Y 方向平移光轴
 */
const CameraController: React.FC<{ mode: 'studio' | 'viewfinder' }> = ({ mode }) => {
  const { focalLength, sensorType, cameraX, cameraY } = useOpticalStore();
  const { camera } = useThree();

  useEffect(() => {
    // Fix: Ensure we are working with a PerspectiveCamera to access .fov
    if (!(camera instanceof T.PerspectiveCamera)) return;

    if (mode === 'viewfinder') {
      const { height: sensorHeight } = getSensorDimensions(sensorType);
      // 垂直视角：FOV = 2 * atan(sensorHeight / (2 * f))
      const fov = (2 * Math.atan(sensorHeight / (2 * focalLength)) * 180) / Math.PI;

      const CAM_Z = 0.2;
      camera.position.set(cameraX, cameraY, CAM_Z);
      camera.lookAt(cameraX, cameraY, -10);

      camera.fov = fov;
      camera.updateProjectionMatrix();
    } else {
      camera.fov = 50;
      camera.updateProjectionMatrix();
    }
  }, [focalLength, mode, sensorType, cameraX, cameraY, camera]);

  return null;
};

/**
 * StudioControls
 * - Studio 模式下的轨道控制与视角切换
 */
const StudioControls: React.FC = () => {
  const { studioView, setStudioView, focusDistance, cameraX, cameraY } = useOpticalStore();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    
    // Manually set props that might cause type issues in JSX
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 1.9;

    const CAM_Z = 0.2;
    const focusZ = CAM_Z - focusDistance;

    if (studioView === 'top') {
      // Top View: 
      // 1. Z轴位置对齐焦平面 (0.2 - focusDistance)
      // 2. Y轴高度降低到 12 (更近)
      camera.position.set(0.01, 12, focusZ);
      camera.lookAt(0, 0, focusZ);
      controls.target.set(0, 0, focusZ);

    } else if (studioView === 'side') {
      // Side View:
      // Z轴位置也对齐焦平面，其他(X=12, Y=2)保持不变
      camera.position.set(12, 2, focusZ);
      camera.lookAt(0, 2, focusZ);
      controls.target.set(0, 2, focusZ);

    } else if (studioView === 'front') {
      // 正视图：位于虚拟摄影机正后方 2m (CAM_Z + 2.0)
      // 保持视线与虚拟摄影机一致 (看向 -Z)
      const offsetZ = 5.0;
      camera.position.set(cameraX, cameraY + 2.0, CAM_Z + offsetZ);
      camera.lookAt(cameraX, cameraY, -10);
      controls.target.set(cameraX, cameraY, -10);

    } else if (studioView === 'reset') {
      // Reset to initial perspective view
      camera.position.set(8, 5, 8);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
    }

    controls.update();
  }, [studioView, camera, focusDistance, cameraX, cameraY]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      onStart={() => setStudioView('free')}
    />
  );
};

/**
 * PostProcessingEffects
 * - Viewfinder 模式下的景深 + 暗角
 * - 使用物理 CoC 计算 bokehScale，自适应 worldFocusRange
 */
const PostProcessingEffects: React.FC<{ mode: 'studio' | 'viewfinder' }> = ({ mode }) => {
  const { size, camera } = useThree();
  const {
    focalLength,
    aperture,
    focusDistance,
    sensorType,
    distBlue,
    distGreen,
    distRed,
    posBlueX,
    posGreenX,
    posRedX,
    cameraX,
    cameraY,
  } = useOpticalStore();

  if (mode === 'studio') return null;

  const CAM_Z = 0.2;

  // 三个彩色目标在世界坐标中的位置（需要与 World.tsx 保持一致）
  const posBlue = useMemo(
    () => new T.Vector3(posBlueX, 1.0, -distBlue),
    [distBlue, posBlueX],
  );
  const posGreen = useMemo(
    () => new T.Vector3(posGreenX, 1.0, -distGreen),
    [distGreen, posGreenX],
  );
  const posRed = useMemo(
    () => new T.Vector3(posRedX, 1.0, -distRed),
    [distRed, posRedX],
  );

  // 当前相机世界坐标
  const camPos = useMemo(
    () => new T.Vector3(cameraX, cameraY, CAM_Z),
    [cameraX, cameraY],
  );

  /**
   * 1）根据 slider 的 focusDistance 与真实距离做“吸附对焦”
   */
  const targetVector = useMemo(() => {
    const distToBlue = camPos.distanceTo(posBlue);
    const distToGreen = camPos.distanceTo(posGreen);
    const distToRed = camPos.distanceTo(posRed);

    const SNAP_THRESHOLD = 0.8; // m

    if (Math.abs(focusDistance - distToBlue) < SNAP_THRESHOLD) {
      return posBlue.toArray() as [number, number, number];
    }
    if (Math.abs(focusDistance - distToGreen) < SNAP_THRESHOLD) {
      return posGreen.toArray() as [number, number, number];
    }
    if (Math.abs(focusDistance - distToRed) < SNAP_THRESHOLD) {
      return posRed.toArray() as [number, number, number];
    }

    // 否则沿光轴方向对焦
    return [cameraX, cameraY, CAM_Z - focusDistance] as [number, number, number];
  }, [focusDistance, posBlue, posGreen, posRed, camPos, cameraX, cameraY]);

  /**
   * 2）根据对焦对象类型，收窄清晰带，让虚化更明显
   */
  const worldFocusRange = useMemo(() => {
    // 强制收窄到 0.3 以制造明显的焦外
    return 0.3;
  }, []);

  /**
   * 3）基于物理 CoC 计算 bokehScale，并做收敛处理：
   */
  const bokehScale = useMemo(() => {
    const { width: sensorWidthMm } = getSensorDimensions(sensorType);

    const focalLengthMm = focalLength;
    const fNumber = aperture;
    const viewportWidthPx = size.width;

    const targetVec = new T.Vector3(...targetVector);
    const focusDistanceMm = camPos.distanceTo(targetVec) * 1000;

    const dBlueMm = camPos.distanceTo(posBlue) * 1000;
    const dGreenMm = camPos.distanceTo(posGreen) * 1000;
    const dRedMm = camPos.distanceTo(posRed) * 1000;

    const cocBluePx = calculateBokehDiameterPx(
      dBlueMm,
      { focalLengthMm, fNumber, focusDistanceMm, sensorWidthMm },
      viewportWidthPx,
    );
    const cocGreenPx = calculateBokehDiameterPx(
      dGreenMm,
      { focalLengthMm, fNumber, focusDistanceMm, sensorWidthMm },
      viewportWidthPx,
    );
    const cocRedPx = calculateBokehDiameterPx(
      dRedMm,
      { focalLengthMm, fNumber, focusDistanceMm, sensorWidthMm },
      viewportWidthPx,
    );
    const cocInfPx = calculateBokehDiameterPx(
      Infinity,
      { focalLengthMm, fNumber, focusDistanceMm, sensorWidthMm },
      viewportWidthPx,
    );

    // 场景中可能出现的最大 CoC
    let physicalCocPx = Math.max(cocBluePx, cocGreenPx, cocRedPx, cocInfPx);

    // ① 提高截断阈值，允许更大的模糊核心 (80px)
    const HARD_CLAMP_COC_PX = 30;
    physicalCocPx = Math.min(physicalCocPx, HARD_CLAMP_COC_PX);

    // 增强模糊效果，物理CoC乘以系数
    // physicalCocPx *= 2.0;

    // ② 将物理 CoC 映射到 shader 的强度范围 (提高到 10.0)
    const MAX_PHYSICAL_COC_PX = HARD_CLAMP_COC_PX;
    const MAX_SHADER_INTENSITY = 10.0;

    let normalizedIntensity =
      (physicalCocPx / MAX_PHYSICAL_COC_PX) * MAX_SHADER_INTENSITY;

    // ③ 远距离对焦时整体衰减
    const focusDistanceM = focusDistanceMm / 1000;
    const farFocusFactor = focusDistanceM > 10 ? 0.5 : 1.0;
    normalizedIntensity *= farFocusFactor;

    const finalScale = T.MathUtils.clamp(
      normalizedIntensity,
      0,
      MAX_SHADER_INTENSITY,
    );

    return finalScale;
  }, [
    aperture,
    focalLength,
    sensorType,
    size.width,
    targetVector,
    camPos,
    posBlue,
    posGreen,
    posRed,
  ]);

  return (
    <EffectComposer multisampling={4}>
      <DepthOfField
        target={targetVector}
        worldFocusRange={worldFocusRange}
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
  const {
    moveCamera,
    resetCamera,
    setStudioView,
    studioView,
    setFocusDistance,
  } = useOpticalStore();
  const [focusBoxPos, setFocusBoxPos] = useState({ x: 50, y: 50 });

  const handleViewfinderClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      // Clamp to keep box fully visible near edges
      const clampedX = Math.min(98, Math.max(2, x));
      const clampedY = Math.min(98, Math.max(2, y));

      setFocusBoxPos({ x: clampedX, y: clampedY });
    },
    [],
  );

  return (
    <div
      className="w-full h-full relative bg-black group overflow-hidden"
      onClick={mode === 'viewfinder' ? handleViewfinderClick : undefined}
    >
      {/* 左上角模式标签 */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
        <div className="flex flex-col">
          {mode === 'studio' ? (
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-slate-900/80 px-2 py-1 rounded border border-cyan-900/50 backdrop-blur">
              Studio View
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-slate-900/80 px-2 py-1 rounded border border-rose-900/50 backdrop-blur">
              Viewfinder
            </span>
          )}
        </div>
      </div>

      {/* Studio 视角切换按钮 */}
      {mode === 'studio' && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 items-end">
          {(['top', 'side', 'front', 'reset'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setStudioView(view)}
              className={clsx(
                'px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border transition-all w-max',
                studioView === view && view !== 'reset'
                  ? 'bg-cyan-500 text-white border-cyan-400'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white',
              )}
            >
              {view === 'reset' ? 'reset view' : view}
            </button>
          ))}
        </div>
      )}

      {/* Viewfinder 叠加 UI */}
      {mode === 'viewfinder' && (
        <>
          <div className="absolute inset-0 pointer-events-none z-10 border-[20px] border-black/20">
            {/* 中央对焦框与中心点 */}
            <div
              className="absolute w-10 h-10 border border-white/70 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
              style={{
                left: `${focusBoxPos.x}%`,
                top: `${focusBoxPos.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 150ms ease, top 150ms ease',
              }}
            >
              <div className="absolute inset-[45%] rounded-full bg-white/60" />
              <div className="absolute inset-0 border border-white/10 animate-pulse" />
            </div>

            {/* REC 指示灯 */}
            <div className="absolute top-8 right-8 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-mono text-xs tracking-widest">
                REC
              </span>
            </div>

            {/* 三分线网格 */}
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

          {/* 光轴平移控制 */}
          <div className="absolute bottom-8 right-8 z-30 flex flex-col items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveCamera(0, 0.1);
              }}
              className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
              title="Move Up"
            >
              ▲
            </button>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveCamera(-0.1, 0);
                }}
                className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                title="Move Left"
              >
                ◀
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetCamera();
                }}
                className="w-8 h-8 bg-slate-800/80 hover:bg-rose-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all font-bold"
                title="Reset Position"
              >
                ●
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveCamera(0.1, 0);
                }}
                className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                title="Move Right"
              >
                ▶
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveCamera(0, -0.1);
              }}
              className="w-8 h-8 bg-slate-800/80 hover:bg-cyan-600 text-white rounded flex items-center justify-center border border-white/10 active:scale-95 transition-all"
              title="Move Down"
            >
              ▼
            </button>
            <div className="mt-1 text-[10px] text-white/50 font-mono uppercase tracking-wider text-center">
              Shift Axis
            </div>
          </div>
        </>
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: T.ACESFilmicToneMapping,
        }}
        onPointerMissed={
          mode === 'viewfinder' ? () => setFocusDistance(30) : undefined
        }
      >
        <CameraController mode={mode} />
        <ambientLight intensity={0.2} />
        <World mode={mode} />

        <Suspense fallback={null}>
          <PostProcessingEffects mode={mode} />
        </Suspense>

        {mode === 'studio' && <StudioControls />}

        {mode === 'studio' && (
          <PerspectiveCamera makeDefault position={[6, 3, 6]} fov={50} />
        )}
      </Canvas>
    </div>
  );
};
