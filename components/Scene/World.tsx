
import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Grid, Text, Float, Line, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useOpticalStore } from '../../store/useOpticalStore';
import { calculateOptics, getSensorDimensions, SENSOR_DATA } from '../../utils/optics';

// Workaround for missing types in the THREE namespace
const T = THREE as any;

// Workaround for JSX conflict: <line> is defined as SVG in React types, causing TS errors for R3F usage.
const ThreeLine = 'line' as any;

interface WorldProps {
  mode: 'studio' | 'viewfinder';
}

// Helper for transparent lines where drei/Line types might conflict
const SimpleRay: React.FC<{
  points: [[number, number, number], [number, number, number]];
  color: string;
  opacity: number;
}> = ({ points, color, opacity }) => {
  const geometry = useMemo(() => {
    const pts = points.map(p => new T.Vector3(...p));
    return new T.BufferGeometry().setFromPoints(pts);
  }, [points]);

  return (
    <ThreeLine geometry={geometry}>
      <lineBasicMaterial color={color} opacity={opacity} transparent />
    </ThreeLine>
  );
};

export const World: React.FC<WorldProps> = ({ mode }) => {
  const { 
    focalLength, aperture, focusDistance, sensorType,
    setFocusDistance,
    distBlue, distGreen, distRed,
    posBlueX, posGreenX, posRedX,
    cameraX, cameraY
  } = useOpticalStore();
  
  // Refs for animation
  const sphereRef = useRef<any>(null);
  const cubeRef = useRef<any>(null);
  const foreRef = useRef<any>(null);

  const CAM_Z = 0.2;

  // Lens Visualization Logic
  // Scale lens length based on focal length (telephoto = longer)
  const BASE_LENS_LENGTH = 0.15;
  const lensLengthScale = T.MathUtils.clamp(focalLength / 50, 0.8, 2.2);
  const lensBarrelLength = BASE_LENS_LENGTH * lensLengthScale;

  // Calculate Optics for Visual Guides
  const metrics = useMemo(() => 
    calculateOptics(focalLength, aperture, focusDistance, sensorType),
    [focalLength, aperture, focusDistance, sensorType]
  );

  // Calculate Frustum Dimensions based on Sensor & Focal Length
  const fovVisuals = useMemo(() => {
    const { width, height } = getSensorDimensions(sensorType);
    const aspect = width / height;
    
    const hFov = Math.atan(width / (2 * focalLength)); 
    const vFov = Math.atan(height / (2 * focalLength));

    const getDimsAt = (z: number) => {
        const absZ = Math.abs(z);
        const w = 2 * absZ * Math.tan(hFov);
        const h = 2 * absZ * Math.tan(vFov);
        return { w, h };
    };

    const focusDims = getDimsAt(focusDistance);

    const zNear = Math.max(0.1, metrics.nearLimit);
    const VISUAL_MAX = 60; 
    const zFar = metrics.farLimit === Infinity ? VISUAL_MAX : Math.min(metrics.farLimit, VISUAL_MAX);
    
    const dimsNear = getDimsAt(zNear);
    const dimsFar = getDimsAt(zFar);
    const dofDepth = zFar - zNear;
    const dofCenterZ = - (zNear + dofDepth / 2 + CAM_Z);

    const zConeEnd = 100; 
    const dimsCone = getDimsAt(zConeEnd);

    return {
        aspect,
        focus: { w: focusDims.w, h: focusDims.h, z: -(focusDistance + CAM_Z) },
        dof: {
            wNear: dimsNear.w,
            wFar: dimsFar.w,
            depth: dofDepth,
            z: dofCenterZ,
            radiusTop: dimsFar.w / Math.SQRT2,
            radiusBottom: dimsNear.w / Math.SQRT2
        },
        cone: { w: dimsCone.w, h: dimsCone.h, z: -zConeEnd }
    };

  }, [sensorType, focalLength, focusDistance, metrics]);

  // Image Space / Sensor Placement Logic
  const lensModel = useMemo(() => {
    const f = focalLength / 1000; 
    const L = Math.max(f + 0.001, focusDistance); 

    // Thin lens: 1/f = 1/L + 1/v  =>  v = fL / (L - f)
    let imageDistance = f;
    const denom = L - f;
    if (Math.abs(denom) > 1e-4) {
      imageDistance = (f * L) / denom;
    }

    const { width: sensorWmm, height: sensorHmm } = getSensorDimensions(sensorType);
    return {
      imageDistance,
      sensorW: sensorWmm / 1000,
      sensorH: sensorHmm / 1000,
    };
  }, [focalLength, focusDistance, sensorType]);


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
      
      <pointLight position={[10, 10, 10]} intensity={200} castShadow color="#ffffff" />
      <spotLight position={[-10, 15, 5]} angle={0.3} penumbra={1} intensity={400} color="#22d3ee" castShadow />
      <spotLight position={[0, 5, -20]} angle={0.6} intensity={200} color="#f43f5e" />
      
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
            {/* 1. Frustum Wireframe */}
            <group>
                <Line points={[[0,0,0], [fovVisuals.cone.w/2, fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
                <Line points={[[0,0,0], [-fovVisuals.cone.w/2, fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
                <Line points={[[0,0,0], [fovVisuals.cone.w/2, -fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
                <Line points={[[0,0,0], [-fovVisuals.cone.w/2, -fovVisuals.cone.h/2, fovVisuals.cone.z]]} color="#334155" lineWidth={1} />
            </group>

            {/* 2. DoF Zone (Blue Volume) */}
            <mesh 
                position={[0, 0, fovVisuals.dof.z]} 
                rotation={[-Math.PI / 2, 0, 0]} 
                scale={[1, 1, 1/fovVisuals.aspect]} 
                raycast={() => null}
            >
                <cylinderGeometry 
                    args={[
                        fovVisuals.dof.radiusTop, 
                        fovVisuals.dof.radiusBottom, 
                        fovVisuals.dof.depth, 
                        4, 1, true,
                        Math.PI / 4 
                    ]} 
                />
                <meshBasicMaterial color="#22d3ee" opacity={0.1} transparent side={T.DoubleSide} depthWrite={false} />
            </mesh>
            
            {/* 3. Focus Plane */}
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

      {/* --- Subjects --- */}
      <group position={[posBlueX, 1.0, -distBlue]}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
          <mesh ref={foreRef} castShadow receiveShadow onClick={focusOnObject('blue')}>
            <icosahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.8} />
          </mesh>
        </Float>
        {mode === 'studio' && (
          <Text position={[0, 0.4, 0]} fontSize={0.25} color="white" anchorX="center" anchorY="middle">
            {distBlue.toFixed(1)}m
          </Text>
        )}
      </group>

      <group position={[posGreenX, 1.0, -distGreen]}>
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.1}>
            <mesh ref={sphereRef} castShadow receiveShadow onClick={focusOnObject('green')}>
              <sphereGeometry args={[0.3, 64, 64]} />
              <meshStandardMaterial color="#10b981" roughness={0.1} metalness={0.1} />
            </mesh>
        </Float>
        {mode === 'studio' && (
          <Text position={[0, 0.7, 0]} fontSize={0.25} color="white" anchorX="center" anchorY="middle">
            {distGreen.toFixed(1)}m
          </Text>
        )}
      </group>

      <group position={[posRedX, 1.0, -distRed]}>
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
            <mesh ref={cubeRef} castShadow receiveShadow onClick={focusOnObject('red')}>
              <boxGeometry args={[0.4, 0.4, 0.4]} />
              <meshStandardMaterial color="#ef4444" roughness={0.5} />
            </mesh>
        </Float>
        {mode === 'studio' && (
           <Text position={[0, 1.0, 0]} fontSize={0.25} color="white" anchorX="center" anchorY="middle">
            {distRed.toFixed(1)}m
          </Text>
        )}
      </group>
      
      {[2, 5, 10, 15, 20, 30].map((z) => (
         <Text key={z} position={[4, 0.02, -z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#334155">
           {z}m
         </Text>
      ))}

      {/* --- CINEMA CAMERA RIG (Studio Mode) --- */}
      {mode === 'studio' && (
        <group position={[cameraX, cameraY, CAM_Z]}>
          
          {/* 1. Camera Body Core (Transparent) */}
          <group position={[0, 0, 0.18]}> 
            {/* Main Chassis */}
            <mesh castShadow={false} receiveShadow={false}>
                <boxGeometry args={[0.16, 0.18, 0.30]} />
                <meshStandardMaterial 
                    color="#1e293b" 
                    transparent 
                    opacity={0.15} 
                    roughness={0.1} 
                    metalness={0.8} 
                    side={T.DoubleSide} 
                    depthWrite={false} 
                />
                <Edges color="#64748b" opacity={0.4} threshold={15} />
            </mesh>
            
            {/* Right Side Bump */}
            <mesh position={[0.09, 0, 0]}>
                <boxGeometry args={[0.04, 0.14, 0.25]} />
                <meshStandardMaterial 
                    color="#1e293b" 
                    transparent 
                    opacity={0.15} 
                    roughness={0.1} 
                    metalness={0.8} 
                    side={T.DoubleSide} 
                    depthWrite={false} 
                />
                <Edges color="#64748b" opacity={0.4} threshold={15} />
            </mesh>

            {/* Top Handle */}
            <group position={[0, 0.12, -0.05]}>
                <mesh>
                    <boxGeometry args={[0.04, 0.06, 0.25]} />
                    <meshStandardMaterial color="#0f172a" transparent opacity={0.2} roughness={0.2} metalness={0.8} />
                    <Edges color="#475569" opacity={0.4} />
                </mesh>
                {/* Handle Legs */}
                <mesh position={[0, -0.04, 0.08]}>
                    <boxGeometry args={[0.03, 0.04, 0.03]} />
                    <meshStandardMaterial color="#0f172a" transparent opacity={0.2} />
                </mesh>
                <mesh position={[0, -0.04, -0.08]}>
                    <boxGeometry args={[0.03, 0.04, 0.03]} />
                    <meshStandardMaterial color="#0f172a" transparent opacity={0.2} />
                </mesh>
            </group>

            {/* Battery V-Mount */}
            <mesh position={[0, 0, 0.18]}>
                <boxGeometry args={[0.10, 0.14, 0.06]} />
                <meshStandardMaterial color="#0f172a" transparent opacity={0.3} />
                <Edges color="#475569" opacity={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.22]}>
                <boxGeometry args={[0.09, 0.13, 0.05]} />
                <meshStandardMaterial color="#374151" transparent opacity={0.3} roughness={0.3} />
                <Edges color="#64748b" opacity={0.3} />
            </mesh>
          </group>

           {/* 2. Baseplate & Rails */}
           <group position={[0, -0.11, 0.1]}>
              {/* Baseplate */}
              <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.12, 0.04, 0.2]} />
                  <meshStandardMaterial color="#1e293b" transparent opacity={0.4} />
                  <Edges color="#475569" opacity={0.5} />
              </mesh>
              {/* Rods 15mm standard */}
              {/* Left Rod */}
              <mesh position={[-0.04, 0, -0.2]} rotation={[Math.PI/2, 0, 0]}>
                  <cylinderGeometry args={[0.0075, 0.0075, 0.6, 16]} />
                  <meshStandardMaterial color="#64748b" transparent opacity={0.4} metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Right Rod */}
              <mesh position={[0.04, 0, -0.2]} rotation={[Math.PI/2, 0, 0]}>
                  <cylinderGeometry args={[0.0075, 0.0075, 0.6, 16]} />
                  <meshStandardMaterial color="#64748b" transparent opacity={0.4} metalness={0.9} roughness={0.1} />
              </mesh>
          </group>

          {/* 3. Lens Assembly */}
          <group>
             {/* Mount Base */}
             <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, 0.02]}>
                 <cylinderGeometry args={[0.06, 0.06, 0.04, 32]} />
                 <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} metalness={0.9} roughness={0.2} />
             </mesh>

             {/* Lens Barrel */}
             <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, -lensBarrelLength / 2]}>
                 <cylinderGeometry args={[0.052, 0.052, lensBarrelLength, 32]} />
                 <meshStandardMaterial 
                    color="#1e293b" 
                    transparent 
                    opacity={0.2} 
                    roughness={0.1} 
                    metalness={0.5} 
                    side={T.DoubleSide} 
                    depthWrite={false} 
                 />
                 <Edges color="#64748b" opacity={0.3} />
             </mesh>

             {/* Focus Ring */}
             <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, -lensBarrelLength * 0.4]}>
                 <cylinderGeometry args={[0.056, 0.056, 0.03, 64]} />
                 <meshStandardMaterial color="#475569" transparent opacity={0.4} roughness={0.8} />
             </mesh>
             
             {/* Aperture Ring */}
             <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, -lensBarrelLength * 0.7]}>
                 <cylinderGeometry args={[0.055, 0.055, 0.02, 64]} />
                 <meshStandardMaterial color="#475569" transparent opacity={0.4} roughness={0.8} />
             </mesh>

             {/* Red Ring */}
             <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, -lensBarrelLength + 0.005]}>
                 <cylinderGeometry args={[0.053, 0.053, 0.005, 32]} />
                 <meshStandardMaterial color="#b91c1c" transparent opacity={0.8} roughness={0.2} />
             </mesh>

             {/* Matte Box (4-Leaf Cinema Style) */}
             <group position={[0, 0, -lensBarrelLength - 0.02]}>
                 {/* Adapter Ring */}
                 <mesh rotation={[Math.PI/2, 0, 0]}>
                     <cylinderGeometry args={[0.062, 0.062, 0.02, 32]} />
                     <meshStandardMaterial color="#1e293b" transparent opacity={0.5} />
                 </mesh>

                 {/* Main Frame */}
                 <group position={[0, 0, -0.03]}>
                    <mesh>
                        <boxGeometry args={[0.19, 0.15, 0.05]} />
                        <meshStandardMaterial color="#0f172a" transparent opacity={0.5} side={T.DoubleSide} depthWrite={false} />
                        <Edges color="#475569" opacity={0.5} />
                    </mesh>
                 </group>
                 
                 {/* Barn Doors (Flags) */}
                 {/* Pivot Z: Front face of box (-0.03 - 0.025 = -0.055) */}
                 <group position={[0, 0, -0.055]}>
                    
                    {/* Top Flag */}
                    <group position={[0, 0.075, 0]} rotation={[-Math.PI / 4, 0, 0]}>
                        <mesh position={[0, 0.06, 0]}>
                            <boxGeometry args={[0.24, 0.12, 0.005]} />
                            <meshStandardMaterial color="#020617" transparent opacity={0.7} />
                            <Edges color="#334155" opacity={0.4} />
                        </mesh>
                    </group>

                    {/* Bottom Flag */}
                    <group position={[0, -0.075, 0]} rotation={[Math.PI / 4, 0, 0]}>
                        <mesh position={[0, -0.06, 0]}>
                             <boxGeometry args={[0.22, 0.12, 0.005]} />
                             <meshStandardMaterial color="#020617" transparent opacity={0.7} />
                             <Edges color="#334155" opacity={0.4} />
                        </mesh>
                    </group>

                    {/* Left Flag */}
                    <group position={[-0.095, 0, 0]} rotation={[0, -Math.PI / 4, 0]}>
                        <mesh position={[-0.05, 0, 0]}>
                             <boxGeometry args={[0.10, 0.15, 0.005]} />
                             <meshStandardMaterial color="#020617" transparent opacity={0.7} />
                             <Edges color="#334155" opacity={0.4} />
                        </mesh>
                    </group>

                    {/* Right Flag */}
                    <group position={[0.095, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
                         <mesh position={[0.05, 0, 0]}>
                             <boxGeometry args={[0.10, 0.15, 0.005]} />
                             <meshStandardMaterial color="#020617" transparent opacity={0.7} />
                             <Edges color="#334155" opacity={0.4} />
                         </mesh>
                    </group>

                 </group>
             </group>
          </group>

          {/* 4. Internal Optical Path */}
          <group>
              {/* SENSOR - Highly Visible */}
              <mesh position={[0, 0, lensModel.imageDistance]} rotation={[0, Math.PI, 0]}>
                 <planeGeometry args={[lensModel.sensorW, lensModel.sensorH]} />
                 <meshStandardMaterial 
                    color="#22d3ee" 
                    emissive="#22d3ee" 
                    emissiveIntensity={2} 
                    roughness={0} 
                    metalness={1} 
                    toneMapped={false}
                  />
                  <Edges color="#ffffff" threshold={1} />
              </mesh>
              
              {/* Sensor Backplate for emphasis */}
              <mesh position={[0, 0, lensModel.imageDistance + 0.001]} rotation={[0, Math.PI, 0]}>
                 <planeGeometry args={[lensModel.sensorW * 1.2, lensModel.sensorH * 1.2]} />
                 <meshBasicMaterial color="#0891b2" transparent opacity={0.5} />
              </mesh>

              <SimpleRay 
                points={[[0,0,0], [lensModel.sensorW/2, lensModel.sensorH/2, lensModel.imageDistance]]} 
                color="#22d3ee" opacity={0.6}
              />
              <SimpleRay 
                points={[[0,0,0], [-lensModel.sensorW/2, -lensModel.sensorH/2, lensModel.imageDistance]]} 
                color="#22d3ee" opacity={0.6}
              />
              <SimpleRay 
                points={[[0,0,0], [lensModel.sensorW/2, -lensModel.sensorH/2, lensModel.imageDistance]]} 
                color="#22d3ee" opacity={0.6}
              />
              <SimpleRay 
                points={[[0,0,0], [-lensModel.sensorW/2, lensModel.sensorH/2, lensModel.imageDistance]]} 
                color="#22d3ee" opacity={0.6}
              />
          </group>
        </group>
      )}
    </>
  );
};
