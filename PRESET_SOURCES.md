# Preset provenance review — 2026-11-03

The previous Balanced, Pure pace, Racecraft and Reliability presets were project-authored. They have been removed because they did not meet the requirement for published F1 or industry-expert numeric recommendations.

Reviewed primary sources:

- [F1 Power Rankings methodology](https://www.formula1.com/en/latest/article/power-rankings-where-do-the-drivers-rank-on-the-final-leaderboard-after-an.RBWmq73lkM5CKZ0hgztOI): five judges score weekend performance, then scores are averaged. This is not a published weight vector for the project's metrics.
- [F1 / AWS Fastest Driver](https://www.formula1.com/en/latest/article/hamilton-schumacher-senna-machine-learning-reveals-the-fastest-f1-driver-of.3DwwPLW4glCmlunjciH1Cz): compares qualifying performance against teammates.
- [AWS technical account, including Rob Smedley](https://aws.amazon.com/blogs/machine-learning/the-fastest-driver-in-formula-1/): describes teammate lap-time differences and Massey's method. It does not recommend weights for this app's 13/17 normalized attributes.

No compatible numeric recommendation was verified in this review. The recommendation registry is therefore empty and the preset controls are not displayed. Initialization and individual/global resets assign the same value (10) to each metric; this is a neutral starting configuration, not an official or expert recommendation. Available weights continue to be normalized by the ranking engine.

Any future recommendation must include the exact published numeric weights, matching metric definitions, author, primary-source URL and preference explanation. The preset renderer exposes the preference and source on hover/focus. Do not convert qualitative advice or a different algorithm into invented numerical weights.
