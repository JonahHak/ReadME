"""Match Charting Project point-level analytics (hard courts, 24 months to the last charted date)."""
import re, os, math, numpy as np, pandas as pd
D = os.path.join(os.path.dirname(__file__), '..', 'data', 'mcp')
M = pd.read_csv(f'{D}/charting-m-matches.csv', low_memory=False)
P = pd.read_csv(f'{D}/charting-m-points-2020s.csv', low_memory=False, dtype=str)
M['date'] = pd.to_datetime(M.match_id.str[:8], format='%Y%m%d', errors='coerce')
LAST = M.date.max()
SHOT = set('fbrsvzopuylmhijktq')
def parse(code):
    if not isinstance(code, str) or not code: return None
    c = code.lstrip('c')
    if not c or c[0] not in '0456': return None
    srv = c[0]; rest = c[1:]
    fault = bool(rest[:1]) and rest[0] in 'nwdxge!V'
    ace = rest[:1] == '*'; svw = rest[:1] == '#'
    shots = [ch for ch in rest if ch in SHOT]
    third = shots[1] if len(shots) >= 2 else None
    return dict(srv=srv, fault=fault, ace=ace, svw=svw, n=1 + len(shots), third=third, ret_err=(len(shots) == 1 and bool(re.search(r'[nwdx]?[@#]$', rest))) )
def ent(counts):
    t = sum(counts); return -sum(c / t * math.log2(c / t) for c in counts if c) if t else float('nan')
def bp_state(pts, srv_first=True):
    if not isinstance(pts, str): return 'none'
    a, b = (pts.split('-') + ['', ''])[:2]
    if pts in ('30-30', '40-40', 'AD-40', '40-AD'): base = 'deuce'
    else: base = 'none'
    if (b == '40' and a in ('0', '15', '30')) or (b == 'AD'): return 'BP'
    return base
def analyze(player, start, end=None, opp=None):
    mm = M[((M['Player 1'] == player) | (M['Player 2'] == player)) & (M.Surface == 'Hard') & (M.date >= start)]
    if end is not None: mm = mm[mm.date <= end]
    if opp: mm = mm[(mm['Player 1'] == opp) | (mm['Player 2'] == opp)]
    pts = P[P.match_id.isin(mm.match_id)].copy()
    if pts.empty: return dict(player=player, charted_matches=0)
    num = mm.set_index('match_id')['Player 1'].eq(player).map({True: '1', False: '2'})
    pts['me'] = pts.match_id.map(num)
    rows = []
    for _, r in pts.iterrows():
        f1 = parse(r['1st']); f2 = parse(r['2nd']) if isinstance(r['2nd'], str) and r['2nd'] else None
        if f1 is None: continue
        first_in = not f1['fault']; pt = f1 if first_in else f2
        df_ = (not first_in) and (f2 is None or f2['fault'])
        tb = str(r.get('TbSet')) == 'True' and r['Gm1'] == '6' and r['Gm2'] == '6'
        rows.append(dict(serving=r['Svr'] == r['me'], won=r['PtWinner'] == r['me'], first_in=first_in, df=df_, srv=(pt or f1)['srv'],
                         ace=bool(pt and pt['ace']), svw=bool(pt and pt['svw']), n=(pt['n'] if pt else 1), third=(pt['third'] if pt else None),
                         ret_err=bool(pt and pt['ret_err']), court='deuce' if (int(r['Gm#'] if r['Gm#'] else 0) >= 0 and _court(r['Pts'])) else 'ad',
                         state='TB' if tb else bp_state(r['Pts']), set_no=int(r['Set1']) + int(r['Set2']) + 1, match=r['match_id']))
    t = pd.DataFrame(rows); s = t[t.serving]; rt = t[~t.serving]
    out = dict(player=player, charted_matches=len(mm), date_range=f'{mm.date.min().date()} to {mm.date.max().date()}', serve_pts=len(s), return_pts=len(rt))
    out['1st_in%'] = 100 * s.first_in.mean(); out['1st_won%'] = 100 * s[s.first_in].won.mean(); out['2nd_won%'] = 100 * s[~s.first_in].won.mean()
    out['ace%'] = 100 * s.ace.mean(); out['DF%'] = 100 * s.df.mean(); out['unret%'] = 100 * (s.ace | s.svw | (s.ret_err & s.won)).mean()
    out['won_le3_shots%(of serve pts)'] = 100 * (s.won & (s.n <= 3)).mean()
    for lo, hi, lab in ((1, 4, '1-4'), (5, 8, '5-8'), (9, 99, '9+')):
        a = s[(s.n >= lo) & (s.n <= hi) & ~s.df]; b = rt[(rt.n >= lo) & (rt.n <= hi)]
        out[f'srv_won_{lab}'] = 100 * a.won.mean(); out[f'srv_n_{lab}'] = len(a); out[f'ret_won_{lab}'] = 100 * b.won.mean(); out[f'ret_n_{lab}'] = len(b)
    for court in ('deuce', 'ad'):
        c = s[(s.court == court) & s.first_in]; cnt = [int((c.srv == x).sum()) for x in '456']
        out[f'{court}_1st W/B/T %'] = '/'.join(str(round(100 * x / max(1, sum(cnt)))) for x in cnt); out[f'{court}_entropy'] = round(ent(cnt), 2)
    for st in ('deuce', 'BP', 'TB'):
        c = s[s.state == st]; c1 = c[c.first_in]; cnt = [int((c1.srv == x).sum()) for x in '456']
        out[f'{st}: srv won% (n)'] = f'{100*c.won.mean():.1f} ({len(c)})'; out[f'{st}: 1st W/B/T %'] = '/'.join(str(round(100 * x / max(1, sum(cnt)))) for x in cnt); out[f'{st}: entropy'] = round(ent(cnt), 2)
        r2 = rt[rt.state == st]; out[f'{st}: ret won% (n)'] = f'{100*r2.won.mean():.1f} ({len(r2)})'
    p1 = s[s.third.isin(['f', 'b'])]; out['+1 FH share%'] = 100 * (p1.third == 'f').mean()
    out['+1 FH won%'] = 100 * p1[p1.third == 'f'].won.mean(); out['+1 BH won%'] = 100 * p1[p1.third == 'b'].won.mean()
    out['ret_v1st_won%'] = 100 * rt[rt.first_in].won.mean(); out['ret_v2nd_won%'] = 100 * rt[~rt.first_in & ~rt.df].won.mean()
    out['ret_inplay% (v1st)'] = 100 * (rt[rt.first_in].n >= 2).mean()
    for k in (1, 2, 3):
        a = s[s.set_no == k]; out[f'SPW set{k}% (n)'] = f'{100*a.won.mean():.1f} ({len(a)})'
    return out
def _court(pts):
    # deuce court when total points played in game is even
    m = {'0': 0, '15': 1, '30': 2, '40': 3, 'AD': 4}
    if not isinstance(pts, str) or '-' not in pts: return True
    a, b = pts.split('-')
    try:
        if a in m and b in m: return (m[a] + m[b]) % 2 == 0
        return (int(a) + int(b)) % 2 == 0
    except Exception: return True
if __name__ == '__main__':
    start = LAST - pd.Timedelta(days=730)
    print('MCP last charted date:', LAST.date(), '| window from', start.date())
    res = [analyze(p, start) for p in ['Alexander Zverev', 'Alex De Minaur', 'Alejandro Davidovich Fokina', 'Arthur Gea']]
    T = pd.DataFrame(res).set_index('player').T
    pd.set_option('display.width', 250); pd.set_option('display.max_rows', 200)
    print(T.to_string())
    T.to_csv(os.path.join(os.path.dirname(__file__), '..', 'output', 'mcp_analytics.csv'))
    h = analyze('Alexander Zverev', pd.Timestamp('2018-01-01'), opp='Alex De Minaur')
    print('\nZverev vs de Minaur charted H2H (2020s file):', {k: (round(v, 1) if isinstance(v, float) else v) for k, v in h.items()})
