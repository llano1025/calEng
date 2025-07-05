import React, { useState, useMemo } from 'react';
import { engineeringSystemsData } from './data/systems'; // Import data
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Breadcrumb from './components/Breadcrumb';
import Sidebar from './components/Sidebar';
import CalculationHistory from './components/CalculationHistory';
import Favorites from './components/FavoritesManager';
import ExportResults from './components/ExportResults';
import { ExportData } from './utils/exportResults';
import CalculationHistoryManager, { CalculationEntry } from './utils/calculationHistory';
import { FavoritesManager } from './components/FavoritesManager';
import DisciplineSelection from './components/DisciplineSelection'; // Import selection component
import GenericCalculator from './calculators/GenericCalculator'; // Import generic calc
import BroadcastReceptionCalculator from './calculators/ELVCalculator'; // Import specific calc
import ElectricalCalculator from './calculators/ElectricalCalculator'; // Import electrical calc
import MVACalculator from './calculators/MVACalculator'; // Import MVAC calc
import FireServicesCalculator from './calculators/FireServicesCalculator'; // Import Fire Services calc
import MedicalGasCalculator from './calculators/MedicalGasCalculator'; // Import Medical Gas calc
import PumpingDrainageCalculator from './calculators/PumpingDrainageCalculator'; // Import Pumping Drainage calc
import VerticalTransportationCalculator from './calculators/VerticalTransportationCalculator'; // Import Vertical Transportation calc

// Define view types
type View = 'home' | 'calculator';

// Main App Component (Manages Routing/Views)
function AppContent() {
    // State to track the current view: 'home' or 'calculator'
    const [currentView, setCurrentView] = useState<View>('home');
    // State to store the key of the selected discipline when navigating
    const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);
    // State to control sidebar visibility
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    // State to control modal visibility
    const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
    const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);
    const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
    const [exportData, setExportData] = useState<ExportData | null>(null);

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

    // Handler to toggle sidebar visibility
    const handleToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Handler to close sidebar
    const handleCloseSidebar = () => {
        setIsSidebarOpen(false);
    };

    // Handler to show/hide modals
    const handleShowHistory = () => {
        setIsHistoryOpen(true);
    };

    const handleShowFavorites = () => {
        setIsFavoritesOpen(true);
    };

    const handleShowExport = (data: ExportData) => {
        setExportData(data);
        setIsExportOpen(true);
    };

    // Handler to load calculation from history
    const handleLoadCalculation = (calculation: CalculationEntry) => {
        // Navigate to the appropriate calculator
        setActiveDiscipline(calculation.discipline);
        setCurrentView('calculator');
        
        // TODO: Pass the calculation data to the calculator component
        // This would require updating each calculator to accept initial data
        console.log('Loading calculation:', calculation);
    };

    // Handler to select calculator from favorites
    const handleSelectFromFavorites = (discipline: string, calculatorType: string) => {
        setActiveDiscipline(discipline);
        setCurrentView('calculator');
        
        // Update usage statistics
        FavoritesManager.updateLastUsed(discipline, calculatorType);
    };

    // Use memoized data to avoid redefining on every render (optional but good practice)
    const systems = useMemo(() => engineeringSystemsData, []);

    // Generate breadcrumb items
    const getBreadcrumbItems = () => {
        const items: { label: string; onClick?: () => void; isActive?: boolean }[] = [
            { label: 'Home', onClick: currentView !== 'home' ? handleBackToHome : undefined }
        ];
        
        if (activeDiscipline && currentView === 'calculator') {
            const disciplineName = systems[activeDiscipline]?.name || activeDiscipline;
            items.push({ label: disciplineName, isActive: true, onClick: undefined });
        }
        
        return items;
    };

    return (
        // Main layout container
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <Header 
                currentView={currentView}
                activeDiscipline={activeDiscipline}
                onBackToHome={currentView === 'calculator' ? handleBackToHome : undefined}
                onToggleSidebar={handleToggleSidebar}
                onShowHistory={handleShowHistory}
                onShowFavorites={handleShowFavorites}
            />

            {/* Layout with Sidebar */}
            <div className="flex">
                {/* Sidebar */}
                <Sidebar
                    systems={systems}
                    onSelectDiscipline={handleSelectDiscipline}
                    activeDiscipline={activeDiscipline}
                    isOpen={isSidebarOpen}
                    onClose={handleCloseSidebar}
                />

                {/* Main Content */}
                <main className="flex-1 lg:ml-0 transition-all duration-300">
                    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                        {/* Breadcrumb Navigation */}
                        <Breadcrumb items={getBreadcrumbItems()} />

                        {/* Content Area */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
                            {/* Conditional Rendering based on currentView state */}
                            {currentView === 'home' && (
                                // Render the modern Dashboard component
                                <Dashboard
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

                            {currentView === 'calculator' && activeDiscipline === 'mvac' && (
                                // Render the MVAC Calculator
                                <MVACalculator
                                    onBack={handleBackToHome} // Pass the back navigation handler
                                />
                            )}

                            {currentView === 'calculator' && activeDiscipline === 'fire_services' && (
                                // Render the Fire Services Calculator
                                <FireServicesCalculator
                                    onBack={handleBackToHome} // Pass the back navigation handler
                                />
                            )}

                            {currentView === 'calculator' && activeDiscipline === 'medical_gas' && (
                                // Render the Medical Gas Calculator
                                <MedicalGasCalculator
                                    onBack={handleBackToHome} // Pass the back navigation handler
                                />
                            )}

                            {currentView === 'calculator' && activeDiscipline === 'pumping_drainage' && (
                                // Render the Pumping and Drainage Calculator
                                <PumpingDrainageCalculator
                                    onBack={handleBackToHome} // Pass the back navigation handler
                                />
                            )}

                            {currentView === 'calculator' && activeDiscipline === 'vertical_transportation' && (
                                // Render the Vertical Transportation Calculator
                                <VerticalTransportationCalculator
                                    onBack={handleBackToHome} // Pass the back navigation handler
                                />
                            )}

                            {currentView === 'calculator' && activeDiscipline && 
                                activeDiscipline !== 'broadcast' && 
                                activeDiscipline !== 'electrical' && 
                                activeDiscipline !== 'mvac' && 
                                activeDiscipline !== 'fire_services' && 
                                activeDiscipline !== 'medical_gas' && 
                                activeDiscipline !== 'pumping_drainage' && 
                                activeDiscipline !== 'vertical_transportation' && (
                                // Render the generic Calculator component for other disciplines
                                <GenericCalculator
                                    systems={systems} // Pass all system data
                                    initialDiscipline={activeDiscipline} // Pass the selected discipline key
                                    onBack={handleBackToHome}           // Pass the back navigation handler
                                />
                            )}
                            {/* --- End Routing Logic --- */}

                        </div>
                    </div>
                </main>
            </div>

            {/* Modal Components */}
            <CalculationHistory
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onLoadCalculation={handleLoadCalculation}
                discipline={activeDiscipline || undefined}
            />

            <Favorites
                isOpen={isFavoritesOpen}
                onClose={() => setIsFavoritesOpen(false)}
                onSelectCalculator={handleSelectFromFavorites}
            />

            {exportData && (
                <ExportResults
                    data={exportData}
                    isOpen={isExportOpen}
                    onClose={() => setIsExportOpen(false)}
                />
            )}
        </div>
    );
}

// Main App component
function App() {
    return <AppContent />;
}

export default App; // Export the main App component