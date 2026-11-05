import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from './id';
afterEach(() => vi.unstubAllGlobals());
describe('record IDs on preview hosts', () => {
  it('uses randomUUID when the browser supports it', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'native-uuid' });
    expect(createId()).toBe('native-uuid');
  });
  it('generates unique valid UUIDs on HTTP hosts without randomUUID', () => {
    const crypto = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = Array.from({ length: 100 }, () => createId());
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
