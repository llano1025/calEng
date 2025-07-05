import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface HeatLoadRackCalculatorProps {
  onBack?: () => void;
  onShowTutorial?: () => void;
}

// Define constants for magic numbers
const BTU_PER_WATT = 3.412;
const BTU_PER_TON = 12000;
const CFM_PER_KW_RULE_OF_THUMB = 160;

// Define interface for equipment items (removed unused efficiency field)
interface EquipmentItem {
  id: string;
  name: string;
  powerDraw: number; // Watts
  quantity: number;
  utilizationFactor: number; // Utilization factor (0.6-1.0)
  rackLocation: number; // Which rack (1, 2, 3, etc.)
  totalPower: number;
  heatGeneration: number; // BTU/hr
}

// Define interface for rack totals (better type safety)
interface RackTotalItem {
  rack: number;
  powerConsumption: number;
  heatGeneration: number;
  equipmentCount: number;
}

// System totals interface
interface SystemTotals {
  totalPowerConsumption: number;
  totalHeatGeneration: number;
  coolingRequirement: number;
  coolingPowerConsumption: number;
  totalSystemPower: number;
  estimatedUPSCapacity: number;
  powerDensityPerRack: number;
  coolingAirflowRequired: number;
}

const HeatLoadRackCalculator: React.FC<HeatLoadRackCalculatorProps> = ({ onBack, onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Heat Load Rack Calculator',
    discipline: 'elv',
    calculatorType: 'heat-load-rack'
  });
  // State for system parameters (removed unused temperature states)
  const [numberOfRacks, setNumberOfRacks] = useState<number>(3);
  const [safetyFactor, setSafetyFactor] = useState<number>(1.2); // 20% safety factor
  const [powerEfficiencyFactor, setPowerEfficiencyFactor] = useState<number>(0.85); // 85% efficiency
  const [coolingEfficiency, setCoolingEfficiency] = useState<number>(3.5); // COP (Coefficient of Performance)
  
  // State for equipment list
  const [equipment, setEquipment] = useState<EquipmentItem[]>([
    {
      id: '1',
      name: 'Network Switch',
      powerDraw: 150,
      quantity: 2,
      utilizationFactor: 0.8,
      rackLocation: 1,
      totalPower: 240,
      heatGeneration: 818.4
    }
  ]);
  
  // State for calculation results with proper typing
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [rackTotals, setRackTotals] = useState<RackTotalItem[]>([]);
  const [systemTotals, setSystemTotals] = useState<SystemTotals>({
    totalPowerConsumption: 0,
    totalHeatGeneration: 0,
    coolingRequirement: 0,
    coolingPowerConsumption: 0,
    totalSystemPower: 0,
    estimatedUPSCapacity: 0,
    powerDensityPerRack: 0,
    coolingAirflowRequired: 0
  });
  
  // State for editing equipment
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  
  // State for validation errors
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Handle numberOfRacks change - adjust equipment rack locations if needed
  useEffect(() => {
    setEquipment(prevEquipment =>
      prevEquipment.map(item => {
        if (item.rackLocation > numberOfRacks) {
          return { ...item, rackLocation: Math.max(1, numberOfRacks) };
        }
        return item;
      })
    );
  }, [numberOfRacks]);

  // Helper function to generate unique IDs
  const generateUniqueId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Helper function to calculate derived equipment values
  const calculateEquipmentValues = (item: Omit<EquipmentItem, 'totalPower' | 'heatGeneration'>): EquipmentItem => {
    const totalPower = item.powerDraw * item.quantity * item.utilizationFactor;
    const heatGeneration = totalPower * BTU_PER_WATT;
    
    return {
      ...item,
      totalPower,
      heatGeneration
    };
  };

  // Input validation function
  const validateInputs = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (numberOfRacks < 1 || numberOfRacks > 50) {
      errors.numberOfRacks = 'Number of racks must be between 1 and 50';
    }
    
    if (safetyFactor < 1 || safetyFactor > 3) {
      errors.safetyFactor = 'Safety factor must be between 1.0 and 3.0';
    }
    
    if (powerEfficiencyFactor < 0.5 || powerEfficiencyFactor > 1) {
      errors.powerEfficiencyFactor = 'Power efficiency must be between 0.5 and 1.0';
    }
    
    if (coolingEfficiency < 1 || coolingEfficiency > 10) {
      errors.coolingEfficiency = 'Cooling efficiency (COP) must be between 1.0 and 10.0';
    }
    
    // Validate equipment
    equipment.forEach((item, index) => {
      if (!item.name.trim()) {
        errors[`equipment_${index}_name`] = `Equipment ${index + 1} name is required`;
      }
      
      if (item.powerDraw < 1 || item.powerDraw > 10000) {
        errors[`equipment_${index}_power`] = `Equipment ${index + 1} power must be between 1 and 10,000 watts`;
      }
      
      if (item.quantity < 1 || item.quantity > 100) {
        errors[`equipment_${index}_quantity`] = `Equipment ${index + 1} quantity must be between 1 and 100`;
      }
      
      if (item.utilizationFactor < 0.1 || item.utilizationFactor > 1) {
        errors[`equipment_${index}_utilization`] = `Equipment ${index + 1} utilization must be between 0.1 and 1.0`;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to add new equipment with useCallback for performance
  const addEquipment = useCallback(() => {
    const newEquipmentBase = {
      id: generateUniqueId(),
      name: '',
      powerDraw: 100,
      quantity: 1,
      utilizationFactor: 0.8,
      rackLocation: 1,
    };
    
    const newEquipment = calculateEquipmentValues(newEquipmentBase);
    setEquipment(prev => [...prev, newEquipment]);
  }, []);

  // Function to remove equipment with useCallback
  const removeEquipment = useCallback((id: string) => {
    if (equipment.length > 1) {
      setEquipment(prev => prev.filter(item => item.id !== id));
    }
  }, [equipment.length]);

  // Function to update equipment property with useCallback
  const updateEquipment = useCallback((id: string, field: keyof EquipmentItem, value: any) => {
    setEquipment(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItemBase = { ...item, [field]: value };
        
        // Recalculate derived values if relevant fields changed
        if (['powerDraw', 'quantity', 'utilizationFactor'].includes(field)) {
          return calculateEquipmentValues(updatedItemBase);
        }
        
        return updatedItemBase;
      }
      return item;
    }));
  }, []);

  // Function to perform the heat load calculation with useCallback
  const performCalculation = useCallback(() => {
    if (!validateInputs()) {
      return;
    }
    
    // Calculate totals for each rack
    const rackData: RackTotalItem[] = [];
    for (let i = 1; i <= numberOfRacks; i++) {
      const equipmentInRack = equipment.filter(item => item.rackLocation === i);
      
      const rackPowerConsumption = equipmentInRack.reduce((sum, item) => sum + item.totalPower, 0);
      const rackHeatGeneration = equipmentInRack.reduce((sum, item) => sum + item.heatGeneration, 0);
      
      rackData.push({
        rack: i,
        powerConsumption: rackPowerConsumption,
        heatGeneration: rackHeatGeneration,
        equipmentCount: equipmentInRack.length
      });
    }
    setRackTotals(rackData);
    
    // Calculate system totals
    const totalPowerConsumption = equipment.reduce((sum, item) => sum + item.totalPower, 0);
    const totalHeatGeneration = equipment.reduce((sum, item) => sum + item.heatGeneration, 0);
    
    // Apply safety factor to heat generation for cooling requirement
    const coolingRequirement = (totalHeatGeneration * safetyFactor) / BTU_PER_TON;
    
    // Calculate cooling power consumption using named constants for clarity
    const coolingPowerConsumption = (coolingRequirement * BTU_PER_TON) / (coolingEfficiency * BTU_PER_WATT);
    
    // Calculate total system power (IT equipment + cooling)
    const totalSystemPowerConsumption = totalPowerConsumption + coolingPowerConsumption;
    
    // Estimate UPS capacity (with power efficiency factor)
    const estimatedUPSCapacity = totalSystemPowerConsumption / powerEfficiencyFactor;
    
    // Calculate power density per rack
    const powerDensityPerRack = totalPowerConsumption / numberOfRacks;
    
    // Calculate cooling airflow required using named constant
    const coolingAirflowRequired = (totalPowerConsumption / 1000) * CFM_PER_KW_RULE_OF_THUMB;
    
    setSystemTotals({
      totalPowerConsumption,
      totalHeatGeneration,
      coolingRequirement,
      coolingPowerConsumption,
      totalSystemPower: totalSystemPowerConsumption,
      estimatedUPSCapacity,
      powerDensityPerRack,
      coolingAirflowRequired
    });
    
    setCalculationPerformed(true);
    
    // Save calculation and prepare export data
    const inputs = {
      numberOfRacks,
      safetyFactor,
      powerEfficiencyFactor,
      coolingEfficiency,
      equipment: equipment.map(item => ({
        name: item.name,
        powerDraw: item.powerDraw,
        quantity: item.quantity,
        utilizationFactor: item.utilizationFactor,
        rackLocation: item.rackLocation
      }))
    };
    
    const results = {
      totalPowerConsumption,
      totalHeatGeneration,
      coolingRequirement,
      coolingPowerConsumption,
      totalSystemPower: totalSystemPowerConsumption,
      estimatedUPSCapacity,
      powerDensityPerRack,
      coolingAirflowRequired,
      rackTotals: rackData
    };
    
    saveCalculation(inputs, results);
    prepareExportData(inputs, results);
  }, [numberOfRacks, safetyFactor, powerEfficiencyFactor, coolingEfficiency, equipment, saveCalculation, prepareExportData]);

  // Reset calculation with useCallback
  const resetCalculation = useCallback(() => {
    setCalculationPerformed(false);
    setValidationErrors({});
  }, []);

  // Convert watts to various units
  const convertPower = (watts: number, unit: 'kw' | 'btu' | 'tons'): number => {
    switch (unit) {
      case 'kw': return watts / 1000;
      case 'btu': return watts * BTU_PER_WATT;
      case 'tons': return (watts * BTU_PER_WATT) / BTU_PER_TON;
      default: return watts;
    }
  };

  // Helper function to render validation error
  const renderValidationError = (fieldKey: string): JSX.Element | null => {
    if (validationErrors[fieldKey]) {
      return <p className="text-xs text-red-500 mt-1">{validationErrors[fieldKey]}</p>;
    }
    return null;
  };

  return (
    <CalculatorWrapper
      title="Heat Load Rack Calculator"
      discipline="elv"
      calculatorType="heat-load-rack"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">System Parameters</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Racks
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={numberOfRacks}
                onChange={(e) => setNumberOfRacks(Number(e.target.value))}
                className={`w-full p-2 border rounded-md ${validationErrors.numberOfRacks ? 'border-red-500' : 'border-gray-300'}`}
              />
              {renderValidationError('numberOfRacks')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Safety Factor
              </label>
              <input
                type="number"
                min="1"
                max="3"
                step="0.1"
                value={safetyFactor}
                onChange={(e) => setSafetyFactor(Number(e.target.value))}
                className={`w-full p-2 border rounded-md ${validationErrors.safetyFactor ? 'border-red-500' : 'border-gray-300'}`}
              />
              <p className="text-xs text-gray-500 mt-1">Typically 1.2 for 20% safety margin</p>
              {renderValidationError('safetyFactor')}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Power Efficiency Factor
              </label>
              <input
                type="number"
                min="0.5"
                max="1"
                step="0.01"
                value={powerEfficiencyFactor}
                onChange={(e) => setPowerEfficiencyFactor(Number(e.target.value))}
                className={`w-full p-2 border rounded-md ${validationErrors.powerEfficiencyFactor ? 'border-red-500' : 'border-gray-300'}`}
              />
              <p className="text-xs text-gray-500 mt-1">UPS and PDU efficiency (0.85-0.95)</p>
              {renderValidationError('powerEfficiencyFactor')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooling Efficiency (COP)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={coolingEfficiency}
                onChange={(e) => setCoolingEfficiency(Number(e.target.value))}
                className={`w-full p-2 border rounded-md ${validationErrors.coolingEfficiency ? 'border-red-500' : 'border-gray-300'}`}
              />
              <p className="text-xs text-gray-500 mt-1">Coefficient of Performance (2.5-4.0)</p>
              {renderValidationError('coolingEfficiency')}
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-4"></div>
          
          {/* Equipment Configuration Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">Equipment Configuration</h3>
              <button
                onClick={addEquipment}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Equipment
              </button>
            </div>
            
            {equipment.map((item, index) => (
              <div key={item.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{item.name || "Unnamed Equipment"}</h4>
                  {equipment.length > 1 && (
                    <button 
                      onClick={() => removeEquipment(item.id)} 
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {editingEquipmentId === item.id ? (
                  <div className="pl-3 border-l-4 border-blue-400">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateEquipment(item.id, 'name', e.target.value)}
                        className={`w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${validationErrors[`equipment_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Equipment name"
                      />
                      {renderValidationError(`equipment_${index}_name`)}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Power Draw (Watts)</label>
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={item.powerDraw}
                          onChange={(e) => updateEquipment(item.id, 'powerDraw', Number(e.target.value))}
                          className={`w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${validationErrors[`equipment_${index}_power`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {renderValidationError(`equipment_${index}_power`)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={item.quantity}
                          onChange={(e) => updateEquipment(item.id, 'quantity', Number(e.target.value))}
                          className={`w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${validationErrors[`equipment_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {renderValidationError(`equipment_${index}_quantity`)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Utilization Factor</label>
                        <input
                          type="number"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={item.utilizationFactor}
                          onChange={(e) => updateEquipment(item.id, 'utilizationFactor', Number(e.target.value))}
                          className={`w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${validationErrors[`equipment_${index}_utilization`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        <p className="text-xs text-gray-500 mt-1">0.6-1.0 typical range</p>
                        {renderValidationError(`equipment_${index}_utilization`)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rack Location</label>
                        <select
                          value={item.rackLocation}
                          onChange={(e) => updateEquipment(item.id, 'rackLocation', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Array.from({ length: numberOfRacks }, (_, i) => i + 1).map(rack => (
                            <option key={rack} value={rack}>Rack {rack}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3">
                      <button 
                        onClick={() => setEditingEquipmentId(null)} 
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mb-3 text-sm">
                      <div>
                        <p className="text-gray-600">Power Draw:</p>
                        <p className="font-semibold text-gray-800">{item.powerDraw}W</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Quantity:</p>
                        <p className="font-semibold text-gray-800">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Utilization:</p>
                        <p className="font-semibold text-gray-800">{(item.utilizationFactor * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rack:</p>
                        <p className="font-semibold text-gray-800">{item.rackLocation}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-2 mb-3 text-sm">
                      <div>
                        <p className="text-gray-600">Total Power:</p>
                        <p className="font-semibold text-gray-800">{item.totalPower.toFixed(1)}W</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Heat Generation:</p>
                        <p className="font-semibold text-gray-800">{item.heatGeneration.toFixed(1)} BTU/hr</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setEditingEquipmentId(item.id)} 
                        className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"
                      >
                        <Icons.Edit />
                        <span className="ml-1">Edit</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              onClick={performCalculation}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Calculate
            </button>
            {calculationPerformed && (
              <button
                onClick={resetCalculation}
                className="ml-2 bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {!calculationPerformed ? (
            <div className="text-center py-8 text-gray-500">
              <p>Configure your equipment and system parameters, then click Calculate</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">System Summary</h4>
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total IT Power:</p>
                      <p className="font-bold text-lg text-blue-600">{systemTotals.totalPowerConsumption.toFixed(1)} W</p>
                      <p className="text-sm text-gray-500">({convertPower(systemTotals.totalPowerConsumption, 'kw').toFixed(2)} kW)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Heat Generation:</p>
                      <p className="font-bold text-lg text-orange-600">{systemTotals.totalHeatGeneration.toFixed(1)} BTU/hr</p>
                      <p className="text-sm text-gray-500">({convertPower(systemTotals.totalHeatGeneration / BTU_PER_WATT, 'tons').toFixed(2)} tons)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cooling Requirement:</p>
                      <p className="font-bold text-lg text-green-600">{systemTotals.coolingRequirement.toFixed(2)} tons</p>
                      <p className="text-sm text-gray-500">({(systemTotals.coolingRequirement * BTU_PER_TON).toFixed(0)} BTU/hr)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cooling Power:</p>
                      <p className="font-bold text-lg text-purple-600">{systemTotals.coolingPowerConsumption.toFixed(1)} W</p>
                      <p className="text-sm text-gray-500">({convertPower(systemTotals.coolingPowerConsumption, 'kw').toFixed(2)} kW)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Power & Infrastructure Requirements</h4>
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total System Power:</p>
                      <p className="font-bold text-lg text-gray-800">{systemTotals.totalSystemPower.toFixed(1)} W</p>
                      <p className="text-sm text-gray-500">({convertPower(systemTotals.totalSystemPower, 'kw').toFixed(2)} kW)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Est. UPS Capacity:</p>
                      <p className="font-bold text-lg text-red-600">{systemTotals.estimatedUPSCapacity.toFixed(1)} W</p>
                      <p className="text-sm text-gray-500">({convertPower(systemTotals.estimatedUPSCapacity, 'kw').toFixed(2)} kW)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Power Density/Rack:</p>
                      <p className="font-bold text-lg text-gray-800">{systemTotals.powerDensityPerRack.toFixed(1)} W</p>
                      <p className="text-sm text-gray-500">({convertPower(systemTotals.powerDensityPerRack, 'kw').toFixed(2)} kW/rack)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Airflow Required:</p>
                      <p className="font-bold text-lg text-blue-600">{systemTotals.coolingAirflowRequired.toFixed(0)} CFM</p>
                      <p className="text-sm text-gray-500">({(systemTotals.coolingAirflowRequired * 1.699).toFixed(0)} m³/h)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Rack-by-Rack Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Rack</th>
                        <th className="px-3 py-2 text-right">Equipment Count</th>
                        <th className="px-3 py-2 text-right">Power (W)</th>
                        <th className="px-3 py-2 text-right">Power (kW)</th>
                        <th className="px-3 py-2 text-right">Heat (BTU/hr)</th>
                        <th className="px-3 py-2 text-right">Cooling (tons)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rackTotals.map((rack) => (
                        <tr key={rack.rack} className="border-t border-gray-200">
                          <td className="px-3 py-2">Rack {rack.rack}</td>
                          <td className="px-3 py-2 text-right">{rack.equipmentCount}</td>
                          <td className="px-3 py-2 text-right">{rack.powerConsumption.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right">{convertPower(rack.powerConsumption, 'kw').toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{rack.heatGeneration.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right">{convertPower(rack.heatGeneration / BTU_PER_WATT, 'tons').toFixed(3)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                        <td className="px-3 py-2">Totals</td>
                        <td className="px-3 py-2 text-right">
                          {rackTotals.reduce((sum, rack) => sum + rack.equipmentCount, 0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {rackTotals.reduce((sum, rack) => sum + rack.powerConsumption, 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {convertPower(rackTotals.reduce((sum, rack) => sum + rack.powerConsumption, 0), 'kw').toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {rackTotals.reduce((sum, rack) => sum + rack.heatGeneration, 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {convertPower(rackTotals.reduce((sum, rack) => sum + rack.heatGeneration, 0) / BTU_PER_WATT, 'tons').toFixed(3)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Equipment Details</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Equipment</th>
                        <th className="px-3 py-2 text-right">Rack</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Power/Unit (W)</th>
                        <th className="px-3 py-2 text-right">Utilization</th>
                        <th className="px-3 py-2 text-right">Total Power (W)</th>
                        <th className="px-3 py-2 text-right">Heat (BTU/hr)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((item) => (
                        <tr key={item.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">{item.name || 'Unnamed'}</td>
                          <td className="px-3 py-2 text-right">{item.rackLocation}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{item.powerDraw}</td>
                          <td className="px-3 py-2 text-right">{(item.utilizationFactor * 100).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right font-medium">{item.totalPower.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right">{item.heatGeneration.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
                <h4 className="font-medium text-yellow-800 mb-2">Design Recommendations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                  <li>Consider rack power density: &gt;5kW/rack requires enhanced cooling</li>
                  <li>Plan for hot aisle/cold aisle containment for densities &gt;3kW/rack</li>
                  <li>Ensure adequate power distribution: recommended N+1 redundancy</li>
                  <li>Size UPS for runtime requirements (typical: 5-15 minutes at full load)</li>
                  <li>Plan cooling infrastructure with N+1 redundancy for critical applications</li>
                  <li>Consider precision air conditioning units for server room environments</li>
                </ul>
              </div>
            </>
          )}
          
          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Calculation Notes</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Heat Generation:</strong> Calculated as electrical power × {BTU_PER_WATT} BTU/hr per Watt</li>
              <li><strong>Cooling Requirement:</strong> Heat generation with safety factor ÷ {BTU_PER_TON.toLocaleString()} BTU/hr per ton</li>
              <li><strong>Utilization Factor:</strong> Accounts for typical equipment load (60-100% of nameplate)</li>
              <li><strong>Power Efficiency:</strong> Includes UPS, PDU, and distribution losses</li>
              <li><strong>COP (Coefficient of Performance):</strong> Cooling system efficiency ratio</li>
              <li><strong>Airflow Rule:</strong> Approximately {CFM_PER_KW_RULE_OF_THUMB} CFM per kW of IT equipment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default HeatLoadRackCalculator;