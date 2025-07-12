import React, { useState } from 'react';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';
import SupplyTankCalculator from './SupplyTankCalculator';
import SprinklerPipeSizingCalculator from './SprinklerPipeSizingCalculator';


interface FSSupplyPumpCalculatorProps {
  onShowTutorial?: () => void;
}


const FSSupplyPumpCalculator: React.FC<FSSupplyPumpCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData } = useCalculatorActions({
    title: 'Fire Service Pump Calculator',
    discipline: 'fs',
    calculatorType: 'supply-pump'
  });

  // State for active tab
  const [activeTab, setActiveTab] = useState<'tank' | 'pipe' | 'pump' | 'booster'>('tank');


  return (
    <CalculatorWrapper
      title="Fire Service Pump Calculator"
      discipline="fs"
      calculatorType="supply-pump"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        {/* Tab Selector */}
        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'tank'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('tank')}
          >
            Design Criteria
          </button>

          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'pipe'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('pipe')}
          >
            Hydraulic Calculations
          </button>

          {/* <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'pump'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('pump')}
          >
            Fixed Fire Pump
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'booster'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('booster')}
          >
            Intermediate Booster Pump
          </button> */}
        </div>

        {/* Supply Tank Tab */}
        {activeTab === 'tank' && <SupplyTankCalculator />}

        {activeTab === 'pipe' && <SprinklerPipeSizingCalculator />} 

        {/* Standards Information */}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Design Standards & References</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Applicable Standards:</h5>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Fire Services Department COP section 5.14 and 5.26</li>
                <li>BS EN 12845 - Fixed firefighting systems</li>
                <li>Code of Practice for Inspection, Testing and Maintenance</li>
                <li>Water Authority supply requirements</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Key Design Criteria:</h5>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Supply tank based on largest floor area factor</li>
                <li>System pressure range: 350-850 kPa</li>
                <li>450 L/min flow rate per hydrant outlet</li>
                <li>20% motor power safety margin</li>
                <li>Booster pumps required for height 60m</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default FSSupplyPumpCalculator;