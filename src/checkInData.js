export const CHECK_INS_PAGE_SIZE = 1000;

export async function fetchAllCheckIns(supabase, userId) {
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('check_ins')
      .select('stairway_id, created_at, verification_method, photo_url')
      .eq('user_id', userId)
      .order('stairway_id', { ascending: true })
      .range(from, from + CHECK_INS_PAGE_SIZE - 1);

    if (error) return { data: null, error };

    const page = data || [];
    all = all.concat(page);
    if (page.length < CHECK_INS_PAGE_SIZE) {
      return { data: all, error: null };
    }

    from += CHECK_INS_PAGE_SIZE;
  }
}

export function storagePathFromPublicUrl(publicUrl) {
  if (!publicUrl) return null;
  const marker = '/checkin-photos/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
