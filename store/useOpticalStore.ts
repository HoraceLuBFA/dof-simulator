
import { create } from 'zustand';
import { SensorType, SimulationState } from '../types';

interface ExtendedState extends SimulationState {
  
  // Dynamic Object Positions (in meters from origin)
  distBlue: number;
  distGreen: number;
  distRed: number;
  setDistBlue: (d: number) => void;
  setDistGreen: (d: number) => void;
  setDistRed: (d: number) => void;

  // Camera Optical Axis Position (Truck/Pedestal)
  cameraX: number;
  cameraY: number;
  moveCamera: (dx: number, dy: number) => void;
  resetCamera: () => void;

  // Studio View Camera Presets
  studioView: 'free' | 'top' | 'side' | 'front';
  setStudioView: (v: 'free' | 'top' | 'side' | 'front') => void;
}

export const useOpticalStore = create<ExtendedState>((set) => ({
  focalLength: 50, // 50mm
  aperture: 2.8, // f/2.8
  focusDistance: 4.6, // Focus on Green Surface by default
  sensorType: SensorType.FullFrame,

  // Default positions (positive Z distance from origin 0,0,0)
  distBlue: 2.0,
  distGreen: 5.0,
  distRed: 15.0,

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

  moveCamera: (dx, dy) => set((state) => ({
    cameraX: parseFloat((state.cameraX + dx).toFixed(2)),
    // Clamp Y to not go below floor (0.1) or too high
    cameraY: parseFloat(Math.max(0.2, Math.min(5, state.cameraY + dy)).toFixed(2))
  })),
  
  resetCamera: () => set({ cameraX: 0, cameraY: 1.0 }),

  setStudioView: (v) => set({ studioView: v }),
  
  setPreset: (type) => {
    switch (type) {
      case 'portrait':
        // Focus on Green Target Surface
        // Green is at 5.0m. Radius 0.6. Cam at 0.2.
        // Distance = 5.0 + 0.2 - 0.6 = 4.6m
        set({ focalLength: 85, aperture: 1.8, focusDistance: 4.6 });
        break;
      case 'landscape':
        // Deep depth of field, focus hyperfocalish
        set({ focalLength: 24, aperture: 11, focusDistance: 10 });
        break;
      case 'macro':
        // Focus on Foreground Blue Object Surface
        // Blue at 2.0m. Radius ~0.3. Cam at 0.2.
        // Distance = 2.0 + 0.2 - 0.3 = 1.9m
        set({ focalLength: 105, aperture: 5.6, focusDistance: 1.9 });
        break;
    }
  }
}));
