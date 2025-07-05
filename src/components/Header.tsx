import React from 'react';
import { Icons } from './Icons';

interface HeaderProps {
  currentView: 'home' | 'calculator';
  activeDiscipline?: string | null;
  onBackToHome?: () => void;
  onToggleSidebar?: () => void;
  onShowHistory?: () => void;
  onShowFavorites?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, activeDiscipline, onBackToHome, onToggleSidebar, onShowHistory, onShowFavorites }) => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Navigation */}
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle Button */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* Back Button for Calculator View */}
            {currentView === 'calculator' && onBackToHome && (
              <button
                onClick={onBackToHome}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200 rounded-md hover:bg-gray-100"
              >
                <Icons.ArrowLeft />
                <span className="hidden sm:block ml-2">Back</span>
              </button>
            )}
            
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 text-blue-600">
                  <Icons.Calculator />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">
                  Engineering Calculator
                </h1>
                {activeDiscipline && (
                  <p className="text-sm text-gray-500 capitalize">
                    {activeDiscipline.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-3">
            {/* Favorites Button */}
            {onShowFavorites && (
              <button
                onClick={onShowFavorites}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors duration-200"
                title="Favorite Calculators"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            )}

            {/* History Button */}
            {onShowHistory && (
              <button
                onClick={onShowHistory}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors duration-200"
                title="Calculation History"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;