import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface SurgicalAirFlowCalculatorProps {
  onShowTutorial?: () => void;
}

interface SurgicalAirRoom {
  id: string;
  name: string;
  department: string;
  roomCount: number;
  totalRoomCount: number;
  designFlowPerTerminal: number;
  diversifiedFlowPerRoom: number;
  totalDiversifiedFlow: number;
  formula: string;
  calculationSteps: string;
}

interface DepartmentType {
  name: string;
  designFlow: number;
  formula: string;
  description: string;
  requiresRoomCount?: boolean;
}

const DEPARTMENT_TYPES: DepartmentType[] = [
  {
    name: 'Operating room (orthopaedic and neurosurgical) - ≤4 rooms',
    designFlow: 350,
    formula: 'Q = 350 + [(n-1)*350/2]',
    description: 'Orthopaedic and neurosurgical operating rooms (≤4 rooms)',
    requiresRoomCount: true
  },
  {
    name: 'Operating room (orthopaedic and neurosurgical) - >4 rooms',
    designFlow: 350,
    formula: 'Q = 350 + [(n-1)*350/4]',
    description: 'Orthopaedic and neurosurgical operating rooms (>4 rooms)',
    requiresRoomCount: true
  },
  {
    name: 'Other departments (equipment workshops, fracture clinic)',
    designFlow: 350,
    formula: 'Q = 350',
    description: 'Equipment workshops, fracture clinic, etc.'
  },
  {
    name: 'Equipment service rooms',
    designFlow: 350,
    formula: 'Q = 350',
    description: 'Equipment service rooms (no additional flow required)'
  }
];

const SurgicalAirFlowCalculator: React.FC<SurgicalAirFlowCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Surgical Air (700 kPa) Gas Flow Sizing Calculator',
    discipline: 'electrical',
    calculatorType: 'surgical-air-flow'
  });

  const [rooms, setRooms] = useState<SurgicalAirRoom[]>([
    {
      id: '1',
      name: 'Orthopaedic Operating Rooms',
      department: 'Operating room (orthopaedic and neurosurgical) - ≤4 rooms',
      roomCount: 3,
      totalRoomCount: 3,
      designFlowPerTerminal: 350,
      diversifiedFlowPerRoom: 0,
      totalDiversifiedFlow: 0,
      formula: '',
      calculationSteps: ''
    }
  ]);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [activeConfigCard, setActiveConfigCard] = useState<string | null>(null);
  const [activeResultCard, setActiveResultCard] = useState<string | null>(null);
  const [globalSafetyFactor, setGlobalSafetyFactor] = useState<number>(1.3);
  const [totalSystemFlow, setTotalSystemFlow] = useState<number>(0);
  const [totalSystemFlowWithSafety, setTotalSystemFlowWithSafety] = useState<number>(0);

  // Calculate diversified flow based on department type and room count
  const calculateFlow = (department: string, roomCount: number): { flow: number; formula: string; steps: string } => {
    const deptType = DEPARTMENT_TYPES.find(d => d.name === department);
    if (!deptType) return { flow: 0, formula: 'Unknown department', steps: 'Department not found' };

    let flow = 0;
    let steps = '';
    const n = roomCount;
    const formula = deptType.formula;

    switch (department) {
      case 'Operating room (orthopaedic and neurosurgical) - ≤4 rooms':
        // Formula: Q = 350 + [(n-1)*350/2]
        if (n > 4) {
          // Show warning but still calculate
          flow = 350 + ((n - 1) * 350) / 2;
          steps = `Warning: ${n} rooms > 4, consider using ">4 rooms" formula\n` +
                  `Q = 350 + [(${n}-1)×350/2] = 350 + [${n-1}×350/2] = 350 + ${(((n-1)*350)/2).toFixed(1)} = ${flow.toFixed(1)} L/min`;
        } else {
          flow = 350 + ((n - 1) * 350) / 2;
          steps = `Q = 350 + [(${n}-1)×350/2] = 350 + [${n-1}×350/2] = 350 + ${(((n-1)*350)/2).toFixed(1)} = ${flow.toFixed(1)} L/min`;
        }
        break;
      
      case 'Operating room (orthopaedic and neurosurgical) - >4 rooms':
        // Formula: Q = 350 + [(n-1)*350/4]
        if (n <= 4) {
          // Show warning but still calculate
          flow = 350 + ((n - 1) * 350) / 4;
          steps = `Warning: ${n} rooms ≤ 4, consider using "≤4 rooms" formula\n` +
                  `Q = 350 + [(${n}-1)×350/4] = 350 + [${n-1}×350/4] = 350 + ${(((n-1)*350)/4).toFixed(1)} = ${flow.toFixed(1)} L/min`;
        } else {
          flow = 350 + ((n - 1) * 350) / 4;
          steps = `Q = 350 + [(${n}-1)×350/4] = 350 + [${n-1}×350/4] = 350 + ${(((n-1)*350)/4).toFixed(1)} = ${flow.toFixed(1)} L/min`;
        }
        break;
      
      case 'Other departments (equipment workshops, fracture clinic)':
      case 'Equipment service rooms':
        // Formula: Q = 350 (no additional flow)
        flow = 350;
        steps = `Q = 350 L/min (fixed rate, no additional flow for multiple units)`;
        break;
      
      default:
        // Default formula
        flow = 350;
        steps = `Q = 350 L/min (default formula)`;
        break;
    }

    return { flow, formula, steps };
  };

  // Calculate results whenever rooms change
  useEffect(() => {
    const updatedRooms = rooms.map(room => {
      const result = calculateFlow(room.department, room.roomCount);
      const deptType = DEPARTMENT_TYPES.find(d => d.name === room.department);
      
      return {
        ...room,
        designFlowPerTerminal: deptType?.designFlow || 350,
        diversifiedFlowPerRoom: result.flow,
        totalDiversifiedFlow: result.flow,
        formula: result.formula,
        calculationSteps: result.steps
      };
    });
    
    setRooms(updatedRooms);

    if (updatedRooms.length > 0) {
      if (!activeConfigCard || !updatedRooms.find(r => r.id === activeConfigCard)) {
        setActiveConfigCard(updatedRooms[0].id);
      }
      if (!activeResultCard || !updatedRooms.find(r => r.id === activeResultCard)) {
        setActiveResultCard(updatedRooms[0].id);
      }
    }
    
    const totalSystem = updatedRooms.reduce((sum, room) => sum + room.totalDiversifiedFlow, 0);
    const totalSystemWithSafety = totalSystem * globalSafetyFactor;
    
    setTotalSystemFlow(totalSystem);
    setTotalSystemFlowWithSafety(totalSystemWithSafety);
  }, [rooms.length, rooms.map(r => `${r.department}-${r.roomCount}`).join(','), globalSafetyFactor]);

  const addRoom = () => {
    const newRoom: SurgicalAirRoom = {
      id: Date.now().toString(),
      name: `Room Type ${rooms.length + 1}`,
      department: 'Operating room (orthopaedic and neurosurgical) - ≤4 rooms',
      roomCount: 2,
      totalRoomCount: 2,
      designFlowPerTerminal: 350,
      diversifiedFlowPerRoom: 0,
      totalDiversifiedFlow: 0,
      formula: '',
      calculationSteps: ''
    };
    setRooms([...rooms, newRoom]);
    setEditingRoomId(newRoom.id);
    setActiveConfigCard(newRoom.id);
    setActiveResultCard(newRoom.id);
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter(room => room.id !== id));
  };

  const updateRoom = (id: string, updates: Partial<SurgicalAirRoom>) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, ...updates } : room
    ));
  };

  return (
    <CalculatorWrapper
      title="Surgical Air (700 kPa) Gas Flow Sizing"
      discipline="electrical"
      calculatorType="surgical-air-flow"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
    <div className="bg-white rounded-lg shadow-lg p-6">
      
      {/* Global Safety Factor */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-medium text-lg mb-3">Global Safety Factor</h3>
        <div className="flex items-center space-x-4">
          <label className="block text-sm font-medium text-gray-700">
            Safety Factor:
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
            (Applied to total system flow)
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Recommended values: 1.3 for standard applications, 1.5-2.0 for critical applications
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">Department Configuration</h3>
            <button 
              onClick={addRoom}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Room
            </button>
          </div>
          
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
            {rooms.map((room) => {
              const isExpanded = activeConfigCard === room.id;
              const deptType = DEPARTMENT_TYPES.find(d => d.name === room.department);
              return (
              <div key={room.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className={`flex justify-between items-center p-4 cursor-pointer ${isExpanded ? 'border-b border-gray-200' : ''}`} onClick={() => setActiveConfigCard(isExpanded ? null : room.id)}>
                    <div>
                      <h4 className="font-medium text-gray-700">{room.name}</h4>
                      <p className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-purple-100 text-purple-700">
                        Surgical Air 700 kPa
                      </p>
                    </div>
                    <div className="flex items-center">
                        {!isExpanded && <p className="font-semibold text-blue-600 mr-4">{room.totalDiversifiedFlow.toFixed(1)} L/min</p>}
                        <svg className={`w-5 h-5 text-gray-500 transition-transform transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                
                {isExpanded && <div className="p-4">
                  <div className="flex justify-end items-center mb-3 -mt-4">
                    {rooms.length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }} 
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {editingRoomId === room.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department Type</label>
                        <select
                          value={room.department}
                          onChange={(e) => updateRoom(room.id, { department: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {DEPARTMENT_TYPES.map(dept => (
                            <option key={dept.name} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {deptType?.requiresRoomCount && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Operating Rooms
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={room.roomCount}
                            onChange={(e) => updateRoom(room.id, { roomCount: Number(e.target.value), totalRoomCount: Number(e.target.value) })}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          {room.department.includes('≤4 rooms') && room.roomCount > 4 && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ Consider using "4 rooms" formula for {room.roomCount} rooms
                            </p>
                          )}
                          {room.department.includes('>4 rooms') && room.roomCount <= 4 && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ Consider using "≤4 rooms" formula for {room.roomCount} rooms
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <button 
                          onClick={() => setEditingRoomId(null)} 
                          className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                        >
                          <Icons.Check />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-2 mb-3 text-sm">
                        <div>
                          <p className="text-gray-600">Department:</p>
                          <p className="font-semibold text-gray-800 text-xs">{room.department}</p>
                        </div>
                        {deptType?.requiresRoomCount && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-600">Number of rooms:</p>
                              <p className="font-semibold text-gray-800">{room.roomCount}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Formula applied:</p>
                              <p className="font-semibold text-gray-800 text-xs">
                                {room.roomCount <= 4 ? '≤4 rooms' : '>4 rooms'}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-600">Design Flow per Terminal:</p>
                            <p className="font-semibold text-gray-800">{room.designFlowPerTerminal} L/min</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Diversified Flow:</p>
                            <p className="font-semibold text-blue-600">{room.totalDiversifiedFlow.toFixed(1)} L/min</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button 
                          onClick={() => { setEditingRoomId(room.id); setActiveConfigCard(room.id); }} 
                          className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"
                        >
                          <Icons.Edit />
                          <span className="ml-1">Edit</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>}
              </div>
            )})}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {/* Total Flow Summary */}
          <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total System Flow (Calculated)</p>
              <p className="text-xl font-bold text-gray-700">{totalSystemFlow.toFixed(1)} L/min</p>
              <p className="text-xs text-gray-500">({(totalSystemFlow * 60).toFixed(1)} L/hr)</p>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">With Safety Factor ({globalSafetyFactor}x)</p>
                <p className="text-2xl font-bold text-blue-600">{totalSystemFlowWithSafety.toFixed(1)} L/min</p>
                <p className="text-sm text-gray-500">({(totalSystemFlowWithSafety * 60).toFixed(1)} L/hr)</p>
              </div>
            </div>
          </div>
          
          {/* Individual Department Calculations */}
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
            {rooms.map((room) => {
              const isExpanded = activeResultCard === room.id;
              const deptType = DEPARTMENT_TYPES.find(d => d.name === room.department);
              return (
              <div key={room.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div 
                  className={`flex justify-between items-center p-4 cursor-pointer ${isExpanded ? 'border-b border-gray-200' : ''}`}
                  onClick={() => setActiveResultCard(isExpanded ? null : room.id)}
                >
                  <div>
                    <h4 className="font-medium text-gray-800">{room.name}</h4>
                    <p className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-purple-100 text-purple-700">
                      Surgical Air 700 kPa
                    </p>
                  </div>
                  <div className="flex items-center">
                      <p className="font-semibold text-blue-600 mr-4">{room.totalDiversifiedFlow.toFixed(1)} L/min</p>
                      <svg className={`w-5 h-5 text-gray-500 transition-transform transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {isExpanded && <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Department:</p>
                      <p className="font-semibold text-gray-800 text-xs">{room.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Gas Type:</p>
                      <p className="font-semibold text-xs px-2 py-1 rounded-full inline-block bg-purple-100 text-purple-700">
                        Surgical Air 700 kPa
                      </p>
                    </div>
                    {deptType?.requiresRoomCount && (
                      <>
                        <div>
                          <p className="text-gray-600">Number of rooms:</p>
                          <p className="font-semibold text-gray-800">{room.roomCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Formula category:</p>
                          <p className="font-semibold text-gray-800 text-xs">
                            {room.roomCount <= 4 ? '≤4 operating rooms' : '>4 operating rooms'}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-gray-600">Design Flow per Terminal:</p>
                      <p className="font-semibold text-gray-800">{room.designFlowPerTerminal} L/min</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Flow:</p>
                      <p className="font-semibold text-blue-600">{room.totalDiversifiedFlow.toFixed(1)} L/min</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Formula Used:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded font-mono">{room.formula}</p>
                    
                    <p className="text-sm font-medium text-gray-700 mb-1 mt-3">Calculation Steps:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{room.calculationSteps}</p>
                  </div>
                </div>}
              </div>
            )})}
          </div>
        </div>
      </div>
      
      {/* Information Panel */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h4 className="font-medium mb-2 text-yellow-800">Surgical Air (700 kPa) Flow Information</h4>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>Legend:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Q</strong> = diversified flow for the department (L/min)</li>
            <li><strong>n</strong> = number of operating rooms, units, or terminals</li>
          </ul>
          <p className="mt-3"><strong>Department Types:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Operating Rooms (≤4 rooms):</strong> Q = 350 + [(n-1)×350/2] - Higher flow increment for smaller numbers</li>
            <li><strong>Operating Rooms (4 rooms):</strong> Q = 350 + [(n-1)×350/4] - Lower flow increment for larger numbers</li>
            <li><strong>Other Departments:</strong> Q = 350 L/min (fixed rate)</li>
            <li><strong>Equipment Service Rooms:</strong> Q = 350 L/min (no additional flow required)</li>
          </ul>
          <p className="mt-3"><strong>Important Notes:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Surgical air is specifically for orthopaedic and neurosurgical operating rooms</li>
            <li>All design flows are standardized at 350 L/min per terminal unit</li>
            <li>Choose appropriate formula based on total number of operating rooms in the department</li>
            <li>The calculator will warn if room count doesn't match the selected formula category</li>
            <li>Calculations based on Table 20 from medical gas pipeline design standards</li>
            <li>Global safety factor is applied to the total system flow</li>
            <li>Safety factor recommended: 1.3 for standard, 1.5-2.0 for critical applications</li>
          </ul>
          <p className="mt-3"><strong>Pressure Specification:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Surgical Air 700 kPa:</strong> High-pressure compressed air at 700 kPa (approximately 102 psi)</li>
            <li>Used specifically for pneumatic surgical tools and equipment</li>
            <li>Higher pressure than standard medical air (400 kPa) for specialized surgical applications</li>
          </ul>
          <p className="mt-3"><strong>Formula Selection Guide:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>For 1-4 operating rooms:</strong> Use "≤4 rooms" formula for more generous flow allowance</li>
            <li><strong>For 5+ operating rooms:</strong> Use "4 rooms" formula for more economical sizing</li>
            <li>The system provides warnings when room count doesn't match the formula category</li>
          </ul>
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default SurgicalAirFlowCalculator;