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

interface DualNOHDResult {
  eye: NOHDResult;
  skin: NOHDResult;
  criticalNOHD: 'eye' | 'skin';
  maxNOHD: number;
}

const NOHDCalculator: React.FC<NOHDCalculatorProps> = ({ onShowTutorial }) => {

  const [power, setPower] = useState<number>(5);
  const [beamDiameter, setBeamDiameter] = useState<number>(2);
  const [beamDivergence, setBeamDivergence] = useState<number>(1);
  const [wavelength, setWavelength] = useState<number>(532);
  const [exposureTime, setExposureTime] = useState<number>(0.25);
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [nohdResults, setNohdResults] = useState<DualNOHDResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAutoCalculation();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [power, beamDiameter, beamDivergence, wavelength, exposureTime]);

  const calculateNOHDForTarget = (mpe_W_cm2: number, targetType: 'eye' | 'skin'): NOHDResult => {
    const powerWatts = power * MPE_CONSTANTS.MW_TO_W;
    const beamDiameterAtAperture_m = beamDiameter * MPE_CONSTANTS.MM_TO_M;
    const beamDivergenceRad = beamDivergence * MPE_CONSTANTS.MRAD_TO_RAD;
    const mpe_W_m2 = mpe_W_cm2 * MPE_CONSTANTS.M2_TO_CM2;

    let nohd_m = 0;
    let calculationSteps = [
      `=== NOHD Calculation for ${targetType.toUpperCase()} ===`,
      `Laser power (P): ${power} mW = ${powerWatts.toExponential(3)} W`,
      `Beam diameter at aperture (D0): ${beamDiameter} mm = ${beamDiameterAtAperture_m.toExponential(3)} m`,
      `Beam divergence (Φ): ${beamDivergence} mrad = ${beamDivergenceRad.toExponential(3)} rad`,
      `MPE for ${targetType}: ${mpe_W_cm2.toExponential(3)} W/cm² = ${mpe_W_m2.toExponential(3)} W/m²`,
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
        calculationSteps.push(`NOHD (${targetType}): (1/${beamDivergenceRad.toExponential(3)}) × ${termInBrackets.toExponential(3)} = ${nohd_m.toFixed(3)} m`);
      } else {
        calculationSteps.push(`ERROR: Negative term inside square root (${termInsideSqrt.toExponential(3)})`);
        nohd_m = 0;
      }
    } else {
      calculationSteps.push(`Special case: Beam divergence = 0 (collimated beam)`);
      const initialArea_m2 = Math.PI * Math.pow(beamDiameterAtAperture_m / 2, 2);
      const initialIrradiance_W_m2 = powerWatts / initialArea_m2;
      
      if (initialIrradiance_W_m2 > mpe_W_m2) {
        nohd_m = Infinity;
        calculationSteps.push(`Initial irradiance > MPE: NOHD (${targetType}) = ∞ (infinite)`);
      } else {
        nohd_m = 0;
        calculationSteps.push(`Initial irradiance ≤ MPE: NOHD (${targetType}) = 0 m (safe at all distances)`);
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

    // Determine hazard classification for this target
    let hazardClass = '';
    if (nohd_m === Infinity) {
      hazardClass = `EXTREME ${targetType.toUpperCase()} HAZARD - Collimated beam exceeding MPE at all distances`;
    } else if (nohd_m === 0) {
      hazardClass = `SAFE for ${targetType.toUpperCase()} - Irradiance below MPE at all distances`;
    } else if (nohd_m < 0.1) {
      hazardClass = `LOW ${targetType.toUpperCase()} HAZARD - NOHD < 10 cm`;
    } else if (nohd_m < 3) {
      hazardClass = `MODERATE ${targetType.toUpperCase()} HAZARD - NOHD < 3 m`;
    } else if (nohd_m < 100) {
      hazardClass = `HIGH ${targetType.toUpperCase()} HAZARD - NOHD < 100 m`;
    } else {
      hazardClass = `VERY HIGH ${targetType.toUpperCase()} HAZARD - NOHD ≥ 100 m`;
    }

    return {
      nohd: nohd_m,
      mpe: mpe_W_cm2,
      beamDiameterAtNOHD: nohd_m === Infinity ? Infinity : beamDiameterAtNOHD_m * 1000,
      irradianceAtNOHD: nohd_m === Infinity ? 0 : irradianceAtNOHD_W_m2 / MPE_CONSTANTS.M2_TO_CM2,
      hazardClass: hazardClass,
      initialPowerDensity: initialPowerDensity_W_cm2,
      calculationSteps: calculationSteps
    };
  };

  const performAutoCalculation = () => {
    if (power <= 0 || beamDiameter <= 0 || beamDivergence < 0) {
      setNohdResults(null);
      setCalculationPerformed(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      // Get MPE for both eye and skin
      const eyeMpeResult = IEC_AEL_TABLES.getMPEIrriance(wavelength, exposureTime, 1.0);
      const skinMpeResult = IEC_AEL_TABLES.getMPESkin(wavelength, exposureTime);
      
      // Convert MPE to W/cm² for both targets
      const convertMPE = (mpeResult: any) => {
        if (mpeResult.unit.includes('W/m²')) {
          return mpeResult.value / MPE_CONSTANTS.M2_TO_CM2;
        } else if (mpeResult.unit.includes('J/m²')) {
          if (exposureTime > 0) {
            return (mpeResult.value / exposureTime) / MPE_CONSTANTS.M2_TO_CM2;
          } else {
            return 0;
          }
        } else if (mpeResult.unit.includes('W') && !mpeResult.unit.includes('/')) {
          const eyeApertureArea_cm2 = Math.PI * Math.pow(0.35, 2);
          return mpeResult.value / eyeApertureArea_cm2;
        } else {
          return mpeResult.value;
        }
      };

      const eyeMPE_W_cm2 = convertMPE(eyeMpeResult);
      const skinMPE_W_cm2 = convertMPE(skinMpeResult);
      
      if (eyeMPE_W_cm2 <= 0 || skinMPE_W_cm2 <= 0) {
        setNohdResults(null);
        setCalculationPerformed(false);
        setIsCalculating(false);
        return;
      }

      // Calculate NOHD for both eye and skin
      const eyeResult = calculateNOHDForTarget(eyeMPE_W_cm2, 'eye');
      const skinResult = calculateNOHDForTarget(skinMPE_W_cm2, 'skin');

      // Determine which is more critical (longer NOHD)
      let criticalNOHD: 'eye' | 'skin' = 'eye';
      let maxNOHD = eyeResult.nohd;

      if (skinResult.nohd === Infinity && eyeResult.nohd !== Infinity) {
        criticalNOHD = 'skin';
        maxNOHD = Infinity;
      } else if (eyeResult.nohd === Infinity && skinResult.nohd !== Infinity) {
        criticalNOHD = 'eye';
        maxNOHD = Infinity;
      } else if (skinResult.nohd > eyeResult.nohd) {
        criticalNOHD = 'skin';
        maxNOHD = skinResult.nohd;
      }

      const results = {
        eye: eyeResult,
        skin: skinResult,
        criticalNOHD: criticalNOHD,
        maxNOHD: maxNOHD
      };
      
      setNohdResults(results);
      setCalculationPerformed(true);
      
      // Results calculated successfully
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

  const formatDistance = (distance: number) => {
    if (distance === Infinity) return "∞ (Infinite)";
    if (distance === 0) return "0 m (Safe)";
    if (distance < 1 && distance !== 0) return `${(distance * 100).toFixed(1)} cm`;
    if (distance < 1000) return `${distance.toFixed(2)} m`;
    return `${(distance / 1000).toFixed(2)} km`;
  };

  const getHazardColor = (distance: number) => {
    if (distance === Infinity) return 'red';
    if (distance === 0) return 'green';
    if (distance > 3) return 'red';
    if (distance > 0.1) return 'yellow';
    return 'green';
  };

  return (
    <div className="space-y-6">
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
              <p>Calculating NOHD for eye and skin using IEC 60825-1:2014...</p>
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
              {/* Critical NOHD Summary */}
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Critical NOHD (Most Restrictive)</h4>
                <div className={`p-3 rounded-md border-2 ${
                  getHazardColor(nohdResults.maxNOHD) === 'red' 
                    ? 'bg-red-100 border-red-300' 
                    : getHazardColor(nohdResults.maxNOHD) === 'yellow'
                      ? 'bg-yellow-100 border-yellow-300'
                      : 'bg-green-100 border-green-300'
                }`}>
                  <p className={`font-bold text-2xl ${
                    getHazardColor(nohdResults.maxNOHD) === 'red' 
                      ? 'text-red-700' 
                      : getHazardColor(nohdResults.maxNOHD) === 'yellow'
                        ? 'text-yellow-700'
                        : 'text-green-700'
                  }`}>
                    {formatDistance(nohdResults.maxNOHD)}
                  </p>
                  <p className="text-sm mt-1 font-medium">
                    Critical target: {nohdResults.criticalNOHD.toUpperCase()} 
                    {nohdResults.criticalNOHD === 'eye' && nohdResults.skin.nohd < nohdResults.eye.nohd 
                      ? ' (Eye hazard exceeds skin hazard)' 
                      : nohdResults.criticalNOHD === 'skin' && nohdResults.eye.nohd < nohdResults.skin.nohd
                        ? ' (Skin hazard exceeds eye hazard)'
                        : ' (Both targets have same NOHD)'
                    }
                  </p>
                </div>
              </div>

              {/* Individual NOHD Results */}
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Individual NOHD Values</h4>
                <div className="grid grid-cols-1 gap-4">
                  {/* Eye NOHD */}
                  <div className={`p-3 rounded-md border ${
                    getHazardColor(nohdResults.eye.nohd) === 'red' 
                      ? 'bg-red-50 border-red-200' 
                      : getHazardColor(nohdResults.eye.nohd) === 'yellow'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">👁️ Eye NOHD:</span>
                      <span className={`font-bold ${
                        getHazardColor(nohdResults.eye.nohd) === 'red' 
                          ? 'text-red-700' 
                          : getHazardColor(nohdResults.eye.nohd) === 'yellow'
                            ? 'text-yellow-700'
                            : 'text-green-700'
                      }`}>
                        {formatDistance(nohdResults.eye.nohd)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      MPE: {nohdResults.eye.mpe.toExponential(3)} W/cm²
                    </p>
                  </div>

                  {/* Skin NOHD */}
                  <div className={`p-3 rounded-md border ${
                    getHazardColor(nohdResults.skin.nohd) === 'red' 
                      ? 'bg-red-50 border-red-200' 
                      : getHazardColor(nohdResults.skin.nohd) === 'yellow'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">🖐️ Skin NOHD:</span>
                      <span className={`font-bold ${
                        getHazardColor(nohdResults.skin.nohd) === 'red' 
                          ? 'text-red-700' 
                          : getHazardColor(nohdResults.skin.nohd) === 'yellow'
                            ? 'text-yellow-700'
                            : 'text-green-700'
                      }`}>
                        {formatDistance(nohdResults.skin.nohd)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      MPE: {nohdResults.skin.mpe.toExponential(3)} W/cm²
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis Table */}
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Detailed Analysis</h4>
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Parameter</th>
                      <th className="px-3 py-2 text-center">👁️ Eye</th>
                      <th className="px-3 py-2 text-center">🖐️ Skin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">NOHD</td>
                      <td className="px-3 py-2 text-center font-mono">
                        {formatDistance(nohdResults.eye.nohd)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {formatDistance(nohdResults.skin.nohd)}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">MPE Used</td>
                      <td className="px-3 py-2 text-center font-mono">
                        {nohdResults.eye.mpe.toExponential(3)} W/cm²
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {nohdResults.skin.mpe.toExponential(3)} W/cm²
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Beam Dia. at NOHD</td>
                      <td className="px-3 py-2 text-center font-mono">
                        {nohdResults.eye.beamDiameterAtNOHD === Infinity 
                          ? "N/A" 
                          : `${nohdResults.eye.beamDiameterAtNOHD.toFixed(2)} mm`}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {nohdResults.skin.beamDiameterAtNOHD === Infinity 
                          ? "N/A" 
                          : `${nohdResults.skin.beamDiameterAtNOHD.toFixed(2)} mm`}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Safety Factor</td>
                      <td className="px-3 py-2 text-center">
                        {nohdResults.eye.nohd === Infinity 
                          ? "∞" 
                          : nohdResults.eye.nohd === 0
                            ? "Safe"
                            : `${(nohdResults.eye.initialPowerDensity / nohdResults.eye.mpe).toFixed(1)}×`}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {nohdResults.skin.nohd === Infinity 
                          ? "∞" 
                          : nohdResults.skin.nohd === 0
                            ? "Safe"
                            : `${(nohdResults.skin.initialPowerDensity / nohdResults.skin.mpe).toFixed(1)}×`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculation Steps for Critical Target */}
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">
                  Calculation Process - {nohdResults.criticalNOHD.toUpperCase()} (Critical)
                </h4>
                <div className="bg-white p-3 rounded-md max-h-64 overflow-y-auto">
                  <div className="text-xs font-mono space-y-1">
                    {nohdResults[nohdResults.criticalNOHD].calculationSteps.map((step: string, index: number) => (
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

              {/* Safety Recommendations */}
              <div className="mb-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <Icons.InfoInline />
                  Safety Recommendations
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                  {nohdResults.maxNOHD === Infinity && (
                    <>
                      <li className="font-medium text-red-800">
                        IMMEDIATE ACTION REQUIRED: This laser exceeds {nohdResults.criticalNOHD} MPE at all distances
                      </li>
                      <li className="font-medium text-red-800">
                        Implement engineering controls to reduce beam power or increase divergence
                      </li>
                      <li className="font-medium text-red-800">
                        Ensure no personnel can access the beam path without appropriate protection
                      </li>
                    </>
                  )}
                  {nohdResults.maxNOHD > 100 && nohdResults.maxNOHD !== Infinity && (
                    <>
                      <li>Establish controlled area extending {nohdResults.maxNOHD.toFixed(0)} m from laser</li>
                      <li>Critical target: {nohdResults.criticalNOHD} hazard governs safety distance</li>
                      <li>Consider beam path in adjacent buildings or areas</li>
                      <li>Aircraft and vehicle safety protocols may be required</li>
                    </>
                  )}
                  {nohdResults.maxNOHD > 3 && nohdResults.maxNOHD <= 100 && (
                    <>
                      <li>Establish controlled area of at least {nohdResults.maxNOHD.toFixed(1)} m radius</li>
                      <li>Post appropriate warning signs at hazard zone boundaries</li>
                      <li>
                        {nohdResults.criticalNOHD === 'eye' 
                          ? 'Eye protection required within NOHD - skin exposure may also be hazardous'
                          : 'Skin protection required within NOHD - eye protection also recommended'
                        }
                      </li>
                    </>
                  )}
                  {nohdResults.maxNOHD > 0 && nohdResults.maxNOHD <= 3 && (
                    <>
                      <li>
                        Hazard zone extends {formatDistance(nohdResults.maxNOHD)} 
                        (limited by {nohdResults.criticalNOHD} exposure)
                      </li>
                      <li>Ensure proper beam termination beyond this distance</li>
                      <li>
                        Both eye and skin protection recommended for direct beam viewing
                      </li>
                    </>
                  )}
                  {nohdResults.maxNOHD === 0 && (
                    <>
                      <li className="text-green-800">
                        Laser operates below both eye and skin MPE at all distances
                      </li>
                      <li className="text-green-800">Standard safety precautions still apply</li>
                      <li className="text-green-800">Avoid intentional direct viewing regardless</li>
                    </>
                  )}
                  <li>
                    Always use the most restrictive NOHD (currently {nohdResults.criticalNOHD}) for safety planning
                  </li>
                  <li>Consider both direct beam and diffuse reflection hazards</li>
                  <li>Additional safety factors should be applied in practice</li>
                </ul>
              </div>

              {/* IEC Compliance Note */}
              <div className="mt-6 bg-green-50 p-3 rounded-md border border-green-300">
                <h4 className="font-medium text-green-800 mb-2 flex items-center">
                  <Icons.CheckCircle />
                  IEC 60825-1:2014 Compliance
                </h4>
                <p className="text-sm text-green-800">
                  This NOHD calculator evaluates both eye and skin hazards using IEC 60825-1:2014 MPE values. 
                  The critical NOHD (most restrictive) is automatically identified and should be used for safety 
                  zone establishment. Eye and skin MPE values differ significantly based on wavelength and 
                  exposure duration, making dual assessment essential for comprehensive laser safety.
                </p>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
  );
};

export default NOHDCalculator;