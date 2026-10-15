"""Shanghai 2026 QF model. Ratings (pre-Shanghai, as of 2026-10-07) + court pace + this-week form + H2H
+ physical mixture -> exact winner (iid + backtest shrink) and 40k-sim Monte Carlo derivatives (day-form sd 0.06)."""
import os, sys, json, numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
import db, ratings, shanghai, grid, mc
from exactsets import pwin_sets
from pointmodel import match_summary
OUT = os.path.join(os.path.dirname(__file__), '..', 'output')
ASOF = pd.Timestamp('2026-10-07'); MATCHDAY = pd.Timestamp('2026-10-15')
CFG = dict(pace=0.010, form_w=0.10, form_w_spec=0.50, k_shrink=0.58, dayform_sd=0.06, n_sims=40000, n_draws=3000,
           tb_uplift_sum136=0.04, tb_uplift_both68=0.08, ace_pace=10.7 / 9.4, h2h_k=1000.0, h2h_halflife=730)

def logit(p): return np.log(p / (1 - p))
def shrink(p, k): return 1 / (1 + np.exp(-k * logit(np.clip(p, 1e-6, 1 - 1e-6))))

def spw_r(R, s, r, ranks):
    """expected SPW with rank-prior fallback for players outside the ridge network."""
    ca, cb = R.prior_coef
    a = R.a[s] if s in R.a.index else ca[0] + ca[1] * np.log(ranks.get(s, 150))
    b = R.b[r] if r in R.b.index else cb[0] + cb[1] * np.log(ranks.get(r, 150))
    return R.mu + a - b

SH_RANKS = {'Jaime Faria': 60, 'Yibing Wu': 113, 'Rei Sakamoto': 137, 'Jenson Brooksby': 102, 'Ugo Humbert': 32, 'Ben Shelton': 7,
            'Jakub Mensik': 14, 'Frances Tiafoe': 10, 'Hubert Hurkacz': 39, 'Quentin Halys': 48, 'Alexander Bublik': 22, 'Karen Khachanov': 27}

def week_form(R, P):
    rows = []
    for w, l, rnd, sc, mins, ws, wp, ls, lp, wa, la, src in shanghai.ROWS:
        if P not in (w, l): continue
        me = P == w; O = l if me else w
        sv, sp = (ws, wp) if me else (ls, lp); ov, op = (ls, lp) if me else (ws, wp)
        es = spw_r(R, P, O, SH_RANKS) + CFG['pace']; eo = spw_r(R, O, P, SH_RANKS) + CFG['pace']
        rows.append(dict(player=P, rnd=rnd, opp=O, svpt=sv, spw=sp / sv, exp_spw=es, s_res=sp / sv - es, rtpt=ov, rpw=1 - op / ov, exp_rpw=1 - eo, r_res=(1 - op / ov) - (1 - eo)))
    t = pd.DataFrame(rows)
    s_res = np.average(t.s_res, weights=t.svpt); r_res = np.average(t.r_res, weights=t.rtpt)
    return t, s_res, r_res

# Zverev-de Minaur H2H on hard (Tennis Abstract match stats; RG 2024 clay excluded).
# (date, event, Z_svpt, Z_SPW, ADM_svpt, ADM_SPW, include_frac)
H2H_ZA = [('2026-09-25', 'Laver Cup (2 sets + match TB; TB points removed ~10/server)', 75, 0.640, 70, 0.614, None),
          ('2025-09-19', 'Laver Cup (regular sets)', 50, 0.480, 60, 0.667, 1.0),
          ('2024-03-04', 'Indian Wells R16', 115, 0.609, 78, 0.577, 1.0),
          ('2024-01-01', 'United Cup SF', 83, 0.687, 97, 0.691, 1.0),
          ('2021-10-25', 'Vienna R16', 71, 0.718, 73, 0.616, 1.0),
          ('2020-01-06', 'ATP Cup RR', 106, 0.604, 101, 0.653, 1.0),
          ('2019-02-25', 'Acapulco QF', 50, 0.800, 55, 0.709, 1.0),
          ('2018-10-08', 'Shanghai R16', 52, 0.750, 50, 0.540, 1.0),
          ('2018-07-30', 'Washington F', 48, 0.771, 58, 0.569, 1.0),
          ('2018-02-02', 'Davis Cup (Bo5)', 167, 0.683, 159, 0.660, 1.0)]

def h2h_za():
    nZ = sZ = nA = sA = 0.0
    for d, ev, zs, zp, as_, ap, frac in H2H_ZA:
        age = (MATCHDAY - pd.Timestamp(d)).days; dec = 0.5 ** (age / CFG['h2h_halflife'])
        zs_eff = zs - 10 if frac is None else zs; as_eff = as_ - 10 if frac is None else as_
        nZ += zs_eff * dec; sZ += zs_eff * dec * zp; nA += as_eff * dec; sA += as_eff * dec * ap
    return nZ, sZ / nZ, nA, sA / nA

def ace_model(obs, server, returner, asof=ASOF, halflife=365, k=25.0, iters=10):
    o = obs[(obs.date < asof) & (obs.date >= asof - pd.Timedelta(days=730)) & (obs.surface == 'Hard') & obs.ace.notna() & (obs.svpt > 0)]
    w = 0.5 ** ((asof - o.date).dt.days.values / halflife)
    base = float((w * o.ace).sum() / (w * o.svpt).sum())
    S = pd.Series(1.0, index=pd.Index(o.server.unique())); Rr = pd.Series(1.0, index=pd.Index(o.returner.unique()))
    for _ in range(iters):
        num = pd.Series(w * o.ace.values).groupby(o.server.values).sum(); den = pd.Series(w * o.svpt.values * base * Rr.reindex(o.returner).values).groupby(o.server.values).sum()
        S = (num + k) / (den + k)
        num = pd.Series(w * o.ace.values).groupby(o.returner.values).sum(); den = pd.Series(w * o.svpt.values * base * S.reindex(o.server).values).groupby(o.returner.values).sum()
        Rr = (num + k) / (den + k)
    return base * S.get(server, 1) * Rr.get(returner, 1) * CFG['ace_pace'], float(S.get(server, 1)), float(Rr.get(returner, 1)), base

def run_match(name, A, B, R, obs, seed, phys=None, fatigue=None, extra_sd=(0.0, 0.0), use_h2h=False):
    rng = np.random.default_rng(seed)
    pa0, pb0 = R.spw(A, B), R.spw(B, A)
    sdA = (R.var_pair(A, B) + extra_sd[0] ** 2) ** 0.5; sdB = (R.var_pair(B, A) + extra_sd[1] ** 2) ** 0.5
    tA, fsA, frA = week_form(R, A); tB, fsB, frB = week_form(R, B)
    w = CFG['form_w']
    pa = pa0 + CFG['pace'] + w * fsA - w * frB; pb = pb0 + CFG['pace'] + w * fsB - w * frA
    info = dict(match=name, A=A, B=B, pa_ratings=pa0, pb_ratings=pb0, sdA=sdA, sdB=sdB, pace=CFG['pace'],
                formA_serve=fsA, formA_return=frA, formB_serve=fsB, formB_return=frB, form_w=w,
                form_adj_A=w * fsA - w * frB, form_adj_B=w * fsB - w * frA)
    if use_h2h:
        nZ, hZ, nA_, hA_ = h2h_za(); wZ = nZ / (nZ + CFG['h2h_k']); wA = nA_ / (nA_ + CFG['h2h_k'])
        pa_h = (1 - wZ) * pa + wZ * (hZ + CFG['pace']); pb_h = (1 - wA) * pb + wA * (hA_ + CFG['pace'])
        info.update(h2h_nA=nZ, h2h_spwA=hZ, h2h_wA=wZ, h2h_nB=nA_, h2h_spwB=hA_, h2h_wB=wA, h2h_adj_A=pa_h - pa, h2h_adj_B=pb_h - pb)
        pa, pb = pa_h, pb_h
    info.update(pa_final_fit=pa, pb_final_fit=pb)
    # per-set state arrays (fit state)
    def sets_arrays(pa_, pb_, limited):
        A3 = np.array([pa_] * 3, float); B3 = np.array([pb_] * 3, float)
        if phys and limited:
            sh = np.array(phys['serve_hit_by_set']); rh = np.array(phys['return_hit_by_set'])
            if phys['player'] == A: A3 = A3 - sh; B3 = B3 + rh
            else: B3 = B3 - sh; A3 = A3 + rh
        if fatigue:
            if fatigue['player'] == A: A3[2] -= fatigue.get('set3_serve_hit', 0); B3[2] += fatigue.get('set3_return_hit', 0)
            else: B3[2] -= fatigue.get('set3_serve_hit', 0); A3[2] += fatigue.get('set3_return_hit', 0)
        return A3, B3
    plim = phys['p_limited'] if phys else 0.0
    # ---- winner: exact iid at point estimates, mixture, then shrink
    Af, Bf = sets_arrays(pa, pb, False); Al, Bl = sets_arrays(pa, pb, True)
    p_fit = pwin_sets(Af, Bf); p_lim = pwin_sets(Al, Bl) if phys else p_fit
    p_iid = (1 - plim) * p_fit + plim * p_lim
    p_win = shrink(p_iid, CFG['k_shrink'])
    info.update(p_iid_fit=p_fit, p_iid_limited=p_lim, p_limited=plim, p_iid=p_iid, p_win=p_win, p_win_if_fit=shrink(p_fit, CFG['k_shrink']), p_win_if_limited=shrink(p_lim, CFG['k_shrink']))
    # ---- parameter-uncertainty band
    nd = CFG['n_draws']; dA = rng.normal(0, sdA, nd); dB = rng.normal(0, sdB, nd)
    if phys:
        sdl = phys['p_limited_sd']; m = plim; ab = m * (1 - m) / sdl ** 2 - 1; pis = rng.beta(m * ab, (1 - m) * ab, nd)
    else: pis = np.zeros(nd)
    draws = np.empty(nd)
    # cache: exact pwin is smooth -> evaluate on a coarse lattice of offsets and interpolate
    offs = np.linspace(-3.5, 3.5, 15)
    LF = np.zeros((15, 15)); LL = np.zeros((15, 15))
    for i, oa in enumerate(offs):
        for j, ob in enumerate(offs):
            a_, b_ = pa + oa * sdA, pb + ob * sdB
            A1, B1 = sets_arrays(a_, b_, False); LF[i, j] = pwin_sets(A1, B1)
            if phys: A2, B2 = sets_arrays(a_, b_, True); LL[i, j] = pwin_sets(A2, B2)
            else: LL[i, j] = LF[i, j]
    from scipy.interpolate import RegularGridInterpolator
    fF = RegularGridInterpolator((offs, offs), LF); fL = RegularGridInterpolator((offs, offs), LL)
    pts = np.column_stack([np.clip(dA / sdA, -3.5, 3.5), np.clip(dB / sdB, -3.5, 3.5)])
    pd_ = (1 - pis) * fF(pts) + pis * fL(pts); draws = shrink(pd_, CFG['k_shrink'])
    info.update(band80=(float(np.percentile(draws, 10)), float(np.percentile(draws, 90))), band_sd=float(draws.std()))
    # ---- Monte Carlo derivatives with day-form + parameter uncertainty + mixture
    n = CFG['n_sims']
    shockA = rng.normal(0, sdA, n) + rng.normal(0, CFG['dayform_sd'], n); shockB = rng.normal(0, sdB, n) + rng.normal(0, CFG['dayform_sd'], n)
    if phys:
        pi_s = rng.beta(m * ab, (1 - m) * ab, n); lim = rng.random(n) < pi_s
    else: lim = np.zeros(n, bool)
    PA = np.tile(Af, (n, 1)) + shockA[:, None]; PB = np.tile(Bf, (n, 1)) + shockB[:, None]
    if phys:
        PA[lim] += (Al - Af); PB[lim] += (Bl - Bf)
    PA = np.clip(PA, 0.35, 0.95); PB = np.clip(PB, 0.35, 0.95)
    r = mc.simulate(PA, PB, rng)
    s_sum = pa + pb
    up = CFG['tb_uplift_both68'] if (pa >= .68 and pb >= .68) else (CFG['tb_uplift_sum136'] if s_sum >= 1.36 else 0.0)
    keys = [' '.join(f'{x}-{y}' for x, y in sc if x >= 0) for sc in r['scores']]
    vc = pd.Series(keys).value_counts(normalize=True)
    set_scores = pd.Series([('%s 2-%d' % (A, 1 if ns == 3 else 0)) if wA else ('%s 2-%d' % (B, 1 if ns == 3 else 0)) for wA, ns in zip(r['winA'], r['nsets'])]).value_counts(normalize=True)
    g = r['games']; mg = r['margin']
    info.update(mc_pwin_dayform=float(r['winA'].mean()), p3=float((r['nsets'] == 3).mean()), ptb_raw=float((r['ntb'] > 0).mean()), tb_uplift=up,
                ptb=float(min(0.99, (r['ntb'] > 0).mean() + up)), p_tbA=float((r['tbA'] > 0).mean()), p_tbB=float((r['tbB'] > 0).mean()),
                set1A=float(np.mean(r['scores'][:, 0, 0] > r['scores'][:, 0, 1])), games_mean=float(g.mean()), games_median=float(np.median(g)),
                games_sd=float(g.std()), margin_mean=float(mg.mean()),
                p_over={str(x): float((g > x).mean()) for x in (19.5, 20.5, 21.5, 22.5, 23.5, 24.5, 25.5)},
                p_A_cover={str(x): float((mg + x > 0).mean()) for x in (-5.5, -4.5, -3.5, -2.5, -1.5, 1.5, 2.5, 3.5, 4.5, 5.5)},
                set_scores=set_scores.round(4).to_dict(), exact_top=vc.head(12).round(4).to_dict(), modal_exact=vc.index[0],
                mc_n=n, seed=seed, limited_frac=float(lim.mean()))
    # aces
    aA = ace_model(obs, A, B); aB = ace_model(obs, B, A)
    from db import pts_per_game
    svptA = r['svgA'] * pts_per_game(PA.mean(1)) + r['tbpts'] / 2; svptB = r['svgB'] * pts_per_game(PB.mean(1)) + r['tbpts'] / 2
    info.update(ace_rate_A=aA[0], ace_rate_B=aB[0], aces_A=float((svptA * aA[0]).mean()), aces_B=float((svptB * aB[0]).mean()), aces_total=float((svptA * aA[0] + svptB * aB[0]).mean()),
                ace_detail=dict(A=aA, B=aB))
    # spec-sensitivity: form x0.5 (Jonah spec) and H2H toggles
    w2 = CFG['form_w_spec']; pa2 = pa0 + CFG['pace'] + w2 * fsA - w2 * frB; pb2 = pb0 + CFG['pace'] + w2 * fsB - w2 * frA
    A2f, B2f = sets_arrays(pa2, pb2, False); A2l, B2l = sets_arrays(pa2, pb2, True)
    p2 = (1 - plim) * pwin_sets(A2f, B2f) + plim * (pwin_sets(A2l, B2l) if phys else pwin_sets(A2f, B2f))
    info.update(sens_form05_pwin=shrink(p2, CFG['k_shrink']), sens_no_phys_pwin=shrink(p_fit, CFG['k_shrink']),
                form_table=pd.concat([tA, tB]).round(4).to_dict('records'))
    return info

def main():
    df = db.load_all(extra=shanghai.frame()); obs = db.serve_obs(df)
    R = ratings.fit_two_pass(obs, df, ASOF)
    res = {}
    res['QF-A'] = run_match('QF-A', 'Arthur Gea', 'Alejandro Davidovich Fokina', R, obs, seed=20261015,
                            fatigue=dict(player='Alejandro Davidovich Fokina', set3_serve_hit=0.0, set3_return_hit=0.010),
                            extra_sd=(0.010, 0.004))
    res['QF-B'] = run_match('QF-B', 'Alexander Zverev', 'Alex de Minaur', R, obs, seed=20261016, use_h2h=True,
                            phys=dict(player='Alexander Zverev', p_limited=0.50, p_limited_sd=0.12,
                                      serve_hit_by_set=[0.005, 0.020, 0.030], return_hit_by_set=[0.005, 0.015, 0.025]))
    json.dump(res, open(f'{OUT}/qf_results.json', 'w'), indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
    for k, v in res.items():
        print('=====', k, v['A'], 'vs', v['B'])
        for f in ['pa_ratings', 'pb_ratings', 'sdA', 'sdB', 'formA_serve', 'formA_return', 'formB_serve', 'formB_return', 'form_adj_A', 'form_adj_B',
                  'h2h_nA', 'h2h_spwA', 'h2h_wA', 'h2h_nB', 'h2h_spwB', 'h2h_wB', 'h2h_adj_A', 'h2h_adj_B', 'pa_final_fit', 'pb_final_fit',
                  'p_iid_fit', 'p_iid_limited', 'p_iid', 'p_win', 'p_win_if_fit', 'p_win_if_limited', 'band80', 'mc_pwin_dayform', 'p3', 'ptb_raw', 'tb_uplift', 'ptb', 'p_tbA', 'p_tbB',
                  'set1A', 'games_mean', 'games_median', 'games_sd', 'margin_mean', 'modal_exact', 'aces_A', 'aces_B', 'aces_total', 'sens_form05_pwin', 'sens_no_phys_pwin', 'limited_frac']:
            if f in v: print(f'  {f}: {np.round(v[f], 4) if not isinstance(v[f], str) else v[f]}')
        print('  set_scores', v['set_scores']); print('  exact_top', list(v['exact_top'].items())[:8])
        print('  p_over', v['p_over']); print('  p_A_cover', v['p_A_cover'])
    return res

if __name__ == '__main__':
    main()
