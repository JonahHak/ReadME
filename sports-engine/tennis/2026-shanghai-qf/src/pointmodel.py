"""Exact Bo3 point model (pa = P(A wins point on A serve), pb = P(B wins point on B serve)).
Game: closed form. Tiebreak: exact 7-pt DP. Set: exact score distribution by first server.
Match: exact distribution of set scores, total games, TB counts."""
import numpy as np
from functools import lru_cache

def p_hold(p):
    p = np.clip(p, 1e-6, 1 - 1e-6); q = 1 - p
    return p**4 * (1 + 4*q + 10*q*q) + 20 * p**3 * q**3 * p*p / (1 - 2*p*q)

def p_tb(pa, pb, a_first=True):
    """P(A wins 7-pt tiebreak). Serve order: first server serves pt1, then 2 each alternately."""
    def a_serves(k):  # k = 0-based point index
        first = (k == 0) or (((k - 1) // 2) % 2 == 1)
        return first if a_first else (not first)
    P = np.zeros((8, 8)); P[0, 0] = 1.0; win = 0.0
    for tot in range(0, 12):
        for i in range(0, 7):
            j = tot - i
            if j < 0 or j > 6 or P[i, j] == 0: continue
            pw = pa if a_serves(tot) else 1 - pb
            # A wins point
            if i + 1 == 7: win += P[i, j] * pw
            else: P[i + 1, j] += P[i, j] * pw
            if j + 1 == 7: pass
            else: P[i, j + 1] += P[i, j] * (1 - pw)
    # 6-6: points 12,13 pair: each server once -> win-by-2 geometric
    w = pa * (1 - pb); l = (1 - pa) * pb
    win += P[6, 6] * w / (w + l)
    return win

def set_dist(pa, pb, a_first=True):
    """dict {(ga,gb): prob} for one set with 7-pt TB at 6-6."""
    hA, hB = p_hold(pa), p_hold(pb)
    tA = p_tb(pa, pb, a_first)
    out = {}
    P = {(0, 0): 1.0}
    for tot in range(0, 12):
        newP = {}
        for (i, j), pr in P.items():
            if i + j != tot: newP[(i, j)] = newP.get((i, j), 0) + pr; continue
            a_srv = (tot % 2 == 0) == a_first
            pw = hA if a_srv else 1 - hB
            for (ni, nj, pp) in ((i + 1, j, pw), (i, j + 1, 1 - pw)):
                done = (ni >= 6 and ni - nj >= 2) or (nj >= 6 and nj - ni >= 2) or ni == 7 or nj == 7
                if done: out[(ni, nj)] = out.get((ni, nj), 0) + pr * pp
                else: newP[(ni, nj)] = newP.get((ni, nj), 0) + pr * pp
        P = {k: v for k, v in newP.items() if (k[0] + k[1]) > tot or k in newP}
        P = {k: v for k, v in P.items() if k not in out or (k[0]+k[1]) == tot+1}
    pr66 = P.get((6, 6), 0.0)
    out[(7, 6)] = out.get((7, 6), 0) + pr66 * tA
    out[(6, 7)] = out.get((6, 7), 0) + pr66 * (1 - tA)
    return out

def match_summary(pa, pb, a_first_prob=0.5, games_max=40):
    """Exact Bo3 summary averaged over coin toss for first server."""
    res = dict(pwin=0, p3=0, ptb=0, tbA=0, tbB=0, set1A=0)
    games = np.zeros(games_max); margin = {}
    sets = {}
    SD = {True: set_dist(pa, pb, True), False: set_dist(pa, pb, False)}
    for a_first, wfirst in ((True, a_first_prob), (False, 1 - a_first_prob)):
        # state: (setsA, setsB, a_first, games, anyTB, tbA, tbB, gmA, gmB) -> enumerate
        stack = [((0, 0), a_first, 0, 0, 0, 0, wfirst, [])]
        while stack:
            (sa, sb), af, g, tA, tB, gA, prob, hist = stack.pop()
            if sa == 2 or sb == 2:
                res['pwin'] += prob * (sa == 2); res['p3'] += prob * (sa + sb == 3)
                res['ptb'] += prob * ((tA + tB) > 0); res['tbA'] += prob * (tA > 0); res['tbB'] += prob * (tB > 0)
                res['set1A'] += prob * (hist[0][0] > hist[0][1])
                games[g] += prob
                m = 2 * gA - g; margin[m] = margin.get(m, 0) + prob
                key = ' '.join(f'{x}-{y}' for x, y in hist); sets[key] = sets.get(key, 0) + prob
                continue
            for (x, y), pp in SD[af].items():
                nt = x + y
                stack.append(((sa + (x > y), sb + (y > x)), af if nt % 2 == 0 else (not af), g + nt,
                              tA + (x == 7 and y == 6), tB + (y == 7 and x == 6), gA + x, prob * pp, hist + [(x, y)]))
    res['games'] = games; res['margin'] = margin; res['scores'] = sets
    res['games_mean'] = float((np.arange(games_max) * games).sum())
    return res

if __name__ == '__main__':
    import time
    t = time.time(); r = match_summary(0.66, 0.64); print(time.time() - t)
    print({k: round(v, 4) for k, v in r.items() if isinstance(v, float)})
    print(sum(r['scores'].values()), sorted(r['scores'].items(), key=lambda kv: -kv[1])[:5])
