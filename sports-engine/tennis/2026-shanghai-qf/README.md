# Deep Sports Engine — Shanghai Masters 2026 quarterfinals (Oct 15)

QF-A Arthur Gea vs Alejandro Davidovich Fokina · QF-B Alexander Zverev vs Alex de Minaur.

**Report:** `output/report_notion.md` (also published to Notion) · **Workbook:** `output/Shanghai_2026_QF_model.xlsx`
(editable model tabs with live formulas, Pricing tab with DraftKings price inputs, raw tables).

## Pipeline
| Step | Script | Output |
|---|---|---|
| Data | `fetch_data.sh` (TML 2023–Jan 2026, Match Charting Project); `data/ta_tourney/*.md` (Tennis Abstract 2026 tables via Exa); `src/shanghai.py` (this week) | — |
| Exact point model | `src/pointmodel.py`, `src/exactsets.py`, `src/grid.py` | `data/grid.npz` |
| Ratings | `src/ratings.py` (weighted ridge, 730 d window, 365 d half-life, λ=150, rank prior) | — |
| Backtest | `src/backtest.py` → `src/evaluate.py` | `output/bt_*.csv` |
| Match model | `src/qf_model.py` (blind) | `output/qf_results.json` |
| Markets | `src/markets.py` (consensus, waterfall, blend, inversion) | `output/markets.json` |
| Card | `src/card.py` (re-centred 60k sims, price ladder, SGPs) · `src/tripwires.py` | `output/card.json`, `output/tripwires.json` |
| Tactics | `src/mcp_analytics.py` | `output/mcp_analytics.csv` |
| Workbook | `src/build_xlsx.py` (then LibreOffice recalc) | `output/Shanghai_2026_QF_model.xlsx` |

Run order: `./fetch_data.sh && python3 src/grid.py && python3 src/backtest.py && python3 src/evaluate.py && python3 src/qf_model.py && python3 src/markets.py && python3 src/card.py && python3 src/tripwires.py && python3 src/build_xlsx.py`

21+, 1-800-GAMBLER; not betting advice.
