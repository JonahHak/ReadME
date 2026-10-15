import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp')
from br_common import *
df = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/df.pkl')
def summ(a, label):
    c = a[a.complete]
    n=len(c); w=c.won.sum(); w20=(c.won&(c.nsets==2)).sum(); l02=((~c.won)&(c.nsets==2)).sum(); three=(c.nsets==3).sum()
    w21=(c.won&(c.nsets==3)).sum(); l12=((~c.won)&(c.nsets==3)).sum()
    f=lambda x,y: f'{x}/{y}={x/y:.1%}' if y else f'{x}/0'
    print(f'{label}: n={n} (excl {len(a)-n} ret/wo) W-L {w}-{n-w} | 2-0 {w20}, 2-1 {w21}, 1-2 {l12}, 0-2 {l02} | wins-in-straights {f(w20,w)} | won 2-0 of all {f(w20,n)} | 3 sets {f(three,n)} | lost 0-2 of all {f(l02,n)} | won>=1 set {f(n-l02,n)} | anyTB {f((c.ntb>0).sum(),n)} | dates {c.date.min().date()}..{c.date.max().date()}')
    return dict(n=n,w=w,w20=w20,w21=w21,l12=l12,l02=l02)
P='Alexander Zverev'
d = hardbo3(df, '2024-10-01', '2026-10-15')
z = player_view(d, P)
print('Zverev own rank range', z.prank.min(), z.prank.max())
summ(z,'Z all')
summ(z[z.orank.between(1,20)],'Z vs rank 1-20')
summ(z[z.orank.between(5,15)],'Z vs rank 5-15')
summ(z[z.orank.between(1,10)],'Z vs rank 1-10')
summ(z[z.orank.between(11,30)],'Z vs rank 11-30')
summ(z[z.orank>20],'Z vs rank >20')
summ(z[z.date.dt.year==2026],'Z 2026 (incl Shanghai 26)')
summ(z[(z.date.dt.year==2026)&(z.tourney!='Shanghai Masters')|(z.date.dt.year==2026)&(z.date<'2026-10-01')],'Z 2026 pre-Shanghai')
summ(z[(z.date>='2026-07-01')],'Z 2026 H2 hard')
# with United Cup excluded
summ(z[~z.tourney.str.contains('United Cup')],'Z all excl United Cup')
# longer window
z2 = player_view(hardbo3(df,'2023-01-01','2026-10-15'),P)
summ(z2,'Z 2023-01..2026-10 all')
summ(z2[z2.orank.between(1,20)],'Z 2023-01.. vs 1-20')
summ(z2[z2.orank.between(5,15)],'Z 2023-01.. vs 5-15')
print(z[z.orank.between(5,15)&z.complete][['date','tourney','rnd','opp','orank','won','score']].to_string())
