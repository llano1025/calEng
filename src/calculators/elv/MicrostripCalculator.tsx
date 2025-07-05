import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface MicrostripCalculatorProps {
  onShowTutorial?: () => void;
}

// PCB substrate material interface
interface SubstrateMaterial {
  id: string;
  name: string;
  dielectricConstant: number; // εr
  lossTangent: number;        // tan δ
  conductivity?: number;      // S/m (optional for some materials)
}

// Parameter for calculation method selection
type CalculationMode = 'impedance' | 'dimensions';

// Helper function for core microstrip calculations
const calculateMicrostripCoreParams = (
  width_param: number,
  h_param: number,
  t_param: number,
  er_param: number
) => {
  if (width_param <= 0 || h_param <= 0 || t_param <= 0 || er_param <=0) {
    return { impedance: NaN, effective_er: NaN, w_eff: NaN, w_h_ratio_eff: NaN };
  }

  const arg_for_log_w_eff = (4 * Math.PI * width_param) / t_param;
  if (arg_for_log_w_eff <= 0) {
      return { impedance: NaN, effective_er: NaN, w_eff: NaN, w_h_ratio_eff: NaN };
  }
  const w_eff_calc = width_param + (t_param / Math.PI) * (1.0 + Math.log(arg_for_log_w_eff));
  
  if (w_eff_calc <= 0) {
      return { impedance: NaN, effective_er: NaN, w_eff: NaN, w_h_ratio_eff: NaN };
  }

  const w_h_ratio_eff_calc = w_eff_calc / h_param;

  let current_effective_er: number;
  if (w_h_ratio_eff_calc < 1) {
    current_effective_er = (er_param + 1) / 2 + ((er_param - 1) / 2) * (
      (1 / Math.sqrt(1 + 12 / w_h_ratio_eff_calc)) + 0.04 * Math.pow(1 - w_h_ratio_eff_calc, 2)
    );
  } else {
    current_effective_er = (er_param + 1) / 2 + ((er_param - 1) / 2) * (1 / Math.sqrt(1 + 12 / w_h_ratio_eff_calc));
  }

  // Ensure effective_er is not less than 1 (can happen with extreme formula inputs)
  if (current_effective_er < 1 && er_param >=1) current_effective_er = 1;
  // And not more than er_param
  if (current_effective_er > er_param && er_param >=1) current_effective_er = er_param;


  let current_impedance: number;
  if (w_h_ratio_eff_calc < 1) {
    current_impedance = (60 / Math.sqrt(current_effective_er)) * Math.log(8 * h_param / w_eff_calc + 0.25 * w_eff_calc / h_param);
  } else {
    current_impedance = (120 * Math.PI) / (Math.sqrt(current_effective_er) * (w_h_ratio_eff_calc + 1.393 + 0.667 * Math.log(w_h_ratio_eff_calc + 1.444)));
  }
  
  return { impedance: current_impedance, effective_er: current_effective_er, w_eff: w_eff_calc, w_h_ratio_eff: w_h_ratio_eff_calc };
};


// Main calculator component
const MicrostripCalculator: React.FC<MicrostripCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'RF Microstrip Line Calculator',
    discipline: 'elv',
    calculatorType: 'microstrip'
  });

  // Substrate parameters
  const [substrateHeight, setSubstrateHeight] = useState<number>(1.6); // mm
  const [substrateThickness, setSubstrateThickness] = useState<number>(0.035); // mm (copper thickness)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('fr4');
  const [customDielectricConstant, setCustomDielectricConstant] = useState<number>(4.4);
  const [customLossTangent, setCustomLossTangent] = useState<number>(0.02);
  const [useCustomMaterial, setUseCustomMaterial] = useState<boolean>(false);
  
  // Microstrip parameters
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('impedance');
  const [frequency, setFrequency] = useState<number>(1000); // MHz
  const [targetImpedance, setTargetImpedance] = useState<number>(50); // Ohms
  const [stripWidth, setStripWidth] = useState<number>(3); // mm
  const [stripLength, setStripLength] = useState<number>(10); // mm
  
  // Advanced parameters
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(25); // °C
  const [roughness, setRoughness] = useState<number>(0.0015); // mm (RMS roughness)
  
  // Calculation results
  const [results, setResults] = useState<{
    impedance: number;
    effectiveDielectricConstant: number;
    wavelength: number;
    electricalLength: number;
    phaseLengthDeg: number;
    conductorLoss: number;
    dielectricLoss: number;
    totalLoss: number;
    propagationDelay: number;
    calculatedWidth?: number;
    calculatedLength?: number;
  } | null>(null);
  
  // Substrate material options
  const substrateMaterials: SubstrateMaterial[] = [
    { id: 'fr4', name: 'FR-4', dielectricConstant: 4.4, lossTangent: 0.02 },
    { id: 'rogers4350b', name: 'Rogers 4350B', dielectricConstant: 3.48, lossTangent: 0.0037 },
    { id: 'rogers5880', name: 'Rogers RT/duroid 5880', dielectricConstant: 2.2, lossTangent: 0.0009 },
    { id: 'alumina', name: 'Alumina (Al₂O₃)', dielectricConstant: 9.8, lossTangent: 0.0001 },
    { id: 'rogers3003', name: 'Rogers RO3003', dielectricConstant: 3.0, lossTangent: 0.0013 },
    { id: 'rogers3006', name: 'Rogers RO3006', dielectricConstant: 6.15, lossTangent: 0.0025 },
    { id: 'rogers3010', name: 'Rogers RO3010', dielectricConstant: 10.2, lossTangent: 0.0035 },
    { id: 'custom', name: 'Custom Material', dielectricConstant: 0, lossTangent: 0 } // Placeholder for custom
  ];
  
  // Get the current substrate material
  const getCurrentMaterial = (): SubstrateMaterial => {
    if (useCustomMaterial) {
      return {
        id: 'custom',
        name: 'Custom Material',
        dielectricConstant: customDielectricConstant,
        lossTangent: customLossTangent
      };
    }
    const selectedMaterial = substrateMaterials.find(m => m.id === selectedMaterialId);
    return selectedMaterial || substrateMaterials.find(m => m.id === 'fr4')!; // Fallback to FR-4
  };
  
  // Handle material selection change
  const handleMaterialChange = (materialId: string) => {
    if (materialId === 'custom') {
      setUseCustomMaterial(true);
      if (customDielectricConstant === 0 && customLossTangent === 0) { // Only init if both are "default" 0
        const fr4 = substrateMaterials.find(m => m.id === 'fr4')!;
        setCustomDielectricConstant(fr4.dielectricConstant);
        setCustomLossTangent(fr4.lossTangent);
      }
    } else {
      setUseCustomMaterial(false);
      setSelectedMaterialId(materialId);
    }
  };
  
  // Calculation function for microstrip parameters
  useEffect(() => {
    calculateMicrostrip();
  }, [
    calculationMode,
    substrateHeight, 
    substrateThickness, 
    selectedMaterialId, 
    useCustomMaterial,
    customDielectricConstant,
    customLossTangent,
    frequency,
    targetImpedance,
    stripWidth,
    stripLength,
    temperature,
    roughness
  ]);
  
  const calculateMicrostrip = () => {
    const material = getCurrentMaterial();
    const er = material.dielectricConstant;
    const tanDelta = material.lossTangent;
    const h = substrateHeight; // mm
    const t = substrateThickness; // mm
    const f_mhz = frequency; // MHz
    const w_input = stripWidth; // mm, input strip width from UI

    if (h <= 0 || er <= 0 || f_mhz <= 0 || t <= 0) {
      setResults(null);
      return; 
    }
    
    const freq_hz = f_mhz * 1e6;
    
    let Z0_final: number;
    let er_eff_final: number;
    let w_eff_final_val: number; 
    let w_h_ratio_for_loss_formula: number;
    let current_physical_width: number;
    let calculatedWidth_val: number | undefined = undefined;

    if (calculationMode === 'dimensions') {
      if (w_input <= 0) {
        setResults(null);
        return;
      }
      const coreParams = calculateMicrostripCoreParams(w_input, h, t, er);
      Z0_final = coreParams.impedance;
      er_eff_final = coreParams.effective_er;
      w_eff_final_val = coreParams.w_eff;
      w_h_ratio_for_loss_formula = coreParams.w_h_ratio_eff;
      current_physical_width = w_input;
    } else { // calculationMode === 'impedance'
      if (targetImpedance <= 0) {
        setResults(null);
        return;
      }
      let min_w = 0.001 * h; // Smallest practical width
      let max_w = 100 * h;  // Largest practical width
      
      // Perform a quick check if boundaries give impedances that bracket the target
      const params_at_min_w = calculateMicrostripCoreParams(min_w, h, t, er);
      const params_at_max_w = calculateMicrostripCoreParams(max_w, h, t, er);

      if (!isNaN(params_at_min_w.impedance) && !isNaN(params_at_max_w.impedance)) {
        // Standard case: target is bracketed or outside in a searchable way
         if ((params_at_min_w.impedance < targetImpedance && params_at_max_w.impedance < targetImpedance && params_at_min_w.impedance > params_at_max_w.impedance) || // Both too low, Z decreases with W
             (params_at_min_w.impedance > targetImpedance && params_at_max_w.impedance > targetImpedance && params_at_min_w.impedance < params_at_max_w.impedance)    // Both too high, Z increases with W (should not happen for microstrip)
         ) {
            // Target impedance might be unachievable with these material parameters / bounds
            // Or bounds are swapped (impedance increases with width, not typical for microstrip W)
             setResults(null); // Cannot find width
             return;
         }
      }


      let current_w_iter = (min_w + max_w) / 2;
      let Z0_iter = NaN;
      let er_eff_iter_val = NaN; // er_eff corresponding to current_w_iter

      const max_iterations = 50;
      const tolerance = 0.01; // Ohms
      let iterations = 0;

      for (iterations = 0; iterations < max_iterations; iterations++) {
          const coreParams = calculateMicrostripCoreParams(current_w_iter, h, t, er);
          if (isNaN(coreParams.impedance) || isNaN(coreParams.effective_er)) {
              Z0_iter = NaN; // Signal error
              break;
          }
          Z0_iter = coreParams.impedance;
          er_eff_iter_val = coreParams.effective_er;

          if (Math.abs(Z0_iter - targetImpedance) < tolerance) {
              break; // Converged
          }

          if (Z0_iter > targetImpedance) { // Impedance too high, need wider strip
              min_w = current_w_iter;
          } else { // Impedance too low, need narrower strip
              max_w = current_w_iter;
          }
          
          if (max_w - min_w < 1e-7) break; // Width interval too small
          current_w_iter = (min_w + max_w) / 2;
          if (current_w_iter <=0) break; // safety for width becoming non-positive
      }
      
      calculatedWidth_val = current_w_iter;
      // Use the impedance and er_eff from the last successful iteration, or re-calculate if preferred
      // Re-calculating with the final current_w_iter ensures values are perfectly aligned
      const finalIterParams = calculateMicrostripCoreParams(calculatedWidth_val, h, t, er);
      Z0_final = finalIterParams.impedance;
      er_eff_final = finalIterParams.effective_er;
      w_eff_final_val = finalIterParams.w_eff;
      w_h_ratio_for_loss_formula = finalIterParams.w_h_ratio_eff;
      current_physical_width = calculatedWidth_val;
    }
    
    if (isNaN(Z0_final) || isNaN(er_eff_final) || current_physical_width <= 0 || w_eff_final_val <=0) {
      setResults(null);
      return;
    }
        
    const c0 = 299792458; // speed of light in m/s
    const wavelength_m = c0 / (freq_hz * Math.sqrt(er_eff_final));
    const wavelength_mm = wavelength_m * 1000;
    
    const electrical_length_rad = (stripLength / wavelength_mm) * 2 * Math.PI;
    const phase_length_deg = electrical_length_rad * (180 / Math.PI);
    
    const propagation_delay_s_per_m = Math.sqrt(er_eff_final) / c0;
    const propagation_delay_ns = (stripLength / 1000) * propagation_delay_s_per_m * 1e9;

    // Losses
    const mu0 = 4 * Math.PI * 1e-7; // H/m
    const sigma_conductor = 5.8e7; // S/m (copper)
    const skin_depth_m = Math.sqrt(2 / (2 * Math.PI * freq_hz * mu0 * sigma_conductor));
    const Rs_ohm_per_sq = 1 / (skin_depth_m * sigma_conductor);
    
    const roughness_factor = 1 + (2/Math.PI) * Math.atan(1.4 * Math.pow((roughness/(skin_depth_m*1000)), 2)); // roughness is in mm
    const Rs_rough_ohm_per_sq = Rs_ohm_per_sq * roughness_factor;
    
    let conductor_loss_db_per_m;
    // Note: w_h_ratio_for_loss_formula is w_eff_final / h
    // current_physical_width is in mm. Z0_final in Ohms. Rs_rough in Ohms/sq. h, t in mm.
    // For consistency, convert dimensions to meters for this formula part or ensure units cancel.
    // The formulas often expect W, H in same units.
    // Simplified formula for Ac in dB/length: 8.686 * Rs / (W * Z0) (for W/H >> 1)
    // More complete formulas often have complex geometric factors.
    // Using the structure from original code, with current_physical_width in mm.
    // Rs_rough is resistance per square. To get R per unit length, it's Rs_rough / W_m.
    // Loss dB/m = 8.686 * (Rs_rough / W_m) / (2 * Z0) -- this factor of 2 is sometimes debated or part of K.
    // Or: Loss dB/m = K * 8.686 * Rs_rough / (current_physical_width_m * Z0_final)
    // The original formula was dB/mm, using W in mm.
    // (Rs_rough / (Z0 * W_mm)) * 8.686 where Rs_rough is Ohm/sq. This implies Rs_rough is being treated as Ohms/mm effectively.
    // This means Rs_rough should be Rs_rough_ohm_per_sq * (some length factor, often 1/mm or 1/m).
    // If Rs_rough is in ohms/square, conductor_loss = 8.686 * Rs_rough / (W_m * Z0) for wide strip.
    // Let's use Rs_rough (ohms/sq) and Z0 (ohms) and width_m. This results in dB/m.
    const current_physical_width_m = current_physical_width / 1000;
    const h_m = h / 1000;
    const t_m = t / 1000;

    if (w_h_ratio_for_loss_formula < 1) { // This is w_eff/h
      conductor_loss_db_per_m = (Rs_rough_ohm_per_sq / (Z0_final * current_physical_width_m)) * 8.686 ;
    } else {
      conductor_loss_db_per_m = (Rs_rough_ohm_per_sq / (Z0_final * current_physical_width_m)) * 8.686 * (1 + (h_m/current_physical_width_m) * (1 + 1.25/Math.PI * Math.log(2*h_m/t_m)));
    }
    
    const temp_factor = 1 + 0.00393 * (temperature - 25); // Copper resistivity tempco approx 0.00393/°C
    conductor_loss_db_per_m *= temp_factor;
    const conductor_loss_db_per_mm = conductor_loss_db_per_m / 1000;
    
    // Dielectric loss (dB/mm)
    // Original: 27.3 * er * tanDelta * (effective_er / (er * Math.sqrt(effective_er))) * (freq_hz / 1e9) / 1000;
    // This simplifies to: 0.0273 * tanDelta * Math.sqrt(er_eff_final) * (freq_hz / 1e9) dB/mm
    // A common formula for dielectric loss in dB/m is:
    // Alpha_d (dB/m) = 27.3 * (er / sqrt(er_eff_final)) * ((er_eff_final - 1)/(er - 1)) * tanDelta * (freq_hz / 1e9)
    // This is approx. 27.3 * sqrt(er_eff_final) * tanDelta * f_GHz if er_eff approx er.
    // Let's use the original code's formulation for dielectric loss for consistency with its source.
    let dielectric_loss_db_per_mm;
    if (tanDelta > 0) { // Avoid issues if tanDelta is zero or not set
        dielectric_loss_db_per_mm = 27.3 * er * tanDelta * (er_eff_final / (er * Math.sqrt(er_eff_final))) * (freq_hz / 1e9) / 1000;
        if (er_eff_final <=0 || er <=0) dielectric_loss_db_per_mm = 0; // Safety for sqrt
    } else {
        dielectric_loss_db_per_mm = 0;
    }


    const total_loss_db_per_mm = conductor_loss_db_per_mm + dielectric_loss_db_per_mm;
    
    let calculatedLength_val: number | undefined;
    if (calculationMode === 'impedance') {
      calculatedLength_val = wavelength_mm / 4;
    }
    
    const calculatedResults = {
      impedance: Z0_final,
      effectiveDielectricConstant: er_eff_final,
      wavelength: wavelength_mm,
      electricalLength: electrical_length_rad,
      phaseLengthDeg: phase_length_deg,
      conductorLoss: isNaN(conductor_loss_db_per_mm) ? NaN : conductor_loss_db_per_mm * stripLength,
      dielectricLoss: isNaN(dielectric_loss_db_per_mm) ? NaN : dielectric_loss_db_per_mm * stripLength,
      totalLoss: isNaN(total_loss_db_per_mm) ? NaN : total_loss_db_per_mm * stripLength,
      propagationDelay: propagation_delay_ns,
      calculatedWidth: calculatedWidth_val,
      calculatedLength: calculatedLength_val
    };
    
    setResults(calculatedResults);
    
    // Save calculation and prepare export data
    const inputs = {
      substrateHeight,
      substrateThickness,
      selectedMaterialId,
      customDielectricConstant,
      customLossTangent,
      useCustomMaterial,
      calculationMode,
      frequency,
      targetImpedance,
      stripWidth,
      stripLength,
      temperature,
      roughness
    };
    
    saveCalculation(inputs, calculatedResults);
    prepareExportData(inputs, calculatedResults);
  };
  
  return (
    <CalculatorWrapper
      title="RF Microstrip Line Calculator"
      discipline="elv"
      calculatorType="microstrip"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          {/* Calculation Mode Selection */}
          <div className="mb-4">
            <h3 className="font-medium text-lg mb-3 text-gray-700">Calculation Mode</h3>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  checked={calculationMode === 'impedance'} 
                  onChange={() => setCalculationMode('impedance')}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Calculate Width for Target Impedance</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  checked={calculationMode === 'dimensions'} 
                  onChange={() => setCalculationMode('dimensions')}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Calculate Impedance for Given Width</span>
              </label>
            </div>
          </div>
          
          {/* Substrate Parameters */}
          <div className="mb-6">
            <h3 className="font-medium text-lg mb-3 text-gray-700">Substrate Parameters</h3>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <select 
                value={useCustomMaterial ? 'custom' : selectedMaterialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {substrateMaterials.filter(m => m.id !== 'custom').map(material => (
                  <option key={material.id} value={material.id}>
                    {material.name} (εr={material.dielectricConstant.toFixed(2)}, tanδ={material.lossTangent.toFixed(4)})
                  </option>
                ))}
                <option value="custom">Custom Material</option>
              </select>
            </div>
            
            {useCustomMaterial && (
              <div className="mb-3 pl-4 border-l-4 border-blue-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dielectric Constant (εr)
                    </label>
                    <input 
                      type="number" 
                      value={customDielectricConstant} 
                      onChange={(e) => setCustomDielectricConstant(Number(e.target.value))} 
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                      step="0.01"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loss Tangent (tanδ)
                    </label>
                    <input 
                      type="number" 
                      value={customLossTangent} 
                      onChange={(e) => setCustomLossTangent(Number(e.target.value))} 
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                      step="0.0001"
                      min="0"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter values for your custom substrate. Typical εr ranges from 2.1 to 10.2 for RF PCB materials.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Substrate Height (h) [mm]</label>
                <input 
                  type="number" 
                  value={substrateHeight} 
                  onChange={(e) => setSubstrateHeight(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  step="0.01"
                  min="0.01" // Min height typically >0
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Copper Thickness (t) [mm]</label>
                <input 
                  type="number" 
                  value={substrateThickness} 
                  onChange={(e) => setSubstrateThickness(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  step="0.001"
                  min="0.001"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Standard values: 1oz=0.035mm, 2oz=0.07mm
                </p>
              </div>
            </div>
          </div>
          
          {/* Microstrip Line Parameters */}
          <div className="mb-6">
            <h3 className="font-medium text-lg mb-3 text-gray-700">Line Parameters</h3>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency [MHz]</label>
              <input 
                type="number" 
                value={frequency} 
                onChange={(e) => setFrequency(Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="1"
                min="1"
              />
            </div>
            
            {calculationMode === 'impedance' ? (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Impedance [Ω]</label>
                <input 
                  type="number" 
                  value={targetImpedance} 
                  onChange={(e) => setTargetImpedance(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  step="0.1"
                  min="10" // Practical min for Z0
                  max="200" // Practical max for Z0
                />
                <p className="text-xs text-gray-500 mt-1">
                  Common values: 50Ω for systems, 75Ω for video/cable, 100Ω for differential pairs
                </p>
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Trace Width (w) [mm]</label>
                <input 
                  type="number" 
                  value={stripWidth} 
                  onChange={(e) => setStripWidth(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  step="0.01"
                  min="0.01" // Min width typically >0
                />
              </div>
            )}
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trace Length [mm]</label>
              <input 
                type="number" 
                value={stripLength} 
                onChange={(e) => setStripLength(Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
          
          {/* Advanced Parameters (Collapsible) */}
          <div className="mb-4">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Parameters</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 ml-1 transition-transform duration-200 ${showAdvanced ? 'transform rotate-180' : ''}`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showAdvanced && (
              <div className="mt-3 pl-4 border-l-4 border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature [°C]</label>
                    <input 
                      type="number" 
                      value={temperature} 
                      onChange={(e) => setTemperature(Number(e.target.value))} 
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                      step="1"
                      min="-55" // Typical industrial/mil range
                      max="125"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surface Roughness [mm]</label>
                    <input 
                      type="number" 
                      value={roughness} 
                      onChange={(e) => setRoughness(Number(e.target.value))} 
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                      step="0.0001"
                      min="0" // RMS roughness can be 0 for ideal smooth
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Standard values: smooth=0.0005mm, standard=0.0015mm
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
          
          {results === null && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
              <p className="font-bold">Input Error or Unachievable Parameters</p>
              <p>Please check your input values. The desired parameters might be unachievable with the current settings, or some inputs might be invalid (e.g., zero or negative dimensions).</p>
            </div>
          )}

          {/* Microstrip Visualization */}
          {results && (
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
              <h4 className="font-medium text-base text-gray-700 mb-3">Microstrip Line Structure</h4>
              <div className="w-full h-40 relative bg-gray-100 border border-gray-300 rounded overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
                  <rect x="50" y="110" width="300" height="10" fill="#B87333" />
                  <rect x="50" y="50" width="300" height="60" fill={useCustomMaterial ? "#E6F2FF" : "#D1E8E2"} />
                  
                  {(() => {
                      let display_w_for_svg_unscaled: number;
                      if (calculationMode === 'impedance' && results.calculatedWidth !== undefined) {
                          display_w_for_svg_unscaled = results.calculatedWidth;
                      } else {
                          display_w_for_svg_unscaled = stripWidth;
                      }
                      // Ensure substrateHeight is positive to prevent division by zero or NaN
                      const svg_rect_width_scaled = substrateHeight > 0 
                          ? Math.min(300, Math.max(10, (display_w_for_svg_unscaled / substrateHeight) * 100))
                          : 50; // Default width if substrateHeight is invalid

                      return (
                          <rect 
                              x={50 + (300 - svg_rect_width_scaled) / 2}
                              y="40" 
                              width={svg_rect_width_scaled}
                              height="10" 
                              fill="#B87333" 
                              className="transition-all duration-300 ease-in-out"
                          />
                      );
                  })()}
                  
                  <line x1="40" y1="40" x2="40" y2="120" stroke="#555" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="40" y1="40" x2="30" y2="40" stroke="#555" strokeWidth="1" />
                  <line x1="40" y1="50" x2="30" y2="50" stroke="#555" strokeWidth="1" />
                  <line x1="40" y1="110" x2="30" y2="110" stroke="#555" strokeWidth="1" />
                  <line x1="40" y1="120" x2="30" y2="120" stroke="#555" strokeWidth="1" />
                  <text x="20" y="45" fontSize="10" textAnchor="end" fill="#555">t</text>
                  <text x="20" y="80" fontSize="10" textAnchor="end" fill="#555">h</text>
                  <text x="20" y="115" fontSize="10" textAnchor="end" fill="#555">t</text> {/*This label is for ground thickness, typically not 't'*/}
                  <text x="35" y="75" fontSize="10" transform="rotate(-90, 35, 75)" textAnchor="middle" fill="#555">Substrate (εr)</text>
                  
                  {(() => {
                      let display_w_for_svg_unscaled: number;
                      if (calculationMode === 'impedance' && results.calculatedWidth !== undefined) {
                          display_w_for_svg_unscaled = results.calculatedWidth;
                      } else {
                          display_w_for_svg_unscaled = stripWidth;
                      }
                      const svg_rect_width_scaled = substrateHeight > 0
                          ? Math.min(300, Math.max(10, (display_w_for_svg_unscaled / substrateHeight) * 100))
                          : 50;
                      return (
                          <>
                              <line x1={50 + (300 - svg_rect_width_scaled) / 2} y1="30" x2={50 + (300 - svg_rect_width_scaled) / 2 + svg_rect_width_scaled} y2="30" stroke="#555" strokeWidth="1" />
                              <text x={50 + (300 - svg_rect_width_scaled) / 2 + svg_rect_width_scaled / 2} y="25" fontSize="10" textAnchor="middle" fill="#555">w</text>
                          </>
                      );
                  })()}
                </svg>
              </div>
              <div className="text-xs text-center text-gray-500 mt-1">Cross-section view (not to scale)</div>
            </div>
          )}
          
          {/* Primary Results */}
          {results && (
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-base text-gray-700">Geometry & Impedance</h4>
                  
                  {calculationMode === 'impedance' && results.calculatedWidth !== undefined && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Required Width (w):</p>
                      <p className="font-bold text-lg text-blue-600">{results.calculatedWidth.toFixed(3)} mm</p>
                    </div>
                  )}
                  
                  {results.calculatedLength !== undefined && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Quarter-Wave Length (λ/4):</p>
                      <p className="font-semibold text-gray-800">{results.calculatedLength.toFixed(3)} mm</p>
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Impedance (Z₀):</p>
                    <p className={`font-semibold ${calculationMode === 'dimensions' ? 'text-blue-600 font-bold text-lg' : 'text-gray-800'}`}>
                      {results.impedance.toFixed(2)} Ω
                    </p>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Effective Dielectric Constant (εᵣₑ):</p>
                    <p className="font-semibold text-gray-800">{results.effectiveDielectricConstant.toFixed(3)}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-base text-gray-700">Electrical Properties</h4>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Wavelength at {frequency} MHz:</p>
                    <p className="font-semibold text-gray-800">{results.wavelength.toFixed(2)} mm</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Electrical Length ({stripLength} mm):</p>
                    <p className="font-semibold text-gray-800">{results.phaseLengthDeg.toFixed(1)}° ({results.electricalLength.toFixed(3)} rad)</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Propagation Delay ({stripLength} mm):</p>
                    <p className="font-semibold text-gray-800">{results.propagationDelay.toFixed(3)} ns</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Loss Calculation Results */}
          {results && (
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
              <h4 className="font-medium text-base text-gray-700 mb-2">Loss Calculation (for {stripLength} mm length)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <p className="text-sm text-gray-600">Conductor Loss:</p>
                  <p className="font-semibold text-gray-800">{isNaN(results.conductorLoss) ? "N/A" : results.conductorLoss.toFixed(3) + " dB"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dielectric Loss:</p>
                  <p className="font-semibold text-gray-800">{isNaN(results.dielectricLoss) ? "N/A" : results.dielectricLoss.toFixed(3) + " dB"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Loss:</p>
                  <p className="font-bold text-blue-600">{isNaN(results.totalLoss) ? "N/A" : results.totalLoss.toFixed(3) + " dB"}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Design Considerations */}
          {results && (
            <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
              <h4 className="font-medium mb-2 text-blue-700">Design Considerations</h4>
              <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
                <li>For {frequency >= 1000 ? 'high' : 'low'} frequency design ({frequency} MHz), keep trace length as short as possible to minimize losses. Total loss for {stripLength}mm is {isNaN(results.totalLoss) ? "N/A" : results.totalLoss.toFixed(3) + " dB"}.</li>
                <li>Ensure minimum trace width (calculated: {results.calculatedWidth ? results.calculatedWidth.toFixed(3) + " mm" : "N/A for current mode"}) is compatible with your PCB fabrication capabilities.</li>
                <li>For impedance-controlled PCBs, specify {targetImpedance}Ω (typically ±10%) to manufacturer. Current calculated impedance is {results.impedance.toFixed(2)}Ω.</li>
                <li>Consider adding test coupons for impedance verification.</li>
                {results.calculatedLength && <li>Quarter-wave sections ({results.calculatedLength.toFixed(2)} mm at {frequency} MHz) can be used for impedance matching networks.</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Calculations use quasi-static TEM approximations, generally valid for typical PCB geometries up to several GHz.</li>
          <li>Loss calculations are approximations; conductor loss includes skin effect and a model for surface roughness. Temperature effects on conductor resistivity are approximated.</li>
          <li>For very thin substrates, very high frequencies ( 10-20 GHz), or high dielectric constants, dispersion effects (frequency dependency of εᵣₑ and Z₀) become more significant and may require more advanced models.</li>
          <li>This calculator analyzes a single, isolated microstrip line. Edge-coupled microstrips and other coupled-line effects are not considered.</li>
          <li>Losses from via transitions, connector interfaces, and radiation are not included.</li>
          <li>The accuracy of the results depends on the accuracy of the input parameters (especially substrate properties like εr and tanδ, which can vary with frequency and manufacturing tolerances).</li>
        </ul>
      </div>
      </div>
    </CalculatorWrapper>
  );
};

export default MicrostripCalculator;