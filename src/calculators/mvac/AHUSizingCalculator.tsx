import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface AHUSizingCalculatorProps {
  onShowTutorial?: () => void;
}

// ======================== PSYCHROMETRIC FUNCTIONS (FROM HTML) ========================

class Psychrometrics {
  private P: number; // Pressure in kPa

  constructor(pressure = 101.325) { 
    this.P = pressure; 
  }

  // Saturation vapor pressure calculation (unchanged from HTML)
  satVapPres(t: number): number { 
    const T = t + 273.15; 
    let Pws_Pa: number;
    
    if (t >= 0) { 
      Pws_Pa = Math.exp(-5.8002206e3/T + 1.3914993 + -4.8640239e-2*T + 4.1764768e-5*T*T + -1.4452093e-8*T*T*T + 6.5459673*Math.log(T)); 
    } else { 
      Pws_Pa = Math.exp(-5.6745359e3/T + 6.3925247 + -9.677843e-3*T + 6.2215701e-7*T*T + 2.0747825e-9*T*T*T + -9.484024e-13*T*T*T*T + 4.1635019*Math.log(T)); 
    } 
    return Pws_Pa / 1000; 
  }

  // Humidity ratio calculation (unchanged from HTML)
  humidityRatio(pv: number): number { 
    if (pv < 0) pv = 0; 
    if (pv >= this.P) { 
      return Infinity; 
    } 
    return 0.621945 * pv / (this.P - pv); 
  }

  // Vapor pressure calculation (unchanged from HTML)
  vaporPressure(W: number): number { 
    if (W < 0) W = 0; 
    if (W === Infinity) return this.P; 
    return W * this.P / (0.621945 + W); 
  }

  // Relative humidity calculation (unchanged from HTML)
  relativeHumidity(pv: number, pvs: number): number { 
    if (pvs <= 0) return 0; 
    let rh = (pv / pvs) * 100; 
    return Math.max(0, Math.min(rh, 100)); 
  }

  // Dew point calculation (unchanged from HTML)
  dewPoint(pv: number): number { 
    if (pv <= 0) return -273.15; 
    pv = Math.min(pv, this.P * 0.9999); 
    const alpha = Math.log(pv); 
    let Tdp: number;
    
    if (pv < 0.61094) { 
      Tdp = 6.09 + 12.608 * alpha + 0.4959 * alpha * alpha; 
      Tdp = Math.max(Tdp, -90); 
    } else { 
      Tdp = 6.54 + 14.526 * alpha + 0.7389 * alpha * alpha + 0.09486 * alpha**3 + 0.4569 * pv**0.1984; 
      Tdp = Math.min(Tdp, 200); 
    } 
    
    let Tdp_new = Tdp; 
    for (let i=0; i<5; i++) { 
      const pvs_tdp = this.satVapPres(Tdp_new); 
      const a = 17.62; 
      const b = 243.12; 
      const derivative = pvs_tdp * (a * b) / Math.pow(b + Tdp_new, 2); 
      if (Math.abs(derivative) < 1e-9) break; 
      Tdp_new = Tdp_new - (pvs_tdp - pv) / derivative; 
      if (Math.abs(Tdp_new - Tdp) < 0.01) break; 
      Tdp = Tdp_new; 
    } 
    return Tdp; 
  }

  // Wet bulb calculation (unchanged from HTML)
  wetBulb(tdb: number, W: number): number { 
    if (W < 0) W = 0; 
    let Twb_low = this.dewPoint(this.vaporPressure(W)); 
    let Twb_high = tdb; 
    const pvs_tdb = this.satVapPres(tdb); 
    const Ws_tdb = this.humidityRatio(pvs_tdb); 
    if (W >= Ws_tdb * 0.9999) return tdb; 
    
    let Twb = (Twb_low + Twb_high) / 2; 
    const maxIter = 50; 
    let iter = 0; 
    
    while (iter < maxIter) { 
      const pvs_twb = this.satVapPres(Twb); 
      const Ws_twb = this.humidityRatio(pvs_twb); 
      const W_calc_from_Twb = Ws_twb - (1.006 * (tdb - Twb)) / (2501 + 1.86 * tdb - 4.186 * Twb); 
      if (Math.abs(W - W_calc_from_Twb) < 1e-6) return Twb; 
      if (W_calc_from_Twb < W) { 
        Twb_low = Twb; 
      } else { 
        Twb_high = Twb; 
      } 
      Twb = (Twb_low + Twb_high) / 2; 
      iter++; 
    } 
    return Twb; 
  }

  // Enthalpy calculation (unchanged from HTML)
  enthalpy(tdb: number, W: number): number { 
    if (W < 0) W = 0; 
    if (!isFinite(W)) W = this.humidityRatio(this.satVapPres(tdb)); 
    return 1.006 * tdb + W * (2501 + 1.86 * tdb); 
  }

  // Specific volume calculation (unchanged from HTML)
  specificVolume(tdb: number, W: number): number { 
    if (W < 0) W = 0; 
    if (!isFinite(W)) W = this.humidityRatio(this.satVapPres(tdb)); 
    const Rda = 287.055 / 1000; 
    const T_kelvin = tdb + 273.15; 
    if (T_kelvin <= 0) return NaN; 
    return Rda * T_kelvin * (1 + 1.6078 * W) / this.P; 
  }

  // Main calculation function (unchanged from HTML)
  calculateAll(inputs: any): any {
    let { dryBulb, wetBulb, dewPoint, rh, humidityRatio, enthalpy } = inputs;
    const cleanVal = (v: any) => (v === '' || v === null || v === undefined || isNaN(v)) ? NaN : parseFloat(v);
    
    dryBulb = cleanVal(dryBulb); 
    wetBulb = cleanVal(wetBulb); 
    dewPoint = cleanVal(dewPoint);
    rh = cleanVal(rh); 
    humidityRatio = cleanVal(humidityRatio); 
    enthalpy = cleanVal(enthalpy);

    let knownParams = [dryBulb, wetBulb, dewPoint, rh, humidityRatio, enthalpy].filter(v => !isNaN(v)).length;
    if (knownParams < 2) throw new Error("At least two parameters required.");

    let tdb=NaN, twb=NaN, tdp=NaN, RH=NaN, W=NaN, h=NaN, pv=NaN, pvs=NaN, v=NaN;
    let calculated = false;

    try {
      // Calculation paths based on input pairs (unchanged from HTML)
      if (!isNaN(dryBulb)) {
        tdb = dryBulb; 
        pvs = this.satVapPres(tdb);
        
        if (!isNaN(wetBulb)) { 
          twb = wetBulb; 
          if (twb > tdb + 0.1) throw new Error("WBT > DBT."); 
          twb = Math.min(twb, tdb); 
          const maxIter = 50; 
          let iter = 0; 
          let W_low = 0; 
          let W_high = this.humidityRatio(pvs); 
          W = W_high / 2; 
          
          while(iter < maxIter) { 
            const twb_calc = this.wetBulb(tdb, W); 
            const error = twb_calc - twb; 
            if (Math.abs(error) < 0.01) break; 
            if (error < 0) W_low = W; else W_high = W; 
            W = (W_low + W_high) / 2; 
            iter++; 
          } 
          W = Math.max(0, W); 
          pv = this.vaporPressure(W); 
          RH = this.relativeHumidity(pv, pvs); 
          calculated = true; 
        }
        else if (!isNaN(rh)) { 
          RH = Math.max(0, Math.min(rh, 100)); 
          pv = RH / 100 * pvs; 
          W = this.humidityRatio(pv); 
          calculated = true; 
        }
        else if (!isNaN(humidityRatio)) { 
          W = humidityRatio; 
          if (W < 0) throw new Error("W < 0."); 
          pv = this.vaporPressure(W); 
          if (pv > pvs + 0.001) console.warn("Input Tdb/W implies RH > 100%."); 
          RH = this.relativeHumidity(pv, pvs); 
          calculated = true; 
        }
        else if (!isNaN(dewPoint)) { 
          tdp = dewPoint; 
          if (tdp > tdb + 0.1) throw new Error("DPT > DBT."); 
          tdp = Math.min(tdp, tdb); 
          pv = this.satVapPres(tdp); 
          RH = this.relativeHumidity(pv, pvs); 
          W = this.humidityRatio(pv); 
          calculated = true; 
        }
        else if (!isNaN(enthalpy)) { 
          h = enthalpy; 
          const h_vapor_term = (2501 + 1.86 * tdb); 
          if (Math.abs(h_vapor_term) < 1e-6) throw new Error("Cannot calc W from h at this temp."); 
          W = (h - 1.006 * tdb) / h_vapor_term; 
          if (W < -1e-6) W = 0; 
          pv = this.vaporPressure(W); 
          RH = this.relativeHumidity(pv, pvs); 
          calculated = true; 
        }
      }
      // Additional calculation paths for other input combinations...
      else if (!isNaN(wetBulb)) {
        twb = wetBulb;
        if (!isNaN(rh)) {
          RH = Math.max(0, Math.min(rh, 100));
          let tdb_low = twb; 
          let tdb_high = twb + 50; 
          tdb = (tdb_low + tdb_high) / 2;
          const maxIter = 50; 
          let iter = 0;
          
          while(iter < maxIter) {
            pvs = this.satVapPres(tdb); 
            pv = RH / 100 * pvs; 
            W = this.humidityRatio(pv);
            const twb_calc = this.wetBulb(tdb, W); 
            const error = twb_calc - twb;
            if (Math.abs(error) < 0.01) break;
            if (error < 0) tdb_low = tdb; else tdb_high = tdb;
            tdb = (tdb_low + tdb_high) / 2; 
            iter++;
          }
          if (iter === maxIter) console.warn("TDB calculation from WBT/RH did not fully converge.");
          calculated = true;
        }
        else if (!isNaN(humidityRatio)) {
          W = humidityRatio; 
          if (W < 0) throw new Error("W < 0.");
          let tdb_low = twb; 
          let tdb_high = twb + 50; 
          tdb = (tdb_low + tdb_high) / 2;
          const maxIter = 50; 
          let iter = 0;
          
          while(iter < maxIter) {
            const twb_calc = this.wetBulb(tdb, W); 
            const error = twb_calc - twb;
            if (Math.abs(error) < 0.01) break;
            if (error > 0) tdb_high = tdb; else tdb_low = tdb;
            tdb = (tdb_low + tdb_high) / 2; 
            iter++;
          }
          if (iter === maxIter) console.warn("TDB calculation from WBT/W did not fully converge.");
          pvs = this.satVapPres(tdb); 
          pv = this.vaporPressure(W); 
          RH = this.relativeHumidity(pv, pvs);
          calculated = true;
        }
      }
      else {
        throw new Error("Unsupported input combination. Try providing Dry Bulb Temp first.");
      }

      if (!calculated || isNaN(tdb) || isNaN(W)) throw new Error("Failed to determine primary properties (Tdb, W).");

      // Calculate remaining properties (unchanged from HTML)
      W = Math.max(0, W);
      if (isNaN(pv)) pv = this.vaporPressure(W);
      if (isNaN(pvs)) pvs = this.satVapPres(tdb);
      if (isNaN(RH)) RH = this.relativeHumidity(pv, pvs);
      if (isNaN(tdp)) tdp = this.dewPoint(pv);
      tdp = Math.min(tdp, tdb);
      if (isNaN(twb)) twb = this.wetBulb(tdb, W);
      twb = Math.min(twb, tdb);
      twb = Math.max(twb, tdp);
      if (isNaN(h)) h = this.enthalpy(tdb, W);
      v = this.specificVolume(tdb, W);

      if (this.relativeHumidity(pv, pvs) > 100.5) {
        console.warn(`Consistency check: State Tdb=${tdb.toFixed(2)}, W=${W.toFixed(6)} implies RH > 100.5%.`);
      }

      return { 
        dryBulb: tdb, 
        wetBulb: twb, 
        dewPoint: tdp, 
        rh: RH, 
        humidityRatio: W, 
        enthalpy: h, 
        specificVolume: v, 
        vaporPressure: pv 
      };

    } catch (innerError: any) {
      throw new Error(`Calculation failed: ${innerError.message}`);
    }
  }
}

// ======================== AHU/PAU SIZING CALCULATOR ========================

const AHUSizingCalculator: React.FC<AHUSizingCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'AHU Sizing Calculator',
    discipline: 'mvac',
    calculatorType: 'ahuSizing'
  });

  // State for unit mode
  const [unitMode, setUnitMode] = useState<'ahu' | 'pau'>('ahu');
  
  // State for atmospheric pressure
  const [pressure, setPressure] = useState<number>(101.325);

  // State for condition A with pre-filled values
  const [conditionA, setConditionA] = useState({
    oa: { dryBulb: '35', wetBulb: '29', rh: '', humidityRatio: '' },
    ra: { dryBulb: '25', wetBulb: '', rh: '55', humidityRatio: '' },
    oca: { dryBulb: '13', wetBulb: '', rh: '95', humidityRatio: '' },
    totalAirflow: '1000',
    totalAirflowUnit: 'L/s',
    oaAirflow: '200',
    oaAirflowUnit: 'L/s',
    chwEnabled: false,
    chwSupply: '7',
    chwReturn: '12',
    contactFactor: '0.9',
    fanEnabled: false,
    staticPressure: '500',
    fanEff: '70',
    motorEff: '90',
    fanGainEnabled: false,
    fanGainDeltaT: '0.5',
    ductGainEnabled: false,
    ductGainDeltaT: '0.3'
  });

  // State for condition B
  const [conditionB, setConditionB] = useState({
    oa: { dryBulb: '33', wetBulb: '28', rh: '', humidityRatio: '' },
    ra: { dryBulb: '25', wetBulb: '', rh: '55', humidityRatio: '' },
    oca: { dryBulb: '13', wetBulb: '', rh: '95', humidityRatio: '' },
    totalAirflow: '1000',
    totalAirflowUnit: 'L/s',
    oaAirflow: '200',
    oaAirflowUnit: 'L/s',
    chwEnabled: false,
    chwSupply: '7',
    chwReturn: '12',
    contactFactor: '0.9',
    fanEnabled: false,
    staticPressure: '500',
    fanEff: '70',
    motorEff: '90',
    fanGainEnabled: false,
    fanGainDeltaT: '0.5',
    ductGainEnabled: false,
    ductGainDeltaT: '0.3'
  });

  // State for results
  const [resultsA, setResultsA] = useState<any>(null);
  const [resultsB, setResultsB] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [activeCondition, setActiveCondition] = useState<'a' | 'b'>('a');

  // Debouncing for auto-calculation
  const [calculationTimeout, setCalculationTimeout] = useState<number | null>(null);

  // Helper function to count filled psychrometric properties
  const countFilledPsychroProps = (psychroState: any): number => {
    return Object.values(psychroState).filter(v => v !== '' && v !== null && !isNaN(parseFloat(v as string))).length;
  };

  // Helper functions from HTML (unchanged formulas)
  const hasMinimumInputs = (condition: any, isPauMode: boolean): boolean => {
    const countValid = (obj: any) => Object.values(obj).filter(v => v !== '' && v !== null && !isNaN(parseFloat(v as string))).length;

    const oaValid = countValid(condition.oa) >= 2;
    const ocaValid = countValid(condition.oca) >= 2;
    const totalAirflowValid = !isNaN(parseFloat(condition.totalAirflow)) && parseFloat(condition.totalAirflow) > 0;

    if (isPauMode) {
      return oaValid && ocaValid && totalAirflowValid;
    } else {
      const raValid = countValid(condition.ra) >= 2;
      const oaAirflowValid = !isNaN(parseFloat(condition.oaAirflow)) && parseFloat(condition.oaAirflow) >= 0;
      return oaValid && raValid && ocaValid && totalAirflowValid && oaAirflowValid;
    }
  };

  const processSingleCondition = (psychro: Psychrometrics, condition: any, isPauMode: boolean): any => {
    const results: any = { psychro: {}, loads: {}, chw: {}, fan: {}, massFlow: {} };

    // Calculate psychrometric properties (unchanged from HTML)
    results.psychro.oa = psychro.calculateAll(condition.oa);
    results.psychro.oca = psychro.calculateAll(condition.oca);

    if (!results.psychro.oa || !results.psychro.oca) {
      throw new Error("Failed calculating air properties");
    }

    // Convert airflows to m³/s
    const totalAirflow_m3s = condition.totalAirflowUnit === 'L/s' ? 
      parseFloat(condition.totalAirflow) / 1000 : parseFloat(condition.totalAirflow);

    let oaAirflow_m3s: number;
    let raAirflow_m3s: number;
    let massOA: number;
    let massRA: number;
    let massTotal: number;

    if (isPauMode) {
      // PAU mode - 100% outdoor air
      oaAirflow_m3s = totalAirflow_m3s;
      massOA = oaAirflow_m3s / results.psychro.oa.specificVolume;
      results.psychro.ra = null;
      massRA = 0;
      massTotal = massOA;
      results.psychro.ma = results.psychro.oa;
    } else {
      // AHU mode - mixing air
      results.psychro.ra = psychro.calculateAll(condition.ra);
      if (!results.psychro.ra) {
        throw new Error("Failed calculating RA properties");
      }

      oaAirflow_m3s = condition.oaAirflowUnit === 'L/s' ? 
        parseFloat(condition.oaAirflow) / 1000 : parseFloat(condition.oaAirflow);

      if (oaAirflow_m3s > totalAirflow_m3s + 1e-6) {
        throw new Error("OA Airflow > Total Airflow");
      }

      massOA = oaAirflow_m3s / results.psychro.oa.specificVolume;
      raAirflow_m3s = totalAirflow_m3s - oaAirflow_m3s;
      massRA = raAirflow_m3s > 1e-9 ? raAirflow_m3s / results.psychro.ra.specificVolume : 0;
      massTotal = massOA + massRA;

      // Calculate mixed air properties (unchanged from HTML)
      const W_ma = (massOA * results.psychro.oa.humidityRatio + massRA * results.psychro.ra.humidityRatio) / massTotal;
      const h_ma = (massOA * results.psychro.oa.enthalpy + massRA * results.psychro.ra.enthalpy) / massTotal;
      const T_ma = (h_ma - 2501 * W_ma) / (1.006 + 1.86 * W_ma);

      results.psychro.ma = psychro.calculateAll({ dryBulb: T_ma, humidityRatio: W_ma });
    }

    results.massFlow = { total: massTotal, oa: massOA, ra: massRA };

    // Calculate loads (unchanged from HTML)
    const enteringAir = results.psychro.ma;
    const Q_total_air = massTotal * (enteringAir.enthalpy - results.psychro.oca.enthalpy);
    const cp_entering = 1.006 + enteringAir.humidityRatio * 1.86;
    const Q_sensible = massTotal * cp_entering * (enteringAir.dryBulb - results.psychro.oca.dryBulb);
    const Q_latent = Q_total_air - Q_sensible;
    const SHR = Math.abs(Q_total_air) > 1e-6 ? Q_sensible / Q_total_air : (Q_sensible > 1e-6 ? 1 : 0);

    results.loads = { total: Q_total_air, sensible: Q_sensible, latent: Q_latent, shr: SHR };

    // Calculate CHW flow (unchanged from HTML)
    if (condition.chwEnabled && condition.chwSupply && condition.chwReturn && condition.contactFactor) {
      const chwSupply = parseFloat(condition.chwSupply);
      const chwReturn = parseFloat(condition.chwReturn);
      const contactFactor = parseFloat(condition.contactFactor);
      const deltaT_chw = chwReturn - chwSupply;
      const Q_water = Q_total_air / contactFactor;
      results.chw.flow = deltaT_chw > 1e-3 ? Q_water / (4.186 * deltaT_chw) : NaN;
    } else {
      results.chw.flow = NaN;
    }

    // Calculate fan power (unchanged from HTML)
    if (condition.fanEnabled && condition.staticPressure && condition.fanEff && condition.motorEff) {
      const staticPressure = parseFloat(condition.staticPressure);
      const fanEff = parseFloat(condition.fanEff) / 100;
      const motorEff = parseFloat(condition.motorEff) / 100;
      const P_ideal_kW = (totalAirflow_m3s * staticPressure) / 1000;
      const P_actual_kW = P_ideal_kW / (fanEff * motorEff);
      results.fan = { ideal: P_ideal_kW, actual: P_actual_kW };
    } else {
      results.fan = { ideal: NaN, actual: NaN };
    }

    // Calculate fan gain (unchanged from HTML)
    if (condition.fanGainEnabled && condition.fanGainDeltaT) {
      const fanGainDeltaT = parseFloat(condition.fanGainDeltaT);
      const T_ofa = results.psychro.oca.dryBulb + fanGainDeltaT;
      results.psychro.ofa = psychro.calculateAll({ dryBulb: T_ofa, humidityRatio: results.psychro.oca.humidityRatio });
    } else {
      results.psychro.ofa = results.psychro.oca;
    }

    // Calculate duct gain (unchanged from HTML)
    if (condition.ductGainEnabled && condition.ductGainDeltaT) {
      const ductGainDeltaT = parseFloat(condition.ductGainDeltaT);
      const T_sa = results.psychro.ofa.dryBulb + ductGainDeltaT;
      results.psychro.sa = psychro.calculateAll({ dryBulb: T_sa, humidityRatio: results.psychro.ofa.humidityRatio });
    } else {
      results.psychro.sa = results.psychro.ofa;
    }

    return results;
  };

  const calculateAHUSizing = useCallback(() => {
    setErrorMessage('');

    try {
      const psychro = new Psychrometrics(pressure);
      const isPauMode = unitMode === 'pau';

      let newResultsA = null;
      let newResultsB = null;
      let errors = [];

      // Only calculate if minimum inputs are available
      if (hasMinimumInputs(conditionA, isPauMode)) {
        try {
          newResultsA = processSingleCondition(psychro, conditionA, isPauMode);
        } catch (error: any) {
          errors.push(`Condition A: ${error.message}`);
        }
      }

      if (hasMinimumInputs(conditionB, isPauMode)) {
        try {
          newResultsB = processSingleCondition(psychro, conditionB, isPauMode);
        } catch (error: any) {
          errors.push(`Condition B: ${error.message}`);
        }
      }

      // Only show errors if user has entered some data
      if (errors.length > 0 && (newResultsA || newResultsB)) {
        setErrorMessage(errors.join(' | '));
      } else if (errors.length === 0) {
        setErrorMessage('');
      }

      setResultsA(newResultsA);
      setResultsB(newResultsB);
      setCalculationPerformed(newResultsA !== null || newResultsB !== null);
      
      // Save calculation and prepare export data
      if (newResultsA || newResultsB) {
        const inputs = {
          unitMode,
          pressure,
          conditionA,
          conditionB
        };
        
        const calculationResults = {
          resultsA: newResultsA,
          resultsB: newResultsB,
          activeCondition
        };
        
        saveCalculation(inputs, calculationResults);
        prepareExportData(inputs, calculationResults);
      }

    } catch (error: any) {
      // Only show errors if there's actually some meaningful input
      const hasAnyInput = Object.values(conditionA.oa).some(v => v !== '') || 
                         Object.values(conditionB.oa).some(v => v !== '') ||
                         conditionA.totalAirflow !== '' || conditionB.totalAirflow !== '';
      
      if (hasAnyInput) {
        setErrorMessage(error.message);
      }
      setCalculationPerformed(false);
    }
  }, [pressure, unitMode, conditionA, conditionB]);

  // Auto-calculate with debouncing
  useEffect(() => {
    if (calculationTimeout) {
      clearTimeout(calculationTimeout);
    }

    const timeout = setTimeout(() => {
      calculateAHUSizing();
    }, 300); // 300ms debounce

    setCalculationTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [calculateAHUSizing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (calculationTimeout) {
        clearTimeout(calculationTimeout);
      }
    };
  }, []);

  const resetAHUSizing = () => {
    setConditionA({
      oa: { dryBulb: '33', wetBulb: '28', rh: '', humidityRatio: '' },
      ra: { dryBulb: '25', wetBulb: '', rh: '55', humidityRatio: '' },
      oca: { dryBulb: '13', wetBulb: '', rh: '95', humidityRatio: '' },
      totalAirflow: '1000',
      totalAirflowUnit: 'L/s',
      oaAirflow: '200',
      oaAirflowUnit: 'L/s',
      chwEnabled: false,
      chwSupply: '7',
      chwReturn: '12',
      contactFactor: '0.9',
      fanEnabled: false,
      staticPressure: '500',
      fanEff: '70',
      motorEff: '90',
      fanGainEnabled: false,
      fanGainDeltaT: '0.5',
      ductGainEnabled: false,
      ductGainDeltaT: '0.3'
    });
    setConditionB({
      oa: { dryBulb: '', wetBulb: '', rh: '', humidityRatio: '' },
      ra: { dryBulb: '', wetBulb: '', rh: '', humidityRatio: '' },
      oca: { dryBulb: '', wetBulb: '', rh: '', humidityRatio: '' },
      totalAirflow: '',
      totalAirflowUnit: 'L/s',
      oaAirflow: '',
      oaAirflowUnit: 'L/s',
      chwEnabled: false,
      chwSupply: '7',
      chwReturn: '12',
      contactFactor: '0.9',
      fanEnabled: false,
      staticPressure: '500',
      fanEff: '70',
      motorEff: '90',
      fanGainEnabled: false,
      fanGainDeltaT: '0.5',
      ductGainEnabled: false,
      ductGainDeltaT: '0.3'
    });
    setResultsA(null);
    setResultsB(null);
    setErrorMessage('');
    setCalculationPerformed(false);
  };

  const updateCondition = (conditionType: 'a' | 'b', updates: any) => {
    if (conditionType === 'a') {
      setConditionA(prev => ({ ...prev, ...updates }));
    } else {
      setConditionB(prev => ({ ...prev, ...updates }));
    }
  };

  const updateNestedCondition = (conditionType: 'a' | 'b', section: string, updates: any) => {
    if (conditionType === 'a') {
      setConditionA(prev => ({ 
        ...prev, 
        [section]: { ...(prev as any)[section], ...updates }
      }));
    } else {
      setConditionB(prev => ({ 
        ...prev, 
        [section]: { ...(prev as any)[section], ...updates }
      }));
    }
  };

  const getCurrentCondition = () => activeCondition === 'a' ? conditionA : conditionB;

  const formatDifference = (val1: any, val2: any, decimals: number) => {
    if (val1 === null || val2 === null || val1 === undefined || val2 === undefined || isNaN(val1) || isNaN(val2)) return '-';
    const diff = val2 - val1;
    const formatted = diff.toFixed(decimals);
    const absVal = Math.abs(diff);
    if (absVal < 1e-9) return <span className="text-blue-600">{formatted}</span>;
    if (diff > 0) return <span className="text-green-600">+{formatted}</span>;
    return <span className="text-red-600">{formatted}</span>;
  };

  const isPauMode = unitMode === 'pau';

  // Helper function to check if a psychrometric field should be disabled
  const isPsychroFieldDisabled = (section: string, field: string): boolean => {
    const condition = getCurrentCondition();
    const psychroState = (condition as any)[section];
    const filledCount = countFilledPsychroProps(psychroState);
    
    // If this field is already filled, don't disable it
    if (psychroState[field] !== '') return false;
    
    // If 2 or more fields are filled, disable empty ones
    return filledCount >= 2;
  };

  const renderPsychroInputs = (section: string, title: string) => {
    const psychroFields = [
      { key: 'dryBulb', label: 'Dry Bulb (°C)', placeholder: 'e.g., 33' },
      { key: 'wetBulb', label: 'Wet Bulb (°C)', placeholder: 'e.g., 28' },
      { key: 'rh', label: 'Rel. Humidity (%)', placeholder: '0-100', min: 0, max: 100 },
      { key: 'humidityRatio', label: 'Humidity Ratio (kg/kg)', placeholder: 'e.g., 0.020', step: 0.0001 }
    ];

    return (
      <div className="mb-4">
        <h5 className="font-medium text-sm mb-2 text-gray-700">{title} - {activeCondition.toUpperCase()}</h5>
        <div className="grid grid-cols-2 gap-3">
          {psychroFields.map((field) => {
            const isDisabled = isPsychroFieldDisabled(section, field.key);
            const currentValue = (getCurrentCondition() as any)[section][field.key];
            
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => updateNestedCondition(activeCondition, section, { [field.key]: e.target.value })}
                  className={`w-full p-2 border rounded-md shadow-sm text-sm ${
                    isDisabled 
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder={field.placeholder}
                  disabled={isDisabled}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <CalculatorWrapper
      title="AHU/PAU Sizing Calculator"
      discipline="mvac"
      calculatorType="ahuSizing"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-4 text-gray-700">Input Parameters</h3>
          
          {/* Unit Type and Common Settings */}
          <div className="mb-6">
            <h4 className="font-medium text-base mb-3 text-gray-700">Unit Type & Settings</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="ahu"
                    checked={unitMode === 'ahu'}
                    onChange={(e) => setUnitMode(e.target.value as 'ahu')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">AHU Mode (Mixing Air)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pau"
                    checked={unitMode === 'pau'}
                    onChange={(e) => setUnitMode(e.target.value as 'pau')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">PAU Mode (100% Outdoor Air)</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Atmospheric Pressure (kPa)</label>
              <input
                type="number"
                value={pressure}
                onChange={(e) => setPressure(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                step="0.1"
              />
            </div>
          </div>

          {/* Condition Tabs */}
          <div className="mb-6">
            <div className="flex border-b mb-4">
              <button
                className={`py-2 px-4 mr-2 text-sm flex items-center ${
                  activeCondition === 'a'
                    ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveCondition('a')}
              >
                Sizing Condition A
                {hasMinimumInputs(conditionA, isPauMode) && (
                  <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
              <button
                className={`py-2 px-4 text-sm flex items-center ${
                  activeCondition === 'b'
                    ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveCondition('b')}
              >
                Sizing Condition B
                {hasMinimumInputs(conditionB, isPauMode) && (
                  <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            </div>

            {/* Condition Inputs */}
            <div>
              {/* Outdoor Air */}
              {renderPsychroInputs('oa', 'Outdoor Air (OA)')}

              {/* Return Air (only for AHU mode) */}
              {!isPauMode && renderPsychroInputs('ra', 'Return Air (RA)')}

              {/* Airflow Rates */}
              <div className="mb-4">
                <h5 className="font-medium text-sm mb-2 text-gray-700">Airflow Rates - {activeCondition.toUpperCase()}</h5>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Supply Airflow</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={getCurrentCondition().totalAirflow}
                        onChange={(e) => updateCondition(activeCondition, { totalAirflow: e.target.value })}
                        className="flex-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="e.g., 1000"
                      />
                      <select
                        value={getCurrentCondition().totalAirflowUnit}
                        onChange={(e) => updateCondition(activeCondition, { totalAirflowUnit: e.target.value })}
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="L/s">L/s</option>
                        <option value="m3/s">m³/s</option>
                      </select>
                    </div>
                  </div>
                  {!isPauMode && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Outdoor Airflow</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={getCurrentCondition().oaAirflow}
                          onChange={(e) => updateCondition(activeCondition, { oaAirflow: e.target.value })}
                          className="flex-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="e.g., 200"
                        />
                        <select
                          value={getCurrentCondition().oaAirflowUnit}
                          onChange={(e) => updateCondition(activeCondition, { oaAirflowUnit: e.target.value })}
                          className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="L/s">L/s</option>
                          <option value="m3/s">m³/s</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Off-Coil Air */}
              {renderPsychroInputs('oca', 'Off-Coil Air (OCA)')}

              {/* Optional Calculations */}
              <div className="mb-4">
                <h5 className="font-medium text-sm mb-2 text-gray-700">Optional Calculations - {activeCondition.toUpperCase()}</h5>
                
                {/* CHW Calculation */}
                <div className="mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={getCurrentCondition().chwEnabled}
                      onChange={(e) => updateCondition(activeCondition, { chwEnabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable ChW Calculation</span>
                  </label>
                  
                  {getCurrentCondition().chwEnabled && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">CHW Supply (°C)</label>
                        <input
                          type="number"
                          value={getCurrentCondition().chwSupply}
                          onChange={(e) => updateCondition(activeCondition, { chwSupply: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="e.g., 7"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">CHW Return (°C)</label>
                        <input
                          type="number"
                          value={getCurrentCondition().chwReturn}
                          onChange={(e) => updateCondition(activeCondition, { chwReturn: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="e.g., 12"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Contact Factor</label>
                        <input
                          type="number"
                          value={getCurrentCondition().contactFactor}
                          onChange={(e) => updateCondition(activeCondition, { contactFactor: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          step="0.01"
                          min="0.01"
                          max="1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Fan Calculation */}
                <div className="mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={getCurrentCondition().fanEnabled}
                      onChange={(e) => updateCondition(activeCondition, { fanEnabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Fan Calculation</span>
                  </label>
                  
                  {getCurrentCondition().fanEnabled && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Static Pressure (Pa)</label>
                        <input
                          type="number"
                          value={getCurrentCondition().staticPressure}
                          onChange={(e) => updateCondition(activeCondition, { staticPressure: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="e.g., 500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fan Eff. (%)</label>
                        <input
                          type="number"
                          value={getCurrentCondition().fanEff}
                          onChange={(e) => updateCondition(activeCondition, { fanEff: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          min="1"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Motor Eff. (%)</label>
                        <input
                          type="number"
                          value={getCurrentCondition().motorEff}
                          onChange={(e) => updateCondition(activeCondition, { motorEff: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          min="1"
                          max="100"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Heat Gains */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={getCurrentCondition().fanGainEnabled}
                        onChange={(e) => updateCondition(activeCondition, { fanGainEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-700">Fan Gain</span>
                    </label>
                    {getCurrentCondition().fanGainEnabled && (
                      <input
                        type="number"
                        value={getCurrentCondition().fanGainDeltaT}
                        onChange={(e) => updateCondition(activeCondition, { fanGainDeltaT: e.target.value })}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="ΔT °C"
                        step="0.1"
                      />
                    )}
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={getCurrentCondition().ductGainEnabled}
                        onChange={(e) => updateCondition(activeCondition, { ductGainEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-700">Duct Gain</span>
                    </label>
                    {getCurrentCondition().ductGainEnabled && (
                      <input
                        type="number"
                        value={getCurrentCondition().ductGainDeltaT}
                        onChange={(e) => updateCondition(activeCondition, { ductGainDeltaT: e.target.value })}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="ΔT °C"
                        step="0.1"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={resetAHUSizing}
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              Reset All Inputs
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <Icons.InfoInline />
                <p className="text-sm text-yellow-700 ml-1">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-lg text-blue-700">Sizing Results Comparison</h3>
          </div>
          
          {!calculationPerformed ? (
            <div className="bg-white p-6 rounded-md shadow text-center">
              <div className="text-gray-600">
                <h4 className="font-medium text-lg mb-2">Ready for Calculations</h4>
                <p className="mb-2">Start entering parameters in the input fields and results will appear automatically.</p>
                <div className="text-sm text-gray-500">
                  <p><strong>Minimum requirements for each condition:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Outdoor Air: Any 2 psychrometric properties</li>
                    <li>Off-Coil Air: Any 2 psychrometric properties</li>
                    <li>Total Supply Airflow</li>
                    {!isPauMode && <li>Return Air: Any 2 psychrometric properties</li>}
                    {!isPauMode && <li>Outdoor Airflow</li>}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Psychrometric Properties Tables */}
              {(resultsA || resultsB) && (
                <div className="grid grid-cols-1 gap-4">
                  {resultsA && (
                    <div className="bg-white rounded-md shadow overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2">
                        <h4 className="font-medium text-sm text-gray-700">Condition A - Psychrometric Properties</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">Parameter</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">Unit</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">OA</th>
                              {!isPauMode && <th className="px-2 py-1 text-left font-medium text-gray-500">RA</th>}
                              {!isPauMode && <th className="px-2 py-1 text-left font-medium text-gray-500">MA</th>}
                              <th className="px-2 py-1 text-left font-medium text-gray-500">OCA</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">OFA</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">SA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {[
                              { name: 'Dry Bulb Temp', unit: '°C', key: 'dryBulb', decimals: 2 },
                              { name: 'Wet Bulb Temp', unit: '°C', key: 'wetBulb', decimals: 2 },
                              { name: 'Dew Point Temp', unit: '°C', key: 'dewPoint', decimals: 2 },
                              { name: 'Rel. Humidity', unit: '%', key: 'rh', decimals: 1 },
                              { name: 'Humidity Ratio', unit: 'kg/kg', key: 'humidityRatio', decimals: 6 },
                              { name: 'Enthalpy', unit: 'kJ/kg', key: 'enthalpy', decimals: 2 },
                              { name: 'Specific Volume', unit: 'm³/kg', key: 'specificVolume', decimals: 4 },
                              { name: 'Vapor Pressure', unit: 'kPa', key: 'vaporPressure', decimals: 4 }
                            ].map((param) => (
                              <tr key={param.key}>
                                <td className="px-2 py-1 text-gray-900">{param.name}</td>
                                <td className="px-2 py-1 text-gray-500">{param.unit}</td>
                                <td className="px-2 py-1 text-gray-900">{resultsA.psychro.oa?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                                {!isPauMode && <td className="px-2 py-1 text-gray-900">{resultsA.psychro.ra?.[param.key]?.toFixed(param.decimals) || '-'}</td>}
                                {!isPauMode && <td className="px-2 py-1 text-gray-900">{resultsA.psychro.ma?.[param.key]?.toFixed(param.decimals) || '-'}</td>}
                                <td className="px-2 py-1 text-gray-900">{resultsA.psychro.oca?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                                <td className="px-2 py-1 text-gray-900">{resultsA.psychro.ofa?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                                <td className="px-2 py-1 text-gray-900">{resultsA.psychro.sa?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {resultsB && (
                    <div className="bg-white rounded-md shadow overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2">
                        <h4 className="font-medium text-sm text-gray-700">Condition B - Psychrometric Properties</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">Parameter</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">Unit</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">OA</th>
                              {!isPauMode && <th className="px-2 py-1 text-left font-medium text-gray-500">RA</th>}
                              {!isPauMode && <th className="px-2 py-1 text-left font-medium text-gray-500">MA</th>}
                              <th className="px-2 py-1 text-left font-medium text-gray-500">OCA</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">OFA</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-500">SA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {[
                              { name: 'Dry Bulb Temp', unit: '°C', key: 'dryBulb', decimals: 2 },
                              { name: 'Wet Bulb Temp', unit: '°C', key: 'wetBulb', decimals: 2 },
                              { name: 'Dew Point Temp', unit: '°C', key: 'dewPoint', decimals: 2 },
                              { name: 'Rel. Humidity', unit: '%', key: 'rh', decimals: 1 },
                              { name: 'Humidity Ratio', unit: 'kg/kg', key: 'humidityRatio', decimals: 6 },
                              { name: 'Enthalpy', unit: 'kJ/kg', key: 'enthalpy', decimals: 2 },
                              { name: 'Specific Volume', unit: 'm³/kg', key: 'specificVolume', decimals: 4 },
                              { name: 'Vapor Pressure', unit: 'kPa', key: 'vaporPressure', decimals: 4 }
                            ].map((param) => (
                              <tr key={param.key}>
                                <td className="px-2 py-1 text-gray-900">{param.name}</td>
                                <td className="px-2 py-1 text-gray-500">{param.unit}</td>
                                <td className="px-2 py-1 text-gray-900">{resultsB.psychro.oa?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                                {!isPauMode && <td className="px-2 py-1 text-gray-900">{resultsB.psychro.ra?.[param.key]?.toFixed(param.decimals) || '-'}</td>}
                                {!isPauMode && <td className="px-2 py-1 text-gray-900">{resultsB.psychro.ma?.[param.key]?.toFixed(param.decimals) || '-'}</td>}
                                <td className="px-2 py-1 text-gray-900">{resultsB.psychro.oca?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                                <td className="px-2 py-1 text-gray-900">{resultsB.psychro.ofa?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                                <td className="px-2 py-1 text-gray-900">{resultsB.psychro.sa?.[param.key]?.toFixed(param.decimals) || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Loads and Requirements Comparison */}
              {(resultsA || resultsB) && (
                <div className="bg-white rounded-md shadow overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2">
                    <h4 className="font-medium text-sm text-gray-700">Calculated Loads and Requirements</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium text-gray-500">Parameter</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-500">Unit</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-500">Condition A</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-500">Condition B</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-500">Difference (B-A)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Total Mass Flow</td>
                          <td className="px-2 py-1 text-gray-500">kg/s</td>
                          <td className="px-2 py-1 text-gray-900">{resultsA?.massFlow.total?.toFixed(3) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{resultsB?.massFlow.total?.toFixed(3) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB ? 
                              formatDifference(resultsA.massFlow.total, resultsB.massFlow.total, 3) : 
                              '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Total Cooling Load (Air Side)</td>
                          <td className="px-2 py-1 text-gray-500">kW</td>
                          <td className="px-2 py-1 text-gray-900">{resultsA?.loads.total?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{resultsB?.loads.total?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB ? 
                              formatDifference(resultsA.loads.total, resultsB.loads.total, 2) : 
                              '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Sensible Cooling Load</td>
                          <td className="px-2 py-1 text-gray-500">kW</td>
                          <td className="px-2 py-1 text-gray-900">{resultsA?.loads.sensible?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{resultsB?.loads.sensible?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB ? 
                              formatDifference(resultsA.loads.sensible, resultsB.loads.sensible, 2) : 
                              '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Latent Cooling Load</td>
                          <td className="px-2 py-1 text-gray-500">kW</td>
                          <td className="px-2 py-1 text-gray-900">{resultsA?.loads.latent?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{resultsB?.loads.latent?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB ? 
                              formatDifference(resultsA.loads.latent, resultsB.loads.latent, 2) : 
                              '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Sensible Heat Ratio (SHR)</td>
                          <td className="px-2 py-1 text-gray-500">-</td>
                          <td className="px-2 py-1 text-gray-900">{resultsA?.loads.shr?.toFixed(3) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{resultsB?.loads.shr?.toFixed(3) || '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB ? 
                              formatDifference(resultsA.loads.shr, resultsB.loads.shr, 3) : 
                              '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Chilled Water Flow Rate</td>
                          <td className="px-2 py-1 text-gray-500">L/s</td>
                          <td className="px-2 py-1 text-gray-900">{!isNaN(resultsA?.chw.flow) ? resultsA?.chw.flow?.toFixed(2) : '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{!isNaN(resultsB?.chw.flow) ? resultsB?.chw.flow?.toFixed(2) : '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB && !isNaN(resultsA.chw.flow) && !isNaN(resultsB.chw.flow) ? 
                              formatDifference(resultsA.chw.flow, resultsB.chw.flow, 2) : 
                              '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Ideal Fan Power (Air Power)</td>
                          <td className="px-2 py-1 text-gray-500">kW</td>
                          <td className="px-2 py-1 text-gray-900">{!isNaN(resultsA?.fan.ideal) ? resultsA?.fan.ideal?.toFixed(3) : '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{!isNaN(resultsB?.fan.ideal) ? resultsB?.fan.ideal?.toFixed(3) : '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB && !isNaN(resultsA.fan.ideal) && !isNaN(resultsB.fan.ideal) ? 
                              formatDifference(resultsA.fan.ideal, resultsB.fan.ideal, 3) : 
                              '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-gray-900">Actual Fan Power (Input)</td>
                          <td className="px-2 py-1 text-gray-500">kW</td>
                          <td className="px-2 py-1 text-gray-900">{!isNaN(resultsA?.fan.actual) ? resultsA?.fan.actual?.toFixed(3) : '-'}</td>
                          <td className="px-2 py-1 text-gray-900">{!isNaN(resultsB?.fan.actual) ? resultsB?.fan.actual?.toFixed(3) : '-'}</td>
                          <td className="px-2 py-1 text-gray-900">
                            {resultsA && resultsB && !isNaN(resultsA.fan.actual) && !isNaN(resultsB.fan.actual) ? 
                              formatDifference(resultsA.fan.actual, resultsB.fan.actual, 3) : 
                              '-'
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Interactive AHU/PAU Sizing Guidelines</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>For each air state (OA, RA, OCA), enter any two known psychrometric properties to calculate all others.</li>
          <li>Fields automatically disable when two properties are entered to prevent conflicts.</li>
          <li>AHU Mode: Simulates mixing of outdoor air (OA) with return air (RA) before the cooling coil.</li>
          <li>PAU Mode: Simulates 100% outdoor air operation (RA inputs disabled).</li>
          <li>Green dots on condition tabs indicate when sufficient data is available for calculations.</li>
          <li>All psychrometric calculations follow ASHRAE standards for accuracy.</li>
          <li>Chilled water flow calculations use contact coil factor to account for coil efficiency.</li>
          <li>Fan power calculations include both ideal air power and actual motor input power.</li>
          <li>Heat gains (fan gain, duct gain) can be added to simulate temperature rise after the cooling coil.</li>
          <li>Results show complete air treatment process with detailed psychrometric properties at each point.</li>
          <li>Comparison table highlights differences between sizing conditions A and B for optimization.</li>
          <li>Sensible Heat Ratio (SHR) indicates the proportion of sensible vs. latent cooling required.</li>
        </ul>
      </div>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default AHUSizingCalculator;