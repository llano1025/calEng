import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface ProtectionCoordinationCalculatorProps {
  onShowTutorial?: () => void;
}

const ProtectionCoordinationCalculator: React.FC<ProtectionCoordinationCalculatorProps> = ({ 
  onShowTutorial 
}) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Protection Coordination Calculator',
    discipline: 'electrical',
    calculatorType: 'protectionCoordination'
  });

  // System parameters
  const [faultLevel, setFaultLevel] = useState<number>(350);
  const [voltage, setVoltage] = useState<number>(11);
  const [incomingTransformerRating, setIncomingTransformerRating] = useState<number>(1500);
  const [transformerImpedance, setTransformerImpedance] = useState<number>(6.25); // percentage
  
  // Circuit breaker parameters
  const [mainBreakerRating, setMainBreakerRating] = useState<number>(2500);
  const [feederBreakerRating, setFeederBreakerRating] = useState<number>(1600);
  const [circuitBreakerImpedance, setCircuitBreakerImpedance] = useState<number>(0.5);
  
  // Time multiplier and accuracy parameters
  const [mainTM, setMainTM] = useState<number>(0.1);
  const [feederTM, setFeederTM] = useState<number>(0.1);
  const [mainBreakerOpTime, setMainBreakerOpTime] = useState<number>(60);
  const [feederBreakerOpTime, setFeederBreakerOpTime] = useState<number>(25);
  const [mainRelayAccuracy, setMainRelayAccuracy] = useState<number>(5); // Default 5%
  const [mainCTAccuracy, setMainCTAccuracy] = useState<number>(5); // Default 5%
  const [feederRelayAccuracy, setFeederRelayAccuracy] = useState<number>(5); // Default 5%
  const [feederCTAccuracy, setFeederCTAccuracy] = useState<number>(5); // Default 5%
  const [hvFuseOpTime, setHvFuseOpTime] = useState<number>(129);
  const [isHvFuseOpTimeValid, setIsHvFuseOpTimeValid] = useState<boolean>(true);
  
  // Calculated impedance values
  const [sourceImpedance, setSourceImpedance] = useState<number | null>(null);
  const [transformerImpedanceOhms, setTransformerImpedanceOhms] = useState<number | null>(null);
  const [sourceImpedanceLV, setSourceImpedanceLV] = useState<number | null>(null);
  const [totalImpedance, setTotalImpedance] = useState<number | null>(null);
  
  // Calculation results
  const [faultCurrent, setFaultCurrent] = useState<number | null>(null);
  const [mainPSM, setMainPSM] = useState<number | null>(null);
  const [feederPSM, setFeederPSM] = useState<number | null>(null);
  const [mainBreakerOperatingTime, setMainBreakerOperatingTime] = useState<number | null>(null);
  const [feederBreakerOperatingTime, setFeederBreakerOperatingTime] = useState<number | null>(null);
  const [totalMainBreakTime, setTotalMainBreakTime] = useState<number | null>(null);
  const [totalFeederBreakTime, setTotalFeederBreakTime] = useState<number | null>(null);
  const [isCoordinated, setIsCoordinated] = useState<boolean | null>(null);
  const [isFuseCoordinated, setIsFuseCoordinated] = useState<boolean | null>(null);
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
  
  // Function to calculate circuit breaker operating time based on fault current and rating
  const calculateBreakerOperatingTime = (faultCurrent: number, breakerRating: number, isEI: boolean = true) => {
    // PSM = Prospective Short Circuit Current / Rated Current
    const psm = faultCurrent * 1000 / breakerRating; 
    
    // EI curve calculation (based on image example calculation)
    if (isEI) {
      return 16.2 / (Math.pow(psm, 0.185) - 1) * 10; // Convert to milliseconds
    }
    
    // SI curve calculation
    return 13.5 / (Math.pow(psm, 0.02) - 1) * 10; // Convert to milliseconds
  };
  
  // Validate HV Fuse Op Time
  const validateInputs = () => {
    if (!hvFuseOpTime || hvFuseOpTime <= 0) {
      setIsHvFuseOpTimeValid(false);
      return false;
    }
    setIsHvFuseOpTimeValid(true);
    return true;
  };
  
  // Function to perform the calculations
  const performCalculations = () => {
    // Validate inputs first
    if (!validateInputs()) {
      return;
    }
    
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
    const cbImpedancemOhm = circuitBreakerImpedance; // Convert to mΩ
    
    const totalImpedanceVal = srcImpedanceLV + transImpedanceOhms + circuitBreakerImpedance / 1000 * 2; // in Ω
    const totalImpedancemOhm = srcImpedanceLVmOhm + transImpedanceOhmsmOhm + cbImpedancemOhm * 2; // in mΩ
    setTotalImpedance(totalImpedanceVal);
    
    // Calculate effective fault current at LV side (considering all impedances)
    const effectiveFaultCurrent = (LV_VOLTAGE * 1000) / (Math.sqrt(3) * totalImpedancemOhm / 1000);
    const effectiveFaultCurrentkA = effectiveFaultCurrent / 1000; // Convert to kA
    
    // Calculate HV max fault current
    const hvMaxFaultCurrentkA = effectiveFaultCurrentkA * (LV_VOLTAGE / voltage);
    
    // Calculate rated current at utility side
    const utilityRatedCurrent = incomingTransformerRating / (Math.sqrt(3) * voltage * 1000);
    const utilityRatedCurrentA = utilityRatedCurrent * 1000; // Convert to A
    
    // Calculate PSM values based on the example
    const hvPSM = hvMaxFaultCurrentkA * 1000 / utilityRatedCurrentA;
    const feederPSM = effectiveFaultCurrentkA * 1000 / feederBreakerRating;
    const mainPSM = effectiveFaultCurrentkA * 1000 / mainBreakerRating;
    
    // Calculate fuse operating time
    const calculatedHvFuseOpTime = 16.2 / (Math.pow(hvPSM, 1.89) - 1) * 1000; // TM=1, Convert to ms
    
    setMainPSM(mainPSM);
    setFeederPSM(feederPSM);
    
    // Calculate operating times with EI characteristic
    // EI characteristic: t = k / (PSM^0.02 - 1) for SI and t = k / (PSM^0.185 - 1) for EI
    const feederEIOpTime = 80 / (Math.pow(feederPSM, 2) - 1) * 1000; // TM=1, Convert to ms
    const feederVIOpTime = 13.5 / (feederPSM - 1) * 1000; // TM=1, Convert to ms
    const feederSIOpTime = 0.14 / (Math.pow(feederPSM, 0.02) - 1) * 1000; // TM=1, Convert to ms
    
    const mainEIOpTime = 80 / (Math.pow(mainPSM, 2) - 1) * 1000; // TM=1, Convert to ms
    const mainVIOpTime = 13.5 / (mainPSM - 1) * 1000; // TM=1, Convert to ms
    const mainSIOpTime = 0.14 / (Math.pow(mainPSM, 0.02) - 1) * 1000; // TM=1, Convert to ms
    
    // Apply time multiplier settings using user inputs
    const actualFeederTM = feederTM > 0 ? feederTM : 0.1;
    const feederOpTimeWithTM = feederEIOpTime * actualFeederTM;
    
    // Calculate main breaker operating time with the new formula
    const minMainTime = (feederBreakerOpTime + feederOpTimeWithTM * 
      (1 + (feederRelayAccuracy/100 + feederCTAccuracy/100))) / 
      (1 - (mainRelayAccuracy/100 + mainCTAccuracy/100));
    
    const actualMainTM = minMainTime / mainEIOpTime;
    const mainOpTimeWithTM = mainEIOpTime * mainTM;
    
    setMainBreakerOperatingTime(mainOpTimeWithTM);
    setFeederBreakerOperatingTime(feederOpTimeWithTM);
    
    // Calculate total break time (operating time + breaker mechanical time)
    const mainBreakTime =  mainBreakerOpTime + mainOpTimeWithTM * (1 + (mainRelayAccuracy/100 + mainCTAccuracy/100));
    const feederBreakTime = feederBreakerOpTime + feederOpTimeWithTM * (1 + (feederRelayAccuracy/100 + feederCTAccuracy/100));
    
    setTotalMainBreakTime(mainBreakTime);
    setTotalFeederBreakTime(feederBreakTime);
    
    // Check if main breaker operating time is greater than feeder breaker operating time
    const isCoord = mainOpTimeWithTM > feederOpTimeWithTM;
    setIsCoordinated(isCoord);
    
    // Check if fuse coordination is achieved
    // Check if Feeder Breaker Operating Time < Main Breaker Total Break Time < HV Fuse Op Time
    const isFuseCoord = feederOpTimeWithTM < mainBreakTime && mainBreakTime < hvFuseOpTime;
    setIsFuseCoordinated(isFuseCoord);
    
    // Prepare detailed calculation steps to match the example image
    const detailCalcs = [
      `HV fault level = ${faultLevel} MVA (given by power companies)`,
      `HV fault current = ${faultLevel} MVA / (√3 × ${voltage} kV) = ${faultCurrentVal.toFixed(2)} kA`,
      `HV source impedance = ${voltage} kV / √3 / ${faultCurrentVal.toFixed(2)} kA = ${srcImpedance.toFixed(4)} Ω`,
      `HV source impedance referred to LV side = ${srcImpedance.toFixed(4)} × (${LV_VOLTAGE * 1000}/${voltage * 1000})² = ${srcImpedanceLV.toFixed(4)} Ω = ${srcImpedanceLVmOhm.toFixed(3)} mΩ`,
      ' ',
      `Transformer impedance = ${transformerImpedance}%`,
      `Transformer impedance referred to LV side = ${transformerImpedance}% × ${LV_VOLTAGE*1000}²/${incomingTransformerRating*1000} = ${transImpedanceOhms.toFixed(4)} Ω = ${transImpedanceOhmsmOhm.toFixed(3)} mΩ`,
      `The estimated impedance of each Circuit Breaker = ${cbImpedancemOhm.toFixed(1)} mΩ`,
      ' ',
      `Total source impedance at the LV side = ${srcImpedanceLVmOhm.toFixed(3)} + ${transImpedanceOhmsmOhm.toFixed(3)} + ${cbImpedancemOhm.toFixed(1)} × 2 = ${totalImpedancemOhm.toFixed(3)} mΩ`,
      `LV Max. fault current = ${LV_VOLTAGE * 1000}/√3/(${totalImpedancemOhm.toFixed(3)}/1000) = ${effectiveFaultCurrentkA.toFixed(2)} kA`,
      `HV max fault current = ${effectiveFaultCurrentkA.toFixed(2)} kA × ${LV_VOLTAGE*1000} / ${voltage*1000} = ${hvMaxFaultCurrentkA.toFixed(2)} kA`,
      `HV rated current = ${incomingTransformerRating} kVA / (√3 × ${voltage*1000}) = ${utilityRatedCurrentA.toFixed(1)} A`,
      `HV PSM = ${(hvMaxFaultCurrentkA * 1000).toFixed(0)} / ${utilityRatedCurrentA.toFixed(1)} = ${hvPSM.toFixed(2)}`,
      `HV Fuse operating time = ${calculatedHvFuseOpTime.toFixed(0)}ms`,
      ' ',
      `For the ${feederBreakerRating}A CB, PSM = ${effectiveFaultCurrentkA.toFixed(2)}kA / ${feederBreakerRating / 1000}kA = ${feederPSM.toFixed(2)}`,
      `With EI characteristic - Operating time at TM=1 is 80/(${feederPSM.toFixed(2)}^0.185 - 1) = ${feederEIOpTime.toFixed(0)} ms`,
      `With VI characteristic - Operating time at TM=1 is 13.5/(${feederPSM.toFixed(2)}^0.02 - 1) = ${feederVIOpTime.toFixed(0)} ms`,
      `With SI characteristic - Operating time at TM=1 is 0.14/(${feederPSM.toFixed(2)}^0.02 - 1) = ${feederSIOpTime.toFixed(0)} ms`,
      `Operating time for feeder relay (EI characteristic & TM setting)= ${feederEIOpTime.toFixed(0)} × ${actualFeederTM} = ${feederOpTimeWithTM.toFixed(1)} ms`,
      ' ',
      `For the ${mainBreakerRating}A MICB, PSM = ${effectiveFaultCurrentkA.toFixed(2)}/${mainBreakerRating/1000} = ${mainPSM.toFixed(2)}`,
      `With EI characteristic - Operating time at TM=1 is 80/(${mainPSM.toFixed(2)}^0.185 - 1) = ${mainEIOpTime.toFixed(0)} ms`,
      `With VI characteristic - Operating time at TM=1 is 13.5/(${mainPSM.toFixed(2)}^0.02 - 1) = ${mainVIOpTime.toFixed(0)} ms`,
      `With SI characteristic - Operating time at TM=1 is 0.14/(${mainPSM.toFixed(2)}^0.02 - 1) = ${mainSIOpTime.toFixed(0)} ms`,
      ' ',
      `Relay accuracy is ${mainRelayAccuracy}% for main CB and ${feederRelayAccuracy}% for feeder CB with negligible over-shooting`,
      `CT accuracy is ${mainCTAccuracy}% for main CB and ${feederCTAccuracy}% for feeder CB`,
      `The operating time of the ${mainBreakerRating}A MICB with a fault at the ${feederBreakerRating}A feeder shall be not faster than (${feederBreakerOpTime} + ${feederOpTimeWithTM.toFixed(1)} × [1+(${feederRelayAccuracy/100}+${feederCTAccuracy/100})])/[1-(${mainRelayAccuracy/100}+${mainCTAccuracy/100})] = ${minMainTime.toFixed(1)}ms`,
      ' ',
      `To have the main relay operate for the ${feederBreakerRating}A feeder fault at ${minMainTime.toFixed(1)}ms, the TM shall be set at = ${minMainTime.toFixed(1)}/${mainEIOpTime.toFixed(0)} = ${actualMainTM.toFixed(3)}`,
      ' ',
      `Fuse Coordination Check: Feeder Breaker Operating Time (${feederBreakTime.toFixed(1)} ms) < Main Breaker Total Break Time (${mainBreakTime.toFixed(1)} ms) < HV Fuse Op Time (${hvFuseOpTime} ms): ${isFuseCoord ? 'PASSED' : 'FAILED'}`
    ];
    
    setDetailedCalculations(detailCalcs);
    
    // Save calculation and prepare export data
    const inputs = {
      'System Parameters': {
        'Fault Level': `${faultLevel} MVA`,
        'Voltage': `${voltage} kV`,
        'Transformer Rating': `${incomingTransformerRating} kVA`,
        'Transformer Impedance': `${transformerImpedance}%`
      },
      'Breaker Settings': {
        'Main Breaker Rating': `${mainBreakerRating} A`,
        'Feeder Breaker Rating': `${feederBreakerRating} A`,
        'Main TM': mainTM,
        'Feeder TM': feederTM
      }
    };
    
    const results = {
      'Fault Current': `${faultCurrentVal.toFixed(2)} kA`,
      'Main Breaker Operating Time': `${mainEIOpTime.toFixed(1)} ms`,
      'Feeder Breaker Operating Time': `${feederEIOpTime.toFixed(1)} ms`,
      'Total Main Break Time': `${mainBreakTime.toFixed(1)} ms`,
      'Total Feeder Break Time': `${feederBreakTime.toFixed(1)} ms`,
      'Coordination Status': isCoord ? 'COORDINATED' : 'NOT COORDINATED',
      'Fuse Coordination': isFuseCoord ? 'PASSED' : 'FAILED',
      'Recommended Main TM': actualMainTM.toFixed(3)
    };
    
    saveCalculation(inputs, results);
    prepareExportData(inputs, results);
  };
  
  return (
    <CalculatorWrapper
      title="Protection Coordination Calculator"
      discipline="electrical"
      calculatorType="protectionCoordination"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Protection Coordination Calculator</h2>
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
              Circuit Breaker Impedance (mΩ)
            </label>
            <input
              type="number"
              value={circuitBreakerImpedance}
              onChange={(e) => setCircuitBreakerImpedance(Number(e.target.value))}
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
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HV Fuse Op Time (ms) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              value={hvFuseOpTime}
              onChange={(e) => setHvFuseOpTime(Number(e.target.value))}
              className={`w-full p-2 border ${!isHvFuseOpTimeValid ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              required
            />
            {!isHvFuseOpTimeValid && (
              <p className="text-red-500 text-xs mt-1">HV Fuse operating time is required</p>
            )}
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
                <h4 className="font-medium text-blue-800 mb-2">Coordination Status</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-2 rounded-md text-center font-medium" 
                      style={{
                        backgroundColor: isCoordinated ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isCoordinated ? 'rgb(6, 95, 70)' : 'rgb(185, 28, 28)'
                      }}
                  >
                    {isCoordinated 
                      ? 'Main-Feeder Breaker Operating Time check passed' 
                      : 'Main-Feeder Breaker Operating Time check failed'}
                  </div>
                  
                  <div className="p-2 rounded-md text-center font-medium" 
                      style={{
                        backgroundColor: isFuseCoordinated ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isFuseCoordinated ? 'rgb(6, 95, 70)' : 'rgb(185, 28, 28)'
                      }}
                  >
                    {isFuseCoordinated 
                      ? 'Fuse coordination achieved' 
                      : 'Fuse coordination not achieved'}
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm font-medium">Minimum TM Setting for Main Breaker</p>
                  <p className="text-green-600 font-bold text-lg">
                    {mainBreakerOperatingTime && mainPSM ? (mainBreakerOperatingTime / (80 / (Math.pow(mainPSM, 2) - 1) * 1000)).toFixed(3) : "N/A"}
                  </p>
                </div>
              </div>
              
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
              
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Breaker Operation Details</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Main Breaker</p>
                    <p>PSM: {mainPSM?.toFixed(2)}</p>
                    <p>Operating Time: {mainBreakerOperatingTime?.toFixed(1)} ms</p>
                    <p>Total Break Time: {totalMainBreakTime?.toFixed(1)} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">Feeder Breaker</p>
                    <p>PSM: {feederPSM?.toFixed(2)}</p>
                    <p>Operating Time: {feederBreakerOperatingTime?.toFixed(1)} ms</p>
                    <p>Total Break Time: {totalFeederBreakTime?.toFixed(1)} ms</p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Time Discrimination</p>
                    <p>{(mainBreakerOperatingTime && feederBreakerOperatingTime) 
                      ? (mainBreakerOperatingTime - feederBreakerOperatingTime).toFixed(1) 
                      : "N/A"} ms</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">HV Fuse Op Time</p>
                    <p>{hvFuseOpTime} ms</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Calculation Method</h4>
                
                <div className="text-xs text-gray-700 max-h-96 overflow-y-auto">
                  {detailedCalculations.map((calc, index) => (
                    <div key={index} className="border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                      {calc}
                    </div>
                  ))}
                  
                  <div className="mt-2 pt-2 border-t font-medium">
                    Fuse Coordination: {isFuseCoordinated ? (
                      <span className="text-green-600">Feeder Breaker ({totalFeederBreakTime?.toFixed(1)} ms) &lt; Main Breaker ({totalMainBreakTime?.toFixed(1)} ms) &lt; HV Fuse ({hvFuseOpTime} ms)</span>
                    ) : (
                      <span className="text-red-600">Coordination sequence not achieved</span>
                    )}
                  </div>
                </div>
              </div>
              
              {!isCoordinated && (
                <div className="bg-white p-4 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">Coordination Issue</h4>
                  
                  <p className="text-xs text-gray-700">
                    Main breaker operating time ({mainBreakerOperatingTime?.toFixed(1)} ms) is not greater than feeder breaker operating time ({feederBreakerOperatingTime?.toFixed(1)} ms). 
                    Consider increasing the main breaker TM setting to at least {mainBreakerOperatingTime && mainPSM && feederBreakerOperatingTime ? 
                      ((feederBreakerOperatingTime * 1.2) / (80 / (Math.pow(mainPSM, 2) - 1) * 1000)).toFixed(3) : "N/A"} 
                    for proper coordination.
                  </p>
                </div>
              )}
              
              {!isFuseCoordinated && isCoordinated && (
                <div className="bg-white p-4 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">Fuse Coordination Issue</h4>
                  
                  <p className="text-xs text-gray-700">
                    The coordination sequence between circuit breakers and HV fuse is not achieved. The proper sequence should be:
                    Feeder Breaker ({totalFeederBreakTime?.toFixed(1)} ms) &lt; Main Breaker ({totalMainBreakTime?.toFixed(1)} ms) &lt; HV Fuse ({hvFuseOpTime} ms).
                    Consider adjusting the HV fuse rating or circuit breaker settings.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Info section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>The calculation is based on an EI (Extremely Inverse) curve for the relay characteristics.</li>
          <li>Proper coordination requires the main breaker to operate slower than the feeder breaker for discrimination.</li>
          <li>Breaker operating time is affected by relay accuracy and CT accuracy factors.</li>
          <li>For proper coordination, the HV fuse operating time should be greater than the main breaker total break time.</li>
          <li>Typical time discrimination between breakers should be at least 200ms (recommended).</li>
        </ul>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default ProtectionCoordinationCalculator;