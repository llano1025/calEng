// Updated imports without lucide-react
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons';

// Define props type for the component
interface BroadcastCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// Custom icon components to replace Lucide icons
const CustomIcons = {
  ZoomIn: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      <line x1="11" y1="8" x2="11" y2="14"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
  ),
  ZoomOut: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
  ),
  Reset: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="1 4 1 10 7 10"></polyline>
      <polyline points="23 20 23 14 17 14"></polyline>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  ),
  ChevronUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  ),
  Amplifier: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2 12h6m8 0h6M12 2v8m0 4v8M9 5.5L12 2l3 3.5M5 19l-3-3 3-3"></path>
      <circle cx="12" cy="12" r="4"></circle>
    </svg>
  ),
  Cable: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M4 9h16M4 15h16"></path>
    </svg>
  ),
  Splitter: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="4" width="20" height="6" rx="2"></rect>
      <rect x="2" y="14" width="9" height="6" rx="2"></rect>
      <rect x="13" y="14" width="9" height="6" rx="2"></rect>
      <path d="M12 10v4"></path>
    </svg>
  )
};

// The Broadcast Reception Calculator component
const BroadcastReceptionCalculator: React.FC<BroadcastCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type and display mode
  const [calculatorType, setCalculatorType] = useState<string>(''); // 'signalStrength' or 'opticalFiber'
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Reference for circuit diagram canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State for signal strength calculator inputs - unchanged
  const [signalStrengthInputs, setSignalStrengthInputs] = useState({
    antennaSignal: '500', amplifierGain: '26', cableLossPerMeter: '0.05', cableLengthToSplitter: '120',
    splitterCount: '2', splitterLossPerSplitter: '10', cableLengthToOutlet: '40', cableJointLoss: '3', outletLoss: '1'
  });

  // Updated state for optical fiber calculator inputs
  const [opticalFiberInputs, setOpticalFiberInputs] = useState({
    transceiverType: 'custom', // New field for transceiver type selection
    transmitterPower: '0',     // New field for transmitter power (dBm)
    receiverSensitivity: '-20', // New field for receiver sensitivity (dBm)
    fiberLength: '300',        // Length in meters
    fiberType: 'singlemode1310', // Changed default to single-mode
    connectorCount: '2',       // Connectors (e.g., LC, SC)
    splices: '0',              // New field for fusion splices
    mechanicalJoints: '0',     // Mechanical splices
    patchPanels: '0',          // Patch panels
    bends: '0',                // New field for significant bends
    splitters: '0',            // New field for optical splitters
    safetyMargin: '3'          // Safety/design margin
  });

  // State for calculation results
  const [signalStrengthResults, setSignalStrengthResults] = useState<any>(null); // Use a more specific type if possible
  const [opticalLossResults, setOpticalLossResults] = useState<any>(null); // Use a more specific type if possible

  // NEW STATE: to track selected component for editing
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // Define fiber types and their attenuation rates
  const fiberTypes = [
    // Multi-mode fibers
    { value: 'multimode850', label: 'OM1 (62.5μm) @ 850nm', attenuation: 3.5 },
    { value: 'multimode1300', label: 'OM1 (62.5μm) @ 1300nm', attenuation: 1.0 },
    { value: 'om2_850', label: 'OM2 (50μm) @ 850nm', attenuation: 3.5 },
    { value: 'om2_1300', label: 'OM2 (50μm) @ 1300nm', attenuation: 1.0 },
    { value: 'om3_850', label: 'OM3 (50μm) @ 850nm', attenuation: 3.0 },
    { value: 'om3_1300', label: 'OM3 (50μm) @ 1300nm', attenuation: 1.0 },
    { value: 'om4_850', label: 'OM4 (50μm) @ 850nm', attenuation: 2.5 },
    { value: 'om4_1300', label: 'OM4 (50μm) @ 1300nm', attenuation: 0.8 },
    { value: 'om5_850', label: 'OM5 (50μm) @ 850nm', attenuation: 2.3 },
    { value: 'om5_1300', label: 'OM5 (50μm) @ 1300nm', attenuation: 0.8 },
    // Single-mode fibers
    { value: 'singlemode1310', label: 'G.652 SMF @ 1310nm', attenuation: 0.35 },
    { value: 'singlemode1550', label: 'G.652 SMF @ 1550nm', attenuation: 0.20 },
    { value: 'g655_1550', label: 'G.655 NZDSF @ 1550nm', attenuation: 0.22 },
    { value: 'g655_1625', label: 'G.655 NZDSF @ 1625nm', attenuation: 0.25 },
    { value: 'g657_1310', label: 'G.657 Bend-insensitive @ 1310nm', attenuation: 0.35 },
    { value: 'g657_1550', label: 'G.657 Bend-insensitive @ 1550nm', attenuation: 0.20 }
  ];

  // Define common transceiver types for SFP+
  const transceiverTypes = [
    { value: 'custom', label: 'Custom (Enter manually)', tx: null, rx: null },
    { value: 'sx', label: 'SFP+ SX (850nm, MM, 300m)', tx: '-1', rx: '-17' },
    { value: 'lr', label: 'SFP+ LR (1310nm, SM, 10km)', tx: '-3', rx: '-20' },
    { value: 'er', label: 'SFP+ ER (1550nm, SM, 40km)', tx: '2', rx: '-24' },
    { value: 'zx', label: 'SFP+ ZX (1550nm, SM, 80km)', tx: '0', rx: '-24' },
    { value: 'dwdm', label: 'DWDM SFP+ (1550nm, SM, 80km)', tx: '0', rx: '-24' },
    { value: 'bidi', label: 'BiDi SFP+ (1310/1490nm, SM, 10km)', tx: '-3', rx: '-20' }
  ];

  // State for circuit components (for diagram) - Define a type for components
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
  const [components, setComponents] = useState<DiagramComponent[]>([
    { id: 'antenna-1', type: 'antenna', x: 50, y: 80, canEdit: false, order: 1 },
    { id: 'amplifier-1', type: 'amplifier', x: 150, y: 80, canEdit: true, gain: 26, order: 2 },
    { id: 'cable-1', type: 'cable', x: 200, y: 80, canEdit: true, length: 120, lossPerMeter: 0.05, order: 3 },
    { id: 'splitter-1', type: 'splitter', x: 300, y: 80, canEdit: true, loss: 10, order: 4 },
    { id: 'splitter-2', type: 'splitter', x: 400, y: 80, canEdit: true, loss: 10, order: 5 }
  ]);

  // State for canvas view controls
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // --- Handlers for Inputs ---
  const handleSignalStrengthInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSignalStrengthInputs({ ...signalStrengthInputs, [e.target.name]: e.target.value });
  };
  
  const handleOpticalFiberInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setOpticalFiberInputs({ ...opticalFiberInputs, [e.target.name]: e.target.value });
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
      case 'amplifier': return <CustomIcons.Amplifier />;
      case 'cable': return <CustomIcons.Cable />;
      case 'splitter': return <CustomIcons.Splitter />;
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
    if (calculatorType === 'signalStrength' && canvasRef.current) {
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
  }, [calculatorType, components, signalStrengthResults, signalStrengthInputs, canvasScale, canvasOffset, selectedComponent]); // Dependencies for redraw

  // --- Calculation Functions ---
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
      // Intermediate results removed as they are now shown on the diagram
    });
  };

  // Updated optical fiber calculation function
  const calculateOpticalFiberLoss = () => {
    const fiberLength = parseFloat(opticalFiberInputs.fiberLength) / 1000; // Convert to km
    const fiberType = opticalFiberInputs.fiberType;
    const connectorCount = parseInt(opticalFiberInputs.connectorCount);
    const splices = parseInt(opticalFiberInputs.splices);
    const mechanicalJoints = parseInt(opticalFiberInputs.mechanicalJoints);
    const patchPanels = parseInt(opticalFiberInputs.patchPanels);
    const bends = parseInt(opticalFiberInputs.bends);
    const splitters = parseInt(opticalFiberInputs.splitters);
    const transmitterPower = parseFloat(opticalFiberInputs.transmitterPower);
    const receiverSensitivity = parseFloat(opticalFiberInputs.receiverSensitivity);
    const safetyMargin = parseFloat(opticalFiberInputs.safetyMargin);
    
    // Find the selected fiber type and get its attenuation
    const selectedFiber = fiberTypes.find(ft => ft.value === fiberType);
    const fiberAttenuationRate = selectedFiber ? selectedFiber.attenuation : 0.4; // Default if not found
    
    // Validate inputs
    if (isNaN(fiberLength) || isNaN(connectorCount) || isNaN(splices) || 
        isNaN(mechanicalJoints) || isNaN(patchPanels) || isNaN(bends) ||
        isNaN(splitters) || isNaN(transmitterPower) || 
        isNaN(receiverSensitivity) || isNaN(safetyMargin)) {
      alert("Please enter valid numeric inputs for all fields.");
      return;
    }
    
    // Calculate individual losses
    const connectorLoss = connectorCount * 0.5; // 0.5 dB per connector
    const fiberLoss = fiberLength * fiberAttenuationRate;
    const spliceLoss = splices * 0.1; // 0.1 dB per fusion splice
    const mechanicalJointLoss = mechanicalJoints * 0.5; // 0.5 dB per mechanical joint
    const patchPanelLoss = patchPanels * 0.5; // 0.5 dB per patch panel
    const bendLoss = bends * 0.5; // 0.5 dB per significant bend
    const splitterLoss = splitters > 0 ? (3.5 * Math.log2(splitters * 2)) : 0; // Loss for optical splitters
    
    // Calculate total link loss
    const subtotalLoss = connectorLoss + fiberLoss + spliceLoss + 
                         mechanicalJointLoss + patchPanelLoss + 
                         bendLoss + splitterLoss;
    const totalLoss = subtotalLoss + safetyMargin;
    
    // Calculate power budget and margin
    const powerBudget = transmitterPower - receiverSensitivity;
    const powerMargin = powerBudget - totalLoss;
    
    // Determine if the link is viable
    const isLinkViable = powerMargin >= 0;
    let linkStatus = isLinkViable 
      ? 'Viable Link - Sufficient Power Budget' 
      : 'Link Failure - Insufficient Power Budget';
      
    // Add warning for very high margin (potential receiver saturation)
    if (powerMargin > 10) {
      linkStatus = 'Viable Link - Warning: High Power Margin (consider attenuation)';
    }
    
    // Set the calculation results
    setOpticalLossResults({
      connectorLoss: connectorLoss.toFixed(2),
      fiberLoss: fiberLoss.toFixed(2),
      spliceLoss: spliceLoss.toFixed(2),
      mechanicalJointLoss: mechanicalJointLoss.toFixed(2),
      patchPanelLoss: patchPanelLoss.toFixed(2),
      bendLoss: bendLoss.toFixed(2),
      splitterLoss: splitterLoss.toFixed(2),
      subtotalLoss: subtotalLoss.toFixed(2),
      safetyMargin: safetyMargin.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      powerBudget: powerBudget.toFixed(2),
      powerMargin: powerMargin.toFixed(2),
      linkStatus
    });
  };

  // --- Render Functions ---
  const renderTutorial = () => {
    // (Tutorial JSX remains largely the same - omitted for brevity)
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">TV Signal Strength Calculator Tutorial</h2>
          <button onClick={() => setShowTutorial(false)} className="text-gray-500 hover:text-gray-700">
            <Icons.Close />
          </button>
        </div>
        {/* ... rest of tutorial content ... */}
      </div>
    );
  };

  const renderCalculator = () => {
    switch (calculatorType) {
      case 'signalStrength':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">TV Signal Strength Calculator</h2>
              <button onClick={() => setShowTutorial(true)} className="flex items-center text-blue-600 hover:text-blue-800">
                <Icons.InfoInline /> Tutorial
              </button>
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
                    <CustomIcons.ZoomIn />
                  </button>
                  <button 
                    onClick={zoomOut} 
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-700" 
                    title="Zoom Out"
                  >
                    <CustomIcons.ZoomOut />
                  </button>
                  <button 
                    onClick={resetView} 
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-700" 
                    title="Reset View"
                  >
                    <CustomIcons.Reset />
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
            
            {/* Component Configuration Section - REDESIGNED */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-700">Signal Path Components</h3>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => addComponent('amplifier')} 
                    className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm"
                    title="Add an amplifier to boost signal strength"
                  >
                    <CustomIcons.Amplifier /> Amplifier
                  </button>
                  <button 
                    onClick={() => addComponent('cable')} 
                    className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm"
                    title="Add a cable section with signal loss"
                  >
                    <CustomIcons.Cable /> Cable
                  </button>
                  <button 
                    onClick={() => addComponent('splitter')} 
                    className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm"
                    title="Add a signal splitter to distribute to multiple outlets"
                  >
                    <CustomIcons.Splitter /> Splitter
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
                              <CustomIcons.ChevronUp />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveComponentDown(comp.id); }}
                              className="p-1 text-gray-600 hover:bg-gray-200 rounded" 
                              disabled={index >= components.length - 1}
                              title="Move down in signal path"
                            >
                              <CustomIcons.ChevronDown />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Remove component"
                            >
                              <CustomIcons.Trash />
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
      
      case 'opticalFiber':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Optical Fiber Power Budget Calculator</h2>
              <button onClick={() => setShowTutorial(true)} className="flex items-center text-blue-600 hover:text-blue-800">
                <Icons.InfoInline /> Tutorial
              </button>
            </div>
            <p className="mb-4 text-gray-600">
              Calculate power budget and signal loss in fiber optic transmission systems based on components and their attenuation.
            </p>
            
            {/* Transceiver Properties */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Transceiver Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-1 text-sm">Transceiver Type</label>
                  <select 
                    name="transceiverType" 
                    value={opticalFiberInputs.transceiverType} 
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      const transceiver = transceiverTypes.find(t => t.value === selectedType);
                      if (transceiver && transceiver.tx !== null && transceiver.rx !== null) {
                        setOpticalFiberInputs({
                          ...opticalFiberInputs,
                          transceiverType: selectedType,
                          transmitterPower: transceiver.tx,
                          receiverSensitivity: transceiver.rx
                        });
                      } else {
                        setOpticalFiberInputs({
                          ...opticalFiberInputs,
                          transceiverType: selectedType
                        });
                      }
                    }}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    {transceiverTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Transmitter Output Power (dBm)</label>
                  <input 
                    type="number" 
                    name="transmitterPower" 
                    value={opticalFiberInputs.transmitterPower} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Receiver Sensitivity (dBm)</label>
                  <input 
                    type="number" 
                    name="receiverSensitivity" 
                    value={opticalFiberInputs.receiverSensitivity} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            
            {/* Fiber Properties */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Fiber Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1 text-sm">Fiber Length (meters)</label>
                  <input 
                    type="number" 
                    name="fiberLength" 
                    value={opticalFiberInputs.fiberLength} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Fiber Type</label>
                  <select 
                    name="fiberType" 
                    value={opticalFiberInputs.fiberType} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <optgroup label="Multi-mode Fiber">
                      {fiberTypes.filter(t => t.value.includes('multimode') || t.value.includes('om')).map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label} ({type.attenuation} dB/km)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Single-mode Fiber">
                      {fiberTypes.filter(t => t.value.includes('singlemode') || t.value.includes('g65')).map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label} ({type.attenuation} dB/km)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Components and Attenuation */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Component Attenuation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-1 text-sm">Connectors</label>
                  <input 
                    type="number" 
                    name="connectorCount" 
                    value={opticalFiberInputs.connectorCount} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.3-0.5 dB per connection</p>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Fusion Splices</label>
                  <input 
                    type="number" 
                    name="splices" 
                    value={opticalFiberInputs.splices} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.1-0.2 dB per splice</p>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Mechanical Joints</label>
                  <input 
                    type="number" 
                    name="mechanicalJoints" 
                    value={opticalFiberInputs.mechanicalJoints} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.5-1.0 dB per joint</p>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Patch Panels</label>
                  <input 
                    type="number" 
                    name="patchPanels" 
                    value={opticalFiberInputs.patchPanels} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.5-1.0 dB per panel</p>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Splitters (1:N)</label>
                  <input 
                    type="number" 
                    name="splitters" 
                    value={opticalFiberInputs.splitters} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">~3.5 dB for 1:2, ~7 dB for 1:4</p>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Bends</label>
                  <input 
                    type="number" 
                    name="bends" 
                    value={opticalFiberInputs.bends} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.5-1.0 dB per bend</p>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm">Safety Margin (dB)</label>
                  <input 
                    type="number" 
                    name="safetyMargin" 
                    value={opticalFiberInputs.safetyMargin} 
                    onChange={handleOpticalFiberInputChange} 
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 3-5 dB</p>
                </div>
              </div>
            </div>
            
            {/* Calculate Button */}
            <button 
              onClick={calculateOpticalFiberLoss} 
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
            >
              Calculate Power Budget
            </button>
            
            {/* Results */}
            {opticalLossResults && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                <h3 className="text-lg font-semibold mb-2">Power Budget Results</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                  <div className="col-span-2 bg-blue-100 p-2 rounded mb-2">
                    <span className="font-medium">Total Power Budget:</span> {opticalLossResults.powerBudget} dB
                    <p className="text-xs text-gray-600 mt-1">Transmitter Power - Receiver Sensitivity</p>
                  </div>
                  
                  <div className="col-span-2 mt-2">
                    <h4 className="font-medium">Link Loss Components:</h4>
                  </div>
                  
                  <div><span className="font-medium">Fiber Cable Loss:</span> {opticalLossResults.fiberLoss} dB</div>
                  <div><span className="font-medium">Connector Loss:</span> {opticalLossResults.connectorLoss} dB</div>
                  <div><span className="font-medium">Splice Loss:</span> {opticalLossResults.spliceLoss} dB</div>
                  <div><span className="font-medium">Mechanical Joint Loss:</span> {opticalLossResults.mechanicalJointLoss} dB</div>
                  <div><span className="font-medium">Patch Panel Loss:</span> {opticalLossResults.patchPanelLoss} dB</div>
                  <div><span className="font-medium">Bend Loss:</span> {opticalLossResults.bendLoss} dB</div>
                  <div><span className="font-medium">Splitter Loss:</span> {opticalLossResults.splitterLoss} dB</div>
                  <div><span className="font-medium">Safety Margin:</span> {opticalLossResults.safetyMargin} dB</div>
                  
                  <div className="col-span-2 bg-blue-100 p-2 rounded mt-2">
                    <span className="font-medium">Total Link Loss:</span> {opticalLossResults.totalLoss} dB
                  </div>
                  
                  <div className="col-span-2 mt-4">
                    <span className="font-medium">Power Margin:</span>{' '}
                    <span className={`font-bold ${parseFloat(opticalLossResults.powerMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {opticalLossResults.powerMargin} dB
                    </span>
                    <p className="text-xs text-gray-600 mt-1">Power Budget - Total Loss (should be &gt; 0)</p>
                  </div>
                  
                  <div className="col-span-2 mt-2">
                    <span className="font-medium">Link Status:</span>{' '}
                    <span className={`font-bold ${opticalLossResults.linkStatus.includes('Viable') ? 'text-green-600' : 'text-red-600'}`}>
                      {opticalLossResults.linkStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* SFP+ Transceiver Reference Table */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-2">SFP+ Transceiver Reference</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-3 text-left border">Type</th>
                      <th className="py-2 px-3 text-left border">Wavelength</th>
                      <th className="py-2 px-3 text-left border">Distance</th>
                      <th className="py-2 px-3 text-left border">Tx Power (dBm)</th>
                      <th className="py-2 px-3 text-left border">Rx Sensitivity (dBm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 border">SX</td>
                      <td className="py-2 px-3 border">850nm</td>
                      <td className="py-2 px-3 border">Up to 300m</td>
                      <td className="py-2 px-3 border">-1 to -7.3</td>
                      <td className="py-2 px-3 border">-17</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">LX/LR</td>
                      <td className="py-2 px-3 border">1310nm</td>
                      <td className="py-2 px-3 border">Up to 10km</td>
                      <td className="py-2 px-3 border">-3 to -9.5</td>
                      <td className="py-2 px-3 border">-20</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">EX</td>
                      <td className="py-2 px-3 border">1310nm</td>
                      <td className="py-2 px-3 border">Up to 40km</td>
                      <td className="py-2 px-3 border">0 to -3</td>
                      <td className="py-2 px-3 border">-23</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">ZX</td>
                      <td className="py-2 px-3 border">1550nm</td>
                      <td className="py-2 px-3 border">Up to 80km</td>
                      <td className="py-2 px-3 border">0 to 4</td>
                      <td className="py-2 px-3 border">-24</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">ER</td>
                      <td className="py-2 px-3 border">1550nm</td>
                      <td className="py-2 px-3 border">Up to 40km</td>
                      <td className="py-2 px-3 border">2 to 5</td>
                      <td className="py-2 px-3 border">-24</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Values may vary by manufacturer. Always check specific transceiver specifications.
              </p>
            </div>
            
            {/* Fiber Types Reference Table */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-2">Fiber Types and Attenuation</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-3 text-left border">Type</th>
                      <th className="py-2 px-3 text-left border">Diameter (Core/Cladding)</th>
                      <th className="py-2 px-3 text-left border">Wavelength</th>
                      <th className="py-2 px-3 text-left border">Attenuation (dB/km)</th>
                      <th className="py-2 px-3 text-left border">Typical Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Multi-mode Fiber Types */}
                    <tr>
                      <td className="py-2 px-3 border">OM1</td>
                      <td className="py-2 px-3 border">62.5/125 μm</td>
                      <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                      <td className="py-2 px-3 border">3.0-3.5<br />1.0-1.5</td>
                      <td className="py-2 px-3 border">Legacy networks, short distances</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">OM2</td>
                      <td className="py-2 px-3 border">50/125 μm</td>
                      <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                      <td className="py-2 px-3 border">3.0-3.5<br />1.0-1.5</td>
                      <td className="py-2 px-3 border">Up to 1Gb/s networks, medium distances</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">OM3</td>
                      <td className="py-2 px-3 border">50/125 μm</td>
                      <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                      <td className="py-2 px-3 border">2.5-3.0<br />0.8-1.5</td>
                      <td className="py-2 px-3 border">10Gb/s networks, up to 300m</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">OM4</td>
                      <td className="py-2 px-3 border">50/125 μm</td>
                      <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                      <td className="py-2 px-3 border">2.5-3.0<br />0.8-1.5</td>
                      <td className="py-2 px-3 border">10-40Gb/s networks, up to 550m</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">OM5</td>
                      <td className="py-2 px-3 border">50/125 μm</td>
                      <td className="py-2 px-3 border">850-953 nm<br />1300 nm</td>
                      <td className="py-2 px-3 border">2.3-2.8<br />0.8-1.5</td>
                      <td className="py-2 px-3 border">WDM applications, 100Gb/s</td>
                    </tr>
                    
                    {/* Single-mode Fiber Types */}
                    <tr>
                      <td className="py-2 px-3 border">G.652 (Standard SMF)</td>
                      <td className="py-2 px-3 border">9/125 μm</td>
                      <td className="py-2 px-3 border">1310 nm<br />1550 nm</td>
                      <td className="py-2 px-3 border">0.30-0.40<br />0.16-0.25</td>
                      <td className="py-2 px-3 border">General purpose, long-distance</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">G.653 (DSF)</td>
                      <td className="py-2 px-3 border">9/125 μm</td>
                      <td className="py-2 px-3 border">1550 nm</td>
                      <td className="py-2 px-3 border">0.20-0.25</td>
                      <td className="py-2 px-3 border">Long-haul applications</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">G.655 (NZDSF)</td>
                      <td className="py-2 px-3 border">9/125 μm</td>
                      <td className="py-2 px-3 border">1550 nm<br />1625 nm</td>
                      <td className="py-2 px-3 border">0.20-0.25<br />0.23-0.30</td>
                      <td className="py-2 px-3 border">DWDM systems, optimized for 1550nm</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 border">G.657 (Bend-insensitive)</td>
                      <td className="py-2 px-3 border">9/125 μm</td>
                      <td className="py-2 px-3 border">1310 nm<br />1550 nm</td>
                      <td className="py-2 px-3 border">0.30-0.40<br />0.18-0.25</td>
                      <td className="py-2 px-3 border">FTTH, indoor wiring, tight bends</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                SMF = Single-mode Fiber, DSF = Dispersion Shifted Fiber, NZDSF = Non-Zero Dispersion Shifted Fiber
              </p>
            </div>
          </div>
        );
      
      default: 
        return null;
    }
  };

  // Main return for BroadcastReceptionCalculator
  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        <Icons.ArrowLeft /> Back to Disciplines
      </button>

      {/* Title specific to this discipline */}
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">
        Broadcast Reception Installation
      </h1>

      {/* Calculator Type Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'signalStrength'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('signalStrength')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'signalStrength' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">TV Signal Strength</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'signalStrength' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate signal based on components
              </p>
            </div>
          </button>
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'opticalFiber'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('opticalFiber')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'opticalFiber' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Optical Fiber Power Budget</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'opticalFiber' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate power budget for fiber systems
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Render the selected calculator */}
      {calculatorType && renderCalculator()}
    </div>
  );
};

export default BroadcastReceptionCalculator;