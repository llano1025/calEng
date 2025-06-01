import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  MPEResult, 
  MPE_CONSTANTS, 
  TIME_BASE_TI, 
  calculateMPEValue 
} from './LaserSafetyShared';

interface MPECalculatorProps {
  onShowTutorial?: () => void;
}

const MPECalculator: React.FC<MPECalculatorProps> = ({ onShowTutorial }) => {
  const [wavelength, setWavelength] = useState<number>(532);
  const [exposureTime, setExposureTime] = useState<number>(0.25);
  const [laserType, setLaserType] = useState<'continuous' | 'pulsed'>('continuous');
  const [pulseWidth, setPulseWidth] = useState<number>(10);
  const [repetitionRate, setRepetitionRate] = useState<number>(1000);
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [mpeResults, setMpeResults] = useState<MPEResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Auto-calculate MPE whenever parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [wavelength, exposureTime, laserType, pulseWidth, repetitionRate]);

  const performAutoCalculation = () => {
    setIsCalculating(true);
    
    try {
      let effectiveExposureTime = exposureTime;
      if (laserType === 'pulsed') {
        effectiveExposureTime = pulseWidth * MPE_CONSTANTS.NS_TO_S;
      }

      // Enhanced MPE calculation with C5 support
      const baseMpeResults = calculateMPEValue(
        wavelength, 
        effectiveExposureTime, 
        laserType,
        laserType === 'pulsed' ? pulseWidth : undefined,
        laserType === 'pulsed' ? repetitionRate : undefined
      );
      
      let results = { ...baseMpeResults };
      results.calculationSteps = [...baseMpeResults.calculationSteps];

      if (laserType === 'pulsed') {
        const pulseWidthSeconds = pulseWidth * MPE_CONSTANTS.NS_TO_S;
        
        // Rule 1: MPE for a single pulse
        const singlePulseMpeResult = calculateMPEValue(wavelength, pulseWidthSeconds, 'pulsed');
        results.mpeSinglePulse = singlePulseMpeResult.mpeSinglePulse;
        results.calculationSteps.push(`--- Pulsed Laser MPE Rules ---`);
        results.calculationSteps.push(`Rule 1: Single Pulse MPE (for t=${pulseWidthSeconds.toExponential(2)}s) = ${results.mpeSinglePulse.toExponential(3)} J/cm²`);

        // Rule 2: Average Power MPE
        const mpeCwResult = calculateMPEValue(wavelength, exposureTime, 'continuous');
        let mpeCwValue = mpeCwResult.mpeSinglePulse;
        if (!mpeCwResult.limitingMechanism.includes('CW') && !mpeCwResult.limitingMechanism.includes('W/cm²')) {
            mpeCwValue = mpeCwResult.mpeSinglePulse / exposureTime;
        }

        results.mpeAverage = mpeCwValue;
        results.calculationSteps.push(`Rule 2: Average Power MPE (for t=${exposureTime}s, treated as CW) = ${results.mpeAverage.toExponential(3)} W/cm²`);
        results.calculationSteps.push(`  (Exposure per pulse should also be compared to MPE_avg / PRF)`);

        // Rule 3: Repetitive Pulse MPE (thermal accumulation)
        const Ti = TIME_BASE_TI.getTimeBase(wavelength);
        const N_in_Ti = Math.floor(Ti * repetitionRate);
        if (N_in_Ti > 1) {
            const CP = Math.pow(N_in_Ti, -0.25);
            results.mpeThermal = results.mpeSinglePulse * CP;
            results.calculationSteps.push(`Rule 3: Repetitive Pulse MPE (thermal accumulation over T_i=${Ti.toExponential(1)}s):`);
            results.calculationSteps.push(`  N (pulses in T_i) = ${N_in_Ti}`);
            results.calculationSteps.push(`  C_P (N^-0.25) = ${CP.toFixed(4)}`);
            results.calculationSteps.push(`  MPE_thermal (MPE_sp × C_P) = ${results.mpeSinglePulse.toExponential(3)} × ${CP.toFixed(4)} = ${results.mpeThermal.toExponential(3)} J/cm²`);
        } else {
            results.mpeThermal = results.mpeSinglePulse;
            results.calculationSteps.push(`Rule 3: N (pulses in T_i=${Ti.toExponential(1)}s) = ${N_in_Ti} ≤ 1. C_P = 1. MPE_thermal = MPE_sp.`);
        }
        
        // Determine critical MPE
        let criticalMPEValue = results.mpeSinglePulse;
        results.limitingMechanism = `Single Pulse (Rule 1)`;

        if (results.mpeThermal < criticalMPEValue) {
            criticalMPEValue = results.mpeThermal;
            results.limitingMechanism = `Repetitive Pulse Thermal (Rule 3, N in T_i)`;
        }

        if (repetitionRate > 0) {
            const mpeAvgAsEnergy = results.mpeAverage / repetitionRate;
            if (mpeAvgAsEnergy < criticalMPEValue) {
                criticalMPEValue = mpeAvgAsEnergy;
                results.limitingMechanism = `Average Power (Rule 2, MPE_CW / PRF)`;
            }
        }
        results.criticalMPE = criticalMPEValue;
        results.calculationSteps.push(`---`);
        results.calculationSteps.push(`Critical MPE for pulsed laser (most restrictive): ${results.criticalMPE.toExponential(3)} J/cm²`);
        results.calculationSteps.push(`Determined by: ${results.limitingMechanism}`);

        // Add C5 details if available
        if (baseMpeResults.c5Details) {
          results.c5Details = baseMpeResults.c5Details;
          results.calculationSteps.push(`---`);
          results.calculationSteps.push(`C5 Correction Factor Details:`);
          results.calculationSteps.push(`  C5 Factor: ${baseMpeResults.c5Details.c5Factor.toFixed(4)}`);
          results.calculationSteps.push(`  Pulse grouping: ${baseMpeResults.c5Details.pulseGrouping}`);
          results.calculationSteps.push(`  Time base (Ti): ${baseMpeResults.c5Details.timeBase.toExponential(3)} s`);
        }

      } else {
        results.criticalMPE = results.mpeSinglePulse;
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
                      (laserType === 'continuous' && exposureTime >=0.25 && (wavelength <180 || wavelength > 1400))
                      ? 'W/cm²' : 'J/cm²';

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
            MPE Calculation Results (Enhanced with C5)
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
                      <td className="px-3 py-2 font-medium">Correction Factor CA</td>
                      <td className="px-3 py-2">{mpeResults.correctionFactorCA.toFixed(3)}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Correction Factor CB</td>
                      <td className="px-3 py-2">{mpeResults.correctionFactorCB.toFixed(3)}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Correction Factor CC</td>
                      <td className="px-3 py-2">{mpeResults.correctionFactorCC.toFixed(3)}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Correction Factor C5 (Pulse Train)</td>
                      <td className="px-3 py-2">
                        <span className={mpeResults.correctionFactorC5 !== 1.0 ? 'font-bold text-orange-600' : ''}>
                          {mpeResults.correctionFactorC5.toFixed(4)}
                        </span>
                        {mpeResults.correctionFactorC5 !== 1.0 && ' (Applied)'}
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

              {/* C5 Details Section - NEW */}
              {mpeResults.c5Details && (
                <div className="mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">C5 Correction Factor Details</h4>
                  <div className="bg-white p-3 rounded-md border border-orange-200">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="font-medium text-gray-700">C5 Factor:</p>
                        <p className="text-lg font-bold text-orange-600">{mpeResults.c5Details.c5Factor.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Number of Pulses:</p>
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
                        <strong>C5 Application:</strong> The C5 correction factor accounts for multiple pulse exposure within the thermal confinement time (Ti). 
                        Values less than 1.0 indicate reduced MPE due to thermal accumulation effects.
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
                      <li key={index} className={step.includes('C5') ? 'text-orange-700 font-medium' : ''}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
          
          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">About Enhanced MPE Calculations</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>C5 Correction:</strong> Now properly implements IEC 60825-1 pulse train correction for multiple pulse exposures.</li>
              <li>MPE values are based on IEC 60825-1:2014 with proper time base (Ti) considerations.</li>
              <li>Calculations assume direct ocular exposure to a point source.</li>
              <li>Multiple pulse exposure uses enhanced three-rule criteria with thermal accumulation effects.</li>
              <li>Always verify calculations with current standard documents for critical applications.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  export default MPECalculator;