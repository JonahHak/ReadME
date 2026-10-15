import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/src'); sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp')
import numpy as np, pandas as pd, pointmodel as pm
from br_common import *
bt = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/output/backtest_raw.pkl')
print(len(bt), bt.date.min().date(), bt.date.max().date(), bt.nsets.value_counts().to_dict())
def setp(pa,pb):
    s=0
    for af in (True,False):
        d=pm.set_dist(pa,pb,af); s+=0.5*sum(v for (x,y),v in d.items() if x>y)
    return s
bt['sA']=[setp(a,b) for a,b in zip(bt.pa,bt.pb)]
bt['pA']=bt.sA**2*(3-2*bt.sA)
# favourite perspective
fA = bt.pA>=0.5
bt['pf']=np.where(fA,bt.pA,1-bt.pA); bt['sf']=np.where(fA,bt.sA,1-bt.sA)
bt['fwin']=np.where(fA,bt.y==1,bt.y==0)
bt.to_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/bt_p.pkl')
def rep(x,label):
    n=len(x); fw=x.fwin.sum(); f20=(x.fwin&(x.nsets==2)).sum(); d20=((~x.fwin)&(x.nsets==2)).sum(); t=(x.nsets==3).sum()
    f21=(x.fwin&(x.nsets==3)).sum(); d21=((~x.fwin)&(x.nsets==3)).sum()
    print(f'{label}: n={n} mean model pf={x.pf.mean():.3f} | actual fav win {fw/n:.1%} | fav 2-0 {f20/n:.1%} ({f20}) | fav 2-1 {f21/n:.1%} | dog 2-1 {d21/n:.1%} | dog 2-0 {d20/n:.1%} ({d20}) | 3 sets {t/n:.1%} | fav wins in straights {f20/max(fw,1):.1%} | dog +1.5 sets {(n-f20)/n:.1%} | iid-implied fav2-0 {(x.sf**2).mean():.1%} 3sets {(2*x.sf*(1-x.sf)).mean():.1%}')
rep(bt,'BT all')
for lo,hi in [(0.5,0.55),(0.55,0.6),(0.6,0.68),(0.68,0.75),(0.75,0.85),(0.85,1)]:
    rep(bt[(bt.pf>=lo)&(bt.pf<hi)],f'BT model pf [{lo},{hi})')
rep(bt[(bt.pf>=0.45)&(bt.pf<0.55)],'BT model pf <0.55 (coin flip)')
rep(bt[(bt.pf>=0.55)&(bt.pf<0.65)],'BT model pf [0.55,0.65)')
rep(bt[(bt.pf>=0.58)&(bt.pf<0.70)],'BT model pf [0.58,0.70)')
# by round QF+ and Masters
