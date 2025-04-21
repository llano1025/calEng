import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { copTables, VoltageDropTable } from '../../data/cop_tables';

// Define TypeScript interfaces for our data structures
interface TableLookupDetails {
  insulation: string;
  armour: string;
  arrangement: string;
  method: string;
  conductors: string;
  tablePath: string;
}

interface CalculationResults {
  requiredCCC: string;
  temperatureFactor: string;
  groupingFactor: string;
  recommendedCableSize: {
    forCurrentCapacity: string;
    forVoltageDrop: string;
    final: string;
  };
  selectedCableCurrentCapacity: number;
  actualCurrentCapacityWithFactors: string;
  voltageDropV: string;
  voltageDropPercent: string;
  voltageDropStatus: string;
  voltageDropFactor: string;
  voltageDropFactorType: string;
  systemType: string;
  tableDetails: TableLookupDetails;
  error?: string;
}

// Define props type for the component
interface CableSizingCalculatorProps {
  onShowTutorial: () => void; // Function to show tutorial
}

// Cable Sizing Calculator Component
const CableSizingCalculator: React.FC<CableSizingCalculatorProps> = ({ onShowTutorial }) => {
  // State for table modal
  const [showTableModal, setShowTableModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedTableName, setSelectedTableName] = useState<string>('');

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
    numberOfCircuits: '1', // for grouping factor per IEC 60364-5-52 Table B.52.17
    voltageDrop: '4', // max percentage voltage drop
    systemVoltage: '380', // system voltage (V)
    systemType: 'ac', // 'ac' or 'dc'
    cableConfig: 'standard', // 'standard', 'flat', 'trefoil' (for single-core cables)
  });

  // State for calculation results
  const [cableSizingResults, setCableSizingResults] = useState<any>(null);
  
  // State for lookup details
  const [lookupDetails, setLookupDetails] = useState<any>(null);

  // Handler for input changes
  const handleCableSizingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCableSizingInputs({ ...cableSizingInputs, [e.target.name]: e.target.value });
    setCableSizingResults(null); // Clear results on input change
    setLookupDetails(null);
  };

  // Filter installation methods based on selected cable properties
  // Update the getAvailableMethods function
  const getAvailableMethods = () => {
    const { cableArrangement, cableType, armoured } = cableSizingInputs;
    const isSingleCore = cableArrangement === 'singleCore';
    const isXLPE = cableType === 'xlpe';
    const isArmoured = armoured === 'true';
    
    let methods = [];
    
    // Method C (Clipped Direct) is available for all cable types
    methods.push({ value: 'methodC', label: 'Clipped Direct / On Tray (Method C)' });
    
    // Methods A & B (Conduit) are NOT available for armoured multi-core cables
    if (!(isArmoured)) {
      methods.push(
        { value: 'methodB', label: 'In Conduit / Trunking (Method B)' },
        { value: 'methodA', label: 'In Conduit in Insulated Wall (Method A)' }
      );
    }
    
    // Method E is only for multi-core cables
    if (!isSingleCore) {
      methods.push({ value: 'methodE', label: 'On Tray / Free Air (Method E)' });
    }
    
    // Method F options are only for single-core cables
    if (isSingleCore) {
      methods.push(
        { value: 'methodF_touching', label: 'On Tray / Free Air - Touching (Method F)' },
        { value: 'methodF_spacedH', label: 'On Tray / Free Air - Spaced Horiz (Method F)' },
        { value: 'methodF_spacedV', label: 'On Tray / Free Air - Spaced Vert (Method F)' }
      );
      
      // Method G is only available for XLPE single-core cables
      if (isXLPE && isSingleCore && !isArmoured) {
        methods.push(
            { value: 'methodG_spacedH', label: 'In Free Air - Spaced Horiz (Method G)' },
            { value: 'methodG_spacedV', label: 'In Free Air - Spaced Vert (Method G)' });
      }
    }
    
    return methods;
  };

  // Get available loaded conductors based on cable arrangement and system type
  const getAvailableLoadedConductors = () => {
    const { cableArrangement, systemType } = cableSizingInputs;
    
    // For DC systems, only 2 conductors are applicable
    if (systemType === 'dc') {
      return [{ value: '2', label: '2 (DC)' }];
    }
    
    // For single-core AC, offer both single and three-phase options
    if (cableArrangement === 'singleCore') {
      return [
        { value: '2', label: '2 (Single-Phase AC)' },
        { value: '3', label: '3 (Three-Phase AC)' }
      ];
    }
    
    // For multi-core AC, offer both single and three-phase options
    return [
      { value: '2', label: '2 (Single-Phase AC)' },
      { value: '3', label: '3 (Three-Phase AC)' }
    ];
  };

  // Get available cable configurations based on selected method and arrangement
  const getAvailableConfigurations = () => {
    const { cableArrangement, installationMethod, numberOfLoadedConductors } = cableSizingInputs;
    
    if (cableArrangement === 'multiCore') {
      return [{ value: 'standard', label: 'Standard (Multi-core)' }];
    }
    
    // Only show options for single-core with 3 conductors (three-phase)
    if (cableArrangement === 'singleCore' && numberOfLoadedConductors === '3') {
      if (installationMethod === 'methodC' || installationMethod === 'methodF_touching') {
        return [
          { value: 'flat', label: 'Flat' },
          { value: 'trefoil', label: 'Trefoil' }
        ];
      } else if (installationMethod === 'methodF_spacedH' || installationMethod === 'methodF_spacedV' || installationMethod === 'methodG_spacedH' || installationMethod === 'methodG_spacedV') {
        return [
          { value: 'flat', label: 'Flat' },
          { value: 'trefoil', label: 'Trefoil' }
        ];
      }
    }
    
    // For single-core with 2 conductors (single-phase or DC)
    if (cableArrangement === 'singleCore' && numberOfLoadedConductors === '2') {
      if (installationMethod === 'methodF_spacedH' || installationMethod === 'methodF_spacedV' || installationMethod === 'methodG_spacedH' || installationMethod === 'methodG_spacedV') {
        return [{ value: 'flat', label: 'Flat & Spaced' }];
      } else {
        return [{ value: 'flat', label: 'Flat & Touching' }];
      }
    }
    
    // Default for remaining methods
    return [{ value: 'standard', label: 'Standard' }];
  };

  // Reset installation method if current selection becomes invalid
  useEffect(() => {
    const availableMethods = getAvailableMethods();
    const currentMethodIsValid = availableMethods.some(m => m.value === cableSizingInputs.installationMethod);
    if (!currentMethodIsValid) {
      setCableSizingInputs(prev => ({ ...prev, installationMethod: 'methodC' }));
    }
  }, [cableSizingInputs.cableArrangement, cableSizingInputs.cableType, cableSizingInputs.armoured]);

  // Reset configuration if current selection becomes invalid
  useEffect(() => {
    const availableConfigs = getAvailableConfigurations();
    const currentConfigIsValid = availableConfigs.some(c => c.value === cableSizingInputs.cableConfig);
    if (!currentConfigIsValid) {
      setCableSizingInputs(prev => ({ ...prev, cableConfig: availableConfigs[0].value }));
    }
  }, [cableSizingInputs.cableArrangement, cableSizingInputs.installationMethod, cableSizingInputs.numberOfLoadedConductors]);
  
  // Update loaded conductors options based on system type
  useEffect(() => {
    // If DC is selected, force 2 conductors
    if (cableSizingInputs.systemType === 'dc' && cableSizingInputs.numberOfLoadedConductors !== '2') {
      setCableSizingInputs(prev => ({ ...prev, numberOfLoadedConductors: '2' }));
    }
  }, [cableSizingInputs.systemType]);

  // Cable sizing calculation function
  const calculateCableSize = () => {
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
    const systemType = cableSizingInputs.systemType as 'ac' | 'dc';
    const cableConfig = cableSizingInputs.cableConfig;

    if (isNaN(current) || isNaN(length) || isNaN(ambientTemp) || isNaN(numCircuits) ||
        isNaN(maxVDropPercent) || isNaN(systemVoltage) || isNaN(numLoadedConductors)) {
      alert("Please enter valid numeric values for all required fields.");
      setCableSizingResults({ error: "Invalid input values." });
      return;
    }

    // 1. Temperature correction factor (k1 / Ca) - Based on IEC 60364-5-52 Table B.52.14
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

    // 2. Grouping correction factor (k2 / Cg) - Enhanced to be more specific
    let groupingFactor = 1.0;
    
    // More detailed grouping factor based on installation method and number of circuits
    if (installMethodKey.includes('methodA') || installMethodKey.includes('methodB')) {
      // Enclosed in conduit or trunking
      if (numCircuits === 2) groupingFactor = 0.80;
      else if (numCircuits === 3) groupingFactor = 0.70;
      else if (numCircuits === 4) groupingFactor = 0.65;
      else if (numCircuits === 5) groupingFactor = 0.60;
      else if (numCircuits === 6) groupingFactor = 0.57;
      else if (numCircuits >= 7 && numCircuits <= 9) groupingFactor = 0.54;
      else if (numCircuits >= 10 && numCircuits <= 12) groupingFactor = 0.52;
      else if (numCircuits >= 13 && numCircuits <= 15) groupingFactor = 0.50;
      else if (numCircuits >= 16 && numCircuits <= 19) groupingFactor = 0.48;
      else if (numCircuits >= 20) groupingFactor = 0.45;
    }
    else if (installMethodKey.includes('methodC') || installMethodKey.includes('methodF_touching')) {
      // Touching on surface
      if (numCircuits === 2) groupingFactor = 0.85;
      else if (numCircuits === 3) groupingFactor = 0.79;
      else if (numCircuits === 4) groupingFactor = 0.75;
      else if (numCircuits === 5) groupingFactor = 0.73;
      else if (numCircuits === 6) groupingFactor = 0.72;
      else if (numCircuits >= 7 && numCircuits <= 9) groupingFactor = 0.70;
      else if (numCircuits >= 10) groupingFactor = 0.68;
    }
    else if (installMethodKey.includes('methodE') || installMethodKey.includes('methodF_spaced') || installMethodKey === 'methodG') {
      // Spaced on perforated tray or in free air
      if (numCircuits === 2) groupingFactor = 0.88;
      else if (numCircuits === 3) groupingFactor = 0.82;
      else if (numCircuits === 4) groupingFactor = 0.77;
      else if (numCircuits === 5) groupingFactor = 0.75;
      else if (numCircuits === 6) groupingFactor = 0.73;
      else if (numCircuits >= 7) groupingFactor = 0.70;
    }

    // 3. Calculate minimum CCC (Current Carrying Capacity) - I'z = Ib / (Ca * Cg)
    const minimumCCC = current / (temperatureFactor * groupingFactor);

    // 4. Determine cable size based on CoP Appendix 6 tables
    const armourKey = isArmoured ? 'armoured' : 'nonArmoured';
    
    // Map number of loaded conductors to the key used in the tables
    let conductorsKey = '2'; // Default for single-phase
    
    if (numLoadedConductors === 3) {
      if (cableArrangement === 'multiCore') {
        conductorsKey = '3_4';
      } else {
        conductorsKey = '3';
      }
    }
    
    // REVISED METHOD F & G MAPPING LOGIC to match updated table structure
    // REVISED METHOD F & G MAPPING LOGIC to match updated table structure
    let adjustedMethodKey = installMethodKey;

    if (installMethodKey === 'methodF_touching' && cableArrangement === 'singleCore') {
      if (cableConfig === 'flat') {
        // For armoured single-core, special handling needed
        if (isArmoured) {
          adjustedMethodKey = numLoadedConductors === 2 ? 'methodF.touching.2' : 'methodF.touching.3_flat';
        } else {
          // Non-armoured cables
          adjustedMethodKey = numLoadedConductors === 2 ? 'methodF.touching.flat' : 'methodF.touching.flat_3ph';
        }
      } else if (cableConfig === 'trefoil' && numLoadedConductors === 3) {
        adjustedMethodKey = isArmoured ? 'methodF.touching.3_trefoil' : 'methodF.touching.trefoil';
      }
    } else if ((installMethodKey === 'methodF_spacedH' || installMethodKey === 'methodF_spacedV') && cableArrangement === 'singleCore') {
      // Map to horizontal or vertical based on the method
      if (isArmoured) {
        if (systemType === 'dc') {
          adjustedMethodKey = installMethodKey === 'methodF_spacedH' ? 'methodF.spaced.dc_horizontal' : 'methodF.spaced.dc_vertical';
        } else {
          const acDirection = installMethodKey === 'methodF_spacedH' ? 'horizontal' : 'vertical';
          const conductorLabel = numLoadedConductors === 2 ? '2' : '3';
          adjustedMethodKey = `methodF.spaced.ac_${conductorLabel}_${acDirection}`;
        }
      } else {
        adjustedMethodKey = installMethodKey === 'methodF_spacedH' ? 'methodF.spaced.horizontal' : 'methodF.spaced.vertical';
      }
    }

    // Store table lookup details for reference
    const tableDetails = {
      insulation: cableType,
      armour: armourKey,
      arrangement: cableArrangement,
      method: adjustedMethodKey,
      conductors: conductorsKey,
      tablePath: `copper.${cableType}.${armourKey}.${cableArrangement}.ccc.${adjustedMethodKey}`
    };
    
    setLookupDetails(tableDetails);

    // Parse the adjusted method key to navigate the nested tables
    let cccTable: { [size: string]: number } | undefined;
    try {
      if (adjustedMethodKey.includes('.')) {
        // Handle nested keys like methodF.touching.flat
        const keys = adjustedMethodKey.split('.');
        let tempTable: any = (copTables as any).copper?.[cableType as 'pvc' | 'xlpe']?.[armourKey as 'armoured' | 'nonArmoured']?.[cableArrangement as 'singleCore' | 'multiCore']?.ccc;
        
        // Navigate through the nested structure
        for (const key of keys) {
          if (tempTable && typeof tempTable === 'object') {
            tempTable = tempTable[key];
          } else {
            tempTable = undefined;
            break;
          }
        }
        
        // Check if we need a specific conductors key
        if (tempTable && typeof tempTable === 'object' && conductorsKey && conductorsKey in tempTable) {
          cccTable = tempTable[conductorsKey];
        } else {
          cccTable = tempTable; // The table we found doesn't need a conductors key
        }
      } else {
        // Standard table lookup
        cccTable = (copTables as any).copper?.[cableType as 'pvc' | 'xlpe']?.[armourKey as 'armoured' | 'nonArmoured']?.[cableArrangement as 'singleCore' | 'multiCore']?.ccc?.[adjustedMethodKey]?.[conductorsKey];
      }
    } catch (e) {
      console.error("Error accessing CCC table:", e);
      cccTable = undefined;
    }

    // Function to handle 'table not found' errors with more specific messages
    const handleTableNotFound = () => {
      // Check for specific known problematic combinations
      if (armourKey === 'armoured' && cableArrangement === 'singleCore') {
        if (installMethodKey.includes('methodF') || installMethodKey === 'methodG') {
          // Special handling message for armoured single-core with Method F/G
          if (cableType === 'pvc') {
            return { 
              error: `Tables for armoured single-core PVC cables with Method ${installMethodKey.includes('F') ? 'F' : 'G'} are limited in CoP Appendix 6. Consider using XLPE insulation or a different installation method.`
            };
          } else {
            return {
              error: `The specific combination of armoured single-core XLPE cables with ${cableConfig} configuration for ${numLoadedConductors} conductors in Method ${installMethodKey} may not be standard in CoP Appendix 6. Try an alternative configuration or installation method.`
            };
          }
        }
      }
      
      // Generic error message
      return { 
        error: `CCC data not available for the selected configuration. Please check CoP Appendix 6 or adjust parameters.`,
        tableDetails
      };
    };

    // Handle invalid combinations
    if (!cccTable) {
      setCableSizingResults(handleTableNotFound());
      return;
    }

    // Find the smallest cable size that meets the minimum CCC requirement
    let cableSizeForCCC = "Not Found";
    // Ensure sizes are sorted numerically for correct selection
    const sortedSizes = Object.keys(cccTable).sort((a, b) => parseFloat(a) - parseFloat(b));

    for (const size of sortedSizes) {
      if (cccTable[size] >= minimumCCC) {
        cableSizeForCCC = size;
        break;
      }
    }

    if (cableSizeForCCC === "Not Found") {
      // Find the largest size available in the table
      const largestSize = sortedSizes.length > 0 ? sortedSizes[sortedSizes.length - 1] : "N/A";
      setCableSizingResults({ 
        error: `No suitable cable size found for the required CCC (${minimumCCC.toFixed(1)} A). Largest available size is ${largestSize} mm². Consider parallel cables or check inputs.`,
        tableDetails
      });
      return;
    }

    // 5. Voltage drop calculation - REVISED for new table structure
    // Updated getVdFactor function with support for methodCFG
    const getVdFactor = (sizeStr: string): {factor: number | null, valueType: string} => {
      if (typeof sizeStr !== 'string') return {factor: null, valueType: ''};
  
      try {
          if (systemType === 'dc') {
              // For DC, use the DC voltage drop tables
              const dcVdTable = (copTables as any).copper?.[cableType as 'pvc' | 'xlpe']?.[armourKey as 'armoured' | 'nonArmoured']?.[cableArrangement as 'singleCore' | 'multiCore']?.voltageDrop?.dc;
              if (!dcVdTable || !(sizeStr in dcVdTable) || !dcVdTable[sizeStr]?.dc) {
                  return {factor: null, valueType: 'dc'};
              }
              return {factor: dcVdTable[sizeStr].dc, valueType: 'dc'};
          } else {
              // For AC, use the AC voltage drop tables
              const acVdBranch = (copTables as any).copper?.[cableType as 'pvc' | 'xlpe']?.[armourKey as 'armoured' | 'nonArmoured']?.[cableArrangement as 'singleCore' | 'multiCore']?.voltageDrop?.ac;
              if (!acVdBranch) return {factor: null, valueType: ''};
  
              // ADDED FIX: Special handling for armoured single-core cables
              if (armourKey === 'armoured' && cableArrangement === 'singleCore') {
                // For single-phase (2 conductors)
                if (numLoadedConductors === 2) {
                    if (installMethodKey.includes('touching') && acVdBranch.single_phase?.touching?.[sizeStr]) {
                        const entry = acVdBranch.single_phase.touching[sizeStr];
                        return {
                            factor: entry.z || entry.r,
                            valueType: entry.z ? 'z' : 'r'
                        };
                    } 
                    // Add this section to handle spaced configurations
                    else if (installMethodKey.includes('spaced') && acVdBranch.single_phase?.spaced?.[sizeStr]) {
                        const entry = acVdBranch.single_phase.spaced[sizeStr];
                        return {
                            factor: entry.z || entry.r,
                            valueType: entry.z ? 'z' : 'r'
                        };
                    }
                }
                  // For three-phase (3 conductors)
                  else if (numLoadedConductors === 3) {
                    // The issue is here - we need to check if the installation method is spaced
                    const configTable = cableConfig === 'trefoil' ? 'trefoil' : 
                                      (installMethodKey.includes('spaced') ? 'flat_spaced' : 'flat_touching');
                    
                    if (acVdBranch.three_phase?.[configTable]?.[sizeStr]) {
                        const entry = acVdBranch.three_phase[configTable][sizeStr];
                        return {
                            factor: entry.z || entry.r,
                            valueType: entry.z ? 'z' : 'r'
                        };
                    }
                }
              }
  
              // Method A & B map to methodAB
              if (installMethodKey === 'methodA' || installMethodKey === 'methodB') {
                  // Try to get the table for the right number of conductors
                  const conductorsKey = numLoadedConductors === 2 ? '2' : '3';
                  if (acVdBranch.methodAB?.[conductorsKey]?.[sizeStr]) {
                      const entry = acVdBranch.methodAB[conductorsKey][sizeStr];
                      return {
                          factor: entry.z || entry.r,
                          valueType: entry.z ? 'z' : 'r'
                      };
                  }
              }
              
              // Method C handling - check both methodCF and methodCFG
              if (installMethodKey === 'methodC') {
                  if (cableArrangement === 'singleCore') {
                      // For single-core Method C with 2 conductors
                      if (numLoadedConductors === 2) {
                          // First try methodCF.touching.cables_touching
                          if (acVdBranch.methodCF?.touching?.cables_touching?.[sizeStr]) {
                              const entry = acVdBranch.methodCF.touching.cables_touching[sizeStr];
                              return {
                                  factor: entry.z || entry.r,
                                  valueType: entry.z ? 'z' : 'r'
                              };
                          }
                          // Then try methodCFG.touching.cables_touching
                          else if (acVdBranch.methodCFG?.touching?.cables_touching?.[sizeStr]) {
                              const entry = acVdBranch.methodCFG.touching.cables_touching[sizeStr];
                              return {
                                  factor: entry.z || entry.r,
                                  valueType: entry.z ? 'z' : 'r'
                              };
                          }
                      } else {
                          // For 3 conductors, check the config (flat or trefoil)
                          const configTable = cableConfig === 'trefoil' ? 'trefoil' : 'flat';
                          
                          // First try methodCF
                          if (acVdBranch.methodCF?.touching?.[configTable]?.[sizeStr]) {
                              const entry = acVdBranch.methodCF.touching[configTable][sizeStr];
                              return {
                                  factor: entry.z || entry.r,
                                  valueType: entry.z ? 'z' : 'r'
                              };
                          }
                          // Then try methodCFG
                          else if (acVdBranch.methodCFG?.touching?.[configTable]?.[sizeStr]) {
                              const entry = acVdBranch.methodCFG.touching[configTable][sizeStr];
                              return {
                                  factor: entry.z || entry.r,
                                  valueType: entry.z ? 'z' : 'r'
                              };
                          }
                      }
                  } else {
                      // For multi-core, use standard conductors key
                      const conductorsKey = numLoadedConductors === 2 ? '2' : '3_4';
                      
                      // Try direct access to the ac.{conductorsKey} table as fallback
                      if (acVdBranch[conductorsKey]?.[sizeStr]) {
                          const entry = acVdBranch[conductorsKey][sizeStr];
                          return {
                              factor: entry.z || entry.r,
                              valueType: entry.z ? 'z' : 'r'
                          };
                      }
                  }
              }
              
              // Method F handling - check both methodCF and methodCFG
              if (installMethodKey.includes('methodF')) {
                  if (installMethodKey.includes('touching')) {
                      // Similar to Method C, access methodCF.touching or methodCFG.touching
                      if (cableArrangement === 'singleCore') {
                          if (numLoadedConductors === 2) {
                              // Try the cables_touching table for 2 conductors
                              if (acVdBranch.methodCF?.touching?.cables_touching?.[sizeStr]) {
                                  const entry = acVdBranch.methodCF.touching.cables_touching[sizeStr];
                                  return {
                                      factor: entry.z || entry.r,
                                      valueType: entry.z ? 'z' : 'r'
                                  };
                              }
                              else if (acVdBranch.methodCFG?.touching?.cables_touching?.[sizeStr]) {
                                  const entry = acVdBranch.methodCFG.touching.cables_touching[sizeStr];
                                  return {
                                      factor: entry.z || entry.r,
                                      valueType: entry.z ? 'z' : 'r'
                                  };
                              }
                          } else {
                              // For 3 conductors, check the config (flat or trefoil)
                              const configTable = cableConfig === 'trefoil' ? 'trefoil' : 'flat';
                              
                              if (acVdBranch.methodCF?.touching?.[configTable]?.[sizeStr]) {
                                  const entry = acVdBranch.methodCF.touching[configTable][sizeStr];
                                  return {
                                      factor: entry.z || entry.r,
                                      valueType: entry.z ? 'z' : 'r'
                                  };
                              }
                              else if (acVdBranch.methodCFG?.touching?.[configTable]?.[sizeStr]) {
                                  const entry = acVdBranch.methodCFG.touching[configTable][sizeStr];
                                  return {
                                      factor: entry.z || entry.r,
                                      valueType: entry.z ? 'z' : 'r'
                                  };
                              }
                          }
                      }
                  } else if (installMethodKey.includes('spaced')) {
                      // For spaced configurations, access methodCF.spaced or methodCFG.spaced
                      const spaceDirection = numLoadedConductors === 2 ? 'flat_2' : 'flat_3';
                      
                      if (acVdBranch.methodCF?.spaced?.[spaceDirection]?.[sizeStr]) {
                          const entry = acVdBranch.methodCF.spaced[spaceDirection][sizeStr];
                          return {
                              factor: entry.z || entry.r,
                              valueType: entry.z ? 'z' : 'r'
                          };
                      }
                      else if (acVdBranch.methodCFG?.spaced?.[spaceDirection]?.[sizeStr]) {
                          const entry = acVdBranch.methodCFG.spaced[spaceDirection][sizeStr];
                          return {
                              factor: entry.z || entry.r,
                              valueType: entry.z ? 'z' : 'r'
                          };
                      }
                  }
              }
              
              // Fix for Method G (both spacedH and spacedV variants)
              if (installMethodKey.includes('methodG_spaced')) {
                  // Method G uses the same voltage drop data as Method F spaced
                  const spaceDirection = numLoadedConductors === 2 ? 'flat_2' : 'flat_3';
                  
                  // Try methodCF.spaced first
                  if (acVdBranch.methodCF?.spaced?.[spaceDirection]?.[sizeStr]) {
                      const entry = acVdBranch.methodCF.spaced[spaceDirection][sizeStr];
                      return {
                          factor: entry.z || entry.r,
                          valueType: entry.z ? 'z' : 'r'
                      };
                  }
                  // Then try methodCFG.spaced
                  else if (acVdBranch.methodCFG?.spaced?.[spaceDirection]?.[sizeStr]) {
                      const entry = acVdBranch.methodCFG.spaced[spaceDirection][sizeStr];
                      return {
                          factor: entry.z || entry.r,
                          valueType: entry.z ? 'z' : 'r'
                      };
                  }
              }
              
              // Fallback - try direct access to tables
              // Try with conductor key tables
              const conductorsKey = numLoadedConductors === 2 ? '2' : 
                                (cableArrangement === 'multiCore' ? '3_4' : '3');
                                
              if (acVdBranch[conductorsKey]?.[sizeStr]) {
                  const entry = acVdBranch[conductorsKey][sizeStr];
                  return {
                      factor: entry.z || entry.r,
                      valueType: entry.z ? 'z' : 'r'
                  };
              }
              
              // Try one more fallback for XLPE cables
              if (cableType === 'xlpe' && cableArrangement === 'singleCore') {
                  // For XLPE the data might be under a different naming convention
                  // Try accessing through methodCFG directly
                  const conductorsKey = numLoadedConductors === 2 ? '2' : '3';
                  if (acVdBranch.methodCFG?.[conductorsKey]?.[sizeStr]) {
                      const entry = acVdBranch.methodCFG[conductorsKey][sizeStr];
                      return {
                          factor: entry.z || entry.r,
                          valueType: entry.z ? 'z' : 'r'
                      };
                  }
              }
              
              // If all attempts failed, log the paths we tried
              console.log(`Failed to find VD data for ${cableType} ${armourKey} ${cableArrangement} ${installMethodKey} ${cableConfig} ${sizeStr}mm²`);
              
              // If all attempts failed, return null
              return {factor: null, valueType: ''};
          }
      } catch (e) {
          console.error(`Error accessing VD table for size ${sizeStr}:`, e);
          return {factor: null, valueType: ''};
      }
  };

    // Calculate voltage drop for the selected size
    let cableSizeForVoltageDrop = cableSizeForCCC;
    let finalCableSize = cableSizeForCCC;
    let vdResult = getVdFactor(cableSizeForCCC);
    let vdFactor = vdResult.factor;
    let vdValueType = vdResult.valueType;
    let voltageDropV = NaN;
    let voltageDropPercent = NaN;
    let voltageDropStatus = "Error";

    if (vdFactor === null) {
      voltageDropStatus = `VD data unavailable for initial size ${cableSizeForCCC} mm²`;
    } else {
      // Calculate voltage drop based on system type and formula
      if (systemType === 'dc') {
        voltageDropV = (vdFactor * current * length) / 1000;
        voltageDropPercent = (voltageDropV / systemVoltage) * 100;
      } else { // AC
        // For AC single-phase
        if (numLoadedConductors === 2) {
          voltageDropV = (vdFactor * current * length) / 1000;
        } 
        // For AC three-phase
        else {
          voltageDropV = (vdFactor * current * length) / 1000;
        }
        voltageDropPercent = (voltageDropV / systemVoltage) * 100;
      }
      
      voltageDropStatus = voltageDropPercent <= maxVDropPercent ? "Acceptable" : "Too High";
    }

    // If voltage drop is too high, find a suitable size
    if (voltageDropStatus === "Too High") {
      let currentSizeIndex = sortedSizes.indexOf(cableSizeForCCC);
      let foundSuitableSize = false;
      while (currentSizeIndex < sortedSizes.length - 1) {
        currentSizeIndex++;
        const nextSize = sortedSizes[currentSizeIndex];
        const nextVdResult = getVdFactor(nextSize);
        const nextVdFactor = nextVdResult.factor;

        if (nextVdFactor !== null) {
          let nextVoltageDropV;
          if (systemType === 'dc') {
            nextVoltageDropV = (nextVdFactor * current * length) / 1000;
          } else {
            if (numLoadedConductors === 2) {
              nextVoltageDropV = (nextVdFactor * current * length) / 1000;
            } else {
              nextVoltageDropV = (nextVdFactor * current * length * Math.sqrt(3)) / 1000;
            }
          }
          
          const nextVoltageDropPercent = (nextVoltageDropV / systemVoltage) * 100;

          if (nextVoltageDropPercent <= maxVDropPercent) {
            cableSizeForVoltageDrop = nextSize;
            vdFactor = nextVdFactor;
            vdValueType = nextVdResult.valueType;
            voltageDropV = nextVoltageDropV;
            voltageDropPercent = nextVoltageDropPercent;
            voltageDropStatus = `Acceptable (Increased for VDrop)`;
            foundSuitableSize = true;
            break;
          }
        } else {
          voltageDropStatus = `Too High (VD data unavailable for ${nextSize} mm²)`;
          break;
        }
      }
      
      if (!foundSuitableSize) {
        const largestCheckedSize = sortedSizes[currentSizeIndex];
        if (!voltageDropStatus.includes("VD data unavailable")) {
          voltageDropStatus = `Too High (Largest size ${largestCheckedSize} mm² still exceeds ${maxVDropPercent}%)`;
        }
        cableSizeForVoltageDrop = largestCheckedSize;
      }
    }

    // Final recommended size is the larger of CCC and VDrop requirements
    finalCableSize = parseFloat(cableSizeForVoltageDrop) > parseFloat(cableSizeForCCC)
                   ? cableSizeForVoltageDrop
                   : cableSizeForCCC;

    // Recalculate VD with final selected size if needed
    if (finalCableSize !== cableSizeForCCC) {
      const finalVdResult = getVdFactor(finalCableSize);
      const finalVdFactor = finalVdResult.factor;
      
      if (finalVdFactor !== null) {
        vdFactor = finalVdFactor;
        vdValueType = finalVdResult.valueType;
        
        if (systemType === 'dc') {
          voltageDropV = (finalVdFactor * current * length) / 1000;
        } else {
          if (numLoadedConductors === 2) {
            voltageDropV = (finalVdFactor * current * length) / 1000;
          } else {
            voltageDropV = (finalVdFactor * current * length * Math.sqrt(3)) / 1000;
          }
        }
        
        voltageDropPercent = (voltageDropV / systemVoltage) * 100;
        
        if (!voltageDropStatus.includes("Acceptable (Increased")) {
          voltageDropStatus = voltageDropPercent <= maxVDropPercent 
            ? "Acceptable" 
            : `Too High (${voltageDropPercent.toFixed(2)}% > ${maxVDropPercent}%)`;
        }
      }
    }

    // Get the actual current carrying capacity for the selected cable
    const selectedCableCurrentCapacity = cccTable[finalCableSize];
    const actualCurrentCapacityWithFactors = selectedCableCurrentCapacity * temperatureFactor * groupingFactor;

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
      selectedCableCurrentCapacity: selectedCableCurrentCapacity,
      actualCurrentCapacityWithFactors: actualCurrentCapacityWithFactors.toFixed(1),
      voltageDropV: isNaN(voltageDropV) ? 'N/A' : voltageDropV.toFixed(2),
      voltageDropPercent: isNaN(voltageDropPercent) ? 'N/A' : voltageDropPercent.toFixed(2),
      voltageDropStatus: voltageDropStatus,
      voltageDropFactor: vdFactor !== null ? vdFactor.toFixed(4) : 'N/A',
      voltageDropFactorType: vdValueType,
      systemType: systemType,
      tableDetails: tableDetails
    });
  };

  // Function to show the relevant table in the modal
  const showTableData = () => {
    // Check if we have lookup details
    if (!lookupDetails) {
      alert("Please calculate first to view the relevant table.");
      return;
    }

    // Extract table lookup path from the details
    const { insulation, armour, arrangement, method, conductors } = lookupDetails;
    
    try {
      let tableData: any;
      let tableName = `${insulation.toUpperCase()} ${armour} ${arrangement} - ${method}`;
      
      if (method.includes('.')) {
        // Handle nested paths like methodF.touching.flat
        const keys = method.split('.');
        let tempTable: any = (copTables as any).copper?.[insulation]?.[armour]?.[arrangement]?.ccc;
        
        for (const key of keys) {
          if (tempTable && typeof tempTable === 'object') {
            tempTable = tempTable[key];
          } else {
            tempTable = undefined;
            break;
          }
        }
        
        // Check if we need to get a specific conductors subtable
        if (tempTable && typeof tempTable === 'object' && conductors && conductors in tempTable) {
          tableData = tempTable[conductors];
          tableName += ` - ${conductors} conductors`;
        } else {
          tableData = tempTable;
        }
      } else {
        // Standard path
        tableData = (copTables as any).copper?.[insulation]?.[armour]?.[arrangement]?.ccc?.[method]?.[conductors];
        tableName += ` - ${conductors} conductors`;
      }
    
      if (!tableData) {
        alert("Table data not available for the selected configuration.");
        return;
      }
      
      setSelectedTable(tableData);
      setSelectedTableName(tableName);
      setShowTableModal(true);
    } catch (error) {
      console.error("Error accessing table data:", error);
      alert("Error retrieving table data. Please check console for details.");
    }
  };

  // Available installation methods
  const availableMethods = getAvailableMethods();
  
  // Available cable configurations
  const availableConfigurations = getAvailableConfigurations();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Enhanced Cable Sizing Calculator (CoP Appendix 6)</h2>
        <div className="space-x-2">
          <button onClick={() => showTableData()} className="flex items-center text-green-600 hover:text-green-800">
            <Icons.Table/> View Tables
          </button>
          <button onClick={onShowTutorial} className="flex items-center text-blue-600 hover:text-blue-800">
            <Icons.InfoInline/> Tutorial
          </button>
        </div>
      </div>
      <p className="mb-4 text-gray-600">
        Enhanced calculator with DC/AC options, cable configuration selection, and detailed lookup results.
      </p>

      {/* Input Fields - Now in a 3-column grid, removed advanced section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Column 1 - Basic Load Information */}
        <div>
          <h3 className="font-medium text-blue-700 mb-2">Load Information</h3>
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
            <label className="block font-medium mb-1 text-sm">System Type</label>
            <select
              name="systemType"
              value={cableSizingInputs.systemType}
              onChange={handleCableSizingInputChange}
              className="w-full p-2 border rounded-md text-sm bg-white"
            >
              <option value="ac">AC</option>
              <option value="dc">DC</option>
            </select>
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

        {/* Column 2 - Cable Type Information */}
        <div>
          <h3 className="font-medium text-blue-700 mb-2">Cable Properties</h3>
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
          <div className="mt-3">
            <label className="block font-medium mb-1 text-sm">Cable Configuration</label>
            <select
              name="cableConfig"
              value={cableSizingInputs.cableConfig}
              onChange={handleCableSizingInputChange}
              className={`w-full p-2 border rounded-md text-sm bg-white ${getAvailableConfigurations().length <= 1 ? 'bg-gray-100' : ''}`}
              disabled={getAvailableConfigurations().length <= 1}
            >
              {getAvailableConfigurations().map(config => (
                <option key={config.value} value={config.value}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Column 3 - Installation Method */}
        <div>
          <h3 className="font-medium text-blue-700 mb-2">Installation Method</h3>
          <div>
            <label className="block font-medium mb-1 text-sm">Loaded Conductors</label>
            <select
              name="numberOfLoadedConductors"
              value={cableSizingInputs.numberOfLoadedConductors}
              onChange={handleCableSizingInputChange}
              className={`w-full p-2 border rounded-md text-sm bg-white ${getAvailableLoadedConductors().length <= 1 ? 'bg-gray-100' : ''}`}
              disabled={getAvailableLoadedConductors().length <= 1}
            >
              {getAvailableLoadedConductors().map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
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
              {getAvailableMethods().map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
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
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
      >
        Calculate Cable Size
      </button>

      {/* Results Display - Enhanced with more details */}
      {cableSizingResults && !cableSizingResults.error && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <h3 className="text-lg font-semibold mb-2">Results (Based on CoP Appendix 6)</h3>

          <div className="mb-4">
            <h4 className="font-medium text-blue-800 mb-1">Cable Selection</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 text-sm">
              <div><span className="font-medium">Required CCC (I'z):</span> {cableSizingResults.requiredCCC} A</div>
              <div><span className="font-medium">Size for CCC (It ≥ I'z):</span> {cableSizingResults.recommendedCableSize.forCurrentCapacity}</div>
              <div><span className="font-medium">Size for VDrop (≤ {cableSizingInputs.voltageDrop}%):</span> {cableSizingResults.recommendedCableSize.forVoltageDrop}</div>
              <div className="font-bold text-green-600 md:col-span-3"><span className="font-medium text-black">Recommended Cable Size:</span> {cableSizingResults.recommendedCableSize.final}</div>
              <div><span className="font-medium">Selected Cable Base CCC:</span> {cableSizingResults.selectedCableCurrentCapacity} A</div>
              <div><span className="font-medium">Design Load Utilization:</span> {((parseFloat(cableSizingInputs.designCurrent) / parseFloat(cableSizingResults.actualCurrentCapacityWithFactors)) * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-blue-800 mb-1">Applied Correction Factors</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 text-sm">
              <div><span className="font-medium">Temp Factor (Ca):</span> {cableSizingResults.temperatureFactor}</div>
              <div><span className="font-medium">Grouping Factor (Cg):</span> {cableSizingResults.groupingFactor}</div>
              <div><span className="font-medium">Total Derating (Ca*Cg):</span> {(parseFloat(cableSizingResults.temperatureFactor) * parseFloat(cableSizingResults.groupingFactor)).toFixed(2)}</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-blue-800 mb-1">Voltage Drop Verification (for {cableSizingResults.recommendedCableSize.final})</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 text-sm">
              <div><span className="font-medium">System Type:</span> {cableSizingResults.systemType.toUpperCase()}</div>
              <div><span className="font-medium">VD Factor:</span> {cableSizingResults.voltageDropFactor} {cableSizingResults.voltageDropFactorType ? `(${cableSizingResults.voltageDropFactorType.toUpperCase()})` : ''} mV/A/m</div>
              <div><span className="font-medium">Voltage Drop:</span> {cableSizingResults.voltageDropV} V ({cableSizingResults.voltageDropPercent}%)</div>
              <div className="md:col-span-3">
                <span className="font-medium">Status:</span>{' '}
                <span className={`font-bold ${cableSizingResults.voltageDropStatus.includes('Acceptable') ? 'text-green-600' : 'text-red-600'}`}>
                  {cableSizingResults.voltageDropStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Table Lookup Details */}
          {lookupDetails && (
            <div className="mb-2">
              <h4 className="font-medium text-blue-800 mb-1">Table Lookup Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                <div><span className="font-medium">Insulation Type:</span> {lookupDetails.insulation.toUpperCase()}</div>
                <div><span className="font-medium">Armour:</span> {lookupDetails.armour === 'armoured' ? 'Armoured' : 'Non-Armoured'}</div>
                <div><span className="font-medium">Arrangement:</span> {lookupDetails.arrangement === 'singleCore' ? 'Single-core' : 'Multi-core'}</div>
                <div><span className="font-medium">Method Used:</span> {lookupDetails.method}</div>
                <div><span className="font-medium">Conductors:</span> {lookupDetails.conductors}</div>
                <div><span className="font-medium">Table Path:</span> {lookupDetails.tablePath}</div>
              </div>
              <div className="mt-2 text-right">
                <button 
                  onClick={showTableData}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Complete Table
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-600 border-t pt-2">
            <p>Note: Calculations use tables from CoP Appendix 6 for Copper cables. Temperature and Grouping factors are based on IEC standards.</p>
            <p className="mt-1">CoP generally recommends voltage drop not exceeding 4% from origin to load point.</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {cableSizingResults && cableSizingResults.error && (
        <div className="mt-6 bg-red-50 p-4 rounded-lg border-l-4 border-red-600">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Calculation Error</h3>
          <p className="text-red-700">{cableSizingResults.error}</p>
          
          {/* Show lookup details even on error if available */}
          {cableSizingResults.tableDetails && (
            <div className="mt-4 border-t border-red-300 pt-2">
              <h4 className="font-medium text-red-800 mb-1">Table Lookup Attempt</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                <div><span className="font-medium">Insulation Type:</span> {cableSizingResults.tableDetails.insulation.toUpperCase()}</div>
                <div><span className="font-medium">Armour:</span> {cableSizingResults.tableDetails.armour === 'armoured' ? 'Armoured' : 'Non-Armoured'}</div>
                <div><span className="font-medium">Arrangement:</span> {cableSizingResults.tableDetails.arrangement === 'singleCore' ? 'Single-core' : 'Multi-core'}</div>
                <div><span className="font-medium">Method Attempted:</span> {cableSizingResults.tableDetails.method}</div>
                <div><span className="font-medium">Conductors:</span> {cableSizingResults.tableDetails.conductors}</div>
                <div><span className="font-medium">Table Path:</span> {cableSizingResults.tableDetails.tablePath}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedTableName}</h3>
              <button 
                onClick={() => setShowTableModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icons.Close />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cable Size (mm²)
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Carrying Capacity (A)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(selectedTable)
                    .sort(([sizeA], [sizeB]) => parseFloat(sizeA) - parseFloat(sizeB))
                    .map(([size, capacity]) => (
                      <tr key={size} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{size}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{String(capacity)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              <p>Data sourced from CoP Appendix 6 tables for copper cables.</p>
              <p>Values shown are base current ratings before application of correction factors.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CableSizingCalculator;