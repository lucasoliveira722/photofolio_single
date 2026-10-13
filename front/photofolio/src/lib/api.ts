export type Category = {
  id: string;
  slug: string;
  name: string;
  displayOrder: number;
};

export type PortfolioImage = {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isFeatured: boolean;
  width: number;
  height: number;
  url: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getApiUrl(): string {
  const url = process.env.API_URL;
  if (!url) {
    throw new Error('Missing API_URL environment variable');
  }
  return url;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`);
  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed with status ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export function getCategories(): Promise<Category[]> {
  return fetchJson<Category[]>('/api/categories');
}

export function getCategoryImages(slug: string): Promise<PortfolioImage[]> {
  return fetchJson<PortfolioImage[]>(`/api/categories/${encodeURIComponent(slug)}/images`);
}

export function getFeaturedImages(): Promise<PortfolioImage[]> {
  return fetchJson<PortfolioImage[]>('/api/images/featured');
}
