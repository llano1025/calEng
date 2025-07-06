import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';
import { PressureLossTablesData, FittingsData } from './MedicalGasPressureLossData';
import { interpolateTable } from './MedicalGasPressureLossUtils';

interface MedicalGasPressureDropCalculatorProps {
  onShowTutorial?: () => void;
}

interface PipelineInput {
  diameter: number; // mm
  length: number; // m
  flowRate: number; // L/min
  pressure: number; // kPa
  pipelineType: 'copper' | 'abs_vacuum';
}

interface PipelineSection {
  id: string;
  name: string;
  diameter: number; // mm
  length: number; // m
  flowRate: number; // L/min
  pressure: number; // kPa
  pipelineType: 'copper' | 'abs_vacuum';
  fittings: FittingInput[];
  calculationResult?: CalculationResult;
}

interface FittingInput {
  type: string;
  diameter: number; // mm
  quantity: number;
}

interface CalculationResult {
  basePressureDrop: number; // kPa per meter (before safety factor)
  totalLength: number; // m (including equivalent lengths)
  totalPressureDrop: number; // kPa (before safety factor)
  totalPressureDropWithSafety: number; // kPa (with safety factor applied)
  safetyFactor: number; // Applied safety factor
  interpolationDetails: {
    lowerFlow: number;
    upperFlow: number;
    lowerDistance: number;
    upperDistance: number;
    lowerPressureDrop: number;
    upperPressureDrop: number;
    tableFlowUsed: number;
    tablePressureDropUsed: number;
    tableDistanceUsed: number;
  };
}

const MedicalGasPressureDropCalculator: React.FC<MedicalGasPressureDropCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Medical Gas Pressure Drop Calculator',
    discipline: 'mechanical',
    calculatorType: 'medical-gas-pressure-drop'
  });

  // State for calculation mode
  const [calculationMode, setCalculationMode] = useState<'single' | 'multiple'>('single');

  // State for single pipeline inputs (legacy mode)
  const [pipelineInput, setPipelineInput] = useState<PipelineInput>({
    diameter: 15, // mm
    length: 100, // m
    flowRate: 800, // L/min
    pressure: 400, // kPa
    pipelineType: 'copper'
  });

  // State for fittings (legacy mode)
  const [fittings, setFittings] = useState<FittingInput[]>([]);

  // State for multiple pipeline sections
  const [pipelineSections, setPipelineSections] = useState<PipelineSection[]>([
    {
      id: '1',
      name: 'Main Distribution',
      diameter: 15,
      length: 100,
      flowRate: 800,
      pressure: 400,
      pipelineType: 'copper',
      fittings: []
    }
  ]);

  // State for global safety factor
  const [globalSafetyFactor, setGlobalSafetyFactor] = useState<number>(1.3);

  // State for calculation results
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [systemTotalPressureDrop, setSystemTotalPressureDrop] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Available diameters for selection
  const availableDiameters = [12, 15, 22, 28, 35, 42, 54, 76, 108];
  const availablePressures = [400, 700, 1100];
  const vacuumPressure = 6.5; // kPa for vacuum systems - standard medical vacuum (corresponding to table data)

  // Get available fitting types based on pipeline type and diameter
  const getAvailableFittingTypes = (pipelineType: string, diameter: number): string[] => {
    if (pipelineType === 'copper') {
      return Object.keys(FittingsData.copper);
    } else {
      // For ABS vacuum fittings, only certain diameters are available
      if ([40, 50, 70, 100, 125].includes(diameter)) {
        return Object.keys(FittingsData.abs_vacuum);
      }
      return [];
    }
  };

  // Calculate equivalent length for fittings (single mode)
  const calculateEquivalentLength = (): number => {
    if (fittings.length === 0) return 0;
    
    let totalEquivalentLength = 0;
    
    fittings.forEach(fitting => {
      let equivalentLength = 0;
      
      if (pipelineInput.pipelineType === 'copper') {
        const fittingData = FittingsData.copper[fitting.type];
        if (fittingData && fittingData[fitting.diameter]) {
          equivalentLength = fittingData[fitting.diameter] * fitting.quantity;
        }
      } else {
        const fittingData = FittingsData.abs_vacuum[fitting.type];
        if (fittingData && fittingData[fitting.diameter]) {
          equivalentLength = fittingData[fitting.diameter] * fitting.quantity;
        }
      }
      
      totalEquivalentLength += equivalentLength;
    });
    
    return totalEquivalentLength;
  };

  // Calculate equivalent length for a section's fittings
  const calculateSectionEquivalentLength = (section: PipelineSection): number => {
    if (section.fittings.length === 0) return 0;
    
    let totalEquivalentLength = 0;
    
    section.fittings.forEach(fitting => {
      let equivalentLength = 0;
      
      if (section.pipelineType === 'copper') {
        const fittingData = FittingsData.copper[fitting.type];
        if (fittingData && fittingData[fitting.diameter]) {
          equivalentLength = fittingData[fitting.diameter] * fitting.quantity;
        }
      } else {
        const fittingData = FittingsData.abs_vacuum[fitting.type];
        if (fittingData && fittingData[fitting.diameter]) {
          equivalentLength = fittingData[fitting.diameter] * fitting.quantity;
        }
      }
      
      totalEquivalentLength += equivalentLength;
    });
    
    return totalEquivalentLength;
  };

  // Add new pipeline section
  const addPipelineSection = () => {
    const newSection: PipelineSection = {
      id: (pipelineSections.length + 1).toString(),
      name: `Section ${pipelineSections.length + 1}`,
      diameter: 15,
      length: 50,
      flowRate: 400,
      pressure: 400,
      pipelineType: 'copper',
      fittings: []
    };
    setPipelineSections([...pipelineSections, newSection]);
  };

  // Remove pipeline section
  const removePipelineSection = (sectionId: string) => {
    setPipelineSections(pipelineSections.filter(section => section.id !== sectionId));
  };

  // Update pipeline section
  const updatePipelineSection = (sectionId: string, updates: Partial<PipelineSection>) => {
    setPipelineSections(sections => 
      sections.map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  };

  // Add fitting to a section
  const addSectionFitting = (sectionId: string) => {
    const section = pipelineSections.find(s => s.id === sectionId);
    if (!section) return;

    const newFitting: FittingInput = {
      type: getAvailableFittingTypes(section.pipelineType, section.diameter)[0] || 'Ball valve',
      diameter: section.diameter,
      quantity: 1
    };

    updatePipelineSection(sectionId, {
      fittings: [...section.fittings, newFitting]
    });
  };

  // Remove fitting from a section
  const removeSectionFitting = (sectionId: string, fittingIndex: number) => {
    const section = pipelineSections.find(s => s.id === sectionId);
    if (!section) return;

    updatePipelineSection(sectionId, {
      fittings: section.fittings.filter((_, i) => i !== fittingIndex)
    });
  };

  // Update fitting in a section
  const updateSectionFitting = (sectionId: string, fittingIndex: number, updates: Partial<FittingInput>) => {
    const section = pipelineSections.find(s => s.id === sectionId);
    if (!section) return;

    updatePipelineSection(sectionId, {
      fittings: section.fittings.map((fitting, i) => 
        i === fittingIndex ? { ...fitting, ...updates } : fitting
      )
    });
  };

  // Calculate pressure drop for a single section
  const calculateSectionPressureDrop = (section: PipelineSection): CalculationResult | null => {
    try {
      // Determine which table to use based on pressure
      let tableData;
      if (section.pressure <= 59) {
        // Vacuum system
        tableData = PressureLossTablesData.vacuum;
      } else if (section.pressure <= 400) {
        tableData = PressureLossTablesData.pressure_400kPa;
      } else if (section.pressure <= 700) {
        tableData = PressureLossTablesData.pressure_700kPa;
      } else {
        tableData = PressureLossTablesData.pressure_1100kPa;
      }

      // Get pressure drop data for the specific diameter
      const diameterData = tableData[section.diameter];
      if (!diameterData) {
        throw new Error(`No data available for ${section.diameter}mm diameter pipe`);
      }

      // Calculate equivalent length from fittings
      const equivalentLength = calculateSectionEquivalentLength(section);
      const totalLength = section.length + equivalentLength;

      // Interpolate to get pressure drop
      const interpolationResult = interpolateTable(
        diameterData,
        totalLength,
        section.flowRate
      );

      if (!interpolationResult) {
        throw new Error('Unable to interpolate pressure drop from available data');
      }

      const result: CalculationResult = {
        basePressureDrop: interpolationResult.pressureDrop / totalLength,
        totalLength: totalLength,
        totalPressureDrop: interpolationResult.pressureDrop,
        totalPressureDropWithSafety: interpolationResult.pressureDrop * globalSafetyFactor,
        safetyFactor: globalSafetyFactor,
        interpolationDetails: {
          ...interpolationResult.details,
          tableFlowUsed: interpolationResult.details.tableFlowUsed,
          tablePressureDropUsed: interpolationResult.details.tablePressureDropUsed,
          tableDistanceUsed: interpolationResult.details.tableDistanceUsed
        }
      };

      return result;

    } catch (error) {
      console.error(`Error calculating section ${section.name}:`, error);
      return null;
    }
  };

  // Calculate all sections and total system pressure drop
  const calculateAllSections = () => {
    setErrorMessage('');
    
    try {
      let totalSystemPressureDrop = 0;
      const updatedSections = pipelineSections.map(section => {
        const result = calculateSectionPressureDrop(section);
        if (result) {
          totalSystemPressureDrop += result.totalPressureDropWithSafety; // Use safety factor applied value
          return { ...section, calculationResult: result };
        } else {
          throw new Error(`Failed to calculate pressure drop for section: ${section.name}`);
        }
      });
      
      setPipelineSections(updatedSections);
      setSystemTotalPressureDrop(totalSystemPressureDrop);

    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'System calculation error occurred');
    }
  };

  // Main calculation function (single mode)
  const calculatePressureDrop = () => {
    setErrorMessage('');
    
    try {
      // Determine which table to use based on pressure
      let tableData;
      if (pipelineInput.pressure <= 59) {
        // Vacuum system
        tableData = PressureLossTablesData.vacuum;
      } else if (pipelineInput.pressure <= 400) {
        tableData = PressureLossTablesData.pressure_400kPa;
      } else if (pipelineInput.pressure <= 700) {
        tableData = PressureLossTablesData.pressure_700kPa;
      } else {
        tableData = PressureLossTablesData.pressure_1100kPa;
      }

      // Get pressure drop data for the specific diameter
      const diameterData = tableData[pipelineInput.diameter];
      if (!diameterData) {
        throw new Error(`No data available for ${pipelineInput.diameter}mm diameter pipe`);
      }

      // Calculate equivalent length from fittings
      const equivalentLength = calculateEquivalentLength();
      const totalLength = pipelineInput.length + equivalentLength;

      // Interpolate to get pressure drop
      const interpolationResult = interpolateTable(
        diameterData,
        totalLength,
        pipelineInput.flowRate
      );

      if (!interpolationResult) {
        throw new Error('Unable to interpolate pressure drop from available data');
      }

      const result: CalculationResult = {
        basePressureDrop: interpolationResult.pressureDrop / totalLength,
        totalLength: totalLength,
        totalPressureDrop: interpolationResult.pressureDrop,
        totalPressureDropWithSafety: interpolationResult.pressureDrop * globalSafetyFactor,
        safetyFactor: globalSafetyFactor,
        interpolationDetails: {
          ...interpolationResult.details,
          tableFlowUsed: interpolationResult.details.tableFlowUsed,
          tablePressureDropUsed: interpolationResult.details.tablePressureDropUsed,
          tableDistanceUsed: interpolationResult.details.tableDistanceUsed
        }
      };

      setCalculationResult(result);

    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Calculation error occurred');
      setCalculationResult(null);
    }
  };

  // Add new fitting
  const addFitting = () => {
    const newFitting: FittingInput = {
      type: getAvailableFittingTypes(pipelineInput.pipelineType, pipelineInput.diameter)[0] || 'Ball valve',
      diameter: pipelineInput.diameter,
      quantity: 1
    };
    setFittings([...fittings, newFitting]);
  };

  // Remove fitting
  const removeFitting = (index: number) => {
    setFittings(fittings.filter((_, i) => i !== index));
  };

  // Update fitting
  const updateFitting = (index: number, updates: Partial<FittingInput>) => {
    setFittings(fittings.map((fitting, i) => 
      i === index ? { ...fitting, ...updates } : fitting
    ));
  };

  // Calculate whenever inputs change
  useEffect(() => {
    if (calculationMode === 'single') {
      if (pipelineInput.diameter && pipelineInput.length && pipelineInput.flowRate && pipelineInput.pressure) {
        calculatePressureDrop();
      }
    } else {
      // Auto-calculate for multiple sections when any section parameters change
      calculateAllSections();
    }
  }, [calculationMode, pipelineInput, fittings, pipelineSections, globalSafetyFactor]);

  return (
    <CalculatorWrapper
      title="Medical Gas Pressure Drop Calculator"
      discipline="mechanical"
      calculatorType="medical-gas-pressure-drop"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      {/* Calculation Mode Selection */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="font-medium text-lg mb-3">Calculation Mode</h3>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="single"
              checked={calculationMode === 'single'}
              onChange={(e) => setCalculationMode(e.target.value as 'single' | 'multiple')}
              className="mr-2"
            />
            <span className="text-sm font-medium">Single Pipeline</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="multiple"
              checked={calculationMode === 'multiple'}
              onChange={(e) => setCalculationMode(e.target.value as 'single' | 'multiple')}
              className="mr-2"
            />
            <span className="text-sm font-medium">Multiple Pipeline Sections</span>
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {calculationMode === 'single' 
            ? 'Calculate pressure drop for a single pipeline with fittings'
            : 'Calculate total system pressure drop across multiple pipeline sections'}
        </p>
      </div>

      {/* Global Safety Factor */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="font-medium text-lg mb-3">Safety Factor</h3>
        <div className="flex items-center space-x-4">
          <label className="block text-sm font-medium text-gray-700">
            Global Safety Factor:
          </label>
          <input
            type="number"
            min="1.0"
            max="5.0"
            step="0.1"
            value={globalSafetyFactor}
            onChange={(e) => setGlobalSafetyFactor(Number(e.target.value))}
            className="w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-600">
            (Applied to all pressure drop calculations)
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Recommended values: 1.3 for standard applications, 1.5-2.0 for critical applications
        </p>
      </div>

      {calculationMode === 'single' ? (
        /* Single Pipeline Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4">Pipeline Parameters</h3>
          
          {/* Pipeline Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline Type
            </label>
            <select
              value={pipelineInput.pipelineType}
              onChange={(e) => {
                const newType = e.target.value as 'copper' | 'abs_vacuum';
                setPipelineInput({ 
                  ...pipelineInput, 
                  pipelineType: newType,
                  pressure: newType === 'abs_vacuum' ? vacuumPressure : 400
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="copper">Copper Pipe</option>
              <option value="abs_vacuum">ABS Vacuum System</option>
            </select>
          </div>

          {/* Pipe Diameter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outside Diameter (mm)
            </label>
            <select
              value={pipelineInput.diameter}
              onChange={(e) => setPipelineInput({ 
                ...pipelineInput, 
                diameter: Number(e.target.value)
              })}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {availableDiameters.map(diameter => (
                <option key={diameter} value={diameter}>{diameter} mm</option>
              ))}
            </select>
          </div>

          {/* Pipe Length */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Length (m)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={pipelineInput.length}
              onChange={(e) => setPipelineInput({ 
                ...pipelineInput, 
                length: Number(e.target.value)
              })}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Flow Rate */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Design Flow Rate (L/min)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={pipelineInput.flowRate}
              onChange={(e) => setPipelineInput({ 
                ...pipelineInput, 
                flowRate: Number(e.target.value)
              })}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* System Pressure */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Pressure (kPa)
            </label>
            {pipelineInput.pipelineType === 'abs_vacuum' ? (
              <div className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                <span className="text-gray-700">
                  {vacuumPressure} kPa ({(vacuumPressure * 7.5).toFixed(0)} mmHg) - Standard Medical Vacuum
                </span>
              </div>
            ) : (
              <select
                value={pipelineInput.pressure}
                onChange={(e) => setPipelineInput({ 
                  ...pipelineInput, 
                  pressure: Number(e.target.value)
                })}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {availablePressures.map(pressure => (
                  <option key={pressure} value={pressure}>
                    {pressure} kPa ({(pressure / 100).toFixed(1)} bar)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Fittings Section */}
          <div className="border-t border-gray-300 my-4"></div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-700">Fittings & Equivalent Lengths</h4>
              <button 
                onClick={addFitting}
                className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Fitting
              </button>
            </div>
            
            {fittings.length > 0 ? fittings.map((fitting, index) => (
              <div key={index} className="mb-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Fitting {index + 1}</span>
                  <button 
                    onClick={() => removeFitting(index)} 
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={fitting.type}
                      onChange={(e) => updateFitting(index, { type: e.target.value })}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getAvailableFittingTypes(pipelineInput.pipelineType, fitting.diameter).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Diameter (mm)</label>
                    <select
                      value={fitting.diameter}
                      onChange={(e) => updateFitting(index, { diameter: Number(e.target.value) })}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableDiameters.filter(d => {
                        if (pipelineInput.pipelineType === 'abs_vacuum') {
                          return [40, 50, 70, 100, 125].includes(d);
                        }
                        return true;
                      }).map(diameter => (
                        <option key={diameter} value={diameter}>{diameter}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={fitting.quantity}
                      onChange={(e) => updateFitting(index, { quantity: Number(e.target.value) })}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-600">
                  Equivalent Length: {(() => {
                    const fittingData = pipelineInput.pipelineType === 'copper' 
                      ? FittingsData.copper[fitting.type]
                      : FittingsData.abs_vacuum[fitting.type];
                    const equivalentLength = fittingData && fittingData[fitting.diameter] 
                      ? (fittingData[fitting.diameter] * fitting.quantity).toFixed(2)
                      : 'N/A';
                    return equivalentLength;
                  })()} m
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-500 italic p-3">
                No fittings added. Click "Add Fitting" to include equivalent lengths.
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {errorMessage && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
              <p className="text-sm font-medium">Error: {errorMessage}</p>
            </div>
          )}
          
          {calculationResult && (
            <>
              {/* Summary Results */}
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calculated Pressure Drop:</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {calculationResult.totalPressureDrop.toFixed(3)} kPa
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">With Safety Factor ({calculationResult.safetyFactor}x):</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {calculationResult.totalPressureDropWithSafety.toFixed(3)} kPa
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pressure Drop per Meter:</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {calculationResult.basePressureDrop.toFixed(4)} kPa/m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Length (inc. fittings):</p>
                    <p className="font-semibold text-gray-800">{calculationResult.totalLength.toFixed(1)} m</p>
                  </div>
                </div>
              </div>

              {/* Calculation Details */}
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">Calculation Method</h4>
                <div className="text-sm space-y-2">
                  <p>
                    <strong>Formula:</strong> Δp = (Measured length / Nearest length) × (Design flow / Nearest flow)² × Pressure drop from table
                  </p>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p><strong>Table Values Used:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Distance from table: {calculationResult.interpolationDetails.tableDistanceUsed}m</li>
                      <li>Flow rate from table: {calculationResult.interpolationDetails.tableFlowUsed} L/min</li>
                      <li>Pressure drop from table: {calculationResult.interpolationDetails.tablePressureDropUsed.toFixed(3)} kPa</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p><strong>Interpolation Details:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Distance range: {calculationResult.interpolationDetails.lowerDistance}m - {calculationResult.interpolationDetails.upperDistance}m</li>
                      <li>Flow rate range: {calculationResult.interpolationDetails.lowerFlow} - {calculationResult.interpolationDetails.upperFlow} L/min</li>
                      <li>Pressure drop range: {calculationResult.interpolationDetails.lowerPressureDrop.toFixed(3)} - {calculationResult.interpolationDetails.upperPressureDrop.toFixed(3)} kPa</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Equivalent Lengths Breakdown */}
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">Equivalent Lengths Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Component</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2 text-right">Unit Length (m)</th>
                        <th className="px-3 py-2 text-right">Total Length (m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 border-t font-medium">Straight Pipe</td>
                        <td className="px-3 py-2 border-t text-right">1</td>
                        <td className="px-3 py-2 border-t text-right">{pipelineInput.length.toFixed(1)}</td>
                        <td className="px-3 py-2 border-t text-right">{pipelineInput.length.toFixed(1)}</td>
                      </tr>
                      {fittings.length > 0 ? fittings.map((fitting, index) => {
                        const fittingData = pipelineInput.pipelineType === 'copper' 
                          ? FittingsData.copper[fitting.type]
                          : FittingsData.abs_vacuum[fitting.type];
                        const unitLength = fittingData && fittingData[fitting.diameter] 
                          ? fittingData[fitting.diameter]
                          : 0;
                        const totalLength = unitLength * fitting.quantity;
                        
                        return (
                          <tr key={index}>
                            <td className="px-3 py-2 border-t">{fitting.type} ({fitting.diameter}mm)</td>
                            <td className="px-3 py-2 border-t text-right">{fitting.quantity}</td>
                            <td className="px-3 py-2 border-t text-right">{unitLength.toFixed(2)}</td>
                            <td className="px-3 py-2 border-t text-right">{totalLength.toFixed(2)}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td className="px-3 py-2 border-t text-gray-500 italic" colSpan={4}>No fittings added</td>
                        </tr>
                      )}
                      <tr className="font-medium bg-gray-50">
                        <td className="px-3 py-2 border-t">Total Equivalent Length</td>
                        <td className="px-3 py-2 border-t text-right">-</td>
                        <td className="px-3 py-2 border-t text-right">-</td>
                        <td className="px-3 py-2 border-t text-right">{calculationResult.totalLength.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Design Considerations */}
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-300">
                <h4 className="font-medium text-yellow-800 mb-2">Design Considerations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700">
                  <li>Add 25-30% to total measured length for conservative design</li>
                  <li>Use only 60-75% of allocated pressure drop when sizing</li>
                  <li>Consider pressure losses through other system components</li>
                  <li>Verify compliance with relevant medical gas standards (ISO 7396, HTM 02-01)</li>
                  <li>Account for diversity factors in multi-outlet systems</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
      ) : (
        /* Multiple Pipeline Sections Mode */
        <div className="space-y-6">
          {/* Pipeline Sections Management */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">Pipeline Sections</h3>
              <button 
                onClick={addPipelineSection}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Section
              </button>
            </div>
            
            {/* System Total */}
            <div className="bg-blue-50 p-3 rounded-md mb-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-800">Total System Pressure Drop (with safety factor {globalSafetyFactor}x):</span>
                <span className="text-xl font-bold text-blue-600">
                  {systemTotalPressureDrop.toFixed(3)} kPa
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Sum of all pipeline section pressure drops including safety factor
              </p>
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
                <p className="text-sm font-medium">Error: {errorMessage}</p>
              </div>
            )}

            {/* Pipeline Sections */}
            {pipelineSections.map((section, sectionIndex) => (
              <div key={section.id} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => updatePipelineSection(section.id, { name: e.target.value })}
                      className="font-medium text-lg bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                    />
                    {section.calculationResult && (
                      <span className="text-sm font-medium text-green-600">
                        ΔP: {section.calculationResult.totalPressureDropWithSafety.toFixed(3)} kPa
                      </span>
                    )}
                  </div>
                  {pipelineSections.length > 1 && (
                    <button 
                      onClick={() => removePipelineSection(section.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove Section
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                  {/* Pipeline Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={section.pipelineType}
                      onChange={(e) => {
                        const newType = e.target.value as 'copper' | 'abs_vacuum';
                        updatePipelineSection(section.id, { 
                          pipelineType: newType,
                          pressure: newType === 'abs_vacuum' ? vacuumPressure : 400
                        });
                      }}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="copper">Copper</option>
                      <option value="abs_vacuum">ABS Vacuum</option>
                    </select>
                  </div>

                  {/* Diameter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Diameter (mm)</label>
                    <select
                      value={section.diameter}
                      onChange={(e) => updatePipelineSection(section.id, { diameter: Number(e.target.value) })}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableDiameters.map(diameter => (
                        <option key={diameter} value={diameter}>{diameter}</option>
                      ))}
                    </select>
                  </div>

                  {/* Length */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Length (m)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={section.length}
                      onChange={(e) => updatePipelineSection(section.id, { length: Number(e.target.value) })}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Flow Rate */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Flow (L/min)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={section.flowRate}
                      onChange={(e) => updatePipelineSection(section.id, { flowRate: Number(e.target.value) })}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Pressure */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pressure (kPa)</label>
                    {section.pipelineType === 'abs_vacuum' ? (
                      <div className="p-1 text-xs bg-gray-100 border border-gray-300 rounded-md">
                        {vacuumPressure} kPa
                      </div>
                    ) : (
                      <select
                        value={section.pressure}
                        onChange={(e) => updatePipelineSection(section.id, { pressure: Number(e.target.value) })}
                        className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {availablePressures.map(pressure => (
                          <option key={pressure} value={pressure}>{pressure}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Add Fitting Button */}
                  <div className="flex items-end">
                    <button 
                      onClick={() => addSectionFitting(section.id)}
                      className="w-full bg-green-600 text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Add Fitting
                    </button>
                  </div>
                </div>

                {/* Fittings for this section */}
                {section.fittings.length > 0 && (
                  <div className="mt-3 border-t border-gray-300 pt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Fittings:</h5>
                    <div className="space-y-2">
                      {section.fittings.map((fitting, fittingIndex) => (
                        <div key={fittingIndex} className="bg-white p-2 rounded border border-gray-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-gray-600">Fitting {fittingIndex + 1}</span>
                            <button 
                              onClick={() => removeSectionFitting(section.id, fittingIndex)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <select
                                value={fitting.type}
                                onChange={(e) => updateSectionFitting(section.id, fittingIndex, { type: e.target.value })}
                                className="w-full p-1 text-xs border border-gray-300 rounded-md"
                              >
                                {getAvailableFittingTypes(section.pipelineType, fitting.diameter).map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <select
                                value={fitting.diameter}
                                onChange={(e) => updateSectionFitting(section.id, fittingIndex, { diameter: Number(e.target.value) })}
                                className="w-full p-1 text-xs border border-gray-300 rounded-md"
                              >
                                {availableDiameters.filter(d => {
                                  if (section.pipelineType === 'abs_vacuum') {
                                    return [40, 50, 70, 100, 125].includes(d);
                                  }
                                  return true;
                                }).map(diameter => (
                                  <option key={diameter} value={diameter}>{diameter}mm</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <input
                                type="number"
                                min="1"
                                value={fitting.quantity}
                                onChange={(e) => updateSectionFitting(section.id, fittingIndex, { quantity: Number(e.target.value) })}
                                className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            Equiv. Length: {(() => {
                              const fittingData = section.pipelineType === 'copper' 
                                ? FittingsData.copper[fitting.type]
                                : FittingsData.abs_vacuum[fitting.type];
                              const equivalentLength = fittingData && fittingData[fitting.diameter] 
                                ? (fittingData[fitting.diameter] * fitting.quantity).toFixed(2)
                                : 'N/A';
                              return equivalentLength;
                            })()} m
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section Results */}
                {section.calculationResult && (
                  <div className="mt-3 border-t border-gray-300 pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Total Length:</span>
                        <div className="font-medium">{section.calculationResult.totalLength.toFixed(1)} m</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Calculated ΔP:</span>
                        <div className="font-medium text-gray-700">{section.calculationResult.totalPressureDrop.toFixed(3)} kPa</div>
                      </div>
                      <div>
                        <span className="text-gray-600">With Safety Factor:</span>
                        <div className="font-medium text-blue-600">{section.calculationResult.totalPressureDropWithSafety.toFixed(3)} kPa</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Per Meter:</span>
                        <div className="font-medium">{section.calculationResult.basePressureDrop.toFixed(4)} kPa/m</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Equiv. Length:</span>
                        <div className="font-medium">{calculateSectionEquivalentLength(section).toFixed(1)} m</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* System Summary */}
            {pipelineSections.some(s => s.calculationResult) && (
              <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">System Summary</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Section</th>
                        <th className="px-3 py-2 text-right">Length (m)</th>
                        <th className="px-3 py-2 text-right">Flow (L/min)</th>
                        <th className="px-3 py-2 text-right">Calculated ΔP (kPa)</th>
                        <th className="px-3 py-2 text-right">With Safety Factor (kPa)</th>
                        <th className="px-3 py-2 text-right">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelineSections.map(section => (
                        section.calculationResult && (
                          <tr key={section.id}>
                            <td className="px-3 py-2 border-t font-medium">{section.name}</td>
                            <td className="px-3 py-2 border-t text-right">{section.calculationResult.totalLength.toFixed(1)}</td>
                            <td className="px-3 py-2 border-t text-right">{section.flowRate}</td>
                            <td className="px-3 py-2 border-t text-right text-gray-700">{section.calculationResult.totalPressureDrop.toFixed(3)}</td>
                            <td className="px-3 py-2 border-t text-right text-blue-600">{section.calculationResult.totalPressureDropWithSafety.toFixed(3)}</td>
                            <td className="px-3 py-2 border-t text-right">
                              {systemTotalPressureDrop > 0 ? ((section.calculationResult.totalPressureDropWithSafety / systemTotalPressureDrop) * 100).toFixed(1) : '0'}%
                            </td>
                          </tr>
                        )
                      ))}
                      <tr className="font-medium bg-gray-50">
                        <td className="px-3 py-2 border-t">Total System</td>
                        <td className="px-3 py-2 border-t text-right">
                          {pipelineSections.reduce((sum, s) => sum + (s.calculationResult?.totalLength || 0), 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-2 border-t text-right">-</td>
                        <td className="px-3 py-2 border-t text-right text-gray-700">
                          {pipelineSections.reduce((sum, s) => sum + (s.calculationResult?.totalPressureDrop || 0), 0).toFixed(3)}
                        </td>
                        <td className="px-3 py-2 border-t text-right text-blue-600">{systemTotalPressureDrop.toFixed(3)}</td>
                        <td className="px-3 py-2 border-t text-right">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </CalculatorWrapper>
  );
};

export default MedicalGasPressureDropCalculator;