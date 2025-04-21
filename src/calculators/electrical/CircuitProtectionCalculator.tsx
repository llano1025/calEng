import React, { useState } from 'react';
import { Icons } from '../../components/Icons';

// Define props type for the component
interface CircuitProtectionCalculatorProps {
  onShowTutorial: () => void; // Function to show tutorial
}

// Circuit Protection Calculator Component
const CircuitProtectionCalculator: React.FC<CircuitProtectionCalculatorProps> = ({ onShowTutorial }) => {
  // State for circuit protection calculator inputs
  const [circuitProtectionInputs, setCircuitProtectionInputs] = useState({
    faultLevel: '5000', // in amperes
    breakerRating: '400', // in amperes
    breakerType: 'mccb', // 'mccb', 'mcb' or 'fuse'
    cableCsa: '120', // cable cross-sectional area in mm²
    cableLength: '80', // in meters
    disconnectionTime: '0.4', // in seconds
    cableType: 'xlpe', // 'pvc' or 'xlpe'
  });

  // State for calculation results
  const [circuitProtectionResults, setCircuitProtectionResults] = useState<any>(null);

  // Handler for input changes
  const handleCircuitProtectionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCircuitProtectionInputs({ ...circuitProtectionInputs, [e.target.name]: e.target.value });
    setCircuitProtectionResults(null); // Clear results on input change
  };

  // Circuit protection calculation function
  const calculateCircuitProtection = () => {
    const faultLevel = parseFloat(circuitProtectionInputs.faultLevel);
    const breakerRating = parseFloat(circuitProtectionInputs.breakerRating);
    const breakerType = circuitProtectionInputs.breakerType;
    const cableCsa = parseFloat(circuitProtectionInputs.cableCsa);
    const cableLength = parseFloat(circuitProtectionInputs.cableLength);
    const disconnectionTime = parseFloat(circuitProtectionInputs.disconnectionTime);
    const cableType = circuitProtectionInputs.cableType;

    if (isNaN(faultLevel) || isNaN(breakerRating) || isNaN(cableCsa) || isNaN(cableLength) || isNaN(disconnectionTime)) {
      alert("Please enter valid numeric values for all fields.");
      return;
    }

    // Calculate cable impedance (simplified)
    // Using approximate values for mΩ/m
    const cableResistancePerMeter = 22.5 / cableCsa; // Approximate resistivity for copper in mOhm/m at operating temp
    const cableReactancePerMeter = 0.08; // Approximate reactance in mOhm/m
    const cableImpedancePerMeter = Math.sqrt(Math.pow(cableResistancePerMeter, 2) + Math.pow(cableReactancePerMeter, 2));
    const cableImpedance = (cableImpedancePerMeter * cableLength) / 1000; // in ohms

    // Calculate fault current at end of cable (simplified - assuming phase-to-neutral voltage)
    const phaseVoltage = 220; // Assuming 380V system phase-to-neutral is ~220V
    const faultCurrentAtEnd = phaseVoltage / cableImpedance; // Simplified calculation

    // Determine if fault current is sufficient for circuit breaker to operate within required time
    let operatingTime: number;
    let protectionStatus: string;

    // Simplified trip curves
    if (breakerType === 'mcb') { // Type B/C MCB approximation
      if (faultCurrentAtEnd > 5 * breakerRating) operatingTime = 0.01; // Instantaneous
      else if (faultCurrentAtEnd > 3 * breakerRating) operatingTime = 0.1; // Short time (~5s for thermal)
      else operatingTime = 10.0; // Thermal (can be longer)
    } else if (breakerType === 'mccb') {
      if (faultCurrentAtEnd > 10 * breakerRating) operatingTime = 0.02; // Instantaneous
      else if (faultCurrentAtEnd > 1.5 * breakerRating) operatingTime = 0.2; // Short time delay (adjustable)
      else operatingTime = 20.0; // Long time delay (adjustable)
    } else { // fuse (gG type approximation)
      if (faultCurrentAtEnd > 6 * breakerRating) operatingTime = 0.01;
      else if (faultCurrentAtEnd > 2 * breakerRating) operatingTime = 0.1;
      else operatingTime = 10.0; // Can be much longer
    }

    protectionStatus = operatingTime <= disconnectionTime 
      ? "Adequate Protection (Simplified Check)" 
      : "Potentially Inadequate Protection - Verify Trip Curve";

    // Check thermal withstand capability of cable (Adiabatic equation I²t = k²S²)
    const k_pvc = 115; // k factor for 70C PVC/Copper (from BS 7671)
    const k_xlpe = 143; // k factor for 90C XLPE/Copper (from BS 7671)
    // Use the actual selected cable type for k factor
    const k = cableType === 'pvc' ? k_pvc : k_xlpe;

    // Calculate max fault current cable can withstand for the given time
    const maxWithstandCurrentSquared = (Math.pow(k, 2) * Math.pow(cableCsa, 2)) / disconnectionTime;
    const thermalWithstandCurrent = Math.sqrt(maxWithstandCurrentSquared);

    // Check against prospective fault current at SOURCE (worst case)
    const thermalStatus = faultLevel <= thermalWithstandCurrent 
      ? "Cable Thermally Protected (Source Fault)" 
      : "Cable Potentially Not Protected (Source Fault) - Check Breaker Energy Let-Through";

    // Set results
    setCircuitProtectionResults({
      cableImpedance: cableImpedance.toFixed(4),
      faultCurrentAtEnd: faultCurrentAtEnd.toFixed(0),
      operatingTime: operatingTime.toFixed(2),
      protectionStatus,
      thermalWithstandCurrent: thermalWithstandCurrent.toFixed(0),
      thermalStatus
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Circuit Protection Calculator</h2>
        <button onClick={onShowTutorial} className="flex items-center text-blue-600 hover:text-blue-800">
          <Icons.InfoInline /> Tutorial
        </button>
      </div>
      <p className="mb-4 text-gray-600">
        Evaluates protection adequacy (simplified check) and cable thermal withstand under fault conditions.
      </p>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-medium mb-1 text-sm">Prospective Fault Current at Source (Ip) (A)</label>
          <input
            type="number"
            name="faultLevel"
            value={circuitProtectionInputs.faultLevel}
            onChange={handleCircuitProtectionInputChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>
        {/* <div>
          <label className="block font-medium mb-1 text-sm">Protection Device Rating (In) (A)</label>
          <input
            type="number"
            name="breakerRating"
            value={circuitProtectionInputs.breakerRating}
            onChange={handleCircuitProtectionInputChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div> */}
        {/* <div>
          <label className="block font-medium mb-1 text-sm">Protection Device Type</label>
          <select
            name="breakerType"
            value={circuitProtectionInputs.breakerType}
            onChange={handleCircuitProtectionInputChange}
            className="w-full p-2 border rounded-md text-sm bg-white"
          >
            <option value="mcb">MCB</option>
            <option value="mccb">MCCB</option>
            <option value="fuse">HRC Fuse (gG)</option>
          </select>
        </div> */}
        <div>
          <label className="block font-medium mb-1 text-sm">Cable CSA (S) (mm²)</label>
          <input
            type="number"
            name="cableCsa"
            value={circuitProtectionInputs.cableCsa}
            onChange={handleCircuitProtectionInputChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-sm">Cable Length (m)</label>
          <input
            type="number"
            name="cableLength"
            value={circuitProtectionInputs.cableLength}
            onChange={handleCircuitProtectionInputChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-sm">Required Disconnection Time (t) (s)</label>
          <input
            type="number"
            name="disconnectionTime"
            value={circuitProtectionInputs.disconnectionTime}
            onChange={handleCircuitProtectionInputChange}
            className="w-full p-2 border rounded-md text-sm"
            step="0.1"
            min="0.1"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-sm">Cable Insulation Type</label>
          <select
            name="cableType"
            value={circuitProtectionInputs.cableType}
            onChange={handleCircuitProtectionInputChange}
            className="w-full p-2 border rounded-md text-sm bg-white"
          >
            <option value="pvc">PVC (k=115)</option>
            <option value="xlpe">XLPE (k=143)</option>
          </select>
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculateCircuitProtection}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
      >
        Evaluate Circuit Protection
      </button>

      {/* Results Display */}
      {circuitProtectionResults && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
            {/* <div><span className="font-medium">Est. Cable Impedance (Zc):</span> {circuitProtectionResults.cableImpedance} Ω</div>
            <div><span className="font-medium">Est. Fault Current at End (If):</span> {circuitProtectionResults.faultCurrentAtEnd} A</div>
            <div><span className="font-medium">Est. Device Operating Time:</span> {circuitProtectionResults.operatingTime} s</div>
            <div>
              <span className="font-medium">Protection Status (If vs Trip):</span>{' '}
              <span className={`font-bold ${circuitProtectionResults.protectionStatus.includes('Adequate') ? 'text-green-600' : 'text-red-600'}`}>
                {circuitProtectionResults.protectionStatus}
              </span>
            </div> */}
            <div><span className="font-medium">Cable Thermal Withstand (I²t ≤ k²S²):</span> {circuitProtectionResults.thermalWithstandCurrent} A (for {circuitProtectionInputs.disconnectionTime}s)</div>
            <div>
              <span className="font-medium">Thermal Status (Ip vs Withstand):</span>{' '}
              <span className={`font-bold ${circuitProtectionResults.thermalStatus.includes('Protected') ? 'text-green-600' : 'text-red-600'}`}>
                {circuitProtectionResults.thermalStatus}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Note: Simplified checks. Verify against actual device trip curves and energy let-through (I²t) values. Cable impedance is estimated.
          </div>
        </div>
      )}

      {/* Explanatory Section */}
      {/* <div className="mt-8 border-t pt-4">
        <h3 className="text-lg font-medium mb-2">About Circuit Protection Assessment</h3>
        <div className="text-sm text-gray-700">
          <p>This calculator performs two key checks for electrical safety:</p>
          
          <div className="mt-3">
            <h4 className="font-medium">1. Fault Current Adequacy Check</h4>
            <p className="mb-1">Verifies if the fault current at the end of the cable is sufficient to operate the protection device within the required disconnection time.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>MCBs typically need 3-5× rated current for timely operation</li>
              <li>MCCBs typically need 1.5-10× rated current depending on setting</li>
              <li>Fuses typically need 2-6× rated current</li>
            </ul>
          </div>
          
          <div className="mt-3">
            <h4 className="font-medium">2. Thermal Withstand Check</h4>
            <p className="mb-1">Verifies if the cable can withstand the thermal energy during a fault (I²t ≤ k²S²):</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>k = material-specific constant (PVC=115, XLPE=143 for copper)</li>
              <li>S = cable cross-sectional area in mm²</li>
              <li>t = disconnection time in seconds</li>
              <li>I = fault current in amperes</li>
            </ul>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default CircuitProtectionCalculator;