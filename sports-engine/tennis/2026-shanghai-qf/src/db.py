"""Unified hard/clay/grass tour-level match table: TML (2023-Jan 2026, exact counts) + Tennis Abstract
2026 tournament tables (percentages; serve points estimated from the score)."""
import os, re, glob
import numpy as np, pandas as pd
BASE = os.path.join(os.path.dirname(__file__), '..', 'data')

def pts_per_game(p):
    p = np.clip(p, 0.3, 0.95); q = 1 - p
    # expected points in a service game (exact): sum over outcomes
    e = 4*(p**4 + q**4) + 5*4*(p**4*q + q**4*p) + 6*10*(p**4*q**2 + q**4*p**2)
    d = 20*p**3*q**3  # reach deuce
    # from deuce: expected extra points = 2/(p^2+q^2)
    e += d * (6 + 2/(p*p + q*q))
    return e

def parse_score(s):
    """list of (a,b,tb_loser_pts or None) from winner perspective; flags."""
    s = str(s); ret = bool(re.search(r'RET|W/O|Def|DEF|ABD', s))
    sets = []
    for m in re.finditer(r'(\d+)-(\d+)(?:\((\d+)\))?', s):
        a, b = int(m.group(1)), int(m.group(2)); t = m.group(3)
        if a > 7 or b > 7:  # match tiebreak like [11-9] isn't matched by this format; skip super long
            continue
        sets.append((a, b, int(t) if t else None))
    return sets, ret

def est_svpt(sets, spw_w, spw_l):
    G = sum(a + b for a, b, _ in sets if not ((a == 7 and b == 6) or (a == 6 and b == 7))) + \
        sum(12 for a, b, _ in sets if (a == 7 and b == 6) or (a == 6 and b == 7))
    tbp = 0
    for a, b, t in sets:
        if (a, b) in ((7, 6), (6, 7)):
            l = t if t is not None else 5
            tbp += (7 + l) if l <= 5 else (2 * l + 2)
    sw = G / 2 * pts_per_game(spw_w) + tbp / 2
    sl = G / 2 * pts_per_game(spw_l) + tbp / 2
    return sw, sl

def load_tml():
    rows = []
    for f in sorted(glob.glob(f'{BASE}/tml/20*.csv')):
        d = pd.read_csv(f, low_memory=False)
        rows.append(d)
    d = pd.concat(rows, ignore_index=True)
    d = d[~d.tourney_level.isin(['D'])]
    out = pd.DataFrame(dict(
        date=pd.to_datetime(d.tourney_date.astype(str), format='%Y%m%d'), tourney=d.tourney_name, surface=d.surface,
        level=d.tourney_level.astype(str), rnd=d['round'], w=d.winner_name, l=d.loser_name,
        wrank=pd.to_numeric(d.winner_rank, errors='coerce'), lrank=pd.to_numeric(d.loser_rank, errors='coerce'),
        score=d.score, bestof=d.best_of, minutes=pd.to_numeric(d.minutes, errors='coerce'),
        w_svpt=d.w_svpt, w_spw=d.w_1stWon + d.w_2ndWon, w_ace=d.w_ace, w_df=d.w_df, w_1stin=d.w_1stIn, w_1stwon=d.w_1stWon, w_2ndwon=d.w_2ndWon,
        l_svpt=d.l_svpt, l_spw=d.l_1stWon + d.l_2ndWon, l_ace=d.l_ace, l_df=d.l_df, l_1stin=d.l_1stIn, l_1stwon=d.l_1stWon, l_2ndwon=d.l_2ndWon,
        src='TML', exact=True))
    return out

ROW = re.compile(r'^\| (Q?\d?[A-Z0-9]+) \| (\d*) \| (.+?) \[yr \| ev\] \| d\. \| (\d*) \| (.+?) \[yr \| ev\] \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|')
def clean_name(s):
    s = re.sub(r'^\([^)]*\)\s*', '', s.strip())
    s = re.sub(r'\s*\[[A-Z]{3}\]$', '', s)
    return s.strip()
def pct(x):
    x = x.strip().rstrip('%'); return float(x) / 100 if x not in ('', '-') else np.nan

def load_ta():
    out = []
    for f in sorted(glob.glob(f'{BASE}/ta_tourney/2026_*.md')):
        s = open(f).read()
        name = os.path.basename(f)[5:-3].replace('_', ' ')
        m = re.search(r'\| (\d{2}-[A-Za-z]{3}-2026) \| [^|]+ \| (\w+) \|', s)
        date = pd.to_datetime(m.group(1), format='%d-%b-%Y'); surface = m.group(2)
        main = s.split('# Qualifying Results')[0]
        level = 'G' if name in ('Australian Open', 'Us Open') else ('M' if 'Masters' in name else 'A')
        for line in main.split('\n'):
            r = ROW.match(line)
            if not r: continue
            g = [x.strip() for x in r.groups()]
            rnd, wr, wn, lr, ln, score, dr = g[0], g[1], g[2], g[3], g[4], g[5], g[6]
            wa, w1, w1w, w2w, wbp, la, l1, l1w, l2w, lbp, tm = g[7:18]
            if 'W/O' in score or not score: continue
            sets, ret = parse_score(score)
            if not sets: continue
            W1, W1W, W2W, L1, L1W, L2W = map(pct, (w1, w1w, w2w, l1, l1w, l2w))
            if any(np.isnan(v) for v in (W1, W1W, W2W, L1, L1W, L2W)): continue
            wspw = W1 * W1W + (1 - W1) * W2W; lspw = L1 * L1W + (1 - L1) * L2W
            sw, sl = est_svpt(sets, wspw, lspw)
            mins = np.nan
            if re.match(r'\d+:\d+', tm): h, mm = tm.split(':'); mins = int(h) * 60 + int(mm)
            out.append(dict(date=date, tourney=name, surface=surface, level=level, rnd=rnd, w=clean_name(wn), l=clean_name(ln),
                            wrank=float(wr) if wr else np.nan, lrank=float(lr) if lr else np.nan, score=score,
                            bestof=5 if level == 'G' else 3, minutes=mins,
                            w_svpt=sw, w_spw=sw * wspw, w_ace=sw * pct(wa), w_df=np.nan, w_1stin=sw * W1, w_1stwon=sw * W1 * W1W, w_2ndwon=sw * (1 - W1) * W2W,
                            l_svpt=sl, l_spw=sl * lspw, l_ace=sl * pct(la), l_df=np.nan, l_1stin=sl * L1, l_1stwon=sl * L1 * L1W, l_2ndwon=sl * (1 - L1) * L2W,
                            src='TA', exact=False))
    return pd.DataFrame(out)

import unicodedata
def nkey(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r"[^a-z]", '', s)

def canon(df_list):
    names = {}
    for d in df_list:  # first source wins (TML canonical)
        for n in pd.concat([d.w, d.l]).unique():
            names.setdefault(nkey(n), n)
    alias = {nkey('Bu Yunchaokete'): names.get(nkey('Yunchaokete Bu'), 'Bu Yunchaokete')}
    def f(n):
        k = nkey(n); return names.get(k, alias.get(k, n))
    return f

def load_all(extra=None):
    t = load_tml(); a = load_ta()
    f = canon([t, a] + ([extra] if extra is not None else []))
    for d in [t, a] + ([extra] if extra is not None else []):
        d['w'] = d.w.map(f); d['l'] = d.l.map(f)
    if extra is not None:
        a = pd.concat([a, extra], ignore_index=True)
    # drop TML 2026 events duplicated by TA (AO partially in TML)
    if len(a):
        dup = t.tourney.isin(a.tourney.unique()) & (t.date.dt.year == 2026)
        t = t[~dup]
        t.loc[t.tourney.eq('Australian Open') & (t.date.dt.year == 2026), 'tourney'] = 'x'
    df = pd.concat([t, a], ignore_index=True)
    df['tourney'] = df.tourney.replace({'Us Open': 'US Open'})
    df = df.sort_values(['date', 'tourney']).reset_index(drop=True)
    df['key'] = np.arange(len(df))
    return df

def serve_obs(df):
    """one row per (server, returner, match) with svpt/spw."""
    a = df[['key', 'date', 'tourney', 'surface', 'level', 'rnd', 'w', 'l', 'w_svpt', 'w_spw', 'w_ace', 'exact']].copy()
    a.columns = ['key', 'date', 'tourney', 'surface', 'level', 'rnd', 'server', 'returner', 'svpt', 'spw', 'ace', 'exact']
    b = df[['key', 'date', 'tourney', 'surface', 'level', 'rnd', 'l', 'w', 'l_svpt', 'l_spw', 'l_ace', 'exact']].copy()
    b.columns = a.columns
    o = pd.concat([a, b], ignore_index=True)
    o = o[(o.svpt > 0) & o.spw.notna()]
    return o

if __name__ == '__main__':
    df = load_all()
    print(len(df), df.date.min().date(), df.date.max().date())
    print(df.groupby([df.date.dt.year, 'src', 'surface']).size())
    a = df[df.src == 'TA']
    print(a.groupby('tourney').agg(n=('w', 'size'), date=('date', 'first')).sort_values('date'))
    for p in ['Arthur Gea', 'Alejandro Davidovich Fokina', 'Alexander Zverev', 'Alex De Minaur']:
        m = df[(df.w == p) | (df.l == p)]
        print(p, len(m), 'hard', ((m.surface == 'Hard')).sum(), '2026 hard', ((m.surface == 'Hard') & (m.date.dt.year == 2026)).sum())
    # sanity: compare estimated svpt to TML exact where both... show a Gea row
    print(a[(a.w == 'Arthur Gea') | (a.l == 'Arthur Gea')][['date', 'tourney', 'rnd', 'w', 'l', 'score', 'w_svpt', 'l_svpt', 'minutes']].to_string())
