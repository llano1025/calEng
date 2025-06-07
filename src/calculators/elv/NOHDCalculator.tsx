import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  NOHDResult, 
  MPE_CONSTANTS, 
  IEC_AEL_TABLES
} from './LaserSafetyShared';

interface NOHDCalculatorProps {
  onShowTutorial?: () => void;
}

const NOHDCalculator: React.FC<NOHDCalculatorProps> = ({ onShowTutorial }) => {
  const [power, setPower] = useState<number>(5);
  const [beamDiameter, setBeamDiameter] = useState<number>(2);
  const [beamDivergence, setBeamDivergence] = useState<number>(1);
  const [wavelength, setWavelength] = useState<number>(532);
  const [exposureTime, setExposureTime] = useState<number>(0.25);
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [nohdResults, setNohdResults] = useState<NOHDResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [power, beamDiameter, beamDivergence, wavelength, exposureTime]);

  const performAutoCalculation = () => {
    if (power <= 0 || beamDiameter <= 0 || beamDivergence < 0) {
      setNohdResults(null);
      setCalculationPerformed(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      // Get MPE irradiance using the updated IEC_AEL_TABLES
      const mpeResult = IEC_AEL_TABLES.getMPEIrriance(wavelength, exposureTime, 1.0);
      let mpe_W_cm2 = 0;
      
      // Convert MPE to W/cm² based on the unit returned
      if (mpeResult.unit.includes('W/m²')) {
        mpe_W_cm2 = mpeResult.value / MPE_CONSTANTS.M2_TO_CM2; // Convert W/m² to W/cm²
      } else if (mpeResult.unit.includes('J/m²')) {
        // For energy units, convert to power density
        if (exposureTime > 0) {
          mpe_W_cm2 = (mpeResult.value / exposureTime) / MPE_CONSTANTS.M2_TO_CM2; // Convert J/m² to W/cm²
        } else {
          mpe_W_cm2 = 0;
        }
      } else if (mpeResult.unit.includes('W') && !mpeResult.unit.includes('/')) {
        // Direct power limit - need to convert to irradiance for NOHD calculation
        // Use standard 7mm aperture area for eye hazard assessment
        const eyeApertureArea_cm2 = Math.PI * Math.pow(0.35, 2); // 7mm diameter = 0.7cm radius = 0.35cm
        mpe_W_cm2 = mpeResult.value / eyeApertureArea_cm2;
      } else {
        // Default handling - assume value is already in appropriate units
        mpe_W_cm2 = mpeResult.value;
      }
      
      if (mpe_W_cm2 <= 0) {
        setNohdResults(null);
        setCalculationPerformed(false);
        setIsCalculating(false);
        return;
      }

      const powerWatts = power * MPE_CONSTANTS.MW_TO_W;
      const beamDiameterAtAperture_m = beamDiameter * MPE_CONSTANTS.MM_TO_M;
      const beamDivergenceRad = beamDivergence * MPE_CONSTANTS.MRAD_TO_RAD;
      const mpe_W_m2 = mpe_W_cm2 * MPE_CONSTANTS.M2_TO_CM2;

      let nohd_m = 0;
      let calculationSteps = [
        `=== NOHD Calculation Process ===`,
        `Laser power (P): ${power} mW = ${powerWatts.toExponential(3)} W`,
        `Beam diameter at aperture (D0): ${beamDiameter} mm = ${beamDiameterAtAperture_m.toExponential(3)} m`,
        `Beam divergence (Φ): ${beamDivergence} mrad = ${beamDivergenceRad.toExponential(3)} rad`,
        `Wavelength: ${wavelength} nm`,
        `Exposure time for MPE: ${exposureTime} s`,
        ``,
        `=== MPE Calculation ===`,
        `MPE from IEC 60825-1: ${mpeResult.value.toExponential(3)} ${mpeResult.unit}`,
        `MPE converted to irradiance: ${mpe_W_cm2.toExponential(3)} W/cm² = ${mpe_W_m2.toExponential(3)} W/m²`,
        ``,
        `=== NOHD Formula ===`,
        `NOHD = (1/Φ) × [√(4P/(π×MPE)) - D0]`
      ];

      if (beamDivergenceRad > 0) {
        const termInsideSqrt = (4 * powerWatts) / (Math.PI * mpe_W_m2);
        calculationSteps.push(`Term inside √: (4P/(π×MPE)) = (4 × ${powerWatts.toExponential(3)}) / (π × ${mpe_W_m2.toExponential(3)})`);
        calculationSteps.push(`                              = ${termInsideSqrt.toExponential(3)} m²`);
        
        if (termInsideSqrt >= 0) {
          const sqrtVal = Math.sqrt(termInsideSqrt);
          const termInBrackets = sqrtVal - beamDiameterAtAperture_m;
          nohd_m = (1 / beamDivergenceRad) * termInBrackets;
          
          calculationSteps.push(`√(4P/(π×MPE)) = √${termInsideSqrt.toExponential(3)} = ${sqrtVal.toExponential(3)} m`);
          calculationSteps.push(`Term in brackets: ${sqrtVal.toExponential(3)} - ${beamDiameterAtAperture_m.toExponential(3)} = ${termInBrackets.toExponential(3)} m`);
          calculationSteps.push(`NOHD = (1/${beamDivergenceRad.toExponential(3)}) × ${termInBrackets.toExponential(3)} = ${nohd_m.toFixed(3)} m`);
        } else {
          calculationSteps.push(`ERROR: Negative term inside square root (${termInsideSqrt.toExponential(3)})`);
          calculationSteps.push(`This indicates the calculation parameters are invalid.`);
          nohd_m = 0;
        }
      } else {
        calculationSteps.push(`Special case: Beam divergence = 0 (collimated beam)`);
        const initialArea_m2 = Math.PI * Math.pow(beamDiameterAtAperture_m / 2, 2);
        const initialIrradiance_W_m2 = powerWatts / initialArea_m2;
        
        calculationSteps.push(`Initial beam area: π × (${beamDiameterAtAperture_m.toExponential(3)}/2)² = ${initialArea_m2.toExponential(3)} m²`);
        calculationSteps.push(`Initial irradiance: ${powerWatts.toExponential(3)} / ${initialArea_m2.toExponential(3)} = ${initialIrradiance_W_m2.toExponential(3)} W/m²`);
        
        if (initialIrradiance_W_m2 > mpe_W_m2) {
          nohd_m = Infinity;
          calculationSteps.push(`Initial irradiance > MPE: NOHD = ∞ (infinite)`);
        } else {
          nohd_m = 0;
          calculationSteps.push(`Initial irradiance ≤ MPE: NOHD = 0 m (safe at all distances)`);
        }
      }
      
      // Ensure NOHD is not negative
      if (nohd_m < 0) {
        calculationSteps.push(`NOHD calculated as negative (${nohd_m.toFixed(3)} m), setting to 0 m`);
        nohd_m = 0;
      }

      // Calculate beam parameters at NOHD
      let beamDiameterAtNOHD_m = beamDiameterAtAperture_m;
      let beamAreaAtNOHD_m2 = Math.PI * Math.pow(beamDiameterAtAperture_m / 2, 2);
      let irradianceAtNOHD_W_m2 = powerWatts / beamAreaAtNOHD_m2;

      if (nohd_m !== Infinity && nohd_m > 0) {
        beamDiameterAtNOHD_m = beamDiameterAtAperture_m + nohd_m * beamDivergenceRad;
        beamAreaAtNOHD_m2 = Math.PI * Math.pow(beamDiameterAtNOHD_m / 2, 2);
        irradianceAtNOHD_W_m2 = powerWatts / beamAreaAtNOHD_m2;
      }

      // Calculate initial power density for reference
      const initialBeamArea_cm2 = Math.PI * Math.pow((beamDiameter * MPE_CONSTANTS.MM_TO_CM) / 2, 2);
      const initialPowerDensity_W_cm2 = powerWatts / initialBeamArea_cm2;

      // Determine hazard classification
      let hazardClass = '';
      if (nohd_m === Infinity) {
        hazardClass = 'EXTREME HAZARD - Collimated beam exceeding MPE at all distances';
      } else if (nohd_m === 0) {
        hazardClass = 'SAFE - Irradiance below MPE at all distances';
      } else if (nohd_m < 0.1) {
        hazardClass = 'LOW HAZARD - NOHD < 10 cm';
      } else if (nohd_m < 3) {
        hazardClass = 'MODERATE HAZARD - NOHD < 3 m (typical room size)';
      } else if (nohd_m < 100) {
        hazardClass = 'HIGH HAZARD - NOHD < 100 m (outdoor hazard zone)';
      } else {
        hazardClass = 'VERY HIGH HAZARD - NOHD ≥ 100 m (long-range hazard)';
      }

      calculationSteps.push(``, `=== Results Summary ===`);
      calculationSteps.push(`NOHD: ${nohd_m === Infinity ? "∞" : nohd_m.toFixed(2)} m`);
      if (nohd_m !== Infinity) {
        calculationSteps.push(`Beam diameter at NOHD: ${(beamDiameterAtNOHD_m * 1000).toFixed(1)} mm`);
        calculationSteps.push(`Irradiance at NOHD: ${(irradianceAtNOHD_W_m2 / MPE_CONSTANTS.M2_TO_CM2).toExponential(3)} W/cm²`);
        calculationSteps.push(`(Should approximately equal MPE: ${mpe_W_cm2.toExponential(3)} W/cm²)`);
      }
      calculationSteps.push(`Initial power density: ${initialPowerDensity_W_cm2.toExponential(3)} W/cm²`);
      calculationSteps.push(`Hazard classification: ${hazardClass}`);

      setNohdResults({
        nohd: nohd_m,
        mpe: mpe_W_cm2,
        beamDiameterAtNOHD: nohd_m === Infinity ? Infinity : beamDiameterAtNOHD_m * 1000, // Convert to mm
        irradianceAtNOHD: nohd_m === Infinity ? 0 : irradianceAtNOHD_W_m2 / MPE_CONSTANTS.M2_TO_CM2, // Convert to W/cm²
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">NOHD Calculator</h2>
      </div>

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
              max="1e9"
              step="any"
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Continuous wave laser power output</p>
          </div>

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
            />
            <p className="text-xs text-gray-500 mt-1">1/e² beam diameter at laser output</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beam Divergence (mrad)
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              step="any"
              value={beamDivergence}
              onChange={(e) => setBeamDivergence(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Full angle divergence. Use 0 for perfectly collimated beam</p>
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
            <p className="text-xs text-gray-500 mt-1">
              Typical values: 0.25s (visible blink reflex), 10s (IR thermal), 100s (general)
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
              <p>Calculating NOHD using IEC 60825-1:2014...</p>
            </div>
          ) : !calculationPerformed || !nohdResults ? (
            <div className="text-center py-8 text-gray-500">
              <p>NOHD values will appear automatically as you adjust parameters</p>
              {nohdResults === null && calculationPerformed && (
                <p className="text-red-500 mt-2">Could not calculate NOHD. Check input parameters or wavelength validity.</p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Nominal Ocular Hazard Distance (NOHD)</h4>
                <div className={`p-3 rounded-md ${
                  nohdResults.nohd === Infinity 
                    ? 'bg-red-100 border border-red-300' 
                    : nohdResults.nohd === 0
                      ? 'bg-green-100 border border-green-300'
                      : nohdResults.nohd > 3
                        ? 'bg-red-100 border border-red-300' 
                        : nohdResults.nohd > 0.1
                          ? 'bg-yellow-100 border border-yellow-300'
                          : 'bg-green-100 border border-green-300'
                }`}>
                  <p className={`font-bold text-2xl ${
                    nohdResults.nohd === Infinity 
                      ? 'text-red-700' 
                      : nohdResults.nohd === 0
                        ? 'text-green-700'
                        : nohdResults.nohd > 3
                          ? 'text-red-700' 
                          : nohdResults.nohd > 0.1
                            ? 'text-yellow-700'
                            : 'text-green-700'
                  }`}>
                    {nohdResults.nohd === Infinity 
                      ? "∞ (Infinite)"
                      : nohdResults.nohd === 0
                        ? "0 m (Safe)"
                        : nohdResults.nohd < 1 && nohdResults.nohd !== 0
                          ? `${(nohdResults.nohd * 100).toFixed(1)} cm` 
                          : nohdResults.nohd < 1000 
                            ? `${nohdResults.nohd.toFixed(2)} m`
                            : `${(nohdResults.nohd / 1000).toFixed(2)} km`
                    }
                  </p>
                  <p className="text-sm mt-1 font-medium">{nohdResults.hazardClass}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Detailed Analysis</h4>
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">MPE Used</td>
                      <td className="px-3 py-2 font-mono">
                        {nohdResults.mpe < 0.001 && nohdResults.mpe !== 0
                          ? nohdResults.mpe.toExponential(3) 
                          : nohdResults.mpe.toFixed(6)
                        } W/cm²
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Initial Power Density</td>
                      <td className="px-3 py-2 font-mono">
                        {nohdResults.initialPowerDensity < 0.001 && nohdResults.initialPowerDensity !== 0
                          ? nohdResults.initialPowerDensity.toExponential(3)
                          : nohdResults.initialPowerDensity.toFixed(6)
                        } W/cm²
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Beam Diameter at NOHD</td>
                      <td className="px-3 py-2 font-mono">
                        {nohdResults.beamDiameterAtNOHD === Infinity 
                          ? "N/A (infinite)" 
                          : `${nohdResults.beamDiameterAtNOHD.toFixed(2)} mm`}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Irradiance at NOHD</td>
                      <td className="px-3 py-2 font-mono">
                        {nohdResults.irradianceAtNOHD === 0 && nohdResults.nohd === Infinity 
                          ? "N/A (infinite)" 
                          : nohdResults.irradianceAtNOHD < 0.001 && nohdResults.irradianceAtNOHD !== 0
                            ? nohdResults.irradianceAtNOHD.toExponential(3) 
                            : nohdResults.irradianceAtNOHD.toFixed(6)
                        } W/cm²
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Safety Factor</td>
                      <td className="px-3 py-2">
                        {nohdResults.nohd === Infinity 
                          ? "∞ (Exceeds MPE)" 
                          : nohdResults.nohd === 0
                            ? "Safe at all distances"
                            : `${(nohdResults.initialPowerDensity / nohdResults.mpe).toFixed(1)}× above MPE initially`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Calculation Process (IEC 60825-1:2014)</h4>
                <div className="bg-white p-3 rounded-md max-h-64 overflow-y-auto">
                  <div className="text-xs font-mono space-y-1">
                    {nohdResults.calculationSteps.map((step: string, index: number) => (
                      <div key={index} className={
                        step.startsWith('===') ? 'font-bold text-blue-700 mt-2' : 
                        step.includes('ERROR') ? 'text-red-700 font-medium' :
                        step.includes('NOHD:') || step.includes('Results') ? 'font-bold text-green-700' : 
                        step === '' ? 'h-1' : ''
                      }>
                        {step || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <Icons.InfoInline />
                  Safety Recommendations
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                  {nohdResults.nohd === Infinity && (
                    <>
                      <li className="font-medium text-red-800">IMMEDIATE ACTION REQUIRED: This laser exceeds MPE at all distances</li>
                      <li className="font-medium text-red-800">Implement engineering controls to reduce beam power or increase divergence</li>
                      <li className="font-medium text-red-800">Ensure no personnel can access the beam path without appropriate protection</li>
                    </>
                  )}
                  {nohdResults.nohd > 100 && nohdResults.nohd !== Infinity && (
                    <>
                      <li>Establish controlled area extending {nohdResults.nohd.toFixed(0)} m from laser</li>
                      <li>Consider beam path in adjacent buildings or areas</li>
                      <li>Aircraft and vehicle safety protocols may be required</li>
                    </>
                  )}
                  {nohdResults.nohd > 3 && nohdResults.nohd <= 100 && (
                    <>
                      <li>Establish controlled area of at least {nohdResults.nohd.toFixed(1)} m radius</li>
                      <li>Post appropriate warning signs at hazard zone boundaries</li>
                      <li>Consider eye protection requirements within NOHD</li>
                    </>
                  )}
                  {nohdResults.nohd > 0 && nohdResults.nohd <= 3 && (
                    <>
                      <li>Hazard zone extends {nohdResults.nohd < 1 ? `${(nohdResults.nohd * 100).toFixed(1)} cm` : `${nohdResults.nohd.toFixed(2)} m`}</li>
                      <li>Ensure proper beam termination beyond this distance</li>
                      <li>Eye protection recommended for direct beam viewing</li>
                    </>
                  )}
                  {nohdResults.nohd === 0 && (
                    <>
                      <li className="text-green-800">Laser operates below MPE at all distances</li>
                      <li className="text-green-800">Standard safety precautions still apply</li>
                      <li className="text-green-800">Avoid intentional direct viewing regardless</li>
                    </>
                  )}
                  <li>This calculation assumes direct intrabeam viewing - diffuse reflections may still pose risks</li>
                  <li>Additional safety factors should be applied in practice</li>
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
              This NOHD calculator uses the latest IEC 60825-1:2014 MPE values with proper correction factors, 
              extended source considerations, and wavelength-specific hazard mechanisms. The calculation follows 
              standard beam propagation formulas: NOHD = (1/Φ) × [√(4P/(π×MPE)) - D₀] where Φ is beam divergence, 
              P is laser power, and D₀ is initial beam diameter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NOHDCalculator;