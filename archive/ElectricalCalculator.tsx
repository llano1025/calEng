// ElectricalCalculator.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons'; // Assuming Icons are in components/Icons.tsx
import { copTables, VoltageDropTable, VoltageDropValues } from '../data/cop_tables'; // Import the data tables AND types

// Define props type for the component
interface ElectricalCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The Electrical Installation Calculator component
const ElectricalCalculator: React.FC<ElectricalCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type and display mode
  const [calculatorType, setCalculatorType] = useState<string>(''); // 'cableSizing' or 'powerFactor' or 'circuitProtection'
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // State for cable sizing calculator inputs
  const [cableSizingInputs, setCableSizingInputs] = useState({
    designCurrent: '100', // in amperes
    cableLength: '50', // in meters
    ambientTemperature: '30', // Default to 30C as per tables
    cableType: 'xlpe', // 'pvc' or 'xlpe'
    installationMethod: 'methodC', // Default to Method C
    conductorType: 'copper', // Only copper supported by CoP tables
    cableArrangement: 'multiCore', // 'singleCore' or 'multiCore'
    armoured: 'false', // 'true' or 'false'
    numberOfLoadedConductors: '3', // '2' or '3' (maps to 2=single-phase, 3=three-phase)
    numberOfCircuits: '1', // for grouping factor per IEC 60364-5-52 Table B.52.17 (Not in CoP PDF)
    voltageDrop: '4', // max percentage voltage drop
    systemVoltage: '380', // system voltage (V) - Assume AC
  });

  // State for power factor correction calculator inputs
  const [powerFactorInputs, setPowerFactorInputs] = useState({
    loadPower: '1000', // in kW
    initialPowerFactor: '0.7', // initial power factor
    targetPowerFactor: '0.95', // target power factor
    harmonicDistortion: '5', // percentage THD
    utilityTariff: 'hke', // 'hke' or 'clp'
    loadFactor: '0.6', // load factor for payback calculation
  });

  // State for circuit protection calculator inputs
  const [circuitProtectionInputs, setCircuitProtectionInputs] = useState({
    faultLevel: '5000', // in amperes
    breakerRating: '400', // in amperes
    breakerType: 'mccb', // 'mccb', 'mcb' or 'fuse'
    cableCsa: '120', // cable cross-sectional area in mm²
    cableLength: '80', // in meters
    disconnectionTime: '0.4', // in seconds
  });

  // State for calculation results
  const [cableSizingResults, setCableSizingResults] = useState<any>(null);
  const [powerFactorResults, setPowerFactorResults] = useState<any>(null);
  const [circuitProtectionResults, setCircuitProtectionResults] = useState<any>(null);
  
  // State for tracking loading and errors
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Handlers for Inputs ---
  const handleCableSizingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCableSizingInputs({ ...cableSizingInputs, [e.target.name]: e.target.value });
    setCableSizingResults(null); // Clear results on input change
    setErrorMessage(null);
  };

  const handlePowerFactorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPowerFactorInputs({ ...powerFactorInputs, [e.target.name]: e.target.value });
    setPowerFactorResults(null);
    setErrorMessage(null);
  };

  const handleCircuitProtectionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCircuitProtectionInputs({ ...circuitProtectionInputs, [e.target.name]: e.target.value });
    setCircuitProtectionResults(null);
    setErrorMessage(null);
  };

  // --- Calculation Functions ---
  const calculateCableSize = () => {
    try {
      setIsCalculating(true);
      setErrorMessage(null);
      
      // Get inputs
      const current = parseFloat(cableSizingInputs.designCurrent);
      const length = parseFloat(cableSizingInputs.cableLength);
      const ambientTemp = parseFloat(cableSizingInputs.ambientTemperature);
      const cableType = cableSizingInputs.cableType as 'pvc' | 'xlpe';
      const installMethodKey = cableSizingInputs.installationMethod; // Direct key from UI
      const cableArrangement = cableSizingInputs.cableArrangement as 'singleCore' | 'multiCore';
      const isArmoured = cableSizingInputs.armoured === 'true';
      const numLoadedConductors = parseInt(cableSizingInputs.numberOfLoadedConductors);
      const numCircuits = parseInt(cableSizingInputs.numberOfCircuits);
      const maxVDropPercent = parseFloat(cableSizingInputs.voltageDrop);
      const systemVoltage = parseFloat(cableSizingInputs.systemVoltage);
  
      if (isNaN(current) || isNaN(length) || isNaN(ambientTemp) || isNaN(numCircuits) ||
          isNaN(maxVDropPercent) || isNaN(systemVoltage) || isNaN(numLoadedConductors)) {
        setErrorMessage("Please enter valid numeric values for all required fields.");
        setIsCalculating(false);
        return;
      }
  
      // 1. Temperature correction factor (k1 / Ca)
      let temperatureFactor = 1.0;
      if (cableType === 'pvc') { // PVC insulation (70°C)
        if (ambientTemp <= 10) temperatureFactor = 1.22; 
        else if (ambientTemp <= 15) temperatureFactor = 1.17; 
        else if (ambientTemp <= 20) temperatureFactor = 1.12; 
        else if (ambientTemp <= 25) temperatureFactor = 1.06; 
        else if (ambientTemp <= 30) temperatureFactor = 1.0; 
        else if (ambientTemp <= 35) temperatureFactor = 0.94; 
        else if (ambientTemp <= 40) temperatureFactor = 0.87; 
        else if (ambientTemp <= 45) temperatureFactor = 0.79; 
        else if (ambientTemp <= 50) temperatureFactor = 0.71; 
        else if (ambientTemp <= 55) temperatureFactor = 0.61; 
        else temperatureFactor = 0.5; // For 60°C
      } else { // XLPE insulation (90°C)
        if (ambientTemp <= 10) temperatureFactor = 1.15; 
        else if (ambientTemp <= 15) temperatureFactor = 1.12; 
        else if (ambientTemp <= 20) temperatureFactor = 1.08; 
        else if (ambientTemp <= 25) temperatureFactor = 1.04; 
        else if (ambientTemp <= 30) temperatureFactor = 1.0; 
        else if (ambientTemp <= 35) temperatureFactor = 0.96; 
        else if (ambientTemp <= 40) temperatureFactor = 0.91; 
        else if (ambientTemp <= 45) temperatureFactor = 0.87; 
        else if (ambientTemp <= 50) temperatureFactor = 0.82; 
        else if (ambientTemp <= 55) temperatureFactor = 0.76; 
        else if (ambientTemp <= 60) temperatureFactor = 0.71; 
        else if (ambientTemp <= 65) temperatureFactor = 0.65; 
        else if (ambientTemp <= 70) temperatureFactor = 0.58; 
        else if (ambientTemp <= 75) temperatureFactor = 0.5; 
        else if (ambientTemp <= 80) temperatureFactor = 0.41; 
        else temperatureFactor = 0.32; // For 85°C
      }
  
      // 2. Grouping correction factor (k2 / Cg)
      let groupingFactor = 1.0;
      if (numCircuits === 2) groupingFactor = 0.80;
      else if (numCircuits === 3) groupingFactor = 0.70;
      else if (numCircuits === 4) groupingFactor = 0.65;
      else if (numCircuits === 5) groupingFactor = 0.60;
      else if (numCircuits === 6) groupingFactor = 0.57;
      else if (numCircuits >= 7) groupingFactor = 0.54;
  
      // 3. Calculate minimum CCC (Current Carrying Capacity) - I'z = Ib / (Ca * Cg)
      const minimumCCC = current / (temperatureFactor * groupingFactor);
  
      // 4. Determine cable size based on CoP Appendix 6 tables
      const armourKey = isArmoured ? 'armoured' : 'nonArmoured';
      
      // Map number of loaded conductors to the key used in the tables
      let conductorsKey = numLoadedConductors === 2 ? '2' : (cableArrangement === 'multiCore' ? '3_4' : '3');
      if (installMethodKey.startsWith('methodF_spaced')) {
        conductorsKey = '2_3'; // Method F spaced uses combined key
      }
  
      // Get the relevant CCC table - with safeguards
      if (!copTables || !copTables.copper) {
        setErrorMessage("Cable sizing data is not available. Please check the CoP tables implementation.");
        setIsCalculating(false);
        return;
      }
  
      // Navigate the data structure carefully with checks
      const insulationTables = copTables.copper[cableType];
      if (!insulationTables) {
        setErrorMessage(`Cable type '${cableType}' data not found.`);
        setIsCalculating(false);
        return;
      }
  
      const armourTables = insulationTables[armourKey];
      if (!armourTables) {
        setErrorMessage(`${isArmoured ? 'Armoured' : 'Non-armoured'} cable data not found.`);
        setIsCalculating(false);
        return;
      }
  
      const arrangementTables = armourTables[cableArrangement];
      if (!arrangementTables) {
        setErrorMessage(`${cableArrangement} cable arrangement data not found.`);
        setIsCalculating(false);
        return;
      }
  
      const cccTables = arrangementTables.ccc;
      if (!cccTables) {
        setErrorMessage("Current-carrying capacity tables not found.");
        setIsCalculating(false);
        return;
      }
  
      const methodTables = cccTables[installMethodKey];
      if (!methodTables) {
        // Handle common invalid combinations with helpful messages
        if (cableArrangement === 'multiCore' && (installMethodKey.startsWith('methodF') || installMethodKey === 'methodG')) {
          setErrorMessage(`Installation Method ${installMethodKey} is not applicable for Multi-core cables.`);
        } else if (cableArrangement === 'singleCore' && installMethodKey === 'methodE') {
          setErrorMessage(`Installation Method E is not applicable for Single-core cables.`);
        } else if (cableType === 'pvc' && installMethodKey === 'methodG') {
          setErrorMessage(`Installation Method G is only applicable for XLPE cables.`);
        } else {
          setErrorMessage(`Installation method '${installMethodKey}' data not found.`);
        }
        setIsCalculating(false);
        return;
      }
  
      const cccTable = methodTables[conductorsKey];
      if (!cccTable) {
        setErrorMessage(`${numLoadedConductors} conductor configuration data not found.`);
        setIsCalculating(false);
        return;
      }
  
      // Find the smallest cable size that meets the minimum CCC requirement
      let cableSizeForCCC = "Not Found";
      const sortedSizes = Object.keys(cccTable).sort((a, b) => parseFloat(a) - parseFloat(b));
  
      if (sortedSizes.length === 0) {
        setErrorMessage("No cable sizes found in the data table.");
        setIsCalculating(false);
        return;
      }
  
      for (const size of sortedSizes) {
        if (cccTable[size] >= minimumCCC) {
          cableSizeForCCC = size;
          break;
        }
      }
  
      if (cableSizeForCCC === "Not Found") {
        // Find the largest size available if no suitable size is found
        const largestSize = sortedSizes[sortedSizes.length - 1];
        setErrorMessage(`No suitable cable size found for the required CCC (${minimumCCC.toFixed(1)} A). 
                        Largest available size is ${largestSize} mm². Consider parallel cables.`);
        setIsCalculating(false);
        return;
      }
  
      // 5. Voltage drop calculation
      // Function to get voltage drop factor (Z for AC) for a given size string
      const getVdFactorZ = (sizeStr: string): number | null => {
        if (!sizeStr) return null;
  
        try {
          // Check for voltage drop data
          if (!arrangementTables.voltageDrop || !arrangementTables.voltageDrop.ac) {
            return null;
          }
  
          const vdAcBranch = arrangementTables.voltageDrop.ac;
          let vdMethodKey = installMethodKey;
  
          // Map installation methods to VD table keys
          if (vdMethodKey === 'methodA') vdMethodKey = 'methodB';
          if (vdMethodKey === 'methodC') vdMethodKey = 'methodC_touching';
          if (vdMethodKey === 'methodF_touching') vdMethodKey = 'methodC_touching';
          if (vdMethodKey === 'methodF_spacedH' || vdMethodKey === 'methodF_spacedV') vdMethodKey = 'methodF_spaced';
          if (vdMethodKey === 'methodG') vdMethodKey = 'methodF_spaced';
  
          let vdTable: VoltageDropTable | undefined;
          
          // Try to find the correct voltage drop table
          // First check if there's a method-specific table
          if (typeof vdAcBranch === 'object' && vdMethodKey in vdAcBranch) {
            const methodBranch = vdAcBranch[vdMethodKey];
            if (methodBranch && conductorsKey in methodBranch) {
              vdTable = methodBranch[conductorsKey];
            }
          }
          
          // If no method-specific table, check if there's a conductors-specific table
          if (!vdTable && typeof vdAcBranch === 'object' && conductorsKey in vdAcBranch) {
            vdTable = vdAcBranch[conductorsKey];
          }
          
          // If still no table, try fallback methods
          if (!vdTable) {
            const fallbackKeys = ['methodC_touching', 'methodB', 'methodF_spaced'];
            for (const fallbackKey of fallbackKeys) {
              if (fallbackKey in vdAcBranch) {
                const fallbackBranch = vdAcBranch[fallbackKey];
                if (fallbackBranch && conductorsKey in fallbackBranch) {
                  vdTable = fallbackBranch[conductorsKey];
                  if (vdTable) break;
                }
              }
            }
          }
  
          if (!vdTable) {
            console.warn(`VD Table not found for: ${cableType}, ${armourKey}, ${cableArrangement}, ${vdMethodKey}`);
            return null;
          }
  
          if (!(sizeStr in vdTable)) {
            console.warn(`Size ${sizeStr} not found in VD table`);
            return null;
          }
  
          const vdValues = vdTable[sizeStr];
          if (!vdValues) return null;
  
          // Prioritize 'z' value, fall back to 'r'
          return vdValues.z !== undefined ? vdValues.z : (vdValues.r !== undefined ? vdValues.r : null);
        } catch (error) {
          console.error(`Error accessing VD table for size ${sizeStr}:`, error);
          return null;
        }
      };
  
      // Calculate voltage drop for the size selected based on CCC
      let cableSizeForVoltageDrop = cableSizeForCCC;
      let finalCableSize = cableSizeForCCC;
      let vdFactorZ = getVdFactorZ(cableSizeForCCC);
      let voltageDropV = NaN;
      let voltageDropPercent = NaN;
      let voltageDropStatus = "Not Calculated";
  
      if (vdFactorZ === null) {
        voltageDropStatus = `VD data unavailable for ${cableSizeForCCC} mm²`;
      } else {
        voltageDropV = (vdFactorZ * current * length) / 1000;
        voltageDropPercent = (voltageDropV / systemVoltage) * 100;
        voltageDropStatus = voltageDropPercent <= maxVDropPercent ? "Acceptable" : "Too High";
      }
  
      // If voltage drop is too high, find a larger suitable size
      if (voltageDropStatus === "Too High") {
        let currentSizeIndex = sortedSizes.indexOf(cableSizeForCCC);
        let foundSuitableSize = false;
        
        while (currentSizeIndex < sortedSizes.length - 1) {
          currentSizeIndex++;
          const nextSize = sortedSizes[currentSizeIndex];
          const nextVdFactorZ = getVdFactorZ(nextSize);
  
          if (nextVdFactorZ !== null) {
            const nextVoltageDropV = (nextVdFactorZ * current * length) / 1000;
            const nextVoltageDropPercent = (nextVoltageDropV / systemVoltage) * 100;
  
            if (nextVoltageDropPercent <= maxVDropPercent) {
              cableSizeForVoltageDrop = nextSize;
              voltageDropV = nextVoltageDropV;
              voltageDropPercent = nextVoltageDropPercent;
              voltageDropStatus = `Acceptable (Increased to ${nextSize} mm² for VDrop)`;
              foundSuitableSize = true;
              break;
            }
          } else {
            voltageDropStatus = `Too High (VD data unavailable for ${nextSize} mm²)`;
            cableSizeForVoltageDrop = nextSize;
            break;
          }
        }
        
        if (!foundSuitableSize && currentSizeIndex >= sortedSizes.length - 1) {
          const largestSize = sortedSizes[sortedSizes.length - 1];
          if (!voltageDropStatus.includes("VD data unavailable")) {
            voltageDropStatus = `Too High (Largest size ${largestSize} mm² still exceeds ${maxVDropPercent}%)`;
          }
          cableSizeForVoltageDrop = largestSize;
        }
      }
  
      // Final recommended size is the larger of the two requirements
      finalCableSize = parseFloat(cableSizeForVoltageDrop) > parseFloat(cableSizeForCCC)
                      ? cableSizeForVoltageDrop
                      : cableSizeForCCC;
  
      // Recalculate VD for the final selected size if it changed
      if (finalCableSize !== cableSizeForCCC || 
          voltageDropStatus.startsWith("Too High") || 
          voltageDropStatus.includes("VD data unavailable")) {
        
        const finalVdFactorZ = getVdFactorZ(finalCableSize);
        if (finalVdFactorZ !== null) {
          voltageDropV = (finalVdFactorZ * current * length) / 1000;
          voltageDropPercent = (voltageDropV / systemVoltage) * 100;
          
          if (!voltageDropStatus.startsWith("Acceptable (Increased")) {
            voltageDropStatus = voltageDropPercent <= maxVDropPercent 
              ? "Acceptable" 
              : `Too High (${voltageDropPercent.toFixed(2)}% > ${maxVDropPercent}%)`;
          }
        } else {
          voltageDropStatus = `VD data unavailable for final size ${finalCableSize} mm²`;
          voltageDropV = NaN;
          voltageDropPercent = NaN;
        }
      }
  
      // Set results
      setCableSizingResults({
        requiredCCC: minimumCCC.toFixed(1),
        temperatureFactor: temperatureFactor.toFixed(2),
        groupingFactor: groupingFactor.toFixed(2),
        recommendedCableSize: {
          forCurrentCapacity: `${cableSizeForCCC} mm²`,
          forVoltageDrop: `${cableSizeForVoltageDrop} mm²`,
          final: `${finalCableSize} mm²`
        },
        voltageDropV: isNaN(voltageDropV) ? 'N/A' : voltageDropV.toFixed(2),
        voltageDropPercent: isNaN(voltageDropPercent) ? 'N/A' : voltageDropPercent.toFixed(2),
        voltageDropStatus: voltageDropStatus
      });
      
      setIsCalculating(false);
    } catch (error) {
      console.error("Error in cable sizing calculation:", error);
      setErrorMessage(`Calculation error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsCalculating(false);
    }
  };

  const calculatePowerFactor = () => {
    try {
      setIsCalculating(true);
      setErrorMessage(null);
      
      // Get inputs
      const power = parseFloat(powerFactorInputs.loadPower);
      const initialPF = parseFloat(powerFactorInputs.initialPowerFactor);
      const targetPF = parseFloat(powerFactorInputs.targetPowerFactor);
      const thd = parseFloat(powerFactorInputs.harmonicDistortion) / 100;
      const tariff = powerFactorInputs.utilityTariff;
      const loadFactor = parseFloat(powerFactorInputs.loadFactor);
  
      if (isNaN(power) || isNaN(initialPF) || isNaN(targetPF) || isNaN(thd) || isNaN(loadFactor)) {
        setErrorMessage("Please enter valid numeric values for all fields.");
        setIsCalculating(false);
        return;
      }
  
      // Calculate total power factor with harmonics effect
      const initialTotalPF = initialPF / Math.sqrt(1 + Math.pow(thd, 2));
  
      // Calculate required kVAr for power factor correction
      const initialKVA = power / initialPF;
      const targetKVA = power / targetPF;
      const kVArRequired = initialKVA * Math.sin(Math.acos(initialPF)) - targetKVA * Math.sin(Math.acos(targetPF));
  
      // Calculate tariff savings (simplified)
      let kVASavings = initialKVA - targetKVA;
      let annualSavings: number;
  
      if (tariff === 'hke') {
        // HKE Maximum Demand Tariff (simplified)
        annualSavings = kVASavings * 39.3 * 12 * loadFactor;
      } else {
        // CLP Bulk Tariff (simplified)
        annualSavings = kVASavings * 66.5 * 12 * loadFactor;
      }
  
      // Calculate capacitor cost at HK$255 per kVAr
      const capacitorCost = kVArRequired * 255;
  
      // Calculate payback period
      const paybackPeriod = (annualSavings > 0) ? (capacitorCost / annualSavings) : Infinity;
  
      // Set results
      setPowerFactorResults({
        initialTotalPF: initialTotalPF.toFixed(3),
        kVArRequired: kVArRequired.toFixed(1),
        capacitorSize: Math.ceil(kVArRequired / 50) * 50, // Round up to nearest 50 kVAr
        annualSavings: annualSavings.toFixed(2),
        capacitorCost: capacitorCost.toFixed(2),
        paybackPeriod: isFinite(paybackPeriod) ? paybackPeriod.toFixed(2) : 'Infinite',
        recommendation: paybackPeriod <= 2 ? "Highly Recommended" : (paybackPeriod <= 4 ? "Recommended" : "Not Economical")
      });
      
      setIsCalculating(false);
    } catch (error) {
      console.error("Error in power factor calculation:", error);
      setErrorMessage(`Calculation error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsCalculating(false);
    }
  };

  const calculateCircuitProtection = () => {
    try {
      setIsCalculating(true);
      setErrorMessage(null);
      
      // Get inputs
      const faultLevel = parseFloat(circuitProtectionInputs.faultLevel);
      const breakerRating = parseFloat(circuitProtectionInputs.breakerRating);
      const breakerType = circuitProtectionInputs.breakerType;
      const cableCsa = parseFloat(circuitProtectionInputs.cableCsa);
      const cableLength = parseFloat(circuitProtectionInputs.cableLength);
      const disconnectionTime = parseFloat(circuitProtectionInputs.disconnectionTime);
  
      if (isNaN(faultLevel) || isNaN(breakerRating) || isNaN(cableCsa) || isNaN(cableLength) || isNaN(disconnectionTime)) {
        setErrorMessage("Please enter valid numeric values for all fields.");
        setIsCalculating(false);
        return;
      }
  
      // Calculate cable impedance (simplified)
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
  
      protectionStatus = operatingTime <= disconnectionTime ? "Adequate Protection (Simplified Check)" : "Potentially Inadequate Protection - Verify Trip Curve";
  
      // Check thermal withstand capability of cable (Adiabatic equation I²t = k²S²)
      const k_pvc = 115; // k factor for 70C PVC/Copper (from BS 7671)
      const k_xlpe = 143; // k factor for 90C XLPE/Copper (from BS 7671)
      // Use the actual selected cable type for k factor
      const k = cableSizingInputs.cableType === 'pvc' ? k_pvc : k_xlpe;
  
      // Calculate max fault current cable can withstand for the given time
      const maxWithstandCurrentSquared = (Math.pow(k, 2) * Math.pow(cableCsa, 2)) / disconnectionTime;
      const thermalWithstandCurrent = Math.sqrt(maxWithstandCurrentSquared);
  
      // Check against prospective fault current at SOURCE (worst case)
      const thermalStatus = faultLevel <= thermalWithstandCurrent ? "Cable Thermally Protected (Source Fault)" : "Cable Potentially Not Protected (Source Fault) - Check Breaker Energy Let-Through";
  
      // Set results
      setCircuitProtectionResults({
        cableImpedance: cableImpedance.toFixed(4),
        faultCurrentAtEnd: faultCurrentAtEnd.toFixed(0),
        operatingTime: operatingTime.toFixed(2),
        protectionStatus,
        thermalWithstandCurrent: thermalWithstandCurrent.toFixed(0),
        thermalStatus
      });
      
      setIsCalculating(false);
    } catch (error) {
      console.error("Error in circuit protection calculation:", error);
      setErrorMessage(`Calculation error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsCalculating(false);
    }
  };

  // --- Method Selection based on Cable Arrangement and Type ---
  const getAvailableMethods = () => {
    const { cableArrangement, cableType } = cableSizingInputs;
    const isSingleCore = cableArrangement === 'singleCore';
    const isXLPE = cableType === 'xlpe';

    let methods = [
      { value: 'methodC', label: 'Clipped Direct / On Tray (Method C)' },
      { value: 'methodB', label: 'In Conduit / Trunking (Method B)' },
      { value: 'methodA', label: 'In Conduit in Insulated Wall (Method A)' },
    ];

    if (isSingleCore) {
      methods.push(
        { value: 'methodF_touching', label: 'On Tray / Free Air - Touching (Method F)' },
        { value: 'methodF_spacedH', label: 'On Tray / Free Air - Spaced Horiz (Method F)' },
        { value: 'methodF_spacedV', label: 'On Tray / Free Air - Spaced Vert (Method F)' }
      );
      if (isXLPE) {
        methods.push({ value: 'methodG', label: 'In Free Air (Method G - XLPE Only)' });
      }
    } else { // Multi-core
      methods.push({ value: 'methodE', label: 'On Tray / Free Air (Method E)' });
    }
    return methods;
  };

  // Check if current installation method is valid for selected cable arrangement/type
  useEffect(() => {
    const availableMethods = getAvailableMethods();
    const currentMethodIsValid = availableMethods.some(m => m.value === cableSizingInputs.installationMethod);
    if (!currentMethodIsValid) {
      setCableSizingInputs(prev => ({ ...prev, installationMethod: 'methodC' }));
    }
  }, [cableSizingInputs.cableArrangement, cableSizingInputs.cableType]);

  // --- Render Functions ---
  const renderTutorial = () => {
    // Update tutorial text to reference CoP Appendix 6
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Electrical Installation Calculator Tutorial (CoP Appendix 6)</h2>
          <button onClick={() => setShowTutorial(false)} className="text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-lg mb-2">Cable Sizing Calculator</h3>
            <p>This calculator helps determine the appropriate copper cable size based on the **Hong Kong Code of Practice for the Electricity (Wiring) Regulations (2020 Edition) - Appendix 6**. It accounts for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
              <li>Design current (load current)</li>
              <li>Cable arrangement (Single-core / Multi-core)</li>
              <li>Armour type (Armoured / Non-armoured)</li>
              <li>Insulation type (PVC 70°C / XLPE 90°C)</li>
              <li>Installation Methods (A, B, C, E, F, G - see dropdown for descriptions)</li>
              <li>Correction factors for ambient temperature (Ca) and grouping (Cg) - *Note: These factors use simplified IEC-based values as CoP Appendix 5 / BS7671 tables are not included.*</li>
              <li>Voltage drop requirements (using mV/A/m impedance values from CoP tables)</li>
            </ul>
             <p className="mt-2 text-sm text-red-600">Note: Only Copper conductors are supported based on the provided CoP tables.</p>
          </div>

          {/* Reference Tables Section */}
          <div className="mt-4">
            <h3 className="font-medium text-lg mb-2">Reference Tables (CoP Appendix 6 - Examples)</h3>

            {/* Temperature Correction Factors (Keep IEC as placeholder) */}
            <div className="mb-4">
              <h4 className="font-medium text-md mb-1">Temperature Correction Factors (Ca - IEC Placeholder)</h4>
               <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 border">Ambient Temperature (°C)</th>
                      <th className="px-2 py-1 border">PVC (70°C)</th>
                      <th className="px-2 py-1 border">XLPE/EPR (90°C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Simplified data */}
                    <tr><td className="px-2 py-1 border">30</td><td className="px-2 py-1 border">1.00</td><td className="px-2 py-1 border">1.00</td></tr>
                    <tr><td className="px-2 py-1 border">35</td><td className="px-2 py-1 border">0.94</td><td className="px-2 py-1 border">0.96</td></tr>
                    <tr><td className="px-2 py-1 border">40</td><td className="px-2 py-1 border">0.87</td><td className="px-2 py-1 border">0.91</td></tr>
                    <tr><td className="px-2 py-1 border">45</td><td className="px-2 py-1 border">0.79</td><td className="px-2 py-1 border">0.87</td></tr>
                    <tr><td className="px-2 py-1 border">50</td><td className="px-2 py-1 border">0.71</td><td className="px-2 py-1 border">0.82</td></tr>
                  </tbody>
                </table>
              </div>
               <p className="text-xs text-gray-500 mt-1">Note: These are simplified IEC values. Refer to CoP Appendix 5 / BS7671 for full tables.</p>
            </div>

            {/* Grouping Correction Factors (Keep IEC as placeholder) */}
            <div className="mb-4">
              <h4 className="font-medium text-md mb-1">Grouping Correction Factors (Cg - Simplified)</h4>
               <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 border">Number of Circuits</th>
                      <th className="px-2 py-1 border">Approx. Factor (Touching)</th>
                    </tr>
                  </thead>
                  <tbody>
                     {/* Simplified data */}
                    <tr><td className="px-2 py-1 border">1</td><td className="px-2 py-1 border">1.00</td></tr>
                    <tr><td className="px-2 py-1 border">2</td><td className="px-2 py-1 border">0.80</td></tr>
                    <tr><td className="px-2 py-1 border">3</td><td className="px-2 py-1 border">0.70</td></tr>
                    <tr><td className="px-2 py-1 border">4</td><td className="px-2 py-1 border">0.65</td></tr>
                    <tr><td className="px-2 py-1 border">5</td><td className="px-2 py-1 border">0.60</td></tr>
                     <tr><td className="px-2 py-1 border">6+</td><td className="px-2 py-1 border">0.57</td></tr>
                  </tbody>
                </table>
              </div>
               <p className="text-xs text-gray-500 mt-1">Note: These are simplified general values. Refer to CoP Appendix 5 / BS7671 for factors specific to installation method and spacing.</p>
            </div>

            {/* Current-Carrying Capacity (Sample from CoP) */}
            <div className="mb-4">
              <h4 className="font-medium text-md mb-1">Current-Carrying Capacity (Amps) - CoP A6 Example (Copper, Multi-core, Non-Armoured, 3/4-core)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 border">Size (mm²)</th>
                      <th className="px-2 py-1 border">PVC - Conduit (A6(2) Col 3 - Method B)</th>
                      <th className="px-2 py-1 border">PVC - Clipped (A6(2) Col 7 - Method C)</th>
                      <th className="px-2 py-1 border">XLPE - Conduit (A6(6) Col 3 - Method B)</th>
                      <th className="px-2 py-1 border">XLPE - Clipped (A6(6) Col 7 - Method C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-2 py-1 border">1.5</td><td className="px-2 py-1 border">14</td><td className="px-2 py-1 border">17.5</td><td className="px-2 py-1 border">16.5</td><td className="px-2 py-1 border">22</td></tr>
                    <tr><td className="px-2 py-1 border">2.5</td><td className="px-2 py-1 border">18.5</td><td className="px-2 py-1 border">24</td><td className="px-2 py-1 border">22</td><td className="px-2 py-1 border">30</td></tr>
                    <tr><td className="px-2 py-1 border">4</td><td className="px-2 py-1 border">25</td><td className="px-2 py-1 border">32</td><td className="px-2 py-1 border">30</td><td className="px-2 py-1 border">40</td></tr>
                  </tbody>
                </table>
              </div>
               <p className="text-xs text-gray-500 mt-1">Source: CoP Appendix 6, Tables A6(2) & A6(6).</p>
            </div>

            {/* Voltage Drop Reference (Sample from CoP) */}
            <div className="mb-4">
              <h4 className="font-medium text-md mb-1">Voltage Drop (mV/A/m) - CoP A6 Example (Copper, Multi-core, Non-Armoured, 3/4-core AC)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 border">Size (mm²)</th>
                      <th className="px-2 py-1 border">PVC (A6(2) Col 4 - Z)</th>
                      <th className="px-2 py-1 border">XLPE (A6(6) Col 4 - Z)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-2 py-1 border">1.5</td><td className="px-2 py-1 border">25</td><td className="px-2 py-1 border">27</td></tr>
                    <tr><td className="px-2 py-1 border">2.5</td><td className="px-2 py-1 border">15</td><td className="px-2 py-1 border">16</td></tr>
                    <tr><td className="px-2 py-1 border">4</td><td className="px-2 py-1 border">9.5</td><td className="px-2 py-1 border">10</td></tr>
                    <tr><td className="px-2 py-1 border">25</td><td className="px-2 py-1 border">1.50</td><td className="px-2 py-1 border">1.65</td></tr>
                  </tbody>
                </table>
              </div>
               <p className="text-xs text-gray-500 mt-1">Source: CoP Appendix 6, Tables A6(2) & A6(6). 'Z' value used for AC voltage drop.</p>
            </div>
          </div>

          {/* Power Factor and Circuit Protection tutorial sections */}
           <div>
            <h3 className="font-medium text-lg mb-2">Power Factor Correction</h3>
            <p>This calculator helps determine the capacitor bank size required to improve power factor, and evaluates the financial benefits based on utility tariffs.</p>
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">Circuit Protection</h3>
            <p>This calculator evaluates whether the selected protection device can provide adequate protection for the circuit under fault conditions (simplified check), and checks thermal withstand capability of the cable (I²t ≤ k²S²).</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCalculator = () => {
    switch (calculatorType) {
      case 'cableSizing':
        const availableMethods = getAvailableMethods();

        return (
          <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Cable Sizing Calculator (CoP Appendix 6)</h2>
              <button onClick={() => setShowTutorial(true)} className="flex items-center text-blue-600 hover:text-blue-800">
                <Icons.InfoInline /> Tutorial
              </button>
            </div>
            <p className="mb-4 text-gray-600">
              Calculates Copper cable size based on CoP Appendix 6 tables. Correction factors (Ca, Cg) use simplified IEC values.
            </p>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Column 1 */}
              <div>
                 <div>
                    <label className="block font-medium mb-1 text-sm">Design Current (Ib) (A)</label>
                    <input
                      type="number"
                      name="designCurrent"
                      value={cableSizingInputs.designCurrent}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
                   <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Cable Length (m)</label>
                    <input
                      type="number"
                      name="cableLength"
                      value={cableSizingInputs.cableLength}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
                 <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">System Voltage (V)</label>
                    <input
                      type="number"
                      name="systemVoltage"
                      value={cableSizingInputs.systemVoltage}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
                   <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Max Voltage Drop (%)</label>
                    <input
                      type="number"
                      name="voltageDrop"
                      value={cableSizingInputs.voltageDrop}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
              </div>

              {/* Column 2 */}
              <div>
                  <div>
                    <label className="block font-medium mb-1 text-sm">Insulation Type</label>
                    <select
                      name="cableType"
                      value={cableSizingInputs.cableType}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm bg-white"
                    >
                      <option value="pvc">PVC (70°C)</option>
                      <option value="xlpe">XLPE (90°C)</option>
                    </select>
                  </div>
                   <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Cable Arrangement</label>
                    <select
                      name="cableArrangement"
                      value={cableSizingInputs.cableArrangement}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm bg-white"
                    >
                      <option value="multiCore">Multi-core</option>
                      <option value="singleCore">Single-core</option>
                    </select>
                  </div>
                   <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Armour Type</label>
                    <select
                      name="armoured"
                      value={cableSizingInputs.armoured}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm bg-white"
                    >
                      <option value="false">Non-Armoured</option>
                      <option value="true">Armoured</option>
                    </select>
                  </div>
                   <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Conductor</label>
                    <select
                      name="conductorType"
                      value={cableSizingInputs.conductorType}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm bg-gray-100"
                      disabled // Only copper supported
                    >
                      <option value="copper">Copper</option>
                    </select>
                  </div>
              </div>

               {/* Column 3 */}
              <div>
                   <div>
                    <label className="block font-medium mb-1 text-sm">Loaded Conductors</label>
                    <select
                      name="numberOfLoadedConductors"
                      value={cableSizingInputs.numberOfLoadedConductors}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm bg-white"
                    >
                      <option value="2">2 (Single-Phase)</option>
                      <option value="3">3 (Three-Phase)</option>
                    </select>
                  </div>
                  <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Installation Method</label>
                    <select
                      name="installationMethod"
                      value={cableSizingInputs.installationMethod}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm bg-white"
                    >
                       {availableMethods.map(method => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                       ))}
                    </select>
                     <p className="text-xs text-gray-500 mt-1">Options change based on Arrangement/Type.</p>
                  </div>
                   <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Ambient Temp (°C)</label>
                    <input
                      type="number"
                      name="ambientTemperature"
                      value={cableSizingInputs.ambientTemperature}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block font-medium mb-1 text-sm">Number of Circuits (Grouping)</label>
                    <input
                      type="number"
                      name="numberOfCircuits"
                      value={cableSizingInputs.numberOfCircuits}
                      onChange={handleCableSizingInputChange}
                      className="w-full p-2 border rounded-md text-sm"
                      min="1"
                    />
                  </div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateCableSize}
              disabled={isCalculating}
              className={`bg-blue-600 text-white px-6 py-2 rounded-md transition-colors mb-4 ${
                isCalculating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              {isCalculating ? 'Calculating...' : 'Calculate Cable Size'}
            </button>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 bg-red-50 p-4 rounded-lg border-l-4 border-red-600 text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Results Display */}
            {cableSizingResults && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                <h3 className="text-lg font-semibold mb-2">Results (Based on CoP Appendix 6)</h3>

                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 mb-1">Cable Selection</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                    <div><span className="font-medium">Required CCC (I'z):</span> {cableSizingResults.requiredCCC} A</div>
                    <div><span className="font-medium">Size for CCC (It ≥ I'z):</span> {cableSizingResults.recommendedCableSize.forCurrentCapacity}</div>
                    <div><span className="font-medium">Size for VDrop (≤ {cableSizingInputs.voltageDrop}%):</span> {cableSizingResults.recommendedCableSize.forVoltageDrop}</div>
                    <div className="font-bold text-green-600"><span className="font-medium text-black">Recommended Size:</span> {cableSizingResults.recommendedCableSize.final}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 mb-1">Applied Correction Factors (Simplified IEC)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                    <div><span className="font-medium">Temp Factor (Ca):</span> {cableSizingResults.temperatureFactor}</div>
                    <div><span className="font-medium">Grouping Factor (Cg):</span> {cableSizingResults.groupingFactor}</div>
                    <div><span className="font-medium">Total Derating (Ca*Cg):</span> {(parseFloat(cableSizingResults.temperatureFactor) * parseFloat(cableSizingResults.groupingFactor)).toFixed(2)}</div>
                  </div>
                </div>

                <div className="mb-2">
                  <h4 className="font-medium text-blue-800 mb-1">Voltage Drop Verification (for Recommended Size)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                    <div><span className="font-medium">Voltage Drop:</span> {cableSizingResults.voltageDropV} V ({cableSizingResults.voltageDropPercent}%)</div>
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`font-bold ${cableSizingResults.voltageDropStatus.includes('Acceptable') ? 'text-green-600' : 'text-red-600'}`}>
                        {cableSizingResults.voltageDropStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-600 border-t pt-2">
                  <p>Note: Calculations use tables from CoP Appendix 6 for Copper cables. Temperature (Ca) and Grouping (Cg) factors are simplified estimates based on IEC standards; refer to CoP Appendix 5 / BS7671 for precise values.</p>
                  <p className="mt-1">CoP generally recommends voltage drop not exceeding 4% from origin to load point.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'powerFactor':
         return (
           <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-semibold">Power Factor Correction Calculator</h2>
               <button onClick={() => setShowTutorial(true)} className="flex items-center text-blue-600 hover:text-blue-800">
                 <Icons.InfoInline /> Tutorial
               </button>
             </div>
             <p className="mb-4 text-gray-600">
               Calculates required capacitor bank size and evaluates financial benefits.
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
                 <label className="block font-medium mb-1 text-sm">Initial Power Factor</label>
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
               <div>
                 <label className="block font-medium mb-1 text-sm">Utility Tariff</label>
                 <select
                   name="utilityTariff"
                   value={powerFactorInputs.utilityTariff}
                   onChange={handlePowerFactorInputChange}
                   className="w-full p-2 border rounded-md text-sm bg-white"
                 >
                   <option value="hke">HK Electric (Max Demand)</option>
                   <option value="clp">CLP Power (Bulk Tariff)</option>
                 </select>
               </div>
               <div>
                 <label className="block font-medium mb-1 text-sm">Load Factor (Avg Load / Peak Load)</label>
                 <input
                   type="number"
                   name="loadFactor"
                   value={powerFactorInputs.loadFactor}
                   onChange={handlePowerFactorInputChange}
                   className="w-full p-2 border rounded-md text-sm"
                   min="0.1"
                   max="1"
                   step="0.01"
                 />
               </div>
             </div>

             {/* Calculate Button */}
             <button
               onClick={calculatePowerFactor}
               disabled={isCalculating}
               className={`bg-blue-600 text-white px-6 py-2 rounded-md transition-colors mb-4 ${
                isCalculating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
             >
               {isCalculating ? 'Calculating...' : 'Calculate Power Factor Correction'}
             </button>

             {/* Error Message */}
             {errorMessage && (
              <div className="mt-4 bg-red-50 p-4 rounded-lg border-l-4 border-red-600 text-red-700">
                {errorMessage}
              </div>
            )}

             {/* Results Display */}
             {powerFactorResults && (
               <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                 <h3 className="text-lg font-semibold mb-2">Results</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                   <div><span className="font-medium">Initial Total PF (with THD):</span> {powerFactorResults.initialTotalPF}</div>
                   <div><span className="font-medium">Required Capacitance:</span> {powerFactorResults.kVArRequired} kVAr</div>
                   <div><span className="font-medium">Recommended Capacitor Size:</span> {powerFactorResults.capacitorSize} kVAr</div>
                   <div><span className="font-medium">Est. Annual Savings:</span> HK$ {powerFactorResults.annualSavings}</div>
                   <div><span className="font-medium">Est. Capacitor Cost:</span> HK$ {powerFactorResults.capacitorCost}</div>
                   <div><span className="font-medium">Payback Period:</span> {powerFactorResults.paybackPeriod} years</div>
                   <div>
                     <span className="font-medium">Recommendation:</span>{' '}
                     <span className={`font-bold ${powerFactorResults.recommendation === 'Highly Recommended' ? 'text-green-600' : (powerFactorResults.recommendation === 'Recommended' ? 'text-yellow-600' : 'text-red-600')}`}>
                       {powerFactorResults.recommendation}
                     </span>
                   </div>
                 </div>
                 <div className="mt-2 text-xs text-gray-600">
                   Note: Savings and payback are estimates based on simplified tariff structures and constant load factor.
                 </div>
               </div>
             )}
           </div>
         );

      case 'circuitProtection':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Circuit Protection Calculator</h2>
              <button onClick={() => setShowTutorial(true)} className="flex items-center text-blue-600 hover:text-blue-800">
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
              <div>
                <label className="block font-medium mb-1 text-sm">Protection Device Rating (In) (A)</label>
                <input
                  type="number"
                  name="breakerRating"
                  value={circuitProtectionInputs.breakerRating}
                  onChange={handleCircuitProtectionInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              <div>
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
              </div>
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
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateCircuitProtection}
              disabled={isCalculating}
              className={`bg-blue-600 text-white px-6 py-2 rounded-md transition-colors mb-4 ${
                isCalculating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              {isCalculating ? 'Calculating...' : 'Evaluate Circuit Protection'}
            </button>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 bg-red-50 p-4 rounded-lg border-l-4 border-red-600 text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Results Display */}
            {circuitProtectionResults && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                <h3 className="text-lg font-semibold mb-2">Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                  <div><span className="font-medium">Est. Cable Impedance (Zc):</span> {circuitProtectionResults.cableImpedance} Ω</div>
                  <div><span className="font-medium">Est. Fault Current at End (If):</span> {circuitProtectionResults.faultCurrentAtEnd} A</div>
                  <div><span className="font-medium">Est. Device Operating Time:</span> {circuitProtectionResults.operatingTime} s</div>
                  <div>
                    <span className="font-medium">Protection Status (If vs Trip):</span>{' '}
                    <span className={`font-bold ${circuitProtectionResults.protectionStatus.includes('Adequate') ? 'text-green-600' : 'text-red-600'}`}>
                      {circuitProtectionResults.protectionStatus}
                    </span>
                  </div>
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
          </div>
        );

      default: return null;
    }
  };

  // Main return for ElectricalCalculator
  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        <Icons.ArrowLeft /> Back to Disciplines
      </button>

      {/* Title specific to this discipline */}
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">
        Electrical Installation
      </h1>

      {/* Logic to show tutorial or calculator selection */}
      {showTutorial && calculatorType ? renderTutorial() : (
        <>
          {/* Calculator Type Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Select Calculator Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                className={`p-4 rounded-lg text-center transition-colors border ${calculatorType === 'cableSizing' ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                onClick={() => setCalculatorType('cableSizing')}
              >
                <h3 className="font-medium text-lg">Cable Sizing</h3>
                <p className="text-sm mt-1 text-gray-600">Calculate cable size</p>
              </button>
              <button
                 className={`p-4 rounded-lg text-center transition-colors border ${calculatorType === 'powerFactor' ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                onClick={() => setCalculatorType('powerFactor')}
              >
                <h3 className="font-medium text-lg">Power Factor Correction</h3>
                <p className="text-sm mt-1 text-gray-600">Capacitor sizing & savings</p>
              </button>
              <button
                 className={`p-4 rounded-lg text-center transition-colors border ${calculatorType === 'circuitProtection' ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                onClick={() => setCalculatorType('circuitProtection')}
              >
                <h3 className="font-medium text-lg">Circuit Protection</h3>
                <p className="text-sm mt-1 text-gray-600">Protection & thermal check</p>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isCalculating && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-blue-600">Calculating results...</p>
            </div>
          )}

          {/* Render the selected calculator */}
          {calculatorType && renderCalculator()}
        </>
      )}
    </div>
  );
};

export default ElectricalCalculator;