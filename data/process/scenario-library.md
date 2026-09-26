# Scenario library for `orbital-thermal-limits`

I use the tool in three ways, and I've sorted the scenarios that way. Some of them check that the tool agrees with things I can work out independently, some ask what it says about hardware that exists today, and some are forecasts that will be settled by information that isn't public yet. Every card says whether I wrote my expectation down before running it, because a hit only means something if I could have missed.

The module page has sliders with fixed ranges (radiator area stops at 20 m² and radiator temperature runs from 20 to 180 °C, for example), so where a scenario is bigger than that I say how to scale it by hand. Nothing here needs the tool to change. The pre-registration for the new scenarios is in `preregistration-2026-09-21.md`.

## Does the tool agree with things I can check independently?

### S1. The radiation law, with the environment switched off
**Pre-registered:** no, it is closed-form arithmetic and I knew the answer.

I wanted to see whether the tool gives εσ(T⁴ − T_sink⁴) when nothing else is acting on the radiator. In the tool that means a sink of 3 K, Earth view factor 0, sun incidence 0, parasitic heat 0 and emissivity 0.9, with the radiator temperature stepped through 27, 77, 127 and 177 °C. "Radiator Heat Flux" reads 414, 767, 1,308 and 2,095 W/m², against 413, 766, 1,306 and 2,093 by hand at exactly 300, 350, 400 and 450 K. The 0.2% difference is the 0.15 K between 300 K and 27 °C, so the tool is doing what the law says.

### S2. The worst-case eclipse at 550 km
**Pre-registered:** yes, in an earlier session, with tolerances of 0.628 ± 0.003 sunlit and 35.6 ± 0.5 minutes.

A published estimate says a 550 km orbit spends at most about 35.6 minutes in shadow, which is a sunlit fraction of 0.628 (Turyshev, a single-author preprint, so an independent estimate but not gospel). Set altitude 550 km, eccentricity 0, inclination 90° and RAAN 339°, which puts the orbit plane edge-on to this tool's fixed Sun. "Orbit Sunlit Fraction" reads 62.8%, and the eclipse comes to 35.55 minutes. Both are inside the tolerance I'd set.

### S3. Dawn-dusk, where the eclipse disappears
**Pre-registered:** no, it is geometry and I knew the answer.

Set altitude 600 km, eccentricity 0, inclination 62° and RAAN 249°, which points the orbit's normal at the Sun, and "Orbit Sunlit Fraction" reads 100%. This is the kind of orbit Starcloud's filing describes with its 06:00 crossing time. One thing worth knowing is that the tool's thermal side always assumes full sunlight, whatever the orbit, so removing the eclipse only relaxes the power side and leaves the radiator exactly where it was.

### S5. Does the tool land near an independent published radiator sizing?
**Pre-registered:** yes, but my first framing was slightly wrong, and I'm leaving the record as it happened.

The same preprint sizes a radiator for 1 MW of compute at 350 K with an emissivity of 0.9 and a deep-space view of 0.85, and gets 2,500 m². Before running anything I said the tool should land within a factor of 1.5 of that. It needs 1,663 m² for 1 MW, which is a ratio of 0.665 (a factor of 1.503, so a miss by a hair).

I then looked at the preprint's own equation for radiator area, which gives a net flux of 501 W/m² at those inputs. Multiply by 2,500 m² and you get 1.25 MW, so the paper's 2,500 m² is sized for about 1.25 MW of heat and not 1 MW (my inference, since I have only seen the equation and not a statement of the overhead). Like for like, the tool needs 2,079 m² for 1.25 MW at low sun incidence and 2,403 m² at its default sun incidence, which is 0.83 to 0.96 of the preprint's figure. The two models make different assumptions about the environment, so this shows the tool isn't wildly off and doesn't show more than that.

### S6. Do the five built-in presets say what their own text says?
**Pre-registered:** yes. I expected all five to match their quoted percentages within 2 percentage points.

All five matched. The comfortable baseline shows 17.8% thermal, 25.9% power and 64.0% sunlit (text: 18, 26, 64). The oversized geostationary payload shows 167.1% and 112.9% (text: 167, 113). The power-limited preset shows 16.0% thermal and 612.4% power (text: 16 and 612). The heat-limited preset shows 27.5% power and a net radiator rejection of 35.1 W (text: 28 and about 35 W). The instantaneous-power trap shows 61.0% sunlit, a load of 70.0% of the instantaneous supply, and 114.7% of the orbit-averaged supply (text: 61, 70, 115). So the descriptions on the page can be trusted, and you can use those presets as worked examples.

## What does it say about hardware that exists today?

### S4. The ISS radiators
**Pre-registered:** no. I had the number before I wrote down an expectation, so this one is post hoc and I set a wide band afterwards.

The ISS external cooling system is rated at 70 kW over about 422 m² of panel. I asked what mean radiator temperature the tool needs to reject that, in its default environment with a low sun incidence of 0.3. If only one face radiates the answer is about 11 °C, and if both faces radiate (844 m² of radiating surface) it is about −9 °C, and both sit inside the band I chose of −40 to +25 °C, which comes from NASA's ammonia return temperatures. The tool's slider stops at 20 °C, so the page can't show this directly, and I ran the same physics outside the page. What you can see on the page is that at the slider's floor of 20 °C the tool already gives 262 to 533 W per square metre of two-sided panel, more than the ISS's 166, which fits the picture of a radiator that runs colder than the tool lets you go.

### S7. The four football fields claim
**Pre-registered:** retrospective. I knew the arithmetic when I wrote the ledger entry.

This one is Study 01, where the tool with its environment off reproduces the hand calculation, needs about 47% more area at its default environment (17.9 fields against 12.2 at 350 K), and delivers only 1,906 W per radiating square metre at its 180 °C ceiling against the 2,336 the claim needs.

### S8. SpaceX's AI1 radiator
**Pre-registered:** no, and this matters. I ran it before I wrote any expectation, so it is exploratory and can't become a scored verdict in the ledger.

The reported figures are 110 m² of radiator for 120 kW average and 150 kW peak of compute. In the tool's physics that needs a mean radiator temperature of about 123 °C (120 kW) or 143 °C (150 kW) if the 110 m² radiates from one face, and about 70 °C or 86 °C if it is a two-sided panel with 220 m² of radiating surface. Nothing I've read says which one it is, so I've turned the question into a forecast (P1 below), which is something I can register properly.

### S11. The size of a 100 kW node
**Pre-registered:** no, I'd already computed the numbers, so the forecast built on them (P3) is the honest part.

For 100 kW of compute plus 4 kW of parasitic heat, with the radiator at 70 °C and a sun incidence of 0.3, the tool needs 191.5 m² of radiating surface, which is about 96 m² of two-sided panel. The array needs 277 m² in a dawn-dusk orbit and 434 m² in the default 550 km orbit, so the total deployed area comes to about 373 to 530 m². A filing that describes arrays and radiators spanning about 100 m would then have a mean width of roughly 4 to 5 m, which is plausible.

## Forecasts for the tool to help settle later

### S9. Does moving from low orbit to geostationary help the radiator or the array?
**Pre-registered:** yes, expected about −10% for the radiator (accepting −6 to −14) and about −36% for the array (accepting −33 to −39).

Same 100 kW node, radiator at 70 °C, sun incidence 0.3, moving from the default 550 km orbit with a view factor of 0.35 to 35,786 km with a view factor of 0.02. The radiator shrinks from 191.5 to 172.9 m² (−9.7%), and the array shrinks from 433.7 to 277.4 m² (−36.0%). Both landed where I expected, and I think the interesting part is the ratio: an orbit change is mostly a power lever and a much weaker thermal one. The caveat is that this tool has a fixed Sun, and real geostationary satellites see eclipse seasons around the equinoxes, so the real array saving is smaller than shown.

### S10. A 60 kg class satellite carrying one H100
**Pre-registered:** yes, with a range for every number.

This is a Starcloud-1 style case at 325 km, with the radiator at 60 °C, an Earth view factor of 0.35, a sun incidence of 0.3 and parasitic heat of 40 W. I ran it at 350 W (the PCIe rating) and 700 W (the SXM rating), in the worst-case orbit (inclination 90°, RAAN 339°) and in a dawn-dusk orbit (inclination 62°, RAAN 249°).

- **Sunlit fraction:** 0.600 in the worst case and 1.000 in dawn-dusk, as expected.
- **Radiating area needed:** 0.84 m² at 350 W and 1.59 m² at 700 W (expected 0.8 and 1.6).
- **Array needed, worst case:** 1.73 m² at 350 W and 3.29 m² at 700 W (expected 1.7 and 3.3).
- **Array needed, dawn-dusk:** 1.04 m² at 350 W and 1.97 m² at 700 W (expected 1.05 and 2.0).

Every number was inside its range, and I should be straight about what that shows: I made those predictions with the same formulas the tool uses, so this is a check that the tool matches my hand arithmetic, and it doesn't test the physics against the world. The world test is P2 below. One sensitivity worth knowing is that if the radiator faces the Earth (view factor 0.9 at this altitude) instead of 0.35, the radiating area rises to 1.06 m² at 350 W and 2.02 m² at 700 W.

## Predictions

These are in the ledger as pending, and I'll score them when the information arrives.

**P1** is that SpaceX's AI1 radiator of 110 m² is a two-sided panel area, or otherwise means at least 200 m² of radiating surface, and I'm 75% confident of it. I'd call it wrong if 110 m² turns out to be the total radiating surface or if the stated mean radiator temperature is above 393 K, and the deadline is 31 December 2027.

**P2** is that Starcloud-1's solar array is smaller than the 3.3 m² the tool says a continuous 700 W load needs at 325 km, which would mean its H100 is a lower-power variant or doesn't run continuously. I'm 70% confident of that, and the deadline is 30 June 2027.

**P3** is that the total deployed array and radiator area of Orbital's 100 kW class satellite lands between 300 and 700 m² in its technical attachment, which brackets the tool's 373 to 530 m². I'm 70% confident, and the deadline is 31 December 2026.

## Fleet architecture scenarios (added 23 September 2026; extended 24 September 2026)

These five are the built-in presets behind section 4 of Study 01 and Spark 03. None was pre-registered: the outcomes they show were specified in advance in the brief for that work, but I chose the remaining slider values to reproduce those outcomes, so the match is by construction and isn't a test of the tool. What does protect them is that each is pinned by a golden vector (`gv-08` to `gv-12`) generated from the kernel compiled outside the app, and the test suite fails if a preset drifts from its vector. Settings not listed are the module's usual LEO values (550 km, e = 0.01, 51.6°, RAAN 25°, ε = 0.9, absorptivity 0.12, Earth IR 255 K, albedo 0.3, solar flux 1,000 W/m², solar array efficiency 0.29, pointing 0.97).

### S12. A radiator that the loop can't feed (preset: Transport-limited monolithic node, `gv-08`)
**Pre-registered:** no.

Radiator 15 m² at 80 °C, sink 200 K, Earth view factor 0.2, sun incidence 0.5, coolant 0.05 kg/s with a 5 K rise, parasitic 30 W, compute 2,000 W, array 30 m². "Net Radiator Capacity" is 9,295 W, and the loop's transport capacity is 0.05 × 1,050 × 5 = 262.5 W, so the heat ceiling is 263 W and thermal utilisation is 762%. About 9,030 W of radiating capacity (97%) is unused. Power utilisation is 38%, so this is a plumbing limit and not an electrical one. The kernel's own warning, "Coolant transport capacity is the limiting factor", fires. This is a single-node illustration of why radiator area alone doesn't scale a monolith, and it says nothing about what a real 100 MW design would do.

### S13. The fixed tax on a tiny node (preset: Tiny node overhead, `gv-09`)
**Pre-registered:** no.

Radiator 1 m² at 65 °C, sink 180 K, Earth view factor 0.3, sun incidence 0.3, coolant 0.1 kg/s with an 8 K rise, parasitic 30 W, compute 100 W, array 1.5 m². Gross radiator flux is 565 W/m² and the heat budget before parasitics (gross rejection minus absorbed solar and albedo) is 525.8 W, so the 30 W is **5.7%** of it. Thermal utilisation is 20% and power utilisation 48%, so the status is Safe. Measured against the compute heat rather than the budget, the same 30 W is 30%.

### S14. The same tax on a scaled node (preset: Scaled node overhead, `gv-10`)
**Pre-registered:** no.

The S13 settings with the radiator at 8 m², coolant 0.5 kg/s with a 10 K rise, compute 1,000 W and array 10 m². Gross radiator flux is again 565 W/m² (the identical figure is the fleet-invariance point), the heat budget before parasitics is 4,206 W, and the same 30 W is **0.7%** of it, or 3% of the compute heat. Thermal utilisation is 24% and power utilisation 57%, so the status is Safe. The 5.7% and 0.7% depend on how I define the budget. Against compute heat alone the ratio between the two nodes is 10 to 1 instead of about 8 to 1, because the budget scales with radiator area (8 to 1) and not with compute (10 to 1).

### S15. Starmind AI1 at its real size (preset: Starmind Fleet Node, `gv-11`)
**Pre-registered:** no.

Added once the module's input bounds were raised to hold SpaceX's disclosed Starmind AI1 node directly, rather than the scaled-down proxy S13-style presets this section used before that. Radiator 160 m² at 122 °C, sink 180 K, Earth view factor 0.2, sun incidence 0.2, coolant 15 kg/s with a 15 K rise, parasitic 2,500 W, compute 175,000 W, array 1,050 m². Gross radiator flux is 1,158 W/m², net thermal capacity is 178,745 W, so 175,000 W of compute is **97.9%** thermal utilisation, with about 3,745 W of headroom. Power utilisation is 93.96% (about 11,411 W of headroom on an orbit-averaged 188,911 W of generation). Status is Limit, not Overheating, on both counts, matching a disclosed design that states only an average and a peak with no stated margin. About 28,600 of these nodes (5 GW / 175 kW) sum to the same aggregate as S16.

### S16. The monolithic counterpart at the same aggregate scale (preset: Monolith (5 GW Concept), `gv-12`)
**Pre-registered:** no.

Radiator 1e7 m² at 75 °C, sink 180 K, Earth view factor 0.15, sun incidence 0.2, coolant 320,000 kg/s with a 20 K rise (an aggregate figure standing in for many parallel loops, not one physical pipe), parasitic 2,000,000 W, compute 5,000,000,000 W, array 3e7 m². Gross radiator flux is 671.85 W/m², net thermal capacity is about 6.4657 GW, so 5 GW of compute is **77.3%** thermal utilisation, with about 1.4657 GW of headroom. Transport capacity at this flow (6.72 GW) exceeds net radiative capacity, so radiation, not the loop, is the binding limit here -- the opposite of S12 at small scale. Power utilisation is 92.67% (about 5.4 GW generated against a 5.002 GW bus load). Status is Limit on both counts. The 320,000 kg/s figure is not derived from a stated design; it was chosen to sit comfortably above the bare Q = ṁc_pΔT minimum for 5 GW at 20 K (about 238,000 kg/s), the same margin logic as any other preset here, and the model has no way to check whether an aggregate flow that large is buildable as an actual set of parallel loops, let alone what it would mass.

## What these scenarios say about the next module

None of this changes Module 1, and I'm not going to touch it. What it does is make the brief for the next module easier to write. The radiator and array areas that come out of the tool are exactly what a mass and launch module would need as inputs, and the quantity that keeps deciding the answer is radiator temperature. The AI1 comparison also suggests a mass module should be honest about what boundary it counts, since the claims I've seen (10 to 14 kg per kilowatt) and the independent estimate (34 to 59) probably count different things. Those go in the Module 2 brief, in the dossier's own words, and nowhere near Module 1.
