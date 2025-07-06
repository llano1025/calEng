import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface NitrousOxideFlowCalculatorProps {
  onShowTutorial?: () => void;
}

interface NitrousOxideRoom {
  id: string;
  name: string;
  department: string;
  bedCount: number;
  roomCount: number;
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
  gasType: 'nitrous-oxide' | 'nitrous-oxygen-mixture';
}

const DEPARTMENT_TYPES: DepartmentType[] = [
  // Nitrous Oxide (Table 15)
  {
    name: 'Accident & Emergency - Resuscitation room',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Resuscitation room, per trolley space',
    gasType: 'nitrous-oxide'
  },
  {
    name: 'Operating',
    designFlow: 15,
    formula: 'Q = 15 + [(nT-1)*6]',
    description: 'Operating rooms',
    gasType: 'nitrous-oxide'
  },
  {
    name: 'Maternity - Operating suites',
    designFlow: 15,
    formula: 'Q = 15 + (nS-1)*6',
    description: 'Maternity operating suites',
    gasType: 'nitrous-oxide'
  },
  {
    name: 'Radiological - All anaesthetic and procedures rooms',
    designFlow: 15,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'All anaesthetic and procedures rooms',
    gasType: 'nitrous-oxide'
  },
  {
    name: 'Critical care areas',
    designFlow: 15,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Critical care areas',
    gasType: 'nitrous-oxide'
  },
  {
    name: 'Oral surgery/orthodontic - Consulting rooms type 1',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Consulting rooms, type 1',
    gasType: 'nitrous-oxide'
  },
  {
    name: 'Other departments',
    designFlow: 10,
    formula: 'Q = 10',
    description: 'Other departments (no additional flow)',
    gasType: 'nitrous-oxide'
  },
  {
    name: 'Equipment service rooms - Nitrous oxide',
    designFlow: 15,
    formula: 'Q = 15',
    description: 'Equipment service rooms (no additional flow)',
    gasType: 'nitrous-oxide'
  },
  
  // Nitrous Oxide/Oxygen Mixtures (Table 16)
  {
    name: 'Maternity - LDRP rooms (≤12 rooms), mother',
    designFlow: 275,
    formula: 'Q = 275 + [(n-1)*6/2]',
    description: '<12 LDRP room(s), mother',
    gasType: 'nitrous-oxygen-mixture'
  },
  {
    name: 'Maternity - LDRP rooms (>12 rooms)',
    designFlow: 275,
    formula: 'Q = 275*2 + [(n-1)*6/2]',
    description: '>12 LDRP rooms',
    gasType: 'nitrous-oxygen-mixture'
  },
  {
    name: 'Other areas - Nitrous oxide/oxygen mixture',
    designFlow: 20,
    formula: 'Q = 20 + [(n-1)*10/4]',
    description: 'Other areas',
    gasType: 'nitrous-oxygen-mixture'
  },
  {
    name: 'Equipment service rooms - Nitrous oxide/oxygen mixture',
    designFlow: 275,
    formula: 'Q = 275',
    description: 'Equipment service rooms (no additional flow)',
    gasType: 'nitrous-oxygen-mixture'
  }
];

const NitrousOxideFlowCalculator: React.FC<NitrousOxideFlowCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Medical Nitrous Oxide Gas Flow Sizing Calculator',
    discipline: 'electrical',
    calculatorType: 'nitrous-oxide-flow'
  });

  const [rooms, setRooms] = useState<NitrousOxideRoom[]>([
    {
      id: '1',
      name: 'Operating Room',
      department: 'Operating',
      bedCount: 2,
      roomCount: 4,
      designFlowPerTerminal: 15,
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

  // Calculate diversified flow for a single room based on department type and count
  const calculateSingleRoomFlow = (department: string, bedCount: number): { flow: number; formula: string; steps: string } => {
    const deptType = DEPARTMENT_TYPES.find(d => d.name === department);
    if (!deptType) return { flow: 0, formula: 'Unknown department', steps: 'Department not found' };

    let flow = 0;
    let steps = '';
    const n = bedCount;
    const formula = deptType.formula;

    switch (department) {
      case 'Accident & Emergency - Resuscitation room':
        // Formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating':
        // Formula: Q = 15 + [(nS-1)*6/3]
        flow = 15 + ((n - 1) * 6);
        steps = `Q = 15 + [(nS-1)×6] = 15 + [(${n}-1)×6/3] = 15 + [${n-1}×6] = 15 + ${(((n-1)*6)).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Maternity - Operating suites':
        // Formula: Q = 15 + (nS-1)*6
        flow = 15 + (n - 1) * 6;
        steps = `Q = 15 + (nS-1)×6 = 15 + (${n}-1)×6 = 15 + ${(n-1)*6} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Radiological - All anaesthetic and procedures rooms':
      case 'Critical care areas':
      case 'Oral surgery/orthodontic - Consulting rooms type 1':
        // Formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Other departments':
        // Formula: Q = 10 (no additional flow)
        flow = 10;
        steps = `Q = 10 L/min (fixed rate, no additional flow for multiple units)`;
        break;
      
      case 'Equipment service rooms - Nitrous oxide':
        // Formula: Q = 15 (no additional flow)
        flow = 15;
        steps = `Q = 15 L/min (fixed rate, no additional flow for multiple units)`;
        break;
      
      case 'Maternity - LDRP rooms (≤12 rooms), mother':
        // Formula: Q = 275 + [(n-1)*6/2]
        flow = 275 + ((n - 1) * 6) / 2;
        steps = `Q = 275 + [(${n}-1)×6/2] = 275 + [${n-1}×6/2] = 275 + ${(((n-1)*6)/2).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Maternity - LDRP rooms (>12 rooms)':
        // Formula: Q = 275*2 + [(n-1)*6/2]
        flow = 275 * 2 + ((n - 1) * 6) / 2;
        steps = `Q = 275×2 + [(${n}-1)×6/2] = 550 + [${n-1}×6/2] = 550 + ${(((n-1)*6)/2).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Other areas - Nitrous oxide/oxygen mixture':
        // Formula: Q = 20 + [(n-1)*10/4]
        flow = 20 + ((n - 1) * 10) / 4;
        steps = `Q = 20 + [(${n}-1)×10/4] = 20 + [${n-1}×10/4] = 20 + ${(((n-1)*10)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Equipment service rooms - Nitrous oxide/oxygen mixture':
        // Formula: Q = 275 (no additional flow)
        flow = 275;
        steps = `Q = 275 L/min (fixed rate, no additional flow for multiple units)`;
        break;
      
      default:
        // Default formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min (default formula)`;
        break;
    }

    return { flow, formula, steps };
  };

  // Calculate total diversified flow (no specific diversity rules mentioned for nitrous oxide)
  const calculateTotalRoomFlow = (department: string, bedCount: number, roomCount: number): { totalFlow: number; perRoomFlow: number; formula: string; steps: string } => {
    const singleRoomResult = calculateSingleRoomFlow(department, bedCount);
    const Qw = singleRoomResult.flow; // Flow per room
    const nW = roomCount; // Number of rooms
    
    // No specific diversity rules mentioned for nitrous oxide - simple multiplication
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

  // Calculate results whenever rooms change
  useEffect(() => {
    const updatedRooms = rooms.map(room => {
      const result = calculateTotalRoomFlow(room.department, room.bedCount, room.roomCount);
      const deptType = DEPARTMENT_TYPES.find(d => d.name === room.department);
      
      return {
        ...room,
        designFlowPerTerminal: deptType?.designFlow || 10,
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
  }, [rooms.length, rooms.map(r => `${r.department}-${r.bedCount}-${r.roomCount}`).join(','), globalSafetyFactor]);

  const addRoom = () => {
    const newRoom: NitrousOxideRoom = {
      id: Date.now().toString(),
      name: `Room Type ${rooms.length + 1}`,
      department: 'Critical care areas',
      bedCount: 1,
      roomCount: 1,
      designFlowPerTerminal: 15,
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

  const updateRoom = (id: string, updates: Partial<NitrousOxideRoom>) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, ...updates } : room
    ));
  };

  // Group departments by gas type
  const nitrousOxideDepts = DEPARTMENT_TYPES.filter(d => d.gasType === 'nitrous-oxide');
  const nitrousOxygenMixtureDepts = DEPARTMENT_TYPES.filter(d => d.gasType === 'nitrous-oxygen-mixture');

  return (
    <CalculatorWrapper
      title="Medical Nitrous Oxide Gas Flow Sizing"
      discipline="electrical"
      calculatorType="nitrous-oxide-flow"
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
            <h3 className="font-medium text-lg">Room Configuration</h3>
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
                      <p className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                        deptType?.gasType === 'nitrous-oxide' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {deptType?.gasType === 'nitrous-oxide' ? 'N₂O' : 'N₂O/O₂ Mix'}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department Type</label>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Nitrous Oxide (N₂O)</p>
                            <select
                              value={nitrousOxideDepts.find(d => d.name === room.department) ? room.department : ''}
                              onChange={(e) => e.target.value && updateRoom(room.id, { department: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Nitrous Oxide Department...</option>
                              {nitrousOxideDepts.map(dept => (
                                <option key={dept.name} value={dept.name}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-orange-600 mb-1">Nitrous Oxide/Oxygen Mixture (N₂O/O₂)</p>
                            <select
                              value={nitrousOxygenMixtureDepts.find(d => d.name === room.department) ? room.department : ''}
                              onChange={(e) => e.target.value && updateRoom(room.id, { department: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select N₂O/O₂ Mixture Department...</option>
                              {nitrousOxygenMixtureDepts.map(dept => (
                                <option key={dept.name} value={dept.name}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Units/Spaces/Suites (per room)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={room.bedCount}
                          onChange={(e) => updateRoom(room.id, { bedCount: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Rooms of This Type
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
                            <p className="text-gray-600">Units per room:</p>
                            <p className="font-semibold text-gray-800">{room.bedCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Number of rooms:</p>
                            <p className="font-semibold text-gray-800">{room.roomCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Design Flow per Terminal:</p>
                            <p className="font-semibold text-gray-800">{room.designFlowPerTerminal} L/min</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Flow per room:</p>
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
            </div>
          </div>
          
          {/* Individual Room Calculations */}
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
                    <p className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                      deptType?.gasType === 'nitrous-oxide' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {deptType?.gasType === 'nitrous-oxide' ? 'N₂O' : 'N₂O/O₂ Mix'}
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
                      <p className={`font-semibold text-xs px-2 py-1 rounded-full inline-block ${
                        deptType?.gasType === 'nitrous-oxide' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {deptType?.gasType === 'nitrous-oxide' ? 'Nitrous Oxide' : 'N₂O/O₂ Mixture'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Units per room:</p>
                      <p className="font-semibold text-gray-800">{room.bedCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Number of rooms:</p>
                      <p className="font-semibold text-gray-800">{room.roomCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Design Flow per Terminal:</p>
                      <p className="font-semibold text-gray-800">{room.designFlowPerTerminal} L/min</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Flow per room:</p>
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
        <h4 className="font-medium mb-2 text-yellow-800">Nitrous Oxide Gas Flow Information</h4>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>Legend:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Q</strong> = diversified flow for the department (L/min)</li>
            <li><strong>n</strong> = number of units, treatment spaces, trolley spaces, or rooms</li>
            <li><strong>nS</strong> = number of suites within the department</li>
          </ul>
          <p className="mt-3"><strong>Gas Types:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Nitrous Oxide (N₂O):</strong> Pure nitrous oxide for medical applications</li>
            <li><strong>Nitrous Oxide/Oxygen Mixture (N₂O/O₂):</strong> Pre-mixed gas for specific applications like maternity</li>
          </ul>
          <p className="mt-3"><strong>Notes:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Calculations based on Table 15 and Table 16 from medical gas pipeline design standards</li>
            <li>Design flow per terminal is the maximum flow rate per outlet</li>
            <li>Some departments have "no additional flow" meaning the flow is fixed regardless of unit count</li>
            <li>LDRP = Labor, Delivery, Recovery, and Postpartum rooms</li>
            <li>For maternity LDRP rooms: use "≤12 rooms" formula for 12 or fewer rooms, "12 rooms" formula for more than 12 rooms</li>
            <li>Global safety factor is applied to the total system flow</li>
            <li>Safety factor recommended: 1.3 for standard, 1.5-2.0 for critical applications</li>
          </ul>
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default NitrousOxideFlowCalculator;