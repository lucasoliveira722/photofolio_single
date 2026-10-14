import type { PortfolioImage } from '@/lib/api';

export type ActionFailure = { ok: false; error: string; signedOut?: boolean };
export type ActionResult<T extends object = object> = ({ ok: true } & T) | ActionFailure;

export const SIGNED_OUT_ERROR = 'Your session expired. Sign in again.';

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  displayOrder: number;
  photoCount: number;
};

export type AdminImage = PortfolioImage & {
  categoryId: string;
  storagePath: string;
};
