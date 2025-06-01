import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  EyewearResult, 
  MPE_CONSTANTS, 
  TIME_BASE_TI, 
  calculateMPEValue 
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
      let exposureLevel: number;
      let scaleFactorLetter: 'D' | 'I' | 'R' | 'M';

      if (laserType === 'continuous') {
        const mpeResult = calculateMPEValue(wavelength, exposureTime, 'continuous');
        mpeValue = mpeResult.criticalMPE;
        if (!mpeResult.limitingMechanism.includes('CW') && !mpeResult.limitingMechanism.includes('W/cm²') && exposureTime > 0) {
            mpeValue = mpeResult.criticalMPE / exposureTime;
        }
        mpeUnit = 'W/cm²';
        
        const beamArea_cm2 = Math.PI * Math.pow(beamDiameter * MPE_CONSTANTS.MM_TO_CM / 2, 2);
        exposureLevel = (power * MPE_CONSTANTS.MW_TO_W) / beamArea_cm2;
        scaleFactorLetter = 'D';
      } else {
        const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
        
        const mpeSpResult = calculateMPEValue(wavelength, pulseWidthSeconds, 'pulsed');
        let mpe_sp = mpeSpResult.criticalMPE;

        const mpeCwResult = calculateMPEValue(wavelength, exposureTime, 'continuous');
        let mpe_cw = mpeCwResult.criticalMPE;
        if (!mpeCwResult.limitingMechanism.includes('CW') && !mpeCwResult.limitingMechanism.includes('W/cm²') && exposureTime > 0) {
            mpe_cw = mpeCwResult.criticalMPE / exposureTime;
        }
        let mpe_avg_limit_J_per_pulse = Infinity;
        if (repetitionRate > 0) {
            mpe_avg_limit_J_per_pulse = mpe_cw / repetitionRate;
        }

        const Ti = TIME_BASE_TI.getTimeBase(wavelength);
        const N_in_Ti = Math.floor(Ti * repetitionRate);
        let mpe_rp = mpe_sp;
        if (N_in_Ti > 1) {
            const CP = Math.pow(N_in_Ti, -0.25);
            mpe_rp = mpe_sp * CP;
        }
        
        mpeValue = Math.min(mpe_sp, mpe_avg_limit_J_per_pulse, mpe_rp);
        mpeUnit = 'J/cm²';

        const beamArea_cm2 = Math.PI * Math.pow(beamDiameter * MPE_CONSTANTS.MM_TO_CM / 2, 2);
        exposureLevel = (pulseEnergy * MPE_CONSTANTS.MJ_TO_J) / beamArea_cm2;
        
        if (pulseWidthSeconds >= 1e-9 && pulseWidthSeconds < 0.25) {
            scaleFactorLetter = 'I';
        } else if (pulseWidthSeconds >= 0.25) {
            scaleFactorLetter = 'R';
        } else {
            scaleFactorLetter = 'M';
            if (pulseWidth >=1) scaleFactorLetter = 'I';
        }
      }

      if (mpeValue <=0) {
        setEyewearResults(null);
        setCalculationPerformed(true);
        setIsCalculating(false);
        return;
      }

      const requiredOD = Math.log10(exposureLevel / mpeValue);
      const odCeiling = Math.ceil(Math.max(0, requiredOD));

      let lbRating = `LB${odCeiling}`;
      if (odCeiling > 10) lbRating = 'LB10+';

      let dirRating = `${scaleFactorLetter === 'D' ? 'D' : scaleFactorLetter === 'R' ? 'R' : 'I'} L${odCeiling}`;
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
                      <td className="px-3 py-2 font-medium">Calculated Exposure Level</td>
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
                  <li><strong>Enhanced MPE:</strong> Uses the same C5-corrected MPE calculations as the classification tool.</li>
                </ul>
              </div>
            </>
          )}

          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">About Protective Eyewear Calculations</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Calculations based on enhanced MPE values with proper correction factors.</li>
              <li>EN 207 markings indicate wavelength range, scale factor, and LB rating.</li>
              <li>Scale factors: D (CW), I (Incoherent/short pulse), R (Giant pulse), M (Mode-locked).</li>
              <li>Always consider alignment procedures and multiple wavelength protection needs.</li>
              <li>Verify comfort and visibility requirements for specific work tasks.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectiveEyewearCalculator;