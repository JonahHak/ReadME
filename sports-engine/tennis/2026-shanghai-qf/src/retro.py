"""Retro-checks with the exact same method (ratings as of event start, form from earlier rounds x0.1, shrink k=0.58, day-form 0.06)."""
import os, sys, numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
import db, ratings, shanghai, grid
from backtest import event_form
from qf_model import shrink, CFG, week_form
from pointmodel import match_summary
df = db.load_all(extra=shanghai.frame()); obs = db.serve_obs(df); S, G = grid.load()
def show(name, A, B, asof, fa=(0, 0), fb=(0, 0), pace=0.0, actual=''):
    R = ratings.fit_two_pass(obs, df, asof)
    pa = R.spw(A, B) + pace + CFG['form_w'] * (fa[0] - fb[1]); pb = R.spw(B, A) + pace + CFG['form_w'] * (fb[0] - fa[1])
    m = match_summary(pa, pb); M = grid.dayform(S, np.array([pa]), np.array([pb]), CFG['dayform_sd'])[0]
    print(f'{name}: {A} SPW {pa:.3f} vs {B} {pb:.3f} | P({A}) {shrink(m["pwin"], CFG["k_shrink"]):.3f} | P3 {M[1]:.3f} TB {M[2]:.3f} games {M[6]:.1f} | actual: {actual}')
# Zverev - de Minaur, Indian Wells 2024 R16 (last hard tour-level meeting; data window starts 2023-01)
ev = df[(df.tourney.str.contains('Indian Wells')) & (df.date.dt.year == 2024)]
R = ratings.fit_two_pass(obs, df, '2024-03-04')
fa = event_form(ev, R, 'Alexander Zverev', 'R16'); fb = event_form(ev, R, 'Alex de Minaur', 'R16')
show('IW 2024 R16', 'Alexander Zverev', 'Alex de Minaur', '2024-03-04', fa[:2], fb[:2], actual='Zverev won 5-7 6-2 6-3 (29 games, 3 sets, 0 TB)')
# Laver Cup 2026 (team event, match-TB 3rd set; shown for reference only)
show('Laver Cup 2026 (ref only, format differs)', 'Alexander Zverev', 'Alex de Minaur', '2026-09-25', actual='de Minaur won 2-6 7-6(5) [11-9]')
# ADF - Hurkacz Shanghai R16 Oct 13 (form from R64/R32 this week)
R7 = ratings.fit_two_pass(obs, df, '2026-10-07')
def wf(P, upto):
    t, s, r = week_form(R7, P); t = t[t.rnd.isin(upto)]
    return (np.average(t.s_res, weights=t.svpt), np.average(t.r_res, weights=t.rtpt)) if len(t) else (0, 0)
fa = wf('Alejandro Davidovich Fokina', ['R64', 'R32'])
show('Shanghai R16 2026', 'Alejandro Davidovich Fokina', 'Hubert Hurkacz', '2026-10-07', fa, (0, 0), pace=CFG['pace'], actual='ADF won 1-6 6-3 7-6(6) (29 games, 3 sets, 1 TB)')
show('Shanghai R16 2026', 'Alexander Zverev', 'Alexander Bublik', '2026-10-07', wf('Alexander Zverev', ['R64', 'R32']), (0, 0), pace=CFG['pace'], actual='Zverev won 7-6(6) 4-6 7-6(1) (32 games, 3 sets, 2 TB)')
