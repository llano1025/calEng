import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import { MPE_CONSTANTS, IEC_AEL_TABLES } from './LaserSafetyShared';

type ResultsHandler = (inputs: Record<string, any>, results: Record<string, any>) => void;

interface NOHDCalculatorProps {
  onShowTutorial?: () => void;
  onResults?: ResultsHandler;
}

type Target = 'eye' | 'skin';
type DiameterDefinition = 'e2' | 'e';
type HazardLevel = 'safe' | 'moderate' | 'high';

interface TargetResult {
  target: Target;
  mpe: number; // W/m²
  apertureMm: number; // limiting aperture (mm)
  requiredBeamDiameter: number; // m: beam diameter at which the irradiance equals the MPE
  initialIrradiance: number; // W/m² averaged over the larger of the beam and the limiting aperture
  hazardRatio: number; // initial irradiance ÷ MPE
  nohd: number; // m (Infinity = never below the MPE)
  beamDiameterAtNOHD: number; // m
  reason: string;
}

// Exposure-time presets (time bases used in IEC 60825-1 and typical exposure assumptions)
const EXPOSURE_PRESETS = [
  { time: 0.25, label: '0.25 s', hint: 'Aversion response, visible 400–700 nm' },
  { time: 10, label: '10 s', hint: 'Time base for λ > 1400 nm; intentional intrabeam viewing' },
  { time: 100, label: '100 s', hint: 'IEC 60825-1 time base, 400–1400 nm (non-visible or blue light)' },
  { time: 30000, label: '30 000 s', hint: 'IEC 60825-1 time base, λ < 400 nm; full working day' }
];

const parseValue = (value: string): number => (value.trim() === '' ? NaN : Number(value));

// Limiting apertures (mm) from IEC 60825-1:2014 Table A.6 (identical to Table 10, Condition 3, for the eye)
//   < 400 nm: 1 mm;  400-1400 nm: 7 mm;  1400 nm - 10^5 nm: 1 mm (t ≤ 0.35 s), 1.5·t^(3/8) (0.35 s < t < 10 s), 3.5 mm (t ≥ 10 s);  > 10^5 nm: 11 mm
const eyeLimitingApertureMm = (wavelength: number, t: number): number => {
  if (wavelength < 400) return 1;
  if (wavelength <= 1400) return 7;
  if (wavelength >= 1e5) return 11;
  if (t <= 0.35) return 1;
  if (t < 10) return 1.5 * Math.pow(t, 0.375);
  return 3.5;
};
// Skin: 3.5 mm from 180 nm to 10^5 nm, 11 mm from 10^5 nm to 10^6 nm
const skinLimitingApertureMm = (wavelength: number): number => (wavelength >= 1e5 ? 11 : 3.5);

// Convert an MPE from the shared tables into irradiance (W/m²)
const mpeToIrradiance = (mpe: { value: number; unit: string }, t: number, apertureMm: number): number => {
  if (mpe.unit.includes('W/m²')) return mpe.value;
  if (mpe.unit.includes('J/m²')) return t > 0 ? mpe.value / t : 0;
  if (mpe.unit === 'W') return mpe.value / (Math.PI * Math.pow(apertureMm / 2000, 2));
  return mpe.value;
};

const wavelengthBand = (wavelength: number): string => {
  if (wavelength < 280) return 'UV-C';
  if (wavelength < 315) return 'UV-B';
  if (wavelength < 400) return 'UV-A';
  if (wavelength <= 700) return 'Visible (retinal hazard region)';
  if (wavelength <= 1400) return 'Near-infrared (retinal hazard region)';
  if (wavelength <= 3000) return 'Short-wavelength infrared (IR-A/IR-B)';
  return 'Mid/far infrared (IR-C)';
};

// NOHD = (1/Φ) · [ sqrt(4P / (π · MPE)) − a ]   (IEC 60825-1 / IEC TR 60825-14)
const computeTarget = (
  target: Target,
  mpe: number,
  apertureMm: number,
  powerW: number,
  a: number,
  phi: number
): TargetResult => {
  const dAp = apertureMm / 1000;
  const requiredBeamDiameter = Math.sqrt((4 * powerW) / (Math.PI * mpe));
  // MPE is an irradiance averaged over the limiting aperture
  const effectiveDiameter = Math.max(a, dAp);
  const initialIrradiance = powerW / (Math.PI * Math.pow(effectiveDiameter / 2, 2));
  const hazardRatio = initialIrradiance / mpe;

  let nohd = 0;
  let reason = '';
  if (phi === 0) {
    nohd = initialIrradiance > mpe ? Infinity : 0;
    reason = nohd === Infinity ? 'Collimated beam above the MPE: the hazard never decreases.' : 'Collimated beam below the MPE.';
  } else if (requiredBeamDiameter <= dAp) {
    nohd = 0;
    reason = `Power through the ${apertureMm.toFixed(1)} mm aperture does not exceed MPE × aperture area, so the beam is below the MPE at every distance.`;
  } else {
    nohd = Math.max(0, (requiredBeamDiameter - a) / phi);
    reason = requiredBeamDiameter <= a ? 'The beam is already wider than the diameter at which it meets the MPE.' : 'NOHD = (d_MPE − a) ÷ Φ.';
  }
  const beamDiameterAtNOHD = Number.isFinite(nohd) ? a + phi * nohd : Infinity;

  return { target, mpe, apertureMm, requiredBeamDiameter, initialIrradiance, hazardRatio, nohd, beamDiameterAtNOHD, reason };
};

const formatDistance = (distance: number): string => {
  if (distance === Infinity) return '∞ (infinite)';
  if (distance === 0) return '0 m (safe)';
  if (distance < 1) return `${(distance * 100).toFixed(1)} cm`;
  if (distance < 1000) return `${distance.toFixed(2)} m`;
  return `${(distance / 1000).toFixed(2)} km`;
};

const hazardLevel = (distance: number): HazardLevel => {
  if (distance === Infinity || distance > 3) return 'high';
  if (distance > 0.1) return 'moderate';
  return 'safe';
};

const HAZARD_STYLES: Record<HazardLevel, { card: string; text: string; pill: string }> = {
  safe: { card: 'bg-green-50 border-green-200', text: 'text-green-700', pill: 'bg-green-100 text-green-700' },
  moderate: { card: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', pill: 'bg-yellow-100 text-yellow-700' },
  high: { card: 'bg-red-50 border-red-200', text: 'text-red-700', pill: 'bg-red-100 text-red-700' }
};

const inputClass = 'w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500';

const UnitInput: React.FC<{ value: string; unit: string; step?: string; min?: string; onChange: (v: string) => void }> = ({ value, unit, step = 'any', min, onChange }) => (
  <div className="flex">
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
    />
    <div className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-sm text-gray-600 whitespace-nowrap">{unit}</div>
  </div>
);

const exp = (n: number, digits = 3): string => (n === Infinity ? '∞' : n.toExponential(digits));

const NOHDCalculator: React.FC<NOHDCalculatorProps> = ({ onResults }) => {
  const [power, setPower] = useState<string>('5');
  const [beamDiameter, setBeamDiameter] = useState<string>('2');
  const [beamDivergence, setBeamDivergence] = useState<string>('1');
  const [diameterDefinition, setDiameterDefinition] = useState<DiameterDefinition>('e2');
  const [wavelength, setWavelength] = useState<string>('532');
  const [exposureTime, setExposureTime] = useState<string>('0.25');

  const analysis = useMemo(() => {
    const errors: string[] = [];
    const P = parseValue(power);
    const D = parseValue(beamDiameter);
    const phiMrad = parseValue(beamDivergence);
    const wl = parseValue(wavelength);
    const t = parseValue(exposureTime);

    if (!isFinite(P) || P <= 0) errors.push('Laser power must be greater than zero.');
    if (!isFinite(D) || D <= 0) errors.push('Beam diameter must be greater than zero.');
    if (!isFinite(phiMrad) || phiMrad < 0) errors.push('Beam divergence must be zero or greater.');
    if (!isFinite(wl) || wl < 180 || wl > 1e6) errors.push('Wavelength must be between 180 nm and 1 mm (IEC 60825-1).');
    if (!isFinite(t) || t <= 0) errors.push('Exposure time must be greater than zero.');
    if (errors.length > 0) return { valid: false as const, errors };

    const powerW = P * MPE_CONSTANTS.MW_TO_W;
    // IEC 60825-1 defines beam diameter and divergence at the 1/e (63 %) points of the irradiance.
    // Datasheets usually quote 1/e² values, which are √2 larger.
    const conversion = diameterDefinition === 'e2' ? Math.SQRT2 : 1;
    const a = (D * MPE_CONSTANTS.MM_TO_M) / conversion;
    const phi = (phiMrad * MPE_CONSTANTS.MRAD_TO_RAD) / conversion;

    const eyeAperture = eyeLimitingApertureMm(wl, t);
    const eyeMpeRaw = IEC_AEL_TABLES.getMPEIrriance(wl, t, 1.0);
    const skinMpeRaw = IEC_AEL_TABLES.getMPESkin(wl, t);
    const eyeMpe = mpeToIrradiance(eyeMpeRaw, t, eyeAperture);
    const skinAperture = skinLimitingApertureMm(wl);
    const skinMpe = mpeToIrradiance(skinMpeRaw, t, skinAperture);
    if (!(eyeMpe > 0) || !(skinMpe > 0)) {
      return { valid: false as const, errors: ['No MPE is defined for this wavelength / exposure time combination. Change the wavelength or the exposure time.'] };
    }

    const eye = computeTarget('eye', eyeMpe, eyeAperture, powerW, a, phi);
    const skin = computeTarget('skin', skinMpe, skinAperture, powerW, a, phi);
    const critical: TargetResult = skin.nohd > eye.nohd ? skin : eye;

    const warnings: string[] = [];
    if (wl < 400 || wl > 1400) warnings.push('Outside 400–1400 nm the eye hazard is corneal/lens rather than retinal; check the MPE time base and aperture in the standard.');
    if (wl >= 1250 && wl <= 1400) warnings.push('IEC 60825-1 Table A.1 note e: between 1250 nm and 1400 nm the retinal limits may not protect the cornea and iris. The skin MPE is evaluated as well, and the larger NOHD governs.');
    if (wl > 1400 && t >= 10) warnings.push('Table A.5 note c: the skin MPE of 1000 W/m² applies to areas up to 0.01 m²; for exposed skin areas above 0.1 m² it is reduced to 100 W/m².');
    if (t > 0.25 && wl >= 400 && wl <= 700) warnings.push('For visible lasers the 0.25 s aversion response normally applies; a longer exposure time gives a more conservative (longer) NOHD.');
    if (t < 0.25 && !(wl >= 400 && wl <= 700)) warnings.push('Invisible lasers do not trigger the aversion response; consider a longer exposure time (10 s to 100 s).');

    return {
      valid: true as const,
      errors,
      warnings,
      powerW,
      a,
      phi,
      eyeMpeRaw,
      skinMpeRaw,
      eye,
      skin,
      critical,
      band: wavelengthBand(wl)
    };
  }, [power, beamDiameter, beamDivergence, diameterDefinition, wavelength, exposureTime]);

  // Report results for export / history
  useEffect(() => {
    if (!analysis.valid) return;
    onResults?.(
      { powerMW: power, beamDiameterMm: beamDiameter, divergenceMrad: beamDivergence, diameterDefinition: diameterDefinition === 'e2' ? '1/e²' : '1/e', wavelengthNm: wavelength, exposureTimeS: exposureTime },
      {
        eyeMPE_W_m2: exp(analysis.eye.mpe),
        skinMPE_W_m2: exp(analysis.skin.mpe),
        eyeNOHD: formatDistance(analysis.eye.nohd),
        skinNOHD: formatDistance(analysis.skin.nohd),
        criticalTarget: analysis.critical.target,
        criticalNOHD: formatDistance(analysis.critical.nohd)
      }
    );
  }, [analysis, power, beamDiameter, beamDivergence, diameterDefinition, wavelength, exposureTime, onResults]);

  const resetCalculation = () => {
    setPower('5');
    setBeamDiameter('2');
    setBeamDivergence('1');
    setDiameterDefinition('e2');
    setWavelength('532');
    setExposureTime('0.25');
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ===================== Input Section ===================== */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Laser Beam Parameters</h3>

          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3">Beam</h4>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="pl-3 border-l-4 border-blue-400 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Laser Power (CW)</label>
                  <UnitInput value={power} unit="mW" min="0" onChange={setPower} />
                  <p className="text-xs text-gray-500 mt-1">Continuous-wave output power</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beam Diameter at Aperture</label>
                    <UnitInput value={beamDiameter} unit="mm" min="0" onChange={setBeamDiameter} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beam Divergence (full angle)</label>
                    <UnitInput value={beamDivergence} unit="mrad" min="0" onChange={setBeamDivergence} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diameter / Divergence Definition</label>
                  <select value={diameterDefinition} onChange={(e) => setDiameterDefinition(e.target.value as DiameterDefinition)} className={inputClass}>
                    <option value="e2">1/e² points (typical datasheet value)</option>
                    <option value="e">1/e points (IEC 60825-1 definition)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    <Icons.InfoInline />
                    IEC 60825-1 uses the 1/e (63 %) diameter; 1/e² values are converted by dividing by √2. Use 0 mrad for a perfectly collimated beam.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-300 my-6"></div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3">Wavelength and Exposure</h4>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="pl-3 border-l-4 border-blue-400 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wavelength</label>
                  <UnitInput value={wavelength} unit="nm" min="180" step="1" onChange={setWavelength} />
                  <p className="text-xs text-gray-500 mt-1">
                    <Icons.InfoInline />
                    180 nm – 1 mm per IEC 60825-1{analysis.valid ? ` – ${analysis.band}` : ''}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exposure Time for MPE</label>
                  <UnitInput value={exposureTime} unit="s" min="0" onChange={setExposureTime} />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {EXPOSURE_PRESETS.map((preset) => (
                      <button
                        key={preset.time}
                        onClick={() => setExposureTime(String(preset.time))}
                        title={preset.hint}
                        className={`px-2 py-1 rounded-md text-xs border ${
                          parseValue(exposureTime) === preset.time ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    0.25 s: aversion response (visible); 10 s: &gt; 1400 nm / intentional viewing; 100 s: 400–1400 nm time base; 30 000 s: UV time base.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button onClick={resetCalculation} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors w-full">
            Reset to Defaults
          </button>
        </div>

        {/* ===================== Results Section ===================== */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>

          {!analysis.valid ? (
            <div className="bg-red-100 border border-red-300 p-3 rounded-md text-sm text-red-700">
              <p className="font-medium mb-1">Please correct the following:</p>
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
                  <h4 className="font-medium text-base text-blue-800">Critical NOHD (most restrictive)</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${HAZARD_STYLES[hazardLevel(analysis.critical.nohd)].pill}`}>
                    {analysis.critical.target === 'eye' ? 'EYE' : 'SKIN'} governs
                  </span>
                </div>
                <p className={`font-bold text-3xl ${HAZARD_STYLES[hazardLevel(analysis.critical.nohd)].text}`}>{formatDistance(analysis.critical.nohd)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {[analysis.eye, analysis.skin].map((r) => (
                    <div key={r.target} className={`p-3 rounded-md border ${HAZARD_STYLES[hazardLevel(r.nohd)].card}`}>
                      <p className="text-sm text-gray-600">{r.target === 'eye' ? 'Eye NOHD' : 'Skin NOHD'}</p>
                      <p className={`font-semibold text-lg ${HAZARD_STYLES[hazardLevel(r.nohd)].text}`}>{formatDistance(r.nohd)}</p>
                      <p className="text-xs text-gray-500">MPE {exp(r.mpe)} W/m² ({exp(r.mpe / MPE_CONSTANTS.M2_TO_CM2)} W/cm²)</p>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.warnings.length > 0 && (
                <div className="p-3 rounded-md mb-4 text-sm bg-yellow-50 border border-yellow-300 text-yellow-800">
                  <p className="font-medium mb-1">
                    <Icons.InfoInline />
                    Check the assumptions
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
                <h4 className="font-medium text-base text-blue-800 mb-3">Step-by-Step Calculation</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <th className="py-2 pr-3">Step</th>
                        <th className="py-2 pr-3 text-right">Eye</th>
                        <th className="py-2 text-right">Skin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">1. Power P</td>
                        <td className="py-2 pr-3 text-right font-mono" colSpan={2}>{exp(analysis.powerW)} W</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">2. Beam diameter a / divergence Φ (1/e)</td>
                        <td className="py-2 pr-3 text-right font-mono" colSpan={2}>{(analysis.a * 1000).toFixed(3)} mm / {(analysis.phi * 1000).toFixed(3)} mrad</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">3. MPE (W/m²)</td>
                        <td className="py-2 pr-3 text-right font-mono">{exp(analysis.eye.mpe)}</td>
                        <td className="py-2 text-right font-mono">{exp(analysis.skin.mpe)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">4. Limiting aperture</td>
                        <td className="py-2 pr-3 text-right font-mono">{analysis.eye.apertureMm.toFixed(2)} mm</td>
                        <td className="py-2 text-right font-mono">{analysis.skin.apertureMm.toFixed(1)} mm</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">5. Beam diameter at the MPE: d = √(4P ÷ (π·MPE))</td>
                        <td className="py-2 pr-3 text-right font-mono">{(analysis.eye.requiredBeamDiameter * 1000).toFixed(3)} mm</td>
                        <td className="py-2 text-right font-mono">{(analysis.skin.requiredBeamDiameter * 1000).toFixed(3)} mm</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">6. NOHD = (d − a) ÷ Φ</td>
                        <td className="py-2 pr-3 text-right font-mono font-semibold">{formatDistance(analysis.eye.nohd)}</td>
                        <td className="py-2 text-right font-mono font-semibold">{formatDistance(analysis.skin.nohd)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">7. Beam diameter at NOHD = a + Φ · NOHD</td>
                        <td className="py-2 pr-3 text-right font-mono">{analysis.eye.beamDiameterAtNOHD === Infinity ? 'n/a' : `${(analysis.eye.beamDiameterAtNOHD * 1000).toFixed(2)} mm`}</td>
                        <td className="py-2 text-right font-mono">{analysis.skin.beamDiameterAtNOHD === Infinity ? 'n/a' : `${(analysis.skin.beamDiameterAtNOHD * 1000).toFixed(2)} mm`}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">8. Irradiance at the aperture ÷ MPE</td>
                        <td className="py-2 pr-3 text-right font-mono">{analysis.eye.hazardRatio.toFixed(2)}×</td>
                        <td className="py-2 text-right font-mono">{analysis.skin.hazardRatio.toFixed(2)}×</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ul className="list-disc pl-5 mt-3 space-y-1 text-xs text-gray-600">
                  <li>Eye: {analysis.eye.reason}</li>
                  <li>Skin: {analysis.skin.reason}</li>
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-300">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <Icons.InfoInline />
                  Safety Recommendations
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                  {analysis.critical.nohd === Infinity && (
                    <>
                      <li className="font-medium text-red-800">The beam exceeds the {analysis.critical.target} MPE at every distance: use engineering controls (beam enclosure, termination, reduced power or increased divergence).</li>
                      <li className="font-medium text-red-800">Prevent access to the beam path without appropriate protection.</li>
                    </>
                  )}
                  {analysis.critical.nohd !== Infinity && analysis.critical.nohd > 100 && (
                    <>
                      <li>Establish a controlled area extending at least {analysis.critical.nohd.toFixed(0)} m along the beam.</li>
                      <li>Consider the beam path in adjacent buildings, roads and airspace (aviation authority rules may apply).</li>
                    </>
                  )}
                  {analysis.critical.nohd > 3 && analysis.critical.nohd <= 100 && (
                    <>
                      <li>Establish a controlled area of at least {analysis.critical.nohd.toFixed(1)} m and post warning signs at its boundary.</li>
                      <li>{analysis.critical.target === 'eye' ? 'Eye protection is required within the NOHD; skin exposure may also be hazardous.' : 'Skin protection is required within the NOHD; eye protection is also recommended.'}</li>
                    </>
                  )}
                  {analysis.critical.nohd > 0 && analysis.critical.nohd <= 3 && (
                    <>
                      <li>The hazard zone extends {formatDistance(analysis.critical.nohd)} (limited by {analysis.critical.target} exposure).</li>
                      <li>Terminate the beam beyond this distance and avoid direct beam viewing.</li>
                    </>
                  )}
                  {analysis.critical.nohd === 0 && (
                    <>
                      <li className="text-green-800">The beam is below both the eye and skin MPE at all distances.</li>
                      <li className="text-green-800">Standard precautions still apply: never view the beam directly on purpose.</li>
                    </>
                  )}
                  <li>Use the most restrictive NOHD ({analysis.critical.target}) for safety planning; consider reflections and optical instruments (binoculars) separately.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===================== Notes ===================== */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h4 className="font-medium mb-2 text-gray-700">Calculation Notes</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>NOHD = (1 ÷ Φ) · [ √(4P ÷ (π · MPE)) − a ], with P the power (W), MPE the irradiance limit (W/m²), a the beam diameter at the aperture and Φ the full-angle divergence (IEC 60825-1 / IEC TR 60825-14).</li>
          <li>Beam diameter and divergence are defined at the 1/e points. Datasheet 1/e² values are divided by √2 before use; ignoring this would under-estimate the NOHD by a factor of about 1.4.</li>
          <li>The MPE is an irradiance averaged over the limiting aperture (Table A.6, eye: 1 mm below 400 nm, 7 mm for 400–1400 nm, 1 mm to 3.5 mm above 1400 nm depending on exposure time, 11 mm above 10⁵ nm; skin: 3.5 mm, or 11 mm above 10⁵ nm). If the power through the aperture is below MPE × aperture area the NOHD is 0.</li>
          <li>MPE values come from IEC 60825-1:2014 Tables A.1 (eye) and A.5 (skin) for a point source and continuous-wave emission. For exposure times given as J/m², the MPE is divided by the exposure time to give an irradiance.</li>
          <li>Pulsed or scanned lasers, extended sources, optical aids (binoculars, telescopes), atmospheric attenuation and specular reflections are not included. Apply the additional rules of the standard for these cases.</li>
          <li>Always verify the result against the current edition of the standard and consult a laser safety officer for critical applications.</li>
        </ul>
      </div>
    </div>
  );
};

export default NOHDCalculator;
