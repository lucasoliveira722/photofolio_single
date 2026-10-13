import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/supabaseClient.js', () => ({ getSupabaseClient: vi.fn() }));

import app from '../src/app.js';
import { getSupabaseClient } from '../src/supabaseClient.js';

describe('CORS', () => {
  it('allows the configured frontend origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not allow other origins', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('error handling', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
  });

  it('returns a JSON 500 without a stack trace when a route throws', async () => {
    getSupabaseClient.mockImplementation(() => {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    });

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(res.text).not.toMatch(/SUPABASE_URL|at /);
  });
});
