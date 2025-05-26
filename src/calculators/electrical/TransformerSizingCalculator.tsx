import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface TransformerSizingCalculatorProps {
  onShowTutorial?: () => void;
}

// Define standard transformer ratings
const STANDARD_TRANSFORMER_SIZES = [1000, 1500, 2000]; // kVA

// Define transformer type
type TransformerType = 'dry' | 'oil';
type InstallationType = 'indoor' | 'outdoor';

// Define transformer interface
interface Transformer {
  id: string;
  name: string;
  rating: number; // kVA (from standard sizes)
  primaryVoltage: number;   // V
  secondaryVoltage: number; // V
  frequency: number;        // Hz
  connectionType: string;   // e.g., 'delta-wye', 'wye-wye', etc.
  impedance: number;        // %
  temperature: number;      // °C ambient temperature
  altitude: number;         // meters above sea level
  type: TransformerType;    // 'dry' or 'oil'
  installation: InstallationType; // 'indoor' or 'outdoor'
  kFactor: number;          // For harmonic considerations
  efficiency: number;       // %
  assignedLoads: string[];  // Array of load IDs assigned to this transformer
}

// Define load type
type LoadType = 'continuous' | 'intermittent' | 'cyclic';

// Define load interface
interface Load {
  id: string;
  name: string;
  power: number;         // kW
  powerFactor: number;   // 0-1
  quantity: number;
  loadFactor: number;    // 0-1
  demandFactor: number;  // 0-1
  harmonicContent: number; // Total Harmonic Distortion (THD) in %
  phaseType: 'single' | 'three'; // Single-phase or three-phase
  startingMethod: string; // For motor loads
  voltageRating: number;  // V
  assignedTo: string[];  // Array of transformer IDs this load is assigned to (max 2)
}

// Connection type options
const CONNECTION_TYPES = [
  { id: 'delta-wye', name: 'Delta-Wye (Δ-Y)' },
  { id: 'delta-delta', name: 'Delta-Delta (Δ-Δ)' },
  { id: 'wye-wye', name: 'Wye-Wye (Y-Y)' },
  { id: 'wye-delta', name: 'Wye-Delta (Y-Δ)' }
];

// Starting method options for motors
const STARTING_METHODS = [
  { id: 'direct', name: 'Direct-On-Line (DOL)', startingCurrentFactor: 6 }, // Can be 5-8x
  { id: 'star-delta', name: 'Star-Delta', startingCurrentFactor: 2.5 }, // Can be 2-3x of DOL
  { id: 'softStarter', name: 'Soft Starter', startingCurrentFactor: 2 }, // Can be 2-4x
  { id: 'vfd', name: 'Variable Frequency Drive (VFD)', startingCurrentFactor: 1.8 }, // Can be 1.1-1.5x
  { id: 'none', name: 'Not a Motor / No Starting Current', startingCurrentFactor: 1 }
];

// Define results interface for each transformer
interface TransformerResults {
  id: string;
  totalActivePower: number; // kW
  totalReactivePower: number; // kVAR
  totalApparentPower: number; // kVA
  utilizationPercentage: number; // % of transformer capacity
  powerFactor: number; // Overall PF
  secondaryVoltageDropAtFullLoad: number; // V
  motorStartingVoltageDip: number; // %
  peakMotorStartingCurrent: number; // A on secondary
  transformerEnergizationInrush: number; // A on primary
  estimatedLosses: number; // kW
  harmonicDeratingFactor: number;
  altitudeDeratingFactor: number;
  temperatureDeratingFactor: number;
  overallDeratingFactor: number;
  loadDetails: LoadDetail[];
}

// Load detail for transformer results
interface LoadDetail {
  id: string;
  name: string;
  actualPower: number; // kW
  reactivePower: number; // kVAR
  apparentPower: number; // kVA
  powerFactor: number;
  startingKVA: number;
  startingCurrentFactor: number;
  harmonicContent: number;
}

const TransformerSizingCalculator: React.FC<TransformerSizingCalculatorProps> = ({ onShowTutorial }) => {
  // State for transformers
  const [transformers, setTransformers] = useState<Transformer[]>([
    {
      id: '1',
      name: 'Transformer 1',
      rating: 1000,
      primaryVoltage: 11000,
      secondaryVoltage: 380,
      frequency: 50,
      connectionType: 'delta-wye',
      impedance: 5,
      temperature: 40,
      altitude: 0,
      type: 'oil',
      installation: 'indoor',
      kFactor: 1,
      efficiency: 98.5,
      assignedLoads: []
    }
  ]);

  // State for loads
  const [loads, setLoads] = useState<Load[]>([
    {
      id: '1',
      name: 'General Lighting',
      power: 20,
      powerFactor: 0.85,
      quantity: 1,
      loadFactor: 1.0,
      demandFactor: 1.0,
      harmonicContent: 10,
      phaseType: 'three',
      startingMethod: 'none',
      voltageRating: 380,
      assignedTo: []
    }
  ]);

  // State for editing transformer and load
  const [editingTransformerId, setEditingTransformerId] = useState<string | null>(null);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  
  // State for calculation results
  const [transformerResults, setTransformerResults] = useState<Record<string, TransformerResults>>({});
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Calculate results whenever transformers or loads change
  useEffect(() => {
    const results: Record<string, TransformerResults> = {};
    
    // Calculate results for each transformer
    transformers.forEach(transformer => {
      // Get loads assigned to this transformer
      const assignedLoads = loads.filter(load => load.assignedTo.includes(transformer.id));
      
      let totalActivePower = 0;
      let totalReactivePower = 0;
      let maxHarmonicContent = 0;
      let maxStartingKVA = 0;
      let phaseTypeOfMaxStartingLoad: 'single' | 'three' = 'three';
      const loadDetails: LoadDetail[] = [];

      // Calculate total powers and load details
      assignedLoads.forEach(load => {
        const actualPower = load.power * load.quantity * load.loadFactor * load.demandFactor;
        totalActivePower += actualPower;
        
        // Clamp power factor between 0.1 and 1.0 to avoid calculation errors
        const clampedPF = Math.max(0.1, Math.min(1, load.powerFactor));
        const powerFactorAngle = Math.acos(clampedPF);
        const reactivePower = actualPower * Math.tan(powerFactorAngle);
        totalReactivePower += reactivePower;
        
        const apparentPower = actualPower / clampedPF;
        
        if (load.harmonicContent > maxHarmonicContent) {
          maxHarmonicContent = load.harmonicContent;
        }
        
        let startingKVA = 0;
        let startingCurrentFactor = 1;
        if (load.startingMethod !== 'none') {
          const method = STARTING_METHODS.find(m => m.id === load.startingMethod);
          if (method) {
            startingCurrentFactor = method.startingCurrentFactor;
            // Starting KVA is based on the load's rated apparent power, not diversified power
            const ratedApparentKVA = (load.power * load.quantity) / clampedPF;
            startingKVA = ratedApparentKVA * startingCurrentFactor;
            if (startingKVA > maxStartingKVA) {
              maxStartingKVA = startingKVA;
              phaseTypeOfMaxStartingLoad = load.phaseType;
            }
          }
        }
        
        loadDetails.push({
          id: load.id,
          name: load.name,
          actualPower,
          reactivePower,
          apparentPower,
          powerFactor: clampedPF,
          startingKVA,
          startingCurrentFactor,
          harmonicContent: load.harmonicContent
        });
      });

      const totalApparentPower = Math.sqrt(Math.pow(totalActivePower, 2) + Math.pow(totalReactivePower, 2));
      const utilizationPercentage = transformer.rating > 0 ? (totalApparentPower / transformer.rating) * 100 : 0;
      const powerFactor = totalApparentPower > 0 ? totalActivePower / totalApparentPower : 0;

      // Calculate derating factors
      let harmonicDeratingFactor = 1.0;
      if (transformer.kFactor === 1 && maxHarmonicContent > 0) {
        const thdEffect = Math.min(maxHarmonicContent, 50);
        harmonicDeratingFactor = 1.0 - (thdEffect / 100) * 0.15;
        harmonicDeratingFactor = Math.max(harmonicDeratingFactor, 0.75); // Minimum 75%
      }
      
      let altitudeDeratingFactor = 1.0;
      if (transformer.altitude > 1000) {
        altitudeDeratingFactor = 1.0 - ((transformer.altitude - 1000) / 100) * 0.004;
        altitudeDeratingFactor = Math.max(altitudeDeratingFactor, 0.8); // Minimum 80%
      }
      
      let temperatureDeratingFactor = 1.0;
      const referenceTemp = 40;
      if (transformer.temperature > referenceTemp) {
        temperatureDeratingFactor = 1.0 - (transformer.temperature - referenceTemp) * 0.01;
        temperatureDeratingFactor = Math.max(temperatureDeratingFactor, 0.75); // Minimum 75%
      }
      
      const overallDeratingFactor = harmonicDeratingFactor * altitudeDeratingFactor * temperatureDeratingFactor;

      // Calculate voltage drop at full load
      const secondaryVoltageDropAtFullLoad = (transformer.impedance > 0 && transformer.rating > 0) ?
        (transformer.impedance / 100) * (totalApparentPower / transformer.rating) * transformer.secondaryVoltage : 0;
      
      // Calculate motor starting voltage dip
      const motorStartingVoltageDip = (transformer.rating > 0 && maxStartingKVA > 0 && transformer.impedance > 0) ?
        (maxStartingKVA / transformer.rating) * transformer.impedance : 0;
      
      // Calculate peak motor starting current on secondary side
      const peakMotorStartingCurrent = (maxStartingKVA > 0 && transformer.secondaryVoltage > 0) ? (
        maxStartingKVA * 1000 / 
        ((phaseTypeOfMaxStartingLoad === 'three' ? Math.sqrt(3) : 1) * transformer.secondaryVoltage)
      ) : 0;
      
      // Calculate transformer energization inrush current (CORRECTED)
      // Typical inrush is 8-12 times full load current, using 10x as typical
      const transformerEnergizationInrush = (transformer.rating > 0 && transformer.primaryVoltage > 0) ? (
        10 * (transformer.rating * 1000 / (Math.sqrt(3) * transformer.primaryVoltage))
      ) : 0;
      
      // Calculate estimated losses
      let estimatedLosses = 0;
      if (transformer.efficiency > 0 && totalActivePower > 0) {
        const inputPower = totalActivePower / (transformer.efficiency / 100);
        estimatedLosses = inputPower - totalActivePower;
      } else {
        // Even with no load, transformer has no-load losses (typically 0.2-0.5% of rating)
        estimatedLosses = transformer.rating * 0.003; // 0.3% as typical no-load loss
      }

      // Store results
      results[transformer.id] = {
        id: transformer.id,
        totalActivePower,
        totalReactivePower,
        totalApparentPower,
        utilizationPercentage,
        powerFactor,
        secondaryVoltageDropAtFullLoad,
        motorStartingVoltageDip,
        peakMotorStartingCurrent,
        transformerEnergizationInrush,
        estimatedLosses,
        harmonicDeratingFactor,
        altitudeDeratingFactor,
        temperatureDeratingFactor,
        overallDeratingFactor,
        loadDetails
      };
    });

    setTransformerResults(results);
  }, [transformers, loads]); // Fixed dependency array

  // Function to add a new transformer
  const addTransformer = () => {
    const newTransformer: Transformer = {
      id: Date.now().toString(),
      name: `Transformer ${transformers.length + 1}`,
      rating: 1000, // Default to 1000 kVA
      primaryVoltage: 11000,
      secondaryVoltage: 380,
      frequency: 50,
      connectionType: 'delta-wye',
      impedance: 5,
      temperature: 40,
      altitude: 0,
      type: 'oil',
      installation: 'indoor',
      kFactor: 1,
      efficiency: 98.5,
      assignedLoads: []
    };
    setTransformers([...transformers, newTransformer]);
  };

  // Function to remove a transformer
  const removeTransformer = (id: string) => {
    // First, remove this transformer from any loads assigned to it
    setLoads(loads.map(load => {
      if (load.assignedTo.includes(id)) {
        return {
          ...load,
          assignedTo: load.assignedTo.filter(assignedId => assignedId !== id)
        };
      }
      return load;
    }));

    // Then remove the transformer
    setTransformers(transformers.filter(t => t.id !== id));
  };

  // Function to update a transformer
  const updateTransformer = (id: string, updates: Partial<Transformer>) => {
    setTransformers(
      transformers.map(transformer => 
        transformer.id === id ? { ...transformer, ...updates } : transformer
      )
    );
  };

  // Function to add a new load
  const addLoad = () => {
    const newLoad: Load = {
      id: Date.now().toString(),
      name: `Load ${loads.length + 1}`,
      power: 20,
      powerFactor: 0.85,
      quantity: 1,
      loadFactor: 1.0,
      demandFactor: 1.0,
      harmonicContent: 0,
      phaseType: 'three',
      startingMethod: 'none',
      voltageRating: transformers[0]?.secondaryVoltage || 380,
      assignedTo: []
    };
    setLoads([...loads, newLoad]);
  };

  // Function to remove a load
  const removeLoad = (id: string) => {
    // Remove this load from any transformers it's assigned to
    setTransformers(transformers.map(transformer => {
      if (transformer.assignedLoads.includes(id)) {
        return {
          ...transformer,
          assignedLoads: transformer.assignedLoads.filter(loadId => loadId !== id)
        };
      }
      return transformer;
    }));

    // Then remove the load
    setLoads(loads.filter(load => load.id !== id));
  };

  // Function to update a load
  const updateLoad = (id: string, updates: Partial<Load>) => {
    setLoads(
      loads.map(load => 
        load.id === id ? { ...load, ...updates } : load
      )
    );
  };
  
  // Function to duplicate a load
  const duplicateLoad = (id: string) => {
    const loadToDuplicate = loads.find(load => load.id === id);
    if (!loadToDuplicate) return;
    
    const newLoad: Load = {
      ...loadToDuplicate,
      id: Date.now().toString(),
      name: `${loadToDuplicate.name} (Copy)`,
      assignedTo: [] // Reset assignments for the duplicated load
    };
    
    setLoads([...loads, newLoad]);
  };

  // Function to toggle load assignment to a transformer
  const toggleLoadAssignment = (loadId: string, transformerId: string) => {
    // Check if load is already assigned to this transformer
    const load = loads.find(l => l.id === loadId);
    if (!load) return;

    if (load.assignedTo.includes(transformerId)) {
      // If already assigned, remove assignment
      updateLoad(loadId, {
        assignedTo: load.assignedTo.filter(id => id !== transformerId)
      });
      
      // Also remove from transformer's assigned loads
      const transformer = transformers.find(t => t.id === transformerId);
      if (transformer) {
        updateTransformer(transformerId, {
          assignedLoads: transformer.assignedLoads.filter(id => id !== loadId)
        });
      }
    } else {
      // If not assigned, add assignment if less than 2 transformers are already assigned
      if (load.assignedTo.length < 2) {
        updateLoad(loadId, {
          assignedTo: [...load.assignedTo, transformerId]
        });
        
        // Also add to transformer's assigned loads
        const transformer = transformers.find(t => t.id === transformerId);
        if (transformer) {
          updateTransformer(transformerId, {
            assignedLoads: [...transformer.assignedLoads, loadId]
          });
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Transformer Sizing Calculator</h2>
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
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          {/* Transformers Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">Transformers</h3>
              <button 
                onClick={addTransformer} 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Transformer
              </button>
            </div>
            
            {transformers.map((transformer) => (
              <div key={transformer.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{transformer.name}</h4>
                  {transformers.length > 1 && (
                    <button 
                      onClick={() => removeTransformer(transformer.id)} 
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {editingTransformerId === transformer.id ? (
                  <div className="pl-3 border-l-4 border-blue-400">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transformer Name</label>
                      <input 
                        type="text" 
                        value={transformer.name} 
                        onChange={(e) => updateTransformer(transformer.id, { name: e.target.value })} 
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating (kVA)</label>
                      <select 
                        value={transformer.rating} 
                        onChange={(e) => updateTransformer(transformer.id, { rating: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {STANDARD_TRANSFORMER_SIZES.map(size => (
                          <option key={size} value={size}>{size} kVA</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Voltage (V)</label>
                        <input 
                          type="number" 
                          value={transformer.primaryVoltage} 
                          onChange={(e) => updateTransformer(transformer.id, { primaryVoltage: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Voltage (V)</label>
                        <input 
                          type="number" 
                          value={transformer.secondaryVoltage} 
                          onChange={(e) => updateTransformer(transformer.id, { secondaryVoltage: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (Hz)</label>
                        <select 
                          value={transformer.frequency} 
                          onChange={(e) => updateTransformer(transformer.id, { frequency: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={50}>50 Hz</option>
                          <option value={60}>60 Hz</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
                        <select 
                          value={transformer.connectionType} 
                          onChange={(e) => updateTransformer(transformer.id, { connectionType: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {CONNECTION_TYPES.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Impedance (%)</label>
                        <input 
                          type="number" 
                          value={transformer.impedance} 
                          onChange={(e) => updateTransformer(transformer.id, { impedance: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.1" min="2" max="15"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ambient Temp. (°C)</label>
                        <input 
                          type="number" 
                          value={transformer.temperature} 
                          onChange={(e) => updateTransformer(transformer.id, { temperature: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Altitude (m)</label>
                        <input 
                          type="number" 
                          value={transformer.altitude} 
                          onChange={(e) => updateTransformer(transformer.id, { altitude: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="100" min="0"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transformer Type</label>
                        <div className="flex space-x-4">
                          {(['oil', 'dry'] as TransformerType[]).map(tType => (
                            <label key={tType} className="inline-flex items-center">
                              <input 
                                type="radio" 
                                name={`transformerType-${transformer.id}`} 
                                checked={transformer.type === tType} 
                                onChange={() => updateTransformer(transformer.id, { type: tType })} 
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{tType === 'oil' ? 'Oil-filled' : 'Dry-type'}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Installation</label>
                        <div className="flex space-x-4">
                          {(['indoor', 'outdoor'] as InstallationType[]).map(iType => (
                            <label key={iType} className="inline-flex items-center">
                              <input 
                                type="radio" 
                                name={`installation-${transformer.id}`} 
                                checked={transformer.installation === iType} 
                                onChange={() => updateTransformer(transformer.id, { installation: iType })} 
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{iType.charAt(0).toUpperCase() + iType.slice(1)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">K-Factor</label>
                        <select 
                          value={transformer.kFactor} 
                          onChange={(e) => updateTransformer(transformer.id, { kFactor: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {[1,4,13,20].map(k => (
                            <option key={k} value={k}>
                              K-{k} {k===1?'(Std)':k===4?'(Light)':k===13?'(Med)':'(Heavy)'} Harmonics
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency (%)</label>
                        <input 
                          type="number" 
                          value={transformer.efficiency} 
                          onChange={(e) => updateTransformer(transformer.id, { efficiency: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.1" min="90" max="99.9"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3">
                      <button 
                        onClick={() => setEditingTransformerId(null)} 
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
                        <p className="text-gray-600">Rating:</p>
                        <p className="font-semibold text-gray-800">{transformer.rating} kVA</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Voltage:</p>
                        <p className="font-semibold text-gray-800">{transformer.primaryVoltage}/{transformer.secondaryVoltage} V</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Connection:</p>
                        <p className="font-semibold text-gray-800">
                          {CONNECTION_TYPES.find(t => t.id === transformer.connectionType)?.name.split(' ')[0] || 'Delta-Wye'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Impedance:</p>
                        <p className="font-semibold text-gray-800">{transformer.impedance}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Type:</p>
                        <p className="font-semibold text-gray-800">{transformer.type === 'oil' ? 'Oil-filled' : 'Dry-type'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Installation:</p>
                        <p className="font-semibold text-gray-800">{transformer.installation.charAt(0).toUpperCase() + transformer.installation.slice(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">K-Factor:</p>
                        <p className="font-semibold text-gray-800">K-{transformer.kFactor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Efficiency:</p>
                        <p className="font-semibold text-gray-800">{transformer.efficiency}%</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setEditingTransformerId(transformer.id)} 
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
          
          {/* Loads Section */}
          <div className="border-t border-gray-300 my-6"></div>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">Loads</h3>
              <button 
                onClick={addLoad} 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Load
              </button>
            </div>
            
            {loads.map((load) => (
              <div key={load.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{load.name}</h4>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => duplicateLoad(load.id)} 
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Duplicate
                    </button>
                    {loads.length > 1 && (
                      <button 
                        onClick={() => removeLoad(load.id)} 
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                
                {editingLoadId === load.id ? (
                  <div className="pl-3 border-l-4 border-blue-400">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Load Name</label>
                      <input 
                        type="text" 
                        value={load.name} 
                        onChange={(e) => updateLoad(load.id, { name: e.target.value })} 
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Power (kW)</label>
                        <input 
                          type="number" 
                          value={load.power} 
                          onChange={(e) => updateLoad(load.id, { power: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.1" min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                        <input 
                          type="number" 
                          value={load.powerFactor} 
                          onChange={(e) => updateLoad(load.id, { powerFactor: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.01" min="0.1" max="1"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input 
                          type="number" 
                          value={load.quantity} 
                          onChange={(e) => updateLoad(load.id, { quantity: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="1" min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Voltage Rating (V)</label>
                        <input 
                          type="number" 
                          value={load.voltageRating} 
                          onChange={(e) => updateLoad(load.id, { voltageRating: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="1"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Load Factor</label>
                        <input 
                          type="number" 
                          value={load.loadFactor} 
                          onChange={(e) => updateLoad(load.id, { loadFactor: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.05" min="0" max="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Demand Factor</label>
                        <input 
                          type="number" 
                          value={load.demandFactor} 
                          onChange={(e) => updateLoad(load.id, { demandFactor: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.05" min="0" max="1"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Harmonic Content (THD %)</label>
                        <input 
                          type="number" 
                          value={load.harmonicContent} 
                          onChange={(e) => updateLoad(load.id, { harmonicContent: Number(e.target.value) })} 
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="1" min="0" max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phase Type</label>
                        <select 
                          value={load.phaseType} 
                          onChange={(e) => updateLoad(load.id, { phaseType: e.target.value as 'single' | 'three' })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="single">Single-phase</option>
                          <option value="three">Three-phase</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Starting Method (for motors)</label>
                      <select 
                        value={load.startingMethod} 
                        onChange={(e) => updateLoad(load.id, { startingMethod: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {STARTING_METHODS.map(method => (
                          <option key={method.id} value={method.id}>
                            {method.name} (Factor: {method.startingCurrentFactor}x)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex justify-end mt-3">
                      <button 
                        onClick={() => setEditingLoadId(null)} 
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
                        <p className="text-gray-600">Power:</p>
                        <p className="font-semibold text-gray-800">{load.power} kW</p>
                      </div>
                      <div>
                        <p className="text-gray-600">PF:</p>
                        <p className="font-semibold text-gray-800">{load.powerFactor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Qty:</p>
                        <p className="font-semibold text-gray-800">{load.quantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Voltage:</p>
                        <p className="font-semibold text-gray-800">{load.voltageRating}V</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Load Factor:</p>
                        <p className="font-semibold text-gray-800">{load.loadFactor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Demand Factor:</p>
                        <p className="font-semibold text-gray-800">{load.demandFactor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">THD:</p>
                        <p className="font-semibold text-gray-800">{load.harmonicContent}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Phase:</p>
                        <p className="font-semibold text-gray-800">{load.phaseType === 'single' ? 'Single' : 'Three'}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-sm mb-3">
                      <p className="text-gray-600">Starting Method:</p>
                      <p className="font-semibold text-gray-800">
                        {STARTING_METHODS.find(method => method.id === load.startingMethod)?.name || 'None'}
                      </p>
                    </div>
                    
                    {/* Transformer Assignment */}
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Assign to Transformer(s):</p>
                      <div className="flex flex-wrap gap-2">
                        {transformers.map(transformer => (
                          <label key={transformer.id} className="inline-flex items-center bg-gray-100 p-2 rounded">
                            <input 
                              type="checkbox" 
                              checked={load.assignedTo.includes(transformer.id)} 
                              onChange={() => toggleLoadAssignment(load.id, transformer.id)} 
                              disabled={!load.assignedTo.includes(transformer.id) && load.assignedTo.length >= 2}
                              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{transformer.name}</span>
                          </label>
                        ))}
                      </div>
                      {load.assignedTo.length >= 2 && (
                        <p className="text-xs text-orange-600 mt-1">Maximum 2 transformers can be assigned</p>
                      )}
                    </div>
                    
                    <div className="flex justify-end mt-3">
                      <button 
                        onClick={() => setEditingLoadId(load.id)} 
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
        </div>
        
        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
          
          {/* Each Transformer Results */}
          {transformers.map(transformer => {
            const results = transformerResults[transformer.id];
            if (!results) return null;
            
            return (
              <div key={transformer.id} className="mb-6">
                <h4 className="font-medium text-base text-blue-800 mb-3 pb-2 border-b border-blue-200">
                  {transformer.name} ({transformer.rating} kVA)
                </h4>
                
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <h5 className="font-medium text-gray-800 mb-3">Loading Summary</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Utilization:</p>
                      <p className={`font-bold text-xl ${
                        results.utilizationPercentage > 90 ? 'text-red-600' : 
                        results.utilizationPercentage > 80 ? 'text-orange-600' : 
                        results.utilizationPercentage > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {results.utilizationPercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Load:</p>
                      <p className="font-semibold text-gray-800">{results.totalApparentPower.toFixed(1)} kVA</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Power Factor:</p>
                      <p className="font-semibold text-gray-800">{results.powerFactor.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Active Power:</p>
                      <p className="font-semibold text-gray-800">{results.totalActivePower.toFixed(1)} kW</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reactive Power:</p>
                      <p className="font-semibold text-gray-800">{results.totalReactivePower.toFixed(1)} kVAR</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Losses:</p>
                      <p className="font-semibold text-gray-800">{results.estimatedLosses.toFixed(2)} kW</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <h5 className="font-medium text-gray-800 mb-3">Voltage & Current</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Secondary Voltage Drop:</p>
                      <p className={`font-semibold ${
                        results.secondaryVoltageDropAtFullLoad > transformer.secondaryVoltage * 0.05 ? 'text-red-600' : 
                        results.secondaryVoltageDropAtFullLoad > transformer.secondaryVoltage * 0.03 ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {results.secondaryVoltageDropAtFullLoad.toFixed(1)} V (
                        {(results.secondaryVoltageDropAtFullLoad / transformer.secondaryVoltage * 100).toFixed(2)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Motor Starting Voltage Dip:</p>
                      <p className={`font-semibold ${
                        results.motorStartingVoltageDip > 15 ? 'text-red-600' : 
                        results.motorStartingVoltageDip > 10 ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {results.motorStartingVoltageDip.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Peak Starting Current (Sec.):</p>
                      <p className="font-semibold text-gray-800">{results.peakMotorStartingCurrent.toFixed(0)} A</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Inrush Current (Pri.):</p>
                      <p className="font-semibold text-gray-800">{results.transformerEnergizationInrush.toFixed(0)} A</p>
                    </div>
                  </div>
                </div>
                
                {/* Derating Factors */}
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <h5 className="font-medium text-gray-800 mb-3">Derating Analysis</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Harmonic:</p>
                      <p className="font-semibold text-gray-800">{(results.harmonicDeratingFactor * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Altitude:</p>
                      <p className="font-semibold text-gray-800">{(results.altitudeDeratingFactor * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Temperature:</p>
                      <p className="font-semibold text-gray-800">{(results.temperatureDeratingFactor * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Overall:</p>
                      <p className="font-semibold text-gray-800">{(results.overallDeratingFactor * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                
                {/* Assigned Loads */}
                {results.loadDetails.length > 0 && (
                  <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200 overflow-x-auto">
                    <h5 className="font-medium text-gray-800 mb-3">Assigned Loads</h5>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load</th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P (kW)</th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Q (kVAR)</th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">S (kVA)</th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PF</th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Start (kVA)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.loadDetails.map((load) => (
                          <tr key={load.id}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                              {load.name}
                              {load.harmonicContent > 0 && (
                                <span className="ml-1 text-xs text-orange-600">(THD: {load.harmonicContent}%)</span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.actualPower.toFixed(1)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.reactivePower.toFixed(1)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.apparentPower.toFixed(1)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.powerFactor.toFixed(2)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">
                              {load.startingKVA > 0 ? load.startingKVA.toFixed(1) : '-'}
                              {load.startingKVA > 0 && (
                                <span className="ml-1 text-xs text-blue-600">({load.startingCurrentFactor}x)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Total</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{results.totalActivePower.toFixed(1)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{results.totalReactivePower.toFixed(1)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{results.totalApparentPower.toFixed(1)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{results.powerFactor.toFixed(2)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                
                <div className="mt-3 bg-blue-100 p-3 rounded-md border border-blue-300">
                  <h5 className="font-medium text-blue-700 mb-2">Evaluation</h5>
                  {results.loadDetails.length === 0 ? (
                    <p className="text-sm text-blue-800">No loads assigned to this transformer.</p>
                  ) : results.utilizationPercentage > 90 ? (
                    <p className="text-sm text-red-600">
                      <strong>Warning:</strong> Transformer is heavily loaded ({results.utilizationPercentage.toFixed(1)}%). 
                      Consider upgrading to the next size or redistributing loads.
                    </p>
                  ) : results.utilizationPercentage < 40 ? (
                    <p className="text-sm text-orange-600">
                      <strong>Note:</strong> Transformer is lightly loaded ({results.utilizationPercentage.toFixed(1)}%).
                      Consider using a smaller transformer for better efficiency.
                    </p>
                  ) : (
                    <p className="text-sm text-green-600">
                      <strong>Good:</strong> Transformer is properly sized with good utilization ({results.utilizationPercentage.toFixed(1)}%).
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          
          <button 
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)} 
            className="w-full mb-4 flex justify-between items-center p-3 bg-blue-100 hover:bg-blue-200 rounded-md border border-blue-300 text-blue-700"
          >
            <span className="font-medium">{showTechnicalDetails ? 'Hide' : 'Show'} Technical Details</span>
            <span className="text-blue-600">{showTechnicalDetails ? '▲' : '▼'}</span>
          </button>
          
          {showTechnicalDetails && (
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
              <h4 className="font-medium text-base text-blue-800 mb-3">Calculation Method Summary</h4>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                <li><span className="font-medium">Load Calculation:</span> For each load, actual power = rated power × quantity × load factor × demand factor.</li>
                <li><span className="font-medium">Reactive Power:</span> Calculated as active power × tan(cos⁻¹(power factor)).</li>
                <li><span className="font-medium">Apparent Power:</span> S = √(P² + Q²), where P is active power and Q is reactive power.</li>
                <li><span className="font-medium">Utilization:</span> (Total kVA / Transformer Rating) × 100%.</li>
                <li><span className="font-medium">Voltage Drop:</span> Using transformer impedance % and loading %: ΔV = (Z% / 100) × (S_load / S_rated) × V_secondary.</li>
                <li><span className="font-medium">Motor Starting Voltage Dip:</span> Using starting kVA and transformer impedance: Dip% = (S_starting / S_transformer) × Z%.</li>
                <li><span className="font-medium">Inrush Current:</span> I_inrush = 10 × I_fullload = 10 × (S_transformer / (√3 × V_primary)).</li>
                <li><span className="font-medium">Derating Factors:</span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Harmonic: K-1 transformers derated based on THD % (15% reduction per 100% THD).</li>
                    <li>Altitude: Derated 0.4% per 100m above 1000m altitude.</li>
                    <li>Temperature: Derated 1% per °C above 40°C reference.</li>
                  </ul>
                </li>
              </ol>
            </div>
          )}
          
          <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">System Recommendations</h4>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
              <li>Ideal transformer loading is between 40-80% of rated capacity for good efficiency and reserve capacity.</li>
              <li>Keep voltage drops under 3% for normal operation, under 5% for motor starting conditions.</li>
              <li>Consider K-factor transformers for circuits with high harmonic content (5% THD).</li>
              <li>Balance loads among multiple transformers when possible for redundancy.</li>
              <li>For motor loads, ensure proper protection settings for starting currents.</li>
              <li>Transformer inrush current (8-12x full load) affects primary protection coordination.</li>
            </ul>
            <p className="text-xs mt-2 text-blue-700">Note: Always verify with standards (IEC 60076, IEEE C57.12) and manufacturer's data for final selection.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Load and demand factors are crucial for accurate sizing; use realistic values based on actual usage patterns.</li>
          <li>K-factor transformers are designed for non-linear loads with high harmonic content (VFDs, UPS, LED lighting).</li>
          <li>Standard transformers (K-1) may require derating when handling significant harmonics (&gt;5% THD).</li>
          <li>Altitude/temperature derating per IEC 60076 or manufacturer data - critical for high-altitude or hot climate installations.</li>
          <li>Motor starting currents can cause significant voltage dips; verify acceptability with connected equipment.</li>
          <li>Transformer energization inrush (8-12x FLC for 0.1s) impacts primary protection coordination.</li>
          <li>Consider protection coordination with downstream devices and selectivity requirements.</li>
          <li>Parallel operation requires matched impedances and proper load sharing considerations.</li>
          <li>Always consult relevant standards (IEC, IEEE, BS) and manufacturer specifications for final design.</li>
        </ul>
      </div>
    </div>
  );
};

export default TransformerSizingCalculator;