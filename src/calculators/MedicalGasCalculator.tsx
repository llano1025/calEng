import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import MedicalGasPressureDropCalculator from './mgps/MedicalGasPressureDropCalculator';
import OxygenFlowCalculator from './mgps/OxygenFlowCalculator';
import NitrousOxideFlowCalculator from './mgps/NitrousOxideFlowCalculator';
import MedicalAirFlowCalculator from './mgps/MedicalAirFlowCalculator';
import SurgicalAirFlowCalculator from './mgps/SurgicalAirFlowCalculator';
import VacuumFlowCalculator from './mgps/VacuumFlowCalculator';
import AGSSFlowCalculator from './mgps/AGSSFlowCalculator';

// Define props type for the component
interface MedicalGasCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main Medical Gas Calculator component
const MedicalGasCalculator: React.FC<MedicalGasCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type
  const [calculatorType, setCalculatorType] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Placeholder for future sub-calculators
  const renderCalculator = () => {
    switch (calculatorType) {
      case 'pipe':
        return <MedicalGasPressureDropCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'oxygen_system':
        return <OxygenFlowCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'medical_air':
        return <MedicalAirFlowCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'surgical_air':
        return <SurgicalAirFlowCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'vacuum_system':
        return <VacuumFlowCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'nitrous_oxide':
        return <NitrousOxideFlowCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'agss':
        return <AGSSFlowCalculator onShowTutorial={() => setShowTutorial(true)} />;
      default:
        return null;
    }
  };

  // Main return for MedicalGasCalculator
  return (
    <div className="animate-fade-in">

      {/* Title specific to this discipline */}
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">
        Medical Gas Systems
      </h1>

      {/* Calculator Type Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Pipework */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'pipe'
                ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-1'
                : 'bg-green-50 hover:bg-green-100 border-green-100'
            }`}
            onClick={() => setCalculatorType('pipe')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'pipe' ? 'text-white' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Pipe Pressure Loss</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'pipe' ? 'text-green-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Design medical gas pipeline pressure loss
              </p>
            </div>
          </button>
          
          {/* Oxygen System */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'oxygen_system'
                ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-1'
                : 'bg-green-50 hover:bg-green-100 border-green-100'
            }`}
            onClick={() => setCalculatorType('oxygen_system')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'oxygen_system' ? 'text-white' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Oxygen System</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'oxygen_system' ? 'text-green-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Design medical oxygen distribution systems
              </p>
            </div>
          </button>

          {/* Compressed Air */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'medical_air'
                ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-1'
                : 'bg-green-50 hover:bg-green-100 border-green-100'
            }`}
            onClick={() => setCalculatorType('medical_air')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'medical_air' ? 'text-white' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Medical Air</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'medical_air' ? 'text-green-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate medical compressed air requirements
              </p>
            </div>
          </button>

          {/* Surgical Air */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'surgical_air'
                ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-1'
                : 'bg-green-50 hover:bg-green-100 border-green-100'
            }`}
            onClick={() => setCalculatorType('surgical_air')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'surgical_air' ? 'text-white' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Surgical Air</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'surgical_air' ? 'text-green-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate surgical compressed air requirements
              </p>
            </div>
          </button>

          {/* Vacuum System */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'vacuum_system'
                ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-1'
                : 'bg-green-50 hover:bg-green-100 border-green-100'
            }`}
            onClick={() => setCalculatorType('vacuum_system')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'vacuum_system' ? 'text-white' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Vacuum System</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'vacuum_system' ? 'text-green-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Design medical vacuum and suction systems
              </p>
            </div>
          </button>

          {/* Nitrous Oxide */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'nitrous_oxide'
                ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-1'
                : 'bg-green-50 hover:bg-green-100 border-green-100'
            }`}
            onClick={() => setCalculatorType('nitrous_oxide')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'nitrous_oxide' ? 'text-white' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Nitrous Oxide</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'nitrous_oxide' ? 'text-green-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate N2O distribution systems
              </p>
            </div>
          </button>

          {/* AGSS */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'agss'
                ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-1'
                : 'bg-green-50 hover:bg-green-100 border-green-100'
            }`}
            onClick={() => setCalculatorType('agss')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'agss' ? 'text-white' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Anaesthetic gas scavenging systems</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'agss' ? 'text-green-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate Anaesthetic gas scavenging system
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

export default MedicalGasCalculator;