#!/usr/bin/env python3
# Run from your project root: python3 patch_23_force_resolve_photos.py
path = 'scripts/resolve-photos.mjs'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

old_comment = """// One-time script: resolves Google Photos share links (photos.app.goo.gl/...)
// into their real, direct, hotlinkable image URLs, and saves them into the
// `direct_photo_url` column in Supabase.
//
// Safe to interrupt and re-run: it only processes rows that don't already
// have a direct_photo_url, so nothing gets redone or duplicated.
//
// Usage:
//   node scripts/resolve-photos.mjs 5      <- test on just 5 rows first
//   node scripts/resolve-photos.mjs         <- run on everything remaining"""

new_comment = """// One-time script: resolves Google Photos share links (photos.app.goo.gl/...)
// into their real, direct, hotlinkable image URLs, and saves them into the
// `direct_photo_url` column in Supabase.
//
// By default, only processes rows that don't already have a
// direct_photo_url, so it's safe to interrupt and re-run without redoing
// work. Pass --force to reprocess EVERY row with a photo_url, including
// ones that already have a (possibly stale) direct_photo_url -- use this
// after updating existing photos in the Google Sheet, since a normal run
// would otherwise skip rows that already resolved once before.
//
// Usage:
//   node scripts/resolve-photos.mjs 5             <- test on 5 unresolved rows
//   node scripts/resolve-photos.mjs               <- resolve everything unresolved
//   node scripts/resolve-photos.mjs --force 5     <- test re-resolving 5 rows
//   node scripts/resolve-photos.mjs --force       <- re-resolve EVERYTHING"""

content = do_replace(content, old_comment, new_comment, "Edit 1 (comment)")

old_args = """const limitArg = process.argv[2];
const limit = limitArg ? parseInt(limitArg, 10) : null;"""

new_args = """const force = process.argv.includes('--force');
const limitArg = process.argv.find((arg) => arg !== '--force' && /^\\d+$/.test(arg));
const limit = limitArg ? parseInt(limitArg, 10) : null;"""

content = do_replace(content, old_args, new_args, "Edit 2 (parse --force flag)")

old_query = """  let query = supabase
    .from('stairways')
    .select('id, description, photo_url')
    .not('photo_url', 'is', null)
    .is('direct_photo_url', null);

  if (limit) {
    query = query.limit(limit);
  }"""

new_query = """  let query = supabase
    .from('stairways')
    .select('id, description, photo_url')
    .not('photo_url', 'is', null);

  if (!force) {
    query = query.is('direct_photo_url', null);
  }

  if (limit) {
    query = query.limit(limit);
  }

  if (force) {
    console.log('Running with --force: reprocessing rows even if they already have a direct_photo_url.\\n');
  }"""

content = do_replace(content, old_query, new_query, "Edit 3 (conditional filter)")

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} now supports --force to reprocess stairways that already have a direct_photo_url.")
