#!/usr/bin/env python3
# Run from your project root: python3 patch_24_paginate_resolve_photos.py
path = 'scripts/resolve-photos.mjs'
with open(path) as f:
    content = f.read()

old = """  let query = supabase
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
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Failed to fetch rows from Supabase:', error.message);
    process.exit(1);
  }"""

new = """  if (force) {
    console.log('Running with --force: reprocessing rows even if they already have a direct_photo_url.\\n');
  }

  // Supabase caps a single select at 1000 rows by default (db-max-rows) --
  // with 1200+ stairways, a plain unpaginated query silently truncates.
  // Page through with .range() until a page comes back short (or we hit
  // the requested limit), the same pattern already used in the map's
  // own stairway fetch.
  let rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from('stairways')
      .select('id, description, photo_url')
      .not('photo_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (!force) {
      query = query.is('direct_photo_url', null);
    }

    const { data: page, error } = await query;

    if (error) {
      console.error('Failed to fetch rows from Supabase:', error.message);
      process.exit(1);
    }

    rows = rows.concat(page);

    if (limit && rows.length >= limit) {
      rows = rows.slice(0, limit);
      break;
    }

    if (page.length < pageSize) break;
    from += pageSize;
  }"""

count = content.count(old)
if count != 1:
    raise SystemExit(f"Expected exactly 1 match, found {count}. Stopping without changes -- paste this error back and we'll fix it.")

content = content.replace(old, new)
with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} now pages through all rows instead of capping at 1000.")
