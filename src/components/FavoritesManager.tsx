import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

export interface FavoriteCalculator {
  id: string;
  name: string;
  discipline: string;
  calculatorType: string;
  description: string;
  addedDate: Date;
  lastUsed?: Date;
  useCount: number;
}

class FavoritesManager {
  private static readonly STORAGE_KEY = 'engineeringCalc_favorites';

  static getFavorites(): FavoriteCalculator[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((fav: any) => ({
        ...fav,
        addedDate: new Date(fav.addedDate),
        lastUsed: fav.lastUsed ? new Date(fav.lastUsed) : undefined
      }));
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }

  static addFavorite(calculator: Omit<FavoriteCalculator, 'id' | 'addedDate' | 'useCount'>): string {
    const favorites = this.getFavorites();
    
    // Check if already exists
    const existing = favorites.find(fav => 
      fav.discipline === calculator.discipline && 
      fav.calculatorType === calculator.calculatorType
    );
    
    if (existing) {
      return existing.id;
    }

    const newFavorite: FavoriteCalculator = {
      id: this.generateId(),
      addedDate: new Date(),
      useCount: 0,
      ...calculator
    };

    favorites.unshift(newFavorite);
    this.saveToStorage(favorites);
    return newFavorite.id;
  }

  static removeFavorite(id: string): boolean {
    const favorites = this.getFavorites();
    const index = favorites.findIndex(fav => fav.id === id);
    
    if (index !== -1) {
      favorites.splice(index, 1);
      this.saveToStorage(favorites);
      return true;
    }
    
    return false;
  }

  static isFavorite(discipline: string, calculatorType: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some(fav => 
      fav.discipline === discipline && 
      fav.calculatorType === calculatorType
    );
  }

  static updateLastUsed(discipline: string, calculatorType: string): void {
    const favorites = this.getFavorites();
    const favorite = favorites.find(fav => 
      fav.discipline === discipline && 
      fav.calculatorType === calculatorType
    );
    
    if (favorite) {
      favorite.lastUsed = new Date();
      favorite.useCount += 1;
      this.saveToStorage(favorites);
    }
  }

  static getMostUsed(limit: number = 5): FavoriteCalculator[] {
    return this.getFavorites()
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }

  static getRecentlyUsed(limit: number = 5): FavoriteCalculator[] {
    return this.getFavorites()
      .filter(fav => fav.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, limit);
  }

  private static generateId(): string {
    return `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static saveToStorage(favorites: FavoriteCalculator[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }
}

interface FavoritesProps {
  onSelectCalculator: (discipline: string, calculatorType: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Favorites: React.FC<FavoritesProps> = ({ onSelectCalculator, isOpen, onClose }) => {
  const [favorites, setFavorites] = useState<FavoriteCalculator[]>([]);
  const [view, setView] = useState<'all' | 'mostUsed' | 'recent'>('all');

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen]);

  const loadFavorites = () => {
    setFavorites(FavoritesManager.getFavorites());
  };

  const handleRemoveFavorite = (id: string) => {
    if (window.confirm('Remove this calculator from favorites?')) {
      FavoritesManager.removeFavorite(id);
      loadFavorites();
    }
  };

  const handleSelectCalculator = (discipline: string, calculatorType: string) => {
    FavoritesManager.updateLastUsed(discipline, calculatorType);
    onSelectCalculator(discipline, calculatorType);
    onClose();
  };

  const getDisplayedFavorites = () => {
    switch (view) {
      case 'mostUsed':
        return FavoritesManager.getMostUsed(10);
      case 'recent':
        return FavoritesManager.getRecentlyUsed(10);
      default:
        return favorites;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Favorite Calculators
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icons.Close />
                </button>
              </div>
            </div>

            {/* View Toggle */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <button
                  onClick={() => setView('all')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    view === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Favorites ({favorites.length})
                </button>
                <button
                  onClick={() => setView('mostUsed')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    view === 'mostUsed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Most Used
                </button>
                <button
                  onClick={() => setView('recent')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    view === 'recent'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Recently Used
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-h-96">
              {getDisplayedFavorites().length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 text-gray-400 mx-auto mb-4">
                    <Icons.InfoCircle />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No favorite calculators
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Mark calculators as favorites to access them quickly
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Browse Calculators
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {getDisplayedFavorites().map((favorite) => (
                    <div
                      key={favorite.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {favorite.name}
                          </h3>
                          <p className="text-xs text-gray-600 mb-2">
                            {favorite.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="inline-flex items-center">
                              <div className="h-3 w-3 mr-1">
                                <Icons.Calculator />
                              </div>
                              {favorite.discipline}
                            </span>
                            
                            {favorite.useCount > 0 && (
                              <span className="inline-flex items-center">
                                <div className="h-3 w-3 mr-1">
                                  <Icons.Play />
                                </div>
                                Used {favorite.useCount} times
                              </span>
                            )}
                            
                            {favorite.lastUsed && (
                              <span className="inline-flex items-center">
                                <div className="h-3 w-3 mr-1">
                                  <Icons.InfoCircle />
                                </div>
                                Last: {formatDate(favorite.lastUsed)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleSelectCalculator(favorite.discipline, favorite.calculatorType)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Open
                          </button>
                          
                          <button
                            onClick={() => handleRemoveFavorite(favorite.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Remove from favorites"
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
                  {getDisplayedFavorites().length} favorites shown
                </span>
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
    </>
  );
};

export { FavoritesManager };
export default Favorites;