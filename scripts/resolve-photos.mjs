// One-time script: resolves Google Photos share links (photos.app.goo.gl/...)
// into their real, direct, hotlinkable image URLs, and saves them into the
// `direct_photo_url` column in Supabase.
//
// Safe to interrupt and re-run: it only processes rows that don't already
// have a direct_photo_url, so nothing gets redone or duplicated.
//
// Usage:
//   node scripts/resolve-photos.mjs 5      <- test on just 5 rows first
//   node scripts/resolve-photos.mjs         <- run on everything remaining

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

const limitArg = process.argv[2];
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
  let query = supabase
    .from('stairways')
    .select('id, description, photo_url')
    .not('photo_url', 'is', null)
    .is('direct_photo_url', null);

  if (limit) {
    query = query.limit(limit);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Failed to fetch rows from Supabase:', error.message);
    process.exit(1);
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
