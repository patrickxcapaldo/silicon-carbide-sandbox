# Pre-registration, 21 September 2026

This file was written before I ran scenarios S6, S9 and S10 through the module, and before I wrote the three predictions at the bottom. Nothing in it has been adjusted since. The real version of this belongs in a dated commit in the public repo (`data/ledger.yaml`), because a file in a chat session can't prove when it was written.

Scenarios I had already run before writing this (S1 to S5, S7, S8) are not pre-registered, and the scenario library says so on each card.

## S6: do the five built-in presets say what they claim?

The tool ships with five presets, and each one has a paragraph of explanation with percentages in it. My hypothesis is that if you load each preset and read the telemetry, the tool shows the percentages that its own text quotes, to within 2 percentage points.

Expected values, taken from the preset text:

- **Comfortable baseline:** thermal budget used about 18%, power budget used about 26%, sunlit about 64%.
- **Oversized payload in GEO:** thermal about 167%, power about 113%.
- **Power-limited:** thermal about 16%, power about 612%.
- **Heat-limited:** power about 28%, net radiator rejection about 35 W.
- **Instantaneous-power trap:** sunlit about 61%, load about 70% of instantaneous supply, about 115% of orbit-averaged supply.

I expect all five to pass (about 80% confidence), since the text says it was re-run after the eclipse change. If one fails, the mismatch is a documentation finding, because the code is frozen.

## S9: does going from low orbit to geostationary help the radiator or the array?

Hypothesis: moving the same 100 kW node from 550 km to geostationary altitude shrinks the array far more than it shrinks the radiator, because the Earth stops filling the radiator's view (a small gain) but the eclipse goes away (a large gain) in this tool's fixed-Sun geometry.

Settings: 100 kW compute, 4 kW parasitic, radiator at 70 °C, sun incidence 0.3, sink 180 K, absorptivity 0.12. Low orbit uses the tool's default orbit and Earth view factor 0.35. Geostationary uses 35,786 km, near-zero eccentricity and inclination, and Earth view factor 0.02.

Expected: radiator area falls by about 10% (I'd accept 6% to 14%). Array area falls by about 36% (I'd accept 33% to 39%).

## S10: a 60 kg class satellite carrying one H100

Hypothesis: for a satellite like Starcloud-1 (about 325 km, one H100), running the GPU continuously needs roughly 1.6 m² of radiating surface and 3.3 m² of array at 700 W in the worst-case orbit, and about half of each at 350 W.

Settings: circular 325 km orbit, radiator at 60 °C, Earth view factor 0.35, sun incidence 0.3, absorptivity 0.12, emissivity 0.9, parasitic 40 W. Two orbit cases: the worst case (beta angle 0, inclination 90 and RAAN 338.7 for this tool's Sun) and dawn-dusk (inclination 61.9 and RAAN 248.7). Loads: 350 W (the PCIe rating) and 700 W (the SXM rating).

Expected results:

- Sunlit fraction at 325 km, worst case: 0.60 (accept 0.59 to 0.61). Dawn-dusk: 1.00.
- Radiating area needed: 0.8 m² at 350 W (0.6 to 1.0) and 1.6 m² at 700 W (1.2 to 2.0).
- Array area needed, worst case: 1.7 m² at 350 W (1.5 to 2.0) and 3.3 m² at 700 W (3.0 to 3.7).
- Array area needed, dawn-dusk: 1.05 m² at 350 W (0.95 to 1.2) and 2.0 m² at 700 W (1.8 to 2.2).

## Predictions about things the world hasn't told us yet

These use the tool's numbers as anchors and will be resolved by public information, not by the tool.

**P1. SpaceX AI1's 110 m² of radiator is a two-sided panel area, or otherwise means at least 200 m² of radiating surface, and not a single radiating face.** Confidence 75%. Reason: a single face would need a mean radiator temperature of about 123 to 143 °C at the reported 120 to 150 kW, which is hard to square with the chips it is cooling. Resolves when SpaceX, a regulatory technical attachment, or an independent measurement of the hardware states the radiating area or the radiator temperature. Deadline 31 December 2027. I'd call it wrong if 110 m² is stated as the total radiating surface, or if the stated mean radiator temperature is above 393 K.

**P2. Starcloud-1's solar array is smaller than the 3.3 m² the tool says a continuous 700 W load needs at 325 km.** Confidence 70%. So either its H100 is a lower-power variant, or it does not run continuously. Resolves when the array area, or the average power, is published by Starcloud or its bus supplier. Deadline 30 June 2027.

**P3. The total deployed array plus radiator area of Orbital's 100 kW-class satellite, in its technical attachment, is between 300 and 700 m².** Confidence 70%. The tool's anchor is 373 to 530 m² (a two-sided radiator of about 95.75 m² of panel plus 277 to 434 m² of array, depending on orbit). Resolves when the technical attachment or an equivalent document is public. Deadline 31 December 2026.
