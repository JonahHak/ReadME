"""Re-centre the derivative simulation on the FINAL winner probability (shift pa-pb, keep pa+pb), then price every
DraftKings market type: fair odds, take-at (EV >= +2.5%), EV at known/search-reported prices, 1/4 Kelly (cap 2%)."""
import os, sys, json, numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
import mc
from qf_model import CFG
from scipy.optimize import brentq
OUT = os.path.join(os.path.dirname(__file__), '..', 'output')
res = json.load(open(f'{OUT}/qf_results.json')); mk = json.load(open(f'{OUT}/markets.json'))
def p2am(p): return round(-100 * p / (1 - p)) if p >= 0.5 else round(100 * (1 - p) / p)
def am2dec(a): return 1 + (a / 100 if a > 0 else 100 / -a)
def take_at(p, edge=0.025):
    d = (1 + edge) / p; a = (d - 1) * 100 if d >= 2 else -100 / (d - 1); return round(a)
def ev(p, am): return p * am2dec(am) - 1
def kelly(p, am): b = am2dec(am) - 1; f = (b * p - (1 - p)) / b; return max(0.0, min(0.02, 0.25 * f))
PHYS = {'QF-B': dict(player='Alexander Zverev', p_limited=0.50, p_limited_sd=0.12, serve_hit_by_set=[0.005, 0.020, 0.030], return_hit_by_set=[0.005, 0.015, 0.025])}
FAT = {'QF-A': dict(player='Alejandro Davidovich Fokina', set3_return_hit=0.010)}
def sim(k, delta, n, seed):
    r = res[k]; rng = np.random.default_rng(seed); pa, pb = r['pa_final_fit'] + delta, r['pb_final_fit'] - delta
    sdA = r['sdA']; sdB = r['sdB']
    A3 = np.array([pa] * 3); B3 = np.array([pb] * 3)
    if k in FAT: B3[2] -= 0; A3[2] += FAT[k]['set3_return_hit']
    PA = np.tile(A3, (n, 1)) + (rng.normal(0, sdA, n) + rng.normal(0, CFG['dayform_sd'], n))[:, None]
    PB = np.tile(B3, (n, 1)) + (rng.normal(0, sdB, n) + rng.normal(0, CFG['dayform_sd'], n))[:, None]
    lim = np.zeros(n, bool)
    if k in PHYS:
        ph = PHYS[k]; m = ph['p_limited']; ab = m * (1 - m) / ph['p_limited_sd'] ** 2 - 1
        lim = rng.random(n) < rng.beta(m * ab, (1 - m) * ab, n)
        PA[lim] -= np.array(ph['serve_hit_by_set']); PB[lim] += np.array(ph['return_hit_by_set'])
    return mc.simulate(np.clip(PA, .35, .95), np.clip(PB, .35, .95), rng), lim
card = {}
for k, seed in (('QF-A', 7001), ('QF-B', 7002)):
    target = mk[k]['final']
    delta = brentq(lambda d: sim(k, d, 20000, seed)[0]['winA'].mean() - target, -0.06, 0.06, xtol=2e-4)
    r, lim = sim(k, delta, 60000, seed + 1)
    A, B = res[k]['A'], res[k]['B']; sa = A.split()[-1]; sb = B.split()[-1] if 'Fokina' not in B else 'Davidovich Fokina'
    g = r['games']; mg = r['margin']; ns = r['nsets']; wA = r['winA']; sc = r['scores']
    set1A = sc[:, 0, 0] > sc[:, 0, 1]; tb = r['ntb'] > 0
    keys = np.array([' '.join(f'{x}-{y}' for x, y in s if x >= 0) for s in sc])
    vc = pd.Series(keys).value_counts(normalize=True)
    mk_rows = []
    def add(market, sel, mask, price=None, price_src=None):
        p = float(np.mean(mask)); row = dict(match=k, market=market, selection=sel, p=p, fair=p2am(p), take_at=take_at(p))
        if price is not None: row.update(price=price, price_src=price_src, ev=ev(p, price), kelly=kelly(p, price), breakeven=1 / am2dec(price))
        mk_rows.append(row); return p
    mlA = {'QF-A': (100, 'DK ML via Dimers (search-reported)'), 'QF-B': (-200, 'DK ML via Dimers (search-reported)')}[k]
    mlB = {'QF-A': (-116, 'DK ML via Dimers (search-reported)'), 'QF-B': (175, 'DK ML via Dimers (search-reported)')}[k]
    add('Moneyline', A, wA, *mlA); add('Moneyline', B, ~wA, *mlB)
    add('Set spread', f'{A} -1.5 sets', wA & (ns == 2)); add('Set spread', f'{B} +1.5 sets', ~(wA & (ns == 2)))
    add('Set spread', f'{B} -1.5 sets', (~wA) & (ns == 2)); add('Set spread', f'{A} +1.5 sets', ~((~wA) & (ns == 2)))
    add('Total sets', 'Over 2.5 (3 sets)', ns == 3, *( (125, 'Oddset 2.25 (not DK)') if k == 'QF-A' else (None, None)))
    add('Total sets', 'Under 2.5 (2 sets)', ns == 2)
    for L in (20.5, 21.5, 22.5, 23.5, 24.5):
        po = (g > L)
        price_o = price_u = (None, None)
        if k == 'QF-A' and L == 22.5: price_o, price_u = (-135, 'Sportskeeda, book unnamed'), (-110, 'Sportskeeda, book unnamed')
        if k == 'QF-B' and L == 23.5: price_o, price_u = (-105, 'BetMGM via Sportskeeda'), (-140, 'BetMGM via Sportskeeda')
        add('Total games', f'Over {L}', po, *price_o); add('Total games', f'Under {L}', ~po, *price_u)
    for L in (1.5, 2.5, 3.5):
        add('Game spread', f'{A} -{L}', mg - L > 0, *( (-120, 'bet365 Z -2.5 (not DK)') if (k == 'QF-B' and L == 2.5) else (None, None)))
        add('Game spread', f'{B} +{L}', mg - L < 0)
        add('Game spread', f'{B} -{L}', -mg - L > 0); add('Game spread', f'{A} +{L}', -mg - L < 0)
    add('Tiebreak in match', 'Yes', tb); add('Tiebreak in match', 'No', ~tb)
    add('Set 1 winner', A, set1A); add('Set 1 winner', B, ~set1A)
    for a, b in ((2, 0), (2, 1)):
        add('Correct score (sets)', f'{A} {a}-{b}', wA & (ns == a + b)); add('Correct score (sets)', f'{B} {a}-{b}', (~wA) & (ns == a + b))
    # SGP candidates (joint from simulation, never multiplied)
    sg = []
    def sgp(name, mask, legs):
        p = float(np.mean(mask)); naive = np.prod([np.mean(l) for l in legs]); sg.append(dict(match=k, sgp=name, p=p, naive_product=float(naive), fair=p2am(p), take_at=take_at(p, 0.05)))
    sgp(f'{B} +1.5 sets & Over 20.5', ~(wA & (ns == 2)) & (g > 20.5), [~(wA & (ns == 2)), g > 20.5])
    sgp(f'{A} +1.5 sets & Over 20.5', ~((~wA) & (ns == 2)) & (g > 20.5), [~((~wA) & (ns == 2)), g > 20.5])
    sgp(f'{B} +1.5 sets & Over 21.5', ~(wA & (ns == 2)) & (g > 21.5), [~(wA & (ns == 2)), g > 21.5])
    sgp(f'{A} +1.5 sets & Over 21.5', ~((~wA) & (ns == 2)) & (g > 21.5), [~((~wA) & (ns == 2)), g > 21.5])
    sgp(f'{B} +1.5 sets & Over 22.5', ~(wA & (ns == 2)) & (g > 22.5), [~(wA & (ns == 2)), g > 22.5])
    sgp(f'{A} +1.5 sets & Over 22.5', ~((~wA) & (ns == 2)) & (g > 22.5), [~((~wA) & (ns == 2)), g > 22.5])
    sgp(f'Tiebreak Yes & Over 22.5', tb & (g > 22.5), [tb, g > 22.5])
    sgp(f'{B} +3.5 games & {B} +1.5 sets', (mg - 3.5 < 0) & ~(wA & (ns == 2)), [mg - 3.5 < 0, ~(wA & (ns == 2))])
    sgp(f'{A} +3.5 games & {A} +1.5 sets', (-mg - 3.5 < 0) & ~((~wA) & (ns == 2)), [-mg - 3.5 < 0, ~((~wA) & (ns == 2))])
    sgp(f'{A} ML & Over 21.5', wA & (g > 21.5), [wA, g > 21.5]); sgp(f'{B} ML & Over 21.5', (~wA) & (g > 21.5), [~wA, g > 21.5])
    sgp(f'Under 2.5 sets & Under 23.5', (ns == 2) & (g < 23.5), [ns == 2, g < 23.5])
    card[k] = dict(delta=delta, final=mk[k]['final'], sim_pwin=float(wA.mean()), p3=float((ns == 3).mean()), ptb_raw=float(tb.mean()), games_mean=float(g.mean()), games_median=float(np.median(g)),
                   modal_exact=vc.index[0], exact_top=vc.head(10).round(4).to_dict(), margin_mean=float(mg.mean()), p_tbA=float((r['tbA'] > 0).mean()), p_tbB=float((r['tbB'] > 0).mean()),
                   set1A=float(set1A.mean()), markets=mk_rows, sgps=sg, games_hist=np.bincount(g, minlength=40)[:40].tolist(),
                   in_play={})
    # in-play: after set 1 each way (condition on simulation paths)
    for who, m in ((A, set1A), (B, ~set1A)):
        card[k]['in_play'][f'set1 to {who}'] = dict(n=int(m.sum()), pA=float(wA[m].mean()), p3=float((ns[m] == 3).mean()), games_mean=float(g[m].mean()),
                                                     p_over_22_5=float((g[m] > 22.5).mean()), p_B_plus15=float((~(wA & (ns == 2)))[m].mean()), p_A_plus15=float((~((~wA) & (ns == 2)))[m].mean()))
    print(f'==== {k} final {mk[k]["final"]:.4f} delta {delta:+.4f} sim {wA.mean():.4f} P3 {(ns==3).mean():.4f} TB {tb.mean():.4f} games {g.mean():.2f} median {np.median(g)} modal {vc.index[0]}')
    T = pd.DataFrame(mk_rows); pd.set_option('display.width', 250); pd.set_option('display.max_rows', 200)
    print(T[['market', 'selection', 'p', 'fair', 'take_at', 'price', 'ev', 'kelly', 'price_src']].round(4).to_string(index=False))
    print(pd.DataFrame(sg).round(4).to_string(index=False))
    print('in-play', json.dumps(card[k]['in_play'], indent=0, default=float))
json.dump(card, open(f'{OUT}/card.json', 'w'), indent=1, default=float)
