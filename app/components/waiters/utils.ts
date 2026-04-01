import {
  ACTIVE_WAITER_ORDER_STATUSES,
  type WaiterOrderStatus,
} from '@/lib/waiter/constants';

export const isActiveOrderStatus = (status: WaiterOrderStatus): boolean =>
  ACTIVE_WAITER_ORDER_STATUSES.includes(status);

export const readApiErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // If body is not JSON, return generic HTTP message.
  }

  return `La solicitud fallo con estado ${response.status}.`;
};

export const formatMinutes = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Disponible';
  }

  return `${value} min activo`;
};

export const getOrderElapsedMinutes = (createdAt: string): string => {
  const parsed = Date.parse(createdAt);

  if (Number.isNaN(parsed)) {
    return '--';
  }

  const diffMinutes = Math.max(1, Math.floor((Date.now() - parsed) / 60000));
  return `${diffMinutes}m`;
};

export const getCapacityIcons = (capacity: number): number => {
  if (!Number.isFinite(capacity)) {
    return 2;
  }

  return Math.max(1, Math.min(8, Math.trunc(capacity)));
};