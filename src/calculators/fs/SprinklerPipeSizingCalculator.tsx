import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface SelectedFitting {
  id: string;
  type: string;
  quantity: number;
  equivalentLength: number;
}

interface PipeSegment {
  id: string;
  name: string;
  length: number; // meters
  diameter: number; // mm
  flowRate: number; // L/min
  hazenWilliamsC: number;
  selectedFittings: SelectedFitting[];
  fittingsEquivalentLength: number; // calculated from selected fittings
  totalEquivalentLength: number; // meters
  headLoss: number; // m
  pressureLoss: number; // bar
  velocity: number; // m/s
  staticHead: number; // m
  staticPressure: number; // bar
}

interface PipeSizingResults {
  totalFrictionLoss: number; // bar
  totalStaticPressure: number; // bar
  totalPressureLoss: number; // bar
  compliesWithLimit: boolean;
  maxVelocity: number; // m/s
  recommendations: string[];
}

interface FittingData {
  name: string;
  equivalentLengths: { [key: string]: number }; // Nominal diameter (mm) -> equivalent length for C=120
}

const SprinklerPipeSizingCalculator: React.FC = () => {
  // State for pipe segments
  const [pipeSegments, setPipeSegments] = useState<PipeSegment[]>([
    {
      id: '1',
      name: 'Main Feed',
      length: 50,
      diameter: 100,
      flowRate: 1000,
      hazenWilliamsC: 120,
      selectedFittings: [],
      fittingsEquivalentLength: 0,
      totalEquivalentLength: 50,
      headLoss: 0,
      pressureLoss: 0,
      velocity: 0,
      staticHead: 0,
      staticPressure: 0
    }
  ]);

  // State for system parameters
  const [designFlowRate, setDesignFlowRate] = useState<number>(1000); // L/min
  const [maxAllowablePressureLoss, setMaxAllowablePressureLoss] = useState<number>(0.5); // bar

  // State for results
  const [results, setResults] = useState<PipeSizingResults>({
    totalFrictionLoss: 0,
    totalStaticPressure: 0,
    totalPressureLoss: 0,
    compliesWithLimit: true,
    maxVelocity: 0,
    recommendations: []
  });

  // State for editing and fitting selection
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [selectedFittingType, setSelectedFittingType] = useState<string>('');
  const [fittingQuantity, setFittingQuantity] = useState<number>(1);

  // Standard pipe diameters (nominal diameter in mm) - BS EN 12845
  const STANDARD_PIPE_DIAMETERS = [
    { nominal: 20, internal: 20 },
    { nominal: 25, internal: 25 },
    { nominal: 32, internal: 32 },
    { nominal: 40, internal: 40 },
    { nominal: 50, internal: 50 },
    { nominal: 65, internal: 65 },
    { nominal: 80, internal: 80 },
    { nominal: 100, internal: 100 },
    { nominal: 150, internal: 150 },
    { nominal: 200, internal: 200 },
    { nominal: 250, internal: 250 }
  ];

  // BS EN 12845 Table 22 - C values for various types of pipe
  const HAZEN_WILLIAMS_C_VALUES = [
    { material: 'Cast Iron', c: 100 },
    { material: 'Ductile Iron', c: 110 },
    { material: 'Mild Steel', c: 120 },
    { material: 'Galvanized Steel', c: 120 },
    { material: 'Spun Cement', c: 130 },
    { material: 'Cement Lined Cast Iron', c: 130 },
    { material: 'Stainless Steel', c: 140 },
    { material: 'Copper', c: 140 },
    { material: 'Reinforced Glass Fibre', c: 140 }
  ];

  // BS EN 12845 Table 23 - Equivalent length of fittings and valves (for C=120)
  const FITTINGS_DATA: FittingData[] = [
    {
      name: '90° screwed elbow (standard)',
      equivalentLengths: { '20': 0.76, '25': 0.77, '32': 1.0, '40': 1.2, '50': 1.5, '65': 1.9, '80': 2.4, '100': 3.0, '150': 4.3, '200': 5.7, '250': 7.4 }
    },
    {
      name: '90° welded elbow (r/d = 1.5)',
      equivalentLengths: { '20': 0.30, '25': 0.36, '32': 0.49, '40': 0.56, '50': 0.69, '65': 0.88, '80': 1.1, '100': 1.4, '150': 2.0, '200': 2.6, '250': 3.4 }
    },
    {
      name: '45° screwed elbow (standard)',
      equivalentLengths: { '20': 0.34, '25': 0.40, '32': 0.55, '40': 0.66, '50': 0.76, '65': 1.0, '80': 1.3, '100': 1.6, '150': 2.3, '200': 3.1, '250': 3.9 }
    },
    {
      name: 'Standard screwed tee or cross (flow through branch)',
      equivalentLengths: { '20': 1.3, '25': 1.5, '32': 2.1, '40': 2.4, '50': 2.9, '65': 3.8, '80': 4.8, '100': 6.1, '150': 8.6, '200': 11.0, '250': 14.0 }
    },
    {
      name: 'Gate valve - straight way',
      equivalentLengths: { '50': 0.38, '65': 0.51, '80': 0.63, '100': 0.81, '150': 1.1, '200': 1.5, '250': 2.0 }
    },
    {
      name: 'Alarm or non-return valve (swinging type)',
      equivalentLengths: { '50': 2.4, '65': 3.2, '80': 3.9, '100': 5.1, '150': 7.2, '200': 9.4, '250': 12.0 }
    },
    {
      name: 'Alarm or non-return valve (mushroom type)',
      equivalentLengths: { '50': 12.0, '65': 19.0, '80': 19.7, '100': 25.0, '150': 35.0, '200': 47.0, '250': 62.0 }
    },
    {
      name: 'Butterfly valve',
      equivalentLengths: { '50': 2.2, '65': 2.9, '80': 3.6, '100': 4.6, '150': 6.4, '200': 8.6, '250': 9.9 }
    },
    {
      name: 'Globe valve',
      equivalentLengths: { '65': 16.0, '80': 21.0, '100': 26.0, '150': 34.0, '200': 48.0, '250': 64.0 }
    }
  ];

  // Conversion factors for different C values (from Table 23 footnote)
  const C_CONVERSION_FACTORS: { [key: number]: number } = {
    100: 0.714,
    110: 0.850,
    120: 1.000,
    130: 1.160,
    140: 1.330
  };

  // Calculate BS EN 12845 pipe friction loss
  const calculateBS12845FrictionLoss = (
    flowRate: number, // L/min
    diameter: number, // mm
    equivalentLength: number, // m
    cValue: number
  ): number => {
    // BS EN 12845 Formula: p = (6.05 × 10³) / (C^1.85 × d^4.87) × L × Q^1.85
    const p = (6.05e3 / (Math.pow(cValue, 1.85) * Math.pow(diameter, 4.87))) * equivalentLength * Math.pow(flowRate, 1.85);
    return p; // Pressure loss in bar
  };

  // Calculate velocity in pipe
  const calculateVelocity = (flowRate: number, diameter: number): number => {
    // Convert flow rate from L/min to m³/s
    const Q = flowRate / 60000;
    
    // Convert diameter from mm to m
    const D = diameter / 1000;
    
    // Calculate cross-sectional area
    const area = Math.PI * Math.pow(D / 2, 2);
    
    // Calculate velocity
    const velocity = Q / area;
    
    return velocity;
  };

  // Calculate static pressure difference (BS EN 12845: p = 0.098h)
  const calculateStaticPressure = (height: number): number => {
    return 0.098 * height; // bar
  };

  // Get equivalent length for fitting with C value conversion
  const getFittingEquivalentLength = (fittingName: string, diameter: number, cValue: number): number => {
    const fitting = FITTINGS_DATA.find(f => f.name === fittingName);
    if (!fitting) return 0;
    
    const baseLength = fitting.equivalentLengths[diameter.toString()] || 0;
    const conversionFactor = C_CONVERSION_FACTORS[cValue] || 1.0;
    
    return baseLength * conversionFactor;
  };

  // Add fitting to segment
  const addFittingToSegment = (segmentId: string) => {
    if (!selectedFittingType || fittingQuantity <= 0) return;

    const segment = pipeSegments.find(s => s.id === segmentId);
    if (!segment) return;

    const equivalentLength = getFittingEquivalentLength(selectedFittingType, segment.diameter, segment.hazenWilliamsC);
    
    const newFitting: SelectedFitting = {
      id: Date.now().toString(),
      type: selectedFittingType,
      quantity: fittingQuantity,
      equivalentLength: equivalentLength * fittingQuantity
    };

    updatePipeSegment(segmentId, {
      selectedFittings: [...segment.selectedFittings, newFitting]
    });

    // Reset fitting selection
    setSelectedFittingType('');
    setFittingQuantity(1);
  };

  // Remove fitting from segment
  const removeFittingFromSegment = (segmentId: string, fittingId: string) => {
    const segment = pipeSegments.find(s => s.id === segmentId);
    if (!segment) return;

    updatePipeSegment(segmentId, {
      selectedFittings: segment.selectedFittings.filter(f => f.id !== fittingId)
    });
  };

  // Add new pipe segment
  const addPipeSegment = () => {
    const newSegment: PipeSegment = {
      id: Date.now().toString(),
      name: `Segment ${pipeSegments.length + 1}`,
      length: 10,
      diameter: 100,
      flowRate: designFlowRate,
      hazenWilliamsC: 120,
      selectedFittings: [],
      fittingsEquivalentLength: 0,
      totalEquivalentLength: 10,
      headLoss: 0,
      pressureLoss: 0,
      velocity: 0,
      staticHead: 0,
      staticPressure: 0
    };
    setPipeSegments([...pipeSegments, newSegment]);
  };

  // Remove pipe segment
  const removePipeSegment = (id: string) => {
    if (pipeSegments.length > 1) {
      setPipeSegments(pipeSegments.filter(segment => segment.id !== id));
    }
  };

  // Update pipe segment
  const updatePipeSegment = (id: string, updates: Partial<PipeSegment>) => {
    setPipeSegments(pipeSegments.map(segment => {
      if (segment.id === id) {
        const updatedSegment = { ...segment, ...updates };
        
        // Recalculate fittings equivalent length if diameter or C value changed
        if (updates.diameter || updates.hazenWilliamsC || updates.selectedFittings) {
          const fittingsLength = updatedSegment.selectedFittings.reduce((sum, fitting) => {
            const unitLength = getFittingEquivalentLength(fitting.type, updatedSegment.diameter, updatedSegment.hazenWilliamsC);
            return sum + (unitLength * fitting.quantity);
          }, 0);
          
          updatedSegment.fittingsEquivalentLength = fittingsLength;
          updatedSegment.totalEquivalentLength = updatedSegment.length + fittingsLength;
        } else {
          updatedSegment.totalEquivalentLength = updatedSegment.length + updatedSegment.fittingsEquivalentLength;
        }
        
        return updatedSegment;
      }
      return segment;
    }));
  };

  // Calculate all results
  useEffect(() => {
    // Calculate individual segment losses
    const updatedSegments = pipeSegments.map(segment => {
      const pressureLoss = calculateBS12845FrictionLoss(
        segment.flowRate,
        segment.diameter,
        segment.totalEquivalentLength,
        segment.hazenWilliamsC
      );
      
      const velocity = calculateVelocity(segment.flowRate, segment.diameter);
      const staticPressure = calculateStaticPressure(segment.staticHead);
      
      return {
        ...segment,
        pressureLoss,
        velocity,
        staticPressure
      };
    });

    setPipeSegments(updatedSegments);

    // Calculate total losses
    const totalFrictionLoss = updatedSegments.reduce((sum, segment) => sum + segment.pressureLoss, 0);
    const totalStaticPressure = updatedSegments.reduce((sum, segment) => sum + segment.staticPressure, 0);
    const totalPressureLoss = totalFrictionLoss + totalStaticPressure;
    const maxVelocity = Math.max(...updatedSegments.map(segment => segment.velocity));

    // Check compliance with BS EN 12845
    const compliesWithLimit = totalFrictionLoss <= maxAllowablePressureLoss;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (!compliesWithLimit) {
      recommendations.push(`Total friction loss (${totalFrictionLoss.toFixed(3)} bar) exceeds BS EN 12845 limit (${maxAllowablePressureLoss} bar per 1000 L/min)`);
      recommendations.push('Consider increasing pipe diameters in segments with highest friction losses');
    }

    // Check velocity limits per BS EN 12845
    const hasValveStrainer = updatedSegments.some(segment => 
      segment.name.toLowerCase().includes('valve') || 
      segment.name.toLowerCase().includes('strainer') ||
      segment.selectedFittings.some(fitting => fitting.type.toLowerCase().includes('valve'))
    );
    const maxVelocityLimit = hasValveStrainer ? 6 : 10;

    if (maxVelocity > maxVelocityLimit) {
      recommendations.push(`Maximum velocity (${maxVelocity.toFixed(2)} m/s) exceeds BS EN 12845 limit of ${maxVelocityLimit} m/s`);
      recommendations.push('High velocities may cause noise and erosion - consider larger pipe diameters');
    }

    updatedSegments.forEach((segment, index) => {
      const hasValveInSegment = segment.name.toLowerCase().includes('valve') || 
                               segment.name.toLowerCase().includes('strainer') ||
                               segment.selectedFittings.some(fitting => fitting.type.toLowerCase().includes('valve'));
      const velocityLimit = hasValveInSegment ? 6 : 10;
      
      if (segment.velocity > velocityLimit) {
        recommendations.push(`Segment ${index + 1} (${segment.name}): Velocity ${segment.velocity.toFixed(2)} m/s exceeds ${velocityLimit} m/s limit`);
      }
    });

    if (compliesWithLimit && maxVelocity <= maxVelocityLimit) {
      recommendations.push('✓ System design complies with BS EN 12845 requirements');
    }

    setResults({
      totalFrictionLoss,
      totalStaticPressure,
      totalPressureLoss,
      compliesWithLimit,
      maxVelocity,
      recommendations
    });
  }, [pipeSegments, maxAllowablePressureLoss]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">System Parameters & Pipe Configuration</h3>
        
        {/* System Parameters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
          <h4 className="font-medium text-gray-700 mb-3">System Parameters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Design Flow Rate (L/min)
              </label>
              <input
                type="number"
                value={designFlowRate}
                onChange={(e) => setDesignFlowRate(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Friction Loss Limit (bar)
              </label>
              <input
                type="number"
                value={maxAllowablePressureLoss}
                onChange={(e) => setMaxAllowablePressureLoss(Number(e.target.value))}
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">BS EN 12845: 0.5 bar per 1000 L/min</p>
            </div>
          </div>
        </div>

        {/* Pipe Segments */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-700">Pipe Segments ({pipeSegments.length})</h4>
            <button 
              onClick={addPipeSegment}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Segment
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-4">
            {pipeSegments.map((segment, index) => (
              <div key={segment.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium text-gray-700">{segment.name}</h5>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      segment.pressureLoss > maxAllowablePressureLoss/pipeSegments.length 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {segment.pressureLoss.toFixed(3)} bar
                    </span>
                    {pipeSegments.length > 1 && (
                      <button 
                        onClick={() => removePipeSegment(segment.id)} 
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                
                {editingSegmentId === segment.id ? (
                  <div className="pl-3 border-l-4 border-blue-400 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Segment Name</label>
                      <input
                        type="text"
                        value={segment.name}
                        onChange={(e) => updatePipeSegment(segment.id, { name: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pipe Length (m)</label>
                        <input
                          type="number"
                          value={segment.length}
                          onChange={(e) => updatePipeSegment(segment.id, { length: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Diameter (mm)</label>
                        <select
                          value={segment.diameter}
                          onChange={(e) => updatePipeSegment(segment.id, { diameter: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {STANDARD_PIPE_DIAMETERS.map(pipe => (
                            <option key={pipe.nominal} value={pipe.internal}>
                              DN{pipe.nominal} ({pipe.internal}mm)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Flow Rate (L/min)</label>
                        <input
                          type="number"
                          value={segment.flowRate}
                          onChange={(e) => updatePipeSegment(segment.id, { flowRate: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Material (C Value)</label>
                        <select
                          value={segment.hazenWilliamsC}
                          onChange={(e) => updatePipeSegment(segment.id, { hazenWilliamsC: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {HAZEN_WILLIAMS_C_VALUES.map(material => (
                            <option key={material.material} value={material.c}>
                              {material.material} (C={material.c})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Static Head (m)</label>
                      <input
                        type="number"
                        value={segment.staticHead}
                        onChange={(e) => updatePipeSegment(segment.id, { staticHead: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="0.1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Vertical height difference</p>
                    </div>

                    {/* Fittings Section */}
                    <div className="border-t border-gray-200 pt-3">
                      <h6 className="font-medium text-gray-700 mb-2">Add Fittings (Table 23)</h6>
                      
                      {/* Add Fitting Interface */}
                      <div className="grid grid-cols-1 gap-2 mb-3">
                        <div>
                          <select
                            value={selectedFittingType}
                            onChange={(e) => setSelectedFittingType(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select fitting type...</option>
                            {FITTINGS_DATA.map(fitting => {
                              const hasSize = fitting.equivalentLengths[segment.diameter.toString()];
                              return (
                                <option 
                                  key={fitting.name} 
                                  value={fitting.name}
                                  disabled={!hasSize}
                                >
                                  {fitting.name} {!hasSize && '(N/A for this size)'}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={fittingQuantity}
                            onChange={(e) => setFittingQuantity(Number(e.target.value))}
                            min="1"
                            className="w-20 p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Qty"
                          />
                          <button
                            onClick={() => addFittingToSegment(segment.id)}
                            disabled={!selectedFittingType}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Add Fitting
                          </button>
                        </div>
                      </div>

                      {/* Display Selected Fittings */}
                      {segment.selectedFittings.length > 0 && (
                        <div className="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                          <p className="text-xs font-medium text-gray-600 mb-1">Selected Fittings:</p>
                          {segment.selectedFittings.map(fitting => (
                            <div key={fitting.id} className="flex justify-between items-center text-xs bg-white p-2 rounded mb-1">
                              <div>
                                <p className="font-medium">{fitting.quantity}× {fitting.type.split('(')[0].trim()}</p>
                                <p className="text-gray-500">{fitting.equivalentLength.toFixed(2)}m equiv.</p>
                              </div>
                              <button
                                onClick={() => removeFittingFromSegment(segment.id, fitting.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <Icons.Close />
                              </button>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-1 mt-1">
                            <p className="text-xs font-medium text-gray-700">
                              Total Fittings: {segment.fittingsEquivalentLength.toFixed(2)}m
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setEditingSegmentId(null)} 
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                      >
                        <Icons.Check />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
                      <div>
                        <p className="text-gray-600">Pipe Length:</p>
                        <p className="font-semibold text-gray-800">{segment.length} m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Diameter:</p>
                        <p className="font-semibold text-gray-800">DN{segment.diameter}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Flow Rate:</p>
                        <p className="font-semibold text-gray-800">{segment.flowRate} L/min</p>
                      </div>
                      <div>
                        <p className="text-gray-600">C Value:</p>
                        <p className="font-semibold text-gray-800">{segment.hazenWilliamsC}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 mb-3 text-sm">
                      <div>
                        <p className="text-gray-600">Fittings:</p>
                        <p className="font-semibold text-gray-800">{segment.fittingsEquivalentLength.toFixed(1)} m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Length:</p>
                        <p className="font-semibold text-gray-800">{segment.totalEquivalentLength.toFixed(1)} m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Static Head:</p>
                        <p className="font-semibold text-gray-800">{segment.staticHead.toFixed(1)} m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Velocity:</p>
                        <p className={`font-semibold ${
                          segment.velocity > (segment.name.toLowerCase().includes('valve') || segment.name.toLowerCase().includes('strainer') || 
                                           segment.selectedFittings.some(f => f.type.toLowerCase().includes('valve')) ? 6 : 10) ? 'text-red-600' : 
                          segment.velocity < 1 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {segment.velocity.toFixed(2)} m/s
                        </p>
                      </div>
                    </div>
                    
                    {/* Display Fittings Summary */}
                    {segment.selectedFittings.length > 0 && (
                      <div className="mb-3 text-xs">
                        <p className="text-gray-600 mb-1">Fittings ({segment.selectedFittings.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {segment.selectedFittings.map(fitting => (
                            <span key={fitting.id} className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {fitting.quantity}× {fitting.type.split(' ')[0]} {fitting.type.split(' ')[1]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div>
                        <p className="text-gray-600">Friction Loss:</p>
                        <p className={`font-semibold ${
                          segment.pressureLoss > maxAllowablePressureLoss/2 ? 'text-red-600' : 'text-gray-800'
                        }`}>
                          {segment.pressureLoss.toFixed(3)} bar
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Static Pressure:</p>
                        <p className="font-semibold text-gray-800">{segment.staticPressure.toFixed(3)} bar</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setEditingSegmentId(segment.id)} 
                        className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"
                      >
                        <Icons.Edit />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">BS EN 12845 Calculation Results</h3>
        
        {/* Summary Results */}
        <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">System Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Friction Loss:</p>
              <p className={`font-semibold text-lg ${
                results.compliesWithLimit ? 'text-green-600' : 'text-red-600'
              }`}>
                {results.totalFrictionLoss.toFixed(3)} bar
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Static Pressure:</p>
              <p className="font-semibold text-gray-800">{results.totalStaticPressure.toFixed(3)} bar</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total System Pressure:</p>
              <p className="font-semibold text-gray-800">{results.totalPressureLoss.toFixed(3)} bar</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Maximum Velocity:</p>
              <p className={`font-semibold ${
                results.maxVelocity > 10 ? 'text-red-600' : 
                results.maxVelocity > 6 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {results.maxVelocity.toFixed(2)} m/s
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Check */}
        <div className={`p-3 rounded-md mb-4 ${
          results.compliesWithLimit 
            ? 'bg-green-100 border border-green-300' 
            : 'bg-red-100 border border-red-300'
        }`}>
          <p className={`font-bold ${
            results.compliesWithLimit ? 'text-green-700' : 'text-red-700'
          }`}>
            {results.compliesWithLimit 
              ? `✓ COMPLIANT: Friction loss (${results.totalFrictionLoss.toFixed(3)} bar) ≤ ${maxAllowablePressureLoss} bar limit`
              : `✗ NON-COMPLIANT: Friction loss (${results.totalFrictionLoss.toFixed(3)} bar) > ${maxAllowablePressureLoss} bar limit`
            }
          </p>
          <p className="text-sm mt-1 text-gray-700">BS EN 12845 Section 13.2.1: Maximum 0.5 bar friction loss per 1000 L/min</p>
        </div>

        {/* Detailed Segment Results */}
        <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">Segment Analysis</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">DN</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Q (L/min)</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">L_total (m)</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Fittings</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">v (m/s)</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">ΔP_f (bar)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pipeSegments.map((segment, index) => {
                  const hasValveInSegment = segment.name.toLowerCase().includes('valve') || 
                                           segment.name.toLowerCase().includes('strainer') ||
                                           segment.selectedFittings.some(f => f.type.toLowerCase().includes('valve'));
                  const velocityLimit = hasValveInSegment ? 6 : 10;
                  
                  return (
                    <tr key={segment.id}>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">{segment.name}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-900">{segment.diameter}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-900">{segment.flowRate}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-900">{segment.totalEquivalentLength.toFixed(1)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-900">{segment.selectedFittings.length}</td>
                      <td className={`px-2 py-2 whitespace-nowrap text-sm text-right ${
                        segment.velocity > velocityLimit ? 'text-red-600 font-medium' : 
                        segment.velocity < 1 ? 'text-orange-600' : 'text-gray-900'
                      }`}>
                        {segment.velocity.toFixed(2)}
                      </td>
                      <td className={`px-2 py-2 whitespace-nowrap text-sm text-right font-medium ${
                        segment.pressureLoss > maxAllowablePressureLoss/2 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {segment.pressureLoss.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-700" colSpan={6}>Total</td>
                  <td className={`px-2 py-2 whitespace-nowrap text-sm font-medium text-right ${
                    results.compliesWithLimit ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {results.totalFrictionLoss.toFixed(3)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Table 23 Quick Reference */}
        <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">Table 23 - Quick Reference (Selected Sizes)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Fitting Type</th>
                  <th className="px-2 py-1 text-center">DN50</th>
                  <th className="px-2 py-1 text-center">DN65</th>
                  <th className="px-2 py-1 text-center">DN80</th>
                  <th className="px-2 py-1 text-center">DN100</th>
                  <th className="px-2 py-1 text-center">DN150</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-2 py-1">90° screwed elbow</td>
                  <td className="px-2 py-1 text-center">1.5</td>
                  <td className="px-2 py-1 text-center">1.9</td>
                  <td className="px-2 py-1 text-center">2.4</td>
                  <td className="px-2 py-1 text-center">3.0</td>
                  <td className="px-2 py-1 text-center">4.3</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">90° welded elbow</td>
                  <td className="px-2 py-1 text-center">0.69</td>
                  <td className="px-2 py-1 text-center">0.88</td>
                  <td className="px-2 py-1 text-center">1.1</td>
                  <td className="px-2 py-1 text-center">1.4</td>
                  <td className="px-2 py-1 text-center">2.0</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">Gate valve</td>
                  <td className="px-2 py-1 text-center">0.38</td>
                  <td className="px-2 py-1 text-center">0.51</td>
                  <td className="px-2 py-1 text-center">0.63</td>
                  <td className="px-2 py-1 text-center">0.81</td>
                  <td className="px-2 py-1 text-center">1.1</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">NRV (swinging)</td>
                  <td className="px-2 py-1 text-center">2.4</td>
                  <td className="px-2 py-1 text-center">3.2</td>
                  <td className="px-2 py-1 text-center">3.9</td>
                  <td className="px-2 py-1 text-center">5.1</td>
                  <td className="px-2 py-1 text-center">7.2</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Values shown for C=120. Automatic conversion applied for other C values.
          </p>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-4 rounded-md shadow border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">Design Recommendations</h4>
          <ul className="space-y-2">
            {results.recommendations.map((recommendation, index) => (
              <li key={index} className={`text-sm p-2 rounded ${
                recommendation.includes('✓') ? 'bg-green-50 text-green-700' :
                recommendation.includes('exceeds') || recommendation.includes('NON-COMPLIANT') ? 'bg-red-50 text-red-700' :
                'bg-yellow-50 text-yellow-700'
              }`}>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SprinklerPipeSizingCalculator;