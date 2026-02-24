#!/bin/bash
# Fonction pour sauvegarder un site web
save_website() {
    local url=$1
    echo "Sauvegarde de $url..."
    wget --mirror \
         --convert-links \
         --adjust-extension \
         --page-requisites \
         --no-parent \
         --restrict-file-names=windows \
         --directory-prefix=static/ \
         --quiet \
         "$url"
}

# DEMO:
# save_website https://fox3000foxy.com

export GIT_AUTHOR_NAME="backup-bot"
export GIT_AUTHOR_EMAIL="backup-bot@local"
export GIT_COMMITTER_NAME="backup-bot"
export GIT_COMMITTER_EMAIL="backup-bot@local"

git pull
git add * 
git commit -m "Save dump $(date '+%d/%m/%Y %H:%M')"
git push