// One-time script: resolves Google Photos share links (photos.app.goo.gl/...)
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
//   node scripts/resolve-photos.mjs --force       <- re-resolve EVERYTHING

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.\n' +
    'Run this script like:\n' +
    '  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/resolve-photos.mjs 5'
  );
  process.exit(1);
}

const force = process.argv.includes('--force');
const limitArg = process.argv.find((arg) => arg !== '--force' && /^\d+$/.test(arg));
const limit = limitArg ? parseInt(limitArg, 10) : null;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function resolveDirectImageUrl(shareUrl) {
  const response = await fetch(shareUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const html = await response.text();

  // Google Photos share pages embed an Open Graph image tag for link
  // previews (e.g. what shows up when you paste the link into iMessage).
  // That tag's content is the real, direct image URL we want.
  const match = html.match(/<meta property="og:image" content="([^"]+)"/);
  return match ? match[1] : null;
}

async function main() {
  if (force) {
    console.log('Running with --force: reprocessing rows even if they already have a direct_photo_url.\n');
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
  }

  console.log(`Processing ${rows.length} row(s)...\n`);

  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const directUrl = await resolveDirectImageUrl(row.photo_url);

      if (!directUrl) {
        console.log(`NO IMAGE FOUND  [${row.id}] ${row.description?.slice(0, 50)}`);
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('stairways')
        .update({ direct_photo_url: directUrl })
        .eq('id', row.id);

      if (updateError) {
        console.log(`SAVE FAILED     [${row.id}] ${updateError.message}`);
        failed++;
      } else {
        console.log(`OK              [${row.id}] ${row.description?.slice(0, 50)}`);
        succeeded++;
      }
    } catch (e) {
      console.log(`ERROR           [${row.id}] ${e.message}`);
      failed++;
    }

    // Small pause between requests to avoid hammering Google's servers.
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(`\nDone. Succeeded: ${succeeded}, Failed/No image: ${failed}`);
}

main();
