import React from 'react';

interface TutorialContentProps {
  calculatorType: string; // 'cableSizing', 'powerFactor', 'circuitProtection', 'lightingControl'
  onClose: () => void; // Function to close tutorial
}

const TutorialContent: React.FC<TutorialContentProps> = ({ calculatorType, onClose }) => {
  // Render content based on calculator type
  const renderContent = () => {
    switch (calculatorType) {
      case 'cableSizing':
        return renderCableSizingTutorial();
      case 'powerFactor':
        return renderPowerFactorTutorial();
      case 'circuitProtection':
        return renderCircuitProtectionTutorial();
      case 'lightingControl':
        return renderLightingControlTutorial();
      default:
        return <p>No tutorial available for the selected calculator.</p>;
    }
  };

  // Cable Sizing Tutorial
  const renderCableSizingTutorial = () => {
    return (
      <>
        <h3 className="font-medium text-lg mb-2">Cable Sizing Calculator</h3>
        <p>This calculator helps determine the appropriate copper cable size based on the <strong>Hong Kong Code of Practice for the Electricity (Wiring) Regulations (2020 Edition) - Appendix 6</strong>. It accounts for:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
          <li>Design current (load current)</li>
          <li>Cable arrangement (Single-core / Multi-core)</li>
          <li>Armour type (Armoured / Non-armoured)</li>
          <li>Insulation type (PVC 70°C / XLPE 90°C)</li>
          <li>Installation Methods (A, B, C, E, F, G - see dropdown for descriptions)</li>
          <li>Correction factors for ambient temperature (Ca) and grouping (Cg) - <em>Note: These factors use simplified IEC-based values as CoP Appendix 5 / BS7671 tables are not included.</em></li>
          <li>Voltage drop requirements (using mV/A/m impedance values from CoP tables)</li>
        </ul>
        <p className="mt-2 text-sm text-red-600">Note: Only Copper conductors are supported based on the provided CoP tables.</p>

        {/* Reference Tables Section */}
        <div className="mt-4">
          <h3 className="font-medium text-lg mb-2">Reference Tables (CoP Appendix 6 - Examples)</h3>

          {/* Temperature Correction Factors */}
          <div className="mb-4">
            <h4 className="font-medium text-md mb-1">Temperature Correction Factors (Ca - IEC Placeholder)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 border">Ambient Temperature (°C)</th>
                    <th className="px-2 py-1 border">PVC (70°C)</th>
                    <th className="px-2 py-1 border">XLPE/EPR (90°C)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="px-2 py-1 border">30</td><td className="px-2 py-1 border">1.00</td><td className="px-2 py-1 border">1.00</td></tr>
                  <tr><td className="px-2 py-1 border">35</td><td className="px-2 py-1 border">0.94</td><td className="px-2 py-1 border">0.96</td></tr>
                  <tr><td className="px-2 py-1 border">40</td><td className="px-2 py-1 border">0.87</td><td className="px-2 py-1 border">0.91</td></tr>
                  <tr><td className="px-2 py-1 border">45</td><td className="px-2 py-1 border">0.79</td><td className="px-2 py-1 border">0.87</td></tr>
                  <tr><td className="px-2 py-1 border">50</td><td className="px-2 py-1 border">0.71</td><td className="px-2 py-1 border">0.82</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-1">Note: These are simplified IEC values. Refer to CoP Appendix 5 / BS7671 for full tables.</p>
          </div>

          {/* Grouping Correction Factors */}
          <div className="mb-4">
            <h4 className="font-medium text-md mb-1">Grouping Correction Factors (Cg - Simplified)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 border">Number of Circuits</th>
                    <th className="px-2 py-1 border">Approx. Factor (Touching)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="px-2 py-1 border">1</td><td className="px-2 py-1 border">1.00</td></tr>
                  <tr><td className="px-2 py-1 border">2</td><td className="px-2 py-1 border">0.80</td></tr>
                  <tr><td className="px-2 py-1 border">3</td><td className="px-2 py-1 border">0.70</td></tr>
                  <tr><td className="px-2 py-1 border">4</td><td className="px-2 py-1 border">0.65</td></tr>
                  <tr><td className="px-2 py-1 border">5</td><td className="px-2 py-1 border">0.60</td></tr>
                  <tr><td className="px-2 py-1 border">6+</td><td className="px-2 py-1 border">0.57</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-1">Note: These are simplified general values. Refer to CoP Appendix 5 / BS7671 for factors specific to installation method and spacing.</p>
          </div>
        </div>
      </>
    );
  };

  // Power Factor Tutorial
  const renderPowerFactorTutorial = () => {
    return (
      <>
        <h3 className="font-medium text-lg mb-2">Power Factor Correction</h3>
        <p>This calculator helps determine the capacitor bank size required to improve power factor, and evaluates the financial benefits based on utility tariffs.</p>
        
        <div className="mt-4">
          <h4 className="font-medium text-md mb-1">Key Concepts</h4>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
            <li><strong>Power Factor (PF):</strong> The ratio of active power (kW) to apparent power (kVA)</li>
            <li><strong>Total Power Factor:</strong> Accounts for the effect of harmonics</li>
            <li><strong>Capacitor Bank Size:</strong> Calculated in kVAr required to improve power factor</li>
            <li><strong>Financial Analysis:</strong> Estimates annual savings and payback period based on tariff structures</li>
          </ul>
        </div>
      </>
    );
  };

  // Circuit Protection Tutorial
  const renderCircuitProtectionTutorial = () => {
    return (
      <>
        <h3 className="font-medium text-lg mb-2">Circuit Protection</h3>
        <p>This calculator evaluates whether the selected protection device can provide adequate protection for the circuit under fault conditions (simplified check), and checks thermal withstand capability of the cable (I²t ≤ k²S²).</p>
        
        <div className="mt-4">
          <h4 className="font-medium text-md mb-1">Key Calculations</h4>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
            <li><strong>Cable Impedance:</strong> Estimated based on cross-sectional area (CSA)</li>
            <li><strong>Fault Current:</strong> Calculated at the end of the cable run</li>
            <li><strong>Device Trip Time:</strong> Estimated based on type of protection device and fault current</li>
            <li><strong>Thermal Withstand:</strong> Checks if cable can withstand fault current for required disconnection time</li>
          </ul>
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-md mb-1">Important Note</h4>
          <p className="text-sm text-red-600">
            This calculator provides simplified checks. Actual protection performance depends on specific device characteristics. Always verify against actual device trip curves and energy let-through values.
          </p>
        </div>
      </>
    );
  };

  // Lighting Control Tutorial
  const renderLightingControlTutorial = () => {
    return (
      <>
        <h3 className="font-medium text-lg mb-2">Lighting Control Points Calculator</h3>
        <p>This calculator determines the minimum number of lighting control points required for office spaces based on BEC Clause 5.5.2.</p>
        
        <div className="mt-4">
          <h4 className="font-medium text-md mb-1">Key Concepts</h4>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
            <li><strong>Base Requirement:</strong> Determined by the area of the office space (Table 5.5.1)</li>
            <li><strong>Reduction Allowance:</strong> For spaces with actual Lighting Power Density (LPD) lower than the maximum allowable LPD of 7.8 W/m² (BEC Clause 5.5.2)</li>
            <li><strong>Reduction Ratio:</strong> Calculated as (7.8 W/m² - actual LPD) / 7.8 W/m²</li>
            <li><strong>Final Requirement:</strong> Base requirement × (1 - reduction ratio), rounded up to the next integer</li>
          </ul>
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-md mb-1">Applicability</h4>
          <p className="text-sm">
            The reduction allowance is only applicable for:
          </p>
          <ul className="list-disc pl-6 mt-1 space-y-1 text-sm">
            <li>Office spaces with area greater than 200 m²</li>
            <li>Spaces with actual LPD lower than the maximum allowable value of 7.8 W/m²</li>
          </ul>
          <p className="text-sm mt-2">
            Lighting control reduction is not applicable to other types of spaces.
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Tutorial: {calculatorType === 'cableSizing' ? 'Cable Sizing' : 
                                              calculatorType === 'powerFactor' ? 'Power Factor Correction' : 
                                              calculatorType === 'circuitProtection' ? 'Circuit Protection' : 
                                              'Lighting Control Points'}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          Close
        </button>
      </div>
      <div className="space-y-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default TutorialContent;