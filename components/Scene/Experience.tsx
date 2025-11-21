
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import clsx from 'clsx';

import { World } from './World';
import { useOpticalStore } from '../../store/useOpticalStore';
import { getSensorDimensions, calculateBokehDiameterPx, calculateOptics } from '../../utils/optics';

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
const StudioControls: React.FC<{ flySpeed: number }> = ({ flySpeed }) => {
  const { studioView, setStudioView, focusDistance, cameraX, cameraY } = useOpticalStore();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const focusDistanceVisual = Number.isFinite(focusDistance) ? focusDistance : 50;
  const isTypingRef = useRef(false);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    
    // Manually set props that might cause type issues in JSX
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 1.9;

    const CAM_Z = 0.2;
    const focusZ = CAM_Z - focusDistanceVisual;

    if (studioView === 'topFocus') {
      // Top view aligned to focus plane (origin)
      camera.position.set(0.01, 12, focusZ);
      camera.lookAt(0, 0, focusZ);
      controls.target.set(0, 0, focusZ);

    } else if (studioView === 'topCamera') {
      // Top view aligned to the virtual camera's Z plane (CAM_Z)
      camera.position.set(cameraX + 0.01, cameraY + 12, CAM_Z);
      camera.lookAt(cameraX, cameraY, CAM_Z);
      controls.target.set(cameraX, cameraY, CAM_Z);

    } else if (studioView === 'sideFocus') {
      // Side view aligned to focus plane (origin)
      camera.position.set(12, 2, focusZ);
      camera.lookAt(0, 2, focusZ);
      controls.target.set(0, 2, focusZ);

    } else if (studioView === 'sideCamera') {
      // Side view aligned to the virtual camera's Z plane (CAM_Z)
      camera.position.set(cameraX + 12, cameraY + 2, CAM_Z);
      camera.lookAt(cameraX, cameraY + 2, CAM_Z);
      controls.target.set(cameraX, cameraY + 2, CAM_Z);

    } else if (studioView === 'front') {
      // 正视图：位于虚拟摄影机正后方 2m (CAM_Z + 2.0)
      // 保持视线与虚拟摄影机一致 (看向 -Z)
      const offsetZ = 5.0;
      camera.position.set(cameraX, cameraY + 2.0, CAM_Z + offsetZ);
      camera.lookAt(cameraX, cameraY, -10);
      controls.target.set(cameraX, cameraY, -10);

    } else if (studioView === 'reset') {
      // Reset to initial perspective view
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, -5);
    }

    controls.update();
  }, [studioView, camera, focusDistanceVisual, cameraX, cameraY]);

  // Unreal-style WASD/QE fly moves
  useEffect(() => {
    const pressed = new Set<string>();
    const moveVec = new T.Vector3();
    const dir = new T.Vector3();
    const right = new T.Vector3();
    const up = new T.Vector3(0, 1, 0);
    let raf: number | null = null;

    const step = () => {
      const controls = controlsRef.current;
      if (!controls) return;
      const cam = controls.object as THREE.Camera;

      dir.set(0, 0, 0);
      right.set(0, 0, 0);
      moveVec.set(0, 0, 0);

      cam.getWorldDirection(dir).normalize();
      right.crossVectors(dir, up).normalize();

      const speedMultiplier = (pressed.has('ShiftLeft') || pressed.has('ShiftRight')) ? 2.4 : 1;
      const speed = flySpeed * speedMultiplier;

      if (pressed.has('KeyW')) moveVec.add(dir);
      if (pressed.has('KeyS')) moveVec.addScaledVector(dir, -1);
      if (pressed.has('KeyA')) moveVec.addScaledVector(right, -1);
      if (pressed.has('KeyD')) moveVec.addScaledVector(right, 1);
      if (pressed.has('KeyQ')) moveVec.addScaledVector(up, -1);
      if (pressed.has('KeyE')) moveVec.addScaledVector(up, 1);

      if (moveVec.lengthSq() > 0) {
        moveVec.normalize().multiplyScalar(speed);
        cam.position.add(moveVec);
        controls.target.add(moveVec);
        controls.update();
        setStudioView('free');
      }

      raf = requestAnimationFrame(step);
    };

    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) {
        isTypingRef.current = true;
        return;
      }
      const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'];
      if (!codes.includes(e.code)) return;
      e.preventDefault();
      pressed.add(e.code);
      if (!raf) raf = requestAnimationFrame(step);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'];
      if (!codes.includes(e.code)) return;
      pressed.delete(e.code);
      if (pressed.size === 0 && raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (isTypingRef.current && !isTyping()) {
        isTypingRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [setStudioView, flySpeed]);

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
  const { size, camera, gl } = useThree();
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
  const focusDistanceEffective = Number.isFinite(focusDistance) ? focusDistance : 1000;

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
    return [cameraX, cameraY, CAM_Z - focusDistanceEffective] as [number, number, number];
  }, [focusDistance, focusDistanceEffective, posBlue, posGreen, posRed, camPos, cameraX, cameraY]);

  // 2）物理 DoF：与 MathPanel 同步，驱动 worldFocusRange 与真实 CoC
  const metrics = useMemo(
    () => calculateOptics(focalLength, aperture, focusDistance, sensorType),
    [focalLength, aperture, focusDistance, sensorType],
  );

  // 清晰带长度取真实景深；Df=∞ 则给一个大值，避免极小值
  const worldFocusRange = useMemo(() => {
    if (metrics.totalDepth === Infinity) return 50;
    return Math.max(metrics.totalDepth, 0.05);
  }, [metrics]);

  /**
   * 3）基于物理 CoC 计算 bokehScale：使用实际渲染分辨率和传感器参数
   */
  const bokehScale = useMemo(() => {
    const { width: sensorWidthMm } = getSensorDimensions(sensorType);
    const viewportWidthPx = size.width * gl.getPixelRatio();

    const focalLengthMm = focalLength;
    const fNumber = aperture;

    const targetVec = new T.Vector3(...targetVector);
    const focusDistanceMm = camPos.distanceTo(targetVec) * 1000;

    const cocPxAt = (distM: number) =>
      calculateBokehDiameterPx(
        distM * 1000,
        { focalLengthMm, fNumber, focusDistanceMm, sensorWidthMm },
        viewportWidthPx,
      );

    // 取：近限、远限/无穷远、以及场景中主要目标（蓝/绿/红）距离的 CoC，选择最大值驱动散景
    const distancesM = [
      metrics.nearLimit,
      metrics.farLimit === Infinity ? 1000 : metrics.farLimit,
      camPos.distanceTo(posBlue),
      camPos.distanceTo(posGreen),
      camPos.distanceTo(posRed),
    ];

    const cocMax = distancesM.reduce((max, d) => Math.max(max, cocPxAt(d)), 0);

    // 适度放大，保留上限避免核过大
    const finalScale = T.MathUtils.clamp(cocMax * 0.8, 0, 50);
    return finalScale;
  }, [
    aperture,
    camPos,
    focalLength,
    gl,
    metrics.farLimit,
    metrics.nearLimit,
    posBlue,
    posGreen,
    posRed,
    sensorType,
    size.width,
    targetVector,
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
    lightLevel,
    setLightLevel,
  } = useOpticalStore();
  const [focusBoxPos, setFocusBoxPos] = useState({ x: 50, y: 50 });
  const [flySpeed, setFlySpeed] = useState(0.35);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );
  const showFlyHud = true;

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Responsive scaling for HUDs; smooth piecewise to avoid sudden shrink at 1024px
  const hudScale = useMemo(() => {
    const highW = 1400;
    const midW = 1024;
    const lowW = 640;
    const high = 0.9;
    const mid = 0.8;
    const low = 0.65;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    if (viewportWidth >= highW) return high;
    if (viewportWidth >= midW) {
      const t = (viewportWidth - midW) / (highW - midW);
      return lerp(mid, high, t);
    }
    if (viewportWidth >= lowW) {
      const t = (viewportWidth - lowW) / (midW - lowW);
      return lerp(low, mid, t);
    }
    return low;
  }, [viewportWidth]);

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
        <div
          className="absolute top-4 right-4 z-20 flex flex-col gap-1 items-end"
          style={{ transform: `scale(${hudScale})`, transformOrigin: 'top right' }}
        >
          {([
            { key: 'topCamera', label: 'TOP (CAMERA)' },
            { key: 'topFocus', label: 'TOP (FOCUS)' },
            { key: 'sideCamera', label: 'SIDE (CAMERA)' },
            { key: 'sideFocus', label: 'SIDE (FOCUS)' },
            { key: 'front', label: 'FRONT' },
            { key: 'reset', label: 'RESET VIEW' },
          ] as const).map((view) => (
            <button
              key={view.key}
              onClick={() => setStudioView(view.key as any)}
              className={clsx(
                'w-28 px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border transition-all text-center',
                studioView === view.key && view.key !== 'reset'
                  ? 'bg-cyan-500 text-white border-cyan-400'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white',
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      )}

      {/* Lighting Slider (Studio Only) */}
      {mode === 'studio' && (
        <div
          className="absolute bottom-4 left-4 z-30 flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-full px-3 py-2 backdrop-blur"
          style={{ transform: `scale(${hudScale})`, transformOrigin: 'bottom left' }}
        >
          <span className="text-lg leading-none">🌙</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={lightLevel}
            onChange={(e) => setLightLevel(parseFloat(e.target.value))}
            className="w-36 accent-amber-300 bg-transparent cursor-pointer"
            aria-label="Lighting from night to day"
          />
          <span className="text-lg leading-none">☀️</span>
        </div>
      )}

      {/* Studio keyboard hint + speed */}
      {mode === 'studio' && showFlyHud && (
        <div
          className="absolute bottom-3 right-3 z-30 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-3 backdrop-blur shadow-lg w-[164px]"
          style={{ transform: `scale(${hudScale})`, transformOrigin: 'bottom right' }}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            <span>Fly Speed</span>
            <span className="text-cyan-300">{flySpeed.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={flySpeed}
            onChange={(e) => setFlySpeed(parseFloat(e.target.value))}
            className="w-full accent-white bg-slate-800/90 h-1 rounded-full my-2"
            aria-label="Adjust fly speed"
          />
          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-[11px] font-mono text-white mt-1">
            {[
              { key: 'Q', label: 'Down' },
              { key: 'W', label: 'Forward' },
              { key: 'E', label: 'Up' },
              { key: 'A', label: 'Left' },
              { key: 'S', label: 'Back' },
              { key: 'D', label: 'Right' },
            ].map((item) => (
              <div key={item.key} className="flex flex-col items-center gap-0.5">
                <div className="w-7 h-7 flex items-center justify-center bg-slate-800/90 border border-slate-700 rounded-sm">
                  {item.key}
                </div>
                <span className="text-[10px] text-slate-400 leading-none">{item.label}</span>
              </div>
            ))}
          </div>
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

        {mode === 'studio' && <StudioControls flySpeed={flySpeed} />}

        {mode === 'studio' && (
          <PerspectiveCamera makeDefault position={[6, 3, 6]} fov={50} />
        )}
      </Canvas>
    </div>
  );
};
