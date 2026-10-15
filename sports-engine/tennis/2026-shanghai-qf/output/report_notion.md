<callout icon="🧭" color="gray_bg">
	**Matches:** Rolex Shanghai Masters QFs, outdoor hard, Stadium Court (retractable roof), Thu 15 Oct 2026. **QF-A** Arthur Gea vs Alejandro Davidovich Fokina (25), not before 2:30 PM Shanghai / 2:30 AM ET. **QF-B** Alexander Zverev (1) vs Alex de Minaur (9), evening session, not before 6:00 PM Shanghai / 6:00 AM ET.
	**Step 0 (checked 8:03 PM ET Oct 14):** both pregame; order of play as above (ESPN listing); no withdrawals found; no roof/rain change reported.
	**Labels:** \[DATA\] computed by me · \[FILM\] Higgsfield scene analysis with timestamp · \[SOURCE\] named outlet · \[INFERENCE\] reasoning. Built blind; odds opened only in Step 7 (blind numbers locked to file at 8:58 PM ET).
	**Workbook:** Shanghai_2026_QF_model.xlsx (editable model tabs, 1,648 live formulas, 0 errors, recalculated in LibreOffice and matched to the Python engine to 5 decimals) + raw tables. Code and outputs pushed to GitHub JonahHak/ReadME, branch claude/ecstatic-allen-30jc6x, folder sports-engine/tennis/2026-shanghai-qf.
</callout>
# 1. Data, method and what the backtest changed
<table header-row="true" fit-page-width="true">
	<tr>
		<td>Dataset</td>
		<td>Date range</td>
		<td>Use</td>
	</tr>
	<tr>
		<td>TML database (exact serve counts, tour level)</td>
		<td>2023-01-02 to 2026-01-17</td>
		<td>ratings network, backtest</td>
	</tr>
	<tr>
		<td>Tennis Abstract 2026 tournament tables via Exa (17 hard events, AO to Beijing; serve points estimated from score)</td>
		<td>2026-01-19 to 2026-09-30 (event starts)</td>
		<td>ratings network, backtest, Gea 2026</td>
	</tr>
	<tr>
		<td>Shanghai 2026 match stats (tennis.com / ATP Infosys, DeepCourt)</td>
		<td>2026-10-07 to 2026-10-13</td>
		<td>this-week form, workload</td>
	</tr>
	<tr>
		<td>Match Charting Project points</td>
		<td>last charted 2026-05-21 (window 2024-05-21 on)</td>
		<td>tactics only (prior, not form)</td>
	</tr>
	<tr>
		<td>Tennis Abstract Elo</td>
		<td>updated 2026-10-05</td>
		<td>Step 7 only</td>
	</tr>
</table>
- **Ratings:** weighted ridge on serve points, SPW = mu + a(server) − b(returner), weights = serve points × 0.5^(age/365 d), 730-day window, lambda = 150, two-pass rank prior. Fitted as of 2026-10-07 (Shanghai excluded). \[DATA\]
- **Walk-forward backtest:** 1,667 hard-court tour-level Bo3 matches, 2025-01-06 to 2026-09-30, ratings refit before every event. Accuracy 62.5%, Brier 0.2244, log loss 0.6385 vs 0.6931 coin flip (2026 holdout 0.6419). \[DATA\]
- **Winner layer:** iid + logit shrink **k = 0.58** (fit on 2025) beats day-form for the winner (0.6385 vs 0.6389 all, 0.6419 vs 0.6426 on 2026). Not stacked with day-form. Your k = 0.71/0.74 scores 0.6404/0.6414 here. \[DATA\]
- **Derivatives layer:** day-form **sd = 0.06** calibrates sets/TB/games on this backtest (P3 0.362 vs 0.368 actual; TB 0.417 vs 0.407; games 23.77 vs 23.83). sd = 0.085 under-predicts all three (P3 0.316, games 23.04), so **no −1.5 games correction** here (it would double-count). \[DATA\]
- **Tiebreak uplift (Lesson 10) re-verified:** gap +3.2 ± 3.8 pts when sum ≥ 1.36 (n=158), +7.9 ± 5.6 when both ≥ 0.68 (n=67). Pooled with your sample → +4 / +8 pts. Neither QF qualifies (sums 1.256 and 1.332), so no uplift applied. \[DATA\]
- **Form weight:** backtest best ×0.10 (log loss 0.6389); your ×0.50 scores 0.6623 (clearly worse). Model uses 0.10; ×0.50 shown as sensitivity. **H2H blend:** neutral (+0.0002); kept per spec (n/(n+1000)). \[DATA\]
- **Retro-checks (same method):** IW 2024 R16 model de Minaur 55% → Zverev won (miss; data window starts 2023-01). ADF–Hurkacz Oct 13: ADF 49.6%, P3 40%, TB 55% → ADF in 3 with a TB. Zverev–Bublik Oct 13: Zverev 68.6% → won in 3 with 2 TBs. Laver Cup 2026 shown for reference only (format differs). \[DATA\]
# 2. QF-A — Arthur Gea vs Alejandro Davidovich Fokina
## Bottom line
Structurally a coin flip that the market prices as an ADF edge. The ratings (Gea SPW 61.8% vs ADF, ADF 61.3% vs Gea) give Gea 52.5% before form; Gea's serve has run +7.0 pts above opponent-adjusted expectation this week (304 serve points), ADF's +0.4. **The lever is Gea's serve:** if it stays near 66% the match is Gea's; if it reverts to his pre-Shanghai 62% level, ADF's return (v2nd 58% vs Hurkacz) decides it. Blind 54.9% Gea, market 47.0%, final **50.9% Gea**. Bet the cushion, not the winner.
## Secrets (ranked by impact)
1. \[DATA\] Gea serve residual this week +7.0 pts: 78.4% vs Faria, 69.4% vs Humbert, 66.3% vs Shelton, 72.0% vs Mensik; held 13/13 vs Faria and 11/11 vs Mensik. At form ×0.5 (your spec) Gea would be 64.5%; the backtest says ×0.1, which gives 54.9%.
2. \[DATA\] Market and Elo lag Gea: hard Elo (2026-10-05) gives Gea 39.9%; it does not include his 4 Shanghai wins (Shelton No.7, Mensik No.14) or the Beijing run.
3. \[DATA\] Gea is the thinnest sample on the board: 14 tour-level hard matches in my network, 0 charted points, no Challenger data in this cloud build → posterior SPW sd widened to 1.9 pts; 80% band 45.5–64.2.
4. \[DATA\] ADF's serve swung 13.6 pts between rounds: 71.4% vs Tiafoe (+6.8 vs expectation), 60.7% vs Hurkacz (−6.8). Week net +0.4.
5. \[DATA\] ADF late-match: return points won in set 3 23.7% vs 33.1% in sets 1–2 (Tiafoe + Hurkacz, n 76 vs 118, 1.4 SE). Serve held (68.8% vs 64.2%). Modeled as +1.0 pt to Gea SPW in set 3 only (~90% regression).
6. \[FILM\] ADF–Tiafoe (x2hTyMZ_k8k) 1:02–1:21: in the final rally ADF runs Tiafoe side to side, charges and wins on a drop volley after 2h47 — no visible fatigue. Conflicts with the set-3 return dip, so the dip stays tiny.
7. \[DATA\] Gea's return: v1st 34% vs Faria, 32% vs Humbert, 36% vs Shelton, 30% vs Mensik; week return residual +1.7 pts.
8. \[DATA\] Gea double faults: 6.2% at Los Cabos (26 in 5 matches; surface speed 0.53, slowest hard event of 2026), 4.6% in Beijing, 3.4% in Shanghai (5/146 where counted). Pressure clustering not computable (no point-by-point) — see gaps.
9. \[DATA\] Tiebreaks this week: Gea 3-1, ADF 3-0. Regress heavily; model gives each ~21% to win at least one TB, P(≥1 TB) 38%.
10. \[DATA\] Workload: Gea 455 min / 4 matches / 10 sets / 4 TBs (+380 min in Beijing the week before); ADF 363 min / 3 matches / 8 sets / 3 TBs, finishing late Tuesday (124 min vs Hurkacz). Both ~48 h rest.
11. \[DATA\] ADF charted (7 matches, thin): BP serve won 57.1% (n=49), set-2 SPW 54.5%, +1 forehand 58%.
12. \[SOURCE\] ADF returned from a July back injury at Chengdu and won it (d. Hurkacz 6-4 7-6(7)) \[ATP/Tennis Majors\].
## Game plans
- **Gea must:** keep first-serve % ≥ 61% (Shanghai 61–65%) and win ≥ 72% behind it; take the ball early on ADF second serves (ADF 2nd won 53% vs Hurkacz). **Avoid:** double-fault runs (Los Cabos 6.2%) and 9+ rally exchanges on ADF's terms.
- **ADF must:** land ≥ 70% first serves (72% vs Hurkacz) and drag Gea into backhand exchanges; start fast (lost set 1 1-6 to Hurkacz). **Avoid:** passive returning; Gea's first serve won 74–79% this week.
## Battlegrounds
<table header-row="true" fit-page-width="true">
	<tr>
		<td>Battleground</td>
		<td>Gea</td>
		<td>ADF</td>
		<td>Edge</td>
	</tr>
	<tr>
		<td>Model SPW vs this opponent (fit, incl. pace/form)</td>
		<td>63.5% (+1.0 in set 3)</td>
		<td>62.1%</td>
		<td>Gea +1.4</td>
	</tr>
	<tr>
		<td>Serve residual this week</td>
		<td>+7.0 pts</td>
		<td>+0.4 pts</td>
		<td>Gea</td>
	</tr>
	<tr>
		<td>Return residual this week</td>
		<td>+1.7 pts</td>
		<td>−0.2 pts</td>
		<td>Gea</td>
	</tr>
	<tr>
		<td>Return rating b (network)</td>
		<td>0.047</td>
		<td>0.026</td>
		<td>Gea</td>
	</tr>
	<tr>
		<td>Hard Elo (pre-Shanghai)</td>
		<td>1784.6</td>
		<td>1856.0</td>
		<td>ADF</td>
	</tr>
	<tr>
		<td>Expected aces</td>
		<td>6.3</td>
		<td>3.8</td>
		<td>Gea</td>
	</tr>
	<tr>
		<td>Minutes this week</td>
		<td>455</td>
		<td>363</td>
		<td>ADF fresher</td>
	</tr>
</table>
## Probabilities (Python-verified)
<table header-row="true" fit-page-width="true">
	<tr>
		<td>Output</td>
		<td>Value</td>
	</tr>
	<tr>
		<td>P(Gea) blind / final</td>
		<td>54.9% (80% band 45.5–64.2) / 50.9%</td>
	</tr>
	<tr>
		<td>Set scores (re-centred sim, 60k)</td>
		<td>Gea 2-0 30.7% · ADF 2-0 30.9% · Gea 2-1 20.4% · ADF 2-1 18.0%</td>
	</tr>
	<tr>
		<td>Modal exact score</td>
		<td>6-4 6-4 Gea (2.33%) — essentially tied with 4-6 4-6 (2.31%)</td>
	</tr>
	<tr>
		<td>P(3 sets) / P(≥1 TB)</td>
		<td>38.4% / 38.2% (no uplift; sum 1.256)</td>
	</tr>
	<tr>
		<td>Total games</td>
		<td>mean 23.7, median 22; P(over 21.5) 55.5%, P(over 22.5) 47.8%, P(over 23.5) 42.3%</td>
	</tr>
	<tr>
		<td>Set 1 winner</td>
		<td>Gea 50.5%</td>
	</tr>
	<tr>
		<td>Game margin</td>
		<td>Gea +1.5 games 56.0%; ADF +1.5 games 54.3%</td>
	</tr>
</table>
**Waterfall:** ratings iid 52.5% → +pace 52.5% → +form ×0.1 56.7% → +ADF set-3 fatigue 58.4% → shrink 54.9%. \[DATA\]
## Scenario map
- **Goes three sets (38%):** after set 1 to Gea, Gea 81.7%; after set 1 to ADF, Gea 20.0%. Totals barely move (P over 22.5 ~48%).
- **Decided in tiebreaks (38% at least one):** pure coin flips on this model; TB records this week (3-1, 3-0) are noise.
- **Roof:** day session; roof only closes for rain; no model change.
- **One player compromised:** Gea serve slump (−2 pts) → final 48.0%; ADF serve slump (−2 pts) → 53.9%.
## What would change the number
Gea's thin sample is the biggest uncertainty (a ±1.9-pt SPW sd). A full Challenger history (my local build had it; this cloud build doesn't) would tighten it. Confidence: **Low**.
## Live tripwires (first four service games each)
1. Gea ≥ 3 double faults → Gea SPW −2 pts → final **48.0%**.
2. ADF first-serve in < 55% or Gea winning ≥ 35% of return points vs ADF first serve → ADF SPW −2 pts → final **53.9%**.
3. ADF holds 4/4 losing ≤ 4 serve points in total → ADF SPW +3 pts → final **46.6%**.
## Pre-mortem — #1 pick Gea +1.5 sets loses only on ADF 2-0 (30.9%)
1. ADF 2-0 with one break per set, no tiebreak: 21.7%.
2. ADF 2-0 with Gea losing a tiebreak: 9.2%.
3. (overlapping) ADF rout by ≥ 6 games: 14.0%.
# 3. QF-B — Alexander Zverev vs Alex de Minaur
## Bottom line
The ratings alone say Zverev 66.6%, almost exactly the market. My blind number (51.5%) comes from three add-ons: Zverev's ankle mixture (−8.0 pts), the H2H return lever (−3.2) and de Minaur's serving week (−2.6). **The lever is de Minaur's return vs Zverev's first serve:** vs elite returners Zverev wins 89% of matches when he holds ≥ 68% of serve points and 27% below it, and the model's fit-state number is 67.7%. The ankle is public information, so the final is a 50/50 log-odds blend: **Zverev 58.0%** (blind 51.5%, market 64.2%). Value sits on de Minaur at +175 and his set cushion.
## Secrets (ranked by impact)
1. \[DATA\] Elite-returner threshold: Zverev vs the top-12 return ratings (n=24 matches, 2024-10 to 2026-10): SPW ≥ 68% → 8-1; SPW < 68% → 4-11. SPW averages 71.1% in wins, 61.8% in losses. Model fit-state SPW vs de Minaur: 67.7%.
2. \[DATA\] De Minaur removes Zverev's free points: unreturned 35.0% vs the field (MCP, 2,548 serve pts, 2024-08 to 2026-03) → 22.2% in charted H2H (221 pts); won in ≤ 3 shots 42.3% → 25.3%; second serve won 55.5% → 38.7%. De Minaur puts 82.5% of first serves back in play (Zverev himself: 73.8%).
3. \[DATA\] De Minaur is the No.4 return rating in my network (b = 0.054, behind Alcaraz, Sinner, Medvedev).
4. \[SOURCE\] Ankle timeline: left ankle after a dive vs Wu (Oct 9) \[AFP via Tennis Temple\]; right ankle late in set 3 vs Halys, limping, doctor courtside but not called \[Tennis Temple, Puntodebreak, Eurosport.de, Sport1/SID\]; right ankle from mid set 2 vs Bublik, held it repeatedly \[ATP Tour\]. Never called the physio; no MTO \[AM850\]. No Oct 14 practice or strapping report found.
5. \[DATA\] The flare sets didn't show in his numbers: vs Bublik per-set SPW 78.0 / 62.1 / 83.9, RPW 26.8 / 40.0 / 34.4 (DeepCourt, reconciled to official totals); vs Halys 0 break points faced, 74.5% SPW. Week serve residual +2.2 pts. The limitation evidence is visual, not statistical.
6. \[FILM\] Higgsfield found no visible limp in Zverev–Bublik (Uib5iOPruI0, 10:00) or Zverev–Halys (sfDct5re0YU, 2:29); German commentary at 0:51–0:56 asks about "legs, ankles". The scene model is coarse, so this neither confirms nor clears.
7. \[DATA\] Long rallies belong to de Minaur: 9+ shot points — de Minaur 57.7% on return, 53.7% on serve; Zverev 48.4% on serve, 52.3% on return (MCP).
8. \[DATA\] De Minaur served 79.7% vs Sakamoto and 75.0% vs Khachanov (+8.6 pts vs expectation on 120 serve points; ×0.1 weight). But his charted set-3 SPW drops to 59.6% (n=564) from 63.9 / 65.7 in sets 1–2.
9. \[DATA\] Zverev's serve is predictable at 30-30/deuce: entropy 1.10, deuce court 54% wide / 44% T. De Minaur's entropy 1.49.
10. \[DATA\] Tiebreak serve: Zverev 73.7% (n=114) vs de Minaur 59.1% (n=66) — regress hard; model: Zverev 29.0% / de Minaur 25.4% to win at least one TB.
11. \[DATA\] H2H 8-4 Zverev: all four de Minaur wins are team events (Laver ×2, United Cup, ATP Cup); Zverev is 8-0 in individual tour matches incl. Shanghai 2018 6-1 6-4. Time-weighted hard H2H SPW: Zverev 62.5% (n_eff 217), de Minaur 63.6% (n_eff 209); 2026 Laver match-tiebreak points removed.
12. \[DATA\] Workload: Zverev 388 min, 8 sets, 4 TBs; de Minaur 179 min, 4 sets, 1 TB (walkover in R64).
13. \[SOURCE\] Motivation: Zverev clinched year-end No.1 on Oct 12 \[ATP\]; de Minaur is in the Turin race (\[FILM\] RPmOiRHHgX8 2:46–3:01, commentator: "moves him ahead of Djokovic in the race for Turin"). No groin limitation visible in that clip.
14. \[DATA\] Aces resolved: Zverev hit **15** vs Bublik (tennis.com, DeepCourt and Tennis Abstract agree; the ATP report's 14 is the outlier). Expected aces Thursday: Zverev 8.5, de Minaur 5.1.
## Game plans
- **Zverev must:** keep first-serve in ≥ 70% (78% vs Bublik) and win ≥ 76% behind it to clear 68% SPW; shorten points (83.5% won when the rally is 1–4 shots); vary deuce-court direction. **Avoid:** 9+ shot backhand exchanges and second-serve points (38.7% won in charted H2H).
- **De Minaur must:** return deep and in play (82.5% v1st in-play), drag points past 8 shots, and attack second serves (52% v2nd vs Khachanov). **Avoid:** a set-3 serve dip (59.6% historically) and short-ball exchanges where Zverev's forehand +1 wins 60.6%.
## Battlegrounds
<table header-row="true" fit-page-width="true">
	<tr>
		<td>Battleground</td>
		<td>Zverev</td>
		<td>de Minaur</td>
		<td>Edge</td>
	</tr>
	<tr>
		<td>Ratings SPW vs this opponent</td>
		<td>67.1%</td>
		<td>63.6%</td>
		<td>Zverev +3.5</td>
	</tr>
	<tr>
		<td>Fit-state SPW (pace, form, H2H)</td>
		<td>67.7%</td>
		<td>65.5%</td>
		<td>Zverev +2.2</td>
	</tr>
	<tr>
		<td>Unreturned serves (field / H2H)</td>
		<td>35.0% / 22.2%</td>
		<td>24.5%</td>
		<td>de Minaur neutralises</td>
	</tr>
	<tr>
		<td>9+ rallies won (serve / return)</td>
		<td>48.4% / 52.3%</td>
		<td>53.7% / 57.7%</td>
		<td>de Minaur</td>
	</tr>
	<tr>
		<td>1–4 shot points won on serve</td>
		<td>83.5%</td>
		<td>78.6%</td>
		<td>Zverev</td>
	</tr>
	<tr>
		<td>Set-3 SPW (charted)</td>
		<td>69.3%</td>
		<td>59.6%</td>
		<td>Zverev</td>
	</tr>
	<tr>
		<td>Hard Elo</td>
		<td>2044.6</td>
		<td>1943.5</td>
		<td>Zverev (64.1%)</td>
	</tr>
	<tr>
		<td>Minutes this week</td>
		<td>388</td>
		<td>179</td>
		<td>de Minaur fresher</td>
	</tr>
</table>
## Probabilities (Python-verified)
<table header-row="true" fit-page-width="true">
	<tr>
		<td>Output</td>
		<td>Value</td>
	</tr>
	<tr>
		<td>P(Zverev) blind / final</td>
		<td>51.5% (80% band 45.8–56.9) / 58.0%</td>
	</tr>
	<tr>
		<td>Ankle mixture</td>
		<td>P(limited) 0.50 ± 0.12; P(win) fit 56.2% / limited 46.8% (blind, shrunk)</td>
	</tr>
	<tr>
		<td>Set scores (re-centred sim, 60k)</td>
		<td>Zverev 2-0 38.3% · de Minaur 2-0 22.9% · Zverev 2-1 19.6% · de Minaur 2-1 19.2%</td>
	</tr>
	<tr>
		<td>Modal exact score</td>
		<td>6-4 6-4 Zverev (3.1%)</td>
	</tr>
	<tr>
		<td>P(3 sets) / P(≥1 TB)</td>
		<td>38.8% / 48.2% (no uplift; sum 1.332)</td>
	</tr>
	<tr>
		<td>Total games</td>
		<td>mean 24.6, median 23; P(over 21.5) 61.6%, P(over 22.5) 52.7%, P(over 23.5) 45.4%</td>
	</tr>
	<tr>
		<td>Set 1 winner</td>
		<td>Zverev 59.3%</td>
	</tr>
	<tr>
		<td>Game margin</td>
		<td>Zverev −1.5 games 52.5%; de Minaur +3.5 games 63.6%</td>
	</tr>
</table>
**Waterfall:** ratings iid 66.6% → +pace 66.4% → +form ×0.1 63.8% → +H2H 60.6% → +ankle mixture 52.6% → shrink 51.5%. \[DATA\]
## Scenario map
- **Ankle flares (limited state):** blind 46.8% → final 55.7%. **Ankle fine:** blind 56.2% → final 60.2%.
- **Goes three sets (39%):** set 1 to Zverev → Zverev 82.1%; set 1 to de Minaur → Zverev 22.5%, P3 43.6%, over 22.5 at 58%.
- **Decided in tiebreaks (48%):** Zverev's TB serve edge (73.7% vs 59.1%, regressed) gives him the slightly better TB odds.
- **Roof closed (rain):** indoor conditions favour the server slightly; no explicit model change (roof status unconfirmed).
- **De Minaur compromised (groin):** de Minaur SPW −3 pts → final 62.0%. No film or stats evidence of this so far.
## What would change the number
A practice report showing Zverev moving freely or strapped (P(limited) to 0.2 or 0.9: final 61.9% / 56.1%). Confidence: **Medium-Low** on the winner, **Medium** on the de Minaur cushion.
## Live tripwires (first four service games each)
1. Zverev visibly limping, strapped or takes an MTO → P(limited) 0.9 → final **56.1%** (blind 47.8%).
2. Zverev first-serve in ≥ 70% and ≥ 80% won, moving freely → P(limited) 0.2, Zverev SPW +2 → final **61.9%**.
3. De Minaur wins ≥ 40% of return points in Zverev's first four service games (lever on) → Zverev SPW −3 → final **53.8%** (blind 43.2%).
## Pre-mortem — #1 value pick de Minaur ML loses 57.9%; high-hit de Minaur +1.5 sets loses 38.3%
1. Zverev 2-0 with one break a set, no tiebreak: 24.0% (kills both picks).
2. Zverev 2-0 through tiebreak(s): 14.3% (kills both).
3. Zverev wins in three: 19.6% (ML loses, +1.5 sets wins).
# 4. Markets (Step 7 — opened only after blind numbers were locked)
<table header-row="true" fit-page-width="true">
	<tr>
		<td>Match</td>
		<td>Source</td>
		<td>Number</td>
		<td>No-vig P(player A)</td>
		<td>Status</td>
	</tr>
	<tr>
		<td>QF-A</td>
		<td>DraftKings ML (via Dimers)</td>
		<td>Gea +100 / ADF -116</td>
		<td>48.2%</td>
		<td>search-reported, Oct 14</td>
	</tr>
	<tr>
		<td>QF-A</td>
		<td>Pinnacle (via predictobets)</td>
		<td>Gea 2.07 / ADF 1.82</td>
		<td>46.8%</td>
		<td>search-reported</td>
	</tr>
	<tr>
		<td>QF-A</td>
		<td>Early prices (Tennis Tonic)</td>
		<td>Gea 2.06 / ADF 1.75</td>
		<td>45.9%</td>
		<td>search-reported</td>
	</tr>
	<tr>
		<td>QF-A</td>
		<td>TA hard Elo (2026-10-05)</td>
		<td>1784.6 vs 1856.0</td>
		<td>39.9%</td>
		<td>opened (Exa); pre-Shanghai</td>
	</tr>
	<tr>
		<td>QF-B</td>
		<td>DraftKings ML (via Dimers)</td>
		<td>Zverev -200 / ADM +175</td>
		<td>64.7%</td>
		<td>search-reported, Oct 14</td>
	</tr>
	<tr>
		<td>QF-B</td>
		<td>Kalshi via Robinhood</td>
		<td>65c / 36c</td>
		<td>64.4%</td>
		<td>opened (Exa), ~00:30 UTC Oct 15</td>
	</tr>
	<tr>
		<td>QF-B</td>
		<td>Best odds (OddsSafari)</td>
		<td>1.55 / 2.75</td>
		<td>64.0%</td>
		<td>opened (Exa)</td>
	</tr>
	<tr>
		<td>QF-B</td>
		<td>bet365</td>
		<td>-200 / +162; Zverev -2.5 games -120</td>
		<td>63.6%</td>
		<td>search-reported</td>
	</tr>
	<tr>
		<td>QF-B</td>
		<td>TA hard Elo (2026-10-05)</td>
		<td>2044.6 vs 1943.5</td>
		<td>64.1%</td>
		<td>opened (Exa)</td>
	</tr>
</table>
- **Consensus (books + Kalshi, Elo excluded):** Gea 47.0%, Zverev 64.2%. Gaps: QF-A +7.9 pts (under the 8-pt bar), QF-B −12.7 pts → investigated (waterfall above): the market prices little or none of the ankle. That is public information, so no claim of an informational edge → 50/50 log-odds blend for both.
- **Market inversion (ML + total, day-form model):** QF-A implies SPW 65.1% / 66.0% (sum 1.31 vs my 1.256) → the market expects a more serve-dominant match (TB 46%, 24.5 games); QF-B implies 70.7% / 66.3% (sum 1.37 vs 1.332, TB 54%). Least self-consistent prices: the QF-A total (Over 22.5 juiced to -135 while the moneyline is pick'em) and QF-B Under 23.5 at -140; my model sits between. I could not read DraftKings' own total/TB/set prices, so the "least consistent DK market" test is incomplete.
- **Closing-line log:** record the DK price you actually take and the closing price after each match (Airtable "DK Odds" field holds the recommendation-time price).
# 5. Betting card (DraftKings only)
<callout icon="⚠️" color="yellow_bg">
	DraftKings' live menu could not be opened from the cloud (the DK site and ESPN widget only returned stale caches). Only the two moneylines are DK prices, and both are search-reported via Dimers. For every other pick, bet only if DK lists the market at the take-at price or better. The workbook's Pricing tab recalculates EV and Kelly when you type the DK price in.
</callout>
<table header-row="true" fit-page-width="true">
	<tr>
		<td>Pick</td>
		<td>Model P</td>
		<td>Fair</td>
		<td>Take at</td>
		<td>DK price / EV</td>
		<td>1/4 Kelly</td>
	</tr>
	<tr>
		<td>**QF-A #1 high-hit:** Gea +1.5 sets</td>
		<td>69.1%</td>
		<td>-223</td>
		<td>-207 or better</td>
		<td>DK price needed</td>
		<td>1.8% at -200; 2.0% cap at -180</td>
	</tr>
	<tr>
		<td>**QF-A #1 value:** Gea ML</td>
		<td>51.1%</td>
		<td>-105</td>
		<td>+101 or better</td>
		<td>+100 (search-reported) / EV +2.2%</td>
		<td>0.6%</td>
	</tr>
	<tr>
		<td>**QF-A best SGP:** Gea +1.5 sets + Over 20.5 games</td>
		<td>49.5% joint (naive 42.0%)</td>
		<td>+102</td>
		<td>+112 or better</td>
		<td>DK SGP price needed</td>
		<td>—</td>
	</tr>
	<tr>
		<td>**QF-B #1 high-hit:** de Minaur +1.5 sets</td>
		<td>61.7%</td>
		<td>-161</td>
		<td>-151 or better</td>
		<td>DK price needed (other book 1.57 = -175: no bet there)</td>
		<td>1.1% at -150; 2.0% cap at -140</td>
	</tr>
	<tr>
		<td>**QF-B #1 value:** de Minaur ML</td>
		<td>42.2%</td>
		<td>+137</td>
		<td>+143 or better</td>
		<td>+175 (search-reported) / EV +15.9%</td>
		<td>2.0% (cap)</td>
	</tr>
	<tr>
		<td>**QF-B best SGP:** de Minaur +1.5 sets + Over 21.5 games</td>
		<td>48.1% joint (naive 38.0%)</td>
		<td>+108</td>
		<td>+118 or better</td>
		<td>DK SGP price needed</td>
		<td>—</td>
	</tr>
</table>
- **Alternates if DK's main spread is 3.5:** de Minaur +3.5 games (63.6%, take at -163 or better); Gea +3.5 games (67.8%, take at -195).
- **Passes:** Zverev ML at -200 (EV −13%); ADF ML at -116 (EV −9%); QF-A Over 22.5 at -135 (EV −17%); QF-B Under 23.5 at -140 (EV −6%); Over 2.5 sets QF-A at 2.25 (EV −14%).
- **In-play plan:** QF-A set 1 to Gea → Gea 81.7% (fair -446; back at -400 or longer); set 1 to ADF → Gea 20.0% (fair +400; take +430 or longer). QF-B set 1 to Zverev → Zverev 82.1% (fair -459); set 1 to de Minaur → Zverev 22.5% (de Minaur fair -344), and over 22.5 rises to 58%.
- **Agreement routing:** pending Grok/Gemini. If they back ADF or Zverev outright, the winner picks stay as priced (never flip to match), and the stakes move to the cushion/SGP rows.
# 6. Gaps (what I could not verify)
- DraftKings' own menu and prices (total games, set spread, TB, set 1, correct score, SGP) — not reachable from the cloud session; ML prices are search-reported.
- No Oct 14 practice, strapping or MTO news for Zverev; no live roof or weather (forecast API blocked; DeepCourt logged 23 °C, 62% humidity, 10 km/h wind for the Oct 13 evening session).
- Tennis Abstract 2026 Canada (server error), Marseille (empty), Shanghai (empty), Montpellier and Delray Beach (not saved) are missing from the network; no Challenger matches in this cloud build, so Gea's ratings are thinner than in the earlier local run (which gave Gea–ADF 62.5/61.9 and Zverev–de Minaur 66.3/64.1 serve-win before form; this build 61.8/61.3 and 67.1/63.6).
- Tennis Abstract tables give percentages; serve points per match are estimated from the score (exact for TML and Shanghai rows).
- Gea double-fault clustering under pressure and BH–BH crosscourt direction-change stats need point-by-point data I don't have.
- Film is coarse scene description; no frame-level movement metrics.
- Pinnacle/Betfair/Polymarket prices for QF-B were not found; Polymarket only listed the outright.
# 7. FINAL blocks
FINAL \| Match: Gea vs Davidovich Fokina (QF-A) \| Winner: Gea \| P(win) blind: 54.9% \| P(win) final: 50.9% \| 80% band: 45.5–64.2% \| Confidence: Low \| Most likely score: 6-4 6-4 Gea \| P(3 sets): 38.4% \| P(≥1 TB): 38.2% \| Exp. total games: 23.7 \| #1 high-hit pick: Gea +1.5 sets @ take -207 or better (P 69.1%) \| #1 value pick: Gea ML @ +100 (P 51.1%, EV +2.2%) \| Best SGP: Gea +1.5 sets + Over 20.5 @ take +112 or better (P 49.5%) \| Top 3 reasons: 1) Gea serving +7.0 pts above expectation this week 2) ratings are a coin flip (52.5% iid) that the market prices as an ADF edge 3) ADF's serve swung 71% to 61% between rounds and his set-3 return dipped
FINAL \| Match: Zverev vs de Minaur (QF-B) \| Winner: Zverev \| P(win) blind: 51.5% \| P(win) final: 58.0% \| 80% band: 45.8–56.9% \| Confidence: Medium-Low \| Most likely score: 6-4 6-4 Zverev \| P(3 sets): 38.8% \| P(≥1 TB): 48.2% \| Exp. total games: 24.6 \| #1 high-hit pick: de Minaur +1.5 sets @ take -151 or better (P 61.7%) \| #1 value pick: de Minaur ML @ +175 (P 42.2%, EV +15.9%) \| Best SGP: de Minaur +1.5 sets + Over 21.5 @ take +118 or better (P 48.1%) \| Top 3 reasons: 1) de Minaur's return cuts Zverev's unreturned serves from 35% to 22% and Zverev is ~68% SPW from the elite-returner cliff 2) right-ankle flare-ups in two straight matches (mixture P(limited) 0.5) 3) market at -200 prices none of that while Zverev's ratings edge is only 66.6% before adjustments
21+, 1-800-GAMBLER; not betting advice.
