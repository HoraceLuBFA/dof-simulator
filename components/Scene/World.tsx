
import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Grid, Text, Float, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useOpticalStore } from '../../store/useOpticalStore';
import { calculateOptics, getSensorDimensions, SENSOR_DATA } from '../../utils/optics';

// Workaround for missing types in the THREE namespace
const T = THREE as any;

interface WorldProps {
  mode: 'studio' | 'viewfinder';
}

export const World: React.FC<WorldProps> = ({ mode }) => {
  const { 
    focalLength, aperture, focusDistance, sensorType,
    setFocusDistance,
    distBlue, distGreen, distRed,
    posBlueX, posGreenX, posRedX,
    cameraX, cameraY
  } = useOpticalStore();
  
  // Refs for animation - using any to avoid namespace errors
  const sphereRef = useRef<any>(null);
  const cubeRef = useRef<any>(null);
  const foreRef = useRef<any>(null);

  const CAM_Z = 0.2;
  // Camera visualization dimensions (meters)
  const lensCenterZ = 0; // optical center at group origin
  const camBodyDims = { width: 0.45, height: 0.28, depth: 0.25 };

  // Decorative lens length scales with focal length:
  // short barrel for wide-angle, long barrel for telephoto.
  const BASE_LENS_LENGTH = 0.35;
  const lensLengthScale = T.MathUtils.clamp(focalLength / 50, 0.5, 2.0);
  const lensBarrelLength = BASE_LENS_LENGTH * lensLengthScale;
  const lensBarrelCenterZ = -lensBarrelLength / 2;
  const focusRingLength = 0.09;
  const focusRingCenterZ = lensBarrelCenterZ + lensBarrelLength * 0.25;
  const frontGlassThickness = 0.03;
  const frontGlassCenterZ =
    lensBarrelCenterZ - lensBarrelLength / 2 - frontGlassThickness / 2;

  // Calculate Optics for Visual Guides
  const metrics = useMemo(() => 
    // 这里必须使用真实的对焦距离；此前额外加上 CAM_Z 会让近限向后偏移，导致 Studio 视图里“前景深”视觉为 0
    calculateOptics(focalLength, aperture, focusDistance, sensorType),
    [focalLength, aperture, focusDistance, sensorType]
  );

  // Calculate Frustum Dimensions based on Sensor & Focal Length
  const fovVisuals = useMemo(() => {
    const { width, height } = getSensorDimensions(sensorType);
    const aspect = width / height;
    
    // Field of View Angles (Half Angles)
    const hFov = Math.atan(width / (2 * focalLength)); // radians
    const vFov = Math.atan(height / (2 * focalLength)); // radians

    // Helper: Get dimensions at a specific distance Z (always positive)
    const getDimsAt = (z: number) => {
        const absZ = Math.abs(z);
        const w = 2 * absZ * Math.tan(hFov);
        const h = 2 * absZ * Math.tan(vFov);
        return { w, h };
    };

    // 1. Focus Plane
    const focusDims = getDimsAt(focusDistance);

    // 2. DoF Zone Frustum
    const zNear = Math.max(0.1, metrics.nearLimit);
    const VISUAL_MAX = 60; // Clamp visual infinity
    const zFar = metrics.farLimit === Infinity ? VISUAL_MAX : Math.min(metrics.farLimit, VISUAL_MAX);
    
    const dimsNear = getDimsAt(zNear);
    const dimsFar = getDimsAt(zFar);
    const dofDepth = zFar - zNear;
    // Center Z relative to camera (negative Z)，并补偿 CAM_Z，使世界坐标与示意图一致
    const dofCenterZ = - (zNear + dofDepth / 2 + CAM_Z);

    // 3. Full View Cone (Wireframe)
    // Use a large fixed distance to simulate "infinity"
    const zConeEnd = 100; 
    const dimsCone = getDimsAt(zConeEnd);

    return {
        aspect,
        // 将局部 Z 坐标向后平移 CAM_Z，以确保世界坐标中的焦平面正好位于 focusDistance 处
        focus: { w: focusDims.w, h: focusDims.h, z: -(focusDistance + CAM_Z) },
        dof: {
            wNear: dimsNear.w,
            wFar: dimsFar.w,
            depth: dofDepth,
            // 同样平移中心，使前/后景深跨越的世界坐标与指标一致
            z: dofCenterZ,
            // Radius for CylinderGeometry (4 segments, rotated 45deg)
            radiusTop: dimsFar.w / Math.SQRT2,
            radiusBottom: dimsNear.w / Math.SQRT2
        },
        cone: {
            w: dimsCone.w,
            h: dimsCone.h,
            z: -zConeEnd
        }
    };

  }, [sensorType, focalLength, focusDistance, metrics]);

  // --- Lens / Sensor model in image space (Studio mode visualization) ---
  const lensModel = useMemo(() => {
    const f = focalLength / 1000; // focal length in meters
    const L = Math.max(f + 0.001, focusDistance); // clamp to avoid division by zero when s ≈ f

    // Thin lens formula: 1/f = 1/L + 1/v  =>  v = fL / (L - f)
    let imageDistance = f;
    const denom = L - f;
    if (Math.abs(denom) > 1e-4) {
      imageDistance = (f * L) / denom;
    }

    const { width: sensorWmm, height: sensorHmm } = getSensorDimensions(sensorType);
    const sensorW = sensorWmm / 1000;
    const sensorH = sensorHmm / 1000;

    // Depth of focus (image space) approximate: Δv ≈ 2 N σ (1 + m)^2
    const coc = SENSOR_DATA[sensorType].coc / 1000; // m
    const N = aperture;
    const m = imageDistance / L;
    const depthOfFocus = 2 * N * coc * (1 + m) * (1 + m);
    const vNear = imageDistance - depthOfFocus / 2;
    const vFar = imageDistance + depthOfFocus / 2;

    // Place camera body behind far focus plane, leaving a small gap
    const bodyDepth = camBodyDims.depth;
    const bodyCenterZ = vFar + bodyDepth / 2 + 0.03;

    return {
      imageDistance,
      sensorW,
      sensorH,
      vNear,
      vFar,
      bodyCenterZ,
      bodyDepth,
    };
  }, [aperture, focalLength, focusDistance, sensorType]);


  useFrame((state) => {
    if(sphereRef.current) sphereRef.current.rotation.y += 0.005;
    if(cubeRef.current) {
        cubeRef.current.rotation.x += 0.002;
        cubeRef.current.rotation.y += 0.002;
    }
    if(foreRef.current) {
       foreRef.current.rotation.z -= 0.005;
    }
  });

  // Deterministic Focus Logic
  const focusOnObject = (obj: 'blue' | 'green' | 'red') => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    let d = 0;
    if (obj === 'blue') d = distBlue;
    else if (obj === 'green') d = distGreen;
    else if (obj === 'red') d = distRed;
    setFocusDistance(parseFloat(d.toFixed(2)));
  };

  return (
    <>
      <color attach="background" args={['#050b14']} />
      
      {/* Lighting */}
      <pointLight position={[10, 10, 10]} intensity={200} castShadow color="#ffffff" />
      <spotLight 
        position={[-10, 15, 5]} 
        angle={0.3} 
        penumbra={1} 
        intensity={400} 
        color="#22d3ee" 
        castShadow
      />
      <spotLight 
        position={[0, 5, -20]} 
        angle={0.6} 
        intensity={200} 
        color="#f43f5e" 
      />
      
      {/* Environment / Floor */}
      <Grid 
        position={[0, -0.01, 0]} 
        args={[100, 100]} 
        cellSize={1} 
        cellThickness={0.7} 
        cellColor="#1e293b" 
        sectionSize={5} 
        sectionThickness={1}
        sectionColor="#475569" 
        fadeDistance={60}
      />

      {/* --- Visual Guides (Studio Mode Only) --- */}
      {mode === 'studio' && fovVisuals && (
        <group position={[cameraX, cameraY, CAM_Z]}> 
            
            {/* 1. Full View Frustum Wireframe (Faint) */}
            <group>
                <Line points={[[0,0,0], [fovVisuals.cone.w/2, fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
                <Line points={[[0,0,0], [-fovVisuals.cone.w/2, fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
                <Line points={[[0,0,0], [fovVisuals.cone.w/2, -fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
                <Line points={[[0,0,0], [-fovVisuals.cone.w/2, -fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
                {/* Removed the End Cap Plane to make it look infinite */}
            </group>

            {/* 2. DoF Zone (Blue Volume) */}
            <mesh 
                position={[0, 0, fovVisuals.dof.z]} 
                rotation={[-Math.PI / 2, 0, 0]} 
                scale={[1, 1, 1/fovVisuals.aspect]} // Flatten Local Z (World Y) to match Aspect
                raycast={() => null}
            >
                <cylinderGeometry 
                    args={[
                        fovVisuals.dof.radiusTop, // Top (Far)
                        fovVisuals.dof.radiusBottom, // Bottom (Near)
                        fovVisuals.dof.depth, 
                        4, 1, true,
                        Math.PI / 4 // Rotate internal square by 45deg to align with axes
                    ]} 
                />
                <meshBasicMaterial color="#22d3ee" opacity={0.1} transparent side={T.DoubleSide} depthWrite={false} />
            </mesh>
            
            {/* 3. Focus Plane (White Rect) */}
            <group position={[0, 0, fovVisuals.focus.z]}>
                <mesh raycast={() => null}>
                    <planeGeometry args={[fovVisuals.focus.w, fovVisuals.focus.h]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.2} transparent side={T.DoubleSide} depthWrite={false} />
                </mesh>
                <lineSegments>
                    <edgesGeometry args={[new T.PlaneGeometry(fovVisuals.focus.w, fovVisuals.focus.h)]} />
                    <lineBasicMaterial color="#ffffff" opacity={0.6} transparent />
                </lineSegments>
                <Text 
                    position={[-fovVisuals.focus.w/2 - 0.2, 0, 0]} 
                    /*fontSize={Math.max(0.2, fovVisuals.focus.w * 0.05)} */
                    fontSize={0.25}
                    color="white" 
                    anchorX="right" 
                    anchorY="middle"
                    fillOpacity={0.9}
                >
                    FOCUS PLANE
                </Text>
            </group>

        </group>
      )}

      {/* --- Subject 1: Foreground (Blue) --- */}
      <group position={[posBlueX, 1.0, -distBlue]}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
          <mesh ref={foreRef} castShadow receiveShadow onClick={focusOnObject('blue')}>
            <icosahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.8} />
          </mesh>
        </Float>
        <Text 
          position={[0, 0.4, 0]} 
          fontSize={0.25} 
          color="white"
          anchorX="center" 
          anchorY="middle"
          visible={mode === 'studio'}
        >
          {distBlue.toFixed(1)}m
        </Text>
      </group>

      {/* --- Subject 2: Midground Target (Green) --- */}
      <group position={[posGreenX, 1.0, -distGreen]}>
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.1}>
            <mesh ref={sphereRef} castShadow receiveShadow onClick={focusOnObject('green')}>
              <sphereGeometry args={[0.3, 64, 64]} />
              <meshStandardMaterial color="#10b981" roughness={0.1} metalness={0.1} />
            </mesh>
        </Float>
        <Text 
          position={[0, 0.7, 0]} 
          fontSize={0.25} 
          color="white"
          anchorX="center" 
          anchorY="middle"
          visible={mode === 'studio'}
        >
          {distGreen.toFixed(1)}m
        </Text>
      </group>

      {/* --- Subject 3: Background (Red) --- */}
      <group position={[posRedX, 1.0, -distRed]}>
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
            <mesh ref={cubeRef} castShadow receiveShadow onClick={focusOnObject('red')}>
              <boxGeometry args={[0.4, 0.4, 0.4]} />
              <meshStandardMaterial color="#ef4444" roughness={0.5} />
            </mesh>
        </Float>
        <Text 
          position={[0, 1.0, 0]} 
          fontSize={0.25} 
          color="white"
          anchorX="center" 
          anchorY="middle"
          visible={mode === 'studio'}
        >
          {distRed.toFixed(1)}m
        </Text>
      </group>
      
      {/* Distance Markers on floor */}
      {[2, 5, 10, 15, 20, 30].map((z) => (
         <Text 
         key={z}
         position={[4, 0.02, -z]} 
         rotation={[-Math.PI / 2, 0, 0]}
         fontSize={0.5} 
         color="#334155"
       >
         {z}m
       </Text>
      ))}

      {/* Camera Representation (Only visible in Studio Mode) */}
      {mode === 'studio' && (
        <group position={[cameraX, cameraY, CAM_Z]}>
          {/* --- Camera body block (highly transparent) --- */}
          <mesh position={[0, 0, lensModel.bodyCenterZ]}>
            <boxGeometry args={[camBodyDims.width, camBodyDims.height, camBodyDims.depth]} />
            <meshStandardMaterial
              color="#e5e7eb"
              transparent
              opacity={0.15}
              metalness={0.1}
              roughness={0.4}
            />
          </mesh>

          {/* Front mount block */}
          <mesh position={[0, 0, lensModel.imageDistance * 0.4]}>
            <boxGeometry args={[camBodyDims.width * 0.7, camBodyDims.height * 0.9, 0.08]} />
            <meshStandardMaterial
              color="#cbd5f5"
              transparent
              opacity={0.12}
              metalness={0.15}
              roughness={0.5}
            />
          </mesh>

          {/* Top handle */}
          <mesh position={[0, camBodyDims.height / 2 + 0.06, lensModel.bodyCenterZ - camBodyDims.depth * 0.2]}>
            <boxGeometry args={[camBodyDims.width * 0.8, 0.05, camBodyDims.depth * 0.6]} />
            <meshStandardMaterial
              color="#e5e7eb"
              transparent
              opacity={0.18}
              metalness={0.15}
              roughness={0.4}
            />
          </mesh>

          {/* Side EVF block */}
          <mesh position={[-camBodyDims.width / 2 - 0.08, camBodyDims.height / 4, lensModel.bodyCenterZ + camBodyDims.depth * 0.1]}>
            <boxGeometry args={[0.16, 0.16, 0.18]} />
            <meshStandardMaterial
              color="#e5e7eb"
              transparent
              opacity={0.18}
              metalness={0.15}
              roughness={0.4}
            />
          </mesh>

          {/* --- Lens barrel (transparent, length depends on focal length) --- */}
          <mesh position={[0, 0, lensBarrelCenterZ]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, lensBarrelLength, 32]} />
            <meshStandardMaterial
              color="#e0f2fe"
              transparent
              opacity={0.18}
              metalness={0.2}
              roughness={0.25}
            />
          </mesh>

          {/* Focus ring */}
          <mesh position={[0, 0, focusRingCenterZ]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, focusRingLength, 32]} />
            <meshStandardMaterial
              color="#bae6fd"
              transparent
              opacity={0.2}
              metalness={0.2}
              roughness={0.5}
            />
          </mesh>

          {/* Front glass element (slightly convex disc) */}
          <mesh position={[0, 0, frontGlassCenterZ]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, frontGlassThickness, 32]} />
            <meshStandardMaterial
              color="#38bdf8"
              transparent
              opacity={0.4}
              metalness={0.2}
              roughness={0.08}
            />
          </mesh>

          {/* --- Optical model: cone + CMOS --- */}
          {/* Reverse cone from optical center (0,0,0) to sensor plane */}
          <mesh position={[0, 0, lensModel.imageDistance / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.12, lensModel.imageDistance, 16, 1, true]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.3} />
          </mesh>

          {/* CMOS sensor plane (blue rectangle), size from sensor data */}
          <mesh position={[0, 0, lensModel.imageDistance]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[lensModel.sensorW, lensModel.sensorH]} />
            <meshStandardMaterial color="#22d3ee" emissive="#0ea5e9" emissiveIntensity={0.3} transparent opacity={0.9} side={T.DoubleSide} />
          </mesh>

          {/* Depth of focus region in image space (soft guides) */}
          <mesh position={[0, 0, lensModel.vNear]} rotation={[0, Math.PI, 0]} raycast={() => null}>
            <planeGeometry args={[lensModel.sensorW * 1.05, lensModel.sensorH * 1.05]} />
            <meshBasicMaterial color="#38bdf8" opacity={0.06} transparent side={T.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, lensModel.vFar]} rotation={[0, Math.PI, 0]} raycast={() => null}>
            <planeGeometry args={[lensModel.sensorW * 1.05, lensModel.sensorH * 1.05]} />
            <meshBasicMaterial color="#38bdf8" opacity={0.06} transparent side={T.DoubleSide} />
          </mesh>

          {/* Rays from optical center to sensor corners */}
          {(() => {
            const corners: [number, number, number][] = [
              [ lensModel.sensorW / 2,  lensModel.sensorH / 2, lensModel.imageDistance],
              [-lensModel.sensorW / 2,  lensModel.sensorH / 2, lensModel.imageDistance],
              [ lensModel.sensorW / 2, -lensModel.sensorH / 2, lensModel.imageDistance],
              [-lensModel.sensorW / 2, -lensModel.sensorH / 2, lensModel.imageDistance],
            ];
            return corners.map((c, idx) => (
              <Line key={idx} points={[[0, 0, lensCenterZ], c]} color="#38bdf8" lineWidth={1} transparent opacity={0.7} />
            ));
          })()}

          <Text position={[0, camBodyDims.height / 2 + 0.18, lensModel.bodyCenterZ]} fontSize={0.23} color="white">
            Sensor Plane ( X = {cameraX}m, Y = {cameraY}m)
          </Text>
        </group>
      )}
    </>
  );
};
