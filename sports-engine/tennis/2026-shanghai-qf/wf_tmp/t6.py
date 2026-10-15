import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp')
from br_common import *
from scipy.optimize import minimize
df = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/df.pkl')
g=player_view(df,'Arthur Gea'); print(g[~((g.bestof==3))|g.date.lt('2025-01-01')][['date','tourney','bestof','opp','score']].to_string())
sh=df[(df.tourney=='Shanghai Masters')&(df.date.dt.year==2026)]
print(sh[['rnd','w','l','score','nsets','ntb','games']].to_string())
print('3-set', (sh.nsets==3).sum(), 'of', len(sh), '| anyTB', (sh.ntb>0).sum(), '| mean games', sh.games.mean())
for P in ['Alexander Zverev','Alex de Minaur','Alejandro Davidovich Fokina','Arthur Gea']:
    s=sh[(sh.w==P)|(sh.l==P)]; print(P, '3-set', (s.nsets==3).sum(), '/', len(s), 'TB matches', (s.ntb>0).sum(), 'TB sets', s.ntb.sum())
# smooth fits
bt = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/bt_p.pkl')
lg=lambda p: np.log(p/(1-p))
X=lg(bt.pA.clip(1e-4,1-1e-4)).values; y=bt.y.values
b=minimize(lambda b: -np.sum(y*np.log(1/(1+np.exp(-b[0]*X)))+(1-y)*np.log(1-1/(1+np.exp(-b[0]*X)))),[1.0]).x[0]
pc=1/(1+np.exp(-b*X)); pcf=np.where(bt.pA>=0.5,pc,1-pc)
f20=(bt.fwin&(bt.nsets==2)).values.astype(float); t3=(bt.nsets==3).values.astype(float); d20=((~bt.fwin)&(bt.nsets==2)).values.astype(float)
def fit(yv, x):
    Z=np.c_[np.ones_like(x), lg(x)]
    nl=lambda c: -np.sum(yv*np.log(1/(1+np.exp(-Z@c)))+(1-yv)*np.log(1-1/(1+np.exp(-Z@c))))
    return minimize(nl,[0,1]).x
for name,yv in [('fav2-0',f20),('dog2-0',d20),('3sets',t3)]:
    c=fit(yv,pcf)
    print('BT-calibrated logistic', name, {p: round(float(1/(1+np.exp(-(c[0]+c[1]*lg(p))))),3) for p in [0.503,0.53,0.586,0.60,0.642,0.66,0.70]})
# rank-based
d = hardbo3(df,'2023-01-01','2026-10-01'); d=d[d.complete & d.wrank.notna() & d.lrank.notna() & (d.wrank!=d.lrank)].copy()
d['frank']=d[['wrank','lrank']].min(axis=1); d['drank']=d[['wrank','lrank']].max(axis=1); d['fwin']=d.wrank<d.lrank
x=np.log(d.drank)-np.log(d.frank); pr=1/(1+np.exp(-0.495*x))
for name,yv in [('fav2-0',(d.fwin&(d.nsets==2)).values.astype(float)),('dog2-0',((~d.fwin)&(d.nsets==2)).values.astype(float)),('3sets',(d.nsets==3).values.astype(float))]:
    c=fit(yv,pr.values)
    print('RANK logistic', name, {p: round(float(1/(1+np.exp(-(c[0]+c[1]*lg(p))))),3) for p in [0.503,0.53,0.586,0.60,0.642,0.66,0.70]})
# Fav top-5 vs dog 6-15 excluding Sinner/Alcaraz/Djokovic as favourite
e=d[(d.frank<=5)&(d.drank.between(6,15))]; fav=np.where(e.fwin,e.w,e.l)
e=e.assign(fav=fav); e2=e[~e.fav.isin(['Jannik Sinner','Carlos Alcaraz','Novak Djokovic'])]
n=len(e2); print('fav top5 (non-Sinner/Alcaraz/Djokovic) vs dog 6-15: n',n,'fav win',f'{e2.fwin.mean():.1%}','fav2-0',f'{(e2.fwin&(e2.nsets==2)).mean():.1%}','3 sets',f'{(e2.nsets==3).mean():.1%}','dog2-0',f'{((~e2.fwin)&(e2.nsets==2)).mean():.1%}', e2.date.min().date(), e2.date.max().date())
print(e2.fav.value_counts().to_dict())
