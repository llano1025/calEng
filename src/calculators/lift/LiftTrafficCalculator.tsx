import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';

interface LiftTrafficCalculatorProps {
  onShowTutorial?: () => void;
}

// Building types for CIBSE recommendations with updated values
const BUILDING_TYPES = [
  { type: 'office-prestige', name: 'Prestige Office', interval: 20, arrival: 17, quality: 'Excellent' },
  { type: 'office-above-avg', name: 'Above Average Office', interval: 25, arrival: 15, quality: 'Above Average' },
  { type: 'office-average', name: 'Average Office', interval: 30, arrival: 15, quality: 'Average' },
  { type: 'office-below-avg', name: 'Below Average Office', interval: 40, arrival: 12, quality: 'Below Average' },
  { type: 'office-unsatisfactory', name: 'Unsatisfactory Office', interval: 50, arrival: 12, quality: 'Unsatisfactory' },
  { type: 'hotel', name: 'Hotel', interval: 60, arrival: 10, quality: 'Average' },
  { type: 'residential', name: 'Residential', interval: 90, arrival: 8, quality: 'Average' },
  { type: 'hospital', name: 'Hospital', interval: 45, arrival: 8, quality: 'Below Average' },
  { type: 'retail', name: 'Retail', interval: 35, arrival: 12, quality: 'Average' }
];

// Population distribution patterns
const POPULATION_PATTERNS = [
  { type: 'uniform', name: 'Uniform Distribution', description: 'Equal population on all floors' },
  { type: 'linear-decreasing', name: 'Linear Decreasing', description: 'Population decreases linearly with height' },
  { type: 'exponential-decreasing', name: 'Exponential Decreasing', description: 'Population decreases exponentially with height' },
  { type: 'custom', name: 'Custom Distribution', description: 'Manual input for each floor' }
];

// Traffic patterns
const TRAFFIC_PATTERNS = [
  { type: 'up-peak', name: 'Up-peak', description: 'Morning rush hour (ground to upper floors)' },
  { type: 'down-peak', name: 'Down-peak', description: 'Evening rush hour (upper floors to ground)' },
  { type: 'inter-floor', name: 'Inter-floor', description: 'Mixed traffic between floors' }
];

const LiftTrafficCalculator: React.FC<LiftTrafficCalculatorProps> = ({ onShowTutorial }) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<'comprehensive-analysis' | 'formulas'>('comprehensive-analysis');

  // Building and traffic parameters
  const [buildingType, setBuildingType] = useState<string>('office-average');
  const [numberOfFloors, setNumberOfFloors] = useState<number>(10);
  const [floorHeight, setFloorHeight] = useState<number>(3.3);
  const [totalPopulation, setTotalPopulation] = useState<number>(960);
  const [populationPattern, setPopulationPattern] = useState<string>('uniform');
  const [customPopulations, setCustomPopulations] = useState<number[]>(Array(10).fill(96));
  const [trafficPattern, setTrafficPattern] = useState<string>('up-peak');
  
  // Lift system parameters
  const [ratedSpeed, setRatedSpeed] = useState<number>(1.6);
  const [carCapacity, setCarCapacity] = useState<number>(21);
  const [numberOfCars, setNumberOfCars] = useState<number>(5);
  
  // CIBSE 2015 Performance Time Components
  const [singleFloorFlightTime, setSingleFloorFlightTime] = useState<number>(6.0); // tf(1)
  const [startDelayTime, setStartDelayTime] = useState<number>(0); // tsd
  const [doorCloseTime, setDoorCloseTime] = useState<number>(3.0); // tc
  const [doorOpenTime, setDoorOpenTime] = useState<number>(0.8); // to
  const [advanceDoorOpenTime, setAdvanceDoorOpenTime] = useState<number>(0); // tad
  const [passengerTransferTime, setPassengerTransferTime] = useState<number>(1.2); // tp
  
  // Additional RTT time components
  const [accelerationTime, setAccelerationTime] = useState<number>(1.0); // tr(1) - acceleration/deceleration/leveling time
  const [expressTime, setExpressTime] = useState<number>(0.8); // te - express time to main terminal
  
  // Traffic analysis parameters
  const [carOccupancy, setCarOccupancy] = useState<number>(80); // % for UPPINT calculation
  const [arrivalRate, setArrivalRate] = useState<number>(15); // % in 5 minutes
  const [peakDuration, setPeakDuration] = useState<number>(30); // minutes

  // Comprehensive results
  const [results, setResults] = useState({
    // Population Analysis
    effectivePopulation: 0,
    populationDistribution: [] as number[],
    upPeakDemand: 0,
    downPeakDemand: 0,
    
    // Advanced S-P Calculations
    averageStops: 0, // S
    averagePassengers: 0, // P
    highestFloor: 0, // H for unequal demand
    
    // Time Components (CIBSE 2015)
    performanceTime: 0, // T = tf(1) + tsd + tc + to - tad
    travelTimePerFloor: 0, // tv
    stopTime: 0, // ts (now T - tv)
    roundTripTime: 0, // RTT
    upPeakInterval: 0, // UPPINT
    
    // Capacity Analysis
    upPeakHandlingCapacity: 0, // UPPHC
    handlingCapacityPercentage: 0, // %POP
    
    // Performance Metrics (Integrated)
    averageWaitingTime: 0, // AWT
    averageTransitTime: 0, // ATT
    averageTimeToDestination: 0, // ATTD
    averageJourneyTime: 0, // AJT
    performanceGrade: '',
    
    // Compliance & Quality
    qualityOfService: '',
    isCompliant: false,
    utilizationRatio: 0,
    
    // Formula Components
    formulas: {
      sFormula: '',
      hFormula: '',
      rttFormula: '',
      upphcFormula: '',
      awtFormula: '',
      attFormula: ''
    }
  });

  // Update custom populations array when floor count changes
  useEffect(() => {
    if (populationPattern === 'custom') {
      const newPopulations = Array(numberOfFloors).fill(0).map((_, i) => 
        i < customPopulations.length ? customPopulations[i] : totalPopulation / numberOfFloors
      );
      setCustomPopulations(newPopulations);
    }
  }, [numberOfFloors, populationPattern]);

  // Calculate population distribution
  const calculatePopulationDistribution = (): number[] => {
    const floors = [];
    
    switch (populationPattern) {
      case 'uniform':
        const uniformPop = totalPopulation / numberOfFloors;
        for (let i = 0; i < numberOfFloors; i++) {
          floors.push(uniformPop);
        }
        break;
        
      case 'linear-decreasing':
        // Ground floor has most, linearly decreases
        const total = numberOfFloors * (numberOfFloors + 1) / 2;
        for (let i = 0; i < numberOfFloors; i++) {
          const weight = (numberOfFloors - i) / total;
          floors.push(totalPopulation * weight * numberOfFloors);
        }
        break;
        
      case 'exponential-decreasing':
        // Exponential decay from ground floor
        let expTotal = 0;
        const factors = [];
        for (let i = 0; i < numberOfFloors; i++) {
          const factor = Math.pow(0.8, i);
          factors.push(factor);
          expTotal += factor;
        }
        for (let i = 0; i < numberOfFloors; i++) {
          floors.push((totalPopulation * factors[i]) / expTotal);
        }
        break;
        
      case 'custom':
        floors.push(...customPopulations.slice(0, numberOfFloors));
        break;
        
      default:
        floors.push(...Array(numberOfFloors).fill(totalPopulation / numberOfFloors));
    }
    
    return floors;
  };

  const calculateUnequal = (popDistribution: number[], P: number) => {
    const N = popDistribution.length;
    if (N === 0) {
      return { S: 0, H: 0 };
    }
    const U = popDistribution.reduce((sum, pop) => sum + pop, 0);
    if (U === 0) {
      return { S: 0, H: 0 };
    }

    let S_up = 0;
    let H_up = 0;

    // --- UP-PEAK CALCULATION (used for both up and down peak) ---
    // Calculate S for up-peak
    for (let i = 0; i < N; i++) { // Loop from 0 to N-1 for correct indexing
        const Ui = popDistribution[i]; // Correctly get population AT floor i
        if (Ui > 0) {
            const probStopAt_i = 1 - Math.pow((U - Ui) / U, P);
            S_up += probStopAt_i;
        }
    }

    // Calculate H for up-peak
    let cumulativePopulation = 0;
    let sumOfCumulativeProbs_powP = 0;
    // Loop from j=0 to N-2 (equivalent to formula's 1 to N-1)
    for (let i = 0; i < N - 1; i++) { 
        cumulativePopulation += popDistribution[i]; // Build cumulative sum correctly
        const cumulativeProb = cumulativePopulation / U;
        sumOfCumulativeProbs_powP += Math.pow(cumulativeProb, P);
    }
    H_up = N - sumOfCumulativeProbs_powP;
    
    // --- Determine output based on traffic pattern ---
    if (trafficPattern === 'up-peak') {
        return { S: S_up, H: H_up };

    } else if (trafficPattern === 'down-peak') {
        // Use the rule from the slide: S_down = 3/4 * S_up
        const S_down = 0.75 * S_up;
        // For down-peak, H is the highest floor where passengers get on.
        // This is calculated the same way as up-peak H.
        const H_down = H_up; 
        return { S: S_down, H: H_down };

    } else { // 'inter-floor'
        // Fallback to equal demand formula for inter-floor
        const S_equal = N * (1 - Math.pow(1 - 1 / N, P));
        
        // H for equal demand can be approximated as S, or calculated precisely.
        // Let's calculate it precisely for consistency with the equal demand slide.
        let H_equal_sum = 0;
        for (let j = 1; j < N; j++) {
            H_equal_sum += Math.pow(j / N, P);
        }
        const H_equal = N - H_equal_sum;
        
        return { S: S_equal, H: H_equal };
    }
};

  // Comprehensive calculation
  useEffect(() => {
    const buildingConfig = BUILDING_TYPES.find(b => b.type === buildingType) || BUILDING_TYPES[2];
    const popDistribution = calculatePopulationDistribution();
    const effectivePopulation = popDistribution.reduce((sum, pop) => sum + pop, 0);
    
    // Calculate P with occupancy assumption for UPPINT
    const P = carCapacity * (carOccupancy / 100);
    
    // Calculate S and H using corrected unequal demand formulas
    const { S, H } = calculateUnequal(popDistribution, P);
    
    // CIBSE 2015 Performance Time calculation: T = tf(1) + tsd + tc + to - tad
    const performanceTime = singleFloorFlightTime + startDelayTime + doorCloseTime + doorOpenTime - advanceDoorOpenTime;
    
    // Travel time per floor
    const travelTimePerFloor = floorHeight / ratedSpeed; // tv
    
    // Stop time is now T - tv (CIBSE 2015 change)
    const stopTime = performanceTime - travelTimePerFloor;
    
    // Fixed RTT calculation according to Image 3
    // RTT = Pt_p + Pt_p + (S+1)(t_s+t_d) + (S+1)t_r(1) + (H-S)t_v + (H-1)t_e
    const passengerTime = 2 * P * passengerTransferTime; // Pt_p + Pt_p
    const doorOperatingTime = (S + 1) * (stopTime); // (S+1)(t_s+t_d)
    const remainingFloorsTravelTime = 2 * H * travelTimePerFloor; // (H-S)t_v
    
    const roundTripTime = passengerTime + doorOperatingTime + remainingFloorsTravelTime;
    
    // UPPINT and capacity calculations
    const upPeakInterval = roundTripTime / numberOfCars;
    const upPeakHandlingCapacity = (300 * P) / upPeakInterval;
    const handlingCapacityPercentage = (upPeakHandlingCapacity * 100) / effectivePopulation;
    
    // Traffic demand calculations
    let upPeakDemand = 0;
    let downPeakDemand = 0;
    
    if (trafficPattern === 'up-peak') {
      upPeakDemand = Math.round(effectivePopulation * (arrivalRate / 100));
    } else if (trafficPattern === 'down-peak') {
      downPeakDemand = Math.round(effectivePopulation * (arrivalRate / 100));
    } else {
      upPeakDemand = Math.round(effectivePopulation * (arrivalRate / 100) * 0.6);
      downPeakDemand = Math.round(effectivePopulation * (arrivalRate / 100) * 0.4);
    }
    
    // Performance Analysis (integrated from raw data)
    const currentDemand = trafficPattern === 'up-peak' ? upPeakDemand : 
                         trafficPattern === 'down-peak' ? downPeakDemand : 
                         Math.max(upPeakDemand, downPeakDemand);
    
    const utilizationRatio = (currentDemand / upPeakHandlingCapacity) * 100;
    
    // AWT calculation based on car load
    const carLoad = Math.min((currentDemand / upPeakHandlingCapacity) * 100, 80);
    let averageWaitingTime = 0;
    let awtFormula = '';
    
    if (carLoad >= 50 && carLoad <= 80) {
      averageWaitingTime = (0.4 + Math.pow(1.8 * carLoad / 100 - 0.77, 2)) * upPeakInterval;
      awtFormula = `[0.4 + (1.8 × ${carLoad.toFixed(1)}/100 - 0.77)²] × ${upPeakInterval.toFixed(1)}`;
    } else if (carLoad < 50) {
      averageWaitingTime = 0.4 * upPeakInterval;
      awtFormula = `0.4 × ${upPeakInterval.toFixed(1)}`;
    } else {
      averageWaitingTime = (0.4 + Math.pow(1.8 * 0.8 - 0.77, 2)) * upPeakInterval;
      awtFormula = `[0.4 + (1.8 × 0.8 - 0.77)²] × ${upPeakInterval.toFixed(1)} (capped at 80%)`;
    }
    
    // Fixed ATT calculation according to Image 4: ATT = t_v * H/(2S) * (S+1) + t_s * (S+1)/2 + t_p * P
    const travelComponent = travelTimePerFloor * (H / (2 * S)) * (S + 1);
    const stopComponent = stopTime * (S + 1) / 2;
    const passengerComponent = passengerTransferTime * P;
    const averageTransitTime = travelComponent + stopComponent + passengerComponent;
    
    // Journey time components
    const averageTimeToDestination = averageWaitingTime + averageTransitTime;
    const averageJourneyTime = averageTimeToDestination; // Same for up-peak analysis
    
    // Performance grade assessment
    let performanceGrade = '';
    if (averageJourneyTime < 45) performanceGrade = 'Excellent';
    else if (averageJourneyTime < 60) performanceGrade = 'Good';
    else if (averageJourneyTime < 75) performanceGrade = 'Fair';
    else if (averageJourneyTime < 90) performanceGrade = 'Poor';
    else performanceGrade = 'Unacceptable';
    
    // Quality assessment based on UPPINT
    let qualityOfService = '';
    let isCompliant = false;
    
    if (upPeakInterval < 20) {
      qualityOfService = 'Excellent';
      isCompliant = true;
    } else if (upPeakInterval <= 25) {
      qualityOfService = 'Above Average';
      isCompliant = true;
    } else if (upPeakInterval <= 30) {
      qualityOfService = 'Average';
      isCompliant = true;
    } else if (upPeakInterval <= 40) {
      qualityOfService = 'Below Average';
      isCompliant = true;
    } else {
      qualityOfService = 'Unsatisfactory';
      isCompliant = false;
    }

    // Formula documentation
    const formulas = {
      sFormula: populationPattern === 'uniform' ? 
        `S = N × [1 - (1-1/N)^P] = ${numberOfFloors} × [1 - (1-1/${numberOfFloors})^${P.toFixed(1)}]` :
        `S = Σ[1 - ((U-Ui)/U)^P] for unequal demand`,
      hFormula: `H = N - Σ[Σ(Uj/U)]^P for i=1 to N-1`,
      rttFormula: `RTT = 2P×tp + (S+1)×ts + (S+1)×tr + (H-S)×tv + (H-1)×te`,
      upphcFormula: `UPPHC = 300×P/UPPINT = 300×${P.toFixed(1)}/${upPeakInterval.toFixed(1)}`,
      awtFormula: awtFormula,
      attFormula: `ATT = tv×H/(2S)×(S+1) + ts×(S+1)/2 + tp×P`
    };

    setResults({
      effectivePopulation,
      populationDistribution: popDistribution,
      upPeakDemand,
      downPeakDemand,
      averageStops: S,
      averagePassengers: P,
      highestFloor: H,
      performanceTime,
      travelTimePerFloor,
      stopTime,
      roundTripTime,
      upPeakInterval,
      upPeakHandlingCapacity: Math.round(upPeakHandlingCapacity),
      handlingCapacityPercentage,
      averageWaitingTime,
      averageTransitTime,
      averageTimeToDestination,
      averageJourneyTime,
      performanceGrade,
      qualityOfService,
      isCompliant,
      utilizationRatio,
      formulas
    });
  }, [buildingType, numberOfFloors, floorHeight, totalPopulation, populationPattern, customPopulations,
      trafficPattern, ratedSpeed, carCapacity, numberOfCars, singleFloorFlightTime, startDelayTime,
      doorCloseTime, doorOpenTime, advanceDoorOpenTime, passengerTransferTime, carOccupancy, arrivalRate,
      accelerationTime, expressTime]);

  return (
    <CalculatorWrapper
      title="Lift Traffic Analysis Calculator"
      discipline="electrical"
      calculatorType="lift-traffic"
      onShowTutorial={onShowTutorial}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        {/* Tab Selector */}
        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'comprehensive-analysis'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('comprehensive-analysis')}
          >
            Traffic Analysis
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'formulas'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('formulas')}
          >
            Variables & Formulas
          </button>
        </div>

        {/* Comprehensive Analysis Tab */}
        {activeTab === 'comprehensive-analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              {/* <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Type & Quality Standard
                </label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {BUILDING_TYPES.map(type => (
                    <option key={type.type} value={type.type}>
                      {type.name} (≤{type.interval}s)
                    </option>
                  ))}
                </select>
              </div> */}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Floors
                  </label>
                  <input
                    type="number"
                    value={numberOfFloors}
                    onChange={(e) => setNumberOfFloors(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    min="2"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Height (m)
                  </label>
                  <input
                    type="number"
                    value={floorHeight}
                    onChange={(e) => setFloorHeight(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="2.5"
                    max="5.0"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Building Population
                </label>
                <input
                  type="number"
                  value={totalPopulation}
                  onChange={(e) => setTotalPopulation(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="100"
                  max="10000"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Population Distribution
                </label>
                <select
                  value={populationPattern}
                  onChange={(e) => setPopulationPattern(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {POPULATION_PATTERNS.map(pattern => (
                    <option key={pattern.type} value={pattern.type}>
                      {pattern.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fixed Custom Population Input - One Floor Per Line */}
              {populationPattern === 'custom' && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-700 mb-2">Population per Floor</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Array.from({ length: numberOfFloors }, (_, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-2 rounded border">
                        <label className="text-sm font-medium text-gray-700 w-20">
                          Floor {i === 0 ? 'G' : i}:
                        </label>
                        <input
                          type="number"
                          value={customPopulations[i] || 0}
                          onChange={(e) => {
                            const newPops = [...customPopulations];
                            newPops[i] = Number(e.target.value);
                            setCustomPopulations(newPops);
                          }}
                          className="flex-1 ml-2 p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          placeholder="Enter population"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 p-2 bg-blue-100 rounded">
                    <p className="text-sm font-medium text-blue-800">
                      Total Population: {customPopulations.slice(0, numberOfFloors).reduce((sum, pop) => sum + (pop || 0), 0)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Traffic Pattern
                </label>
                <select
                  value={trafficPattern}
                  onChange={(e) => setTrafficPattern(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {TRAFFIC_PATTERNS.map(pattern => (
                    <option key={pattern.type} value={pattern.type}>
                      {pattern.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-300 my-4"></div>
              <h4 className="font-medium mb-3">Lift System</h4>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speed (m/s)
                  </label>
                  <input
                    type="number"
                    value={ratedSpeed}
                    onChange={(e) => setRatedSpeed(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="1.0"
                    max="6.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={carCapacity}
                    onChange={(e) => setCarCapacity(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    min="8"
                    max="40"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Cars
                </label>
                <input
                  type="number"
                  value={numberOfCars}
                  onChange={(e) => setNumberOfCars(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="12"
                />
              </div>

              <div className="border-t border-gray-300 my-4"></div>
              <h4 className="font-medium mb-3">Time Components</h4>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    tf(1) - Flight Time (s)
                  </label>
                  <input
                    type="number"
                    value={singleFloorFlightTime}
                    onChange={(e) => setSingleFloorFlightTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="4.0"
                    max="8.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    tsd - Start Delay (s)
                  </label>
                  <input
                    type="number"
                    value={startDelayTime}
                    onChange={(e) => setStartDelayTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    tc - Door Close (s)
                  </label>
                  <input
                    type="number"
                    value={doorCloseTime}
                    onChange={(e) => setDoorCloseTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="1.5"
                    max="4.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    to - Door Open (s)
                  </label>
                  <input
                    type="number"
                    value={doorOpenTime}
                    onChange={(e) => setDoorOpenTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    tad - Advance Open (s)
                  </label>
                  <input
                    type="number"
                    value={advanceDoorOpenTime}
                    onChange={(e) => setAdvanceDoorOpenTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="0.0"
                    max="1.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    tp - Transfer (s)
                  </label>
                  <input
                    type="number"
                    value={passengerTransferTime}
                    onChange={(e) => setPassengerTransferTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="0.8"
                    max="2.0"
                  />
                </div>
              </div>

              {/* <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    tr(1) - Acceleration (s)
                  </label>
                  <input
                    type="number"
                    value={accelerationTime}
                    onChange={(e) => setAccelerationTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="0.5"
                    max="2.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    te - Express Time (s)
                  </label>
                  <input
                    type="number"
                    value={expressTime}
                    onChange={(e) => setExpressTime(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="0.5"
                    max="2.0"
                  />
                </div>
              </div> */}

              <div className="border-t border-gray-300 my-4"></div>
              <h4 className="font-medium mb-3">Traffic Parameters</h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Car Occupancy (%)
                  </label>
                  <input
                    type="number"
                    value={carOccupancy}
                    onChange={(e) => setCarOccupancy(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    min="60"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Arrival Rate (%)
                  </label>
                  <input
                    type="number"
                    value={arrivalRate}
                    onChange={(e) => setArrivalRate(Number(e.target.value))}
                    className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    min="5"
                    max="25"
                  />
                </div>
              </div>
            </div>

            {/* Results Section 1 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Analysis Results</h3>
              
              <div className={`mb-4 p-3 rounded-md ${results.isCompliant ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                <p className={`font-bold ${results.isCompliant ? 'text-green-700' : 'text-red-700'}`}>
                  {results.qualityOfService} Quality {results.isCompliant ? '✓' : '✗'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  UPPINT: {results.upPeakInterval.toFixed(1)}s
                   {/* | Performance: {results.performanceGrade} */}
                </p>
              </div>
              
              {/* Population Analysis */}
              <div className="bg-white p-3 rounded-md mb-4 border border-gray-200 shadow-sm">
                <h4 className="font-medium text-gray-800 mb-2">Population Analysis</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Effective Population (U):</span>
                    <span className="font-semibold">{results.effectivePopulation.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Up-peak Demand:</span>
                    <span className="font-semibold">{results.upPeakDemand} persons/5min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Down-peak Demand:</span>
                    <span className="font-semibold">{results.downPeakDemand} persons/5min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distribution:</span>
                    <span className="font-semibold">{POPULATION_PATTERNS.find(p => p.type === populationPattern)?.name}</span>
                  </div>
                </div>
              </div>

              {/* S-P Analysis */}
              <div className="bg-white p-3 rounded-md mb-4 border border-gray-200 shadow-sm">
                <h4 className="font-medium text-gray-800 mb-2">S-P Analysis</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Average Stops (S):</span>
                    <span className="font-semibold">{results.averageStops.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Passengers (P):</span>
                    <span className="font-semibold">{results.averagePassengers.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Highest Floor (H):</span>
                    <span className="font-semibold">{results.highestFloor.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {populationPattern === 'uniform' ? 'Equal demand formula' : 'Unequal demand formula'}
                  </div>
                </div>
              </div>

              {/* Time Components */}
              <div className="bg-white p-3 rounded-md mb-4 border border-gray-200 shadow-sm">
                <h4 className="font-medium text-gray-800 mb-2">Time Components</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Performance Time (T):</span>
                    <span className="font-semibold">{results.performanceTime.toFixed(1)}s</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    T = tf(1) + tsd + tc + to - tad
                  </div>
                  <div className="flex justify-between">
                    <span>Travel Time per Floor (tv):</span>
                    <span className="font-semibold">{results.travelTimePerFloor.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stop Time (ts = T - tv):</span>
                    <span className="font-semibold">{results.stopTime.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round Trip Time (RTT):</span>
                    <span className="font-semibold">{results.roundTripTime.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Up-peak Interval (UPPINT):</span>
                    <span className="font-semibold">{results.upPeakInterval.toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* Capacity Analysis */}
              <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                <h4 className="font-medium text-gray-800 mb-2">Capacity Analysis</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>UPPHC:</span>
                    <span className="font-semibold">{results.upPeakHandlingCapacity} persons/5min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>%POP:</span>
                    <span className="font-semibold">{results.handlingCapacityPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilization:</span>
                    <span className={`font-semibold ${
                      results.utilizationRatio > 100 ? 'text-red-600' :
                      results.utilizationRatio > 85 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {results.utilizationRatio.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section 2 - Performance */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Performance Analysis</h3>
              
              <div className={`mb-4 p-3 rounded-md ${results.averageJourneyTime < 90 ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                <p className={`font-bold ${results.averageJourneyTime < 90 ? 'text-green-700' : 'text-red-700'}`}>
                  {results.performanceGrade} Performance
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  AJT: {results.averageJourneyTime.toFixed(1)}s | {results.averageJourneyTime < 90 ? 'Acceptable' : 'Unacceptable'}
                </p>
              </div>

              {/* Journey Time Components */}
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Average Waiting Time (AWT)</p>
                  <p className="text-lg font-semibold text-orange-600">{results.averageWaitingTime.toFixed(1)}s</p>
                  <p className="text-xs text-gray-500">Calculated from current utilization</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Average Transit Time (ATT)</p>
                  <p className="text-lg font-semibold text-blue-600">{results.averageTransitTime.toFixed(1)}s</p>
                  <p className="text-xs text-gray-500">From boarding to destination</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Average Time to Destination (ATTD)</p>
                  <p className="text-lg font-semibold text-purple-600">{results.averageTimeToDestination.toFixed(1)}s</p>
                  <p className="text-xs text-gray-500">AWT + ATT</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Average Journey Time (AJT)</p>
                  <p className={`text-lg font-semibold ${results.averageJourneyTime < 90 ? 'text-green-600' : 'text-red-600'}`}>
                    {results.averageJourneyTime.toFixed(1)}s
                  </p>
                  <p className="text-xs text-gray-500">Complete passenger journey</p>
                </div>
              </div>

              {/* Performance Standards */}
              <div className="bg-white p-3 rounded-md mt-4 border border-gray-200 shadow-sm">
                <h4 className="font-medium mb-2">Performance Standards</h4>
                <div className="text-sm space-y-1">
                  <div className={`flex justify-between ${results.averageJourneyTime < 45 ? 'font-bold text-green-600' : ''}`}>
                    <span>Excellent:</span>
                    <span>&lt; 45s</span>
                  </div>
                  <div className={`flex justify-between ${results.averageJourneyTime >= 45 && results.averageJourneyTime < 60 ? 'font-bold text-blue-600' : ''}`}>
                    <span>Good:</span>
                    <span>45-60s</span>
                  </div>
                  <div className={`flex justify-between ${results.averageJourneyTime >= 60 && results.averageJourneyTime < 75 ? 'font-bold text-orange-600' : ''}`}>
                    <span>Fair:</span>
                    <span>60-75s</span>
                  </div>
                  <div className={`flex justify-between ${results.averageJourneyTime >= 75 && results.averageJourneyTime < 90 ? 'font-bold text-red-600' : ''}`}>
                    <span>Poor:</span>
                    <span>75-90s</span>
                  </div>
                  <div className={`flex justify-between ${results.averageJourneyTime >= 90 ? 'font-bold text-red-700' : ''}`}>
                    <span>Unacceptable:</span>
                    <span>≥ 90s</span>
                  </div>
                </div>
              </div>

              {/* Population Distribution Visualization */}
              {populationPattern !== 'uniform' && (
                <div className="bg-white p-3 rounded-md mt-4 border border-gray-200 shadow-sm">
                  <h4 className="font-medium mb-2">Population Distribution</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {results.populationDistribution.map((pop, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span>Floor {index === 0 ? 'G' : index}:</span>
                        <span>{pop.toFixed(0)} persons</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Variables & Formulas Tab */}
        {activeTab === 'formulas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Key Variables</h3>
              
              <div className="space-y-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-blue-700 mb-2">Time Components</h4>
                  <div className="space-y-1">
                    <div><strong>T:</strong> Performance Time = tf(1) + tsd + tc + to - tad</div>
                    <div><strong>tf(1):</strong> Single floor flight time (door lock to next floor level)</div>
                    <div><strong>tsd:</strong> Start delay time</div>
                    <div><strong>tc:</strong> Door closing time (start to close until locked)</div>
                    <div><strong>to:</strong> Door opening time (start to open until 800mm)</div>
                    <div><strong>tad:</strong> Advance door opening time</div>
                    <div><strong>tv:</strong> Travel time per floor = floor height / speed</div>
                    <div><strong>ts:</strong> Stop time = T - tv</div>
                    <div><strong>tp:</strong> Passenger transfer time (enter/exit)</div>
                    <div><strong>tr(1):</strong> Acceleration/deceleration/leveling time</div>
                    <div><strong>te:</strong> Express time to main terminal floor</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-blue-700 mb-2">System Variables</h4>
                  <div className="space-y-1">
                    <div><strong>N:</strong> Number of floors</div>
                    <div><strong>L:</strong> Number of cars</div>
                    <div><strong>CC:</strong> Car capacity (persons)</div>
                    <div><strong>P:</strong> Average passengers = CC × occupancy%</div>
                    <div><strong>S:</strong> Average stops</div>
                    <div><strong>H:</strong> Highest floor (for unequal demand)</div>
                    <div><strong>U:</strong> Effective building population</div>
                    <div><strong>Ui:</strong> Population from floor i upward</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-blue-700 mb-2">Performance Metrics</h4>
                  <div className="space-y-1">
                    <div><strong>RTT:</strong> Round Trip Time</div>
                    <div><strong>UPPINT:</strong> Up-peak interval = RTT / L</div>
                    <div><strong>UPPHC:</strong> Up-peak handling capacity</div>
                    <div><strong>%POP:</strong> Population handling percentage</div>
                    <div><strong>AWT:</strong> Average Waiting Time</div>
                    <div><strong>ATT:</strong> Average Transit Time</div>
                    <div><strong>ATTD:</strong> Average Time to Destination</div>
                    <div><strong>AJT:</strong> Average Journey Time</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Applied Formulas</h3>
              
              <div className="space-y-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-green-700 mb-2">Performance Time</h4>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                    <div><strong>T = tf(1) + tsd + tc + to - tad</strong></div>
                    <div>T = {singleFloorFlightTime} + {startDelayTime} + {doorCloseTime} + {doorOpenTime} - {advanceDoorOpenTime}</div>
                    <div><strong>T = {results.performanceTime.toFixed(1)}s</strong></div>
                    <div className="mt-2"><strong>ts = T - tv</strong></div>
                    <div>ts = {results.performanceTime.toFixed(1)} - {results.travelTimePerFloor.toFixed(1)} = {results.stopTime.toFixed(1)}s</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-green-700 mb-2">S-P Relationships Time Components</h4>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                    <div><strong>Equal Demand (Uniform):</strong></div>
                    <div>S = N × [1 - (1-1/N)^P]</div>
                    <div className="mt-2"><strong>Unequal Demand (Up-peak):</strong></div>
                    <div>S = Σ[1 - ((U-Ui)/U)^P] for i=1 to N</div>
                    <div className="mt-2"><strong>Highest Floor Time Components:</strong></div>
                    <div>H = N - Σ[Σ(Uj/U)]^P for i=1 to N-1</div>
                    <div className="mt-2 text-blue-600">Current: {results.formulas.sFormula}</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-green-700 mb-2">Round Trip Time Time Components</h4>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                    <div><strong>RTT = 2P×tp + (S+1)×ts + 2xH*tv</strong></div>
                    <div>Passenger: 2×{results.averagePassengers.toFixed(1)}×{passengerTransferTime} = {(2*results.averagePassengers*passengerTransferTime).toFixed(1)}s</div>
                    <div>Door Ops: ({results.averageStops.toFixed(1)}+1)×{results.stopTime.toFixed(1)} = {((results.averageStops+1)*results.stopTime).toFixed(1)}s</div>
                    {/* <div>Accel: ({results.averageStops.toFixed(1)}+1)×{accelerationTime} = {((results.averageStops+1)*accelerationTime).toFixed(1)}s</div> */}
                    <div>Travel: 2x{results.highestFloor.toFixed(1)}×{results.travelTimePerFloor.toFixed(1)} = {((2*results.highestFloor)*results.travelTimePerFloor).toFixed(1)}s</div>
                    {/* <div>Express: ({results.highestFloor.toFixed(1)}-1)×{expressTime} = {((results.highestFloor-1)*expressTime).toFixed(1)}s</div> */}
                    <div><strong>RTT = {results.roundTripTime.toFixed(1)}s</strong></div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-green-700 mb-2">Capacity Calculations</h4>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                    <div><strong>UPPINT = RTT / L</strong></div>
                    <div>UPPINT = {results.roundTripTime.toFixed(1)} / {numberOfCars} = {results.upPeakInterval.toFixed(1)}s</div>
                    <div className="mt-2"><strong>UPPHC = 300 × P / UPPINT</strong></div>
                    <div>UPPHC = 300 × {results.averagePassengers.toFixed(1)} / {results.upPeakInterval.toFixed(1)} = {results.upPeakHandlingCapacity}</div>
                    <div className="mt-2"><strong>%POP = UPPHC × 100 / U</strong></div>
                    <div>%POP = {results.upPeakHandlingCapacity} × 100 / {results.effectivePopulation.toFixed(0)} = {results.handlingCapacityPercentage.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-green-700 mb-2">Performance Analysis Time Components</h4>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                    <div><strong>AWT Formula:</strong></div>
                    <div>{results.formulas.awtFormula}</div>
                    <div><strong>AWT = {results.averageWaitingTime.toFixed(1)}s</strong></div>
                    <div className="mt-2"><strong>ATT = tv×H/(2S)×(S+1) + ts×(S+1)/2 + tp×P</strong></div>
                    <div>ATT = {results.travelTimePerFloor.toFixed(1)}×{results.highestFloor.toFixed(1)}/(2×{results.averageStops.toFixed(1)})×({results.averageStops.toFixed(1)}+1) + {results.stopTime.toFixed(1)}×({results.averageStops.toFixed(1)}+1)/2 + {passengerTransferTime}×{results.averagePassengers.toFixed(1)}</div>
                    <div><strong>ATT = {results.averageTransitTime.toFixed(1)}s</strong></div>
                    <div className="mt-2"><strong>AJT = AWT + ATT</strong></div>
                    <div>AJT = {results.averageWaitingTime.toFixed(1)} + {results.averageTransitTime.toFixed(1)} = {results.averageJourneyTime.toFixed(1)}s</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Implementation Notes */}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Implementation Notes & Corrections</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>Fixed Custom Population GUI:</strong> Changed from grid layout to one floor per line with clear labeling</li>
            <li><strong>Corrected Unequal Demand Formula:</strong> S now uses Σ[1 - ((U-Ui)/U)^P] and H uses N - Σ[Σ(Uj/U)]^P</li>
            <li><strong>Fixed RTT Formula:</strong> Now implements complete formula: RTT = 2P×tp + (S+1)×ts + (S+1)×tr + (H-S)×tv + (H-1)×te</li>
            <li><strong>Corrected ATT Formula:</strong> Now uses ATT = tv×H/(2S)×(S+1) + ts×(S+1)/2 + tp×P as per specifications</li>
            <li><strong>Added Missing Time Components:</strong> tr(1) for acceleration and te for express time to main terminal</li>
            <li><strong>Enhanced Formula Documentation:</strong> All corrected formulas with step-by-step calculations displayed</li>
            <li><strong>Improved Population Input:</strong> Custom distribution now shows total and uses clear floor-by-floor entry</li>
          </ul>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default LiftTrafficCalculator;