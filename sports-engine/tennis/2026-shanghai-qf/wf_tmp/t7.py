import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp')
from br_common import *
df = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/df.pkl')
d = hardbo3(df,'2023-01-01','2026-10-15'); d=d[d.complete]
print('tour hard Bo3 2023-01..2026-10 anyTB', f'{(d.ntb>0).mean():.1%}', len(d), '| 3 sets', f'{(d.nsets==3).mean():.1%}')
for t in ['Shanghai','Shanghai Masters']:
    s=d[d.tourney==t]
    for yr,g in s.groupby(s.date.dt.year): print(t, yr, 'n',len(g),'anyTB',f'{(g.ntb>0).mean():.1%}','3 sets',f'{(g.nsets==3).mean():.1%}','mean games',round(g.games.mean(),1))
bt = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/bt_p.pkl')
print('backtest set anyTB', f'{bt.tb.mean():.1%}', len(bt))
# by tourney in backtest Shanghai 2025
print(bt[bt.tourney.str.contains('Shanghai')].groupby(bt.date.dt.year).agg(n=('tb','size'),tb=('tb','mean'),p3=('nsets',lambda x:(x==3).mean())))
# Zverev & dM TB rates 2024-10..
for P in ['Alexander Zverev','Alex de Minaur','Alejandro Davidovich Fokina','Arthur Gea']:
    a=player_view(hardbo3(df,'2024-10-01','2026-10-15'),P); a=a[a.complete]
    print(P,'anyTB 2024-10..',f'{(a.ntb>0).mean():.1%}',len(a),'| 2026',f'{(a[a.date.dt.year==2026].ntb>0).mean():.1%}',len(a[a.date.dt.year==2026]))
