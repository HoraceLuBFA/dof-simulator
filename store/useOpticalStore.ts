
import { create } from 'zustand';
import { SensorType, SimulationState } from '../types';
import { SENSOR_DATA } from '../utils/optics';

interface ExtendedState extends SimulationState {
  
  // Dynamic Object Positions (in meters from origin)
  distBlue: number;
  distGreen: number;
  distRed: number;
  posBlueX: number;
  posGreenX: number;
  posRedX: number;
  
  setDistBlue: (d: number) => void;
  setDistGreen: (d: number) => void;
  setDistRed: (d: number) => void;
  setPosBlueX: (x: number) => void;
  setPosGreenX: (x: number) => void;
  setPosRedX: (x: number) => void;

  // Camera Optical Axis Position (Truck/Pedestal)
  cameraX: number;
  cameraY: number;
  moveCamera: (dx: number, dy: number) => void;
  resetCamera: () => void;
  
  // Reset all scene positions
  resetScene: () => void;

  // Studio View Camera Presets
  studioView: 'free' | 'top' | 'side' | 'front' | 'reset';
  setStudioView: (v: 'free' | 'top' | 'side' | 'front' | 'reset') => void;
}

export const useOpticalStore = create<ExtendedState>((set, get) => ({
  focalLength: 50, // 50mm
  aperture: 2.8, // f/2.8
  focusDistance: 4.6, // Focus on Green Surface by default
  sensorType: SensorType.FullFrame,

  // Default positions (positive Z distance from origin 0,0,0)
  distBlue: 3.0,
  distGreen: 6.0,
  distRed: 9.0,
  
  // Horizontal positions (X axis)
  posBlueX: 0.3,
  posGreenX: 0,
  posRedX: -0.6,

  // Camera defaults to center (X=0) and standard tripod height (Y=1.0)
  cameraX: 0,
  cameraY: 1.0,

  studioView: 'free',

  setFocalLength: (v) => set({ focalLength: v }),
  setAperture: (v) => set({ aperture: v }),
  setFocusDistance: (v) => set({ focusDistance: v }),
  setSensorType: (v) => set({ sensorType: v }),
  
  setDistBlue: (v) => set({ distBlue: v }),
  setDistGreen: (v) => set({ distGreen: v }),
  setDistRed: (v) => set({ distRed: v }),
  
  setPosBlueX: (v) => set({ posBlueX: v }),
  setPosGreenX: (v) => set({ posGreenX: v }),
  setPosRedX: (v) => set({ posRedX: v }),

  moveCamera: (dx, dy) => set((state) => ({
    cameraX: parseFloat((state.cameraX + dx).toFixed(2)),
    // Clamp Y to not go below floor (0.1) or too high
    cameraY: parseFloat(Math.max(0.2, Math.min(5, state.cameraY + dy)).toFixed(2))
  })),
  
  resetCamera: () => set({ cameraX: 0, cameraY: 1.0 }),

  resetScene: () => set({
    distBlue: 3.0,
    distGreen: 6.0,
    distRed: 9.0,
    posBlueX: 0.3,
    posGreenX: 0,
    posRedX: -0.6,
    cameraX: 0,
    cameraY: 1.0
  }),

  setStudioView: (v) => set({ studioView: v }),
  
  setPreset: (type) => {
    const { distGreen, sensorType } = get();
    // Retrieve crop factor for the current sensor type to calculate equivalent focal length
    const cropFactor = SENSOR_DATA[sensorType].cropFactor;
    
    // Calculate equivalent focal length: FullFrameFocalLength / CropFactor
    const getFocal = (ffMm: number) => Math.round(ffMm / cropFactor);

    switch (type) {
      case 'portrait':
        // Target: ~85mm Full Frame Equivalent
        set({ focalLength: getFocal(85), aperture: 1.8, focusDistance: distGreen });
        break;
      case 'landscape':
        // Target: ~24mm Full Frame Equivalent
        set({ focalLength: getFocal(24), aperture: 11, focusDistance: distGreen });
        break;
      case 'macro':
        // Target: ~105mm Full Frame Equivalent
        set({ focalLength: getFocal(105), aperture: 5.6, focusDistance: distGreen });
        break;
    }
  }
}));
