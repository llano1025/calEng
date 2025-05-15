import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface TransformerSizingCalculatorProps {
  onShowTutorial?: () => void;
}

// Define load type
type LoadType = 'continuous' | 'intermittent' | 'cyclic';
type TransformerType = 'dry' | 'oil';
type InstallationType = 'indoor' | 'outdoor';

// Define load category interface
interface LoadCategory {
  id: string;
  name: string;
  power: number;         // kW
  powerFactor: number;   // 0-1
  quantity: number;
  loadFactor: number;    // 0-1
  demandFactor: number;  // 0-1
  harmonicContent: number; // Total Harmonic Distortion (THD) in %
  phaseType: 'single' | 'three'; // Single-phase or three-phase
  startingMethod: string; // For motor loads
  voltageRating: number;  // V
}

// Define transformer configuration interface
interface TransformerConfig {
  primaryVoltage: number;   // V
  secondaryVoltage: number; // V
  frequency: number;        // Hz
  connectionType: string;   // e.g., 'delta-wye', 'wye-wye', etc.
  impedance: number;        // %
  temperature: number;      // °C ambient temperature
  altitude: number;         // meters above sea level
  type: TransformerType;    // 'dry' or 'oil'
  installation: InstallationType; // 'indoor' or 'outdoor'
  kFactor: number;          // For harmonic considerations
  efficiency: number;       // %
  redundancy: number;       // % additional capacity for redundancy
  futureExpansion: number;  // % additional capacity for future expansion
}

// Define load category being edited
interface EditableLoad {
  loadId: string;
  newName?: string;
  newPower?: number;
  newPowerFactor?: number;
  newQuantity?: number;
  newLoadFactor?: number;
  newDemandFactor?: number;
  newHarmonicContent?: number;
  newPhaseType?: 'single' | 'three';
  newStartingMethod?: string;
  newVoltageRating?: number;
}

// Standard transformer sizes in kVA
const STANDARD_TRANSFORMER_SIZES = [
  15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 3750, 5000,
  7500, 10000 // Added larger sizes for broader applicability
];

// Starting method options for motors
const STARTING_METHODS = [
  { id: 'direct', name: 'Direct-On-Line (DOL)', startingCurrentFactor: 6 }, // Can be 5-8x
  { id: 'star-delta', name: 'Star-Delta', startingCurrentFactor: 2.5 }, // Can be 2-3x of DOL
  { id: 'softStarter', name: 'Soft Starter', startingCurrentFactor: 2 }, // Can be 2-4x
  { id: 'vfd', name: 'Variable Frequency Drive (VFD)', startingCurrentFactor: 1.8 }, // Can be 1.1-1.5x
  { id: 'none', name: 'Not a Motor / No Starting Current', startingCurrentFactor: 1 }
];

// Connection type options
const CONNECTION_TYPES = [
  { id: 'delta-wye', name: 'Delta-Wye (Δ-Y)' },
  { id: 'delta-delta', name: 'Delta-Delta (Δ-Δ)' },
  { id: 'wye-wye', name: 'Wye-Wye (Y-Y)' },
  { id: 'wye-delta', name: 'Wye-Delta (Y-Δ)' }
];

const TransformerSizingCalculator: React.FC<TransformerSizingCalculatorProps> = ({ onShowTutorial }) => {
  const [loadCategories, setLoadCategories] = useState<LoadCategory[]>([
    {
      id: '1', name: 'General Lighting', power: 20, powerFactor: 0.85, quantity: 1,
      loadFactor: 1.0, demandFactor: 1.0, harmonicContent: 10, phaseType: 'three',
      startingMethod: 'none', voltageRating: 380
    },
    {
      id: '2', name: 'HVAC Motors', power: 50, powerFactor: 0.80, quantity: 2,
      loadFactor: 0.75, demandFactor: 0.9, harmonicContent: 5, phaseType: 'three',
      startingMethod: 'star-delta', voltageRating: 380
    }
  ]);
  
  const [transformerConfig, setTransformerConfig] = useState<TransformerConfig>({
    primaryVoltage: 11000, secondaryVoltage: 380, frequency: 50,
    connectionType: 'delta-wye', impedance: 5, temperature: 40,
    altitude: 0, type: 'oil', installation: 'indoor', kFactor: 1,
    efficiency: 98.5, redundancy: 20, futureExpansion: 30
  });
  
  const [editingLoad, setEditingLoad] = useState<EditableLoad | null>(null);
  
  // State for calculated results
  const [loadResults, setLoadResults] = useState<any>({}); // Summary object
  const [recommendedSize, setRecommendedSize] = useState<number>(0); // kVA
  const [specificLoadData, setSpecificLoadData] = useState<any[]>([]);
  
  // Detailed result states
  const [totalApparentPowerFromLoads, setTotalApparentPowerFromLoads] = useState<number>(0); // kVA from loads
  const [totalActivePowerFromLoads, setTotalActivePowerFromLoads] = useState<number>(0); // kW from loads
  const [totalReactivePowerFromLoads, setTotalReactivePowerFromLoads] = useState<number>(0); // kVAR from loads
  
  const [harmonicDeratingFactor, setHarmonicDeratingFactor] = useState<number>(1.0);
  const [altitudeDeratingFactor, setAltitudeDeratingFactor] = useState<number>(1.0);
  const [temperatureDeratingFactor, setTemperatureDeratingFactor] = useState<number>(1.0);
  const [overallDeratingFactor, setOverallDeratingFactor] = useState<number>(1.0);
  
  const [requiredKVAAfterDerating, setRequiredKVAAfterDerating] = useState<number>(0);
  const [finalCalculatedKVA, setFinalCalculatedKVA] = useState<number>(0); // After redundancy & expansion

  const [transformerUtilization, setTransformerUtilization] = useState<number>(0); // %
  const [peakMotorStartingCurrent, setPeakMotorStartingCurrent] = useState<number>(0); // Amps on secondary
  const [transformerEnergizationInrush, setTransformerEnergizationInrush] = useState<number>(0); // Amps on primary
  const [motorStartingVoltageDip, setMotorStartingVoltageDip] = useState<number>(0); // %
  const [secondaryVoltageDropAtFullLoad, setSecondaryVoltageDropAtFullLoad] = useState<number>(0); // Volts
  const [estimatedTransformerLosses, setEstimatedTransformerLosses] = useState<number>(0); // kW

  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  
  useEffect(() => {
    if (loadCategories.length === 0) {
        // Reset all calculated states if no loads
        setTotalActivePowerFromLoads(0); setTotalReactivePowerFromLoads(0); setTotalApparentPowerFromLoads(0);
        setHarmonicDeratingFactor(1); setAltitudeDeratingFactor(1); setTemperatureDeratingFactor(1);
        setOverallDeratingFactor(1); setRequiredKVAAfterDerating(0); setFinalCalculatedKVA(0);
        setRecommendedSize(0); setTransformerUtilization(0); setPeakMotorStartingCurrent(0);
        setTransformerEnergizationInrush(0); setMotorStartingVoltageDip(0);
        setSecondaryVoltageDropAtFullLoad(0); setEstimatedTransformerLosses(0);
        setLoadResults({}); setSpecificLoadData([]);
        return;
    }
    
    let currentTotalActivePower = 0;
    let currentTotalReactivePower = 0;
    const detailedLoads: any[] = [];
    let maxHarmonicContentForDerating = 0; // Used for K-1 transformer derating
    let maxStartingKVA = 0;
    let phaseTypeOfMaxStartingLoad: 'single' | 'three' = 'three';
    
    loadCategories.forEach(load => {
      const actualPower = load.power * load.quantity * load.loadFactor * load.demandFactor;
      currentTotalActivePower += actualPower;
      
      const powerFactorAngle = Math.acos(Math.max(0.1, Math.min(1, load.powerFactor))); // Clamp PF
      const reactiveKVAR = actualPower * Math.tan(powerFactorAngle);
      currentTotalReactivePower += reactiveKVAR;
      
      const apparentKVA = actualPower / load.powerFactor;
      
      if (load.harmonicContent > maxHarmonicContentForDerating) {
        maxHarmonicContentForDerating = load.harmonicContent;
      }
      
      let startingKVA = 0;
      let startingCurrentFactorVal = 1;
      if (load.startingMethod !== 'none') {
        const method = STARTING_METHODS.find(m => m.id === load.startingMethod);
        if (method) {
          startingCurrentFactorVal = method.startingCurrentFactor;
          // Starting KVA is based on the load's rated apparent power, not diversified power
          const ratedApparentKVA = (load.power * load.quantity) / load.powerFactor;
          startingKVA = ratedApparentKVA * startingCurrentFactorVal;
          if (startingKVA > maxStartingKVA) {
            maxStartingKVA = startingKVA;
            phaseTypeOfMaxStartingLoad = load.phaseType;
          }
        }
      }
      
      detailedLoads.push({
        id: load.id, name: load.name, actualPower, reactivePower: reactiveKVAR,
        apparentPower: apparentKVA, startingKVA, powerFactor: load.powerFactor,
        harmonicContent: load.harmonicContent, phaseType: load.phaseType, startingCurrentFactor: startingCurrentFactorVal
      });
    });
    
    setTotalActivePowerFromLoads(currentTotalActivePower);
    setTotalReactivePowerFromLoads(currentTotalReactivePower);
    const currentTotalApparentPowerFromLoads = Math.sqrt(Math.pow(currentTotalActivePower, 2) + Math.pow(currentTotalReactivePower, 2));
    setTotalApparentPowerFromLoads(currentTotalApparentPowerFromLoads);
    setSpecificLoadData(detailedLoads);

    // Calculate Derating Factors
    let currentHarmonicDerating = 1.0;
    if (transformerConfig.kFactor === 1 && maxHarmonicContentForDerating > 0) {
      const thdEffect = Math.min(maxHarmonicContentForDerating, 50); // Cap effective THD for this rule
      currentHarmonicDerating = 1.0 - (thdEffect / 100) * 0.15; // 15% derating effect for 50% THD
      if (currentHarmonicDerating < 0.75) currentHarmonicDerating = 0.75; // Cap minimum derating
    }
    setHarmonicDeratingFactor(currentHarmonicDerating);
    
    let currentAltitudeDerating = 1.0;
    if (transformerConfig.altitude > 1000) {
      currentAltitudeDerating = 1.0 - ((transformerConfig.altitude - 1000) / 100) * 0.004; // 0.4% per 100m (IEC typical)
      if (currentAltitudeDerating < 0.8) currentAltitudeDerating = 0.8; // Cap
    }
    setAltitudeDeratingFactor(currentAltitudeDerating);
    
    let currentTemperatureDerating = 1.0;
    const referenceTemp = 40; // Standardized reference temperature
    if (transformerConfig.temperature > referenceTemp) {
      // Simplified: 0.8% to 1% per °C for oil, 1.25% to 1.5% for dry. Using average of 1%.
      currentTemperatureDerating = 1.0 - (transformerConfig.temperature - referenceTemp) * 0.01;
      if (currentTemperatureDerating < 0.75) currentTemperatureDerating = 0.75; // Cap
    }
    setTemperatureDeratingFactor(currentTemperatureDerating);
    
    const currentOverallDerating = currentHarmonicDerating * currentAltitudeDerating * currentTemperatureDerating;
    setOverallDeratingFactor(currentOverallDerating);
    
    // Calculate Required Transformer Size
    const kvaAfterDerating = currentOverallDerating > 0 ? currentTotalApparentPowerFromLoads / currentOverallDerating : currentTotalApparentPowerFromLoads * 1.5; // Fallback if derating is extreme
    setRequiredKVAAfterDerating(kvaAfterDerating);
    
    let kvaWithMargins = kvaAfterDerating;
    if (transformerConfig.redundancy > 0) {
      kvaWithMargins *= (1 + transformerConfig.redundancy / 100);
    }
    if (transformerConfig.futureExpansion > 0) {
      kvaWithMargins *= (1 + transformerConfig.futureExpansion / 100);
    }
    setFinalCalculatedKVA(kvaWithMargins);
    
    let currentRecommendedSize = STANDARD_TRANSFORMER_SIZES[STANDARD_TRANSFORMER_SIZES.length -1]; // Default to largest if > all
    for (const size of STANDARD_TRANSFORMER_SIZES) {
      if (size >= kvaWithMargins) {
        currentRecommendedSize = size;
        break;
      }
    }
    setRecommendedSize(currentRecommendedSize);
    
    // Post-Selection Calculations
    const currentTransformerUtilization = currentRecommendedSize > 0 ? (currentTotalApparentPowerFromLoads / currentRecommendedSize) * 100 : 0;
    setTransformerUtilization(currentTransformerUtilization);
    
    const currentPeakMotorStartingCurrent = maxStartingKVA > 0 && transformerConfig.secondaryVoltage > 0 ? (
      maxStartingKVA * 1000 / // Convert kVA to VA
      ((phaseTypeOfMaxStartingLoad === 'three' ? Math.sqrt(3) : 1) * transformerConfig.secondaryVoltage)
    ) : 0;
    setPeakMotorStartingCurrent(currentPeakMotorStartingCurrent);

    const currentTransformerEnergizationInrush = currentRecommendedSize > 0 && transformerConfig.primaryVoltage > 0 ? (
        10 * (currentRecommendedSize * 1000 / (Math.sqrt(3) * transformerConfig.primaryVoltage)) // 10x FLC of selected transformer, 3-phase assumed for primary
    ) : 0;
    setTransformerEnergizationInrush(currentTransformerEnergizationInrush);

    const currentMotorStartingVoltageDip = (currentRecommendedSize > 0 && maxStartingKVA > 0 && transformerConfig.impedance > 0) ?
      (maxStartingKVA / currentRecommendedSize) * transformerConfig.impedance : 0;
    setMotorStartingVoltageDip(currentMotorStartingVoltageDip);

    const currentSecondaryVoltageDrop = currentRecommendedSize > 0 ?
     (transformerConfig.impedance / 100) * (currentTotalApparentPowerFromLoads / currentRecommendedSize) * transformerConfig.secondaryVoltage : 0;
    setSecondaryVoltageDropAtFullLoad(currentSecondaryVoltageDrop);

    let currentEstimatedLosses = 0;
    if (transformerConfig.efficiency > 0 && currentTotalActivePower > 0) {
        const inputPower = currentTotalActivePower / (transformerConfig.efficiency / 100);
        currentEstimatedLosses = inputPower - currentTotalActivePower;
    }
    setEstimatedTransformerLosses(currentEstimatedLosses);

    // Update summary results object
    setLoadResults({
      totalKW: currentTotalActivePower,
      totalKVAR: currentTotalReactivePower,
      totalKVA: currentTotalApparentPowerFromLoads,
      harmonicDerating: currentHarmonicDerating,
      altitudeDerating: currentAltitudeDerating,
      temperatureDerating: currentTemperatureDerating,
      totalDerating: currentOverallDerating,
      requiredKVAAfterDerating: kvaAfterDerating,
      finalCalculatedKVA: kvaWithMargins,
      standardSize: currentRecommendedSize,
      utilization: currentTransformerUtilization,
      peakMotorStartingCurrent: currentPeakMotorStartingCurrent,
      transformerEnergizationInrush: currentTransformerEnergizationInrush,
      motorStartingVoltageDip: currentMotorStartingVoltageDip,
      secondaryVoltageDrop: currentSecondaryVoltageDrop,
      estimatedLosses: currentEstimatedLosses
    });
    
  }, [loadCategories, transformerConfig]);
  
  const addLoadCategory = () => {
    const newLoad: LoadCategory = {
      id: Date.now().toString(), name: 'New Load', power: 10, powerFactor: 0.9,
      quantity: 1, loadFactor: 1.0, demandFactor: 0.8, harmonicContent: 0,
      phaseType: 'three', startingMethod: 'none', voltageRating: transformerConfig.secondaryVoltage || 400
    };
    setLoadCategories([...loadCategories, newLoad]);
  };
  
  const removeLoadCategory = (id: string) => {
    setLoadCategories(loadCategories.filter(load => load.id !== id));
  };
  
  const updateLoadCategory = (id: string, updates: Partial<LoadCategory>) => {
    setLoadCategories(
      loadCategories.map(load => 
        load.id === id ? { ...load, ...updates } : load
      )
    );
  };
  
  const startEditingLoad = (loadId: string) => {
    const load = loadCategories.find(l => l.id === loadId);
    if (!load) return;
    setEditingLoad({
      loadId, newName: load.name, newPower: load.power, newPowerFactor: load.powerFactor,
      newQuantity: load.quantity, newLoadFactor: load.loadFactor, newDemandFactor: load.demandFactor,
      newHarmonicContent: load.harmonicContent, newPhaseType: load.phaseType,
      newStartingMethod: load.startingMethod, newVoltageRating: load.voltageRating
    });
  };
  
  const saveEditedLoad = () => {
    if (!editingLoad) return;
    const updates: Partial<LoadCategory> = {};
    if (editingLoad.newName !== undefined) updates.name = editingLoad.newName;
    if (editingLoad.newPower !== undefined) updates.power = editingLoad.newPower;
    if (editingLoad.newPowerFactor !== undefined) updates.powerFactor = editingLoad.newPowerFactor;
    if (editingLoad.newQuantity !== undefined) updates.quantity = editingLoad.newQuantity;
    if (editingLoad.newLoadFactor !== undefined) updates.loadFactor = editingLoad.newLoadFactor;
    if (editingLoad.newDemandFactor !== undefined) updates.demandFactor = editingLoad.newDemandFactor;
    if (editingLoad.newHarmonicContent !== undefined) updates.harmonicContent = editingLoad.newHarmonicContent;
    if (editingLoad.newPhaseType !== undefined) updates.phaseType = editingLoad.newPhaseType;
    if (editingLoad.newStartingMethod !== undefined) updates.startingMethod = editingLoad.newStartingMethod;
    if (editingLoad.newVoltageRating !== undefined) updates.voltageRating = editingLoad.newVoltageRating;
    updateLoadCategory(editingLoad.loadId, updates);
    setEditingLoad(null);
  };
  
  const cancelEditingLoad = () => setEditingLoad(null);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Transformer Sizing Calculator</h2>
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
          <h3 className="font-medium text-lg mb-4 text-gray-700">Transformer Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Primary Voltage (V)</label><input type="number" value={transformerConfig.primaryVoltage} onChange={(e) => setTransformerConfig({...transformerConfig, primaryVoltage: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Secondary Voltage (V)</label><input type="number" value={transformerConfig.secondaryVoltage} onChange={(e) => setTransformerConfig({...transformerConfig, secondaryVoltage: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequency (Hz)</label><select value={transformerConfig.frequency} onChange={(e) => setTransformerConfig({...transformerConfig, frequency: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"><option value={50}>50 Hz</option><option value={60}>60 Hz</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label><select value={transformerConfig.connectionType} onChange={(e) => setTransformerConfig({...transformerConfig, connectionType: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">{CONNECTION_TYPES.map(type => (<option key={type.id} value={type.id}>{type.name}</option>))}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Impedance (%)</label><input type="number" value={transformerConfig.impedance} onChange={(e) => setTransformerConfig({...transformerConfig, impedance: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.1" min="2" max="15"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ambient Temp. (°C)</label><input type="number" value={transformerConfig.temperature} onChange={(e) => setTransformerConfig({...transformerConfig, temperature: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="1"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Altitude (m)</label><input type="number" value={transformerConfig.altitude} onChange={(e) => setTransformerConfig({...transformerConfig, altitude: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="100" min="0"/></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Transformer Type</label><div className="flex space-x-4">{(['oil', 'dry'] as TransformerType[]).map(tType => (<label key={tType} className="inline-flex items-center"><input type="radio" name="transformerType" checked={transformerConfig.type === tType} onChange={() => setTransformerConfig({...transformerConfig, type: tType})} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/><span className="text-sm text-gray-700">{tType === 'oil' ? 'Oil-filled' : 'Dry-type'}</span></label>))}</div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Installation</label><div className="flex space-x-4">{(['indoor', 'outdoor'] as InstallationType[]).map(iType => (<label key={iType} className="inline-flex items-center"><input type="radio" name="installation" checked={transformerConfig.installation === iType} onChange={() => setTransformerConfig({...transformerConfig, installation: iType})} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/><span className="text-sm text-gray-700">{iType.charAt(0).toUpperCase() + iType.slice(1)}</span></label>))}</div></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">K-Factor</label><select value={transformerConfig.kFactor} onChange={(e) => setTransformerConfig({...transformerConfig, kFactor: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">{[1,4,13,20].map(k => (<option key={k} value={k}>K-{k} {k===1?'(Std)':k===4?'(Light)':k===13?'(Med)':'(Heavy)'} Harmonics</option>))}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Efficiency (%)</label><input type="number" value={transformerConfig.efficiency} onChange={(e) => setTransformerConfig({...transformerConfig, efficiency: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.1" min="90" max="99.9"/></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Redundancy (%)</label><input type="number" value={transformerConfig.redundancy} onChange={(e) => setTransformerConfig({...transformerConfig, redundancy: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="5" min="0" max="100"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Future Expansion (%)</label><input type="number" value={transformerConfig.futureExpansion} onChange={(e) => setTransformerConfig({...transformerConfig, futureExpansion: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="5" min="0" max="100"/></div>
          </div>
          <div className="border-t border-gray-300 my-6"></div>
          <div className="flex justify-between items-center mb-4"><h3 className="font-medium text-lg text-gray-700">Load Categories</h3><button onClick={addLoadCategory} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm">Add Load</button></div>
          {loadCategories.map((load) => (<div key={load.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><div className="flex justify-between items-center mb-3"><h4 className="font-medium text-gray-700">{load.name}</h4>{loadCategories.length > 1 && (<button onClick={() => removeLoadCategory(load.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>)}</div>{editingLoad && editingLoad.loadId === load.id ? (<div className="pl-3 border-l-4 border-blue-400"><div className="mb-3"><label className="block text-sm font-medium text-gray-700 mb-1">Load Name</label><input type="text" value={editingLoad.newName} onChange={(e) => setEditingLoad({...editingLoad, newName: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Power (kW)</label><input type="number" value={editingLoad.newPower} onChange={(e) => setEditingLoad({...editingLoad, newPower: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.1" min="0"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label><input type="number" value={editingLoad.newPowerFactor} onChange={(e) => setEditingLoad({...editingLoad, newPowerFactor: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.01" min="0.1" max="1"/></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label><input type="number" value={editingLoad.newQuantity} onChange={(e) => setEditingLoad({...editingLoad, newQuantity: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="1" min="1"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Voltage Rating (V)</label><input type="number" value={editingLoad.newVoltageRating} onChange={(e) => setEditingLoad({...editingLoad, newVoltageRating: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="1"/></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Load Factor</label><input type="number" value={editingLoad.newLoadFactor} onChange={(e) => setEditingLoad({...editingLoad, newLoadFactor: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.05" min="0" max="1"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Diversity Factor</label><input type="number" value={editingLoad.newDemandFactor} onChange={(e) => setEditingLoad({...editingLoad, newDemandFactor: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.05" min="0" max="1"/></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Harmonic Content (THD %)</label><input type="number" value={editingLoad.newHarmonicContent} onChange={(e) => setEditingLoad({...editingLoad, newHarmonicContent: Number(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="1" min="0" max="100"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Phase Type</label><select value={editingLoad.newPhaseType} onChange={(e) => setEditingLoad({...editingLoad, newPhaseType: e.target.value as 'single' | 'three'})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"><option value="single">Single-phase</option><option value="three">Three-phase</option></select></div></div><div className="mb-3"><label className="block text-sm font-medium text-gray-700 mb-1">Starting Method (for motors)</label><select value={editingLoad.newStartingMethod} onChange={(e) => setEditingLoad({...editingLoad, newStartingMethod: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">{STARTING_METHODS.map(method => (<option key={method.id} value={method.id}>{method.name} (Factor: {method.startingCurrentFactor}x)</option>))}</select></div><div className="flex justify-end space-x-2 mt-3"><button onClick={cancelEditingLoad} className="text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md text-sm border border-gray-300 hover:bg-gray-50">Cancel</button><button onClick={saveEditedLoad} className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700">Save Changes</button></div></div>) : (<><div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mb-3 text-sm"><div><p className="text-gray-600">Power:</p><p className="font-semibold text-gray-800">{load.power} kW</p></div><div><p className="text-gray-600">PF:</p><p className="font-semibold text-gray-800">{load.powerFactor}</p></div><div><p className="text-gray-600">Qty:</p><p className="font-semibold text-gray-800">{load.quantity}</p></div><div><p className="text-gray-600">Voltage:</p><p className="font-semibold text-gray-800">{load.voltageRating}V</p></div><div><p className="text-gray-600">Load Factor:</p><p className="font-semibold text-gray-800">{load.loadFactor}</p></div><div><p className="text-gray-600">Diversity Factor:</p><p className="font-semibold text-gray-800">{load.demandFactor}</p></div><div><p className="text-gray-600">THD:</p><p className="font-semibold text-gray-800">{load.harmonicContent}%</p></div><div><p className="text-gray-600">Phase:</p><p className="font-semibold text-gray-800">{load.phaseType === 'single' ? 'Single' : 'Three'}</p></div></div><div className="flex flex-wrap gap-2 text-sm"><p className="text-gray-600">Starting Method:</p><p className="font-semibold text-gray-800">{STARTING_METHODS.find(method => method.id === load.startingMethod)?.name || 'None'}</p></div><div className="flex justify-end mt-3"><button onClick={() => startEditingLoad(load.id)} className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"><Icons.Edit /><span className="ml-1">Edit</span></button></div></>)}</div>))}
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <h4 className="font-medium text-lg text-blue-800 mb-3">Transformer Rating</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><p className="text-sm text-gray-600">Calculated Capacity (with margins):</p><p className="font-bold text-2xl text-blue-600">{finalCalculatedKVA.toFixed(1)} kVA</p></div>
              <div><p className="text-sm text-gray-600">Recommended Standard Size:</p><p className="font-bold text-2xl text-green-600">{recommendedSize} kVA</p></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div><p className="text-sm text-gray-600">Total Active Power (Load):</p><p className="font-semibold text-gray-800">{totalActivePowerFromLoads.toFixed(1)} kW</p></div>
              <div><p className="text-sm text-gray-600">Total Reactive Power (Load):</p><p className="font-semibold text-gray-800">{totalReactivePowerFromLoads.toFixed(1)} kVAR</p></div>
              <div><p className="text-sm text-gray-600">Total Apparent Power (Load):</p><p className="font-semibold text-gray-800">{totalApparentPowerFromLoads.toFixed(1)} kVA</p></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><p className="text-sm text-gray-600">Overall Load Power Factor:</p><p className="font-semibold text-gray-800">{(totalApparentPowerFromLoads > 0 ? totalActivePowerFromLoads / totalApparentPowerFromLoads : 0).toFixed(2)}</p></div>
              <div><p className="text-sm text-gray-600">Est. Transformer Utilization:</p><p className={`font-semibold ${transformerUtilization > 85 ? 'text-orange-600' : transformerUtilization > 95 ? 'text-red-600' : 'text-green-600'}`}>{transformerUtilization.toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-600">Est. Transformer Losses:</p><p className="font-semibold text-gray-800">{estimatedTransformerLosses.toFixed(2)} kW</p></div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-blue-800 mb-3">Derating & Margin Analysis</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><p className="text-sm text-gray-600">Harmonic Derating Factor:</p><p className="font-semibold text-gray-800">{(harmonicDeratingFactor * 100).toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-600">Altitude Derating Factor:</p><p className="font-semibold text-gray-800">{(altitudeDeratingFactor * 100).toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-600">Temperature Derating Factor:</p><p className="font-semibold text-gray-800">{(temperatureDeratingFactor * 100).toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-600">Overall Derating Factor:</p><p className="font-semibold text-gray-800">{(overallDeratingFactor * 100).toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-600">Capacity after Derating:</p><p className="font-semibold text-gray-800">{requiredKVAAfterDerating.toFixed(1)} kVA</p></div>
              <div><p className="text-sm text-gray-600">Capacity with Margins:</p><p className="font-semibold text-gray-800">{finalCalculatedKVA.toFixed(1)} kVA</p></div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-blue-800 mb-3">Voltage & Current Analysis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-600">Secondary Voltage Drop (at Load):</p><p className={`font-semibold ${secondaryVoltageDropAtFullLoad > transformerConfig.secondaryVoltage * 0.05 ? 'text-red-600' : secondaryVoltageDropAtFullLoad > transformerConfig.secondaryVoltage * 0.03 ? 'text-orange-600' : 'text-green-600'}`}>{secondaryVoltageDropAtFullLoad.toFixed(1)} V ({(transformerConfig.secondaryVoltage > 0 ? secondaryVoltageDropAtFullLoad / transformerConfig.secondaryVoltage * 100 : 0).toFixed(1)}%)</p></div>
              <div><p className="text-sm text-gray-600">Est. Motor Starting Voltage Dip:</p><p className={`font-semibold ${motorStartingVoltageDip > 15 ? 'text-red-600' : motorStartingVoltageDip > 10 ? 'text-orange-600' : 'text-green-600'}`}>{motorStartingVoltageDip.toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-600">Peak Motor Starting Current (Sec.):</p><p className="font-semibold text-gray-800">{peakMotorStartingCurrent.toFixed(0)} A</p></div>
              <div><p className="text-sm text-gray-600">Xfrmr Energization Inrush (Pri.):</p><p className="font-semibold text-gray-800">{transformerEnergizationInrush.toFixed(0)} A</p></div>
            </div>
          </div>
          
          <button onClick={() => setShowTechnicalDetails(!showTechnicalDetails)} className="w-full mb-4 flex justify-between items-center p-3 bg-blue-100 hover:bg-blue-200 rounded-md border border-blue-300 text-blue-700"><span className="font-medium">{showTechnicalDetails ? 'Hide' : 'Show'} Technical Details</span><span className="text-blue-600">{showTechnicalDetails ? '▲' : '▼'}</span></button>
          
          {showTechnicalDetails && (
            <>
              <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200 overflow-x-auto">
                <h4 className="font-medium text-base text-blue-800 mb-3">Individual Load Details</h4>
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load</th><th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P (kW)</th><th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Q (kVAR)</th><th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">S (kVA)</th><th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PF</th><th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Start (kVA)</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{specificLoadData.map((load) => (<tr key={load.id}><td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{load.name}{load.harmonicContent > 0 && (<span className="ml-1 text-xs text-orange-600">(THD: {load.harmonicContent}%)</span>)}</td><td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.actualPower.toFixed(1)}</td><td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.reactivePower.toFixed(1)}</td><td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.apparentPower.toFixed(1)}</td><td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.powerFactor.toFixed(2)}</td><td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{load.startingKVA > 0 ? load.startingKVA.toFixed(1) : '-'}{load.startingKVA > 0 && (<span className="ml-1 text-xs text-blue-600">({load.startingCurrentFactor}x)</span>)}</td></tr>))}</tbody>
                <tfoot className="bg-gray-50"><tr><td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Total Diversified</td><td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{totalActivePowerFromLoads.toFixed(1)}</td><td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{totalReactivePowerFromLoads.toFixed(1)}</td><td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{totalApparentPowerFromLoads.toFixed(1)}</td><td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">{(totalApparentPowerFromLoads > 0 ? totalActivePowerFromLoads / totalApparentPowerFromLoads : 0).toFixed(2)}</td><td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-700">-</td></tr></tfoot></table>
              </div>
              <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
                <h4 className="font-medium text-base text-blue-800 mb-3">Calculation Steps Summary</h4>
                <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                  <li><span className="font-medium">Total Diversified Load:</span> {totalApparentPowerFromLoads.toFixed(1)} kVA (Active: {totalActivePowerFromLoads.toFixed(1)} kW, Reactive: {totalReactivePowerFromLoads.toFixed(1)} kVAR).</li>
                  <li><span className="font-medium">Apply Derating Factors:</span> Harmonic ({(harmonicDeratingFactor*100).toFixed(1)}%), Altitude ({(altitudeDeratingFactor*100).toFixed(1)}%), Temp ({(temperatureDeratingFactor*100).toFixed(1)}%). Overall: {(overallDeratingFactor*100).toFixed(1)}%.</li>
                  <li><span className="font-medium">Capacity after Derating:</span> {totalApparentPowerFromLoads.toFixed(1)} kVA / {overallDeratingFactor.toFixed(3)} = {requiredKVAAfterDerating.toFixed(1)} kVA.</li>
                  <li><span className="font-medium">Add Margins:</span> Redundancy ({transformerConfig.redundancy}%) & Future Expansion ({transformerConfig.futureExpansion}%).</li>
                  <li><span className="font-medium">Final Calculated Capacity:</span> {finalCalculatedKVA.toFixed(1)} kVA.</li>
                  <li><span className="font-medium">Select Standard Size:</span> Next standard size ≥ {finalCalculatedKVA.toFixed(1)} kVA → {recommendedSize} kVA.</li>
                </ol>
              </div>
            </>
          )}
          <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">Transformer Selection Guidance</h4>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
              <li>Rating: <strong className="text-blue-900">{recommendedSize} kVA</strong></li>
              <li>Voltage: <strong className="text-blue-900">{transformerConfig.primaryVoltage}V / {transformerConfig.secondaryVoltage}V</strong></li>
              <li>Connection: <strong className="text-blue-900">{CONNECTION_TYPES.find(type => type.id === transformerConfig.connectionType)?.name || 'N/A'}</strong></li>
              <li>Type: <strong className="text-blue-900">{transformerConfig.type === 'oil' ? 'Oil-filled' : 'Dry-type'}</strong>, K-Factor: <strong className="text-blue-900">K-{transformerConfig.kFactor}</strong></li>
              <li>Impedance: <strong className="text-blue-900">{transformerConfig.impedance}%</strong></li>
              <li>Consider motor starting dip: <strong className="text-blue-900">{motorStartingVoltageDip.toFixed(1)}%</strong>. Ensure protection for peak motor start current (<strong className="text-blue-900">{peakMotorStartingCurrent.toFixed(0)}A Sec</strong>) and transformer energization (<strong className="text-blue-900">{transformerEnergizationInrush.toFixed(0)}A Pri</strong>).</li>
            </ul>
            <p className="text-xs mt-2 text-blue-700">Note: Always verify with standards (IEC, BS, ANSI) and manufacturer's data for final selection.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Load and demand factors are crucial for accurate sizing; use realistic values.</li>
          <li>K-factor transformers are for non-linear loads. Standard transformers derate if K-factor larger than 1.</li>
          <li>Altitude/temperature derating per IEC 60076 or manufacturer data. This calculator uses approximations.</li>
          <li>Motor starting can cause significant voltage dips; verify acceptability.</li>
          <li>Transformer energization inrush (8-12x FLC) impacts primary protection.</li>
          <li>Transformer losses affect operational cost and heat dissipation.</li>
          <li>Always consult relevant standards (e.g., BS 7671, IEC 60364) and manufacturer specifications.</li>
        </ul>
      </div>
    </div>
  );
};

export default TransformerSizingCalculator;