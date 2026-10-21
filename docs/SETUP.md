# Mise en place (à faire une seule fois)

Ordre conseillé : clé SSH → VM → token Docker Hub → dépôt + secrets → push.
Si vous poussez avant d'avoir créé les secrets, le pipeline échouera au job 3 : il suffira
de créer les secrets puis de cliquer sur *Re-run all jobs*.

## 1. Clé SSH dédiée au déploiement

Sur votre poste :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tp_cicd_deploy -N "" -C "github-actions-deploy"
```

- `~/.ssh/tp_cicd_deploy.pub` (publique) → installée sur la VM ;
- `~/.ssh/tp_cicd_deploy` (privée) → secret GitHub `VM_SSH_KEY`. Ne la commitez jamais.

## 2. VM Azure

### Option A — Azure CLI (recommandé)

```bash
az login
./infra/create-vm.sh
```

Le script crée le groupe `rg-tp-cicd`, une VM Ubuntu 24.04 `Standard_B1s` avec votre clé
publique, installe Docker via `cloud-init`, ouvre le port 80 et affiche l'IP publique.
Région ou taille refusée (fréquent avec *Azure for Students*) :

```bash
LOCATION=westeurope SIZE=Standard_B2s ./infra/create-vm.sh
```

### Option B — Portail Azure

*Machines virtuelles → Créer* :

- Image : **Ubuntu Server 24.04 LTS**, taille : **Standard_B1s** (ou B2s) ;
- Authentification : **Clé publique SSH**, utilisateur `azureuser`,
  source « Utiliser une clé publique existante » → coller le contenu de `tp_cicd_deploy.pub` ;
- Ports d'entrée : **HTTP (80)** et **SSH (22)**.

Inutile d'installer Docker à la main : `scripts/deploy.sh` l'installe au premier déploiement.

Vérification :

```bash
ssh -i ~/.ssh/tp_cicd_deploy azureuser@<IP_PUBLIQUE> "echo ok"
```

## 3. Token Docker Hub

*hub.docker.com → Account settings → Personal access tokens → Generate new token*,
permissions **Read & Write**. Copiez-le (il n'est affiché qu'une fois).

Le dépôt `tp-cicd-app` est créé automatiquement au premier push. Il doit être **public**
(par défaut sur un compte gratuit) pour que la VM puisse le télécharger sans identifiants.

## 4. Dépôt GitHub + secrets

1. Créez un dépôt vide sur GitHub (sans README).
2. *Settings → Secrets and variables → Actions → New repository secret* :

   | Nom | Valeur |
   | --- | --- |
   | `DOCKERHUB_USERNAME` | votre identifiant Docker Hub |
   | `DOCKERHUB_TOKEN` | le token de l'étape 3 |
   | `VM_HOST` | IP publique de la VM |
   | `VM_USER` | `azureuser` |
   | `VM_SSH_KEY` | tout le contenu de `~/.ssh/tp_cicd_deploy` (lignes `-----BEGIN` / `-----END` comprises) |

   Sur macOS : `pbcopy < ~/.ssh/tp_cicd_deploy` copie la clé privée dans le presse-papiers.

3. Poussez le code :

   ```bash
   git remote add origin https://github.com/ethannoe/MLOPSPROJET2.git
   git push -u origin main
   ```

4. Onglet **Actions** : les 4 jobs passent au vert, le résumé affiche l'URL de l'application.

## 5. Capture d'écran et README

1. Ouvrez `http://<IP_PUBLIQUE>:8642` dans le navigateur, avec la barre d'adresse visible.
2. Enregistrez la capture sous `docs/capture-vm.png`.
3. Si l'IP ou le port changent, mettez à jour l'URL en haut du README (et `HOST_PORT` dans le workflow).
4. `git add . && git commit -m "docs: capture de la VM" && git push` : ce push redéploie automatiquement.

## 6. Démontrer l'idempotence

- *Actions → dernier run → Re-run all jobs* : le log du job Deploy affiche
  `Le conteneur 'ethannoe-tp-cicd' exécute déjà cette image -> aucun redémarrage`.
- Sur la VM, il n'y a toujours qu'un seul conteneur :

  ```bash
  ssh -i ~/.ssh/tp_cicd_deploy ubuntu@<IP_PUBLIQUE> docker ps --filter name=ethannoe-tp-cicd
  ```

## Dépannage

| Symptôme | Cause probable |
| --- | --- |
| `Permission denied (publickey)` | `VM_SSH_KEY` incomplète, mauvais `VM_USER`, ou clé publique différente sur la VM |
| `ssh-keyscan` / `Connection timed out` | mauvaise IP ou port 22 fermé dans le groupe de sécurité réseau (NSG) |
| `pull access denied` sur la VM | dépôt Docker Hub privé → le passer en public |
| Healthcheck en échec mais deploy OK | le port (`HOST_PORT`, 8642) n'est pas ouvert dans le groupe de sécurité réseau (NSG) |
| `unauthorized` au login Docker Hub | token expiré ou en lecture seule |

## Fin du TP

Pour ne plus consommer de crédits Azure :

```bash
az group delete --name rg-tp-cicd --yes --no-wait
```
