"""Walk-forward backtest: hard-court tour-level Bo3 matches 2025-01-01..2026-10-06.
Ratings refit (two-pass ridge) at each event start on the prior 730 days; form = earlier-round residuals
in the same event; H2H = time-weighted prior hard meetings."""
import os, sys, re, numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
import db, ratings, shanghai
OUT = os.path.join(os.path.dirname(__file__), '..', 'output'); os.makedirs(OUT, exist_ok=True)
RO = {r: i for i, r in enumerate(['Q1', 'Q2', 'Q3', 'R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'])}
EXCL = re.compile(r'Laver|Next Gen|Davis', re.I)

def sets_of(score):
    s, ret = db.parse_score(score); return [(a, b) for a, b, _ in s], ret

def h2h(obs, s, r, asof, hl=730):
    o = obs[(obs.server == s) & (obs.returner == r) & (obs.date < asof) & (obs.surface == 'Hard') & ~obs.tourney.str.contains('Laver|Next Gen', case=False)]
    if o.empty: return 0.0, np.nan
    w = o.svpt * 0.5 ** ((asof - o.date).dt.days / hl)
    return float(w.sum()), float((w * o.spw / o.svpt).sum() / w.sum())

def event_form(ev, R, P, rnd):
    br = RO.get(rnd, 99); m = ev[((ev.w == P) | (ev.l == P)) & (ev.rnd.map(lambda x: RO.get(x, 99)) < br)]
    ss = sw = rs = rw = 0.0
    for _, r in m.iterrows():
        me = r.w == P; O = r.l if me else r.w
        sv, spw = (r.w_svpt, r.w_spw) if me else (r.l_svpt, r.l_spw)
        ov, opw = (r.l_svpt, r.l_spw) if me else (r.w_svpt, r.w_spw)
        if not (sv > 0 and ov > 0) or pd.isna(spw) or pd.isna(opw): continue
        ss += spw - sv * R.spw(P, O); sw += sv
        rs += (ov - opw) - ov * (1 - R.spw(O, P)); rw += ov
    return (ss / sw if sw else 0.0), (rs / rw if rw else 0.0), sw

def run(start='2025-01-01', end='2026-10-07', min_pts=300):
    df = db.load_all(extra=shanghai.frame()); obs = db.serve_obs(df)
    T = df[(df.date >= start) & (df.date < end) & (df.surface == 'Hard') & (df.bestof == 3) & ~df.tourney.str.contains(EXCL)]
    rng = np.random.default_rng(11); recs = []
    for d0, test in T.groupby('date'):
        R = ratings.fit_two_pass(obs, df, d0)
        for tn, ev in test.groupby('tourney'):
            for _, r in ev.iterrows():
                sets, ret = sets_of(r.score)
                if ret or len(sets) < 2: continue
                flip = rng.random() < 0.5
                A, B = (r.l, r.w) if flip else (r.w, r.l)
                if R.neff_s.get(A, 0) < min_pts or R.neff_s.get(B, 0) < min_pts: continue
                sa = [(y, x) for x, y in sets] if flip else sets
                fsA, frA, nA_ = event_form(ev, R, A, r.rnd); fsB, frB, nB_ = event_form(ev, R, B, r.rnd)
                hnA, hpA = h2h(obs, A, B, d0); hnB, hpB = h2h(obs, B, A, d0)
                svA, spA, svB, spB = (r.l_svpt, r.l_spw, r.w_svpt, r.w_spw) if flip else (r.w_svpt, r.w_spw, r.l_svpt, r.l_spw)
                recs.append(dict(date=d0, tourney=tn, rnd=r.rnd, A=A, B=B, y=int(not flip), pa=R.spw(A, B), pb=R.spw(B, A),
                                 fsA=fsA, frA=frA, fsB=fsB, frB=frB, nfA=nA_, nfB=nB_, hnA=hnA, hpA=hpA, hnB=hnB, hpB=hpB,
                                 nsets=len(sets), tb=int(any((x, y) in ((7, 6), (6, 7)) for x, y in sets)),
                                 games=sum(x + y for x, y in sets), set1A=int(sa[0][0] > sa[0][1]),
                                 actA=spA / svA if svA > 0 else np.nan, actB=spB / svB if svB > 0 else np.nan, src=r.src))
        print(d0.date(), len(recs), flush=True)
    bt = pd.DataFrame(recs); bt.to_pickle(os.path.join(OUT, 'backtest_raw.pkl')); return bt

if __name__ == '__main__':
    run()
