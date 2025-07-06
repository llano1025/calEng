import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface OxygenFlowCalculatorProps {
  onShowTutorial?: () => void;
}

interface OxygenRoom {
  id: string;
  name: string;
  department: string;
  bedCount: number;
  roomCount: number; // Number of rooms of this type
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
}

const DEPARTMENT_TYPES: DepartmentType[] = [
  {
    name: 'In-patient accommodation (ward units) - Single 4-bed room',
    designFlow: 10,
    formula: 'Qd = 10 + [(n-1)*6/4]',
    description: 'Single 4-bed room and treatment room, Ward block/department'
  },
  {
    name: 'Accident & Emergency - Resuscitation room',
    designFlow: 100,
    formula: 'Q = 100 + [(n-1)*6/4]',
    description: 'Resuscitation room, trolley space'
  },
  {
    name: 'Accident & Emergency - Major treatment',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Major treatment plaster room, per trolley space'
  },
  {
    name: 'Accident & Emergency - Post-anaesthesia',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/8]',
    description: 'Post-anaesthesia recovery per trolley space'
  },
  {
    name: 'Accident & Emergency - Treatment room/cubicle',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/10]',
    description: 'Relative comfort/shock'
  },
  {
    name: 'Operating - Anaesthetic rooms',
    designFlow: 100,
    formula: 'Q = 100',
    description: 'Anaesthetic rooms'
  },
  {
    name: 'Operating - Operating rooms',
    designFlow: 100,
    formula: 'Q = 100 + (nT-1)*10',
    description: 'Operating rooms'
  },
  {
    name: 'Operating - Post-anaesthesia recovery',
    designFlow: 10,
    formula: 'Q = 10 + (n-1)*6',
    description: 'Post-anaesthesia recovery'
  },
  {
    name: 'Maternity - LDRP Mother rooms',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'LDRP Mother rooms'
  },
  {
    name: 'Maternity - LDRP Baby rooms',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*3/2]',
    description: 'LDRP Baby rooms'
  },
  {
    name: 'Operating suites - Anaesthetist',
    designFlow: 100,
    formula: 'Q = 100 + (nS-1)/6',
    description: 'Anaesthetist'
  },
  {
    name: 'Operating suites - Paediatrician',
    designFlow: 10,
    formula: 'Q = 10 + (n-1)/3',
    description: 'Paediatrician'
  },
  {
    name: 'Operating suites - Post-anaesthesia recovery',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*3/4]',
    description: 'Post-anaesthesia recovery'
  },
  {
    name: 'In-patient accommodation - Single/multi-bed space',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/6]',
    description: 'Single/multi-bed space'
  },
  {
    name: 'In-patient accommodation - Nursery',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*3/2]',
    description: 'Nursery, per cot space'
  },
  {
    name: 'In-patient accommodation - Special care baby',
    designFlow: 10,
    formula: 'Q = 10 + (n-1)*6',
    description: 'Special care baby unit'
  },
  {
    name: 'Radiological',
    designFlow: 100,
    formula: 'Q = 10 + [(n-1)*6/3]',
    description: 'All anaesthetic and procedures rooms'
  },
  {
    name: 'Critical care areas',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/3/4]',
    description: 'Critical care areas'
  },
  {
    name: 'Coronary care unit (CCU)',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/3/4]',
    description: 'Coronary care unit'
  },
  {
    name: 'High-dependency unit (HDU)',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/3/4]',
    description: 'High-dependency unit'
  },
  {
    name: 'Renal',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Renal'
  },
  {
    name: 'CPAP ventilation',
    designFlow: 75,
    formula: 'Q = 75*n x 0.75',
    description: 'CPAP ventilation'
  },
  {
    name: 'Adult mental illness - Electro convulsive',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Electro convulsive therapy (ECT) room'
  },
  {
    name: 'Adult mental illness - Post-anaesthesia',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Post-anaesthesia, per bed space'
  },
  {
    name: 'Adult acute day care - Treatment',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Treatment rooms'
  },
  {
    name: 'Adult acute day care - Post-anaesthesia',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Post-anaesthesia, per bed space'
  },
  {
    name: 'Oral surgery/orthodontic - Consulting rooms type 1',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/2]',
    description: 'Consulting rooms, type 1'
  },
  {
    name: 'Oral surgery/orthodontic - Consulting rooms type 2 & 3',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/3]',
    description: 'Consulting rooms, type 2 & 3'
  },
  {
    name: 'Oral surgery/orthodontic - Recovery room',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/6]',
    description: 'Recovery room, multi-bed'
  },
  {
    name: 'Out-patient - Treatment rooms',
    designFlow: 10,
    formula: 'Q = 10 + [(n-1)*6/4]',
    description: 'Treatment rooms'
  },
  {
    name: 'Equipment service rooms',
    designFlow: 100,
    formula: 'Q = 100',
    description: 'Equipment service rooms, sterile services etc'
  }
];

const OxygenFlowCalculator: React.FC<OxygenFlowCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Medical Oxygen Gas Flow Sizing Calculator',
    discipline: 'electrical',
    calculatorType: 'oxygen-flow'
  });
  const [rooms, setRooms] = useState<OxygenRoom[]>([
    {
      id: '1',
      name: 'General Ward',
      department: 'In-patient accommodation (ward units) - Single 4-bed room',
      bedCount: 12,
      roomCount: 20,
      designFlowPerTerminal: 10,
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

  // Calculate diversified flow for a single room/ward based on department type and bed count
  const calculateSingleRoomFlow = (department: string, bedCount: number): { flow: number; formula: string; steps: string } => {
    const deptType = DEPARTMENT_TYPES.find(d => d.name === department);
    if (!deptType) return { flow: 0, formula: 'Unknown department', steps: 'Department not found' };

    let flow = 0;
    let steps = '';
    const n = bedCount;
    const formula = deptType.formula;

    switch (department) {
      case 'In-patient accommodation (ward units) - Single 4-bed room':
        // Formula: Qd = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Qd = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Accident & Emergency - Resuscitation room':
        // Formula: Q = 100 + [(n-1)*6/4]
        flow = 100 + ((n - 1) * 6) / 4;
        steps = `Q = 100 + [(${n}-1)×6/4] = 100 + [${n-1}×6/4] = 100 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Accident & Emergency - Major treatment':
        // Formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Accident & Emergency - Post-anaesthesia':
        // Formula: Q = 10 + [(n-1)*6/8]
        flow = 10 + ((n - 1) * 6) / 8;
        steps = `Q = 10 + [(${n}-1)×6/8] = 10 + [${n-1}×6/8] = 10 + ${(((n-1)*6)/8).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Accident & Emergency - Treatment room/cubicle':
        // Formula: Q = 10 + [(n-1)*6/10]
        flow = 10 + ((n - 1) * 6) / 10;
        steps = `Q = 10 + [(${n}-1)×6/10] = 10 + [${n-1}×6/10] = 10 + ${(((n-1)*6)/10).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating - Anaesthetic rooms':
        // Formula: Q = 100
        flow = 100;
        steps = `Q = 100 L/min (fixed rate for anaesthetic rooms)`;
        break;
      
      case 'Operating - Operating rooms':
        // Formula: Q = 100 + (nT-1)*10
        flow = 100 + (n - 1) * 10;
        steps = `Q = 100 + (nT-1)×10 = 100 + (${n}-1)×10 = 100 + ${(n-1)*10} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating - Post-anaesthesia recovery':
        // Formula: Q = 10 + (n-1)*6
        flow = 10 + (n - 1) * 6;
        steps = `Q = 10 + (${n}-1)×6 = 10 + ${(n-1)*6} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Maternity - LDRP Mother rooms':
        // Formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Maternity - LDRP Baby rooms':
        // Formula: Q = 10 + [(n-1)*3/2]
        flow = 10 + ((n - 1) * 3) / 2;
        steps = `Q = 10 + [(${n}-1)×3/2] = 10 + [${n-1}×3/2] = 10 + ${(((n-1)*3)/2).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating suites - Anaesthetist':
        // Formula: Q = 100 + (nS-1)/6
        flow = 100 + (n - 1) / 6;
        steps = `Q = 100 + (nS-1)/6 = 100 + (${n}-1)/6 = 100 + ${((n-1)/6).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating suites - Paediatrician':
        // Formula: Q = 10 + (n-1)/3
        flow = 10 + (n - 1) / 3;
        steps = `Q = 10 + (${n}-1)/3 = 10 + ${((n-1)/3).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Operating suites - Post-anaesthesia recovery':
        // Formula: Q = 10 + [(n-1)*3/4]
        flow = 10 + ((n - 1) * 3) / 4;
        steps = `Q = 10 + [(${n}-1)×3/4] = 10 + [${n-1}×3/4] = 10 + ${(((n-1)*3)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'In-patient accommodation - Single/multi-bed space':
        // Formula: Q = 10 + [(n-1)*6/6]
        flow = 10 + ((n - 1) * 6) / 6;
        steps = `Q = 10 + [(${n}-1)×6/6] = 10 + [${n-1}×6/6] = 10 + ${(((n-1)*6)/6).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'In-patient accommodation - Nursery':
        // Formula: Q = 10 + [(n-1)*3/2]
        flow = 10 + ((n - 1) * 3) / 2;
        steps = `Q = 10 + [(${n}-1)×3/2] = 10 + [${n-1}×3/2] = 10 + ${(((n-1)*3)/2).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'In-patient accommodation - Special care baby':
        // Formula: Q = 10 + (n-1)*6
        flow = 10 + (n - 1) * 6;
        steps = `Q = 10 + (${n}-1)×6 = 10 + ${(n-1)*6} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Radiological':
        // Formula: Q = 10 + [(n-1)*6/3]
        flow = 10 + ((n - 1) * 6) / 3;
        steps = `Q = 10 + [(${n}-1)×6/3] = 10 + [${n-1}×6/3] = 10 + ${(((n-1)*6)/3).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Critical care areas':
      case 'Coronary care unit (CCU)':
      case 'High-dependency unit (HDU)':
        // Formula: Q = 10 + [(n-1)*6/3/4]
        flow = 10 + ((n - 1) * 6) / 3 / 4;
        steps = `Q = 10 + [(${n}-1)×6/3/4] = 10 + [${n-1}×6/12] = 10 + ${(((n-1)*6)/12).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Renal':
        // Formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'CPAP ventilation':
        // Formula: Q = 75*n x 0.75
        flow = 75 * n * 0.75;
        steps = `Q = 75×${n}×0.75 = ${75*n*0.75} L/min`;
        break;
      
      case 'Adult mental illness - Electro convulsive':
      case 'Adult mental illness - Post-anaesthesia':
      case 'Adult acute day care - Treatment':
      case 'Adult acute day care - Post-anaesthesia':
      case 'Out-patient - Treatment rooms':
        // Formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Oral surgery/orthodontic - Consulting rooms type 1':
        // Formula: Q = 10 + [(n-1)*6/2]
        flow = 10 + ((n - 1) * 6) / 2;
        steps = `Q = 10 + [(${n}-1)×6/2] = 10 + [${n-1}×6/2] = 10 + ${(((n-1)*6)/2).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Oral surgery/orthodontic - Consulting rooms type 2 & 3':
        // Formula: Q = 10 + [(n-1)*6/3]
        flow = 10 + ((n - 1) * 6) / 3;
        steps = `Q = 10 + [(${n}-1)×6/3] = 10 + [${n-1}×6/3] = 10 + ${(((n-1)*6)/3).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Oral surgery/orthodontic - Recovery room':
        // Formula: Q = 10 + [(n-1)*6/6]
        flow = 10 + ((n - 1) * 6) / 6;
        steps = `Q = 10 + [(${n}-1)×6/6] = 10 + [${n-1}×6/6] = 10 + ${(((n-1)*6)/6).toFixed(2)} = ${flow.toFixed(1)} L/min`;
        break;
      
      case 'Equipment service rooms':
        // Formula: Q = 100
        flow = 100;
        steps = `Q = 100 L/min (fixed rate for equipment service rooms)`;
        break;
      
      default:
        // Default formula: Q = 10 + [(n-1)*6/4]
        flow = 10 + ((n - 1) * 6) / 4;
        steps = `Q = 10 + [(${n}-1)×6/4] = 10 + [${n-1}×6/4] = 10 + ${(((n-1)*6)/4).toFixed(2)} = ${flow.toFixed(1)} L/min (default formula)`;
        break;
    }

    return { flow, formula, steps };
  };

  // Calculate total diversified flow with diversity rules
  const calculateTotalRoomFlow = (department: string, bedCount: number, roomCount: number): { totalFlow: number; perRoomFlow: number; formula: string; steps: string } => {
    const singleRoomResult = calculateSingleRoomFlow(department, bedCount);
    const Qw = singleRoomResult.flow; // Flow per room/ward
    const nW = roomCount; // Number of rooms/wards
    
    let totalFlow = 0;
    let steps = '';
    let formula = singleRoomResult.formula;

    if (department === 'In-patient accommodation (ward units) - Single 4-bed room' && nW > 1) {
      // Apply diversity rule: Qd = Qw*[1+(nW-1)/2]
      totalFlow = Qw * (1 + (nW - 1) / 2);
      formula = `Qd = Qw×[1+(nW-1)/2]`;
      steps = `Single ward flow: ${singleRoomResult.steps}\n` +
              `Diversity calculation: Qd = ${Qw.toFixed(1)}×[1+(${nW}-1)/2] = ${totalFlow.toFixed(1)} L/min`;
    } else {
      // No diversity rule - simple multiplication
      totalFlow = Qw * nW;
      steps = `Single room flow: ${singleRoomResult.steps}\n` +
              `Total for ${nW} rooms: ${Qw.toFixed(1)} × ${nW} = ${totalFlow.toFixed(1)} L/min`;
    }

    return { 
      totalFlow, 
      perRoomFlow: Qw, 
      formula: formula + (nW > 1 ? ` (for ${nW} rooms)` : ''), 
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

    // Save calculation and prepare export data
    const inputs = {
      'Number of Room Types': updatedRooms.length,
      'Global Safety Factor': globalSafetyFactor,
      'Total System Flow (calculated)': `${totalSystem.toFixed(1)} L/min`,
      'Total System Flow (with safety factor)': `${totalSystemWithSafety.toFixed(1)} L/min`,
      'Room Configurations': updatedRooms.map(room => ({
        'Room Name': room.name,
        'Department': room.department,
        'Bed/Space Count': room.bedCount,
        'Number of Rooms': room.roomCount,
        'Design Flow per Terminal': `${room.designFlowPerTerminal} L/min`,
        'Diversified Flow per Room': `${room.diversifiedFlowPerRoom.toFixed(1)} L/min`,
        'Total Diversified Flow': `${room.totalDiversifiedFlow.toFixed(1)} L/min`
      }))
    };

    const exportResults = {
      'Total System Flow (calculated)': `${totalSystem.toFixed(1)} L/min (${(totalSystem * 60).toFixed(1)} L/hr)`,
      'Total System Flow (with safety factor)': `${totalSystemWithSafety.toFixed(1)} L/min (${(totalSystemWithSafety * 60).toFixed(1)} L/hr)`,
      'Safety Factor Applied': `${globalSafetyFactor}`,
      'Individual Room Type Results': Object.fromEntries(
        updatedRooms.map(room => [
          room.name,
          {
            'Department Type': room.department,
            'Bed/Space Count': room.bedCount,
            'Number of Rooms': room.roomCount,
            'Formula Used': room.formula,
            'Calculation Steps': room.calculationSteps,
            'Diversified Flow per Room': `${room.diversifiedFlowPerRoom.toFixed(1)} L/min`,
            'Total Diversified Flow': `${room.totalDiversifiedFlow.toFixed(1)} L/min`
          }
        ])
      )
    };

    // Note: saveCalculation and prepareExportData handled by CalculatorWrapper
  }, [rooms.length, rooms.map(r => `${r.department}-${r.bedCount}-${r.roomCount}`).join(','), globalSafetyFactor]);

  const addRoom = () => {
    const newRoom: OxygenRoom = {
      id: Date.now().toString(),
      name: `Room Type ${rooms.length + 1}`,
      department: 'Critical care areas',
      bedCount: 1,
      roomCount: 1,
      designFlowPerTerminal: 10,
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

  const updateRoom = (id: string, updates: Partial<OxygenRoom>) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, ...updates } : room
    ));
  };

  return (
    <CalculatorWrapper
      title="Medical Oxygen Gas Flow Sizing"
      discipline="electrical"
      calculatorType="oxygen-flow"
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
              return (
              <div key={room.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className={`flex justify-between items-center p-4 cursor-pointer ${isExpanded ? 'border-b border-gray-200' : ''}`} onClick={() => setActiveConfigCard(isExpanded ? null : room.id)}>
                    <h4 className="font-medium text-gray-700">{room.name}</h4>
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
                            <p className="text-gray-600">Beds/Spaces per room:</p>
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
              return (
              <div key={room.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div 
                  className={`flex justify-between items-center p-4 cursor-pointer ${isExpanded ? 'border-b border-gray-200' : ''}`}
                  onClick={() => setActiveResultCard(isExpanded ? null : room.id)}
                >
                  <h4 className="font-medium text-gray-800">{room.name}</h4>
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
                      <p className="text-gray-600">Beds/Spaces per room:</p>
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
        <h4 className="font-medium mb-2 text-yellow-800">Standard Information</h4>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>Legend:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Q</strong> = diversified flow for the department (L/min)</li>
            <li><strong>Qw</strong> = diversified flow for the ward (L/min)</li>
            <li><strong>Qd</strong> = diversified flow for the department comprising two or more wards (L/min)</li>
            <li><strong>n</strong> = number of beds, treatment spaces or single rooms</li>
            <li><strong>nS</strong> = number of operating suites within the department</li>
            <li><strong>nW</strong> = number of wards</li>
            <li><strong>nT</strong> = number of theatres</li>
          </ul>
          <p className="mt-3"><strong>Diversity Rules:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>In-patient ward units (Single 4-bed room):</strong> Qd = Qw×[1+(nW-1)/2] where Qd is total flow, Qw is flow per ward, nW is number of wards</li>
            <li><strong>All other room types:</strong> Total flow = Flow per room × Number of rooms (no diversity factor)</li>
          </ul>
          <p className="mt-3"><strong>Notes:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Calculations based on medical gas pipeline systems design standards</li>
            <li>Diversified flow accounts for simultaneous usage probability</li>
            <li>Design flow per terminal is the maximum flow rate per outlet</li>
            <li>Global safety factor is applied to the total system flow</li>
            <li>Safety factor recommended: 1.3 for standard, 1.5-2.0 for critical applications</li>
          </ul>
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default OxygenFlowCalculator;