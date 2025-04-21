import React, { useState } from 'react';

interface LightingControlCalculatorProps {
  // No specific props needed unless we want to share state with parent
}

// Table data from the image - Minimum number of lighting control points per area
// The formula table from BEC Table 5.5 will be used instead of a lookup table:
// For 0 < N ≤ 10:   15×(N-1) < A ≤ 15×N
// For 10 < N ≤ 20:  30×(N-6) < A ≤ 30×(N-5)
// For N > 20:       50×(N-12) < A ≤ 50×(N+11)

// Maximum allowable LPD for office (from image)
const MAX_ALLOWABLE_LPD = 7.8; // W/m²

const LightingControlCalculator: React.FC<LightingControlCalculatorProps> = () => {
  // State for inputs
  const [officeArea, setOfficeArea] = useState<string>('250');
  const [actualLPD, setActualLPD] = useState<string>('7.0');
  
  // State for calculation results
  const [results, setResults] = useState<{
    baseControlPoints: number;
    reductionRatio: number;
    finalControlPoints: number;
    isReductionApplicable: boolean;
  } | null>(null);

  // Function to find the base number of control points using the formula table
  const findBaseControlPoints = (area: number): number => {
    // Using the formulas from Table 5.5
    
    // For 0 < N ≤ 10: 15×(N-1) < A ≤ 15×N
    if (area <= 150) {
      return Math.ceil(area / 15);
    }
    
    // For 10 < N ≤ 20: 30×(N-6) < A ≤ 30×(N-5)
    if (area <= 450) {
      return Math.ceil(area / 30 + 5);
    }
    
    // For N > 20: 50×(N-12) < A ≤ 50×(N+11)
    return Math.ceil((area + 550) / 50);
  };

  // Calculate lighting control points
  const calculateControlPoints = () => {
    const area = parseFloat(officeArea);
    const lpd = parseFloat(actualLPD);
    
    if (isNaN(area) || isNaN(lpd) || area <= 0 || lpd < 0) {
      alert("Please enter valid values for area and LPD.");
      return;
    }
    
    // Find base number of control points from table
    const baseControlPoints = findBaseControlPoints(area);
    
    // Determine if reduction is applicable (only for office spaces > 200m²)
    const isReductionApplicable = area > 200 && lpd < MAX_ALLOWABLE_LPD;
    
    // Calculate reduction ratio if applicable
    const reductionRatio = isReductionApplicable 
      ? (MAX_ALLOWABLE_LPD - lpd) / MAX_ALLOWABLE_LPD 
      : 0;
      
    // Calculate final number of control points with reduction
    const reducedPoints = baseControlPoints * (1 - reductionRatio);
    const finalControlPoints = isReductionApplicable 
      ? Math.ceil(reducedPoints) // Round up to next integer
      : baseControlPoints;
    
    // Set calculation results
    setResults({
      baseControlPoints,
      reductionRatio,
      finalControlPoints,
      isReductionApplicable
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Lighting Control Points Calculator</h2>
      </div>
      <p className="mb-4 text-gray-600">
        Calculate the minimum number of lighting control points required for office spaces based on BEC Clause 5.5.2.
      </p>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-medium mb-1 text-sm">Office Area (m²)</label>
          <input
            type="number"
            value={officeArea}
            onChange={(e) => setOfficeArea(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
            min="1"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-sm">Actual Lighting Power Density (W/m²)</label>
          <input
            type="number"
            value={actualLPD}
            onChange={(e) => setActualLPD(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
            min="0"
            step="0.1"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculateControlPoints}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
      >
        Calculate Control Points
      </button>

      {/* Results Display */}
      {results && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
            <div>
              <span className="font-medium">Base Control Points:</span> {results.baseControlPoints}
            </div>
            {results.isReductionApplicable && (
              <>
                <div>
                  <span className="font-medium">Maximum Allowable LPD:</span> {MAX_ALLOWABLE_LPD} W/m²
                </div>
                <div>
                  <span className="font-medium">Reduction Ratio:</span> {(results.reductionRatio * 100).toFixed(1)}%
                </div>
              </>
            )}
            <div className="font-bold text-green-600">
              <span className="font-medium text-black">Required Control Points:</span> {results.finalControlPoints}
            </div>
          </div>
          
          {!results.isReductionApplicable && parseFloat(officeArea) <= 200 && (
            <div className="mt-2 text-xs text-gray-600">
              Note: Reduction not applicable for office spaces under 200m².
            </div>
          )}
          
          {!results.isReductionApplicable && parseFloat(actualLPD) >= MAX_ALLOWABLE_LPD && (
            <div className="mt-2 text-xs text-gray-600">
              Note: Reduction not applicable when actual LPD is greater than or equal to maximum allowable LPD ({MAX_ALLOWABLE_LPD} W/m²).
            </div>
          )}
          
          {/* Show the formula used for calculating base points */}
          <div className="mt-2 text-xs text-gray-600">
            {parseFloat(officeArea) <= 150 ? 
              `Base points formula: N = ceiling(A/15) = ceiling(${officeArea}/15) = ${results.baseControlPoints}` :
             parseFloat(officeArea) <= 450 ? 
              `Base points formula: N = ceiling(A/30 + 5) = ceiling(${officeArea}/30 + 5) = ${results.baseControlPoints}` :
              `Base points formula: N = ceiling((A+550)/50) = ceiling((${officeArea}+550)/50) = ${results.baseControlPoints}`
            }
          </div>
          
          {results.isReductionApplicable && (
            <div className="mt-2 text-xs text-gray-600">
              Reduction calculation: {results.baseControlPoints} × (1 - {results.reductionRatio.toFixed(2)}) = {(results.baseControlPoints * (1 - results.reductionRatio)).toFixed(1)} → {results.finalControlPoints} (rounded up)
            </div>
          )}
        </div>
      )}

      {/* Formula Reference */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-2">Reference: Minimum Control Points Formula</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border">Space Area A (m²)</th>
                <th className="px-3 py-2 border">Minimum No. of Lighting Control Points (N : integer)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-1 border">15×(N-1) &lt; A ≤ 15×N</td>
                <td className="px-3 py-1 border text-center">0 &lt; N ≤ 10</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-1 border">30×(N-6) &lt; A ≤ 30×(N-5)</td>
                <td className="px-3 py-1 border text-center">10 &lt; N ≤ 20</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-1 border">50×(N-12) &lt; A ≤ 50×(N+11)</td>
                <td className="px-3 py-1 border text-center">N &gt; 20</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          For a given area A, we solve these formulas to find the minimum required control points N.
        </p>
      </div>
    </div>
  );
};

export default LightingControlCalculator;