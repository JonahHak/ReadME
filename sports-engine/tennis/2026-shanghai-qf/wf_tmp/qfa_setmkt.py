def nv(*odds):
    r=[1/o for o in odds]; s=sum(r); return [x/s for x in r], s
print("Meridianbet CS Gea2-0 3.20, Gea2-1 4.40, ADF2-1 4.10, ADF2-0 2.85:", [round(x,4) for x in nv(3.20,4.40,4.10,2.85)[0]], round(nv(3.20,4.40,4.10,2.85)[1],4))
print("Unibet.fr CS Gea2-0 3.15, Gea2-1 4.10, ADF2-1 3.75, ADF2-0 2.70:", [round(x,4) for x in nv(3.15,4.10,3.75,2.70)[0]], round(nv(3.15,4.10,3.75,2.70)[1],4))
print("Meridianbet ADF-1.5 2.85 / Gea+1.5 1.40:", [round(x,4) for x in nv(2.85,1.40)[0]], round(nv(2.85,1.40)[1],4))
print("Meridianbet Gea-1.5 3.20 / ADF+1.5 1.33:", [round(x,4) for x in nv(3.20,1.33)[0]], round(nv(3.20,1.33)[1],4))
print("BSD consensus Gea-1.5 3.18 / ADF+1.5 1.31:", [round(x,4) for x in nv(3.18,1.31)[0]], round(nv(3.18,1.31)[1],4))
print("BSD consensus O2.5 sets 2.22 / U 1.60:", [round(x,4) for x in nv(2.22,1.60)[0]], round(nv(2.22,1.60)[1],4))
print("Meridianbet exact sets 2 1.51 / 3 2.09:", [round(x,4) for x in nv(1.51,2.09)[0]])
print("Unibet Gea>=1set Oui 1.28/Non 2.35:", [round(x,4) for x in nv(1.28,2.35)[0]])
print("Unibet ADF>=1set Oui 1.21/Non 2.60:", [round(x,4) for x in nv(1.21,2.60)[0]])
print("BSD TB O0.5 1.98/U 1.74:", [round(x,4) for x in nv(1.98,1.74)[0]])
print("BSD ML 1.96/1.84:", [round(x,4) for x in nv(1.96,1.84)[0]])
print("Unibet O/U 20.5 1.22/2.60:", [round(x,4) for x in nv(1.22,2.60)[0]], "21.5", [round(x,4) for x in nv(1.30,2.30)[0]], "22.5",[round(x,4) for x in nv(1.48,1.90)[0]],"23.5",[round(x,4) for x in nv(1.68,1.64)[0]])
# EVs vs our model
m={'Gea+1.5':0.68588,'ADF2-0':0.31412,'Gea2-0':0.30233,'ADF+1.5':0.69767,'U2.5sets':0.61645,'O2.5sets':0.38355,'NoTB':0.61775}
for k,o in [('Gea+1.5',1.40),('Gea+1.5',1.28),('ADF2-0',2.85),('Gea2-0',3.25),('Gea2-0',3.20),('ADF+1.5',1.33),('U2.5sets',1.67),('O2.5sets',2.30),('NoTB',1.75),('NoTB',1.74)]:
    print(k,o,"EV %.3f"%(m[k]*o-1))
def am(d): return round((d-1)*100) if d>=2 else round(-100/(d-1))
for d in [1.40,1.28,1.27,2.85,2.70,3.15,3.20,3.25,1.31,1.33,2.22,1.60,1.51,2.09,1.98,1.74,1.75,2.30]: print(d, am(d))
