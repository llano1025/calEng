import React from 'react';
import { Icons } from './Icons';

interface HeaderProps {
  currentView: 'home' | 'calculator';
  activeDiscipline?: string | null;
  onBackToHome?: () => void;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, activeDiscipline, onBackToHome, onToggleSidebar }) => {
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
            {/* Future actions can be added here */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;