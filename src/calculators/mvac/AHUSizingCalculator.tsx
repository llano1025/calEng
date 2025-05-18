import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface AHUSizingCalculatorProps {
  onShowTutorial?: () => void;
}

// Space types with recommended air changes per hour according to CIBSE
interface SpaceType {
  id: string;
  name: string;
  minTotalACH: number;
  minFreshACH: number;
  description: string;
  category: string;
}

// Define cooling load calculation method
type CoolingLoadMethod = 'manual' | 'calculated' | 'standard';

// Define ventilation strategy
type VentilationStrategy = 'mixing' | 'displacement' | 'underfloor' | 'naturalVent';

// Define space parameters interface
interface SpaceParameters {
  id: string;
  name: string;
  area: number;        // m²
  height: number;      // m
  occupants: number;   // number of people
  spaceType: string;   // reference to spaceType.id
  activityLevel: string; // reference to activityLevels
  internalGain: number; // W/m²
  solarGain: number;   // W/m²
  orientation: string; // North, East, South, West
  glazingPercentage: number; // % of wall area
  insulationLevel: string; // reference to insulationLevels
  ventilationStrategy: VentilationStrategy;
  coolingLoadMethod: CoolingLoadMethod;
  manualCoolingLoad: number; // W, only used if coolingLoadMethod === 'manual'
  minimumTotalACH: number | null; // Minimum total ACH input (null if using default)
  minimumFreshACH: number | null; // Minimum fresh ACH input (null if using default)
}

// Define external conditions interface
interface ExternalConditions {
  dryBulb: number;    // °C
  wetBulb: number;    // °C
  altitude: number;   // meters above sea level
}

// Define internal design conditions interface
interface InternalConditions {
  dryBulb: number;    // °C
  relHumidity: number; // %
  noiseLimit: number;       // dB(A)
  freshAirBoost: number;    // % above minimum (e.g., 30% means 1.3x minimum)
}

// Define calculation results interface
interface CalculationResults {
  requiredTotalAirflow: number;      // m³/h
  requiredFreshAirflow: number;      // m³/h
  recirculationAirflow: number;      // m³/h
  coolingCapacity: number;           // kW
  heatingCapacity: number;           // kW
  humidificationCapacity: number;    // kg/h
  dehumidificationCapacity: number;  // kg/h
  fanPower: number;                  // kW
  recommendedFilterClass: string;    // MERV, ePM1, etc.
  ahuSize: string;                   // physical size estimate
  specificFanPower: number;          // W/(l/s)
  totalACH: number;                  // air changes per hour achieved
  co2Concentration: number;          // ppm expected
  ventilationEffectiveness: number;  // ratio (typically 0.5-1.0)
}

// --- START OF PSYCHROMETRIC HELPER FUNCTIONS ---
const GAS_CONSTANT_DRY_AIR = 287.058; // J/(kg·K)
const GAS_CONSTANT_WATER_VAPOR = 461.52; // J/(kg·K)
const CP_DRY_AIR = 1.006; // kJ/(kg·K) specific heat of dry air
const CP_WATER_VAPOR = 1.86; // kJ/(kg·K) specific heat of water vapor
const LATENT_HEAT_WATER_0C = 2501; // kJ/kg latent heat of vaporization of water at 0°C

/**
 * Calculates saturation vapor pressure over water.
 * @param tempC Temperature in Celsius.
 * @returns Saturation vapor pressure in Pascals (Pa).
 */
function calculateSaturationVaporPressure(tempC: number): number {
  return 610.78 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Calculates actual vapor pressure.
 * @param tempC Temperature in Celsius.
 * @param relHumidityPercent Relative humidity in percent (0-100).
 * @returns Actual vapor pressure in Pascals (Pa).
 */
function calculateActualVaporPressure(tempC: number, relHumidityPercent: number): number {
  const satVaporPressure = calculateSaturationVaporPressure(tempC);
  return (relHumidityPercent / 100) * satVaporPressure;
}

/**
 * Calculates humidity ratio (mixing ratio).
 * @param tempC Temperature in Celsius.
 * @param relHumidityPercent Relative humidity in percent (0-100).
 * @param pressurePa Atmospheric pressure in Pascals (Pa).
 * @returns Humidity ratio in kg_water_vapor/kg_dry_air.
 */
function calculateHumidityRatio(tempC: number, relHumidityPercent: number, pressurePa: number): number {
  const actualVaporPressure = calculateActualVaporPressure(tempC, relHumidityPercent);
  if (pressurePa <= actualVaporPressure) {
    return NaN; 
  }
  return (0.621945 * actualVaporPressure) / (pressurePa - actualVaporPressure);
}

/**
 * Calculates enthalpy of moist air.
 * @param tempC Temperature in Celsius.
 * @param humidityRatio_kg_kg Humidity ratio in kg_water_vapor/kg_dry_air.
 * @returns Enthalpy in kJ/kg_dry_air.
 */
function calculateEnthalpy(tempC: number, humidityRatio_kg_kg: number): number {
  if (isNaN(humidityRatio_kg_kg)) return NaN;
  return (CP_DRY_AIR * tempC) + humidityRatio_kg_kg * (LATENT_HEAT_WATER_0C + CP_WATER_VAPOR * tempC);
}

/**
 * Calculates density of moist air.
 * @param tempC Temperature in Celsius.
 * @param pressurePa Atmospheric pressure in Pascals (Pa).
 * @param humidityRatio_kg_kg Humidity ratio in kg_water_vapor/kg_dry_air.
 * @returns Density in kg/m³.
 */
function calculateAirDensity(tempC: number, pressurePa: number, humidityRatio_kg_kg: number): number {
  if (isNaN(humidityRatio_kg_kg)) return NaN;
  const tempK = tempC + 273.15;
  
  const actualVaporPressure = (humidityRatio_kg_kg * pressurePa) / (0.621945 + humidityRatio_kg_kg);
  if (isNaN(actualVaporPressure)) return NaN;

  const partialPressureDryAir = pressurePa - actualVaporPressure;

  if (partialPressureDryAir <= 0) return NaN;

  const densityDryAirComponent = partialPressureDryAir / (GAS_CONSTANT_DRY_AIR * tempK);
  const densityWaterVaporComponent = actualVaporPressure / (GAS_CONSTANT_WATER_VAPOR * tempK);
  
  return densityDryAirComponent + densityWaterVaporComponent;
}

/**
 * Calculates relative humidity from dry bulb and wet bulb temperatures.
 * @param dryBulbC Dry bulb temperature in Celsius.
 * @param wetBulbC Wet bulb temperature in Celsius.
 * @param pressurePa Atmospheric pressure in Pascals (Pa).
 * @returns Relative humidity in percent (0-100).
 */
function calculateRelHumidityFromWetBulb(dryBulbC: number, wetBulbC: number, pressurePa: number): number {
  if (wetBulbC > dryBulbC) {
    wetBulbC = dryBulbC;
  }

  const satVaporPressureAtWetBulb = calculateSaturationVaporPressure(wetBulbC);
  const psychrometricConstantA = 0.000660; 
  const actualVaporPressure = satVaporPressureAtWetBulb - psychrometricConstantA * pressurePa * (dryBulbC - wetBulbC);
  const satVaporPressureAtDryBulb = calculateSaturationVaporPressure(dryBulbC);
  
  if (satVaporPressureAtDryBulb <= 0) return 0; 

  let relHumidity = (actualVaporPressure / satVaporPressureAtDryBulb) * 100;
  relHumidity = Math.max(0, Math.min(100, relHumidity)); 
  
  return relHumidity;
}
// --- END OF PSYCHROMETRIC HELPER FUNCTIONS ---


const AHUSizingCalculator: React.FC<AHUSizingCalculatorProps> = ({ onShowTutorial }) => {
  // State for space parameters
  const [spaces, setSpaces] = useState<SpaceParameters[]>([
    {
      id: '1',
      name: 'Office Space',
      area: 100,
      height: 3,
      occupants: 10,
      spaceType: 'officeOpen',
      activityLevel: 'lightOffice',
      internalGain: 25,
      solarGain: 40,
      orientation: 'south',
      glazingPercentage: 30,
      insulationLevel: 'medium',
      ventilationStrategy: 'mixing',
      coolingLoadMethod: 'calculated',
      manualCoolingLoad: 0,
      minimumTotalACH: null,
      minimumFreshACH: null,
    }
  ]);

  // State for external conditions
  const [externalConditions, setExternalConditions] = useState<ExternalConditions>({
    dryBulb: 35,
    wetBulb: 29,
    altitude: 25,
  });

  // State for internal design conditions
  const [internalConditions, setInternalConditions] = useState<InternalConditions>({
    dryBulb: 24,
    relHumidity: 50,
    noiseLimit: 35,
    freshAirBoost: 30,
  });

  // System parameters
  const [systemEfficiency, setSystemEfficiency] = useState<number>(0.85); // 85% thermal efficiency
  const [fanEfficiency, setFanEfficiency] = useState<number>(0.7); // 70% fan efficiency
  const [sfpTarget, setSfpTarget] = useState<number>(1.8); // SFP target in W/(l/s)
  const [safetyFactor, setSafetyFactor] = useState<number>(1.2); // 20% safety factor
  const [includeCO2Control, setIncludeCO2Control] = useState<boolean>(true);
  const [includeEconomizer, setIncludeEconomizer] = useState<boolean>(true);
  const [includeHeatRecovery, setIncludeHeatRecovery] = useState<boolean>(true);
  const [heatRecoveryEfficiency, setHeatRecoveryEfficiency] = useState<number>(75); // 75%
  const [includeVariableFlow, setIncludeVariableFlow] = useState<boolean>(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // State for calculation results
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isCIBSECompliant, setIsCIBSECompliant] = useState<boolean>(true);
  const [complianceIssues, setComplianceIssues] = useState<string[]>([]);

  // Space types from CIBSE Guide A, Guide B and other publications
  const spaceTypes: SpaceType[] = [
    // Custom option (must be first in the list)
    { id: 'custom', name: 'Custom Space Type', minTotalACH: 0, minFreshACH: 0, description: 'Define your own minimum air change rates', category: 'Custom' },
    
    // Offices
    { id: 'officeOpen', name: 'Open Plan Office', minTotalACH: 6, minFreshACH: 1.3, description: 'Open workspace with multiple work stations', category: 'Office' },
    { id: 'officeCellular', name: 'Cellular Office', minTotalACH: 6, minFreshACH: 1.3, description: 'Enclosed private office space', category: 'Office' },
    { id: 'meetingRoom', name: 'Meeting Room', minTotalACH: 8, minFreshACH: 2, description: 'Room for meetings and presentations', category: 'Office' },
    { id: 'boardRoom', name: 'Board Room', minTotalACH: 10, minFreshACH: 2.5, description: 'Formal meeting space for executives', category: 'Office' },
    { id: 'reception', name: 'Reception', minTotalACH: 6, minFreshACH: 1.5, description: 'Entrance area and waiting space', category: 'Office' },
    
    // Educational
    { id: 'classroom', name: 'Classroom', minTotalACH: 6, minFreshACH: 3, description: 'Room for teaching up to 30 students', category: 'Educational' },
    { id: 'lecture', name: 'Lecture Hall', minTotalACH: 8, minFreshACH: 3.5, description: 'Large teaching space for 30+ students', category: 'Educational' },
    { id: 'library', name: 'Library', minTotalACH: 4, minFreshACH: 1.5, description: 'Book storage and reading area', category: 'Educational' },
    { id: 'lab', name: 'Laboratory', minTotalACH: 10, minFreshACH: 4, description: 'Scientific workspace with fume requirements', category: 'Educational' },
    
    // Healthcare
    { id: 'patientRoom', name: 'Patient Room', minTotalACH: 6, minFreshACH: 2, description: 'Room for patient recovery and care', category: 'Healthcare' },
    { id: 'operatingTheater', name: 'Operating Theater', minTotalACH: 25, minFreshACH: 5, description: 'Surgical space with strict air quality requirements', category: 'Healthcare' },
    { id: 'ward', name: 'General Ward', minTotalACH: 6, minFreshACH: 2, description: 'Open space with multiple patient beds', category: 'Healthcare' },
    { id: 'waitingArea', name: 'Waiting Area', minTotalACH: 6, minFreshACH: 2, description: 'Space for waiting patients and visitors', category: 'Healthcare' },
    
    // Retail & Hospitality
    { id: 'retailGeneral', name: 'Retail Space', minTotalACH: 4, minFreshACH: 1.5, description: 'General sales floor area', category: 'Retail' },
    { id: 'restaurant', name: 'Restaurant', minTotalACH: 10, minFreshACH: 3, description: 'Dining area with tables', category: 'Hospitality' },
    { id: 'kitchen', name: 'Commercial Kitchen', minTotalACH: 30, minFreshACH: 5, description: 'Food preparation area with cooking', category: 'Hospitality' },
    { id: 'hotelRoom', name: 'Hotel Room', minTotalACH: 3, minFreshACH: 1, description: 'Private room for guests', category: 'Hospitality' },
    
    // Industrial
    { id: 'workshop', name: 'Workshop', minTotalACH: 8, minFreshACH: 2, description: 'Light manufacturing or assembly', category: 'Industrial' },
    { id: 'warehouse', name: 'Warehouse', minTotalACH: 2, minFreshACH: 0.5, description: 'Storage area with minimal occupancy', category: 'Industrial' },
    { id: 'dataCenter', name: 'Data Center', minTotalACH: 15, minFreshACH: 1, description: 'Server and IT equipment room', category: 'Industrial' },
    
    // Public
    { id: 'corridor', name: 'Corridor', minTotalACH: 4, minFreshACH: 1, description: 'Passage between spaces', category: 'Public' },
    { id: 'lobby', name: 'Lobby', minTotalACH: 4, minFreshACH: 1.5, description: 'Building entrance area', category: 'Public' },
    { id: 'toilet', name: 'Toilet Facilities', minTotalACH: 10, minFreshACH: 2, description: 'Washrooms and toilet areas', category: 'Public' },
  ];

  // Activity levels with metabolic heat output
  const activityLevels = [
    { id: 'sedentary', name: 'Sedentary / Resting', metabolicGain: 70, description: 'Seated, relaxed' },
    { id: 'lightOffice', name: 'Light Office Work', metabolicGain: 120, description: 'Typing, desk work' },
    { id: 'standing', name: 'Standing Activity', metabolicGain: 150, description: 'Retail, light assembly work' },
    { id: 'lightManual', name: 'Light Manual Work', metabolicGain: 200, description: 'Workshop, maintenance tasks' },
    { id: 'moderateManual', name: 'Moderate Manual Work', metabolicGain: 300, description: 'Heavy cleaning, assembly work' },
    { id: 'heavyManual', name: 'Heavy Manual Work', metabolicGain: 400, description: 'Intense physical labor' },
    { id: 'sportLight', name: 'Light Sport Activity', metabolicGain: 300, description: 'Gentle exercise' },
    { id: 'sportHeavy', name: 'Heavy Sport Activity', metabolicGain: 600, description: 'Intense training, competition' },
  ];

  // Insulation levels for building envelope
  const insulationLevels = [
    { id: 'poor', name: 'Poor Insulation', uValue: 1.5, description: 'Old building, single glazing, minimal insulation' },
    { id: 'basic', name: 'Basic Insulation', uValue: 1.0, description: 'Older building with some insulation' },
    { id: 'medium', name: 'Medium Insulation', uValue: 0.7, description: 'Standard insulation for newer buildings' },
    { id: 'good', name: 'Good Insulation', uValue: 0.4, description: 'Well insulated, double glazing' },
    { id: 'excellent', name: 'Excellent Insulation', uValue: 0.25, description: 'High performance envelope, triple glazing' },
    { id: 'passiveHouse', name: 'Passive House Standard', uValue: 0.15, description: 'Passive house certified envelope' },
  ];

  // Ventilation strategy efficiency factors
  const ventilationEfficiencies = {
    'mixing': 0.8,
    'displacement': 1.2,
    'underfloor': 1.1,
    'naturalVent': 0.7
  };

  // Filter classes with recommendations
  const filterClasses = [
    { id: 'ePM1_50', name: 'ePM1 50% (F7)', application: 'General office spaces' },
    { id: 'ePM1_70', name: 'ePM1 70% (F8)', application: 'High quality offices, healthcare' },
    { id: 'ePM1_85', name: 'ePM1 85% (F9)', application: 'Hospitals, clean rooms' },
    { id: 'ePM10_50', name: 'ePM10 50% (M5)', application: 'Basic filtration' },
    { id: 'ePM10_85', name: 'ePM10 85% (M6)', application: 'Schools, retail' },
    { id: 'ISO_15', name: 'ISO ePM2.5 95% (E11)', application: 'Operating theaters, pharma' },
    { id: 'ISO_16', name: 'ISO ePM1 99.5% (E12)', application: 'Advanced healthcare, laboratories' },
  ];

  // Function to add a new space
  const addSpace = () => {
    const newSpace: SpaceParameters = {
      id: Date.now().toString(),
      name: `Space ${spaces.length + 1}`,
      area: 50,
      height: 3,
      occupants: 5,
      spaceType: 'officeOpen',
      activityLevel: 'lightOffice',
      internalGain: 25,
      solarGain: 40,
      orientation: 'south',
      glazingPercentage: 30,
      insulationLevel: 'medium',
      ventilationStrategy: 'mixing',
      coolingLoadMethod: 'calculated',
      manualCoolingLoad: 0,
      minimumTotalACH: null,
      minimumFreshACH: null,
    };
    setSpaces([...spaces, newSpace]);
  };

  // Function to remove a space
  const removeSpace = (id: string) => {
    if (spaces.length > 1) {
      setSpaces(spaces.filter(space => space.id !== id));
    } else {
      alert('At least one space is required');
    }
  };

  // Function to update a space
  const updateSpace = (id: string, updates: Partial<SpaceParameters>) => {
    setSpaces(
      spaces.map(s => {
        if (s.id === id) {
          const newSpaceData = { ...s, ...updates };

          // If spaceType is changed AND it's NOT 'custom', reset custom ACH fields
          if (updates.spaceType && updates.spaceType !== 'custom') {
            newSpaceData.minimumTotalACH = null;
            newSpaceData.minimumFreshACH = null;
          }
          
          return newSpaceData;
        }
        return s;
      })
    );
  };

  // Function to update external conditions
  const updateExternalConditions = (updates: Partial<ExternalConditions>) => {
    setExternalConditions({ ...externalConditions, ...updates });
  };

  // Function to update internal conditions
  const updateInternalConditions = (updates: Partial<InternalConditions>) => {
    setInternalConditions({ ...internalConditions, ...updates });
  };
  
  // Calculate total volume for all spaces
  const calculateTotalVolume = (): number => {
    return spaces.reduce((sum, space) => sum + (space.area * space.height), 0);
  };

  // Helper function to calculate boosted fresh air volume for a single space
  const getBoostedFreshAirVolumeForSpace = (
    space: SpaceParameters,
    currentSpaceTypes: SpaceType[],
    freshAirBoostPercent: number
  ): number => {
    const spaceTypeData = currentSpaceTypes.find(type => type.id === space.spaceType);
    if (!spaceTypeData) return 0;

    let baseSpaceTypeFreshACH = spaceTypeData.minFreshACH;
    let effectiveFreshACH = baseSpaceTypeFreshACH;

    // Use user-defined minimumFreshACH if space type is 'custom' and value is provided
    // Or if a value is provided for any space type (robustness, though UI might restrict this for non-custom)
    if (space.minimumFreshACH !== null && space.minimumFreshACH >= 0) {
        if (space.spaceType === 'custom' || space.minimumFreshACH > baseSpaceTypeFreshACH) {
             effectiveFreshACH = Math.max(baseSpaceTypeFreshACH, space.minimumFreshACH);
        }
    }

    const freshAirVolume_ACH_based = space.area * space.height * effectiveFreshACH;
    const freshAirVolume_occupancy_based = space.occupants * 10 * 3.6; // 10 L/s/person = 36 m³/h/person

    const rawFreshAirVolume_for_space_m3h = Math.max(freshAirVolume_ACH_based, freshAirVolume_occupancy_based);
    const boostedFreshAirVolume_for_space_m3h = rawFreshAirVolume_for_space_m3h * (1 + freshAirBoostPercent / 100);

    return boostedFreshAirVolume_for_space_m3h;
  };


  // Calculate required fresh air based on occupancy and space types or minimum ACH
  const calculateRequiredFreshAir = (): number => {
    let totalFreshAir = 0;
    
    spaces.forEach(space => {
      const boostedFreshAirForThisSpace = getBoostedFreshAirVolumeForSpace(
        space,
        spaceTypes, // Pass the main spaceTypes array
        internalConditions.freshAirBoost
      );
      
      // Get ventilation effectiveness for this space
      const ventEffectiveness = ventilationEfficiencies[space.ventilationStrategy] || 0.8;
      
      // Adjust required fresh air based on ventilation effectiveness
      const adjustedFreshAir = boostedFreshAirForThisSpace / ventEffectiveness;
      
      totalFreshAir += adjustedFreshAir;
    });
    
    return totalFreshAir;
  };

  // Calculate total cooling load (RAW load, without safety factor)
  const calculateTotalCoolingLoad = (): number => {
    let totalCoolingLoadW = 0;
    
    const standardPressureAtSeaLevel = 101325; // Pa
    const atmosphericPressure = standardPressureAtSeaLevel * Math.exp(-0.00012 * externalConditions.altitude);
    
    const outsideRH = calculateRelHumidityFromWetBulb(externalConditions.dryBulb, externalConditions.wetBulb, atmosphericPressure);
    const outsideHumidityRatio = calculateHumidityRatio(externalConditions.dryBulb, outsideRH, atmosphericPressure);
    const outsideEnthalpy = calculateEnthalpy(externalConditions.dryBulb, outsideHumidityRatio);
    
    const roomHumidityRatio = calculateHumidityRatio(internalConditions.dryBulb, internalConditions.relHumidity, atmosphericPressure);
    const roomEnthalpy = calculateEnthalpy(internalConditions.dryBulb, roomHumidityRatio);
    const roomAirDensity = calculateAirDensity(internalConditions.dryBulb, atmosphericPressure, roomHumidityRatio);

    if (isNaN(outsideEnthalpy) || isNaN(roomEnthalpy) || isNaN(roomAirDensity)) {
        setValidationErrors(prev => [...prev, "Invalid psychrometric conditions for cooling load."]);
        return NaN; 
    }
    
    spaces.forEach(space => {
      const activityLevel = activityLevels.find(level => level.id === space.activityLevel);
      const insulationLevel = insulationLevels.find(level => level.id === space.insulationLevel);
      const spaceTypeData = spaceTypes.find(st => st.id === space.spaceType); // used for standard loads
      
      if (!activityLevel || !insulationLevel || !spaceTypeData) return; // Ensure all lookups succeed
      
      let spaceCoolingLoadW = 0;
      
      if (space.coolingLoadMethod === 'manual') {
        spaceCoolingLoadW = space.manualCoolingLoad;
      } else if (space.coolingLoadMethod === 'standard') {
        const standardLoads: {[key: string]: number} = {
          'officeOpen': 120, 'officeCellular': 110, 'meetingRoom': 140, 'boardRoom': 150,
          'reception': 100, 'classroom': 120, 'lecture': 140, 'library': 100, 'lab': 180,
          'patientRoom': 90, 'operatingTheater': 250, 'ward': 100, 'waitingArea': 90,
          'retailGeneral': 150, 'restaurant': 170, 'kitchen': 350, 'hotelRoom': 80,
          'workshop': 140, 'warehouse': 70, 'dataCenter': 1200, 'corridor': 70,
          'lobby': 90, 'toilet': 80, 'custom': 100 // Default for custom if standard is chosen
        };
        spaceCoolingLoadW = (standardLoads[space.spaceType] || 100) * space.area;
      } else { // Calculated method
        const occupantGain = space.occupants * activityLevel.metabolicGain;
        const equipmentGain = space.internalGain * space.area;
        
        const orientationFactor: {[key: string]: number} = {
          'north': 1.0, 'east': 1.3, 'south': 1.5, 'west': 1.3,
          'northeast': 1.1, 'southeast': 1.4, 'southwest': 1.4, 'northwest': 1.1,
        };
        const perimeter = space.area > 0 ? 2 * (Math.sqrt(space.area) + space.area / Math.sqrt(space.area)) : 0;
        const wallArea = perimeter * space.height;
        const glazingArea = wallArea * (space.glazingPercentage / 100);
        const solarGain = space.solarGain * glazingArea * (orientationFactor[space.orientation] || 1.0);
        
        const tempDifference = externalConditions.dryBulb - internalConditions.dryBulb;
        const fabricGain = wallArea * insulationLevel.uValue * tempDifference;
        
        // Use the helper function to get consistent fresh air volume for load calculation
        const freshAirVolume_m3h_for_load = getBoostedFreshAirVolumeForSpace(
            space, 
            spaceTypes, 
            internalConditions.freshAirBoost
        );
        
        const freshAirMassFlow_kgs = (freshAirVolume_m3h_for_load / 3600) * roomAirDensity; 
        const freshAirLoadW = freshAirMassFlow_kgs * (outsideEnthalpy - roomEnthalpy) * 1000; 
        
        spaceCoolingLoadW = occupantGain + equipmentGain + solarGain + fabricGain + freshAirLoadW;
      }
      totalCoolingLoadW += spaceCoolingLoadW;
    });
    
    return totalCoolingLoadW; 
  };

  // Calculate total heating load (RAW load, without safety factor)
  const calculateTotalHeatingLoad = (): number => {
    let totalHeatingLoadW = 0;
    
    const standardPressureAtSeaLevel = 101325; // Pa
    const atmosphericPressure = standardPressureAtSeaLevel * Math.exp(-0.00012 * externalConditions.altitude);
    
    const designWinterTempC = 0; 
    const designWinterRHPercent = 90;
    
    const winterHumidityRatio = calculateHumidityRatio(designWinterTempC, designWinterRHPercent, atmosphericPressure);
    const winterEnthalpy = calculateEnthalpy(designWinterTempC, winterHumidityRatio);
    
    const roomHumidityRatio = calculateHumidityRatio(internalConditions.dryBulb, internalConditions.relHumidity, atmosphericPressure);
    const roomEnthalpy = calculateEnthalpy(internalConditions.dryBulb, roomHumidityRatio);
    const roomAirDensity = calculateAirDensity(internalConditions.dryBulb, atmosphericPressure, roomHumidityRatio);

    if (isNaN(winterEnthalpy) || isNaN(roomEnthalpy) || isNaN(roomAirDensity)) {
        setValidationErrors(prev => [...prev, "Invalid psychrometric conditions for heating load."]);
        return NaN;
    }

    spaces.forEach(space => {
      const insulationLevel = insulationLevels.find(level => level.id === space.insulationLevel);
      const spaceTypeData = spaceTypes.find(st => st.id === space.spaceType);
      
      if (!insulationLevel || !spaceTypeData) return;
      
      const perimeter = space.area > 0 ? 2 * (Math.sqrt(space.area) + space.area / Math.sqrt(space.area)) : 0;
      const wallArea = perimeter * space.height;
      const glazingArea = wallArea * (space.glazingPercentage / 100);
      const solidWallArea = wallArea - glazingArea;
      
      const wallUValue = insulationLevel.uValue;
      const glazingUValue = insulationLevel.uValue * 2; 
      const roofUValue = insulationLevel.uValue * 0.8; 
      const floorUValue = insulationLevel.uValue * 0.7;
      
      const tempDifference = internalConditions.dryBulb - designWinterTempC;
      
      const wallLoss = solidWallArea * wallUValue * tempDifference;
      const glazingLoss = glazingArea * glazingUValue * tempDifference;
      const roofLoss = space.area * roofUValue * tempDifference;
      const floorLoss = space.area * floorUValue * tempDifference;
      
      // Use the helper function to get consistent fresh air volume for load calculation
      const freshAirVolume_m3h_for_load = getBoostedFreshAirVolumeForSpace(
        space,
        spaceTypes,
        internalConditions.freshAirBoost
      );
      const freshAirMassFlow_kgs = (freshAirVolume_m3h_for_load / 3600) * roomAirDensity; 
      
      let ventilationLossW = freshAirMassFlow_kgs * (roomEnthalpy - winterEnthalpy) * 1000; 
      
      if (includeHeatRecovery) {
        ventilationLossW *= (1 - heatRecoveryEfficiency / 100);
      }
      
      const spaceHeatingLoadW = wallLoss + glazingLoss + roofLoss + floorLoss + ventilationLossW;
      totalHeatingLoadW += spaceHeatingLoadW;
    });
    
    return totalHeatingLoadW; 
  };

  // Calculate required total airflow (applies safety factor at the end)
  const calculateRequiredTotalAirflow = (rawCoolingLoadW: number): number => {
    let totalAirflow_ACH_Component_m3h = 0;
    
    spaces.forEach(space => {
      const spaceType = spaceTypes.find(type => type.id === space.spaceType);
      if (!spaceType) return;
      
      let spaceTypeTotalACH = spaceType.minTotalACH;
      let effectiveTotalACH = spaceTypeTotalACH;
      // Consistent logic for effective ACH override
      if (space.minimumTotalACH !== null && space.minimumTotalACH >= 0) {
         if (space.spaceType === 'custom' || space.minimumTotalACH > spaceTypeTotalACH) {
            effectiveTotalACH = Math.max(spaceTypeTotalACH, space.minimumTotalACH);
         }
      }
      
      const ventEffectiveness = ventilationEfficiencies[space.ventilationStrategy] || 0.8;
      const spaceAirflow = (space.area * space.height * effectiveTotalACH) / ventEffectiveness;
      totalAirflow_ACH_Component_m3h += spaceAirflow;
    });
    
    const standardPressureAtSeaLevel = 101325; // Pa
    const atmosphericPressure = standardPressureAtSeaLevel * Math.exp(-0.00012 * externalConditions.altitude);
    
    const supplyAirTempC = internalConditions.dryBulb - 10;
    const supplyAirRHPercent = 90; 
    const supplyHumidityRatio = calculateHumidityRatio(supplyAirTempC, supplyAirRHPercent, atmosphericPressure);
    const supplyEnthalpy = calculateEnthalpy(supplyAirTempC, supplyHumidityRatio);
    const supplyAirDensity = calculateAirDensity(supplyAirTempC, atmosphericPressure, supplyHumidityRatio); 

    const roomHumidityRatio = calculateHumidityRatio(internalConditions.dryBulb, internalConditions.relHumidity, atmosphericPressure);
    const roomEnthalpy = calculateEnthalpy(internalConditions.dryBulb, roomHumidityRatio);
    
    let coolingAirflow_Load_Component_m3h = 0;
    const enthalpyDifference = roomEnthalpy - supplyEnthalpy; 
    
    if (isNaN(supplyAirDensity) || isNaN(enthalpyDifference) || supplyAirDensity <= 0 || enthalpyDifference <= 0) {
        if (rawCoolingLoadW > 0) { 
            coolingAirflow_Load_Component_m3h = Infinity; 
            setValidationErrors(prev => [...prev, "Invalid psychrometric conditions for airflow calculation."]);
        }
    } else if (rawCoolingLoadW > 0) {
        const coolingLoad_kJs = rawCoolingLoadW / 1000; 
        const massFlow_kgs = coolingLoad_kJs / enthalpyDifference; 
        coolingAirflow_Load_Component_m3h = (massFlow_kgs / supplyAirDensity) * 3600; 
        
        let totalArea = 0;
        let weightedEffectiveness = 0;
        spaces.forEach(space => {
          totalArea += space.area;
          weightedEffectiveness += space.area * (ventilationEfficiencies[space.ventilationStrategy] || 0.8);
        });
        const avgVentEffectiveness = totalArea > 0 ? weightedEffectiveness / totalArea : 0.8;
        coolingAirflow_Load_Component_m3h = coolingAirflow_Load_Component_m3h / avgVentEffectiveness;
    }
    
    const rawRequiredAirflow_m3h = Math.max(totalAirflow_ACH_Component_m3h, coolingAirflow_Load_Component_m3h);
    
    return rawRequiredAirflow_m3h * safetyFactor;
  };

  // Calculate fan power based on airflow and system pressure
  const calculateFanPower = (airflow_m3h: number): number => {
    const airflowLps = airflow_m3h / 3.6;
    return (airflowLps * sfpTarget) / 1000; // Convert W to kW
  };

  const calculateCO2Concentration = (freshAirflow_m3h: number): number => {
    let totalOccupants = spaces.reduce((sum, space) => sum + space.occupants, 0);
    
    const co2GenerationRate_Lps_person = 0.005; 
    const freshAirLps = freshAirflow_m3h / 3.6;
    const outdoorCO2_ppm = 400; 
    
    if (totalOccupants === 0 || freshAirLps === 0) {
      return outdoorCO2_ppm;
    }
    
    const co2Increase_ppm = (totalOccupants * co2GenerationRate_Lps_person * 1000000) / freshAirLps;
    return outdoorCO2_ppm + co2Increase_ppm;
  };

  const calculateHumidityControl = (totalAirflow_m3h: number): {dehumidification: number, humidification: number} => {
    const standardPressureAtSeaLevel = 101325; // Pa
    const atmosphericPressure = standardPressureAtSeaLevel * Math.exp(-0.00012 * externalConditions.altitude);
    
    const outsideRH = calculateRelHumidityFromWetBulb(externalConditions.dryBulb, externalConditions.wetBulb, atmosphericPressure);
    const outsideHumidityRatio = calculateHumidityRatio(externalConditions.dryBulb, outsideRH, atmosphericPressure);
    const outsideAirDensity = calculateAirDensity(externalConditions.dryBulb, atmosphericPressure, outsideHumidityRatio);
    
    const roomHumidityRatio = calculateHumidityRatio(internalConditions.dryBulb, internalConditions.relHumidity, atmosphericPressure);

    if (isNaN(outsideHumidityRatio) || isNaN(outsideAirDensity) || isNaN(roomHumidityRatio)) {
        setValidationErrors(prev => [...prev, "Invalid psychrometric conditions for humidity control."]);
        return { dehumidification: NaN, humidification: NaN };
    }
    
    const massAirflow_kgs = (totalAirflow_m3h / 3600) * outsideAirDensity; 
    
    let dehumidification_kgh = 0;
    if (outsideHumidityRatio > roomHumidityRatio) {
      dehumidification_kgh = massAirflow_kgs * (outsideHumidityRatio - roomHumidityRatio) * 3600; // kg/h
    }
    
    const minExpectedWinterHumidityRatio_kgkg = 0.003; 
    let humidification_kgh = 0;
    if (roomHumidityRatio > minExpectedWinterHumidityRatio_kgkg) {
      humidification_kgh = massAirflow_kgs * (roomHumidityRatio - minExpectedWinterHumidityRatio_kgkg) * 3600 * 0.5; 
    }
    
    return { dehumidification: dehumidification_kgh, humidification: humidification_kgh };
  };

  const determineFilterClass = (): string => {
    let highestACH = 0;
    let mostCriticalSpace = '';
    
    spaces.forEach(space => {
      const spaceType = spaceTypes.find(type => type.id === space.spaceType);
      if (spaceType) { // Check if spaceType is found
        let currentSpaceACH = spaceType.minTotalACH;
        if (space.minimumTotalACH !== null && space.minimumTotalACH >=0 && (space.spaceType === 'custom' || space.minimumTotalACH > currentSpaceACH)) {
            currentSpaceACH = space.minimumTotalACH;
        }
        if (currentSpaceACH > highestACH) {
            highestACH = currentSpaceACH;
            mostCriticalSpace = spaceType.id;
        }
      }
    });
    
    const filterRecommendations: {[key: string]: string} = {
      'officeOpen': 'ePM1_50', 'officeCellular': 'ePM1_50', 'meetingRoom': 'ePM1_50',
      'boardRoom': 'ePM1_50', 'reception': 'ePM1_50', 'classroom': 'ePM1_70',
      'lecture': 'ePM1_70', 'library': 'ePM1_50', 'lab': 'ePM1_85',
      'patientRoom': 'ePM1_70', 'operatingTheater': 'ISO_15', 'ward': 'ePM1_70',
      'waitingArea': 'ePM1_50', 'retailGeneral': 'ePM10_85', 'restaurant': 'ePM10_85',
      'kitchen': 'ePM10_85', 'hotelRoom': 'ePM1_50', 'workshop': 'ePM10_85',
      'warehouse': 'ePM10_50', 'dataCenter': 'ePM10_85', 'corridor': 'ePM10_50',
      'lobby': 'ePM10_50', 'toilet': 'ePM10_50', 'custom': 'ePM1_50' 
    };
    
    return filterClasses.find(fc => fc.id === (filterRecommendations[mostCriticalSpace] || 'ePM1_50'))?.name || 'ePM1 50% (F7)';
  };

  const estimateAHUSize = (airflow_m3h: number): string => {
    const faceVelocity_mps = 2.2; 
    const airflowMps = airflow_m3h / 3600;
    const faceArea_m2 = airflowMps / faceVelocity_mps;
    
    const width_m = Math.sqrt(faceArea_m2 * 1.5);
    const height_m = faceArea_m2 / width_m;
    
    const physicalWidth_m = width_m * 1.3;
    const physicalHeight_m = height_m * 1.3;
    const physicalDepth_m = physicalWidth_m * 2.5;
    
    return `Approx. ${physicalWidth_m.toFixed(1)}m W × ${physicalHeight_m.toFixed(1)}m H × ${physicalDepth_m.toFixed(1)}m D`;
  };

  const checkCIBSECompliance = (calcResults: CalculationResults): {compliant: boolean, issues: string[]} => {
    const issues: string[] = [];
    const totalVolume = calculateTotalVolume();
    
    if (calcResults.co2Concentration > 1000) {
      issues.push(`CO2 concentration (${calcResults.co2Concentration.toFixed(0)}ppm) exceeds 1000ppm CIBSE recommendation.`);
    }
    
    if (calcResults.specificFanPower > 2.0) {
      issues.push(`Specific Fan Power (${calcResults.specificFanPower.toFixed(1)} W/(l/s)) exceeds CIBSE/Part L best practice of 2.0 W/(l/s).`);
    }
    
    let minRequiredACHOverall = 0;
    spaces.forEach(space => {
      const spaceType = spaceTypes.find(type => type.id === space.spaceType);
      if (spaceType) {
        let effectiveMinACH = spaceType.minTotalACH;
        if (space.minimumTotalACH !== null && space.minimumTotalACH >= 0) {
            if (space.spaceType === 'custom' || space.minimumTotalACH > effectiveMinACH) {
                 effectiveMinACH = Math.max(spaceType.minTotalACH, space.minimumTotalACH);
            }
        }
        minRequiredACHOverall = Math.max(minRequiredACHOverall, effectiveMinACH);
      }
    });
    
    if (totalVolume > 0 && calcResults.totalACH < minRequiredACHOverall && minRequiredACHOverall > 0) { // Added check for minRequiredACHOverall > 0
      issues.push(`Achieved Air Change Rate (${calcResults.totalACH.toFixed(1)} ACH) is below minimum requirement of ${minRequiredACHOverall.toFixed(1)} ACH for at least one space type.`);
    }
    
    const totalOccupants = spaces.reduce((sum, space) => sum + space.occupants, 0);
    if (totalOccupants > 0) {
      const freshAirPerPerson_m3h = calcResults.requiredFreshAirflow / totalOccupants;
      if (freshAirPerPerson_m3h < 36) { // 10 l/s/person = 36 m³/h/person
        issues.push(`Fresh air per person (${freshAirPerPerson_m3h.toFixed(1)} m³/h) is below CIBSE minimum of 36 m³/h (10 l/s/person).`);
      }
    }
    
    if (calcResults.requiredTotalAirflow > 10000 && !includeHeatRecovery) {
      issues.push('Heat recovery should be considered for systems > 10,000 m³/h per CIBSE guidance.');
    }
    
    return { compliant: issues.length === 0, issues };
  };

  const calculateResults = () => {
    const errors: string[] = [];
    setValidationErrors([]); 

    spaces.forEach((space, index) => {
      if (space.area <= 0) errors.push(`Space ${index + 1}: Area must be positive`);
      if (space.height <= 0) errors.push(`Space ${index + 1}: Height must be positive`);
      if (space.occupants < 0) errors.push(`Space ${index + 1}: Occupants cannot be negative`);
      if (space.coolingLoadMethod === 'manual' && space.manualCoolingLoad < 0) {
        errors.push(`Space ${index + 1}: Manual cooling load cannot be negative`);
      }
      // Validation for custom ACH inputs remains tied to 'custom' space type if that's the UI logic
      if (space.spaceType === 'custom') {
        if (space.minimumTotalACH !== null && space.minimumTotalACH < 0) errors.push(`Space ${index + 1}: Minimum Total ACH cannot be negative`);
        if (space.minimumFreshACH !== null && space.minimumFreshACH < 0) errors.push(`Space ${index + 1}: Minimum Fresh ACH cannot be negative`);
      }
    });
    
    if (safetyFactor < 1) errors.push('Safety factor must be at least 1.0');
    if (externalConditions.wetBulb > externalConditions.dryBulb) errors.push('External Wet Bulb Temp cannot exceed Dry Bulb Temp.');

    if (errors.length > 0) {
      setIsValid(false);
      setValidationErrors(errors);
      setShowResults(false);
      return;
    }
    
    setIsValid(true); 
    
    const rawCoolingLoadW = calculateTotalCoolingLoad();
    const rawHeatingLoadW = calculateTotalHeatingLoad();

    if (isNaN(rawCoolingLoadW) || isNaN(rawHeatingLoadW)) {
        setIsValid(false);
        setShowResults(false);
        // Add to validation errors if not already caught by psychrometric helper logs
        if (validationErrors.filter(e => e.includes("psychrometric")).length === 0) {
            setValidationErrors(prev => [...prev, "Calculation failed due to invalid psychrometric conditions."]);
        }
        return;
    }

    const coolingCapacityKW = (rawCoolingLoadW * safetyFactor) / 1000;
    const heatingCapacityKW = (rawHeatingLoadW * safetyFactor) / 1000;
    
    const requiredFreshAirflow_m3h = calculateRequiredFreshAir();
    const requiredTotalAirflow_m3h = calculateRequiredTotalAirflow(rawCoolingLoadW); 

    if (isNaN(requiredTotalAirflow_m3h)) {
        setIsValid(false);
        setShowResults(false);
         if (validationErrors.filter(e => e.includes("psychrometric")).length === 0 && validationErrors.filter(e => e.includes("airflow")).length === 0) {
            setValidationErrors(prev => [...prev, "Airflow calculation failed."]);
        }
        return;
    }

    const recirculationAirflow_m3h = Math.max(0, requiredTotalAirflow_m3h - requiredFreshAirflow_m3h);
    const fanPowerKW = calculateFanPower(requiredTotalAirflow_m3h);
    const co2ConcentrationPPM = calculateCO2Concentration(requiredFreshAirflow_m3h);
    const { dehumidification: dehumCap_kgh, humidification: humCap_kgh } = calculateHumidityControl(requiredTotalAirflow_m3h);

    if (isNaN(dehumCap_kgh) || isNaN(humCap_kgh)) {
        setIsValid(false);
        setShowResults(false);
        if (validationErrors.filter(e => e.includes("psychrometric")).length === 0 && validationErrors.filter(e => e.includes("humidity control")).length === 0) {
            setValidationErrors(prev => [...prev, "Humidity control calculation failed."]);
        }
        return;
    }

    const recommendedFilterClassStr = determineFilterClass();
    const ahuSizeStr = estimateAHUSize(requiredTotalAirflow_m3h);
    const specificFanPowerVal = sfpTarget; 
    
    const totalVolumeVal = calculateTotalVolume();
    const totalACHVal = totalVolumeVal > 0 ? requiredTotalAirflow_m3h / totalVolumeVal : 0;
    
    let totalArea = 0;
    let weightedEffectiveness = 0;
    spaces.forEach(space => {
      totalArea += space.area;
      weightedEffectiveness += space.area * (ventilationEfficiencies[space.ventilationStrategy] || 0.8);
    });
    const ventilationEffectivenessVal = totalArea > 0 ? weightedEffectiveness / totalArea : 0.8; 
    
    const currentResults: CalculationResults = {
      requiredTotalAirflow: requiredTotalAirflow_m3h,
      requiredFreshAirflow: requiredFreshAirflow_m3h,
      recirculationAirflow: recirculationAirflow_m3h,
      coolingCapacity: coolingCapacityKW,
      heatingCapacity: heatingCapacityKW,
      humidificationCapacity: humCap_kgh,
      dehumidificationCapacity: dehumCap_kgh,
      fanPower: fanPowerKW,
      recommendedFilterClass: recommendedFilterClassStr,
      ahuSize: ahuSizeStr,
      specificFanPower: specificFanPowerVal,
      totalACH: totalACHVal,
      co2Concentration: co2ConcentrationPPM,
      ventilationEffectiveness: ventilationEffectivenessVal
    };
    
    const complianceCheck = checkCIBSECompliance(currentResults);
    
    setResults(currentResults);
    setIsCIBSECompliant(complianceCheck.compliant);
    setComplianceIssues(complianceCheck.issues);
    setShowResults(true);
    setIsValid(true); 
  };

  // Get a space type by ID
  const getSpaceType = (id: string): SpaceType | undefined => {
    return spaceTypes.find(type => type.id === id);
  };

  // Get activity level by ID
  const getActivityLevel = (id: string): any => {
    return activityLevels.find(level => level.id === id);
  };

  // Get insulation level by ID
  const getInsulationLevel = (id: string): any => {
    return insulationLevels.find(level => level.id === id);
  };

  // Format ventilation strategy for display
  const formatVentilationStrategy = (strategy: VentilationStrategy): string => {
    switch(strategy) {
      case 'mixing': return 'Mixing Ventilation';
      case 'displacement': return 'Displacement Ventilation';
      case 'underfloor': return 'Underfloor Air Distribution';
      case 'naturalVent': return 'Natural Ventilation';
      default: return strategy;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Air Handling Unit Sizing Calculator</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          {/* System Parameters */}
          <div className="mb-6">
            <h3 className="font-medium text-lg mb-4 text-gray-700">System Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Efficiency (%)</label>
                <input 
                  type="number" 
                  value={systemEfficiency * 100} 
                  onChange={(e) => setSystemEfficiency(Number(e.target.value) / 100)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fan Efficiency (%)</label>
                <input 
                  type="number" 
                  value={fanEfficiency * 100} 
                  onChange={(e) => setFanEfficiency(Number(e.target.value) / 100)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specific Fan Power Target (W/(l/s))</label>
                <input 
                  type="number" 
                  value={sfpTarget} 
                  onChange={(e) => setSfpTarget(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Safety Factor</label>
                <input 
                  type="number" 
                  value={safetyFactor} 
                  onChange={(e) => setSafetyFactor(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  step="0.05"
                />
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="co2Control" 
                  checked={includeCO2Control} 
                  onChange={(e) => setIncludeCO2Control(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="co2Control" className="ml-2 block text-sm text-gray-700">CO2 Control</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="economizer" 
                  checked={includeEconomizer} 
                  onChange={(e) => setIncludeEconomizer(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="economizer" className="ml-2 block text-sm text-gray-700">Economizer</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="variableFlow" 
                  checked={includeVariableFlow} 
                  onChange={(e) => setIncludeVariableFlow(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="variableFlow" className="ml-2 block text-sm text-gray-700">Variable Flow</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="heatRecovery" 
                  checked={includeHeatRecovery} 
                  onChange={(e) => setIncludeHeatRecovery(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="heatRecovery" className="ml-2 block text-sm text-gray-700">Heat Recovery</label>
              </div>
            </div>
            
            {includeHeatRecovery && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Heat Recovery Efficiency (%)</label>
                <input 
                  type="number" 
                  value={heatRecoveryEfficiency} 
                  onChange={(e) => setHeatRecoveryEfficiency(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="95"
                />
              </div>
            )}
          </div>

          {/* External Conditions */}
          <div className="mb-6">
            <h3 className="font-medium text-lg mb-4 text-gray-700">External Design Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dry Bulb Temperature (°C)</label>
                <input 
                  type="number" 
                  value={externalConditions.dryBulb} 
                  onChange={(e) => updateExternalConditions({ dryBulb: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wet Bulb Temperature (°C)</label>
                <input 
                  type="number" 
                  value={externalConditions.wetBulb} 
                  onChange={(e) => updateExternalConditions({ wetBulb: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Altitude (m)</label>
                <input 
                  type="number" 
                  value={externalConditions.altitude} 
                  onChange={(e) => updateExternalConditions({ altitude: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Internal Design Conditions */}
          <div className="mb-6">
            <h3 className="font-medium text-lg mb-4 text-gray-700">Internal Design Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dry Bulb Temperature (°C)</label>
                <input 
                  type="number" 
                  value={internalConditions.dryBulb} 
                  onChange={(e) => updateInternalConditions({ dryBulb: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relative Humidity (%)</label>
                <input 
                  type="number" 
                  value={internalConditions.relHumidity} 
                  onChange={(e) => updateInternalConditions({ relHumidity: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Noise Limit (dB(A))</label>
                <input 
                  type="number" 
                  value={internalConditions.noiseLimit} 
                  onChange={(e) => updateInternalConditions({ noiseLimit: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fresh Air Boost (%)</label>
                <input 
                  type="number" 
                  value={internalConditions.freshAirBoost} 
                  onChange={(e) => updateInternalConditions({ freshAirBoost: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Additional percentage above minimum requirement</p>
              </div>
            </div>
          </div>

          {/* Space Parameters */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">Space Parameters</h3>
              <button 
                onClick={addSpace} 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Space
              </button>
            </div>
            
            {spaces.map((space, index) => (
              <div key={space.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Space {index + 1}: {space.name}</h4>
                  {spaces.length > 1 && (
                    <button 
                      onClick={() => removeSpace(space.id)} 
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space Name</label>
                    <input 
                      type="text" 
                      value={space.name} 
                      onChange={(e) => updateSpace(space.id, { name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Floor Area (m²)</label>
                    <input 
                      type="number" 
                      value={space.area} 
                      onChange={(e) => updateSpace(space.id, { area: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ceiling Height (m)</label>
                    <input 
                      type="number" 
                      value={space.height} 
                      onChange={(e) => updateSpace(space.id, { height: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space Type</label>
                    <select 
                      value={space.spaceType} 
                      onChange={(e) => updateSpace(space.id, { spaceType: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(spaceTypes.reduce((acc: {[key: string]: SpaceType[]}, curr) => {
                        (acc[curr.category] = acc[curr.category] || []).push(curr);
                        return acc;
                      }, {})).map(([category, types]) => (
                        <optgroup key={category} label={category}>
                          {(types as SpaceType[]).map(type => (
                            <option key={type.id} value={type.id}>
                              {type.name} (Min ACH: {type.minTotalACH})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {getSpaceType(space.spaceType)?.description || ''}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupants</label>
                    <input 
                      type="number" 
                      value={space.occupants} 
                      onChange={(e) => updateSpace(space.id, { occupants: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Occupant Density: {(space.area > 0 ? space.occupants / space.area : 0).toFixed(2)} people/m²
                    </p>
                  </div>
                </div>

                {/* Cooling Load Calculation & Internal Heat Gain */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                   <div className={space.coolingLoadMethod !== 'calculated' ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cooling Load Calculation</label>
                    <select 
                      value={space.coolingLoadMethod} 
                      onChange={(e) => updateSpace(space.id, { coolingLoadMethod: e.target.value as CoolingLoadMethod })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="calculated">Calculated from Parameters</option>
                      <option value="standard">Standard Values (by Space Type)</option>
                      <option value="manual">Manual Input</option>
                    </select>
                  </div>
                  {space.coolingLoadMethod === 'calculated' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Internal Heat Gain (W/m²)</label>
                      <input 
                        type="number" 
                        value={space.internalGain} 
                        onChange={(e) => updateSpace(space.id, { internalGain: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Includes lighting, equipment, etc.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Activity Level & Ventilation Strategy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {space.coolingLoadMethod === 'calculated' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
                      <select 
                        value={space.activityLevel} 
                        onChange={(e) => updateSpace(space.id, { activityLevel: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {activityLevels.map(level => (
                          <option key={level.id} value={level.id}>
                            {level.name} ({level.metabolicGain} W/person)
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {getActivityLevel(space.activityLevel)?.description || ''}
                      </p>
                    </div>
                  )}
                  <div className={space.coolingLoadMethod !== 'calculated' ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ventilation Strategy</label>
                    <select 
                      value={space.ventilationStrategy} 
                      onChange={(e) => updateSpace(space.id, { ventilationStrategy: e.target.value as VentilationStrategy })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="mixing">Mixing Ventilation</option>
                      <option value="displacement">Displacement Ventilation</option>
                      <option value="underfloor">Underfloor Air Distribution</option>
                      <option value="naturalVent">Natural Ventilation</option>
                    </select>
                  </div>
                </div>

                {/* Minimum ACH Inputs - Conditionally shown */}
                {space.spaceType === 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Total ACH (optional)</label>
                            <input 
                                type="number"
                                value={space.minimumTotalACH === null ? '' : space.minimumTotalACH}
                                onChange={(e) => updateSpace(space.id, { minimumTotalACH: e.target.value === '' ? null : Number(e.target.value) })}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.1"
                                placeholder="e.g., 7.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Will use higher of this value or space type default ({getSpaceType(space.spaceType)?.minTotalACH || 0} ACH).
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Fresh ACH (optional)</label>
                            <input 
                                type="number"
                                value={space.minimumFreshACH === null ? '' : space.minimumFreshACH}
                                onChange={(e) => updateSpace(space.id, { minimumFreshACH: e.target.value === '' ? null : Number(e.target.value) })}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.1"
                                placeholder="e.g., 1.5"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Will use higher of this value or space type default ({getSpaceType(space.spaceType)?.minFreshACH || 0} ACH).
                            </p>
                        </div>
                    </div>
                )}
                
                {space.coolingLoadMethod === 'manual' && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manual Cooling Load (W)</label>
                    <input 
                      type="number" 
                      value={space.manualCoolingLoad} 
                      onChange={(e) => updateSpace(space.id, { manualCoolingLoad: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                )}
                
                {space.coolingLoadMethod === 'calculated' && (
                  <>
                    <div className="mb-1 mt-3 text-sm font-medium text-gray-700">Additional Parameters for Cooling Load</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Solar Gain (W/m²)</label>
                        <input 
                          type="number" 
                          value={space.solarGain} 
                          onChange={(e) => updateSpace(space.id, { solarGain: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Facade Orientation</label>
                        <select 
                          value={space.orientation} 
                          onChange={(e) => updateSpace(space.id, { orientation: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="north">North</option>
                          <option value="east">East</option>
                          <option value="south">South</option>
                          <option value="west">West</option>
                          <option value="northeast">Northeast</option>
                          <option value="southeast">Southeast</option>
                          <option value="southwest">Southwest</option>
                          <option value="northwest">Northwest</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Glazing Percentage (%)</label>
                        <input 
                          type="number" 
                          value={space.glazingPercentage} 
                          onChange={(e) => updateSpace(space.id, { glazingPercentage: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Insulation Level</label>
                        <select 
                          value={space.insulationLevel} 
                          onChange={(e) => updateSpace(space.id, { insulationLevel: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {insulationLevels.map(level => (
                            <option key={level.id} value={level.id}>
                              {level.name} (U-value: {level.uValue} W/m²K)
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {getInsulationLevel(space.insulationLevel)?.description || ''}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            <div className="flex justify-center mt-6">
              <button 
                onClick={calculateResults} 
                className="bg-blue-600 text-white px-6 py-3 rounded-md text-base font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md flex items-center"
              >
                <Icons.Calculator className="mr-2" /> Calculate AHU Requirements
              </button>
            </div>
            
            {!isValid && validationErrors.length > 0 && (
              <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-700 mb-1">Please correct the following errors:</h4>
                <ul className="list-disc text-sm text-red-600 pl-5">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">AHU Sizing Results</h3>
          
          {!showResults ? (
            <div className="bg-white p-6 rounded-md shadow text-center">
              <p className="text-gray-600">Enter your parameters and click 'Calculate' to see AHU sizing results</p>
            </div>
          ) : !isValid || !results ? ( 
             <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-700 mb-1">Calculation Error:</h4>
                <p className="text-sm text-red-600">Could not complete calculations due to input errors or invalid conditions. Please review inputs and try again.</p>
                {validationErrors.length > 0 && (
                  <ul className="list-disc text-sm text-red-600 pl-5 mt-2">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <h4 className="font-medium text-base text-gray-700 mb-3">Airflow Requirements</h4>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Total Supply Airflow:</p>
                      <p className="font-bold text-lg text-blue-600">{results.requiredTotalAirflow.toFixed(0)} m³/h</p>
                      <p className="text-xs text-gray-500">({(results.requiredTotalAirflow / 3.6).toFixed(0)} l/s)</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Fresh Air Requirement:</p>
                      <p className="font-semibold text-gray-800">{results.requiredFreshAirflow.toFixed(0)} m³/h</p>
                      <p className="text-xs text-gray-500">({(results.requiredFreshAirflow / 3.6).toFixed(0)} l/s)</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Recirculation Airflow:</p>
                      <p className="font-semibold text-gray-800">{results.recirculationAirflow.toFixed(0)} m³/h</p>
                      <p className="text-xs text-gray-500">({(results.recirculationAirflow / 3.6).toFixed(0)} l/s)</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Air Change Rate:</p>
                      <p className="font-semibold text-gray-800">{results.totalACH.toFixed(1)} ACH</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Fresh Air per Person:</p>
                      <p className="font-semibold text-gray-800">
                        {(spaces.reduce((sum, space) => sum + space.occupants, 0) > 0 ? 
                          (results.requiredFreshAirflow / spaces.reduce((sum, space) => sum + space.occupants, 0)) : 
                          0).toFixed(1)} m³/h/person
                      </p>
                      <p className="text-xs text-gray-500">
                        ({(spaces.reduce((sum, space) => sum + space.occupants, 0) > 0 ?
                           (results.requiredFreshAirflow / spaces.reduce((sum, space) => sum + space.occupants, 0) / 3.6) : 
                           0).toFixed(1)} l/s/person)
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-base text-gray-700 mb-3">System Capacities</h4>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Cooling Capacity:</p>
                      <p className="font-bold text-lg text-blue-600">{results.coolingCapacity.toFixed(1)} kW</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Heating Capacity:</p>
                      <p className="font-semibold text-gray-800">{results.heatingCapacity.toFixed(1)} kW</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Dehumidification Capacity:</p>
                      <p className="font-semibold text-gray-800">{results.dehumidificationCapacity.toFixed(1)} kg/h</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Humidification Capacity:</p>
                      <p className="font-semibold text-gray-800">{results.humidificationCapacity.toFixed(1)} kg/h</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Fan Power:</p>
                      <p className="font-semibold text-gray-800">{results.fanPower.toFixed(2)} kW</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className={`rounded-md p-3 ${isCIBSECompliant ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                    <p className={`text-sm font-medium ${isCIBSECompliant ? 'text-green-800' : 'text-red-800'}`}>
                      {isCIBSECompliant 
                        ? 'CIBSE Compliance: System generally meets CIBSE recommendations based on inputs.'
                        : 'CIBSE Compliance: System may not meet all CIBSE recommendations. See issues below.'}
                    </p>
                    
                    {!isCIBSECompliant && complianceIssues.length > 0 && (
                      <ul className="mt-2 text-xs text-red-700 list-disc pl-5">
                        {complianceIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-md shadow border border-gray-200">
                  <h4 className="font-medium text-base text-gray-700 mb-3">AHU Specifications</h4>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Recommended AHU Size:</p>
                    <p className="font-semibold text-gray-800">{results.ahuSize}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Recommended Filter Class:</p>
                    <p className="font-semibold text-gray-800">{results.recommendedFilterClass}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Specific Fan Power:</p>
                    <p className="font-semibold text-gray-800">{results.specificFanPower.toFixed(2)} W/(l/s)</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Expected CO₂ Concentration:</p>
                    <p className={`font-semibold ${results.co2Concentration > 1000 ? 'text-orange-600' : 'text-gray-800'}`}>
                      {results.co2Concentration.toFixed(0)} ppm 
                      {results.co2Concentration > 1000 ? ' (Above CIBSE recommendation)' : ''}
                    </p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Ventilation Effectiveness:</p>
                    <p className="font-semibold text-gray-800">{results.ventilationEffectiveness.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-md shadow border border-gray-200">
                  <h4 className="font-medium text-base text-gray-700 mb-3">System Summary</h4>
                  <div className="mb-1 text-gray-700">
                    <span className="text-sm font-semibold">System Type:</span> 
                    <span className="text-sm ml-2">
                      {includeVariableFlow ? 'Variable Air Volume (VAV)' : 'Constant Air Volume (CAV)'}
                    </span>
                  </div>
                  <div className="mb-1 text-gray-700">
                    <span className="text-sm font-semibold">Fresh Air Control:</span> 
                    <span className="text-sm ml-2">
                      {includeEconomizer ? 'Economizer' : 'Fixed Minimum'}{includeCO2Control ? ' with CO₂ Control' : ''}
                    </span>
                  </div>
                  <div className="mb-1 text-gray-700">
                    <span className="text-sm font-semibold">Heat Recovery:</span> 
                    <span className="text-sm ml-2">
                      {includeHeatRecovery ? `Yes (${heatRecoveryEfficiency}% efficiency)` : 'None'}
                    </span>
                  </div>
                  <div className="mt-2"><p className="text-sm text-gray-600">External Design Conditions:</p><p className="font-semibold text-gray-800">{externalConditions.dryBulb}°C DB / {externalConditions.wetBulb}°C WB</p></div>
                  <div className="mt-2"><p className="text-sm text-gray-600">Internal Design:</p><p className="font-semibold text-gray-800">{internalConditions.dryBulb}°C / {internalConditions.relHumidity}% RH</p></div>
                  <div className="mb-1 text-gray-700">
                    <span className="text-sm font-semibold">Psychrometric Properties:</span> 
                    <span className="text-sm ml-2">
                      {(() => {
                        const atmosphericPressure = 101325 * Math.exp(-0.00012 * externalConditions.altitude);
                        const outsideRH = calculateRelHumidityFromWetBulb(
                          externalConditions.dryBulb, 
                          externalConditions.wetBulb, 
                          atmosphericPressure
                        );
                        return `Outside RH: ${isNaN(outsideRH) ? 'N/A' : outsideRH.toFixed(1)}%`;
                      })()}
                    </span>
                  </div>
                  <div className="mb-1 text-gray-700">
                    <span className="text-sm font-semibold">Spaces:</span> 
                    <span className="text-sm ml-2">
                      {spaces.length} space(s), {calculateTotalVolume().toFixed(1)} m³ total volume
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
                <h4 className="font-medium mb-2 text-blue-700">AHU Selection Guidance</h4>
                <p className="text-sm text-blue-800">The selected Air Handling Unit should be capable of providing:</p>
                <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
                  <li>Supply Air Flow: <strong className="text-blue-900">{results.requiredTotalAirflow.toFixed(0)} m³/h</strong></li>
                  <li>Fresh Air Flow: <strong className="text-blue-900">{results.requiredFreshAirflow.toFixed(0)} m³/h</strong></li>
                  <li>Cooling Capacity: <strong className="text-blue-900">{results.coolingCapacity.toFixed(1)} kW</strong></li>
                  <li>Heating Capacity: <strong className="text-blue-900">{results.heatingCapacity.toFixed(1)} kW</strong></li>
                  <li>Fan Motor Power: <strong className="text-blue-900">{results.fanPower.toFixed(2)} kW</strong> with SFP ≤ {results.specificFanPower.toFixed(2)} W/(l/s)</li>
                  <li>Filtration: <strong className="text-blue-900">{results.recommendedFilterClass}</strong></li>
                  {results.dehumidificationCapacity > 1 && !isNaN(results.dehumidificationCapacity) && (
                    <li>Dehumidification Capacity: <strong className="text-blue-900">{results.dehumidificationCapacity.toFixed(1)} kg/h</strong></li>
                  )}
                  {results.humidificationCapacity > 1 && !isNaN(results.humidificationCapacity) && (
                    <li>Humidification Capacity: <strong className="text-blue-900">{results.humidificationCapacity.toFixed(1)} kg/h</strong></li>
                  )}
                </ul>
                <p className="text-xs mt-2 text-blue-700">
                  Note: This sizing is based on CIBSE guidance. Always consult with HVAC engineers and equipment manufacturers for detailed selection.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">CIBSE Guidelines & Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Air change rates are based on CIBSE Guide A (Environmental Design) and Guide B (Heating, Ventilating, Air Conditioning and Refrigeration).</li>
          <li>Fresh air requirement should be at least 10 l/s per person for good indoor air quality (CIBSE).</li>
          <li>CO₂ concentration should be maintained below 1000 ppm for optimal occupant comfort and cognitive function.</li>
          <li>Specific Fan Power (SFP) should not exceed 2.0 W/(l/s) for best efficiency (CIBSE and Building Regulations Part L).</li>
          <li>Heat recovery is recommended for systems with airflow rates  10,000 m³/h to improve energy efficiency.</li>
          <li>Filter selection should follow BS EN ISO 16890 standards, with ePM1 class filters recommended for most applications.</li>
          <li>Ventilation effectiveness varies by air distribution strategy: displacement (1.2)  underfloor (1.1)  mixing (0.8)  natural (0.7). Higher effectiveness reduces required airflow.</li>
          <li>Design indoor temperature typically ranges from 21-24°C with 40-60% RH for comfort (CIBSE Guide A).</li>
          <li>Supply air is typically 8-12°C below room temperature for cooling, providing dehumidification as needed.</li>
          <li>Safety factors of 10-30% are commonly applied to account for uncertainties in load calculations and future changes.</li>
          <li>Economizers are recommended to take advantage of free cooling when outdoor conditions are favorable.</li>
          <li>Variable Air Volume (VAV) systems can reduce energy consumption by up to 30% compared to Constant Air Volume (CAV) systems.</li>
          <li>Psychrometric calculations provide accurate determination of air properties and cooling/heating loads.</li>
          <li>Minimum ACH values can be specified to ensure adequate ventilation where specific requirements exist (e.g., for specialized facilities).</li>
        </ul>
      </div>
    </div>
  );
};

export default AHUSizingCalculator;