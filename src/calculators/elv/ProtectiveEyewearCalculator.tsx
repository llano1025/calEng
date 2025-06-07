import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  EyewearResult, 
  MPE_CONSTANTS, 
  IEC_AEL_TABLES,
  calculateC5Factor,
  TIME_BASE_TI
} from './LaserSafetyShared';

interface ProtectiveEyewearProps {
  onShowTutorial?: () => void;
}

const ProtectiveEyewearCalculator: React.FC<ProtectiveEyewearProps> = ({ onShowTutorial }) => {
  const [power, setPower] = useState<number>(1000);
  const [wavelength, setWavelength] = useState<number>(1064);
  const [beamDiameter, setBeamDiameter] = useState<number>(5);
  const [exposureTime, setExposureTime] = useState<number>(10);
  const [laserType, setLaserType] = useState<'continuous' | 'pulsed'>('continuous');
  const [pulseEnergy, setPulseEnergy] = useState<number>(100);
  const [pulseWidth, setPulseWidth] = useState<number>(10);
  const [repetitionRate, setRepetitionRate] = useState<number>(1000);
  
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [eyewearResults, setEyewearResults] = useState<EyewearResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [power, wavelength, beamDiameter, exposureTime, laserType, pulseEnergy, pulseWidth, repetitionRate]);

  const performAutoCalculation = () => {
    if ((laserType === 'continuous' && (power <= 0 || beamDiameter <= 0)) || 
        (laserType === 'pulsed' && (pulseEnergy <= 0 || pulseWidth <= 0 || beamDiameter <= 0)) || 
         exposureTime <= 0) {
      setEyewearResults(null);
      setCalculationPerformed(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      let mpeValue: number;
      let mpeUnit: 'J/cm²' | 'W/cm²';
      let exposureLevel: number;
      let scaleFactorLetter: 'D' | 'I' | 'R' | 'M';
      let calculationSteps: string[] = [];

      calculationSteps.push(`=== Protective Eyewear Calculation ===`);
      calculationSteps.push(`Laser type: ${laserType.toUpperCase()}`);
      calculationSteps.push(`Wavelength: ${wavelength} nm`);
      calculationSteps.push(`Beam diameter: ${beamDiameter} mm`);
      calculationSteps.push(`Exposure time: ${exposureTime} s`);

      if (laserType === 'continuous') {
        // Continuous Wave Laser Calculation
        calculationSteps.push(`\n=== CW Laser MPE Calculation ===`);
        calculationSteps.push(`Power: ${power} mW`);
        
        // Get MPE irradiance using updated IEC tables
        const mpeResult = IEC_AEL_TABLES.getMPEIrriance(wavelength, exposureTime, 1.0);
        calculationSteps.push(`MPE from IEC 60825-1: ${mpeResult.value.toExponential(3)} ${mpeResult.unit}`);
        
        // Convert MPE to W/cm²
        if (mpeResult.unit.includes('W/m²')) {
          mpeValue = mpeResult.value / MPE_CONSTANTS.M2_TO_CM2; // Convert W/m² to W/cm²
          calculationSteps.push(`MPE converted: ${mpeValue.toExponential(3)} W/cm²`);
        } else if (mpeResult.unit.includes('J/m²')) {
          // For energy units, convert to power density
          if (exposureTime > 0) {
            mpeValue = (mpeResult.value / exposureTime) / MPE_CONSTANTS.M2_TO_CM2; // Convert J/m² to W/cm²
            calculationSteps.push(`MPE converted from J/m²: ${mpeValue.toExponential(3)} W/cm²`);
          } else {
            mpeValue = 0;
          }
        } else {
          // Assume already in appropriate units or convert from power limit
          mpeValue = mpeResult.value;
          if (mpeResult.unit.includes('W') && !mpeResult.unit.includes('/')) {
            // Convert power limit to irradiance using 7mm eye aperture
            const eyeApertureArea_cm2 = Math.PI * Math.pow(0.35, 2); // 7mm diameter
            mpeValue = mpeResult.value / eyeApertureArea_cm2;
            calculationSteps.push(`MPE power limit converted to irradiance: ${mpeValue.toExponential(3)} W/cm²`);
          }
        }
        mpeUnit = 'W/cm²';
        
        // Calculate exposure level
        const beamArea_cm2 = Math.PI * Math.pow(beamDiameter * MPE_CONSTANTS.MM_TO_CM / 2, 2);
        exposureLevel = (power * MPE_CONSTANTS.MW_TO_W) / beamArea_cm2;
        scaleFactorLetter = 'D';
        
        calculationSteps.push(`Beam area: π × (${beamDiameter}/2)² = ${beamArea_cm2.toFixed(4)} cm²`);
        calculationSteps.push(`Exposure level: ${power} mW / ${beamArea_cm2.toFixed(4)} cm² = ${exposureLevel.toExponential(3)} W/cm²`);
        
      } else {
        // Pulsed Laser Calculation
        calculationSteps.push(`\n=== Pulsed Laser MPE Calculation ===`);
        calculationSteps.push(`Pulse energy: ${pulseEnergy} mJ`);
        calculationSteps.push(`Pulse width: ${pulseWidth} ns`);
        calculationSteps.push(`Repetition rate: ${repetitionRate} Hz`);
        
        const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
        calculationSteps.push(`Pulse width in seconds: ${pulseWidthSeconds.toExponential(3)} s`);

        // Calculate C5 correction factor for pulse train if applicable
        let c5Factor = 1.0;
        if (repetitionRate > 0) {
          const c5Details = calculateC5Factor(wavelength, pulseWidth, repetitionRate, exposureTime);
          c5Factor = c5Details.c5Factor;
          calculationSteps.push(`\nC5 correction calculation:`);
          c5Details.c5Steps.forEach(step => calculationSteps.push(`  ${step}`));
        }

        // Get single pulse MPE
        const mpeSinglePulseResult = IEC_AEL_TABLES.getMPEIrriance(wavelength, pulseWidthSeconds, 1.0);
        calculationSteps.push(`\nSingle pulse MPE: ${mpeSinglePulseResult.value.toExponential(3)} ${mpeSinglePulseResult.unit}`);
        
        // Get average power MPE for comparison
        const mpeAvgResult = IEC_AEL_TABLES.getMPEIrriance(wavelength, exposureTime, 1.0);
        calculationSteps.push(`Average power MPE: ${mpeAvgResult.value.toExponential(3)} ${mpeAvgResult.unit}`);

        // Apply C5 correction to single pulse MPE
        const mpePulseTrainResult = IEC_AEL_TABLES.getMPEIrriance(wavelength, pulseWidthSeconds, c5Factor);
        calculationSteps.push(`Pulse train MPE (with C5): ${mpePulseTrainResult.value.toExponential(3)} ${mpePulseTrainResult.unit}`);

        // Convert all MPE values to J/cm² for comparison
        let mpeSingle_J_cm2 = 0;
        let mpeAvg_J_cm2 = 0;
        let mpeTrain_J_cm2 = 0;

        // Convert single pulse MPE
        if (mpeSinglePulseResult.unit.includes('J/m²')) {
          mpeSingle_J_cm2 = mpeSinglePulseResult.value / MPE_CONSTANTS.M2_TO_CM2;
        } else if (mpeSinglePulseResult.unit.includes('W/m²')) {
          mpeSingle_J_cm2 = (mpeSinglePulseResult.value * pulseWidthSeconds) / MPE_CONSTANTS.M2_TO_CM2;
        }

        // Convert average power MPE to energy per pulse
        if (mpeAvgResult.unit.includes('W/m²')) {
          const avgPower_W_cm2 = mpeAvgResult.value / MPE_CONSTANTS.M2_TO_CM2;
          mpeAvg_J_cm2 = repetitionRate > 0 ? avgPower_W_cm2 / repetitionRate : Infinity;
        } else if (mpeAvgResult.unit.includes('J/m²')) {
          const avgEnergy_J_cm2 = mpeAvgResult.value / MPE_CONSTANTS.M2_TO_CM2;
          mpeAvg_J_cm2 = repetitionRate > 0 ? avgEnergy_J_cm2 / (repetitionRate * exposureTime) : Infinity;
        }

        // Convert pulse train MPE
        if (mpePulseTrainResult.unit.includes('J/m²')) {
          mpeTrain_J_cm2 = mpePulseTrainResult.value / MPE_CONSTANTS.M2_TO_CM2;
        } else if (mpePulseTrainResult.unit.includes('W/m²')) {
          mpeTrain_J_cm2 = (mpePulseTrainResult.value * pulseWidthSeconds) / MPE_CONSTANTS.M2_TO_CM2;
        }

        // Use most restrictive MPE
        mpeValue = Math.min(mpeSingle_J_cm2, mpeAvg_J_cm2, mpeTrain_J_cm2);
        mpeUnit = 'J/cm²';
        
        calculationSteps.push(`\nMPE comparison (J/cm²):`);
        calculationSteps.push(`  Single pulse: ${mpeSingle_J_cm2.toExponential(3)}`);
        calculationSteps.push(`  Average power limit: ${mpeAvg_J_cm2 === Infinity ? '∞' : mpeAvg_J_cm2.toExponential(3)}`);
        calculationSteps.push(`  Pulse train (C5): ${mpeTrain_J_cm2.toExponential(3)}`);
        calculationSteps.push(`  Most restrictive: ${mpeValue.toExponential(3)} J/cm²`);

        // Calculate exposure level
        const beamArea_cm2 = Math.PI * Math.pow(beamDiameter * MPE_CONSTANTS.MM_TO_CM / 2, 2);
        exposureLevel = (pulseEnergy * MPE_CONSTANTS.MJ_TO_J) / beamArea_cm2;
        
        calculationSteps.push(`\nExposure level calculation:`);
        calculationSteps.push(`Beam area: π × (${beamDiameter}/2)² = ${beamArea_cm2.toFixed(4)} cm²`);
        calculationSteps.push(`Exposure level: ${pulseEnergy} mJ / ${beamArea_cm2.toFixed(4)} cm² = ${exposureLevel.toExponential(3)} J/cm²`);
        
        // Determine scale factor based on pulse characteristics
        if (pulseWidthSeconds >= 1e-9 && pulseWidthSeconds < 0.25) {
          scaleFactorLetter = 'I'; // Incoherent/short pulse
        } else if (pulseWidthSeconds >= 0.25) {
          scaleFactorLetter = 'R'; // Giant pulse
        } else {
          scaleFactorLetter = 'M'; // Mode-locked
          if (pulseWidth >= 1) scaleFactorLetter = 'I';
        }
      }

      if (mpeValue <= 0) {
        calculationSteps.push(`ERROR: Invalid MPE value (${mpeValue})`);
        setEyewearResults(null);
        setCalculationPerformed(true);
        setIsCalculating(false);
        return;
      }

      // Calculate required Optical Density
      const requiredOD = Math.log10(exposureLevel / mpeValue);
      const odCeiling = Math.ceil(Math.max(0, requiredOD));

      calculationSteps.push(`\n=== Optical Density Calculation ===`);
      calculationSteps.push(`Required OD = log₁₀(Exposure/MPE) = log₁₀(${exposureLevel.toExponential(3)}/${mpeValue.toExponential(3)})`);
      calculationSteps.push(`Required OD = ${requiredOD.toFixed(3)}`);
      calculationSteps.push(`Minimum integer OD: ${odCeiling}`);

      // Generate EN 207 style markings
      let lbRating = `LB${odCeiling}`;
      if (odCeiling > 10) lbRating = 'LB10+';

      let dirRating = `${scaleFactorLetter} L${odCeiling}`;
      let en207Marking = `${wavelength} ${scaleFactorLetter} ${lbRating}`;

      const recommendations = [
        `Select eyewear with Optical Density (OD) ≥ ${odCeiling} at ${wavelength} nm.`,
        `Ensure eyewear is certified to EN 207 (Europe) or ANSI Z136.1 (USA) standards.`,
        `The EN 207 marking should include: "${en207Marking}".`,
        `Check for proper fit, full coverage (including side protection), and comfort.`,
        `Inspect eyewear for damage (scratches, cracks, discoloration) before each use.`,
        `Verify adequate Visible Light Transmission (VLT) for safe task performance.`,
        `Consider alignment procedures for non-visible wavelengths (<400nm or >700nm).`,
        `Account for multiple wavelengths if applicable (select highest required OD).`
      ];

      if (requiredOD < 0) {
        recommendations.unshift("Calculated exposure is below MPE. Eyewear may not be required by calculation, but consider other safety factors.");
      }

      if (odCeiling > 7) {
        recommendations.push("High OD requirement may significantly reduce visibility. Ensure adequate illumination and consider beam path modification.");
      }

      setEyewearResults({
        requiredOD: Math.max(0, requiredOD),
        exposureLevel,
        mpe: mpeValue,
        scaleFactor: `${scaleFactorLetter} (${laserType === 'continuous' ? 'CW' : `${pulseWidth}ns pulse`})`,
        lbRating: en207Marking,
        dirRating: dirRating,
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Protective Eyewear Calculator</h2>
      </div>

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
            <p className="text-xs text-gray-500 mt-1">Laser wavelength (180 nm - 1 mm per IEC 60825-1)</p>
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
              <p className="text-xs text-gray-500 mt-1">Continuous wave output power</p>
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
                <p className="text-xs text-gray-500 mt-1">Energy per pulse</p>
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
                <p className="text-xs text-gray-500 mt-1">Pulse duration (FWHM or 1/e²)</p>
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
                <p className="text-xs text-gray-500 mt-1">Pulse repetition frequency (use 0 for single pulse)</p>
              </div>
            </>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beam Diameter at Eye (mm)
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
            <p className="text-xs text-gray-500 mt-1">Smallest beam diameter the eye could be exposed to (worst case)</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Exposure Time (s)
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
              Worst-case exposure duration (e.g., 0.25s for visible, 10s for IR thermal)
            </p>
          </div>

          <div className="mt-6">
            <button
              onClick={resetCalculation}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors w-full"
            >
              Reset to Defaults
            </button>
            {isCalculating && (
              <p className="text-sm text-blue-600 mt-2 flex items-center justify-center">
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
              <p>Calculating eyewear requirements using IEC 60825-1:2014...</p>
            </div>
          ) : !calculationPerformed || !eyewearResults ? (
            <div className="text-center py-8 text-gray-500">
              <p>Eyewear requirements will appear automatically as you adjust parameters</p>
              {eyewearResults === null && calculationPerformed && (
                <p className="text-red-500 mt-2">Could not calculate. Check input parameters or wavelength validity.</p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Required Optical Density (OD)</h4>
                <div className={`p-3 rounded-md ${
                  eyewearResults.requiredOD === 0
                    ? 'bg-green-100 border border-green-300'
                    : eyewearResults.requiredOD < 3 
                      ? 'bg-green-100 border border-green-300' 
                      : eyewearResults.requiredOD < 5
                        ? 'bg-yellow-100 border border-yellow-300'
                        : 'bg-red-100 border border-red-300'
                }`}>
                  <p className={`font-bold text-2xl ${
                    eyewearResults.requiredOD === 0
                      ? 'text-green-700'
                      : eyewearResults.requiredOD < 3 
                        ? 'text-green-700' 
                        : eyewearResults.requiredOD < 5
                          ? 'text-yellow-700'
                          : 'text-red-700'
                  }`}>
                    {eyewearResults.requiredOD === 0 
                      ? "OD 0 (No protection required by calculation)"
                      : `OD ≥ ${Math.ceil(eyewearResults.requiredOD)}`
                    }
                  </p>
                  <p className="text-sm mt-1">
                    Calculated minimum OD: {eyewearResults.requiredOD.toFixed(3)}
                  </p>
                  {eyewearResults.requiredOD > 7 && (
                    <p className="text-sm mt-1 font-medium text-red-600">
                      ⚠️ High OD may significantly reduce visibility
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Eyewear Specifications</h4>
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Wavelength Coverage</td>
                      <td className="px-3 py-2">{wavelength} nm (ensure filter includes this wavelength)</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Scale Factor</td>
                      <td className="px-3 py-2">{eyewearResults.scaleFactor}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">EN 207 Marking Example</td>
                      <td className="px-3 py-2 font-mono font-bold">{eyewearResults.lbRating}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">ANSI Z136 Style</td>
                      <td className="px-3 py-2 font-mono">
                        {eyewearResults.requiredOD === 0 
                          ? "No specific OD required" 
                          : `OD ${Math.ceil(eyewearResults.requiredOD)} @ ${wavelength}nm`
                        }
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Attenuation Factor</td>
                      <td className="px-3 py-2 font-mono">
                        {eyewearResults.requiredOD === 0 
                          ? "1:1 (no attenuation)" 
                          : `${Math.pow(10, Math.ceil(eyewearResults.requiredOD)).toExponential(0)}:1`
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Exposure Analysis</h4>
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Calculated Exposure</td>
                      <td className="px-3 py-2 font-mono">
                        {eyewearResults.exposureLevel < 0.001 && eyewearResults.exposureLevel !== 0
                          ? eyewearResults.exposureLevel.toExponential(3) 
                          : eyewearResults.exposureLevel.toFixed(6)
                        } {laserType === 'continuous' ? 'W/cm²' : 'J/cm²'}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">MPE Limit</td>
                      <td className="px-3 py-2 font-mono">
                        {eyewearResults.mpe < 0.001 && eyewearResults.mpe !== 0
                          ? eyewearResults.mpe.toExponential(3) 
                          : eyewearResults.mpe.toFixed(6)
                        } {laserType === 'continuous' ? 'W/cm²' : 'J/cm²'}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Safety Factor</td>
                      <td className="px-3 py-2">
                        {eyewearResults.requiredOD === 0 
                          ? "Below MPE (safe)"
                          : `${(eyewearResults.exposureLevel / eyewearResults.mpe).toFixed(1)}× above MPE`
                        }
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Required Reduction</td>
                      <td className="px-3 py-2 font-mono">
                        {eyewearResults.requiredOD === 0 
                          ? "None required"
                          : `${Math.pow(10, eyewearResults.requiredOD).toExponential(2)} (10^${eyewearResults.requiredOD.toFixed(2)})`
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Selection Recommendations</h4>
                <div className="bg-white p-3 rounded-md">
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {eyewearResults.recommendations.map((rec, index) => (
                      <li key={index} className={
                        rec.includes('below MPE') ? 'text-green-700 font-medium' : 
                        rec.includes('High OD') ? 'text-orange-700 font-medium' : ''
                      }>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mb-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <Icons.InfoInline />
                  Critical Safety Notes
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                  <li>Eyewear is the <strong>last line of defense</strong>. Prioritize engineering and administrative controls.</li>
                  <li>This calculation assumes <strong>direct intrabeam viewing</strong>. Assess diffuse reflection hazards separately.</li>
                  <li>Always verify manufacturer specifications match your specific laser parameters.</li>
                  <li>Replace damaged eyewear immediately. Laser filters can degrade over time.</li>
                  <li><strong>IEC 60825-1:2014 compliant</strong> MPE calculations with C5 pulse corrections applied.</li>
                  <li>Consider multiple wavelengths - select eyewear covering all wavelengths with highest required OD.</li>
                </ul>
              </div>
            </>
          )}

          <div className="mt-6 bg-green-50 p-3 rounded-md border border-green-300">
            <h4 className="font-medium text-green-800 mb-2 flex items-center">
              <Icons.CheckCircle />
              IEC 60825-1:2014 Compliance
            </h4>
            <p className="text-sm text-green-800">
              This calculator uses the latest IEC 60825-1:2014 MPE values with proper correction factors for 
              both continuous and pulsed lasers. C5 pulse train corrections are automatically applied where 
              applicable. EN 207 scale factors: D (CW), I (Incoherent/short pulse), R (Giant pulse), 
              M (Mode-locked). Required OD = log₁₀(Exposure Level / MPE).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectiveEyewearCalculator;