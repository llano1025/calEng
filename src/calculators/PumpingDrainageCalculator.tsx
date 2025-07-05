import React, { useState } from 'react';
import { Icons } from '../components/Icons';

// Define props type for the component
interface PumpingDrainageCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main Pumping and Drainage Calculator component
const PumpingDrainageCalculator: React.FC<PumpingDrainageCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type
  const [calculatorType, setCalculatorType] = useState<string>('');

  // Placeholder for future sub-calculators
  const renderCalculator = () => {
    switch (calculatorType) {
      case 'sump_pump':
        return <div className="p-6 text-center text-gray-500">Sump Pump Calculator - Coming Soon</div>;
      case 'drainage_pipe':
        return <div className="p-6 text-center text-gray-500">Drainage Pipe Sizing - Coming Soon</div>;
      case 'greywater_system':
        return <div className="p-6 text-center text-gray-500">Greywater System Calculator - Coming Soon</div>;
      case 'stormwater_management':
        return <div className="p-6 text-center text-gray-500">Stormwater Management - Coming Soon</div>;
      default:
        return null;
    }
  };

  // Main return for PumpingDrainageCalculator
  return (
    <div className="animate-fade-in">

      {/* Title specific to this discipline */}
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">
        Pumping and Drainage
      </h1>

      {/* Calculator Type Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Sump Pump Sizing */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'sump_pump'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-100'
            }`}
            onClick={() => setCalculatorType('sump_pump')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'sump_pump' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Sump Pump Sizing</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'sump_pump' ? 'text-blue-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate sump pump capacity and head requirements
              </p>
            </div>
          </button>

          {/* Drainage Pipe Sizing */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'drainage_pipe'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-100'
            }`}
            onClick={() => setCalculatorType('drainage_pipe')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'drainage_pipe' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Drainage Pipe Sizing</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'drainage_pipe' ? 'text-blue-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Size drainage pipes and calculate flow capacity
              </p>
            </div>
          </button>

          {/* Greywater System */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'greywater_system'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-100'
            }`}
            onClick={() => setCalculatorType('greywater_system')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'greywater_system' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Greywater System</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'greywater_system' ? 'text-blue-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Design greywater treatment and reuse systems
              </p>
            </div>
          </button>

          {/* Stormwater Management */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'stormwater_management'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-100'
            }`}
            onClick={() => setCalculatorType('stormwater_management')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'stormwater_management' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Stormwater Management</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'stormwater_management' ? 'text-blue-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate stormwater runoff and detention
              </p>
            </div>
          </button>

        </div>
      </div>

      {/* Render Selected Calculator */}
      {calculatorType && (
        <div className="bg-white rounded-lg shadow-lg">
          {renderCalculator()}
        </div>
      )}
    </div>
  );
};

export default PumpingDrainageCalculator;