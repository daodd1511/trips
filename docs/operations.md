# Operations

How to run, roll back, and restore the production app. The deploy pipeline itself is
documented in the private `daodd1511/deploy` repo; the trips stack lives in
`apps/trips/` there.

## Migrations and rollback

The app applies pending migrations from `server/migrations/` at startup, before it
serves requests. Each migration runs in one transaction with foreign keys off, and must
pass `PRAGMA foreign_key_check` before it commits. A failed migration changes nothing.

Before it applies any migration to an existing database, the app writes a full copy next
to it: `/srv/trips/data/trips.before-<migration>.<timestamp>.db`. Delete old copies by
hand once you no longer need them.

Most migrations are additive: they add tables or nullable columns. The previous image
still runs against the migrated database, so the pipeline's automatic rollback is safe.

### Exception: 002_places_optional_maps_address

Migration 002 rebuilds `places` so that the Google Maps link is optional. Rolling back to
an image from before 002 (any commit before `0c2f91f`) is safe only while every place
still has a Maps link. After you save a place without a link, that old image:

- returns 400 for every edit to that place, including status and rating;
- cannot import an export that contains it.

After that point, fix forward instead of rolling back, or restore the backup below.
Rolling back to any image that already includes 002 stays safe.

## Restore the database from a backup

Restoring returns the database to the moment the backup was taken. Every change saved
after that moment is lost. Export all trips first if you might want any of them.

1. On the server, list the backups:
   `ls -l /srv/trips/data/trips.before-*.db`
2. Stop the app container so nothing writes during the restore:
   `docker stop trips`
3. Move the current database aside, including its WAL files:
   ```sh
   cd /srv/trips/data
   mkdir -p replaced && mv trips.db trips.db-wal trips.db-shm replaced/ 2>/dev/null
   ```
4. Copy the backup into place and give it to the container user:
   ```sh
   cp trips.before-<migration>.<timestamp>.db trips.db
   sudo chown 1000:1000 trips.db
   ```
5. Deploy the image that matches the backup's schema. For a backup taken before 002,
   that is a commit before `0c2f91f`: run the deploy workflow with that `tag`. Starting
   a newer image instead re-applies the migration, which is also fine.
6. Check `https://trips.<your-domain>/health/ready`, then delete `replaced/` once you
   are sure.
