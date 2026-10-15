"""Weighted ridge on serve-point outcomes: SPW(s vs r) = mu + a_s - b_r.
w = svpt * 0.5**(age/halflife), 730-day window, lam pseudo-points shrinking a,b toward prior means.
Two-pass: pass-2 prior means from log(median rank) regression on well-sampled players (fixes thinly
connected / Challenger-heavy players being treated as tour-average)."""
import numpy as np, pandas as pd
import scipy.sparse as sp, scipy.sparse.linalg as spl

class Ridge:
    def __init__(self, obs, asof, window=730, halflife=365, lam=150.0, surface='Hard', prior_a=None, prior_b=None):
        asof = pd.Timestamp(asof)
        o = obs[(obs.date < asof) & (obs.date >= asof - pd.Timedelta(days=window))]
        if surface: o = o[o.surface == surface]
        o = o[o.svpt > 0]
        players = pd.Index(sorted(set(o.server) | set(o.returner)))
        n = len(players); self.players = players; self.idx = {p: i for i, p in enumerate(players)}
        si = players.get_indexer(o.server); ri = players.get_indexer(o.returner)
        age = (asof - o.date).dt.days.values
        w = o.svpt.values * 0.5 ** (age / halflife)
        y = (o.spw / o.svpt).values
        m = len(o)
        # columns: mu, a_0..a_{n-1}, b_0..b_{n-1}
        rows = np.repeat(np.arange(m), 3)
        cols = np.column_stack([np.zeros(m, int), 1 + si, 1 + n + ri]).ravel()
        vals = np.column_stack([np.ones(m), np.ones(m), -np.ones(m)]).ravel()
        X = sp.csr_matrix((vals, (rows, cols)), shape=(m, 1 + 2 * n))
        W = sp.diags(w)
        pa = np.zeros(n) if prior_a is None else np.array([prior_a.get(p, 0.0) for p in players])
        pb = np.zeros(n) if prior_b is None else np.array([prior_b.get(p, 0.0) for p in players])
        P = sp.diags(np.r_[0.0, np.full(2 * n, lam)])
        A = (X.T @ W @ X + P).tocsc()
        rhs = X.T @ (w * y) + np.r_[0.0, lam * pa, -lam * pb] * np.r_[0, np.ones(n), -np.ones(n)]
        # note: penalty is lam*(a-pa)^2 + lam*(b-pb)^2 -> rhs adds lam*pa for a, lam*pb for b
        rhs = X.T @ (w * y) + np.r_[0.0, lam * pa, lam * pb]
        beta = spl.spsolve(A, rhs)
        self.mu = beta[0]; self.a = pd.Series(beta[1:1 + n], players); self.b = pd.Series(beta[1 + n:], players)
        self.neff_s = pd.Series(np.bincount(si, weights=w, minlength=n), players)
        self.neff_r = pd.Series(np.bincount(ri, weights=w, minlength=n), players)
        resid = y - X @ beta
        self.sigma2 = float(np.sum(w * resid ** 2) / np.sum(o.svpt.values * 0.5 ** (age / halflife)) * 1.0)
        self._A = A; self._n = n; self.asof = asof
        self.obs_used = o

    def spw(self, s, r):
        return self.mu + self.a.get(s, 0.0) - self.b.get(r, 0.0)

    def var_pair(self, s, r):
        """Approx posterior variance of mu + a_s - b_r (per-point variance ~ p(1-p))."""
        c = np.zeros(1 + 2 * self._n); c[0] = 1
        if s in self.idx: c[1 + self.idx[s]] = 1
        if r in self.idx: c[1 + self._n + self.idx[r]] = -1
        x = spl.spsolve(self._A, c)
        p = self.spw(s, r)
        return float(c @ x) * p * (1 - p)

def median_rank(df, asof, window=730):
    asof = pd.Timestamp(asof)
    d = df[(df.date < asof) & (df.date >= asof - pd.Timedelta(days=window))]
    r = pd.concat([d[['w', 'wrank']].rename(columns={'w': 'p', 'wrank': 'r'}), d[['l', 'lrank']].rename(columns={'l': 'p', 'lrank': 'r'})])
    return r.dropna().groupby('p').r.median()

def fit_two_pass(obs, df, asof, min_neff=1500, **kw):
    R1 = Ridge(obs, asof, **kw)
    mr = median_rank(df, asof)
    good = [p for p in R1.players if R1.neff_s[p] >= min_neff and p in mr.index]
    x = np.log(mr[good].values); X = np.column_stack([np.ones(len(x)), x])
    ca = np.linalg.lstsq(X, R1.a[good].values, rcond=None)[0]; cb = np.linalg.lstsq(X, R1.b[good].values, rcond=None)[0]
    lr = np.log(mr.clip(1, 2000))
    prior_a = {p: ca[0] + ca[1] * lr[p] for p in mr.index}; prior_b = {p: cb[0] + cb[1] * lr[p] for p in mr.index}
    R2 = Ridge(obs, asof, prior_a=prior_a, prior_b=prior_b, **kw)
    R2.prior_coef = (ca, cb); R2.median_rank = mr
    return R2
