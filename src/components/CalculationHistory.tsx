import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import CalculationHistoryManager, { CalculationSummary, CalculationEntry } from '../utils/calculationHistory';

interface CalculationHistoryProps {
  onLoadCalculation?: (calculation: CalculationEntry) => void;
  discipline?: string; // Filter by discipline if provided
  isOpen: boolean;
  onClose: () => void;
}

const CalculationHistory: React.FC<CalculationHistoryProps> = ({
  onLoadCalculation,
  discipline,
  isOpen,
  onClose
}) => {
  const [calculations, setCalculations] = useState<CalculationSummary[]>([]);
  const [filteredCalculations, setFilteredCalculations] = useState<CalculationSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'recent'>('all');
  const [selectedCalculation, setSelectedCalculation] = useState<CalculationEntry | null>(null);

  useEffect(() => {
    loadCalculations();
  }, [discipline]);

  useEffect(() => {
    filterCalculations();
  }, [calculations, searchTerm, filterType]);

  const loadCalculations = () => {
    const history = discipline 
      ? CalculationHistoryManager.getByDiscipline(discipline)
      : CalculationHistoryManager.getHistory();
    
    const summaries = history.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      discipline: entry.discipline,
      calculatorName: entry.calculatorName,
      summary: generateSummary(entry),
      isFavorite: entry.isFavorite || false
    }));
    
    setCalculations(summaries);
  };

  const filterCalculations = () => {
    let filtered = calculations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(calc =>
        calc.calculatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        calc.discipline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        calc.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'favorites':
        filtered = filtered.filter(calc => calc.isFavorite);
        break;
      case 'recent':
        filtered = filtered.slice(0, 10);
        break;
    }

    setFilteredCalculations(filtered);
  };

  const generateSummary = (entry: CalculationEntry): string => {
    switch (entry.calculatorType) {
      case 'cableSizing':
        return `Cable: ${entry.results?.recommendedCable || 'N/A'}, Load: ${entry.inputs?.load || 'N/A'}A`;
      case 'powerFactor':
        return `PF: ${entry.inputs?.powerFactor || 'N/A'} → ${entry.results?.correctedPowerFactor || 'N/A'}`;
      case 'load':
        return `Total Load: ${entry.results?.totalLoad || 'N/A'} kVA`;
      default:
        return 'Calculation completed';
    }
  };

  const handleToggleFavorite = (id: string) => {
    CalculationHistoryManager.toggleFavorite(id);
    loadCalculations();
  };

  const handleDeleteCalculation = (id: string) => {
    if (window.confirm('Are you sure you want to delete this calculation?')) {
      CalculationHistoryManager.deleteCalculation(id);
      loadCalculations();
    }
  };

  const handleLoadCalculation = (id: string) => {
    const calculation = CalculationHistoryManager.getById(id);
    if (calculation && onLoadCalculation) {
      onLoadCalculation(calculation);
      onClose();
    }
  };

  const handleViewDetails = (id: string) => {
    const calculation = CalculationHistoryManager.getById(id);
    setSelectedCalculation(calculation);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Calculation History
                  {discipline && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      - {discipline}
                    </span>
                  )}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icons.Close />
                </button>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search calculations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      filterType === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('favorites')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      filterType === 'favorites'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Favorites
                  </button>
                  <button
                    onClick={() => setFilterType('recent')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      filterType === 'recent'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Recent
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-h-96">
              {filteredCalculations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {calculations.length === 0 
                    ? 'No calculations found' 
                    : 'No calculations match your filters'
                  }
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCalculations.map((calc) => (
                    <div key={calc.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900">
                              {calc.calculatorName}
                            </h3>
                            {calc.isFavorite && (
                              <div className="h-4 w-4 text-yellow-400">
                                <Icons.CheckCircle />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {calc.summary}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(calc.timestamp)} • {calc.discipline}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleToggleFavorite(calc.id)}
                            className={`p-1 rounded ${
                              calc.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-yellow-500'
                            }`}
                            title={calc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Icons.CheckCircle />
                          </button>
                          
                          <button
                            onClick={() => handleViewDetails(calc.id)}
                            className="p-1 text-gray-400 hover:text-blue-500"
                            title="View details"
                          >
                            <Icons.InfoCircle />
                          </button>
                          
                          {onLoadCalculation && (
                            <button
                              onClick={() => handleLoadCalculation(calc.id)}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              title="Load this calculation"
                            >
                              Load
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteCalculation(calc.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Delete calculation"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {filteredCalculations.length} of {calculations.length} calculations
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all calculation history?')) {
                        CalculationHistoryManager.clearHistory();
                        loadCalculations();
                      }
                    }}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedCalculation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60">
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Calculation Details</h3>
                  <button
                    onClick={() => setSelectedCalculation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icons.Close />
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Calculator</h4>
                  <p className="text-sm text-gray-600">{selectedCalculation.calculatorName}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Inputs</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedCalculation.inputs, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Results</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedCalculation.results, null, 2)}
                  </pre>
                </div>
                
                {selectedCalculation.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900">Notes</h4>
                    <p className="text-sm text-gray-600">{selectedCalculation.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CalculationHistory;