import React, { useState, ReactNode } from 'react';
import { Icons } from './Icons';
import ExportResults from './ExportResults';
import { ExportData } from '../utils/exportResults';
import CalculationHistoryManager from '../utils/calculationHistory';
import { FavoritesManager } from './FavoritesManager';

interface CalculatorWrapperProps {
  title: string;
  discipline: string;
  calculatorType: string;
  children: ReactNode;
  onShowTutorial?: () => void;
  exportData?: ExportData | null;
  onSaveToHistory?: (inputs: Record<string, any>, results: Record<string, any>) => void;
}

/**
 * Wrapper component that adds export and favorite functionality to any calculator
 */
const CalculatorWrapper: React.FC<CalculatorWrapperProps> = ({
  title,
  discipline,
  calculatorType,
  children,
  onShowTutorial,
  exportData,
  onSaveToHistory
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState('');

  // Add to favorites
  const handleAddToFavorites = () => {
    FavoritesManager.addFavorite({
      name: title,
      discipline,
      calculatorType,
      description: `${title} - Professional engineering calculator`
    });
    
    setShowSuccessMessage('Added to favorites!');
    setTimeout(() => setShowSuccessMessage(''), 3000);
  };

  // Save calculation to history
  const handleSaveToHistory = (inputs: Record<string, any>, results: Record<string, any>) => {
    CalculationHistoryManager.saveCalculation({
      discipline,
      calculatorType,
      calculatorName: title,
      inputs,
      results,
      notes: `Calculation performed using ${title}`
    });

    if (onSaveToHistory) {
      onSaveToHistory(inputs, results);
    }
  };

  const isFavorite = FavoritesManager.isFavorite(discipline, calculatorType);
  const hasExportData = exportData && Object.keys(exportData.results).length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {discipline.charAt(0).toUpperCase() + discipline.slice(1)} Engineering Calculator
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Add to Favorites */}
            <button
              onClick={handleAddToFavorites}
              disabled={isFavorite}
              className={`p-2 rounded-md transition-colors duration-200 ${
                isFavorite
                  ? 'text-yellow-500 bg-yellow-50 cursor-not-allowed'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
              title={isFavorite ? 'Already in favorites' : 'Add to favorites'}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>

            {/* Export Results */}
            <button
              onClick={() => setIsExportOpen(true)}
              disabled={!hasExportData}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              title={hasExportData ? 'Export calculation results' : 'Perform a calculation first'}
            >
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Export</span>
              </div>
            </button>

            {/* Tutorial Button */}
            {onShowTutorial && (
              <button
                onClick={onShowTutorial}
                className="p-2 text-gray-400 hover:text-blue-500 rounded-md hover:bg-blue-50 transition-colors duration-200"
                title="Show tutorial"
              >
                <Icons.InfoCircle />
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <div className="h-5 w-5 text-green-400 mr-2">
                <Icons.CheckCircle />
              </div>
              <span className="text-sm text-green-800">{showSuccessMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Calculator Content */}
      <div className="bg-white rounded-lg shadow-lg">
        {children}
      </div>

      {/* Export Modal */}
      {exportData && (
        <ExportResults
          data={exportData}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
};

export default CalculatorWrapper;