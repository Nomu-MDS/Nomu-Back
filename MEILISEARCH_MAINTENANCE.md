# 🔍 Guide de maintenance Meilisearch

## Problème résolu

**Symptôme :** Le front-end affiche des utilisateurs supprimés/désactivés dans les résultats de recherche.

**Cause :** Le script de réindexation ajoutait de nouveaux profils à l'index Meilisearch sans supprimer les anciens documents obsolètes.

**Solution :** Modification du service `reindexAllProfiles` pour vider complètement l'index avant de le remplir avec uniquement les profils actifs et searchable.

---

## 🛠️ Commandes disponibles

### En développement local

```bash
# Réindexer tous les profils (vide l'index puis réindexe)
docker compose exec api npm run reindex

# Nettoyer l'index et réindexer (identique à reindex maintenant)
docker compose exec api npm run clean-index
```

### En production (VPS)

```bash
# Se connecter au VPS
ssh user@your-vps-ip

# Accéder au répertoire du projet
cd /path/to/nomu-back

# Réindexer tous les profils
docker exec express-api npm run reindex

# OU utiliser le script de nettoyage
docker exec express-api npm run clean-index
```

---

## 📋 Processus de réindexation

Le script `reindexAllProfiles` effectue maintenant les étapes suivantes :

1. **Vide l'index Meilisearch** → Supprime tous les documents obsolètes
2. **Récupère les profils actifs** → Interroge PostgreSQL pour les profils avec :
   - `is_searchable = true`
   - `User.is_active = true`
3. **Formate les données** → Prépare les documents pour Meilisearch
4. **Indexe les profils** → Ajoute uniquement les profils actifs à l'index

---

## 🔄 Réindexation automatique

Le serveur réindexe automatiquement les profils :
- ✅ **Au démarrage** du serveur
- ✅ **Toutes les 2 heures** (intervalle configurable dans `server.js`)

Cela garantit que l'index Meilisearch reste synchronisé avec PostgreSQL.

---

## 🧪 Vérification

Après avoir exécuté le script, vérifiez que le nombre de profils indexés correspond au nombre attendu :

```bash
# Le script affiche :
# ✅ X profil(s) réindexé(s) dans Meilisearch
```

Comparez ce nombre avec :
- Le nombre d'utilisateurs actifs (`is_active = true`)
- Ayant un profil searchable (`is_searchable = true`)

---

## 🚨 Actions immédiates sur production

Pour corriger le problème actuel sur le VPS :

```bash
# 1. Se connecter au VPS
ssh user@your-vps-ip

# 2. Naviguer vers le projet
cd /app  # ou le chemin approprié

# 3. Exécuter le nettoyage
docker exec express-api npm run clean-index

# 4. Vérifier les logs
docker logs express-api --tail=50
```

Le script devrait afficher quelque chose comme :
```
📊 Profils actifs et searchable dans PostgreSQL : 2
✅ 2 profil(s) réindexé(s) dans Meilisearch
```

---

## 📝 Notes

- Les modifications ont été apportées aux fichiers :
  - `app/services/meilisearch/meiliProfileService.js` → Ajout de `clearIndex()`
  - `app/services/meilisearch/reindexService.js` → Vide l'index avant réindexation
  - `app/scripts/cleanDeletedUsers.js` → Nouveau script de nettoyage

- Le serveur backend redémarre automatiquement toutes les 2h pour réindexer
- En cas de suppression d'utilisateur via l'admin, l'index est mis à jour immédiatement
