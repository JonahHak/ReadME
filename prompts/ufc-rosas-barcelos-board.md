# UFC Vegas 121: Rosas Jr. vs Barcelos (Sat Sept 26, 2026, 5 rounds, bantamweight, Meta APEX)

Built with `.claude/skills/ufc-deep-engine`. Entertainment/modeling only. 21+, 1-800-GAMBLER; not betting advice.

## Call
- Winner: Rosas Jr. 53.5% (engine haircut 51%). Coin flip.
- Ends: decision 54% (the most likely single outcome is Rosas by decision, ~31%).
- Method: Rosas dec 31, Rosas sub 16, Rosas KO/TKO 6, Barcelos dec 23, Barcelos KO/TKO 17, Barcelos sub 7.
- Finish timing (share of all outcomes): R1 18, R2 10, R3 11, R4 4, R5 3, decision 54.

## Inputs
| Source | Rosas win % |
|---|---|
| DraftKings -155/+130 de-vigged | 58.3 |
| After band curve (-140 to -249 favs run ~5 pts hot) | 53.3 |
| Fight Matrix model | 65 |
| Covers model | 59 |
| MMA Analytics model | 43 |
| Expert picks (5 Rosas, 5 Barcelos) | 50 |
| Blend: market 0.55, stat models 0.30, experts 0.15 | 53.5 |

Distance: market ~51% (Yes about -110 to +109), Covers 49%, Lineups 55.6%, history 65% (Barcelos 10 of last 12 decisions, 6 straight vs Americans; Rosas last 3 decisions; neither finished in the UFC). Blend 54%. Over 3.5 rounds: DK-area -175/+140 = 60.4% fair; ours 61%.

## Fight-week news (calls)
- Both made weight (Rosas 136, Barcelos 135). No adjustment.
- Line moved from Rosas -185/-190 (Sept 21-22) to -155/-168 (fight day): 30-35 cents toward Barcelos. Information event: flagged, band widened, not chased.
- First scheduled five-rounder for both. Rosas camped with Marlon Vera in Southern California.

## Untested patterns (not in the numbers)
- Rosas 6.10 TD/15, 56.9% control (bantamweight record), 16 takedowns on Rob Font; +3.8 strike differential in R1, negative after.
- Barcelos 88% TDD over 41 attempts, 92% by R3; R3 output is 161% of his R1; five-time Brazilian freestyle champion.
- Rosas lands 1.34 significant strikes per minute; his cardio faded against Christian Rodriguez (2023).
- Barcelos is 39 and was dropped in R1 five months ago against Montel Jackson.
- Sherdog forum and several handicappers (CBS, Dan Tom, WagerTalk) lean Barcelos; Fight Matrix, ClutchPoints, Upfront pick Rosas.

## How it plays out
R1-R2: Rosas chains takedowns early against a slow starter and should bank at least one round on control. R3: Barcelos' defence tightens and his output rises; standing rounds go to him. R4-R5: new ground for both. If Rosas' pace holds, he rides top position to a decision (48-47 or 49-46). If his takedown rate drops, Barcelos wins the late rounds on the feet and takes a split decision. The finish paths: Rosas back-take submission if the 39-year-old tires, or a Barcelos counter as Rosas shoots tired.

## How this goes wrong
- 46.5% Barcelos wins. That path: he stuffs the first three entries and the fight stays standing.
- 46% it is finished, mostly early (R1 18%) when one man commits before the other has settled.

## Best bets
| Market | Price | Our P | Breakeven | Note |
|---|---|---|---|---|
| Fight goes the distance: Yes | about -110 | 54% | 52.4% | Best inside -160 to +100 |
| Over 3.5 rounds | -175 | 61% | 63.6% | Highest P with a price, slightly overpriced |
| Barcelos ML | +130 | 46.5% | 43.5% | Only +EV side, but loses more often than not |
| Rosas ML | -155 | 53.5% | 60.8% | Overpriced by our math |

## Same-fight parlay: "The wrestling war" (added 9:35 PM ET)
Takedown rate is a blend of the DraftKings ladder (Rosas 8+ at +600 implies about 5.2, Barcelos 5+ at +600 about 2.7) and our research (Rosas about 2.9 against 88% takedown defense, Barcelos about 3.4 against Rosas's 25% takedown defense), weighted 0.55/0.45. Counts scale with fight length from our round ladder, with game-plan variance (gamma frailty). 400k simulations.

| Leg | Our P | Fair odds |
|---|---|---|
| Over 1.5 rounds | 82% | -455 |
| Barcelos 1+ takedown | 81% | -430 |
| Rosas 2+ takedowns | 73% | -270 |
| **All three (joint, correlated)** | **63%** | **-169** |
| Same three if they were independent | 48.5% | |
| Step-up: Over 2.5 instead of Over 1.5 | 58.5% | -141 |

Breaks on: an early finish (18%), Barcelos stuffing Rosas all night (27% Rosas under 2), or Barcelos never shooting (19%).

## Rebuilt on confirmed DraftKings markets only (added 9:50 PM ET)
DraftKings, BestFightOdds, OddsShark and The Odds API are blocked from this environment. Confirmed DK lines (CBS Sports quoting DK, plus the user's DK paste): ML Rosas -142 / Barcelos +120, decision -125, Rosas dec +200, Barcelos dec +275, Rosas sub +330, distance -125, over 3.5 rounds -180, Rosas takedowns over 3.5 and 5+ to 9+ (8+ +600), Barcelos takedowns 2+ (in DK's pre-built SGP) and 3+ to 6+ (5+ +600). Lower rungs from the earlier parlay (Rosas 2+, Barcelos 1+, over 1.5) were not available.

| Bet | Our P | Fair | DK |
|---|---|---|---|
| Barcelos 2+ takedowns | 63.8% | -177 | check app |
| Over 3.5 rounds | 61.0% | -156 | -180 |
| Goes the distance | 54.1% | -118 | -125 |
| Over 3.5 rounds + Barcelos 2+ TD (SGP) | 49.8% | +101 | check app |
| Over 3.5 + Rosas over 3.5 TD + Barcelos 2+ TD (SGP) | 33.7% | +197 | check app |
| Rosas 5+ TD + Barcelos 2+ TD (DK pre-built) | 30.2% | +231 | check app |
| Rosas by decision | 30.2% | +232 | +200 |
