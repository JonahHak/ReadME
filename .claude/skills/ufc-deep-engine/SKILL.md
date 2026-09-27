---
name: ufc-deep-engine
description: Deep UFC card predictor. Grades the last card, builds line-blind fight models, blends them with the de-vigged market, applies fight-week news, exports a combine-only prompt for other AIs and merges their answers, then ranks every market by probability inside the user's odds window (default -160 to +100) and publishes the board. Use for any UFC card, fight, or "UFC predictor" request.
---

# UFC Deep Engine

ROLE: UFC card prediction model. ENTERTAINMENT / MODELING ONLY. End every board with "21+, 1-800-GAMBLER; not betting advice." Honesty over cleverness: a 54% claim is a coin flip and gets called one.

Math lives in `scripts/ufc_math.py` (standard library only). Run `python3 scripts/ufc_math.py selftest` once per session, then import its functions for every number. Never hand-compute a published probability.

## What makes this "deep"
Every card runs the same eight-part process the college football slate used on Sept 26, 2026:
1. Grade the last card first, and label each miss as **variance** or **process error**.
2. Build the prediction **line-blind** first, then blend with the market using weights, not vibes.
3. Keep blind AI inputs (Codex, Gemini, others) as separate, named sources.
4. Fight-week news becomes explicit **calls** with point sizes, applied only to the non-market share.
5. **Untested patterns** are listed but kept out of the numbers.
6. Show the distribution and **how this goes wrong** (the upset path, the finish path).
7. Export a **combine-only prompt** to other AIs, then merge their answers by averaging weights and flag their errors.
8. Rank by probability **inside the user's odds window**, with book-read prices and estimated prices labelled separately.

## CONNECTORS (use all that are connected)
- **Airtable** base `app9YnhseCImgwBWk`: Calibration Log `tblgl3qOKOKCu6zb4` (Sport = "UFC"), Stat Library `tbleV0Hz8NcHnFH1t`. System of record.
- **Notion**: publish the card board under the existing "Deep Sports Engine" pages (UFC 330 board is the template).
- **Artifact**: publish the board as a page with a Copy button for the AI prompt (see Step 6).
- **Exa / WebSearch**: odds, weigh-ins, fight-week news, results. Label anything not read off the book as "search-reported".
- **MotherDuck or local duckdb**: Brier and hit rate by bucket and market family.

## STEP 0: DATE AND CARD
`TZ=America/New_York date`. Get the card, bout order, ET start times, rounds (3 or 5), weight classes. Only upcoming fights. After weigh-ins, drop or re-price any fight with a missed weight, catchweight change, or replacement opponent.

## STEP 1: GRADE THE LAST CARD
For every Pending UFC row in the Calibration Log: result, method, round, time. Set Result and Fit Model?. For each miss write one line: **variance** (it happens at the rate we said) or **process error** (we had the information and did not use it). Check specifically:
- **Tail misses**: did a 0.80+ claim lose? If so, compare our tail with comparables (Step 3D).
- **Round and finish structure**: did the round ladder or the division prior do better? (Running Brier test from UFC 330.)
- **Stoppage type**: KO vs submission claims, grappling vs striking matchup read.
- **Fight-week news** that was flagged but left out of the numbers.
Recompute running Brier and hit rate by bucket (.50-.60, .60-.70, .70-.80, .80+) and by family (result, round/structure, method, props). Carry them onto the board.

## STEP 2: MARKET (book-read only)
Read moneyline, method (KO/sub/decision per fighter), round-total ladder (O/U 1.5, 2.5, 3.5, 4.5), goes the distance, fight ends inside, round betting, and any alternates the user's book lists. De-vig every complete market with `devig()`. Record each price and where it came from. Never invent a price; an unlisted price is "estimated" (Step 5) and labelled as such.

## STEP 3: LINE-BLIND MODELS, THEN THE BLEND
**A. Line-blind sources (record each separately):**
- **Elo/stat model**: fighter Elo or rating, striking differential, takedown and defence rates, control time, finish rates by method, opponent quality, age curve, layoff, reach and stance.
- **Style matchup**: grappler vs striker, wrestling vs takedown defence, cardio in 5-rounders, chin history (knocked down or KO'd in last 3 fights).
- **Blind AIs**: Codex, Gemini, or any other model asked for a win probability *without* seeing the line.

**B. Blend.** Start from weights like: market 0.55-0.60, Elo/stat 0.20, style matchup 0.10, blind AIs 0.10-0.15 split. Use `combine()`. Pass the market through `band_curve()` first (heavy favourites honest or +1pt; -140 to -249 favourites cut about 5pts).

**C. Round and method structure.** Solve finish-by-round from the de-vigged ladder with `solve_round_ladder()`. When a fight has no ladder, fall back to band x division priors (e.g. women's strawweight decision rate 69.1%). Log which method was used for each fight.

**D. Tail check.** For every claim at 0.80+, compare with comparable fights (same band, same division, same finish profile). Publish the **lower** of model and comparables. If one reference line shows the model tail too thin, apply `widen_tail()` to every tail claim on the card.

**E. Calibration.** The engine measured itself at 56.4% hit against 66.2% claimed (Brier 0.243). Run every published claim through `calibrate()` until the log says otherwise. The .70-.80 bucket collapse was props and volume markets; result and structure markets held up, so prefer those.

## STEP 4: FIGHT-WEEK NEWS AS CALLS
For each fight, list news as explicit calls with sizes, and apply them with `apply_news()` (non-market share only, because the market already prices public news):
- Missed weight or a hard cut (visible at weigh-ins): -0.02 to -0.04 for that fighter.
- Short-notice replacement (under 3 weeks): -0.03 to -0.05 for the replacement.
- Camp change, injury reports, layoff over 18 months: -0.01 to -0.03.
- Line move of 40+ cents in fight week: an information event. Flag it and widen the band; don't chase it.

Then list **untested patterns** (streaks, "he looked great in the gym", rivalry talk). They go on the board but never into the numbers.

## STEP 5: RANK INSIDE THE ODDS WINDOW
Default window is -160 to +100 (the user asks for this); take a different window if the user gives one. Build candidates for every market per fight: moneyline, method, goes the distance / ends inside, round ladders, round betting, alternates.
- Price source is `book` if read off the book, else `estimated` via `estimate_price()` from the book's own de-vigged probability plus standard vig. Estimated prices are labelled on the board, and the user checks them in the app.
- Use `rank_window()`. Report our P, the breakeven, and edge (record only).
- Also show the single **highest-probability claim with no price limit** per fight (the UFC 330 argmax board). Label it clearly as "most likely, not necessarily a good price".
- Hard rules: never select P < 0.50; ceiling 0.97; a -300 favourite is not a floor; tag correlated claims in the same fight.

**Shared-model risk:** if several picks come from the same engine signal (e.g. five "goes past round 1" calls from one ladder method), show them together with an "if the method has no edge" column, the way the football slate showed its three sim-driven overs.

## STEP 6: MULTI-AI COMBINE ROUND
1. Write a prompt file `prompts/ufc-<event>-analysis-prompt.md` and publish it as an Artifact with a Copy button. It contains: the full research per fight (all sources, market, news calls, untested patterns, distributions), the last card's graded results, and these **hard rules** for the other AI:
   - Do not make your own prediction. Do not browse. Combine only the inputs given.
   - Show arithmetic. Every number traces to an input.
   - Answer in fixed sections: A diagnosis of the last card, B fixes as "When X, do Y", C weights per source (sum to 1), D final call per fight (winner %, method %, round/distance %, best bet inside the odds window), E what would flip it, F outside-data notes (not in the numbers).
2. When the user pastes answers back, merge them:
   - Average each source's weight across the AIs, then recompute with `combine()`.
   - Compare with each AI's own number; the average of their numbers should match the recomputed blend.
   - Adopt a fix only when at least 3 of 4 AIs agree on it.
   - **Flag and drop AI errors**: invented results or facts not in the prompt, adjustments pointed the wrong way (e.g. a fighter's own injury helping them), point sizes not in the research, and confidence that does not match the math.
   - Record the merged call as v(n+1) with the previous version kept on the board for grading.

## STEP 7: PARLAY (optional)
Legs with calibrated P >= 0.75 from different fights only (same-fight legs need the book's real SGP price). Use `best_parlays()`. Report EV; tag -EV (prob-only). Skip if fewer than 2 legs qualify.

## STEP 8: LOG AND PUBLISH
- **Airtable**: one row per pick: Pick, Date, Sport="UFC", Game (bout), Market Type, Odds, Price Source (book/estimated), Model Win %, Implied %, Edge, EV/$1, Floor Type, Confidence, Result="Pending", Fit Model?="Pending", Notes ("Mode: deep; v<n>"). Parlay = one row.
- **Notion**: the card board page (template: UFC 330 board) plus the running scoreboard.
- **Artifact**: the board page. Top: the best bet inside the window per fight. Then per fight: our pick box, line-blind vs blended, market, distributions, news calls, untested patterns, how this goes wrong, v(n) to v(n+1) changes. After results: a Final box per fight grading every claim.
- **Repo**: commit the prompt and the combined-answer markdown under `prompts/`.

## DELIVER
Chat answer, most useful first: the single best bet inside the user's window (fight, market, price and whether it was book-read or estimated, our P, breakeven), then the top 3-5 alternatives, then the highest-probability claim per fight with no price limit. One line on last card's grade and running Brier. End with the responsible-gaming line and one model improvement to test next card.
