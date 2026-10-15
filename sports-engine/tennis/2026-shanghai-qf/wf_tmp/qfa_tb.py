import sys; sys.path.insert(0,'src')
import db, shanghai, pandas as pd, numpy as np
df = db.load_all(extra=shanghai.frame())
df['date']=pd.to_datetime(df['date'])
df = df[(df.surface=='Hard')&(df.bestof==3)].copy()
def feats(score):
    try: s,ret = db.parse_score(score)
    except Exception: return (None,None,None,None)
    if ret or len(s) not in (2,3): return (None,None,None,None)
    tb = sum(1 for a,b,t in s if (a==7 and b==6) or (a==6 and b==7))
    g = sum(a+b for a,b,t in s)
    return (len(s), tb, g, 1)
F = df.score.map(feats)
df['nsets']=[f[0] for f in F]; df['ntb']=[f[1] for f in F]; df['games']=[f[2] for f in F]
df=df[df.nsets.notna()]
def summ(sub, label):
    if len(sub)==0: print(label,'n=0'); return
    print("%-55s n=%3d  >=1TB %.3f  3sets %.3f  meanG %.1f  medG %.0f  over22.5 %.3f  over20.5 %.3f"%(label,len(sub),(sub.ntb>0).mean(),(sub.nsets==3).mean(),sub.games.mean(),sub.games.median(),(sub.games>22.5).mean(),(sub.games>20.5).mean()))
for p in ['Arthur Gea','Alejandro Davidovich Fokina']:
    for since in ['2025-01-01','2026-01-01']:
        sub=df[((df.w==p)|(df.l==p))&(df.date>=since)]
        summ(sub, f"{p} hard Bo3 since {since}")
    sub=df[((df.w==p)|(df.l==p))&(df.tourney.str.contains('Shanghai'))&(df.date>='2026-01-01')]
    summ(sub, f"{p} Shanghai 2026")
    print(sub[['date','rnd','w','l','score']].to_string(index=False))
# base rates
base=df[(df.date>='2025-01-01')]
summ(base,"ALL tour hard Bo3 2025-26")
b2=base[(base.wrank.between(15,70))&(base.lrank.between(15,70))]
summ(b2,"both ranked 15-70 hard Bo3 2025-26")
sh=df[df.tourney.str.contains('Shanghai')]
for y in [2023,2024,2025,2026]:
    summ(sh[sh.date.dt.year==y], f"Shanghai {y} all matches")
