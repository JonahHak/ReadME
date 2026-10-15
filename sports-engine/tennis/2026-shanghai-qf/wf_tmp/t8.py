import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp')
from br_common import *
df = pd.read_pickle('/tmp/claude-0/-home-user-ReadME/466937d5-7a1a-5b7b-8d33-791a10f066e2/scratchpad/wf_tmp/df.pkl')
d = hardbo3(df,'2023-01-01','2026-10-01'); d=d[d.complete & d.wrank.notna() & d.lrank.notna()].copy()
d['frank']=d[['wrank','lrank']].min(axis=1); d['drank']=d[['wrank','lrank']].max(axis=1); d['fwin']=d.wrank<d.lrank
d['fav']=np.where(d.fwin,d.w,d.l)
B3=['Jannik Sinner','Carlos Alcaraz','Novak Djokovic']
def rep(e,label):
    n=len(e); fw=e.fwin.mean(); f20=(e.fwin&(e.nsets==2)).mean(); t=(e.nsets==3).mean(); d20=((~e.fwin)&(e.nsets==2)).mean()
    print(f'{label}: n={n} fav win {fw:.1%} | fav 2-0 {f20:.1%} | 3 sets {t:.1%} | dog 2-0 {d20:.1%} | fav wins in straights {f20/fw:.1%} | dog +1.5 {1-f20:.1%}')
rep(d[(d.drank<=10)],'both top-10')
rep(d[(d.drank<=15)],'both top-15')
rep(d[(d.drank<=20)],'both top-20')
rep(d[(d.drank<=15)&~d.fav.isin(B3)],'both top-15, fav not Sinner/Alcaraz/Djokovic')
rep(d[(d.frank<=5)&(d.drank.between(6,15))&~d.fav.isin(B3)],'fav top-5 not S/A/D vs dog 6-15')
rep(d[(d.frank<=5)&(d.drank.between(6,15))&~d.fav.isin(B3)&~d.w.isin(B3)&~d.l.isin(B3)],'same, neither S/A/D')
rep(d[(d.drank<=15)&~d.w.isin(B3)&~d.l.isin(B3)],'both top-15, neither S/A/D')
# Zverev as favourite vs top-20 2023-
z=d[(d.fav=='Alexander Zverev')&(d.drank<=20)]; rep(z,'Zverev as rank-fav vs top-20 2023..')
