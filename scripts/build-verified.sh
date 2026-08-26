#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

pdf_worker_source="${SITES_PROJECT_ROOT}/node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
pdf_worker_target="${SITES_PROJECT_ROOT}/public/pdf.worker.min.mjs"
if [[ ! -f "${pdf_worker_source}" ]]; then
  echo "PDF.js worker is unavailable. Run npm run install:ci before building." >&2
  exit 69
fi
cp "${pdf_worker_source}" "${pdf_worker_target}"
trap 'rm -f "${pdf_worker_target}"' EXIT

echo "Running bounded vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build
