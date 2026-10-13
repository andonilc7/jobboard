import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticateCaller } from './auth.ts'
const client = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, from: vi.fn() }))
const createClient = vi.hoisted(() => vi.fn(() => client))
vi.mock('@supabase/supabase-js', () => ({ createClient }))
const environment = { get: (name: string) => ({ SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_test"}' })[name as 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEYS'] }

describe('submission authentication', () => {
  beforeEach(() => vi.resetAllMocks())
  it('rejects missing bearer credentials before creating a client', async () => {
    await expect(authenticateCaller(new Request('http://localhost'), environment)).rejects.toMatchObject({ status: 401 })
    expect(createClient).not.toHaveBeenCalled()
  })
  it('verifies the token and scopes database access to the same caller', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null })
    const request = new Request('http://localhost', { headers: { Authorization: 'Bearer user-jwt' } })
    expect((await authenticateCaller(request, environment)).userId).toBe('verified-user')
    expect(client.auth.getUser).toHaveBeenCalledWith('user-jwt')
    expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'sb_publishable_test', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: 'Bearer user-jwt' } },
    })
  })
  it('rejects expired or invalid tokens instead of trusting their claims', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Expired' } })
    await expect(authenticateCaller(new Request('http://localhost', { headers: { Authorization: 'Bearer expired' } }), environment))
      .rejects.toMatchObject({ status: 401, code: 'INVALID_SESSION' })
  })
})
