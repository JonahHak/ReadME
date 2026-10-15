import sys, os
sys.path.insert(0,'src')
import numpy as np
from mc import simulate
from scipy.optimize import brentq
def run(S, target, n=80000, seed=11):
    def sim(d, nn, sd):
        rng=np.random.default_rng(sd)
        pa=S/2+d; pb=S/2-d
        PA=np.tile(pa,(nn,3))+(rng.normal(0,0.019,nn)+rng.normal(0,0.06,nn))[:,None]
        PB=np.tile(pb,(nn,3))+(rng.normal(0,0.017,nn)+rng.normal(0,0.06,nn))[:,None]
        PA=np.clip(PA,0.3,0.95);PB=np.clip(PB,0.3,0.95)
        return simulate(PA,PB,rng)
    d=brentq(lambda d: sim(d,20000,seed)['winA'].mean()-target,-0.1,0.1,xtol=2e-4)
    r=sim(d,n,seed+1)
    A=r['winA']; s3=r['nsets']==3; g=r['games']; tb=r['ntb']>0
    a15=A|s3; b15=(~A)|s3
    return dict(S=S,pA=A.mean(),p3=s3.mean(),ptb=tb.mean(),A20=(A&~s3).mean(),B20=(~A&~s3).mean(),
      A15=a15.mean(),B15=b15.mean(),o205=(g>20.5).mean(),o215=(g>21.5).mean(),o225=(g>22.5).mean(),
      sgpA205=(a15&(g>20.5)).mean(),sgpB205=(b15&(g>20.5)).mean(),sgpA215=(a15&(g>21.5)).mean(),sgpB215=(b15&(g>21.5)).mean())
# QF-A: A=Gea
for S in (1.256,1.29,1.31):
    print('QFA',{k:round(v,3) for k,v in run(S,0.485).items()})
