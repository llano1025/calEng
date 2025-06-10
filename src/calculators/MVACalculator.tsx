import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import PsychrometricChart from './mvac/PsychrometricChart';
import DuctStaticPressureCalculator from './mvac/DuctStaticPressureCalculator';
import ChilledWaterPipeSizingCalculator from './mvac/ChilledWaterPipeSizingCalculator';
import SteamPipeSizingCalculator from './mvac/SteamPipeSizingCalculator';
import AHUSizingCalculator from './mvac/AHUSizingCalculator';
import RefrigerantPipeCalculator from './mvac/RefrigerantPipeCalculator';
import VibrationIsolatorCalculator from './mvac/VibrationIsolatorCalculator';
// import CoolingLoadCalculator from './mvac/CoolingLoadCalculator';
// import FanPowerCalculator from './mvac/FanPowerCalculator';
// import AirDiffusionCalculator from './mvac/AirDiffusionCalculator';
// import ChillerEfficiencyCalculator from './mvac/ChillerEfficiencyCalculator';
// import RefrigerantCalculator from './mvac/RefrigerantCalculator';
// import HeatRecoveryCalculator from './mvac/HeatRecoveryCalculator';
// import PumpHeadCalculator from './mvac/PumpHeadCalculator';
import TutorialContent from './electrical/TutorialContent';

// Define props type for the component
interface MVACalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main MVAC Calculator component that coordinates the sub-calculators
const MVACalculator: React.FC<MVACalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type and display mode
  const [calculatorType, setCalculatorType] = useState<string>(''); // 'ductPressure', 'coolingLoad', 'fanPower', etc.
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Render the selected calculator
  const renderCalculator = () => {
    // Show tutorial if enabled
    if (showTutorial && calculatorType) {
      return <TutorialContent calculatorType={calculatorType} onClose={() => setShowTutorial(false)} />;
    }

    // Otherwise show the selected calculator
    switch (calculatorType) {
      case 'psyChart':
        return <PsychrometricChart onShowTutorial={() => setShowTutorial(true)} />;
      case 'ductPressure':
        return <DuctStaticPressureCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'chillerPipe':
        return <ChilledWaterPipeSizingCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'steamPipe':
        return <SteamPipeSizingCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'ahu':
        return <AHUSizingCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'refrigerant':
        return <RefrigerantPipeCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'vibrationIsolator':
        return <VibrationIsolatorCalculator onShowTutorial={() => setShowTutorial(true)} />;
      // case 'coolingLoad':
      //   return <CoolingLoadCalculator onShowTutorial={() => setShowTutorial(true)} />;
      // case 'fanPower':
      //   return <FanPowerCalculator onShowTutorial={() => setShowTutorial(true)} />;
      // case 'airDiffusion':
      //   return <AirDiffusionCalculator onShowTutorial={() => setShowTutorial(true)} />;
      // case 'chillerEfficiency':
      //   return <ChillerEfficiencyCalculator onShowTutorial={() => setShowTutorial(true)} />;
      // case 'refrigerant':
      //   return <RefrigerantCalculator onShowTutorial={() => setShowTutorial(true)} />;
      // case 'heatRecovery':
      //   return <HeatRecoveryCalculator onShowTutorial={() => setShowTutorial(true)} />;
      // case 'pumpHead':
      //   return <PumpHeadCalculator onShowTutorial={() => setShowTutorial(true)} />;
      default:
        return null;
    }
  };

  // Main return for MVACalculator
  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        <Icons.ArrowLeft /> Back to Disciplines
      </button>

      {/* Title specific to this discipline */}
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">
        Mechanical Ventilation & Air Conditioning
      </h1>

      {/* Calculator Type Selection - UPDATED STYLING */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Psy Chart */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'psyChart'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('psyChart')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'psyChart' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Psychrometric Chart</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'psyChart' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Psychrometric chart
              </p>
            </div>
          </button>

          {/* Duct Static Pressure */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'ductPressure'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('ductPressure')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'ductPressure' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Duct Static Pressure</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'ductPressure' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate system pressure drop
              </p>
            </div>
          </button>

          {/* Chiller Pipe */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'chillerPipe'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('chillerPipe')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'chillerPipe' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Chilled Water Pipe</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'chillerPipe' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Pipework sizing
              </p>
            </div>
          </button>

          
          {/* Steam Pipe */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'steamPipe'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('steamPipe')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'steamPipe' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Steam Pipe</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'steamPipe' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Pipework sizing
              </p>
            </div>
          </button>

          {/* AHU */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'ahu'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('ahu')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'ahu' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Air Handling Unit</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'ahu' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> AHU sizing
              </p>
            </div>
          </button>

          {/* Refrigerant */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'refrigerant'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('refrigerant')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'refrigerant' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Refrigerant Pipe Sizing</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'refrigerant' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Refrigerant Pipe Sizing
              </p>
            </div>
          </button> */}

          {/* Vibration */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'vibrationIsolator'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('vibrationIsolator')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'vibrationIsolator' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Vibration Isolator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'vibrationIsolator' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Vibration Isolator Sizing
              </p>
            </div>
          </button>

          {/* Cooling Load */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'coolingLoad'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('coolingLoad')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'coolingLoad' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Cooling Load</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'coolingLoad' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Building heat load estimation
              </p>
            </div>
          </button> */}

          {/* Fan Power */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'fanPower'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('fanPower')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'fanPower' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Fan Power</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'fanPower' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate fan power & efficiency
              </p>
            </div>
          </button> */}

          {/* Air Diffusion */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'airDiffusion'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('airDiffusion')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'airDiffusion' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Air Diffusion</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'airDiffusion' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Diffuser performance
              </p>
            </div>
          </button> */}

          {/* Chiller Efficiency */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'chillerEfficiency'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('chillerEfficiency')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'chillerEfficiency' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Chiller Efficiency</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'chillerEfficiency' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> COP & IPLV calculations
              </p>
            </div>
          </button> */}

          {/* Refrigerant Properties */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'refrigerant'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('refrigerant')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'refrigerant' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Refrigerant Properties</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'refrigerant' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Capacity & thermodynamics
              </p>
            </div>
          </button> */}

          {/* Heat Recovery */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'heatRecovery'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('heatRecovery')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'heatRecovery' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Heat Recovery</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'heatRecovery' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Energy recovery efficiency
              </p>
            </div>
          </button> */}

          {/* Pump Head */}
          {/* <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'pumpHead'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('pumpHead')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'pumpHead' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Pump Head</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'pumpHead' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Hydronic system calculations
              </p>
            </div>
          </button> */}
        </div>
      </div>

      {/* Render the selected calculator */}
      {calculatorType && renderCalculator()}
    </div>
  );
};

export default MVACalculator;