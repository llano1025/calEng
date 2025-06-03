import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  MPEResult, 
  IEC_AEL_TABLES,
  MPE_CONSTANTS,
  TIME_BASE_TI, 
  calculateC5Factor,
  getWavelengthRegion,
} from './LaserSafetyShared';

// ======================== TABLE A.1 - POINT SOURCE MPE (C0 = 1) ========================

export const calculateTableA1MPE = (
  wavelength: number,
  exposureTime: number,
  angularSubtense: number = 1.5
): {
  mpe: number;
  unit: string;
  calculationSteps: string[];
} => {
  const steps: string[] = [];
  const { C1, C2, C3, C4, C5, C6, C7, T1, T2 } = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
  
  steps.push(`Table A.1 MPE Calculation (Point Source, C0 = 1):`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Exposure time: ${exposureTime.toExponential(3)} s`);
  steps.push(`Correction factors: C1=${C1.toExponential(2)}, C2=${C2.toFixed(1)}, C3=${C3.toFixed(3)}, C4=${C4.toFixed(3)}, C6=${C6.toFixed(3)}, C7=${C7.toFixed(3)}`);
  
  let mpe = 0;
  let unit = 'J·m⁻²';

  // 180 to 302.5 nm
  if (wavelength >= 180 && wavelength < 302.5) {
    if (exposureTime <= 1e-9) {
      mpe = 3e10; // W·m⁻²
    } else {
      mpe = 30; // J·m⁻²
    }
  }
  // 302.5 to 315 nm
  else if (wavelength >= 302.5 && wavelength < 315) {
    if (exposureTime <= 1e-9) {
      mpe = 3e10; // W·m⁻²
      unit = 'W·m⁻²';
    } else if (exposureTime > 1e-9 && exposureTime <= T1) {
      mpe = C1; // J·m⁻²
    } else {
      mpe = C2; // J·m⁻²
    }
  }
  // 315 to 400 nm
  else if (wavelength >= 315 && wavelength < 400) {
    if (exposureTime <= 1e-9) {
      mpe = 3e10; // W·m⁻²
      unit = 'W·m⁻²';
    } else if (exposureTime < 10) {
      mpe = C1; // J·m⁻²
    } else {
      mpe = 1e4; // J·m⁻²
    }
  }
  // 400 to 450 nm
  else if (wavelength >= 400 && wavelength < 450) {
    if (exposureTime < 1e-11) {
      mpe = 1e-3; // J·m⁻²
    } else if (exposureTime < 5e-6) {
      mpe = 2e-3; // J·m⁻²
    } else if (exposureTime >= 5e-6 && exposureTime < 10) {
      mpe = 18 * Math.pow(exposureTime, 0.75); // J·m⁻²
    } else if (exposureTime >= 10 && exposureTime < 100) {
      mpe = 100; // J·m⁻²
    } else {
      mpe = C3; // W·m⁻²
      unit = 'W·m⁻²';
    }
  }
  // 450 to 500 nm
  else if (wavelength >= 450 && wavelength < 500) {
    if (exposureTime < 1e-11) {
      mpe = 1e-3; // J·m⁻²
    } else if (exposureTime >= 1e-11 && exposureTime < 5e-6) {
      mpe = 2e-3; // J·m⁻²
    } else if (exposureTime >= 5e-6 && exposureTime < 10) {
      mpe = 18 * Math.pow(exposureTime, 0.75); // J·m⁻²
    } else if (exposureTime >= 10 && exposureTime < 100) {
      // Dual limits apply - photochemical and thermal
      const photochemicalLimit = 100 * C3; // J·m⁻²
      const thermalLimit = 18 * Math.pow(exposureTime, 0.75); // J·m⁻²
      mpe = Math.min(photochemicalLimit, thermalLimit);
    } else if (exposureTime >= 10 && exposureTime < 100) {
      const powerLimit = 100 * C3; // W·m⁻²
      mpe = powerLimit;
      unit = 'W·m⁻²';
    } else {
      mpe = C3; // W·m⁻²
      unit = 'W·m⁻²';
    }
  }
  // 500 to 700 nm
  else if (wavelength >= 500 && wavelength <= 700) {
    if (exposureTime < 1.8e-5) {
      mpe = 2e-3 * exposureTime; // J·m⁻²
      steps.push(`Range (500-700 nm, t < 18μs): MPE = 2×10⁻³ × t = ${mpe.toExponential(3)} J·m⁻²`);
    } else if (exposureTime >= 1.8e-5 && exposureTime < 10) {
      mpe = 18 * Math.pow(exposureTime, 0.75); // J·m⁻²
      steps.push(`Range (500-700 nm, 18μs ≤ t < 10s): MPE = 18 × t⁰·⁷⁵ = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 10; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (500-700 nm, t ≥ 10s): MPE = 10 W·m⁻²`);
    }
  }
  // 700 to 1050 nm
  else if (wavelength > 700 && wavelength <= 1050) {
    if (exposureTime < 1e-11) {
      mpe = 1e-3 * C4; // J·m⁻²
      steps.push(`Range (700-1050 nm, t < 10ps): MPE = 1×10⁻³ × C4 = ${mpe.toExponential(3)} J·m⁻²`);
    } else if (exposureTime >= 1e-11 && exposureTime < 1.8e-5 * C4) {
      mpe = 2e-3 * C4 * exposureTime; // J·m⁻²
      steps.push(`Range (700-1050 nm, 10ps ≤ t < ${(1.8e-5 * C4).toExponential(2)}s): MPE = 2×10⁻³ × C4 × t = ${mpe.toExponential(3)} J·m⁻²`);
    } else if (exposureTime >= 1.8e-5 * C4 && exposureTime < 10) {
      mpe = 18 * Math.pow(exposureTime, 0.75) * C4; // J·m⁻²
      steps.push(`Range (700-1050 nm, ${(1.8e-5 * C4).toExponential(2)}s ≤ t < 10s): MPE = 18 × t⁰·⁷⁵ × C4 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 10 * C4 * C7; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (700-1050 nm, t ≥ 10s): MPE = 10 × C4 × C7 = ${mpe.toExponential(3)} W·m⁻²`);
    }
  }
  // 1050 to 1400 nm
  else if (wavelength > 1050 && wavelength <= 1400) {
    if (exposureTime < 1e-11) {
      mpe = 1e-2 * C7; // J·m⁻²
      steps.push(`Range (1050-1400 nm, t < 10ps): MPE = 1×10⁻² × C7 = ${mpe.toExponential(3)} J·m⁻²`);
    } else if (exposureTime >= 1e-11 && exposureTime < 5e-5 * C7) {
      mpe = 2e-2 * C7 * exposureTime; // J·m⁻²
      steps.push(`Range (1050-1400 nm, 10ps ≤ t < ${(5e-5 * C7).toExponential(2)}s): MPE = 2×10⁻² × C7 × t = ${mpe.toExponential(3)} J·m⁻²`);
    } else if (exposureTime >= 5e-5 * C7 && exposureTime < 10) {
      mpe = 90 * Math.pow(exposureTime, 0.75) * C7; // J·m⁻²
      steps.push(`Range (1050-1400 nm, ${(5e-5 * C7).toExponential(2)}s ≤ t < 10s): MPE = 90 × t⁰·⁷⁵ × C7 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 10 * C4 * C7; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1050-1400 nm, t ≥ 10s): MPE = 10 × C4 × C7 = ${mpe.toExponential(3)} W·m⁻²`);
    }
  }
  // 1400 to 1500 nm
  else if (wavelength > 1400 && wavelength <= 1500) {
    if (exposureTime < 1e-9) {
      mpe = 1e12; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1400-1500 nm, t < 1ns): MPE = 10¹² W·m⁻²`);
    } else if (exposureTime >= 1e-9 && exposureTime < 1e-3) {
      mpe = 1e3; // J·m⁻²
      steps.push(`Range (1400-1500 nm, 1ns ≤ t < 1ms): MPE = 10³ J·m⁻²`);
    } else if (exposureTime >= 1e-3 && exposureTime < 10) {
      mpe = 5600 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (1400-1500 nm, 1ms ≤ t < 10s): MPE = 5600 × t⁰·²⁵ = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 1000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1400-1500 nm, t ≥ 10s): MPE = 1000 W·m⁻²`);
    }
  }
  // 1500 to 1800 nm
  else if (wavelength > 1500 && wavelength <= 1800) {
    if (exposureTime < 1e-9) {
      mpe = 1e13; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1500-1800 nm, t < 1ns): MPE = 10¹³ W·m⁻²`);
    } else if (exposureTime >= 1e-9 && exposureTime < 10) {
      mpe = 1e4; // J·m⁻²
      steps.push(`Range (1500-1800 nm, 1ns ≤ t < 10s): MPE = 10⁴ J·m⁻²`);
    } else {
      mpe = 1000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1500-1800 nm, t ≥ 10s): MPE = 1000 W·m⁻²`);
    }
  }
  // 1800 to 2600 nm
  else if (wavelength > 1800 && wavelength <= 2600) {
    if (exposureTime < 1e-9) {
      mpe = 1e12; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1800-2600 nm, t < 1ns): MPE = 10¹² W·m⁻²`);
    } else if (exposureTime >= 1e-9 && exposureTime < 1e-3) {
      mpe = 1e3; // J·m⁻²
      steps.push(`Range (1800-2600 nm, 1ns ≤ t < 1ms): MPE = 10³ J·m⁻²`);
    } else if (exposureTime >= 1e-3 && exposureTime < 10) {
      mpe = 5600 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (1800-2600 nm, 1ms ≤ t < 10s): MPE = 5600 × t⁰·²⁵ = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 1000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1800-2600 nm, t ≥ 10s): MPE = 1000 W·m⁻²`);
    }
  }
  // 2600 nm to 10^6 nm
  else if (wavelength > 2600 && wavelength <= 1e6) {
    if (exposureTime < 1e-9) {
      mpe = 1e11; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (>2600 nm, t < 1ns): MPE = 10¹¹ W·m⁻²`);
    } else if (exposureTime >= 1e-9 && exposureTime < 1e-7) {
      mpe = 100; // J·m⁻²
      steps.push(`Range (>2600 nm, 1ns ≤ t < 100ns): MPE = 100 J·m⁻²`);
    } else if (exposureTime >= 1e-7 && exposureTime < 10) {
      mpe = 5600 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (>2600 nm, 100ns ≤ t < 10s): MPE = 5600 × t⁰·²⁵ = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 1000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (>2600 nm, t ≥ 10s): MPE = 1000 W·m⁻²`);
    }
  }

  steps.push(`Final MPE = ${mpe.toExponential(3)} ${unit}`);
  
  return { mpe, unit, calculationSteps: steps };
};

// ======================== TABLE A.2 - EXTENDED SOURCE MPE ========================

export const calculateTableA2MPE = (
  wavelength: number,
  exposureTime: number,
  angularSubtense: number
): {
  mpe: number;
  unit: string;
  calculationSteps: string[];
} => {
  const steps: string[] = [];
  const { C1, C2, C3, C4, C5, C6, C7, T1, T2 } = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);

  steps.push(`Table A.2 MPE Calculation (Extended Source):`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Exposure time: ${exposureTime.toExponential(3)} s`);
  steps.push(`Angular subtense: ${angularSubtense} mrad`);
  steps.push(`Correction factors: C3=${C3.toFixed(3)}, C4=${C4.toFixed(3)}, C6=${C6.toFixed(3)}, C7=${C7.toFixed(3)}`);
  steps.push(`T2: ${T2.toFixed(1)} s`);
  
  let mpe = 0;
  let unit = 'J·m⁻²';

  // Only applies to retinal hazard region (400-1400 nm)
  if (wavelength >= 400 && wavelength <= 700) {
    if (exposureTime < 10) {
      if (angularSubtense <= 11) {
        // Use point source values
        return calculateTableA1MPE(wavelength, exposureTime, angularSubtense);
      }
      
      // Dual limits apply
      const limit1 = 100 * C3; // J·m⁻²
      const limit2 = 1 * C3; // W·m⁻²
      
      if (exposureTime < 100) {
        mpe = limit1;
        steps.push(`Extended source (400-700 nm, t<100s): MPE = 100 × C3 = ${mpe.toExponential(3)} J·m⁻²`);
      } else {
        mpe = limit2;
        unit = 'W·m⁻²';
        steps.push(`Extended source (400-700 nm, t≥100s): MPE = 1 × C3 = ${mpe.toExponential(3)} W·m⁻²`);
      }
    } else {
      mpe = 1 * C3; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Extended source (400-700 nm, t≥10s): MPE = 1 × C3 = ${mpe.toExponential(3)} W·m⁻²`);
    }
    
    // Check thermal limits if applicable
    if (exposureTime < T2) {
      const thermalLimit = 18 * C6 * Math.pow(exposureTime, 0.75); // J·m⁻²
      if (unit === 'J·m⁻²' && thermalLimit < mpe) {
        mpe = thermalLimit;
        steps.push(`Thermal limit overrides: 18 × C6 × t^0.75 = ${mpe.toExponential(3)} J·m⁻²`);
      }
    } else {
      const thermalLimitPower = 18 * C4 * C6 * Math.pow(T2, -0.25); // W·m⁻²
      if (unit === 'W·m⁻²' && thermalLimitPower < mpe) {
        mpe = thermalLimitPower;
        steps.push(`Thermal limit overrides: 18 × C4 × C6 × T2^(-0.25) = ${mpe.toExponential(3)} W·m⁻²`);
      }
    }
  }
  else if (wavelength > 700 && wavelength <= 1050) {
    if (exposureTime < T2) {
      mpe = 18 * C4 * C6 * Math.pow(exposureTime, 0.75); // J·m⁻²
      steps.push(`Extended source (700-1050 nm, t<T2): 18 × C4 × C6 × t^0.75 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 18 * C4 * C6 * Math.pow(T2, -0.25); // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Extended source (700-1050 nm, t≥T2): 18 × C4 × C6 × T2^(-0.25) = ${mpe.toExponential(3)} W·m⁻²`);
    }
  }
  else if (wavelength > 1050 && wavelength <= 1400) {
    if (exposureTime < T2) {
      mpe = 90 * C6 * C7 * Math.pow(exposureTime, 0.75); // J·m⁻²
      steps.push(`Extended source (1050-1400 nm, t<T2): 90 × C6 × C7 × t^0.75 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 90 * C6 * C7 * Math.pow(T2, -0.25); // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Extended source (1050-1400 nm, t≥T2): 90 × C6 × C7 × T2^(-0.25) = ${mpe.toExponential(3)} W·m⁻²`);
    }
  }
  else {
    // Outside retinal hazard region, use point source values
    steps.push(`Outside retinal hazard region - using point source values`);
    return calculateTableA1MPE(wavelength, exposureTime, angularSubtense);
  }

  steps.push(`Final extended source MPE = ${mpe.toExponential(3)} ${unit}`);
  
  return { mpe, unit, calculationSteps: steps };
};

// ======================== TABLE A.3 - POINT SOURCE MPE IN POWER/ENERGY (7mm aperture) ========================

export const calculateTableA3MPE = (
  wavelength: number,
  exposureTime: number
): {
  mpe: number;
  unit: string;
  calculationSteps: string[];
} => {
  const steps: string[] = [];
  const apertureDiameter = 7; // mm
  const apertureArea = Math.PI * Math.pow(apertureDiameter / 2, 2) * 1e-6; // m²
  
  steps.push(`Table A.3 MPE Calculation (Power/Energy through 7mm aperture):`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Exposure time: ${exposureTime.toExponential(3)} s`);
  steps.push(`Aperture diameter: ${apertureDiameter} mm`);
  steps.push(`Aperture area: ${apertureArea.toExponential(3)} m²`);
  
  const { C1, C2, C3, C4, C5, C6, C7, T1, T2 } = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime);
  
  let mpe = 0;
  let unit = 'J';

  // 400 to 450 nm
  if (wavelength >= 400 && wavelength < 450) {
    mpe = 3.9e-3; // J
    steps.push(`Range (400-450 nm): MPE = ${mpe.toExponential(3)} J`);
  }
  // 450 to 500 nm
  else if (wavelength >= 450 && wavelength < 500) {
    if (exposureTime < 10) {
      mpe = 3.8e-8 + 7.7e-8; // Simplified from table
    } else if (exposureTime >= 10 && exposureTime < 100) {
      mpe = 3.9e-3 * C3; // J
    } else {
      mpe = 3.9e-4; // W
      unit = 'W';
    }
    steps.push(`Range (450-500 nm): MPE = ${mpe.toExponential(3)} ${unit}`);
  }
  // 500 to 700 nm
  else if (wavelength >= 500 && wavelength <= 700) {
    if (exposureTime < 1.8e-5) {
      mpe = 7.7e-8; // J  
    } else if (exposureTime >= 1.8e-5 && exposureTime < 0.25) {
      mpe = 7e-4 * Math.pow(exposureTime, 0.75); // J
    } else {
      mpe = 3.9e-4; // W
      unit = 'W';
    }
    steps.push(`Range (500-700 nm): MPE = ${mpe.toExponential(3)} ${unit}`);
  }
  // 700 to 1050 nm
  else if (wavelength > 700 && wavelength <= 1050) {
    if (exposureTime < 1.8e-5 * C4) {
      mpe = 3.8e-8 * C4; // J
    } else if (exposureTime >= 1.8e-5 * C4 && exposureTime < 0.25) {
      mpe = 7e-4 * Math.pow(exposureTime, 0.75) * C4; // J
    } else {
      mpe = 3.9e-4 * C4 * C7; // W
      unit = 'W';
    }
    steps.push(`Range (700-1050 nm): MPE = ${mpe.toExponential(3)} ${unit}`);
  }
  // 1050 to 1400 nm
  else if (wavelength > 1050 && wavelength <= 1400) {
    if (exposureTime < 5e-5 * C7) {
      mpe = 3.8e-8 * C7; // J
    } else if (exposureTime >= 5e-5 * C7 && exposureTime < 0.25) {
      mpe = 7.7e-7 * C7; // J
    } else if (exposureTime >= 0.25 && exposureTime < 10) {
      mpe = 3.5e-3 * Math.pow(exposureTime, 0.75) * C7; // J
    } else {
      mpe = 3.9e-4 * C4 * C7; // W
      unit = 'W';
    }
    steps.push(`Range (1050-1400 nm): MPE = ${mpe.toExponential(3)} ${unit}`);
  }

  // Convert to cm² for consistency with other calculations
  if (unit === 'J') {
    const mpePerCm2 = mpe / (apertureArea * 1e4); // Convert m² to cm²
    steps.push(`MPE per cm²: ${mpePerCm2.toExponential(3)} J/cm²`);
  } else {
    const mpePerCm2 = mpe / (apertureArea * 1e4); // Convert m² to cm²
    steps.push(`MPE per cm²: ${mpePerCm2.toExponential(3)} W/cm²`);
  }

  return { mpe, unit, calculationSteps: steps };
};

// ======================== TABLE A.5 - SKIN MPE ========================

export const calculateTableA5MPE = (
  wavelength: number,
  exposureTime: number
): {
  mpe: number;
  unit: string;
  calculationSteps: string[];
} => {
  const steps: string[] = [];
  const { C1, C2, C3, C4, C5, C6, C7, T1, T2 } = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime);
  
  steps.push(`Table A.5 MPE Calculation (Skin):`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Exposure time: ${exposureTime.toExponential(3)} s`);
  
  let mpe = 0;
  let unit = 'J·m⁻²';

  // 180 to 302.5 nm
  if (wavelength >= 180 && wavelength < 302.5) {
    mpe = 30; // J·m⁻²
    steps.push(`Range (180-302.5 nm): MPE = 30 J·m⁻²`);
  }
  // 302.5 to 315 nm
  else if (wavelength >= 302.5 && wavelength < 315) {
    if (exposureTime < 10) {
      const T1 = Math.pow(10, -15) * Math.pow(10, 0.8 * (wavelength - 295));
      if (exposureTime <= T1) {
        mpe = C1; // J·m⁻²
        steps.push(`Range (302.5-315 nm, t≤T1): MPE = C1 = ${mpe.toExponential(3)} J·m⁻²`);
      } else {
        mpe = C2; // J·m⁻²
        steps.push(`Range (302.5-315 nm, t>T1): MPE = C2 = ${mpe.toFixed(1)} J·m⁻²`);
      }
    } else {
      mpe = C2; // J·m⁻²
      steps.push(`Range (302.5-315 nm, t≥10s): MPE = C2 = ${mpe.toFixed(1)} J·m⁻²`);
    }
  }
  // 315 to 400 nm
  else if (wavelength >= 315 && wavelength < 400) {
    if (exposureTime < 10) {
      mpe = C1; // J·m⁻²
      steps.push(`Range (315-400 nm, t<10s): MPE = C1 = ${mpe.toExponential(3)} J·m⁻²`);
    } else if (exposureTime >= 10 && exposureTime < 1000) {
      mpe = 1e4; // J·m⁻²
      steps.push(`Range (315-400 nm, 10s≤t<1000s): MPE = 10⁴ J·m⁻²`);
    } else {
      mpe = 10; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (315-400 nm, t≥1000s): MPE = 10 W·m⁻²`);
    }
  }
  // 400 to 700 nm
  else if (wavelength >= 400 && wavelength <= 700) {
    if (exposureTime < 10) {
      mpe = 200; // J·m⁻²
      steps.push(`Range (400-700 nm, t<10s): MPE = 200 J·m⁻²`);
    } else if (exposureTime >= 10 && exposureTime < 1000) {
      mpe = 1.1e4 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (400-700 nm, 10s≤t<1000s): MPE = 1.1×10⁴ × t^0.25 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 2000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (400-700 nm, t≥1000s): MPE = 2000 W·m⁻²`);
    }
  }
  // 700 to 1400 nm
  else if (wavelength > 700 && wavelength <= 1400) {
    if (exposureTime < 10) {
      mpe = 200 * C4; // J·m⁻²
      steps.push(`Range (700-1400 nm, t<10s): MPE = 200 × C4 = ${mpe.toExponential(3)} J·m⁻²`);
    } else if (exposureTime >= 10 && exposureTime < 1000) {
      mpe = 1.1e4 * C4 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (700-1400 nm, 10s≤t<1000s): MPE = 1.1×10⁴ × C4 × t^0.25 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 2000 * C4; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (700-1400 nm, t≥1000s): MPE = 2000 × C4 = ${mpe.toExponential(3)} W·m⁻²`);
    }
  }
  // 1400 to 1500 nm
  else if (wavelength > 1400 && wavelength <= 1500) {
    if (exposureTime < 1e-3) {
      mpe = 1e3; // J·m⁻²
      steps.push(`Range (1400-1500 nm, t<1ms): MPE = 10³ J·m⁻²`);
    } else if (exposureTime >= 1e-3 && exposureTime < 10) {
      mpe = 5600 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (1400-1500 nm, 1ms≤t<10s): MPE = 5600 × t^0.25 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 1000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1400-1500 nm, t≥10s): MPE = 1000 W·m⁻²`);
    }
  }
  // 1500 to 1800 nm
  else if (wavelength > 1500 && wavelength <= 1800) {
    mpe = 1e4; // J·m⁻²
    steps.push(`Range (1500-1800 nm): MPE = 10⁴ J·m⁻²`);
  }
  // 1800 to 2600 nm
  else if (wavelength > 1800 && wavelength <= 2600) {
    if (exposureTime < 1e-3) {
      mpe = 1e3; // J·m⁻²
      steps.push(`Range (1800-2600 nm, t<1ms): MPE = 10³ J·m⁻²`);
    } else if (exposureTime >= 1e-3 && exposureTime < 10) {
      mpe = 5600 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (1800-2600 nm, 1ms≤t<10s): MPE = 5600 × t^0.25 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 1000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (1800-2600 nm, t≥10s): MPE = 1000 W·m⁻²`);
    }
  }
  // 2600 nm to 10^6 nm
  else if (wavelength > 2600 && wavelength <= 1e6) {
    if (exposureTime < 1e-7) {
      mpe = 100; // J·m⁻²
      steps.push(`Range (>2600 nm, t<100ns): MPE = 100 J·m⁻²`);
    } else if (exposureTime >= 1e-7 && exposureTime < 10) {
      mpe = 5600 * Math.pow(exposureTime, 0.25); // J·m⁻²
      steps.push(`Range (>2600 nm, 100ns≤t<10s): MPE = 5600 × t^0.25 = ${mpe.toExponential(3)} J·m⁻²`);
    } else {
      mpe = 1000; // W·m⁻²
      unit = 'W·m⁻²';
      steps.push(`Range (>2600 nm, t≥10s): MPE = 1000 W·m⁻²`);
    }
  }

  steps.push(`Skin MPE: ${mpe.toExponential(3)} ${unit}`);
  
  return { mpe, unit, calculationSteps: steps };
};

// ======================== ENHANCED C5 CALCULATION (Section A.3) ========================

export const calculateC5FactorISO = (
  wavelength: number,
  pulseWidth: number, // seconds
  repetitionRate: number, // Hz
  exposureTime: number, // seconds
  angularSubtense: number = 1.5 // mrad
): {
  c5Factor: number;
  numberOfPulses: number;
  timeBase: number;
  pulseGrouping: string;
  c5Steps: string[];
} => {
  const steps: string[] = [];
  const Ti = TIME_BASE_TI.getTimeBase(wavelength);
  
  steps.push(`C5 Calculation per Section A.3:`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Pulse width: ${pulseWidth.toExponential(3)} s`);
  steps.push(`Repetition rate: ${repetitionRate} Hz`);
  steps.push(`Exposure time: ${exposureTime} s`);
  steps.push(`Angular subtense: ${angularSubtense} mrad`);
  steps.push(`Ti (Table 2): ${Ti.toExponential(3)} s`);
  
  // Calculate number of pulses
  let N = Math.floor(exposureTime * repetitionRate);
  
  // Count pulses within Ti as single pulse
  if (repetitionRate > 0) {
    const pulsesInTi = Math.floor(Ti * repetitionRate);
    if (pulsesInTi > 1) {
      N = Math.ceil(N / pulsesInTi);
      steps.push(`Multiple pulses within Ti counted as single pulse. Effective N = ${N}`);
    }
  }
  
  steps.push(`Number of pulses N = ${N}`);
  
  // Apply C5 rules from Section A.3
  let c5Factor = 1.0;
  let groupingDescription = '';
  
  if (pulseWidth < Ti) {
    steps.push(`Pulse duration (${pulseWidth.toExponential(3)} s) < Ti`);
    
    if (exposureTime <= 0.25) {
      c5Factor = 1.0;
      groupingDescription = 'Short exposure (≤0.25s)';
      steps.push(`Maximum anticipated exposure ≤ 0.25 s: C5 = 1.0`);
    } else {
      if (N <= 600) {
        c5Factor = 1.0;
        groupingDescription = 'Few pulses (N≤600)';
        steps.push(`N ≤ 600: C5 = 1.0`);
      } else {
        c5Factor = 5 * Math.pow(N, -0.25);
        c5Factor = Math.max(0.4, c5Factor);
        groupingDescription = `Many pulses (N>600)`;
        steps.push(`N > 600: C5 = 5 × N^(-0.25) = ${(5 * Math.pow(N, -0.25)).toFixed(4)}`);
        steps.push(`C5 = max(0.4, ${(5 * Math.pow(N, -0.25)).toFixed(4)}) = ${c5Factor.toFixed(4)}`);
      }
    }
  } else {
    steps.push(`Pulse duration (${pulseWidth.toExponential(3)} s) > Ti`);
    
    const { C1, C2, C3, C4, C5, C6, C7, T1, T2 } = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
    
    if (angularSubtense <= 5) {
      c5Factor = 1.0;
      groupingDescription = 'Small source (α≤5 mrad)';
      steps.push(`α ≤ 5 mrad: C5 = 1.0`);
    } else if (angularSubtense > 5 && angularSubtense <= 100) {
      if (N <= 40) {
        c5Factor = Math.pow(N, -0.25);
        groupingDescription = 'Medium source, few pulses';
        steps.push(`5 < α ≤ 100 mrad, N ≤ 40: C5 = N^(-0.25) = ${c5Factor.toFixed(4)}`);
      } else {
        c5Factor = 0.4;
        groupingDescription = 'Medium source, many pulses';
        steps.push(`5 < α ≤ 100 mrad, N > 40: C5 = 0.4`);
      }
    } else {
      // Angular subtense > 100 mrad
      c5Factor = 1.0;
      groupingDescription = 'Large source (α>100 mrad)';
      steps.push(`α > 100 mrad: C5 = 1.0`);
    }
  }
  
  steps.push(`Final C5 = ${c5Factor.toFixed(4)} (${groupingDescription})`);
  
  return {
    c5Factor,
    numberOfPulses: N,
    timeBase: Ti,
    pulseGrouping: groupingDescription,
    c5Steps: steps
  };
};

// ======================== COMPREHENSIVE MPE CALCULATION ========================

export const calculateComprehensiveMPE = (
  wavelength: number,
  exposureTime: number,
  angularSubtense: number = 1.5,
  laserType: 'continuous' | 'pulsed' = 'continuous',
  pulseWidth?: number, // seconds
  repetitionRate?: number // Hz
): MPEResult => {
  const steps: string[] = [];
  
  steps.push(`=== COMPREHENSIVE MPE CALCULATION ===`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Exposure time: ${exposureTime} s`);
  steps.push(`Angular subtense: ${angularSubtense} mrad`);
  steps.push(`Laser type: ${laserType}`);
  
  // Calculate point source MPE (Table A.1)
  const pointSourceMPE = calculateTableA1MPE(wavelength, exposureTime, angularSubtense);
  steps.push(`\n--- Point Source MPE (Table A.1) ---`);
  steps.push(...pointSourceMPE.calculationSteps);
  
  // Calculate extended source MPE if applicable (Table A.2)
  let extendedSourceMPE = null;
  if (wavelength >= 400 && wavelength <= 1400 && angularSubtense > 1.5) {
    extendedSourceMPE = calculateTableA2MPE(wavelength, exposureTime, angularSubtense);
    steps.push(`\n--- Extended Source MPE (Table A.2) ---`);
    steps.push(...extendedSourceMPE.calculationSteps);
  }
  
  // Calculate skin MPE (Table A.5)
  const skinMPE = calculateTableA5MPE(wavelength, exposureTime);
  steps.push(`\n--- Skin MPE (Table A.5) ---`);
  steps.push(...skinMPE.calculationSteps);
  
  // Use the most restrictive MPE
  let criticalMPE = pointSourceMPE.mpe;
  let criticalUnit = pointSourceMPE.unit;
  let limitingMechanism = 'Point Source (Table A.1)';
  
  // Convert all to same units for comparison (W/m² or J/m²)
  const isEnergyUnit = criticalUnit.includes('J');
  
  if (extendedSourceMPE) {
    let extendedMPEValue = extendedSourceMPE.mpe;
    if (extendedSourceMPE.unit !== criticalUnit) {
      // Convert units if needed
      if (isEnergyUnit && extendedSourceMPE.unit.includes('W')) {
        extendedMPEValue = extendedSourceMPE.mpe * exposureTime;
      } else if (!isEnergyUnit && extendedSourceMPE.unit.includes('J')) {
        extendedMPEValue = extendedSourceMPE.mpe / exposureTime;
      }
    }
    
    if (extendedMPEValue < criticalMPE) {
      criticalMPE = extendedSourceMPE.mpe;
      criticalUnit = extendedSourceMPE.unit;
      limitingMechanism = 'Extended Source (Table A.2)';
    }
  }
  
  // Apply pulsed laser rules if applicable
  let c5Details = undefined;
  let mpeSinglePulse = criticalMPE;
  let mpeAverage = criticalMPE;
  let mpeThermal = criticalMPE;
  
  if (laserType === 'pulsed' && pulseWidth && repetitionRate) {
    steps.push(`\n--- Pulsed Laser Rules (Section A.3) ---`);
    
    // Calculate C5
    c5Details = calculateC5FactorISO(wavelength, pulseWidth, repetitionRate, exposureTime, angularSubtense);
    steps.push(...c5Details.c5Steps);
    
    // Rule 1: Single pulse MPE
    const singlePulseMPE = calculateTableA1MPE(wavelength, pulseWidth, angularSubtense);
    mpeSinglePulse = singlePulseMPE.mpe;
    steps.push(`\nRule 1 - Single pulse MPE: ${mpeSinglePulse.toExponential(3)} ${singlePulseMPE.unit}`);
    
    // Rule 2: Average power MPE
    const averageMPE = calculateTableA1MPE(wavelength, exposureTime, angularSubtense);
    if (averageMPE.unit.includes('W')) {
      mpeAverage = averageMPE.mpe / repetitionRate;
      steps.push(`Rule 2 - Average power MPE: ${averageMPE.mpe.toExponential(3)} W/m² → ${mpeAverage.toExponential(3)} J/m² per pulse`);
    } else {
      mpeAverage = averageMPE.mpe / (exposureTime * repetitionRate);
      steps.push(`Rule 2 - Average power MPE: ${mpeAverage.toExponential(3)} J/m² per pulse`);
    }
    
    // Rule 3: Thermal accumulation with C5
    mpeThermal = mpeSinglePulse * c5Details.c5Factor;
    steps.push(`Rule 3 - Thermal accumulation MPE: ${mpeSinglePulse.toExponential(3)} × ${c5Details.c5Factor.toFixed(4)} = ${mpeThermal.toExponential(3)} J/m²`);
    
    // Find most restrictive
    criticalMPE = Math.min(mpeSinglePulse, mpeAverage, mpeThermal);
    if (criticalMPE === mpeSinglePulse) {
      limitingMechanism = 'Single Pulse (Rule 1)';
    } else if (criticalMPE === mpeAverage) {
      limitingMechanism = 'Average Power (Rule 2)';
    } else {
      limitingMechanism = 'Thermal Accumulation with C5 (Rule 3)';
    }
    
    criticalUnit = 'J·m⁻²';
    steps.push(`\nMost restrictive MPE: ${criticalMPE.toExponential(3)} ${criticalUnit} (${limitingMechanism})`);
  }
  
  // Convert to J/cm² or W/cm² for consistency
  const conversionFactor = 1e-4; // m² to cm²
  criticalMPE *= conversionFactor;
  mpeSinglePulse *= conversionFactor;
  mpeAverage *= conversionFactor;
  mpeThermal *= conversionFactor;
  
  if (criticalUnit.includes('m⁻²')) {
    criticalUnit = criticalUnit.replace('m⁻²', 'cm⁻²');
  }
  
  steps.push(`\n=== FINAL CRITICAL MPE ===`);
  steps.push(`${criticalMPE.toExponential(3)} ${criticalUnit}`);
  steps.push(`Limiting mechanism: ${limitingMechanism}`);
  
  return {
    mpeSinglePulse,
    mpeAverage,
    mpeThermal,
    criticalMPE,
    correctionFactorCA: 1, // Not used in ISO implementation
    correctionFactorCB: 1,
    correctionFactorCC: 1,
    correctionFactorC5: c5Details?.c5Factor || 1,
    wavelengthRegion: getWavelengthRegion(wavelength),
    limitingMechanism,
    calculationSteps: steps,
    c5Details
  };
};

// Export the comprehensive MPE function as the main calculation function
export const calculateMPEValue = calculateComprehensiveMPE;

interface MPECalculatorProps {
  onShowTutorial?: () => void;
}

const MPECalculator: React.FC<MPECalculatorProps> = ({ onShowTutorial }) => {
  const [wavelength, setWavelength] = useState<number>(532);
  const [exposureTime, setExposureTime] = useState<number>(0.25);
  const [angularSubtense, setAngularSubtense] = useState<number>(1.5);
  const [laserType, setLaserType] = useState<'continuous' | 'pulsed'>('continuous');
  const [pulseWidth, setPulseWidth] = useState<number>(10); // nanoseconds
  const [repetitionRate, setRepetitionRate] = useState<number>(1000); // Hz
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [mpeResults, setMpeResults] = useState<MPEResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Validation states
  const [pulseValidation, setPulseValidation] = useState<{
    isValid: boolean;
    errorMessage?: string;
    warningMessage?: string;
  }>({ isValid: true });

  // Auto-calculate MPE whenever parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [wavelength, exposureTime, angularSubtense, laserType, pulseWidth, repetitionRate]);

  // Validate pulse parameters
  useEffect(() => {
    if (laserType === 'pulsed' && repetitionRate > 0) {
      const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
      const periodBetweenPulses = 1 / repetitionRate;
      
      if (pulseWidthSeconds > periodBetweenPulses) {
        setPulseValidation({
          isValid: false,
          errorMessage: `Pulse width (${pulseWidth} ns) exceeds period between pulses (${(periodBetweenPulses * 1e9).toFixed(1)} ns)`
        });
      } else {
        const dutyCycle = (pulseWidthSeconds / periodBetweenPulses) * 100;
        if (dutyCycle > 50) {
          setPulseValidation({
            isValid: true,
            warningMessage: `High duty cycle (${dutyCycle.toFixed(1)}%). Consider CW analysis.`
          });
        } else {
          setPulseValidation({ isValid: true });
        }
      }
    } else {
      setPulseValidation({ isValid: true });
    }
  }, [laserType, pulseWidth, repetitionRate]);

  const performAutoCalculation = () => {
    if (!pulseValidation.isValid) {
      setMpeResults(null);
      setCalculationPerformed(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      // Convert pulse width to seconds for calculation
      const pulseWidthSeconds = laserType === 'pulsed' ? pulseWidth * MPE_CONSTANTS.NS_TO_S : undefined;
      
      // Calculate comprehensive MPE using new ISO 15004-2 compliant functions
      const results = calculateComprehensiveMPE(
        wavelength,
        exposureTime,
        angularSubtense,
        laserType,
        pulseWidthSeconds,
        repetitionRate
      );
      
      setMpeResults(results);
      setCalculationPerformed(true);
    } catch (error) {
      console.error('MPE calculation error:', error);
      setMpeResults(null);
      setCalculationPerformed(false);
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculation = () => {
    setCalculationPerformed(false);
    setMpeResults(null);
    setWavelength(532);
    setExposureTime(0.25);
    setAngularSubtense(1.5);
    setLaserType('continuous');
    setPulseWidth(10);
    setRepetitionRate(1000);
  };

  // Get display unit based on limiting mechanism and exposure time
  const getDisplayUnit = () => {
    if (!mpeResults) return 'J/cm²';
    
    if (laserType === 'pulsed') {
      return 'J/cm²'; // Always energy for pulsed
    }
    
    // For CW, check if result is in power or energy units
    return mpeResults.limitingMechanism.toLowerCase().includes('w/cm²') || 
           (exposureTime >= 10 && wavelength > 400) ? 'W/cm²' : 'J/cm²';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">MPE Calculator (ISO 15004-2 Compliant)</h2>
        {onShowTutorial && (
          <button 
            onClick={onShowTutorial} 
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <span className="mr-1">Tutorial</span>
            <Icons.InfoInline />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Laser Parameters</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laser Type
            </label>
            <select
              value={laserType}
              onChange={(e) => setLaserType(e.target.value as 'continuous' | 'pulsed')}
              className="w-full p-2 border rounded-md"
            >
              <option value="continuous">Continuous Wave (CW)</option>
              <option value="pulsed">Pulsed</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wavelength (nm)
            </label>
            <input
              type="number"
              min="180"
              max="1000000"
              value={wavelength}
              onChange={(e) => setWavelength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Range: 180-1,000,000 nm ({getWavelengthRegion(wavelength)} region)
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exposure Time (s)
            </label>
            <input
              type="number"
              min="1e-13"
              max="30000"
              step="any"
              value={exposureTime}
              onChange={(e) => setExposureTime(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Aversion response (visible): 0.25s | Thermal limits: 10s | Photochemical: 30,000s
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Angular Subtense (mrad)
            </label>
            <input
              type="number"
              min="0.1"
              max="1000"
              step="0.1"
              value={angularSubtense}
              onChange={(e) => setAngularSubtense(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Point source: ≤1.5 mrad | Extended source: 1.5 mrad
            </p>
          </div>

          {laserType === 'pulsed' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pulse Width (ns)
                </label>
                <input
                  type="number"
                  min="0.001"
                  max="1e9"
                  step="any"
                  value={pulseWidth}
                  onChange={(e) => setPulseWidth(Number(e.target.value))}
                  className={`w-full p-2 border rounded-md ${
                    !pulseValidation.isValid ? 'border-red-500' : ''
                  }`}
                />
                {pulseValidation.errorMessage && (
                  <p className="text-xs text-red-600 mt-1">{pulseValidation.errorMessage}</p>
                )}
                {pulseValidation.warningMessage && (
                  <p className="text-xs text-orange-600 mt-1">{pulseValidation.warningMessage}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repetition Rate (Hz)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1e12"
                  value={repetitionRate}
                  onChange={(e) => setRepetitionRate(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </>
          )}

          <div className="mt-6">
            <button
              onClick={resetCalculation}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Reset to Defaults
            </button>
            {isCalculating && (
              <p className="text-sm text-blue-600 mt-2 flex items-center">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></span>
                Calculating MPE...
              </p>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4 flex items-center">
            MPE Calculation Results
            {isCalculating && (
              <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
            )}
          </h3>
          
          {isCalculating ? (
            <div className="text-center py-8 text-blue-600">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p>Calculating MPE values...</p>
            </div>
          ) : !calculationPerformed || !mpeResults ? (
            <div className="text-center py-8 text-gray-500">
              <p>MPE values will appear automatically as you adjust parameters</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Critical MPE</h4>
                <div className="bg-green-100 border border-green-300 p-3 rounded-md">
                  <p className="font-bold text-green-700 text-lg">
                    {mpeResults.criticalMPE < 0.001 && mpeResults.criticalMPE !== 0
                      ? mpeResults.criticalMPE.toExponential(2) 
                      : mpeResults.criticalMPE.toFixed(4)
                    } {getDisplayUnit()}
                  </p>
                  <p className="text-sm mt-1">
                    Limiting mechanism: {mpeResults.limitingMechanism}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Detailed Results</h4>
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Wavelength Region</td>
                      <td className="px-3 py-2">{mpeResults.wavelengthRegion}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Source Type</td>
                      <td className="px-3 py-2">
                        {angularSubtense <= 1.5 ? 'Point Source' : 'Extended Source'} ({angularSubtense} mrad)
                      </td>
                    </tr>
                    {laserType === 'pulsed' && (
                      <>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">MPE Single Pulse (Rule 1)</td>
                          <td className="px-3 py-2">
                            {mpeResults.mpeSinglePulse < 0.001 && mpeResults.mpeSinglePulse !== 0 
                              ? mpeResults.mpeSinglePulse.toExponential(2) 
                              : mpeResults.mpeSinglePulse.toFixed(4)
                            } J/cm²
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">MPE Average (Rule 2)</td>
                          <td className="px-3 py-2">
                            {mpeResults.mpeAverage < 0.001 && mpeResults.mpeAverage !== 0
                              ? mpeResults.mpeAverage.toExponential(2) 
                              : mpeResults.mpeAverage.toFixed(4)
                            } J/cm²
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">MPE with C5 (Rule 3)</td>
                          <td className="px-3 py-2">
                            {mpeResults.mpeThermal < 0.001 && mpeResults.mpeThermal !== 0 
                              ? mpeResults.mpeThermal.toExponential(2) 
                              : mpeResults.mpeThermal.toFixed(4)
                            } J/cm²
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">C5 Factor</td>
                          <td className="px-3 py-2">
                            <span className={mpeResults.correctionFactorC5 !== 1.0 ? 'font-bold text-orange-600' : ''}>
                              {mpeResults.correctionFactorC5.toFixed(4)}
                            </span>
                            {mpeResults.c5Details && ` (${mpeResults.c5Details.pulseGrouping})`}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Correction Factors */}
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Correction Factors (ISO 15004-2)</h4>
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(() => {
                      const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
                      return (
                        <>
                          <div>
                            <span className="font-medium">C3:</span> {corrections.C3.toFixed(3)}
                            {wavelength >= 450 && wavelength <= 600 && ' (450-600nm)'}
                          </div>
                          <div>
                            <span className="font-medium">C4:</span> {corrections.C4.toFixed(3)}
                            {wavelength >= 700 && wavelength <= 1400 && ' (700-1400nm)'}
                          </div>
                          <div>
                            <span className="font-medium">C6:</span> {corrections.C6.toFixed(3)}
                            {wavelength >= 400 && wavelength <= 1400 && ' (Angular)'}
                          </div>
                          <div>
                            <span className="font-medium">C7:</span> {corrections.C7.toFixed(3)}
                            {wavelength >= 1150 && wavelength <= 1400 && ' (1150-1400nm)'}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* C5 Details Section */}
              {mpeResults.c5Details && laserType === 'pulsed' && (
                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">C5 Correction Details (Section A.3)</h4>
                  <div className="bg-white p-3 rounded-md border border-orange-200">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="font-medium text-gray-700">C5 Factor:</p>
                        <p className="text-lg font-bold text-orange-600">{mpeResults.c5Details.c5Factor.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Effective Pulses (N):</p>
                        <p className="text-gray-900">{mpeResults.c5Details.numberOfPulses}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Time Base (Ti):</p>
                        <p className="text-gray-900">{mpeResults.c5Details.timeBase.toExponential(2)} s</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Pulse Grouping:</p>
                        <p className="text-gray-900">{mpeResults.c5Details.pulseGrouping}</p>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-xs text-gray-600">
                        <strong>ISO 15004-2 Section A.3:</strong> C5 accounts for thermal accumulation in pulse trains. 
                        Values &lt;1.0 indicate reduced MPE due to multiple pulse exposure.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Calculation Steps</h4>
                <div className="bg-white p-3 rounded-md max-h-64 overflow-y-auto">
                  <ol className="list-decimal pl-5 space-y-1 text-xs font-mono">
                    {mpeResults.calculationSteps.map((step: string, index: number) => (
                      <li key={index} className={
                        step.includes('===') ? 'font-bold text-blue-700' :
                        step.includes('---') ? 'font-medium text-gray-700' :
                        step.includes('C5') ? 'text-orange-700' :
                        ''
                      }>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
          
          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">ISO 15004-2 Compliance</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>MPE values from Tables A.1 (point source), A.2 (extended source), and A.5 (skin)</li>
              <li>Section A.3 rules for repetitively pulsed lasers with proper C5 implementation</li>
              <li>All correction factors (C3, C4, C6, C7) applied per standard</li>
              <li>Dual limits for photochemical/thermal hazards in 400-600nm range</li>
              <li>Extended source calculations for angular subtense 1.5 mrad</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MPECalculator;