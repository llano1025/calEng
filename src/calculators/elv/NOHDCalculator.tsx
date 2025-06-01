import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { 
  NOHDResult, 
  MPE_CONSTANTS, 
  calculateMPEValue 
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
    if (power <= 0 || beamDiameter <= 0 || beamDivergence <= 0) {
      setNohdResults(null);
      setCalculationPerformed(false);
      return;
    }

    setIsCalculating(true);
    
    try {
      const mpeResult = calculateMPEValue(wavelength, exposureTime, 'continuous');
      let mpe_W_cm2 = mpeResult.criticalMPE;
      
      if (!mpeResult.limitingMechanism.includes('CW') && !mpeResult.limitingMechanism.includes('W/cm²')) {
         if (exposureTime > 0) {
            mpe_W_cm2 = mpeResult.criticalMPE / exposureTime;
         } else {
            mpe_W_cm2 = 0;
         }
      }
      
      if (mpe_W_cm2 <= 0) {
          setNohdResults(null);
          setCalculationPerformed(false);
          setIsCalculating(false);
          return;
      }

      const powerWatts = power * MPE_CONSTANTS.MW_TO_W;
      const beamDiameterAtAperture_m = beamDiameter * MPE_CONSTANTS.MM_TO_CM / 100;
      const beamDivergenceRad = beamDivergence * MPE_CONSTANTS.MRAD_TO_RAD;

      const mpe_W_m2 = mpe_W_cm2 * MPE_CONSTANTS.M2_TO_CM2;

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
          const sqrtVal = Math.sqrt(termInsideSqrt);
          nohd_m = (1 / beamDivergenceRad) * (sqrtVal - beamDiameterAtAperture_m);
          calculationSteps.push(`NOHD = (1/${beamDivergenceRad.toExponential(3)}) × (√${termInsideSqrt.toExponential(3)} - ${beamDiameterAtAperture_m.toExponential(3)})`);
          calculationSteps.push(`   = (1/${beamDivergenceRad.toExponential(3)}) × (${sqrtVal.toExponential(3)} - ${beamDiameterAtAperture_m.toExponential(3)}) = ${nohd_m.toFixed(3)} m`);
        } else {
          calculationSteps.push(`Error: Negative term inside square root. Cannot calculate NOHD.`);
          nohd_m = 0;
        }
      } else {
        calculationSteps.push(`Error: Beam divergence is zero. NOHD is infinite if P/A > MPE, or zero otherwise.`);
        const initialArea_m2 = Math.PI * Math.pow(beamDiameterAtAperture_m / 2, 2);
        const initialIrradiance_W_m2 = powerWatts / initialArea_m2;
        if (initialIrradiance_W_m2 > mpe_W_m2) {
            nohd_m = Infinity;
        } else {
            nohd_m = 0;
        }
        calculationSteps.push(`Initial irradiance: ${initialIrradiance_W_m2.toExponential(3)} W/m². NOHD = ${nohd_m === Infinity ? "∞" : "0"} m.`);
      }
      
      if (nohd_m < 0) nohd_m = 0;

      const beamDiameterAtNOHD_m = beamDiameterAtAperture_m + nohd_m * beamDivergenceRad;
      const beamAreaAtNOHD_m2 = Math.PI * Math.pow(beamDiameterAtNOHD_m / 2, 2);
      const irradianceAtNOHD_W_m2 = powerWatts / beamAreaAtNOHD_m2;

      const initialBeamArea_cm2 = Math.PI * Math.pow((beamDiameter * MPE_CONSTANTS.MM_TO_CM) / 2, 2);
      const initialPowerDensity_W_cm2 = powerWatts / initialBeamArea_cm2;

      let hazardClass = '';
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
        beamDiameterAtNOHD: nohd_m === Infinity ? Infinity : beamDiameterAtNOHD_m * 1000,
        irradianceAtNOHD: nohd_m === Infinity ? 0 : irradianceAtNOHD_W_m2 / MPE_CONSTANTS.M2_TO_CM2,
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
          <h3 className="font-medium text-lg mb-4">Laser Beam Parameters</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laser Power (mW)
            </label>
            <input
              type="number"
              min="0.001"
              max="1e9"
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
              min="0.001"
              max="1000"
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
              min="0"
              max="1000"
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

          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">About NOHD Calculations</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>NOHD is the distance beyond which direct beam exposure is below the MPE level.</li>
              <li>Calculations assume Gaussian beam propagation and direct intrabeam viewing.</li>
              <li>Uses enhanced MPE calculations with proper correction factors.</li>
              <li>Always establish controlled areas based on NOHD and other safety considerations.</li>
              <li>Consider eye protection even outside the NOHD for additional safety margins.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NOHDCalculator;