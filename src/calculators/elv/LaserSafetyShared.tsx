// ======================== SHARED INTERFACES AND TYPES ========================

export interface MPEResult {
  value: number;
  unit: string;
}

export interface NOHDResult {
  nohd: number;
  mpe: number;
  beamDiameterAtNOHD: number;
  irradianceAtNOHD: number;
  hazardClass: string;
  initialPowerDensity: number;
  calculationSteps: string[];
}

export interface WavelengthData {
  id: string;
  wavelength: number;
  power: number; // mW for CW
  pulseEnergy: number; // mJ for pulsed
  pulseWidth: number; // ns for pulsed
  angularSubtense: number; // mrad
  isActive: boolean;
}

export interface ClassificationResult {
  laserClass: string;
  classificationMethod: 'single' | 'additive' | 'independent';
  ael: number;
  aelUnit: string;
  measuredEmission: number;
  emissionUnit: string;
  ratio: number;
  classDescription: string;
  safetyRequirements: string[];
  condition1Test?: boolean;
  condition3Test?: boolean;
  requiresClassM?: boolean;
  iecCompliant?: boolean;
  condition1Emission?: number;
  condition3Emission?: number;
  condition1AEL?: number;
  condition3AEL?: number;
  condition1AELUnit?: string;
  condition3AELUnit?: string;
  classificationSteps?: string[];
  c5Correction?: {
    c5Factor: number;
    c5Steps: string[];
  };
  additiveCalculation?: {
    wavelengths: WavelengthData[];
    ratios: number[];
    sumOfRatios: number;
    additiveRegion: string;
    calculationSteps: string[];
  };
}

export interface EyewearResult {
  requiredOD: number;
  exposureLevel: number;
  mpe: number;
  scaleFactor: string;
  lbRating: string;
  dirRating: string;
  recommendations: string[];
}

// AEL Result interface with unit information
export interface AELResult {
  value: number;
  unit: string;
}

// ======================== CONSTANTS ========================

// Named constants for MPE calculations (IEC 60825-1:2014) - CORRECTED VALUES
export const MPE_CONSTANTS = {
  // Visible and Near-IR thermal coefficients (mJ/cm²) - CORRECTED FROM REVIEW
  VISIBLE_THERMAL_COEFF: 1.8, // mJ/cm² for t^0.75 formula (was 18 - FIXED)
  NEAR_IR_1050_1400_COEFF: 9.0, // mJ/cm² for 1050-1400nm
  
  // Far-IR thermal coefficients (mJ/cm²)
  MID_IR_1400_1500: 10.0, // mJ/cm² for 1400-1500nm
  MID_IR_1800_2600: 56.0, // mJ/cm² for 1800-2600nm
  
  // CW limits (W/cm²)
  VISIBLE_CW_LIMIT: 100e-6, // 100 µW/cm²
  
  // Time constants
  THERMAL_TIME_LIMIT: 0.25, // seconds
  PHOTOCHEMICAL_TIME_LIMIT: 18e-6, // 18 µs
  
  // Unit conversions
  MJ_TO_J: 1e-3, // millijoules to joules
  UJ_TO_J: 1e-6, // microjoules to joules
  MW_TO_W: 1e-3, // milliwatts to watts
  CM2_TO_M2: 1e-4, // cm² to m²
  M2_TO_CM2: 1e4, // m² to cm²
  MM_TO_CM: 0.1, // mm to cm
  MM_TO_M: 1e-3, // mm to m
  MM2_TO_M2: 1e-6, // mm² to m²
  MRAD_TO_RAD: 1e-3, // mrad to rad
  NS_TO_S: 1e-9, // nanoseconds to seconds
};

// Time base values Ti for pulse grouping (IEC 60825-1 Table 2) - ENHANCED IMPLEMENTATION
export const TIME_BASE_TI = {
  getTimeBase: (wavelength: number): number => {
    if (wavelength >= 400 && wavelength < 1050) return 5e-6; // 5 μs
    if (wavelength >= 1050 && wavelength < 1400) return 13e-6; // 13 μs
    if (wavelength >= 1400 && wavelength < 1500) return 1e-3; // 1 ms
    if (wavelength >= 1500 && wavelength < 1800) return 10; // 10 s
    if (wavelength >= 1800 && wavelength < 2600) return 1e-3; // 1 ms
    if (wavelength >= 2600 && wavelength <= 1e6) return 1e-7; // 0.1 μs
    return 1e-3; // Default 1 ms
  }
};

// ======================== TIME BASE SELECTION (IEC 60825-1:2014 Section e) ========================

export const getClassificationTimeBase = (
  wavelength: number,
  specificClassTest?: '2' | '2M' | '3R',
  hasIntentionalLongTermViewing: boolean = false
): number => {
  // Rule 3: 30,000s for UV or intentional long-term viewing
  if (wavelength <= 400) {
    return 30000; // UV wavelengths
  }
  
  if (wavelength > 400 && hasIntentionalLongTermViewing) {
    return 30000; // Intentional long-term viewing
  }
  
  // Rule 1: 0.25s for Class 2/2M/3R in visible range
  if (wavelength >= 400 && wavelength <= 700 && 
      (specificClassTest === '2' || specificClassTest === '2M' || specificClassTest === '3R')) {
    return 0.25; // Blink reflex time
  }
  
  // Rule 2: 100s for all other wavelengths > 400 nm
  if (wavelength > 400) {
    return 100; // General classification
  }
  
  return 100; // Default fallback
};

// ======================== ENHANCED C5 CALCULATION (IEC 60825-1 COMPLIANT) ========================

export const calculateC5Factor = (
  wavelength: number,
  pulseWidth: number, // ns
  repetitionRate: number, // Hz
  exposureTime: number, // s
  angularSubtense: number = 1.5, // mrad
  numberOfPulses?: number // If known, otherwise calculated from repetitionRate and exposureTime
): {
  c5Factor: number;
  numberOfPulses: number;
  timeBase: number;
  pulseGrouping: string;
  c5Steps: string[];
} => {
  const steps: string[] = [];
  const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
  const Ti = TIME_BASE_TI.getTimeBase(wavelength);
  
  // Table 9: C5 = 1 for 180-400 nm and 1400 nm - 1 mm; the pulse-train correction applies to 400-1400 nm only
  if (wavelength < 400 || wavelength > 1400) {
    steps.push(`Wavelength ${wavelength} nm is outside 400-1400 nm: C5 = 1.0 (Table 9)`);
    return {
      c5Factor: 1.0,
      numberOfPulses: Math.floor(exposureTime * repetitionRate),
      timeBase: Ti,
      pulseGrouping: 'C5 not applicable outside 400-1400 nm',
      c5Steps: steps
    };
  }

  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Pulse width: ${pulseWidth} ns = ${pulseWidthSeconds.toExponential(3)} s`);
  steps.push(`Repetition rate: ${repetitionRate} Hz`);
  steps.push(`Exposure time: ${exposureTime} s`);
  steps.push(`Angular subtense: ${angularSubtense} mrad`);
  steps.push(`Time base Ti for ${wavelength} nm: ${Ti.toExponential(3)} s`);
  
  // Calculate number of pulses if not provided
  let N = numberOfPulses;
  if (N === undefined || N <= 0) {
    N = Math.floor(exposureTime * repetitionRate);
  }
  steps.push(`Number of pulses in exposure time: N = ${N}`);
  
  // Check if C5 applies
  if (pulseWidthSeconds >= 0.25) {
    steps.push(`Pulse width (${pulseWidthSeconds.toFixed(3)} s) ≥ 0.25 s: C5 = 1.0 (not applicable for long pulses)`);
    return {
      c5Factor: 1.0,
      numberOfPulses: N,
      timeBase: Ti,
      pulseGrouping: 'Long pulse (≥0.25s) - C5 not applicable',
      c5Steps: steps
    };
  }
  
  if (N <= 1) {
    steps.push(`Single pulse (N ≤ 1): C5 = 1.0`);
    return {
      c5Factor: 1.0,
      numberOfPulses: N,
      timeBase: Ti,
      pulseGrouping: 'Single pulse',
      c5Steps: steps
    };
  }
  
  let c5Factor: number;
  let groupingDescription: string;
  
  // Check if pulse duration ≤ Ti
  if (pulseWidthSeconds <= Ti) {
    steps.push(`Pulse duration (${pulseWidthSeconds.toExponential(3)} s) ≤ Ti (${Ti.toExponential(3)} s)`);
    
    if (exposureTime <= 0.25) {
      steps.push(`Exposure time (${exposureTime} s) ≤ 0.25 s: C5 = 1.0`);
      c5Factor = 1.0;
      groupingDescription = 'Short exposure time (≤0.25s)';
    } else {
      if (N <= 600) {
        steps.push(`N (${N}) ≤ 600: C5 = 1.0`);
        c5Factor = 1.0;
        groupingDescription = 'Few pulses (N≤600)';
      } else {
        const rawC5 = 5 * Math.pow(N, -0.25);
        c5Factor = Math.max(0.4, rawC5);
        steps.push(`N (${N}) > 600: C5 = max(0.4, 5 × N^(-0.25)) = max(0.4, ${rawC5.toFixed(4)}) = ${c5Factor.toFixed(4)}`);
        groupingDescription = `Many pulses (N>600) with C5 = 5×N^(-0.25)`;
      }
    }
  } else {
    // Pulse duration > Ti - use angular subtense dependent rules
    steps.push(`Pulse duration (${pulseWidthSeconds.toExponential(3)} s) > Ti (${Ti.toExponential(3)} s)`);
    steps.push(`Using angular subtense dependent C5 calculation...`);
    
    if (angularSubtense <= 1.5) {
      c5Factor = 1.0;
      steps.push(`Angular subtense (${angularSubtense} mrad) ≤ 1.5 mrad: C5 = 1.0`);
      groupingDescription = 'Small angular subtense (≤1.5 mrad)';
    } else if (angularSubtense <= 100) {
      if (N <= 40) {
        c5Factor = 1.0;
        steps.push(`5 mrad < α ≤ 100 mrad, N ≤ 40: C5 = 1.0`);
        groupingDescription = 'Medium angular subtense, few pulses';
      } else {
        const rawC5 = Math.pow(N, -0.25);
        c5Factor = Math.max(0.4, rawC5);
        steps.push(`5 mrad < α ≤ 100 mrad, N > 40: C5 = max(0.4, N^(-0.25)) = ${c5Factor.toFixed(4)}`);
        groupingDescription = 'Medium angular subtense, many pulses';
      }
    } else {
      // Angular subtense > 100 mrad
      c5Factor = 1.0;
      steps.push(`Angular subtense (${angularSubtense} mrad) > 100 mrad: C5 = 1.0`);
      groupingDescription = 'Large angular subtense (>100 mrad)';
    }
  }
  
  steps.push(`Final C5 factor: ${c5Factor.toFixed(4)}`);
  
  return {
    c5Factor,
    numberOfPulses: N,
    timeBase: Ti,
    pulseGrouping: groupingDescription,
    c5Steps: steps
  };
};

// ======================== MULTIPLE AEL ASSESSMENT FOR PULSED LASERS ========================

export interface PulsedAELAssessment {
  singlePulseAEL: number;
  averagePowerAEL: number;
  pulseTrainAEL: number;
  mostRestrictiveAEL: number;
  breakdown: {
    singlePulse: { value: number; unit: string };
    averagePower: { value: number; unit: string };
    pulseTrain: { value: number; unit: string };
  };
  calculationSteps: string[];
}

// CORRECTED: Added pulseWidth parameter and use it instead of hardcoded 1e-6
export const assessPulsedLaserAELs = (
  className: 'Class 1' | 'Class 2' | 'Class 3R' | 'Class 3B',
  wavelength: number,
  exposureTime: number,
  repetitionRate: number,
  c5Factor: number,
  pulseWidth: number, // Pulse width in nanoseconds
  angularSubtense: number = 1.5 // mrad (C6 / T2 for extended sources)
): PulsedAELAssessment => {
  const steps: string[] = [];
  
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Exposure time: ${exposureTime} s`);
  steps.push(`Repetition rate: ${repetitionRate} Hz`);
  steps.push(`Pulse width: ${pulseWidth} ns`);
  steps.push(`C5 factor: ${c5Factor.toFixed(4)}`);
  
  // Get appropriate AEL function
  let getAEL: (wl: number, t: number, c5: number, alpha?: number) => AELResult;
  switch (className) {
    case 'Class 1':
      getAEL = IEC_AEL_TABLES.getClass1AEL;
      break;
    case 'Class 2':
      getAEL = IEC_AEL_TABLES.getClass2AEL;
      break;
    case 'Class 3R':
      getAEL = IEC_AEL_TABLES.getClass3RAEL;
      break;
    case 'Class 3B':
      getAEL = IEC_AEL_TABLES.getClass3BAEL;
      break;
  }
  
  // CORRECTED: Use actual pulse width instead of hardcoded 1e-6
  const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
  const singlePulseAELResult = getAEL(wavelength, pulseWidthSeconds, 1.0, angularSubtense);
  steps.push(`\nSingle pulse AEL (using pulse width ${pulseWidth} ns = ${pulseWidthSeconds.toExponential(3)} s): ${singlePulseAELResult.value.toExponential(3)} ${singlePulseAELResult.unit}`);
  
  // Average power AEL (converted to pulse energy)
  const avgPowerAELResult = getAEL(wavelength, exposureTime, 1.0, angularSubtense);
  let avgPowerAsPulseEnergy: number;
  let avgPowerUnit: string;
  
  if (avgPowerAELResult.unit === 'J') {
    // Energy limit over the exposure time T -> average power limit (J / T) -> per-pulse energy
    const avgPowerW = avgPowerAELResult.value / exposureTime;
    avgPowerAsPulseEnergy = avgPowerW / repetitionRate;
    avgPowerUnit = 'J';
    steps.push(`Average power AEL (energy limit ${avgPowerAELResult.value.toExponential(3)} J over ${exposureTime} s = ${avgPowerW.toExponential(3)} W)`);
    steps.push(`\nAverage power AEL (converted to pulse energy): AEL_T / PRF = ${avgPowerW.toExponential(3)} / ${repetitionRate} = ${avgPowerAsPulseEnergy.toExponential(3)} J/pulse`);
  } else if (avgPowerAELResult.unit === 'W') {
    // Convert average power limit to pulse energy limit
    avgPowerAsPulseEnergy = avgPowerAELResult.value / repetitionRate;
    avgPowerUnit = 'J';
    steps.push(`Average power AEL: ${avgPowerAELResult.value.toExponential(3)} W`);
    steps.push(`\nAverage power AEL (converted to pulse energy): AEL_T / PRF = ${avgPowerAELResult.value.toExponential(3)} / ${repetitionRate} = ${avgPowerAsPulseEnergy.toExponential(3)} J/pulse`);
  } else {
    // Already in energy units
    avgPowerAsPulseEnergy = avgPowerAELResult.value;
    avgPowerUnit = avgPowerAELResult.unit;
    steps.push(`\nAverage power AEL (already in energy units): ${avgPowerAsPulseEnergy.toExponential(3)} ${avgPowerUnit}`);
  }
  
  // Pulse train AEL (single pulse × C5)
  const pulseTrainAEL = singlePulseAELResult.value * c5Factor;
  steps.push(`\nPulse train AEL (single pulse × C5): AEL_single × C5 = ${singlePulseAELResult.value.toExponential(3)} × ${c5Factor.toFixed(4)} = ${pulseTrainAEL.toExponential(3)} J`);
  
  // Most restrictive AEL
  const mostRestrictiveAEL = Math.min(singlePulseAELResult.value, avgPowerAsPulseEnergy, pulseTrainAEL);
  steps.push(`\nMost restrictive AEL: min(${singlePulseAELResult.value.toExponential(3)}, ${avgPowerAsPulseEnergy.toExponential(3)}, ${pulseTrainAEL.toExponential(3)}) = ${mostRestrictiveAEL.toExponential(3)} J`);
  
  return {
    singlePulseAEL: singlePulseAELResult.value,
    averagePowerAEL: avgPowerAsPulseEnergy,
    pulseTrainAEL,
    mostRestrictiveAEL,
    breakdown: {
      singlePulse: { value: singlePulseAELResult.value, unit: singlePulseAELResult.unit },
      averagePower: { value: avgPowerAsPulseEnergy, unit: avgPowerUnit },
      pulseTrain: { value: pulseTrainAEL, unit: 'J' }
    },
    calculationSteps: steps
  };
};

// ======================== IEC 60825-1 COMPLIANT AEL IMPLEMENTATION ========================

// Tables 3 / 6 / 7 note d (1250-1400 nm): the AEL is limited to the Class 3B AEL and to the anterior-eye
// limits derived from the skin MPE (1 mm aperture stop)
const limitFor1250to1400 = (retinal: AELResult, wavelength: number, t: number, c5Factor: number): AELResult => {
  if (wavelength < 1250 || wavelength > 1400) return retinal;
  const skin: AELResult =
    t < 1e-9 ? { value: 7.9e5, unit: 'W' } :
    t < 1e-7 ? { value: 7.9e-4, unit: 'J' } :
    t < 0.35 ? { value: 4.3e-2 * Math.pow(t, 0.25), unit: 'J' } :
    { value: 0.1, unit: 'W' };
  const class3B = IEC_AEL_TABLES.getClass3BAEL(wavelength, t, c5Factor);
  // Express every limit in the unit of the retinal AEL (J <-> W via the emission duration)
  const asUnit = (l: AELResult): number =>
    l.unit === retinal.unit ? l.value : (retinal.unit === 'J' ? l.value * t : l.value / t);
  return { value: Math.min(retinal.value, asUnit(class3B), asUnit(skin)), unit: retinal.unit };
};

// IEC 60825-1:2014 Table-based AEL implementation
export const IEC_AEL_TABLES = {
  // Measurement conditions from Table 10 (IEC 60825-1:2014) - REVISED
  getMeasurementConditions: (wavelength: number, exposureTime: number) => {
    let condition1Aperture: number;
    let condition1Distance: number;
    let condition3Aperture: number;
    let condition3Distance: number;

    if (wavelength < 302.5) {
      condition1Aperture = 0;
      condition1Distance = 0;
      condition3Aperture = 1;
      condition3Distance = 0;
    } else if (wavelength >= 302.5 && wavelength < 400) {
      condition1Aperture = 7;
      condition1Distance = 2000;
      condition3Aperture = 1;
      condition3Distance = 100;
    } else if (wavelength >= 400 && wavelength < 1400) {
      condition1Aperture = 50;
      condition1Distance = 2000;
      condition3Aperture = 7;
      condition3Distance = 100;
    } else if (wavelength >= 1400 && wavelength < 4000) {
      condition3Distance = 100;
      if (exposureTime <= 0.35) {
        condition3Aperture = 1;
      } else if (exposureTime < 10) {
        condition3Aperture = 1.5 * Math.pow(exposureTime, 3/8);
      } else {
        condition3Aperture = 3.5;
      }
      condition1Aperture = 7 * condition3Aperture;
      condition1Distance = 2000;
    } else if (wavelength >= 4000 && wavelength < 1e5) {
      condition3Distance = 0;
      if (exposureTime <= 0.35) {
        condition3Aperture = 1;
      } else if (exposureTime < 10) {
        condition3Aperture = 1.5 * Math.pow(exposureTime, 3/8);
      } else {
        condition3Aperture = 3.5;
      }
      condition1Aperture = 0;
      condition1Distance = 0;
    } else if (wavelength >= 1e5 && wavelength <= 1e6) {
      condition3Aperture = 11;
      condition3Distance = 0;
      condition1Aperture = 0;
      condition1Distance = 0;
    } else {
      condition3Aperture = 0;
      condition3Distance = 0;
      condition1Aperture = 0;
      condition1Distance = 0;
    }
    
    return {
      condition1: { aperture: condition1Aperture, distance: condition1Distance },
      condition3: { aperture: condition3Aperture, distance: condition3Distance }
    };
  },

  // Check if beam requires Class M consideration
  requiresClassM: (wavelength: number, beamDiameter: number): boolean => {
    if (wavelength >= 302.5 && wavelength <= 4000) {
      return beamDiameter > 7;
    }
    return false;
  },

  // Check if wavelength supports Class 2/2M (visible only)
  supportsClass2: (wavelength: number): boolean => {
    return wavelength >= 400 && wavelength <= 700;
  },

  // Get correction factors from Table 9 - CORRECTED: Return T2 value
  getCorrectionFactors: (wavelength: number, exposureTime: number, angularSubtense: number = 1.5) => {
    let C1 = 1, C2 = 1, C3 = 1, C4 = 1, C5 = 1, C6 = 1, C7 = 1, T1 = 1, T2 = 1; 
    
    // C1 correction (180-400 nm)
    if (wavelength >= 180 && wavelength <= 400) {
      C1 = 5.6 * Math.pow(10,3) * Math.pow(exposureTime, 0.25);
    }

    if (wavelength >= 180 && wavelength <= 400) {
      T1 = Math.pow(10, -15) * Math.pow(10, 0.8 * (wavelength - 295));
    }
    
    // C2 correction (302.5-315 nm)
    if (wavelength >= 302.5 && wavelength <= 315) {
      C2 = Math.pow(10, 0.2 * (wavelength - 295));
    }else{
        C2 = 30;
    }

    // CORRECTED: T2 calculation for retinal hazard region (400-1400 nm)
    if (wavelength >= 400 && wavelength <= 1400) {
        if (angularSubtense > 1.5 && angularSubtense <= 100){
            T2 = 10 * Math.pow(10, (angularSubtense - 1.5)/98.5);
        }else if (angularSubtense <= 1.5){
            T2 = 10;
        }else{
            T2 = 100;
        }
    }
    
    // C3 correction (450-600 nm)
    if (wavelength >= 450 && wavelength <= 600) {
      C3 = Math.pow(10, 0.02 * (wavelength - 450));
    }
    
    // C4 correction (400-450 nm and 1150-1200 nm)
    if (wavelength >= 700 && wavelength < 1050) {
      C4 = Math.pow(10, 0.002 * (wavelength - 700));
    } else if (wavelength >= 1050 && wavelength <= 1400) {
        C4 = 5; // Table 9: C4 = 5 for 1050-1400 nm
    }
    
    // C6 correction (400-1400 nm, angular subtense dependent)
    let angularSubtense_max = 1;
    if (exposureTime < 625 * Math.pow(10,-6)){
        angularSubtense_max = 5;
    } else if (exposureTime > 0.25){
        angularSubtense_max = 100;
    } else{
        angularSubtense_max = 200 * Math.pow(exposureTime, 0.5)
    }

    if (wavelength >= 400 && wavelength <= 1400) {
      if (angularSubtense >= 1.5 && angularSubtense <= angularSubtense_max) {
        C6 = angularSubtense / 1.5;
      } else if (angularSubtense > angularSubtense_max) {
        C6 = angularSubtense_max / 1.5;
      } else{
        C6 = 1.0;
      }
    }
    
    // C7 correction (IEC 60825-1:2014 Table 9)
    //   700-1150 nm:  C7 = 1
    //   1150-1200 nm: C7 = 10^(0.018(λ-1150))
    //   1200-1400 nm: C7 = 8 + 10^(0.04(λ-1250))
    if (wavelength >= 1150 && wavelength <= 1200) {
      C7 = Math.pow(10, 0.018 * (wavelength - 1150));
    } else if (wavelength > 1200 && wavelength <= 1400) {
      C7 = 8 + Math.pow(10, 0.04 * (wavelength - 1250));
    }
    
    return { C1, C2, C3, C4, C5, C6, C7, T1, T2, angularSubtense_max };
  },

  // Table 3: Class 1 AEL values (general) - Enhanced with C5 application and units
  getClass1AEL: (wavelength: number, exposureTime: number, c5Factor: number = 1, angularSubtense: number = 1.5): AELResult => {
    const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
    const t = exposureTime;

    let baseAEL = 0;
    let unit = 'W';
    let photochemicalLimit: [number, string] = [0, 'J'];
    let thermalLimit: [number, string] = [0, 'J'];
    
    // Check if this is point source (C6 = 1) or extended source (C6 > 1)
    if (corrections.C6 === 1) {
      // Table 3: Point source case
      if (wavelength >= 180 && wavelength < 302.5) {
        if (t < 1e-9) {
          baseAEL = 3e10; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 3e4) {
          baseAEL = 30; // J/m²
          unit = 'J/m²';
        }
        return { value: baseAEL, unit }; // No C5 correction for UV skin hazard
      } else if (wavelength >= 302.5 && wavelength < 315) {
        if (t < 1e-9) {
          baseAEL = 2.4e4; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 10 && t <= corrections.T1) {
          baseAEL = 7.9e-7 * corrections.C1; // J
          unit = 'J';
        } else if (t >= 1e-9 && t < 10 && t > corrections.T1) {
          baseAEL = 7.9e-7 * corrections.C2; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 7.9e-7 * corrections.C2; // J
          unit = 'J';
        }
      } else if (wavelength >= 315 && wavelength < 400) {
        if (t < 1e-9) {
          baseAEL = 2.4e4; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 10) {
          baseAEL = 7.9e-7 * corrections.C1; // J
          unit = 'J';
        } else if (t >= 10 && t < 1000) {
          baseAEL = 7.9e-3; // J
          unit = 'J';
        } else if (t >= 1000 && t < 3e4) {
          baseAEL = 7.9e-6; // W
          unit = 'W';
        }
      } else if (wavelength >= 400 && wavelength < 450) {
        if (t < 1e-11) {
          baseAEL = 3.8e-8; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 7.7e-8; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 7e-4 * Math.pow(t, 0.75); // J
          unit = 'J';
        } else if (t >= 10 && t < 100) {
          baseAEL = 3.9e-3; // J
          unit = 'J';
        } else if (t >= 100 && t < 3e4) {
          baseAEL = 3.9e-5 * corrections.C3; // W
          unit = 'W';
        }
      } else if (wavelength >= 450 && wavelength < 500) {
        if (t < 1e-11) {
          baseAEL = 3.8e-8; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 7.7e-8; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 7e-4 * Math.pow(t, 0.75); // J
          unit = 'J';
        } else if (t >= 10 && t < 100) {
          // Dual limits (Table A.3 note c): exposure must not exceed either 3.9e-3·C3 J or 3.9e-4 W
          baseAEL = Math.min(3.9e-3 * corrections.C3, 3.9e-4 * t); // J
          unit = 'J';
        } else if (t >= 100 && t < 3e4) {
          baseAEL = 3.9e-5 * corrections.C3; // W (= 3.9e-3·C3 J over 100 s)
          unit = 'W';
        }
      } else if (wavelength >= 500 && wavelength < 700) {
        if (t < 1e-11) {
          baseAEL = 3.8e-8; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 7.7e-8; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 7e-4 * Math.pow(t, 0.75) * corrections.C6; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 3.9e-4; // W
          unit = 'W';
        }
      } else if (wavelength >= 700 && wavelength < 1050) {
        if (t < 1e-11) {
          baseAEL = 3.8e-8; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 7.7e-8 * corrections.C4; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 7e-4 * Math.pow(t, 0.75) * corrections.C4; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 3.9e-4 * corrections.C4 * corrections.C7; // W
          unit = 'W';
        }
      } else if (wavelength >= 1050 && wavelength < 1400) {
        if (t < 1e-11) {
          baseAEL = 3.8e-8 * corrections.C7; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 1.3e-5) {
          baseAEL = 7.7e-7 * corrections.C7; // J
          unit = 'J';
        } else if (t >= 1.3e-5 && t < 10) {
          baseAEL = 3.5e-3 * Math.pow(t, 0.75) * corrections.C7; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 3.9e-4 * corrections.C4 * corrections.C7; // W
          unit = 'W';
        }
      } else if (wavelength >= 1400 && wavelength < 1500) {
        if (t >= 1e-13 && t < 1e-9) {
          baseAEL = 8e5; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 1e-3) {
          baseAEL = 8e-4; // J
          unit = 'J';
        } else if (t >= 1e-3 && t < 0.35) {
          baseAEL = 4.4e-3 * Math.pow(t, 0.25); // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 1e-2 * t; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 1e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 1500 && wavelength < 1800) {
        if (t >= 1e-13 && t < 1e-9) {
          baseAEL = 8e6; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 0.35) {
          baseAEL = 8e-3; // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 1.8e-2 * Math.pow(t, 0.75); // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 1.0e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 1800 && wavelength < 2600) {
        if (t >= 1e-13 && t < 1e-9) {
          baseAEL = 8e5; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 1e-3) {
          baseAEL = 8e-4; // J
          unit = 'J';
        } else if (t >= 1e-3 && t < 0.35) {
          baseAEL = 4.4e-3 * Math.pow(t, 0.25); // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 0.01 * t; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 1.0e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 2600 && wavelength < 4000) {
        if (t >= 1e-13 && t < 1e-9) {
          baseAEL = 8e4; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 1e-7) {
          baseAEL = 8e-5; // J
          unit = 'J';
        } else if (t >= 1e-7 && t < 0.35) {
          baseAEL = 4.4e-3 * Math.pow(t, 0.25); // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 0.01 * t; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 1.0e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 4000 && wavelength <= 1e6) {
        if (t < 1e-9) {
          baseAEL = 1e11; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 1e-7) {
          baseAEL = 100; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-7 && t < 10) {
          baseAEL = 5600 * Math.pow(t, 0.25); // J/m²
          unit = 'J/m²';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 1000; // W/m²
          unit = 'W/m²';
        }
        return { value: baseAEL, unit }; // No C5 correction for skin hazard
      }
    } else {
      // Table 4: Extended source case (C6 > 1) - only applies to wavelength range 400-1400 nm
      if (wavelength < 400 || wavelength > 1400) {
        return { value: 0, unit: 'N/A' }; // Outside applicable range
      }

      if (wavelength >= 400 && wavelength < 700) {
        // 400 nm to 700 nm range
        if (t < 1e-11) {
          baseAEL = 3.8e-8 * corrections.C6; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) { // Fixed: was 5e-8, should be 5e-6
          baseAEL = 7.7e-8 * corrections.C6; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 7e-4 * Math.pow(t, 0.75) * corrections.C6; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          // Thermal limit as power: (7e-4·t^0.75·C6 J)/t up to T2, constant 7e-4·T2^-0.25·C6 W beyond T2
          const thermalW = t <= corrections.T2
            ? 7e-4 * Math.pow(t, 0.75) * corrections.C6 / t
            : 7e-4 * Math.pow(corrections.T2, -0.25) * corrections.C6;
          if (wavelength <= 600) {
            // Retinal photochemical limit (400-600 nm, αlim = 11 mrad): 3.9e-3·C3 J (t < 100 s), 3.9e-5·C3 W (t ≥ 100 s)
            const photochemicalW = t < 100 ? 3.9e-3 * corrections.C3 / t : 3.9e-5 * corrections.C3;
            baseAEL = Math.min(photochemicalW, thermalW);
          } else {
            baseAEL = thermalW;
          }
          unit = 'W';
        }
      } else if (wavelength >= 700 && wavelength < 1050) {
        // 700 nm to 1050 nm range
        if (t < 1e-11) {
          baseAEL = 3.8e-8 * corrections.C4; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) { // Fixed: was 5e-8, should be 5e-6
          baseAEL = 7.7e-8 * corrections.C4 * corrections.C6; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 7e-4 * Math.pow(t, 0.75) * corrections.C4 * corrections.C6; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          // Retinal thermal hazard
          if (t <= corrections.T2) {
            baseAEL = 7e-4 * Math.pow(t, 0.75) * corrections.C4 * corrections.C6 / t; // W (t ≤ T2)
            unit = 'W';
          } else {
            baseAEL = 7e-4 * Math.pow(corrections.T2, -0.25) * corrections.C4 * corrections.C6; // W (t > T2)
            unit = 'W';
          }
        }
      } else if (wavelength >= 1050 && wavelength <= 1400) {
        // 1050 nm to 1400 nm range
        if (t < 1e-11) {
          baseAEL = 3.8e-8 * corrections.C6 * corrections.C7; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 1.3e-5) {
          baseAEL = 7.7e-7 * corrections.C6 * corrections.C7; // J
          unit = 'J';
        } else if (t >= 1.3e-5 && t < 10) {
          baseAEL = 3.5e-3 * Math.pow(t, 0.75) * corrections.C6 * corrections.C7; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          // Retinal thermal hazard
          if (t <= corrections.T2) {
            baseAEL = 3.5e-3 * Math.pow(t, 0.75) * corrections.C6 * corrections.C7 / t; // W (t ≤ T2)
            unit = 'W';
          } else {
            baseAEL = 3.5e-3 * Math.pow(corrections.T2, -0.25) * corrections.C6 * corrections.C7; // W (t > T2)
            unit = 'W';
          }
        }
      }
    }

    // Apply C5 correction for pulse trains (Table 9: C5 applies to 400-1400 nm only, C5 = 1 elsewhere)
    const retinal: AELResult = (wavelength >= 400 && wavelength <= 1400)
      ? { value: baseAEL * c5Factor, unit }
      : { value: baseAEL, unit };

    // Table 3 note d (1250-1400 nm)
    return limitFor1250to1400(retinal, wavelength, t, c5Factor);
  },

  // Table 5: Class 2 AEL values (visible only) - Enhanced with C5 application and units
  getClass2AEL: (wavelength: number, exposureTime: number, c5Factor: number = 1, angularSubtense: number = 1.5): AELResult => {
    if (wavelength >= 400 && wavelength <= 700) {
      if (exposureTime < 0.25) {
        // Table 5: same as Class 1 AEL for t < 0.25 s
        return IEC_AEL_TABLES.getClass1AEL(wavelength, exposureTime, c5Factor, angularSubtense);
      }
      const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
      return { value: 1e-3 * corrections.C6, unit: 'W' }; // C6 × 1e-3 W for t >= 0.25 s
    }
    return { value: 0, unit: 'W' };
  },

  // Table 6: Class 3R AEL values - Enhanced with C5 application and units
  getClass3RAEL: (wavelength: number, exposureTime: number, c5Factor: number = 1, angularSubtense: number = 1.5): AELResult => {
    const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
    const t = exposureTime;
    let baseAEL = 0;
    let unit = 'W';

    if (corrections.C6 === 1){
      if (wavelength >= 180 && wavelength < 302.5) {
        if (t < 1e-9) {
          baseAEL = 1.5e11; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 3e4) {
          baseAEL = 150; // J/m²
          unit = 'J/m²';
        }
        return { value: baseAEL, unit }; // No C5 correction for skin hazard
      } else if (wavelength >= 302.5 && wavelength < 315) {
        if (t < 1e-9) {
          baseAEL = 1.2e5; // W
          unit = 'W';
        } else if (t >= 1e-9 && t <= corrections.T1 && t< 10) {
          baseAEL = 4e-6 * corrections.C1; // J
          unit = 'J';
        } else if (t >= 1e-9 && t > corrections.T1 && t < 10) {
          baseAEL = 4.0e-6 * corrections.C2; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 4.0e-6 * corrections.C2; // J
          unit = 'J';
        }
      } else if (wavelength >= 315 && wavelength < 400) {
        if (t < 1e-9) {
          baseAEL = 1.2e5; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 10) {
          baseAEL = 4.0e-6 * corrections.C1; // J
          unit = 'J';
        } else if (t >= 10 && t < 1000) {
          baseAEL = 4.0e-2; // J
          unit = 'J';
        } else if (t >= 1000 && t < 3e4) {
          baseAEL = 4.0e-5; // W
          unit = 'W';
        }
      } else if (wavelength >= 400 && wavelength < 700) {
        if (t < 1e-11) {
          baseAEL = 1.9e-7; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 3.8e-7; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 0.25) {
          baseAEL = 3.5e-3 * Math.pow(t, 0.75); // J
          unit = 'J';
        } else if (t >= 0.25 && t < 3e4) {
          baseAEL = 5.0e-3; // W
          unit = 'W';
        }
      } else if (wavelength >= 700 && wavelength < 1050) {
        if (t < 1e-11) {
          baseAEL = 1.9e-7; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 3.8e-7 * corrections.C4; // J
          unit = 'J';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 3.5e-3 * Math.pow(t, 0.75) * corrections.C4; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 2.0e-3 * corrections.C4 * corrections.C7; // W
          unit = 'W';
        }
      } else if (wavelength >= 1050 && wavelength < 1400) {
        if (t < 1e-11) {
          baseAEL = 1.9e-6 * corrections.C7; // J
          unit = 'J';
        } else if (t >= 1e-11 && t < 1.3e-5) {
          baseAEL = 3.8e-6 * corrections.C7; // J
          unit = 'J';
        } else if (t >= 1.3e-5 && t < 10) {
          baseAEL = 1.8e-2 * Math.pow(t, 0.75) * corrections.C7; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 2.0e-3 * corrections.C4 * corrections.C7; // W
          unit = 'W';
        }
      } else if (wavelength >= 1400 && wavelength < 1500) {
        if (t < 1e-9) {
          baseAEL = 4e6; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 1e-3) {
          baseAEL = 4e-3; // J
          unit = 'J';
        } else if (t >= 1e-3 && t < 0.35) {
          baseAEL = 2.2e-2 * Math.pow(t, 0.25); // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 5e-2 * t; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 5e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 1500 && wavelength < 1800) {
        if (t < 1e-9) {
          baseAEL = 4e7; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 0.35) {
          baseAEL = 4e-2; // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 9e-2 * Math.pow(t, 0.75); // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 5.0e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 1800 && wavelength < 2600) {
        if (t < 1e-9) {
          baseAEL = 4e6; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 1e-3) {
          baseAEL = 4e-3; // J
          unit = 'J';
        } else if (t >= 1e-3 && t < 0.35) {
          baseAEL = 2.2e-2 * Math.pow(t, 0.25); // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 5e-2 * t; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 5.0e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 2600 && wavelength < 4000) {
        if (t < 1e-9) {
          baseAEL = 4e5; // W
          unit = 'W';
        } else if (t >= 1e-9 && t < 1e-7) {
          baseAEL = 4e-4; // J
          unit = 'J';
        } else if (t >= 1e-7 && t < 0.35) {
          baseAEL = 2.2e-2 * Math.pow(t, 0.25); // J
          unit = 'J';
        } else if (t >= 0.35 && t < 10) {
          baseAEL = 5e-2 * t; // J
          unit = 'J';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 5e-2; // W
          unit = 'W';
        }
      } else if (wavelength >= 4000 && wavelength <= 1e6) {
        if (t < 1e-9) {
          baseAEL = 5e11; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 1e-7) {
          baseAEL = 500; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-7 && t < 10) {
          baseAEL = 2.8e4 * Math.pow(t, 0.25); // J/m²
          unit = 'J/m²';
        } else if (t >= 10 && t < 3e4) {
          baseAEL = 5000; // W/m²
          unit = 'W/m²';
        }
        return { value: baseAEL, unit }; // No C5 correction for skin hazard
      }
    } else{
        // Table 7 only applies to wavelength range 400-1400 nm (retinal hazard region)
        if (wavelength < 400 || wavelength > 1400) {
          return { value: 0, unit: 'N/A' }; // Outside applicable range
        }

        if (wavelength >= 400 && wavelength < 700) {
          // 400 nm to 700 nm range
          if (t < 1e-11) {
            baseAEL = 1.9e-7 * corrections.C6; // J
            unit = 'J';
          } else if (t >= 1e-11 && t < 5e-6) {
            baseAEL = 3.8e-7 * corrections.C6; // J
            unit = 'J';
          } else if (t >= 5e-6 && t < 0.25) {
            baseAEL = 3.5e-3 * Math.pow(t, 0.75) * corrections.C6; // J
            unit = 'J';
          } else if (t >= 0.25 && t < 3e4) {
            baseAEL = 5.0e-3 * corrections.C6; // W
            unit = 'W';
          }
        } else if (wavelength >= 700 && wavelength < 1050) {
          // 700 nm to 1050 nm range
          if (t < 1e-11) {
            baseAEL = 1.9e-7 * corrections.C6; // J
            unit = 'J';
          } else if (t >= 1e-11 && t < 5e-6) {
            baseAEL = 3.8e-7 * corrections.C4 * corrections.C6; // J
            unit = 'J';
          } else if (t >= 5e-6 && t < 10) {
            baseAEL = 3.5e-3 * Math.pow(t, 0.75) * corrections.C4 * corrections.C6; // J
            unit = 'J';
          } else if (t >= 10 && t < 3e4) {
            // Check T₂ condition
            if (t <= corrections.T2) {
              baseAEL = 3.5e-3 * Math.pow(t, 0.75) * corrections.C4 * corrections.C6 / t; // W (t ≤ T₂)
              unit = 'W';
            } else {
              baseAEL = 3.5e-3 * corrections.C4 * corrections.C6 * Math.pow(corrections.T2, -0.25); // W (t > T₂)
              unit = 'W';
            }
          } 
        } else if (wavelength >= 1050 && wavelength <= 1400) {
          // 1050 nm to 1400 nm range
          if (t < 1e-11) {
            baseAEL = 1.9e-6 * corrections.C6 * corrections.C7; // J
            unit = 'J';
          } else if (t >= 1e-11 && t < 1.3e-5) {
            baseAEL = 3.8e-6 * corrections.C6 * corrections.C7; // J
            unit = 'J';
          } else if (t >= 1.3e-5 && t < 10) {
            baseAEL = 1.8e-2 * Math.pow(t, 0.75) * corrections.C6 * corrections.C7; // J
            unit = 'J';
          } else if (t >= 10 && t < 3e4) {
            // Check T₂ condition
            if (t <= corrections.T2) {
              baseAEL = 1.75e-2 * Math.pow(t, 0.75) * corrections.C6 * corrections.C7 / t; // W (t ≤ T₂)
              unit = 'W';
            } else {
              baseAEL = 1.75e-2 * corrections.C6 * corrections.C7 * Math.pow(corrections.T2, -0.25); // W (t > T₂)
              unit = 'W';
            }
          } 
        }
    }
    // Apply C5 correction (Table 9: C5 applies to 400-1400 nm only, C5 = 1 elsewhere)
    const retinal: AELResult = (wavelength >= 400 && wavelength <= 1400)
      ? { value: baseAEL * c5Factor, unit }
      : { value: baseAEL, unit };
    // Tables 6 / 7 note d (1250-1400 nm)
    return limitFor1250to1400(retinal, wavelength, t, c5Factor);
  },

  // Table 8: Class 3B AEL values - Enhanced with C5 application and units
  getClass3BAEL: (wavelength: number, exposureTime: number, c5Factor: number = 1, angularSubtense: number = 1.5): AELResult => {
    const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
    const t = exposureTime;
    let baseAEL = 0;
    let unit = 'W';

    if (wavelength >= 180 && wavelength < 302.5) {
      if (t < 1e-9) {
        baseAEL = 3.8e5; // W
        unit = 'W';
      } else if (t >= 1e-9 && t <= 0.25) {
        baseAEL = 3.8e-4; // J
        unit = 'J';
      } else if (t > 0.25 && t < 3e4) {
        baseAEL = 1.5e-3; // W
        unit = 'W';
      }
      return { value: baseAEL, unit }; // No C5 correction for skin hazard
    } else if (wavelength >= 302.5 && wavelength < 315) {
      if (t < 1e-9) {
        baseAEL = 1.25e4 * corrections.C2; // W
        unit = 'W';
      } else if (t >= 1e-9 && t <= 0.25) {
        baseAEL = 1.25e-5 * corrections.C2; // J
        unit = 'J';
      } else if (t > 0.25 && t < 3e4) {
        baseAEL = 5e-5 * corrections.C2; // W
        unit = 'W';
      }
    } else if (wavelength >= 315 && wavelength < 400) {
      if (t < 1e-9) {
        baseAEL = 1.25e8; // W
        unit = 'W';
      } else if (t >= 1e-9 && t <= 0.25) {
        baseAEL = 0.125; // J
        unit = 'J';
      } else if (t > 0.25 && t < 3e4) {
        baseAEL = 0.5; // W
        unit = 'W';
      }
    } else if (wavelength >= 400 && wavelength <= 700) {
      if (t < 1e-9) {
        baseAEL = 3e7; // W
        unit = 'W';
      } else if (t >= 1e-9 && t <= 0.25) {
        if (t < 0.06) {
          baseAEL = 0.03; // J
          unit = 'J';
        } else {
          baseAEL = 0.5; // W (converted to energy: 0.5 * t for comparison)
          unit = 'W';
        }
      } else if (t > 0.25 && t < 3e4) {
        baseAEL = 0.5; // W
        unit = 'W';
      }
    } else if (wavelength > 700 && wavelength <= 1050) {
      if (t < 1e-9) {
        baseAEL = 3e7 * corrections.C4; // W
        unit = 'W';
      } else if (t >= 1e-9 && t <= 0.25) {
        const timeLimit = 0.06 * corrections.C4;
        if (t < timeLimit) {
          baseAEL = 0.03 * corrections.C4; // J
          unit = 'J';
        } else {
          baseAEL = 0.5; // W (converted to energy: 0.5 * t for comparison)
          unit = 'W';
        }
      } else if (t > 0.25 && t < 3e4) {
        baseAEL = 0.5; // W
        unit = 'W';
      }
    } else if (wavelength > 1050 && wavelength <= 1400) {
      if (t < 1e-9) {
        baseAEL = 1.5e8; // W
        unit = 'W';
      } else if (t >= 1e-9 && t <= 0.25) {
        baseAEL = 0.15; // J
        unit = 'J';
      } else if (t > 0.25 && t < 3e4) {
        baseAEL = 0.5; // W
        unit = 'W';
      }
    } else if (wavelength > 1400 && wavelength < 1e6) {
      if (t < 1e-9) {
        baseAEL = 1.25e8; // W
        unit = 'W';
      } else if (t >= 1e-9 && t < 0.25) {
        baseAEL = 0.125; // J
        unit = 'J';
      } else if (t >= 0.25 && t < 3e4) {
        baseAEL = 0.5; // W
        unit = 'W';
      }
    }
    // Apply C5 correction (Table 9: C5 applies to 400-1400 nm only, C5 = 1 elsewhere)
    if (wavelength >= 400 && wavelength <= 1400) {
      return { value: baseAEL * c5Factor, unit };
    }
    return { value: baseAEL, unit };
  },

  // Maximum permissible exposure (MPE)
  getMPEIrriance: (wavelength: number, exposureTime: number, c5Factor: number = 1, angularSubtense: number = 1.5): MPEResult => {
    const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, angularSubtense);
    const t = exposureTime;

    let baseAEL = 0;
    let unit = 'W';
    
    // Determine if this is point source (C6 = 1) or extended source (C6 > 1)
    const isExtendedSource = corrections.C6 > 1;
    
    if (!isExtendedSource) {
      // =================== TABLE A.1: POINT SOURCE (CR = 1) ===================
      
      if (wavelength >= 180 && wavelength < 302.5) {
        // UV-C region - skin hazard
        if (t < 1e-9) {
          baseAEL = 3e10; // W/m²
          unit = 'W/m²';
        } else {
          baseAEL = 30; // J/m²
          unit = 'J/m²';
        }
        return { value: baseAEL, unit }; 
        
      } else if (wavelength >= 302.5 && wavelength < 315) {
        // UV-B region with thermal/photochemical transition
        if (t < 1e-9) {
          baseAEL = 3e10; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 10) {
          // Thermal hazard (t < T₁) vs Photochemical hazard (t > T₁)
          if (t <= corrections.T1) {
            baseAEL = corrections.C1; // J/m² - thermal hazard
            unit = 'J/m²';
          } else {
            baseAEL = corrections.C2; // J/m² - photochemical hazard
            unit = 'J/m²';
          }
        } else if (t >= 10) {
          baseAEL = corrections.C2; // J/m²
          unit = 'J/m²';
        }
        
      } else if (wavelength >= 315 && wavelength < 400) {
        // UV-A region
        if (t < 1e-9) {
          baseAEL = 3e10; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 10) {
          baseAEL = corrections.C1; // J/m²
          unit = 'J/m²';
        } else {
          baseAEL = 1e4; // J/m²
          unit = 'J/m²';
        } 
      } else if (wavelength >= 400 && wavelength < 450) {
        // Blue light region
        if (t < 1e-11) {
          baseAEL = 1e-3; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 2e-3; // J/m²
          unit = 'J/m²';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 18 * Math.pow(t, 0.75); // J/m²
          unit = 'J/m²';
        } else if (t >= 10 && t < 100) {
          baseAEL = 100; // J/m²
          unit = 'J/m²';
        } else if (t >= 100) {
          baseAEL = corrections.C3; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 450 && wavelength < 500) {
        // Blue-green region with dual limits
        if (t < 1e-11) {
          baseAEL = 1e-3; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 2e-3; // J/m²
          unit = 'J/m²';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 18 * Math.pow(t, 0.75); // J/m²
          unit = 'J/m²';
        } else if (t >= 10 && t < 100) {
          // Dual limits apply - minimum of photochemical and thermal
          const photochemicalLimit = 100 * corrections.C3; // J/m²
          const thermalLimit = 10; // W/m² converted to J/m²
          baseAEL = Math.min(photochemicalLimit, thermalLimit * t);
          unit = 'J/m²';
        } else if (t >= 100) {
          baseAEL = corrections.C3; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 500 && wavelength < 700) {
        // Visible region
        if (t < 1e-11) {
          baseAEL = 1e-3; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 2e-3; // J/m²
          unit = 'J/m²';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 18 * Math.pow(t, 0.75); // J/m²
          unit = 'J/m²';
        } else if (t >= 10) {
          baseAEL = 10; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 700 && wavelength < 1050) {
        // Near-infrared region (Table A.1: 1×10^-3 J/m² below 10^-11 s, no C4)
        if (t < 1e-11) {
          baseAEL = 1e-3; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-11 && t < 5e-6) {
          baseAEL = 2e-3 * corrections.C4; // J/m²
          unit = 'J/m²';
        } else if (t >= 5e-6 && t < 10) {
          baseAEL = 18 * Math.pow(t, 0.75) * corrections.C4; // J/m²
          unit = 'J/m²';
        } else if (t >= 10) {
          baseAEL = 10 * corrections.C4 * corrections.C7; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 1050 && wavelength <= 1400) {
        // Near-infrared region (1050-1400 nm)
        if (t < 1e-11) {
          baseAEL = 1e-3 * corrections.C7; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-11 && t < 13e-6) {
          baseAEL = 2e-2 * corrections.C7; // J/m²
          unit = 'J/m²';
        } else if (t >= 13e-6 && t < 10) {
          baseAEL = 90 * Math.pow(t, 0.75) * corrections.C7; // J/m²
          unit = 'J/m²';
        } else if (t >= 10) {
          baseAEL = 10 * corrections.C4 * corrections.C7; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 1400 && wavelength < 1500) {
        // Mid-infrared region (Table A.1: 10^12 W/m² below 10^-9 s)
        if (t < 1e-9) {
          baseAEL = 1e12; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 1e-3) {
          baseAEL = 1e3; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-3 && t < 10) {
          baseAEL = 5600 * Math.pow(t, 0.25); // J/m²
          unit = 'J/m²';
        } else if (t >= 10) {
          baseAEL = 1000; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 1500 && wavelength < 1800) {
        // Mid-infrared region (Table A.1: 10^13 W/m² below 10^-9 s)
        if (t < 1e-9) {
          baseAEL = 1e13; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 10) {
          baseAEL = 1e4; // J/m²
          unit = 'J/m²';
        } else if (t >= 10) {
          baseAEL = 1000; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 1800 && wavelength < 2600) {
        // Mid-infrared region
        if (t < 1e-9) {
          baseAEL = 1e12; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 1e-3) {
          baseAEL = 1e3; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-3 && t < 10) {
          baseAEL = 5600 * Math.pow(t, 0.25); // J/m²
          unit = 'J/m²';
        } else if (t >= 10) {
          baseAEL = 1000; // W/m²
          unit = 'W/m²';
        }
        
      } else if (wavelength >= 2600 && wavelength <= 1e6) {
        // Far-infrared region
        if (t < 1e-9) {
          baseAEL = 1e11; // W/m²
          unit = 'W/m²';
        } else if (t >= 1e-9 && t < 1e-7) {
          baseAEL = 100; // J/m²
          unit = 'J/m²';
        } else if (t >= 1e-7 && t < 10) {
          baseAEL = 5600 * Math.pow(t, 0.25); // J/m²
          unit = 'J/m²';
        } else if (t >= 10) {
          baseAEL = 1000; // W/m²
          unit = 'W/m²';
        }
        return { value: baseAEL, unit };
      }
      
    } else {
      // =================== TABLE A.2: EXTENDED SOURCE (RETINAL HAZARD REGION, 400-1400 nm) ===================
      const extended = retinalExtendedMPE('A2', wavelength, exposureTime, angularSubtense);
      return { value: extended.value * c5Factor, unit: extended.unit };
    }
    return { value: baseAEL * c5Factor, unit };
  },
  // Maximum permissible exposure (MPE) calculation for extended sources
  // Table A.4: MPE of Table A.2 expressed as power or energy through a 7 mm aperture (400-1400 nm)
  getMPEPowerEnergy: (wavelength: number, exposureTime: number, c5Factor: number = 1, angularSubtense: number = 1.5): MPEResult => {
    const result = retinalExtendedMPE('A4', wavelength, exposureTime, angularSubtense);
    // Apply C5 correction for pulse trains
    return { value: result.value * c5Factor, unit: result.unit };
  },
  
  // Table A.5: Maximum permissible exposure (MPE) of the skin to laser radiation
  getMPESkin: (wavelength: number, exposureTime: number): AELResult => {
    const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime);
    const t = exposureTime;

    let mpeValue = 0;
    let unit = 'W/m²';

    if (wavelength >= 180 && wavelength < 302.5) {
      // =================== 180-302.5 nm (UV-C) ===================
      // Constant value regardless of exposure time
      if (t < 1e-9) {
        mpeValue = 3e10; // W/m²
        unit = 'W/m²';
      } else {
        mpeValue = 30; // J/m²
        unit = 'J/m²';
      }
      
    } else if (wavelength >= 302.5 && wavelength < 315) {
      // =================== 302.5-315 nm (UV-B) ===================
      if (t < 1e-9) {
        mpeValue = 3e10; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t < 10) {
        // Thermal hazard (t < T₁) vs Photochemical hazard (t > T₁)
        if (t <= corrections.T1) {
          mpeValue = corrections.C1; // J/m² - thermal hazard
          unit = 'J/m²';
        } else {
          mpeValue = corrections.C2; // J/m² - photochemical hazard  
          unit = 'J/m²';
        }
      } else if (t >= 10) {
        mpeValue = corrections.C2; // J/m²
        unit = 'J/m²';
      }
      
    } else if (wavelength >= 315 && wavelength < 400) {
      // =================== 315-400 nm (UV-A) ===================
      if (t < 1e-9) {
        mpeValue = 3e10; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t < 10) {
        mpeValue = corrections.C1; // J/m²
        unit = 'J/m²';
      } else if (t >= 10 && t < 1e3) {
        mpeValue = 1e4; // J/m²
        unit = 'J/m²';
      } else if (t >= 1e3 && t <= 3e4) {
        mpeValue = 10; // W/m²
        unit = 'W/m²';
      }
      
    } else if (wavelength >= 400 && wavelength < 700) {
      // =================== 400-700 nm (Visible) ===================
      if (t < 1e-9) {
        mpeValue = 2e11; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t < 1e-7) {
        mpeValue = 200; // J/m²
        unit = 'J/m²';
      } else if (t >= 1e-7 && t < 10) {
        mpeValue = 1.1e4 * Math.pow(t, 0.25); // J/m²
        unit = 'J/m²';
      } else if (t >= 10) {
        mpeValue = 2000; // W/m²
        unit = 'W/m²';
      }
      
    } else if (wavelength >= 700 && wavelength < 1400) {
      // =================== 700-1400 nm (Near-IR) ===================
      if (t < 1e-9) {
        mpeValue = 2e11 * corrections.C4; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t < 1e-7) {
        mpeValue = 200 * corrections.C4; // J/m²
        unit = 'J/m²';
      } else if (t >= 1e-7 && t < 10) {
        mpeValue = 1.1e4 * Math.pow(t, 0.25) * corrections.C4; // J/m²
        unit = 'J/m²';
      } else if (t >= 10) {
        mpeValue = 2000 * corrections.C4; // W/m²
        unit = 'W/m²';
      }
      
    } else if (wavelength >= 1400 && wavelength < 1500) {
      // =================== 1400-1500 nm (IR-B) ===================
      if (t < 1e-9) {
        mpeValue = 1e12; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t < 1e-3) {
        mpeValue = 1e3; // J/m²
        unit = 'J/m²';
      } else if (t >= 1e-3 && t < 10) {
        mpeValue = 5600 * Math.pow(t, 0.25); // J/m²
        unit = 'J/m²';
      } else if (t >= 10) {
        mpeValue = 1000; // W/m²
        unit = 'W/m²';
      }
      
    } else if (wavelength >= 1500 && wavelength < 1800) {
      // =================== 1500-1800 nm (IR-B) ===================
      if (t < 1e-9) {
        mpeValue = 1e13; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t <10) {
        mpeValue = 1e4; // J/m²
        unit = 'J/m²';
      } else if (t >= 10) {
        mpeValue = 1000; // W/m²
        unit = 'W/m²';
      }
      
    } else if (wavelength >= 1800 && wavelength < 2600) {
      // =================== 1800-2600 nm (IR-B/IR-C) ===================
      if (t < 1e-9) {
        mpeValue = 1e12; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t < 1e-3) {
        mpeValue = 1e3; // J/m²
        unit = 'J/m²';
      } else if (t >= 1e-3 && t < 10) {
        mpeValue = 5600 * Math.pow(t, 0.25); // J/m²
        unit = 'J/m²';
      } else if (t >= 10) {
        mpeValue = 1000; // W/m²
        unit = 'W/m²';
      }
      
    } else if (wavelength >= 2600 && wavelength <= 1e6) {
      // =================== 2600 nm - 1 mm (Far-IR) ===================
      if (t < 1e-9) {
        mpeValue = 1e11; // W/m²
        unit = 'W/m²';
      } else if (t >= 1e-9 && t < 1e-7) {
        mpeValue = 100; // J/m²
        unit = 'J/m²';
      } else if (t >= 1e-7 && t < 10) {
        mpeValue = 5600 * Math.pow(t, 0.25); // J/m²
        unit = 'J/m²';
      } else if (t >= 10) {
        mpeValue = 1000; // W/m²
        unit = 'W/m²';
      }
      
    } else {
      // Outside defined wavelength range
      mpeValue = 0;
      unit = 'N/A';
    }

    return { value: mpeValue, unit };
  },
};

// ======================== IRRADIANCE CALCULATION UTILITIES ========================

// Calculate irradiance based on power/energy and aperture area
export const calculateIrradiance = (
  powerOrEnergy: number, // in W or J
  apertureDiameterMm: number, // aperture diameter in mm
  isEnergy: boolean = false // true for energy (J), false for power (W)
): {
  irradiance: number;
  unit: string;
  apertureArea: number;
} => {
  if (apertureDiameterMm <= 0) {
    return { irradiance: 0, unit: isEnergy ? 'J/m²' : 'W/m²', apertureArea: 0 };
  }

  // Calculate aperture area in m²
  const apertureRadiusM = (apertureDiameterMm * MPE_CONSTANTS.MM_TO_M) / 2;
  const apertureAreaM2 = Math.PI * apertureRadiusM * apertureRadiusM;
  
  // Calculate irradiance
  const irradiance = powerOrEnergy / apertureAreaM2;
  const unit = isEnergy ? 'J/m²' : 'W/m²';
  
  return {
    irradiance,
    unit,
    apertureArea: apertureAreaM2
  };
};

// ======================== OTHER UTILITY FUNCTIONS ========================

// Get wavelength region name
export const getWavelengthRegion = (wavelength: number): string => {
  if (wavelength >= 180 && wavelength < 400) return 'UV';
  if (wavelength >= 400 && wavelength < 700) return 'Visible';
  if (wavelength >= 700 && wavelength < 1400) return 'Near-IR';
  if (wavelength >= 1400 && wavelength < 10600) return 'IR-B/C';
  return 'Far-IR';
};

// Validate pulse parameters for physical consistency
export const validatePulseParameters = (
  pulseWidthNs: number, 
  repetitionRateHz: number
): { isValid: boolean; errorMessage?: string; warningMessage?: string } => {
  if (repetitionRateHz <= 0) {
     return {
      isValid: false,
      errorMessage: `Repetition rate (${repetitionRateHz} Hz) must be positive.`
    };
  }
  const periodBetweenPulsesNs = (1 / repetitionRateHz) * 1e9;
  const dutyCycle = (pulseWidthNs / periodBetweenPulsesNs) * 100;
  
  if (pulseWidthNs <= 0) {
    return {
      isValid: false,
      errorMessage: `Pulse width (${pulseWidthNs} ns) must be positive.`
    };
  }

  if (pulseWidthNs > periodBetweenPulsesNs) {
    return {
      isValid: false,
      errorMessage: `Pulse width (${pulseWidthNs.toFixed(3)} ns) cannot be larger than the period between pulses (${periodBetweenPulsesNs.toFixed(1)} ns at ${repetitionRateHz} Hz).`
    };
  }
  
  if (dutyCycle > 50 && dutyCycle <= 100) {
    return {
      isValid: true,
      warningMessage: `High duty cycle (${dutyCycle.toFixed(1)}%). Thermal effects may dominate; consider CW analysis.`
    };
  }
  
  return { isValid: true };
};

// Correction factors for different wavelengths (IEC 60825-1:2014)
// Retinal MPE for 400-1400 nm, IEC 60825-1:2014 Table A.2 (irradiance / radiant exposure, 'A2')
// and Table A.4 (power / energy through a 7 mm aperture, 'A4'). C6 = 1 gives the point-source values.
function retinalExtendedMPE(
  table: 'A2' | 'A4',
  wavelength: number,
  t: number,
  angularSubtense: number
): MPEResult {
  if (wavelength < 400 || wavelength > 1400) return { value: 0, unit: 'N/A' };

  const energyUnit = table === 'A2' ? 'J/m²' : 'J';
  const powerUnit = table === 'A2' ? 'W/m²' : 'W';
  // Coefficients as printed in the two tables
  const k = table === 'A2'
    ? { first: 1e-3, second: 2e-3, thermal: 18, ph10: 100, ph: 1, nir2: 2e-2, nirThermal: 90 }
    : { first: 3.8e-8, second: 7.7e-8, thermal: 7e-4, ph10: 3.9e-3, ph: 3.9e-5, nir2: 7.7e-7, nirThermal: 3.5e-3 };

  const c = IEC_AEL_TABLES.getCorrectionFactors(wavelength, t, angularSubtense);
  const visible = wavelength < 700;
  const nir1 = wavelength >= 700 && wavelength < 1050;

  // Coefficient of the thermal limit (t^0.75 law), including C4 / C7 as applicable
  const thermalCoeff = (visible ? k.thermal : nir1 ? k.thermal * c.C4 : k.nirThermal * c.C7) * c.C6;

  // ---- exposure times below 10 s ----
  if (t < 10) {
    let energy: number;
    if (t < 1e-11) {
      energy = k.first * c.C6 * (wavelength >= 1050 ? c.C7 : 1);
    } else if (wavelength < 1050) {
      if (t < 5e-6) energy = k.second * c.C6 * (visible ? 1 : c.C4);
      else energy = thermalCoeff * Math.pow(t, 0.75);
    } else {
      if (t < 13e-6) energy = k.nir2 * c.C6 * c.C7;
      else energy = thermalCoeff * Math.pow(t, 0.75);
    }
    // Table A.2 note b: for 400-484 nm and apparent source sizes of 1.5-82 mrad the
    // photochemical limit (100 C3 J/m²) already applies from 1 s
    if (t >= 1 && wavelength >= 400 && wavelength <= 484 && angularSubtense > 1.5 && angularSubtense <= 82) {
      energy = Math.min(energy, k.ph10 * c.C3);
    }
    return { value: energy, unit: energyUnit };
  }

  // ---- exposure times of 10 s and longer ----
  // Retinal thermal limit: energy k·t^0.75 up to T2, constant power k·T2^-0.25 beyond
  const thermalIsEnergy = t <= c.T2;
  const thermalValue = thermalIsEnergy ? thermalCoeff * Math.pow(t, 0.75) : thermalCoeff * Math.pow(c.T2, -0.25);
  const thermalEnergyEquivalent = thermalIsEnergy ? thermalValue : thermalValue * t;

  if (wavelength <= 600) {
    // Photochemical limit (dual limits apply): 100 C3 J/m² for t < 100 s, C3 W/m² beyond
    const phIsEnergy = t < 100;
    const phValue = phIsEnergy ? k.ph10 * c.C3 : k.ph * c.C3;
    const phEnergyEquivalent = phIsEnergy ? phValue : phValue * t;
    if (phEnergyEquivalent <= thermalEnergyEquivalent) {
      return { value: phValue, unit: phIsEnergy ? energyUnit : powerUnit };
    }
  }
  return { value: thermalValue, unit: thermalIsEnergy ? energyUnit : powerUnit };
}

export const getCorrectionFactors = (wavelength: number) => {
  let CA = 1;
  let CB = 1;
  let CC = 1;

  if (wavelength >= 700 && wavelength <= 1050) {
    CA = Math.pow(10, 0.002 * (wavelength - 700));
  } else if (wavelength > 1050 && wavelength <= 1400) {
    CA = 5.0;
  }

  if (wavelength >= 700 && wavelength <= 1150) {
    CB = Math.pow(10, 0.015 * (wavelength - 700));
  }

  if (wavelength >= 1500 && wavelength <= 1800) {
    CC = Math.pow(10, 0.018 * (wavelength - 1500));
  } else if (wavelength > 1800 && wavelength <= 2600) {
    CC = 5.0;
  }
  
  return { CA, CB, CC };
};
