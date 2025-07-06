// Medical Gas Pressure Loss Calculation Utilities
// Interpolation functions for pressure drop calculations

interface DiameterData {
  [distance: number]: {
    [pressureLoss: number]: number; // flow rate in L/min
  };
}

interface InterpolationResult {
  pressureDrop: number;
  details: {
    lowerFlow: number;
    upperFlow: number;
    lowerDistance: number;
    upperDistance: number;
    lowerPressureDrop: number;
    upperPressureDrop: number;
    tableFlowUsed: number;
    tablePressureDropUsed: number;
    tableDistanceUsed: number;
  };
}

/**
 * Interpolates pressure drop from the lookup tables
 * Based on the formula: Δp = (Measured length / Nearest length) × (Design flow / Nearest flow)² × Pressure drop from table
 */
export function interpolateTable(
  diameterData: DiameterData,
  targetLength: number,
  targetFlow: number
): InterpolationResult | null {
  
  // Get available distances and sort them
  const availableDistances = Object.keys(diameterData).map(Number).sort((a, b) => a - b);
  
  if (availableDistances.length === 0) {
    return null;
  }
  
  // Find the closest distances for interpolation
  let lowerDistance = availableDistances[0];
  let upperDistance = availableDistances[availableDistances.length - 1];
  
  for (let i = 0; i < availableDistances.length - 1; i++) {
    if (targetLength >= availableDistances[i] && targetLength <= availableDistances[i + 1]) {
      lowerDistance = availableDistances[i];
      upperDistance = availableDistances[i + 1];
      break;
    }
  }
  
  // If target length is outside the range, use the nearest available distance
  if (targetLength < availableDistances[0]) {
    lowerDistance = upperDistance = availableDistances[0];
  } else if (targetLength > availableDistances[availableDistances.length - 1]) {
    lowerDistance = upperDistance = availableDistances[availableDistances.length - 1];
  }
  
  // Get pressure loss data for the selected distances
  const lowerDistanceData = diameterData[lowerDistance];
  const upperDistanceData = diameterData[upperDistance];
  
  if (!lowerDistanceData || !upperDistanceData) {
    return null;
  }
  
  // Find the appropriate pressure loss values and corresponding flow rates
  const lowerResult = findFlowForDistance(lowerDistanceData, targetFlow);
  const upperResult = findFlowForDistance(upperDistanceData, targetFlow);
  
  if (!lowerResult || !upperResult) {
    return null;
  }
  
  // Calculate pressure drop using the updated interpolation formula with squared flow ratio
  let pressureDrop: number;
  let tableFlowUsed: number;
  let tablePressureDropUsed: number;
  let tableDistanceUsed: number;
  
  if (lowerDistance === upperDistance) {
    // No distance interpolation needed
    tableDistanceUsed = lowerDistance;
    tableFlowUsed = lowerResult.nearestFlow;
    tablePressureDropUsed = lowerResult.pressureLoss;
    
    pressureDrop = (targetLength / lowerDistance) * 
                  Math.pow(targetFlow / lowerResult.nearestFlow, 2) * 
                  lowerResult.pressureLoss;
  } else {
    // Interpolate between distances
    const lowerPressureDrop = (targetLength / lowerDistance) * 
                             Math.pow(targetFlow / lowerResult.nearestFlow, 2) * 
                             lowerResult.pressureLoss;
    
    const upperPressureDrop = (targetLength / upperDistance) * 
                             Math.pow(targetFlow / upperResult.nearestFlow, 2) * 
                             upperResult.pressureLoss;
    
    // Linear interpolation between distances
    const distanceRatio = (targetLength - lowerDistance) / (upperDistance - lowerDistance);
    
    // Use the closer distance's values for table reference
    if (distanceRatio < 0.5) {
      tableDistanceUsed = lowerDistance;
      tableFlowUsed = lowerResult.nearestFlow;
      tablePressureDropUsed = lowerResult.pressureLoss;
    } else {
      tableDistanceUsed = upperDistance;
      tableFlowUsed = upperResult.nearestFlow;
      tablePressureDropUsed = upperResult.pressureLoss;
    }
  }

  pressureDrop = (targetLength / tableDistanceUsed) * Math.pow((targetFlow / tableFlowUsed), 2) * tablePressureDropUsed;
  
  return {
    pressureDrop,
    details: {
      lowerFlow: lowerResult.nearestFlow,
      upperFlow: upperResult.nearestFlow,
      lowerDistance,
      upperDistance,
      lowerPressureDrop: lowerResult.pressureLoss,
      upperPressureDrop: upperResult.pressureLoss,
      tableFlowUsed,
      tablePressureDropUsed,
      tableDistanceUsed
    }
  };
}

/**
 * Finds the appropriate flow rate and pressure loss for a given target flow
 */
function findFlowForDistance(
  distanceData: { [pressureLoss: number]: number },
  targetFlow: number
): { nearestFlow: number; pressureLoss: number } | null {
  
  // Get available pressure losses and sort them
  const pressureLosses = Object.keys(distanceData).map(Number).sort((a, b) => a - b);
  
  if (pressureLosses.length === 0) {
    return null;
  }
  
  // Find the pressure loss that gives the closest flow rate to our target
  let bestMatch = { nearestFlow: 0, pressureLoss: 0 };
  let minDifference = Infinity;
  
  for (const pressureLoss of pressureLosses) {
    const flowRate = distanceData[pressureLoss];
    if (flowRate > 0) { // Only consider non-zero flow rates
      const difference = Math.abs(flowRate - targetFlow);
      if (difference < minDifference) {
        minDifference = difference;
        bestMatch = { nearestFlow: flowRate, pressureLoss };
      }
    }
  }
  
  // If we couldn't find a good match, try to interpolate between pressure losses
  if (bestMatch.nearestFlow === 0) {
    // Find two pressure losses that bracket our target flow
    for (let i = 0; i < pressureLosses.length - 1; i++) {
      const lowerPressureLoss = pressureLosses[i];
      const upperPressureLoss = pressureLosses[i + 1];
      const lowerFlow = distanceData[lowerPressureLoss];
      const upperFlow = distanceData[upperPressureLoss];
      
      if (lowerFlow > 0 && upperFlow > 0 && 
          ((lowerFlow <= targetFlow && targetFlow <= upperFlow) ||
           (upperFlow <= targetFlow && targetFlow <= lowerFlow))) {
        
        // Interpolate between the two pressure losses
        const flowRatio = (targetFlow - lowerFlow) / (upperFlow - lowerFlow);
        const interpolatedPressureLoss = lowerPressureLoss + flowRatio * (upperPressureLoss - lowerPressureLoss);
        
        return { nearestFlow: targetFlow, pressureLoss: interpolatedPressureLoss };
      }
    }
  }
  
  return bestMatch.nearestFlow > 0 ? bestMatch : null;
}

/**
 * Validates if the given parameters are within the table ranges
 */
export function validateParameters(
  diameter: number,
  length: number,
  flowRate: number,
  pressure: number
): { isValid: boolean; warnings: string[] } {
  
  const warnings: string[] = [];
  
  // Check diameter
  const validDiameters = [12, 15, 22, 28, 35, 42, 54, 76, 108];
  if (!validDiameters.includes(diameter)) {
    warnings.push(`Diameter ${diameter}mm is not in standard sizes. Use nearest standard size.`);
  }
  
  // Check length range
  if (length < 8) {
    warnings.push('Pipe length is less than minimum table range (8m). Results may be less accurate.');
  } else if (length > 457) {
    warnings.push('Pipe length exceeds maximum table range (457m). Consider using additional factors.');
  }
  
  // Check flow rate range
  if (flowRate < 30) {
    warnings.push('Flow rate is very low. Verify minimum flow requirements.');
  } else if (flowRate > 50000) {
    warnings.push('Flow rate is very high. Verify system requirements and consider multiple pipes.');
  }
  
  // Check pressure range
  if (pressure > 59 && pressure < 400) {
    warnings.push('Pressure is between vacuum and 400 kPa ranges. Verify which table to use.');
  } else if (pressure > 1100) {
    warnings.push('Pressure exceeds maximum table range (1100 kPa). Consider higher pressure tables or custom calculations.');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Calculates design recommendations based on the results
 */
export function getDesignRecommendations(
  pressureDrop: number,
  velocity: number,
  systemPressure: number
): { recommendations: string[]; criticalIssues: string[] } {
  
  const recommendations: string[] = [];
  const criticalIssues: string[] = [];
  
  // Pressure drop recommendations
  const pressureDropPercentage = (pressureDrop / systemPressure) * 100;
  
  if (pressureDropPercentage > 10) {
    criticalIssues.push(`Pressure drop is ${pressureDropPercentage.toFixed(1)}% of system pressure. This is excessive and may affect performance.`);
    recommendations.push('Consider increasing pipe diameter or reducing length.');
  } else if (pressureDropPercentage > 5) {
    recommendations.push(`Pressure drop is ${pressureDropPercentage.toFixed(1)}% of system pressure. Consider if this is acceptable for your application.`);
  }
  
  // Velocity recommendations (approximate, based on typical design velocities)
  if (velocity > 15) { // m/s
    criticalIssues.push('Velocity is very high (>15 m/s). This may cause noise and excessive pressure drop.');
    recommendations.push('Increase pipe diameter to reduce velocity.');
  } else if (velocity > 10) {
    recommendations.push('Velocity is high (>10 m/s). Consider increasing pipe diameter for quieter operation.');
  } else if (velocity < 1) {
    recommendations.push('Velocity is very low (<1 m/s). Verify this meets minimum flow requirements.');
  }
  
  // General design recommendations
  recommendations.push('Add 25-30% to calculated pressure drop for conservative design.');
  recommendations.push('Consider pressure drops through additional system components (filters, regulators, etc.).');
  recommendations.push('Verify compliance with relevant medical gas standards (ISO 7396, HTM 02-01).');
  
  return { recommendations, criticalIssues };
}

/**
 * Converts between different units commonly used in medical gas systems
 */
export const UnitConversions = {
  // Pressure conversions
  kPaToBar: (kPa: number) => kPa / 100,
  kPaToPsi: (kPa: number) => kPa * 0.145038,
  kPaToMmHg: (kPa: number) => kPa * 7.50062,
  kPaToInchWg: (kPa: number) => kPa * 0.401463,
  
  barToKPa: (bar: number) => bar * 100,
  psiToKPa: (psi: number) => psi / 0.145038,
  mmHgToKPa: (mmHg: number) => mmHg / 7.50062,
  inchWgToKPa: (inchWg: number) => inchWg / 0.401463,
  
  // Flow conversions
  lMinToM3Hr: (lMin: number) => lMin * 0.06,
  lMinToM3S: (lMin: number) => lMin / 60000,
  m3HrToLMin: (m3Hr: number) => m3Hr / 0.06,
  m3SToLMin: (m3S: number) => m3S * 60000,
  
  // Length conversions
  mToFt: (m: number) => m * 3.28084,
  ftToM: (ft: number) => ft / 3.28084,
  mToMm: (m: number) => m * 1000,
  mmToM: (mm: number) => mm / 1000
};