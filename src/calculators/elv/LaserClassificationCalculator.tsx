import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  ClassificationResult, 
  MPE_CONSTANTS, 
  IEC_AEL_TABLES,
  calculateC5Factor,
  validatePulseParameters
} from './LaserSafetyShared';

interface LaserClassificationProps {
  onShowTutorial?: () => void;
}

// Enhanced wavelength data interface
interface WavelengthData {
  id: string;
  wavelength: number;
  laserType: 'continuous' | 'pulsed';
  power: number; // mW for CW
  pulseEnergy: number; // mJ for pulsed
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
    if (wl.laserType === 'continuous') {
      steps.push(`  Power: ${wl.power} mW`);
    } else {
      steps.push(`  Pulse Energy: ${wl.pulseEnergy} mJ`);
      steps.push(`  Pulse Width: ${wl.pulseWidth} ns`);
      steps.push(`  Repetition Rate: ${wl.repetitionRate} Hz`);
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
  
  const calculationSteps: string[] = [];
  let finalSumCondition1 = 0;
  let finalRatios: number[] = [];
  
  const classesToTest = ['Class 1', 'Class 2', 'Class 3R', 'Class 3B'];
  
  for (const testClass of classesToTest) {
    steps.push(`\n--- Testing ${testClass} with Additive Rule ---`);
    steps.push(`Using sum-of-ratios method: Σ(Emission_i / AEL_i) ≤ 1.0`);
    
    let sumCondition1 = 0;
    let sumCondition3 = 0;
    const currentRatios: number[] = [];
    
    for (let i = 0; i < wavelengths.length; i++) {
      const wl = wavelengths[i];
      
      let emission = 0;
      if (wl.laserType === 'continuous') {
        emission = wl.power * MPE_CONSTANTS.MW_TO_W;
      } else {
        emission = wl.pulseEnergy * MPE_CONSTANTS.MJ_TO_J;
      }
      
      // Calculate C5 for pulsed lasers
      let c5Factor = 1.0;
      if (wl.laserType === 'pulsed' && wl.repetitionRate > 0) {
        const numberOfPulses = Math.floor(exposureTime * wl.repetitionRate);
        if (numberOfPulses > 1) {
          const c5Details = calculateC5Factor(wl.wavelength, wl.pulseWidth, wl.repetitionRate, exposureTime);
          c5Factor = c5Details.c5Factor;
          steps.push(`  λ${i+1} C5 correction: ${c5Factor.toFixed(4)}`);
        }
      }
      
      // Get AEL for this class and wavelength
      let ael = 0;
      switch (testClass) {
        case 'Class 1':
          ael = IEC_AEL_TABLES.getClass1AEL(wl.wavelength, exposureTime, c5Factor);
          break;
        case 'Class 2':
          if (IEC_AEL_TABLES.supportsClass2(wl.wavelength)) {
            ael = IEC_AEL_TABLES.getClass2AEL(wl.wavelength, exposureTime, c5Factor);
          } else {
            ael = IEC_AEL_TABLES.getClass1AEL(wl.wavelength, exposureTime, c5Factor);
          }
          break;
        case 'Class 3R':
          ael = IEC_AEL_TABLES.getClass3RAEL(wl.wavelength, exposureTime, c5Factor);
          break;
        case 'Class 3B':
          ael = IEC_AEL_TABLES.getClass3BAEL(wl.wavelength, exposureTime, c5Factor);
          break;
      }
      
      const ratio = emission / ael;
      currentRatios.push(ratio);
      sumCondition1 += ratio;
      sumCondition3 += ratio;
      
      steps.push(`  λ${i+1} (${wl.wavelength}nm, ${wl.laserType.toUpperCase()}): ${emission.toExponential(3)} / ${ael.toExponential(3)} = ${ratio.toFixed(4)}`);
    }
    
    steps.push(`  Sum of ratios (Condition 1): ${sumCondition1.toFixed(4)}`);
    steps.push(`  Sum of ratios (Condition 3): ${sumCondition3.toFixed(4)}`);
    steps.push(`  Required: Sum ≤ 1.0 for both conditions`);
    
    finalSumCondition1 = sumCondition1;
    finalRatios = [...currentRatios];
    
    if (sumCondition1 <= 1.0 && sumCondition3 <= 1.0) {
      steps.push(`  ${testClass} additive test: PASS ✓ (sum ≤ 1.0)`);
      steps.push(`\nResult: ${testClass} (additive classification)`);
      
      const totalEmission = wavelengths.reduce((sum, wl) => {
        if (wl.laserType === 'continuous') return sum + wl.power * MPE_CONSTANTS.MW_TO_W;
        if (wl.laserType === 'pulsed') return sum + wl.pulseEnergy * MPE_CONSTANTS.MJ_TO_J;
        return sum;
      }, 0);
      
      return createAdditiveResult(testClass, totalEmission, sumCondition1, wavelengths, currentRatios, additiveGroup, steps);
    } else {
      steps.push(`  ${testClass} additive test: FAIL ✗ (sum > 1.0)`);
    }
  }
  
  steps.push(`\nAll lower class additive tests failed`);
  steps.push(`Result: Class 4 (additive classification)`);
  
  const totalEmission = wavelengths.reduce((sum, wl) => {
    if (wl.laserType === 'continuous') return sum + wl.power * MPE_CONSTANTS.MW_TO_W;
    if (wl.laserType === 'pulsed') return sum + wl.pulseEnergy * MPE_CONSTANTS.MJ_TO_J;
    return sum;
  }, 0);
  
  return createAdditiveResult('Class 4', totalEmission, finalSumCondition1, wavelengths, finalRatios, additiveGroup, steps);
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
    
    let emission = 0;
    if (wl.laserType === 'continuous') {
      emission = wl.power * MPE_CONSTANTS.MW_TO_W;
    } else {
      emission = wl.pulseEnergy * MPE_CONSTANTS.MJ_TO_J;
    }
    
    steps.push(`\n--- Individual Classification ${i+1}: ${wl.wavelength} nm (${wl.laserType.toUpperCase()}) ---`);
    steps.push(`Emission: ${emission.toExponential(3)} ${wl.laserType === 'continuous' ? 'W' : 'J'}`);
    
    const result = classifyLaserIECSingle(
      wl.wavelength,
      emission,
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
    if (wl.laserType === 'continuous') return sum + wl.power * MPE_CONSTANTS.MW_TO_W;
    if (wl.laserType === 'pulsed') return sum + wl.pulseEnergy * MPE_CONSTANTS.MJ_TO_J;
    return sum;
  }, 0);
  
  return createIndependentResult(highestClass, totalEmission, wavelengths, individualResults, steps);
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

const classifyLaserIECSingle = (
  wavelength: number,
  emission: number,
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
    steps.push(`Emission: ${emission.toExponential(3)} ${laserType === 'continuous' ? 'W' : 'J'}`);
    steps.push(`Beam diameter: ${beamDiameter} mm`);
  }
  
  steps.push(`Exposure time base: ${exposureTime} s`);
  if (beamDivergence !== undefined) {
    steps.push(`Beam divergence: ${beamDivergence} mrad`);
  }

  // Step 1: Wavelength range validation
  steps.push(`\n--- Step 1: Wavelength Range Validation ---`);
  if (wavelength < 180 || wavelength > 1e6) {
    steps.push(`ERROR: Wavelength ${wavelength} nm outside IEC 60825-1 scope (180 nm - 1 mm)`);
    return createErrorResult('Invalid Wavelength Range', steps);
  }
  steps.push(`Wavelength within IEC 60825-1 scope: 180 nm - 1,000,000 nm ✓`);

  // Step 2: Determine if pulsed or CW
  steps.push(`\n--- Step 2: Laser Type Determination ---`);
  let effectiveEmission = emission;
  let c5Factor = 1.0;
  let c5Details = null;

  if (laserType === 'pulsed') {
    steps.push(`Pulsed laser detected`);
    
    if (pulseWidth && repetitionRate && repetitionRate > 0) {
      const numberOfPulses = Math.floor(exposureTime * repetitionRate);
      
      if (numberOfPulses <= 1) {
        steps.push(`Single pulse operation (N=${numberOfPulses})`);
      } else {
        steps.push(`Repetitively pulsed operation (N=${numberOfPulses})`);
        c5Details = calculateC5Factor(wavelength, pulseWidth, repetitionRate, exposureTime);
        c5Factor = c5Details.c5Factor;
        steps.push(`C5 correction factor calculated: ${c5Factor.toFixed(4)}`);
      }
    }
  } else {
    steps.push(`Continuous Wave (CW) operation`);
  }

  // Step 3: Get measurement conditions
  steps.push(`\n--- Step 3: Measurement Conditions (IEC Table 10) ---`);
  const conditions = IEC_AEL_TABLES.getMeasurementConditions(wavelength, exposureTime);
  const isC1Applied = !((wavelength < 302.5) || (wavelength >= 4000 && wavelength <= 1e6));
  
  steps.push(`Condition 1: ${isC1Applied ? `Aperture ${conditions.condition1.aperture.toFixed(1)}mm at ${conditions.condition1.distance}mm` : 'NOT APPLIED (wavelength exemption)'}`);
  steps.push(`Condition 3: Aperture ${conditions.condition3.aperture.toFixed(1)}mm at ${conditions.condition3.distance}mm`);

  // Step 4: Sequential classification
  steps.push(`\n--- Step 4: Sequential Classification ---`);
  
  const testClass = (className: string, getAEL: (wl: number, t: number, c5: number) => number) => {
    const ael = getAEL(wavelength, exposureTime, c5Factor);
    steps.push(`\nTesting ${className}:`);
    steps.push(`  AEL = ${ael.toExponential(3)} ${laserType === 'continuous' ? 'W' : 'J'}`);
    
    let condition1Pass = true;
    let condition3Pass = true;
    let condition1Emission = effectiveEmission;
    let condition3Emission = effectiveEmission;
    
    if (useManualPowers && condition1Power !== undefined && condition3Power !== undefined) {
      condition1Emission = condition1Power;
      condition3Emission = condition3Power;
      condition1Pass = condition1Power <= ael;
      condition3Pass = condition3Power <= ael;
    } else {
      condition1Pass = isC1Applied ? effectiveEmission <= ael : true;
      condition3Pass = effectiveEmission <= ael;
    }
    
    if (isC1Applied) {
      steps.push(`  Condition 1: ${condition1Emission.toExponential(3)} ${condition1Pass ? '≤' : '>'} ${ael.toExponential(3)} - ${condition1Pass ? 'PASS' : 'FAIL'}`);
    } else {
      steps.push(`  Condition 1: NOT APPLIED (wavelength exemption)`);
    }
    
    steps.push(`  Condition 3: ${condition3Emission.toExponential(3)} ${condition3Pass ? '≤' : '>'} ${ael.toExponential(3)} - ${condition3Pass ? 'PASS' : 'FAIL'}`);
    
    return { ael, condition1Pass, condition3Pass, bothPass: condition1Pass && condition3Pass };
  };

  // Test Class 1
  const class1Test = testClass('Class 1', IEC_AEL_TABLES.getClass1AEL);
  
  if (class1Test.bothPass) {
    steps.push(`\nResult: Class 1 (both conditions satisfied)`);
    return createSingleResult('Class 1', class1Test.ael, effectiveEmission, steps, 
      class1Test.condition1Pass, class1Test.condition3Pass, false, c5Details);
  }

  // Check for Class 1M (only if within 302.5-4000 nm range)
  if (wavelength >= 302.5 && wavelength <= 4000 && 
      IEC_AEL_TABLES.requiresClassM(wavelength, beamDiameter) && isC1Applied) {
    steps.push(`\n--- Checking Class 1M (302.5-4000 nm, beam >7mm) ---`);
    const class3BAEL = IEC_AEL_TABLES.getClass3BAEL(wavelength, exposureTime, c5Factor);
    
    if (!class1Test.condition1Pass && class1Test.condition3Pass && effectiveEmission <= class3BAEL) {
      steps.push(`Class 1M conditions satisfied:`);
      steps.push(`  - Condition 1 > Class 1 AEL: YES ✓`);
      steps.push(`  - Condition 3 ≤ Class 1 AEL: YES ✓`);
      steps.push(`  - Condition 1 ≤ Class 3B AEL: ${effectiveEmission.toExponential(3)} ≤ ${class3BAEL.toExponential(3)} ✓`);
      steps.push(`  - Wavelength in range 302.5-4000 nm: YES ✓`);
      steps.push(`\nResult: Class 1M`);
      return createSingleResult('Class 1M', class1Test.ael, effectiveEmission, steps, 
        false, true, true, c5Details);
    }
  }

  // Test Class 2 (only for visible wavelengths 400-700 nm)
  let class2Test = null;
  if (IEC_AEL_TABLES.supportsClass2(wavelength)) {
    class2Test = testClass('Class 2', IEC_AEL_TABLES.getClass2AEL);
    
    if (class2Test.bothPass) {
      steps.push(`\nResult: Class 2 (visible wavelength, conditions satisfied)`);
      return createSingleResult('Class 2', class2Test.ael, effectiveEmission, steps, 
        class2Test.condition1Pass, class2Test.condition3Pass, false, c5Details);
    }

    // Check for Class 2M
    if (IEC_AEL_TABLES.requiresClassM(wavelength, beamDiameter) && isC1Applied) {
      steps.push(`\n--- Checking Class 2M (400-700 nm, beam >7mm) ---`);
      const class3BAEL = IEC_AEL_TABLES.getClass3BAEL(wavelength, exposureTime, c5Factor);
      
      if (!class2Test.condition1Pass && class2Test.condition3Pass && effectiveEmission <= class3BAEL) {
        steps.push(`Class 2M conditions satisfied:`);
        steps.push(`  - Condition 1 > Class 2 AEL: YES ✓`);
        steps.push(`  - Condition 3 ≤ Class 2 AEL: YES ✓`);
        steps.push(`  - Condition 1 ≤ Class 3B AEL: ${effectiveEmission.toExponential(3)} ≤ ${class3BAEL.toExponential(3)} ✓`);
        steps.push(`\nResult: Class 2M`);
        return createSingleResult('Class 2M', class2Test.ael, effectiveEmission, steps, 
          false, true, true, c5Details);
      }
    }
  }

  // Test Class 3R (with proper prerequisites per IEC 60825-1 Section 5.3.d)
  const class3RTest = testClass('Class 3R', IEC_AEL_TABLES.getClass3RAEL);
  
  if (class3RTest.bothPass) {
    // Check prerequisites: must exceed Class 1 and Class 2 (if applicable) for Condition 3
    steps.push(`\n--- Verifying Class 3R Prerequisites ---`);
    
    let prerequisitesMet = true;
    
    // Must exceed Class 1 for Condition 3
    if (class1Test.condition3Pass) {
      steps.push(`  ERROR: Does not exceed Class 1 AEL for Condition 3`);
      prerequisitesMet = false;
    } else {
      steps.push(`  Exceeds Class 1 AEL for Condition 3: YES ✓`);
    }
    
    // Must exceed Class 2 for Condition 3 (if applicable for visible wavelengths)
    if (class2Test && class2Test.condition3Pass) {
      steps.push(`  ERROR: Does not exceed Class 2 AEL for Condition 3 (visible wavelength)`);
      prerequisitesMet = false;
    } else if (class2Test) {
      steps.push(`  Exceeds Class 2 AEL for Condition 3: YES ✓`);
    }
    
    if (prerequisitesMet) {
      steps.push(`\nResult: Class 3R (conditions and prerequisites satisfied)`);
      return createSingleResult('Class 3R', class3RTest.ael, effectiveEmission, steps, 
        class3RTest.condition1Pass, class3RTest.condition3Pass, false, c5Details);
    } else {
      steps.push(`Class 3R prerequisites not met, continuing to Class 3B...`);
    }
  }

  // Test Class 3B (with proper prerequisites per IEC 60825-1 Section 5.3.e)
  const class3BTest = testClass('Class 3B', IEC_AEL_TABLES.getClass3BAEL);
  
  if (class3BTest.bothPass) {
    // Check prerequisites per IEC 60825-1 Section 5.3.e
    steps.push(`\n--- Verifying Class 3B Prerequisites ---`);
    
    let prerequisitesMet = true;
    
    // Must exceed Class 3R for Condition 1 OR Condition 3
    const class3RAEL = IEC_AEL_TABLES.getClass3RAEL(wavelength, exposureTime, c5Factor);
    const exceedsClass3RC1 = !isC1Applied || effectiveEmission > class3RAEL;
    const exceedsClass3RC3 = effectiveEmission > class3RAEL;
    
    if (exceedsClass3RC1 || exceedsClass3RC3) {
      steps.push(`  Exceeds Class 3R AEL for Condition 1 or 3: YES ✓`);
    } else {
      steps.push(`  ERROR: Does not exceed Class 3R AEL for either condition`);
      prerequisitesMet = false;
    }
    
    // Must exceed Class 1 and Class 2 for Condition 3
    if (class1Test.condition3Pass) {
      steps.push(`  ERROR: Does not exceed Class 1 AEL for Condition 3`);
      prerequisitesMet = false;
    } else {
      steps.push(`  Exceeds Class 1 AEL for Condition 3: YES ✓`);
    }
    
    if (class2Test && class2Test.condition3Pass) {
      steps.push(`  ERROR: Does not exceed Class 2 AEL for Condition 3`);
      prerequisitesMet = false;
    } else if (class2Test) {
      steps.push(`  Exceeds Class 2 AEL for Condition 3: YES ✓`);
    }
    
    if (prerequisitesMet) {
      steps.push(`\nResult: Class 3B (conditions and prerequisites satisfied)`);
      return createSingleResult('Class 3B', class3BTest.ael, effectiveEmission, steps, 
        class3BTest.condition1Pass, class3BTest.condition3Pass, false, c5Details);
    } else {
      steps.push(`Class 3B prerequisites not met, assigning Class 4...`);
    }
  }

  // Class 4 (exceeds Class 3B or prerequisites not met)
  steps.push(`\n--- Class 4 Assignment ---`);
  if (!class3BTest.bothPass) {
    steps.push(`Emission exceeds Class 3B AEL limits`);
  } else {
    steps.push(`Lower class prerequisites not satisfied`);
  }
  steps.push(`Result: Class 4`);
  
  return createSingleResult('Class 4', class3BTest.ael, effectiveEmission, steps, 
    false, false, false, c5Details);
};

// Helper functions for creating results
const createSingleResult = (
  laserClass: string,
  ael: number,
  emission: number,
  steps: string[],
  condition1Test: boolean,
  condition3Test: boolean,
  requiresClassM: boolean,
  c5Details?: any
): ClassificationResult => {
  return {
    laserClass,
    classificationMethod: 'single',
    ael,
    measuredEmission: emission,
    ratio: emission / ael,
    classDescription: getClassDescription(laserClass),
    safetyRequirements: getSafetyRequirements(laserClass),
    condition1Test,
    condition3Test,
    requiresClassM,
    iecCompliant: true,
    condition1Emission: emission,
    condition3Emission: emission,
    condition1AEL: ael,
    condition3AEL: ael,
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
    measuredEmission: totalEmission,
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
  wavelengths: WavelengthData[],
  individualResults: any[],
  steps: string[]
): ClassificationResult => {
  return {
    laserClass,
    classificationMethod: 'single', // Use 'single' instead of 'independent' to match interface
    ael: 0,
    measuredEmission: totalEmission,
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
    classificationSteps: steps
  };
};

const createErrorResult = (errorType: string, steps: string[]): ClassificationResult => {
  return {
    laserClass: `ERROR: ${errorType}`,
    classificationMethod: 'single',
    ael: 0,
    measuredEmission: 0,
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

const LaserClassificationCalculator: React.FC<LaserClassificationProps> = ({ onShowTutorial }) => {
  // State for wavelength data - starts with single wavelength
  const [wavelengths, setWavelengths] = useState<WavelengthData[]>([
    {
      id: '1',
      wavelength: 532,
      laserType: 'continuous',
      power: 5,
      pulseEnergy: 1,
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
    
    let timeBase = 100; // Default
    
    for (const wl of activeWls) {
      if (wl.wavelength >= 400 && wl.wavelength <= 700) timeBase = Math.min(timeBase, 0.25);
      if (wl.wavelength <= 400) timeBase = Math.min(timeBase, 30000);
      if (wl.wavelength > 1400) timeBase = Math.min(timeBase, 30000);
    }
    
    return timeBase;
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
      const validation = validatePulseParameters(wl.pulseWidth, wl.repetitionRate);
      if (!validation.isValid) {
        allValid = false;
        errorMessage = `Wavelength ${wl.wavelength} nm: ${validation.errorMessage}`;
        break;
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
        let emission = 0;
        
        if (wl.laserType === 'continuous') {
          emission = wl.power * MPE_CONSTANTS.MW_TO_W;
        } else {
          emission = wl.pulseEnergy * MPE_CONSTANTS.MJ_TO_J;
        }

        results = classifyLaserIECSingle(
          wl.wavelength,
          emission,
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
    setWavelengths([
      ...wavelengths,
      {
        id: newId,
        wavelength: 800,
        laserType: 'continuous',
        power: 1,
        pulseEnergy: 1,
        pulseWidth: 10,
        repetitionRate: 1000,
        beamDivergence: 1.5,
        isActive: true
      }
    ]);
  };

  const removeWavelength = (id: string) => {
    if (wavelengths.length > 1) {
      setWavelengths(wavelengths.filter(w => w.id !== id));
    }
  };

  const updateWavelength = (id: string, field: keyof WavelengthData, value: any) => {
    setWavelengths(wavelengths.map(w => 
      w.id === id ? { ...w, [field]: value } : w
    ));
  };

  const resetCalculation = () => {
    setCalculationPerformed(false);
    setClassificationResults(null);
    setWavelengths([{
      id: '1',
      wavelength: 532,
      laserType: 'continuous',
      power: 5,
      pulseEnergy: 1,
      pulseWidth: 10,
      repetitionRate: 1000,
      beamDivergence: 1.5,
      isActive: true
    }]);
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
        <h2 className="text-xl font-semibold">IEC 60825-1:2014 Laser Classification</h2>
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

              {/* Power/Energy Parameters */}
              {wl.laserType === 'continuous' ? (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laser Power (mW)
                  </label>
                  <input
                    type="number"
                    min="1e-9"
                    max="1e9"
                    step="any"
                    value={wl.power}
                    onChange={(e) => updateWavelength(wl.id, 'power', Number(e.target.value))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pulse Energy (mJ)
                      </label>
                      <input
                        type="number"
                        min="1e-12"
                        max="100000"
                        step="any"
                        value={wl.pulseEnergy}
                        onChange={(e) => updateWavelength(wl.id, 'pulseEnergy', Number(e.target.value))}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
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
                    <p className="text-xs text-gray-500 mt-1">Use 0 for single pulse</p>
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

              <div className="mt-6 bg-green-50 p-3 rounded-md border border-green-300">
                <h4 className="font-medium text-green-800 mb-2 flex items-center">
                  <Icons.CheckCircle /> IEC 60825-1:2014 Compliance
                </h4>
                <p className="text-sm text-green-800">
                  This calculator supports both single and multiple wavelength classification per IEC 60825-1:2014, 
                  including additive rules for wavelengths affecting the same biological endpoint and independent 
                  classification for non-additive wavelengths. Each wavelength can be configured as CW or pulsed 
                  with full parameter control.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaserClassificationCalculator;