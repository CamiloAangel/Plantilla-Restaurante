import {
  WAITER_ORDER_STATUSES,
  type WaiterOrderStatus,
} from '@/lib/waiter/constants';
import type { DayOrderStats, TodayOrderRow } from '../types';

export interface OrderDraftItemInput {
  product_id: string;
  quantity: number;
  notes?: string | null;
}

export interface CreateOrderInput {
  customer_name: string;
  table_id?: string | null;
  status?: WaiterOrderStatus;
  items: OrderDraftItemInput[];
}

export interface UpdateOrderInput {
  customer_name?: string;
  table_id?: string | null;
  status?: WaiterOrderStatus;
  items?: OrderDraftItemInput[];
}

interface ListOrdersResponse {
  data?: TodayOrderRow[];
  stats?: DayOrderStats;
  error?: string;
}

interface CreateOrderResponse {
  data?: TodayOrderRow;
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

const defaultStats: DayOrderStats = {
  orders_count: 0,
  revenue_total: 0,
  my_orders_count: 0,
  pending_count: 0,
  in_preparation_count: 0,
  ready_count: 0,
  delivered_count: 0,
  cancelled_count: 0,
};

const computeFallbackStats = (rows: TodayOrderRow[]): DayOrderStats => ({
  orders_count: rows.length,
  revenue_total: rows.reduce((sum, row) => sum + row.total_amount, 0),
  my_orders_count: rows.filter((row) => row.is_current_waiter).length,
  pending_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.pending).length,
  in_preparation_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.inPreparation).length,
  ready_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.ready).length,
  delivered_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.delivered).length,
  cancelled_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.cancelled).length,
});

export const listOrdersByDay = async (
  date?: string
): Promise<{ rows: TodayOrderRow[]; stats: DayOrderStats }> => {
  const params = new URLSearchParams();

  if (date) {
    params.set('date', date);
  }

  const suffix = params.toString();
  const response = await fetch(`/api/waiter/orders${suffix ? `?${suffix}` : ''}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const payload = (await response.json()) as ListOrdersResponse;
  const rows = payload.data || [];
  const stats = payload.stats || computeFallbackStats(rows);

  return {
    rows,
    stats,
  };
};

export const createOrder = async (input: CreateOrderInput): Promise<TodayOrderRow> => {
  const response = await fetch('/api/waiter/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_name: input.customer_name,
      table_id: input.table_id || null,
      status: input.status || WAITER_ORDER_STATUSES.pending,
      items: input.items,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const payload = (await response.json()) as CreateOrderResponse;

  if (!payload.data) {
    throw new Error(payload.error || 'No se recibio el pedido creado desde el servidor.');
  }

  return payload.data;
};

export const updateOrderStatus = async (
  orderId: string,
  status: WaiterOrderStatus
): Promise<void> => {
  await updateOrder(orderId, { status });
};

export const updateOrder = async (
  orderId: string,
  input: UpdateOrderInput
): Promise<void> => {
  const body: Record<string, unknown> = {};

  if (typeof input.customer_name === 'string') {
    body.customer_name = input.customer_name;
  }

  if (typeof input.table_id !== 'undefined') {
    body.table_id = input.table_id || null;
  }

  if (typeof input.status !== 'undefined') {
    body.status = input.status;
  }

  if (Array.isArray(input.items)) {
    body.items = input.items;
  }

  const response = await fetch(`/api/waiter/orders/${orderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  const response = await fetch(`/api/waiter/orders/${orderId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }
};

export const getEmptyDayStats = (): DayOrderStats => ({ ...defaultStats });
