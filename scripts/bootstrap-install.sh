#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Shlol762/QuestionBankDB.git"
ARCHIVE_URL="https://github.com/Shlol762/QuestionBankDB/archive/refs/heads/Live-Version.tar.gz"
BRANCH="Live-Version"
TARGET_DIR="${1:-QuestionBankDB}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: Missing required command '$1'."
    exit 1
  fi
}

clone_with_git() {
  echo "Cloning repository into '$TARGET_DIR'..."
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
}

clone_with_archive() {
  need_cmd curl
  need_cmd tar

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  echo "Downloading repository archive into '$TARGET_DIR'..."
  curl -fsSL "$ARCHIVE_URL" -o "$tmp_dir/repo.tar.gz"
  tar -xzf "$tmp_dir/repo.tar.gz" -C "$tmp_dir"

  local extracted_dir
  extracted_dir="$(find "$tmp_dir" -maxdepth 1 -type d -name 'QuestionBankDB-*' | head -n 1)"

  if [[ -z "$extracted_dir" ]]; then
    echo "Error: Could not unpack repository archive."
    exit 1
  fi

  mv "$extracted_dir" "$TARGET_DIR"
}

if [[ -d "$TARGET_DIR" ]]; then
  if [[ -f "$TARGET_DIR/docker-compose.production.yml" && -f "$TARGET_DIR/scripts/install.sh" ]]; then
    echo "Using existing project directory '$TARGET_DIR'."
  else
    echo "Error: Target directory '$TARGET_DIR' already exists but is not a QuestionBankDB repository."
    echo "Choose a different directory or remove it, then retry."
    exit 1
  fi
else
  if command -v git >/dev/null 2>&1; then
    clone_with_git
  else
    clone_with_archive
  fi
fi

cd "$TARGET_DIR"

echo "Starting project installer..."
bash scripts/install.sh
