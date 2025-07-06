import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface VacuumFlowCalculatorProps {
  onShowTutorial?: () => void;
}

interface VacuumRoom {
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
  specialType?: 'no-flow' | 'dental-only' | 'reference' | 'residual';
}

const DEPARTMENT_TYPES: DepartmentType[] = [
  {
    name: 'In-patient accommodation - Ward unit',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Single ward unit'
  },
  {
    name: 'In-patient accommodation - Multiple ward units',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Multiple ward units'
  },
  {
    name: 'Accident & Emergency - Resuscitation room',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Resuscitation room, per trolley space'
  },
  {
    name: 'Accident & Emergency - Major treatment/plaster room',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Major treatment/plaster room, per trolley space'
  },
  {
    name: 'Accident & Emergency - Post-anaesthesia recovery',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Post-anaesthesia recovery, per trolley space'
  },
  {
    name: 'Accident & Emergency - Treatment room/cubicle',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/8]',
    description: 'Treatment room/cubicle'
  },
  {
    name: 'Operating - Anaesthetic rooms',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Anaesthetic rooms (no additional flow)',
    specialType: 'no-flow'
  },
  {
    name: 'Operating - Operating rooms (Anaesthetist)',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Operating rooms - Anaesthetist'
  },
  {
    name: 'Operating - Operating rooms (Surgeon)',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Operating rooms - Surgeon'
  },
  {
    name: 'Operating - Operating suites',
    designFlow: 40,
    formula: 'Q = 80 + [(nS-1)*80/2]',
    description: 'Operating suites'
  },
  {
    name: 'Operating - Post-anaesthesia recovery',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Post-anaesthesia recovery'
  },
  {
    name: 'Maternity - LDRP rooms (Mother)',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'LDRP rooms - Mother'
  },
  {
    name: 'Maternity - LDRP rooms (Baby)',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'LDRP rooms - Baby (no additional flow)',
    specialType: 'no-flow'
  },
  {
    name: 'Maternity - Operating suites (Anaesthetist)',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Operating suites - Anaesthetist'
  },
  {
    name: 'Maternity - Operating suites (Obstetrician)',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Operating suites - Obstetrician'
  },
  {
    name: 'Maternity - Operating suites',
    designFlow: 40,
    formula: 'Q = 80 + [(nS-1)*80/2]',
    description: 'Operating suites'
  },
  {
    name: 'Maternity - Post-anaesthesia recovery',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Post-anaesthesia recovery'
  },
  {
    name: 'In-patient accommodation - Psychiatric ward',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Psychiatric ward, including single, multi-bed and treatment room'
  },
  {
    name: 'In-patient accommodation - Multi-ward units',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/2]',
    description: 'Multi-ward units'
  },
  {
    name: 'In-patient accommodation - Nursery',
    designFlow: 40,
    formula: 'Q = 40',
    description: 'Nursery, per cot space (no additional flow)',
    specialType: 'no-flow'
  },
  {
    name: 'In-patient accommodation - SCBU',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Special Care Baby Unit'
  },
  {
    name: 'Radiology/diagnostic - All anaesthetic and procedures rooms',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/8]',
    description: 'All anaesthetic and procedures rooms'
  },
  {
    name: 'Critical care areas',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Critical care areas'
  },
  {
    name: 'High-dependency units',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'High-dependency units'
  },
  {
    name: 'Renal',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Renal departments'
  },
  {
    name: 'Adult mental illness - ECT room',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Electro convulsive therapy room'
  },
  {
    name: 'Adult mental illness - Post-anaesthesia',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Post-anaesthesia, per bed space'
  },
  {
    name: 'Adult acute day care - Treatment rooms',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/4]',
    description: 'Treatment rooms'
  },
  {
    name: 'Adult acute day care - Post-anaesthesia recovery',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/8]',
    description: 'Post-anaesthesia recovery per bed space'
  },
  {
    name: 'Day patient accommodation',
    designFlow: 40,
    formula: 'As "In-patient accommodation"',
    description: 'Day patient accommodation (refer to in-patient)',
    specialType: 'reference'
  },
  {
    name: 'Oral surgery/orthodontic - Consulting rooms type 1',
    designFlow: 40,
    formula: 'Dental vacuum only',
    description: 'Consulting rooms, type 1 (dental vacuum only)',
    specialType: 'dental-only'
  },
  {
    name: 'Oral surgery/orthodontic - Consulting rooms type 2 & 3',
    designFlow: 40,
    formula: 'Dental vacuum only',
    description: 'Consulting rooms, type 2 & 3 (dental vacuum only)',
    specialType: 'dental-only'
  },
  {
    name: 'Oral surgery/orthodontic - Recovery room',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/8]',
    description: 'Recovery room, per bed space'
  },
  {
    name: 'Out-patient - Treatment rooms',
    designFlow: 40,
    formula: 'Q = 40 + [(n-1)*40/8]',
    description: 'Treatment rooms'
  },
  {
    name: 'Equipment service rooms',
    designFlow: 40,
    formula: 'Residual capacity adequate',
    description: 'Equipment service rooms, sterile services etc',
    specialType: 'residual'
  }
];

const VacuumFlowCalculator: React.FC<VacuumFlowCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Medical Vacuum Gas Flow Sizing Calculator',
    discipline: 'electrical',
    calculatorType: 'vacuum-flow'
  });

  const [rooms, setRooms] = useState<VacuumRoom[]>([
    {
      id: '1',
      name: 'General Ward',
      department: 'In-patient accommodation - Multiple ward units',
      bedCount: 4,
      roomCount: 10,
      designFlowPerTerminal: 40,
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

    // Handle special types
    if (deptType.specialType === 'dental-only') {
      flow = 0;
      steps = `Dental vacuum only - not included in medical vacuum calculation`;
      return { flow, formula, steps };
    }

    if (deptType.specialType === 'residual') {
      flow = 0;
      steps = `Residual capacity will be adequate without additional allowance`;
      return { flow, formula, steps };
    }

    if (deptType.specialType === 'reference') {
      flow = 0;
      steps = `Refer to "In-patient accommodation" calculations`;
      return { flow, formula, steps };
    }

    switch (department) {
      case 'In-patient accommodation - Ward unit':
      case 'Operating - Anaesthetic rooms':
      case 'Operating - Operating rooms (Anaesthetist)':
      case 'Operating - Operating rooms (Surgeon)':
      case 'Maternity - LDRP rooms (Baby)':
      case 'Maternity - Operating suites (Anaesthetist)':
      case 'Maternity - Operating suites (Obstetrician)':
      case 'In-patient accommodation - Psychiatric ward':
      case 'In-patient accommodation - Nursery':
        // Formula: Q = 40 (fixed rate, no additional flow)
        flow = 40;
        steps = `Q = 40 L/min (fixed rate, no additional flow for multiple units)`;
        break;
      
      case 'In-patient accommodation - Multiple ward units':
      case 'Accident & Emergency - Resuscitation room':
      case 'Accident & Emergency - Major treatment/plaster room':
      case 'Accident & Emergency - Post-anaesthesia recovery':
      case 'Operating - Post-anaesthesia recovery':
      case 'Maternity - LDRP rooms (Mother)':
      case 'Maternity - Post-anaesthesia recovery':
      case 'In-patient accommodation - SCBU':
      case 'Critical care areas':
      case 'High-dependency units':
      case 'Renal':
      case 'Adult mental illness - ECT room':
      case 'Adult mental illness - Post-anaesthesia':
      case 'Adult acute day care - Treatment rooms':
        // Formula: Q = 40 + [(n-1)*40/4]
        flow = 40 + ((n - 1) * 40) / 4;
        steps = `Q = 40 + [(${n}-1)×40/4] = 40 + [${n-1}×40/4] = 40 + ${(((n-1)*40)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Accident & Emergency - Treatment room/cubicle':
      case 'Radiology/diagnostic - All anaesthetic and procedures rooms':
      case 'Adult acute day care - Post-anaesthesia recovery':
      case 'Oral surgery/orthodontic - Recovery room':
      case 'Out-patient - Treatment rooms':
        // Formula: Q = 40 + [(n-1)*40/8]
        flow = 40 + ((n - 1) * 40) / 8;
        steps = `Q = 40 + [(${n}-1)×40/8] = 40 + [${n-1}×40/8] = 40 + ${(((n-1)*40)/8).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating - Operating suites':
      case 'Maternity - Operating suites':
        // Formula: Q = 80 + [(nS-1)*80/2]
        flow = 80 + ((n - 1) * 80) / 2;
        steps = `Q = 80 + [(nS-1)×80/2] = 80 + [(${n}-1)×80/2] = 80 + [${n-1}×80/2] = 80 + ${(((n-1)*80)/2).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'In-patient accommodation - Multi-ward units':
        // Formula: Q = 40 + [(n-1)*40/2]
        flow = 40 + ((n - 1) * 40) / 2;
        steps = `Q = 40 + [(${n}-1)×40/2] = 40 + [${n-1}×40/2] = 40 + ${(((n-1)*40)/2).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      default:
        // Default formula: Q = 40 + [(n-1)*40/4]
        flow = 40 + ((n - 1) * 40) / 4;
        steps = `Q = 40 + [(${n}-1)×40/4] = 40 + [${n-1}×40/4] = 40 + ${(((n-1)*40)/4).toFixed(2)} = ${flow.toFixed(1)} L/min (default formula)`;
        break;
    }

    return { flow, formula, steps };
  };

  // Calculate total diversified flow (no specific diversity rules mentioned for vacuum)
  const calculateTotalRoomFlow = (department: string, bedCount: number, roomCount: number): { totalFlow: number; perRoomFlow: number; formula: string; steps: string } => {
    const singleRoomResult = calculateSingleRoomFlow(department, bedCount);
    const Qw = singleRoomResult.flow; // Flow per room
    const nW = roomCount; // Number of rooms
    
    // No specific diversity rules mentioned for vacuum - simple multiplication
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
        designFlowPerTerminal: deptType?.designFlow || 40,
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
    const newRoom: VacuumRoom = {
      id: Date.now().toString(),
      name: `Room Type ${rooms.length + 1}`,
      department: 'Critical care areas',
      bedCount: 1,
      roomCount: 1,
      designFlowPerTerminal: 40,
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

  const updateRoom = (id: string, updates: Partial<VacuumRoom>) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, ...updates } : room
    ));
  };

  // Group departments by category for better organization
  const getGroupedDepartments = () => {
    const groups = {
      'In-patient Accommodation': DEPARTMENT_TYPES.filter(d => d.name.startsWith('In-patient accommodation')),
      'Accident & Emergency': DEPARTMENT_TYPES.filter(d => d.name.startsWith('Accident & Emergency')),
      'Operating': DEPARTMENT_TYPES.filter(d => d.name.startsWith('Operating')),
      'Maternity': DEPARTMENT_TYPES.filter(d => d.name.startsWith('Maternity')),
      'Critical Care': DEPARTMENT_TYPES.filter(d => d.name.includes('Critical care') || d.name.includes('High-dependency')),
      'Specialized': DEPARTMENT_TYPES.filter(d => d.name.startsWith('Radiology') || d.name.startsWith('Renal') || d.name.startsWith('Adult') || d.name.startsWith('Day patient')),
      'Oral Surgery': DEPARTMENT_TYPES.filter(d => d.name.startsWith('Oral surgery')),
      'Out-patient & Other': DEPARTMENT_TYPES.filter(d => d.name.startsWith('Out-patient') || d.name.startsWith('Equipment'))
    };
    return groups;
  };

  const groupedDepartments = getGroupedDepartments();

  return (
    <CalculatorWrapper
      title="Medical Vacuum Gas Flow Sizing"
      discipline="electrical"
      calculatorType="vacuum-flow"
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
                        deptType?.specialType === 'dental-only' ? 'bg-yellow-100 text-yellow-700' :
                        deptType?.specialType === 'residual' ? 'bg-gray-100 text-gray-700' :
                        deptType?.specialType === 'reference' ? 'bg-blue-100 text-blue-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {deptType?.specialType === 'dental-only' ? 'Dental Vacuum Only' :
                         deptType?.specialType === 'residual' ? 'Residual Capacity' :
                         deptType?.specialType === 'reference' ? 'Reference Type' :
                         'Medical Vacuum'}
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
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Object.entries(groupedDepartments).map(([groupName, depts]) => (
                            <div key={groupName}>
                              <p className="text-sm font-medium text-gray-600 mb-1">{groupName}</p>
                              <select
                                value={depts.find(d => d.name === room.department) ? room.department : ''}
                                onChange={(e) => e.target.value && updateRoom(room.id, { department: e.target.value })}
                                className="w-full p-2 mb-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                              >
                                <option value="">Select {groupName}...</option>
                                {depts.map(dept => (
                                  <option key={dept.name} value={dept.name}>
                                    {dept.name.replace(`${dept.name.split(' - ')[0]} - `, '')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {!deptType?.specialType && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Beds/Spaces/Units (per room)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={room.bedCount}
                            onChange={(e) => updateRoom(room.id, { bedCount: Number(e.target.value) })}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}
                      
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
                        {!deptType?.specialType && (
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
                        )}
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
                      deptType?.specialType === 'dental-only' ? 'bg-yellow-100 text-yellow-700' :
                      deptType?.specialType === 'residual' ? 'bg-gray-100 text-gray-700' :
                      deptType?.specialType === 'reference' ? 'bg-blue-100 text-blue-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {deptType?.specialType === 'dental-only' ? 'Dental Vacuum Only' :
                       deptType?.specialType === 'residual' ? 'Residual Capacity' :
                       deptType?.specialType === 'reference' ? 'Reference Type' :
                       'Medical Vacuum'}
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
                      <p className="text-gray-600">Vacuum Type:</p>
                      <p className={`font-semibold text-xs px-2 py-1 rounded-full inline-block ${
                        deptType?.specialType === 'dental-only' ? 'bg-yellow-100 text-yellow-700' :
                        deptType?.specialType === 'residual' ? 'bg-gray-100 text-gray-700' :
                        deptType?.specialType === 'reference' ? 'bg-blue-100 text-blue-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {deptType?.specialType === 'dental-only' ? 'Dental Only' :
                         deptType?.specialType === 'residual' ? 'Residual' :
                         deptType?.specialType === 'reference' ? 'Reference' :
                         'Medical Vacuum'}
                      </p>
                    </div>
                    {!deptType?.specialType && (
                      <>
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
                      </>
                    )}
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
        <h4 className="font-medium mb-2 text-yellow-800">Medical Vacuum Flow Information</h4>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>Legend:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Q</strong> = diversified flow for the department (L/min)</li>
            <li><strong>n</strong> = number of beds, treatment spaces, trolley spaces, or single rooms</li>
            <li><strong>nS</strong> = number of suites within the department</li>
          </ul>
          <p className="mt-3"><strong>Formula Variations:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Standard formula:</strong> Q = 40 + [(n-1)×40/4] for most departments</li>
            <li><strong>Reduced increment:</strong> Q = 40 + [(n-1)×40/8] for treatment rooms and recovery areas</li>
            <li><strong>Increased increment:</strong> Q = 40 + [(n-1)×40/2] for multi-ward units</li>
            <li><strong>Operating suites:</strong> Q = 80 + [(nS-1)×80/2] with higher base flow</li>
            <li><strong>Fixed flow:</strong> Q = 40 L/min for single units or no additional flow requirements</li>
          </ul>
          <p className="mt-3"><strong>Special Categories:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dental Vacuum Only:</strong> Separate dental vacuum system, not included in medical vacuum calculations</li>
            <li><strong>Residual Capacity:</strong> Equipment service rooms use residual capacity without additional allowance</li>
            <li><strong>Reference Types:</strong> Day patient accommodation refers to in-patient calculations</li>
            <li><strong>No Additional Flow:</strong> Some departments have fixed flow regardless of unit count</li>
          </ul>
          <p className="mt-3"><strong>Important Notes:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All design flows standardized at 40 L/min per terminal unit (except operating suites)</li>
            <li>Operating suites have specialized higher flow requirements</li>
            <li>Calculations based on Table 21 from medical gas pipeline design standards</li>
            <li>Dental vacuum is typically a separate system from medical vacuum</li>
            <li>Global safety factor is applied to the total system flow</li>
            <li>Safety factor recommended: 1.3 for standard, 1.5-2.0 for critical applications</li>
          </ul>
          <p className="mt-3"><strong>System Applications:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Medical vacuum is used for surgical suction, patient suction, and laboratory applications</li>
            <li>Different from dental vacuum which is used specifically for dental procedures</li>
            <li>Operating rooms may require both anaesthetist and surgeon vacuum outlets</li>
          </ul>
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default VacuumFlowCalculator;