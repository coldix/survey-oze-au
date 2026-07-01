#!/bin/bash
# Deploy survey.oze.au to Hostinger (oze.au hub subfolder).
# Requires: ~/.ssh/gha_hostinger (chmod 600)
set -e
cd "$(dirname "$0")"
REMOTE="u566466219@46.202.196.151:/home/u566466219/domains/oze.au/public_html/survey/"
rsync -av --progress --delete \
  -e "ssh -i ~/.ssh/gha_hostinger -p 65002 -o IdentitiesOnly=yes" \
  --exclude='.git' --exclude='.github' --exclude='.DS_Store' \
  --exclude='.well-known' --exclude='cgi-bin' --exclude='docs' \
  ./ "$REMOTE"
echo "Done: https://survey.oze.au/"