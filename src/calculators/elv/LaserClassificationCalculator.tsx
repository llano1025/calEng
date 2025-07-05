import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  ClassificationResult, 
  MPE_CONSTANTS, 
  IEC_AEL_TABLES,
  calculateC5Factor,
  validatePulseParameters,
  calculateIrradiance,
  AELResult,
  getClassificationTimeBase,
  assessPulsedLaserAELs
} from './LaserSafetyShared';

interface LaserClassificationProps {
  onBack?: () => void;
  onShowTutorial?: () => void;
}

// Enhanced wavelength data interface with simplified pulsed configuration
interface WavelengthData {
  id: string;
  wavelength: number;
  laserType: 'continuous' | 'pulsed';
  power: number; // Value in selected unit
  powerUnit: 'mW' | 'J'; // Unit selection
  pulseEnergy: number; // mJ for pulsed (calculated from power × pulse width)
  pulseWidth: number; // ns for pulsed
  repetitionRate: number; // Hz for pulsed
  beamDivergence: number; // mrad
  isActive: boolean;
}

// ======================== ADDITIVE WAVELENGTH RULES (IEC 60825-1 Table 1) ========================

const ADDITIVE_WAVELENGTH_GROUPS = {
  VISIBLE_THERMAL: { min: 400, max: 700, name: 'Visible Thermal (400-700 nm)' },
  RETINAL_BROAD: { min: 400, max: 1400, name: 'Retinal Broad (400-1400 nm)' },
  LENS_DAMAGE: { min: 380, max: 1400, name: 'Lens Damage (380-1400 nm)' },
  UV_PHOTOCHEMICAL: { min: 200, max: 400, name: 'UV Photochemical (200-400 nm)' }
};

const determineAdditiveGroup = (wavelengths: number[]): string | null => {
  for (const [groupKey, group] of Object.entries(ADDITIVE_WAVELENGTH_GROUPS)) {
    if (wavelengths.every(wl => wl >= group.min && wl <= group.max)) {
      return group.name;
    }
  }
  return null;
};

// Helper function to get actual pulse energy - CORRECTED: Power (mW) × Pulse Width (ns)
const getActualPulseEnergy = (wl: WavelengthData): number => {
  if (wl.laserType !== 'pulsed') return 0;
  
  // Calculate pulse energy as Power (mW) × Pulse Width (ns) conversion
  // Power in mW × Pulse Width in ns = Energy in mJ (with proper unit conversion)
  const energyMJ = wl.power * wl.pulseWidth * 1e-6; // mW × ns = pJ, convert to mJ
  return energyMJ * MPE_CONSTANTS.MJ_TO_J; // Convert mJ to J
};

// ======================== ENHANCED EMISSION CALCULATION WITH IRRADIANCE ========================

const calculateEmissionWithIrradiance = (
  wl: WavelengthData,
  condition1Aperture: number,
  condition3Aperture: number,
  useManualPowers: boolean = false,
  condition1Power?: number,
  condition3Power?: number
): {
  emission: number;
  emissionUnit: string;
  condition1Emission: number;
  condition3Emission: number;
  condition1EmissionUnit: string;
  condition3EmissionUnit: string;
  calculations: string[];
} => {
  const calculations: string[] = [];
  let emission = 0;
  let emissionUnit = '';
  let condition1Emission = 0;
  let condition3Emission = 0;
  let condition1EmissionUnit = '';
  let condition3EmissionUnit = '';

  if (useManualPowers && condition1Power !== undefined && condition3Power !== undefined) {
    // Manual power input mode
    emission = Math.max(condition1Power, condition3Power);
    emissionUnit = 'W';
    condition1Emission = condition1Power;
    condition3Emission = condition3Power;
    condition1EmissionUnit = 'W';
    condition3EmissionUnit = 'W';
    
    calculations.push(`Manual power input mode:`);
    calculations.push(`Condition 1 emission: ${condition1Power.toExponential(3)} W`);
    calculations.push(`Condition 3 emission: ${condition3Power.toExponential(3)} W`);
  } else {
    // Calculate emission from laser parameters
    if (wl.laserType === 'continuous') {
      if (wl.powerUnit === 'mW') {
        emission = wl.power * MPE_CONSTANTS.MW_TO_W;
        emissionUnit = 'W';
      } else { // J unit selected for CW - treat as energy per time base
        emission = wl.power; // Assuming J as energy value
        emissionUnit = 'J';
      }
      calculations.push(`Continuous Wave (CW) laser:`);
      calculations.push(`Input: ${wl.power} ${wl.powerUnit}`);
      calculations.push(`Calculated emission: ${emission.toExponential(3)} ${emissionUnit}`);
    } else {
      // Pulsed laser - calculate pulse energy using corrected formula
      const pulseEnergyJ = getActualPulseEnergy(wl);
      
      calculations.push(`Pulsed laser:`);
      calculations.push(`Power: ${wl.power} mW`);
      calculations.push(`Pulse width: ${wl.pulseWidth} ns`);
      calculations.push(`Calculated pulse energy: ${wl.power} mW × ${wl.pulseWidth} ns × 10^-6 = ${(pulseEnergyJ * 1000).toFixed(6)} mJ = ${pulseEnergyJ.toExponential(3)} J`);
      
      if (wl.powerUnit === 'J') {
        emission = wl.power;
        emissionUnit = 'J';
        calculations.push(`Using power unit input: ${wl.power} J`);
      } else {
        emission = pulseEnergyJ;
        emissionUnit = 'J';
        calculations.push(`Using calculated pulse energy: ${pulseEnergyJ.toExponential(3)} J`);
      }
    }

    calculations.push(`Final emission: ${emission.toExponential(3)} ${emissionUnit}`);

    // Use same emission for both conditions unless irradiance calculation needed
    condition1Emission = emission;
    condition3Emission = emission;
    condition1EmissionUnit = emissionUnit;
    condition3EmissionUnit = emissionUnit;
  }

  return {
    emission,
    emissionUnit,
    condition1Emission,
    condition3Emission,
    condition1EmissionUnit,
    condition3EmissionUnit,
    calculations
  };
};

// ======================== ENHANCED CLASSIFICATION WITH IRRADIANCE SUPPORT ========================

const compareEmissionWithAEL = (
  emission: number,
  emissionUnit: string,
  aelResult: AELResult,
  apertureDiameterMm: number,
  calculations: string[]
): { passes: boolean; ratio: number; comparisonDetails: string[] } => {
  const comparisonDetails: string[] = [];
  let passes = false;
  let ratio = 0;

  if (aelResult.unit.includes('/m²') && apertureDiameterMm > 0) {
    // AEL has area units (J/m² or W/m²), need to calculate irradiance
    const isEnergy = aelResult.unit.includes('J');
    const irradianceCalc = calculateIrradiance(emission, apertureDiameterMm, isEnergy);
    
    comparisonDetails.push(`AEL requires irradiance calculation (${aelResult.unit}):`);
    comparisonDetails.push(`Aperture diameter: ${apertureDiameterMm} mm`);
    comparisonDetails.push(`Aperture area: ${(irradianceCalc.apertureArea * 1e6).toFixed(3)} mm² = ${irradianceCalc.apertureArea.toExponential(3)} m²`);
    comparisonDetails.push(`Emission: ${emission.toExponential(3)} ${emissionUnit}`);
    comparisonDetails.push(`Calculated irradiance: ${irradianceCalc.irradiance.toExponential(3)} ${irradianceCalc.unit}`);
    comparisonDetails.push(`AEL: ${aelResult.value.toExponential(3)} ${aelResult.unit}`);
    
    ratio = irradianceCalc.irradiance / aelResult.value;
    passes = irradianceCalc.irradiance <= aelResult.value;
    
    comparisonDetails.push(`Comparison: ${irradianceCalc.irradiance.toExponential(3)} ${passes ? '≤' : '>'} ${aelResult.value.toExponential(3)} ${aelResult.unit}`);
    comparisonDetails.push(`Ratio: ${ratio.toFixed(4)}`);
  } else if (aelResult.unit.includes('/m²') && apertureDiameterMm === 0) {
    // AEL requires irradiance but aperture is zero - cannot compare
    comparisonDetails.push(`ERROR: AEL has irradiance units (${aelResult.unit}) but aperture diameter is 0 mm`);
    comparisonDetails.push(`Cannot perform irradiance comparison`);
    passes = false;
    ratio = Infinity;
  } else {
    // Direct power/energy comparison
    comparisonDetails.push(`Direct comparison:`);
    comparisonDetails.push(`Emission: ${emission.toExponential(3)} ${emissionUnit}`);
    comparisonDetails.push(`AEL: ${aelResult.value.toExponential(3)} ${aelResult.unit}`);
    
    // Check if units are compatible
    const emissionIsEnergy = emissionUnit.includes('J');
    const aelIsEnergy = aelResult.unit.includes('J');
    
    if (emissionIsEnergy === aelIsEnergy) {
      ratio = emission / aelResult.value;
      passes = emission <= aelResult.value;
      comparisonDetails.push(`Comparison: ${emission.toExponential(3)} ${passes ? '≤' : '>'} ${aelResult.value.toExponential(3)} ${aelResult.unit}`);
      comparisonDetails.push(`Ratio: ${ratio.toFixed(4)}`);
    } else {
      comparisonDetails.push(`ERROR: Unit mismatch - emission (${emissionUnit}) vs AEL (${aelResult.unit})`);
      passes = false;
      ratio = NaN;
    }
  }

  return { passes, ratio, comparisonDetails };
};

// ======================== MULTIPLE WAVELENGTH CLASSIFICATION ========================

const classifyMultipleWavelengths = (
  wavelengths: WavelengthData[],
  exposureTime: number,
  beamDiameter: number = 7,
  useManualPowers: boolean = false,
  condition1Power?: number,
  condition3Power?: number
): ClassificationResult => {
  const steps: string[] = [];
  const activeWavelengths = wavelengths.filter(w => w.isActive);
  
  steps.push(`=== IEC 60825-1:2014 Multiple Wavelength Classification ===`);
  steps.push(`Number of active wavelengths: ${activeWavelengths.length}`);
  steps.push(`Exposure time base: ${exposureTime} s`);
  steps.push(`Beam diameter: ${beamDiameter} mm`);
  
  if (useManualPowers && condition1Power !== undefined && condition3Power !== undefined) {
    steps.push(`Manual power input mode:`);
    steps.push(`Condition 1 received power: ${condition1Power.toExponential(3)} W`);
    steps.push(`Condition 3 received power: ${condition3Power.toExponential(3)} W`);
  }
  
  steps.push(`\n--- Wavelength Details ---`);
  activeWavelengths.forEach((wl, index) => {
    steps.push(`Wavelength ${index + 1}: ${wl.wavelength} nm (${wl.laserType.toUpperCase()})`);
    steps.push(`  Power/Energy: ${wl.power} ${wl.powerUnit}`);
    if (wl.laserType === 'pulsed') {
      const calculatedPulseEnergy = wl.power * wl.pulseWidth * 1e-6; // mW × ns × 10^-6 = mJ
      steps.push(`  Pulse Energy (calculated): ${calculatedPulseEnergy.toFixed(6)} mJ = ${wl.power} mW × ${wl.pulseWidth} ns × 10^-6`);
      steps.push(`  Pulse Width: ${wl.pulseWidth} ns`);
      steps.push(`  Repetition Rate: ${wl.repetitionRate} Hz ${wl.repetitionRate === 0 ? '(single pulse)' : ''}`);
    }
    steps.push(`  Beam Divergence: ${wl.beamDivergence} mrad`);
  });
  
  // Check if wavelengths are additive
  const wavelengthValues = activeWavelengths.map(w => w.wavelength);
  const additiveGroup = determineAdditiveGroup(wavelengthValues);
  
  steps.push(`\n--- Additive Rule Determination (IEC 60825-1 Table 1) ---`);
  steps.push(`Checking if wavelengths affect the same biological endpoint...`);
  
  // Show detailed additive group checking
  for (const [groupKey, group] of Object.entries(ADDITIVE_WAVELENGTH_GROUPS)) {
    const allInGroup = wavelengthValues.every(wl => wl >= group.min && wl <= group.max);
    steps.push(`${group.name}: ${allInGroup ? 'YES ✓' : 'NO ✗'}`);
    steps.push(`  Range: ${group.min}-${group.max} nm`);
    steps.push(`  Wavelengths in range: ${wavelengthValues.filter(wl => wl >= group.min && wl <= group.max).join(', ')} nm`);
  }
  
  if (additiveGroup) {
    steps.push(`\nWavelengths are ADDITIVE for: ${additiveGroup}`);
    steps.push(`Classification method: Sum-of-ratios per IEC 60825-1`);
    steps.push(`Rule: Σ(Emission_i / AEL_i) ≤ 1.0 for each class`);
    
    return classifyAdditiveWavelengths(activeWavelengths, exposureTime, beamDiameter, additiveGroup, steps, useManualPowers, condition1Power, condition3Power);
  } else {
    steps.push(`\nWavelengths are NON-ADDITIVE`);
    steps.push(`Classification method: Independent classification per IEC 60825-1`);
    steps.push(`Rule: Classify each wavelength individually, assign highest class`);
    
    return classifyIndependentWavelengths(activeWavelengths, exposureTime, beamDiameter, steps, useManualPowers, condition1Power, condition3Power);
  }
};

// Additive wavelength classification (sum of ratios)
const classifyAdditiveWavelengths = (
  wavelengths: WavelengthData[],
  exposureTime: number,
  beamDiameter: number,
  additiveGroup: string,
  steps: string[],
  useManualPowers: boolean,
  condition1Power?: number,
  condition3Power?: number
): ClassificationResult => {
  steps.push(`\n--- Additive Classification Process ---`);
  steps.push(`Additive region: ${additiveGroup}`);
  steps.push(`Number of wavelengths: ${wavelengths.length}`);
  
  const conditions = IEC_AEL_TABLES.getMeasurementConditions(wavelengths[0].wavelength, exposureTime);
  
  const classesToTest = ['Class 1', 'Class 2', 'Class 3R', 'Class 3B'];
  
  for (const testClass of classesToTest) {
    steps.push(`\n--- Testing ${testClass} with Additive Rule ---`);
    steps.push(`Using sum-of-ratios method: Σ(Emission_i / AEL_i) ≤ 1.0`);
    
    let sumCondition1 = 0;
    let sumCondition3 = 0;
    const currentRatios: number[] = [];
    
    for (let i = 0; i < wavelengths.length; i++) {
      const wl = wavelengths[i];
      
      // Calculate emission for this wavelength
      const emissionCalc = calculateEmissionWithIrradiance(
        wl, conditions.condition1.aperture, conditions.condition3.aperture,
        useManualPowers, condition1Power, condition3Power
      );
      
      // Calculate C5 for pulsed lasers - CORRECTED: Use T2 from correction factors
      let c5Factor = 1.0;
      if (wl.laserType === 'pulsed') {
        if (wl.repetitionRate === 0) {
          // Single pulse operation
          steps.push(`  λ${i+1} Single pulse operation: C5 = 1.0`);
        } else if (wl.repetitionRate > 0) {
          const corrections = IEC_AEL_TABLES.getCorrectionFactors(wl.wavelength, exposureTime, wl.beamDivergence);
          const t2 = corrections.T2; // Use T2 instead of exposureTime
          const numberOfPulses = Math.floor(t2 * wl.repetitionRate);
          if (numberOfPulses > 1) {
            const c5Details = calculateC5Factor(wl.wavelength, wl.pulseWidth, wl.repetitionRate, t2);
            c5Factor = c5Details.c5Factor;
            steps.push(`  λ${i+1} C5 correction (using T2=${t2}s): ${c5Factor.toFixed(4)}`);
          } else {
            steps.push(`  λ${i+1} Single pulse in T2 window: C5 = 1.0`);
          }
        }
      }
      
      // Get AEL for this class and wavelength
      let aelResult: AELResult;
      switch (testClass) {
        case 'Class 1':
          aelResult = IEC_AEL_TABLES.getClass1AEL(wl.wavelength, exposureTime, c5Factor);
          break;
        case 'Class 2':
          if (IEC_AEL_TABLES.supportsClass2(wl.wavelength)) {
            aelResult = IEC_AEL_TABLES.getClass2AEL(wl.wavelength, exposureTime, c5Factor);
          } else {
            aelResult = IEC_AEL_TABLES.getClass1AEL(wl.wavelength, exposureTime, c5Factor);
          }
          break;
        case 'Class 3R':
          aelResult = IEC_AEL_TABLES.getClass3RAEL(wl.wavelength, exposureTime, c5Factor);
          break;
        case 'Class 3B':
          aelResult = IEC_AEL_TABLES.getClass3BAEL(wl.wavelength, exposureTime, c5Factor);
          break;
        default:
          aelResult = { value: 0, unit: 'W' };
      }
      
      // Compare with both conditions
      const condition1Compare = compareEmissionWithAEL(
        emissionCalc.condition1Emission, emissionCalc.condition1EmissionUnit, 
        aelResult, conditions.condition1.aperture, []
      );
      const condition3Compare = compareEmissionWithAEL(
        emissionCalc.condition3Emission, emissionCalc.condition3EmissionUnit, 
        aelResult, conditions.condition3.aperture, []
      );
      
      currentRatios.push(Math.max(condition1Compare.ratio, condition3Compare.ratio));
      sumCondition1 += condition1Compare.ratio;
      sumCondition3 += condition3Compare.ratio;
      
      steps.push(`  λ${i+1} (${wl.wavelength}nm): Emission=${emissionCalc.emission.toExponential(3)} ${emissionCalc.emissionUnit}, AEL=${aelResult.value.toExponential(3)} ${aelResult.unit}`);
      steps.push(`    Ratios: C1=${condition1Compare.ratio.toFixed(4)}, C3=${condition3Compare.ratio.toFixed(4)}`);
    }
    
    steps.push(`  Sum of ratios (Condition 1): ${sumCondition1.toFixed(4)}`);
    steps.push(`  Sum of ratios (Condition 3): ${sumCondition3.toFixed(4)}`);
    steps.push(`  Required: Sum ≤ 1.0 for both conditions`);
    
    if (sumCondition1 <= 1.0 && sumCondition3 <= 1.0) {
      steps.push(`  ${testClass} additive test: PASS ✓ (sum ≤ 1.0)`);
      steps.push(`\nResult: ${testClass} (additive classification)`);
      
      const totalEmission = wavelengths.reduce((sum, wl) => {
        const emissionCalc = calculateEmissionWithIrradiance(wl, 0, 0);
        return sum + emissionCalc.emission;
      }, 0);
      
      return createAdditiveResult(testClass, totalEmission, Math.max(sumCondition1, sumCondition3), wavelengths, currentRatios, additiveGroup, steps);
    } else {
      steps.push(`  ${testClass} additive test: FAIL ✗ (sum > 1.0)`);
    }
  }
  
  steps.push(`\nAll lower class additive tests failed`);
  steps.push(`Result: Class 4 (additive classification)`);
  
  const totalEmission = wavelengths.reduce((sum, wl) => {
    const emissionCalc = calculateEmissionWithIrradiance(wl, 0, 0);
    return sum + emissionCalc.emission;
  }, 0);
  
  return createAdditiveResult('Class 4', totalEmission, 999, wavelengths, [], additiveGroup, steps);
};

// Independent wavelength classification (highest individual class)
const classifyIndependentWavelengths = (
  wavelengths: WavelengthData[],
  exposureTime: number,
  beamDiameter: number,
  steps: string[],
  useManualPowers: boolean,
  condition1Power?: number,
  condition3Power?: number
): ClassificationResult => {
  steps.push(`\n--- Independent Classification Process ---`);
  steps.push(`Wavelengths are NON-ADDITIVE`);
  steps.push(`Method: Individual classification of each wavelength, highest class assigned`);
  steps.push(`Number of wavelengths to classify: ${wavelengths.length}`);
  
  let highestClass = 'Class 1';
  let highestClassNumeric = 1;
  const individualResults: any[] = [];
  
  for (let i = 0; i < wavelengths.length; i++) {
    const wl = wavelengths[i];
    
    const emissionCalc = calculateEmissionWithIrradiance(wl, 0, 0, useManualPowers, condition1Power, condition3Power);
    
    steps.push(`\n--- Individual Classification ${i+1}: ${wl.wavelength} nm (${wl.laserType.toUpperCase()}) ---`);
    steps.push(`Emission: ${emissionCalc.emission.toExponential(3)} ${emissionCalc.emissionUnit}`);
    
    const result = classifyLaserIECSingle(
      wl.wavelength,
      emissionCalc.emission,
      emissionCalc.emissionUnit,
      exposureTime,
      beamDiameter,
      wl.laserType,
      wl.laserType === 'pulsed' ? wl.pulseWidth : undefined,
      wl.laserType === 'pulsed' ? wl.repetitionRate : undefined,
      wl.beamDivergence,
      useManualPowers,
      condition1Power,
      condition3Power
    );
    
    individualResults.push(result);
    steps.push(`Individual classification result: ${result.laserClass}`);
    
    const classNumeric = getClassNumeric(result.laserClass);
    if (classNumeric > highestClassNumeric) {
      highestClass = result.laserClass;
      highestClassNumeric = classNumeric;
      steps.push(`New highest class found: ${highestClass}`);
    } else {
      steps.push(`Current highest class remains: ${highestClass}`);
    }
  }
  
  steps.push(`\n--- Independent Classification Summary ---`);
  steps.push(`Individual results:`);
  individualResults.forEach((result, index) => {
    steps.push(`  Wavelength ${index + 1} (${wavelengths[index].wavelength} nm): ${result.laserClass}`);
  });
  steps.push(`Highest individual class: ${highestClass}`);
  steps.push(`\nResult: ${highestClass} (independent classification - highest individual class)`);
  
  const totalEmission = wavelengths.reduce((sum, wl) => {
    const emissionCalc = calculateEmissionWithIrradiance(wl, 0, 0);
    return sum + emissionCalc.emission;
  }, 0);
  
  return createIndependentResult(highestClass, totalEmission, 'W', wavelengths, individualResults, steps);
};

const getClassNumeric = (laserClass: string): number => {
  if (laserClass.includes('Class 1')) return 1;
  if (laserClass.includes('Class 2')) return 2;
  if (laserClass.includes('Class 3R')) return 3;
  if (laserClass.includes('Class 3B')) return 4;
  if (laserClass.includes('Class 4')) return 5;
  return 0;
};

// ======================== SINGLE WAVELENGTH CLASSIFICATION ========================

// ======================== ENHANCED SINGLE WAVELENGTH CLASSIFICATION (IEC 60825-1 COMPLIANT) ========================

const classifyLaserIECSingle = (
  wavelength: number,
  emission: number,
  emissionUnit: string,
  exposureTime: number,
  beamDiameter: number = 7,
  laserType: 'continuous' | 'pulsed' = 'continuous',
  pulseWidth?: number,
  repetitionRate?: number,
  beamDivergence?: number,
  useManualPowers: boolean = false,
  condition1Power?: number,
  condition3Power?: number
): ClassificationResult => {
  const steps: string[] = [];
  
  steps.push(`=== IEC 60825-1:2014 Single Wavelength Classification ===`);
  steps.push(`Wavelength: ${wavelength} nm`);
  steps.push(`Laser type: ${laserType.toUpperCase()}`);
  
  if (useManualPowers && condition1Power !== undefined && condition3Power !== undefined) {
    steps.push(`Manual power input mode:`);
    steps.push(`Condition 1 received power: ${condition1Power.toExponential(3)} W`);
    steps.push(`Condition 3 received power: ${condition3Power.toExponential(3)} W`);
  } else {
    steps.push(`Emission: ${emission.toExponential(3)} ${emissionUnit}`);
    steps.push(`Beam diameter: ${beamDiameter} mm`);
  }
  
  steps.push(`Exposure time base: ${exposureTime} s`);
  if (beamDivergence !== undefined) {
    steps.push(`Beam divergence: ${beamDivergence} mrad`);
  }

  // Step 1: Wavelength range validation
  steps.push(`\n=== Wavelength Range Validation ===`);
  if (wavelength < 180 || wavelength > 1e6) {
    steps.push(`ERROR: Wavelength ${wavelength} nm outside IEC 60825-1 scope (180 nm - 1 mm)`);
    return createErrorResult('Invalid Wavelength Range', steps);
  }
  steps.push(`Wavelength within IEC 60825-1 scope: 180 nm - 1,000,000 nm ✓`);

  // Step 2: Calculate C5 for pulsed lasers - CORRECTED: Use T2 from correction factors
  steps.push(`\n=== Laser Type and C5 Calculation ===`);
  let c5Factor = 1.0;
  let c5Details = null;

  if (laserType === 'pulsed') {
    steps.push(`Pulsed laser detected`);
    
    if (pulseWidth && repetitionRate !== undefined) {
      if (repetitionRate === 0) {
        steps.push(`Single pulse operation (repetition rate = 0 Hz)`);
        steps.push(`C5 correction factor: 1.0 (single pulse)`);
      } else if (repetitionRate > 0) {
        // CORRECTED: Use T2 from correction factors instead of exposureTime
        const corrections = IEC_AEL_TABLES.getCorrectionFactors(wavelength, exposureTime, beamDivergence);
        const t2 = corrections.T2;
        const numberOfPulses = Math.floor(t2 * repetitionRate);
        
        steps.push(`Using T2 = ${t2} s from correction factors for C5 calculation`);
        
        if (numberOfPulses <= 1) {
          steps.push(`Single pulse operation in T2 window (N=${numberOfPulses})`);
        } else {
          c5Details = calculateC5Factor(wavelength, pulseWidth, repetitionRate, t2, beamDivergence);
          c5Factor = c5Details.c5Factor;
          c5Details.c5Steps.forEach(step => steps.push(`  ${step}`));
        }
      }
    }
  } else {
    steps.push(`Continuous Wave (CW) operation`);
  }

  // Step 3: Get measurement conditions
  steps.push(`\n=== Measurement Conditions ===`);
  const conditions = IEC_AEL_TABLES.getMeasurementConditions(wavelength, exposureTime);
  const isC1Applied = !((wavelength < 302.5) || (wavelength >= 4000 && wavelength <= 1e6));
  
  steps.push(`Condition 1: ${isC1Applied ? `Aperture ${conditions.condition1.aperture.toFixed(1)}mm at ${conditions.condition1.distance}mm` : 'NOT APPLIED (wavelength exemption)'}`);
  steps.push(`Condition 3: Aperture ${conditions.condition3.aperture.toFixed(1)}mm at ${conditions.condition3.distance}mm`);

  // Step 4: Sequential classification with proper time bases and multiple AEL assessment
  const testClassWithMultipleAELs = (className: 'Class 1' | 'Class 2' | 'Class 3R' | 'Class 3B', testTimeBase: number) => {
    steps.push(`\n=== Testing ${className} ===`);
    steps.push(`Time base for ${className}: ${testTimeBase} s`);
    
    let condition1Pass = true;
    let condition3Pass = true;
    let condition1Emission = emission;
    let condition3Emission = emission;
    let condition1EmissionUnit = emissionUnit;
    let condition3EmissionUnit = emissionUnit;
    let condition1Compare: { passes: boolean; ratio: number; comparisonDetails: string[] } = { passes: true, ratio: 0, comparisonDetails: [] };
    
    if (useManualPowers && condition1Power !== undefined && condition3Power !== undefined) {
      condition1Emission = condition1Power;
      condition3Emission = condition3Power;
      condition1EmissionUnit = 'W';
      condition3EmissionUnit = 'W';
    }

    // For pulsed lasers, use multiple AEL assessment - CORRECTED: Use pulse width
    if (laserType === 'pulsed' && repetitionRate !== undefined && repetitionRate >= 0 && pulseWidth) {
      const effectiveRepetitionRate = repetitionRate || 1;
      const aelAssessment = assessPulsedLaserAELs(className, wavelength, testTimeBase, effectiveRepetitionRate, c5Factor, pulseWidth);
      
      steps.push(`Multiple AEL Assessment for ${className}:`);
      if (repetitionRate === 0) {
        steps.push(`  Single pulse operation (treating as 1 Hz for AEL assessment)`);
      }
      aelAssessment.calculationSteps.forEach(step => steps.push(`  ${step}`));
      
      const mostRestrictiveAEL = aelAssessment.mostRestrictiveAEL;
      const aelResult: AELResult = { value: mostRestrictiveAEL, unit: 'J' };
      
      // Compare with both conditions
      if (isC1Applied) {
        condition1Compare = compareEmissionWithAEL(
          condition1Emission, condition1EmissionUnit, aelResult, conditions.condition1.aperture, []
        );
        condition1Pass = condition1Compare.passes;
        steps.push(`Condition 1: ${condition1Compare.comparisonDetails.join(', ')} - ${condition1Pass ? 'PASS' : 'FAIL'}`);
      } else {
        steps.push(`Condition 1: NOT APPLIED (wavelength exemption)`);
      }
      
      const condition3Compare = compareEmissionWithAEL(
        condition3Emission, condition3EmissionUnit, aelResult, conditions.condition3.aperture, []
      );
      condition3Pass = condition3Compare.passes;
      steps.push(`Condition 3: ${condition3Compare.comparisonDetails.join(', ')} - ${condition3Pass ? 'PASS' : 'FAIL'}`);
      
      return { 
        aelResult, 
        condition1Pass, 
        condition3Pass, 
        bothPass: condition1Pass && condition3Pass,
        condition1Ratio: isC1Applied ? condition1Compare.ratio : 0,
        condition3Ratio: condition3Compare.ratio,
        aelAssessment
      };
    } else {
      // For CW lasers, use single AEL calculation
      let getAEL: (wl: number, t: number, c5: number) => AELResult;
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
      
      const aelResult = getAEL(wavelength, testTimeBase, c5Factor);
      steps.push(`${className} AEL = ${aelResult.value.toExponential(3)} ${aelResult.unit}`);
      
      // Compare with both conditions
      if (isC1Applied) {
        condition1Compare = compareEmissionWithAEL(
          condition1Emission, condition1EmissionUnit, aelResult, conditions.condition1.aperture, []
        );
        condition1Pass = condition1Compare.passes;
        steps.push(`Condition 1: ${condition1Compare.comparisonDetails.join(', ')} - ${condition1Pass ? 'PASS' : 'FAIL'}`);
      } else {
        steps.push(`Condition 1: NOT APPLIED (wavelength exemption)`);
      }
      
      const condition3Compare = compareEmissionWithAEL(
        condition3Emission, condition3EmissionUnit, aelResult, conditions.condition3.aperture, []
      );
      condition3Pass = condition3Compare.passes;
      steps.push(`Condition 3: ${condition3Compare.comparisonDetails.join(', ')} - ${condition3Pass ? 'PASS' : 'FAIL'}`);
      
      return { 
        aelResult, 
        condition1Pass, 
        condition3Pass, 
        bothPass: condition1Pass && condition3Pass,
        condition1Ratio: isC1Applied ? condition1Compare.ratio : 0,
        condition3Ratio: condition3Compare.ratio
      };
    }
  };

  // Sequential class testing with proper time bases
  
  // Test Class 1 with general time base
  const generalTimeBase = getClassificationTimeBase(wavelength);
  const class1Test = testClassWithMultipleAELs('Class 1', generalTimeBase);
  
  if (class1Test.bothPass) {
    steps.push(`\n=== RESULT: Class 1 ===`);
    steps.push(`Both conditions satisfied for Class 1`);
    return createSingleResult('Class 1', class1Test.aelResult, emission, emissionUnit, steps, 
      class1Test.condition1Pass, class1Test.condition3Pass, false, c5Details);
  }

  // Check for Class 1M (only if within 302.5-4000 nm range and large beam)
  if (wavelength >= 302.5 && wavelength <= 4000 && 
      IEC_AEL_TABLES.requiresClassM(wavelength, beamDiameter) && isC1Applied) {
    steps.push(`\n=== Checking Class 1M ===`);
    steps.push(`Wavelength in range 302.5-4000 nm and beam diameter > 7mm`);
    const class3BAELResult = IEC_AEL_TABLES.getClass3BAEL(wavelength, generalTimeBase, c5Factor);
    
    const class3BCompare = compareEmissionWithAEL(emission, emissionUnit, class3BAELResult, conditions.condition1.aperture, []);
    
    if (!class1Test.condition1Pass && class1Test.condition3Pass && class3BCompare.passes) {
      steps.push(`Class 1M conditions satisfied:`);
      steps.push(`  - Condition 1 > Class 1 AEL: YES ✓`);
      steps.push(`  - Condition 3 ≤ Class 1 AEL: YES ✓`);
      steps.push(`  - Condition 1 ≤ Class 3B AEL: YES ✓`);
      steps.push(`\n=== RESULT: Class 1M ===`);
      return createSingleResult('Class 1M', class1Test.aelResult, emission, emissionUnit, steps, 
        false, true, true, c5Details);
    }
  }

  // Test Class 2 (only for visible wavelengths 400-700 nm)
  let class2Test = null;
  if (IEC_AEL_TABLES.supportsClass2(wavelength)) {
    // CORRECTED: Use 0.25s time base for Class 2 testing in visible range
    const visibleTimeBase = 0.25;
    class2Test = testClassWithMultipleAELs('Class 2', visibleTimeBase);
    
    if (class2Test.bothPass) {
      steps.push(`\n=== RESULT: Class 2 ===`);
      steps.push(`Visible wavelength, both conditions satisfied for Class 2`);
      return createSingleResult('Class 2', class2Test.aelResult, emission, emissionUnit, steps, 
        class2Test.condition1Pass, class2Test.condition3Pass, false, c5Details);
    }

    // Check for Class 2M
    if (IEC_AEL_TABLES.requiresClassM(wavelength, beamDiameter) && isC1Applied) {
      steps.push(`\n=== Checking Class 2M ===`);
      const class3BAELResult = IEC_AEL_TABLES.getClass3BAEL(wavelength, generalTimeBase, c5Factor);
      const class3BCompare = compareEmissionWithAEL(emission, emissionUnit, class3BAELResult, conditions.condition1.aperture, []);
      
      if (!class2Test.condition1Pass && class2Test.condition3Pass && class3BCompare.passes) {
        steps.push(`Class 2M conditions satisfied:`);
        steps.push(`\n=== RESULT: Class 2M ===`);
        return createSingleResult('Class 2M', class2Test.aelResult, emission, emissionUnit, steps, 
          false, true, true, c5Details);
      }
    }
  }

  // Test Class 3R with appropriate time base
  // CORRECTED: Use 0.25s time base for Class 3R in visible range per IEC 60825-1
  const timeBase3R = (wavelength >= 400 && wavelength <= 700) ? 0.25 : generalTimeBase;
  const class3RTest = testClassWithMultipleAELs('Class 3R', timeBase3R);
  
  if (class3RTest.bothPass) {
    // Check prerequisites: must exceed Class 1 and Class 2 (if applicable) for Condition 3
    steps.push(`\n=== Verifying Class 3R Prerequisites ===`);
    
    let prerequisitesMet = true;
    
    // Must exceed Class 1 for Condition 3
    if (class1Test.condition3Pass) {
      steps.push(`ERROR: Does not exceed Class 1 AEL for Condition 3`);
      prerequisitesMet = false;
    } else {
      steps.push(`Exceeds Class 1 AEL for Condition 3: YES ✓`);
    }
    
    // Must exceed Class 2 for Condition 3 (if applicable for visible wavelengths)
    if (class2Test && class2Test.condition3Pass) {
      steps.push(`ERROR: Does not exceed Class 2 AEL for Condition 3 (visible wavelength)`);
      prerequisitesMet = false;
    } else if (class2Test) {
      steps.push(`Exceeds Class 2 AEL for Condition 3: YES ✓`);
    }
    
    if (prerequisitesMet) {
      steps.push(`\n=== RESULT: Class 3R ===`);
      steps.push(`Both conditions and prerequisites satisfied for Class 3R`);
      return createSingleResult('Class 3R', class3RTest.aelResult, emission, emissionUnit, steps, 
        class3RTest.condition1Pass, class3RTest.condition3Pass, false, c5Details);
    } else {
      steps.push(`Class 3R prerequisites not met, continuing to Class 3B...`);
    }
  }

  // Test Class 3B - CORRECTED: Use general time base (100s), not 0.25s
  const class3BTest = testClassWithMultipleAELs('Class 3B', generalTimeBase);
  
  if (class3BTest.bothPass) {
    steps.push(`\n=== Verifying Class 3B Prerequisites ===`);
    
    let prerequisitesMet = true;
    
    // Must exceed Class 3R for Condition 1 OR Condition 3
    if (!class3RTest.condition1Pass || !class3RTest.condition3Pass) {
      steps.push(`Exceeds Class 3R AEL for at least one condition: YES ✓`);
    } else {
      steps.push(`ERROR: Does not exceed Class 3R AEL for either condition`);
      prerequisitesMet = false;
    }
    
    // Must exceed Class 1 and Class 2 for Condition 3
    if (class1Test.condition3Pass) {
      steps.push(`ERROR: Does not exceed Class 1 AEL for Condition 3`);
      prerequisitesMet = false;
    } else {
      steps.push(`Exceeds Class 1 AEL for Condition 3: YES ✓`);
    }
    
    if (class2Test && class2Test.condition3Pass) {
      steps.push(`ERROR: Does not exceed Class 2 AEL for Condition 3`);
      prerequisitesMet = false;
    } else if (class2Test) {
      steps.push(`Exceeds Class 2 AEL for Condition 3: YES ✓`);
    }
    
    if (prerequisitesMet) {
      steps.push(`\n=== RESULT: Class 3B ===`);
      steps.push(`Both conditions and prerequisites satisfied for Class 3B`);
      return createSingleResult('Class 3B', class3BTest.aelResult, emission, emissionUnit, steps, 
        class3BTest.condition1Pass, class3BTest.condition3Pass, false, c5Details);
    } else {
      steps.push(`Class 3B prerequisites not met, assigning Class 4...`);
    }
  }

  // Class 4 (exceeds Class 3B or prerequisites not met)
  steps.push(`\n=== RESULT: Class 4 ===`);
  if (!class3BTest.bothPass) {
    steps.push(`Emission exceeds Class 3B AEL limits`);
  } else {
    steps.push(`Lower class prerequisites not satisfied`);
  }
  
  return createSingleResult('Class 4', class3BTest.aelResult, emission, emissionUnit, steps, 
    false, false, false, c5Details);
};

// Helper functions for creating results
const createSingleResult = (
  laserClass: string,
  aelResult: AELResult,
  emission: number,
  emissionUnit: string,
  steps: string[],
  condition1Test: boolean,
  condition3Test: boolean,
  requiresClassM: boolean,
  c5Details?: any
): ClassificationResult => {
  return {
    laserClass,
    classificationMethod: 'single',
    ael: aelResult.value,
    aelUnit: aelResult.unit,
    measuredEmission: emission,
    emissionUnit,
    ratio: emission / aelResult.value,
    classDescription: getClassDescription(laserClass),
    safetyRequirements: getSafetyRequirements(laserClass),
    condition1Test,
    condition3Test,
    requiresClassM,
    iecCompliant: true,
    condition1Emission: emission,
    condition3Emission: emission,
    condition1AEL: aelResult.value,
    condition3AEL: aelResult.value,
    condition1AELUnit: aelResult.unit,
    condition3AELUnit: aelResult.unit,
    classificationSteps: steps,
    c5Correction: c5Details ? {
      c5Factor: c5Details.c5Factor,
      c5Steps: c5Details.c5Steps
    } : undefined
  };
};

const createAdditiveResult = (
  laserClass: string,
  totalEmission: number,
  sumOfRatios: number,
  wavelengths: WavelengthData[],
  ratios: number[],
  additiveGroup: string,
  steps: string[]
): ClassificationResult => {
  return {
    laserClass,
    classificationMethod: 'additive',
    ael: 1.0,
    aelUnit: 'dimensionless',
    measuredEmission: totalEmission,
    emissionUnit: 'W',
    ratio: sumOfRatios,
    classDescription: getClassDescription(laserClass),
    safetyRequirements: getSafetyRequirements(laserClass),
    condition1Test: sumOfRatios <= 1.0,
    condition3Test: sumOfRatios <= 1.0,
    requiresClassM: false,
    iecCompliant: true,
    condition1Emission: totalEmission,
    condition3Emission: totalEmission,
    condition1AEL: 1.0,
    condition3AEL: 1.0,
    condition1AELUnit: 'dimensionless',
    condition3AELUnit: 'dimensionless',
    classificationSteps: steps,
    additiveCalculation: {
      wavelengths: wavelengths.map(wl => ({
        id: wl.id,
        wavelength: wl.wavelength,
        power: wl.power,
        pulseEnergy: wl.pulseEnergy,
        pulseWidth: wl.pulseWidth,
        angularSubtense: wl.beamDivergence,
        isActive: wl.isActive
      })),
      ratios,
      sumOfRatios,
      additiveRegion: additiveGroup,
      calculationSteps: steps
    }
  };
};

const createIndependentResult = (
  laserClass: string,
  totalEmission: number,
  emissionUnit: string,
  wavelengths: WavelengthData[],
  individualResults: any[],
  steps: string[]
): ClassificationResult => {
  return {
    laserClass,
    classificationMethod: 'single',
    ael: 0,
    aelUnit: 'W',
    measuredEmission: totalEmission,
    emissionUnit,
    ratio: 0,
    classDescription: getClassDescription(laserClass),
    safetyRequirements: getSafetyRequirements(laserClass),
    condition1Test: true,
    condition3Test: true,
    requiresClassM: false,
    iecCompliant: true,
    condition1Emission: totalEmission,
    condition3Emission: totalEmission,
    condition1AEL: 0,
    condition3AEL: 0,
    condition1AELUnit: 'W',
    condition3AELUnit: 'W',
    classificationSteps: steps
  };
};

const createErrorResult = (errorType: string, steps: string[]): ClassificationResult => {
  return {
    laserClass: `ERROR: ${errorType}`,
    classificationMethod: 'single',
    ael: 0,
    aelUnit: 'W',
    measuredEmission: 0,
    emissionUnit: 'W',
    ratio: 0,
    classDescription: 'Classification cannot be completed',
    safetyRequirements: ['Correct input parameters and retry'],
    condition1Test: false,
    condition3Test: false,
    requiresClassM: false,
    iecCompliant: false,
    condition1Emission: 0,
    condition3Emission: 0,
    condition1AEL: 0,
    condition3AEL: 0,
    condition1AELUnit: 'W',
    condition3AELUnit: 'W',
    classificationSteps: steps
  };
};

const getClassDescription = (laserClass: string): string => {
  const descriptions: { [key: string]: string } = {
    'Class 1': 'Safe under all conditions of normal use (IEC 60825-1:2014)',
    'Class 1M': 'Safe for unaided eye, hazardous with optical instruments (IEC 60825-1:2014)',
    'Class 2': 'Safe due to blink reflex protection (IEC 60825-1:2014)',
    'Class 2M': 'Safe for unaided eye due to blink reflex, hazardous with optical instruments (IEC 60825-1:2014)',
    'Class 3R': 'Low risk but potentially hazardous for direct viewing (IEC 60825-1:2014)',
    'Class 3B': 'Direct viewing hazardous, diffuse reflections normally safe (IEC 60825-1:2014)',
    'Class 4': 'Eye and skin hazard, fire hazard, hazardous diffuse reflections (IEC 60825-1:2014)'
  };
  return descriptions[laserClass] || 'Unknown classification';
};

const getSafetyRequirements = (laserClass: string): string[] => {
  const requirements: { [key: string]: string[] } = {
    'Class 1': ['No special safety measures required', 'Eye-safe under all conditions'],
    'Class 1M': ['Warning label required', 'Do not view with optical instruments', 'Safe for unaided eye viewing'],
    'Class 2': ['Warning label required', 'Do not stare into beam', 'Blink reflex provides protection'],
    'Class 2M': ['Warning label required', 'Do not view with optical instruments', 'Blink reflex protects unaided eye'],
    'Class 3R': ['Warning label required', 'Avoid direct eye exposure', 'Use with caution', 'Safety training recommended'],
    'Class 3B': ['Warning and aperture labels required', 'Eye protection in hazard zone', 'Controlled area required', 'Safety interlocks required', 'Laser safety officer required'],
    'Class 4': ['All Class 3B requirements plus:', 'Skin protection may be required', 'Fire prevention measures', 'Emergency procedures required', 'Extensive safety training mandatory']
  };
  return requirements[laserClass] || ['Classification-specific requirements apply'];
};

// ======================== MAIN COMPONENT ========================

const LaserClassificationCalculator: React.FC<LaserClassificationProps> = ({ onBack, onShowTutorial }) => {
  // State for wavelength data - starts with single wavelength (simplified)
  const [wavelengths, setWavelengths] = useState<WavelengthData[]>([
    {
      id: '1',
      wavelength: 532,
      laserType: 'continuous',
      power: 5,
      powerUnit: 'mW',
      pulseEnergy: 0.05, // 5 mW × 10 ns × 1e-6 = 0.05 mJ (for when changed to pulsed)
      pulseWidth: 10,
      repetitionRate: 1000,
      beamDivergence: 1.5,
      isActive: true
    }
  ]);
  
  // Common parameters
  const [beamDiameter, setBeamDiameter] = useState<number>(7);
  const [exposureTime, setExposureTime] = useState<number>(0.25);
  const [autoTimeBase, setAutoTimeBase] = useState<boolean>(true);
  
  // Manual power input option
  const [useManualPowers, setUseManualPowers] = useState<boolean>(false);
  const [condition1Power, setCondition1Power] = useState<number>(1e-3);
  const [condition3Power, setCondition3Power] = useState<number>(1e-3);
  
  // Results
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [classificationResults, setClassificationResults] = useState<ClassificationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  
  const [pulseValidation, setPulseValidation] = useState<{
    isValid: boolean;
    errorMessage?: string;
    warningMessage?: string;
  }>({ isValid: true });

  // Auto time base calculation
  const calculateTimeBase = () => {
    const activeWls = wavelengths.filter(w => w.isActive);
    if (activeWls.length === 0) return 0.25;
    
    // Check for single pulse operation (repetition rate = 0)
    const singlePulseWavelengths = activeWls.filter(w => 
      w.laserType === 'pulsed' && w.repetitionRate === 0
    );
    
    if (singlePulseWavelengths.length > 0) {
      // For single pulse, use the pulse width as exposure time
      // Convert from nanoseconds to seconds
      const pulseWidthSeconds = singlePulseWavelengths[0].pulseWidth * MPE_CONSTANTS.NS_TO_S;
      return pulseWidthSeconds;
    }
    
    // Use the IEC-compliant time base selection for other cases
    if (activeWls.length === 1) {
      return getClassificationTimeBase(activeWls[0].wavelength);
    } else {
      // For multiple wavelengths, use conservative approach
      let timeBase = 100; // Default for general classification
      
      for (const wl of activeWls) {
        // Get general classification time base for each wavelength
        const wlTimeBase = getClassificationTimeBase(wl.wavelength);
        timeBase = Math.min(timeBase, wlTimeBase);
      }
      
      return timeBase;
    }
  };

  useEffect(() => {
    if (autoTimeBase) {
      const newTimeBase = calculateTimeBase();
      setExposureTime(newTimeBase);
    }
  }, [wavelengths, autoTimeBase]);

  useEffect(() => {
    // Validate pulse parameters for all pulsed wavelengths
    const pulsedWavelengths = wavelengths.filter(w => w.isActive && w.laserType === 'pulsed');
    let allValid = true;
    let errorMessage = '';
    
    for (const wl of pulsedWavelengths) {
      // Custom validation that allows repetition rate = 0 for single pulse
      if (wl.pulseWidth <= 0) {
        allValid = false;
        errorMessage = `Wavelength ${wl.wavelength} nm: Pulse width must be greater than 0 ns`;
        break;
      }
      
      if (wl.repetitionRate < 0) {
        allValid = false;
        errorMessage = `Wavelength ${wl.wavelength} nm: Repetition rate cannot be negative. Use 0 for single pulse`;
        break;
      }
      
      // Check for physically realistic pulse parameters
      if (wl.repetitionRate > 0) {
        const periodBetweenPulsesNs = (1 / wl.repetitionRate) * 1e9;
        if (wl.pulseWidth > periodBetweenPulsesNs) {
          allValid = false;
          errorMessage = `Wavelength ${wl.wavelength} nm: Pulse width (${wl.pulseWidth.toFixed(3)} ns) cannot be larger than the period between pulses (${periodBetweenPulsesNs.toFixed(1)} ns at ${wl.repetitionRate} Hz)`;
          break;
        }
      }
    }
    
    setPulseValidation({ isValid: allValid, errorMessage });
  }, [wavelengths]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [wavelengths, beamDiameter, exposureTime, useManualPowers, condition1Power, condition3Power, pulseValidation.isValid]);

  const performAutoCalculation = () => {
    if (!pulseValidation.isValid) {
      setClassificationResults(null);
      setCalculationPerformed(false);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      const activeWavelengths = wavelengths.filter(w => w.isActive);
      
      let results: ClassificationResult;
      
      if (activeWavelengths.length === 1) {
        // Single wavelength classification
        const wl = activeWavelengths[0];
        const emissionCalc = calculateEmissionWithIrradiance(wl, 0, 0);

        results = classifyLaserIECSingle(
          wl.wavelength,
          emissionCalc.emission,
          emissionCalc.emissionUnit,
          exposureTime,
          beamDiameter,
          wl.laserType,
          wl.laserType === 'pulsed' ? wl.pulseWidth : undefined,
          wl.laserType === 'pulsed' ? wl.repetitionRate : undefined,
          wl.beamDivergence,
          useManualPowers,
          condition1Power,
          condition3Power
        );
      } else {
        // Multiple wavelength classification
        results = classifyMultipleWavelengths(
          activeWavelengths,
          exposureTime,
          beamDiameter,
          useManualPowers,
          condition1Power,
          condition3Power
        );
      }

      setClassificationResults(results);
      setCalculationPerformed(true);
      
      // Save calculation and prepare export data
      if (results) {
        const inputs = {
          wavelengths: activeWavelengths.map(w => ({
            wavelength: w.wavelength,
            laserType: w.laserType,
            power: w.power,
            powerUnit: w.powerUnit,
            pulseWidth: w.pulseWidth,
            repetitionRate: w.repetitionRate,
            beamDivergence: w.beamDivergence
          })),
          exposureTime,
          beamDiameter,
          useManualPowers,
          condition1Power,
          condition3Power
        };
        
        // Results calculated successfully
      }
    } catch (error) {
      console.error('Classification error:', error);
      setClassificationResults(null);
      setCalculationPerformed(false);
    } finally {
      setIsCalculating(false);
    }
  };

  const addWavelength = () => {
    const newId = (wavelengths.length + 1).toString();
    const newWavelength: WavelengthData = {
      id: newId,
      wavelength: 800,
      laserType: 'continuous',
      power: 1,
      powerUnit: 'mW',
      pulseEnergy: 0.01, // 1 mW × 10 ns × 1e-6 = 0.01 mJ
      pulseWidth: 10,
      repetitionRate: 1000,
      beamDivergence: 1.5,
      isActive: true
    };
    
    // Calculate pulse energy if it's pulsed
    if (newWavelength.laserType === 'pulsed') {
      newWavelength.pulseEnergy = newWavelength.power * newWavelength.pulseWidth * 1e-6;
    }
    
    setWavelengths([...wavelengths, newWavelength]);
  };

  const removeWavelength = (id: string) => {
    if (wavelengths.length > 1) {
      setWavelengths(wavelengths.filter(w => w.id !== id));
    }
  };

  const updateWavelength = (id: string, field: keyof WavelengthData, value: any) => {
    setWavelengths(wavelengths.map(w => {
      if (w.id === id) {
        const updatedWl = { ...w, [field]: value };
        
        // Auto-calculate pulse energy for pulsed lasers when power or pulse width changes
        if (updatedWl.laserType === 'pulsed' && (field === 'power' || field === 'pulseWidth' || field === 'laserType')) {
          updatedWl.pulseEnergy = updatedWl.power * updatedWl.pulseWidth * 1e-9;
        }
        
        return updatedWl;
      }
      return w;
    }));
  };

  const resetCalculation = () => {
    setCalculationPerformed(false);
    setClassificationResults(null);
    const defaultWavelength: WavelengthData = {
      id: '1',
      wavelength: 532,
      laserType: 'continuous',
      power: 5,
      powerUnit: 'mW',
      pulseEnergy: 0.05, // 5 mW × 10 ns × 1e-6 = 0.05 mJ (will be recalculated if changed to pulsed)
      pulseWidth: 10,
      repetitionRate: 1000,
      beamDivergence: 1.5,
      isActive: true
    };
    setWavelengths([defaultWavelength]);
    setBeamDiameter(7);
    setExposureTime(0.25);
    setAutoTimeBase(true);
    setUseManualPowers(false);
    setCondition1Power(1e-3);
    setCondition3Power(1e-3);
    setPulseValidation({ isValid: true });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Laser Classification</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">Laser Parameters</h3>
            <button
              onClick={addWavelength}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Add Wavelength
            </button>
          </div>
          
          {/* Wavelength Configuration */}
          {wavelengths.map((wl, index) => (
            <div key={wl.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">
                  {wavelengths.length === 1 ? 'Wavelength Configuration' : `Wavelength ${index + 1}`}
                </h4>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={wl.isActive}
                      onChange={(e) => updateWavelength(wl.id, 'isActive', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  {wavelengths.length > 1 && (
                    <button
                      onClick={() => removeWavelength(wl.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              {/* Laser Type */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Laser Type
                </label>
                <select
                  value={wl.laserType}
                  onChange={(e) => updateWavelength(wl.id, 'laserType', e.target.value as 'continuous' | 'pulsed')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="continuous">Continuous Wave (CW)</option>
                  <option value="pulsed">Pulsed</option>
                </select>
              </div>

              {/* Wavelength */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wavelength (nm)
                </label>
                <input
                  type="number"
                  min="180"
                  max="1000000"
                  value={wl.wavelength}
                  onChange={(e) => updateWavelength(wl.id, 'wavelength', Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Power/Energy Parameters with Unit Selection */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${useManualPowers ? 'text-gray-400' : 'text-gray-700'}`}>
                    Power/Energy Value
                  </label>
                  <input
                    type="number"
                    min="1e-12"
                    max="1e9"
                    step="any"
                    value={wl.power}
                    onChange={(e) => updateWavelength(wl.id, 'power', Number(e.target.value))}
                    className={`w-full p-2 border rounded-md ${
                      useManualPowers 
                        ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                        : 'bg-white text-gray-900 border-gray-300'
                    }`}
                    disabled={useManualPowers}
                    readOnly={useManualPowers}
                  />
                  {useManualPowers && (
                    <p className="text-xs text-gray-400 mt-1 italic">Disabled - using manual power input</p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${useManualPowers ? 'text-gray-400' : 'text-gray-700'}`}>
                    Unit
                  </label>
                  <select
                    value={wl.powerUnit}
                    onChange={(e) => updateWavelength(wl.id, 'powerUnit', e.target.value as 'mW' | 'J')}
                    className={`w-full p-2 border rounded-md ${
                      useManualPowers 
                        ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                        : 'bg-white text-gray-900 border-gray-300'
                    }`}
                    disabled={useManualPowers}
                  >
                    <option value="mW">mW (milliwatts)</option>
                    <option value="J">J (joules)</option>
                  </select>
                  {useManualPowers && (
                    <p className="text-xs text-gray-400 mt-1 italic">Disabled - using manual power input</p>
                  )}
                </div>
              </div>
              
              {wl.laserType === 'pulsed' && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pulse Width (ns)
                      </label>
                      <input
                        type="number"
                        min="0.001"
                        max="1e9"
                        step="any"
                        value={wl.pulseWidth}
                        onChange={(e) => updateWavelength(wl.id, 'pulseWidth', Number(e.target.value))}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calculated Pulse Energy (mJ)
                      </label>
                      <input
                        type="number"
                        value={wl.pulseEnergy.toFixed(6)}
                        className="w-full p-2 border rounded-md bg-gray-100"
                        disabled
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        = {wl.power} mW × {wl.pulseWidth} ns × 1e-9
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repetition Rate (Hz)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1e12"
                      step="any"
                      value={wl.repetitionRate}
                      onChange={(e) => updateWavelength(wl.id, 'repetitionRate', Number(e.target.value))}
                      className="w-full p-2 border rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use 0 for single pulse operation</p>
                    {wl.repetitionRate === 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded-md border border-yellow-200">
                        <p className="text-xs text-yellow-800">
                          <Icons.InfoInline />
                          Single pulse mode: Exposure time will be set to pulse width ({wl.pulseWidth} ns)
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Beam Divergence */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beam Divergence (mrad)
                </label>
                <input
                  type="number"
                  min="0.001"
                  max="1000"
                  step="any"
                  value={wl.beamDivergence}
                  onChange={(e) => updateWavelength(wl.id, 'beamDivergence', Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Full angle beam divergence</p>
              </div>
            </div>
          ))}

          {/* Common Parameters */}
          <div className="border-t border-gray-300 my-4"></div>
          <h4 className="font-medium text-gray-700 mb-4">Common Parameters</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beam Diameter at Aperture (mm)
            </label>
            <input
              type="number"
              min="0.001"
              max="1000"
              step="any"
              value={beamDiameter}
              onChange={(e) => setBeamDiameter(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
              disabled={useManualPowers}
            />
            
            <div className="mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useManualPowers}
                  onChange={(e) => setUseManualPowers(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Beam diameter information not available - use manual power input
                </span>
              </label>
            </div>
          </div>

          {useManualPowers && (
            <div className="mb-4 bg-yellow-50 p-3 rounded-md border border-yellow-300">
              <h4 className="font-medium text-yellow-800 mb-2">Manual Power Input Mode</h4>
              <p className="text-sm text-yellow-700 mb-3">
                Enter the received power measured under each condition when beam diameter cannot be determined.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Condition 1 Received Power (W)
                  </label>
                  <input
                    type="number"
                    min="1e-12"
                    max="1000"
                    step="any"
                    value={condition1Power}
                    onChange={(e) => setCondition1Power(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Condition 3 Received Power (W)
                  </label>
                  <input
                    type="number"
                    min="1e-12"
                    max="1000"
                    step="any"
                    value={condition3Power}
                    onChange={(e) => setCondition3Power(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Time Base for Classification (s)
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoTimeBase}
                  onChange={(e) => setAutoTimeBase(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Auto</span>
              </label>
            </div>
            <input
              type="number"
              min="1e-13"
              max="30000"
              step="any"
              value={exposureTime}
              onChange={(e) => setExposureTime(Number(e.target.value))}
              className={`w-full p-2 border rounded-md ${autoTimeBase ? 'bg-gray-100' : ''}`}
              disabled={autoTimeBase}
            />
            {autoTimeBase && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-800">
                  <Icons.InfoInline />
                  {(() => {
                    const activeWls = wavelengths.filter(w => w.isActive);
                    const singlePulseWls = activeWls.filter(w => w.laserType === 'pulsed' && w.repetitionRate === 0);
                    if (singlePulseWls.length > 0) {
                      return `Single pulse detected: Using pulse width (${singlePulseWls[0].pulseWidth} ns = ${(singlePulseWls[0].pulseWidth * MPE_CONSTANTS.NS_TO_S).toExponential(3)} s) as exposure time`;
                    } else if (activeWls.length === 1) {
                      return `Using IEC 60825-1 time base for ${activeWls[0].wavelength} nm wavelength`;
                    } else {
                      return 'Using conservative time base for multiple wavelengths';
                    }
                  })()}
                </p>
              </div>
            )}
          </div>

          {/* Pulse Parameter Validation */}
          {!pulseValidation.isValid && (
            <div className="mb-4">
              <div className="p-3 rounded-md border bg-red-50 border-red-300">
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-xl">❌</div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">
                      Pulse Parameter Validation Error
                    </h4>
                    <div className="mt-1 text-sm text-red-700">
                      <p>{pulseValidation.errorMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={resetCalculation}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors w-full"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4 flex items-center">
            Classification Results
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
              {!pulseValidation.isValid ? (
                <div>
                  <p className="text-red-600 mb-2 text-lg">⚠️ Invalid Pulse Parameters</p>
                  <p className="text-sm">{pulseValidation.errorMessage}</p>
                </div>
              ) : (
                <p>Classification appears automatically as you adjust parameters</p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Laser Classification</h4>
                <div className={`p-3 rounded-md ${
                  classificationResults.laserClass.includes('ERROR') 
                    ? 'bg-red-100 border border-red-300'
                    : classificationResults.laserClass.includes('1') 
                      ? 'bg-green-100 border border-green-300' 
                      : classificationResults.laserClass.includes('2')
                        ? 'bg-blue-100 border border-blue-300'
                        : classificationResults.laserClass.includes('3R')
                          ? 'bg-yellow-100 border border-yellow-300'
                          : 'bg-red-100 border border-red-300'
                }`}>
                  <p className={`font-bold text-2xl ${
                    classificationResults.laserClass.includes('ERROR')
                      ? 'text-red-700'
                      : classificationResults.laserClass.includes('1') 
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
                  {!classificationResults.laserClass.includes('ERROR') && (
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded">
                        IEC 60825-1:2014
                      </span>
                      <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded">
                        {classificationResults.classificationMethod === 'additive' ? 'Additive Rule' : 
                         wavelengths.filter(w => w.isActive).length > 1 ? 'Independent Rule' : 'Single Wavelength'}
                      </span>
                      {classificationResults.requiresClassM && (
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded">
                          Class M Applied
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!classificationResults.laserClass.includes('ERROR') && (
                <>
                  <div className="mb-6">
                    <h4 className="font-medium text-blue-800 mb-2">Classification Details</h4>
                    <table className="min-w-full bg-white border border-gray-200 text-sm">
                      <tbody>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">Number of Wavelengths</td>
                          <td className="px-3 py-2">{wavelengths.filter(w => w.isActive).length}</td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">Method</td>
                          <td className="px-3 py-2">
                            {classificationResults.classificationMethod === 'additive' ? 'Sum of Ratios (Additive)' : 
                             wavelengths.filter(w => w.isActive).length > 1 ? 'Independent (Highest Class)' : 'Single Wavelength'}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">Emission</td>
                          <td className="px-3 py-2">
                            {classificationResults.measuredEmission.toExponential(3)} {classificationResults.emissionUnit}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">AEL</td>
                          <td className="px-3 py-2">
                            {classificationResults.ael.toExponential(3)} {classificationResults.aelUnit}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">
                            {classificationResults.classificationMethod === 'additive' ? 'Sum of Ratios' : 'Emission/AEL Ratio'}
                          </td>
                          <td className="px-3 py-2">
                            {classificationResults.ratio.toFixed(4)}
                            {classificationResults.classificationMethod === 'additive' && classificationResults.ratio <= 1.0 && ' ≤ 1.0 ✓'}
                          </td>
                        </tr>
                        {classificationResults.classificationMethod !== 'additive' && wavelengths.filter(w => w.isActive).length === 1 && (
                          <>
                            <tr className="border-t border-gray-200">
                              <td className="px-3 py-2 font-medium">Condition 1 Test</td>
                              <td className={`px-3 py-2 ${classificationResults.condition1Test ? 'text-green-600' : 'text-red-600'}`}>
                                {classificationResults.condition1Test ? '✓ Passed' : '✗ Failed'}
                              </td>
                            </tr>
                            <tr className="border-t border-gray-200">
                              <td className="px-3 py-2 font-medium">Condition 3 Test</td>
                              <td className={`px-3 py-2 ${classificationResults.condition3Test ? 'text-green-600' : 'text-red-600'}`}>
                                {classificationResults.condition3Test ? '✓ Passed' : '✗ Failed'}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MPE Information */}
                  <div className="mb-6">
                    <h4 className="font-medium text-blue-800 mb-2">Maximum Permissible Exposure (MPE)</h4>
                    <div className="bg-white rounded-md border border-gray-200">
                      {wavelengths.filter(w => w.isActive).map((wl, index) => {
                        // Calculate C5 factor for pulsed lasers
                        let c5Factor = 1.0;
                        if (wl.laserType === 'pulsed' && wl.repetitionRate > 0) {
                          const corrections = IEC_AEL_TABLES.getCorrectionFactors(wl.wavelength, exposureTime, wl.beamDivergence);
                          const t2 = corrections.T2;
                          const numberOfPulses = Math.floor(t2 * wl.repetitionRate);
                          if (numberOfPulses > 1) {
                            const c5Details = calculateC5Factor(wl.wavelength, wl.pulseWidth, wl.repetitionRate, t2);
                            c5Factor = c5Details.c5Factor;
                          }
                        }

                        // Calculate MPE values
                        const mpeIrradiance = IEC_AEL_TABLES.getMPEIrriance(wl.wavelength, exposureTime, c5Factor);
                        const mpePowerEnergy = (wl.wavelength >= 400 && wl.wavelength <= 1400) 
                          ? IEC_AEL_TABLES.getMPEPowerEnergy(wl.wavelength, exposureTime, c5Factor)
                          : null;
                        const mpeSkin = IEC_AEL_TABLES.getMPESkin(wl.wavelength, exposureTime);

                        return (
                          <div key={wl.id} className={`p-3 ${index > 0 ? 'border-t border-gray-200' : ''}`}>
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium text-gray-700">
                                {wavelengths.filter(w => w.isActive).length === 1 
                                  ? `Wavelength: ${wl.wavelength} nm` 
                                  : `Wavelength ${index + 1}: ${wl.wavelength} nm`}
                              </h5>
                              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                                {wl.laserType.toUpperCase()}
                                {c5Factor !== 1.0 && ` • C5=${c5Factor.toFixed(3)}`}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {/* MPE Irradiance */}
                              <div className="bg-blue-50 p-2 rounded">
                                <div className="font-medium text-blue-800 mb-1">
                                  MPE Irradiance
                                </div>
                                <div className="text-xs text-blue-700 mt-1">
                                  Eye / Retina
                                </div>
                                <div className="font-mono text-blue-900">
                                  {mpeIrradiance.value.toExponential(3)} {mpeIrradiance.unit}
                                </div>
                                <div className="text-xs text-blue-700 mt-1">
                                  Exposure time: {exposureTime} s
                                </div>
                              </div>

                              {/* MPE Power/Energy (400-1400nm only) */}
                              {mpePowerEnergy && (
                                <div className="bg-green-50 p-2 rounded">
                                  <div className="font-medium text-green-800 mb-1">
                                    MPE Power/Energy
                                  </div>
                                <div className="text-xs text-green-700 mt-1">
                                  Retinal Hazard
                                </div>
                                  <div className="font-mono text-green-900">
                                    {mpePowerEnergy.value.toExponential(3)} {mpePowerEnergy.unit}
                                  </div>
                                  <div className="text-xs text-green-700 mt-1">
                                    400-1400 nm range
                                  </div>
                                </div>
                              )}

                              {/* MPE Skin */}
                              <div className="bg-orange-50 p-2 rounded">
                                <div className="font-medium text-orange-800 mb-1">
                                  MPE Skin
                                </div>
                                <div className="text-xs text-orange-700 mt-1">
                                  Thermal
                                </div>
                                <div className="font-mono text-orange-900">
                                  {mpeSkin.value.toExponential(3)} {mpeSkin.unit}
                                </div>
                                <div className="text-xs text-orange-700 mt-1">
                                  Skin exposure limit
                                </div>
                              </div>
                            </div>

                            {/* MPE Notes */}
                            <div className="mt-2 text-xs text-gray-600">
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center">
                                  <Icons.InfoInline />
                                  MPE values per IEC 60825-1:2014 Annex A
                                </span>
                                {wl.wavelength < 400 || wl.wavelength > 1400 ? (
                                  <span className="text-gray-500">
                                    • Retinal MPE not applicable (wavelength outside 400-1400 nm)
                                  </span>
                                ) : null}
                                {c5Factor !== 1.0 && (
                                  <span className="text-purple-600">
                                    • C5 pulse correction applied
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {classificationResults.additiveCalculation && (
                    <div className="mb-6">
                      <h4 className="font-medium text-blue-800 mb-2">Additive Calculation Details</h4>
                      <div className="bg-white p-3 rounded-md">
                        <p className="text-sm mb-2">
                          <strong>Additive Region:</strong> {classificationResults.additiveCalculation.additiveRegion}
                        </p>
                        <p className="text-sm mb-2">
                          <strong>Sum of Ratios:</strong> {classificationResults.additiveCalculation.sumOfRatios.toFixed(4)}
                        </p>
                        <div className="text-xs">
                          <strong>Individual Ratios:</strong>
                          <ul className="list-disc pl-5 mt-1">
                            {classificationResults.additiveCalculation.wavelengths.map((wl, index) => (
                              <li key={wl.id}>
                                {wl.wavelength} nm: {classificationResults.additiveCalculation!.ratios[index]?.toFixed(4) || 'N/A'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h4 className="font-medium text-blue-800 mb-2">Safety Requirements</h4>
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
                </>
              )}

              {classificationResults.classificationSteps && (
                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">Classification Process</h4>
                  <div className="bg-white p-3 rounded-md max-h-64 overflow-y-auto">
                    <ol className="list-decimal pl-5 space-y-1 text-xs font-mono">
                      {classificationResults.classificationSteps.map((step, index) => (
                        <li key={index} className={
                          step.startsWith('===') || step.startsWith('---') || step.startsWith('Result:') ? 'font-bold text-blue-700' : 
                          step.includes('ERROR') ? 'text-red-700 font-medium' :
                          step.includes('FAIL') ? 'text-red-700' : 
                          step.includes('PASS') || step.includes('✓') ? 'text-green-700' : ''
                        }>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* <div className="mt-6 bg-green-50 p-3 rounded-md border border-green-300">
                <h4 className="font-medium text-green-800 mb-2 flex items-center">
                  <Icons.CheckCircle /> IEC 60825-1:2014 Compliance
                </h4>
                <p className="text-sm text-green-800">
                  This calculator supports both single and multiple wavelength classification per IEC 60825-1:2014, 
                  including additive rules for wavelengths affecting the same biological endpoint and independent 
                  classification for non-additive wavelengths. Each wavelength can be configured as CW or pulsed 
                  with full parameter control. Pulse energy is calculated as Power (mW) × Pulse Width (ns) × 10⁻⁶. 
                  C5 correction uses T2 from correction factors for proper pulse train assessment. MPE values are 
                  calculated per Annex A for irradiance, retinal hazard (400-1400nm), and skin thermal limits.
                </p>
              </div> */}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaserClassificationCalculator;