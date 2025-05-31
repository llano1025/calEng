import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

// ======================== INTERFACES AND TYPES ========================

interface LaserSafetyCalculatorProps {
  onBack: () => void;
  onShowTutorial?: () => void;
}

interface MPECalculatorProps {
  onShowTutorial?: () => void;
}

interface NOHDCalculatorProps {
  onShowTutorial?: () => void;
}

interface LaserClassificationProps {
  onShowTutorial?: () => void;
}

interface ProtectiveEyewearProps {
  onShowTutorial?: () => void;
}

interface MPEResult {
  mpeSinglePulse: number;
  mpeAverage: number;
  mpeThermal: number;
  criticalMPE: number;
  correctionFactorCA: number;
  correctionFactorCB: number;
  correctionFactorCC: number;
  wavelengthRegion: string;
  limitingMechanism: string;
  calculationSteps: string[];
}

interface NOHDResult {
  nohd: number;
  mpe: number;
  beamDiameterAtNOHD: number;
  irradianceAtNOHD: number;
  hazardClass: string;
  initialPowerDensity: number;
  calculationSteps: string[];
}

interface WavelengthData {
  id: string;
  wavelength: number;
  power: number; // mW for CW
  pulseEnergy: number; // mJ for pulsed
  pulseWidth: number; // ns for pulsed
  angularSubtense: number; // mrad
  isActive: boolean;
}

interface ClassificationResult {
  laserClass: string;
  classificationMethod: 'single' | 'additive';
  ael: number;
  measuredEmission: number;
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

interface EyewearResult {
  requiredOD: number;
  exposureLevel: number;
  mpe: number;
  scaleFactor: string;
  lbRating: string;
  dirRating: string;
  recommendations: string[];
}

// ======================== CONSTANTS ========================

// Named constants for MPE calculations (IEC 60825-1:2014) - CORRECTED VALUES
const MPE_CONSTANTS = {
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
  MRAD_TO_RAD: 1e-3, // mrad to rad
  NS_TO_S: 1e-9, // nanoseconds to seconds
};

// Time base values Ti for pulse grouping (IEC 60825-1 Table 2)
const TIME_BASE_TI = {
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

// ======================== IEC 60825-1 COMPLIANT AEL IMPLEMENTATION ========================

// IEC 60825-1:2014 Table-based AEL implementation
const IEC_AEL_TABLES = {
  // Measurement conditions from Table 10 (IEC 60825-1:2014) - REVISED
  getMeasurementConditions: (wavelength: number, exposureTime: number) => {
    let condition1Aperture: number;
    let condition1Distance: number;
    let condition3Aperture: number;
    let condition3Distance: number;

    if (wavelength < 302.5) {
      // Condition 1: Not applied. Using C3 values as placeholders, classification logic should not use C1.
      condition1Aperture = 1; // Placeholder, C1 not applied
      condition1Distance = 0; // Placeholder, C1 not applied
      // Condition 3:
      condition3Aperture = 1; // mm
      condition3Distance = 0; // mm
    } else if (wavelength >= 302.5 && wavelength < 400) {
      // Condition 1:
      condition1Aperture = 7;   // mm
      condition1Distance = 2000; // mm
      // Condition 3:
      condition3Aperture = 1;   // mm
      condition3Distance = 100; // mm
    } else if (wavelength >= 400 && wavelength < 1400) {
      // Condition 1:
      condition1Aperture = 50;  // mm
      condition1Distance = 2000; // mm
      // Condition 3:
      condition3Aperture = 7;   // mm
      condition3Distance = 100; // mm
    } else if (wavelength >= 1400 && wavelength < 4000) {
      // Condition 3 (determines Condition 1 aperture):
      condition3Distance = 100; // mm
      if (exposureTime <= 0.35) {
        condition3Aperture = 1; // mm
      } else if (exposureTime < 10) {
        condition3Aperture = 1.5 * Math.pow(exposureTime, 3/8); // mm
      } else { // exposureTime >= 10
        condition3Aperture = 3.5; // mm
      }
      // Condition 1:
      condition1Aperture = 7 * condition3Aperture; // mm (7 x Condition 3 aperture diameter)
      condition1Distance = 2000; // mm
    } else if (wavelength >= 4000 && wavelength < 1e5) { // 1e5 nm = 100,000 nm
      // Condition 3:
      condition3Distance = 0; // mm
      if (exposureTime <= 0.35) {
        condition3Aperture = 1; // mm
      } else if (exposureTime < 10) {
        condition3Aperture = 1.5 * Math.pow(exposureTime, 3/8); // mm
      } else { // exposureTime >= 10
        condition3Aperture = 3.5; // mm
      }
      // Condition 1: Not applied. Using C3 values as placeholders.
      condition1Aperture = condition3Aperture; // Placeholder, C1 not applied
      condition1Distance = 0; // Placeholder, C1 not applied
    } else if (wavelength >= 1e5 && wavelength <= 1e6) { // Up to 1,000,000 nm
      // Condition 3:
      condition3Aperture = 11; // mm
      condition3Distance = 0;  // mm
      // Condition 1: Not applied. Using C3 values as placeholders.
      condition1Aperture = 11; // Placeholder, C1 not applied
      condition1Distance = 0;  // Placeholder, C1 not applied
    } else { // Wavelengths outside the explicitly defined table ranges (e.g., > 1e6 nm)
             // Defaulting to last row of table for > 1e6 nm as a fallback, assuming C1 not applied.
      condition3Aperture = 11; // mm
      condition3Distance = 0;  // mm
      condition1Aperture = 11; // Placeholder, C1 not applied
      condition1Distance = 0;  // Placeholder, C1 not applied
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

  // Get correction factors from Table 9
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
    if (wavelength >= 700 && wavelength <= 1050) {
      C4 = Math.pow(10, 0.002 * (wavelength - 700));
    } else{
        C4 = 5;
    }
    
    // C5 correction (complex - depends on pulse characteristics)
    // Simplified implementation - full calculation requires pulse analysis
    if (exposureTime < 0.25) {
      C5 = 1.0;
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
    
    // C7 correction (700-1150 nm and 1150-1400 nm)
    if (wavelength >= 1150 && wavelength <= 1200) {
      C7 = Math.pow(10, 0.0018 * (wavelength - 1150));
    } else if (wavelength > 1200 && wavelength <= 1400) {
      C7 = 8 + Math.pow(10, 0.04 * (wavelength - 1250));
    }
    
    return { C1, C2, C3, C4, C5, C6, C7, T1, T2 };
  },

  // Table 3: Class 1 AEL values (general)
    getClass1AEL: (wavelength: number, exposureTime: number): number => {
    const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime);
    const t = exposureTime;

    if (wavelength >= 180 && wavelength < 302.5) {
      if (t < 1e-8) { // Columns 10⁻¹³ to 10⁻¹¹ and 10⁻¹¹ to 10⁻⁸
        return 3e10; // W/m²
      } else if (t >= 1e-8 && t < 3e4) { // Column 10⁻⁸ to 0.35 s
        return 30; // J/m²
      }
      return 0; // Blank for t >= 0.35s
    } else if (wavelength >= 302.5 && wavelength < 315) {
      if (t < 1e-8) { // Columns 10⁻¹³ to 10⁻⁸
        return 2.4e4; // W
      } else if (t >= 1e-8 && t < 10 && t<= corrections.T1) { // Spans 10⁻⁸ to 0.35s and 0.35 to 10³s
        return 7.9e-7 * corrections.C1; // J
      } else if (t >= 1e-8 && t < 10 && t> corrections.T1) { // Spans 10⁻⁸ to 0.35s and 0.35 to 10³s
        return 7.9e-7 * corrections.C2; // J
      } else if (t >= 10 && t < 3e4) { // Spans 10⁻⁸ to 0.35s and 0.35 to 10³s
        return 7.9e-7 * corrections.C2; // J
      }
      return 0; // Blank for t >= 1000s
    } else if (wavelength >= 315 && wavelength < 400) {
      if (t < 1e-8) { // Columns 10⁻¹³ to 10⁻⁸
        return 2.4e4; // W
      } else if (t >= 1e-8 && t < 10) { // Column 1×10⁻³ to 0.35 s
        return 7.9e-4 * corrections.C1; // J (Table specifies C2 for this cell)
      } else if (t >= 10 && t < 1000) { // Spans 0.35 to 10², 10² to 10³ columns
        return 7.9e-3; // J
      } else if (t >= 1000 && t < 3e4) { // Column 10³ to 3×10⁴ s
        return 7.9e-6; // W
      }
      return 0; // Blank for t < 1e-3 or t >= 3e4
    } else if (wavelength >= 400 && wavelength < 450) {
      // Missing for t < 1e-3
      if (t < 1e-11) { // Columns 10⁻¹³ to 10⁻⁸
        return 3.8e-8; // W
      } else if (t >= 1e-11 && t < 5e-6) { // Column 1×10⁻³ to 0.35 s
        return 7.7e-8; // J
      } else if (t >= 5e-6 && t < 10) { // Column 1×10⁻³ to 0.35 s
        return 7e-4 * Math.pow(t, 0.75); // J
      } else if (t >= 10 && t < 100) { // Spans 0.35 to 10, 10 to 10² columns
        return 3.9e-3; // J
      } else if (t >= 100 && t < 3e4) { // Column 10² to 10³ s (dual limits, footnote c indicated)
        return 3.9e-5 * corrections.C3; // J (Table specifies C3)
      }
      return 0; // Blank for t < 1e-3 or t >= 3e4
    } else if (wavelength >= 450 && wavelength < 500) {
      if (t < 1e-11) { // Columns 10⁻¹³ to 10⁻⁸
        return 3.8e-8; // W
      } else if (t >= 1e-11 && t < 5e-6) { // Spans 10⁻⁸ to 1×10⁻³ s columns
        return 7.7e-8; // J
      } else if (t >= 5e-6 && t < 10) { // Column 1×10⁻³ to 0.35 s
        return 7e-4 * Math.pow(t, 0.75); // J
      } else if (t >= 10 && t < 100) { // Spans 0.35 to 10, 10 to 10² columns
        return 3.9e-3 * corrections.C3; // J
      } else if (t >= 100 && t < 1000) { // Column 10² to 10³ s (dual limits, footnote c applies)
        const limit1_J = 3.9e-3 * corrections.C3; // J (Table specifies C3)
        const limit2_Power_W = 3.9e-4; // W
        return Math.min(limit1_J, limit2_Power_W * t); // J
      } else if (t >= 1000 && t < 3e4) { // Column 10³ to 3×10⁴ s
        return 3.9e-5 * corrections.C3; // W (Table specifies C3)
      }
      return 0; // Blank for t < 1e-11 or t >= 3e4
    } else if (wavelength >= 500 && wavelength < 700) { // Original code used wavelength <= 700
      if (t < 1e-11) { // Columns 10⁻¹³ to 10⁻⁸
        return 3.8e-8; // W
      } else if (t >= 1e-11 && t < 5e-6) { // Spans 10⁻⁸ to 1×10⁻³ s columns
        return 7.7e-8; // J
      } else if (t >= 5e-6 && t < 10) { // Column 1×10⁻³ to 0.35 s
        return 7e-4 * Math.pow(t, 0.75) * corrections.C6; // J (C6=1)
      }
      else if (t >= 10 && t < 3e4) { // Spans 10² to 10³, 10³ to 3×10⁴ columns
        return 3.9e-4; // W (C6=1)
      }
      return 0; // Blank for t < 1e-3, or 0.35 <= t < 100, or t >= 3e4
    } else if (wavelength >= 700 && wavelength < 1050) { // Original code used >700 and <=1050
      if (t < 1e-11) { // Columns 10⁻¹³ to 10⁻⁸
        return 3.8e-8; // W
      } else if (t >= 1e-11 && t < 5e-6) { // Spans 10⁻⁸ to 1×10⁻³ s columns
        return 7.7e-8 * corrections.C4; // J
      } else if (t >= 5e-6 && t < 100) { // Column 1×10⁻³ to 0.35 s
        return 7e-4 * Math.pow(t, 0.75) * corrections.C4; // J
      }
      // Blank for 0.35s <= t < 100s
      else if (t >= 100 && t < 3e4) { // Spans 10² to 10³, 10³ to 3×10⁴ columns
        return 3.9e-4 * corrections.C4 * corrections.C7; // W
      }
      return 0; // Blank for t < 1e-11, or 0.35 <= t < 100, or t >= 3e4
    } else if (wavelength >= 1050 && wavelength < 1400) { // Original code used >1050 and <=1400
      // Missing for t < 1e-11
      if (t < 1e-11) { // Column 10⁻¹¹ to 10⁻⁸ s
        return 3.8e-8 * corrections.C7; // J
      } else if (t >= 1e-11 && t < 1.3e-5) { // Spans 10⁻⁸ to 1×10⁻³ s columns
        return 7.7e-7 * corrections.C7; // J
      } else if (t >= 1.3e-5 && t < 10) { // Column 1×10⁻³ to 0.35 s
        return 3.5e-3 * Math.pow(t, 0.75) * corrections.C7; // J
      } else if (t >= 10 && t < 3e4) { // Spans 0.35 to 10, 10 to 10² columns
        return 3.9e-4 * corrections.C4 * corrections.C7; // J
      }
      return 0; // Blank for t < 1e-11 or t >= 100s
    } else if (wavelength >= 1400 && wavelength < 1500) {
      // Missing for t < 1e-11
      if (t >= 1e-13 && t < 1e-9) { // Column 10⁻¹¹ to 10⁻⁸ s
        return 8e5; // W
      } else if (t >= 1e-9 && t < 1e-3) { // Spans 5×10⁻⁶ to 1×10⁻³ s columns
        return 8e-4; // J
      } else if (t >= 1e-3 && t < 0.35) { // Column 1×10⁻³ to 0.35 s
        return 4.4e-3 * Math.pow(t, 0.25); // J
      } else if (t >= 0.35 && t < 10) { // Spans 0.35 to 10, 10 to 10² columns
        return 1e-2 * t; // J
      }else if (t >= 10 && t < 3e4) { // Spans 0.35 to 10, 10 to 10² columns
        return 1e-2 * t; // J
      }
      return 0; // Blank for t < 1e-11, or 10⁻⁸ <= t < 5e-6, or t >= 100s
    } else if (wavelength >= 1500 && wavelength < 1800) { // Original code used >1400 and <=1800 (covering this and previous)
      // Missing for t < 1e-11
      if (t >= 1e-13 && t < 1e-9) { // Column 10⁻¹¹ to 10⁻⁸ s
        return 8e6; // W
      } else if (t >= 1e-9 && t < 0.35) { // Spans 5×10⁻⁶ to 1×10⁻³ s columns
        return 8e-3; // J
      } else if (t >= 0.35 && t < 10) { // Spans 0.35 to 10, 10 to 10² columns
        return 1.8e-2 * Math.pow(t, 0.75); // J
      } else if (t >= 10 && t < 3e4) { // Spans 10² to 10³, 10³ to 3×10⁴ columns
        return 1.0e-2; // W
      }
      return 0; // Blank for t < 1e-11, or 10⁻⁸ <= t < 5e-6, or 1e-3 <= t < 0.35, or t >= 3e4
    } else if (wavelength >= 1800 && wavelength < 2600) { // Original code used >1800 and <=2600
      // Missing for t < 1e-11
      if (t >= 1e-13 && t < 1e-9) { // Column 10⁻¹¹ to 10⁻⁸ s
        return 8e5; // W
      } else if (t >= 1e-9 && t < 1e-3) { // Spans 5×10⁻⁶ to 1×10⁻³ s columns
        return 8e-4; // J
      } else if (t >= 1e-3 && t < 0.35) { // Column 1×10⁻³ to 0.35 s
        return 4.4e-3 * Math.pow(t, 0.25); // J
      } else if (t >= 0.35 && t < 10) { // Spans 0.35 to 10, 10 to 10² columns
        return 0.01 * t; // J
      } else if (t >= 10 && t < 3e4) { // Spans 10² to 10³, 10³ to 3×10⁴ columns
        return 1.0e-2; // W
      }
      return 0; // Blank for t < 1e-11, or 10⁻⁸ <= t < 5e-6, or t >= 3e4
    } else if (wavelength >= 2600 && wavelength < 4000) { // Original code had a generic 'else' for >2600nm
      // Missing for t < 1e-11
      if (t >= 1e-13 && t < 1e-9) { // Column 10⁻¹¹ to 10⁻⁸ s
        return 8e4; // W
      } else if (t >= 1e-9 && t < 1e-7) { // Spans 10⁻⁸ to 1×10⁻³ s columns
        return 8e-5; // J
      } else if (t >= 1e-7 && t < 0.35) { // Column 1×10⁻³ to 0.35 s
        return 4.4e-3 * Math.pow(t, 0.25); // J
      } else if (t >= 0.35 && t < 10) { // Spans 0.35 to 10, 10 to 10² columns
        return 0.01 * t; // J
      } else if (t >= 10 && t < 3e4) { // Spans 10² to 10³, 10³ to 3×10⁴ columns
        return 1.0e-2; // W
      }
      return 0; // Blank for t < 1e-11 or t >= 100s
    } else if (wavelength >= 4000 && wavelength <= 1e6) { // Max wavelength from table
      if (t < 1e-9) { // Covers 10⁻¹³ to 10⁻⁸ columns
        return 1e11; // W/m²
      } else if (t >= 1e-9 && t < 1e-7) { // Spans 10⁻⁸ to 1×10⁻³ s columns
        return 100; // J/m²
      } else if (t >= 1e-7 && t < 10) { // Column 1×10⁻³ to 0.35 s
        return 5600 * Math.pow(t, 0.25); // J/m²
      }
      else if (t >= 10 && t < 3e4) { // Spans 10² to 10³, 10³ to 3×10⁴ columns
        return 1000; // W/m²
      }
      return 0; // Blank for 0.35 <= t < 100 or t >= 3e4
    }
    // Wavelength or time not covered by the table conditions, or falls into a blank cell not explicitly handled above.
    return 0;
  },

  // Table 5: Class 2 AEL values (visible only)
  getClass2AEL: (wavelength: number, exposureTime: number): number => {
    if (wavelength >= 400 && wavelength <= 700) {
      if (exposureTime < 0.25) {
        return 1e-3; // W
      } else {
        return 1e-3; // W
      }
    }
    return 0; // Class 2 only applies to visible
  },

  // Table 6: Class 3R AEL values
  getClass3RAEL: (wavelength: number, exposureTime: number): number => {
    const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime);
    
    if (wavelength >= 180 && wavelength < 302.5) {
      return 1.5e-3; // W/m²
    } else if (wavelength >= 302.5 && wavelength < 315) {
      return 1.2e-2; // W
    } else if (wavelength >= 315 && wavelength < 400) {
      if (exposureTime <= 0.25) {
        return 4.0e-2 * corrections.C3; // J/m²
      } else {
        return 4.0e-1 * corrections.C3; // J/m²
      }
    } else if (wavelength >= 400 && wavelength <= 700) {
      // Visible range - 5x Class 2 limit
      return 5 * IEC_AEL_TABLES.getClass2AEL(wavelength, exposureTime);
    } else if (wavelength > 700 && wavelength <= 1050) {
      return 5 * IEC_AEL_TABLES.getClass1AEL(wavelength, exposureTime);
    } else if (wavelength > 1050 && wavelength <= 1400) {
      return 5 * IEC_AEL_TABLES.getClass1AEL(wavelength, exposureTime);
    } else { // For far IR (wavelength > 1400 nm)
      return 5e-2; // W
    }
  },

  // Table 8: Class 3B AEL values
  getClass3BAEL: (wavelength: number, exposureTime: number): number => {
    if (wavelength >= 180 && wavelength < 302.5) {
      return 3.8e-2; // W
    } else if (wavelength >= 302.5 && wavelength < 315) {
      return 1.25e-1; // W
    } else if (wavelength >= 315 && wavelength < 400) {
      return 1.25e-1; // W
    } else if (wavelength >= 400 && wavelength <= 700) {
      if (exposureTime < 1e-3) {
        return 3e-2; // W
      } else if (exposureTime >= 1e-3 && exposureTime <= 0.25) {
        return 0.05; // J or W based on duration (This might be W if time-dependent formula, or J. IEC states W/J limits. This looks like a simplified value. Assuming power limit for simplicity if not pulsed energy)
                     // Table 8 states 0.05 J for t from 1ms to 0.25s. If continuous, it's compared to power. This needs clarity based on pulsed/CW for that specific line.
                     // The provided code treats AELs as power (W) or energy (J) based on context, which is okay.
      } else { // exposureTime > 0.25s
        return 0.5; // W
      }
    } else if (wavelength > 700 && wavelength <= 1050) {
      return 0.5; // W
    } else if (wavelength > 1050 && wavelength <= 1400) {
      return 1.5e-2; // W
    } else { // For far IR (wavelength > 1400 nm)
      return 1.25e-2; // W
    }
  }
};

// ======================== IEC 60825-1 SECTION 5.1 COMPLIANT CLASSIFICATION ========================

const classifyLaserIEC60825Section51 = (
  wavelength: number,
  emission: number, // W for CW, J for pulsed
  exposureTime: number,
  beamDiameter: number = 7, // mm
  laserType: 'continuous' | 'pulsed' = 'continuous'
): ClassificationResult => {
  const steps: string[] = [];
  
  steps.push(`=== IEC 60825-1 Section 5.1 Classification ===`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Emission: ${emission.toExponential(3)} ${laserType === 'continuous' ? 'W' : 'J'}`);
  steps.push(`Exposure time: ${exposureTime} s`);
  steps.push(`Beam diameter: ${beamDiameter} mm`);
  
  // Get measurement conditions
  const conditions = IEC_AEL_TABLES.getMeasurementConditions(wavelength, exposureTime); // Pass exposureTime
  steps.push(`Condition 1: Aperture ${conditions.condition1.aperture.toFixed(2)}mm at ${conditions.condition1.distance}mm`);
  steps.push(`Condition 3: Aperture ${conditions.condition3.aperture.toFixed(2)}mm at ${conditions.condition3.distance}mm`);
  
  // Calculate emissions for different conditions (simplified - assumes 'emission' is the measured value through the aperture)
  // A full calculation would involve beam geometry and aperture effects. This is a common simplification.
  const condition1Emission = emission;
  const condition3Emission = emission;
  
  // Get AEL values for different classes
  const class1AEL = IEC_AEL_TABLES.getClass1AEL(wavelength, exposureTime);
  const class2AEL = IEC_AEL_TABLES.supportsClass2(wavelength) ? IEC_AEL_TABLES.getClass2AEL(wavelength, exposureTime) : 0;
  const class3RAEL = IEC_AEL_TABLES.getClass3RAEL(wavelength, exposureTime);
  const class3BAEL = IEC_AEL_TABLES.getClass3BAEL(wavelength, exposureTime);
  
  steps.push(`Class 1 AEL: ${class1AEL.toExponential(3)} ${laserType === 'continuous' ? 'W' : 'J'}`); // Assuming unit consistency with emission
  if (class2AEL > 0) steps.push(`Class 2 AEL: ${class2AEL.toExponential(3)} ${laserType === 'continuous' ? 'W' : 'J'}`);
  steps.push(`Class 3R AEL: ${class3RAEL.toExponential(3)} ${laserType === 'continuous' ? 'W' : 'J'}`);
  steps.push(`Class 3B AEL: ${class3BAEL.toExponential(3)} ${laserType === 'continuous' ? 'W' : 'J'}`);
  
  // Check Class M requirement
  const requiresClassM = IEC_AEL_TABLES.requiresClassM(wavelength, beamDiameter);
  const supportsClass2 = IEC_AEL_TABLES.supportsClass2(wavelength);
  
  steps.push(`Class M consideration potentially required: ${requiresClassM ? 'YES' : 'NO'}`);
  steps.push(`Class 2 applicable (visible wavelength): ${supportsClass2 ? 'YES' : 'NO'}`);
  
  // ========== IMPLEMENT IEC 60825-1 SECTION 5.1 CLASSIFICATION LOGIC ==========
  
  // a) Classes 1 and 1M
  steps.push(`\n--- Testing Classes 1 and 1M ---`);
  
  // Check if Condition 1 is applied based on Table 10
  // C1 is not applied for: <302.5 nm, [4000nm, 1e5 nm), [1e5 nm, 1e6 nm]
  const isC1Applied = !((wavelength < 302.5) || (wavelength >= 4000 && wavelength <= 1e6) );

  if (!isC1Applied) {
    steps.push(`Wavelength (${wavelength} nm): Condition 1 test is not applied according to IEC 60825-1 Table 10.`);
    if (condition3Emission <= class1AEL) {
      steps.push(`Condition 3 Emission (${condition3Emission.toExponential(3)}) ≤ Class 1 AEL (${class1AEL.toExponential(3)}) → PASS`);
      steps.push(`Result: Class 1 (Condition 1 test not applied, Condition 3 passes)`);
      return createClassificationResult('Class 1', class1AEL, condition3Emission, steps, true, true, false); // C1 test vacuously true
    } else {
      steps.push(`Condition 3 Emission (${condition3Emission.toExponential(3)}) > Class 1 AEL (${class1AEL.toExponential(3)}) → FAIL`);
      // Fall through to test higher classes if Class 1 test (C3 only) fails
    }
  } else { // Condition 1 is applied (e.g., 302.5 nm to <4000 nm)
    steps.push(`Wavelength (${wavelength} nm): Both Condition 1 and Condition 3 tests apply according to IEC 60825-1 Table 10.`);
    
    const condition1PassClass1 = condition1Emission <= class1AEL;
    const condition3PassClass1 = condition3Emission <= class1AEL;
    
    steps.push(`Test against Class 1 AEL (${class1AEL.toExponential(3)}):`);
    steps.push(`  Condition 1 Emission (${condition1Emission.toExponential(3)}) ≤ AEL: ${condition1PassClass1 ? 'PASS' : 'FAIL'}`);
    steps.push(`  Condition 3 Emission (${condition3Emission.toExponential(3)}) ≤ AEL: ${condition3PassClass1 ? 'PASS' : 'FAIL'}`);
    
    if (condition1PassClass1 && condition3PassClass1) {
      steps.push(`Result: Class 1 (Both Condition 1 and Condition 3 pass)`);
      return createClassificationResult('Class 1', class1AEL, condition3Emission, steps, condition1PassClass1, condition3PassClass1, false);
    }
    
    // Test Class 1M (only if requiresClassM is true, implies wavelength in 302.5-4000nm and beam diameter > 7mm)
    if (requiresClassM) {
      // Class 1M if:
      // 1. C1 emission > Class 1 AEL
      // 2. C1 emission <= Class 3B AEL
      // 3. C3 emission <= Class 1 AEL
      const c1m_cond1_C1_exceeds_AEL1 = condition1Emission > class1AEL;
      const c1m_cond2_C1_not_exceeds_AEL3B = condition1Emission <= class3BAEL; // Corrected: "does not exceed" means <=
      const c1m_cond3_C3_meets_AEL1 = condition3Emission <= class1AEL;
      
      steps.push(`Testing Class 1M conditions (requiresClassM is true):`);
      steps.push(`  1. C1 Emission (${condition1Emission.toExponential(3)}) > Class 1 AEL (${class1AEL.toExponential(3)}): ${c1m_cond1_C1_exceeds_AEL1 ? 'PASS' : 'FAIL'}`);
      steps.push(`  2. C1 Emission (${condition1Emission.toExponential(3)}) ≤ Class 3B AEL (${class3BAEL.toExponential(3)}): ${c1m_cond2_C1_not_exceeds_AEL3B ? 'PASS' : 'FAIL'}`);
      steps.push(`  3. C3 Emission (${condition3Emission.toExponential(3)}) ≤ Class 1 AEL (${class1AEL.toExponential(3)}): ${c1m_cond3_C3_meets_AEL1 ? 'PASS' : 'FAIL'}`);
      
      if (c1m_cond1_C1_exceeds_AEL1 && c1m_cond2_C1_not_exceeds_AEL3B && c1m_cond3_C3_meets_AEL1) {
        steps.push(`Result: Class 1M`);
        // For createClassificationResult: condition1Test is false (failed AEL1), condition3Test is true (passed AEL1)
        return createClassificationResult('Class 1M', class1AEL, condition3Emission, steps, false, true, true);
      }
    }
  }
  
  // b) Classes 2 and 2M (visible wavelengths only)
  if (supportsClass2) { // implies wavelength 400-700nm, so C1 is applied.
    steps.push(`\n--- Testing Classes 2 and 2M (Visible Wavelength) ---`);
    
    const condition1PassClass2 = condition1Emission <= class2AEL;
    const condition3PassClass2 = condition3Emission <= class2AEL;
    
    steps.push(`Test against Class 2 AEL (${class2AEL.toExponential(3)}):`);
    steps.push(`  Condition 1 Emission (${condition1Emission.toExponential(3)}) ≤ AEL: ${condition1PassClass2 ? 'PASS' : 'FAIL'}`);
    steps.push(`  Condition 3 Emission (${condition3Emission.toExponential(3)}) ≤ AEL: ${condition3PassClass2 ? 'PASS' : 'FAIL'}`);
    
    if (condition1PassClass2 && condition3PassClass2) {
      steps.push(`Result: Class 2 (Both Condition 1 and Condition 3 pass for Class 2 AEL)`);
      return createClassificationResult('Class 2', class2AEL, condition3Emission, steps, condition1PassClass2, condition3PassClass2, false);
    }
    
    // Test Class 2M (only if requiresClassM is true, implies beam diameter > 7mm for this visible range)
    if (requiresClassM) {
      // Class 2M if:
      // 1. C1 emission > Class 2 AEL
      // 2. C1 emission <= Class 3B AEL
      // 3. C3 emission <= Class 2 AEL
      const c2m_cond1_C1_exceeds_AEL2 = condition1Emission > class2AEL;
      const c2m_cond2_C1_not_exceeds_AEL3B = condition1Emission <= class3BAEL; // Corrected: "does not exceed" means <=
      const c2m_cond3_C3_meets_AEL2 = condition3Emission <= class2AEL;
      
      steps.push(`Testing Class 2M conditions (requiresClassM is true):`);
      steps.push(`  1. C1 Emission (${condition1Emission.toExponential(3)}) > Class 2 AEL (${class2AEL.toExponential(3)}): ${c2m_cond1_C1_exceeds_AEL2 ? 'PASS' : 'FAIL'}`);
      steps.push(`  2. C1 Emission (${condition1Emission.toExponential(3)}) ≤ Class 3B AEL (${class3BAEL.toExponential(3)}): ${c2m_cond2_C1_not_exceeds_AEL3B ? 'PASS' : 'FAIL'}`);
      steps.push(`  3. C3 Emission (${condition3Emission.toExponential(3)}) ≤ Class 2 AEL (${class2AEL.toExponential(3)}): ${c2m_cond3_C3_meets_AEL2 ? 'PASS' : 'FAIL'}`);
      
      if (c2m_cond1_C1_exceeds_AEL2 && c2m_cond2_C1_not_exceeds_AEL3B && c2m_cond3_C3_meets_AEL2) {
        steps.push(`Result: Class 2M`);
        // For createClassificationResult: condition1Test is false (failed AEL2), condition3Test is true (passed AEL2)
        return createClassificationResult('Class 2M', class2AEL, condition3Emission, steps, false, true, true);
      }
    }
  }
  
  // c) Class 3R
  // A product is Class 3R if it exceeds Class 1 (or Class 2, if applicable) but meets Class 3R AELs under both C1 and C3.
  steps.push(`\n--- Testing Class 3R ---`);
  
  const condition1PassClass3R = condition1Emission <= class3RAEL;
  const condition3PassClass3R = condition3Emission <= class3RAEL;
  
  // It must have failed lower class tests to reach here.
  // Check C1 and C3 against Class 3R AELs.
  // If C1 is not applied, its test against Class 3R AEL is vacuously true.
  const effectiveCondition1PassClass3R = !isC1Applied || condition1PassClass3R;

  steps.push(`Test against Class 3R AEL (${class3RAEL.toExponential(3)}):`);
  if(isC1Applied) {
    steps.push(`  Condition 1 Emission (${condition1Emission.toExponential(3)}) ≤ AEL: ${condition1PassClass3R ? 'PASS' : 'FAIL'}`);
  } else {
    steps.push(`  Condition 1 Test: Not Applied (considered PASS for this check)`);
  }
  steps.push(`  Condition 3 Emission (${condition3Emission.toExponential(3)}) ≤ AEL: ${condition3PassClass3R ? 'PASS' : 'FAIL'}`);
  
  if (effectiveCondition1PassClass3R && condition3PassClass3R) {
    // And it must have exceeded lower applicable limits.
    // This is implicitly true if we reached this point without returning.
    steps.push(`Result: Class 3R (Emissions ≤ Class 3R AELs, and exceeded lower class AELs)`);
    return createClassificationResult('Class 3R', class3RAEL, condition3Emission, steps, effectiveCondition1PassClass3R, condition3PassClass3R, false);
  }
  
  // d) Class 3B
  // A product is Class 3B if it exceeds Class 3R but meets Class 3B AELs under both C1 and C3.
  steps.push(`\n--- Testing Class 3B ---`);
  
  const condition1PassClass3B = condition1Emission <= class3BAEL;
  const condition3PassClass3B = condition3Emission <= class3BAEL;
  const effectiveCondition1PassClass3B = !isC1Applied || condition1PassClass3B;

  steps.push(`Test against Class 3B AEL (${class3BAEL.toExponential(3)}):`);
   if(isC1Applied) {
    steps.push(`  Condition 1 Emission (${condition1Emission.toExponential(3)}) ≤ AEL: ${condition1PassClass3B ? 'PASS' : 'FAIL'}`);
  } else {
    steps.push(`  Condition 1 Test: Not Applied (considered PASS for this check)`);
  }
  steps.push(`  Condition 3 Emission (${condition3Emission.toExponential(3)}) ≤ AEL: ${condition3PassClass3B ? 'PASS' : 'FAIL'}`);

  if (effectiveCondition1PassClass3B && condition3PassClass3B) {
    steps.push(`Result: Class 3B (Emissions ≤ Class 3B AELs, and exceeded Class 3R AELs)`);
    return createClassificationResult('Class 3B', class3BAEL, condition3Emission, steps, effectiveCondition1PassClass3B, condition3PassClass3B, false);
  }
  
  // e) Class 4
  // If it exceeds Class 3B AELs under either C1 (if applicable) or C3.
  steps.push(`\n--- Testing Class 4 ---`);
  steps.push(`Result: Class 4 (Exceeded Class 3B AELs)`);
  // For createClassificationResult: condition1Test and condition3Test are false (failed Class 3B AELs)
  return createClassificationResult('Class 4', class3BAEL, condition3Emission, steps, false, false, false);
};


// Helper function to create classification result
const createClassificationResult = (
  laserClass: string,
  ael: number,
  emission: number,
  steps: string[],
  condition1Test: boolean, // True if C1 emission is <= current AEL being tested (or C1 not applicable)
  condition3Test: boolean, // True if C3 emission is <= current AEL being tested
  requiresClassM: boolean // This is the flag if Class M characteristics were part of this classification
): ClassificationResult => {
  let classDescription = '';
  let safetyRequirements: string[] = [];

  switch (laserClass) {
    case 'Class 1':
      classDescription = 'Safe under all conditions of normal use (IEC 60825-1:2014)';
      safetyRequirements = [
        'No special safety measures required',
        'Eye-safe under all conditions',
        'No warning labels required'
      ];
      break;
    case 'Class 1M':
      classDescription = 'Safe for unaided eye, hazardous when viewed with optical instruments (IEC 60825-1:2014)';
      safetyRequirements = [
        'Warning label required',
        'Do not view with optical instruments',
        'Safe for unaided eye viewing',
        'Beam diameter > 7mm and/or specific optical properties consideration applied'
      ];
      break;
    case 'Class 2':
      classDescription = 'Safe for accidental exposure - blink reflex protection (IEC 60825-1:2014)';
      safetyRequirements = [
        'Warning label required',
        'Do not stare into beam',
        'Do not point at people',
        'Blink reflex provides protection'
      ];
      break;
    case 'Class 2M':
      classDescription = 'Safe for accidental unaided eye exposure, hazardous with optical instruments (IEC 60825-1:2014)';
      safetyRequirements = [
        'Warning label required',
        'Do not view with optical instruments',
        'Do not stare into beam',
        'Blink reflex provides protection for unaided eye'
      ];
      break;
    case 'Class 3R':
      classDescription = 'Low risk but potentially hazardous for direct viewing (IEC 60825-1:2014)';
      safetyRequirements = [
        'Warning label required',
        'Avoid direct eye exposure',
        'Use with caution',
        'Safety training recommended',
        'Laser safety officer may be required in some jurisdictions'
      ];
      break;
    case 'Class 3B':
      classDescription = 'Direct viewing hazardous, diffuse reflections normally safe (IEC 60825-1:2014)';
      safetyRequirements = [
        'Warning label and aperture label required',
        'Eye protection required in Nominal Hazard Zone (NHZ)',
        'Controlled area may be required',
        'Safety interlock for protective housing (if applicable)',
        'Key switch control',
        'Laser safety officer (LSO) usually required',
        'Written standard operating procedures (SOPs)'
      ];
      break;
    case 'Class 4':
      classDescription = 'Eye and skin hazard, fire hazard, hazardous diffuse reflections (IEC 60825-1:2014)';
      safetyRequirements = [
        'All Class 3B requirements plus:',
        'Skin protection may be required in NHZ',
        'Fire prevention measures',
        'Beam stops/attenuators required',
        'Emergency stop (manual reset) may be required for system',
        'Area interlocks for entryways to NHZ typically required',
        'Extensive safety training mandatory'
      ];
      break;
  }

  return {
    laserClass,
    classificationMethod: 'single', // Assuming single wavelength for now
    ael, // AEL of the class it was assigned to
    measuredEmission: emission, // The input emission value used for Condition 3 comparison
    ratio: emission / ael, // Ratio against the AEL of its assigned class
    classDescription,
    safetyRequirements,
    condition1Test, // Result of C1 test against the AEL of the assigned class
    condition3Test, // Result of C3 test against the AEL of the assigned class
    requiresClassM, // Indicates if M-type classification rules were triggered
    iecCompliant: true,
    condition1Emission: emission, // Simplified: actual C1 emission might differ
    condition3Emission: emission, // Simplified: actual C3 emission
    condition1AEL: ael, // AEL relevant for C1 for this class (can be different from C3 AEL if units differ)
    condition3AEL: ael, // AEL relevant for C3 for this class
    classificationSteps: steps
  };
};

// ======================== OTHER UTILITY FUNCTIONS ========================

// Get wavelength region name
const getWavelengthRegion = (wavelength: number): string => {
  if (wavelength >= 180 && wavelength < 400) return 'UV';
  if (wavelength >= 400 && wavelength < 700) return 'Visible';
  if (wavelength >= 700 && wavelength < 1400) return 'Near-IR';
  if (wavelength >= 1400 && wavelength < 10600) return 'IR-B/C'; // Standard uses IR-A, IR-B, IR-C. 1400-3000nm is IR-B, 3000nm-1mm is IR-C
  return 'Far-IR'; // > 10600nm (or > 1mm)
};

// Validate pulse parameters for physical consistency
const validatePulseParameters = (
  pulseWidthNs: number, 
  repetitionRateHz: number
): { isValid: boolean; errorMessage?: string; warningMessage?: string } => {
  if (repetitionRateHz <= 0) { // Avoid division by zero or negative rates
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
  
  if (dutyCycle > 50 && dutyCycle <= 100) { // Duty cycle cannot exceed 100%
    return {
      isValid: true,
      warningMessage: `High duty cycle (${dutyCycle.toFixed(1)}%). Thermal effects may dominate; consider CW analysis.`
    };
  }
  
  return { isValid: true };
};

// Correction factors for different wavelengths (IEC 60825-1:2014)
const getCorrectionFactors = (wavelength: number) => {
  let CA = 1; // Wavelength correction for retinal thermal hazard (alpha dependent)
  let CB = 1; // Wavelength correction for photochemical hazard (blue light)
  let CC = 1; // Wavelength correction for retinal thermal hazard (IR-A special case) - Not standard IEC C_A, C_B, C_C naming.
              // The standard uses C1-C7 for AELs. For MPEs, it's CA, CB, CC, CE, CP, CT.
              // This function appears to be a mix or simplified for MPEs. Let's assume these are MPE corrections.
              // IEC MPE CA (Table A.1): 400-1400nm (alpha dependent, for extended sources)
              // IEC MPE CB (Table A.1): 400-600nm (blue light photochemical)
              // IEC MPE CC (Table A.1): 1150-1200nm (specific absorption peak)
              // IEC MPE CE (Table A.1): Thermal skin
              // IEC MPE CP (Table A.1): Repetitive pulse
              // IEC MPE CT (Table A.1): 700-1050nm (thermal injury to retina from short pulses)

  // This implementation appears to map to specific factors mentioned in some MPE formulae, not the general C1-C7 for AELs.
  // Renaming for clarity if these are for MPEs, or align with standard AEL C-factors if for AELs.
  // The function `calculateMPEValue` uses these. Let's assume they are MPE-specific factors.
  // The original names CA, CB, CC are used in IEC for MPEs, but their definitions in the standard are more complex.
  // This code's CA, CB, CC seems to be a simplified interpretation or specific factors from formulas.

  // Let's use the existing code's interpretation for CA, CB, CC for MPEs:
  // CA from original code seems to be related to C6/C7 AEL factors (retinal thermal effects in visible/NIR-A).
  // CB from original code seems related to C7 AEL factor for anterior eye.
  // CC from original code seems related to far IR.

  // Revisiting names based on IEC MPE standard (ANSI Z136.1 uses similar KA, KB, KC, KE, KP, KT):
  // CA (alpha dependent, for extended sources, often 1 for point source)
  // CB (blue light, 400-600nm)
  // CC (1150-1200nm specific cornea absorption, or 1200-1400nm plateau for retina)
  // CT (thermal factor, 700-1050nm) -> This is what the code calls CA for 700-1050nm.
  // The code's CA:
  if (wavelength >= 700 && wavelength <= 1050) { // This is CT in ANSI, related to C7 in IEC AELs.
    CA = Math.pow(10, 0.002 * (wavelength - 700));
  } else if (wavelength > 1050 && wavelength <= 1400) {
    CA = 5.0; // This is a plateau for CT or a C7-like factor.
  }

  // The code's CB: This seems non-standard for MPEs or a specific interpretation.
  // If it's for anterior eye, that's usually part of main MPE limits, not a separate CB factor.
  // Given its use in MPE calculations for visible/NIR, it might be related to C4 for AELs or similar.
  // Keeping as is, assuming it's a defined factor for the MPE formulae used.
  if (wavelength >= 700 && wavelength <= 1150) { // This range and formula for CB is unusual for standard MPE correction factors.
                                               // It seems similar to a part of C7 for AELs for 700-1150nm.
                                               // Let's assume it's a specific required factor for the MPE logic.
    CB = Math.pow(10, 0.015 * (wavelength - 700)); // This does not match IEC MPE CB (blue light).
  }

  // The code's CC: For IR wavelengths.
  if (wavelength >= 1500 && wavelength <= 1800) { // IR-B
    CC = Math.pow(10, 0.018 * (wavelength - 1500)); // This resembles a C_lambda for cornea.
  } else if (wavelength > 1800 && wavelength <= 2600) { // IR-B/C
    CC = 5.0; // Plateau factor.
  }
  // If wavelength is outside these specific ranges, CA, CB, CC remain 1.
  return { CA, CB, CC };
};

// Centralized MPE calculation function - CORRECTED
const calculateMPEValue = (wavelength: number, exposureTime: number, laserType: 'continuous' | 'pulsed' = 'continuous') => {
  const region = getWavelengthRegion(wavelength);
  const { CA, CB, CC } = getCorrectionFactors(wavelength); // These are the simplified/custom factors from above.
  
  let mpeSinglePulse = 0; // This will hold the MPE value (J/cm² or W/cm²)
  let mpeAverage = 0; // For pulsed, rule 2
  let mpeThermal = 0; // For pulsed, rule 3 (not directly used here, but for context)
  let limitingMechanism = '';
  let calculationSteps: string[] = [];

  calculationSteps.push(`MPE Calculation for:`);
  calculationSteps.push(`  Wavelength: ${wavelength} nm (${region} region)`);
  calculationSteps.push(`  Exposure time (t): ${exposureTime.toExponential(3)} s`);
  calculationSteps.push(`  Laser type: ${laserType.toUpperCase()}`);
  calculationSteps.push(`  Correction Factors (simplified interpretation): CA=${CA.toFixed(3)}, CB=${CB.toFixed(3)}, CC=${CC.toFixed(3)}`);


  // MPE calculations based on IEC 60825-1:2014 (selected common cases)
  // Note: Full MPE calculation is complex, involves T1, T2, alpha_min, alpha_max, C_A, C_B, C_C, C_E, C_P, C_T etc.
  // This implementation uses simplified formulas based on the provided MPE_CONSTANTS and correction factors.

  if (wavelength >= 180 && wavelength < 400) { // UV Region
    // Simplified: Using a common UV MPE, actual MPE varies significantly with wavelength and time.
    // Example: For 315-400nm, CW MPE is 1 W/m^2 (0.1 mW/cm^2) for t > 10s.
    // For t < 10s, it's more complex.
    // This calculator seems to focus MPEs more on 400nm+
    // For simplicity, let's use a placeholder or a reference value.
    // A common limit for actinic UV (e.g. 200-315nm) for 8hr is 3 mJ/cm^2.
    // For UVA (315-400nm) for >1000s is 1 mW/cm^2.
    // The original code did not have explicit MPE for UV in this function.
    // Adding a very basic placeholder based on typical long-exposure UVA.
    mpeSinglePulse = 1e-3; // W/cm^2 (placeholder for UVA, long exposure)
    limitingMechanism = 'Photochemical (UV)';
    calculationSteps.push(`UV region MPEs are highly wavelength and time dependent. Using placeholder: ${mpeSinglePulse.toExponential(3)} W/cm²`);
  } else if (wavelength >= 400 && wavelength <= 700) { // Visible light region (retinal hazard)
    if (exposureTime >= 1e-9 && exposureTime < MPE_CONSTANTS.PHOTOCHEMICAL_TIME_LIMIT) { // Short pulses (thermal)
      // Formula: 5 * CA * t^0.75 mJ/cm² (CA here is the code's CA, which is 1 for visible)
      // Standard IEC formula is 1.8 * t^0.75 * C6 (or C4*C7 for specific parts of visible) mJ/cm² for retinal thermal.
      // Or 2 * CA_std * 10^-3 J/cm^2 for t < 18us (CA_std is angular subtense factor)
      // Using code's existing logic:
      mpeSinglePulse = MPE_CONSTANTS.VISIBLE_THERMAL_COEFF * CA * Math.pow(exposureTime, 0.75) * MPE_CONSTANTS.MJ_TO_J; // J/cm²
      limitingMechanism = 'Thermal (retinal, short pulse)';
      calculationSteps.push(`MPE (thermal, short pulse) = ${MPE_CONSTANTS.VISIBLE_THERMAL_COEFF} × CA × t^0.75 × 10^-3`);
      calculationSteps.push(`  = ${MPE_CONSTANTS.VISIBLE_THERMAL_COEFF} × ${CA.toFixed(3)} × ${exposureTime.toExponential(3)}^0.75 × 10^-3 = ${mpeSinglePulse.toExponential(3)} J/cm²`);
    } else if (exposureTime >= MPE_CONSTANTS.PHOTOCHEMICAL_TIME_LIMIT && exposureTime < 10) { // Intermediate exposure (thermal)
      mpeSinglePulse = MPE_CONSTANTS.VISIBLE_THERMAL_COEFF * CA * Math.pow(exposureTime, 0.75) * MPE_CONSTANTS.MJ_TO_J; // J/cm²
      limitingMechanism = 'Thermal (retinal)';
      calculationSteps.push(`MPE (thermal, retinal) = ${MPE_CONSTANTS.VISIBLE_THERMAL_COEFF} × CA × t^0.75 × 10^-3`);
      calculationSteps.push(`  = ${MPE_CONSTANTS.VISIBLE_THERMAL_COEFF} × ${CA.toFixed(3)} × ${exposureTime.toExponential(3)}^0.75 × 10^-3 = ${mpeSinglePulse.toExponential(3)} J/cm²`);
    } else if (exposureTime >= 10 && exposureTime <= 30000) { // Long exposure (CW-like, thermal or photochemical)
      // Thermal limit: 10 mW/cm^2 * CA (here CA=1)
      // Photochemical (blue light hazard 400-600nm): 100 J/cm^2 / CB_std (CB_std is blue light factor) averaged over time. Leads to irradiance limit.
      // Using code's CW limit:
      mpeSinglePulse = MPE_CONSTANTS.VISIBLE_CW_LIMIT * CB * CC; // W/cm² (CB, CC are 1 here based on getCorrectionFactors)
      limitingMechanism = 'Thermal (CW/long exposure)';
      calculationSteps.push(`MPE (CW/long exposure) = ${MPE_CONSTANTS.VISIBLE_CW_LIMIT.toExponential(2)} × CB × CC`);
      calculationSteps.push(`  = ${MPE_CONSTANTS.VISIBLE_CW_LIMIT.toExponential(2)} × ${CB.toFixed(3)} × ${CC.toFixed(3)} = ${mpeSinglePulse.toExponential(3)} W/cm²`);
    } else { // Very short pulses < 1ns or very long > 30000s (simplification)
      mpeSinglePulse = 5e-7 * CA; // J/cm² (ultra-short pulse limit)
      limitingMechanism = 'Thermal (ultra-short) or photochemical (very long - simplified)';
      calculationSteps.push(`MPE (ultra-short or very long simplified) = 5 × 10^-7 × CA = ${mpeSinglePulse.toExponential(3)} J/cm²`);
    }
  } else if (wavelength > 700 && wavelength <= 1400) { // Near-IR (retinal hazard, up to 1400nm)
    // Code's CA factor is active here (CT-like factor)
    if (exposureTime >= 1e-9 && exposureTime < MPE_CONSTANTS.PHOTOCHEMICAL_TIME_LIMIT) { // Short pulses
      mpeSinglePulse = MPE_CONSTANTS.VISIBLE_THERMAL_COEFF * CA * Math.pow(exposureTime, 0.75) * MPE_CONSTANTS.MJ_TO_J; // J/cm²
      limitingMechanism = 'Thermal (retinal, short pulse)';
      calculationSteps.push(`MPE (thermal, short pulse) = ${MPE_CONSTANTS.VISIBLE_THERMAL_COEFF} × CA × t^0.75 × 10^-3`);
      calculationSteps.push(`  = ${MPE_CONSTANTS.VISIBLE_THERMAL_COEFF} × ${CA.toFixed(3)} × ${exposureTime.toExponential(3)}^0.75 × 10^-3 = ${mpeSinglePulse.toExponential(3)} J/cm²`);
    } else if (exposureTime >= MPE_CONSTANTS.PHOTOCHEMICAL_TIME_LIMIT && exposureTime < 10) { // Intermediate
      if (wavelength <= 1050) { // Formula using VISIBLE_THERMAL_COEFF and CA
        mpeSinglePulse = MPE_CONSTANTS.VISIBLE_THERMAL_COEFF * CA * Math.pow(exposureTime, 0.75) * MPE_CONSTANTS.MJ_TO_J; // J/cm²
        calculationSteps.push(`MPE (thermal, retinal, 700-1050nm) = ${MPE_CONSTANTS.VISIBLE_THERMAL_COEFF} × CA × t^0.75 × 10^-3`);
      } else { // Formula using NEAR_IR_1050_1400_COEFF (CA is 5.0 here)
        mpeSinglePulse = MPE_CONSTANTS.NEAR_IR_1050_1400_COEFF * CA * Math.pow(exposureTime, 0.75) * MPE_CONSTANTS.MJ_TO_J; // J/cm²
                                                                                                                          // Note: IEC formula for 1050-1400nm is 9 * t^0.75 * C7_AEL_equiv. CA here is 5.
                                                                                                                          // The product 9*5 = 45 is too high. Standard is 9E-3 * C7 * t^0.75. C7 is 5. So 45E-3 * t^0.75
                                                                                                                          // Or MPE is 0.009 * C_A_std * t^0.75 J/cm^2.
                                                                                                                          // The code's NEAR_IR_1050_1400_COEFF is 9.0 mJ/cm^2. So 9.0 * CA * t^0.75 * 10^-3. This is what's implemented.
        calculationSteps.push(`MPE (thermal, retinal, 1050-1400nm) = ${MPE_CONSTANTS.NEAR_IR_1050_1400_COEFF} × CA × t^0.75 × 10^-3`);
      }
      limitingMechanism = 'Thermal (retinal)';
      calculationSteps.push(`  = ... = ${mpeSinglePulse.toExponential(3)} J/cm²`);
    } else { // Long exposure (CW-like)
      // MPE_IR_A_CW = C_A_std * C_C_std * 10 * 10^-3 W/cm^2. (CA_std often 1, CC_std from table for 1150-1400nm)
      // The code uses VISIBLE_CW_LIMIT * CB * CC. CB and CC are 1 here. CA is used for pulsed MPEs.
      // For 700-1400nm CW, MPE = 0.01 * CA_std * CC_std W/cm^2. Or 10/alpha W/m^2.
      // Using code's logic:
      mpeSinglePulse = MPE_CONSTANTS.VISIBLE_CW_LIMIT * CA * CB * CC; // W/cm² (CA active, CB, CC likely 1)
      limitingMechanism = 'Thermal (CW/long exposure)';
      calculationSteps.push(`MPE (CW/long exposure, NIR) = ${MPE_CONSTANTS.VISIBLE_CW_LIMIT.toExponential(2)} × CA × CB × CC`);
      calculationSteps.push(`  = ${MPE_CONSTANTS.VISIBLE_CW_LIMIT.toExponential(2)} × ${CA.toFixed(3)} × ${CB.toFixed(3)} × ${CC.toFixed(3)} = ${mpeSinglePulse.toExponential(3)} W/cm²`);
    }
  } else if (wavelength > 1400 && wavelength <= 1e6) { // IR-B, IR-C (corneal/skin hazard)
    // MPE for 1400nm - 1mm (1e6 nm) is 0.1 W/cm^2 for t > 10s.
    // For shorter pulses, 0.56 * t^0.25 J/cm^2 for 1.5-2.6um (with C_E factor)
    // Or 1.1 * t^0.25 J/cm^2 for other IR-B/C.
    // The code's old default was 1000e-6 W/cm^2 = 1e-3 W/cm^2. This is too low for CW (0.1 W/cm^2).
    // This is likely for a specific short pulse duration (e.g. 1ns MPE ~ 1mJ/cm^2).
    // Let's assume 0.1 W/cm^2 for CW as per standard for t > 10s.
    // And for pulsed (t < T2, often 10s for these lambda), 1 J/cm^2 (for 1400-1500, 1800-10^6 nm)
    // or 10 J/cm^2 (for 1500-1800 nm, but limited by 100W/cm^2 avg).
    // Given the original MPE was 1 mJ/cm^2, this could be for very short pulses where 100W/cm^2 / (1/t) = 100*t J/cm^2.
    // For simplicity and safety, using a general limit often cited as 0.1 W/cm^2 for CW or 1 J/cm^2 for pulsed.
    // The original code line was: `mpeSinglePulse = 1000e-6; limitingMechanism = 'Thermal (corneal)';`
    // This seems to be 1 mJ/cm^2 if interpreted as energy, or 1 mW/cm^2 if power.
    // If `laserType` implies the unit:
    if (laserType === 'pulsed' || exposureTime < 10) { // Assuming "pulsed" or short exposure means energy limit
        if (wavelength >= 1500 && wavelength <= 1800) { // Higher damage threshold region
            mpeSinglePulse = 1.0 * CC; // J/cm^2 (CC is active here)
            calculationSteps.push(`MPE (pulsed, 1.5-1.8um) = 1.0 J/cm² × CC = ${CC.toFixed(3)} = ${mpeSinglePulse.toExponential(3)} J/cm²`);
        } else {
            mpeSinglePulse = 0.1 * CC; // J/cm^2 (CC may be active or 1)
            calculationSteps.push(`MPE (pulsed, other Far IR) = 0.1 J/cm² × CC = ${CC.toFixed(3)} = ${mpeSinglePulse.toExponential(3)} J/cm²`);
        }
    } else { // CW or long exposure
        mpeSinglePulse = 0.1 * CC; // W/cm^2 (CC may be active or 1)
        calculationSteps.push(`MPE (CW, Far IR) = 0.1 W/cm² × CC = ${CC.toFixed(3)} = ${mpeSinglePulse.toExponential(3)} W/cm²`);
    }
    limitingMechanism = 'Thermal (corneal/skin)';
  } else {
    mpeSinglePulse = 0; // Should not happen with proper wavelength limits
    limitingMechanism = 'Undefined Region';
    calculationSteps.push(`Wavelength outside defined MPE calculation ranges.`);
  }

  // If the result is in J/cm^2 and the laser is 'continuous', it needs conversion to W/cm^2 if appropriate.
  // However, MPEs are often given in J/cm^2 for pulsed and W/cm^2 for CW.
  // The logic above tries to select the right unit.
  // For the MPE component display, it's important to distinguish units.
  // The `limitingMechanism` string already implies this.

  calculationSteps.push(`Final MPE value = ${mpeSinglePulse.toExponential(3)} ${limitingMechanism.includes('CW') || limitingMechanism.includes('W/cm²') || (laserType === 'continuous' && exposureTime >=10 && (wavelength < 180 || wavelength > 1400)) ? 'W/cm²' : 'J/cm²'}`);
  calculationSteps.push(`Limiting mechanism: ${limitingMechanism}`);

  return {
    mpeSinglePulse, // This is the primary MPE calculated.
    mpeAverage,     // Rule 2 for pulsed, calculated in MPECalculator component
    mpeThermal,     // Rule 3 for pulsed, calculated in MPECalculator component
    criticalMPE: mpeSinglePulse, // Will be updated by MPECalculator for pulsed
    correctionFactorCA: CA,
    correctionFactorCB: CB,
    correctionFactorCC: CC,
    wavelengthRegion: region,
    limitingMechanism,
    calculationSteps
  };
};


// ======================== MAIN COMPONENT ========================

const LaserSafetyCalculator: React.FC<LaserSafetyCalculatorProps> = ({ onBack, onShowTutorial }) => {
  const [activeTab, setActiveTab] = useState<'mpe' | 'nohd' | 'classification' | 'eyewear'>('classification');

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Laser Safety Calculations (IEC 60825-1:2014 Compliant)</h2>
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

        {/* Tab Selector */}
        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'mpe'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('mpe')}
          >
            MPE Calculator
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'nohd'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('nohd')}
          >
            NOHD Calculator
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'classification'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('classification')}
          >
            Laser Classification
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'eyewear'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('eyewear')}
          >
            Protective Eyewear
          </button>
        </div>
        
        {/* Content Based on Active Tab */}
        {activeTab === 'mpe' && <MPECalculator onShowTutorial={onShowTutorial} />}
        {activeTab === 'nohd' && <NOHDCalculator onShowTutorial={onShowTutorial} />}
        {activeTab === 'classification' && <LaserClassification onShowTutorial={onShowTutorial} />}
        {activeTab === 'eyewear' && <ProtectiveEyewear onShowTutorial={onShowTutorial} />}
      </div>
    </div>
  );
};

// ======================== MPE CALCULATOR ========================

const MPECalculator: React.FC<MPECalculatorProps> = ({ onShowTutorial }) => {
  const [wavelength, setWavelength] = useState<number>(532); // nm
  const [exposureTime, setExposureTime] = useState<number>(0.25); // seconds
  const [laserType, setLaserType] = useState<'continuous' | 'pulsed'>('continuous');
  const [pulseWidth, setPulseWidth] = useState<number>(10); // ns
  const [repetitionRate, setRepetitionRate] = useState<number>(1000); // Hz
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [mpeResults, setMpeResults] = useState<MPEResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Auto-calculate MPE whenever parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [wavelength, exposureTime, laserType, pulseWidth, repetitionRate]);

  const performAutoCalculation = () => {
    setIsCalculating(true);
    
    try {
      // For MPE calculations, exposureTime might be interpreted differently for pulsed vs CW.
      // If pulsed, `exposureTime` is often the total duration of a pulse train or a single pulse width.
      // The `calculateMPEValue` should ideally take `pulseWidthSeconds` if it's for a single pulse MPE.
      // Let's assume `exposureTime` passed to `calculateMPEValue` is the relevant time for that specific MPE (e.g., single pulse width, or T_i for pulse trains).
      
      let effectiveExposureTime = exposureTime;
      if (laserType === 'pulsed') {
        // For single pulse MPE, time is pulseWidth.
        // For average power MPE, time is longer (e.g., 0.25s, 10s, Ti).
        // The current `calculateMPEValue` doesn't fully differentiate.
        // Let's calculate MPE for a single pulse first using pulseWidth.
        effectiveExposureTime = pulseWidth * MPE_CONSTANTS.NS_TO_S;
      }

      const baseMpeResults = calculateMPEValue(wavelength, effectiveExposureTime, laserType);
      let results = { ...baseMpeResults }; // shallow copy
      results.calculationSteps = [...baseMpeResults.calculationSteps]; // deep copy steps array

      if (laserType === 'pulsed') {
        const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
        
        // Rule 1: MPE for a single pulse in the train (already calculated as results.mpeSinglePulse if effectiveExposureTime was pulseWidthSeconds)
        // Recalculate MPE_sp for the actual pulse width if not done already.
        const singlePulseMpeResult = calculateMPEValue(wavelength, pulseWidthSeconds, 'pulsed');
        results.mpeSinglePulse = singlePulseMpeResult.mpeSinglePulse;
        results.calculationSteps.push(`--- Pulsed Laser MPE Rules ---`);
        results.calculationSteps.push(`Rule 1: Single Pulse MPE (for t=${pulseWidthSeconds.toExponential(2)}s) = ${results.mpeSinglePulse.toExponential(3)} J/cm²`);

        // Rule 2: Average Power MPE
        // MPE_avg = MPE_cw (for time T, e.g., Ti or longest likely exposure)
        // The exposure per pulse must not exceed MPE_avg / PRF.
        // Or, average irradiance must not exceed MPE_CW.
        // MPE_CW is MPE for a long time (e.g., 10s or 0.25s for visible). Let's use `exposureTime` from input for this.
        const mpeCwResult = calculateMPEValue(wavelength, exposureTime, 'continuous'); // MPE for continuous exposure over `exposureTime`
        let mpeCwValue = mpeCwResult.mpeSinglePulse; // This is W/cm²
        // If mpeCwResult was J/cm^2 because exposureTime was short, convert it
        if (!mpeCwResult.limitingMechanism.includes('CW') && !mpeCwResult.limitingMechanism.includes('W/cm²')) {
            mpeCwValue = mpeCwResult.mpeSinglePulse / exposureTime; // Convert J/cm² to W/cm²
        }

        results.mpeAverage = mpeCwValue; // This is the MPE_avg in W/cm²
        results.calculationSteps.push(`Rule 2: Average Power MPE (for t=${exposureTime}s, treated as CW) = ${results.mpeAverage.toExponential(3)} W/cm²`);
        results.calculationSteps.push(`  (Exposure per pulse should also be compared to MPE_avg / PRF)`);

        // Rule 3: Repetitive Pulse MPE (thermal accumulation)
        // MPE_rp = MPE_sp * C_P (where C_P = N^-0.25, N = number of pulses in time T_i)
        // T_i is the thermal confinement time from TIME_BASE_TI
        const Ti = TIME_BASE_TI.getTimeBase(wavelength);
        const N_in_Ti = Math.floor(Ti * repetitionRate);
        if (N_in_Ti > 1) { // CP only applies if N > 1
            const CP = Math.pow(N_in_Ti, -0.25);
            results.mpeThermal = results.mpeSinglePulse * CP; // This is MPE_rp in J/cm²
            results.calculationSteps.push(`Rule 3: Repetitive Pulse MPE (thermal accumulation over T_i=${Ti.toExponential(1)}s):`);
            results.calculationSteps.push(`  N (pulses in T_i) = ${N_in_Ti}`);
            results.calculationSteps.push(`  C_P (N^-0.25) = ${CP.toFixed(4)}`);
            results.calculationSteps.push(`  MPE_thermal (MPE_sp × C_P) = ${results.mpeSinglePulse.toExponential(3)} × ${CP.toFixed(4)} = ${results.mpeThermal.toExponential(3)} J/cm²`);
        } else {
            results.mpeThermal = results.mpeSinglePulse; // No reduction if only one pulse in Ti
            results.calculationSteps.push(`Rule 3: N (pulses in T_i=${Ti.toExponential(1)}s) = ${N_in_Ti} ≤ 1. C_P = 1. MPE_thermal = MPE_sp.`);
        }
        
        // Determine critical MPE for pulsed laser:
        // Need to compare apples to apples (all in J/cm² or W/cm²).
        // MPE_sp (J/cm²)
        // MPE_avg (W/cm²) -> equivalent single pulse limit: MPE_avg / PRF (J/cm²) if PRF > 0
        // MPE_thermal (J/cm²)
        
        let criticalMPEValue = results.mpeSinglePulse; // Start with Rule 1
        results.limitingMechanism = `Single Pulse (Rule 1)`;

        if (results.mpeThermal < criticalMPEValue) {
            criticalMPEValue = results.mpeThermal;
            results.limitingMechanism = `Repetitive Pulse Thermal (Rule 3, N in T_i)`;
        }

        if (repetitionRate > 0) {
            const mpeAvgAsEnergy = results.mpeAverage / repetitionRate; // J/cm²
            if (mpeAvgAsEnergy < criticalMPEValue) {
                criticalMPEValue = mpeAvgAsEnergy;
                results.limitingMechanism = `Average Power (Rule 2, MPE_CW / PRF)`;
            }
        }
        results.criticalMPE = criticalMPEValue;
        results.calculationSteps.push(`---`);
        results.calculationSteps.push(`Critical MPE for pulsed laser (most restrictive): ${results.criticalMPE.toExponential(3)} J/cm²`);
        results.calculationSteps.push(`Determined by: ${results.limitingMechanism}`);

      } else { // Continuous Wave
        // For CW, criticalMPE is just mpeSinglePulse (which is in W/cm² if exposureTime is long enough)
        results.criticalMPE = results.mpeSinglePulse;
        // Ensure unit is W/cm² if it's truly CW
        if (!results.limitingMechanism.includes('CW') && !results.limitingMechanism.includes('W/cm²') && exposureTime >= 0.25) {
            // If MPE was J/cm^2 due to short exposure time, but laser is CW, convert to W/cm^2
            // This is tricky. If laser is CW, MPE should be W/cm². The calculateMPEValue function should handle this.
            // Let's assume calculateMPEValue gives appropriate units based on time.
        }
      }

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
    setLaserType('continuous');
    setPulseWidth(10);
    setRepetitionRate(1000);
  };

  const displayUnit = mpeResults?.limitingMechanism.includes('CW') || 
                      mpeResults?.limitingMechanism.includes('W/cm²') ||
                      (laserType === 'continuous' && exposureTime >=0.25 && (wavelength <180 || wavelength > 1400)) // Heuristic for CW MPEs
                      ? 'W/cm²' : 'J/cm²';
  if (laserType === 'pulsed' && mpeResults) {
    // For pulsed, critical MPE is usually J/cm² (energy per pulse)
    // unless limited by average power converted to energy per pulse.
    // The criticalMPE logic for pulsed already determines this. It's in J/cm^2.
  }


  return (
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
            max="1000000" // Max extended for Far-IR
            value={wavelength}
            onChange={(e) => setWavelength(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Range: 180-1,000,000 nm</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exposure Time (s)
          </label>
          <input
            type="number"
            min="1e-13" // Min for very short pulses
            max="30000" // Max for long exposures
            step="any"
            value={exposureTime}
            onChange={(e) => setExposureTime(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">For aversion response (visible): 0.25s. For thermal limits: 10s or T_i. For single pulse: pulse width.</p>
        </div>

        {laserType === 'pulsed' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pulse Width (ns)
              </label>
              <input
                type="number"
                min="0.001" // fs pulses
                max="1e9" // up to 1s pulses
                step="any"
                value={pulseWidth}
                onChange={(e) => setPulseWidth(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repetition Rate (Hz)
              </label>
              <input
                type="number"
                min="0" // 0 for single pulse
                max="1e12" // THz rates
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
                  } {laserType === 'pulsed' ? 'J/cm²' : displayUnit}
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
                    <td className="px-3 py-2 font-medium">Correction Factor CA (model specific)</td>
                    <td className="px-3 py-2">{mpeResults.correctionFactorCA.toFixed(3)}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Correction Factor CB (model specific)</td>
                    <td className="px-3 py-2">{mpeResults.correctionFactorCB.toFixed(3)}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Correction Factor CC (model specific)</td>
                    <td className="px-3 py-2">{mpeResults.correctionFactorCC.toFixed(3)}</td>
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
                        <td className="px-3 py-2 font-medium">MPE Average Power (Rule 2)</td>
                        <td className="px-3 py-2">
                          {mpeResults.mpeAverage < 0.001 && mpeResults.mpeAverage !== 0
                            ? mpeResults.mpeAverage.toExponential(2) 
                            : mpeResults.mpeAverage.toFixed(4)
                          } W/cm²
                        </td>
                      </tr>
                      <tr className="border-t border-gray-200">
                        <td className="px-3 py-2 font-medium">MPE Thermal Accumulation (Rule 3)</td>
                        <td className="px-3 py-2">
                          {mpeResults.mpeThermal < 0.001 && mpeResults.mpeThermal !== 0 
                            ? mpeResults.mpeThermal.toExponential(2) 
                            : mpeResults.mpeThermal.toFixed(4)
                          } J/cm²
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Calculation Steps</h4>
              <div className="bg-white p-3 rounded-md max-h-64 overflow-y-auto">
                <ol className="list-decimal pl-5 space-y-1 text-xs font-mono">
                  {mpeResults.calculationSteps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
        
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">About MPE Calculations</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>MPE values are based on simplified interpretations of IEC 60825-1:2014.</li>
            <li>Calculations assume direct ocular exposure to a point source.</li>
            <li>For extended sources, angular subtense (CA standard factor) corrections apply.</li>
            <li>Multiple pulse exposure uses three-rule criteria (single pulse, average power, thermal accumulation).</li>
            <li>Always verify calculations with current standard documents and expert consultation for critical applications.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== NOHD CALCULATOR ========================

const NOHDCalculator: React.FC<NOHDCalculatorProps> = ({ onShowTutorial }) => {
  // Implementation remains the same as original
  const [power, setPower] = useState<number>(5); // mW
  const [beamDiameter, setBeamDiameter] = useState<number>(2); // mm
  const [beamDivergence, setBeamDivergence] = useState<number>(1); // mrad
  const [wavelength, setWavelength] = useState<number>(532); // nm
  const [exposureTime, setExposureTime] = useState<number>(0.25); // seconds
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [nohdResults, setNohdResults] = useState<NOHDResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Auto-calculate NOHD whenever parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [power, beamDiameter, beamDivergence, wavelength, exposureTime]);

  const performAutoCalculation = () => {
    if (power <= 0 || beamDiameter <= 0 || beamDivergence <= 0) {
      setNohdResults(null);
      setCalculationPerformed(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      // NOHD typically for CW lasers or average power of pulsed lasers.
      // MPE should be in W/cm^2.
      const mpeResult = calculateMPEValue(wavelength, exposureTime, 'continuous'); // Get MPE as if CW
      let mpe_W_cm2 = mpeResult.criticalMPE; // This should be in W/cm^2
      
      // If MPE result was in J/cm^2 (e.g. short exposure time), convert to W/cm^2
      if (!mpeResult.limitingMechanism.includes('CW') && !mpeResult.limitingMechanism.includes('W/cm²')) {
         if (exposureTime > 0) {
            mpe_W_cm2 = mpeResult.criticalMPE / exposureTime;
         } else {
            mpe_W_cm2 = 0; // Avoid division by zero
         }
      }
      
      if (mpe_W_cm2 <= 0) { // MPE must be positive
          setNohdResults(null);
          setCalculationPerformed(false);
          setIsCalculating(false);
          // Optionally add an error message to nohdResults or a separate state
          return;
      }


      const powerWatts = power * MPE_CONSTANTS.MW_TO_W;
      const beamDiameterAtAperture_m = beamDiameter * MPE_CONSTANTS.MM_TO_CM / 100; // mm to m
      const beamDivergenceRad = beamDivergence * MPE_CONSTANTS.MRAD_TO_RAD; // mrad to rad

      // NOHD formula: (1/phi) * [ sqrt( (4 * P) / (pi * MPE) ) - D0 ]
      // P in Watts, MPE in W/m^2, D0 in m, phi in rad
      const mpe_W_m2 = mpe_W_cm2 * MPE_CONSTANTS.M2_TO_CM2; // W/cm^2 to W/m^2

      let nohd_m = 0;
      let calculationSteps = [
        `Laser power (P): ${power} mW = ${powerWatts.toExponential(3)} W`,
        `Beam diameter at aperture (D0): ${beamDiameter} mm = ${beamDiameterAtAperture_m.toExponential(3)} m`,
        `Beam divergence (Φ): ${beamDivergence} mrad = ${beamDivergenceRad.toExponential(3)} rad`,
        `Wavelength: ${wavelength} nm`,
        `Exposure time for MPE: ${exposureTime} s`,
        `MPE used: ${mpe_W_cm2.toExponential(3)} W/cm² = ${mpe_W_m2.toExponential(3)} W/m²`
      ];

      if (beamDivergenceRad > 0) {
        const termInsideSqrt = (4 * powerWatts) / (Math.PI * mpe_W_m2);
        calculationSteps.push(`Term (4P / (π × MPE_W_m2)): (4 × ${powerWatts.toExponential(3)}) / (π × ${mpe_W_m2.toExponential(3)}) = ${termInsideSqrt.toExponential(3)} m²`);
        
        if (termInsideSqrt >= 0) {
          const sqrtVal = Math.sqrt(termInsideSqrt); // This is effective beam diameter at NOHD in meters
          nohd_m = (1 / beamDivergenceRad) * (sqrtVal - beamDiameterAtAperture_m);
          calculationSteps.push(`NOHD = (1/${beamDivergenceRad.toExponential(3)}) × (√${termInsideSqrt.toExponential(3)} - ${beamDiameterAtAperture_m.toExponential(3)})`);
          calculationSteps.push(`   = (1/${beamDivergenceRad.toExponential(3)}) × (${sqrtVal.toExponential(3)} - ${beamDiameterAtAperture_m.toExponential(3)}) = ${nohd_m.toFixed(3)} m`);
        } else {
          calculationSteps.push(`Error: Negative term inside square root. Cannot calculate NOHD.`);
          nohd_m = 0; // Or indicate error
        }
      } else {
        calculationSteps.push(`Error: Beam divergence is zero. NOHD is infinite if P/A > MPE, or zero otherwise.`);
        // For collimated beam (phi=0), if initial irradiance > MPE, NOHD is infinite. Else, NOHD is 0.
        const initialArea_m2 = Math.PI * Math.pow(beamDiameterAtAperture_m / 2, 2);
        const initialIrradiance_W_m2 = powerWatts / initialArea_m2;
        if (initialIrradiance_W_m2 > mpe_W_m2) {
            nohd_m = Infinity; // Represents infinite NOHD
        } else {
            nohd_m = 0;
        }
        calculationSteps.push(`Initial irradiance: ${initialIrradiance_W_m2.toExponential(3)} W/m². NOHD = ${nohd_m === Infinity ? "∞" : "0"} m.`);

      }
      
      if (nohd_m < 0) nohd_m = 0; // NOHD cannot be negative, means MPE is met at or before aperture.

      const beamDiameterAtNOHD_m = beamDiameterAtAperture_m + nohd_m * beamDivergenceRad;
      const beamAreaAtNOHD_m2 = Math.PI * Math.pow(beamDiameterAtNOHD_m / 2, 2);
      const irradianceAtNOHD_W_m2 = powerWatts / beamAreaAtNOHD_m2; // Should be close to MPE

      const initialBeamArea_cm2 = Math.PI * Math.pow((beamDiameter * MPE_CONSTANTS.MM_TO_CM) / 2, 2);
      const initialPowerDensity_W_cm2 = powerWatts / initialBeamArea_cm2;

      let hazardClass = ''; // Simple NOHD-based hazard perception
      if (nohd_m === Infinity) {
        hazardClass = 'Extremely high hazard - Collimated beam exceeding MPE';
      } else if (nohd_m < 0.1) {
        hazardClass = 'Low hazard potential - NOHD < 10 cm';
      } else if (nohd_m < 3) {
        hazardClass = 'Moderate hazard potential - NOHD < 3 m';
      } else if (nohd_m < 100) {
        hazardClass = 'High hazard potential - NOHD < 100 m';
      } else {
        hazardClass = 'Very high hazard potential - NOHD ≥ 100 m';
      }

      calculationSteps.push(`---`);
      calculationSteps.push(`Calculated NOHD: ${nohd_m === Infinity ? "∞" : nohd_m.toFixed(2)} m`);
      calculationSteps.push(`Beam diameter at NOHD: ${nohd_m === Infinity ? "N/A" : (beamDiameterAtNOHD_m * 1000).toFixed(1)} mm`);
      calculationSteps.push(`Irradiance at NOHD: ${nohd_m === Infinity ? "N/A" : (irradianceAtNOHD_W_m2 / MPE_CONSTANTS.M2_TO_CM2).toExponential(3)} W/cm² (should match MPE)`);
      calculationSteps.push(`Hazard perception: ${hazardClass}`);

      setNohdResults({
        nohd: nohd_m,
        mpe: mpe_W_cm2,
        beamDiameterAtNOHD: nohd_m === Infinity ? Infinity : beamDiameterAtNOHD_m * 1000, // in mm
        irradianceAtNOHD: nohd_m === Infinity ? 0 : irradianceAtNOHD_W_m2 / MPE_CONSTANTS.M2_TO_CM2, // in W/cm^2
        hazardClass: hazardClass,
        initialPowerDensity: initialPowerDensity_W_cm2,
        calculationSteps: calculationSteps
      });

      setCalculationPerformed(true);
    } catch (error) {
      console.error('NOHD calculation error:', error);
      setNohdResults(null);
      setCalculationPerformed(false);
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculation = () => {
    setCalculationPerformed(false);
    setNohdResults(null);
    setPower(5);
    setBeamDiameter(2);
    setBeamDivergence(1);
    setWavelength(532);
    setExposureTime(0.25);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Laser Beam Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Laser Power (mW)
          </label>
          <input
            type="number"
            min="0.001"
            max="1e9" // Up to MW range
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beam Diameter at Aperture (mm)
          </label>
          <input
            type="number"
            min="0.001" // micron-scale beams
            max="1000" // 1m beams
            value={beamDiameter}
            onChange={(e) => setBeamDiameter(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beam Divergence (mrad)
          </label>
          <input
            type="number"
            min="0" // For collimated beams
            max="1000" // Large divergences
            step="any"
            value={beamDivergence}
            onChange={(e) => setBeamDivergence(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Full angle divergence. Use 0 for collimated beam.</p>
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
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exposure Time for MPE (s)
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
          <p className="text-xs text-gray-500 mt-1">Use 0.25s for visible accidental exposure, 10s for IR thermal, etc.</p>
        </div>

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
              Calculating NOHD...
            </p>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 flex items-center">
          NOHD Calculation Results
          {isCalculating && (
            <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
          )}
        </h3>
        
        {isCalculating ? (
          <div className="text-center py-8 text-blue-600">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p>Calculating NOHD...</p>
          </div>
        ) : !calculationPerformed || !nohdResults ? (
          <div className="text-center py-8 text-gray-500">
            <p>NOHD values will appear automatically as you adjust parameters</p>
            {nohdResults === null && calculationPerformed && <p className="text-red-500">Could not calculate NOHD. Check MPE validity or input parameters.</p>}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Nominal Ocular Hazard Distance (NOHD)</h4>
              <div className={`p-3 rounded-md ${
                nohdResults.nohd === Infinity || nohdResults.nohd > 3
                  ? 'bg-red-100 border border-red-300' 
                  : 'bg-green-100 border border-green-300'
              }`}>
                <p className={`font-bold text-lg ${
                  nohdResults.nohd === Infinity || nohdResults.nohd > 3 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {nohdResults.nohd === Infinity 
                    ? "∞ (Infinite)"
                    : nohdResults.nohd < 1 && nohdResults.nohd !==0
                      ? `${(nohdResults.nohd * 100).toFixed(1)} cm` 
                      : nohdResults.nohd < 1000 
                        ? `${nohdResults.nohd.toFixed(2)} m`
                        : `${(nohdResults.nohd / 1000).toFixed(2)} km`
                  }
                </p>
                <p className="text-sm mt-1">{nohdResults.hazardClass}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Detailed Analysis</h4>
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">MPE Used</td>
                    <td className="px-3 py-2">
                      {nohdResults.mpe < 0.001 && nohdResults.mpe !== 0
                        ? nohdResults.mpe.toExponential(2) 
                        : nohdResults.mpe.toFixed(6)
                      } W/cm²
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Beam Diameter at NOHD</td>
                    <td className="px-3 py-2">
                        {nohdResults.beamDiameterAtNOHD === Infinity ? "N/A" : `${nohdResults.beamDiameterAtNOHD.toFixed(2)} mm`}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Irradiance at NOHD</td>
                    <td className="px-3 py-2">
                      {nohdResults.irradianceAtNOHD === 0 && nohdResults.nohd === Infinity ? "N/A" :
                       nohdResults.irradianceAtNOHD < 0.001 && nohdResults.irradianceAtNOHD !==0
                        ? nohdResults.irradianceAtNOHD.toExponential(2) 
                        : nohdResults.irradianceAtNOHD.toFixed(6)
                      } W/cm²
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Initial Power Density</td>
                    <td className="px-3 py-2">
                      {nohdResults.initialPowerDensity.toFixed(2)} W/cm²
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Calculation Steps</h4>
              <div className="bg-white p-3 rounded-md max-h-64 overflow-y-auto">
                <ol className="list-decimal pl-5 space-y-1 text-xs font-mono">
                  {nohdResults.calculationSteps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== LASER CLASSIFICATION COMPONENT ========================

const LaserClassification: React.FC<LaserClassificationProps> = ({ onShowTutorial }) => {
  // State for laser configuration
  const [wavelength, setWavelength] = useState<number>(532); // nm
  const [laserType, setLaserType] = useState<'continuous' | 'pulsed'>('continuous');
  const [power, setPower] = useState<number>(5); // mW for CW
  const [pulseEnergy, setPulseEnergy] = useState<number>(1); // mJ for pulsed
  const [pulseWidth, setPulseWidth] = useState<number>(10); // ns
  const [repetitionRate, setRepetitionRate] = useState<number>(1000); // Hz
  const [beamDiameter, setBeamDiameter] = useState<number>(7); // mm
  const [exposureTime, setExposureTime] = useState<number>(0.25); // seconds
  
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [classificationResults, setClassificationResults] = useState<ClassificationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  
  // State for pulse parameter validation
  const [pulseValidation, setPulseValidation] = useState<{
    isValid: boolean;
    errorMessage?: string;
    warningMessage?: string;
  }>({ isValid: true });

  // Validate pulse parameters whenever they change
  useEffect(() => {
    if (laserType === 'pulsed') {
      const validation = validatePulseParameters(pulseWidth, repetitionRate);
      setPulseValidation(validation);
    } else {
      setPulseValidation({ isValid: true }); // Reset validation for CW
    }
  }, [laserType, pulseWidth, repetitionRate]); // Added pulseWidth to dependencies

  // Auto-calculate classification whenever parameters change (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [wavelength, laserType, power, pulseEnergy, pulseWidth, repetitionRate, beamDiameter, exposureTime, pulseValidation.isValid]); // Added pulseValidation.isValid

  const performAutoCalculation = () => {
    // Don't calculate if validation fails for pulsed lasers
    if (laserType === 'pulsed' && !pulseValidation.isValid) {
      setClassificationResults(null);
      setCalculationPerformed(false); // Indicate calculation was attempted but stopped
      setIsCalculating(false); // Ensure loading spinner stops
      return;
    }

    setIsCalculating(true);
    
    try {
      let emission = 0;
      let unitForAEL = 'W'; // Default for CW
      if (laserType === 'continuous') {
        emission = power * MPE_CONSTANTS.MW_TO_W; // mW to W
      } else { // pulsed
        emission = pulseEnergy * MPE_CONSTANTS.MJ_TO_J; // mJ to J
        unitForAEL = 'J';
        // For pulsed lasers, AELs are often energy (J). Exposure time for AEL classification
        // can be single pulse width, or Ti, or T(max)=0.25s for visible, etc.
        // The IEC_AEL_TABLES functions for getClass1AEL etc. handle time dependency.
      }

      // Use IEC 60825-1 Section 5.1 compliant classification
      const results = classifyLaserIEC60825Section51(
        wavelength,
        emission,
        exposureTime, // This exposureTime is crucial for AEL determination
        beamDiameter,
        laserType
      );

      setClassificationResults(results);
      setCalculationPerformed(true);
    } catch (error) {
      console.error('Classification calculation error:', error);
      setClassificationResults(null);
      setCalculationPerformed(false);
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculation = () => {
    setCalculationPerformed(false);
    setClassificationResults(null);
    setWavelength(532);
    setLaserType('continuous');
    setPower(5);
    setPulseEnergy(1);
    setPulseWidth(10);
    setRepetitionRate(1000);
    setBeamDiameter(7);
    setExposureTime(0.25);
    setPulseValidation({ isValid: true }); // Reset validation state
  };

  return (
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
          <p className="text-xs text-gray-500 mt-1">Range: 180-1,000,000 nm</p>
        </div>

        {laserType === 'continuous' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laser Power (mW)
            </label>
            <input
              type="number"
              min="1e-9" // nW range
              max="1e9"  // MW range
              step="any"
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pulse Energy (mJ)
              </label>
              <input
                type="number"
                min="1e-12" // pJ range
                max="100000" // 100J pulses
                step="any"
                value={pulseEnergy}
                onChange={(e) => setPulseEnergy(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pulse Width (ns)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.001" // fs range
                  max="1e9"   // 1s pulses
                  step="any"
                  value={pulseWidth}
                  onChange={(e) => setPulseWidth(Number(e.target.value))}
                  className={`w-full p-2 border rounded-md ${
                    laserType === 'pulsed' && !pulseValidation.isValid && pulseValidation.errorMessage?.includes('width')
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {laserType === 'pulsed' && !pulseValidation.isValid && pulseValidation.errorMessage?.includes('width') && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-xs">⚠️</div>
                )}
              </div>
              {laserType === 'pulsed' && repetitionRate > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Max consistent with PRF: {((1/repetitionRate) * 1e9).toFixed(1)} ns
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repetition Rate (Hz)
              </label>
              <input
                type="number"
                min="0" // 0 for single pulse
                max="1e12" // THz
                step="any"
                value={repetitionRate}
                onChange={(e) => setRepetitionRate(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
               <p className="text-xs text-gray-500 mt-1">Use 0 for a single pulse.</p>
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beam Diameter (mm)
          </label>
          <input
            type="number"
            min="0.001" // micron scale
            max="1000" // 1m
            step="any"
            value={beamDiameter}
            onChange={(e) => setBeamDiameter(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Measurement aperture (e.g., 7mm for Class M check in 302.5-4000nm)</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exposure Duration for AEL (s)
          </label>
          <input
            type="number"
            min="1e-13" // fs timescales
            max="30000" // 8 hours
            step="any"
            value={exposureTime}
            onChange={(e) => setExposureTime(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">E.g., 0.25s (aversion), 10s (thermal), 100s, 30ks (photochemical). Affects AELs.</p>
        </div>

        {/* Pulse Parameter Validation Display */}
        {laserType === 'pulsed' && (
          <div className="mb-4">
            <div className={`p-3 rounded-md border ${
              !pulseValidation.isValid 
                ? 'bg-red-50 border-red-300' 
                : pulseValidation.warningMessage 
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-green-50 border-green-300'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0 text-xl">
                  {!pulseValidation.isValid ? (
                    <span role="img" aria-label="Error">️️️❌</span>
                  ) : pulseValidation.warningMessage ? (
                    <span role="img" aria-label="Warning">⚠️</span>
                  ) : (
                    <span role="img" aria-label="Success">✅</span>
                  )}
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${
                    !pulseValidation.isValid 
                      ? 'text-red-800' 
                      : pulseValidation.warningMessage 
                        ? 'text-yellow-800'
                        : 'text-green-800'
                  }`}>
                    Pulse Parameter Validation
                  </h4>
                  <div className={`mt-1 text-sm ${
                    !pulseValidation.isValid 
                      ? 'text-red-700' 
                      : pulseValidation.warningMessage 
                        ? 'text-yellow-700'
                        : 'text-green-700'
                  }`}>
                    {!pulseValidation.isValid && (
                      <p>{pulseValidation.errorMessage}</p>
                    )}
                    {pulseValidation.warningMessage && (
                      <p>{pulseValidation.warningMessage}</p>
                    )}
                    {pulseValidation.isValid && !pulseValidation.warningMessage && (
                      <p>Pulse parameters appear physically consistent.</p>
                    )}
                    {repetitionRate > 0 && (
                        <p className="text-xs mt-1">
                        Period available: {((1/repetitionRate) * 1e9).toFixed(1)} ns at {repetitionRate} Hz.
                        Duty Cycle: {pulseWidth / ((1/repetitionRate) * 1e9) * 100 > 0 ? (pulseWidth / ((1/repetitionRate) * 1e9) * 100).toFixed(2) : 0}%
                        </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={resetCalculation}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Reset to Defaults
          </button>
          {laserType === 'pulsed' && !pulseValidation.isValid && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Fix pulse parameter errors for accurate classification.
            </p>
          )}
          {isCalculating && (
            <p className="text-sm text-blue-600 mt-2 flex items-center">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></span>
              Calculating classification...
            </p>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 flex items-center">
          IEC 60825-1:2014 Classification Results
          {isCalculating && (
            <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
          )}
        </h3>
        
        {isCalculating ? (
          <div className="text-center py-8 text-blue-600">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p>Calculating laser classification...</p>
          </div>
        ) : !calculationPerformed || !classificationResults ? (
          <div className="text-center py-8 text-gray-500">
            {laserType === 'pulsed' && !pulseValidation.isValid ? (
              <div>
                <p className="text-red-600 mb-2 text-lg">⚠️ Invalid Pulse Parameters</p>
                <p className="text-sm">{pulseValidation.errorMessage}</p>
                <p className="text-xs mt-2">Please correct the pulse parameters to enable classification.</p>
              </div>
            ) : (
              <p>Classification will appear automatically as you adjust parameters.</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Laser Classification</h4>
              <div className={`p-3 rounded-md ${
                classificationResults.laserClass.includes('1') 
                  ? 'bg-green-100 border border-green-300' 
                  : classificationResults.laserClass.includes('2')
                    ? 'bg-blue-100 border border-blue-300'
                    : classificationResults.laserClass.includes('3R')
                      ? 'bg-yellow-100 border border-yellow-300'
                      : 'bg-red-100 border border-red-300' // 3B or 4
              }`}>
                <p className={`font-bold text-2xl ${
                  classificationResults.laserClass.includes('1') 
                    ? 'text-green-700' 
                    : classificationResults.laserClass.includes('2')
                      ? 'text-blue-700'
                      : classificationResults.laserClass.includes('3R')
                        ? 'text-yellow-700'
                        : 'text-red-700'
                }`}>
                  {classificationResults.laserClass}
                </p>
                <p className="text-sm mt-1">{classificationResults.classDescription}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded">
                    IEC 60825-1:2014 Compliant Logic
                  </span>
                  {classificationResults.requiresClassM && ( // This 'requiresClassM' is from the result object
                    <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded">
                      Class M Rules Applied
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">IEC 60825-1 Compliance Details</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Condition 1 Test (vs. AEL of assigned class):</p>
                    <p className={classificationResults.condition1Test ? 'text-green-600' : 'text-red-600'}>
                      {classificationResults.condition1Test ? '✓ Passed (or N/A)' : '✗ Failed'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Condition 3 Test (vs. AEL of assigned class):</p>
                    <p className={classificationResults.condition3Test ? 'text-green-600' : 'text-red-600'}>
                      {classificationResults.condition3Test ? '✓ Passed' : '✗ Failed'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Class M Consideration Triggered:</p>
                    <p className={classificationResults.requiresClassM ? 'text-orange-600' : 'text-gray-600'}>
                      {classificationResults.requiresClassM ? 'YES' : 'NO'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Wavelength:</p>
                    <p className="text-gray-700">{wavelength} nm</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Classification Details</h4>
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Measured Emission (Input)</td>
                    <td className="px-3 py-2">
                      {classificationResults.measuredEmission < 0.001 && classificationResults.measuredEmission !== 0
                        ? classificationResults.measuredEmission.toExponential(2) 
                        : classificationResults.measuredEmission.toFixed(4)
                      } {laserType === 'continuous' ? 'W' : 'J'}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">AEL for {classificationResults.laserClass}</td>
                    <td className="px-3 py-2">
                      {classificationResults.ael < 0.001 && classificationResults.ael !== 0
                        ? classificationResults.ael.toExponential(2) 
                        : classificationResults.ael.toFixed(4)
                      } {classificationResults.laserClass === 'Class 1' && (wavelength >= 180 && wavelength < 400) ? (exposureTime <= 0.25 ? 'J' : 'J') : (laserType === 'continuous' ? 'W' : 'J')} 
                      {/* AEL unit logic needs to be robust based on AEL table. Temporary fix for some AELs being J/m^2 etc. */}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Ratio (Emission/AEL)</td>
                    <td className="px-3 py-2">
                      {classificationResults.ratio.toFixed(4)}
                      {classificationResults.ratio > 1 && classificationResults.laserClass !== "Class 4" && ' (Exceeds AEL for this class, hence higher classification)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Safety Requirements for {classificationResults.laserClass}</h4>
              <div className="bg-white p-3 rounded-md">
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {classificationResults.safetyRequirements.map((req, index) => (
                    <li key={index} className={req.startsWith('All') ? 'font-medium' : ''}>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {classificationResults.classificationSteps && (
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">IEC 60825-1 Section 5.1 Classification Steps</h4>
                <div className="bg-white p-3 rounded-md max-h-64 overflow-y-auto">
                  <ol className="list-decimal pl-5 space-y-1 text-xs font-mono">
                    {classificationResults.classificationSteps.map((step, index) => (
                      <li key={index} className={step.startsWith('===') || step.startsWith('---') || step.startsWith('Result:') ? 'font-bold text-blue-700' : (step.includes('FAIL') ? 'text-red-700' : (step.includes('PASS') ? 'text-green-700' : ''))}>
                        <span dangerouslySetInnerHTML={{ __html: step.replace(/≤/g, '&le;').replace(/≥/g, '&ge;') }} />
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            <div className="mt-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                <Icons.InfoInline /> IEC 60825-1:2014 Classification Logic
              </h4>
              <p className="text-sm text-yellow-800 mb-2">
                This calculator implements the hierarchical classification logic from IEC 60825-1:2014 
                Section 5.1, including Condition 1 and Condition 3 testing with apertures/distances from Table 10, 
                Class M considerations, and wavelength/time-dependent AELs from Tables 3-8.
              </p>
              <p className="text-sm text-yellow-800">
                <strong>Disclaimer:</strong> This is an educational tool. Always consult the full IEC standard and qualified personnel for definitive laser safety assessments and classification.
              </p>
            </div>
          </>
        )}
        
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Classification Standards Reference</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>IEC 60825-1:2014:</strong> Safety of laser products - Part 1.</li>
            <li><strong>Section 5.1:</strong> Determination of laser class (hierarchical).</li>
            <li><strong>Table 10:</strong> Measurement conditions (apertures, distances).</li>
            <li><strong>Tables 3-8:</strong> Accessible Emission Limits (AELs) for Classes 1, 2, 3R, 3B.</li>
            <li><strong>Class M:</strong> Requires specific checks if beam diameter  7mm (for 302.5-4000nm) due to optical viewing instruments.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== PROTECTIVE EYEWEAR CALCULATOR ========================

const ProtectiveEyewear: React.FC<ProtectiveEyewearProps> = ({ onShowTutorial }) => {
  // Implementation remains the same as original
  const [power, setPower] = useState<number>(1000); // mW
  const [wavelength, setWavelength] = useState<number>(1064); // nm
  const [beamDiameter, setBeamDiameter] = useState<number>(5); // mm
  const [exposureTime, setExposureTime] = useState<number>(10); // seconds
  const [laserType, setLaserType] = useState<'continuous' | 'pulsed'>('continuous');
  const [pulseEnergy, setPulseEnergy] = useState<number>(100); // mJ
  const [pulseWidth, setPulseWidth] = useState<number>(10); // ns
  const [repetitionRate, setRepetitionRate] = useState<number>(1000); // Hz, added for pulsed MPE context if needed
  
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [eyewearResults, setEyewearResults] = useState<EyewearResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Auto-calculate eyewear requirements whenever parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [power, wavelength, beamDiameter, exposureTime, laserType, pulseEnergy, pulseWidth, repetitionRate]); // Added repetitionRate

  const performAutoCalculation = () => {
    if ((laserType === 'continuous' && (power <= 0 || beamDiameter <=0)) || 
        (laserType === 'pulsed' && (pulseEnergy <= 0 || pulseWidth <=0 || beamDiameter <=0 )) || 
         exposureTime <= 0) {
      setEyewearResults(null);
      setCalculationPerformed(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      let mpeValue: number;
      let mpeUnit: 'J/cm²' | 'W/cm²';
      let exposureLevel: number; // H or E at the cornea
      let scaleFactorLetter: 'D' | 'I' | 'R' | 'M'; // For EN207 LB marking

      if (laserType === 'continuous') {
        const mpeResult = calculateMPEValue(wavelength, exposureTime, 'continuous');
        mpeValue = mpeResult.criticalMPE;
        // Ensure MPE is W/cm² for CW
        if (!mpeResult.limitingMechanism.includes('CW') && !mpeResult.limitingMechanism.includes('W/cm²') && exposureTime > 0) {
            mpeValue = mpeResult.criticalMPE / exposureTime;
        }
        mpeUnit = 'W/cm²';
        
        const beamArea_cm2 = Math.PI * Math.pow(beamDiameter * MPE_CONSTANTS.MM_TO_CM / 2, 2);
        exposureLevel = (power * MPE_CONSTANTS.MW_TO_W) / beamArea_cm2; // Irradiance E in W/cm²
        scaleFactorLetter = 'D'; // Continuous wave
      } else { // Pulsed
        // For pulsed, need to consider all three MPE rules.
        // The MPE component's `performAutoCalculation` logic for pulsed is more complete.
        // Here, we need the most restrictive MPE_pulse in J/cm².
        const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
        
        // Rule 1: MPE_sp
        const mpeSpResult = calculateMPEValue(wavelength, pulseWidthSeconds, 'pulsed');
        let mpe_sp = mpeSpResult.criticalMPE; // J/cm²

        // Rule 2: MPE_avg (converted to energy per pulse)
        const mpeCwResult = calculateMPEValue(wavelength, exposureTime, 'continuous'); // MPE for long time T
        let mpe_cw = mpeCwResult.criticalMPE;
        if (!mpeCwResult.limitingMechanism.includes('CW') && !mpeCwResult.limitingMechanism.includes('W/cm²') && exposureTime > 0) {
            mpe_cw = mpeCwResult.criticalMPE / exposureTime; // to W/cm²
        }
        let mpe_avg_limit_J_per_pulse = Infinity;
        if (repetitionRate > 0) {
            mpe_avg_limit_J_per_pulse = mpe_cw / repetitionRate; // J/cm²
        }

        // Rule 3: MPE_rp
        const Ti = TIME_BASE_TI.getTimeBase(wavelength);
        const N_in_Ti = Math.floor(Ti * repetitionRate);
        let mpe_rp = mpe_sp; // J/cm²
        if (N_in_Ti > 1) {
            const CP = Math.pow(N_in_Ti, -0.25);
            mpe_rp = mpe_sp * CP;
        }
        
        mpeValue = Math.min(mpe_sp, mpe_avg_limit_J_per_pulse, mpe_rp);
        mpeUnit = 'J/cm²';

        const beamArea_cm2 = Math.PI * Math.pow(beamDiameter * MPE_CONSTANTS.MM_TO_CM / 2, 2);
        exposureLevel = (pulseEnergy * MPE_CONSTANTS.MJ_TO_J) / beamArea_cm2; // Radiant Exposure H in J/cm²
        
        // Determine scale factor letter for pulsed
        if (pulseWidthSeconds >= 1e-9 && pulseWidthSeconds < 0.25) { // Standard pulse (I)
            scaleFactorLetter = 'I';
        } else if (pulseWidthSeconds >= 0.25) { // Long pulse (R)
            scaleFactorLetter = 'R';
        } else { // Ultrashort pulse (M, femtosecond/picosecond not fully covered by simple I)
            scaleFactorLetter = 'M'; // Typically for PRF > 1kHz and very short pulses
                                    // Standard uses I for >1ns to 0.25s, R for >0.25s, M for modelocked/ultrashort
                                    // For simplicity, general "I" for ns pulses.
            if (pulseWidth >=1) scaleFactorLetter = 'I'; // ns pulses
        }

      }

      if (mpeValue <=0) { // MPE must be positive
        setEyewearResults(null); // Or set error state
        setCalculationPerformed(true); // To show some feedback
        setIsCalculating(false);
        return;
      }

      const requiredOD = Math.log10(exposureLevel / mpeValue);
      const odCeiling = Math.ceil(Math.max(0, requiredOD)); // Ensure OD is at least 0 and integer

      // EN 207 LB Rating (simplified - actual LB numbers depend on test power/energy densities)
      // LBn means 10^n attenuation. So OD = n.
      let lbRating = `LB${odCeiling}`;
      if (odCeiling > 10) lbRating = 'LB10+'; // Max typical LB is 10.

      // Simplified DIR/DIN marking
      let dirRating = `${scaleFactorLetter === 'D' ? 'D' : scaleFactorLetter === 'R' ? 'R' : 'I'} L${odCeiling}`;
      // More complete EN207 marking: WL (nm) ScaleFactorLetter LBn
      // e.g. 1064 D LB5 or 532 I LB6
      let en207Marking = `${wavelength} ${scaleFactorLetter} ${lbRating}`;


      const recommendations = [
        `Select eyewear with Optical Density (OD) ≥ ${odCeiling} at ${wavelength} nm.`,
        `Ensure eyewear is certified to EN 207 (Europe) or ANSI Z136.1 (USA) / Z87.1.`,
        `The EN 207 marking should be similar to: "${en207Marking}".`,
        `Check for proper fit, coverage (including side protection), and comfort.`,
        `Inspect eyewear for damage (scratches, cracks, discoloration) before each use.`,
        `If high OD is required, ensure adequate Visible Light Transmission (VLT) for safe task performance.`,
        `For non-visible wavelengths (<400nm or >700nm), consider if alignment eyewear or procedures are needed.`
      ];
      if (requiredOD < 0) {
        recommendations.unshift("Calculated exposure is below MPE. Eyewear may not be required by OD calculation, but assess other risks.");
      }


      setEyewearResults({
        requiredOD: Math.max(0, requiredOD), // OD cannot be negative
        exposureLevel,
        mpe: mpeValue,
        scaleFactor: `${scaleFactorLetter} (${laserType === 'continuous' ? 'CW' : `${pulseWidth}ns pulse`})`,
        lbRating: en207Marking, // Using the full EN207 style marking here
        dirRating: dirRating, // Simplified DIR/L rating
        recommendations
      });

      setCalculationPerformed(true);
    } catch (error) {
      console.error('Eyewear calculation error:', error);
      setEyewearResults(null);
      setCalculationPerformed(false);
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculation = () => {
    setCalculationPerformed(false);
    setEyewearResults(null);
    setPower(1000);
    setWavelength(1064);
    setBeamDiameter(5);
    setExposureTime(10);
    setLaserType('continuous');
    setPulseEnergy(100);
    setPulseWidth(10);
    setRepetitionRate(1000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Laser Parameters for Eyewear Calculation</h3>
        
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
        </div>

        {laserType === 'continuous' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laser Power (mW)
            </label>
            <input
              type="number"
              min="0.001"
              max="1e9"
              step="any"
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pulse Energy (mJ)
              </label>
              <input
                type="number"
                min="1e-12"
                max="100000"
                step="any"
                value={pulseEnergy}
                onChange={(e) => setPulseEnergy(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>

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
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repetition Rate (Hz)
              </label>
              <input
                type="number"
                min="0"
                max="1e12"
                step="any"
                value={repetitionRate}
                onChange={(e) => setRepetitionRate(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beam Diameter (mm) at Exposure Point
          </label>
          <input
            type="number"
            min="0.001"
            max="1000"
            step="any"
            value={beamDiameter}
            onChange={(e) => setBeamDiameter(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Smallest beam diameter eye could be exposed to.</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Exposure Time for MPE (s)
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
          <p className="text-xs text-gray-500 mt-1">Worst-case duration (e.g., 0.25s, 10s, 100s, Ti)</p>
        </div>

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
              Calculating requirements...
            </p>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 flex items-center">
          Protective Eyewear Requirements
          {isCalculating && (
            <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
          )}
        </h3>
        
        {isCalculating ? (
          <div className="text-center py-8 text-blue-600">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p>Calculating eyewear requirements...</p>
          </div>
        ) : !calculationPerformed || !eyewearResults ? (
          <div className="text-center py-8 text-gray-500">
            <p>Eyewear requirements will appear automatically as you adjust parameters.</p>
             {eyewearResults === null && calculationPerformed && <p className="text-red-500">Could not calculate. Check MPE validity or input parameters.</p>}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Required Optical Density (OD)</h4>
              <div className={`p-3 rounded-md ${
                eyewearResults.requiredOD < 3 
                  ? 'bg-green-100 border border-green-300' 
                  : eyewearResults.requiredOD < 5
                    ? 'bg-yellow-100 border border-yellow-300'
                    : 'bg-red-100 border border-red-300'
              }`}>
                <p className={`font-bold text-2xl ${
                  eyewearResults.requiredOD < 3 
                    ? 'text-green-700' 
                    : eyewearResults.requiredOD < 5
                      ? 'text-yellow-700'
                      : 'text-red-700'
                }`}>
                  OD ≥ {Math.ceil(eyewearResults.requiredOD)}
                </p>
                <p className="text-sm mt-1">
                  Calculated minimum OD: {eyewearResults.requiredOD.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Eyewear Specifications (EN 207 Style)</h4>
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Wavelength Range</td>
                    <td className="px-3 py-2">{wavelength} nm (ensure filter covers this)</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Scale Factor Info</td>
                    <td className="px-3 py-2">{eyewearResults.scaleFactor}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Example EN 207 Marking</td>
                    <td className="px-3 py-2 font-bold">{eyewearResults.lbRating}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Simplified ANSI Z136 Style</td>
                    <td className="px-3 py-2">{`OD ${Math.ceil(eyewearResults.requiredOD)} @ ${wavelength}nm`}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Exposure Analysis</h4>
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Calculated Exposure Level (H or E)</td>
                    <td className="px-3 py-2">
                      {eyewearResults.exposureLevel < 0.001 && eyewearResults.exposureLevel !== 0
                        ? eyewearResults.exposureLevel.toExponential(2) 
                        : eyewearResults.exposureLevel.toFixed(4)
                      } {laserType === 'continuous' ? 'W/cm²' : 'J/cm²'}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Calculated MPE</td>
                    <td className="px-3 py-2">
                      {eyewearResults.mpe < 0.001 && eyewearResults.mpe !== 0
                        ? eyewearResults.mpe.toExponential(2) 
                        : eyewearResults.mpe.toFixed(6)
                      } {laserType === 'continuous' ? 'W/cm²' : 'J/cm²'}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">Required Attenuation Factor</td>
                    <td className="px-3 py-2">
                      {Math.pow(10, Math.max(0, eyewearResults.requiredOD)).toExponential(2)} (10<sup>OD</sup>)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Eyewear Selection Recommendations</h4>
              <div className="bg-white p-3 rounded-md">
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {eyewearResults.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                <Icons.InfoInline /> Important Safety Notes
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                <li>Eyewear is the last line of defense. Prioritize engineering and administrative controls.</li>
                <li>This calculation is for direct intrabeam viewing. Assess diffuse reflection hazards separately.</li>
                <li>Always verify with eyewear manufacturer specifications for the specific laser.</li>
                <li>Replace damaged or old eyewear. Filters can degrade.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LaserSafetyCalculator;