
import { SensorType, SensorSpecs, OpticalMetrics } from '../types';

export const SENSOR_DATA: Record<SensorType, SensorSpecs> = {
  // Large Format / Full Frame
  [SensorType.ArriAlexaLF]: { name: SensorType.ArriAlexaLF, coc: 0.030, cropFactor: 0.9 },
  [SensorType.RedMonstro]: { name: SensorType.RedMonstro, coc: 0.031, cropFactor: 0.88 },
  [SensorType.SonyVenice]: { name: SensorType.SonyVenice, coc: 0.029, cropFactor: 1.0 },
  [SensorType.FullFrame]: { name: SensorType.FullFrame, coc: 0.029, cropFactor: 1.0 },
  
  // Super 35 / APS-C
  [SensorType.RedHelium]: { name: SensorType.RedHelium, coc: 0.023, cropFactor: 1.2 },
  [SensorType.ArriAlexaSXT]: { name: SensorType.ArriAlexaSXT, coc: 0.021, cropFactor: 1.28 },
  [SensorType.PhantomFlex4K]: { name: SensorType.PhantomFlex4K, coc: 0.021, cropFactor: 1.3 },
  [SensorType.APSC]: { name: SensorType.APSC, coc: 0.019, cropFactor: 1.5 },
  
  // M4/3
  [SensorType.BMPCC4K]: { name: SensorType.BMPCC4K, coc: 0.014, cropFactor: 1.9 },
  [SensorType.M43]: { name: SensorType.M43, coc: 0.015, cropFactor: 2.0 },
};

export const getSensorDimensions = (type: SensorType) => {
  switch (type) {
    // Large Format
    case SensorType.ArriAlexaLF: return { width: 36.70, height: 25.54 };
    case SensorType.RedMonstro: return { width: 40.96, height: 21.60 };
    case SensorType.SonyVenice: return { width: 35.9, height: 24.0 };
    case SensorType.FullFrame: return { width: 36.0, height: 24.0 };
    
    // Super 35
    case SensorType.RedHelium: return { width: 29.90, height: 15.77 };
    case SensorType.ArriAlexaSXT: return { width: 28.17, height: 18.13 };
    case SensorType.PhantomFlex4K: return { width: 27.6, height: 15.5 };
    case SensorType.APSC: return { width: 23.5, height: 15.6 };
    
    // Micro 4/3
    case SensorType.BMPCC4K: return { width: 18.96, height: 10.0 };
    case SensorType.M43: return { width: 17.3, height: 13.0 };
    
    default: return { width: 36, height: 24 };
  }
};

/**
 * Calculates Depth of Field metrics.
 * @param focalLength - in mm
 * @param aperture - f-number
 * @param focusDistance - in meters
 * @param sensorType - Enum
 */
export const calculateOptics = (
  focalLength: number,
  aperture: number,
  focusDistance: number,
  sensorType: SensorType
): OpticalMetrics => {
  const sensor = SENSOR_DATA[sensorType];
  
  // Convert focal length to meters for formula consistency
  const f_m = focalLength / 1000;
  const coc_m = sensor.coc / 1000;

  // Hyperfocal Distance: H = f^2 / (N * c) + f
  const H = (Math.pow(f_m, 2) / (aperture * coc_m)) + f_m;

  // Near Limit: Dn = (H * s) / (H + (s - f))
  const s = focusDistance;
  const nearLimit = (H * s) / (H + (s - f_m));

  // Far Limit: Df = (H * s) / (H - (s - f))
  let farLimit = Infinity;
  if (s < H) {
    farLimit = (H * s) / (H - (s - f_m));
  }

  const totalDepth = farLimit === Infinity ? Infinity : farLimit - nearLimit;
  const dofInFront = s - nearLimit;
  const dofBehind = farLimit === Infinity ? Infinity : farLimit - s;

  return {
    hyperfocalDistance: H,
    nearLimit,
    farLimit,
    totalDepth,
    dofInFront,
    dofBehind
  };
};

interface CameraParams {
  focalLengthMm: number;
  fNumber: number;
  focusDistanceMm: number;
  sensorWidthMm: number;
}

/**
 * Calculates the Circle of Confusion diameter in pixels for a given object distance.
 * Based on physical lens formula: C = | f^2 / (N * (d - f)) * (d - z) / z |
 */
export const calculateBokehDiameterPx = (
  objectDistanceMm: number,
  params: CameraParams,
  viewportWidthPx: number
): number => {
  const { focalLengthMm: f, fNumber: N, focusDistanceMm: d, sensorWidthMm: Sw } = params;
  const MAX_COC_PX = 100; // Cap for performance and visual sanity (increased from 50 for 3D effect)

  // simple robustness: avoid extreme near distances
  if (objectDistanceMm <= f || d <= f) return 0;

  // CoC diameter on the sensor in millimeters:
  // C_mm = | (f^2 / (N * (d - f))) * ((d - z) / z) |
  const lensFactor = (f * f) / (N * (d - f));
  
  // For object at infinity, term (d - z) / z approaches -1.
  // For object at specific distance z, we use exact formula.
  let distanceFactor = 1;
  if (objectDistanceMm === Infinity) {
      distanceFactor = 1;
  } else {
      distanceFactor = (d - objectDistanceMm) / objectDistanceMm;
  }
  
  const C_mm = Math.abs(lensFactor * distanceFactor);

  // convert mm on the sensor to pixels on screen:
  // C_px = C_mm * (Vw / Sw)
  const pxPerMm = viewportWidthPx / Sw;
  let C_px = C_mm * pxPerMm;

  if (!Number.isFinite(C_px)) C_px = 0;
  C_px = Math.min(Math.max(C_px, 0), MAX_COC_PX);

  return C_px;
};
