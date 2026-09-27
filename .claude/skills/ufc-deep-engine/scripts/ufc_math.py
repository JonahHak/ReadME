"""UFC deep engine math helpers. Pure standard library so it runs anywhere.

Usage from the skill: `python3 ufc_math.py selftest` or import the functions.
"""
import itertools
import math
import sys

# Base rates recomputed from iankotliar/UFC_Final (n=4608 UFC fights, 2008-2020).
BASE = {
    "fav_wins": 0.660,
    "decision": 0.484,
    "ko_tko": 0.321,
    "submission": 0.195,
    # share of finishes by round (3-round fights dominate; R4/R5 only in 5-rounders)
    "finish_round_share": [0.513, 0.311, 0.158, 0.011, 0.008],
}

PROB_CEILING = 0.97
ENGINE_OVERCONFIDENCE_PTS = 10.0  # Calibration Log: 56.4% hit vs 66.2% claimed (55 picks)


def implied(american):
    """Raw implied probability from American odds (includes vig)."""
    a = float(american)
    return 100.0 / (a + 100.0) if a > 0 else -a / (-a + 100.0)


def to_american(p):
    """Fair American odds for probability p."""
    p = min(max(p, 1e-6), 1 - 1e-6)
    return round(-100 * p / (1 - p)) if p >= 0.5 else round(100 * (1 - p) / p)


def devig(*prices):
    """Proportional de-vig of a complete market (2-way or n-way)."""
    raw = [implied(x) for x in prices]
    s = sum(raw)
    return [r / s for r in raw]


def band_curve(p_fav):
    """Map a de-vigged favourite probability onto the empirical band curve.

    Heavy favourites (>= ~0.75, i.e. -300 and shorter) are honest or +1pt.
    Mid-range favourites (-140 to -249, ~0.58-0.71) run 4-6pts hot, so cut 5.
    Short favourites (< 0.58) get a 2pt cut.
    """
    if p_fav >= 0.75:
        return min(p_fav + 0.01, PROB_CEILING)
    if p_fav >= 0.58:
        return p_fav - 0.05
    if p_fav > 0.5:
        return p_fav - 0.02
    return p_fav


def solve_round_ladder(ladder_probs):
    """Round-total ladder -> P(fight ends in each segment) and P(decision).

    ladder_probs: de-vigged probabilities in time order, ending with P(decision), e.g.
    3-rounder [P(over 1.5), P(over 2.5), P(decision)] or
    5-rounder [P(over 1.5), P(over 2.5), P(over 3.5), P(over 4.5), P(decision)].
    A leading 1.0 (the fight starts) is added. Each segment's finish probability is the drop
    between consecutive rungs; the ladder is forced monotone first.
    """
    ladder = [1.0] + [min(max(x, 0.0), 1.0) for x in ladder_probs]
    for i in range(1, len(ladder)):
        ladder[i] = min(ladder[i], ladder[i - 1])
    segments = [ladder[i] - ladder[i + 1] for i in range(len(ladder) - 1)]
    return segments, ladder[-1]


def combine(sources, weight_sets):
    """Average each AI's weights, then blend the sources.

    sources: {"market": 0.62, "elo": 0.58, "codex": 0.6, ...}   (fighter A win prob)
    weight_sets: list of {source: weight} dicts, one per AI review. Each sums to 1.
    Returns (blended_probability, averaged_weights).
    """
    keys = sorted(sources)
    avg = {k: sum(w.get(k, 0.0) for w in weight_sets) / len(weight_sets) for k in keys}
    total = sum(avg.values()) or 1.0
    avg = {k: v / total for k, v in avg.items()}
    return sum(avg[k] * sources[k] for k in keys), avg


def apply_news(p, adjustments, market_weight):
    """Apply fight-week news (weight cut, short notice, injury) to the non-market share only.

    adjustments: list of probability-point shifts for fighter A (e.g. -0.03).
    The market already prices public news, so only (1 - market_weight) of each shift applies.
    """
    shift = sum(adjustments) * (1.0 - market_weight)
    return min(max(p + shift, 1 - PROB_CEILING), PROB_CEILING)


def widen_tail(p_model, p_model_ref, p_comparables_ref):
    """Widen a tail probability to match comparables.

    The research rule is 'use the lower of the model and the comparable fights'.
    When a reference line shows the model tail too thin (p_model_ref > p_comparables_ref),
    scale every other tail on the card by the same factor.
    """
    factor = (1 - p_comparables_ref) / max(1 - p_model_ref, 1e-9)
    return max(0.0, 1 - (1 - p_model) * max(factor, 1.0))


def calibrate(p, pts=ENGINE_OVERCONFIDENCE_PTS, bucket_penalty=None):
    """Shrink a claim toward 0.5 by the engine's measured overconfidence.

    Default: remove `pts` of the claimed excess over 50% proportionally (10pts on a 0.66 mean
    claim means scale excess by (0.664-0.5-0.10)/(0.664-0.5)). Pass bucket_penalty to override.
    """
    if bucket_penalty is not None:
        return max(0.5, p - bucket_penalty) if p > 0.5 else p
    scale = max(0.0, (0.662 - 0.5 - pts / 100.0) / (0.662 - 0.5))
    return 0.5 + (p - 0.5) * scale if p > 0.5 else p


def rank_window(candidates, lo=-160, hi=100):
    """Rank markets by our probability, keeping only prices inside [lo, hi] American.

    candidates: list of dicts {name, p, price, price_source} where price_source is
    'book' (read off the book) or 'estimated' (de-vigged market + standard vig).
    """
    def in_window(a):
        return (a < 0 and a >= lo) or (a > 0 and a <= hi) or a == 100

    keep = [c for c in candidates if in_window(c["price"])]
    for c in keep:
        c["breakeven"] = implied(c["price"])
        c["edge_pts"] = round((c["p"] - c["breakeven"]) * 100, 1)
    return sorted(keep, key=lambda c: -c["p"])


def estimate_price(p_market_fair, vig=0.045):
    """Estimate an unlisted price from the book's own fair probability plus standard vig."""
    return to_american(min(p_market_fair * (1 + vig), 0.99))


def parlay(legs):
    """legs: list of (p, american). Returns combined p, decimal price, breakeven, EV per $1."""
    p = math.prod(x[0] for x in legs)
    dec = math.prod(1 + (a / 100 if a > 0 else 100 / -a) for _, a in legs)
    return p, dec, 1 / dec, p * (dec - 1) - (1 - p)


def best_parlays(pool, min_legs=2, max_legs=4, floor=0.5):
    """All independent-leg parlays from pool (p>=0.75 legs) with combined p >= floor, by EV."""
    out = []
    for n in range(min_legs, max_legs + 1):
        for combo in itertools.combinations(pool, n):
            p, dec, be, ev = parlay([(c["p"], c["price"]) for c in combo])
            if p >= floor:
                out.append({"legs": [c["name"] for c in combo], "p": p, "decimal": dec,
                            "breakeven": be, "ev": ev})
    return sorted(out, key=lambda r: -r["ev"])


def selftest():
    a, b = devig(-350, 280)
    assert abs(a + b - 1) < 1e-9 and 0.74 < a < 0.76
    rounds, dec = solve_round_ladder([0.856, 0.62, 0.40])
    assert abs(sum(rounds) + dec - 1) < 1e-9
    p, w = combine({"market": 0.70, "elo": 0.64, "codex": 0.66},
                   [{"market": 0.6, "elo": 0.2, "codex": 0.2},
                    {"market": 0.5, "elo": 0.3, "codex": 0.2}])
    assert abs(sum(w.values()) - 1) < 1e-9 and 0.64 < p < 0.70
    assert apply_news(0.70, [-0.03], 0.55) < 0.70
    assert widen_tail(0.936, 0.874, 0.84) < 0.936
    assert calibrate(0.80) < 0.80
    ranked = rank_window([{"name": "A ML", "p": 0.60, "price": -150, "price_source": "book"},
                          {"name": "B ML", "p": 0.40, "price": 130, "price_source": "book"},
                          {"name": "Over 1.5", "p": 0.66, "price": -180, "price_source": "book"}])
    assert [r["name"] for r in ranked] == ["A ML"]
    p, dec, be, ev = parlay([(0.893, -900), (0.79, -350)])
    assert abs(p - 0.705) < 0.01
    print("selftest ok")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "selftest":
        selftest()
