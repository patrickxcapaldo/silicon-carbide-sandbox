# Orbital Thermal Limits — reworked drop-in

This version addresses the visual and physics issues in the previous iteration.

## What changed

- Removed the misleading blue Earth-to-space circle/beam.
- Replaced static/misaligned ArrowHelpers with dynamically constructed vectors whose shafts and heads share the same start/end points.
- Added a proper Earth-centred orbital path.
- Added orbital altitude, eccentricity, inclination, RAAN, argument of perigee and phase controls.
- Satellite position now moves with those orbital parameters.
- Earth uses an orbital-context scale. The spacecraft is intentionally enlarged so it remains visible; a truly physical Earth-to-spacecraft size ratio would make a metre-scale satellite effectively invisible.
- Brightened the scene substantially with ambient + hemisphere + directional illumination and a readable Earth/space palette.
- Radiator temperature, emissivity, solar absorptivity, space sink, Earth IR, Earth view factor, albedo, coolant flow, coolant ΔT and parasitic heat all now feed the thermal calculation and have visible consequences in the telemetry/visuals.
- Coolant particles now move around a closed hot-side-to-radiator-to-return loop; flow rate changes their transport animation and the calculated heat-transport ceiling.
- Radiator area changes the rendered panel dimensions as well as the thermal capacity.
- Thermal capacity now distinguishes gross long-wave radiation from external solar/albedo loads and coolant transport capacity.
- Added warnings for overheating, low coolant transport capacity, and high Earth view factor.

## Thermal model

The core calculation is a first-order engineering model:

`P_compute,max = min(P_rad - P_solar - P_albedo - P_parasitic, mdot * cp * ΔT)`

with radiator exchange approximated by:

`P_rad = εσA[(1-F_E)(T_r^4-T_space^4) + F_E(T_r^4-T_EarthIR^4)]`

This is deliberately not a spacecraft-qualified thermal network. It omits detailed conduction paths, eclipse transients, radiator temperature gradients, multi-node spacecraft thermal capacitance, exact Earth view factors from geometry, and wavelength-dependent optical properties.
