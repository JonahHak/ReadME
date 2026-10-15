import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from exactsets import pwin_sets
from qf_model import shrink, logit, CFG
import card as C  # reuses sim()
res = json.load(open('output/qf_results.json')); mk = json.load(open('output/markets.json'))
def blend(p, cons): return 1 / (1 + np.exp(-(0.5 * logit(p) + 0.5 * logit(cons))))
def P(k, dA=0.0, dB=0.0, plim=None):
    r = res[k]; pa, pb = r['pa_final_fit'] + dA, r['pb_final_fit'] + dB
    A = [pa] * 3; B = [pb] * 3
    if k == 'QF-A': A[2] += 0.010
    pf = pwin_sets(A, B)
    if k == 'QF-B':
        pl_ = plim if plim is not None else 0.5
        Al = [pa - .005, pa - .020, pa - .030]; Bl = [pb + .005, pb + .015, pb + .025]
        p = (1 - pl_) * pf + pl_ * pwin_sets(Al, Bl)
    else: p = pf
    b = shrink(p, CFG['k_shrink']); return b, blend(b, mk[k]['consensus'])
out = {}
for k, rows in {'QF-A': [('baseline', {}), ('Gea >=3 double faults in first 4 service games (DF clustering): Gea SPW -2 pts', dict(dA=-0.02)),
                         ('ADF 1st-serve in <55% through first 4 service games: ADF SPW -2 pts', dict(dB=-0.02)),
                         ('Gea wins >=35% of return pts vs ADF 1st serve early: ADF SPW -2 pts', dict(dB=-0.02)),
                         ('ADF holds 4/4 losing <=4 serve pts total (ADF serving hot): ADF SPW +3 pts', dict(dB=0.03))],
                'QF-B': [('baseline', {}), ('Zverev visibly limping / strapped / MTO in first 4 service games: P(limited) 0.5 -> 0.9', dict(plim=0.9)),
                         ('Zverev 1st-in >=70% and 1st won >=80% through 4 service games, moving freely: P(limited) 0.5 -> 0.2, Zverev SPW +2 pts', dict(plim=0.2, dA=0.02)),
                         ('de Minaur wins >=40% of return pts in first 4 Zverev service games (lever on): Zverev SPW -3 pts', dict(dA=-0.03)),
                         ('de Minaur serving <60% SPW early (groin/serve speed down): ADM SPW -3 pts', dict(dB=-0.03))]}.items():
    out[k] = []
    for lab, kw in rows:
        b, f = P(k, **kw); out[k].append(dict(trigger=lab, p_model=b, p_final=f)); print(f'{k} {lab[:95]:95s} model {b:.3f} final {f:.3f}')
# pre-mortem from the re-centred simulation
pm = {}
for k, seed in (('QF-A', 7001), ('QF-B', 7002)):
    delta = json.load(open('output/card.json'))[k]['delta']
    r, lim = C.sim(k, delta, 60000, seed + 1)
    wA = r['winA']; ns = r['nsets']; tb = r['ntb'] > 0; mg = r['margin']; g = r['games']
    if k == 'QF-A':  # top pick Gea +1.5 sets loses iff ADF 2-0
        lose = (~wA) & (ns == 2)
        pm[k] = dict(pick='Gea +1.5 sets', p_lose=float(lose.mean()),
                     ways={'ADF 2-0 without a tiebreak (one break per set)': float((lose & ~tb).mean()),
                           'ADF 2-0 with Gea losing a tiebreak': float((lose & tb).mean()),
                           'ADF 2-0 rout (margin >= 6 games)': float((lose & (-mg >= 6)).mean())},
                     sgp_lose=float((~(~((~wA) & (ns == 2)) & (g > 20.5))).mean()))
    else:
        lose_ml = wA; lose_set = wA & (ns == 2)
        pm[k] = dict(pick='de Minaur ML (value) / de Minaur +1.5 sets (high-hit)', p_lose_ml=float(lose_ml.mean()), p_lose_plus15=float(lose_set.mean()),
                     ways={'Zverev 2-0 without a tiebreak (serve >=68%, one break a set)': float((lose_set & ~tb).mean()),
                           'Zverev 2-0 via tiebreak(s)': float((lose_set & tb).mean()),
                           'Zverev wins in 3 (ML loses, +1.5 sets wins)': float((wA & (ns == 3)).mean()),
                           'Zverev fit-state win (ankle not a factor)': float((wA & ~lim).mean())})
    print(k, json.dumps(pm[k], indent=0))
json.dump(dict(tripwires=out, premortem=pm), open('output/tripwires.json', 'w'), indent=1, default=float)
