def imp(d): return 1/d
def am(a): return 100/(a+100) if a>0 else -a/(-a+100)
print("== Unibet.fr correct score (Z2-0 2.10, Z2-1 3.40, dM2-0 4.25, dM2-1 5.10)")
for name,odds in [("Unibet.fr",[2.10,3.40,4.25,5.10]),("PokerStars.fr",[2.20,3.50,4.33,5.00])]:
    r=[1/o for o in odds]; s=sum(r)
    n=[x/s for x in r]
    # power method: find k s.t. sum r^k =1
    lo,hi=1.0,3.0
    for _ in range(100):
        k=(lo+hi)/2
        if sum(x**k for x in r)>1: lo=k
        else: hi=k
    p=[x**k for x in r]
    print(name,"raw",[round(x,4) for x in r],"overround",round(s,4))
    print("  proportional: Z2-0 %.3f Z2-1 %.3f dM2-0 %.3f dM2-1 %.3f | Zwin %.3f | P(3 sets) %.3f | Z2-0|Zwin %.3f"%(n[0],n[1],n[2],n[3],n[0]+n[1],n[1]+n[3],n[0]/(n[0]+n[1])))
    print("  power(k=%.3f): Z2-0 %.3f Z2-1 %.3f dM2-0 %.3f dM2-1 %.3f | Zwin %.3f"%(k,p[0],p[1],p[2],p[3],p[0]+p[1]))
print()
print("== Two-way 'de Minaur wins >=1 set' (YES) vs NO (=Zverev 2-0)")
for name,y,n in [("Unibet.fr",1.44,1.94),("PokerStars.fr",1.57,2.20),("wincomp bk1",1.57,2.20),("wincomp bk2",1.55,2.30),("wincomp bk3",1.55,2.29),("wincomp bk4",1.63,2.20)]:
    ry,rn=1/y,1/n; s=ry+rn
    print("%-14s yes %.2f no %.2f  raw %.3f/%.3f over %.3f  -> P(dM>=1 set) %.3f  P(Z 2-0) %.3f"%(name,y,n,ry,rn,s,ry/s,rn/s))
print()
print("== Cappster (book unnamed): Z -1.5 sets +129 / dM +1.5 sets -150; O2.5 sets +136 / U2.5 -158")
a,b=am(129),am(-150); print(" set spread raw %.3f/%.3f over %.3f -> P(Z 2-0) %.3f P(dM +1.5) %.3f"%(a,b,a+b,a/(a+b),b/(a+b)))
a,b=am(136),am(-158); print(" total sets raw O %.3f/U %.3f over %.3f -> P(3 sets) %.3f"%(a,b,a+b,a/(a+b)))
print("== Meridianbet/Supergooal exact sets 2: 1.50 / 3: 2.12")
a,b=1/1.5,1/2.12; print(" raw %.3f/%.3f over %.3f -> P(2 sets) %.3f P(3 sets) %.3f"%(a,b,a+b,a/(a+b),b/(a+b)))
print("== Tipico one-sided: Over 2.5 sets 2.15 raw %.3f ; Zverev 2-1 3.30 raw %.3f"%(1/2.15,1/3.30))
print("== NEO.bet dM to win a set 1.57 raw %.3f (one side)"%(1/1.57))
print("== Unibet match 1.41/2.45:",round((1/1.41)/((1/1.41)+(1/2.45)),3))
print("== PokerStars match 1.44/2.60:",round((1/1.44)/((1/1.44)+(1/2.60)),3))
print("== DK ML -200/+175:",round(am(-200)/(am(-200)+am(175)),3))
print("== Kalshi 67/34 (Polymarket.us 67/34):",round(67/101,3))
