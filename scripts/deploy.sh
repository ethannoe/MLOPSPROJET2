#!/usr/bin/env bash
# Script exécuté SUR la VM Azure, envoyé via SSH par GitHub Actions :
#   ssh user@vm 'bash -s -- <image:tag>' < scripts/deploy.sh
#
# Il est idempotent : on peut le relancer autant de fois que l'on veut,
# il n'y aura toujours qu'un seul conteneur "myapp".
#   - même image déjà en cours d'exécution  -> rien n'est redémarré
#   - nouvelle image                         -> l'ancien conteneur est remplacé
set -euo pipefail

IMAGE="${1:?Usage: deploy.sh <image:tag> [nom_conteneur] [port_hote]}"
NAME="${2:-myapp}"
HOST_PORT="${3:-80}"
APP_PORT=3000

log() { echo "[deploy] $*"; }

# 1. Provisioning : installe Docker s'il est absent (VM neuve)
if ! command -v docker > /dev/null 2>&1; then
  log "Docker absent -> installation"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io curl
  sudo systemctl enable --now docker
fi

# L'utilisateur n'est pas forcément dans le groupe docker
DOCKER=(docker)
if ! docker info > /dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

# 2. Récupération de l'image depuis Docker Hub
log "Récupération de $IMAGE"
"${DOCKER[@]}" pull --quiet "$IMAGE"

TARGET_ID="$("${DOCKER[@]}" image inspect --format '{{.Id}}' "$IMAGE")"
CURRENT_ID="$("${DOCKER[@]}" inspect --format '{{.Image}}' "$NAME" 2> /dev/null || true)"
RUNNING="$("${DOCKER[@]}" inspect --format '{{.State.Running}}' "$NAME" 2> /dev/null || echo false)"

# 3. (Re)démarrage uniquement si nécessaire
if [[ "$CURRENT_ID" == "$TARGET_ID" && "$RUNNING" == "true" ]]; then
  log "Le conteneur '$NAME' exécute déjà cette image -> aucun redémarrage"
else
  log "Remplacement du conteneur '$NAME'"
  "${DOCKER[@]}" rm -f "$NAME" > /dev/null 2>&1 || true
  "${DOCKER[@]}" run -d \
    --name "$NAME" \
    --restart unless-stopped \
    -p "$HOST_PORT:$APP_PORT" \
    "$IMAGE" > /dev/null
fi

# 4. Vérification locale sur la VM
log "Attente de http://localhost:$HOST_PORT/health"
for _ in $(seq 1 30); do
  if curl -fs --max-time 2 "http://localhost:$HOST_PORT/health"; then
    echo
    break
  fi
  sleep 2
done
curl -fsS --max-time 2 "http://localhost:$HOST_PORT/health" > /dev/null \
  || { log "ÉCHEC : l'application ne répond pas"; "${DOCKER[@]}" logs --tail 50 "$NAME"; exit 1; }

# 5. Nettoyage des anciennes versions de l'image
REPO="${IMAGE%:*}"
"${DOCKER[@]}" images "$REPO" --format '{{.Repository}}:{{.Tag}}' \
  | grep -vxF "$IMAGE" \
  | xargs -r "${DOCKER[@]}" rmi > /dev/null 2>&1 || true

"${DOCKER[@]}" ps --filter "name=^${NAME}$" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
log "Déploiement terminé"
