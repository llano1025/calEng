import React from 'react';
import { Icons } from './Icons';
import { EngineeringSystemsData } from '../data/systems';

interface SidebarProps {
  systems: EngineeringSystemsData;
  onSelectDiscipline: (disciplineKey: string) => void;
  activeDiscipline?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  systems, 
  onSelectDiscipline, 
  activeDiscipline, 
  isOpen, 
  onClose 
}) => {
  const handleDisciplineClick = (disciplineKey: string) => {
    onSelectDiscipline(disciplineKey);
    onClose(); // Close sidebar on mobile after selection
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:relative lg:shadow-none`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Disciplines</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Icons.Close />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4">
          <ul className="space-y-2">
            {Object.entries(systems).map(([systemKey, systemData]) => (
              <li key={systemKey}>
                <button
                  onClick={() => handleDisciplineClick(systemKey)}
                  className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors duration-200 ${
                    activeDiscipline === systemKey
                      ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className={`h-5 w-5 ${
                      activeDiscipline === systemKey ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {systemData.icon}
                    </div>
                  </div>
                  <span className="text-sm font-medium truncate">
                    {systemData.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            Engineering Calculator
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;