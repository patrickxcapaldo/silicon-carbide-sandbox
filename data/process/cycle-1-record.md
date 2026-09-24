# Cycle 1 record: ledger entry, registry seed, number trace

Supporting data for Study 01 and the two Sparks. This is data, not narrative, and it belongs in the public Sandbox repo under `data/` (dossier §9). Nothing here touches the module code. Every `TODO` is a blocking item for the registry's own CI check (source, archive link and date on every entry).

## 1. Ledger entry (claim card, Appendix B2)

```yaml
- id: CLM-0001
  claim: "A 100 MW orbital data centre needs radiators the size of four football fields."
  source: "early Silicon Carbide draft (own claim, illustrative)"
  archive_url: TODO
  pre_registered: RETROSPECTIVE   # expectation recorded [LEDGER_COMMIT]; numbers were already known. Not a scored prediction.
  expectation: "Can't tell: radiator temperature not stated."
  law_limit: "108,861 m2 at 300 K and 58,761 m2 at 350 K (emissivity 1, two-sided, 3 K sink, no environment) -- matches dossier §5.3-A and lawLimitRadiatorAreaM2()"
  demonstrated: "ISS EATCS: 70 kW rated over about 422 m2 of panel = 165.9 W/m2 (design rating, return temperature 233-255 K). 100 MW at that loading = about 603,000 m2 (112 fields). No flown radiator at 300 K or above at this scale found."
  claimed: "about 21,400 m2 (4 x 5,352 m2) = 4,671 W/m2 of panel"
  verdict: cant-tell
  holds_only_if: "radiator about 463 K (190 C) at emissivity 0.9, both faces radiating, 3 K sink, no environment (450.5 K at emissivity 1). At 300-350 K it needs about 11-23 fields."
  key_parameter: radiator temperature
  module: orbital-thermal-limits@1.0.0
  tool_check: "environment off reproduces the envelope to 0.2%; default environment needs 17.9 fields at 350 K (12.2 by hand); the tool's top setting, 453 K, delivers 1,906 W per radiating m2 against 2,336 needed"
  correction: "Founding example corrected from 'four football fields' (see Study 01)."
```

## 2. Registry seed (append-only)

Only entries the Study and Sparks cite. Load-bearing entries carry `second_source: TODO`.

```yaml
- id: const.stefan_boltzmann
  value: 5.670374419e-8
  unit: "W m^-2 K^-4"
  source: "CODATA recommended value (NIST)"
  archive_url: TODO
  retrieved: TODO

- id: const.earth_radius_mean
  value: 6371
  unit: "km"
  source: TODO   # cite a NASA or IAU value; the module uses 6,371 km
  archive_url: TODO
  retrieved: TODO

- id: const.earth_effective_ir_temperature
  value: 255
  unit: "K"
  source: TODO   # NASA Earth fact sheet or equivalent; the module default
  archive_url: TODO
  retrieved: TODO

- id: const.solar_constant
  value: 1361
  unit: "W m^-2"
  source: TODO   # cite a measurement-based value; the module default
  archive_url: TODO
  retrieved: TODO

- id: unit.us_football_field_area
  value: 5352
  unit: "m^2"
  source: TODO   # league rulebook: 360 ft x 160 ft including end zones = 5,351 m2
  archive_url: TODO
  retrieved: TODO

- id: space.iss_eatcs_heat_rejection_rating
  value: 70
  unit: "kW"
  note: "Design capability, two loops of 35 kW. Not a measured rejection."
  source: "NASA, ISS Active Thermal Control System (ATCS) overview, nasa.gov/pdf/473486main_iss_atcs_overview.pdf"
  archive_url: TODO
  retrieved: TODO
  second_source: TODO   # load-bearing for the demonstrated number

- id: space.iss_radiator_panel_size
  value: "3.33 x 2.64"
  unit: "m"
  note: "Eight identical panels per radiator assembly; six assemblies."
  source: "Journal of Spacecraft and Rockets, doi 10.2514/1.A35030 (introduction); count of six from NASA ICES-2026-281, ntrs.nasa.gov/citations/20260002946"
  archive_url: TODO
  retrieved: TODO
  second_source: TODO   # load-bearing; the journal page was only seen as an excerpt

- id: space.iss_ammonia_return_temperature
  value: { min: 233, max: 255 }
  unit: "K"
  note: "-40 to 0 F at the radiator return jumpers. Return line, so the mean radiator temperature is probably higher."
  source: "NASA ICES 2022, EATCS coolant leak paper (ntrs.nasa.gov, ICES_2022_145)"
  archive_url: TODO
  retrieved: TODO   # RE-VERIFY: read from an excerpt only

- id: space.iss_rated_radiator_loading
  value: 165.9
  unit: "W m^-2 of panel"
  note: "Derived: 70 kW / (6 x 8 x 3.33 m x 2.64 m = 422.0 m2). Rated, not measured."
  source: "derived from the three entries above"
```

## 3. Number trace (for the red-team step)

Every number in Study 01 and the Sparks, with the route to rerun it.

| Number | Route |
|---|---|
| 5,352 m² per football field | 360 ft × 160 ft × 0.09290304 m²/ft² = 5,351.2 m², rounded per the dossier |
| 21,400 m² claimed; 4,671 W/m² panel; 2,336 W/m² per face | 4 × 5,352 = 21,408; 100 MW / 21,408; halve for two faces |
| 462.5 K and 450.5 K | solve `2,336 = ε σ (T⁴ − 81)` for ε = 0.9 and 1 |
| 459, 851 W/m² per face (ε = 1) | σ (T⁴ − 3⁴) at 300 K and 350 K |
| 413, 766, 1,306, 2,093 W/m² per face (ε = 0.9) | 0.9 σ (T⁴ − 3⁴) at 300, 350, 400, 450 K |
| 108,861 / 58,761 m²; 20.3 / 11.0 fields | 100 MW / (2q) / 5,352 |
| 121,000 / 65,300 / 38,300 / 23,900 m²; 22.6 / 12.2 / 7.2 / 4.5 fields | same at ε = 0.9 |
| 422.0 m², 165.9 W/m², 603,000 m², 112.6 fields | 6 × 8 × 3.33 × 2.64; 70,000 / 422.0; 100 MW / 165.9 / 5,352 |
| 28× | 4,671 / 165.9 |
| 300 to 434 W/m²; 38 to 55% | 2 × 0.9 σ (T⁴ − 81) at 233.15 K and 255.37 K; 165.9 divided by each |
| Tool 414 W/m² at 27 °C | module `orbital-thermal-limits`: sink 3 K, view factor 0, sun incidence 0, parasitic 0, ε = 0.9; "Radiator Heat Flux" |
| Tool 521 W/m² at 350 K; 17.9 fields | defaults, parasitic 0, flow 1.5 kg/s, ΔT 80 K; (Gross Radiative Rejection − External Thermal Load) / area at 77 °C; then 100 MW / that / 2 / 5,352 |
| Tool 169 W/m² (55 fields) at 300 K; 1,850 W/m² (5.1 fields) at 450 K | same, at 27 °C and 177 °C |
| 1,906 / 2,042 / about 2,150 / about 2,370 W/m² at 453 K | tool at 180 °C with defaults; sun incidence 0; then sink 3 K, view factor 0, sun incidence 0 at ε = 0.9 and 0.99 |
| Sky fraction 0.331 (400 km), 0.0057 (35,786 km) | (1 − cos ρ) / 2, sin ρ = 6,371 / (6,371 + h) |
| Plate view factor 0.885, 0.0228 | (6,371 / (6,371 + h))² |
| 654 → 511 W/m² (−22%); 3 K sink −27%; default 0.35 −9% | module: 70 °C, ε = 0.9, sink 180 K (or 3 K), sun incidence 0, parasitic 0; view factor 0, 0.88, 0.35 |
| About 64% sunlit at 550 km, 51.6° | module default orbit, "Orbit Sunlit Fraction" |

## 4. Inputs and version box (copy into each article that uses the module)

- Module: `orbital-thermal-limits`, version `1.0.0`
- Registry entries: as listed in section 2, dated `[REGISTRY_DATE]`
- Ledger entry: `CLM-0001` (retrospective)
- Tool settings for every quoted tool number: see the number trace

## 5. Pending forecasts (ledger entries)

> **Note, 2026-09-23.** `CLM-0002` was committed to `data/ledger/claims.yaml` as the SpaceX Starmind AI1 disclosed-loading entry, which is the same subject as the forecast below. The two were merged: the forecast survives inside that entry as `related_forecast: P1`, and the text of this section is left as it was written. `CLM-0003` and `CLM-0004` keep their numbers.

Pre-registered on 21 September 2026 (see `preregistration-2026-09-21.md`). The tool number each one leans on is in the scenario library. Replace the date with the commit that actually records them.

```yaml
- id: CLM-0002
  claim: "SpaceX AI1's reported 110 m2 of radiator is a two-sided panel area, or otherwise means at least 200 m2 of radiating surface."
  type: forecast
  confidence: 0.75
  tool_anchor: "S8: a single radiating face needs a mean radiator temperature of about 123 C (120 kW) to 143 C (150 kW); a two-sided reading needs about 70 to 86 C"
  resolves_with: "SpaceX documentation, a regulatory technical attachment, or an independent measurement of the hardware"
  deadline: 2027-12-31
  wrong_if: "110 m2 is stated as the total radiating surface, or the stated mean radiator temperature is above 393 K"
  status: pending

- id: CLM-0003
  claim: "Starcloud-1's solar array is smaller than the 3.3 m2 the tool says a continuous 700 W load needs at 325 km."
  type: forecast
  confidence: 0.70
  tool_anchor: "S10: 3.29 m2 in the worst-case orbit at 700 W, 1.97 m2 in dawn-dusk"
  resolves_with: "array area or average power published by Starcloud or its bus supplier"
  deadline: 2027-06-30
  wrong_if: "published array area is 3.3 m2 or more while the flown H100 is a 700 W part running continuously"
  status: pending

- id: CLM-0004
  claim: "Orbital's 100 kW-class satellite has a total deployed array plus radiator area between 300 and 700 m2 in its technical attachment."
  type: forecast
  confidence: 0.70
  tool_anchor: "S11: 373 to 529 m2 (about 96 m2 of two-sided radiator plus 277 to 434 m2 of array)"
  resolves_with: "the technical attachment or an equivalent public document"
  deadline: 2026-12-31
  wrong_if: "the stated total is below 300 m2 or above 700 m2"
  status: pending
```

## 6. Scenario results at a glance

| Scenario | Pre-registered | Outcome |
|---|---|---|
| S1 radiation law, environment off | no (closed form) | matches to 0.2% |
| S2 worst-case eclipse at 550 km | yes, earlier session | 62.8% sunlit, 35.55 min: inside tolerance |
| S3 dawn-dusk | no (geometry) | 100% sunlit |
| S4 ISS back-calculation | no, post hoc | 11 C one-sided, -9 C two-sided: inside the band I chose afterwards |
| S5 independent 1 MW radiator sizing | yes, tolerance a factor of 1.5 | first framing missed by a hair (1.503); like-for-like at 1.25 MW it is 0.83 to 0.96 |
| S6 five presets match their text | yes | all five inside 2 points |
| S7 four football fields | retrospective | see Study 01 |
| S8 AI1 radiator | no, exploratory | 70 to 86 C or 123 to 143 C depending on one face or two; became CLM-0002 |
| S9 LEO to GEO | yes | radiator -9.7%, array -36.0%, both inside range |
| S10 60 kg class H100 satellite | yes | every number inside its range; checks the tool against my hand arithmetic only |
| S11 100 kW node size | no | 373 to 529 m² total; became CLM-0004 |
