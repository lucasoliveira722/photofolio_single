export type Profile = {
  bio: string;
  email: string;
  instagram: string;
};

export const EMPTY_PROFILE: Profile = { bio: '', email: '', instagram: '' };

export const BIO_MAX_LENGTH = 2000;

// Accepts "handle", "@handle", or a profile URL; returns the bare handle, '' for blank, or null if it isn't one.
export function normalizeInstagram(input: string): string | null {
  let handle = input.trim();
  const url = handle.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]*)/i);
  if (url) handle = url[1];
  handle = handle.replace(/^@/, '');
  if (handle === '') return '';
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

export function bioParagraphs(bio: string): string[] {
  return bio
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
