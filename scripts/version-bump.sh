#!/bin/bash
# Version Bump Script for Glimmind
# Usage: ./version-bump.sh [check|patch|minor|major|set <version>]

set -e

PROJECT_ROOT="/Users/rodrigo.jara/dev-personal/glimmind"
PACKAGE_JSON="$PROJECT_ROOT/package.json"
VERSION_TS="$PROJECT_ROOT/src/constants/version.ts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[version-bump]${NC} $1"; }
warn() { echo -e "${YELLOW}[version-bump]${NC} $1"; }
error() { echo -e "${RED}[version-bump]${NC} $1"; }

get_package_version() {
  cat "$PACKAGE_JSON" | grep '"version"' | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/'
}

get_ts_version() {
  cat "$VERSION_TS" | grep "APP_VERSION" | sed 's/.*APP_VERSION = '\''\([^'\'']*\)'\''.*/\1/'
}

set_package_version() {
  local new_version="$1"
  # macOS sed requires '' for -i
  sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"
}

set_ts_version() {
  local new_version="$1"
  sed -i '' "s/APP_VERSION = '.*'/APP_VERSION = '$new_version'/" "$VERSION_TS"
}

validate_semver() {
  local version="$1"
  if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Invalid semver: $version (expected x.y.z)"
    exit 1
  fi
}

bump_version() {
  local current="$1"
  local type="$2"
  
  IFS='.' read -r major minor patch <<< "$current"
  
  case "$type" in
    patch)
      patch=$((patch + 1))
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    *)
      error "Unknown bump type: $type"
      exit 1
      ;;
  esac
  
  echo "$major.$minor.$patch"
}

cmd_check() {
  local pkg_ver=$(get_package_version)
  local ts_ver=$(get_ts_version)
  
  echo "package.json: $pkg_ver"
  echo "version.ts:   $ts_ver"
  
  if [[ "$pkg_ver" != "$ts_ver" ]]; then
    error "VERSION MISMATCH!"
    exit 1
  fi
  
  log "Versions match: $pkg_ver"
}

cmd_bump() {
  local type="$1"
  local current=$(get_package_version)
  
  validate_semver "$current"
  
  local new_version=$(bump_version "$current" "$type")
  
  log "Bumping $type: $current → $new_version"
  
  set_package_version "$new_version"
  set_ts_version "$new_version"
  
  # Verify
  local pkg_ver=$(get_package_version)
  local ts_ver=$(get_ts_version)
  
  if [[ "$pkg_ver" != "$new_version" || "$ts_ver" != "$new_version" ]]; then
    error "Failed to update versions correctly"
    exit 1
  fi
  
  log "Success! Both files updated to $new_version"
  
  # Output JSON for programmatic use
  cat <<EOF
{
  "previous": "$current",
  "new": "$new_version",
  "type": "$type",
  "files": ["package.json", "src/constants/version.ts"]
}
EOF
}

cmd_set() {
  local new_version="$1"
  
  validate_semver "$new_version"
  
  local current=$(get_package_version)
  
  log "Setting version: $current → $new_version"
  
  set_package_version "$new_version"
  set_ts_version "$new_version"
  
  # Verify
  local pkg_ver=$(get_package_version)
  local ts_ver=$(get_ts_version)
  
  if [[ "$pkg_ver" != "$new_version" || "$ts_ver" != "$new_version" ]]; then
    error "Failed to update versions correctly"
    exit 1
  fi
  
  log "Success! Both files updated to $new_version"
  
  cat <<EOF
{
  "previous": "$current",
  "new": "$new_version",
  "type": "set",
  "files": ["package.json", "src/constants/version.ts"]
}
EOF
}

main() {
  local cmd="${1:-check}"
  
  case "$cmd" in
    check)
      cmd_check
      ;;
    patch|minor|major)
      cmd_bump "$cmd"
      ;;
    set)
      if [[ -z "$2" ]]; then
        error "Usage: $0 set <version>"
        exit 1
      fi
      cmd_set "$2"
      ;;
    *)
      error "Unknown command: $cmd"
      echo "Usage: $0 [check|patch|minor|major|set <version>]"
      exit 1
      ;;
  esac
}

main "$@"