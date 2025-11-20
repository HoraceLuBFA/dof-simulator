
import React from 'react';

export enum SensorType {
  ArriAlexaLF = 'ARRI Alexa LF',
  RedMonstro = 'RED Monstro 8K VV',
  SonyVenice = 'Sony VENICE',
  FullFrame = 'Full Frame (Standard)',
  RedHelium = 'RED Helium 8K S35',
  ArriAlexaSXT = 'ARRI Alexa SXT',
  PhantomFlex4K = 'Phantom Flex4K',
  APSC = 'APS-C',
  BMPCC4K = 'Blackmagic Pocket 4K',
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

// Global JSX declaration fallback for R3F
// This ensures types are picked up in global scope
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      group: any;
      mesh: any;
      cylinderGeometry: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      lineSegments: any;
      edgesGeometry: any;
      lineBasicMaterial: any;
      icosahedronGeometry: any;
      meshStandardMaterial: any;
      sphereGeometry: any;
      boxGeometry: any;
      color: any;
      primitive: any;
      [key: string]: any;
    }
  }
}

// Also augment React's JSX namespace specifically, which is required in some setups
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      group: any;
      mesh: any;
      cylinderGeometry: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      lineSegments: any;
      edgesGeometry: any;
      lineBasicMaterial: any;
      icosahedronGeometry: any;
      meshStandardMaterial: any;
      sphereGeometry: any;
      boxGeometry: any;
      color: any;
      primitive: any;
      [key: string]: any;
    }
  }
}
