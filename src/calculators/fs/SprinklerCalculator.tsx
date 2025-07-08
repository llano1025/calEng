import React, { useState } from 'react';
import { Icons } from '../../components/Icons';
import SprinklerTankCalculator from './SprinklerTankCalculator';
import SprinklerPipeSizingCalculator from './SprinklerPipeSizingCalculator'; // Import the new component
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

// Define props type for the component
interface SprinklerCalculatorProps {
  onShowTutorial?: () => void;
}

// The main Sprinkler Calculator component that coordinates the sub-calculators
const SprinklerCalculator: React.FC<SprinklerCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData } = useCalculatorActions({
    title: 'Sprinkler System Calculator',
    discipline: 'fs',
    calculatorType: 'sprinkler'
  });

  // State for the selected calculator type
  const [activeTab, setActiveTab] = useState<'tank' | 'hydraulic' | 'coverage'>('tank');

  return (
    <CalculatorWrapper
      title="Sprinkler System Calculator"
      discipline="fs"
      calculatorType="sprinkler"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">

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
              activeTab === 'hydraulic'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('hydraulic')}
          >
            Hydraulic Calculations
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'coverage'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('coverage')}
          >
            Coverage Analysis
          </button>
        </div>
        
        {/* Content Based on Active Tab */}
        {activeTab === 'tank' && <SprinklerTankCalculator />}
        {activeTab === 'hydraulic' && <SprinklerPipeSizingCalculator />} {/* Updated to use the new component */}
        {activeTab === 'coverage' && (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <div className="mx-auto mb-4 w-16 h-16 text-gray-400">
              <Icons.Calculator />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Coverage Analysis</h3>
            <p className="text-gray-600">
              This calculator will analyze sprinkler coverage patterns, spacing requirements, 
              and protection area calculations for different hazard classifications.
            </p>
            <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
          </div>
        )}
      </div>

      {/* Enhanced Information Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-700">About Fire Sprinkler System Design</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Key Design Standards</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>BS 12485:</strong> Fixed firefighting systems - Components for residential and domestic sprinkler systems</li>
              <li><strong>BS EN 12845:</strong> Fixed firefighting systems - Automatic sprinkler systems</li>
              <li><strong>NFPA 13:</strong> Standard for the Installation of Sprinkler Systems</li>
              <li><strong>FM Global:</strong> Property loss prevention data sheets</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Calculator Features</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Water Tank Sizing:</strong> Complete tank capacity calculations for different hazard classifications</li>
              <li><strong>Pipe Sizing:</strong> Hazen-Williams hydraulic calculations for friction loss analysis</li>
              <li><strong>Pressure Loss Analysis:</strong> Compliance checking against 0.5 bar friction loss limit</li>
              <li><strong>Standards Compliance:</strong> Calculations based on BS EN 12845 and international standards</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center">
            <Icons.InfoInline />
            <span className="ml-1">Hydraulic Design Requirements</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="mb-2"><strong>Pipe Sizing Criteria (BS EN 12845):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Maximum friction loss: 0.5 bar per 1000 L/min flow</li>
                <li>Applied between remote design point and control valve set</li>
                <li>Hazen-Williams formula for friction loss calculations</li>
                <li>Velocity limits: 1-10 m/s to prevent noise and erosion</li>
              </ul>
            </div>
            <div>
              <p className="mb-2"><strong>Design Considerations:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Material selection affects Hazen-Williams C coefficient</li>
                <li>Pipe aging reduces C values over time</li>
                <li>Standard pipe diameters for cost optimization</li>
                <li>Adequate pressure margins for reliable operation</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">Design Verification</h4>
          <p className="text-sm text-yellow-800 mb-2">
            These hydraulic calculations provide guidance for pipe sizing analysis. All designs must be verified against:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
            <ul className="list-disc pl-5 space-y-1">
              <li>Current edition of BS EN 12845 and local codes</li>
              <li>Manufacturer pipe specifications and tolerances</li>
              <li>Water supply pressure and flow characteristics</li>
            </ul>
            <ul className="list-disc pl-5 space-y-1">
              <li>Site-specific elevation changes and fittings</li>
              <li>Professional hydraulic modeling software verification</li>
              <li>Authority having jurisdiction approval requirements</li>
            </ul>
          </div>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default SprinklerCalculator;