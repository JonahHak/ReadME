# Oregon at USC: combine-the-models prompt (Sat Sept 26, 2026, 7:30 PM ET)

Copy everything below the line into ChatGPT, Gemini, Grok, Perplexity, or another AI.

---

You are a college football analyst. Your job is to **combine the predictions already given below** into one final call for **Oregon at USC (7:30 PM ET, Sat Sept 26, 2026)**, and to use **today's earlier games** to work out what our process got wrong and how to fix it tonight.

## Hard rules (read first)

1. **Do not make your own independent prediction.** Do not browse, search, or pull ratings, odds, injury news or stats from anywhere else. Work only from the numbers and facts in this prompt.
2. The existing inputs are: the **market**, **SP+**, our **drive simulator**, **Codex (blind)**, **Gemini (blind)**, the **two red-team reviews**, and our **v6 rules**. Your job is to weight, combine and correct *these*, not to replace them.
3. If you think something important is missing, list it under "Outside-data notes" at the end. Do not let it change your numbers.
4. Show your arithmetic. Every number you publish must trace back to an input below.
5. Be honest about uncertainty. A 53% call is close to a coin flip; say so.

---

## Part 1: Our full Oregon at USC research (pre-game, v6, published 11:15 AM ET)

**Market (CFBD median, 10:34 AM ET):** Oregon -3.5, total 61.5.
Moneyline: DraftKings Oregon -175 / USC +145; Bovada Oregon -140 / USC +140.

**Our published pick (v6):** Oregon 33.4, USC 31.2.
- Winner: Oregon, 57%
- Spread: USC +3.5, 53%
- Total: over 61.5, 57% (projected 64.6)
- Formula: 0.5 × market + 0.5 × (SP+ + injury adjustments); total = calibrated v6 total + matchup adjustment.

**Line-blind model only:** Oregon 34.9, USC 35.0. USC 50%. Leans USC +3.5 (3 of 4 sources).
**Market-blended (v6 rules):** Oregon 33.9, USC 30.7. Oregon 58%. Total call: **no pick** (rule R4: the lean flips if USC controls tempo).

### Independent inputs (the "AIs already in there")

| Source | USC margin (+ = USC wins by) | Total |
|---|---|---|
| SP+ (home field 2.83) | 0 | 66.1 |
| Drive sim | +4.8 | 73.6 |
| Codex (blind) | -1 | 57 |
| Gemini (blind) | -4 | 66 |
| Market | -3.5 | 61.5 |

Line-blind, we have USC 0 and the market has USC -3.5, a 3.5-point gap toward USC. On the total we are +8.4 above the market.

**Why the published side stays near the market:** across 2,243 games no line-blind side model beat the closing spread, and the drive sim has zero side signal (slope 0.04). On totals, the sim has shown real skill: it was right 67% of the time when it disagreed with the market by 8+ points (61 games), but only inside market totals of 40-68.

### Distributions (from the sim, re-centred on our numbers)
- Oregon margin: 10th -16.3, 25th -7.5, median 3, 75th 13.5, 90th 23.2 (market 3.5, line-blind -0.03)
- Total: 10th 44, 25th 53.5, median 64, 75th 75.5, 90th 85 (market 61.5, line-blind 69.9)

### Most confident bets we listed (alternate lines, FanDuel lists the market but did not publish a price; odds shown are our fair price)
| Selection | Fair odds | Our P |
|---|---|---|
| USC +20.5 | -525 | 84.0% |
| Over 42.5 | -400 | 80.0% |
| USC +9.5 | -221 | 68.8% |
| Over 48.5 | -209 | 67.6% |

No player props with a named sportsbook were found for this game.

### v5 to v6 changes
| Item | v5 | v6 | Why |
|---|---|---|---|
| Market home margin | -3.0 | -3.5 | line moved toward Oregon |
| Market total | 61.5 | 61.5 | |
| Published home margin | -2.7 | -3.15 | 0.9 market + 0.1 SP+ |
| Published total | 64.6 | 64.63 | v5 gap+level formula |
| P(USC win) | 0.432 | 0.421 | |
| P(fav covers) | 0.494 | 0.494 | |
| P(over) | 0.566 | 0.566 | |
| Total call | weak lean over (56.6%) | **no pick** | Sim gap partly comes from 23 possessions vs USC's usual 19-20, which the market already prices. USC-tempo scenario P(over) = 47%. Flagged by both red teams. |

### Untested patterns (not in the numbers)
- USC has scored 39+ in all four games, three of them against Group of Five teams.
- Oregon allowed scores on 10 of 11 red-zone trips in its two games against FBS teams.
- Dante Moore went 14 of 29 with 4 sacks at Oklahoma State, and a pre-snap tell was reported.
- Jayden Maiava completes 74% at home and 57.5% on the road. (Tonight is at home.)
- USC's games have had 19-20 possessions; Oregon's have had 26-28.

### How this goes wrong (from the sim)
- 42%: USC wins outright. In the sim's upsets the favorite scores fewer touchdowns and turns it over more.
- 43%: the total lands on the other side. When it does, halftime is about 28 instead of 42, about 1.5 fewer possessions, and drives end in field goals and punts.
- 47% over if USC controls tempo (20.3 possessions): projected total falls to about 60.2, under 61.5.

### Injury calls
- Oregon TE Jamari Johnson: assumed to PLAY (back at practice Monday; staff says he "should" play).
- USC DT Jahkeem Stewart: assumed OUT (has not played this season).
- USC WR Trent Mosley: assumed OUT (knee, "quite some time").
- USC nickel Alex Graham: assumed to PLAY ("expected to play").
- USC also without WR Simms, S Reddick, LB Taybo Johnson, OL O'Connor: **-1.5 pts to the USC margin**.
- Oregon without WR McClellan, LG Ferguson, ILB Platt (TE Johnson plays): **+0.5 pts to the USC margin**.
- Official Big Ten report about 6:00 PM ET.

### The shared-model risk
Florida over, USC over and Michigan over all come from the same drive simulator. If it is wrong about games between two good teams, they lose together.

| Scenario | Florida over | USC over | Michigan over |
|---|---|---|---|
| Our model | 62% | 58% | 66% |
| If the sim has no edge in good-vs-good games | 49% | 46% | 59% |

### Our season record going in
Overall 13-10. Margin calls 1-5. Totals 2-1. Props 6-2. Winners 3-2. Our side deviations graded worse than the market (Brier 0.141 vs 0.112).

---

## Part 2: Today's earlier games and how we did

### Game 1 (FINAL): Texas 20, Tennessee 17
Box score: Texas 262 yards, Tennessee 221. Rushing: 61 on 36 (1.7) vs 70 on 44 (1.6). Texas had **10 sacks** (Colin Simmons 5, tying the school record). Arch Manning 14/19, 201 yds, 0 TD, 1 INT, sacked 6 times. Tennessee freshman QB Faizon Brandon 17/32 for 151 (AP: 17 of 29, 145), his SEC debut. Raleek Brown 17 carries, 67 yds, 2 TD (Hollywood Smothers not among the top Texas rushers). Mike Matthews 4 catches, 72 yds, 30-yd TD with 1:22 left. Tennessee's other TD was a **57-yard punt return**. Penalties: Texas 11 for 115, Tennessee 7 for 55. Third downs: 3-12 and 4-16. 7 punts each. Total plays 55 + 76 = 131. Scoring by quarter: Texas 7-3-3-7, Tennessee 3-0-7-7.

| Our call | Result |
|---|---|
| Winner Texas (59%) | HIT |
| Spread Tennessee +5.25 (54%) | HIT (lost by 3) |
| Total over 54.75 (53%, proj 56.1) | **MISS: 37 total, 19 below our projection** |
| Our score, Texas 29.9-26.2 | Margin off by 0.7; total off by 19.1 |
| Alt over 38.5 (86.8%) | **MISS by 1.5** |
| Alt over 46.5 (67.6%) | MISS |
| Alt Tennessee +20.5 and +11.5 | HIT |
| Manning under 251.5 passing (79%) | HIT (201) |
| Mike Matthews under 58.5 rec yds (72%) | **MISS (72, late TD)** |
| Faizon Brandon rushing, lean under 28.5 | Likely HIT (Tennessee had 70 rush yds on 44 carries including sacks); verify |
| Cam Coleman anytime TD (lean, +150) | MISS (Texas had 0 passing TDs) |
| Raleek Brown anytime TD (model 41%, no play) | Model wrong on role: he scored 2 |
| DeSean Bishop anytime TD (no play) | Correct pass: Tennessee had 0 rushing TDs |

Total errors by source for this game (actual 37):
SP+ 61.3 (+24.3), drive sim 58.2 (+21.2), Codex 52 (+15), Gemini 55 (+18), market 54.75 (+17.75). **Every source was too high. Codex, the lowest, was closest.**
Margin (Texas by 3): line-blind Texas by 1.1 (off 1.9), market Texas by 5.25 (off 2.25), our blend Texas by 3.7 (off 0.7).

What our research had flagged but kept out of the numbers: "Tennessee runs for 298.7 yards a game with a patched right side of the line, against Texas's defensive tackles," and Texas's offense ranking #81 in EPA per play with only 9 plays of 20+. Both proved right.

### Game 2 (IN PROGRESS at time of writing): Ole Miss at Florida
Halftime: **Florida 17, Ole Miss 6.** Florida outgained Ole Miss 233-148; Jadan Baugh 17 carries, 83 yds, 2 TD; Chambliss 10 of 13 for 88; Ole Miss 0 of 5 on third down. Ole Miss S Joenel Aguero ejected for targeting. Florida WRs Vernell Brown III (ankle) and Bailey Stockton (head) left; Singleton had not played.
Our calls: Florida -3.5 (tracking), Florida to win (tracking), **over 58.75, projected 64.1: 23 at half, pace about 46, tracking under.**
*[If you have the final, paste it here: Ole Miss __ Florida __]*

### Game 3 (IN PROGRESS at time of writing): Iowa at Michigan
Michigan 10, Iowa 7 in the third quarter. Iowa's only TD was a 99-yard kick return. Hank Brown 6 of 12 for 47 at half, sacked twice (our lean was over 155.5 passing yds). Underwood 11 of 16, 162, 1 TD, plus an INT in the red zone. Michigan outgained Iowa 232-77 in the first half.
Our calls: Iowa +5.25 (tracking), Michigan to win (tracking), over 38.75 projected 45.5 (17 in Q3, close).
*[If you have the final, paste it here: Iowa __ Michigan __]*

### Last night: Indiana 29, Northwestern 23
Indiana -20.5. We had the total nearly right and the margin wrong by 15 (so did everyone). The real miss was a matchup: with Indiana's two starting corners out, a low-usage TE went 7 for 140. That created our "depleted-group" props step.

---

## Part 3: What I need from you

Answer in exactly these sections so I can merge answers from several AIs:

**A. Diagnosis of today (max 8 bullets).** What went wrong in Texas-Tennessee and in the early 3:30 results, and was each miss variance or a process error? Look specifically at:
- the drive sim and SP+ overshooting totals in a top-15 vs top-15 game,
- pass-rush / sack mismatches against patched or depleted offensive lines being left out of the numbers,
- non-offensive TDs (punt return, kick return) inflating totals that were otherwise far under,
- RB role calls (Raleek Brown vs Smothers) and late garbage-time receiving yards (Matthews),
- whether the "shared-model risk" on the overs is showing up today.

**B. Fixes (max 6).** Concrete rule changes, each written as "When X, do Y," using only the inputs above. Say which fixes apply to Oregon-USC tonight.

**C. Re-weighting the existing inputs.** Give the weights you would put on market, SP+, drive sim, Codex and Gemini for (1) the side and (2) the total tonight, and why, based on today's evidence. Weights must add to 1.

**D. Final Oregon at USC call, from the combined inputs only.**
- Projected score (Oregon __ USC __)
- Winner and win probability
- Spread pick vs Oregon -3.5 and probability (or "no pick")
- Total pick vs 61.5 and probability (or "no pick")
- Which of the four alternate lines (USC +20.5, Over 42.5, USC +9.5, Over 48.5) you would still play, adjusted for today's lessons
- Confidence: low / medium / high

**E. What would flip your call.** The 6:00 PM Big Ten injury report item, or the first-quarter sign (pace, sacks, possessions), that would change D.

**F. Outside-data notes (optional).** Anything you think is missing. These do not change your numbers.

Keep it under 700 words. No new sources.
