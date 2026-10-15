import sys; sys.path.insert(0,'src')
import db, shanghai, pandas as pd
df = db.load_all(extra=shanghai.frame())
df = df[(df.surface=='Hard')&(df.bestof==3)]
def sets(score):
    try:
        s,ret = db.parse_score(score)
    except Exception: return None
    if ret: return None
    return len(s)
df = df.copy(); df['nsets']=df.score.map(sets); df=df[df.nsets.isin([2,3])]
df['date']=pd.to_datetime(df['date'])
# top-3 vs rank 5-15
m = df[((df.wrank<=3)&(df.lrank.between(5,15)))|((df.lrank<=3)&(df.wrank.between(5,15)))]
favwin = m.wrank<=3
print("Hard Bo3, top-3 vs #5-15, 2023-26: n=%d  top3 win %.3f  top3 2-0 %.3f  P(3 sets) %.3f"%(len(m),favwin.mean(),((favwin)&(m.nsets==2)).mean(),(m.nsets==3).mean()))
Z='Alexander Zverev'; D='Alex de Minaur'
for who in [Z,D]:
    for since in ['2025-01-01']:
        w=df[(df.w==who)&(df.date>=since)]; l=df[(df.l==who)&(df.date>=since)]
        print(who,since,"hard Bo3 W %d (2-0 share %.2f) L %d (0-2 share %.2f)"%(len(w),(w.nsets==2).mean(),len(l),(l.nsets==2).mean()))
# Zverev vs top-10 on hard Bo3 since 2025
zz=df[((df.w==Z)&(df.lrank<=10))|((df.l==Z)&(df.wrank<=10))]; zz=zz[zz.date>='2025-01-01']
print("Zverev vs top10 hard Bo3 since 2025: n=%d, Z wins %d, straight-set Z wins %d, 3-setters %d"%(len(zz),(zz.w==Z).sum(),((zz.w==Z)&(zz.nsets==2)).sum(),(zz.nsets==3).sum()))
print(zz[['date','tourney','w','l','score']].to_string())
dd=df[((df.l==D)&(df.wrank<=5))]; 
print("de Minaur losses to top5 hard Bo3 (2023-26): n=%d straight %d"%(len(dd),(dd.nsets==2).sum()))
