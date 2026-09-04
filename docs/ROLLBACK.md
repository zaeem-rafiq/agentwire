# Rollback
Rollback point: 4ff8dec7212ae86023d3c28e042edf05bab87757
git revert --no-edit 4ff8dec7212ae86023d3c28e042edf05bab87757..HEAD
firebase deploy --only hosting
make smoke-live
