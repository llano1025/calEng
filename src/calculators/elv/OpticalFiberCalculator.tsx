import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface OpticalFiberCalculatorProps {
  onShowTutorial?: () => void;
}

type FiberMode = 'mm' | 'sm';
type FiberGrade = 'om1' | 'om2' | 'om3' | 'om4' | 'om5' | 'sm';
type LinkStatus = 'ok' | 'low' | 'high' | 'conflict';

// ---------------------------------------------------------------------------
// Fibre data: maximum cabled attenuation coefficients (dB/km)
//  - Multimode: IEC 60793-2-10, ISO/IEC 11801-1, ANSI/TIA-568.3-D
//  - Single-mode: ISO/IEC 11801-1 (OS1/OS2), ITU-T G.652 / G.655 / G.657
// ---------------------------------------------------------------------------
interface FiberType {
  value: string;
  label: string;
  mode: FiberMode;
  grade: FiberGrade;
  wavelength: number; // nm
  attenuation: number; // dB/km (maximum)
  core: string;
  reference: string;
}

const MM_REF = 'IEC 60793-2-10, ISO/IEC 11801-1, TIA-568.3-D';
const FIBER_TYPES: FiberType[] = [
  { value: 'om1_850', label: 'OM1 (62.5/125 μm) @ 850 nm', mode: 'mm', grade: 'om1', wavelength: 850, attenuation: 3.5, core: '62.5/125 μm', reference: MM_REF },
  { value: 'om1_1300', label: 'OM1 (62.5/125 μm) @ 1300 nm', mode: 'mm', grade: 'om1', wavelength: 1300, attenuation: 1.5, core: '62.5/125 μm', reference: MM_REF },
  { value: 'om2_850', label: 'OM2 (50/125 μm) @ 850 nm', mode: 'mm', grade: 'om2', wavelength: 850, attenuation: 3.5, core: '50/125 μm', reference: MM_REF },
  { value: 'om2_1300', label: 'OM2 (50/125 μm) @ 1300 nm', mode: 'mm', grade: 'om2', wavelength: 1300, attenuation: 1.5, core: '50/125 μm', reference: MM_REF },
  { value: 'om3_850', label: 'OM3 (50/125 μm) @ 850 nm', mode: 'mm', grade: 'om3', wavelength: 850, attenuation: 3.5, core: '50/125 μm', reference: MM_REF },
  { value: 'om3_1300', label: 'OM3 (50/125 μm) @ 1300 nm', mode: 'mm', grade: 'om3', wavelength: 1300, attenuation: 1.5, core: '50/125 μm', reference: MM_REF },
  { value: 'om4_850', label: 'OM4 (50/125 μm) @ 850 nm', mode: 'mm', grade: 'om4', wavelength: 850, attenuation: 3.5, core: '50/125 μm', reference: MM_REF },
  { value: 'om4_1300', label: 'OM4 (50/125 μm) @ 1300 nm', mode: 'mm', grade: 'om4', wavelength: 1300, attenuation: 1.5, core: '50/125 μm', reference: MM_REF },
  { value: 'om5_850', label: 'OM5 (50/125 μm) @ 850 nm', mode: 'mm', grade: 'om5', wavelength: 850, attenuation: 3.0, core: '50/125 μm', reference: MM_REF },
  { value: 'om5_1300', label: 'OM5 (50/125 μm) @ 1300 nm', mode: 'mm', grade: 'om5', wavelength: 1300, attenuation: 1.5, core: '50/125 μm', reference: MM_REF },
  { value: 'os1_1310', label: 'OS1 (indoor SMF) @ 1310 nm', mode: 'sm', grade: 'sm', wavelength: 1310, attenuation: 1.0, core: '9/125 μm', reference: 'ISO/IEC 11801-1, TIA-568.3-D' },
  { value: 'os1_1550', label: 'OS1 (indoor SMF) @ 1550 nm', mode: 'sm', grade: 'sm', wavelength: 1550, attenuation: 1.0, core: '9/125 μm', reference: 'ISO/IEC 11801-1, TIA-568.3-D' },
  { value: 'os2_1310', label: 'OS2 (outdoor SMF) @ 1310 nm', mode: 'sm', grade: 'sm', wavelength: 1310, attenuation: 0.4, core: '9/125 μm', reference: 'ISO/IEC 11801-1' },
  { value: 'os2_1550', label: 'OS2 (outdoor SMF) @ 1550 nm', mode: 'sm', grade: 'sm', wavelength: 1550, attenuation: 0.4, core: '9/125 μm', reference: 'ISO/IEC 11801-1' },
  { value: 'g652d_1310', label: 'ITU-T G.652.D SMF @ 1310 nm', mode: 'sm', grade: 'sm', wavelength: 1310, attenuation: 0.4, core: '9/125 μm', reference: 'ITU-T G.652' },
  { value: 'g652d_1550', label: 'ITU-T G.652.D SMF @ 1550 nm', mode: 'sm', grade: 'sm', wavelength: 1550, attenuation: 0.3, core: '9/125 μm', reference: 'ITU-T G.652' },
  { value: 'g652d_1625', label: 'ITU-T G.652.D SMF @ 1625 nm', mode: 'sm', grade: 'sm', wavelength: 1625, attenuation: 0.4, core: '9/125 μm', reference: 'ITU-T G.652' },
  { value: 'g655_1550', label: 'ITU-T G.655 NZDSF @ 1550 nm', mode: 'sm', grade: 'sm', wavelength: 1550, attenuation: 0.35, core: '9/125 μm', reference: 'ITU-T G.655' },
  { value: 'g655_1625', label: 'ITU-T G.655 NZDSF @ 1625 nm', mode: 'sm', grade: 'sm', wavelength: 1625, attenuation: 0.4, core: '9/125 μm', reference: 'ITU-T G.655' },
  { value: 'g657a_1310', label: 'ITU-T G.657.A bend-insensitive @ 1310 nm', mode: 'sm', grade: 'sm', wavelength: 1310, attenuation: 0.4, core: '9/125 μm', reference: 'ITU-T G.657' },
  { value: 'g657a_1550', label: 'ITU-T G.657.A bend-insensitive @ 1550 nm', mode: 'sm', grade: 'sm', wavelength: 1550, attenuation: 0.3, core: '9/125 μm', reference: 'ITU-T G.657' }
];

// ---------------------------------------------------------------------------
// Transceivers: worst-case average optical power levels (dBm)
// ---------------------------------------------------------------------------
interface Transceiver {
  value: string;
  label: string;
  reference: string;
  mode: FiberMode | null;
  wavelength: number | null;
  txMin: number | null;
  txMax: number | null;
  rxSens: number | null;
  rxOverload: number | null;
  reach?: Partial<Record<FiberGrade, number>>; // maximum link length (m) per fibre grade
  reachText: string;
}

const TRANSCEIVERS: Transceiver[] = [
  { value: 'custom', label: 'Custom (enter manually)', reference: '', mode: null, wavelength: null, txMin: null, txMax: null, rxSens: null, rxOverload: null, reachText: '–' },
  {
    value: 'sr10g', label: '10GBASE-SR (850 nm, MMF)', reference: 'IEEE 802.3ae cl. 52', mode: 'mm', wavelength: 850,
    txMin: -7.3, txMax: -1, rxSens: -9.9, rxOverload: -1,
    reach: { om1: 33, om2: 82, om3: 300, om4: 400, om5: 400 }, reachText: '33 m OM1 / 82 m OM2 / 300 m OM3 / 400 m OM4'
  },
  {
    value: 'lr10g', label: '10GBASE-LR (1310 nm, SMF)', reference: 'IEEE 802.3ae cl. 52', mode: 'sm', wavelength: 1310,
    txMin: -8.2, txMax: 0.5, rxSens: -14.4, rxOverload: 0.5, reach: { sm: 10000 }, reachText: '10 km'
  },
  {
    value: 'er10g', label: '10GBASE-ER (1550 nm, SMF)', reference: 'IEEE 802.3ae cl. 52', mode: 'sm', wavelength: 1550,
    txMin: -4.7, txMax: 4, rxSens: -15.8, rxOverload: -1, reach: { sm: 40000 }, reachText: '40 km'
  },
  {
    value: 'zr10g', label: '10G ZR (1550 nm, SMF, 80 km)', reference: 'Vendor / MSA (not IEEE 802.3)', mode: 'sm', wavelength: 1550,
    txMin: 0, txMax: 4, rxSens: -24, rxOverload: -7, reach: { sm: 80000 }, reachText: '80 km'
  },
  {
    value: 'sx1g', label: '1000BASE-SX (850 nm, MMF)', reference: 'IEEE 802.3z cl. 38', mode: 'mm', wavelength: 850,
    txMin: -9.5, txMax: -4, rxSens: -17, rxOverload: 0,
    reach: { om1: 275, om2: 550, om3: 550, om4: 550, om5: 550 }, reachText: '275 m OM1 / 550 m OM2–OM5'
  },
  {
    value: 'lx1g', label: '1000BASE-LX (1310 nm, SMF)', reference: 'IEEE 802.3z cl. 38', mode: 'sm', wavelength: 1310,
    txMin: -11, txMax: -3, rxSens: -19, rxOverload: -3, reach: { sm: 5000 }, reachText: '5 km'
  }
];

// ---------------------------------------------------------------------------
// Passive components: allowances per unit and their basis
// ---------------------------------------------------------------------------
type ComponentKey = 'connectors' | 'splices' | 'mechanical' | 'patchPanels' | 'bends';
const COMPONENT_ROWS: { key: ComponentKey; label: string; defaultLoss: string; hint: string }[] = [
  { key: 'connectors', label: 'Mated connector pairs', defaultLoss: '0.75', hint: 'ISO/IEC 11801-1 and TIA-568.3-D: ≤ 0.75 dB per mated pair' },
  { key: 'splices', label: 'Fusion splices', defaultLoss: '0.3', hint: 'ISO/IEC 11801-1 and TIA-568.3-D: ≤ 0.3 dB (typical 0.05–0.1 dB)' },
  { key: 'mechanical', label: 'Mechanical splices', defaultLoss: '0.5', hint: 'Manufacturer data; commonly 0.2–0.5 dB' },
  { key: 'patchPanels', label: 'Patch-panel adapters', defaultLoss: '0.75', hint: 'One mated pair each; do not also count them as connector pairs' },
  { key: 'bends', label: 'Tight bends (allowance)', defaultLoss: '0.5', hint: 'Keep to the minimum bend radius; allowance only if unavoidable' }
];

// Typical maximum insertion loss of 1×N PLC splitters (dB); ideal splitting loss is 10·log₁₀(N)
const SPLITTER_OPTIONS = [
  { value: 'none', label: 'None', ratio: 1, loss: 0 },
  { value: '2', label: '1:2', ratio: 2, loss: 3.8 },
  { value: '4', label: '1:4', ratio: 4, loss: 7.3 },
  { value: '8', label: '1:8', ratio: 8, loss: 10.5 },
  { value: '16', label: '1:16', ratio: 16, loss: 13.7 },
  { value: '32', label: '1:32', ratio: 32, loss: 17.1 },
  { value: '64', label: '1:64', ratio: 64, loss: 20.5 }
];

const STATUS_STYLES: Record<LinkStatus, { pill: string; text: string; label: string }> = {
  ok: { pill: 'bg-green-100 text-green-700', text: 'text-green-600', label: 'Viable Link' },
  low: { pill: 'bg-red-100 text-red-700', text: 'text-red-600', label: 'Insufficient Power Budget' },
  high: { pill: 'bg-orange-100 text-orange-700', text: 'text-orange-600', label: 'Receiver Overload Risk' },
  conflict: { pill: 'bg-red-100 text-red-700', text: 'text-red-600', label: 'Budget and Overload Conflict' }
};

const parseValue = (value: string): number => (value.trim() === '' ? NaN : Number(value));
const fmt = (n: number, digits = 2): string => (Math.abs(n) < 0.005 ? 0 : n).toFixed(digits);

const inputClass = 'w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500';

const UnitInput: React.FC<{
  name?: string;
  value: string;
  unit: string;
  step: string;
  min?: string;
  onChange: (value: string) => void;
}> = ({ value, unit, step, min, onChange }) => (
  <div className="flex">
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
    />
    <div className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-sm text-gray-600 whitespace-nowrap">
      {unit}
    </div>
  </div>
);

interface PowerStep {
  key: string;
  label: string;
  detail: string;
  loss: number | null; // dB, null for the transmitter row
  level: number; // dBm (worst-case launch power less cumulative loss)
}

const OpticalFiberCalculator: React.FC<OpticalFiberCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Optical Fiber Power Budget Calculator',
    discipline: 'elv',
    calculatorType: 'opticalFiber'
  });

  // Transceiver (defaults: 10GBASE-LR)
  const [transceiverType, setTransceiverType] = useState<string>('lr10g');
  const [txMin, setTxMin] = useState<string>('-8.2');
  const [txMax, setTxMax] = useState<string>('0.5');
  const [rxSens, setRxSens] = useState<string>('-14.4');
  const [rxOverload, setRxOverload] = useState<string>('0.5');

  // Fibre
  const [fiberType, setFiberType] = useState<string>('g652d_1310');
  const [fiberLength, setFiberLength] = useState<string>('2000'); // metres
  const [attenuationOverride, setAttenuationOverride] = useState<string>(''); // dB/km, blank = standard value

  // Passive components
  const [counts, setCounts] = useState<Record<ComponentKey, string>>({
    connectors: '2',
    splices: '0',
    mechanical: '0',
    patchPanels: '0',
    bends: '0'
  });
  const [unitLosses, setUnitLosses] = useState<Record<ComponentKey, string>>(
    COMPONENT_ROWS.reduce((acc, row) => ({ ...acc, [row.key]: row.defaultLoss }), {} as Record<ComponentKey, string>)
  );
  const [splitterRatio, setSplitterRatio] = useState<string>('none');
  const [splitterCount, setSplitterCount] = useState<string>('1');

  const [designMargin, setDesignMargin] = useState<string>('3');

  const selectedFiber = FIBER_TYPES.find((f) => f.value === fiberType) ?? FIBER_TYPES[0];
  const selectedTransceiver = TRANSCEIVERS.find((t) => t.value === transceiverType) ?? TRANSCEIVERS[0];

  const applyTransceiver = (value: string) => {
    setTransceiverType(value);
    const t = TRANSCEIVERS.find((x) => x.value === value);
    if (t && t.txMin !== null && t.txMax !== null && t.rxSens !== null && t.rxOverload !== null) {
      setTxMin(String(t.txMin));
      setTxMax(String(t.txMax));
      setRxSens(String(t.rxSens));
      setRxOverload(String(t.rxOverload));
    }
  };

  // Editing any optical level turns the preset into a custom transceiver
  const editLevel = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setTransceiverType('custom');
  };

  // --- Calculation (live) ---
  const analysis = useMemo(() => {
    const errors: string[] = [];

    const tMin = parseValue(txMin);
    const tMax = parseValue(txMax);
    const sens = parseValue(rxSens);
    const overload = parseValue(rxOverload);
    if ([tMin, tMax, sens, overload].some((v) => !isFinite(v))) {
      errors.push('Enter valid transmitter power and receiver levels (dBm).');
    } else {
      if (tMax < tMin) errors.push('Maximum launch power must not be lower than the minimum launch power.');
      if (overload <= sens) errors.push('Receiver overload level must be higher than the receiver sensitivity.');
    }

    const lengthM = parseValue(fiberLength);
    if (!isFinite(lengthM) || lengthM < 0) errors.push('Fibre length must be zero or greater.');

    const overrideValue = attenuationOverride.trim() === '' ? null : parseValue(attenuationOverride);
    if (overrideValue !== null && (!isFinite(overrideValue) || overrideValue < 0)) {
      errors.push('Attenuation override must be zero or greater (or left blank).');
    }

    COMPONENT_ROWS.forEach((row) => {
      const count = parseValue(counts[row.key]);
      const loss = parseValue(unitLosses[row.key]);
      if (!isFinite(count) || count < 0 || !Number.isInteger(count)) errors.push(`${row.label}: quantity must be a whole number, zero or greater.`);
      if (!isFinite(loss) || loss < 0) errors.push(`${row.label}: loss per unit must be zero or greater.`);
    });

    const splitter = SPLITTER_OPTIONS.find((s) => s.value === splitterRatio) ?? SPLITTER_OPTIONS[0];
    const splitterQty = parseValue(splitterCount);
    if (splitter.value !== 'none' && (!isFinite(splitterQty) || splitterQty < 1 || !Number.isInteger(splitterQty))) {
      errors.push('Splitter quantity must be a whole number of at least 1.');
    }

    const margin = parseValue(designMargin);
    if (!isFinite(margin) || margin < 0) errors.push('Design margin must be zero or greater.');

    if (errors.length > 0) return { valid: false as const, errors };

    // Power levels along the link (worst case: minimum launch power)
    const alpha = overrideValue ?? selectedFiber.attenuation;
    const steps: PowerStep[] = [];
    let level = tMin;
    steps.push({ key: 'tx', label: 'Transmitter', detail: 'Minimum average launch power', loss: null, level });

    const addLoss = (key: string, label: string, detail: string, loss: number) => {
      level -= loss;
      steps.push({ key, label, detail, loss, level });
    };

    const fiberLoss = alpha * (lengthM / 1000);
    addLoss(
      'fiber',
      'Fibre',
      `${fmt(lengthM / 1000, 3)} km × ${alpha} dB/km${overrideValue !== null ? ' (override)' : ''}`,
      fiberLoss
    );

    COMPONENT_ROWS.forEach((row) => {
      const count = parseValue(counts[row.key]);
      const unit = parseValue(unitLosses[row.key]);
      if (count > 0) addLoss(row.key, row.label, `${count} × ${unit} dB`, count * unit);
    });

    if (splitter.value !== 'none') {
      addLoss(
        'splitter',
        `Splitter 1×${splitter.ratio}`,
        `${splitterQty} × ${splitter.loss} dB (ideal split 10·log₁₀${splitter.ratio} = ${fmt(10 * Math.log10(splitter.ratio))} dB)`,
        splitterQty * splitter.loss
      );
    }

    const linkLoss = tMin - level;
    const requiredLoss = linkLoss + margin;
    const budget = tMin - sens;
    const remainingMargin = budget - requiredLoss;
    const rxMin = tMin - linkLoss; // worst-case received power (before design margin)
    const rxMax = tMax - linkLoss; // best-case received power
    const overloadExcess = rxMax - overload;
    const sensitivityOk = remainingMargin >= 0;
    const overloadOk = overloadExcess <= 0;
    const status: LinkStatus = sensitivityOk && overloadOk ? 'ok' : !sensitivityOk && !overloadOk ? 'conflict' : !sensitivityOk ? 'low' : 'high';

    // Application checks against the selected transceiver standard
    const warnings: string[] = [];
    const t = selectedTransceiver;
    if (t.mode !== null) {
      if (t.mode !== selectedFiber.mode) {
        warnings.push(`${t.label} requires ${t.mode === 'mm' ? 'multimode' : 'single-mode'} fibre; the selected fibre is ${selectedFiber.mode === 'mm' ? 'multimode' : 'single-mode'}.`);
      } else {
        const operatingWavelength = selectedFiber.mode === 'mm' ? (t.wavelength === 850 ? 850 : 1300) : t.wavelength;
        if (operatingWavelength !== selectedFiber.wavelength) {
          warnings.push(`The fibre attenuation is for ${selectedFiber.wavelength} nm but ${t.label} operates at ${t.wavelength} nm.`);
        }
        const reach = t.reach?.[selectedFiber.grade];
        if (reach !== undefined && lengthM > reach) {
          warnings.push(`Link length ${lengthM} m exceeds the ${reach} m supported by ${t.label} on ${selectedFiber.mode === 'mm' ? selectedFiber.grade.toUpperCase() : 'single-mode'} fibre (${t.reference}).`);
        }
      }
    }
    if (margin < 3) warnings.push('A design margin of at least 3 dB is recommended for repair splices, ageing and temperature (ITU-T G.Sup39).');

    let recommendation = '';
    if (status === 'low') {
      recommendation = `The link is short of the design requirement by ${fmt(-remainingMargin)} dB. Reduce the loss (shorter route, fewer connections, lower-loss fibre/components) or select a transceiver with a larger power budget.`;
    } else if (status === 'high') {
      recommendation = `The maximum received power exceeds the receiver overload level by ${fmt(overloadExcess)} dB. Insert a fixed optical attenuator of at least ${fmt(overloadExcess)} dB at the receiver (check that the remaining margin stays ≥ 0 dB).`;
    } else if (status === 'conflict') {
      recommendation = 'The link cannot satisfy both the sensitivity and the overload limits with this transceiver. Select a transceiver with a wider receiver dynamic range.';
    }

    return {
      valid: true as const,
      errors,
      steps,
      alpha,
      lengthM,
      margin,
      fiberLoss,
      linkLoss,
      requiredLoss,
      budget,
      remainingMargin,
      rxMin,
      rxMax,
      overloadExcess,
      sensitivityOk,
      overloadOk,
      status,
      warnings,
      recommendation,
      sens,
      overload
    };
  }, [txMin, txMax, rxSens, rxOverload, fiberLength, attenuationOverride, counts, unitLosses, splitterRatio, splitterCount, designMargin, selectedFiber, selectedTransceiver]);

  // Save to history / prepare export whenever a valid result changes
  useEffect(() => {
    if (!analysis.valid) return;
    const inputs = {
      transceiverType, txMin, txMax, rxSens, rxOverload,
      fiberType, fiberLength, attenuationOverride, counts, unitLosses, splitterRatio, splitterCount, designMargin
    };
    const results = {
      fiberLoss: fmt(analysis.fiberLoss),
      totalLinkLoss: fmt(analysis.linkLoss),
      designMargin: fmt(analysis.margin),
      totalLossIncludingMargin: fmt(analysis.requiredLoss),
      powerBudget: fmt(analysis.budget),
      remainingMargin: fmt(analysis.remainingMargin),
      minReceivedPowerDBm: fmt(analysis.rxMin),
      maxReceivedPowerDBm: fmt(analysis.rxMax),
      linkStatus: STATUS_STYLES[analysis.status].label,
      steps: analysis.steps.map((s) => ({
        element: s.label,
        lossDB: s.loss === null ? '' : fmt(s.loss),
        powerDBm: fmt(s.level)
      }))
    };
    prepareExportData(inputs, results);
    const timer = setTimeout(() => saveCalculation(inputs, results), 1000);
    return () => clearTimeout(timer);
  }, [analysis, transceiverType, txMin, txMax, rxSens, rxOverload, fiberType, fiberLength, attenuationOverride, counts, unitLosses, splitterRatio, splitterCount, designMargin, saveCalculation, prepareExportData]);

  return (
    <CalculatorWrapper
      title="Optical Fiber Power Budget Calculator"
      discipline="elv"
      calculatorType="opticalFiber"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <p className="mb-6 text-gray-600">
          Optical link power budget in dB / dBm, using the attenuation limits of ISO/IEC 11801-1, TIA-568.3-D and ITU-T G.652 / G.655 / G.657 and the optical levels of IEEE 802.3.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ===================== Input Section ===================== */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-4">Link Configuration</h3>

            {/* Transceiver */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">Transceiver</h4>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transceiver Type</label>
                    <select value={transceiverType} onChange={(e) => applyTransceiver(e.target.value)} className={inputClass}>
                      {TRANSCEIVERS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {selectedTransceiver.reference && (
                      <p className="text-xs text-gray-500 mt-1">
                        <Icons.InfoInline />
                        {selectedTransceiver.reference} – reach: {selectedTransceiver.reachText}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Launch Power</label>
                      <UnitInput value={txMin} unit="dBm" step="0.1" onChange={editLevel(setTxMin)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Launch Power</label>
                      <UnitInput value={txMax} unit="dBm" step="0.1" onChange={editLevel(setTxMax)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rx Sensitivity</label>
                      <UnitInput value={rxSens} unit="dBm" step="0.1" onChange={editLevel(setRxSens)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rx Overload</label>
                      <UnitInput value={rxOverload} unit="dBm" step="0.1" onChange={editLevel(setRxOverload)} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <Icons.InfoInline />
                    Average optical power. The budget uses the minimum launch power; the overload check uses the maximum.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 my-6"></div>

            {/* Fibre */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">Fibre</h4>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fibre Type</label>
                    <select value={fiberType} onChange={(e) => setFiberType(e.target.value)} className={inputClass}>
                      <optgroup label="Multimode fibre">
                        {FIBER_TYPES.filter((f) => f.mode === 'mm').map((f) => (
                          <option key={f.value} value={f.value}>{f.label} – {f.attenuation} dB/km</option>
                        ))}
                      </optgroup>
                      <optgroup label="Single-mode fibre">
                        {FIBER_TYPES.filter((f) => f.mode === 'sm').map((f) => (
                          <option key={f.value} value={f.value}>{f.label} – {f.attenuation} dB/km</option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      <Icons.InfoInline />
                      Maximum attenuation per {selectedFiber.reference}.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fibre Length</label>
                      <UnitInput value={fiberLength} unit="m" step="10" min="0" onChange={setFiberLength} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attenuation Override</label>
                      <UnitInput value={attenuationOverride} unit="dB/km" step="0.01" min="0" onChange={setAttenuationOverride} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <Icons.InfoInline />
                    Leave the override blank to use the standard maximum; enter the cable datasheet value if it is lower.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 my-6"></div>

            {/* Components */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">Passive Components</h4>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="pl-3 border-l-4 border-blue-400 space-y-3">
                  {COMPONENT_ROWS.map((row) => (
                    <div key={row.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{row.label}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <UnitInput value={counts[row.key]} unit="qty" step="1" min="0" onChange={(v) => setCounts((prev) => ({ ...prev, [row.key]: v }))} />
                        <UnitInput value={unitLosses[row.key]} unit="dB each" step="0.05" min="0" onChange={(v) => setUnitLosses((prev) => ({ ...prev, [row.key]: v }))} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{row.hint}</p>
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Optical Splitters</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select value={splitterRatio} onChange={(e) => setSplitterRatio(e.target.value)} className={inputClass}>
                        {SPLITTER_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <UnitInput value={splitterCount} unit="in path" step="1" min="1" onChange={setSplitterCount} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Typical maximum PLC insertion loss; ideal split = 10·log₁₀N. Use the datasheet value for the product.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 my-6"></div>

            {/* Margin */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Design Margin</h4>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="pl-3 border-l-4 border-blue-400">
                  <label className="block text-sm font-medium text-gray-700 mb-1">System / Safety Margin</label>
                  <UnitInput value={designMargin} unit="dB" step="0.5" min="0" onChange={setDesignMargin} />
                  <p className="text-xs text-gray-500 mt-1">
                    <Icons.InfoInline />
                    Reserve for repair splices, ageing and temperature; 3 dB or more is recommended (ITU-T G.Sup39).
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
                    <h4 className="font-medium text-base text-blue-800">Link Summary</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[analysis.status].pill}`}>
                      {analysis.status === 'ok' ? 'PASS' : 'FAIL'} – {STATUS_STYLES[analysis.status].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Power Budget:</p>
                      <p className="font-semibold text-gray-800">{fmt(analysis.budget)} dB</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Link Loss:</p>
                      <p className="font-semibold text-gray-800">{fmt(analysis.linkLoss)} dB</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Remaining Margin:</p>
                      <p className={`font-semibold ${analysis.sensitivityOk ? 'text-green-600' : 'text-red-600'}`}>
                        {analysis.remainingMargin >= 0 ? '+' : '−'}{fmt(Math.abs(analysis.remainingMargin))} dB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Received Power:</p>
                      <p className="font-semibold text-gray-800">
                        {fmt(analysis.rxMin, 1)} to {fmt(analysis.rxMax, 1)} dBm
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Remaining margin = power budget − link loss − design margin ({fmt(analysis.margin, 1)} dB); it must be ≥ 0 dB. Received power must stay between the sensitivity ({fmt(analysis.sens, 1)} dBm) and overload ({fmt(analysis.overload, 1)} dBm) levels.
                  </p>
                </div>

                {analysis.recommendation && (
                  <div className={`p-3 rounded-md mb-4 text-sm ${analysis.status === 'high' ? 'bg-yellow-50 border border-yellow-300 text-yellow-800' : 'bg-red-100 border border-red-300 text-red-700'}`}>
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
                  <h4 className="font-medium text-base text-blue-800 mb-3">Step-by-Step Power Level (worst case)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="py-2 pr-3">Element</th>
                          <th className="py-2 pr-3 text-right">Loss (dB)</th>
                          <th className="py-2 text-right">Power (dBm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analysis.steps.map((s) => (
                          <tr key={s.key}>
                            <td className="py-2 pr-3">
                              <p className="font-medium text-gray-800">{s.label}</p>
                              <p className="text-xs text-gray-500">{s.detail}</p>
                            </td>
                            <td className="py-2 pr-3 text-right text-red-600">{s.loss === null ? '–' : `−${fmt(s.loss)}`}</td>
                            <td className="py-2 text-right font-semibold text-gray-800">{fmt(s.level)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300">
                          <td className="py-2 pr-3 font-semibold text-gray-800">Total link loss</td>
                          <td className="py-2 pr-3 text-right font-semibold text-red-600">−{fmt(analysis.linkLoss)}</td>
                          <td className="py-2 text-right font-bold text-gray-800">{fmt(analysis.rxMin)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-gray-700">Design margin</td>
                          <td className="py-2 pr-3 text-right text-red-600">−{fmt(analysis.margin)}</td>
                          <td className="py-2 text-right text-gray-800">{fmt(analysis.rxMin - analysis.margin)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-gray-700">Receiver sensitivity</td>
                          <td className="py-2 pr-3 text-right text-gray-500">–</td>
                          <td className="py-2 text-right text-gray-800">{fmt(analysis.sens)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-semibold text-gray-800">Remaining margin</td>
                          <td className="py-2 pr-3"></td>
                          <td className={`py-2 text-right font-bold ${analysis.sensitivityOk ? 'text-green-600' : 'text-red-600'}`}>
                            {analysis.remainingMargin >= 0 ? '+' : '−'}{fmt(Math.abs(analysis.remainingMargin))} dB
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Receiver limits */}
                <div className="bg-white p-4 rounded-md shadow border border-gray-200">
                  <h4 className="font-medium text-base text-blue-800 mb-3">Receiver Limits</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="py-2 pr-3">Check</th>
                          <th className="py-2 pr-3 text-right">Received (dBm)</th>
                          <th className="py-2 pr-3 text-right">Limit (dBm)</th>
                          <th className="py-2 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="py-2 pr-3 font-medium text-gray-800">Sensitivity (incl. design margin)</td>
                          <td className="py-2 pr-3 text-right text-gray-700">{fmt(analysis.rxMin - analysis.margin)}</td>
                          <td className="py-2 pr-3 text-right text-gray-700">≥ {fmt(analysis.sens)}</td>
                          <td className="py-2 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${analysis.sensitivityOk ? STATUS_STYLES.ok.pill : STATUS_STYLES.low.pill}`}>
                              {analysis.sensitivityOk ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-medium text-gray-800">Overload (max launch power)</td>
                          <td className="py-2 pr-3 text-right text-gray-700">{fmt(analysis.rxMax)}</td>
                          <td className="py-2 pr-3 text-right text-gray-700">≤ {fmt(analysis.overload)}</td>
                          <td className="py-2 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${analysis.overloadOk ? STATUS_STYLES.ok.pill : STATUS_STYLES.high.pill}`}>
                              {analysis.overloadOk ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===================== Reference tables ===================== */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-3">Transceiver Reference</h3>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Reach</th>
                  <th className="py-2 px-3 text-right">Launch (dBm)</th>
                  <th className="py-2 px-3 text-right">Rx (dBm)</th>
                  <th className="py-2 px-3 text-right">Budget (dB)</th>
                  <th className="py-2 px-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TRANSCEIVERS.filter((t) => t.txMin !== null).map((t) => (
                  <tr key={t.value}>
                    <td className="py-2 px-3 font-medium text-gray-800">{t.label}</td>
                    <td className="py-2 px-3 text-gray-700">{t.reachText}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{t.txMin} to {t.txMax}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{t.rxSens} to {t.rxOverload}</td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-800">{fmt((t.txMin as number) - (t.rxSens as number), 1)}</td>
                    <td className="py-2 px-3 text-gray-500">{t.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Worst-case average power levels. Budget = minimum launch power − receiver sensitivity. Always verify against the specific transceiver datasheet.
          </p>
        </div>

        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-3">Fibre Attenuation Reference</h3>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2 px-3">Fibre</th>
                  <th className="py-2 px-3">Core / cladding</th>
                  <th className="py-2 px-3 text-right">Wavelength (nm)</th>
                  <th className="py-2 px-3 text-right">Max (dB/km)</th>
                  <th className="py-2 px-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FIBER_TYPES.map((f) => (
                  <tr key={f.value}>
                    <td className="py-2 px-3 font-medium text-gray-800">{f.label.split(' @')[0]}</td>
                    <td className="py-2 px-3 text-gray-700">{f.core}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{f.wavelength}</td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-800">{f.attenuation}</td>
                    <td className="py-2 px-3 text-gray-500">{f.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Maximum cabled attenuation coefficients. Typical cable datasheet values are lower; enter them in the attenuation override.
          </p>
        </div>

        {/* ===================== Notes ===================== */}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-gray-700">Calculation Notes</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Link loss (dB) = α · L + Σ (quantity × loss per unit) + splitter loss, with α in dB/km and L in km (ISO/IEC 14763-3, TIA-568.3-D).</li>
            <li>Power budget (dB) = minimum launch power (dBm) − receiver sensitivity (dBm). Remaining margin = budget − link loss − design margin, and must be ≥ 0 dB.</li>
            <li>Received power range = launch power − link loss. It must lie between the receiver sensitivity and the receiver overload level; add an optical attenuator if the maximum exceeds the overload level.</li>
            <li>Attenuation defaults are the maximum values in IEC 60793-2-10, ISO/IEC 11801-1 and TIA-568.3-D (multimode 3.5 / 1.5 dB/km at 850 / 1300 nm, OM5 3.0 dB/km at 850 nm) and ITU-T G.652 / G.655 / G.657 (single-mode).</li>
            <li>Connector pairs (≤ 0.75 dB) and splices (≤ 0.3 dB) use the allowances of ISO/IEC 11801-1 and TIA-568.3-D. Measured losses are normally lower; test and acceptance follow IEC 61280-4-1 / -4-2 and ISO/IEC 14763-3.</li>
            <li>Optical levels for 10GBASE-S/L/E and 1000BASE-SX/LX are the worst-case average power values of IEEE 802.3ae and 802.3z. 10G ZR is a vendor / MSA specification.</li>
            <li>This is a power-budget check only. Dispersion and modal bandwidth limit the reach (see the reach shown for each transceiver); fibre-specific bandwidth must be checked separately.</li>
            <li>Observe the minimum bend radius of the cable and fibre (ITU-T G.657 for bend-insensitive fibre); bend loss is not a design allowance in the standards.</li>
          </ul>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default OpticalFiberCalculator;
