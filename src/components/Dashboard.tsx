import React, { useState } from 'react';
import { Icons } from './Icons';
import { EngineeringSystemsData } from '../data/systems';
import { FavoritesManager } from './FavoritesManager';

interface DashboardProps {
  systems: EngineeringSystemsData;
  onSelectDiscipline: (disciplineKey: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ systems, onSelectDiscipline }) => {
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>({});

  // Check if discipline is favorited and update local state
  const checkFavoriteStatus = (disciplineKey: string) => {
    const isFav = FavoritesManager.isFavorite(disciplineKey, 'main');
    setFavoriteStates(prev => ({ ...prev, [disciplineKey]: isFav }));
    return isFav;
  };

  const handleToggleFavorite = (disciplineKey: string, systemData: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    const isCurrentlyFavorite = favoriteStates[disciplineKey] || FavoritesManager.isFavorite(disciplineKey, 'main');
    
    if (isCurrentlyFavorite) {
      // Remove from favorites - would need to implement removal by discipline+type
      console.log('Remove favorite functionality would go here');
    } else {
      // Add to favorites
      FavoritesManager.addFavorite({
        name: systemData.name,
        discipline: disciplineKey,
        calculatorType: 'main',
        description: `${systemData.name} discipline calculators`
      });
    }
    
    // Update local state
    setFavoriteStates(prev => ({ ...prev, [disciplineKey]: !isCurrentlyFavorite }));
  };

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
          {Object.entries(systems).map(([systemKey, systemData]) => {
            const isFavorite = favoriteStates[systemKey] ?? checkFavoriteStatus(systemKey);
            
            return (
              <button
                key={systemKey}
                onClick={() => onSelectDiscipline(systemKey)}
                className="group relative bg-white rounded-xl border border-gray-200 p-6 text-center transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-blue-300"
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Favorite Button */}
                <button
                  onClick={(e) => handleToggleFavorite(systemKey, systemData, e)}
                  className={`absolute top-3 left-3 p-1 rounded-full transition-colors duration-200 ${
                    isFavorite
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
                  }`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
                
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;