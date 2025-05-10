import React, { useState } from 'react';
import { Icons } from '../../components/Icons';

// Interface for component props
interface MaxCopperResistanceCalculatorProps {
  onShowTutorial?: () => void;
}

const MaxCopperResistanceCalculator: React.FC<MaxCopperResistanceCalculatorProps> = ({ onShowTutorial }) => {
  // Common inputs
  const [lineVoltage, setLineVoltage] = useState<number>(380);
  const [powerFactor, setPowerFactor] = useState<number>(0.9);
  const [designCurrent, setDesignCurrent] = useState<number>(0);
  const [cableLength, setCableLength] = useState<number>(0);
  const [maxLossPercentage, setMaxLossPercentage] = useState<number>(1);
  
  // Harmonic distortion inputs
  const [thd, setThd] = useState<number>(0);
  const [neutralCurrentRatio, setNeutralCurrentRatio] = useState<number>(1);
  const [includeNeutral, setIncludeNeutral] = useState<boolean>(false);
  
  // Calculation outputs
  const [fundamentalCurrent, setFundamentalCurrent] = useState<number | null>(null);
  const [maxResistance, setMaxResistance] = useState<number | null>(null);
  const [copperLoss, setCopperLoss] = useState<number | null>(null);
  const [copperLossPercentage, setCopperLossPercentage] = useState<number | null>(null);
  const [neutralCurrent, setNeutralCurrent] = useState<number | null>(null);

  // Calculate max resistance for circuit with harmonics
  const calculateMaxResistance = () => {
    if (designCurrent <= 0 || cableLength <= 0 || maxLossPercentage <= 0) {
      alert('Please enter valid values for current, cable length, and loss percentage');
      return;
    }

    // Calculate fundamental current: I₁ = Ib / √(1+THD²)
    const i1 = designCurrent / Math.sqrt(1 + Math.pow(thd/100, 2));
    setFundamentalCurrent(i1);
    
    // Calculate neutral current if included
    let nCurrent = 0;
    if (includeNeutral) {
      // Use the neutral/phase current ratio from user input
      nCurrent = i1 * neutralCurrentRatio;
      setNeutralCurrent(nCurrent);
    } else {
      setNeutralCurrent(0);
    }

    // For harmonic circuits:
    // max r = (%loss × √3 × U × I₁ × cosθ × 1000) / ((3 × Ib² + IN²) × L)
    let denominator = 3 * Math.pow(designCurrent, 2);
    if (includeNeutral) {
      denominator += Math.pow(nCurrent, 2);
    }
    
    const maxR = (maxLossPercentage / 100 * Math.sqrt(3) * lineVoltage * i1 * powerFactor * 1000) / (denominator * cableLength);
    setMaxResistance(maxR);

    // Calculate copper loss in Watts: Pcopper = (3 × Ib² + IN²) × r × L / 1000
    const estimatedLoss = denominator * (maxR / 1000) * cableLength;
    setCopperLoss(estimatedLoss);

    // Calculate copper loss percentage
    const activePower = Math.sqrt(3) * lineVoltage * i1 * powerFactor;
    const lossPercentage = (estimatedLoss / activePower) * 100;
    setCopperLossPercentage(lossPercentage);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Maximum Copper Resistance Calculator</h2>
        
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
          
          {/* Circuit Parameters */}
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Circuit Parameters</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Line Voltage (V)
                </label>
                <input
                  type="number"
                  value={lineVoltage || ''}
                  onChange={(e) => setLineVoltage(Number(e.target.value))}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="380"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Power Factor (cosθ)
                </label>
                <input
                  type="number"
                  value={powerFactor || ''}
                  onChange={(e) => setPowerFactor(Number(e.target.value))}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="0.9"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Design Current (A)
                </label>
                <input
                  type="number"
                  value={designCurrent || ''}
                  onChange={(e) => setDesignCurrent(Number(e.target.value))}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Enter design current"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cable Length (m)
                </label>
                <input
                  type="number"
                  value={cableLength || ''}
                  onChange={(e) => setCableLength(Number(e.target.value))}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Enter cable length"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max. Loss Percentage (%)
                </label>
                <input
                  type="number"
                  value={maxLossPercentage || ''}
                  onChange={(e) => setMaxLossPercentage(Number(e.target.value))}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Enter max allowable loss %"
                  step="0.1"
                />
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-4"></div>
          
          {/* Harmonic Parameters */}
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Harmonic Parameters</h4>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Harmonic Distortion (%)
                </label>
                <input
                  type="number"
                  value={thd || ''}
                  onChange={(e) => setThd(Number(e.target.value))}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Enter THD"
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div className="flex items-center py-2">
                <input
                  type="checkbox"
                  id="includeNeutral"
                  checked={includeNeutral}
                  onChange={(e) => setIncludeNeutral(e.target.checked)}
                  className="mr-2 h-4 w-4"
                />
                <label htmlFor="includeNeutral" className="text-sm font-medium text-gray-700">
                  Include Neutral Conductor
                </label>
              </div>
              
              {includeNeutral && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Neutral/Phase Current Ratio
                  </label>
                  <input
                    type="number"
                    value={neutralCurrentRatio || ''}
                    onChange={(e) => setNeutralCurrentRatio(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm"
                    placeholder="IN/IL ratio"
                    min="0"
                    step="0.1"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Calculate Button */}
          <div className="mt-6">
            <button
              onClick={calculateMaxResistance}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Calculate Maximum Resistance
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {maxResistance === null ? (
            <div className="text-center py-8 text-gray-500">
              <p>Enter the parameters and click Calculate to see results</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded-md">
                  <p className="text-sm font-medium">Maximum Resistance</p>
                  <p className="text-lg font-bold text-green-600">{maxResistance.toFixed(4)} mΩ/m</p>
                </div>
                
                {fundamentalCurrent !== null && (
                  <div className="bg-white p-3 rounded-md">
                    <p className="text-sm font-medium">Fundamental Current (I₁)</p>
                    <p className="text-lg">{fundamentalCurrent.toFixed(2)} A</p>
                  </div>
                )}
                
                <div className="bg-white p-3 rounded-md">
                  <p className="text-sm font-medium">Design Current (Ib)</p>
                  <p className="text-lg">{designCurrent.toFixed(2)} A</p>
                </div>
                
                {includeNeutral && neutralCurrent !== null && (
                  <div className="bg-white p-3 rounded-md">
                    <p className="text-sm font-medium">Neutral Current (IN)</p>
                    <p className="text-lg">{neutralCurrent.toFixed(2)} A</p>
                  </div>
                )}
                
                {copperLoss !== null && (
                  <div className="bg-white p-3 rounded-md">
                    <p className="text-sm font-medium">Estimated Copper Loss</p>
                    <p className="text-lg">{copperLoss.toFixed(2)} W</p>
                  </div>
                )}
                
                {copperLossPercentage !== null && (
                  <div className="bg-white p-3 rounded-md">
                    <p className="text-sm font-medium">Copper Loss Percentage</p>
                    <p className="text-lg">{copperLossPercentage.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500 mt-1">Target: {maxLossPercentage}%</p>
                  </div>
                )}
              </div>
              
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Detailed Calculation</h4>
                
                <div className="text-sm text-gray-700">
                  <p className="mb-2 font-medium">Formula Used:</p>
                  <div className="bg-gray-50 p-2 rounded-md font-mono text-xs mb-3">
                    Max r (mΩ/m) = (%loss × √3 × U × I₁ × cosθ × 1000) / ((3 × Ib² + IN²) × L)
                  </div>
                  
                  <p className="mb-2 font-medium">Values:</p>
                  <ul className="list-disc pl-5 mb-3 space-y-1 text-xs">
                    <li>Loss percentage (%loss): {maxLossPercentage}%</li>
                    <li>Line voltage (U): {lineVoltage} V</li>
                    <li>Fundamental current (I₁): {fundamentalCurrent !== null ? fundamentalCurrent.toFixed(2) : 0} A</li>
                    <li>Power factor (cosθ): {powerFactor}</li>
                    <li>Design current (Ib): {designCurrent} A</li>
                    {includeNeutral && <li>Neutral current (IN): {neutralCurrent?.toFixed(2)} A</li>}
                    <li>Cable length (L): {cableLength} m</li>
                  </ul>
                  
                  <p className="mb-2 font-medium">Calculation Steps:</p>
                  <ol className="list-decimal pl-5 space-y-1 text-xs">
                    <li>
                      Calculate fundamental current: I₁ = Ib ÷ √(1+THD²)<br />
                      I₁ = {designCurrent} ÷ √(1+({thd}/100)²) = {fundamentalCurrent !== null ? fundamentalCurrent.toFixed(4) : 0} A
                    </li>
                    <li>
                      {includeNeutral ? (
                        <>
                          Calculate denominator: (3 × Ib² + IN²) × L<br />
                          = (3 × {designCurrent}² + {neutralCurrent?.toFixed(2)}²) × {cableLength}<br />
                          = {(3 * Math.pow(designCurrent, 2) + Math.pow((neutralCurrent ?? 0), 2)).toFixed(2)} × {cableLength}<br />
                          = {(3 * Math.pow(designCurrent, 2) + Math.pow((neutralCurrent ?? 0), 2)) * cableLength}
                        </>
                      ) : (
                        <>
                          Calculate denominator: 3 × Ib² × L<br />
                          = 3 × {designCurrent}² × {cableLength}<br />
                          = {(3 * Math.pow(designCurrent, 2)).toFixed(2)} × {cableLength}<br />
                          = {(3 * Math.pow(designCurrent, 2) * cableLength).toFixed(2)}
                        </>
                      )}
                    </li>
                    <li>
                      Calculate numerator: %loss × √3 × U × I₁ × cosθ × 1000<br />
                      = {maxLossPercentage/100} × √3 × {lineVoltage} × {fundamentalCurrent?.toFixed(2)} × {powerFactor} × 1000<br />
                      = {(maxLossPercentage/100 * Math.sqrt(3) * lineVoltage * (fundamentalCurrent ?? 0) * powerFactor * 1000).toFixed(2)}
                    </li>
                    <li>
                      Calculate max resistance: numerator ÷ denominator<br />
                      = {(maxLossPercentage/100 * Math.sqrt(3) * lineVoltage * (fundamentalCurrent ?? 0) * powerFactor * 1000).toFixed(2)} ÷ {includeNeutral ? 
                        ((3 * Math.pow(designCurrent, 2) + Math.pow((neutralCurrent ?? 0), 2)) * cableLength).toFixed(2) : 
                        (3 * Math.pow(designCurrent, 2) * cableLength).toFixed(2)}<br />
                      = {maxResistance.toFixed(4)} mΩ/m
                    </li>
                  </ol>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
                <p className="text-sm text-gray-700">
                  Select appropriate conductor size from TG Table 7.8 based on the calculated maximum resistance value. 
                  Ensure the selected cable has a resistance per meter less than or equal to {maxResistance.toFixed(4)} mΩ/m.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Info section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>This calculator determines the maximum allowable conductor resistance based on your specified maximum copper loss percentage.</li>
          <li>The formula accounts for harmonic distortion (THD) which affects the fundamental current component of the total load current.</li>
          <li>For circuits with significant harmonic content, the actual power loss will be higher than in purely resistive circuits.</li>
          <li>Including the neutral conductor is important for three-phase four-wire systems with unbalanced loads or significant triplen harmonics.</li>
          <li>The neutral current ratio typically ranges from 1.0 (balanced loads) to 1.73 (heavy single-phase non-linear loads).</li>
          <li>Once you've determined the maximum resistance, select a conductor size from standard tables that has a resistance per meter less than this value.</li>
        </ul>
      </div>
    </div>
  );
};

export default MaxCopperResistanceCalculator;