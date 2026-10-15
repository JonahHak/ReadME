"""Step 7: consensus, gap investigation (waterfall), blend, market inversion, re-centred derivatives, price ladder."""
import os, sys, json, numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
import db, ratings, shanghai, grid, mc
from exactsets import pwin_sets
from qf_model import CFG, shrink, logit, week_form, h2h_za
from scipy.optimize import brentq, minimize
OUT = os.path.join(os.path.dirname(__file__), '..', 'output')
res = json.load(open(f'{OUT}/qf_results.json')); S, G = grid.load()
def am2p(a): return 100 / (a + 100) if a > 0 else -a / (-a + 100)
def dec2p(d): return 1 / d
def novig(p1, p2): return p1 / (p1 + p2)
MKT = {  # (source, number, timestamp/as-reported, status)
 'QF-A': [('DraftKings ML (Dimers)', 'Gea +100 / ADF -116', novig(am2p(100), am2p(-116)), 'search-reported, Oct 14'),
          ('Pinnacle ML (predictobets)', 'Gea 2.07 / ADF 1.82', novig(dec2p(2.07), dec2p(1.82)), 'search-reported, Oct 14-15'),
          ('Tennis Tonic early prices', 'Gea 2.06 / ADF 1.75', novig(dec2p(2.06), dec2p(1.75)), 'search-reported, Oct 14'),
          ('TA hard Elo (2026-10-05)', 'Gea 1784.6 / ADF 1856.0', 1 / (1 + 10 ** ((1856.0 - 1784.6) / 400)), 'fetched via Exa; pre-Shanghai')],
 'QF-B': [('DraftKings ML (Dimers)', 'Zverev -200 / ADM +175', novig(am2p(-200), am2p(175)), 'search-reported, Oct 14'),
          ('Kalshi via Robinhood', 'Zverev 65c / ADM 36c', novig(0.65, 0.36), 'fetched via Exa, Oct 15 ~00:30 UTC'),
          ('OddsSafari best odds', 'Zverev 1.55 / ADM 2.75', novig(dec2p(1.55), dec2p(2.75)), 'fetched via Exa'),
          ('bet365 (news.bet365)', 'Zverev -200 / ADM +162', novig(am2p(-200), am2p(162)), 'search-reported'),
          ('TA hard Elo (2026-10-05)', 'Zverev 2044.6 / ADM 1943.5', 1 / (1 + 10 ** ((1943.5 - 2044.6) / 400)), 'fetched via Exa; pre-Shanghai')]}
out = {}
for k in ('QF-A', 'QF-B'):
    r = res[k]; mk = [m for m in MKT[k] if 'Elo' not in m[0]]
    cons = float(np.mean([m[2] for m in mk]))
    blind = r['p_win']; gap = blind - cons
    final = 1 / (1 + np.exp(-(0.5 * logit(blind) + 0.5 * logit(cons))))
    out[k] = dict(blind=blind, consensus=cons, gap_pts=gap * 100, final=final, market_table=[dict(source=m[0], number=m[1], p_A_novig=m[2], status=m[3]) for m in MKT[k]])
    print(f'{k}: blind {blind:.4f} consensus {cons:.4f} gap {gap*100:+.1f} pts -> final (50/50 log-odds) {final:.4f}')
# ---- waterfall for QF-B (why 13 pts off)
df = db.load_all(extra=shanghai.frame()); obs = db.serve_obs(df); R = ratings.fit_two_pass(obs, df, '2026-10-07')
def P(pa, pb): return pwin_sets([pa] * 3, [pb] * 3)
for k, (A, B) in {'QF-B': ('Alexander Zverev', 'Alex de Minaur'), 'QF-A': ('Arthur Gea', 'Alejandro Davidovich Fokina')}.items():
    r = res[k]; pa0, pb0 = r['pa_ratings'], r['pb_ratings']; steps = []
    steps.append(('ratings only, iid, no shrink', P(pa0, pb0)))
    pa1, pb1 = pa0 + CFG['pace'], pb0 + CFG['pace']; steps.append(('+ court pace (+1.0 pt each)', P(pa1, pb1)))
    pa2, pb2 = pa1 + r['form_adj_A'], pb1 + r['form_adj_B']; steps.append(('+ this-week form x0.1', P(pa2, pb2)))
    if 'h2h_adj_A' in r: pa3, pb3 = pa2 + r['h2h_adj_A'], pb2 + r['h2h_adj_B']; steps.append(('+ H2H blend', P(pa3, pb3)))
    steps.append(('+ physical/fatigue mixture (iid)', r['p_iid']))
    steps.append((f'+ backtest shrink k={CFG["k_shrink"]}', r['p_win']))
    out[k]['waterfall'] = steps
    print(k, 'waterfall:'); [print(f'   {s:38s} {v:.4f}') for s, v in steps]
# ---- market inversion: solve (pa,pb) from ML (+ total where available) under the day-form model (sd 0.06)
def model_at(pa, pb):
    M = grid.dayform(S, np.array([pa]), np.array([pb]), CFG['dayform_sd'])[0]; Gd = grid.dayform(G, np.array([pa]), np.array([pb]), CFG['dayform_sd'])[0]
    return M, Gd
INV = {'QF-A': dict(ml=out['QF-A']['consensus'], total_line=22.5, p_over=novig(am2p(-135), am2p(-110)), note='total: Sportskeeda O22.5 -135 / U -110 (book unnamed)'),
       'QF-B': dict(ml=out['QF-B']['consensus'], total_line=23.5, p_over=novig(am2p(-105), am2p(-140)), note='total: BetMGM O23.5 -105 / U -140 (via Sportskeeda)')}
for k, d in INV.items():
    def f(x):
        pa, pb = x; M, Gd = model_at(pa, pb); po = Gd[int(d['total_line'] + 0.5):].sum()
        return (M[0] - d['ml']) ** 2 * 10 + (po - d['p_over']) ** 2
    best = minimize(f, x0=[res[k]['pa_final_fit'], res[k]['pb_final_fit']], method='Nelder-Mead', options=dict(xatol=1e-5, fatol=1e-10))
    pa, pb = best.x; M, Gd = model_at(pa, pb)
    out[k]['inversion'] = dict(pa=pa, pb=pb, sum=pa + pb, p_win=M[0], p3=M[1], ptb=M[2], games=M[6], p_over=float(Gd[int(d['total_line'] + 0.5):].sum()), note=d['note'],
                               model_sum=res[k]['pa_final_fit'] + res[k]['pb_final_fit'])
    print(k, 'market-implied pa %.4f pb %.4f (sum %.3f vs model %.3f) -> P3 %.3f PTB %.3f games %.2f' % (pa, pb, pa + pb, out[k]['inversion']['model_sum'], M[1], M[2], M[6]))
json.dump(out, open(f'{OUT}/markets.json', 'w'), indent=1, default=float)
