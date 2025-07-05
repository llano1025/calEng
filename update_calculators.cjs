const fs = require('fs');
const path = require('path');

// List of calculators to update with their details
const calculators = [
  // Electrical calculators
  { file: 'src/calculators/electrical/CableSizingCalculator.tsx', title: 'Cable Sizing Calculator', discipline: 'electrical', type: 'cableSizing' },
  { file: 'src/calculators/electrical/CableContainmentCalculator.tsx', title: 'Cable Containment Calculator', discipline: 'electrical', type: 'cableContainment' },
  { file: 'src/calculators/electrical/CircuitProtectionCalculator.tsx', title: 'Circuit Protection Calculator', discipline: 'electrical', type: 'circuitProtection' },
  { file: 'src/calculators/electrical/CopperLossCalculator.tsx', title: 'Copper Loss Calculator', discipline: 'electrical', type: 'copperLoss' },
  { file: 'src/calculators/electrical/FuseOperationTimeCalculator.tsx', title: 'Fuse Operation Time Calculator', discipline: 'electrical', type: 'fuseOperationTime' },
  { file: 'src/calculators/electrical/GensetLouverSizingCalculator.tsx', title: 'Genset Louver Sizing Calculator', discipline: 'electrical', type: 'gensetLouver' },
  { file: 'src/calculators/electrical/GeneratorSizingCalculator.tsx', title: 'Generator Sizing Calculator', discipline: 'electrical', type: 'genset' },
  { file: 'src/calculators/electrical/LightingControlCalculator.tsx', title: 'Lighting Control Calculator', discipline: 'electrical', type: 'lightingControl' },
  { file: 'src/calculators/electrical/LightingPowerDensityCalculator.tsx', title: 'Lighting Power Density Calculator', discipline: 'electrical', type: 'lpd' },
  { file: 'src/calculators/electrical/LoadBalancingCalculator.tsx', title: 'Load Balancing Calculator', discipline: 'electrical', type: 'loadBalancing' },
  { file: 'src/calculators/electrical/MaxCopperResistanceCalculator.tsx', title: 'Max Copper Resistance Calculator', discipline: 'electrical', type: 'maxResistance' },
  { file: 'src/calculators/electrical/ProtectionCoordinationCalculator.tsx', title: 'Protection Coordination Calculator', discipline: 'electrical', type: 'protectionCoordination' },
  { file: 'src/calculators/electrical/TransformerSizingCalculator.tsx', title: 'Transformer Sizing Calculator', discipline: 'electrical', type: 'transformer' },
  { file: 'src/calculators/electrical/ElectricalLoadEstimationCalculator.tsx', title: 'Electrical Load Estimation Calculator', discipline: 'electrical', type: 'load' },
  
  // MVAC calculators
  { file: 'src/calculators/mvac/AHUSizingCalculator.tsx', title: 'AHU Sizing Calculator', discipline: 'mvac', type: 'ahuSizing' },
  { file: 'src/calculators/mvac/ChilledWaterPipeSizingCalculator.tsx', title: 'Chilled Water Pipe Sizing Calculator', discipline: 'mvac', type: 'chilledWaterPipe' },
  { file: 'src/calculators/mvac/DuctStaticPressureCalculator.tsx', title: 'Duct Static Pressure Calculator', discipline: 'mvac', type: 'ductStaticPressure' },
  { file: 'src/calculators/mvac/RefrigerantPipeCalculator.tsx', title: 'Refrigerant Pipe Calculator', discipline: 'mvac', type: 'refrigerantPipe' },
  { file: 'src/calculators/mvac/SteamPipeSizingCalculator.tsx', title: 'Steam Pipe Sizing Calculator', discipline: 'mvac', type: 'steamPipe' },
  { file: 'src/calculators/mvac/VibrationIsolatorCalculator.tsx', title: 'Vibration Isolator Calculator', discipline: 'mvac', type: 'vibrationIsolator' },
];

function updateCalculator(calculatorInfo) {
  const filePath = path.join(__dirname, calculatorInfo.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already updated
  if (content.includes('CalculatorWrapper') || content.includes('useCalculatorActions')) {
    console.log(`Already updated: ${calculatorInfo.file}`);
    return;
  }

  // Add imports
  const importIndex = content.indexOf("import React");
  if (importIndex === -1) {
    console.log(`No React import found in: ${calculatorInfo.file}`);
    return;
  }

  // Find end of imports
  const lastImportIndex = content.lastIndexOf("import");
  const nextLineAfterImports = content.indexOf('\n', lastImportIndex);
  
  const newImports = `import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';
`;

  content = content.slice(0, nextLineAfterImports + 1) + newImports + content.slice(nextLineAfterImports + 1);

  // Find the component function
  const componentMatch = content.match(/const\s+(\w+):\s*React\.FC<[^>]*>\s*=\s*\([^)]*\)\s*=>\s*{/);
  if (!componentMatch) {
    console.log(`Component function not found in: ${calculatorInfo.file}`);
    return;
  }

  const componentName = componentMatch[1];
  const componentStart = componentMatch.index + componentMatch[0].length;

  // Add the hook right after the component function starts
  const hookCode = `
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: '${calculatorInfo.title}',
    discipline: '${calculatorInfo.discipline}',
    calculatorType: '${calculatorInfo.type}'
  });
`;

  content = content.slice(0, componentStart) + hookCode + content.slice(componentStart);

  console.log(`Updated: ${calculatorInfo.file}`);
  fs.writeFileSync(filePath, content);
}

// Update all calculators
calculators.forEach(updateCalculator);

console.log('Calculator update complete!');