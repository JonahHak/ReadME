"""Precomputed exact Bo3 summaries on a (pa,pb) grid + Gauss-Hermite day-form integration."""
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from pointmodel import match_summary
LO, HI, ST = 0.40, 0.92, 0.01
AX = np.round(np.arange(LO, HI + 1e-9, ST), 4); N = len(AX)
F = os.path.join(os.path.dirname(__file__), '..', 'data', 'grid.npz')
def build():
    S = np.zeros((N, N, 7)); G = np.zeros((N, N, 40))
    for i, a in enumerate(AX):
        for j, b in enumerate(AX):
            r = match_summary(a, b)
            S[i, j] = [r['pwin'], r['p3'], r['ptb'], r['tbA'], r['tbB'], r['set1A'], r['games_mean']]
            G[i, j] = r['games']
    np.savez(F, S=S, G=G)
def load():
    d = np.load(F); return d['S'], d['G']
def interp(T, pa, pb):
    x = (np.clip(pa, LO, HI - 1e-9) - LO) / ST; y = (np.clip(pb, LO, HI - 1e-9) - LO) / ST
    i = np.floor(x).astype(int); j = np.floor(y).astype(int); fx = (x - i)[..., None]; fy = (y - j)[..., None]
    return (T[i, j] * (1 - fx) * (1 - fy) + T[i + 1, j] * fx * (1 - fy) + T[i, j + 1] * (1 - fx) * fy + T[i + 1, j + 1] * fx * fy)
GH_X, GH_W = np.polynomial.hermite_e.hermegauss(9); GH_W = GH_W / GH_W.sum()
def dayform(T, pa, pb, sd):
    pa = np.atleast_1d(pa); pb = np.atleast_1d(pb)
    if sd == 0: return interp(T, pa, pb)
    out = 0
    for xa, wa in zip(GH_X, GH_W):
        for xb, wb in zip(GH_X, GH_W):
            out = out + wa * wb * interp(T, pa + sd * xa, pb + sd * xb)
    return out
if __name__ == '__main__':
    import time; t = time.time(); build(); print('grid built', time.time() - t)
