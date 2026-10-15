"""Price the other AIs' picks with the same re-centred simulation (same seeds as card.py)."""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import card as C
from card import p2am, take_at, ev, kelly, am2dec
OUT = os.path.join(os.path.dirname(__file__), '..', 'output')
cd = json.load(open(f'{OUT}/card.json'))
rows = []
for k, seed in (('QF-A', 7001), ('QF-B', 7002)):
    r, lim = C.sim(k, cd[k]['delta'], 60000, seed + 1)
    wA = r['winA']; ns = r['nsets']; g = r['games']; mg = r['margin']
    A_plus15 = ~((~wA) & (ns == 2)); B_plus15 = ~(wA & (ns == 2))
    if k == 'QF-A':
        picks = [('Claude', 'Gea +1.5 sets', A_plus15, None), ('Gemini', 'Gea +1.5 sets', A_plus15, -200), ('Grok', 'ADF ML (high-hit)', ~wA, -116),
                 ('Claude/Gemini/Grok', 'Gea ML (value)', wA, 100), ('Gemini', 'Gea ML (value) @ +102', wA, 102),
                 ('Claude', 'SGP Gea +1.5 sets + Over 20.5', A_plus15 & (g > 20.5), None), ('Gemini', 'SGP Gea +1.5 sets + Under 24.5', A_plus15 & (g < 24.5), 175),
                 ('Grok', 'SGP ADF ML + Over 22.5', (~wA) & (g > 22.5), 230)]
    else:
        picks = [('Claude', 'de Minaur +1.5 sets', B_plus15, None), ('Gemini', 'de Minaur +3.5 games', mg - 3.5 < 0, -115), ('Grok', 'Zverev ML (high-hit)', wA, -200),
                 ('Claude/Gemini/Grok', 'de Minaur ML (value)', ~wA, 175), ('Gemini', 'de Minaur ML @ +176', ~wA, 176),
                 ('Claude/Gemini', 'SGP de Minaur +1.5 sets + Over 21.5', B_plus15 & (g > 21.5), 185), ('Grok', 'SGP Zverev ML + Under 25.5', wA & (g < 25.5), 200)]
    for who, sel, m, price in picks:
        p = float(np.mean(m)); row = dict(match=k, source=who, pick=sel, p=round(p, 4), fair=p2am(p), take_at=take_at(p, 0.05 if 'SGP' in sel else 0.025))
        if price is not None: row.update(price=price, ev=round(ev(p, price), 4), kelly=round(kelly(p, price), 4))
        rows.append(row); print(row)
json.dump(rows, open(f'{OUT}/crosscheck.json', 'w'), indent=1)
for k in cd:
    c = cd[k]; print(k, 'final', round(c['final'], 4), 'P3', round(c['p3'], 4), 'TB', round(c['ptb_raw'], 4), 'games', round(c['games_mean'], 2), 'exact top', list(c['exact_top'].items())[:4])
    for m in c['markets']:
        if m['market'] in ('Moneyline', 'Set spread') or 'Over 2' in m['selection'] or m['market'] == 'Tiebreak in match' or m['selection'].endswith('+3.5'):
            print('   ', m['market'], m['selection'], round(m['p'], 4), m['fair'], m['take_at'], m.get('price'), round(m.get('ev', 0) or 0, 4), round(m.get('kelly', 0) or 0, 4))
    for s in c['sgps'][:6]: print('   SGP', s['sgp'], round(s['p'], 4), s['fair'], s['take_at'])
    print('   in-play', {kk: {x: round(y, 3) for x, y in v.items()} for kk, v in c['in_play'].items()})
