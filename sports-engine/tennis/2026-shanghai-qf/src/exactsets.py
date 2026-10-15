"""Exact Bo3 P(A wins) with set-specific serve probabilities (no day-form)."""
from pointmodel import set_dist
def pwin_sets(pa3, pb3):
    tot = 0.0
    for af0, w0 in ((True, .5), (False, .5)):
        states = {(0, 0, af0): w0}
        for s in range(3):
            new = {}
            sd = {True: set_dist(pa3[s], pb3[s], True), False: set_dist(pa3[s], pb3[s], False)}
            for (a, b, af), pr in states.items():
                if a == 2 or b == 2: new[(a, b, af)] = new.get((a, b, af), 0) + pr; continue
                for (x, y), pp in sd[af].items():
                    k = (a + (x > y), b + (y > x), af if (x + y) % 2 == 0 else (not af))
                    new[k] = new.get(k, 0) + pr * pp
            states = new
        tot += sum(pr for (a, b, af), pr in states.items() if a == 2)
    return tot
