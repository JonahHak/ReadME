"""Shanghai 2026 (this week) match-level serve data for the four QF players' matches.
Sources: tennis.com/ATP Infosys match pages; DeepCourt (Gea-Humbert, Zverev-Bublik reconciled); derived where noted."""
import pandas as pd
D = pd.Timestamp('2026-10-07')
# w, l, rnd, score, minutes, w_svpt, w_spw, l_svpt, l_spw, w_ace, l_ace, src
ROWS = [
 ('Arthur Gea', 'Jaime Faria', 'R128', '6-7(3) 6-1 6-2', 125, 74, 58, 96, 57, 7, 7, 'tennis.com'),
 ('Arthur Gea', 'Ugo Humbert', 'R64', '6-4 3-6 6-1', 106, 72, 50, 73, 45, 8, 5, 'DeepCourt'),
 ('Arthur Gea', 'Ben Shelton', 'R32', '7-6(5) 7-6(3)', 127, 83, 55, 84, 51, None, None, 'tennis.com (Shelton svpt incl. est. DF)'),
 ('Arthur Gea', 'Jakub Mensik', 'R16', '7-6(4) 6-4', 97, 75, 54, 69, 48, None, None, 'tennis.com'),
 ('Alejandro Davidovich Fokina', 'Jenson Brooksby', 'R64', '6-1 6-3', 72, 50, 33, 61, 29, 5, 1, 'tennis.com'),
 ('Alejandro Davidovich Fokina', 'Frances Tiafoe', 'R32', '7-6(4) 4-6 7-6(6)', 167, 112, 80, 115, 80, None, None, 'tennis.com + DeepCourt set splits'),
 ('Alejandro Davidovich Fokina', 'Hubert Hurkacz', 'R16', '1-6 6-3 7-6(6)', 124, 107, 65, 79, 57, None, None, 'tennis.com'),
 ('Alexander Zverev', 'Yibing Wu', 'R64', '6-4 7-6(4)', 95, 60, 47, 67, 44, 5, 6, 'tennis.com'),
 ('Alexander Zverev', 'Quentin Halys', 'R32', '6-4 6-7(8) 6-3', 136, 98, 73, 100, 69, 19, 13, 'tennis.com'),
 ('Alexander Zverev', 'Alexander Bublik', 'R16', '7-6(6) 4-6 7-6(1)', 157, 101, 76, 123, 81, 15, 20, 'tennis.com/DeepCourt/TA (aces 15)'),
 ('Alex de Minaur', 'Rei Sakamoto', 'R32', '7-6(6) 6-4', 94, 64, 51, 73, 49, 11, 13, 'tennis.com'),
 ('Alex de Minaur', 'Karen Khachanov', 'R16', '6-3 6-4', 85, 56, 42, 54, 35, 4, 3, 'tennis.com'),
]
def frame():
    out = []
    for w, l, rnd, sc, mins, ws, wp, ls, lp, wa, la, src in ROWS:
        out.append(dict(date=D, tourney='Shanghai Masters', surface='Hard', level='M', rnd=rnd, w=w, l=l, wrank=float('nan'), lrank=float('nan'),
                        score=sc, bestof=3, minutes=mins, w_svpt=ws, w_spw=wp, w_ace=wa, w_df=float('nan'), w_1stin=float('nan'), w_1stwon=float('nan'), w_2ndwon=float('nan'),
                        l_svpt=ls, l_spw=lp, l_ace=la, l_df=float('nan'), l_1stin=float('nan'), l_1stwon=float('nan'), l_2ndwon=float('nan'), src='SH26:' + src, exact=True))
    return pd.DataFrame(out)
