import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface AGSSFlowCalculatorProps {
  onShowTutorial?: () => void;
}

interface AGSSRoom {
  id: string;
  name: string;
  department: string;
  unitCount: number;
  roomCount: number;
  designFlowPerTerminal: number;
  diversifiedFlowPerRoom: number;
  totalDiversifiedFlow: number;
  formula: string;
  calculationSteps: string;
}

interface DepartmentType {
  name: string;
  formula: string;
  description: string;
  unitLabel: string;
}

const DEPARTMENT_TYPES: DepartmentType[] = [
  {
    name: 'Accident & emergency resuscitation room',
    formula: 'Q = V + [(n-1)*V/4]',
    description: 'Resuscitation room, per trolley space',
    unitLabel: 'trolley spaces'
  },
  {
    name: 'Operating departments',
    formula: 'Q = V + (nT-1)*V',
    description: 'Operating departments',
    unitLabel: 'theatres (nT)'
  },
  {
    name: 'Maternity operating suites',
    formula: 'Q = V + (nS-1)*V',
    description: 'Maternity operating suites',
    unitLabel: 'suites (nS)'
  },
  {
    name: 'Radiodiagnostic (all anaesthetic and procedures room)',
    formula: 'Q = V + [(n-1)*V/4]',
    description: 'All anaesthetic and procedures room',
    unitLabel: 'rooms'
  },
  {
    name: 'Oral surgery/orthodontic consulting rooms (type 1)',
    formula: 'Q = V + [(n-1)*V/4]',
    description: 'Consulting rooms, type 1',
    unitLabel: 'rooms'
  },
  {
    name: 'Other departments',
    formula: 'Q = V + [(n-1)*V/8]',
    description: 'Other departments',
    unitLabel: 'units'
  }
];

const AGSSFlowCalculator: React.FC<AGSSFlowCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Anaesthetic Gas Scavenging Systems (AGSS) Flow Sizing Calculator',
    discipline: 'electrical',
    calculatorType: 'agss-flow'
  });

  const [rooms, setRooms] = useState<AGSSRoom[]>([
    {
      id: '1',
      name: 'Operating Theatre',
      department: 'Operating departments',
      unitCount: 3,
      roomCount: 1,
      designFlowPerTerminal: 130,
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
  const [vValue, setVValue] = useState<number>(130); // V can be 130 or 80 L/min
  const [totalSystemFlow, setTotalSystemFlow] = useState<number>(0);
  const [totalSystemFlowWithSafety, setTotalSystemFlowWithSafety] = useState<number>(0);

  // Calculate diversified flow for a single room based on department type and count
  const calculateSingleRoomFlow = (department: string, unitCount: number, vVal: number): { flow: number; formula: string; steps: string } => {
    const deptType = DEPARTMENT_TYPES.find(d => d.name === department);
    if (!deptType) return { flow: 0, formula: 'Unknown department', steps: 'Department not found' };

    let flow = 0;
    let steps = '';
    const n = unitCount;
    const V = vVal;
    const formula = deptType.formula.replace(/V/g, `${V}`);

    switch (department) {
      case 'Accident & emergency resuscitation room':
      case 'Radiodiagnostic (all anaesthetic and procedures room)':
      case 'Oral surgery/orthodontic consulting rooms (type 1)':
        // Formula: Q = V + [(n-1)*V/4]
        flow = V + ((n - 1) * V) / 4;
        steps = `Q = V + [(n-1)×V/4]\n` +
                `Q = ${V} + [(${n}-1)×${V}/4]\n` +
                `Q = ${V} + [${n-1}×${V}/4]\n` +
                `Q = ${V} + ${(((n-1)*V)/4).toFixed(1)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating departments':
        // Formula: Q = V + (nT-1)*V
        flow = V + (n - 1) * V;
        steps = `Q = V + (nT-1)×V\n` +
                `Q = ${V} + (${n}-1)×${V}\n` +
                `Q = ${V} + ${(n-1)*V} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Maternity operating suites':
        // Formula: Q = V + (nS-1)*V
        flow = V + (n - 1) * V;
        steps = `Q = V + (nS-1)×V\n` +
                `Q = ${V} + (${n}-1)×${V}\n` +
                `Q = ${V} + ${(n-1)*V} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Other departments':
        // Formula: Q = V + [(n-1)*V/8]
        flow = V + ((n - 1) * V) / 8;
        steps = `Q = V + [(n-1)×V/8]\n` +
                `Q = ${V} + [(${n}-1)×${V}/8]\n` +
                `Q = ${V} + [${n-1}×${V}/8]\n` +
                `Q = ${V} + ${(((n-1)*V)/8).toFixed(1)} = ${flow.toFixed(1)} L/min`;
        break;
      
      default:
        // Default formula: Q = V + [(n-1)*V/4]
        flow = V + ((n - 1) * V) / 4;
        steps = `Q = V + [(n-1)×V/4]\n` +
                `Q = ${V} + [(${n}-1)×${V}/4]\n` +
                `Q = ${V} + [${n-1}×${V}/4]\n` +
                `Q = ${V} + ${(((n-1)*V)/4).toFixed(1)} = ${flow.toFixed(1)} L/min (default formula)`;
        break;
    }

    return { flow, formula: deptType.formula, steps };
  };

  // Calculate total diversified flow (no specific diversity rules mentioned for AGSS)
  const calculateTotalRoomFlow = (department: string, unitCount: number, roomCount: number, vVal: number): { totalFlow: number; perRoomFlow: number; formula: string; steps: string } => {
    const singleRoomResult = calculateSingleRoomFlow(department, unitCount, vVal);
    const Qw = singleRoomResult.flow; // Flow per room
    const nW = roomCount; // Number of rooms
    
    // No specific diversity rules mentioned for AGSS - simple multiplication
    const totalFlow = Qw * nW;
    const steps = `Single room flow: ${singleRoomResult.steps}\n` +
                  `Total for ${nW} rooms: ${Qw.toFixed(1)} × ${nW} = ${totalFlow.toFixed(1)} L/min`;

    return { 
      totalFlow, 
      perRoomFlow: Qw, 
      formula: singleRoomResult.formula + (nW > 1 ? ` (for ${nW} rooms)` : ''), 
      steps 
    };
  };

  // Calculate results whenever rooms or V value changes
  useEffect(() => {
    const updatedRooms = rooms.map(room => {
      const result = calculateTotalRoomFlow(room.department, room.unitCount, room.roomCount, vValue);
      
      return {
        ...room,
        designFlowPerTerminal: vValue,
        diversifiedFlowPerRoom: result.perRoomFlow,
        totalDiversifiedFlow: result.totalFlow,
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
  }, [rooms.length, rooms.map(r => `${r.department}-${r.unitCount}-${r.roomCount}`).join(','), globalSafetyFactor, vValue]);

  const addRoom = () => {
    const newRoom: AGSSRoom = {
      id: Date.now().toString(),
      name: `Room Type ${rooms.length + 1}`,
      department: 'Operating departments',
      unitCount: 1,
      roomCount: 1,
      designFlowPerTerminal: vValue,
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

  const updateRoom = (id: string, updates: Partial<AGSSRoom>) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, ...updates } : room
    ));
  };

  return (
    <CalculatorWrapper
      title="Anaesthetic Gas Scavenging Systems (AGSS) Flow Sizing"
      discipline="electrical"
      calculatorType="agss-flow"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
    <div className="bg-white rounded-lg shadow-lg p-6">
      
      {/* Global Parameters */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-medium text-lg mb-3">Global Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              V Value (Design Flow per Terminal Unit):
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="vValue"
                  value={130}
                  checked={vValue === 130}
                  onChange={(e) => setVValue(Number(e.target.value))}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">130 L/min</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="vValue"
                  value={80}
                  checked={vValue === 80}
                  onChange={(e) => setVValue(Number(e.target.value))}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">80 L/min</span>
              </label>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              V value for sizing the AGS disposal system pump
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <p className="text-xs text-gray-600 mt-1">
              Applied to total system flow
            </p>
          </div>
        </div>
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
                      <p className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-teal-100 text-teal-700">
                        AGSS (V = {vValue} L/min)
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
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of {deptType?.unitLabel || 'Units'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={room.unitCount}
                          onChange={(e) => updateRoom(room.id, { unitCount: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Department Instances
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={room.roomCount}
                          onChange={(e) => updateRoom(room.id, { roomCount: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-600">{deptType?.unitLabel || 'Units'}:</p>
                            <p className="font-semibold text-gray-800">{room.unitCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Department instances:</p>
                            <p className="font-semibold text-gray-800">{room.roomCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">V Value per Terminal:</p>
                            <p className="font-semibold text-gray-800">{room.designFlowPerTerminal} L/min</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Flow per department:</p>
                            <p className="font-semibold text-gray-800">{room.diversifiedFlowPerRoom.toFixed(1)} L/min</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Diversified Flow:</p>
                          <p className="font-semibold text-blue-600">{room.totalDiversifiedFlow.toFixed(1)} L/min</p>
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
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">Current V Value</p>
                <p className="text-lg font-bold text-teal-600">{vValue} L/min per terminal</p>
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
                    <p className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-teal-100 text-teal-700">
                      AGSS (V = {vValue} L/min)
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
                      <p className="text-gray-600">System Type:</p>
                      <p className="font-semibold text-xs px-2 py-1 rounded-full inline-block bg-teal-100 text-teal-700">
                        AGSS
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">{deptType?.unitLabel || 'Units'}:</p>
                      <p className="font-semibold text-gray-800">{room.unitCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Department instances:</p>
                      <p className="font-semibold text-gray-800">{room.roomCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">V Value per Terminal:</p>
                      <p className="font-semibold text-gray-800">{room.designFlowPerTerminal} L/min</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Flow per department:</p>
                      <p className="font-semibold text-gray-800">{room.diversifiedFlowPerRoom.toFixed(1)} L/min</p>
                    </div>
                    <div className="col-span-2">
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
        <h4 className="font-medium mb-2 text-yellow-800">Anaesthetic Gas Scavenging Systems (AGSS) Information</h4>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>Purpose:</strong></p>
          <p>AGSS removes waste anaesthetic gases from operating areas to protect healthcare workers from exposure to anaesthetic vapors.</p>
          
          <p className="mt-3"><strong>Legend:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Q</strong> = diversified flow for the department (L/min)</li>
            <li><strong>V</strong> = design flow for each terminal unit (130 L/min or 80 L/min)</li>
            <li><strong>n</strong> = number of units, trolley spaces, or rooms</li>
            <li><strong>nT</strong> = number of theatres within the department</li>
            <li><strong>nS</strong> = number of suites within the department</li>
          </ul>
          
          <p className="mt-3"><strong>V Value Selection:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>130 L/min:</strong> Higher capacity for larger facilities or higher gas usage</li>
            <li><strong>80 L/min:</strong> Standard capacity for most applications</li>
            <li>Selection depends on the specific requirements and AGS disposal system pump sizing</li>
          </ul>
          
          <p className="mt-3"><strong>Formula Variations:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Standard increment:</strong> Q = V + [(n-1)×V/4] for most departments</li>
            <li><strong>Full increment:</strong> Q = V + (nT-1)×V for operating departments</li>
            <li><strong>Suite increment:</strong> Q = V + (nS-1)×V for maternity operating suites</li>
            <li><strong>Reduced increment:</strong> Q = V + [(n-1)×V/8] for other departments</li>
          </ul>
          
          <p className="mt-3"><strong>Special Considerations:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>For each operating suite, assume two terminal units could be in use simultaneously</li>
            <li>For example, in anaesthetic room and operating room (receiving systems may be left connected when patients are transferred)</li>
            <li>Operating departments have the highest flow requirements due to multiple theatre usage</li>
            <li>System sizing is critical for maintaining negative pressure and effective gas removal</li>
          </ul>
          
          <p className="mt-3"><strong>Important Notes:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>V value is used for sizing the AGS disposal system pump</li>
            <li>All calculations assume simultaneous use potential for proper system sizing</li>
            <li>Safety factor application ensures adequate capacity for peak demand</li>
            <li>System must maintain continuous operation during all anaesthetic procedures</li>
            <li>Regular monitoring and maintenance required for effective operation</li>
          </ul>
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default AGSSFlowCalculator;