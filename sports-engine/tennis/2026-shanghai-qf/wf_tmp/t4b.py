import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp')
import numpy as np, pandas as pd
from br_common import *
from scipy.optimize import minimize
bt = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/bt_p.pkl')
lg=lambda p: np.log(p/(1-p))
X=lg(bt.pA.clip(1e-4,1-1e-4)).values; y=bt.y.values
def nll(b): z=b[0]*X; p=1/(1+np.exp(-z)); return -np.sum(y*np.log(p)+(1-y)*np.log(1-p))
b=minimize(nll,[1.0]).x[0]; print('calibration slope on logit(p_iid)', round(b,3))
bt['pc']=1/(1+np.exp(-b*X)); bt['pcf']=np.where(bt.pA>=0.5,bt.pc,1-bt.pc)
def rep(x,label,col):
    n=len(x); fw=x.fwin.sum(); f20=(x.fwin&(x.nsets==2)).sum(); d20=((~x.fwin)&(x.nsets==2)).sum(); t=(x.nsets==3).sum()
    f21=(x.fwin&(x.nsets==3)).sum(); d21=((~x.fwin)&(x.nsets==3)).sum()
    se=np.sqrt(f20/n*(1-f20/n)/n)
    print(f'{label}: n={n} mean p={x[col].mean():.3f} | actual fav win {fw/n:.1%} | fav 2-0 {f20/n:.1%} (+/-{1.96*se:.1%}) | fav 2-1 {f21/n:.1%} | dog 2-1 {d21/n:.1%} | dog 2-0 {d20/n:.1%} | 3 sets {t/n:.1%} | fav-wins-in-straights {f20/max(fw,1):.1%} | dog +1.5 {(n-f20)/n:.1%}')
for lo,hi in [(0.5,0.55),(0.55,0.6),(0.6,0.68),(0.68,0.75),(0.75,1)]:
    rep(bt[(bt.pcf>=lo)&(bt.pcf<hi)],f'BT calibrated pf [{lo},{hi})','pcf')
rep(bt[(bt.pcf>=0.5)&(bt.pcf<0.56)],'BT calibrated coin-flip [0.50,0.56)','pcf')
# Rank-based: hard Bo3 2023-01..2026-09, exclude team/exhib, complete only, both ranks known
df = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/df.pkl')
d = hardbo3(df,'2023-01-01','2026-10-01'); d=d[d.complete & d.wrank.notna() & d.lrank.notna() & (d.wrank!=d.lrank)].copy()
d['frank']=d[['wrank','lrank']].min(axis=1); d['drank']=d[['wrank','lrank']].max(axis=1)
d['fwin']=d.wrank<d.lrank
d['x']=np.log(d.drank)-np.log(d.frank)
def nll2(b): z=b[0]*d.x.values; p=1/(1+np.exp(-z)); yy=d.fwin.values; return -np.sum(yy*np.log(p)+(1-yy)*np.log(1-p))
b2=minimize(nll2,[0.5]).x[0]; d['pr']=1/(1+np.exp(-b2*d.x)); print('rank logit coef',round(b2,3),'n',len(d), d.date.min().date(), d.date.max().date())
for lo,hi in [(0.5,0.56),(0.56,0.6),(0.6,0.68),(0.68,0.75),(0.75,1)]:
    rep(d[(d.pr>=lo)&(d.pr<hi)],f'RANK pf [{lo},{hi})','pr')
# Restrict to favourite ranked top-10 vs underdog ranked 5-20 analog; both top-15
e=d[(d.frank<=5)&(d.drank.between(6,15))]; rep(e,'RANK fav top-5 vs dog 6-15','pr')
e=d[(d.frank<=10)&(d.drank<=15)]; rep(e,'RANK both top-15, fav top-10','pr')
e=d[(d.frank<=4)&(d.drank.between(7,12))]; rep(e,'RANK fav 1-4 vs dog 7-12','pr')
e=d[(d.level.isin(['M','F']))&(d.rnd.isin(['QF','SF','F']))]; rep(e,'RANK Masters/Finals QF+ all','pr')
e=d[(d.level.isin(['M']))&(d.rnd.isin(['QF']))&(d.pr.between(0.6,0.68))]; rep(e,'RANK Masters QF pf .60-.68','pr')
# coin flip by rank close: both ranks within factor 1.25
e=d[d.pr<0.56]; rep(e,'RANK near coin flip pr<.56','pr')
# all hard Bo3 complete 3-set rate overall
print('overall 3-set share hard Bo3 2023-01..2026-09:', f'{(d.nsets==3).mean():.1%}', len(d))
x=d[(d.date>='2025-01-01')]; print('2025-26 3-set share', f'{(x.nsets==3).mean():.1%}', len(x))
x=d[d.level=='M']; print('Masters 3-set share', f'{(x.nsets==3).mean():.1%}', len(x))
