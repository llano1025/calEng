import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

// Define props type for the component
interface LightingPowerDensityCalculatorProps {
  onShowTutorial?: () => void; // Optional function to show tutorial
}

// Space type definition interface
interface SpaceType {
  name: string;
  maxLPD: number;
  automaticControlRequired: boolean;
}

// Luminaire definition interface
interface Luminaire {
  id: string;
  name: string;
  wattage: number;
}

// Space with luminaires interface
interface Space {
  id: string;
  name: string;
  type: string;
  area: number;
  luminaires: Array<{
    luminaireId: string;
    quantity: number;
  }>;
}

// LPD Calculator Component
const LightingPowerDensityCalculator: React.FC<LightingPowerDensityCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Lighting Power Density Calculator',
    discipline: 'electrical',
    calculatorType: 'lpd'
  });

  // State for managing luminaires
  const [luminaires, setLuminaires] = useState<Luminaire[]>([
  ]);
  
  // State for new luminaire form
  const [newLuminaire, setNewLuminaire] = useState<{
    name: string;
    wattage: string;
  }>({
    name: '',
    wattage: '',
  });

  // State for managing spaces
  const [spaces, setSpaces] = useState<Space[]>([]);
  
  // State for new space form
  const [newSpace, setNewSpace] = useState<{
    name: string;
    type: string;
    area: string;
  }>({
    name: '',
    type: 'office_small',
    area: '',
  });

  // State for adding luminaires to a space
  const [addLuminaireToSpace, setAddLuminaireToSpace] = useState<{
    spaceId: string;
    luminaireId: string;
    quantity: string;
  }>({
    spaceId: '',
    luminaireId: '',
    quantity: '1',
  });

  // State for calculation results
  const [calculationResults, setCalculationResults] = useState<{
    [key: string]: {
      totalWattage: number;
      lpd: number;
      maxAllowableLpd: number;
      compliant: boolean;
      controlRequired: boolean;
    }
  }>({});

  // Space types from Table 5.4 - Complete list from attachments
  const spaceTypes: {[key: string]: SpaceType} = {
    activity_room: { 
      name: 'Activity Room / Children play area / Music Room / Recreational Facilities Room', 
      maxLPD: 9.5, 
      automaticControlRequired: true 
    },
    atrium: { 
      name: 'Atrium / Foyer with headroom over 5m', 
      maxLPD: 17.0, 
      automaticControlRequired: true 
    },
    babycare_room: { 
      name: 'Babycare Room / Breastfeeding Room / Lactation Room', 
      maxLPD: 9.7, 
      automaticControlRequired: true 
    },
    bar_lounge: { 
      name: 'Bar / Lounge', 
      maxLPD: 10.0, 
      automaticControlRequired: false 
    },
    banquet_room: { 
      name: 'Banquet Room / Function Room / Ball Room', 
      maxLPD: 12.7, 
      automaticControlRequired: false 
    },
    canteen: { 
      name: 'Canteen', 
      maxLPD: 9.5, 
      automaticControlRequired: false 
    },
    carpark: { 
      name: 'Car Park', 
      maxLPD: 3.0, 
      automaticControlRequired: true 
    },
    changing_room: { 
      name: 'Changing Room / Locker Room', 
      maxLPD: 8.1, 
      automaticControlRequired: true 
    },
    classroom: { 
      name: 'Classroom / Training Room', 
      maxLPD: 9.1, 
      automaticControlRequired: true 
    },
    clinic: { 
      name: 'Clinic', 
      maxLPD: 12.4, 
      automaticControlRequired: true 
    },
    common_room: { 
      name: 'Common Room / Break Room', 
      maxLPD: 8.0, 
      automaticControlRequired: true 
    },
    computer_room: { 
      name: 'Computer Room / Data Centre', 
      maxLPD: 12.5, 
      automaticControlRequired: true 
    },
    conference_room: { 
      name: 'Conference / Seminar Room', 
      maxLPD: 10.6, 
      automaticControlRequired: true 
    },
    confinement_cell: { 
      name: 'Confinement Cell', 
      maxLPD: 12.0, 
      automaticControlRequired: false 
    },
    copy_room: { 
      name: 'Copy / Printing Room, Photocopy Machine Room', 
      maxLPD: 10.0, 
      automaticControlRequired: true 
    },
    corridor: { 
      name: 'Corridor', 
      maxLPD: 6.0, 
      automaticControlRequired: false 
    },
    court_room: { 
      name: 'Court Room', 
      maxLPD: 15.0, 
      automaticControlRequired: true 
    },
    covered_playground: { 
      name: 'Covered Playground (underneath building) / Sky Garden', 
      maxLPD: 12.0, 
      automaticControlRequired: true 
    },
    dormitory: { 
      name: 'Dormitory', 
      maxLPD: 6.1, 
      automaticControlRequired: true 
    },
    entrance_lobby: { 
      name: 'Entrance Lobby', 
      maxLPD: 10.0, 
      automaticControlRequired: true 
    },
    exhibition_hall: { 
      name: 'Exhibition Hall / Gallery', 
      maxLPD: 12.0, 
      automaticControlRequired: true 
    },
    fast_food: { 
      name: 'Fast Food / Food Court', 
      maxLPD: 12.0, 
      automaticControlRequired: false 
    },
    guest_room: { 
      name: 'Guest room in Hotel or Guesthouse', 
      maxLPD: 9.9, 
      automaticControlRequired: false 
    },
    gymnasium: { 
      name: 'Gymnasium / Exercise Room', 
      maxLPD: 9.5, 
      automaticControlRequired: true 
    },
    indoor_pool: { 
      name: 'Indoor Swimming Pool, for recreational or leisure purposes', 
      maxLPD: 15.0, 
      automaticControlRequired: false 
    },
    kitchen: { 
      name: 'Kitchen', 
      maxLPD: 11.5, 
      automaticControlRequired: false 
    },
    laboratory: { 
      name: 'Laboratory', 
      maxLPD: 10.4, 
      automaticControlRequired: false 
    },
    lecture_theatre: { 
      name: 'Lecture Theatre', 
      maxLPD: 13.0, 
      automaticControlRequired: true 
    },
    library_reading: { 
      name: 'Library - Reading Area or Audio Visual Centre', 
      maxLPD: 10.2, 
      automaticControlRequired: true 
    },
    library_stack: { 
      name: 'Library - Stack Area', 
      maxLPD: 12.7, 
      automaticControlRequired: true 
    },
    lift_car: { 
      name: 'Lift Car', 
      maxLPD: 11.0, 
      automaticControlRequired: true 
    },
    lift_lobby: { 
      name: 'Lift Lobby', 
      maxLPD: 7.5, 
      automaticControlRequired: true 
    },
    loading_area: { 
      name: 'Loading & Unloading Area', 
      maxLPD: 8.0, 
      automaticControlRequired: true 
    },
    long_stay_ward: { 
      name: 'Long Stay Ward for elderly', 
      maxLPD: 12.9, 
      automaticControlRequired: false 
    },
    medical_room: { 
      name: 'Medical Examination Room', 
      maxLPD: 12.3, 
      automaticControlRequired: false 
    },
    nurse_station: { 
      name: 'Nurse Station', 
      maxLPD: 13.0, 
      automaticControlRequired: false 
    },
    office_small: { 
      name: 'Office, enclosed (with internal floor area at or below 15m²)', 
      maxLPD: 9.0, 
      automaticControlRequired: true 
    },
    office_medium: { 
      name: 'Office, with internal floor area above 15m² and at or below 200m²', 
      maxLPD: 8.5, 
      automaticControlRequired: true 
    },
    office_large: { 
      name: 'Office, with internal floor area above 200m²', 
      maxLPD: 7.2, 
      automaticControlRequired: true 
    },
    pantry: { 
      name: 'Pantry', 
      maxLPD: 8.5, 
      automaticControlRequired: true 
    },
    passenger_hall_low: { 
      name: 'Passenger Terminal - Arrival/Departure Hall, headroom ≤5m', 
      maxLPD: 14.0, 
      automaticControlRequired: false 
    },
    passenger_hall_high: { 
      name: 'Passenger Terminal - Arrival/Departure Hall, headroom >5m', 
      maxLPD: 18.0, 
      automaticControlRequired: false 
    },
    passenger_circulation: { 
      name: 'Passenger Terminal - Passenger circulation area', 
      maxLPD: 13.0, 
      automaticControlRequired: false 
    },
    patient_ward: { 
      name: 'Patient Ward / Day Care', 
      maxLPD: 11.2, 
      automaticControlRequired: false 
    },
    pharmacy: { 
      name: 'Pharmacy Area', 
      maxLPD: 17.0, 
      automaticControlRequired: false 
    },
    plant_room_small: { 
      name: 'Plant Room / Machine Room / Switch Room (≤15m²)', 
      maxLPD: 9.5, 
      automaticControlRequired: false 
    },
    plant_room_large: { 
      name: 'Plant Room / Machine Room / Switch Room (>15m²)', 
      maxLPD: 8.4, 
      automaticControlRequired: false 
    },
    porte_cochere_low: { 
      name: 'Porte Cochere with headroom not exceeding 5m', 
      maxLPD: 13.0, 
      automaticControlRequired: false 
    },
    porte_cochere_high: { 
      name: 'Porte Cochere with headroom over 5m', 
      maxLPD: 15.0, 
      automaticControlRequired: false 
    },
    public_circulation: { 
      name: 'Public Circulation Area', 
      maxLPD: 9.9, 
      automaticControlRequired: true 
    },
    railway_low: { 
      name: 'Railway Station - Concourse/Platform etc., headroom ≤5m', 
      maxLPD: 14.0, 
      automaticControlRequired: false 
    },
    railway_high: { 
      name: 'Railway Station - Concourse/Platform etc., headroom >5m', 
      maxLPD: 18.0, 
      automaticControlRequired: false 
    },
    refuge_floor: { 
      name: 'Refuge Floor', 
      maxLPD: 11.0, 
      automaticControlRequired: true 
    },
    report_room: { 
      name: 'Report Room (Police Station)', 
      maxLPD: 8.9, 
      automaticControlRequired: false 
    },
    restaurant: { 
      name: 'Restaurant', 
      maxLPD: 12.0, 
      automaticControlRequired: false 
    },
    retail: { 
      name: 'Retail', 
      maxLPD: 11.1, 
      automaticControlRequired: false 
    },
    school_hall: { 
      name: 'School hall', 
      maxLPD: 12.5, 
      automaticControlRequired: true 
    },
    seating_area: { 
      name: 'Seating Area inside Theatre / Cinema / Auditorium / Concert Hall', 
      maxLPD: 10.0, 
      automaticControlRequired: false 
    },
    security_room: { 
      name: 'Security Room / Guard Room', 
      maxLPD: 9.0, 
      automaticControlRequired: false 
    },
    spa_room: { 
      name: 'Spa Room / Massage Room', 
      maxLPD: 13.0, 
      automaticControlRequired: false 
    },
    server_room: { 
      name: 'Server Room / Hub Room', 
      maxLPD: 8.2, 
      automaticControlRequired: false 
    },
    sports_arena_small: { 
      name: 'Sports Arena, Indoor, for recreational purpose (≤1,000m²)', 
      maxLPD: 16.0, 
      automaticControlRequired: true 
    },
    sports_arena_large: { 
      name: 'Sports Arena, Indoor, for recreational purpose (>1,000m²)', 
      maxLPD: 17.0, 
      automaticControlRequired: true 
    },
    staircase: { 
      name: 'Staircase', 
      maxLPD: 5.6, 
      automaticControlRequired: false 
    },
    storeroom_small: { 
      name: 'Storeroom / Cleaner (with internal floor area ≤15m²)', 
      maxLPD: 7.4, 
      automaticControlRequired: true 
    },
    storeroom_large: { 
      name: 'Storeroom / Cleaner (with internal floor area >15m²)', 
      maxLPD: 6.3, 
      automaticControlRequired: true 
    },
    toilet: { 
      name: 'Toilet / Washroom / Shower Room', 
      maxLPD: 9.0, 
      automaticControlRequired: true 
    },
    workshop: { 
      name: 'Workshop', 
      maxLPD: 9.4, 
      automaticControlRequired: false 
    },
    multi_purpose: { 
      name: 'Multi-functional Space (Custom)', 
      maxLPD: 0, // To be calculated based on function-specific luminaires
      automaticControlRequired: false 
    }
  };

  // Function to handle new luminaire changes
  const handleNewLuminaireChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLuminaire({
      ...newLuminaire,
      [e.target.name]: e.target.value
    });
  };

  // Function to add a new luminaire
  const addLuminaire = () => {
    // Validate inputs
    if (!newLuminaire.name.trim() || isNaN(parseFloat(newLuminaire.wattage)) || parseFloat(newLuminaire.wattage) <= 0) {
      alert("Please enter a valid luminaire name and wattage.");
      return;
    }
    
    // Create new luminaire ID (lowercase name with spaces replaced by underscores)
    const id = newLuminaire.name.toLowerCase().replace(/\s+/g, '_');
    
    // Check for duplicate IDs
    if (luminaires.some(lum => lum.id === id)) {
      alert("A luminaire with a similar name already exists. Please use a different name.");
      return;
    }
    
    // Add the new luminaire
    setLuminaires([
      ...luminaires,
      {
        id,
        name: newLuminaire.name,
        wattage: parseFloat(newLuminaire.wattage)
      }
    ]);
    
    // Reset form
    setNewLuminaire({ name: '', wattage: '' });
  };

  // Function to remove a luminaire globally
  const removeLuminaire = (luminaireId: string) => {
    // Check if the luminaire is used in any space
    const isUsed = spaces.some(space => 
      space.luminaires.some(lum => lum.luminaireId === luminaireId)
    );
    
    if (isUsed) {
      alert("This luminaire is used in one or more spaces. Please remove it from all spaces first.");
      return;
    }
    
    // Remove the luminaire
    setLuminaires(prevLuminaires => 
      prevLuminaires.filter(lum => lum.id !== luminaireId)
    );
  };

  // Function to handle new space changes
  const handleNewSpaceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewSpace({
      ...newSpace,
      [e.target.name]: e.target.value
    });
  };

  // Function to add a new space
  const addSpace = () => {
    // Validate inputs
    if (!newSpace.name.trim() || isNaN(parseFloat(newSpace.area)) || parseFloat(newSpace.area) <= 0) {
      alert("Please enter a valid space name and area.");
      return;
    }
    
    // Create new space ID
    const id = `space_${Date.now()}`;
    
    // Add the new space
    setSpaces([
      ...spaces,
      {
        id,
        name: newSpace.name,
        type: newSpace.type,
        area: parseFloat(newSpace.area),
        luminaires: []
      }
    ]);
    
    // Reset form
    setNewSpace({
      name: '',
      type: 'office_small',
      area: ''
    });
    
    // Update add luminaire form with the new space ID
    if (spaces.length === 0) {
      setAddLuminaireToSpace({
        ...addLuminaireToSpace,
        spaceId: id
      });
    }
  };

  // Function to handle add luminaire to space changes
  const handleAddLuminaireToSpaceChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setAddLuminaireToSpace({
      ...addLuminaireToSpace,
      [e.target.name]: e.target.value
    });
  };

  // Function to add a luminaire to a space
  const addLuminaireToSpaceFunc = () => {
    // Validate inputs
    if (!addLuminaireToSpace.spaceId || !addLuminaireToSpace.luminaireId || 
        isNaN(parseInt(addLuminaireToSpace.quantity)) || parseInt(addLuminaireToSpace.quantity) <= 0) {
      alert("Please select a space, luminaire, and enter a valid quantity.");
      return;
    }
    
    const quantity = parseInt(addLuminaireToSpace.quantity);
    
    // Update spaces array
    setSpaces(prevSpaces => {
      return prevSpaces.map(space => {
        if (space.id === addLuminaireToSpace.spaceId) {
          // Check if the luminaire already exists in this space
          const existingLuminaireIndex = space.luminaires.findIndex(
            lum => lum.luminaireId === addLuminaireToSpace.luminaireId
          );
          
          if (existingLuminaireIndex >= 0) {
            // Update the quantity of an existing luminaire
            const updatedLuminaires = [...space.luminaires];
            updatedLuminaires[existingLuminaireIndex] = {
              ...updatedLuminaires[existingLuminaireIndex],
              quantity: updatedLuminaires[existingLuminaireIndex].quantity + quantity
            };
            
            return {
              ...space,
              luminaires: updatedLuminaires
            };
          } else {
            // Add a new luminaire to the space
            return {
              ...space,
              luminaires: [
                ...space.luminaires,
                {
                  luminaireId: addLuminaireToSpace.luminaireId,
                  quantity
                }
              ]
            };
          }
        }
        return space;
      });
    });
    
    // Reset quantity
    setAddLuminaireToSpace({
      ...addLuminaireToSpace,
      quantity: '1'
    });
  };

  // Function to remove a luminaire from a space
  const removeLuminaireFromSpace = (spaceId: string, luminaireId: string) => {
    setSpaces(prevSpaces => {
      return prevSpaces.map(space => {
        if (space.id === spaceId) {
          return {
            ...space,
            luminaires: space.luminaires.filter(lum => lum.luminaireId !== luminaireId)
          };
        }
        return space;
      });
    });
  };

  // Function to remove a space
  const removeSpace = (spaceId: string) => {
    setSpaces(prevSpaces => prevSpaces.filter(space => space.id !== spaceId));
    
    // Update calculation results
    setCalculationResults(prevResults => {
      const newResults = { ...prevResults };
      delete newResults[spaceId];
      return newResults;
    });
  };

  // Function to calculate LPD for all spaces
  const calculateLPD = () => {
    const results: {
      [key: string]: {
        totalWattage: number;
        lpd: number;
        maxAllowableLpd: number;
        compliant: boolean;
        controlRequired: boolean;
      }
    } = {};
    
    spaces.forEach(space => {
      // Calculate total wattage for the space
      let totalWattage = 0;
      
      space.luminaires.forEach(spaceLuminaire => {
        const luminaire = luminaires.find(lum => lum.id === spaceLuminaire.luminaireId);
        if (luminaire) {
          totalWattage += luminaire.wattage * spaceLuminaire.quantity;
        }
      });
      
      // Calculate LPD
      const lpd = totalWattage / space.area;
      
      // Get max allowable LPD and control requirement
      const spaceType = spaceTypes[space.type];
      const maxAllowableLpd = spaceType.maxLPD;
      const controlRequired = spaceType.automaticControlRequired;
      
      // Determine compliance
      const compliant = lpd <= maxAllowableLpd;
      
      // Store results
      results[space.id] = {
        totalWattage,
        lpd,
        maxAllowableLpd,
        compliant,
        controlRequired
      };
    });
    
    setCalculationResults(results);
    
    // Save calculation and prepare export data
    const inputs = {
      'Number of Spaces': spaces.length,
      'Number of Luminaire Types': luminaires.length,
      'Total Area': `${spaces.reduce((sum, space) => sum + space.area, 0)} m²`
    };
    
    const exportResults = {
      'Space Results': Object.fromEntries(
        spaces.map(space => {
          const result = results[space.id];
          return [space.name, {
            'Area': `${space.area} m²`,
            'Total Wattage': `${result.totalWattage} W`,
            'LPD': `${result.lpd.toFixed(2)} W/m²`,
            'Max Allowable LPD': `${result.maxAllowableLpd} W/m²`,
            'Compliance': result.compliant ? 'Compliant' : 'Non-compliant',
            'Control Required': result.controlRequired ? 'Yes' : 'No'
          }];
        })
      ),
      'Overall Compliance': Object.values(results).every(r => r.compliant) ? 'All spaces compliant' : 'Some spaces non-compliant'
    };
    
    saveCalculation(inputs, exportResults);
    prepareExportData(inputs, exportResults);
  };

  // Effect to calculate LPD when spaces or luminaires change
  useEffect(() => {
    if (spaces.length > 0 && luminaires.length > 0) {
      calculateLPD();
    }
  }, [spaces, luminaires]);

  return (
    <CalculatorWrapper
      title="Lighting Power Density Calculator"
      discipline="electrical"
      calculatorType="lpd"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Lighting Power Density (LPD) Calculator</h2>
        {onShowTutorial && (
          <button onClick={onShowTutorial} className="flex items-center text-blue-600 hover:text-blue-800">
            <Icons.InfoInline /> Tutorial
          </button>
        )}
      </div>
      <p className="mb-4 text-gray-600">
        Calculate lighting power density (LPD) for various spaces and check compliance with maximum allowable values.
      </p>

      {/* Luminaire Definition Section */}
      <div className="mb-8 border-b pb-6">
        <h3 className="text-lg font-medium mb-3">Step 1: Define Luminaires</h3>
        
        {/* Current Luminaires Table */}
        <div className="mb-4 overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3 text-left border">Luminaire Name</th>
                <th className="py-2 px-3 text-left border">Wattage (W)</th>
                <th className="py-2 px-3 text-center border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {luminaires.map(luminaire => (
                <tr key={luminaire.id} className="border-t">
                  <td className="py-2 px-3 border">{luminaire.name}</td>
                  <td className="py-2 px-3 border">{luminaire.wattage}</td>
                  <td className="py-2 px-3 border text-center">
                    <button 
                      onClick={() => removeLuminaire(luminaire.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Add New Luminaire Form */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
                <label className="block font-medium mb-1 text-sm">Luminaire Name</label>
                <input
                type="text"
                name="name"
                value={newLuminaire.name}
                onChange={handleNewLuminaireChange}
                className="w-full p-2 border rounded-md text-sm"
                placeholder="e.g. LED Downlight"
                />
            </div>
            <div>
                <label className="block font-medium mb-1 text-sm">Circuit Wattage (W)</label>
                <input
                type="number"
                name="wattage"
                value={newLuminaire.wattage}
                onChange={handleNewLuminaireChange}
                className="w-full p-2 border rounded-md text-sm"
                placeholder="e.g. 18"
                min="0"
                step="0.1"
                />
            </div>
            <div className="flex justify-end">
                <button
                onClick={addLuminaire}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                Add Luminaire
                </button>
            </div>
            </div>
      </div>

      {/* Space Definition Section */}
      <div className="mb-8 border-b pb-6">
        <h3 className="text-lg font-medium mb-3">Step 2: Define Spaces</h3>
        
        {/* Add New Space Form */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
                <label className="block font-medium mb-1 text-sm">Space Name</label>
                <input
                type="text"
                name="name"
                value={newSpace.name}
                onChange={handleNewSpaceChange}
                className="w-full p-2 border rounded-md text-sm"
                placeholder="e.g. Meeting Room 1"
                />
            </div>
            <div>
                <label className="block font-medium mb-1 text-sm">Space Type</label>
                <select
                name="type"
                value={newSpace.type}
                onChange={handleNewSpaceChange}
                className="w-full p-2 border rounded-md text-sm bg-white"
                >
                {Object.entries(spaceTypes)
                    .filter(([key, _]) => key !== 'multi_purpose')
                    .sort(([_, a], [__, b]) => a.name.localeCompare(b.name))
                    .map(([key, type]) => (
                    <option key={key} value={key}>{type.name}</option>
                    ))
                }
                </select>
            </div>
            <div>
                <label className="block font-medium mb-1 text-sm">Area (m²)</label>
                <input
                type="number"
                name="area"
                value={newSpace.area}
                onChange={handleNewSpaceChange}
                className="w-full p-2 border rounded-md text-sm"
                placeholder="e.g. 25"
                min="0.1"
                step="0.1"
                />
            </div>
            <div className="flex justify-end">
                <button
                onClick={addSpace}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                Add Space
                </button>
            </div>
        </div>
      </div>

      {/* Luminaire Assignment Section - only show if spaces exist */}
      {spaces.length > 0 && (
        <div className="mb-8 border-b pb-6">
          <h3 className="text-lg font-medium mb-3">Step 3: Assign Luminaires to Spaces</h3>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
                <label className="block font-medium mb-1 text-sm">Select Space</label>
                <select
                name="spaceId"
                value={addLuminaireToSpace.spaceId}
                onChange={handleAddLuminaireToSpaceChange}
                className="w-full p-2 border rounded-md text-sm bg-white"
                >
                <option value="">-- Select a Space --</option>
                {spaces.map(space => (
                    <option key={space.id} value={space.id}>{space.name}</option>
                ))}
                </select>
            </div>
            <div>
                <label className="block font-medium mb-1 text-sm">Select Luminaire</label>
                <select
                name="luminaireId"
                value={addLuminaireToSpace.luminaireId}
                onChange={handleAddLuminaireToSpaceChange}
                className="w-full p-2 border rounded-md text-sm bg-white"
                >
                <option value="">-- Select a Luminaire --</option>
                {luminaires.map(luminaire => (
                    <option key={luminaire.id} value={luminaire.id}>{luminaire.name} ({luminaire.wattage}W)</option>
                ))}
                </select>
            </div>
            <div>
                <label className="block font-medium mb-1 text-sm">Quantity</label>
                <input
                type="number"
                name="quantity"
                value={addLuminaireToSpace.quantity}
                onChange={handleAddLuminaireToSpaceChange}
                className="w-full p-2 border rounded-md text-sm"
                min="1"
                step="1"
                />
            </div>
            <div className="flex justify-end">
                <button
                onClick={addLuminaireToSpaceFunc}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                Add to Space
                </button>
            </div>
            </div>
        </div>
      )}

      {/* Results Section - only show if spaces exist */}
      {spaces.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Step 4: Results</h3>
          
          {spaces.map(space => {
            const result = calculationResults[space.id];
            const spaceType = spaceTypes[space.type];
            
            return (
              <div key={space.id} className="mb-6 border rounded-lg overflow-hidden">
                <div className="flex justify-between items-center bg-gray-100 p-3 border-b">
                  <h4 className="font-medium">
                    {space.name}
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({spaceType.name}, {space.area} m²)
                    </span>
                  </h4>
                  <button 
                    onClick={() => removeSpace(space.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Remove Space"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Space Luminaires */}
                <div className="p-3">
                  <h5 className="font-medium mb-2 text-sm">Luminaires in this Space:</h5>
                  
                  {space.luminaires.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">No luminaires assigned yet.</p>
                  ) : (
                    <table className="w-full text-sm border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-1 px-2 text-left border">Luminaire</th>
                          <th className="py-1 px-2 text-left border">Wattage (W)</th>
                          <th className="py-1 px-2 text-left border">Quantity</th>
                          <th className="py-1 px-2 text-left border">Total Wattage (W)</th>
                          <th className="py-1 px-2 text-left border">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {space.luminaires.map(spaceLuminaire => {
                          const luminaire = luminaires.find(lum => lum.id === spaceLuminaire.luminaireId);
                          if (!luminaire) return null;
                          
                          return (
                            <tr key={`${space.id}-${spaceLuminaire.luminaireId}`} className="border-t">
                              <td className="py-1 px-2 border">{luminaire.name}</td>
                              <td className="py-1 px-2 border">{luminaire.wattage}</td>
                              <td className="py-1 px-2 border">{spaceLuminaire.quantity}</td>
                              <td className="py-1 px-2 border">{luminaire.wattage * spaceLuminaire.quantity}</td>
                              <td className="py-1 px-2 border">
                                <button 
                                  onClick={() => removeLuminaireFromSpace(space.id, spaceLuminaire.luminaireId)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                
                {/* LPD Calculation Results */}
                {result && (
                  <div className={`p-3 mt-2 ${result.compliant ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Wattage:</span> {result.totalWattage.toFixed(1)} W
                      </div>
                      <div>
                        <span className="font-medium">Calculated LPD:</span> {result.lpd.toFixed(2)} W/m²
                      </div>
                      <div>
                        <span className="font-medium">Max Allowable LPD:</span> {result.maxAllowableLpd.toFixed(1)} W/m²
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-1 ${result.compliant ? 'text-green-600' : 'text-red-600'} font-medium`}>
                        {result.compliant ? 'Compliant' : 'Non-Compliant'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Automatic Lighting Control:</span> 
                      <span className="ml-1">
                        {result.controlRequired ? 'Required' : 'Not Required'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Overall Summary */}
          {Object.keys(calculationResults).length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-2">Overall Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Spaces:</span> {spaces.length}
                </div>
                <div>
                  <span className="font-medium">Compliant Spaces:</span> {
                    Object.values(calculationResults).filter(r => r.compliant).length
                  } of {Object.keys(calculationResults).length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reference Tables Section */}
      <div className="mt-8 border-t pt-4">
        <h3 className="text-lg font-medium mb-3">Reference: Maximum Allowable LPD (W/m²)</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3 text-left border">Type of Space</th>
                <th className="py-2 px-3 text-center border">Maximum Allowable LPD (W/m²)</th>
                <th className="py-2 px-3 text-center border">Automatic Lighting Control Required</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(spaceTypes)
                // Filter out multi-functional space as it's a special case
                .filter(type => type.name !== 'Multi-functional Space (Custom)')
                // Sort by space name
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((type, index) => (
                <tr key={index} className="border-t">
                  <td className="py-1 px-3 border">{type.name}</td>
                  <td className="py-1 px-3 border text-center">{type.maxLPD.toFixed(1)}</td>
                  <td className="py-1 px-3 border text-center">{type.automaticControlRequired ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>Note: For multi-functional spaces, LPD of each combination of function-specific luminaires should not exceed the maximum allowable value corresponding to the type of space illuminated by that combination of luminaires.</p>
          <p className="mt-1">Some space types are allowed to adopt simplified trade-off schemes as stipulated in the relevant building energy code clauses.</p>
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

export default LightingPowerDensityCalculator;