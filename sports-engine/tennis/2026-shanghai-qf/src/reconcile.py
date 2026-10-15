"""Step 9: grade Grok/Gemini, pool BLIND numbers in log-odds (weights by record + tonight's audit), blend once with
the market (avoids double-counting markets already inside each AI's 'final'), re-centre, re-price."""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from qf_model import logit
OUT = os.path.join(os.path.dirname(__file__), '..', 'output')
mk = json.load(open(f'{OUT}/markets.json'))
def inv(x): return 1 / (1 + np.exp(-x))
W = {'Claude': 0.70, 'Gemini': 0.15, 'Grok': 0.15}   # start 0.6/0.2/0.2; audit below moves 0.10 to Claude
BLIND = {'QF-A': {'Claude': mk['QF-A']['blind'], 'Gemini': 0.555, 'Grok': 0.46},      # P(Gea)
         'QF-B': {'Claude': mk['QF-B']['blind'], 'Gemini': 0.5363, 'Grok': 0.58}}     # P(Zverev)
FINALS_REPORTED = {'QF-A': {'Gemini': 0.525, 'Grok': 0.47}, 'QF-B': {'Gemini': 0.608, 'Grok': 0.55}}
rec = {}
for k in ('QF-A', 'QF-B'):
    pool = inv(sum(W[a] * logit(BLIND[k][a]) for a in W)); cons = mk[k]['consensus']
    final = inv(0.5 * logit(pool) + 0.5 * logit(cons))
    alt = inv(sum(W[a] * logit(v) for a, v in {**FINALS_REPORTED[k], 'Claude': mk[k]['final']}.items()))
    rec[k] = dict(blind=BLIND[k], weights=W, pooled_blind=pool, consensus=cons, final_pooled=final, final_pre_recon=mk[k]['final'], check_pool_of_finals=alt)
    print(f'{k}: pooled blind {pool:.4f} | consensus {cons:.4f} | FINAL {final:.4f} (was {mk[k]["final"]:.4f}; pool-of-finals check {alt:.4f})')
    mk[k]['final_pre_recon'] = mk[k]['final']; mk[k]['final'] = final; mk[k]['pooled_blind'] = pool
json.dump(mk, open(f'{OUT}/markets.json', 'w'), indent=1, default=float)
json.dump(rec, open(f'{OUT}/reconcile.json', 'w'), indent=1, default=float)
