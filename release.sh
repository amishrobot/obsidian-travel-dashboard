#!/bin/bash
# Release script for Travel Dashboard plugin
# Usage: ./release.sh 1.2.0 "Release notes here"

set -e

VERSION=$1
NOTES=$2

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh <version> [notes]"
  echo "Example: ./release.sh 1.2.0 \"Added new feature\""
  exit 1
fi

if [ -z "$NOTES" ]; then
  NOTES="Release v$VERSION"
fi

echo "📦 Releasing v$VERSION..."

# Update manifest.json version
sed -i '' "s/\"version\":\"[^\"]*\"/\"version\":\"$VERSION\"/" manifest.json

# Build
echo "🔨 Building..."
npm run build

# Commit and push
echo "📤 Pushing to GitHub..."
git add -A
git commit -m "v$VERSION - $NOTES"
git push

# Create release
echo "🚀 Creating GitHub release..."
gh release create "v$VERSION" main.js manifest.json styles.css --title "v$VERSION" --notes "$NOTES"

echo "✅ Released v$VERSION"
echo "BRAT users can now check for updates."
