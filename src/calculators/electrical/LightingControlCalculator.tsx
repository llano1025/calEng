import React, { useState } from 'react';
import { Icons } from '../../components/Icons';

interface LightingControlCalculatorProps {
  onShowTutorial?: () => void; // Optional function to show tutorial
}

// Maximum allowable LPD for office (from image)
const MAX_ALLOWABLE_LPD = 7.8; // W/m²

const LightingControlCalculator: React.FC<LightingControlCalculatorProps> = ({ onShowTutorial }) => {
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Lighting Control Points Calculator</h2>
        
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Office Details</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Office Area (m²)
              </label>
              <input
                type="number"
                value={officeArea}
                onChange={(e) => setOfficeArea(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                min="1"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Lighting Power Density (W/m²)
              </label>
              <input
                type="number"
                value={actualLPD}
                onChange={(e) => setActualLPD(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                min="0"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum allowable is {MAX_ALLOWABLE_LPD} W/m² for office spaces</p>
            </div>
          </div>
          
          {/* Calculate Button */}
          <div className="mt-6">
            <button
              onClick={calculateControlPoints}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Calculate Control Points
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {!results ? (
            <div className="text-center py-8 text-gray-500">
              <p>Enter the parameters and click Calculate to see results</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Required Control Points</h4>
                
                <div className="grid grid-cols-1 gap-y-2 text-sm">
                  <div>
                    <p className="text-sm font-medium">Base Control Points</p>
                    <p>{results.baseControlPoints}</p>
                  </div>
                  
                  {results.isReductionApplicable && (
                    <>
                      <div>
                        <p className="text-sm font-medium">Maximum Allowable LPD</p>
                        <p>{MAX_ALLOWABLE_LPD} W/m²</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reduction Ratio</p>
                        <p>{(results.reductionRatio * 100).toFixed(1)}%</p>
                      </div>
                    </>
                  )}
                  
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm font-medium">Required Control Points</p>
                    <p className="text-green-600 font-bold text-lg">{results.finalControlPoints}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Calculation Method</h4>
                
                <div className="text-xs text-gray-700">
                  {parseFloat(officeArea) <= 150 ? 
                    <p>Base points formula: N = ceiling(A/15) = ceiling({officeArea}/15) = {results.baseControlPoints}</p> :
                   parseFloat(officeArea) <= 450 ? 
                    <p>Base points formula: N = ceiling(A/30 + 5) = ceiling({officeArea}/30 + 5) = {results.baseControlPoints}</p> :
                    <p>Base points formula: N = ceiling((A+550)/50) = ceiling(({officeArea}+550)/50) = {results.baseControlPoints}</p>
                  }
                  
                  {results.isReductionApplicable && (
                    <p className="mt-1">
                      Reduction calculation: {results.baseControlPoints} × (1 - {results.reductionRatio.toFixed(2)}) = {(results.baseControlPoints * (1 - results.reductionRatio)).toFixed(1)} → {results.finalControlPoints} (rounded up)
                    </p>
                  )}
                </div>
              </div>
              
              {!results.isReductionApplicable && (
                <div className="bg-white p-4 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">Reduction Information</h4>
                  
                  {parseFloat(officeArea) <= 200 && (
                    <p className="text-xs text-gray-700">
                      Reduction is not applicable for office spaces under 200m². The base number of control points is used without reduction.
                    </p>
                  )}
                  
                  {parseFloat(actualLPD) >= MAX_ALLOWABLE_LPD && (
                    <p className="text-xs text-gray-700">
                      Reduction is not applicable when actual LPD is greater than or equal to maximum allowable LPD ({MAX_ALLOWABLE_LPD} W/m²). The base number of control points is used without reduction.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Info section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Reference Information</h3>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">Minimum Control Points Formula (BEC Clause 5.5.2)</h4>
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
        
        <div>
          <h4 className="font-medium mb-2">Control Point Reduction for Energy Efficiency</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Office spaces with area larger than 200m² may qualify for a reduction in the number of control points if the actual LPD is less than the maximum allowable LPD.</li>
            <li>The reduction ratio is proportional to the LPD reduction: (MaxLPD - ActualLPD) / MaxLPD.</li>
            <li>The final number of required control points is calculated as: BasePoints × (1 - ReductionRatio), rounded up to the nearest integer.</li>
            <li>This incentivizes energy efficiency by allowing more flexible lighting control designs for spaces that use less power.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LightingControlCalculator;