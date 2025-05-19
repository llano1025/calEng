import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface TVSignalStrengthCalculatorProps {
  onShowTutorial?: () => void;
}

// Define diagram component type
interface DiagramComponent {
  id: string;
  type: 'antenna' | 'amplifier' | 'cable' | 'splitter';
  x: number;
  y: number;
  canEdit: boolean;
  order: number;
  gain?: number | string;
  length?: number | string;
  lossPerMeter?: number | string;
  loss?: number | string;
}

const TVSignalStrengthCalculator: React.FC<TVSignalStrengthCalculatorProps> = ({ onShowTutorial }) => {
  // State for signal strength calculator inputs
  const [signalStrengthInputs, setSignalStrengthInputs] = useState({
    antennaSignal: '500', 
    amplifierGain: '26', 
    cableLossPerMeter: '0.05', 
    cableLengthToSplitter: '120',
    splitterCount: '2', 
    splitterLossPerSplitter: '10', 
    cableLengthToOutlet: '40', 
    cableJointLoss: '3', 
    outletLoss: '1'
  });

  // Reference for circuit diagram canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State for circuit components (for diagram)
  const [components, setComponents] = useState<DiagramComponent[]>([
    { id: 'antenna-1', type: 'antenna', x: 50, y: 80, canEdit: false, order: 1 },
    { id: 'amplifier-1', type: 'amplifier', x: 150, y: 80, canEdit: true, gain: 26, order: 2 },
    { id: 'cable-1', type: 'cable', x: 200, y: 80, canEdit: true, length: 120, lossPerMeter: 0.05, order: 3 },
    { id: 'splitter-1', type: 'splitter', x: 300, y: 80, canEdit: true, loss: 10, order: 4 },
    { id: 'splitter-2', type: 'splitter', x: 400, y: 80, canEdit: true, loss: 10, order: 5 }
  ]);

  // State for calculation results
  const [signalStrengthResults, setSignalStrengthResults] = useState<any>(null);

  // State for canvas view controls
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // NEW STATE: to track selected component for editing
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // --- Handlers for Inputs ---
  const handleSignalStrengthInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSignalStrengthInputs({ ...signalStrengthInputs, [e.target.name]: e.target.value });
  };

  // --- Handlers for Component Diagram ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const zoomIn = () => { setCanvasScale(prev => Math.min(prev + 0.1, 3.0)); };
  const zoomOut = () => { setCanvasScale(prev => Math.max(prev - 0.1, 0.5)); };
  const resetView = () => { setCanvasScale(1.0); setCanvasOffset({ x: 0, y: 0 }); };
  
  const addComponent = (type: 'amplifier' | 'cable' | 'splitter') => {
    const id = `${type}-${Date.now()}`;
    const maxOrder = components.reduce((max, comp) => Math.max(max, comp.order), 0);
    let newComponent: DiagramComponent = {
      id, type, x: 0, y: 80, canEdit: true, order: maxOrder + 1
    };
    if (type === 'amplifier') { newComponent.gain = 26; }
    else if (type === 'cable') { newComponent.length = 50; newComponent.lossPerMeter = 0.05; }
    else if (type === 'splitter') { newComponent.loss = 10; }
    setComponents([...components, newComponent]);
  };
  
  const deleteComponent = (id: string) => {
    const newComponents = components.filter(comp => comp.id !== id);
    setComponents(newComponents);
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  };
  
  const moveComponentUp = (id: string) => {
    const index = components.findIndex(comp => comp.id === id);
    if (index <= 1) return; // Cannot move antenna or first component after antenna
    const newComponents = [...components];
    // Simple swap of order numbers
    const currentOrder = newComponents[index].order;
    newComponents[index].order = newComponents[index - 1].order;
    newComponents[index - 1].order = currentOrder;
    newComponents.sort((a, b) => a.order - b.order); // Re-sort based on new order
    setComponents(newComponents);
  };
  
  const moveComponentDown = (id: string) => {
    const index = components.findIndex(comp => comp.id === id);
    if (index === -1 || index >= components.length - 1) return; // Cannot move last component
    const newComponents = [...components];
    // Simple swap of order numbers
    const currentOrder = newComponents[index].order;
    newComponents[index].order = newComponents[index + 1].order;
    newComponents[index + 1].order = currentOrder;
    newComponents.sort((a, b) => a.order - b.order); // Re-sort based on new order
    setComponents(newComponents);
  };
  
  const updateComponent = (id: string, property: keyof DiagramComponent, value: string | number) => {
    const newComponents = components.map(comp => {
      if (comp.id === id) {
        // Ensure numeric conversion for relevant properties if needed
        const updatedValue = (property === 'gain' || property === 'length' || property === 'lossPerMeter' || property === 'loss')
            ? parseFloat(value as string) || 0 // Handle potential NaN
            : value;
        return { ...comp, [property]: updatedValue };
      }
      return comp;
    });
    setComponents(newComponents);
  };

  // Helper to get component icon based on type
  const getComponentIcon = (type: string) => {
    switch(type) {
      case 'amplifier': return <Icons.Amplifier />;
      case 'cable': return <Icons.Cable />;
      case 'splitter': return <Icons.Splitter />;
      default: return null;
    }
  };

  // Helper to get component label
  const getComponentLabel = (comp: DiagramComponent) => {
    switch(comp.type) {
      case 'antenna': return 'Antenna';
      case 'amplifier': return `Amplifier (${comp.gain || 0}dB)`;
      case 'cable': return `Cable (${comp.length || 0}m)`;
      case 'splitter': 
        const splitterIndex = components
          .filter(c => c.type === 'splitter')
          .findIndex(c => c.id === comp.id) + 1;
        return `Splitter ${splitterIndex}`;
      default: return comp.type;
    }
  };

  // Effect for global mouse listeners for panning
  useEffect(() => {
    const handleCanvasMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasOffset(prevOffset => ({
        x: prevOffset.x + dx,
        y: prevOffset.y + dy
      }));
      setPanStart({ x: e.clientX, y: e.clientY }); // Update start for next move delta
    };
    
    const handleCanvasMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
    };

    if (isPanning) {
      document.addEventListener('mousemove', handleCanvasMouseMove);
      document.addEventListener('mouseup', handleCanvasMouseUp);
    }

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleCanvasMouseMove);
      document.removeEventListener('mouseup', handleCanvasMouseUp);
    };
  }, [isPanning, panStart]); // Re-run effect if isPanning changes

  // Effect to Draw Circuit Diagram
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return; // Ensure context is available

      // Get canvas dimensions for clearing
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width; // Set internal canvas size based on display size
      canvas.height = height;

      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
      ctx.save(); // Save default state
      ctx.translate(canvasOffset.x, canvasOffset.y); // Apply pan
      ctx.scale(canvasScale, canvasScale); // Apply zoom

      // Styles
      ctx.strokeStyle = '#1E40AF'; ctx.fillStyle = '#1E40AF'; ctx.lineWidth = 2; ctx.font = '12px Arial';

      // Sort components by order
      const sortedComponents = [...components].sort((a, b) => a.order - b.order);

      // Calculate X positions (simple linear layout)
      const SPACING = 120; // Increased spacing
      const START_X = 50;
      const COMPONENT_Y = canvas.height / (2 * canvasScale) - canvasOffset.y / canvasScale; // Center vertically roughly
      let currentX = START_X;

      sortedComponents.forEach((comp) => {
        comp.x = currentX;
        comp.y = COMPONENT_Y; // Assign calculated Y
        currentX += SPACING;
      });

      // Draw connections
      for (let i = 0; i < sortedComponents.length - 1; i++) {
        const curr = sortedComponents[i]; const next = sortedComponents[i + 1];
        const startX = curr.x + 20; // Adjust connection points if needed
        const endX = next.x - 20;
        ctx.beginPath(); ctx.moveTo(startX, curr.y); ctx.lineTo(endX, next.y); ctx.stroke();
      }

      // Draw components
      for (const component of sortedComponents) {
        const compX = component.x;
        const compY = component.y;

        // Highlight selected component
        if (component.id === selectedComponent) {
          ctx.save();
          ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
          ctx.beginPath();
          ctx.arc(compX, compY, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        switch (component.type) {
          case 'antenna':
            ctx.beginPath();
            ctx.moveTo(compX, compY); ctx.lineTo(compX, compY - 30); // Vertical line
            ctx.moveTo(compX, compY - 30); ctx.lineTo(compX - 15, compY - 15); // Left arm
            ctx.moveTo(compX, compY - 30); ctx.lineTo(compX + 15, compY - 15); // Right arm
            ctx.stroke();
            ctx.fillText('Antenna', compX - 20, compY + 30);
            break;
          case 'amplifier':
            ctx.beginPath();
            ctx.moveTo(compX - 15, compY - 15); // Top-left
            ctx.lineTo(compX + 15, compY);      // Middle-right
            ctx.lineTo(compX - 15, compY + 15); // Bottom-left
            ctx.closePath();
            ctx.stroke();
            ctx.fillText(`Amp (${component.gain || 0}dB)`, compX - 20, compY + 30);
            break;
          case 'splitter':
            ctx.beginPath(); ctx.arc(compX, compY, 20, 0, 2 * Math.PI); ctx.stroke(); // Circle
            const splitterIndex = sortedComponents.filter(c => c.type === 'splitter').findIndex(c => c.id === component.id) + 1;
            ctx.fillText(`S${splitterIndex} (-${component.loss || 0}dB)`, compX - 15, compY + 5); // Label inside/near circle
            // Draw outlet path
            const outletY = compY + 80;
            ctx.beginPath(); ctx.moveTo(compX, compY + 20); ctx.lineTo(compX, outletY); ctx.stroke(); // Line down
            ctx.beginPath(); ctx.rect(compX - 15, outletY, 30, 30); ctx.stroke(); // Outlet box
            ctx.fillText(`TV ${splitterIndex}`, compX - 10, outletY + 20); // Label below box
            break;
          case 'cable':
            // Draw a representation or just label
            ctx.fillText(`Cable (${component.length || 0}m)`, compX - 25, compY + 30);
            break;
          default: break;
        }
      }

      // Draw signal strength values if results exist
      if (signalStrengthResults) {
        let currentSignal = parseFloat(signalStrengthResults.antennaSignalDBuV);
        ctx.fillStyle = '#10B981'; // Green for signal values
        ctx.font = 'bold 12px Arial';

        for (let i = 0; i < sortedComponents.length; i++) {
          const component = sortedComponents[i];
          const compX = component.x;
          const compY = component.y;
          let signalText = '';
          let signalX = compX; // Default position
          let signalY = compY - 30; // Default position above component

          if (component.type === 'antenna') {
            signalText = `${currentSignal.toFixed(1)} dBμV`;
            signalX = compX + 5; // Position after antenna symbol
            signalY = compY - 15;
          } else if (component.type === 'amplifier') {
            // Signal *after* amplification
            currentSignal += parseFloat(String(component.gain || 0));
            signalText = `${currentSignal.toFixed(1)} dBμV`;
            signalX = compX + 20; // Position after amplifier symbol
          } else if (component.type === 'cable') {
            // Signal *after* cable loss
            const cableLoss = parseFloat(String(component.lossPerMeter || 0)) * parseFloat(String(component.length || 0));
            currentSignal -= cableLoss;
            signalText = `${currentSignal.toFixed(1)} dBμV`;
            signalX = compX + 20; // Position after cable representation (line end)
          } else if (component.type === 'splitter') {
            // Display signal *before* splitter loss (above input line)
            ctx.fillText(`${currentSignal.toFixed(1)} dBμV`, compX - 50, compY - 5);

            // Apply splitter loss
            const splitterLoss = parseFloat(String(component.loss || 0));
            currentSignal -= splitterLoss;

            // Display signal at TV outlet (calculated separately)
            const cableLossToOutlet = parseFloat(signalStrengthInputs.cableLossPerMeter) * parseFloat(signalStrengthInputs.cableLengthToOutlet);
            const cableJointLoss = parseFloat(signalStrengthInputs.cableJointLoss);
            const outletLoss = parseFloat(signalStrengthInputs.outletLoss);
            const outletSignal = currentSignal - cableLossToOutlet - cableJointLoss - outletLoss;
            ctx.fillText(`${outletSignal.toFixed(1)} dBμV`, compX + 5, compY + 115); // Below TV box

            // Signal text for the main line *after* splitter loss
            signalText = `${currentSignal.toFixed(1)} dBμV`;
            signalX = compX + 25; // Position after splitter symbol
          }

          if (signalText) {
            ctx.fillText(signalText, signalX, signalY);
          }
        }
      }
      ctx.restore(); // Restore default state
    }
  }, [components, signalStrengthResults, signalStrengthInputs, canvasScale, canvasOffset, selectedComponent]); // Dependencies for redraw

  // --- Calculation Function ---
  const calculateSignalStrength = () => {
    const antennaSignalMicrovolts = parseFloat(signalStrengthInputs.antennaSignal);
    if (isNaN(antennaSignalMicrovolts) || antennaSignalMicrovolts <= 0) {
      alert("Please enter a valid positive Antenna Signal (μV).");
      return;
    }
    const antennaSignalDBuV = 20 * Math.log10(antennaSignalMicrovolts);
    let currentSignal = antennaSignalDBuV;
    let splitterInputSignal = NaN;
    let splitterOutputSignal = NaN;

    const sortedComponents = [...components].sort((a, b) => a.order - b.order);
    sortedComponents.forEach(comp => {
      if (comp.type === 'amplifier') {
        currentSignal += parseFloat(String(comp.gain || 0));
      } else if (comp.type === 'cable') {
        const loss = parseFloat(String(comp.lossPerMeter || 0)) * parseFloat(String(comp.length || 0));
        currentSignal -= loss;
      } else if (comp.type === 'splitter') {
        if (isNaN(splitterInputSignal)) splitterInputSignal = currentSignal;
        const loss = parseFloat(String(comp.loss || 0));
        currentSignal -= loss;
        splitterOutputSignal = currentSignal; // Track signal after the *last* splitter in sequence
      }
    });

    // Final path calculation assumes fixed values from input fields after the dynamic components
    const cableLossToOutletDB = parseFloat(signalStrengthInputs.cableLossPerMeter) * parseFloat(signalStrengthInputs.cableLengthToOutlet);
    const cableJointLossDB = parseFloat(signalStrengthInputs.cableJointLoss);
    const outletLossDB = parseFloat(signalStrengthInputs.outletLoss);

    // If no splitters were in the dynamic path, use the signal before the final path components
    const signalBeforeFinalPath = isNaN(splitterOutputSignal) ? currentSignal : splitterOutputSignal;

    const finalSignalDBuV = signalBeforeFinalPath - cableLossToOutletDB - cableJointLossDB - outletLossDB;

    let acceptabilityStatus = '';
    if (finalSignalDBuV >= 57 && finalSignalDBuV <= 77) { acceptabilityStatus = 'Acceptable'; }
    else if (finalSignalDBuV < 57) { acceptabilityStatus = 'Too Low - Signal Amplification Required'; }
    else { acceptabilityStatus = 'Too High - Signal Attenuation Required'; }

    setSignalStrengthResults({
      antennaSignalDBuV: antennaSignalDBuV.toFixed(1),
      finalSignalDBuV: finalSignalDBuV.toFixed(1),
      acceptabilityStatus
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">TV Signal Strength Calculator</h2>
        {onShowTutorial && (
          <button 
            onClick={onShowTutorial} 
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Icons.InfoInline /> Tutorial
          </button>
        )}
      </div>
      <p className="mb-4 text-gray-600">
        Configure the signal path using the component table and diagram. Enter source/final path details below.
      </p>
      
      {/* Component Diagram */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-700">Component Diagram</h3>
          <div className="flex items-center space-x-1">
            <button 
              onClick={zoomIn} 
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700" 
              title="Zoom In"
            >
              <Icons.ZoomIn />
            </button>
            <button 
              onClick={zoomOut} 
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700" 
              title="Zoom Out"
            >
              <Icons.ZoomOut />
            </button>
            <button 
              onClick={resetView} 
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700" 
              title="Reset View"
            >
              <Icons.Reset />
            </button>
          </div>
        </div>
        
        <div className="relative border border-gray-200 rounded-lg bg-gray-50 h-64 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={handleCanvasMouseDown}
          />
          <div className="absolute bottom-2 left-2 bg-white/80 rounded text-xs px-2 py-1 text-gray-500">
            Drag to pan • Click component to select
          </div>
          <div className="absolute top-2 right-2 bg-white/80 rounded text-xs px-2 py-1">
            {Math.round(canvasScale * 100)}%
          </div>
        </div>
      </div>
      
      {/* Component Configuration Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-700">Signal Path Components</h3>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => addComponent('amplifier')} 
              className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm"
              title="Add an amplifier to boost signal strength"
            >
              <Icons.Amplifier /> Amplifier
            </button>
            <button 
              onClick={() => addComponent('cable')} 
              className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm"
              title="Add a cable section with signal loss"
            >
              <Icons.Cable /> Cable
            </button>
            <button 
              onClick={() => addComponent('splitter')} 
              className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm"
              title="Add a signal splitter to distribute to multiple outlets"
            >
              <Icons.Splitter /> Splitter
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          {/* Component List */}
          <div className="grid grid-cols-1 divide-y divide-gray-200">
            {components.sort((a, b) => a.order - b.order).map((comp, index) => (
              <div 
                key={comp.id}
                className={`p-3 transition-colors ${selectedComponent === comp.id ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                onClick={() => setSelectedComponent(comp.id === selectedComponent ? null : comp.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Order indicator */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                    {comp.order}
                  </div>
                  
                  {/* Component type and info */}
                  <div className="flex-grow flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {getComponentIcon(comp.type)}
                      <span className="font-medium text-sm">{getComponentLabel(comp)}</span>
                    </div>
                    
                    {/* Component properties summary */}
                    <div className="flex gap-2 ml-2 text-xs text-gray-500">
                      {comp.type === 'amplifier' && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full">
                          +{comp.gain}dB
                        </span>
                      )}
                      {comp.type === 'cable' && (
                        <>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                            {comp.length}m
                          </span>
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded-full">
                            -{(Number(comp.lossPerMeter) * Number(comp.length)).toFixed(1)}dB
                          </span>
                        </>
                      )}
                      {comp.type === 'splitter' && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                          -{comp.loss}dB
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Component actions */}
                  {comp.canEdit && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveComponentUp(comp.id); }}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded" 
                        disabled={index <= 1}
                        title="Move up in signal path"
                      >
                        <Icons.ChevronUp />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveComponentDown(comp.id); }}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded" 
                        disabled={index >= components.length - 1}
                        title="Move down in signal path"
                      >
                        <Icons.ChevronDown />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Remove component"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Expanded edit panel when selected */}
                {selectedComponent === comp.id && comp.canEdit && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {comp.type === 'amplifier' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Gain (dB)</label>
                        <div className="flex">
                          <input
                            type="number"
                            value={comp.gain || 0}
                            onChange={(e) => updateComponent(comp.id, 'gain', e.target.value)}
                            className="w-full p-1.5 border border-gray-300 rounded-l text-sm"
                            step="1"
                          />
                          <div className="px-2 py-1.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                            dB
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <Icons.InfoInline />
                          Amplifiers boost signal strength, but too much can cause distortion
                        </p>
                      </div>
                    )}
                    
                    {comp.type === 'cable' && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Length (m)</label>
                          <div className="flex">
                            <input
                              type="number"
                              value={comp.length || 0}
                              onChange={(e) => updateComponent(comp.id, 'length', e.target.value)}
                              className="w-full p-1.5 border border-gray-300 rounded-l text-sm"
                              step="1"
                            />
                            <div className="px-2 py-1.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                              m
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Loss per meter (dB/m)</label>
                          <div className="flex">
                            <input
                              type="number"
                              value={comp.lossPerMeter || 0}
                              onChange={(e) => updateComponent(comp.id, 'lossPerMeter', e.target.value)}
                              className="w-full p-1.5 border border-gray-300 rounded-l text-sm"
                              step="0.01"
                            />
                            <div className="px-2 py-1.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                              dB/m
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            <Icons.InfoInline />
                            Typical values: RG6 = 0.05 dB/m, RG59 = 0.08 dB/m
                          </p>
                        </div>
                      </>
                    )}
                    
                    {comp.type === 'splitter' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Loss (dB)</label>
                        <div className="flex">
                          <input
                            type="number"
                            value={comp.loss || 0}
                            onChange={(e) => updateComponent(comp.id, 'loss', e.target.value)}
                            className="w-full p-1.5 border border-gray-300 rounded-l text-sm"
                            step="0.5"
                          />
                          <div className="px-2 py-1.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                            dB
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <Icons.InfoInline />
                          2-way: ~3.5dB, 3-way: ~5.5dB, 4-way: ~7dB, 8-way: ~10.5dB
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick tips/help */}
        <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm text-blue-800 border border-blue-200">
          <h4 className="font-medium mb-1 flex items-center">
            <Icons.InfoInline />
            How to use the component configuration
          </h4>
          <ul className="text-xs space-y-1 pl-5 list-disc">
            <li>Click "Amplifier", "Cable", or "Splitter" buttons to add components to your signal path</li>
            <li>Components are always added to the end of the path</li>
            <li>Use the Up/Down arrows to rearrange components in the signal path</li>
            <li>Click on a component to select it and edit its properties</li>
            <li>Watch the diagram update in real-time as you make changes</li>
          </ul>
        </div>
      </div>

      {/* Input Fields for fixed parts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-2">Signal Source</h3>
          <div>
            <label className="block font-medium mb-1 text-sm">Antenna Signal (μV)</label>
            <input type="number" name="antennaSignal" value={signalStrengthInputs.antennaSignal} onChange={handleSignalStrengthInputChange} className="w-full p-2 border rounded-md text-sm" />
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-2">Final Path to Outlet</h3>
          <div className="space-y-2">
            <div>
              <label className="block font-medium mb-1 text-sm">Cable Length (m) [After Last Component]</label>
              <input type="number" name="cableLengthToOutlet" value={signalStrengthInputs.cableLengthToOutlet} onChange={handleSignalStrengthInputChange} className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1 text-sm">Joint Loss (dB)</label>
                <input type="number" name="cableJointLoss" value={signalStrengthInputs.cableJointLoss} onChange={handleSignalStrengthInputChange} className="w-full p-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block font-medium mb-1 text-sm">Outlet Loss (dB)</label>
                <input type="number" name="outletLoss" value={signalStrengthInputs.outletLoss} onChange={handleSignalStrengthInputChange} className="w-full p-2 border rounded-md text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Calculate Button */}
      <button onClick={calculateSignalStrength} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4">
        Calculate Signal Strength
      </button>
      
      {/* Results Display */}
      {signalStrengthResults && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
            <div><span className="font-medium">Antenna Signal:</span> {signalStrengthResults.antennaSignalDBuV} dBμV</div>
            <div><span className="font-medium">Final TV Outlet Signal:</span> {signalStrengthResults.finalSignalDBuV} dBμV</div>
          </div>
          <div className="mt-4"><span className="font-medium">Status:</span>{' '}<span className={`font-bold ${signalStrengthResults.acceptabilityStatus === 'Acceptable' ? 'text-green-600' : 'text-red-600'}`}>{signalStrengthResults.acceptabilityStatus}</span></div>
          <div className="mt-2 text-xs text-gray-600">Acceptable range: 57-77 dBμV. Results based on diagram components + final path inputs.</div>
        </div>
      )}
    </div>
  );
};

export default TVSignalStrengthCalculator;