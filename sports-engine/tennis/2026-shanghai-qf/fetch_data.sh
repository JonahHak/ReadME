#!/usr/bin/env bash
# Re-download the public datasets that are too large to commit.
set -e; cd "$(dirname "$0")/data"; mkdir -p tml mcp
for y in 2023 2024 2025 2026; do curl -s -o tml/$y.csv https://raw.githubusercontent.com/Tennismylife/TML-Database/master/$y.csv; done
B=https://raw.githubusercontent.com/JeffSackmann/tennis_MatchChartingProject/master
for f in charting-m-matches.csv charting-m-points-2020s.csv; do curl -s -o mcp/$f $B/$f; done
