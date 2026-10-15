"""Vectorized game-level Bo3 Monte Carlo with per-sim, per-set serve probabilities.
Games drawn from exact hold probabilities; 7-pt tiebreaks from exact (vectorized) TB DP."""
import numpy as np
from pointmodel import p_hold

def p_tb_vec(pa, pb, a_first):
    """vectorized exact TB win prob for A; a_first boolean array."""
    n = len(pa); P = np.zeros((n, 8, 8)); P[:, 0, 0] = 1; win = np.zeros(n)
    for tot in range(12):
        first = (tot == 0) or (((tot - 1) // 2) % 2 == 1)
        a_srv = np.where(a_first, first, not first)
        pw = np.where(a_srv, pa, 1 - pb)
        for i in range(7):
            j = tot - i
            if j < 0 or j > 6: continue
            cur = P[:, i, j]
            if i + 1 == 7: win += cur * pw
            else: P[:, i + 1, j] += cur * pw
            if j + 1 < 7: P[:, i, j + 1] += cur * (1 - pw)
    w = pa * (1 - pb); l = (1 - pa) * pb
    return win + P[:, 6, 6] * w / (w + l)

def simulate(pa_s, pb_s, rng):
    """pa_s, pb_s: (n,3) per-set serve-win probs. Returns dict of arrays."""
    n = pa_s.shape[0]
    a_first = rng.random(n) < 0.5
    sa = np.zeros(n, int); sb = np.zeros(n, int); games = np.zeros(n, int); gA_tot = np.zeros(n, int)
    ntb = np.zeros(n, int); tbA = np.zeros(n, int); tbB = np.zeros(n, int)
    svgA = np.zeros(n); svgB = np.zeros(n); tbpts = np.zeros(n)
    scores = np.zeros((n, 3, 2), int) - 1
    for s in range(3):
        active = (sa < 2) & (sb < 2)
        hA = p_hold(pa_s[:, s]); hB = p_hold(pb_s[:, s])
        ga = np.zeros(n, int); gb = np.zeros(n, int); srvA = a_first.copy(); done = ~active
        for g in range(12):
            live = ~done
            if not live.any(): break
            u = rng.random(n)
            winA = np.where(srvA, u < hA, u >= hB)
            svgA += live & srvA; svgB += live & ~srvA
            ga += live & winA; gb += live & ~winA
            srvA = np.where(live, ~srvA, srvA)
            fin = ((ga >= 6) & (ga - gb >= 2)) | ((gb >= 6) & (gb - ga >= 2))
            done = done | (live & fin)
        tbm = (~done) & (ga == 6) & (gb == 6)
        if tbm.any():
            ptb = p_tb_vec(pa_s[:, s], pb_s[:, s], srvA)
            w = rng.random(n) < ptb
            ga += tbm & w; gb += tbm & ~w
            ntb += tbm; tbA += tbm & w; tbB += tbm & ~w; tbpts += tbm * 12.5
        nt = ga + gb
        scores[:, s, 0] = np.where(active, ga, -1); scores[:, s, 1] = np.where(active, gb, -1)
        games += np.where(active, nt, 0); gA_tot += np.where(active, ga, 0)
        sa += active & (ga > gb); sb += active & (gb > ga)
        a_first = np.where(active & (nt % 2 == 1), ~a_first, a_first)
    return dict(winA=sa == 2, nsets=sa + sb, games=games, margin=2 * gA_tot - games, ntb=ntb, tbA=tbA, tbB=tbB,
                svgA=svgA, svgB=svgB, tbpts=tbpts, scores=scores)
