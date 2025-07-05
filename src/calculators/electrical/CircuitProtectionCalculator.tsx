import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface CircuitProtectionCalculatorProps {
  onShowTutorial?: () => void;
}

// Main combined calculator component
const CircuitProtectionCalculator: React.FC<CircuitProtectionCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Circuit Protection Calculator',
    discipline: 'electrical',
    calculatorType: 'circuitProtection'
  });

  // State for current tab
  const [activeTab, setActiveTab] = useState<'standard' | 'coordination'>('coordination');

  return (
    <CalculatorWrapper
      title="Circuit Protection Calculator"
      discipline="electrical"
      calculatorType="circuitProtection"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6 p-6">

      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'coordination'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('coordination')}
        >
          Cable Protection
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'standard'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('standard')}
        >
          Fault Current
        </button>
      </div>

      {/* Show the appropriate calculator based on active tab */}
      {activeTab === 'coordination' ? (
        <StandardCircuitProtectionCalculator 
          onShowTutorial={onShowTutorial}
          saveCalculation={saveCalculation}
          prepareExportData={prepareExportData}
        />
      ) : (
        <ProtectionCoordinationCalculator onShowTutorial={onShowTutorial} />
      )}
      </div>
    </CalculatorWrapper>
  );
};

// Standard Circuit Protection Calculator Component
interface StandardCalculatorProps {
  onShowTutorial?: () => void;
  saveCalculation: (inputs: Record<string, any>, results: Record<string, any>, notes?: string) => void;
  prepareExportData: (inputs: Record<string, any>, results: Record<string, any>, projectName?: string) => void;
}

const StandardCircuitProtectionCalculator: React.FC<StandardCalculatorProps> = ({ 
  onShowTutorial, 
  saveCalculation, 
  prepareExportData 
}) => {
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
    const results = {
      cableImpedance: cableImpedance.toFixed(4),
      faultCurrentAtEnd: faultCurrentAtEnd.toFixed(0),
      operatingTime: operatingTime.toFixed(2),
      protectionStatus,
      thermalWithstandCurrent: thermalWithstandCurrent.toFixed(0),
      thermalStatus
    };
    setCircuitProtectionResults(results);
    
    // Save calculation and prepare export data
    const inputs = {
      'Fault Level': `${faultLevel} A`,
      'Breaker Rating': `${breakerRating} A`,
      'Breaker Type': breakerType.toUpperCase(),
      'Cable CSA': `${cableCsa} mm²`,
      'Cable Length': `${cableLength} m`,
      'Disconnection Time': `${disconnectionTime} s`,
      'Cable Type': cableType.toUpperCase()
    };
    
    const exportResults = {
      'Cable Impedance': `${results.cableImpedance} Ω`,
      'Fault Current at End': `${results.faultCurrentAtEnd} A`,
      'Operating Time': `${results.operatingTime} s`,
      'Protection Status': results.protectionStatus,
      'Thermal Withstand Current': `${results.thermalWithstandCurrent} A`,
      'Thermal Status': results.thermalStatus
    };
    
    saveCalculation(inputs, exportResults);
    prepareExportData(inputs, exportResults);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
        
        {/* Protection Device Section */}
        <div className="mb-4">
          <h4 className="font-medium text-blue-700 mb-2">Protection Device</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prospective Fault Current (A)
              </label>
              <input
                type="number"
                name="faultLevel"
                value={circuitProtectionInputs.faultLevel}
                onChange={handleCircuitProtectionInputChange}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protection Device Rating (A)
              </label>
              <input
                type="number"
                name="breakerRating"
                value={circuitProtectionInputs.breakerRating}
                onChange={handleCircuitProtectionInputChange}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protection Device Type
              </label>
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Req. Disconnection Time (s)
              </label>
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
          </div>
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        {/* Cable Information */}
        <div className="mb-4">
          <h4 className="font-medium text-blue-700 mb-2">Cable Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cable CSA (mm²)
              </label>
              <input
                type="number"
                name="cableCsa"
                value={circuitProtectionInputs.cableCsa}
                onChange={handleCircuitProtectionInputChange}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cable Length (m)
              </label>
              <input
                type="number"
                name="cableLength"
                value={circuitProtectionInputs.cableLength}
                onChange={handleCircuitProtectionInputChange}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cable Insulation Type
              </label>
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
        </div>
        
        {/* Calculate Button */}
        <div className="mt-6">
          <button
            onClick={calculateCircuitProtection}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Evaluate Circuit Protection
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!circuitProtectionResults ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter the parameters and click Calculate to see results</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Fault Clearance Assessment</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                  <div>
                    <p className="text-sm font-medium">Est. Cable Impedance (Zc)</p>
                    <p>{circuitProtectionResults.cableImpedance} Ω</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Est. Fault Current at End (If)</p>
                    <p>{circuitProtectionResults.faultCurrentAtEnd} A</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Est. Device Operating Time</p>
                    <p>{circuitProtectionResults.operatingTime} s</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Protection Status</p>
                    <p className={`${circuitProtectionResults.protectionStatus.includes('Adequate') ? 'text-green-600' : 'text-red-600'} font-medium`}>
                      {circuitProtectionResults.protectionStatus}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Cable Thermal Withstand</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-1 gap-y-2 text-sm">
                  <div>
                    <p className="text-sm font-medium">Cable Thermal Withstand (I²t ≤ k²S²)</p>
                    <p>{circuitProtectionResults.thermalWithstandCurrent} A (for {circuitProtectionInputs.disconnectionTime}s)</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Thermal Status</p>
                    <p className={`${circuitProtectionResults.thermalStatus.includes('Protected') ? 'text-green-600' : 'text-red-600'} font-medium`}>
                      {circuitProtectionResults.thermalStatus}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-white p-3 rounded-md">
              <h4 className="font-medium mb-2">Calculation Notes</h4>
              <p className="text-xs text-gray-600">
                These are simplified checks. Verify results against actual device trip curves and energy let-through (I²t) values from manufacturer data sheets.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Cable impedance is estimated using simplified calculations for copper conductors.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Info section */}
      <div className="md:col-span-2 mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>This calculator performs two key checks for electrical safety: fault current adequacy and cable thermal withstand.</li>
          <li>Fault current adequacy verifies if sufficient current will flow to operate the protection device within the required time.</li>
          <li>MCBs typically need 3-5× rated current, MCCBs need 1.5-10× rated current, and fuses need 2-6× rated current for timely operation.</li>
          <li>Thermal withstand check verifies if the cable can withstand the thermal energy during a fault (I²t ≤ k²S²).</li>
          <li>The k factor depends on insulation material: PVC=115, XLPE=143 for copper conductors.</li>
          <li>For more accurate assessment, consult device manufacturer datasheets and perform detailed system studies.</li>
        </ul>
      </div>
    </div>
  );
};

// Protection Coordination Calculator Component
const ProtectionCoordinationCalculator: React.FC<{ onShowTutorial?: () => void }> = ({ onShowTutorial }) => {
  // System parameters
  const [faultLevel, setFaultLevel] = useState<number>(350);
  const [voltage, setVoltage] = useState<number>(11);
  const [incomingTransformerRating, setIncomingTransformerRating] = useState<number>(1500);
  const [transformerImpedance, setTransformerImpedance] = useState<number>(6.25); // percentage
  
  // Circuit breaker parameters
  const [mainBreakerRating, setMainBreakerRating] = useState<number>(2500);
  const [feederBreakerRating, setFeederBreakerRating] = useState<number>(1600);
  const [miscImpedance, setMiscImpedance] = useState<number>(1);
  
  // Time multiplier and accuracy parameters
  const [mainTM, setMainTM] = useState<number>(1);
  const [feederTM, setFeederTM] = useState<number>(1);
  const [mainBreakerOpTime, setMainBreakerOpTime] = useState<number>(60);
  const [feederBreakerOpTime, setFeederBreakerOpTime] = useState<number>(60);
  const [mainRelayAccuracy, setMainRelayAccuracy] = useState<number>(5); // Default 5%
  const [mainCTAccuracy, setMainCTAccuracy] = useState<number>(5); // Default 5%
  const [feederRelayAccuracy, setFeederRelayAccuracy] = useState<number>(5); // Default 5%
  const [feederCTAccuracy, setFeederCTAccuracy] = useState<number>(5); // Default 5%
  
  // Calculated impedance values
  const [sourceImpedance, setSourceImpedance] = useState<number | null>(null);
  const [transformerImpedanceOhms, setTransformerImpedanceOhms] = useState<number | null>(null);
  const [sourceImpedanceLV, setSourceImpedanceLV] = useState<number | null>(null);
  const [totalImpedance, setTotalImpedance] = useState<number | null>(null);
  
  // Calculation results
  const [faultCurrent, setFaultCurrent] = useState<number | null>(null);
  const [mainPSM, setMainPSM] = useState<number | null>(null);
  const [feederPSM, setFeederPSM] = useState<number | null>(null);
  
  // Main breaker results
  const [mainEIOpTime, setMainEIOpTime] = useState<number | null>(null);
  const [mainVIOpTime, setMainVIOpTime] = useState<number | null>(null);
  const [mainSIOpTime, setMainSIOpTime] = useState<number | null>(null);
  const [mainEIOpTimeWithTM, setMainEIOpTimeWithTM] = useState<number | null>(null);
  const [mainVIOpTimeWithTM, setMainVIOpTimeWithTM] = useState<number | null>(null);
  const [mainSIOpTimeWithTM, setMainSIOpTimeWithTM] = useState<number | null>(null);
  const [mainBreakerOperatingTime, setMainBreakerOperatingTime] = useState<number | null>(null);
  const [totalMainBreakTime, setTotalMainBreakTime] = useState<number | null>(null);
  const [minMainTime, setMinMainTime] = useState<number | null>(null);
  
  // Feeder breaker results
  const [feederEIOpTime, setFeederEIOpTime] = useState<number | null>(null);
  const [feederVIOpTime, setFeederVIOpTime] = useState<number | null>(null);
  const [feederSIOpTime, setFeederSIOpTime] = useState<number | null>(null);
  const [feederEIOpTimeWithTM, setFeederEIOpTimeWithTM] = useState<number | null>(null);
  const [feederVIOpTimeWithTM, setFeederVIOpTimeWithTM] = useState<number | null>(null);
  const [feederSIOpTimeWithTM, setFeederSIOpTimeWithTM] = useState<number | null>(null);
  const [feederBreakerOperatingTime, setFeederBreakerOperatingTime] = useState<number | null>(null);
  const [totalFeederBreakTime, setTotalFeederBreakTime] = useState<number | null>(null);
  
  const [isCoordinated, setIsCoordinated] = useState<boolean | null>(null);
  const [detailedCalculations, setDetailedCalculations] = useState<string[]>([]);
  
  // LV system voltage (380V by default)
  const LV_VOLTAGE = 0.38; // kV
  
  // Function to calculate fault current from fault level
  const calculateFaultCurrent = () => {
    // I = MVA / (√3 × kV)
    return faultLevel / (Math.sqrt(3) * voltage);
  };
  
  // Function to calculate source impedance based on voltage and fault current
  const calculateSourceImpedance = (faultCurrentVal: number) => {
    // Source impedance = System Voltage (kV) / √3 / fault current
    return voltage / Math.sqrt(3) / faultCurrentVal;
  };
  
  // Function to calculate source impedance referred to LV side
  const calculateSourceImpedanceLV = (srcImpedance: number) => {
    // Source impedance LV = Source impedance × (380V / System Voltage (kV))²
    return srcImpedance * Math.pow(LV_VOLTAGE / voltage, 2);
  };
  
  // Function to calculate transformer impedance in ohms
  const calculateTransformerImpedanceOhms = () => {
    // Z(ohms) = Z(%) × (LV Voltage)² / (S × 100)
    // where Z(%) is the percentage impedance, V is voltage in kV, and S is rating in MVA
    const transformerRatingMVA = incomingTransformerRating / 1000; // Convert kVA to MVA
    return (transformerImpedance * LV_VOLTAGE * LV_VOLTAGE) / (transformerRatingMVA * 100);
  };
  
  // Function to perform the calculations
  const performCalculations = () => {
    // Calculate fault current at HV side
    const faultCurrentVal = calculateFaultCurrent();
    setFaultCurrent(faultCurrentVal);
    
    // Calculate source impedance
    const srcImpedance = calculateSourceImpedance(faultCurrentVal);
    setSourceImpedance(srcImpedance);
    
    // Calculate source impedance referred to LV side
    const srcImpedanceLV = calculateSourceImpedanceLV(srcImpedance);
    setSourceImpedanceLV(srcImpedanceLV);
    
    // Calculate transformer impedance in ohms
    const transImpedanceOhms = calculateTransformerImpedanceOhms();
    setTransformerImpedanceOhms(transImpedanceOhms);
    
    // Calculate total impedance at load side (in mΩ for clearer presentation)
    const srcImpedanceLVmOhm = srcImpedanceLV * 1000; // Convert to mΩ
    const transImpedanceOhmsmOhm = transImpedanceOhms * 1000; // Convert to mΩ
    const miscImpedancemOhm = miscImpedance; // Already in mΩ
    
    // Modified: Removed the multiplication by 2 for miscellaneous impedance
    const totalImpedanceVal = srcImpedanceLV + transImpedanceOhms + miscImpedance / 1000; // in Ω
    const totalImpedancemOhm = srcImpedanceLVmOhm + transImpedanceOhmsmOhm + miscImpedancemOhm; // in mΩ
    setTotalImpedance(totalImpedanceVal);
    
    // Calculate effective fault current at LV side (considering all impedances)
    const effectiveFaultCurrent = (LV_VOLTAGE * 1000) / (Math.sqrt(3) * totalImpedancemOhm / 1000);
    const effectiveFaultCurrentkA = effectiveFaultCurrent / 1000; // Convert to kA
    
    // Calculate HV max fault current
    const hvMaxFaultCurrentkA = effectiveFaultCurrentkA * (LV_VOLTAGE / voltage);
    
    // Calculate rated current at utility side
    const utilityRatedCurrent = incomingTransformerRating / (Math.sqrt(3) * voltage * 1000);
    const utilityRatedCurrentA = utilityRatedCurrent * 1000; // Convert to A
    
    // Calculate PSM values
    const hvPSM = hvMaxFaultCurrentkA * 1000 / utilityRatedCurrentA;
    const feederPSM = effectiveFaultCurrentkA * 1000 / feederBreakerRating;
    const mainPSM = effectiveFaultCurrentkA * 1000 / mainBreakerRating;
    
    setMainPSM(mainPSM);
    setFeederPSM(feederPSM);
    
    // Calculate operating times for EI, VI, and SI characteristics
    // For Feeder Breaker
    const feederEIOp = 80 / (Math.pow(feederPSM, 2) - 1) * 1000; // TM=1, Convert to ms
    const feederVIOp = 13.5 / (feederPSM - 1) * 1000; // TM=1, Convert to ms
    const feederSIOp = 0.14 / (Math.pow(feederPSM, 0.02) - 1) * 1000; // TM=1, Convert to ms
    
    setFeederEIOpTime(feederEIOp);
    setFeederVIOpTime(feederVIOp);
    setFeederSIOpTime(feederSIOp);
    
    // For Main Breaker
    const mainEIOp = 80 / (Math.pow(mainPSM, 2) - 1) * 1000; // TM=1, Convert to ms
    const mainVIOp = 13.5 / (mainPSM - 1) * 1000; // TM=1, Convert to ms
    const mainSIOp = 0.14 / (Math.pow(mainPSM, 0.02) - 1) * 1000; // TM=1, Convert to ms
    
    setMainEIOpTime(mainEIOp);
    setMainVIOpTime(mainVIOp);
    setMainSIOpTime(mainSIOp);
    
    // Apply time multiplier settings
    const actualFeederTM = feederTM > 0 ? feederTM : 0.1;
    const actualMainTM = mainTM > 0 ? mainTM : 0.1;
    
    // Calculate operating times with TM for EI, VI, and SI
    const feederEIWithTM = feederEIOp * actualFeederTM;
    const feederVIWithTM = feederVIOp * actualFeederTM;
    const feederSIWithTM = feederSIOp * actualFeederTM;
    
    const mainEIWithTM = mainEIOp * actualMainTM;
    const mainVIWithTM = mainVIOp * actualMainTM;
    const mainSIWithTM = mainSIOp * actualMainTM;
    
    setFeederEIOpTimeWithTM(feederEIWithTM);
    setFeederVIOpTimeWithTM(feederVIWithTM);
    setFeederSIOpTimeWithTM(feederSIWithTM);
    
    setMainEIOpTimeWithTM(mainEIWithTM);
    setMainVIOpTimeWithTM(mainVIWithTM);
    setMainSIOpTimeWithTM(mainSIWithTM);
    
    // Set the operating times (using EI characteristic as default)
    setMainBreakerOperatingTime(mainEIWithTM);
    setFeederBreakerOperatingTime(feederEIWithTM);
    
    // Calculate total break time (operating time + breaker mechanical time)
    const mainBreakTime = mainBreakerOpTime + mainEIWithTM * (1 + (mainRelayAccuracy/100 + mainCTAccuracy/100));
    const feederBreakTime = feederBreakerOpTime + feederEIWithTM * (1 + (feederRelayAccuracy/100 + feederCTAccuracy/100));
    
    setTotalMainBreakTime(mainBreakTime);
    setTotalFeederBreakTime(feederBreakTime);
    
    // Calculate minimum time for main breaker
    const minTime = (feederBreakerOpTime + feederEIWithTM * 
      (1 + (feederRelayAccuracy/100 + feederCTAccuracy/100))) / 
      (1 - (mainRelayAccuracy/100 + mainCTAccuracy/100));
    
    setMinMainTime(minTime);
    
    // Check if main breaker operating time is greater than feeder breaker operating time
    const isCoord = mainEIWithTM > feederEIWithTM;
    setIsCoordinated(isCoord);
    
    // Prepare detailed calculation steps
    const detailCalcs = [
      `HV fault level = ${faultLevel} MVA (given by power companies)`,
      `HV fault current = ${faultLevel} MVA / (√3 × ${voltage} kV) = ${faultCurrentVal.toFixed(2)} kA`,
      `HV source impedance = ${voltage} kV / √3 / ${faultCurrentVal.toFixed(2)} kA = ${srcImpedance.toFixed(4)} Ω`,
      `HV source impedance referred to LV side = ${srcImpedance.toFixed(4)} × (${LV_VOLTAGE * 1000}/${voltage * 1000})² = ${srcImpedanceLV.toFixed(4)} Ω = ${srcImpedanceLVmOhm.toFixed(3)} mΩ`,
      ' ',
      `Transformer impedance = ${transformerImpedance}%`,
      `Transformer impedance referred to LV side = ${transformerImpedance}% × ${LV_VOLTAGE*1000}²/${incomingTransformerRating*1000} = ${transImpedanceOhms.toFixed(4)} Ω = ${transImpedanceOhmsmOhm.toFixed(3)} mΩ`,
      `Miscellaneous impedance = ${miscImpedancemOhm.toFixed(1)} mΩ`,
      ' ',
      `Total source impedance at the LV side = ${srcImpedanceLVmOhm.toFixed(3)} + ${transImpedanceOhmsmOhm.toFixed(3)} + ${miscImpedancemOhm.toFixed(1)} = ${totalImpedancemOhm.toFixed(3)} mΩ`,
      `LV Max. fault current = ${LV_VOLTAGE * 1000}/√3/(${totalImpedancemOhm.toFixed(3)}/1000) = ${effectiveFaultCurrentkA.toFixed(2)} kA`,
      `HV max fault current = ${effectiveFaultCurrentkA.toFixed(2)} kA × ${LV_VOLTAGE*1000} / ${voltage*1000} = ${hvMaxFaultCurrentkA.toFixed(2)} kA`,
      `HV rated current = ${incomingTransformerRating} kVA / (√3 × ${voltage*1000}) = ${utilityRatedCurrentA.toFixed(1)} A`,
      `HV PSM = ${(hvMaxFaultCurrentkA * 1000).toFixed(0)} / ${utilityRatedCurrentA.toFixed(1)} = ${hvPSM.toFixed(2)}`,
      ' ',
      `For the ${feederBreakerRating}A CB, PSM = ${effectiveFaultCurrentkA.toFixed(2)}kA / ${feederBreakerRating / 1000}kA = ${feederPSM.toFixed(2)}`,
      `With EI characteristic - Operating time at TM=1 is 80/(${feederPSM.toFixed(2)}^2 - 1) = ${feederEIOp.toFixed(0)} ms`,
      `With VI characteristic - Operating time at TM=1 is 13.5/(${feederPSM.toFixed(2)} - 1) = ${feederVIOp.toFixed(0)} ms`,
      `With SI characteristic - Operating time at TM=1 is 0.14/(${feederPSM.toFixed(2)}^0.02 - 1) = ${feederSIOp.toFixed(0)} ms`,
      `Operating time for feeder relay (EI characteristic & TM=${actualFeederTM}) = ${feederEIOp.toFixed(0)} × ${actualFeederTM} = ${feederEIWithTM.toFixed(1)} ms`,
      ' ',
      `For the ${mainBreakerRating}A MICB, PSM = ${effectiveFaultCurrentkA.toFixed(2)}/${mainBreakerRating/1000} = ${mainPSM.toFixed(2)}`,
      `With EI characteristic - Operating time at TM=1 is 80/(${mainPSM.toFixed(2)}^2 - 1) = ${mainEIOp.toFixed(0)} ms`,
      `With VI characteristic - Operating time at TM=1 is 13.5/(${mainPSM.toFixed(2)} - 1) = ${mainVIOp.toFixed(0)} ms`,
      `With SI characteristic - Operating time at TM=1 is 0.14/(${mainPSM.toFixed(2)}^0.02 - 1) = ${mainSIOp.toFixed(0)} ms`,
      `Operating time for main relay (EI characteristic & TM=${actualMainTM}) = ${mainEIOp.toFixed(0)} × ${actualMainTM} = ${mainEIWithTM.toFixed(1)} ms`,
      ' ',
      `Relay accuracy is ${mainRelayAccuracy}% for main CB and ${feederRelayAccuracy}% for feeder CB with negligible over-shooting`,
      `CT accuracy is ${mainCTAccuracy}% for main CB and ${feederCTAccuracy}% for feeder CB`,
      `The minimum operating time of the ${mainBreakerRating}A MICB with a fault at the ${feederBreakerRating}A feeder shall be not faster than (${feederBreakerOpTime} + ${feederEIWithTM.toFixed(1)} × [1+(${feederRelayAccuracy/100}+${feederCTAccuracy/100})])/[1-(${mainRelayAccuracy/100}+${mainCTAccuracy/100})] = ${minTime.toFixed(1)}ms`,
    ];
    
    setDetailedCalculations(detailCalcs);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">System Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fault Level (MVA)
          </label>
          <input
            type="number"
            value={faultLevel}
            onChange={(e) => setFaultLevel(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Incoming Voltage (kV)
          </label>
          <input
            type="number"
            value={voltage}
            onChange={(e) => setVoltage(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Incoming Transformer Rating (kVA)
          </label>
          <input
            type="number"
            value={incomingTransformerRating}
            onChange={(e) => setIncomingTransformerRating(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transformer Impedance (%)
          </label>
          <input
            type="number"
            value={transformerImpedance}
            onChange={(e) => setTransformerImpedance(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Circuit Breaker Parameters</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Circuit Breaker Rating (A)
          </label>
          <input
            type="number"
            value={mainBreakerRating}
            onChange={(e) => setMainBreakerRating(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Feeder Circuit Breaker Rating (A)
          </label>
          <input
            type="number"
            value={feederBreakerRating}
            onChange={(e) => setFeederBreakerRating(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Miscellaneous Impedance (mΩ)
          </label>
          <input
            type="number"
            value={miscImpedance}
            onChange={(e) => setMiscImpedance(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Time Settings & Accuracy Parameters</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Breaker TM Setting
            </label>
            <input
              type="number"
              step="0.001"
              value={mainTM}
              onChange={(e) => setMainTM(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feeder Breaker TM Setting
            </label>
            <input
              type="number"
              step="0.001"
              value={feederTM}
              onChange={(e) => setFeederTM(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Breaker Op Time (ms)
            </label>
            <input
              type="number"
              value={mainBreakerOpTime}
              onChange={(e) => setMainBreakerOpTime(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feeder Breaker Op Time (ms)
            </label>
            <input
              type="number"
              value={feederBreakerOpTime}
              onChange={(e) => setFeederBreakerOpTime(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Relay Accuracy (%)
            </label>
            <input
              type="number"
              value={mainRelayAccuracy}
              onChange={(e) => setMainRelayAccuracy(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main CT Accuracy (%)
            </label>
            <input
              type="number"
              value={mainCTAccuracy}
              onChange={(e) => setMainCTAccuracy(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feeder Relay Accuracy (%)
            </label>
            <input
              type="number"
              value={feederRelayAccuracy}
              onChange={(e) => setFeederRelayAccuracy(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feeder CT Accuracy (%)
            </label>
            <input
              type="number"
              value={feederCTAccuracy}
              onChange={(e) => setFeederCTAccuracy(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <button
          onClick={performCalculations}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Calculate
        </button>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!faultCurrent ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter the parameters and click Calculate to see results</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-md mb-4">
              <h4 className="font-medium text-blue-800 mb-2">System Impedance Details</h4>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="font-medium">Fault Current at HV Side</p>
                  <p>{faultCurrent.toFixed(2)} kA</p>
                </div>
                
                <div>
                  <p className="font-medium">Source Impedance</p>
                  <p>{sourceImpedance?.toFixed(4)} Ω</p>
                </div>
                
                <div>
                  <p className="font-medium">Source Impedance (LV)</p>
                  <p>{sourceImpedanceLV?.toFixed(4)} Ω</p>
                </div>
                
                <div>
                  <p className="font-medium">Transformer Impedance (LV)</p>
                  <p>{transformerImpedanceOhms?.toFixed(4)} Ω</p>
                </div>
                
                <div>
                  <p className="font-medium">Total Impedance</p>
                  <p>{totalImpedance?.toFixed(4)} Ω</p>
                </div>
                
                <div>
                  <p className="font-medium">Max Fault Current (LV)</p>
                  <p>{(totalImpedance ? (LV_VOLTAGE * 1000) / (Math.sqrt(3) * totalImpedance) / 1000 : 0).toFixed(2)} kA</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Main Breaker Results */}
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Main Breaker Results</h4>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">PSM</p>
                    <p>{mainPSM?.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">EI Operating Time (TM={mainTM})</p>
                    <p>{mainEIOpTimeWithTM?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">VI Operating Time (TM={mainTM})</p>
                    <p>{mainVIOpTimeWithTM?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">SI Operating Time (TM={mainTM})</p>
                    <p>{mainSIOpTimeWithTM?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">Total Break Time</p>
                    <p>{totalMainBreakTime?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">Minimum Break Time</p>
                    <p className="text-green-600 font-bold">{minMainTime?.toFixed(1)} ms</p>
                  </div>
                </div>
              </div>
              
              {/* Feeder Breaker Results */}
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Feeder Breaker Results</h4>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">PSM</p>
                    <p>{feederPSM?.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">EI Operating Time (TM={feederTM})</p>
                    <p>{feederEIOpTimeWithTM?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">VI Operating Time (TM={feederTM})</p>
                    <p>{feederVIOpTimeWithTM?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">SI Operating Time (TM={feederTM})</p>
                    <p>{feederSIOpTimeWithTM?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">Total Break Time</p>
                    <p>{totalFeederBreakTime?.toFixed(1)} ms</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Time Discrimination */}
            {/* <div className="bg-white p-4 rounded-md mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Time Discrimination</h4>
              
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">Time Discrimination (EI Characteristic)</p>
                  <p>{(mainEIOpTimeWithTM && feederEIOpTimeWithTM) 
                    ? (mainEIOpTimeWithTM - feederEIOpTimeWithTM).toFixed(1) 
                    : "N/A"} ms</p>
                </div>
                
                <div className={`p-2 rounded-md text-center font-medium ${
                  isCoordinated 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isCoordinated 
                    ? 'Coordination Achieved' 
                    : 'Coordination Not Achieved'}
                </div>
              </div>
            </div> */}
            
            <div className="bg-white p-4 rounded-md mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Calculation Method</h4>
              
              <div className="text-xs text-gray-700 max-h-96 overflow-y-auto">
                {detailedCalculations.map((calc, index) => (
                  <div key={index} className="border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                    {calc}
                  </div>
                ))}
              </div>
            </div>
            
            {!isCoordinated && (
              <div className="bg-white p-4 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Coordination Issue</h4>
                
                <p className="text-xs text-gray-700">
                  Main breaker operating time ({mainBreakerOperatingTime?.toFixed(1)} ms) is not greater than feeder breaker operating time ({feederBreakerOperatingTime?.toFixed(1)} ms). 
                  Consider increasing the main breaker TM setting to at least {mainBreakerOperatingTime && mainPSM && feederBreakerOperatingTime && mainEIOpTime ? 
                    ((feederBreakerOperatingTime * 1.2) / mainEIOpTime).toFixed(3) : "N/A"} 
                  for proper coordination.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info section */}
      <div className="md:col-span-2 mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>The calculation is based on standard relay characteristic curves (EI, VI, SI) for protection coordination.</li>
          <li>Proper coordination requires the main breaker to operate slower than the feeder breaker for discrimination.</li>
          <li>Breaker operating time is affected by relay accuracy and CT accuracy factors.</li>
          <li>EI (Extremely Inverse) characteristic follows t = 80/(PSM² - 1)</li>
          <li>VI (Very Inverse) characteristic follows t = 13.5/(PSM - 1)</li>
          <li>SI (Standard Inverse) characteristic follows t = 0.14/(PSM^0.02 - 1)</li>
        </ul>
      </div>
    </div>
  );
};

export default CircuitProtectionCalculator;