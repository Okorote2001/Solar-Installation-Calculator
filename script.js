/**
 * SOLAR SUSTENANCE DESIGN ENGINE
 * Author: Okoh Emmanuella Itohan (ENG/COE/21002676)
 * Description: Core mathematical logic for dual-path solar array sizing.
 */

function calculateSustenance() {
    try {
        // --- 1. DATA ACQUISITION ---
        
        // Load Profile
        const p_cont = parseFloat(document.getElementById('p_cont').value) || 0;
        const p_int = parseFloat(document.getElementById('p_int').value) || 0;
        const usage_hrs = parseFloat(document.getElementById('usage_hrs').value) || 0;

        // System Params
        const v_sys = parseFloat(document.getElementById('v_sys').value);
        const dod = parseFloat(document.getElementById('batt_type').value); // Depth of Discharge
        
        // Solar Input
        const loss_multiplier = parseFloat(document.getElementById('panel_type').value);
        const p_watt = parseFloat(document.getElementById('panel_watt').value);
        const p_vmp = parseFloat(document.getElementById('panel_OPV').value);
        const psh = parseFloat(document.getElementById('psh').value) || 4.5;

        // Charge Controller Constraints
        const chargeSelect = document.getElementById('Charge_Range');
        const v_min_ctrl = parseFloat(chargeSelect.value); // Startup Voltage
        const v_max_ctrl = parseFloat(chargeSelect.options[chargeSelect.selectedIndex].getAttribute('data-max')); // Max Limit

        // --- 2. SUSTENANCE MATHEMATICS ---

        // A. Instantaneous Load Current (Assuming 90% Inverter Efficiency)
        // This is the current needed to run the appliances directly from the sun.
        const i_load = (p_cont + p_int) / (v_sys * 0.9);

        // B. Battery Refill Current (Assuming 95% Charge Efficiency)
        // Energy consumed over 24 hours that needs to be refilled during Peak Sun Hours.
        const daily_energy_wh = (p_cont * 24) + (p_int * usage_hrs);
        const energy_to_refill_wh = daily_energy_wh * dod; 
        const i_charge = energy_to_refill_wh / (psh * v_sys * 0.95);

        // C. Total System Current Demand
        const total_amps = i_load + i_charge;

        // --- 3. ARRAY SIZING ---

        // Total raw wattage required, factoring in panel tech losses
        const target_wattage = total_amps * v_sys * loss_multiplier;
        
        // Base number of panels needed
        let raw_num_panels = Math.ceil(target_wattage / p_watt);

        // --- 4. STRING CONFIGURATION (Series & Parallel Limits) ---

        // Determine safety boundaries for series connections based on Vmp
        // 1.2x multiplier ensures startup even in heat (Vmp drops).
        let min_series = Math.ceil((v_min_ctrl * 1.2) / p_vmp); 
        
        // 0.85x multiplier protects controller from Harmattan cold morning spikes (Voc rises).
        let max_series = Math.floor((v_max_ctrl * 0.85) / p_vmp);

        // Optimize Series Count: Aim for highest safe voltage to minimize wire losses
        let n_series = Math.min(max_series, raw_num_panels);
        
        // Enforce Minimum Startup Voltage
        if (n_series < min_series) {
            n_series = min_series;
        }
        
        // Ensure at least 1 panel
        n_series = Math.max(1, n_series);

        // Calculate parallel strings needed
        let n_parallel = Math.ceil(raw_num_panels / n_series);

        // SYMMETRY CORRECTION: 
        // Professional arrays must be symmetrical (e.g., you can't have one string of 4 and one string of 3).
        // We recalculate the total panels based on the required grid (Series x Parallel).
        let actual_num_panels = n_series * n_parallel;
        let final_array_wattage = actual_num_panels * p_watt;
        let est_operating_voltage = n_series * p_vmp;

        // --- 5. CHARGE CONTROLLER SIZING ---
        // National Electrical Code (NEC) dictates a 1.25x safety factor for continuous solar current.
        const cc_rating = Math.ceil(total_amps * 1.25);

        // --- 6. UPDATE UI ---
        document.getElementById('res_array').innerText = `${(final_array_wattage / 1000).toFixed(2)} kWp (${actual_num_panels} Panels)`;
        document.getElementById('res_conn').innerText = `${n_series} Series x ${n_parallel} Parallel`;
        document.getElementById('res_volt').innerText = `${est_operating_voltage.toFixed(1)} Vdc`;
        
        // Add a warning if it's a Hybrid Inverter requiring high voltage but the design is small
        if (v_min_ctrl >= 90 && est_operating_voltage < v_min_ctrl) {
            document.getElementById('res_cc').innerHTML = `<span style="color: red;">Array voltage too low for Inverter startup!</span>`;
        } else {
            document.getElementById('res_cc').innerText = `${cc_rating} Amps (Min Rating)`;
        }

    } catch (error) {
        console.error("Design Engine Error:", error);
        alert("An error occurred during calculation. Please check console.");
    }
}