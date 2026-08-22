import { describe, expect, it, vi } from 'vitest';
import {
  CHECK_INS_PAGE_SIZE,
  fetchAllCheckIns,
  storagePathFromPublicUrl,
} from './checkInData.js';

function pagedSupabase(pages) {
  const range = vi.fn(async () => pages.shift());
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range,
  };
  return { client: { from: vi.fn(() => chain) }, range };
}

describe('fetchAllCheckIns', () => {
  it('keeps paging after a full 1,000-row response', async () => {
    const firstPage = Array.from({ length: CHECK_INS_PAGE_SIZE }, (_, id) => ({ id }));
    const secondPage = [{ id: CHECK_INS_PAGE_SIZE }];
    const { client, range } = pagedSupabase([
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ]);

    const result = await fetchAllCheckIns(client, 'user-1');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(CHECK_INS_PAGE_SIZE + 1);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('returns an error without requesting another page', async () => {
    const error = new Error('query failed');
    const { client, range } = pagedSupabase([{ data: null, error }]);

    await expect(fetchAllCheckIns(client, 'user-1')).resolves.toEqual({
      data: null,
      error,
    });
    expect(range).toHaveBeenCalledTimes(1);
  });
});

describe('storagePathFromPublicUrl', () => {
  it('extracts the object path from a check-in photo URL', () => {
    expect(
      storagePathFromPublicUrl(
        'https://example.supabase.co/storage/v1/object/public/checkin-photos/user-1/stair-2.jpg'
      )
    ).toBe('user-1/stair-2.jpg');
  });

  it('does not guess a path for an unrelated URL', () => {
    expect(storagePathFromPublicUrl('https://example.com/photo.jpg')).toBeNull();
  });
});
