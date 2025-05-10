import React, { useState, useMemo } from 'react';
import { engineeringSystemsData } from './data/systems'; // Import data
import DisciplineSelection from './components/DisciplineSelection'; // Import selection component
import GenericCalculator from './calculators/GenericCalculator'; // Import generic calc
import BroadcastReceptionCalculator from './calculators/BroadcastCalculator'; // Import specific calc
import ElectricalCalculator from './calculators/ElectricalCalculator'; // Import electrical calc
import { Icons } from './components/Icons'; // Import Icons if needed directly in App (unlikely now)

// Define view types
type View = 'home' | 'calculator';

// Main App Component (Manages Routing/Views)
function App() {
    // State to track the current view: 'home' or 'calculator'
    const [currentView, setCurrentView] = useState<View>('home');
    // State to store the key of the selected discipline when navigating
    const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);

    // Handler to switch view to the calculator for a specific discipline
    const handleSelectDiscipline = (disciplineKey: string) => {
        setActiveDiscipline(disciplineKey); // Store the selected discipline key
        setCurrentView('calculator');       // Change the view state
    };

    // Handler to switch view back to the home/selection screen
    const handleBackToHome = () => {
        setActiveDiscipline(null); // Clear the active discipline
        setCurrentView('home');    // Change the view state
    };

    // Use memoized data to avoid redefining on every render (optional but good practice)
    const systems = useMemo(() => engineeringSystemsData, []);

    return (
        // Main layout container
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4 sm:p-8 font-sans">
            <div className="container mx-auto max-w-5xl bg-white rounded-xl shadow-2xl p-6 sm:p-10">
                {/* App Title */}
                <h1 className="text-3xl sm:text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-800">
                    Engineering Calculator
                </h1>

                {/* Conditional Rendering based on currentView state */}
                {currentView === 'home' && (
                    // Render the Discipline Selection component
                    <DisciplineSelection
                        systems={systems} // Pass system data (needed for buttons)
                        onSelectDiscipline={handleSelectDiscipline} // Pass the navigation handler
                    />
                )}

                {/* --- Routing Logic --- */}
                {currentView === 'calculator' && activeDiscipline === 'broadcast' && (
                    // Render the Broadcast Reception Calculator
                     <BroadcastReceptionCalculator
                        onBack={handleBackToHome} // Pass the back navigation handler
                     />
                )}
                
                {currentView === 'calculator' && activeDiscipline === 'electrical' && (
                    // Render the Electrical Installation Calculator
                     <ElectricalCalculator
                        onBack={handleBackToHome} // Pass the back navigation handler
                     />
                )}

                {currentView === 'calculator' && activeDiscipline && activeDiscipline !== 'broadcast' && activeDiscipline !== 'electrical' && (
                    // Render the generic Calculator component for other disciplines
                    <GenericCalculator
                        systems={systems} // Pass all system data
                        initialDiscipline={activeDiscipline} // Pass the selected discipline key
                        onBack={handleBackToHome}           // Pass the back navigation handler
                    />
                )}
                 {/* --- End Routing Logic --- */}

            </div>
            {/* Basic fade-in animation style (could be moved to a CSS file) */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
}

export default App; // Export the main App component