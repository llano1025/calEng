import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons'; // Import Icons
import { EngineeringSystemsData } from '../data/systems'; // Import data type definition if needed

// Define props type for the component
interface GenericCalculatorProps {
  systems: EngineeringSystemsData; // Type for the systems data object
  initialDiscipline: string;      // Key of the initially selected discipline
  onBack: () => void;             // Function to navigate back
}

// Renamed from EngineeringCalculator
const GenericCalculator: React.FC<GenericCalculatorProps> = ({ systems, initialDiscipline, onBack }) => {
  // State specific to the calculator view
  const [selectedSystem, setSelectedSystem] = useState<string>(initialDiscipline); // Initialize with passed discipline
  const [selectedFormula, setSelectedFormula] = useState<string>('');
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});
  const [result, setResult] = useState<{ value: number; unit: string } | null>(null);

  // Effect to reset calculator state when the discipline changes
  useEffect(() => {
    setSelectedSystem(initialDiscipline);
    setSelectedFormula('');
    setInputValues({});
    setResult(null);
    // Reset 'calculation' dropdown if applicable
    const currentSystemData = systems[initialDiscipline];
    if (currentSystemData) {
        // Optionally pre-select first formula or reset specific inputs here
    }

  }, [initialDiscipline, systems]);


  // Get the data for the currently selected system
  const currentSystemData = systems[selectedSystem];

  // Handle formula selection within the current discipline
  const handleFormulaSelect = (formulaKey: string) => {
    setSelectedFormula(formulaKey);
    setResult(null); // Clear previous result

    const formula = currentSystemData?.formulas[formulaKey];
    const calcInput = formula?.inputs.find(input => input.id === 'calculation');
    const initialInputs: { [key: string]: string } = {};
    if (calcInput && calcInput.options && calcInput.options.length > 0) {
        initialInputs[calcInput.id] = calcInput.options[0].value; // Default the dropdown
    }
    setInputValues(initialInputs); // Reset inputs, possibly pre-filling dropdown
  };

  // Handle input changes
  const handleInputChange = (inputId: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [inputId]: value
    }));
     setResult(null); // Clear result on input change
  };

  // Handle calculation
  const handleCalculate = () => {
    if (!selectedSystem || !selectedFormula || !currentSystemData) return;

    const formula = currentSystemData.formulas[selectedFormula];
    if (!formula || !formula.calculate) return; // Ensure formula and calculate function exist

    // Basic validation could be added here before calling calculate
    // e.g., check if all required number inputs are valid numbers

    const calcResult = formula.calculate(inputValues); // Call the calculation function from data
    setResult(calcResult); // Update the result state
  };

  // --- Derived State ---
  const currentFormula = currentSystemData?.formulas?.[selectedFormula];
  const variableToCalculate = currentFormula && inputValues.calculation ? inputValues.calculation : null;

  // --- Render Logic ---
   if (!currentSystemData) {
     return ( /* Error/Loading State */ <div className="text-center p-10"><p className="text-red-600">Error: Discipline data not found.</p><button onClick={onBack} className="mt-4 inline-flex items-center bg-gray-500 text-white px-4 py-2 rounded-md shadow hover:bg-gray-600 transition-colors"><Icons.ArrowLeft /> Back to Disciplines</button></div>);
   }

  // (JSX remains the same as the EngineeringCalculator in the previous combined version)
  // It renders the formula selection, input form, and results for the selected discipline.
  // It includes the Back button using the onBack prop.
  return (
    <div className="animate-fade-in">
       {/* Back Button */}
       <button onClick={onBack} className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
           <Icons.ArrowLeft /> Back to Disciplines
       </button>

        {/* Formula Selection Section */}
        <section className="mb-10 transition-opacity duration-500 ease-in-out opacity-100">
            <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">
                {currentSystemData.name}: Choose Formula
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(currentSystemData.formulas).map(([formulaKey, formulaData]) => (
                <button
                  key={formulaKey}
                  className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${ selectedFormula === formulaKey ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1' : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100' }`}
                  onClick={() => handleFormulaSelect(formulaKey)}
                >
                   <div className="flex-shrink-0 pt-1"><Icons.Calculator className={`${selectedFormula === formulaKey ? 'text-white' : 'text-indigo-500'}`} /></div>
                   <div>
                      <h3 className="font-semibold text-sm sm:text-base">{formulaData.name}</h3>
                      <p className={`text-xs sm:text-sm ${selectedFormula === formulaKey ? 'text-indigo-100' : 'text-gray-600'}`}><Icons.InfoInline /> {formulaData.description}</p>
                   </div>
                </button>
              ))}
            </div>
        </section>

        {/* Input Form Section */}
        {currentFormula && (
          <section className="mb-10 transition-opacity duration-500 ease-in-out opacity-100">
             <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Enter Values</h2>
             <div className="bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {currentFormula.inputs.map(input => {
                  const isCalculatingThis = input.id === variableToCalculate;
                  const isDisabled = isCalculatingThis && input.type === 'number';
                  return (
                    <div key={input.id} className={input.type === 'select' ? 'md:col-span-2' : ''}>
                      <label htmlFor={input.id} className="block mb-1.5 text-sm font-medium text-gray-700">{input.name} {input.unit && `(${input.unit})`}</label>
                      {input.type === 'select' ? (
                        <select id={input.id} className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-150 ease-in-out" value={inputValues[input.id] || ''} onChange={(e) => handleInputChange(input.id, e.target.value)}>
                          <option value="" disabled>Select {input.name}...</option>
                          {input.options?.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                        </select>
                      ) : (
                        <input id={input.id} type={input.type} step="any" className={`w-full p-2.5 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-150 ease-in-out ${ isDisabled ? 'bg-gray-200 cursor-not-allowed' : 'border-gray-300 bg-white' }`} value={isDisabled ? '' : (inputValues[input.id] || '')} onChange={(e) => handleInputChange(input.id, e.target.value)} placeholder={isDisabled ? 'Will be calculated' : `Enter ${input.name}`} disabled={isDisabled}/>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 text-right"><button onClick={handleCalculate} className="inline-flex items-center bg-green-600 text-white px-6 py-2.5 rounded-md shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50"><Icons.Play /> Calculate</button></div>
            </div>
          </section>
        )}

        {/* Results Display Section */}
        {result !== null && (
           <section className="transition-opacity duration-500 ease-in-out opacity-100">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Result</h2>
             <div className={`p-6 rounded-lg border-l-4 shadow ${isNaN(result.value) ? 'bg-red-50 border-red-500' : 'bg-gradient-to-r from-green-50 to-teal-100 border-green-500'}`}>
                 <div className="flex items-center">
                    {isNaN(result.value) ? ( <Icons.InfoCircle /> ) : ( <Icons.CheckCircle /> )}
                    <div>{isNaN(result.value) ? ( <> <p className="text-red-800 font-medium">Calculation Error</p> <p className="text-sm text-red-700">Please check inputs.</p> </> ) : ( <> <div className="text-xl sm:text-3xl font-bold text-gray-800">{Number(result.value.toPrecision(6)).toLocaleString()}<span className="text-lg font-medium text-gray-600 ml-2">{result.unit !== 'dimensionless' ? result.unit : '(dimensionless)'}</span></div> {currentFormula?.name && <p className="text-sm text-gray-600 mt-1">Calculated: {currentFormula.name}</p>} </> )}</div>
                 </div>
             </div>
           </section>
        )}
    </div>
  );
};

export default GenericCalculator;
