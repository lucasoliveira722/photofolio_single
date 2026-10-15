import { describe, it, expect } from 'vitest';
import { loginHref, safeNextPath } from './loginRedirect';

describe('loginHref', () => {
  it('sends admin pages back to themselves after signing in', () => {
    expect(loginHref('/admin?category=weddings')).toBe('/login?next=%2Fadmin%3Fcategory%3Dweddings');
    expect(loginHref('/admin/profile')).toBe('/login?next=%2Fadmin%2Fprofile');
  });

  it('uses the plain login page for anything else', () => {
    expect(loginHref('/admin')).toBe('/login');
    expect(loginHref('/')).toBe('/login');
    expect(loginHref('/administrator')).toBe('/login');
  });
});

describe('safeNextPath', () => {
  it('accepts admin paths only', () => {
    expect(safeNextPath('/admin?category=weddings')).toBe('/admin?category=weddings');
    expect(safeNextPath('/admin/profile')).toBe('/admin/profile');
    expect(safeNextPath(null)).toBe('/admin');
    expect(safeNextPath('https://evil.example/admin')).toBe('/admin');
    expect(safeNextPath('//evil.example')).toBe('/admin');
    expect(safeNextPath('/administrator')).toBe('/admin');
  });
});
