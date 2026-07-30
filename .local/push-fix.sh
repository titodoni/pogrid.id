#!/bin/bash
# Push fix script — run this from your terminal
cd /home/tito/pogrid

echo "==> Pulling latest remote changes with rebase..."
git pull --rebase origin main

echo ""
echo "==> Pushing to origin main..."
git push origin main

echo ""
echo "Done!"
