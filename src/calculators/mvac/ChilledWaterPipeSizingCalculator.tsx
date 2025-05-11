import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface ChilledWaterPipeSizingCalculatorProps {
  onShowTutorial?: () => void;
}

type PipeType = 'main' | 'branch' | 'connection';

interface PipeSection {
  id: string;
  length: number;
  diameter: string; // Nominal size string (e.g., "1.5", "2")
  innerDiameter?: number; // mm
  material: string;
  customRoughness: boolean;
  materialRoughness: number; // mm
  flowRate: number; // l/s
  fittings: PipeFitting[];
  type: PipeType;
}

interface PipeFitting {
  id: string;
  type: string;
  kValue: number;
  quantity: number;
  isCustom: boolean;
  pressureDropMethod: 'kValue' | 'direct';
  directPressureDrop?: number; // Pa
}

interface EditableFitting {
  sectionId: string;
  fittingId: string;
  newKValue?: number;
  newName?: string;
  newDirectPressureDrop?: number;
  newMethod?: 'kValue' | 'direct';
}

interface PipeMaterialOption {
  id: string;
  name: string;
  roughness: number; // mm
  schedule: {
    [nominalSize: string]: number; // mm
  };
}

interface PipeFittingOption {
  id: string;
  name: string;
  kValue: number;
  sizeDependent?: boolean;
  kValueBySize?: {
    [nominalSize: string]: number;
  };
}

const MAIN_PIPE_VELOCITY_LIMIT = 3.0;
const BRANCH_PIPE_VELOCITY_LIMIT = 2.4;
const CONNECTION_PIPE_VELOCITY_LIMIT = 1.2;

// Pure function to get inner diameter, no state updates here
const getInnerDiameterInternal = (
  nominalSize: string,
  materialId: string,
  materialOpts: PipeMaterialOption[]
): number | null => {
  const material = materialOpts.find(m => m.id === materialId);
  if (!material || material.id === 'custom' || !material.schedule[nominalSize]) {
    if (material && material.id === 'custom') return null; 

    const parsedNominalInches = parseFloat(nominalSize);
    if (!isNaN(parsedNominalInches) && parsedNominalInches > 0) {
      return parsedNominalInches * 25.4 * 0.85;
    }
    return null; 
  }
  return material.schedule[nominalSize];
};


const ChilledWaterPipeSizingCalculator: React.FC<ChilledWaterPipeSizingCalculatorProps> = ({ onShowTutorial }) => {
  const [systemCoolingLoad, setSystemCoolingLoad] = useState<number>(50);
  const [temperatureDrop, setTemperatureDrop] = useState<number>(5.5);
  const [systemFlowRate, setSystemFlowRate] = useState<number>(2.2);
  const [flowRateManual, setFlowRateManual] = useState<boolean>(false);
  const [waterTemperature, setWaterTemperature] = useState<number>(7);
  const [glycolPercentage, setGlycolPercentage] = useState<number>(0);
  const [safetyFactor, setSafetyFactor] = useState<number>(1.2);
  const [pumpEfficiency, setPumpEfficiency] = useState<number>(0.7);

  const [lowTempDropWarning, setLowTempDropWarning] = useState<boolean>(false);
  const [innerDiameterWarning, setInnerDiameterWarning] = useState<boolean>(false);
  const [frictionFactorWarning, setFrictionFactorWarning] = useState<boolean>(false);
  
  const [customFittingName, setCustomFittingName] = useState<string>('');
  const [customFittingKValue, setCustomFittingKValue] = useState<number>(0.5);
  const [customFittingPressureDrop, setCustomFittingPressureDrop] = useState<number>(100);
  const [customFittingMethod, setCustomFittingMethod] = useState<'kValue' | 'direct'>('kValue');
  const [editingFitting, setEditingFitting] = useState<EditableFitting | null>(null);
  
  const [editingSectionIdForCustomSize, setEditingSectionIdForCustomSize] = useState<string | null>(null);
  const [customPipeSize, setCustomPipeSize] = useState<string>(''); 
  const [customInnerDiameter, setCustomInnerDiameter] = useState<number | null>(null); 
  
  const [pipeSections, setPipeSections] = useState<PipeSection[]>([]);
  
  const materialOptions: PipeMaterialOption[] = [
    { id: 'steel', name: 'Steel (Schedule 40)', roughness: 0.045, schedule: {'0.375':12.5,'0.5':15.8,'0.75':20.9,'1':26.6,'1.25':35.1,'1.5':40.9,'2':52.5,'2.5':62.7,'3':77.9,'4':102.3,'6':154.1,'8':202.7,'10':254.5,'12':303.2}},
    { id: 'copper', name: 'Copper (Type L)', roughness: 0.0015, schedule: {'0.375':11.0,'0.5':13.8,'0.75':19.0,'1':25.6,'1.25':32.0,'1.5':38.1,'2':50.8,'2.5':63.5,'3':76.2,'4':101.6,'6':152.4,'8':203.2,'10':254.0,'12':304.8}},
    { id: 'pvc', name: 'PVC (Schedule 40)', roughness: 0.0015, schedule: {'0.375':12.4,'0.5':15.3,'0.75':20.4,'1':26.2,'1.25':34.5,'1.5':40.9,'2':52.5,'2.5':62.1,'3':77.9,'4':102.3,'6':154.1,'8':202.7,'10':254.5,'12':304.8}},
    { id: 'stainlesssteel', name: 'Stainless Steel (Schedule 40s)', roughness: 0.0015, schedule: {'0.375':12.6,'0.5':16.1,'0.75':22.3,'1':28.5,'1.25':34.0,'1.5':40.9,'2':52.5,'2.5':62.7,'3':77.9,'4':102.3,'6':154.1,'8':202.7,'10':254.5,'12':304.8}},
    { id: 'castiron', name: 'Cast Iron (New)', roughness: 0.26, schedule: {'0.375':10.7,'0.5':13.8,'0.75':19.9,'1':25.4,'1.25':32.1,'1.5':38.1,'2':50.8,'2.5':63.5,'3':76.2,'4':101.6,'6':152.4,'8':203.2,'10':254.0,'12':304.8}},
    { id: 'galvanizediron', name: 'Galvanized Iron', roughness: 0.15, schedule: {'0.375':12.5,'0.5':15.8,'0.75':20.9,'1':26.6,'1.25':35.1,'1.5':40.9,'2':52.5,'2.5':62.7,'3':77.9,'4':102.3,'6':154.1,'8':202.7,'10':254.5,'12':303.2}},
    { id: 'hdpe', name: 'HDPE (SDR 11)', roughness: 0.007, schedule: {'0.375':8.8,'0.5':11.4,'0.75':17.1,'1':22.9,'1.25':28.6,'1.5':34.5,'2':45.9,'2.5':57.4,'3':73.6,'4':93.3,'6':141.0,'8':187.6,'10':235.4,'12':281.0}},
    { id: 'custom', name: 'Custom Material', roughness: 0.01, schedule: {} }
  ];
  
  const standardPipeSizes = [
    { value: '0.375', label: 'DN10 / 3/8"' },{ value: '0.5', label: 'DN15 / 1/2"' },{ value: '0.75', label: 'DN20 / 3/4"' },{ value: '1', label: 'DN25 / 1"' },{ value: '1.25', label: 'DN32 / 1-1/4"' },{ value: '1.5', label: 'DN40 / 1-1/2"' },{ value: '2', label: 'DN50 / 2"' },{ value: '2.5', label: 'DN65 / 2-1/2"' },{ value: '3', label: 'DN80 / 3"' },{ value: '4', label: 'DN100 / 4"' },{ value: '6', label: 'DN150 / 6"' },{ value: '8', label: 'DN200 / 8"' },{ value: '10', label: 'DN250 / 10"' },{ value: '12', label: 'DN300 / 12"' },{ value: 'custom', label: 'Custom Size' }
  ];
    
  const fittingOptions: PipeFittingOption[] = [
    { id: 'elbow90stdThreaded', name: '90° Standard Elbow (Threaded)', kValue: 0.9, sizeDependent: true, kValueBySize: {'0.375':2.5,'0.5':2.1,'0.75':1.7,'1':1.5,'1.25':1.3,'1.5':1.2,'2':1.0,'2.5':0.85,'3':0.8,'4':0.7,'6':0.7,'8':0.7,'10':0.7,'12':0.7}},
    { id: 'elbow90longThreaded', name: '90° Long-Radius Elbow (Threaded)', kValue: 0.6, sizeDependent: true, kValueBySize: {'0.75':0.92,'1':0.78,'1.25':0.65,'1.5':0.54,'2':0.42,'2.5':0.35,'3':0.31,'4':0.24,'6':0.24,'8':0.24,'10':0.24,'12':0.24}},
    { id: 'elbow45Threaded', name: '45° Elbow (Threaded)', kValue: 0.4, sizeDependent: true, kValueBySize: {'0.375':0.38,'0.5':0.37,'0.75':0.35,'1':0.34,'1.25':0.33,'1.5':0.32,'2':0.31,'2.5':0.30,'3':0.29,'4':0.28,'6':0.28,'8':0.28,'10':0.28,'12':0.28}},
    { id: 'returnBendThreaded', name: 'Return Bend (Threaded)', kValue: 1.5, sizeDependent: true, kValueBySize: {'0.375':2.5,'0.5':2.1,'0.75':1.7,'1':1.5,'1.25':1.3,'1.5':1.2,'2':1.0,'2.5':0.85,'3':0.8,'4':0.7,'6':0.7,'8':0.7,'10':0.7,'12':0.7}},
    { id: 'teeLineThreaded', name: 'Tee-Line Flow (Threaded)', kValue: 0.9, sizeDependent: true, kValueBySize: {'0.375':0.90,'0.5':0.90,'0.75':0.90,'1':0.90,'1.25':0.90,'1.5':0.90,'2':0.90,'2.5':0.90,'3':0.90,'4':0.90,'6':0.90,'8':0.90,'10':0.90,'12':0.90}},
    { id: 'teeBranchThreaded', name: 'Tee-Branch Flow (Threaded)', kValue: 1.8, sizeDependent: true, kValueBySize: {'0.375':2.7,'0.5':2.4,'0.75':2.1,'1':1.8,'1.25':1.7,'1.5':1.6,'2':1.4,'2.5':1.3,'3':1.2,'4':1.1,'6':1.1,'8':1.1,'10':1.1,'12':1.1}},
    { id: 'globeValveThreaded', name: 'Globe Valve (Threaded)', kValue: 10.0, sizeDependent: true, kValueBySize: {'0.375':20,'0.5':14,'0.75':10,'1':9,'1.25':8.5,'1.5':8,'2':7,'2.5':6.5,'3':6,'4':5.7,'6':5.7,'8':5.7,'10':5.7,'12':5.7}},
    { id: 'gateValveThreaded', name: 'Gate Valve (Threaded)', kValue: 0.2, sizeDependent: true, kValueBySize: {'0.375':0.40,'0.5':0.33,'0.75':0.28,'1':0.24,'1.25':0.22,'1.5':0.19,'2':0.17,'2.5':0.16,'3':0.14,'4':0.12,'6':0.12,'8':0.12,'10':0.12,'12':0.12}},
    { id: 'angleValveThreaded', name: 'Angle Valve (Threaded)', kValue: 5.0, sizeDependent: true, kValueBySize: {'0.75':6.1,'1':4.6,'1.25':3.6,'1.5':2.9,'2':2.1,'2.5':1.6,'3':1.3,'4':1.0,'6':1.0,'8':1.0,'10':1.0,'12':1.0}},
    { id: 'swingCheckValveThreaded', name: 'Swing Check Valve (Threaded)', kValue: 2.5, sizeDependent: true, kValueBySize: {'0.375':8.0,'0.5':5.5,'0.75':3.7,'1':3.0,'1.25':2.7,'1.5':2.5,'2':2.3,'2.5':2.2,'3':2.1,'4':2.0,'6':2.0,'8':2.0,'10':2.0,'12':2.0}},
    { id: 'bellMouthInletThreaded', name: 'Bell Mouth Inlet (Threaded)', kValue: 0.05, sizeDependent: true, kValueBySize: {'0.375':0.05,'0.5':0.05,'0.75':0.05,'1':0.05,'1.25':0.05,'1.5':0.05,'2':0.05,'2.5':0.05,'3':0.05,'4':0.05,'6':0.05,'8':0.05,'10':0.05,'12':0.05}},
    { id: 'squareInletThreaded', name: 'Square Inlet (Threaded)', kValue: 0.5, sizeDependent: true, kValueBySize: {'0.375':0.5,'0.5':0.5,'0.75':0.5,'1':0.5,'1.25':0.5,'1.5':0.5,'2':0.5,'2.5':0.5,'3':0.5,'4':0.5,'6':0.5,'8':0.5,'10':0.5,'12':0.5}},
    { id: 'projectedInletThreaded', name: 'Projected Inlet (Threaded)', kValue: 1.0, sizeDependent: true, kValueBySize: {'0.375':1.0,'0.5':1.0,'0.75':1.0,'1':1.0,'1.25':1.0,'1.5':1.0,'2':1.0,'2.5':1.0,'3':1.0,'4':1.0,'6':1.0,'8':1.0,'10':1.0,'12':1.0}},
    { id: 'elbow90stdFlanged', name: '90° Standard Elbow (Flanged)', kValue: 0.4, sizeDependent: true, kValueBySize: {'1':0.43,'1.25':0.41,'1.5':0.40,'2':0.38,'2.5':0.35,'3':0.34,'4':0.31,'6':0.29,'8':0.27,'10':0.25,'12':0.24}},
    { id: 'elbow90longFlanged', name: '90° Long-Radius Elbow (Flanged)', kValue: 0.3, sizeDependent: true, kValueBySize: {'1':0.41,'1.25':0.37,'1.5':0.35,'2':0.30,'2.5':0.28,'3':0.25,'4':0.22,'6':0.18,'8':0.16,'10':0.14,'12':0.13}},
    { id: 'elbow45longFlanged', name: '45° Long-Radius Elbow (Flanged)', kValue: 0.2, sizeDependent: true, kValueBySize: {'1':0.22,'1.25':0.22,'1.5':0.21,'2':0.20,'2.5':0.19,'3':0.18,'4':0.18,'6':0.17,'8':0.17,'10':0.16,'12':0.16}},
    { id: 'returnBendStdFlanged', name: 'Return Bend Standard (Flanged)', kValue: 0.4, sizeDependent: true, kValueBySize: {'1':0.43,'1.25':0.41,'1.5':0.40,'2':0.38,'2.5':0.35,'3':0.34,'4':0.31,'6':0.29,'8':0.27,'10':0.25,'12':0.24}},
    { id: 'returnBendLongFlanged', name: 'Return Bend Long Radius (Flanged)', kValue: 0.3, sizeDependent: true, kValueBySize: {'1':0.43,'1.25':0.38,'1.5':0.35,'2':0.30,'2.5':0.27,'3':0.25,'4':0.22,'6':0.18,'8':0.15,'10':0.14,'12':0.13}},
    { id: 'teeLineFlanged', name: 'Tee-Line Flow (Flanged)', kValue: 0.2, sizeDependent: true, kValueBySize: {'1':0.26,'1.25':0.25,'1.5':0.23,'2':0.20,'2.5':0.18,'3':0.17,'4':0.15,'6':0.12,'8':0.10,'10':0.09,'12':0.08}},
    { id: 'teeBranchFlanged', name: 'Tee-Branch Flow (Flanged)', kValue: 1.0, sizeDependent: true, kValueBySize: {'1':1.0,'1.25':0.95,'1.5':0.90,'2':0.84,'2.5':0.79,'3':0.76,'4':0.70,'6':0.62,'8':0.58,'10':0.53,'12':0.50}},
    { id: 'globeValveFlanged', name: 'Globe Valve (Flanged)', kValue: 10.0, sizeDependent: true, kValueBySize: {'1':13,'1.25':12,'1.5':10,'2':9,'2.5':8,'3':7,'4':6.5,'6':6,'8':5.7,'10':5.7,'12':5.7}},
    { id: 'gateValveFlanged', name: 'Gate Valve (Flanged)', kValue: 0.3, sizeDependent: true, kValueBySize: {'2':0.34,'2.5':0.27,'3':0.22,'4':0.16,'6':0.10,'8':0.08,'10':0.06,'12':0.05}},
    { id: 'angleValveFlanged', name: 'Angle Valve (Flanged)', kValue: 4.0, sizeDependent: true, kValueBySize: {'1':4.8,'1.25':3.7,'1.5':3.0,'2':2.5,'2.5':2.3,'3':2.2,'4':2.1,'6':2.1,'8':2.1,'10':2.1,'12':2.1}},
    { id: 'swingCheckValveFlanged', name: 'Swing Check Valve (Flanged)', kValue: 2.0, sizeDependent: true, kValueBySize: {'1':2.0,'1.25':2.0,'1.5':2.0,'2':2.0,'2.5':2.0,'3':2.0,'4':2.0,'6':2.0,'8':2.0,'10':2.0,'12':2.0}},
    { id: 'reducer2x1-5', name: 'Reducer (2:1.5)', kValue: 0.22 },{ id: 'reducer4x3', name: 'Reducer (4:3)', kValue: 0.23 },{ id: 'reducer12x10', name: 'Reducer (12:10)', kValue: 0.14 },{ id: 'expansion1-5x2', name: 'Expansion (1.5:2)', kValue: 0.16 },{ id: 'expansion3x4', name: 'Expansion (3:4)', kValue: 0.11 },{ id: 'expansion10x12', name: 'Expansion (10:12)', kValue: 0.11 },
    { id: 'butterflyValve', name: 'Butterfly Valve (Fully Open)', kValue: 0.6 },{ id: 'balancingValve', name: 'Balancing Valve', kValue: 0.4 },{ id: 'expansion', name: 'Sudden Expansion', kValue: 1.0 },{ id: 'contraction', name: 'Sudden Contraction', kValue: 0.5 },{ id: 'entrance', name: 'Entrance (Sharp-Edged)', kValue: 0.5 },{ id: 'exit', name: 'Exit to Tank', kValue: 1.0 },{ id: 'custom', name: 'Custom Fitting', kValue: 0.5 }
  ];
    
  const [waterDensity, setWaterDensity] = useState<number>(0);
  const [waterViscosity, setWaterViscosity] = useState<number>(0);
  const [specificHeat, setSpecificHeat] = useState<number>(0);
  
  const [sectionResults, setSectionResults] = useState<any[]>([]);
  const [totalPressureDrop, setTotalPressureDrop] = useState<number>(0);
  const [pumpHead, setPumpHead] = useState<number>(0);
  const [isSystemCompliant, setIsSystemCompliant] = useState<boolean>(true);
  const [maxVelocity, setMaxVelocity] = useState<number>(0);

  useEffect(() => {
    const initialDiameter = '1.5'; 
    const initialMaterialId = 'steel';
    const initialMaterial = materialOptions.find(m => m.id === initialMaterialId);
    
    if (!initialMaterial) {
      console.error("Initial material 'steel' not found.");
      return;
    }

    const initialInnerDiameter = getInnerDiameterInternal(initialDiameter, initialMaterialId, materialOptions);
    const fallbackInnerD = parseFloat(initialDiameter) * 25.4 * 0.85; 

    setPipeSections([
      {
        id: '1',
        length: 10,
        diameter: initialDiameter,
        innerDiameter: initialInnerDiameter !== null ? initialInnerDiameter : fallbackInnerD,
        material: initialMaterialId,
        customRoughness: false,
        materialRoughness: initialMaterial.roughness,
        flowRate: systemFlowRate, 
        fittings: [],
        type: 'main',
      }
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  
  const getVelocityLimit = (type: PipeType): number => {
    switch (type) {
      case 'main': return MAIN_PIPE_VELOCITY_LIMIT;
      case 'branch': return BRANCH_PIPE_VELOCITY_LIMIT;
      case 'connection': return CONNECTION_PIPE_VELOCITY_LIMIT;
      default: return MAIN_PIPE_VELOCITY_LIMIT;
    }
  };
  
  useEffect(() => {
    setLowTempDropWarning(temperatureDrop < 1);
    
    const a = -2.8054253e-10, b = 1.0556302e-7, c = -4.6170461e-5, d = -0.0079870401, e = 16.945176, f = 999.83952, g = 0.01687985;
    const num = ((((a * waterTemperature + b) * waterTemperature + c) * waterTemperature + d) * waterTemperature + e) * waterTemperature + f;
    const den = 1 + g * waterTemperature;
    let density = num / den;
    if (glycolPercentage > 0) density *= (1 + 0.00386 * glycolPercentage + 0.0000107 * Math.pow(glycolPercentage, 2));
    setWaterDensity(density);
    
    const tempK = waterTemperature + 273.15;
    let viscosity = 2.414e-5 * Math.pow(10, 247.8 / (tempK - 140));
    if (glycolPercentage > 0) viscosity *= (1 + 0.028 * glycolPercentage + 0.0005 * Math.pow(glycolPercentage, 2));
    setWaterViscosity(viscosity);
    
    let cp = 4.1868;
    if (glycolPercentage > 0) cp *= (1 - 0.0057 * glycolPercentage - 0.000036 * Math.pow(glycolPercentage, 2));
    setSpecificHeat(cp);
    
    if (!flowRateManual && systemCoolingLoad > 0 && temperatureDrop > 0 && density > 0 && cp > 0) {
      const calculatedFlowRate = systemCoolingLoad / (cp * temperatureDrop * (density / 1000));
      setSystemFlowRate(calculatedFlowRate);
      if (pipeSections.length > 0) { 
        setPipeSections(prev => prev.map(sec => ({ ...sec, flowRate: calculatedFlowRate })));
      }
    }
  }, [waterTemperature, glycolPercentage, systemCoolingLoad, temperatureDrop, flowRateManual, pipeSections.length]); 

  const calculateFrictionFactor = (reynolds: number, relativeRoughness: number): number => {
    let currentFrictionFactorWarning = false;
    if (reynolds < 2000) return 64 / reynolds;
    const term1 = Math.pow(relativeRoughness / 3.7, 1.11);
    const term2 = 6.9 / reynolds;
    if (term1 + term2 <= 0) {
      currentFrictionFactorWarning = true;
      setFrictionFactorWarning(true); 
      return 0.02;
    }
    if (!currentFrictionFactorWarning) setFrictionFactorWarning(false); 
    return Math.pow(-1.8 * Math.log10(term1 + term2), -2);
  };
  
  // This function is primarily for getting the *standard* K-value for a fitting type and size,
  // or for a custom fitting, its defined K-value.
  // It does NOT consider if a standard fitting's K-value was individually overridden by the user,
  // that override is handled directly by using fitting.kValue from the state.
  const getStandardKValueForFitting = (fitting: PipeFitting, section: PipeSection): number => {
    if (fitting.pressureDropMethod === 'direct') return fitting.kValue; // Placeholder
    if (fitting.isCustom) return fitting.kValue; // Custom fitting K is authoritative
    
    const fittingOption = fittingOptions.find(f => f.name === fitting.type);
    if (!fittingOption) return fitting.kValue; // Fallback if option not found
    
    if (fittingOption.sizeDependent && fittingOption.kValueBySize) {
      const nominalSize = section.diameter; 
      if (fittingOption.kValueBySize[nominalSize] !== undefined) {
        return fittingOption.kValueBySize[nominalSize];
      }
      // Fallback for size-dependent if specific size K not found
      return fittingOption.kValue; 
    }
    return fittingOption.kValue; // Standard K for non-size-dependent
  };
  
  // Effect to update K-values of STANDARD fittings if pipe diameter changes
  useEffect(() => {
    if (pipeSections.length === 0) return;
    let sectionsUpdated = false;
    const updatedSections = pipeSections.map(currentSection => {
      if (currentSection.fittings.length === 0) return currentSection;
      let fittingsUpdated = false;
      const updatedFittings = currentSection.fittings.map(fitting => {
        // ONLY update standard fittings. Custom fittings or user-overridden K-values
        // for standard fittings should not be changed by this effect.
        if (fitting.isCustom) return fitting;
        
        // Get the K-value that *should* apply based on current pipe size according to standards.
        const standardKForCurrentSize = getStandardKValueForFitting(fitting, currentSection); 

        // If the fitting's current K-value is different from this standard, update it.
        // This means user's direct edits to a standard fitting's K-value will be
        // reset if the pipe diameter changes. This is a design choice.
        // If user edits should persist, this logic needs to be more complex (e.g., an `isKValueOverridden` flag).
        if (fitting.kValue !== standardKForCurrentSize) {
          fittingsUpdated = true;
          return { ...fitting, kValue: standardKForCurrentSize }; 
        }
        return fitting;
      });
      if (fittingsUpdated) {
        sectionsUpdated = true;
        return { ...currentSection, fittings: updatedFittings };
      }
      return currentSection;
    });
    if (sectionsUpdated) setPipeSections(updatedSections);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeSections.map(s => s.diameter).join(',')]); // Only re-run if diameters change

  // Main Calculation Effect
  useEffect(() => {
    if (!waterDensity || !waterViscosity || pipeSections.length === 0) return;
    
    const results = [];
    let totalDrop = 0;
    let systemCompliantOverall = true;
    let highestVelocityOverall = 0;
    let anyInnerDiameterIssue = false;
    
    for (const section of pipeSections) {
      let innerDiameterMm = section.innerDiameter;
      if (typeof innerDiameterMm !== 'number' || isNaN(innerDiameterMm) || innerDiameterMm <= 0) {
        const calculatedId = getInnerDiameterInternal(section.diameter, section.material, materialOptions);
        if (calculatedId !== null && calculatedId > 0) {
          innerDiameterMm = calculatedId;
        } else {
          console.warn(`Invalid or missing inner diameter for section ${section.id}. Using fallback.`);
          const parsedNominal = parseFloat(section.diameter); 
          innerDiameterMm = !isNaN(parsedNominal) ? parsedNominal * 25.4 * 0.85 : 10; 
          anyInnerDiameterIssue = true;
        }
      }

      const innerDiameterM = innerDiameterMm / 1000;
      const flowArea = Math.PI * Math.pow(innerDiameterM / 2, 2);
      const flowRateM3s = section.flowRate / 1000;
      const velocity = flowRateM3s / flowArea;
      
      if (velocity > highestVelocityOverall) highestVelocityOverall = velocity;
      
      const velocityLimit = getVelocityLimit(section.type);
      const isSectionCompliant = velocity <= velocityLimit;
      if (!isSectionCompliant) systemCompliantOverall = false;
      
      const reynolds = (waterDensity * velocity * innerDiameterM) / waterViscosity;
      const relativeRoughness = (section.materialRoughness / 1000) / innerDiameterM;
      const frictionFactorVal = calculateFrictionFactor(reynolds, relativeRoughness);
      const majorLossPa = frictionFactorVal * (section.length / innerDiameterM) * (waterDensity * Math.pow(velocity, 2) / 2);
      
      const dynamicPressure = 0.5 * waterDensity * Math.pow(velocity, 2);
      let minorLossPa = 0;

      const fittingDetails = section.fittings.map(fitting => {
        let fittingLoss = 0;
        let kValueForTableAndCalc: number | undefined;

        if (fitting.pressureDropMethod === 'kValue') {
          // For K-Value method, the fitting.kValue from state is the source of truth.
          // This value has been set by addFitting, saveEditedFitting, or the diameter-change effect.
          kValueForTableAndCalc = fitting.kValue;
          fittingLoss = (kValueForTableAndCalc || 0) * dynamicPressure * fitting.quantity;
        } else if (fitting.pressureDropMethod === 'direct' && fitting.directPressureDrop !== undefined) {
          fittingLoss = fitting.directPressureDrop * fitting.quantity;
          kValueForTableAndCalc = undefined; // No K to display for direct method
        } else {
          kValueForTableAndCalc = fitting.kValue; // Fallback, should have a value if kValue method
          fittingLoss = 0;
        }
        minorLossPa += fittingLoss;
        
        return {
          type: fitting.type,
          quantity: fitting.quantity,
          kValue: kValueForTableAndCalc, // This is used for display in the results table
          directPressureDrop: fitting.directPressureDrop,
          pressureDropMethod: fitting.pressureDropMethod,
          lossPerUnit: fitting.pressureDropMethod === 'kValue' 
            ? (kValueForTableAndCalc || 0) * dynamicPressure 
            : fitting.directPressureDrop || 0,
          totalLoss: fittingLoss,
          isCustom: fitting.isCustom
        };
      });
      
      const sectionLossPa = majorLossPa + minorLossPa;
      totalDrop += sectionLossPa;
      
      results.push({
        sectionId: section.id, pipeType: section.type, innerDiameter: innerDiameterMm,
        flowArea, velocity, velocityLimit, isSectionCompliant, dynamicPressure, reynolds,
        frictionFactor: frictionFactorVal, majorLossPa, minorLossPa, sectionLossPa, fittingDetails,
        pressureGradient: section.length > 0 ? majorLossPa / section.length : 0
      });
    }
    
    setInnerDiameterWarning(anyInnerDiameterIssue); 

    const adjustedTotalDrop = totalDrop * safetyFactor;
    const pumpHeadM = (waterDensity > 0 && waterDensity * 9.81 > 0) ? adjustedTotalDrop / (waterDensity * 9.81) : 0;
    
    setSectionResults(results);
    setTotalPressureDrop(adjustedTotalDrop);
    setPumpHead(pumpHeadM);
    setIsSystemCompliant(systemCompliantOverall);
    setMaxVelocity(highestVelocityOverall);
    
  }, [pipeSections, waterDensity, waterViscosity, safetyFactor]); 
  
  const addPipeSection = () => {
    const defaultDiameter = '1.5'; 
    const defaultMaterialId = 'steel';
    const materialInfo = materialOptions.find(m => m.id === defaultMaterialId)!;
    const calculatedInnerDiameter = getInnerDiameterInternal(defaultDiameter, defaultMaterialId, materialOptions);
    const fallbackInnerD = parseFloat(defaultDiameter) * 25.4 * 0.85;

    const newSection: PipeSection = {
      id: Date.now().toString(), length: 5, diameter: defaultDiameter,
      innerDiameter: calculatedInnerDiameter !== null ? calculatedInnerDiameter : fallbackInnerD,
      material: defaultMaterialId, customRoughness: false, materialRoughness: materialInfo.roughness,
      flowRate: systemFlowRate, fittings: [], type: 'branch',
    };
    setPipeSections(prev => [...prev, newSection]);
  };
  
  const removePipeSection = (id: string) => {
    setPipeSections(prev => prev.filter(section => section.id !== id));
  };
  
  const updatePipeSection = (id: string, updates: Partial<PipeSection>) => {
    setPipeSections(prevSections =>
      prevSections.map(section => {
        if (section.id === id) {
          const newProvisionalSection = { ...section, ...updates };

          if ( (updates.diameter && newProvisionalSection.material !== 'custom') ||
               (updates.material && newProvisionalSection.material !== 'custom') ) {
            if (updates.innerDiameter === undefined) { 
                const calculatedInnerDiameter = getInnerDiameterInternal(
                    newProvisionalSection.diameter,
                    newProvisionalSection.material,
                    materialOptions
                );
                const fallbackInnerD = parseFloat(newProvisionalSection.diameter) * 25.4 * 0.85;
                newProvisionalSection.innerDiameter = calculatedInnerDiameter !== null ? calculatedInnerDiameter : fallbackInnerD;
            }
          }
          
          if (updates.material && updates.material !== 'custom' && !newProvisionalSection.customRoughness) {
            const materialInfo = materialOptions.find(m => m.id === newProvisionalSection.material);
            if (materialInfo) newProvisionalSection.materialRoughness = materialInfo.roughness;
          }
          if (updates.customRoughness === false && newProvisionalSection.material !== 'custom') {
              const materialInfo = materialOptions.find(m => m.id === newProvisionalSection.material);
              if (materialInfo) newProvisionalSection.materialRoughness = materialInfo.roughness;
          }
          return newProvisionalSection;
        }
        return section;
      })
    );
  };
  
  const addFitting = (sectionId: string, fittingType: string) => {
    const section = pipeSections.find(s => s.id === sectionId);
    if (!section) return;

    if (fittingType === 'custom') {
      setPipeSections(prev =>
        prev.map(sec => {
          if (sec.id === sectionId) {
            const newFitting: PipeFitting = {
              id: Date.now().toString(), type: customFittingName || 'Custom Fitting',
              kValue: customFittingKValue, quantity: 1, isCustom: true,
              pressureDropMethod: customFittingMethod,
              ...(customFittingMethod === 'direct' ? { directPressureDrop: customFittingPressureDrop } : {})
            };
            return { ...sec, fittings: [...sec.fittings, newFitting] };
          }
          return sec;
        })
      );
      setCustomFittingName(''); setCustomFittingKValue(0.5); 
    } else {
      const fittingOption = fittingOptions.find(f => f.id === fittingType);
      if (!fittingOption) return;
      
      // Use getStandardKValueForFitting for initial population of standard fittings
      let kVal = getStandardKValueForFitting({ 
          id: '', type: fittingOption.name, kValue: fittingOption.kValue, quantity: 1, 
          isCustom: false, pressureDropMethod: 'kValue'
      }, section);

      setPipeSections(prev =>
        prev.map(sec => {
          if (sec.id === sectionId) {
            const newFitting: PipeFitting = {
              id: Date.now().toString(), type: fittingOption.name, kValue: kVal,
              quantity: 1, isCustom: false, pressureDropMethod: 'kValue'
            };
            return { ...sec, fittings: [...sec.fittings, newFitting] };
          }
          return sec;
        })
      );
    }
  };
  
  const removeFitting = (sectionId: string, fittingId: string) => {
    setPipeSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          return { ...section, fittings: section.fittings.filter(f => f.id !== fittingId) };
        }
        return section;
      })
    );
    if (editingFitting && editingFitting.fittingId === fittingId) setEditingFitting(null);
  };
  
  const updateFitting = (sectionId: string, fittingId: string, updates: Partial<PipeFitting>) => {
    setPipeSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            fittings: section.fittings.map(f => (f.id === fittingId ? { ...f, ...updates } : f))
          };
        }
        return section;
      })
    );
  };
  
  const startEditingFitting = (sectionId: string, fittingId: string) => {
    const section = pipeSections.find(s => s.id === sectionId);
    const fitting = section?.fittings.find(f => f.id === fittingId);
    if (!fitting) return;
    setEditingFitting({
      sectionId, fittingId, newName: fitting.type, newKValue: fitting.kValue,
      newDirectPressureDrop: fitting.directPressureDrop, newMethod: fitting.pressureDropMethod
    });
  };

  const saveEditedFitting = () => {
    if (!editingFitting) return;
    const { sectionId, fittingId, newName, newKValue, newDirectPressureDrop, newMethod } = editingFitting;
    const section = pipeSections.find(s => s.id === sectionId);
    const fitting = section?.fittings.find(f => f.id === fittingId);
    if (!fitting) { setEditingFitting(null); return; }

    const updates: Partial<PipeFitting> = {};
    if (newMethod) updates.pressureDropMethod = newMethod;

    if (newMethod === 'kValue' && newKValue !== undefined) {
      updates.kValue = newKValue; 
      updates.directPressureDrop = undefined;
    } else if (newMethod === 'direct' && newDirectPressureDrop !== undefined) {
      updates.directPressureDrop = newDirectPressureDrop;
      // When switching to direct, you might want to nullify or set kValue to a default
      // updates.kValue = 0; // Or some placeholder
    }
    if (fitting.isCustom && newName) updates.type = newName;
    
    updateFitting(sectionId, fittingId, updates);
    setEditingFitting(null);
  };
  
  const cancelEditingFitting = () => setEditingFitting(null);
  
  const convertPressure = (pascals: number, unit: 'pa' | 'kpa' | 'mwc' | 'bar') => {
    if (isNaN(pascals) || waterDensity <= 0) return 0;
    switch (unit) {
      case 'kpa': return pascals / 1000;
      case 'mwc': return pascals / (waterDensity * 9.81);
      case 'bar': return pascals / 100000;
      default: return pascals;
    }
  };
  
  const getMaterialSelection = (section: PipeSection) => section.customRoughness ? 'custom' : section.material;
  
  const handleMaterialChange = (sectionId: string, materialId: string) => {
    const section = pipeSections.find(s => s.id === sectionId);
    if (!section) return;
    
    if (materialId === 'custom') {
      updatePipeSection(sectionId, { 
        material: materialId, customRoughness: true,
        materialRoughness: section.materialRoughness || 0.01 
      });
    } else {
      updatePipeSection(sectionId, { material: materialId, customRoughness: false });
    }
  };
  
  const handlePipeSizeChange = (sectionId: string, nominalSizeValue: string) => {
    const section = pipeSections.find(s => s.id === sectionId);
    if (!section) return;
    
    if (nominalSizeValue === 'custom') {
      setEditingSectionIdForCustomSize(sectionId);
      setCustomPipeSize(section.diameter); 
      const fallbackId = section.innerDiameter || (parseFloat(section.diameter) * 25.4 * 0.85);
      setCustomInnerDiameter(fallbackId); 
    } else {
      setEditingSectionIdForCustomSize(null); 
      updatePipeSection(sectionId, { diameter: nominalSizeValue });
    }
  };

  const saveCustomPipeSize = (sectionId: string) => {
    if (!customPipeSize || customInnerDiameter === null || isNaN(customInnerDiameter) || customInnerDiameter <= 0) {
      alert("Custom nominal size (as text, e.g., '43') and a valid positive inner diameter (number) are required.");
      return;
    }
    
    updatePipeSection(sectionId, {
      diameter: customPipeSize, 
      innerDiameter: customInnerDiameter,
    });
    
    setEditingSectionIdForCustomSize(null); 
    setCustomPipeSize('');
    setCustomInnerDiameter(null);
  };

  const updateSystemFlowRate = (newFlowRate: number) => {
    setSystemFlowRate(newFlowRate);
    if (!flowRateManual && pipeSections.length > 0) {
      setPipeSections(prev => prev.map(sec => ({ ...sec, flowRate: newFlowRate })));
    }
  };
  
  const calculatePower = () => {
    if (systemFlowRate <=0 || pumpHead <= 0 || waterDensity <= 0 || pumpEfficiency <= 0) return 0;
    return (systemFlowRate / 1000 * pumpHead * waterDensity * 9.81) / (1000 * pumpEfficiency);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Chilled Water Pipe Sizing Calculator</h2>
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
          <h3 className="font-medium text-lg mb-4 text-gray-700">System Parameters</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooling Load (kW)
              </label>
              <input
                type="number"
                value={systemCoolingLoad}
                onChange={(e) => setSystemCoolingLoad(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temp. Difference (°C)
              </label>
              <input
                type="number"
                value={temperatureDrop}
                onChange={(e) => setTemperatureDrop(Number(e.target.value))}
                className={`w-full p-2 border ${lowTempDropWarning ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                min="0"
                step="0.1"
              />
              {lowTempDropWarning && (
                <p className="text-xs text-red-600 mt-1">
                  Warning: Temperature difference is very low (should be ≥1°C).
                </p>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Flow Rate (l/s)</label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={flowRateManual}
                  onChange={(e) => setFlowRateManual(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">Manual Entry</span>
              </label>
            </div>
            <div className="flex">
              <input
                type="number"
                value={systemFlowRate.toFixed(2)}
                onChange={(e) => updateSystemFlowRate(Number(e.target.value))}
                className={`w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${!flowRateManual && 'bg-gray-100'}`}
                min="0"
                step="0.01"
                disabled={!flowRateManual}
              />
            </div>
            {!flowRateManual && (
              <p className="text-xs text-gray-500 mt-1">
                Flow rate calculated from cooling load and temperature difference.
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Water Temperature (°C)
              </label>
              <input
                type="number"
                value={waterTemperature}
                onChange={(e) => setWaterTemperature(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Glycol Content (%)
              </label>
              <input
                type="number"
                value={glycolPercentage}
                onChange={(e) => setGlycolPercentage(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="60"
                step="5"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Safety Factor
              </label>
              <input
                type="number"
                value={safetyFactor}
                onChange={(e) => setSafetyFactor(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="2"
                step="0.05"
              />
              <p className="text-xs text-gray-500 mt-1">
                Typical range: 1.1 (10%) to 1.5 (50%)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pump Efficiency
              </label>
              <input
                type="number"
                value={pumpEfficiency}
                onChange={(e) => setPumpEfficiency(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0.2"
                max="0.9"
                step="0.05"
              />
              <p className="text-xs text-gray-500 mt-1">
                Typical range: 0.5 (50%) to 0.8 (80%)
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-6"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Pipe Sections</h3>
            <button
              onClick={addPipeSection}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Section
            </button>
          </div>
          
          {pipeSections.map((section, index) => (
            <div key={section.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">Section {index + 1}</h4>
                {pipeSections.length > 1 && (
                  <button
                    onClick={() => removePipeSection(section.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pipe Type</label>
                <select
                  value={section.type}
                  onChange={(e) => updatePipeSection(section.id, { type: e.target.value as PipeType })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="main">Main (Limit: {MAIN_PIPE_VELOCITY_LIMIT} m/s)</option>
                  <option value="branch">Branch (Limit: {BRANCH_PIPE_VELOCITY_LIMIT} m/s)</option>
                  <option value="connection">Connection (Limit: {CONNECTION_PIPE_VELOCITY_LIMIT} m/s)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <select
                        value={editingSectionIdForCustomSize === section.id ? 'custom' : section.diameter}
                        onChange={(e) => handlePipeSizeChange(section.id, e.target.value)}
                        className={`w-full p-2 border ${ (innerDiameterWarning && sectionResults.find(r=>r.sectionId === section.id)?.innerDiameter === null) ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                    >
                    {standardPipeSizes.map(size => (
                        <option key={size.value} value={size.value}>
                        {size.label}
                        </option>
                    ))}
                    </select>
                    { (innerDiameterWarning && sectionResults.find(r=>r.sectionId === section.id)?.innerDiameter === null) && (
                        <p className="text-xs text-red-600 mt-1">
                            Warning: Material schedule missing for this size - using conservative estimate or custom ID.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                    <input
                    type="number"
                    value={section.length}
                    onChange={(e) => updatePipeSection(section.id, { length: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.1"
                    />
                </div>
                </div>

                {editingSectionIdForCustomSize === section.id && (
                <div className="mb-4 pl-4 border-l-4 border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50 p-3 rounded-r-md">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Nominal Size (e.g. "43")
                    </label>
                    <input
                        type="text" 
                        value={customPipeSize}
                        onChange={(e) => setCustomPipeSize(e.target.value)}
                        placeholder='e.g., "43" for 43mm nominal'
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inner Diameter (mm)
                    </label>
                    <input
                        type="number"
                        value={customInnerDiameter ?? ''}
                        onChange={(e) => setCustomInnerDiameter(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0.1" 
                        step="0.1"
                    />
                    </div>
                    <div className="col-span-2 flex space-x-2">
                        <button
                            onClick={() => saveCustomPipeSize(section.id)}
                            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                        >
                            Apply Custom Size
                        </button>
                        <button
                            onClick={() => {
                                setEditingSectionIdForCustomSize(null);
                                setCustomPipeSize('');
                                setCustomInnerDiameter(null);
                            }}
                            className="mt-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 shadow-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
                )}

                {editingSectionIdForCustomSize !== section.id && (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inner Diameter (mm)
                    </label>
                    <div className="flex space-x-2">
                    <input
                        type="number"
                        value={section.innerDiameter ?? ''} 
                        onChange={(e) => updatePipeSection(section.id, { innerDiameter: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0.1"
                        step="0.1"
                    />
                    <button
                        onClick={() => {
                            const defaultID = getInnerDiameterInternal(section.diameter, section.material, materialOptions);
                            if (defaultID !== null) {
                                updatePipeSection(section.id, { innerDiameter: defaultID });
                            }
                        }}
                        className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-xs font-medium hover:bg-gray-300"
                        title="Reset to default inner diameter"
                    >
                        Reset
                    </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                    Default inner diameter based on material standards. You can edit this value if needed.
                    </p>
                </div>
                )}
              
              {flowRateManual && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flow Rate (l/s)</label>
                  <input
                    type="number"
                    value={section.flowRate.toFixed(2)}
                    onChange={(e) => updatePipeSection(section.id, { flowRate: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <select
                  value={getMaterialSelection(section)}
                  onChange={(e) => handleMaterialChange(section.id, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {materialOptions.filter(m => m.id !== 'custom').map(material => (
                    <option key={material.id} value={material.id}>
                      {material.name} (ε = {material.roughness} mm)
                    </option>
                  ))}
                  <option value="custom">Custom Material</option>
                </select>
              </div>
              
              {section.customRoughness && (
                <div className="mb-4 pl-4 border-l-4 border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Material Roughness (mm)
                  </label>
                  <input
                    type="number"
                    value={section.materialRoughness}
                    onChange={(e) => updatePipeSection(section.id, { materialRoughness: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.001"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter absolute roughness in millimeters. Typical values: PVC/Copper: 0.0015, Steel: 0.045, HDPE: 0.007
                  </p>
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Fittings</label>
                  <select
                    className="p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        addFitting(section.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Add fitting...</option>
                    {fittingOptions.filter(f => f.id !== 'custom').map(fitting => (
                      <option key={fitting.id} value={fitting.id}>
                        {fitting.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                <div className="mb-2">
                    <label className="block text-xs text-gray-600 mb-1">Pressure Drop Method</label>
                    <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                        <input
                        type="radio"
                        checked={customFittingMethod === 'kValue'}
                        onChange={() => setCustomFittingMethod('kValue')}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">K-Value Method</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                        type="radio"
                        checked={customFittingMethod === 'direct'}
                        onChange={() => setCustomFittingMethod('direct')}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Direct Pressure Drop</span>
                    </label>
                    </div>
                </div>
                
                <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                    <label className="block text-xs text-gray-600 mb-1">Custom Fitting Name</label>
                    <input
                        type="text"
                        value={customFittingName}
                        onChange={(e) => setCustomFittingName(e.target.value)}
                        placeholder="Enter name"
                        className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                    </div>
                    
                    {customFittingMethod === 'kValue' ? (
                    <div className="col-span-5">
                        <label className="block text-xs text-gray-600 mb-1">K-Value</label>
                        <input
                        type="number"
                        value={customFittingKValue}
                        onChange={(e) => setCustomFittingKValue(Number(e.target.value))}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md"
                        step="0.1"
                        min="0"
                        />
                    </div>
                    ) : (
                    <div className="col-span-5">
                        <label className="block text-xs text-gray-600 mb-1">Pressure Drop (Pa)</label>
                        <input
                        type="number"
                        value={customFittingPressureDrop}
                        onChange={(e) => setCustomFittingPressureDrop(Number(e.target.value))}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md"
                        step="1"
                        min="0"
                        />
                    </div>
                    )}
                    
                    <div className="col-span-2 flex items-end">
                    <button
                        onClick={() => addFitting(section.id, 'custom')}
                        className="w-full h-10 bg-blue-600 text-white px-1 py-2 rounded-md text-xl font-medium hover:bg-blue-700 flex items-center justify-center"
                    >
                        +
                    </button>
                    </div>
                </div>
                </div>
                
                {section.fittings.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No fittings added.</p>
                ) : (
                  <ul className="space-y-2 mt-2">
                    {section.fittings.map(fitting => (
                      <li key={fitting.id} className="bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex items-center p-2">
                          <div className="flex-grow">
                            <span className="text-sm font-medium text-gray-700">
                              {fitting.type}
                              {fitting.isCustom && <span className="text-xs text-blue-600 ml-2">(Custom)</span>}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {editingFitting && editingFitting.fittingId === fitting.id ? (
                            <div className="flex flex-col items-start space-y-1">
                                {fitting.isCustom && (
                                <div className="flex items-center w-full mb-1">
                                    <span className="text-xs text-gray-600 mr-1 w-8">Name:</span>
                                    <input
                                    type="text"
                                    value={editingFitting.newName}
                                    onChange={(e) => setEditingFitting({
                                        ...editingFitting,
                                        newName: e.target.value
                                    })}
                                    className="flex-grow p-1 text-sm border border-gray-300 rounded-md"
                                    />
                                </div>
                                )}
                                
                                {fitting.isCustom && (
                                <div className="flex items-center w-full mb-1">
                                    <span className="text-xs text-gray-600 mr-1 w-8">Method:</span>
                                    <select
                                    value={editingFitting.newMethod}
                                    onChange={(e) => setEditingFitting({
                                        ...editingFitting,
                                        newMethod: e.target.value as 'kValue' | 'direct'
                                    })}
                                    className="flex-grow p-1 text-sm border border-gray-300 rounded-md"
                                    >
                                    <option value="kValue">K-Value</option>
                                    <option value="direct">Direct Pa</option>
                                    </select>
                                </div>
                                )}
                                
                                <div className="flex items-center w-full">
                                {editingFitting.newMethod === 'kValue' ? (
                                    <>
                                    <span className="text-xs text-gray-600 mr-1 w-8">K:</span>
                                    <input
                                        type="number"
                                        value={editingFitting.newKValue || 0}
                                        onChange={(e) => setEditingFitting({
                                        ...editingFitting,
                                        newKValue: Number(e.target.value)
                                        })}
                                        className="flex-grow p-1 text-sm border border-gray-300 rounded-md"
                                        step="0.1"
                                        min="0"
                                    />
                                    </>
                                ) : (
                                    <>
                                    <span className="text-xs text-gray-600 mr-1 w-8">Pa:</span>
                                    <input
                                        type="number"
                                        value={editingFitting.newDirectPressureDrop || 0}
                                        onChange={(e) => setEditingFitting({
                                        ...editingFitting,
                                        newDirectPressureDrop: Number(e.target.value)
                                        })}
                                        className="flex-grow p-1 text-sm border border-gray-300 rounded-md"
                                        step="1"
                                        min="0"
                                    />
                                    </>
                                )}
                                <button
                                    onClick={saveEditedFitting}
                                    className="text-green-500 hover:text-green-700 p-1 ml-1 rounded-full hover:bg-green-100"
                                >
                                    <Icons.Check />
                                </button>
                                <button
                                    onClick={cancelEditingFitting}
                                    className="text-red-500 hover:text-red-700 p-1 ml-1 rounded-full hover:bg-red-100"
                                >
                                    <Icons.Close />
                                </button>
                                </div>
                            </div>
                            ) : (
                            <button
                                onClick={() => startEditingFitting(section.id, fitting.id)}
                                className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                                {fitting.pressureDropMethod === 'kValue' ? (
                                <span className="text-sm mr-1">K: {fitting.kValue.toFixed(2)}</span>
                                ) : (
                                <span className="text-sm mr-1">{fitting.directPressureDrop} Pa</span>
                                )}
                                <Icons.Edit />
                            </button>
                            )}
                            
                            <div className="flex items-center">
                              <label className="text-xs text-gray-600 mr-1">Qty:</label>
                              <input
                                type="number"
                                value={fitting.quantity}
                                onChange={(e) => updateFitting(section.id, fitting.id, { quantity: Math.max(1, Number(e.target.value)) })}
                                className="w-14 p-1 text-sm border border-gray-300 rounded-md"
                                min="1"
                              />
                            </div>
                            
                            <button
                              onClick={() => removeFitting(section.id, fitting.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                            >
                              <Icons.Close />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
          
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-base text-gray-700">Water Properties</h4>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Density:</p>
                  <p className="font-semibold text-gray-800">{waterDensity.toFixed(1)} kg/m³</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Dynamic Viscosity:</p>
                  <p className="font-semibold text-gray-800">{waterViscosity.toExponential(3)} Pa·s</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Specific Heat:</p>
                  <p className="font-semibold text-gray-800">{specificHeat.toFixed(3)} kJ/(kg·K)</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">System Flow Rate:</p>
                  <p className="font-semibold text-gray-800">{systemFlowRate.toFixed(2)} l/s ({(systemFlowRate * 3.6).toFixed(1)} m³/h)</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-base text-gray-700">Pump Requirements</h4>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Pressure Drop:</p>
                  <p className="font-bold text-lg text-blue-600">{totalPressureDrop.toFixed(0)} Pa ({convertPressure(totalPressureDrop, 'kpa').toFixed(2)} kPa)</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Pump Head:</p>
                  <p className="font-bold text-blue-600">{pumpHead.toFixed(2)} m</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Maximum Velocity:</p>
                  <p className={`font-semibold ${!isSystemCompliant ? 'text-red-600' : 'text-gray-800'}`}>
                    {maxVelocity.toFixed(2)} m/s
                  </p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Approx. Power Consumption:</p>
                  <p className="font-semibold text-gray-800">{calculatePower().toFixed(2)} kW (at {(pumpEfficiency * 100).toFixed(0)}% efficiency)</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className={`rounded-md p-3 ${isSystemCompliant ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                <p className={`text-sm font-medium ${isSystemCompliant ? 'text-green-800' : 'text-red-800'}`}>
                  {isSystemCompliant 
                    ? 'Velocity Compliance: All pipe sections are within their respective recommended velocity limits.'
                    : 'Velocity Compliance: Warning! One or more pipe sections exceed recommended velocity limits. Consider increasing pipe size.'}
                </p>
              </div>
              
              {(lowTempDropWarning || innerDiameterWarning || frictionFactorWarning) && (
                <div className="mt-2 rounded-md p-3 bg-yellow-50 border border-yellow-300">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Calculation Warnings:</p>
                  <ul className="list-disc pl-5 text-xs text-yellow-700">
                    {lowTempDropWarning && (
                      <li>Temperature difference is very low, calculated flow rates may be unreliable.</li>
                    )}
                    {innerDiameterWarning && (
                      <li>Some pipe material schedules are missing for selected sizes, or custom ID was used; verify inner diameters.</li>
                    )}
                    {frictionFactorWarning && (
                      <li>Friction factor calculation uses fallback values in some cases.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <h4 className="font-medium mb-3 text-blue-700">Section Details</h4>
          
          {sectionResults.length === 0 && (
            <p className="text-sm text-gray-500 italic">No sections defined or calculation pending.</p>
          )}
          
          {sectionResults.map((result, index) => (
            <div key={result.sectionId || index} className="bg-white p-3 rounded-md mb-3 shadow-sm border border-gray-200">
              <h5 className="font-medium text-gray-700">
                Section {index + 1} (Type: <span className="capitalize">{result.pipeType}</span>)
              </h5>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm">
                <div>
                  <p className="text-gray-600">Inner Diameter:</p>
                  <p className="font-semibold text-gray-800">{result.innerDiameter.toFixed(1)} mm</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Velocity (Limit: {result.velocityLimit.toFixed(1)} m/s):</p>
                  <p className={`font-semibold ${!result.isSectionCompliant ? 'text-red-600' : 'text-green-600'}`}>
                    {result.velocity.toFixed(2)} m/s {result.isSectionCompliant ? '(OK)' : '(High)'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600">Velocity Pressure:</p>
                  <p className="font-semibold text-gray-800">{result.dynamicPressure.toExponential(2)}</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Reynolds Number:</p>
                  <p className="font-semibold text-gray-800">{result.reynolds.toExponential(2)}</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Friction Factor:</p>
                  <p className="font-semibold text-gray-800">{result.frictionFactor.toFixed(4)}</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Friction Loss:</p>
                  <p className="font-semibold text-gray-800">{result.majorLossPa.toFixed(0)} Pa</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Fittings Loss:</p>
                  <p className="font-semibold text-gray-800">{result.minorLossPa.toFixed(0)} Pa</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Pressure Gradient:</p>
                  <p className="font-semibold text-gray-800">{result.pressureGradient.toFixed(0)} Pa/m</p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-gray-600">Total Section Loss:</p>
                  <p className="font-bold text-gray-800">
                    {result.sectionLossPa.toFixed(0)} Pa ({convertPressure(result.sectionLossPa, 'kpa').toFixed(2)} kPa)
                  </p>
                </div>
              </div>
              
              {result.fittingDetails && result.fittingDetails.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Fitting Breakdown:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left font-semibold text-gray-600 border border-gray-300">Fitting</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">K-Value / Direct Pa</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Qty</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Loss/Unit (Pa)</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Total Loss (Pa)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.fittingDetails.map((fitting: any, i: number) => (
                          <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 text-gray-700 border border-gray-300">
                              {fitting.type}
                              {fitting.isCustom && <span className="text-xs text-blue-500 ml-1">(Custom)</span>}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                               {fitting.pressureDropMethod === 'kValue' && fitting.kValue !== undefined ? fitting.kValue.toFixed(2)
                               : fitting.pressureDropMethod === 'direct' && fitting.directPressureDrop !== undefined ? `${fitting.directPressureDrop} Pa`
                               : 'N/A'}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                              {fitting.quantity}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                              {fitting.lossPerUnit.toFixed(0)}
                            </td>
                            <td className="p-2 text-right font-medium text-gray-700 border border-gray-300">
                              {fitting.totalLoss.toFixed(0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">Pump Selection Guidance</h4>
            <p className="text-sm text-blue-800">The chilled water pump should be capable of providing:</p>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
              <li>Flow Rate: <strong className="text-blue-900">{systemFlowRate.toFixed(2)} l/s</strong> ({(systemFlowRate * 3.6).toFixed(1)} m³/h)</li>
              <li>Head: <strong className="text-blue-900">{pumpHead.toFixed(2)} m</strong> ({totalPressureDrop.toFixed(0)} Pa)</li>
              <li>Estimated Power: <strong className="text-blue-900">{calculatePower().toFixed(2)} kW</strong> (at {(pumpEfficiency * 100).toFixed(0)}% efficiency)</li>
              <li>Recommended Pump Type: {systemFlowRate > 5 ? 'Centrifugal' : systemFlowRate > 2 ? 'In-line Centrifugal' : 'Circulator'}</li>
            </ul>
            <p className="text-xs mt-2 text-blue-700">
              Note: Consider additional head requirements for terminal units, heat exchangers, and control valves not included in this calculation.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Flow calculation based on: Flow (l/s) = Cooling Load (kW) / (Specific Heat × ΔT (°C) × Density/1000)</li>
          <li>Recommended velocity limits (as per ASHRAE guidelines):
            <ul className="list-disc pl-5 mt-1 mb-1">
              <li>Main pipes: 1.2 - 3.0 m/s</li>
              <li>Branch pipes: 0.6 - 2.4 m/s</li>
              <li>Connection pipes: 0.6 - 1.2 m/s</li>
            </ul>
          </li>
          <li>K-values for fittings vary based on pipe size according to standard tables. Actual values may differ.</li>
          <li>Higher velocities increase pressure drop but reduce pipe size and initial cost.</li>
          <li>Consider water treatment requirements if using glycol solutions.</li>
          <li>This calculator uses the Darcy-Weisbach equation and Haaland approximation for friction factor.</li>
          <li>Glycol adjustments use nonlinear corrections. Consult specific glycol data for high precision.</li>
          <li>For comprehensive pump selection, consult manufacturer performance curves and include system component pressure drops.</li>
        </ul>
      </div>
    </div>
  );
};

export default ChilledWaterPipeSizingCalculator;