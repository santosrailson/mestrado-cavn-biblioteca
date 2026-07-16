#!/usr/bin/env bash
# Valida a integridade dos artefatos de backup sem tocar no banco ou na mídia
# de produção. A restauração em ambiente isolado exige infraestrutura externa.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso: BACKUP_PASSPHRASE=... $0 <arquivo.gpg>" >&2
  exit 1
fi
if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
  echo "ERRO: BACKUP_PASSPHRASE não configurada." >&2
  exit 1
fi
if [[ ! -f "$1" ]]; then
  echo "ERRO: backup não encontrado: $1" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
DECRYPTED="$TMP_DIR/artefato"
gpg --batch --yes --pinentry-mode loopback \
  --passphrase-file <(printf '%s' "$BACKUP_PASSPHRASE") \
  --decrypt --output "$DECRYPTED" "$1"

case "$1" in
  *db_*.sql.gz.gpg)
    gzip -t "$DECRYPTED"
    gunzip -c "$DECRYPTED" | head -n 20 | grep -q "PostgreSQL database dump"
    echo "OK: dump PostgreSQL cifrado e gzip íntegros."
    ;;
  *media_*.tar.gz.gpg)
    tar -tzf "$DECRYPTED" >/dev/null
    echo "OK: arquivo de mídia cifrado e tar íntegro."
    ;;
  *env_*.gpg)
    test -s "$DECRYPTED"
    echo "OK: arquivo de configuração cifrado e não vazio."
    ;;
  *)
    echo "ERRO: nome de backup não reconhecido: $1" >&2
    exit 1
    ;;
esac
