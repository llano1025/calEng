import React from 'react';
import { Icons } from './Icons'; // Import Icons
import { EngineeringSystemsData } from '../data/systems'; // Import data type

// Define props type
interface DisciplineSelectionProps {
  systems: EngineeringSystemsData;
  onSelectDiscipline: (disciplineKey: string) => void; // Callback function type
}

// Component for the Discipline Selection Screen
const DisciplineSelection: React.FC<DisciplineSelectionProps> = ({ systems, onSelectDiscipline }) => {
  return (
    <section className="mb-10 animate-fade-in">
      <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">
        1. Select Engineering Discipline
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Map over the systems data to create buttons */}
        {Object.entries(systems).map(([systemKey, systemData]) => (
          <button
            key={systemKey}
            className={`p-4 rounded-lg text-center transition-all duration-300 ease-in-out transform hover:scale-105 shadow hover:shadow-lg border bg-white hover:bg-gray-50 border-gray-200`}
            // Call the handler passed from App when a button is clicked
            onClick={() => onSelectDiscipline(systemKey)}
          >
            {/* Display the icon defined in the data */}
            {systemData.icon}
            <span className="font-medium text-sm sm:text-base">
              {systemData.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default DisciplineSelection;
