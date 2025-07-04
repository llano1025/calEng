import React from 'react';
import { Icons } from './Icons';
import { EngineeringSystemsData } from '../data/systems';

interface DashboardProps {
  systems: EngineeringSystemsData;
  onSelectDiscipline: (disciplineKey: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ systems, onSelectDiscipline }) => {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Engineering Calculator
        </h2>
      </div>

      {/* Engineering Disciplines Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Engineering Disciplines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.entries(systems).map(([systemKey, systemData]) => (
            <button
              key={systemKey}
              onClick={() => onSelectDiscipline(systemKey)}
              className="group relative bg-white rounded-xl border border-gray-200 p-6 text-center transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-blue-300"
            >
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors duration-300">
                    {systemData.icon}
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  {systemData.name}
                </h4>
              </div>

              {/* Arrow Indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="h-5 w-5 text-blue-600">
                  <Icons.ChevronRight />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;