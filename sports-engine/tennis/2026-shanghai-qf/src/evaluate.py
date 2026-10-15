import os, sys, numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
import grid
from scipy.optimize import minimize_scalar
OUT = os.path.join(os.path.dirname(__file__), '..', 'output')
bt = pd.read_pickle(f'{OUT}/backtest_raw.pkl'); S, G = grid.load(); y = bt.y.values
def ll(p, y): p = np.clip(p, 1e-4, 1 - 1e-4); return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
def brier(p, y): return float(np.mean((p - y) ** 2))
def logit(p): p = np.clip(p, 1e-6, 1 - 1e-6); return np.log(p / (1 - p))
def fit_k(p, y): return minimize_scalar(lambda k: ll(1 / (1 + np.exp(-k * logit(p))), y), bounds=(0.2, 1.5), method='bounded').x
def h2h_adj(pa, pb, on):
    if not on: return pa, pb
    wA = bt.hnA / (bt.hnA + 1000); wB = bt.hnB / (bt.hnB + 1000)
    pa = np.where(bt.hnA > 0, (1 - wA) * pa + wA * bt.hpA.fillna(0), pa); pb = np.where(bt.hnB > 0, (1 - wB) * pb + wB * bt.hpB.fillna(0), pb)
    return pa, pb
def form_adj(pa, pb, w): return pa + w * bt.fsA.values - w * bt.frB.values, pb + w * bt.fsB.values - w * bt.frA.values
print(f'n={len(bt)} matches, {bt.date.min().date()} .. {bt.date.max().date()} | actual: P3={bt.nsets.eq(3).mean():.4f} TB={bt.tb.mean():.4f} games={bt.games.mean():.3f}')
pa0, pb0 = bt.pa.values, bt.pb.values
tr = (bt.date < '2026-01-01').values; te = ~tr
rows = []
for sd in (0.0, 0.04, 0.06, 0.085, 0.10, 0.12):
    M = grid.dayform(S, pa0, pb0, sd); p = M[:, 0]
    rows.append(dict(method=f'dayform sd={sd}', acc=np.mean((p > .5) == y), brier=brier(p, y), logloss=ll(p, y), ll_2026=ll(p[te], y[te]),
                     P3=M[:, 1].mean(), TB=M[:, 2].mean(), games=M[:, 6].mean()))
M0 = grid.dayform(S, pa0, pb0, 0.0); p0 = M0[:, 0]
k_tr = fit_k(p0[tr], y[tr]); k_all = fit_k(p0, y); ps = 1 / (1 + np.exp(-k_tr * logit(p0)))
rows.append(dict(method=f'iid + shrink k={k_tr:.2f} (fit 2025; all k={k_all:.2f})', acc=np.mean((ps > .5) == y), brier=brier(ps, y), logloss=ll(ps, y), ll_2026=ll(ps[te], y[te])))
for k in (0.6, 0.71, 0.74):
    pk = 1 / (1 + np.exp(-k * logit(p0))); rows.append(dict(method=f'iid + shrink k={k} (fixed)', acc=np.mean((pk > .5) == y), brier=brier(pk, y), logloss=ll(pk, y), ll_2026=ll(pk[te], y[te])))
rows.append(dict(method='coin flip', acc=.5, brier=.25, logloss=np.log(2), ll_2026=np.log(2)))
R = pd.DataFrame(rows); pd.set_option('display.width', 250); print(R.round(4).to_string(index=False))
R.to_csv(f'{OUT}/bt_variants.csv', index=False)
best_sd = float(R.iloc[:6].sort_values('logloss').iloc[0].method.split('=')[1]); print('best sd by log loss', best_sd)
print('\nForm weight x H2H (day-form sd=%s):' % best_sd)
fr = []
for on in (False, True):
    for w in (0, 0.1, 0.2, 0.3, 0.5):
        pa, pb = h2h_adj(pa0, pb0, on); pa, pb = form_adj(pa, pb, w); p = grid.dayform(S, pa, pb, best_sd)[:, 0]
        sub = (bt.nfA > 0) & (bt.nfB > 0); hs = (bt.hnA > 0)
        fr.append(dict(h2h=on, form_w=w, logloss=ll(p, y), brier=brier(p, y), acc=np.mean((p > .5) == y), ll_bothform=ll(p[sub], y[sub]), n_bothform=int(sub.sum()), ll_h2h_sub=ll(p[hs], y[hs]), n_h2h=int(hs.sum())))
F = pd.DataFrame(fr); print(F.round(5).to_string(index=False)); F.to_csv(f'{OUT}/bt_form_h2h.csv', index=False)
# Calibration of derivative markets at best sd
M = grid.dayform(S, pa0, pb0, best_sd)
s = pa0 + pb0
def grp(mask, name):
    return dict(group=name, n=int(mask.sum()), P3_pred=M[mask, 1].mean(), P3_act=bt.nsets[mask].eq(3).mean(), TB_pred=M[mask, 2].mean(), TB_act=bt.tb[mask].mean(),
                games_pred=M[mask, 6].mean(), games_act=bt.games[mask].mean())
close = np.abs(M[:, 0] - 0.5) < 0.15
cal = [grp(np.ones(len(bt), bool), 'all'), grp(s >= 1.36, 'sum>=1.36'), grp((pa0 >= .68) & (pb0 >= .68), 'both>=0.68'), grp(close & (s >= 1.34), 'close & sum>=1.34'),
       grp(s < 1.26, 'sum<1.26'), grp((s >= 1.26) & (s < 1.36), '1.26<=sum<1.36')]
C = pd.DataFrame(cal); print('\nDerivative calibration (sd=%s):' % best_sd); print(C.round(4).to_string(index=False)); C.to_csv(f'{OUT}/bt_deriv_calib.csv', index=False)
# also at sd=0.085 for comparison with Jonah's spec
M2 = grid.dayform(S, pa0, pb0, 0.085)
print('\nAt sd=0.085: all P3 %.4f TB %.4f games %.3f | sum>=1.36 TB %.4f (act %.4f) | both>=.68 TB %.4f (act %.4f)' % (
    M2[:, 1].mean(), M2[:, 2].mean(), M2[:, 6].mean(), M2[s >= 1.36, 2].mean(), bt.tb[s >= 1.36].mean(), M2[(pa0 >= .68) & (pb0 >= .68), 2].mean(), bt.tb[(pa0 >= .68) & (pb0 >= .68)].mean()))
# winner calibration deciles at best sd
p = M[:, 0]; pf = np.where(p >= .5, p, 1 - p); yf = np.where(p >= .5, y, 1 - y)
bins = pd.qcut(pf, 10, duplicates='drop'); D = pd.DataFrame(dict(b=bins, p=pf, y=yf)).groupby('b', observed=True).agg(n=('y', 'size'), pred=('p', 'mean'), act=('y', 'mean'))
print('\nWinner calibration by decile (favourite side):'); print(D.round(3).to_string()); D.to_csv(f'{OUT}/bt_calib_deciles.csv')
