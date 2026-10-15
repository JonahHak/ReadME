import sys, os, re, numpy as np, pandas as pd
sys.path.insert(0, '/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/src')
import db, shanghai
EXCL = re.compile(r'Laver|Next Gen|Davis', re.I)
def load():
    df = db.load_all(extra=shanghai.frame())
    rows = []
    for _, r in df.iterrows():
        sets, ret = db.parse_score(r.score)
        rows.append((len(sets), ret, sum(1 for a,b,_ in sets if (a,b) in ((7,6),(6,7))), sum(a+b for a,b,_ in sets),
                     sum(1 for a,b,_ in sets if a>b), sum(1 for a,b,_ in sets if b>a)))
    x = pd.DataFrame(rows, columns=['nsets','ret','ntb','games','sw','sl'], index=df.index)
    df = pd.concat([df, x], axis=1)
    # complete Bo3: winner took 2 sets, no retirement
    df['complete'] = (~df.ret) & (df.sw == 2) & (df.nsets.isin([2,3])) & (df.bestof == 3)
    return df
def hardbo3(df, start=None, end=None, excl=True):
    m = (df.surface == 'Hard') & (df.bestof == 3)
    if excl: m &= ~df.tourney.str.contains(EXCL)
    if start: m &= df.date >= start
    if end: m &= df.date < end
    return df[m]
def player_view(d, P):
    """one row per match from P's perspective"""
    a = d[(d.w == P) | (d.l == P)].copy()
    a['won'] = a.w == P
    a['opp'] = np.where(a.won, a.l, a.w)
    a['prank'] = np.where(a.won, a.wrank, a.lrank)
    a['orank'] = np.where(a.won, a.lrank, a.wrank)
    a['ps'] = np.where(a.won, a.sw, a.sl); a['os'] = np.where(a.won, a.sl, a.sw)
    a['ss'] = a.ps.astype(int).astype(str) + '-' + a.os.astype(int).astype(str)
    return a
