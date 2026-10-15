import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface TVSignalStrengthCalculatorProps {
  onShowTutorial?: () => void;
}

type ComponentType = 'amplifier' | 'cable' | 'splitter';
type SignalStatus = 'ok' | 'low' | 'high';

// Signal path component (the antenna is fixed and handled separately).
// Numeric fields are kept as strings so that partially typed values (e.g. "0.") are preserved.
interface PathComponent {
  id: string;
  type: ComponentType;
  gain?: string; // dB (amplifier)
  length?: string; // m (cable)
  lossPerMeter?: string; // dB/m (cable)
  loss?: string; // dB (splitter)
}

interface PathStep {
  key: string;
  label: string;
  detail: string;
  change: number | null; // dB, null for the source row
  level: number; // dBμV
}

interface OutletResult {
  label: string;
  anchor: number; // index in [antenna, ...components]
  lineLevel: number; // dBμV on the line feeding the final path
  level: number; // dBμV at the outlet
  status: SignalStatus;
  margin: number; // dB to the nearest acceptance limit (negative when out of range)
}

// Acceptance windows for the signal level at the TV outlet (dBμV, 75 Ω)
type CriteriaKey = 'archsd' | 'hkta1104';
const CRITERIA: Record<CriteriaKey, { label: string; min: number; max: number; reference: string }> = {
  archsd: {
    label: 'ArchSD general design criterion (57–77 dBμV)',
    min: 57,
    max: 77,
    reference: 'ArchSD Design Guide for Broadcast Reception Installation (June 2013), §2.4.2'
  },
  hkta1104: {
    label: 'OFCA HKTA 1104, digital terrestrial TV (50–74 dBμV)',
    min: 50,
    max: 74,
    reference: 'OFCA HKTA 1104 as quoted in the ArchSD Design Guide, §2.5 (470–862 MHz)'
  }
};

// Limits from the ArchSD Design Guide used for design warnings
const REQUIRED_JOINT_ALLOWANCE_DB = 3; // §2.4.1
const MAX_CASCADED_TEE_UNITS = 6; // §2.3 (distribution block, splitter / tee-unit)

const STATUS_STYLES: Record<SignalStatus, { pill: string; text: string; label: string }> = {
  ok: { pill: 'bg-green-100 text-green-700', text: 'text-green-600', label: 'Acceptable' },
  low: { pill: 'bg-red-100 text-red-700', text: 'text-red-600', label: 'Too Low' },
  high: { pill: 'bg-orange-100 text-orange-700', text: 'text-orange-600', label: 'Too High' }
};

const STATUS_CANVAS_COLORS: Record<SignalStatus, string> = {
  ok: '#059669',
  low: '#DC2626',
  high: '#EA580C'
};

const parseValue = (value: string | undefined): number =>
  value === undefined || value.trim() === '' ? NaN : Number(value);

const classify = (level: number, min: number, max: number): SignalStatus =>
  level < min ? 'low' : level > max ? 'high' : 'ok';

const marginTo = (level: number, min: number, max: number): number =>
  level < min ? level - min : level > max ? max - level : Math.min(level - min, max - level);

const formatChange = (change: number | null): string =>
  change === null ? '–' : `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}`;

const inputClass =
  'w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500';

const UnitInput: React.FC<{
  value: string;
  unit: string;
  step: string;
  onChange: (value: string) => void;
  min?: string;
}> = ({ value, unit, step, onChange, min }) => (
  <div className="flex">
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
    />
    <div className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-sm text-gray-600">
      {unit}
    </div>
  </div>
);

const TVSignalStrengthCalculator: React.FC<TVSignalStrengthCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'TV Signal Strength Calculator',
    discipline: 'elv',
    calculatorType: 'tv-signal-strength'
  });

  // Signal source
  const [sourceUnit, setSourceUnit] = useState<'uv' | 'dbuv'>('uv');
  const [antennaSignal, setAntennaSignal] = useState<string>('500');

  // Final path (last splitter / end of line to the TV outlet)
  const [finalPath, setFinalPath] = useState({
    cableLossPerMeter: '0.05',
    cableLength: '40',
    jointLoss: '3',
    outletLoss: '1'
  });

  // Signal path components, in signal-flow order (after the antenna)
  // Defaults reproduce the worked example in the ArchSD Design Guide (§2.4.2, Figure 3)
  const [components, setComponents] = useState<PathComponent[]>([
    { id: 'amplifier-1', type: 'amplifier', gain: '26' },
    { id: 'cable-1', type: 'cable', length: '120', lossPerMeter: '0.05' },
    { id: 'splitter-1', type: 'splitter', loss: '10' }
  ]);

  const [criteria, setCriteria] = useState<CriteriaKey>('archsd');
  const { min: minLimit, max: maxLimit } = CRITERIA[criteria];

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Diagram view state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef({ lastX: 0, lastY: 0, moved: 0 });
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [resizeTick, setResizeTick] = useState<number>(0);

  // --- Component list handlers ---
  const addComponent = (type: ComponentType) => {
    const id = `${type}-${Date.now()}`;
    const newComponent: PathComponent =
      type === 'amplifier'
        ? { id, type, gain: '26' }
        : type === 'cable'
          ? { id, type, length: '50', lossPerMeter: '0.05' }
          : { id, type, loss: '10' };
    setComponents((prev) => [...prev, newComponent]);
    setSelectedId(id);
  };

  const deleteComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveComponent = (id: string, direction: -1 | 1) => {
    setComponents((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateComponent = (id: string, property: 'gain' | 'length' | 'lossPerMeter' | 'loss', value: string) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, [property]: value } : c)));
  };

  const updateFinalPath = (property: keyof typeof finalPath, value: string) => {
    setFinalPath((prev) => ({ ...prev, [property]: value }));
  };

  // --- Calculation (live) ---
  const analysis = useMemo(() => {
    const errors: string[] = [];

    const sourceValue = parseValue(antennaSignal);
    if (!isFinite(sourceValue)) {
      errors.push('Enter a valid antenna signal level.');
    } else if (sourceUnit === 'uv' && sourceValue <= 0) {
      errors.push('Antenna signal (μV) must be greater than zero.');
    }

    const finalCableLossPerMeter = parseValue(finalPath.cableLossPerMeter);
    const finalCableLength = parseValue(finalPath.cableLength);
    const finalJointLoss = parseValue(finalPath.jointLoss);
    const finalOutletLoss = parseValue(finalPath.outletLoss);
    [
      ['Final path cable loss', finalCableLossPerMeter],
      ['Final path cable length', finalCableLength],
      ['Joint loss', finalJointLoss],
      ['Outlet loss', finalOutletLoss]
    ].forEach(([name, value]) => {
      if (!isFinite(value as number) || (value as number) < 0) errors.push(`${name} must be zero or greater.`);
    });

    components.forEach((c, i) => {
      const name = `Component ${i + 1}`;
      if (c.type === 'amplifier') {
        if (!isFinite(parseValue(c.gain))) errors.push(`${name} (amplifier): enter a valid gain.`);
      } else if (c.type === 'cable') {
        const length = parseValue(c.length);
        const loss = parseValue(c.lossPerMeter);
        if (!isFinite(length) || length < 0) errors.push(`${name} (cable): length must be zero or greater.`);
        if (!isFinite(loss) || loss < 0) errors.push(`${name} (cable): loss per metre must be zero or greater.`);
      } else {
        const loss = parseValue(c.loss);
        if (!isFinite(loss) || loss < 0) errors.push(`${name} (splitter): loss must be zero or greater.`);
      }
    });

    if (errors.length > 0) return { valid: false as const, errors };

    // Step 0: antenna output, expressed in dBμV (0 dBμV = 1 μV)
    const sourceDbuV = sourceUnit === 'uv' ? 20 * Math.log10(sourceValue) : sourceValue;
    const steps: PathStep[] = [
      {
        key: 'antenna',
        label: 'Antenna',
        detail:
          sourceUnit === 'uv'
            ? `${sourceValue} μV → 20·log₁₀(${sourceValue})`
            : 'Entered directly in dBμV',
        change: null,
        level: sourceDbuV
      }
    ];
    const levels: number[] = [sourceDbuV]; // level after each element of [antenna, ...components]
    const outlets: OutletResult[] = [];
    let level = sourceDbuV;
    let splitterCount = 0;

    const finalPathCableLoss = finalCableLossPerMeter * finalCableLength;
    const finalPathLoss = finalPathCableLoss + finalJointLoss + finalOutletLoss;

    components.forEach((c, i) => {
      let change = 0;
      let label = '';
      let detail = '';
      if (c.type === 'amplifier') {
        change = parseValue(c.gain);
        label = 'Amplifier';
        detail = `Gain ${change} dB`;
      } else if (c.type === 'cable') {
        const length = parseValue(c.length);
        const lossPerMeter = parseValue(c.lossPerMeter);
        change = -(length * lossPerMeter);
        label = 'Cable';
        detail = `${length} m × ${lossPerMeter} dB/m`;
      } else {
        splitterCount += 1;
        change = -parseValue(c.loss);
        label = `Splitter ${splitterCount}`;
        detail = `Insertion loss ${parseValue(c.loss)} dB`;
      }
      level += change;
      levels.push(level);
      steps.push({ key: c.id, label: `${i + 1}. ${label}`, detail, change, level });

      if (c.type === 'splitter') {
        const outletLevel = level - finalPathLoss;
        outlets.push({
          label: `TV ${splitterCount}`,
          anchor: i + 1,
          lineLevel: level,
          level: outletLevel,
          status: classify(outletLevel, minLimit, maxLimit),
          margin: marginTo(outletLevel, minLimit, maxLimit)
        });
      }
    });

    // If the line does not end at a splitter, the end of the line is also an outlet
    const lastIsSplitter = components.length > 0 && components[components.length - 1].type === 'splitter';
    if (!lastIsSplitter) {
      const outletLevel = level - finalPathLoss;
      outlets.push({
        label: 'End of line',
        anchor: components.length,
        lineLevel: level,
        level: outletLevel,
        status: classify(outletLevel, minLimit, maxLimit),
        margin: marginTo(outletLevel, minLimit, maxLimit)
      });
    }

    const endOfLineLevel = level;
    const finalOutlet = outlets[outlets.length - 1];
    const finalSteps: PathStep[] = [];
    let finalLevel = endOfLineLevel;
    [
      { key: 'f-cable', label: 'Final cable run', detail: `${finalCableLength} m × ${finalCableLossPerMeter} dB/m`, change: -finalPathCableLoss },
      { key: 'f-joint', label: 'Cable joints / connectors', detail: `${finalJointLoss} dB`, change: -finalJointLoss },
      { key: 'f-outlet', label: 'Outlet', detail: `${finalOutletLoss} dB`, change: -finalOutletLoss }
    ].forEach((s) => {
      finalLevel += s.change;
      finalSteps.push({ ...s, level: finalLevel });
    });

    const minLevel = Math.min(...outlets.map((o) => o.level));
    const maxLevel = Math.max(...outlets.map((o) => o.level));
    const hasLow = outlets.some((o) => o.status === 'low');
    const hasHigh = outlets.some((o) => o.status === 'high');
    const overallStatus: SignalStatus = hasLow ? 'low' : hasHigh ? 'high' : 'ok';

    let recommendation = '';
    if (hasLow && hasHigh) {
      recommendation = `Outlet levels span ${(maxLevel - minLevel).toFixed(1)} dB, wider than the ${maxLimit - minLimit} dB acceptance window. Re-balance the distribution (e.g. use tap-offs of different values or attenuate the near outlets).`;
    } else if (hasLow) {
      recommendation = `The weakest outlet is ${(minLimit - minLevel).toFixed(1)} dB below the minimum. Add at least this much gain (amplifier) or reduce losses upstream.`;
    } else if (hasHigh) {
      recommendation = `The strongest outlet is ${(maxLevel - maxLimit).toFixed(1)} dB above the maximum. Add at least this much attenuation to avoid overloading the TV tuner.`;
    }

    // Design warnings taken from the ArchSD Design Guide
    const warnings: string[] = [];
    if (finalJointLoss < REQUIRED_JOINT_ALLOWANCE_DB) {
      warnings.push(
        `Joint loss is below the ${REQUIRED_JOINT_ALLOWANCE_DB} dB allowance that the guide requires for cable joints and other practical installation losses (§2.4.1).`
      );
    }
    if (splitterCount > MAX_CASCADED_TEE_UNITS) {
      warnings.push(
        `${splitterCount} splitters/tee-units are cascaded; the guide limits tee-units in cascade to ${MAX_CASCADED_TEE_UNITS} (§2.3).`
      );
    }

    return {
      valid: true as const,
      errors,
      warnings,
      finalStatus: finalOutlet.status,
      sourceDbuV,
      steps,
      finalSteps,
      levels,
      outlets,
      endOfLineLevel,
      finalPathLoss,
      finalLevel: finalOutlet.level,
      netChange: finalOutlet.level - sourceDbuV,
      minLevel,
      maxLevel,
      overallStatus,
      recommendation
    };
  }, [antennaSignal, sourceUnit, finalPath, components, minLimit, maxLimit]);

  // Save to history / prepare export whenever a valid result changes
  useEffect(() => {
    if (!analysis.valid) return;
    const inputs = { sourceUnit, antennaSignal, finalPath, components, criteria };
    const results = {
      antennaSignalDBuV: analysis.sourceDbuV.toFixed(1),
      finalSignalDBuV: analysis.finalLevel.toFixed(1),
      acceptabilityStatus: STATUS_STYLES[analysis.overallStatus].label,
      acceptanceCriterion: CRITERIA[criteria].label,
      acceptableRangeDBuV: `${minLimit}-${maxLimit}`,
      outlets: analysis.outlets.map((o) => ({ outlet: o.label, levelDBuV: o.level.toFixed(1), status: STATUS_STYLES[o.status].label })),
      steps: [...analysis.steps, ...analysis.finalSteps].map((s) => ({
        element: s.label,
        changeDB: s.change === null ? '' : s.change.toFixed(2),
        levelDBuV: s.level.toFixed(2)
      }))
    };
    prepareExportData(inputs, results);
    const timer = setTimeout(() => saveCalculation(inputs, results), 1000);
    return () => clearTimeout(timer);
  }, [analysis, sourceUnit, antennaSignal, finalPath, components, criteria, minLimit, maxLimit, saveCalculation, prepareExportData]);

  // --- Diagram handlers ---
  const zoomIn = () => setCanvasScale((prev) => Math.min(prev + 0.1, 3.0));
  const zoomOut = () => setCanvasScale((prev) => Math.max(prev - 0.1, 0.5));
  const resetView = () => {
    setCanvasScale(1.0);
    setCanvasOffset({ x: 0, y: 0 });
  };

  const DIAGRAM_SPACING = 120;
  const DIAGRAM_START_X = 60;
  const DIAGRAM_Y = 100;

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    dragRef.current = { lastX: e.clientX, lastY: e.clientY, moved: 0 };
    setIsPanning(true);
  };

  // Panning, and click-to-select when the pointer barely moved
  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      setCanvasOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    };
    const handleUp = (e: MouseEvent) => {
      setIsPanning(false);
      if (dragRef.current.moved >= 4 || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
      const worldY = (e.clientY - rect.top - canvasOffset.y) / canvasScale;
      const hit = components.findIndex(
        (_, i) =>
          Math.abs(worldX - (DIAGRAM_START_X + (i + 1) * DIAGRAM_SPACING)) <= 40 &&
          Math.abs(worldY - DIAGRAM_Y) <= 36
      );
      setSelectedId(hit === -1 ? null : components[hit].id);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isPanning, canvasOffset, canvasScale, components]);

  // Redraw on window resize
  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Draw the signal path diagram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(canvasOffset.x, canvasOffset.y);
    ctx.scale(canvasScale, canvasScale);

    const elements: { type: 'antenna' | ComponentType; comp?: PathComponent }[] = [
      { type: 'antenna' },
      ...components.map((comp) => ({ type: comp.type, comp }))
    ];
    const xFor = (i: number) => DIAGRAM_START_X + i * DIAGRAM_SPACING;
    const halfWidth = (type: string) => (type === 'cable' ? 26 : type === 'splitter' ? 22 : 18);
    const LINE = '#2563EB';

    ctx.lineWidth = 2;
    ctx.textAlign = 'center';

    // Connections
    ctx.strokeStyle = LINE;
    for (let i = 0; i < elements.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(xFor(i) + halfWidth(elements[i].type), DIAGRAM_Y);
      ctx.lineTo(xFor(i + 1) - halfWidth(elements[i + 1].type), DIAGRAM_Y);
      ctx.stroke();
    }

    let splitterIndex = 0;
    elements.forEach((el, i) => {
      const x = xFor(i);
      const y = DIAGRAM_Y;
      ctx.strokeStyle = LINE;
      ctx.fillStyle = LINE;

      if (el.comp && el.comp.id === selectedId) {
        ctx.save();
        ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      let caption = '';
      if (el.type === 'antenna') {
        ctx.beginPath();
        ctx.moveTo(x, y + 14);
        ctx.lineTo(x, y - 14);
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x - 14, y - 28);
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x + 14, y - 28);
        ctx.stroke();
        caption = 'Antenna';
      } else if (el.type === 'amplifier') {
        ctx.beginPath();
        ctx.moveTo(x - 16, y - 16);
        ctx.lineTo(x + 16, y);
        ctx.lineTo(x - 16, y + 16);
        ctx.closePath();
        ctx.stroke();
        caption = `Amp +${parseValue(el.comp?.gain) || 0} dB`;
      } else if (el.type === 'cable') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.rect(x - 24, y - 7, 48, 14);
        ctx.fill();
        ctx.stroke();
        caption = `Cable ${parseValue(el.comp?.length) || 0} m`;
      } else {
        splitterIndex += 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = LINE;
        ctx.font = '10px sans-serif';
        ctx.fillText(`S${splitterIndex}`, x, y + 4);
        caption = `−${parseValue(el.comp?.loss) || 0} dB`;
      }

      ctx.fillStyle = '#6B7280';
      ctx.font = '11px sans-serif';
      ctx.fillText(caption, x, y - 46);

      if (analysis.valid) {
        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${analysis.levels[i].toFixed(1)} dBμV`, x, y - 60);
      }
    });

    // Outlets
    if (analysis.valid) {
      analysis.outlets.forEach((o) => {
        const x = xFor(o.anchor);
        const startY = DIAGRAM_Y + (elements[o.anchor].type === 'splitter' ? 20 : 16);
        const boxY = DIAGRAM_Y + 62;
        ctx.strokeStyle = LINE;
        ctx.fillStyle = LINE;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, boxY);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.rect(x - 18, boxY, 36, 24);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = LINE;
        ctx.font = '10px sans-serif';
        ctx.fillText(o.label === 'End of line' ? 'TV' : o.label, x, boxY + 15);
        ctx.fillStyle = STATUS_CANVAS_COLORS[o.status];
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${o.level.toFixed(1)} dBμV`, x, boxY + 40);
      });
    }
  }, [components, analysis, canvasScale, canvasOffset, selectedId, resizeTick]);

  // --- Presentation helpers ---
  const componentIcon = (type: ComponentType) =>
    type === 'amplifier' ? <Icons.Amplifier /> : type === 'cable' ? <Icons.Cable /> : <Icons.Splitter />;

  const componentLabel = (comp: PathComponent) => {
    if (comp.type === 'amplifier') return 'Amplifier';
    if (comp.type === 'cable') return 'Cable';
    const n = components.filter((c) => c.type === 'splitter').findIndex((c) => c.id === comp.id) + 1;
    return `Splitter ${n}`;
  };

  return (
    <CalculatorWrapper
      title="TV Signal Strength Calculator"
      discipline="elv"
      calculatorType="tv-signal-strength"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <p className="mb-6 text-gray-600">
          Build the signal path from the antenna to the TV outlets. The signal level at every stage is calculated live in dBμV, following the method in the ArchSD Design Guide for Broadcast Reception Installation (§2.4).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ===================== Input Section ===================== */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4">Signal Path Configuration</h3>

            {/* Signal Source */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">Signal Source</h4>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Antenna Signal</label>
                      <UnitInput
                        value={antennaSignal}
                        unit={sourceUnit === 'uv' ? 'μV' : 'dBμV'}
                        step={sourceUnit === 'uv' ? '10' : '1'}
                        onChange={setAntennaSignal}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Input Unit</label>
                      <select
                        value={sourceUnit}
                        onChange={(e) => {
                          const next = e.target.value as 'uv' | 'dbuv';
                          const current = parseValue(antennaSignal);
                          // Convert the entered value so the physical level stays the same
                          if (isFinite(current) && next !== sourceUnit) {
                            if (next === 'dbuv' && current > 0) {
                              setAntennaSignal((20 * Math.log10(current)).toFixed(2));
                            } else if (next === 'uv') {
                              setAntennaSignal(Math.pow(10, current / 20).toFixed(1));
                            }
                          }
                          setSourceUnit(next);
                        }}
                        className={inputClass}
                      >
                        <option value="uv">Microvolts (μV)</option>
                        <option value="dbuv">Decibel microvolts (dBμV)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <Icons.InfoInline />
                    Level in dBμV = 20 · log₁₀(V in μV), referenced to 75 Ω.
                  </p>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Acceptance Criterion</label>
                    <select
                      value={criteria}
                      onChange={(e) => setCriteria(e.target.value as CriteriaKey)}
                      className={inputClass}
                    >
                      {(Object.keys(CRITERIA) as CriteriaKey[]).map((key) => (
                        <option key={key} value={key}>
                          {CRITERIA[key].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 my-6"></div>

            {/* Components */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h4 className="font-medium text-gray-700">Signal Path Components ({components.length})</h4>
                <div className="flex items-center gap-2">
                  {(['amplifier', 'cable', 'splitter'] as ComponentType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => addComponent(type)}
                      className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                      title={`Add a ${type} to the end of the signal path`}
                    >
                      {componentIcon(type)}
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed antenna row */}
              <div className="mb-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-medium">
                  0
                </div>
                <span className="font-medium text-sm text-gray-700">Antenna</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                  {analysis.valid ? `${analysis.sourceDbuV.toFixed(1)} dBμV` : 'Source'}
                </span>
              </div>

              {components.length === 0 && (
                <p className="text-sm text-gray-500 mb-3">No components added. The antenna feeds the final path directly.</p>
              )}

              <div className="max-h-96 overflow-y-auto">
                {components.map((comp, index) => {
                  const selected = selectedId === comp.id;
                  return (
                    <div
                      key={comp.id}
                      className={`mb-3 p-3 rounded-lg border shadow-sm cursor-pointer transition-colors ${
                        selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedId(selected ? null : comp.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-grow flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5 font-medium text-sm text-gray-700">
                            {componentIcon(comp.type)}
                            {componentLabel(comp)}
                          </span>
                          {comp.type === 'amplifier' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              +{parseValue(comp.gain) || 0} dB
                            </span>
                          )}
                          {comp.type === 'cable' && (
                            <>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {parseValue(comp.length) || 0} m
                              </span>
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                −{((parseValue(comp.length) || 0) * (parseValue(comp.lossPerMeter) || 0)).toFixed(1)} dB
                              </span>
                            </>
                          )}
                          {comp.type === 'splitter' && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                              −{parseValue(comp.loss) || 0} dB
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveComponent(comp.id, -1); }}
                            className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                            disabled={index === 0}
                            title="Move up in signal path"
                          >
                            <Icons.ChevronUp />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveComponent(comp.id, 1); }}
                            className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                            disabled={index === components.length - 1}
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
                      </div>

                      {selected && (
                        <div
                          className="mt-3 pl-3 border-l-4 border-blue-400 grid grid-cols-1 sm:grid-cols-2 gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {comp.type === 'amplifier' && (
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Gain (dB)</label>
                              <UnitInput value={comp.gain ?? ''} unit="dB" step="1" onChange={(v) => updateComponent(comp.id, 'gain', v)} />
                              <p className="text-xs text-gray-500 mt-1">
                                <Icons.InfoInline />
                                Amplifiers boost signal strength, but too much gain can cause distortion.
                              </p>
                            </div>
                          )}
                          {comp.type === 'cable' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                                <UnitInput value={comp.length ?? ''} unit="m" step="1" min="0" onChange={(v) => updateComponent(comp.id, 'length', v)} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loss per metre (dB/m)</label>
                                <UnitInput value={comp.lossPerMeter ?? ''} unit="dB/m" step="0.01" min="0" onChange={(v) => updateComponent(comp.id, 'lossPerMeter', v)} />
                              </div>
                              <p className="text-xs text-gray-500 sm:col-span-2">
                                <Icons.InfoInline />
                                Loss rises with frequency: use the cable datasheet value at the highest channel (UHF, up to 862 MHz). Figure 1 of the ArchSD guide shows roughly 0.15–0.20 dB/m at UHF.
                              </p>
                            </>
                          )}
                          {comp.type === 'splitter' && (
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Insertion Loss (dB)</label>
                              <UnitInput value={comp.loss ?? ''} unit="dB" step="0.5" min="0" onChange={(v) => updateComponent(comp.id, 'loss', v)} />
                              <p className="text-xs text-gray-500 mt-1">
                                <Icons.InfoInline />
                                Typical: 2-way ≈ 3.5 dB, 3-way ≈ 5.5 dB, 4-way ≈ 7 dB, 8-way ≈ 10.5 dB. Each splitter feeds one TV outlet and the next element.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-300 my-6"></div>

            {/* Final path */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Final Path to Each Outlet</h4>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cable Length (m)</label>
                      <UnitInput value={finalPath.cableLength} unit="m" step="1" min="0" onChange={(v) => updateFinalPath('cableLength', v)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cable Loss (dB/m)</label>
                      <UnitInput value={finalPath.cableLossPerMeter} unit="dB/m" step="0.01" min="0" onChange={(v) => updateFinalPath('cableLossPerMeter', v)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Joint Loss (dB)</label>
                      <UnitInput value={finalPath.jointLoss} unit="dB" step="0.5" min="0" onChange={(v) => updateFinalPath('jointLoss', v)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Loss (dB)</label>
                      <UnitInput value={finalPath.outletLoss} unit="dB" step="0.5" min="0" onChange={(v) => updateFinalPath('outletLoss', v)} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <Icons.InfoInline />
                    Applied between each splitter output (or the end of the line) and its TV outlet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== Results Section ===================== */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4">Calculation Results</h3>

            {!analysis.valid ? (
              <div className="bg-red-100 border border-red-300 p-3 rounded-md text-sm text-red-700">
                <p className="font-medium mb-1">Please correct the following inputs:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {analysis.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                    <h4 className="font-medium text-base text-blue-800">Signal Level Summary</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[analysis.overallStatus].pill}`}>
                      {analysis.overallStatus === 'ok' ? 'PASS' : 'FAIL'} – {STATUS_STYLES[analysis.overallStatus].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Antenna Signal:</p>
                      <p className="font-semibold text-gray-800">{analysis.sourceDbuV.toFixed(1)} dBμV</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Gain / Loss:</p>
                      <p className={`font-semibold ${analysis.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analysis.netChange >= 0 ? '+' : '−'}{Math.abs(analysis.netChange).toFixed(1)} dB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Final TV Outlet:</p>
                      <p className={`font-semibold ${STATUS_STYLES[analysis.finalStatus].text}`}>
                        {analysis.finalLevel.toFixed(1)} dBμV
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Outlet Range:</p>
                      <p className="font-semibold text-gray-800">
                        {analysis.minLevel.toFixed(1)} – {analysis.maxLevel.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Acceptable outlet level: {minLimit}–{maxLimit} dBμV ({CRITERIA[criteria].reference}).
                  </p>
                </div>

                {analysis.recommendation && (
                  <div className={`p-3 rounded-md mb-4 text-sm ${analysis.overallStatus === 'low' ? 'bg-red-100 border border-red-300 text-red-700' : 'bg-yellow-50 border border-yellow-300 text-yellow-800'}`}>
                    <Icons.InfoInline />
                    {analysis.recommendation}
                  </div>
                )}

                {analysis.warnings.length > 0 && (
                  <div className="p-3 rounded-md mb-4 text-sm bg-yellow-50 border border-yellow-300 text-yellow-800">
                    <p className="font-medium mb-1">
                      <Icons.InfoInline />
                      Design warnings
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {analysis.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step by step */}
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <h4 className="font-medium text-base text-blue-800 mb-3">Step-by-Step Signal Level</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="py-2 pr-3">Element</th>
                          <th className="py-2 pr-3 text-right">Gain / Loss (dB)</th>
                          <th className="py-2 text-right">Level (dBμV)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analysis.steps.map((s) => (
                          <tr key={s.key}>
                            <td className="py-2 pr-3">
                              <p className="font-medium text-gray-800">{s.label}</p>
                              <p className="text-xs text-gray-500">{s.detail}</p>
                            </td>
                            <td className={`py-2 pr-3 text-right ${s.change === null ? 'text-gray-500' : s.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatChange(s.change)}
                            </td>
                            <td className="py-2 text-right font-semibold text-gray-800">{s.level.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="py-1.5 px-1 text-xs font-medium text-gray-600">
                            Final path from the end of the line to the outlet
                          </td>
                        </tr>
                        {analysis.finalSteps.map((s) => (
                          <tr key={s.key}>
                            <td className="py-2 pr-3">
                              <p className="font-medium text-gray-800">{s.label}</p>
                              <p className="text-xs text-gray-500">{s.detail}</p>
                            </td>
                            <td className="py-2 pr-3 text-right text-red-600">{formatChange(s.change)}</td>
                            <td className="py-2 text-right font-semibold text-gray-800">{s.level.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300">
                          <td className="py-2 pr-3 font-semibold text-gray-800">End-of-line outlet level</td>
                          <td className="py-2 pr-3 text-right font-semibold text-gray-800">
                            {formatChange(analysis.finalLevel - analysis.sourceDbuV)}
                          </td>
                          <td className={`py-2 text-right font-bold ${STATUS_STYLES[analysis.finalStatus].text}`}>
                            {analysis.finalLevel.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Outlets */}
                <div className="bg-white p-4 rounded-md shadow border border-gray-200">
                  <h4 className="font-medium text-base text-blue-800 mb-3">Outlet Levels</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="py-2 pr-3">Outlet</th>
                          <th className="py-2 pr-3 text-right">Line (dBμV)</th>
                          <th className="py-2 pr-3 text-right">Outlet (dBμV)</th>
                          <th className="py-2 pr-3 text-right">Margin (dB)</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analysis.outlets.map((o) => (
                          <tr key={o.label}>
                            <td className="py-2 pr-3 font-medium text-gray-800">{o.label}</td>
                            <td className="py-2 pr-3 text-right text-gray-700">{o.lineLevel.toFixed(2)}</td>
                            <td className={`py-2 pr-3 text-right font-semibold ${STATUS_STYLES[o.status].text}`}>{o.level.toFixed(2)}</td>
                            <td className="py-2 pr-3 text-right text-gray-700">{o.margin >= 0 ? '+' : '−'}{Math.abs(o.margin).toFixed(1)}</td>
                            <td className="py-2 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status].pill}`}>
                                {STATUS_STYLES[o.status].label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Margin is the distance to the nearest limit of the {minLimit}–{maxLimit} dBμV window (negative = out of range).
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===================== Diagram ===================== */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-lg">Signal Path Diagram</h3>
            <div className="flex items-center space-x-1">
              <button onClick={zoomIn} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Zoom In">
                <Icons.ZoomIn />
              </button>
              <button onClick={zoomOut} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Zoom Out">
                <Icons.ZoomOut />
              </button>
              <button onClick={resetView} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Reset View">
                <Icons.Reset />
              </button>
            </div>
          </div>
          <div className="relative border border-gray-200 rounded-lg bg-white h-72 overflow-hidden">
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
              onMouseDown={handleCanvasMouseDown}
            />
            <div className="absolute bottom-2 left-2 bg-white/80 rounded text-xs px-2 py-1 text-gray-500">
              Drag to pan • Click a component to select
            </div>
            <div className="absolute top-2 right-2 bg-white/80 rounded text-xs px-2 py-1 text-gray-600">
              {Math.round(canvasScale * 100)}%
            </div>
          </div>
        </div>

        {/* ===================== Notes ===================== */}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-gray-700">Calculation Notes</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Signal level (dBμV) = 20 · log₁₀(V in μV); 1 μV = 0 dBμV, 1 mV = 60 dBμV (75 Ω system). The guide rounds 500 μV to 54 dBμV; this calculator uses the exact 53.98 dBμV.</li>
            <li>Level after each element = previous level + gain − loss. Cable loss (dB) = length (m) × attenuation (dB/m).</li>
            <li>Each splitter feeds one TV outlet and passes the signal on to the next element at the same (post-insertion-loss) level.</li>
            <li>Outlet level = line level − final cable loss − joint/connector loss − outlet loss. The guide requires a 3 dB allowance for cable joints and other practical installation losses (§2.4.1).</li>
            <li>
              Acceptance criteria: the guide states that performance is generally acceptable when the outlet level is 57–77 dBμV (§2.4.2). For digital terrestrial
              TV, HKTA 1104 (quoted in §2.5) requires 50–74 dBμV at any system outlet for 470–862 MHz. The default scenario reproduces the guide's worked example
              (Figure 3): 58 dBμV at the TV outlet.
            </li>
            <li>The guide limits tee-units in cascade to 6, requires 75 Ω cable and outlets throughout, and does not allow FM/TV outlets to be looped (§2.3).</li>
            <li>Design procedure in the guide: set all channel-amplifier outputs to the same level (e.g. 110 dBμV), work back from the outlets to the headend, and add a distribution amplifier wherever outlets would fall below 57 dBμV (§2.4.2).</li>
            <li>Not checked here: HKTA 1104 also requires carrier-to-noise ≥ 34 dB, MER ≥ 30 dB, BER better than 3×10⁻⁶ and no more than 3 dB level difference between channels at an outlet. Cable loss differs across 470–862 MHz, so check the lowest and highest channels separately.</li>
            <li>Amplifier gain should not exceed the device's maximum output level; excessive gain can cause intermodulation distortion.</li>
          </ul>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default TVSignalStrengthCalculator;
