import React, { useState } from 'react';
import { Icons } from '../../components/Icons';

// Define props type for the component
interface PowerFactorCalculatorProps {
  onShowTutorial: () => void; // Function to show tutorial
}

// Power Factor Calculator Component
const PowerFactorCalculator: React.FC<PowerFactorCalculatorProps> = ({ onShowTutorial }) => {
  // State for power factor correction calculator inputs
  const [powerFactorInputs, setPowerFactorInputs] = useState({
    loadPower: '1000', // in kW
    initialPowerFactor: '0.7', // initial power factor
    targetPowerFactor: '0.85', // target power factor
    harmonicDistortion: '5', // percentage THD
  });

  // State for calculation results
  const [powerFactorResults, setPowerFactorResults] = useState<any>(null);

  // Handler for input changes
  const handlePowerFactorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPowerFactorInputs({ ...powerFactorInputs, [e.target.name]: e.target.value });
    setPowerFactorResults(null); // Clear results on input change
  };

  // Power factor calculation function
  const calculatePowerFactor = () => {
    const power = parseFloat(powerFactorInputs.loadPower);
    const initialPF = parseFloat(powerFactorInputs.initialPowerFactor);
    const targetPF = parseFloat(powerFactorInputs.targetPowerFactor);
    const thdValue = parseFloat(powerFactorInputs.harmonicDistortion);
    const thd = thdValue / 100;

    if (isNaN(power) || isNaN(initialPF) || isNaN(targetPF) || isNaN(thd)) {
      alert("Please enter valid numeric values for all fields.");
      return;
    }

    // Calculate total power factor with harmonics effect for both initial and target PF
    const initialTotalPF = initialPF;
    const targetTotalPF = targetPF * Math.sqrt(1 + Math.pow(thd, 2));
    
    // Calculate angles using the corrected power factors
    const initialAngle = Math.acos(initialTotalPF);
    const targetAngle = Math.acos(targetTotalPF);
    
    // Calculate tangents
    const initialTan = Math.tan(initialAngle);
    const targetTan = Math.tan(targetAngle);
    
    // Calculate required kVAr for power factor correction
    const kVArRequired = power * (initialTan - targetTan);
    
    // Calculate existing and new kVA values using corrected PFs
    const initialKVA = power / initialTotalPF;
    const targetKVA = power / targetTotalPF;
    const kVAReduction = initialKVA - targetKVA;
    
    // Calculate standard capacitor bank size
    // Standard sizes are typically in multiples of 25 kVAr
    const standardCapacitorSize = Math.ceil(kVArRequired / 25) * 25;

    // Set results
    setPowerFactorResults({
      initialTotalPF: initialTotalPF.toFixed(3),
      targetTotalPF: targetTotalPF.toFixed(3),
      initialAngleDegrees: (initialAngle * 180 / Math.PI).toFixed(2),
      targetAngleDegrees: (targetAngle * 180 / Math.PI).toFixed(2),
      initialTan: initialTan.toFixed(4),
      targetTan: targetTan.toFixed(4),
      kVArRequired: kVArRequired.toFixed(1),
      kVAReduction: kVAReduction.toFixed(1),
      initialKVA: initialKVA.toFixed(1),
      targetKVA: targetKVA.toFixed(1),
      standardCapacitorSize: standardCapacitorSize
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Power Factor Correction Calculator</h2>
        <button onClick={onShowTutorial} className="flex items-center text-blue-600 hover:text-blue-800">
          <Icons.InfoInline /> Tutorial
        </button>
      </div>
      <p className="mb-4 text-gray-600">
        Calculates required capacitor bank size for power factor correction.
      </p>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-medium mb-1 text-sm">Load Power (kW)</label>
          <input
            type="number"
            name="loadPower"
            value={powerFactorInputs.loadPower}
            onChange={handlePowerFactorInputChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-sm">Initial Displacement Power Factor</label>
          <input
            type="number"
            name="initialPowerFactor"
            value={powerFactorInputs.initialPowerFactor}
            onChange={handlePowerFactorInputChange}
            className="w-full p-2 border rounded-md text-sm"
            min="0.1"
            max="1"
            step="0.01"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-sm">Target Power Factor</label>
          <input
            type="number"
            name="targetPowerFactor"
            value={powerFactorInputs.targetPowerFactor}
            onChange={handlePowerFactorInputChange}
            className="w-full p-2 border rounded-md text-sm"
            min="0.1"
            max="1"
            step="0.01"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-sm">Harmonic Distortion (THD %)</label>
          <input
            type="number"
            name="harmonicDistortion"
            value={powerFactorInputs.harmonicDistortion}
            onChange={handlePowerFactorInputChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculatePowerFactor}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
      >
        Calculate Power Factor Correction
      </button>

      {/* Results Display */}
      {powerFactorResults && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          
          <div className="mt-3 text-sm">
            <h4 className="font-medium">1. Total Power Factor with Harmonic Distortion</h4>
            <div className="pl-4 py-1 bg-white rounded my-1 overflow-x-auto">
              <p className="font-mono">
                Target Total PF = Displacement PF / √(1 + THD²) = {powerFactorInputs.targetPowerFactor} / √(1 + {parseFloat(powerFactorInputs.harmonicDistortion)/100}²) = {powerFactorResults.targetTotalPF}
              </p>
            </div>
            
            <h4 className="font-medium mt-2">2. Angles and Tangent Values</h4>
            <div className="pl-4 py-1 bg-white rounded my-1 overflow-x-auto">
              <p className="font-mono">Initial Angle = cos⁻¹({powerFactorResults.initialTotalPF}) = {powerFactorResults.initialAngleDegrees}°</p>
              <p className="font-mono">Target Angle = cos⁻¹({powerFactorResults.targetTotalPF}) = {powerFactorResults.targetAngleDegrees}°</p>
              <p className="font-mono">Initial Tangent = tan({powerFactorResults.initialAngleDegrees}°) = {powerFactorResults.initialTan}</p>
              <p className="font-mono">Target Tangent = tan({powerFactorResults.targetAngleDegrees}°) = {powerFactorResults.targetTan}</p>
            </div>
            
            <h4 className="font-medium mt-2">3. Required Reactive Power Calculation</h4>
            <div className="pl-4 py-1 bg-white rounded my-1 overflow-x-auto">
              <p className="font-mono">
                kVAr Required = P × [tan(cos⁻¹(Initial Total PF)) - tan(cos⁻¹(Target Total PF))]
              </p>
              <p className="font-mono">
                kVAr = {powerFactorInputs.loadPower} × [{powerFactorResults.initialTan} - {powerFactorResults.targetTan}] = {powerFactorResults.kVArRequired} kVAr
              </p>
            </div>
            
            <h4 className="font-medium mt-2">4. Apparent Power Reduction</h4>
            <div className="pl-4 py-1 bg-white rounded my-1 overflow-x-auto">
              <p className="font-mono">Initial kVA = {powerFactorInputs.loadPower} / {powerFactorResults.initialTotalPF} = {powerFactorResults.initialKVA} kVA</p>
              <p className="font-mono">Target kVA = {powerFactorInputs.loadPower} / {powerFactorResults.targetTotalPF} = {powerFactorResults.targetKVA} kVA</p>
              <p className="font-mono">kVA Reduction = {powerFactorResults.initialKVA} - {powerFactorResults.targetKVA} = {powerFactorResults.kVAReduction} kVA</p>
            </div>
          </div>
          
          <div className="mt-4 bg-green-100 p-3 rounded-lg">
            <h4 className="font-semibold">Final Capacitor Bank Size:</h4>
            <p className="text-lg">Minimum Required: <span className="font-bold">{powerFactorResults.kVArRequired} kVAr</span></p>
            <p className="text-sm mt-1">Standard Bank Size: {powerFactorResults.standardCapacitorSize} kVAr (next standard size)</p>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            Note: Standard capacitor banks are typically available in fixed sizes (usually multiples of 25 kVAr). The actual size should be selected based on available equipment options.
          </div>
        </div>
      )}

      {/* Explanatory Section */}
      <div className="mt-8 border-t pt-4">
        <h3 className="text-lg font-medium mb-2">About Power Factor Correction</h3>
        <div className="text-sm text-gray-700">
          <p>Power factor correction improves electrical efficiency by reducing reactive power demand. Low power factor (below 0.9) results in:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Increased apparent power (kVA) for the same active power (kW)</li>
            <li>Reduced capacity in electrical distribution systems</li>
            <li>Increased voltage drop and system losses</li>
          </ul>
          <p className="mt-2">Capacitor banks provide reactive power locally, reducing the amount that must be supplied by the utility.</p>
        </div>
      </div>
    </div>
  );
};

export default PowerFactorCalculator;