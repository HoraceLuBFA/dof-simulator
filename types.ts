export enum SensorType {
  FullFrame = 'Full Frame',
  APSC = 'APS-C',
  M43 = 'Micro 4/3'
}

export interface SensorSpecs {
  name: SensorType;
  coc: number; // Circle of Confusion in mm
  cropFactor: number;
}

export interface SimulationState {
  focalLength: number; // mm
  aperture: number; // f-stop
  focusDistance: number; // meters
  sensorType: SensorType;
  
  // Derived Actions
  setFocalLength: (v: number) => void;
  setAperture: (v: number) => void;
  setFocusDistance: (v: number) => void;
  setSensorType: (v: SensorType) => void;
  setPreset: (type: 'portrait' | 'landscape' | 'macro') => void;
}

export interface OpticalMetrics {
  hyperfocalDistance: number; // meters
  nearLimit: number; // meters
  farLimit: number; // meters
  totalDepth: number; // meters
  dofInFront: number; // meters
  dofBehind: number; // meters
}