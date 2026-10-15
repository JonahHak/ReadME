import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp')
from br_common import *
df = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/df.pkl')
def summ(a, label):
    c = a[a.complete]
    n=len(c); w=c.won.sum(); w20=(c.won&(c.nsets==2)).sum(); l02=((~c.won)&(c.nsets==2)).sum(); three=(c.nsets==3).sum()
    w21=(c.won&(c.nsets==3)).sum(); l12=((~c.won)&(c.nsets==3)).sum()
    f=lambda x,y: f'{x}/{y}={x/y:.1%}' if y else f'{x}/0'
    print(f'{label}: n={n} (excl {len(a)-n} ret/wo) W-L {w}-{n-w} | 2-0 {w20}, 2-1 {w21}, 1-2 {l12}, 0-2 {l02} | 3 sets {f(three,n)} | straight-set W {f(w20,n)} | straight-set L {f(l02,n)} | either 2-0 {f(w20+l02,n)} | wins in straights {f(w20,w)} | losses in straights {f(l02,n-w)} | anyTB {f((c.ntb>0).sum(),n)} | mean games {c.games.mean():.1f} | dates {c.date.min().date() if n else None}..{c.date.max().date() if n else None}')
for P in ['Alejandro Davidovich Fokina','Arthur Gea']:
    a = player_view(hardbo3(df,'2025-01-01','2026-10-15'),P)
    summ(a, P+' hard Bo3 2025-01..2026-10 (incl Shanghai 26)')
    summ(a[a.tourney!='Shanghai Masters'] if P=='Arthur Gea' else a[~((a.tourney=='Shanghai Masters')&(a.date.dt.year==2026))], P+' excl Shanghai 26')
    summ(a[a.date.dt.year==2026], P+' 2026 only')
    if P=='Alejandro Davidovich Fokina':
        b = player_view(hardbo3(df,'2023-01-01','2026-10-15'),P); summ(b, P+' 2023-01..2026-10')
        summ(a[(a.orank<=60)], P+' 2025-26 vs opp rank<=60')
        summ(a[a.orank.between(25,80)], P+' 2025-26 vs opp rank 25-80')
    if P=='Arthur Gea':
        print(a[['date','tourney','level','rnd','opp','orank','won','score']].to_string())
# all Gea rows any surface
g=player_view(df,'Arthur Gea'); print('Gea all rows any surface/format', len(g), g.surface.value_counts().to_dict())
