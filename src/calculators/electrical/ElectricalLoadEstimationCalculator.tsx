import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface ElectricalLoadCalculatorProps {
  onShowTutorial?: () => void;
}

// Project Information
interface ProjectInfo {
  projectName: string;
  buildingType: string;
  date: string;
  informNo: string;
  totalArea: number; // in square meters
  numberOfFloors: number;
  numberOfRisers: number;
}

// Common fields for floor/riser/emergency power
interface BaseEquipmentFields {
  floorNumber: number;
  riserNumber: number;
  emergencyPower: boolean;
}

// Lighting Installation
interface LightingSpace extends BaseEquipmentFields {
  id: string;
  name: string;
  area: number;  // in square meters
  powerDensity: number; // in W/sq.m
  powerFactor: number;
  connectedLoad: number; // calculated in kVA
}

// General Power
interface GeneralPowerSpace extends BaseEquipmentFields {
  id: string;
  name: string;
  area: number;  // in square meters
  powerDensity: number; // in VA/sq.m
  connectedLoad: number; // calculated in kVA
}

// HVAC - Refrigeration/Heating Water Plant
interface HVACPlant extends BaseEquipmentFields {
  id: string;
  type: string;
  quantity: number;
  coolingHeatingLoad: number; // in kWth per unit
  cop: number; // Coefficient of Performance
  powerFactor: number;
  connectedLoad: number; // calculated in kVA
}

// HVAC - Water Side Distribution (Enhanced with Other Equipment option)
interface HVACWaterDistribution extends BaseEquipmentFields {
  id: string;
  system: string;
  equipmentType: 'pump' | 'other';
  coolingLoadServed: number; // in kWth
  waterFlowRate: number; // in L/s
  pumpHead: number; // in kPa
  pumpEfficiency: number;
  motorEfficiency: number;
  powerKWPerUnit?: number; // for 'other' type
  powerFactor: number;
  connectedLoad: number; // calculated in kVA
}

// HVAC - Air Side Distribution
interface HVACAirDistribution extends BaseEquipmentFields {
  id: string;
  equipment: string;
  coolingLoadServed: number; // in kWth
  airFlowRate: number; // in L/s
  fanPressure: number; // in Pa
  fanEfficiency: number;
  motorEfficiency: number;
  powerFactor: number;
  connectedLoad: number; // calculated in kVA
}

// HVAC - Mechanical Ventilation
interface HVACVentilation extends BaseEquipmentFields {
  id: string;
  equipment: string;
  airFlowRate: number; // in L/s
  fanPressure: number; // in Pa
  fanEfficiency: number;
  motorEfficiency: number;
  powerFactor: number;
  connectedLoad: number; // calculated in kVA
}

// Fire Service Installations
interface FireService extends BaseEquipmentFields {
  id: string;
  description: string;
  equipmentType: 'pump' | 'other';
  quantity: number;
  // For pump
  pressure?: number; // in m
  flowRate?: number; // in L/s
  pumpEfficiency?: number;
  motorEfficiency?: number;
  // For 'other' (input in kW)
  powerKWPerUnit?: number; // in kW
  // Common
  powerFactor: number;
  // Calculated
  connectedLoadPerUnit: number; // in kVA
  connectedLoad: number; // calculated in kVA
}

// Water Pumps for P&D
interface WaterPump extends BaseEquipmentFields {
  id: string;
  type: string;
  quantity: number;
  pressure: number; // in m
  flowRate: number; // in L/s
  pumpEfficiency: number;
  motorEfficiency: number;
  powerFactor: number;
  connectedLoadPerUnit: number; // in kVA
  connectedLoad: number; // calculated in kVA
}

// Lift & Escalator Installation (Enhanced with FSI indicator)
interface LiftEscalator extends BaseEquipmentFields {
  id: string;
  type: string; // e.g., Passenger Lift, Escalator, Moving Walkway
  quantity: number;
  fsi: boolean; // Fire Service Installation indicator
  // For lifts
  ratedLoad?: number; // in kg
  ratedSpeed?: number; // in m/s
  motorEfficiency?: number;
  // For escalators/moving walkways/other specified load
  connectedLoadPerUnitInput?: number; // in kW
  // Common
  powerFactor: number;
  connectedLoadPerUnit: number; // in kVA
  connectedLoad: number; // calculated in kVA
}

// Hot Water Boiler / Calorifier Installation
interface HotWaterSystem extends BaseEquipmentFields {
  id: string;
  equipmentType: 'boilerCalorifier' | 'pump' | 'other';
  description: string;
  quantity: number;
  // For 'boilerCalorifier' (input in kW)
  capacity?: number; // in kW
  // For 'pump'
  pressure?: number; // in m (for pump)
  flowRate?: number; // in L/s (for pump)
  pumpEfficiency?: number;
  motorEfficiency?: number;
  // For 'other' (input in kW)
  powerKWPerUnit?: number; // in kW
  // Common
  powerFactor: number;
  // Calculated
  connectedLoadPerUnit: number; // in kVA
  connectedLoad: number; // calculated in kVA
}

// Miscellaneous Installation
interface MiscInstallation extends BaseEquipmentFields {
  id: string;
  type: string;
  quantity: number;
  connectedLoadPerUnit: number; // in kVA (This is direct input)
  connectedLoad: number; // calculated in kVA
}

// Category Summary with Diversity
interface CategorySummary {
  category: string;
  estimatedConnectedLoad: number; // in kVA
  diversityFactor: number;
  futureGrowthFactor: number; // Category-specific future growth (0-1)
  diversifiedConnectedLoad: number; // in kVA
}

// Additional Demand
interface AdditionalDemand {
  powerQuality: number; // in kVA
  standbyPower: number; // in kVA
  reliabilityPercentage: number; // in percent
}

// Summary interfaces for floor/riser reports
interface FloorSummary {
  floor: number;
  totalLoad: number;
  emergencyLoad: number;
  fsiLoad: number;
}

interface RiserSummary {
  riser: number;
  totalLoad: number;
  emergencyLoad: number;
  fsiLoad: number;
}

interface FlattenedEquipmentItem extends BaseEquipmentFields {
    id: string;
    connectedLoad: number;
    fsi?: boolean; 
    categoryType: string; 
}


const ElectricalLoadCalculator: React.FC<ElectricalLoadCalculatorProps> = ({ onShowTutorial }) => {
  // Project Info State
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    projectName: '',
    buildingType: '',
    date: new Date().toISOString().split('T')[0],
    informNo: '',
    totalArea: 0,
    numberOfFloors: 10,
    numberOfRisers: 2
  });

  // Load Category States
  const [lightingSpaces, setLightingSpaces] = useState<LightingSpace[]>([
    { id: 'ls1', name: 'Office Area', area: 500, powerDensity: 9, powerFactor: 0.9, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [generalPowerSpaces, setGeneralPowerSpaces] = useState<GeneralPowerSpace[]>([
    { id: 'gp1', name: 'Office Area', area: 500, powerDensity: 25, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [hvacPlants, setHVACPlants] = useState<HVACPlant[]>([
    { id: 'hp1', type: 'Chiller', quantity: 2, coolingHeatingLoad: 500, cop: 3.2, powerFactor: 0.85, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [hvacWaterDistributions, setHVACWaterDistributions] = useState<HVACWaterDistribution[]>([
    { id: 'hwd1', system: 'Chilled Water Pump', equipmentType: 'pump', coolingLoadServed: 500, waterFlowRate: 25, pumpHead: 200, pumpEfficiency: 0.7, motorEfficiency: 0.9, powerFactor: 0.85, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false, powerKWPerUnit: undefined }
  ]);

  const [hvacAirDistributions, setHVACAirDistributions] = useState<HVACAirDistribution[]>([
    { id: 'had1', equipment: 'AHU', coolingLoadServed: 100, airFlowRate: 2000, fanPressure: 800, fanEfficiency: 0.7, motorEfficiency: 0.9, powerFactor: 0.85, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [hvacVentilations, setHVACVentilations] = useState<HVACVentilation[]>([
    { id: 'hv1', equipment: 'Exhaust Fan', airFlowRate: 1000, fanPressure: 300, fanEfficiency: 0.65, motorEfficiency: 0.85, powerFactor: 0.85, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [fireServices, setFireServices] = useState<FireService[]>([
    {
      id: 'fs1',
      description: 'Fire Alarm Panel',
      equipmentType: 'other',
      quantity: 1,
      powerKWPerUnit: 4.25,
      powerFactor: 0.85,
      connectedLoadPerUnit: 0,
      connectedLoad: 0,
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: true
    }
  ]);

  const [waterPumps, setWaterPumps] = useState<WaterPump[]>([
    { id: 'wp1', type: 'Domestic Water Pump', quantity: 2, pressure: 30, flowRate: 10, pumpEfficiency: 0.7, motorEfficiency: 0.9, powerFactor: 0.85, connectedLoadPerUnit: 0, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [liftEscalators, setLiftEscalators] = useState<LiftEscalator[]>([
    {
      id: 'le1',
      type: 'Passenger Lift',
      quantity: 2,
      fsi: false,
      ratedLoad: 1000,
      ratedSpeed: 1.5,
      motorEfficiency: 0.9,
      powerFactor: 0.85,
      connectedLoadPerUnitInput: undefined,
      connectedLoadPerUnit: 0, 
      connectedLoad: 0,
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: false
    },
    {
      id: 'le2',
      type: 'Escalator',
      quantity: 1,
      fsi: false,
      powerFactor: 0.8,
      connectedLoadPerUnitInput: 10, // kW
      connectedLoadPerUnit: 0,
      connectedLoad: 0,
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: false
    }
  ]);

  const [hotWaterSystems, setHotWaterSystems] = useState<HotWaterSystem[]>([
    { id: 'hws1', equipmentType: 'boilerCalorifier', description: 'Electric Boiler', quantity: 1, capacity: 30, powerFactor: 1.0, connectedLoadPerUnit: 0, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [miscInstallations, setMiscInstallations] = useState<MiscInstallation[]>([
    { id: 'mi1', type: 'Computer Server Room', quantity: 1, connectedLoadPerUnit: 10, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false }
  ]);

  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([
    { category: 'A. Lighting Installation', estimatedConnectedLoad: 0, diversityFactor: 0.9, futureGrowthFactor: 0.2, diversifiedConnectedLoad: 0 },
    { category: 'B. General Power', estimatedConnectedLoad: 0, diversityFactor: 0.7, futureGrowthFactor: 0.2, diversifiedConnectedLoad: 0 },
    { category: 'C1. HVAC - Refrigeration/Heating Water Plant', estimatedConnectedLoad: 0, diversityFactor: 0.9, futureGrowthFactor: 0.1, diversifiedConnectedLoad: 0 },
    { category: 'C2. HVAC - Water Side Distribution', estimatedConnectedLoad: 0, diversityFactor: 0.8, futureGrowthFactor: 0.1, diversifiedConnectedLoad: 0 },
    { category: 'C3. HVAC - Air Side Distribution', estimatedConnectedLoad: 0, diversityFactor: 0.8, futureGrowthFactor: 0.1, diversifiedConnectedLoad: 0 },
    { category: 'C4. HVAC - Mechanical Ventilation', estimatedConnectedLoad: 0, diversityFactor: 0.7, futureGrowthFactor: 0.1, diversifiedConnectedLoad: 0 },
    { category: 'D. Fire Service Installations', estimatedConnectedLoad: 0, diversityFactor: 1.0, futureGrowthFactor: 0, diversifiedConnectedLoad: 0 },
    { category: 'E. Water Pumps for P&D', estimatedConnectedLoad: 0, diversityFactor: 0.7, futureGrowthFactor: 0.1, diversifiedConnectedLoad: 0 },
    { category: 'F. Lift & Escalator Installation', estimatedConnectedLoad: 0, diversityFactor: 0.6, futureGrowthFactor: 0.1, diversifiedConnectedLoad: 0 },
    { category: 'G. Hot Water Boiler / Calorifier Installation', estimatedConnectedLoad: 0, diversityFactor: 0.8, futureGrowthFactor: 0.1, diversifiedConnectedLoad: 0 },
    { category: 'H. Miscellaneous Installation', estimatedConnectedLoad: 0, diversityFactor: 0.6, futureGrowthFactor: 0.2, diversifiedConnectedLoad: 0 }
  ]);

  const [additionalDemand, setAdditionalDemand] = useState<AdditionalDemand>({
    powerQuality: 20,
    standbyPower: 0,
    reliabilityPercentage: 10,
  });

  const [totalEstimatedDemand, setTotalEstimatedDemand] = useState<number>(0);
  const [demandDensity, setDemandDensity] = useState<number>(0);
  const [totalDiversifiedLoad, setTotalDiversifiedLoad] = useState<number>(0);
  const [totalAdditionalDemand, setTotalAdditionalDemand] = useState<number>(0);
  const [overallDiversityFactor, setOverallDiversityFactor] = useState<number>(0);
  const [totalEmergencyPowerLoad, setTotalEmergencyPowerLoad] = useState<number>(0);
  const [totalFSILoad, setTotalFSILoad] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [reportType, setReportType] = useState<'overall' | 'byFloor' | 'byRiser'>('overall');

  // Helper functions for floor/riser options
  const getFloorOptions = () => {
    return Array.from({ length: Math.max(1, projectInfo.numberOfFloors) }, (_, i) => i + 1);
  };

  const getRiserOptions = () => {
    return Array.from({ length: Math.max(1, projectInfo.numberOfRisers) }, (_, i) => i + 1);
  };

  // Helper function to calculate emergency power and FSI loads
  const calculateSpecialLoads = () => {
    const allEquipmentForEmergency: (BaseEquipmentFields & { connectedLoad: number })[] = [
      ...lightingSpaces,
      ...generalPowerSpaces,
      ...hvacPlants,
      ...hvacWaterDistributions,
      ...hvacAirDistributions,
      ...hvacVentilations,
      ...fireServices,
      ...waterPumps,
      ...liftEscalators,
      ...hotWaterSystems,
      ...miscInstallations
    ];

    const emergencyLoad = allEquipmentForEmergency
      .filter(item => item.emergencyPower)
      .reduce((sum, item) => sum + item.connectedLoad, 0);

    const fsiLiftsLoad = liftEscalators
      .filter(lift => lift.fsi)
      .reduce((sum, lift) => sum + lift.connectedLoad, 0);

    const fireServiceCategoryDLoad = fireServices
      .reduce((sum, service) => sum + service.connectedLoad, 0);
      
    const combinedFsiLoad = fsiLiftsLoad + fireServiceCategoryDLoad;

    setTotalEmergencyPowerLoad(emergencyLoad);
    setTotalFSILoad(combinedFsiLoad);
  };

  const getAllFlattenedEquipment = (): FlattenedEquipmentItem[] => [
      ...lightingSpaces.map(i => ({...i, categoryType: 'lighting'} as FlattenedEquipmentItem)),
      ...generalPowerSpaces.map(i => ({...i, categoryType: 'generalPower'} as FlattenedEquipmentItem)),
      ...hvacPlants.map(i => ({...i, categoryType: 'hvacPlant'} as FlattenedEquipmentItem)),
      ...hvacWaterDistributions.map(i => ({...i, categoryType: 'hvacWater'} as FlattenedEquipmentItem)),
      ...hvacAirDistributions.map(i => ({...i, categoryType: 'hvacAir'} as FlattenedEquipmentItem)),
      ...hvacVentilations.map(i => ({...i, categoryType: 'hvacVent'} as FlattenedEquipmentItem)),
      ...fireServices.map(i => ({...i, categoryType: 'fireServiceD'} as FlattenedEquipmentItem)),
      ...waterPumps.map(i => ({...i, categoryType: 'waterPump'} as FlattenedEquipmentItem)),
      ...liftEscalators.map(i => ({...i, categoryType: 'liftEscalator'} as FlattenedEquipmentItem)),
      ...hotWaterSystems.map(i => ({...i, categoryType: 'hotWater'} as FlattenedEquipmentItem)),
      ...miscInstallations.map(i => ({...i, categoryType: 'misc'} as FlattenedEquipmentItem))
  ];

  // Helper function to get floor/riser summaries
  const getFloorSummaries = (): FloorSummary[] => {
    const summaries: { [key: number]: FloorSummary } = {};
    const allEquipmentFlattened = getAllFlattenedEquipment();

    allEquipmentFlattened.forEach(item => {
      const floor = item.floorNumber;
      if (!summaries[floor]) {
        summaries[floor] = { floor, totalLoad: 0, emergencyLoad: 0, fsiLoad: 0 };
      }
      summaries[floor].totalLoad += item.connectedLoad;
      if (item.emergencyPower) {
        summaries[floor].emergencyLoad += item.connectedLoad;
      }
      
      if (item.categoryType === 'liftEscalator' && item.fsi === true) {
        summaries[floor].fsiLoad += item.connectedLoad;
      } else if (item.categoryType === 'fireServiceD') {
        summaries[floor].fsiLoad += item.connectedLoad;
      }
    });

    return Object.values(summaries).sort((a, b) => a.floor - b.floor);
  };

  const getRiserSummaries = (): RiserSummary[] => {
    const summaries: { [key: number]: RiserSummary } = {};
    const allEquipmentFlattened = getAllFlattenedEquipment();

    allEquipmentFlattened.forEach(item => {
      const riser = item.riserNumber;
      if (!summaries[riser]) {
        summaries[riser] = { riser, totalLoad: 0, emergencyLoad: 0, fsiLoad: 0 };
      }
      summaries[riser].totalLoad += item.connectedLoad;
      if (item.emergencyPower) {
        summaries[riser].emergencyLoad += item.connectedLoad;
      }

      if (item.categoryType === 'liftEscalator' && item.fsi === true) {
        summaries[riser].fsiLoad += item.connectedLoad;
      } else if (item.categoryType === 'fireServiceD') {
        summaries[riser].fsiLoad += item.connectedLoad;
      }
    });

    return Object.values(summaries).sort((a, b) => a.riser - b.riser);
  };

  // Component for Floor and Riser fields
  const renderFloorRiserFields = <T extends BaseEquipmentFields>(
    item: T,
    updateFunction: (id: string, updates: Partial<T>) => void,
    id: string
  ) => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
        <select
          value={item.floorNumber}
          onChange={(e) => updateFunction(id, { floorNumber: Number(e.target.value) } as Partial<T>)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {getFloorOptions().map(floor => (
            <option key={floor} value={floor}>{floor}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Riser</label>
        <select
          value={item.riserNumber}
          onChange={(e) => updateFunction(id, { riserNumber: Number(e.target.value) } as Partial<T>)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {getRiserOptions().map(riser => (
            <option key={riser} value={riser}>{riser}</option>
          ))}
        </select>
      </div>
    </>
  );

  // Component for Emergency Power Toggle
  const renderEmergencyPowerToggle = <T extends BaseEquipmentFields>(
    item: T,
    updateFunction: (id: string, updates: Partial<T>) => void,
    id: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Power</label>
      <input
        type="checkbox"
        checked={item.emergencyPower}
        onChange={(e) => updateFunction(id, { emergencyPower: e.target.checked } as Partial<T>)}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
      />
    </div>
  );

  // Component for Lift/Escalator Toggles (Emergency Power and FSI)
  const renderLiftEscalatorToggles = (
    item: LiftEscalator,
    updateFunction: (id: string, updates: Partial<LiftEscalator>) => void,
    id: string
  ) => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Power</label>
        <input
          type="checkbox"
          checked={item.emergencyPower}
          onChange={(e) => updateFunction(id, { emergencyPower: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fire Service Installation</label>
        <input
          type="checkbox"
          checked={item.fsi}
          onChange={(e) => updateFunction(id, { fsi: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
        />
      </div>
    </>
  );


  // --- Calculation useEffects ---

  useEffect(() => {
    const updatedItems = lightingSpaces.map(item => {
      const cl = (item.area * item.powerDensity) / (1000 * (item.powerFactor || 1));
      return { ...item, connectedLoad: cl };
    });
    if (JSON.stringify(lightingSpaces) !== JSON.stringify(updatedItems)) {
        setLightingSpaces(updatedItems);
    }
    updateCategorySummary('A. Lighting Installation', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [lightingSpaces.map(i => `${i.id}-${i.area}-${i.powerDensity}-${i.powerFactor}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = generalPowerSpaces.map(item => {
      const cl = (item.area * item.powerDensity) / 1000;
      return { ...item, connectedLoad: cl };
    });
    if (JSON.stringify(generalPowerSpaces) !== JSON.stringify(updatedItems)) {
        setGeneralPowerSpaces(updatedItems);
    }
    updateCategorySummary('B. General Power', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [generalPowerSpaces.map(i => `${i.id}-${i.area}-${i.powerDensity}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = hvacPlants.map(item => {
      const elpu = (item.coolingHeatingLoad / (item.cop || 1));
      const cl = (elpu / (item.powerFactor || 1)) * item.quantity;
      return { ...item, connectedLoad: cl };
    });
    if (JSON.stringify(hvacPlants) !== JSON.stringify(updatedItems)) {
        setHVACPlants(updatedItems);
    }
    updateCategorySummary('C1. HVAC - Refrigeration/Heating Water Plant', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [hvacPlants.map(i => `${i.id}-${i.quantity}-${i.coolingHeatingLoad}-${i.cop}-${i.powerFactor}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = hvacWaterDistributions.map(item => {
      let cl = 0;
      if (item.equipmentType === 'pump') {
        const pkw = (item.waterFlowRate * item.pumpHead) / (1000 * (item.pumpEfficiency || 1) * (item.motorEfficiency || 1));
        cl = pkw / (item.powerFactor || 1);
      } else if (item.equipmentType === 'other' && typeof item.powerKWPerUnit === 'number') {
        cl = (item.powerKWPerUnit) / (item.powerFactor || 1);
      }
      return { ...item, connectedLoad: cl };
    });
    if (JSON.stringify(hvacWaterDistributions) !== JSON.stringify(updatedItems)) {
        setHVACWaterDistributions(updatedItems);
    }
    updateCategorySummary('C2. HVAC - Water Side Distribution', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [hvacWaterDistributions.map(i => `${i.id}-${i.equipmentType}-${i.waterFlowRate}-${i.pumpHead}-${i.pumpEfficiency}-${i.motorEfficiency}-${i.powerFactor}-${i.powerKWPerUnit}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = hvacAirDistributions.map(item => {
      const pkw = (item.airFlowRate * item.fanPressure) / (1000 * 1000 * (item.fanEfficiency || 1) * (item.motorEfficiency || 1));
      const cl = pkw / (item.powerFactor || 1);
      return { ...item, connectedLoad: cl };
    });
    if (JSON.stringify(hvacAirDistributions) !== JSON.stringify(updatedItems)) {
        setHVACAirDistributions(updatedItems);
    }
    updateCategorySummary('C3. HVAC - Air Side Distribution', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [hvacAirDistributions.map(i => `${i.id}-${i.airFlowRate}-${i.fanPressure}-${i.fanEfficiency}-${i.motorEfficiency}-${i.powerFactor}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = hvacVentilations.map(item => {
      const pkw = (item.airFlowRate * item.fanPressure) / (1000 * 1000 * (item.fanEfficiency || 1) * (item.motorEfficiency || 1));
      const cl = pkw / (item.powerFactor || 1);
      return { ...item, connectedLoad: cl };
    });
    if (JSON.stringify(hvacVentilations) !== JSON.stringify(updatedItems)) {
        setHVACVentilations(updatedItems);
    }
    updateCategorySummary('C4. HVAC - Mechanical Ventilation', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [hvacVentilations.map(i => `${i.id}-${i.airFlowRate}-${i.fanPressure}-${i.fanEfficiency}-${i.motorEfficiency}-${i.powerFactor}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedFireServices = fireServices.map(service => {
      let clpu_kVA = 0;
      if (service.equipmentType === 'pump' && service.flowRate && service.pressure && service.pumpEfficiency && service.motorEfficiency) {
        const powerKW = (9.81 * service.pressure * service.flowRate) / (1000 * (service.pumpEfficiency || 1) * (service.motorEfficiency || 1));
        clpu_kVA = powerKW / (service.powerFactor || 1);
      } else if (service.equipmentType === 'other' && typeof service.powerKWPerUnit === 'number') {
        clpu_kVA = (service.powerKWPerUnit) / (service.powerFactor || 1);
      }
      const totalConnectedLoad = clpu_kVA * service.quantity;
      return { ...service, connectedLoadPerUnit: clpu_kVA, connectedLoad: totalConnectedLoad };
    });
    if (JSON.stringify(fireServices) !== JSON.stringify(updatedFireServices)) {
        setFireServices(updatedFireServices);
    }
    updateCategorySummary('D. Fire Service Installations', updatedFireServices.reduce((sum, s) => sum + s.connectedLoad, 0));
  }, [fireServices.map(s => `${s.id}-${s.equipmentType}-${s.quantity}-${s.powerKWPerUnit}-${s.flowRate}-${s.pressure}-${s.pumpEfficiency}-${s.motorEfficiency}-${s.powerFactor}-${s.floorNumber}-${s.riserNumber}-${s.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = waterPumps.map(item => {
      const pkw = (9.81 * item.pressure * item.flowRate) / (1000 * (item.pumpEfficiency || 1) * (item.motorEfficiency || 1));
      const clpu = pkw / (item.powerFactor || 1);
      const cl = clpu * item.quantity;
      return { ...item, connectedLoadPerUnit: clpu, connectedLoad: cl };
    });
    if (JSON.stringify(waterPumps) !== JSON.stringify(updatedItems)) {
        setWaterPumps(updatedItems);
    }
    updateCategorySummary('E. Water Pumps for P&D', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [waterPumps.map(i => `${i.id}-${i.quantity}-${i.flowRate}-${i.pressure}-${i.pumpEfficiency}-${i.motorEfficiency}-${i.powerFactor}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedLiftEscalators = liftEscalators.map(item => {
      let clpu_kVA = 0;
      if ((item.type === 'Escalator' || item.type === 'Moving Walkway') && typeof item.connectedLoadPerUnitInput === 'number') {
        clpu_kVA = (item.connectedLoadPerUnitInput) / (item.powerFactor || 1);
      } else if (item.ratedLoad && item.ratedSpeed && item.motorEfficiency) { // For Lifts
        const k = 0.6; // Unbalance factor
        const electricalPowerKW = (0.00981 * item.ratedLoad * item.ratedSpeed * k) / (item.motorEfficiency || 1);
        clpu_kVA = electricalPowerKW / (item.powerFactor || 1);
      }
      const totalConnectedLoad = clpu_kVA * item.quantity;
      return { ...item, connectedLoadPerUnit: clpu_kVA, connectedLoad: totalConnectedLoad };
    });
    if (JSON.stringify(liftEscalators) !== JSON.stringify(updatedLiftEscalators)) {
        setLiftEscalators(updatedLiftEscalators);
    }
    updateCategorySummary('F. Lift & Escalator Installation', updatedLiftEscalators.reduce((sum, lift) => sum + lift.connectedLoad, 0));
  }, [liftEscalators.map(lift => `${lift.id}-${lift.type}-${lift.quantity}-${lift.ratedLoad}-${lift.ratedSpeed}-${lift.motorEfficiency}-${lift.powerFactor}-${lift.connectedLoadPerUnitInput}-${lift.fsi}-${lift.floorNumber}-${lift.riserNumber}-${lift.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = hotWaterSystems.map(item => {
      let clpu_kVA = 0;
      if (item.equipmentType === 'boilerCalorifier' && typeof item.capacity === 'number') {
        clpu_kVA = item.capacity / (item.powerFactor || 1);
      } else if (item.equipmentType === 'pump' && item.flowRate && item.pressure && item.pumpEfficiency && item.motorEfficiency) {
        const pkw = (9.81 * item.pressure * item.flowRate) / (1000 * (item.pumpEfficiency || 1) * (item.motorEfficiency || 1));
        clpu_kVA = pkw / (item.powerFactor || 1);
      } else if (item.equipmentType === 'other' && typeof item.powerKWPerUnit === 'number') {
        clpu_kVA = (item.powerKWPerUnit) / (item.powerFactor || 1);
      }
      const cl = clpu_kVA * item.quantity;
      return { ...item, connectedLoadPerUnit: clpu_kVA, connectedLoad: cl };
    });
    if (JSON.stringify(hotWaterSystems) !== JSON.stringify(updatedItems)) {
        setHotWaterSystems(updatedItems);
    }
    updateCategorySummary('G. Hot Water Boiler / Calorifier Installation', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [hotWaterSystems.map(s => `${s.id}-${s.equipmentType}-${s.quantity}-${s.capacity}-${s.pressure}-${s.flowRate}-${s.pumpEfficiency}-${s.motorEfficiency}-${s.powerFactor}-${s.powerKWPerUnit}-${s.floorNumber}-${s.riserNumber}-${s.emergencyPower}`).join(',')]);

  useEffect(() => {
    const updatedItems = miscInstallations.map(item => {
      const cl = item.quantity * item.connectedLoadPerUnit;
      return { ...item, connectedLoad: cl };
    });
    if (JSON.stringify(miscInstallations) !== JSON.stringify(updatedItems)) {
        setMiscInstallations(updatedItems);
    }
    updateCategorySummary('H. Miscellaneous Installation', updatedItems.reduce((sum, i) => sum + i.connectedLoad, 0));
  }, [miscInstallations.map(i => `${i.id}-${i.quantity}-${i.connectedLoadPerUnit}-${i.floorNumber}-${i.riserNumber}-${i.emergencyPower}`).join(',')]);


  useEffect(() => {
    const reliabilityLoad = totalDiversifiedLoad * (additionalDemand.reliabilityPercentage / 100);
    const total = additionalDemand.powerQuality + additionalDemand.standbyPower + reliabilityLoad;
    setTotalAdditionalDemand(total);
  }, [additionalDemand, totalDiversifiedLoad]);

  useEffect(() => {
    let totalEstimatedConnectedLoad = 0;
    let totalDiversifiedConnectedLoadWithGrowth = 0;
    
    const updatedSummaries = categorySummaries.map(summary => {
      const diversifiedLoad = summary.estimatedConnectedLoad * summary.diversityFactor;
      const withGrowth = diversifiedLoad * (1 + summary.futureGrowthFactor);
      
      totalEstimatedConnectedLoad += summary.estimatedConnectedLoad;
      totalDiversifiedConnectedLoadWithGrowth += withGrowth;
      
      return { ...summary, diversifiedConnectedLoad: withGrowth };
    });
    
    const currentDiversifiedLoads = categorySummaries.map(s => s.diversifiedConnectedLoad.toFixed(5)).join(',');
    const newDiversifiedLoads = updatedSummaries.map(s => s.diversifiedConnectedLoad.toFixed(5)).join(',');

    if (currentDiversifiedLoads !== newDiversifiedLoads) {
        setCategorySummaries(updatedSummaries);
    }
    
    setTotalDiversifiedLoad(totalDiversifiedConnectedLoadWithGrowth);
    
    const overallDivFactor = totalEstimatedConnectedLoad > 0 
      ? totalDiversifiedConnectedLoadWithGrowth / totalEstimatedConnectedLoad 
      : 0;
    setOverallDiversityFactor(overallDivFactor);
    
    const finalTotalEstimatedDemand = totalDiversifiedConnectedLoadWithGrowth + totalAdditionalDemand;
    setTotalEstimatedDemand(finalTotalEstimatedDemand);
    
    if (projectInfo.totalArea > 0) {
      setDemandDensity(finalTotalEstimatedDemand * 1000 / projectInfo.totalArea);
    } else {
      setDemandDensity(0);
    }

    calculateSpecialLoads();
  }, [
      categorySummaries.map(s=>`${s.estimatedConnectedLoad}-${s.diversityFactor}-${s.futureGrowthFactor}`).join(','), 
      totalAdditionalDemand, 
      projectInfo.totalArea, 
      lightingSpaces, generalPowerSpaces, hvacPlants, hvacWaterDistributions, 
      hvacAirDistributions, hvacVentilations, fireServices, waterPumps, 
      liftEscalators, hotWaterSystems, miscInstallations
  ]);

  const updateCategorySummary = (categoryName: string, estimatedConnectedLoad: number) => {
    setCategorySummaries(prevSummaries => {
      const summaryIndex = prevSummaries.findIndex(s => s.category === categoryName);
      if (summaryIndex === -1) return prevSummaries; 
      
      const currentSummary = prevSummaries[summaryIndex];
      if (currentSummary.estimatedConnectedLoad.toFixed(5) === estimatedConnectedLoad.toFixed(5)) {
          return prevSummaries;
      }

      return prevSummaries.map(summary => 
        summary.category === categoryName
          ? { ...summary, estimatedConnectedLoad } 
          : summary
      );
    });
  };


  const addItem = <T extends { id: string }>(items: T[], setItems: React.Dispatch<React.SetStateAction<T[]>>, newItem: Omit<T, 'id'>) => {
    setItems([...items, { ...newItem, id: `${Object.keys(newItem)[0]}-${Date.now().toString()}` } as T]);
  };

  const removeItem = <T extends { id: string }>(items: T[], setItems: React.Dispatch<React.SetStateAction<T[]>>, id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = <T extends { id: string }>(items: T[], setItems: React.Dispatch<React.SetStateAction<T[]>>, id: string, updates: Partial<T>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // --- Add Item Handlers ---
  const handleAddLightingSpace = () => addItem(lightingSpaces, setLightingSpaces, { name: 'New Lighting Space', area: 100, powerDensity: 9, powerFactor: 0.9, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false });
  const handleAddGeneralPowerSpace = () => addItem(generalPowerSpaces, setGeneralPowerSpaces, { name: 'New General Space', area: 100, powerDensity: 25, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false });
  const handleAddHVACPlant = () => addItem(hvacPlants, setHVACPlants, { type: 'Chiller', quantity: 1, coolingHeatingLoad: 100, cop: 3, powerFactor: 0.85, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false });
  
  const handleAddHVACWaterDistribution = () => addItem(hvacWaterDistributions, setHVACWaterDistributions, { 
    system: 'New Pump', 
    equipmentType: 'pump',
    coolingLoadServed: 100, 
    waterFlowRate: 10, 
    pumpHead: 150, 
    pumpEfficiency: 0.7, 
    motorEfficiency: 0.9, 
    powerFactor: 0.85, 
    connectedLoad: 0, 
    floorNumber: 1, 
    riserNumber: 1, 
    emergencyPower: false,
    powerKWPerUnit: 5 
  });

  const handleAddHVACAirDistribution = () => addItem(hvacAirDistributions, setHVACAirDistributions, { equipment: 'New AHU', coolingLoadServed: 50, airFlowRate: 1000, fanPressure: 500, fanEfficiency: 0.65, motorEfficiency: 0.85, powerFactor: 0.85, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false });
  const handleAddHVACVentilation = () => addItem(hvacVentilations, setHVACVentilations, { equipment: 'New Fan', airFlowRate: 500, fanPressure: 200, fanEfficiency: 0.6, motorEfficiency: 0.8, powerFactor: 0.85, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false });
  
  const handleAddFireService = () => {
    const newService: Omit<FireService, 'id'> = {
      description: 'New Fire Equipment',
      equipmentType: 'other', 
      quantity: 1,
      powerKWPerUnit: 2, 
      powerFactor: 0.85,
      connectedLoadPerUnit: 0,
      connectedLoad: 0,
      pressure: 30, 
      flowRate: 10, 
      pumpEfficiency: 0.7,
      motorEfficiency: 0.9,
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: true 
    };
    addItem(fireServices, setFireServices, newService);
  };

  const handleAddWaterPump = () => addItem(waterPumps, setWaterPumps, { type: 'New Water Pump', quantity: 1, pressure: 20, flowRate: 5, pumpEfficiency: 0.65, motorEfficiency: 0.85, powerFactor: 0.85, connectedLoadPerUnit: 0, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false });
  
  const handleAddLiftEscalator = () => {
    const newLift: Omit<LiftEscalator, 'id'> = {
      type: 'Passenger Lift', 
      quantity: 1,
      fsi: false,
      ratedLoad: 800,
      ratedSpeed: 1.0,
      motorEfficiency: 0.85,
      connectedLoadPerUnitInput: undefined, 
      powerFactor: 0.85,
      connectedLoadPerUnit: 0, 
      connectedLoad: 0,
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: false
    };
    addItem(liftEscalators, setLiftEscalators, newLift);
  };

  const handleAddHotWaterSystem = () => {
    const newSystem: Omit<HotWaterSystem, 'id'> = {
      equipmentType: 'boilerCalorifier', 
      description: 'New Hot Water Unit',
      quantity: 1,
      powerFactor: 1.0,
      connectedLoadPerUnit: 0,
      connectedLoad: 0,
      capacity: 15,
      pressure: 20,
      flowRate: 5,
      pumpEfficiency: 0.65,
      motorEfficiency: 0.85,
      powerKWPerUnit: 5,
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: false
    };
    addItem(hotWaterSystems, setHotWaterSystems, newSystem);
  };
  
  const handleAddMiscInstallation = () => addItem(miscInstallations, setMiscInstallations, { type: 'New Misc Equipment', quantity: 1, connectedLoadPerUnit: 5, connectedLoad: 0, floorNumber: 1, riserNumber: 1, emergencyPower: false });

  // --- Import/Export Handlers ---
  const handleExportData = () => {
    const dataToExport = {
      projectInfo,
      lightingSpaces,
      generalPowerSpaces,
      hvacPlants,
      hvacWaterDistributions,
      hvacAirDistributions,
      hvacVentilations,
      fireServices,
      waterPumps,
      liftEscalators,
      hotWaterSystems,
      miscInstallations,
      categorySummaries: categorySummaries.map(s => ({ 
        category: s.category, 
        diversityFactor: s.diversityFactor, 
        futureGrowthFactor: s.futureGrowthFactor,
      })),
      additionalDemand,
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electrical_load_estimation_${projectInfo.projectName.replace(/\s+/g, '_') || 'data'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string) as any; 
          if (importedData && importedData.projectInfo && importedData.lightingSpaces) { 
            setProjectInfo(importedData.projectInfo);
            setLightingSpaces(importedData.lightingSpaces || []);
            setGeneralPowerSpaces(importedData.generalPowerSpaces || []);
            setHVACPlants(importedData.hvacPlants || []);
            setHVACWaterDistributions(importedData.hvacWaterDistributions || []);
            setHVACAirDistributions(importedData.hvacAirDistributions || []);
            setHVACVentilations(importedData.hvacVentilations || []);
            setFireServices(importedData.fireServices || []);
            setWaterPumps(importedData.waterPumps || []);
            setLiftEscalators(importedData.liftEscalators || []);
            setHotWaterSystems(importedData.hotWaterSystems || []);
            setMiscInstallations(importedData.miscInstallations || []);
            
            if (importedData.categorySummaries && Array.isArray(importedData.categorySummaries)) {
                 setCategorySummaries(prevSummaries => 
                    prevSummaries.map((summary) => {
                        const importedSummary = importedData.categorySummaries.find((is: Pick<CategorySummary, 'category' | 'diversityFactor' | 'futureGrowthFactor'>) => is.category === summary.category);
                        if (importedSummary) {
                            return {
                                ...summary, 
                                diversityFactor: importedSummary.diversityFactor,
                                futureGrowthFactor: importedSummary.futureGrowthFactor,
                            };
                        }
                        return summary;
                    })
                );
            }

            setAdditionalDemand(importedData.additionalDemand || { powerQuality: 0, standbyPower: 0, reliabilityPercentage: 0 });
            
            event.target.value = ''; 
            alert('Data imported successfully!');
          } else {
            alert('Invalid file format.');
          }
        } catch (error) {
          console.error("Error importing data:", error);
          alert('Error importing data. Make sure the file is a valid JSON export from this tool.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'projectInfo':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-medium text-lg mb-4 text-gray-700">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input 
                  type="text" 
                  value={projectInfo.projectName} 
                  onChange={(e) => setProjectInfo({...projectInfo, projectName: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building Type</label>
                <select 
                  value={projectInfo.buildingType} 
                  onChange={(e) => setProjectInfo({...projectInfo, buildingType: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Building Type</option>
                  <option value="Office">Office</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Institutional">Institutional</option>
                  <option value="Mixed Use">Mixed Use</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  value={projectInfo.date} 
                  onChange={(e) => setProjectInfo({...projectInfo, date: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inform No. / Reference</label>
                <input 
                  type="text" 
                  value={projectInfo.informNo} 
                  onChange={(e) => setProjectInfo({...projectInfo, informNo: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Construction Floor Area (m²)</label>
                <input 
                  type="number" 
                  value={projectInfo.totalArea} 
                  onChange={(e) => setProjectInfo({...projectInfo, totalArea: Math.max(0, Number(e.target.value))})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Floors</label>
                <input 
                  type="number" 
                  value={projectInfo.numberOfFloors} 
                  onChange={(e) => setProjectInfo({...projectInfo, numberOfFloors: Math.max(1, Number(e.target.value))})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Risers</label>
                <input 
                  type="number" 
                  value={projectInfo.numberOfRisers} 
                  onChange={(e) => setProjectInfo({...projectInfo, numberOfRisers: Math.max(1, Number(e.target.value))})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>
        );
        
      case 'lighting':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">A. Lighting Installation</h3>
              <button 
                onClick={handleAddLightingSpace}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Space
              </button>
            </div>
            
            {lightingSpaces.map((space) => (
              <div key={space.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{space.name}</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(lightingSpaces, setLightingSpaces, space.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {renderFloorRiserFields(space, (id, updates) => updateItem(lightingSpaces, setLightingSpaces, id, updates), space.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space Name</label>
                    <input
                      type="text"
                      value={space.name}
                      onChange={(e) => updateItem(lightingSpaces, setLightingSpaces, space.id, { name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
                    <input
                      type="number"
                      value={space.area}
                      onChange={(e) => updateItem(lightingSpaces, setLightingSpaces, space.id, { area: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PD (W/m²)</label>
                    <input
                      type="number"
                      value={space.powerDensity}
                      onChange={(e) => updateItem(lightingSpaces, setLightingSpaces, space.id, { powerDensity: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input
                      type="number"
                      value={space.powerFactor}
                      onChange={(e) => updateItem(lightingSpaces, setLightingSpaces, space.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1"
                      max="1"
                      step="0.01"
                    />
                  </div>
                  {renderEmergencyPowerToggle(space, (id, updates) => updateItem(lightingSpaces, setLightingSpaces, id, updates), space.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {space.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-600">Connected Load (kVA) = Area (m²) × Power Density (W/m²) / (1000 × Power Factor)</p>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'A. Lighting Installation')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );

      case 'hvacWater':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">C2. HVAC - Water Side Distribution</h3>
              <button 
                onClick={handleAddHVACWaterDistribution}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add System/Pump
              </button>
            </div>
            
            {hvacWaterDistributions.map((dist) => (
              <div key={dist.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{dist.system}</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(dist, (id, updates) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, id, updates), dist.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System/Equipment Name</label>
                    <input
                      type="text"
                      value={dist.system}
                      onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { system: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                    <select
                      value={dist.equipmentType}
                      onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { equipmentType: e.target.value as HVACWaterDistribution['equipmentType'] })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pump">Water Pump</option>
                      <option value="other">Other Equipment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cooling Load (kWth)</label>
                    <input
                      type="number"
                      value={dist.coolingLoadServed}
                      onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { coolingLoadServed: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                     <p className="mt-1 text-xs text-gray-500">Informational or for alternative calculations.</p>
                  </div>

                  {dist.equipmentType === 'pump' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Water Flow Rate (L/s)</label>
                        <input
                          type="number"
                          value={dist.waterFlowRate}
                          onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { waterFlowRate: Math.max(0, Number(e.target.value)) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pump Head (kPa)</label>
                        <input
                          type="number"
                          value={dist.pumpHead}
                          onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { pumpHead: Math.max(0, Number(e.target.value)) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pump Efficiency</label>
                        <input
                          type="number"
                          value={dist.pumpEfficiency}
                          onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { pumpEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0.1" max="1" step="0.01"
                        />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motor Efficiency</label>
                        <input
                          type="number"
                          value={dist.motorEfficiency}
                          onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { motorEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0.1" max="1" step="0.01"
                        />
                      </div>
                    </>
                  )}

                  {dist.equipmentType === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Power (kW)</label>
                      <input
                        type="number"
                        value={dist.powerKWPerUnit ?? ''}
                        onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { powerKWPerUnit: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0" step="0.01"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input
                      type="number"
                      value={dist.powerFactor}
                      onChange={(e) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, dist.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  {renderEmergencyPowerToggle(dist, (id, updates) => updateItem(hvacWaterDistributions, setHVACWaterDistributions, id, updates), dist.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {dist.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {dist.equipmentType === 'pump' && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Pump Power (kW) = (Flow (L/s) × Head (kPa)) / (1000 × Pump Eff × Motor Eff)</p>
                  </div>
                )}
                {dist.equipmentType === 'other' && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Load (kVA) = Power (kW) / Power Factor</p>
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'C2. HVAC - Water Side Distribution')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );

      case 'liftEscalator':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">F. Lift & Escalator Installation</h3>
              <button 
                onClick={handleAddLiftEscalator}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Equipment
              </button>
            </div>
            
            {liftEscalators.map((item) => {
              const isEscalatorOrWalkway = item.type === 'Escalator' || item.type === 'Moving Walkway';
              return (
                <div key={item.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{item.type} (Qty: {item.quantity})</h4>
                    <div>
                      <button 
                        onClick={() => removeItem(liftEscalators, setLiftEscalators, item.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {renderFloorRiserFields(item, (id, updates) => updateItem(liftEscalators, setLiftEscalators, id, updates), item.id)}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select value={item.type} onChange={(e) => updateItem(liftEscalators, setLiftEscalators, item.id, { type: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="Passenger Lift">Passenger Lift</option>
                        <option value="Goods Lift">Goods Lift</option>
                        <option value="Fireman Lift">Fireman Lift</option>
                        <option value="Service Lift">Service Lift</option>
                        <option value="Escalator">Escalator</option>
                        <option value="Moving Walkway">Moving Walkway</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(liftEscalators, setLiftEscalators, item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="1"/>
                    </div>

                    {!isEscalatorOrWalkway && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rated Load (kg)</label>
                          <input type="number" value={item.ratedLoad ?? ''} onChange={(e) => updateItem(liftEscalators, setLiftEscalators, item.id, { ratedLoad: Math.max(0, Number(e.target.value)) })}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rated Speed (m/s)</label>
                          <input type="number" value={item.ratedSpeed ?? ''} onChange={(e) => updateItem(liftEscalators, setLiftEscalators, item.id, { ratedSpeed: Math.max(0, Number(e.target.value)) })}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0" step="0.1"/>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Motor Efficiency</label>
                          <input type="number" value={item.motorEfficiency ?? ''} onChange={(e) => updateItem(liftEscalators, setLiftEscalators, item.id, { motorEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                        </div>
                      </>
                    )}
                     {isEscalatorOrWalkway && (
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Load per Unit (kW)</label>
                        <input type="number" value={item.connectedLoadPerUnitInput ?? ''} onChange={(e) => updateItem(liftEscalators, setLiftEscalators, item.id, { connectedLoadPerUnitInput: Math.max(0, Number(e.target.value)) })}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0" step="0.1"/>
                        </div>
                     )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                      <input type="number" value={item.powerFactor} onChange={(e) => updateItem(liftEscalators, setLiftEscalators, item.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                    </div>
                    {renderLiftEscalatorToggles(item, (id, updates) => updateItem(liftEscalators, setLiftEscalators, id, updates), item.id)}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Connected Load (kVA)</label>
                      <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                          {item.connectedLoadPerUnit.toFixed(2)} 
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Connected Load (kVA)</label>
                      <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                        {item.connectedLoad.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {!isEscalatorOrWalkway && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Power (kW) = (0.00981 × Load (kg) × Speed (m/s) × k_unbalance) / Motor Eff (k_unbalance ≈ 0.6)</p>
                    <p className="text-gray-600">Unit Load (kVA) = Power (kW) / Power Factor</p>
                    </div>
                  )}
                   {isEscalatorOrWalkway && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Unit Load (kVA) = Load per Unit (kW) / Power Factor</p>
                    </div>
                  )}
                </div>
              )
            })}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'F. Lift & Escalator Installation')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">Total Estimated Electrical Demand Summary</h3>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Report Type:</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'overall' | 'byFloor' | 'byRiser')}
                  className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="overall">Overall Summary</option>
                  <option value="byFloor">Summary by Floor</option>
                  <option value="byRiser">Summary by Riser</option>
                </select>
              </div>
            </div>

            {reportType === 'overall' && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Connected Load (kVA)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diversity Factor</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Future Growth Factor (Category)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diversified Load (incl. Category Growth) (kVA)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categorySummaries.map((summary, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{summary.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{summary.estimatedConnectedLoad.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input type="number" value={summary.diversityFactor}
                              onChange={(e) => {
                                const newFactor = Number(e.target.value);
                                   setCategorySummaries(prevSummaries => 
                                    prevSummaries.map((prevSummary, i) => 
                                      i === index ? { ...prevSummary, diversityFactor: Math.max(0.1, Math.min(1, newFactor)) } : prevSummary
                                    )
                                  );
                              }}
                              className="w-20 p-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              min="0.1" max="1" step="0.01" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input type="number" value={summary.futureGrowthFactor}
                               onChange={(e) => {
                                const newFactor = Number(e.target.value);
                                   setCategorySummaries(prevSummaries => 
                                    prevSummaries.map((prevSummary, i) => 
                                      i === index ? { ...prevSummary, futureGrowthFactor: Math.max(0, Math.min(1, newFactor)) } : prevSummary
                                    )
                                  );
                              }}
                              className="w-20 p-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              min="0" max="1" step="0.01" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{summary.diversifiedConnectedLoad.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Connected Load</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {categorySummaries.reduce((sum, summary) => sum + summary.estimatedConnectedLoad, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" colSpan={2}>
                          Overall Diversity (incl. Category Growth): {overallDiversityFactor.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{totalDiversifiedLoad.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Additional Demand</td>
                        <td colSpan={3}></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{totalAdditionalDemand.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-blue-100">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900">Total Estimated Electrical Demand</td>
                        <td colSpan={3}></td>
                        <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-blue-900">{totalEstimatedDemand.toFixed(2)} kVA</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Emergency Power and FSI Summary */}
                <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-lg mb-2 text-yellow-800">Special Load Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-yellow-800">Total Emergency Power Load:</p>
                      <p className="font-bold text-yellow-900 text-lg">{totalEmergencyPowerLoad.toFixed(2)} kVA</p>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-800">Total FSI Load (Lifts FSI + Cat. D):</p>
                      <p className="font-bold text-yellow-900 text-lg">{totalFSILoad.toFixed(2)} kVA</p>
                    </div>
                  </div>
                   <p className="mt-2 text-xs text-yellow-700">Note: "Total FSI Load" includes FSI-designated lifts and all equipment from "D. Fire Service Installations".</p>
                </div>

                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-lg mb-2 text-blue-700">Electrical Demand Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-800">Total Construction Floor Area:</p>
                      <p className="font-semibold text-blue-900">{projectInfo.totalArea.toFixed(2)} m²</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800">Demand Density:</p>
                      <p className="font-bold text-blue-900 text-lg">{demandDensity.toFixed(2)} VA/m²</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-blue-800">Recommended Transformer Size:</p>
                    <p className="font-bold text-blue-900 text-lg">
                      {Math.ceil(totalEstimatedDemand / 100) * 100} kVA
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      (Approximated by rounding up Total Estimated Demand to the next 100 kVA. Consult standards for precise sizing.)
                    </p>
                  </div>
                </div>
              </>
            )}

            {reportType === 'byFloor' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Load (kVA)</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emergency Load (kVA)</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FSI Load (Lifts FSI + Cat. D) (kVA)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFloorSummaries().map((floor, index) => (
                      <tr key={floor.floor} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Floor {floor.floor}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{floor.totalLoad.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{floor.emergencyLoad.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{floor.fsiLoad.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {getFloorSummaries().reduce((sum, floor) => sum + floor.totalLoad, 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {getFloorSummaries().reduce((sum, floor) => sum + floor.emergencyLoad, 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {getFloorSummaries().reduce((sum, floor) => sum + floor.fsiLoad, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {reportType === 'byRiser' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Riser</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Load (kVA)</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emergency Load (kVA)</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FSI Load (Lifts FSI + Cat. D) (kVA)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getRiserSummaries().map((riser, index) => (
                      <tr key={riser.riser} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Riser {riser.riser}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{riser.totalLoad.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{riser.emergencyLoad.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{riser.fsiLoad.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {getRiserSummaries().reduce((sum, riser) => sum + riser.totalLoad, 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {getRiserSummaries().reduce((sum, riser) => sum + riser.emergencyLoad, 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {getRiserSummaries().reduce((sum, riser) => sum + riser.fsiLoad, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );

      case 'generalPower':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">B. General Power</h3>
              <button 
                onClick={handleAddGeneralPowerSpace}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Space
              </button>
            </div>
            
            {generalPowerSpaces.map((space) => (
              <div key={space.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{space.name}</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(generalPowerSpaces, setGeneralPowerSpaces, space.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(space, (id, updates) => updateItem(generalPowerSpaces, setGeneralPowerSpaces, id, updates), space.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space Name</label>
                    <input
                      type="text"
                      value={space.name}
                      onChange={(e) => updateItem(generalPowerSpaces, setGeneralPowerSpaces, space.id, { name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
                    <input
                      type="number"
                      value={space.area}
                      onChange={(e) => updateItem(generalPowerSpaces, setGeneralPowerSpaces, space.id, { area: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PD (VA/m²)</label>
                    <input
                      type="number"
                      value={space.powerDensity}
                      onChange={(e) => updateItem(generalPowerSpaces, setGeneralPowerSpaces, space.id, { powerDensity: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  {renderEmergencyPowerToggle(space, (id, updates) => updateItem(generalPowerSpaces, setGeneralPowerSpaces, id, updates), space.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {space.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-600">Connected Load (kVA) = Area (m²) × Power Density (VA/m²) / 1000</p>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'B. General Power')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );

      case 'hvacPlant': 
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">C1. HVAC - Refrigeration/Heating Water Plant</h3>
              <button 
                onClick={handleAddHVACPlant}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Plant Unit
              </button>
            </div>
            
            {hvacPlants.map((plant) => (
              <div key={plant.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{plant.type} (Qty: {plant.quantity})</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(hvacPlants, setHVACPlants, plant.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(plant, (id, updates) => updateItem(hvacPlants, setHVACPlants, id, updates), plant.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plant Type</label>
                    <input
                      type="text"
                      value={plant.type}
                      onChange={(e) => updateItem(hvacPlants, setHVACPlants, plant.id, { type: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={plant.quantity}
                      onChange={(e) => updateItem(hvacPlants, setHVACPlants, plant.id, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cooling Load (kWth)</label>
                    <input
                      type="number"
                      value={plant.coolingHeatingLoad}
                      onChange={(e) => updateItem(hvacPlants, setHVACPlants, plant.id, { coolingHeatingLoad: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">COP</label>
                    <input
                      type="number"
                      value={plant.cop}
                      onChange={(e) => updateItem(hvacPlants, setHVACPlants, plant.id, { cop: Math.max(0.1, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input
                      type="number"
                      value={plant.powerFactor}
                      onChange={(e) => updateItem(hvacPlants, setHVACPlants, plant.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  {renderEmergencyPowerToggle(plant, (id, updates) => updateItem(hvacPlants, setHVACPlants, id, updates), plant.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {plant.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-600">Load (kVA) = (Load per Unit (kWth) / COP / Power Factor) × Quantity</p>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'C1. HVAC - Refrigeration/Heating Water Plant')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );

      case 'hvacAir':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">C3. HVAC - Air Side Distribution</h3>
              <button 
                onClick={handleAddHVACAirDistribution}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Equipment
              </button>
            </div>
            
            {hvacAirDistributions.map((equip) => (
              <div key={equip.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{equip.equipment}</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(hvacAirDistributions, setHVACAirDistributions, equip.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(equip, (id, updates) => updateItem(hvacAirDistributions, setHVACAirDistributions, id, updates), equip.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                    <input
                      type="text"
                      value={equip.equipment}
                      onChange={(e) => updateItem(hvacAirDistributions, setHVACAirDistributions, equip.id, { equipment: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cooling Load (kWth)</label>
                    <input
                      type="number"
                      value={equip.coolingLoadServed}
                      onChange={(e) => updateItem(hvacAirDistributions, setHVACAirDistributions, equip.id, { coolingLoadServed: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Air Flow Rate (L/s)</label>
                    <input
                      type="number"
                      value={equip.airFlowRate}
                      onChange={(e) => updateItem(hvacAirDistributions, setHVACAirDistributions, equip.id, { airFlowRate: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fan Total Pressure (Pa)</label>
                    <input
                      type="number"
                      value={equip.fanPressure}
                      onChange={(e) => updateItem(hvacAirDistributions, setHVACAirDistributions, equip.id, { fanPressure: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fan Efficiency</label>
                    <input
                      type="number"
                      value={equip.fanEfficiency}
                      onChange={(e) => updateItem(hvacAirDistributions, setHVACAirDistributions, equip.id, { fanEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motor Efficiency</label>
                    <input
                      type="number"
                      value={equip.motorEfficiency}
                      onChange={(e) => updateItem(hvacAirDistributions, setHVACAirDistributions, equip.id, { motorEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input
                      type="number"
                      value={equip.powerFactor}
                      onChange={(e) => updateItem(hvacAirDistributions, setHVACAirDistributions, equip.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  {renderEmergencyPowerToggle(equip, (id, updates) => updateItem(hvacAirDistributions, setHVACAirDistributions, id, updates), equip.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {equip.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-600">Fan Power (kW) = (Air Flow (L/s) × Pressure (Pa)) / (1000 × 1000 × Fan Eff × Motor Eff)</p>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'C3. HVAC - Air Side Distribution')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'hvacVent':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">C4. HVAC - Mechanical Ventilation</h3>
              <button 
                onClick={handleAddHVACVentilation}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Equipment
              </button>
            </div>
            
            {hvacVentilations.map((vent) => (
              <div key={vent.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{vent.equipment}</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(hvacVentilations, setHVACVentilations, vent.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(vent, (id, updates) => updateItem(hvacVentilations, setHVACVentilations, id, updates), vent.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                    <input
                      type="text"
                      value={vent.equipment}
                      onChange={(e) => updateItem(hvacVentilations, setHVACVentilations, vent.id, { equipment: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Air Flow Rate (L/s)</label>
                    <input
                      type="number"
                      value={vent.airFlowRate}
                      onChange={(e) => updateItem(hvacVentilations, setHVACVentilations, vent.id, { airFlowRate: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fan Total Pressure (Pa)</label>
                    <input
                      type="number"
                      value={vent.fanPressure}
                      onChange={(e) => updateItem(hvacVentilations, setHVACVentilations, vent.id, { fanPressure: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fan Efficiency</label>
                    <input
                      type="number"
                      value={vent.fanEfficiency}
                      onChange={(e) => updateItem(hvacVentilations, setHVACVentilations, vent.id, { fanEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motor Efficiency</label>
                    <input
                      type="number"
                      value={vent.motorEfficiency}
                      onChange={(e) => updateItem(hvacVentilations, setHVACVentilations, vent.id, { motorEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input
                      type="number"
                      value={vent.powerFactor}
                      onChange={(e) => updateItem(hvacVentilations, setHVACVentilations, vent.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0.1" max="1" step="0.01"
                    />
                  </div>
                  {renderEmergencyPowerToggle(vent, (id, updates) => updateItem(hvacVentilations, setHVACVentilations, id, updates), vent.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {vent.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                   <p className="text-gray-600">Fan Power (kW) = (Air Flow (L/s) × Pressure (Pa)) / (1000 × 1000 × Fan Eff × Motor Eff)</p>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'C4. HVAC - Mechanical Ventilation')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'fireService':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">D. Fire Service Installations</h3>
              <button 
                onClick={handleAddFireService}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Equipment
              </button>
            </div>
            
            {fireServices.map((service) => (
              <div key={service.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{service.description} (Qty: {service.quantity})</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(fireServices, setFireServices, service.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(service, (id, updates) => updateItem(fireServices, setFireServices, id, updates), service.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={service.description}
                      onChange={(e) => updateItem(fireServices, setFireServices, service.id, { description: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                    <select
                      value={service.equipmentType}
                      onChange={(e) => updateItem(fireServices, setFireServices, service.id, { equipmentType: e.target.value as FireService['equipmentType'] })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pump">Water Pump</option>
                      <option value="other">Other Equipment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={service.quantity}
                      onChange={(e) => updateItem(fireServices, setFireServices, service.id, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  
                  {service.equipmentType === 'pump' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pressure (m head)</label>
                        <input type="number" value={service.pressure ?? ''} onChange={(e) => updateItem(fireServices, setFireServices, service.id, { pressure: Math.max(0, Number(e.target.value)) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Flow Rate (L/s)</label>
                        <input type="number" value={service.flowRate ?? ''} onChange={(e) => updateItem(fireServices, setFireServices, service.id, { flowRate: Math.max(0, Number(e.target.value)) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pump Efficiency</label>
                        <input type="number" value={service.pumpEfficiency ?? 0.7} onChange={(e) => updateItem(fireServices, setFireServices, service.id, { pumpEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motor Efficiency</label>
                        <input type="number" value={service.motorEfficiency ?? 0.9} onChange={(e) => updateItem(fireServices, setFireServices, service.id, { motorEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                      </div>
                    </>
                  )}
                  
                  {service.equipmentType === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Power per Unit (kW)</label>
                      <input type="number" value={service.powerKWPerUnit ?? ''} onChange={(e) => updateItem(fireServices, setFireServices, service.id, { powerKWPerUnit: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0" step="0.01"/>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input type="number" value={service.powerFactor} onChange={(e) => updateItem(fireServices, setFireServices, service.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                  </div>
                  {renderEmergencyPowerToggle(service, (id, updates) => updateItem(fireServices, setFireServices, id, updates), service.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Connected Load (kVA)</label>
                      <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {service.connectedLoadPerUnit.toFixed(2)}
                    </div>
                  </div>
                                    
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {service.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {service.equipmentType === 'pump' && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Pump Power (kW) = (Flow (L/s) × Pressure (m) × 9.81) / (1000 × Pump Eff × Motor Eff)</p>
                    <p className="text-gray-600">Unit Load (kVA) = Pump Power (kW) / Power Factor</p>
                  </div>
                )}
                {service.equipmentType === 'other' && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Unit Load (kVA) = Power per Unit (kW) / Power Factor</p>
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'D. Fire Service Installations')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'waterPumps':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">E. Water Pumps for P&D</h3>
              <button 
                onClick={handleAddWaterPump}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Pump
              </button>
            </div>
            
            {waterPumps.map((pump) => (
              <div key={pump.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{pump.type} (Qty: {pump.quantity})</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(waterPumps, setWaterPumps, pump.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(pump, (id, updates) => updateItem(waterPumps, setWaterPumps, id, updates), pump.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pump Type</label>
                    <input
                      type="text"
                      value={pump.type}
                      onChange={(e) => updateItem(waterPumps, setWaterPumps, pump.id, { type: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={pump.quantity}
                      onChange={(e) => updateItem(waterPumps, setWaterPumps, pump.id, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Pressure (m)</label>
                    <input
                      type="number"
                      value={pump.pressure}
                      onChange={(e) => updateItem(waterPumps, setWaterPumps, pump.id, { pressure: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flow Rate (L/s)</label>
                    <input
                      type="number"
                      value={pump.flowRate}
                      onChange={(e) => updateItem(waterPumps, setWaterPumps, pump.id, { flowRate: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0" step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pump Efficiency</label>
                    <input type="number" value={pump.pumpEfficiency} onChange={(e) => updateItem(waterPumps, setWaterPumps, pump.id, { pumpEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motor Efficiency</label>
                    <input type="number" value={pump.motorEfficiency} onChange={(e) => updateItem(waterPumps, setWaterPumps, pump.id, { motorEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input type="number" value={pump.powerFactor} onChange={(e) => updateItem(waterPumps, setWaterPumps, pump.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                  </div>
                  {renderEmergencyPowerToggle(pump, (id, updates) => updateItem(waterPumps, setWaterPumps, id, updates), pump.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {pump.connectedLoadPerUnit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {pump.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-600">Pump Power (kW) = (Flow (L/s) × Pressure (m) × 9.81) / (1000 × Pump Eff × Motor Eff)</p>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'E. Water Pumps for P&D')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );

      case 'hotWater':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">G. Hot Water Boiler / Calorifier Installation</h3>
              <button 
                onClick={handleAddHotWaterSystem}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Equipment
              </button>
            </div>
            
            {hotWaterSystems.map((system) => (
              <div key={system.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{system.description} (Qty: {system.quantity})</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(hotWaterSystems, setHotWaterSystems, system.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(system, (id, updates) => updateItem(hotWaterSystems, setHotWaterSystems, id, updates), system.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" value={system.description} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { description: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                    <select value={system.equipmentType} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { equipmentType: e.target.value as HotWaterSystem['equipmentType'] })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                      <option value="boilerCalorifier">Boiler/Calorifier</option>
                      <option value="pump">Water Pump</option>
                      <option value="other">Other Equipment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input type="number" value={system.quantity} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="1"/>
                  </div>
                  
                  {system.equipmentType === 'boilerCalorifier' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacity per Unit (kW)</label>
                      <input type="number" value={system.capacity ?? ''} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { capacity: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0" step="0.1"/>
                    </div>
                  )}
                  
                  {system.equipmentType === 'pump' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pressure (m head)</label>
                        <input type="number" value={system.pressure ?? ''} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { pressure: Math.max(0, Number(e.target.value)) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Flow Rate (L/s)</label>
                        <input type="number" value={system.flowRate ?? ''} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { flowRate: Math.max(0, Number(e.target.value)) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pump Efficiency</label>
                        <input type="number" value={system.pumpEfficiency ?? 0.7} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { pumpEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motor Efficiency</label>
                        <input type="number" value={system.motorEfficiency ?? 0.9} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { motorEfficiency: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                      </div>
                    </>
                  )}
                  
                  {system.equipmentType === 'other' && (
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Power per Unit (kW)</label>
                      <input type="number" value={system.powerKWPerUnit ?? ''} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { powerKWPerUnit: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0" step="0.01"/>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                    <input type="number" value={system.powerFactor} onChange={(e) => updateItem(hotWaterSystems, setHotWaterSystems, system.id, { powerFactor: Math.max(0.1, Math.min(1, Number(e.target.value))) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0.1" max="1" step="0.01"/>
                  </div>
                  {renderEmergencyPowerToggle(system, (id, updates) => updateItem(hotWaterSystems, setHotWaterSystems, id, updates), system.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                    {system.connectedLoadPerUnit.toFixed(2)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {system.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                {system.equipmentType === 'pump' && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Pump Power (kW) = (Flow (L/s) × Pressure (m) × 9.81) / (1000 × Pump Eff × Motor Eff)</p>
                    <p className="text-gray-600">Unit Load (kVA) = Pump Power (kW) / Power Factor</p>
                  </div>
                )}
                 {system.equipmentType === 'boilerCalorifier' && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Unit Load (kVA) = Capacity per Unit (kW) / Power Factor</p>
                  </div>
                )}
                 {system.equipmentType === 'other' && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Unit Load (kVA) = Power per Unit (kW) / Power Factor</p>
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'G. Hot Water Boiler / Calorifier Installation')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'miscellaneous':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">H. Miscellaneous Installation</h3>
              <button 
                onClick={handleAddMiscInstallation}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Equipment
              </button>
            </div>
            
            {miscInstallations.map((misc) => (
              <div key={misc.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{misc.type} (Qty: {misc.quantity})</h4>
                  <div>
                    <button 
                      onClick={() => removeItem(miscInstallations, setMiscInstallations, misc.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderFloorRiserFields(misc, (id, updates) => updateItem(miscInstallations, setMiscInstallations, id, updates), misc.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <input type="text" value={misc.type} onChange={(e) => updateItem(miscInstallations, setMiscInstallations, misc.id, { type: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input type="number" value={misc.quantity} onChange={(e) => updateItem(miscInstallations, setMiscInstallations, misc.id, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="1"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Load per Unit (kVA)</label>
                    <input type="number" value={misc.connectedLoadPerUnit} onChange={(e) => updateItem(miscInstallations, setMiscInstallations, misc.id, { connectedLoadPerUnit: Math.max(0, Number(e.target.value)) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0" step="0.1"/>
                  </div>
                  {renderEmergencyPowerToggle(misc, (id, updates) => updateItem(miscInstallations, setMiscInstallations, id, updates), misc.id)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Connected Load (kVA)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md font-medium text-gray-800">
                      {misc.connectedLoad.toFixed(2)}
                    </div>
                  </div>
                </div>
                 <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600">Total Load (kVA) = Quantity × Load per Unit (kVA)</p>
                  </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-700">Total Connected Load:</h4>
                <p className="font-bold text-blue-800 text-lg">
                  {categorySummaries.find(s => s.category === 'H. Miscellaneous Installation')?.estimatedConnectedLoad.toFixed(2) || '0.00'} kVA
                </p>
              </div>
            </div>
          </div>
        );

      case 'additionalDemand':
        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-medium text-lg mb-4 text-gray-700">Additional Electrical Demand Considerations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Power Quality Improvement (kVA)</label>
                <input 
                  type="number" 
                  value={additionalDemand.powerQuality} 
                  onChange={(e) => setAdditionalDemand({...additionalDemand, powerQuality: Math.max(0, Number(e.target.value))})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">For harmonic filters, active PFC, etc.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Standby Power (kVA)</label>
                <input 
                  type="number" 
                  value={additionalDemand.standbyPower} 
                  onChange={(e) => setAdditionalDemand({...additionalDemand, standbyPower: Math.max(0, Number(e.target.value))})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">Allowance for standby power requirements</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reliability Enhancement (%)</label>
                <input 
                  type="number" 
                  value={additionalDemand.reliabilityPercentage} 
                  onChange={(e) => setAdditionalDemand({...additionalDemand, reliabilityPercentage: Math.max(0, Math.min(100, Number(e.target.value)))})}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0" max="100"
                />
                <p className="mt-1 text-xs text-gray-500">Percentage of total diversified load (incl. category growth) for N+1 redundancy etc.</p>
              </div>
            </div>
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-base mb-3 text-gray-700">Additional Demand Calculation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Power Quality Improvement:</p>
                  <p className="font-semibold text-gray-800">{additionalDemand.powerQuality.toFixed(2)} kVA</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Standby Power:</p>
                  <p className="font-semibold text-gray-800">{additionalDemand.standbyPower.toFixed(2)} kVA</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reliability Enhancement:</p>
                  <p className="font-semibold text-gray-800">
                    {(totalDiversifiedLoad * additionalDemand.reliabilityPercentage / 100).toFixed(2)} kVA
                  </p>
                  <p className="text-xs text-gray-500">({additionalDemand.reliabilityPercentage}% of {totalDiversifiedLoad.toFixed(2)} kVA total diversified load incl. cat. growth)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Total Additional Demand:</p>
                  <p className="font-bold text-gray-800 text-lg">{totalAdditionalDemand.toFixed(2)} kVA</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Select a category to begin or view the summary.</div>;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-wrap justify-between items-center gap-y-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">Enhanced Electrical Load Estimation Calculator</h1>
        </div>
        <div className="flex items-center space-x-2">
            <button
                onClick={handleExportData}
                className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 shadow-sm"
            >
                Export Data
            </button>
            <label
                htmlFor="import-file"
                className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-purple-700 shadow-sm cursor-pointer"
            >
                Import Data
            </label>
            <input
                type="file"
                id="import-file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
            />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Navigation Panel */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:col-span-1">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Categories</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('projectInfo')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'projectInfo' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Project Information
            </button>
             <button
              onClick={() => setActiveTab('summary')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'summary' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Demand Summary & Results
            </button>
            <button
              onClick={() => setActiveTab('lighting')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'lighting' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              A. Lighting Installation
            </button>
            <button
              onClick={() => setActiveTab('generalPower')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'generalPower' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              B. General Power
            </button>
            <button
              onClick={() => setActiveTab('hvacPlant')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'hvacPlant' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              C1. HVAC - Plant
            </button>
            <button
              onClick={() => setActiveTab('hvacWater')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'hvacWater' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              C2. HVAC - Water Distribution
            </button>
            <button
              onClick={() => setActiveTab('hvacAir')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'hvacAir' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              C3. HVAC - Air Distribution
            </button>
            <button
              onClick={() => setActiveTab('hvacVent')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'hvacVent' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              C4. HVAC - Mechanical Ventilation
            </button>
            <button
              onClick={() => setActiveTab('fireService')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'fireService' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              D. Fire Service Installations
            </button>
            <button
              onClick={() => setActiveTab('waterPumps')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'waterPumps' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              E. Water Pumps for P&D
            </button>
            <button
              onClick={() => setActiveTab('liftEscalator')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'liftEscalator' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              F. Lift & Escalator Installation
            </button>
            <button
              onClick={() => setActiveTab('hotWater')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'hotWater' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              G. Hot Water Installation
            </button>
            <button
              onClick={() => setActiveTab('miscellaneous')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'miscellaneous' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              H. Miscellaneous Installation
            </button>
            <button
              onClick={() => setActiveTab('additionalDemand')}
              className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'additionalDemand' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Additional Demand
            </button>
          </nav>

          {/* Quick Results Panel */}
          <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-base mb-3 text-gray-700">Quick Summary</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Total Connected Load:</p>
                <p className="font-semibold text-gray-800">
                  {categorySummaries.reduce((sum, summary) => sum + summary.estimatedConnectedLoad, 0).toFixed(2)} kVA
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Diversified Load (incl. Cat. Growth):</p>
                <p className="font-semibold text-gray-800">{totalDiversifiedLoad.toFixed(2)} kVA</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Additional Demand:</p>
                <p className="font-semibold text-gray-800">{totalAdditionalDemand.toFixed(2)} kVA</p>
              </div>
              <div className="pt-2 border-t border-gray-300">
                <p className="text-sm font-medium text-gray-700">Total Estimated Demand:</p>
                <p className="font-bold text-blue-700 text-lg">{totalEstimatedDemand.toFixed(2)} kVA</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Emergency Power Load:</p>
                <p className="font-semibold text-red-700">{totalEmergencyPowerLoad.toFixed(2)} kVA</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">FSI Load (Lifts FSI + Cat. D):</p>
                <p className="font-semibold text-orange-700">{totalFSILoad.toFixed(2)} kVA</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Demand Density:</p>
                <p className="font-semibold text-gray-800">{demandDensity.toFixed(2)} VA/m²</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2">
          {renderTabContent()}
          
          {/* Calculation Guide */}
          <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-lg mb-2 text-gray-700">Calculation Notes & Formulas</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Lighting Load (kVA) = Area (m²) × Power Density (W/m²) / (1000 × Power Factor)</li>
              <li>General Power Load (kVA) = Area (m²) × Power Density (VA/m²) / 1000</li>
              <li>HVAC Plant Load (kVA) = (Cooling/Heating Load per Unit (kWth) / COP / Power Factor) × Quantity</li>
              <li>Pump Power (kW) (Head in kPa, Flow in L/s, e.g., HVAC Water Dist.): <br/> (Flow Rate (L/s) × Head (kPa)) / (1000 × Pump Eff × Motor Eff)</li>
              <li>Pump Power (kW) (Head in m, Flow in L/s, e.g., P&D, Fire, Hot Water Pump): <br/> (Flow Rate (L/s) × Head (m) × 9.81) / (1000 × Pump Eff × Motor Eff)</li>
              <li>Fan Power (kW) (Flow in L/s, Pressure in Pa): <br/> (Flow Rate (L/s) × Pressure (Pa)) / (1000 × 1000 × Fan Eff × Motor Eff)</li>
              <li>Lift Power (kW): (0.00981 × Rated Load (kg) × Speed (m/s) × k_unbalance) / Motor Efficiency. (k_unbalance ≈ 0.6).</li>
              <li>Escalators/Walkways: Unit Load (kVA) = Load per Unit (kW) / Power Factor</li>
              <li>Boiler/Calorifier or 'Other' type equipment (Hot Water, Fire Service): Unit Load (kVA) = Capacity/Power (kW) / Power Factor</li>
              <li>Misc. Installation: Total Load (kVA) = Quantity × Load per Unit (kVA)</li>
              <li>Diversified Load (kVA) = Est. Connected Load (kVA) × Diversity Factor × (1 + Category Future Growth Factor)</li>
              <li>Overall Diversity Factor = Total Diversified Load (incl. growth) / Total Est. Connected Load</li>
              <li>Total Estimated Demand (kVA) = Total Diversified Load (incl. growth) + Total Additional Demand</li>
              <li>Demand Density (VA/m²) = Total Estimated Demand (kVA) × 1000 / Total Area (m²)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectricalLoadCalculator;