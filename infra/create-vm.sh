#!/usr/bin/env bash
# Création de la VM Azure (à lancer une seule fois, avec Azure CLI connecté : `az login`,
# ou depuis Azure Cloud Shell après avoir cloné le dépôt).
#
# Variables surchargeables : RG, LOCATION, VM, ADMIN, SIZE, SSH_PUB
#   ex : LOCATION=westeurope SIZE=Standard_B2s ./infra/create-vm.sh
set -euo pipefail

RG="${RG:-rg-tp-cicd}"
LOCATION="${LOCATION:-francecentral}"
VM="${VM:-vm-tp-cicd}"
ADMIN="${ADMIN:-azureuser}"
SIZE="${SIZE:-Standard_B1s}"
SSH_PUB="${SSH_PUB:-$HOME/.ssh/tp_cicd_deploy.pub}"
HERE="$(cd "$(dirname "$0")" && pwd)"

[[ -f "$SSH_PUB" ]] || {
  echo "Clé publique introuvable : $SSH_PUB"
  echo "Générez-la avec : ssh-keygen -t ed25519 -f ~/.ssh/tp_cicd_deploy -N '' -C github-actions-deploy"
  exit 1
}

echo "> Groupe de ressources $RG ($LOCATION)"
az group create --name "$RG" --location "$LOCATION" --output none

echo "> VM $VM ($SIZE, Ubuntu 24.04)"
az vm create \
  --resource-group "$RG" \
  --name "$VM" \
  --image Ubuntu2404 \
  --size "$SIZE" \
  --admin-username "$ADMIN" \
  --ssh-key-values "$SSH_PUB" \
  --custom-data "$HERE/cloud-init.yml" \
  --public-ip-sku Standard \
  --output none

echo "> Ouverture du port 80 (HTTP) — le port 22 (SSH) est ouvert par défaut"
az vm open-port --resource-group "$RG" --name "$VM" --port 80 --priority 1010 --output none

IP="$(az vm show --show-details --resource-group "$RG" --name "$VM" --query publicIps --output tsv)"

cat << EOF

VM prête. Secrets GitHub à créer :
  VM_HOST    = $IP
  VM_USER    = $ADMIN
  VM_SSH_KEY = contenu de ${SSH_PUB%.pub}

Pour supprimer toutes les ressources à la fin du TP :
  az group delete --name $RG --yes --no-wait
EOF
