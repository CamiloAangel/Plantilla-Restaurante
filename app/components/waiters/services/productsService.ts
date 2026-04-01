import type { MenuProduct } from '../types';

interface ProductsResponse {
  data?: MenuProduct[];
  error?: string;
}

const readApiErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Ignore non-JSON body.
  }

  return `La solicitud fallo con estado ${response.status}.`;
};

export const listActiveProducts = async (): Promise<MenuProduct[]> => {
  const response = await fetch('/api/waiter/menu', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const payload = (await response.json()) as ProductsResponse;
  return payload.data || [];
};
