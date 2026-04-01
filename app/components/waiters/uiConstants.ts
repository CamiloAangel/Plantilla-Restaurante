import {
  TABLE_STATUSES,
  WAITER_ORDER_STATUSES,
  type TableStatus,
  type WaiterOrderStatus,
} from '@/lib/waiter/constants';

export const ORDER_STATUS_LABELS: Record<WaiterOrderStatus, string> = {
  [WAITER_ORDER_STATUSES.pending]: 'Pendiente',
  [WAITER_ORDER_STATUSES.inPreparation]: 'En preparacion',
  [WAITER_ORDER_STATUSES.ready]: 'Listo',
  [WAITER_ORDER_STATUSES.delivered]: 'Entregado',
  [WAITER_ORDER_STATUSES.cancelled]: 'Cancelado',
};

export const ORDER_STATUS_CLASS: Record<WaiterOrderStatus, string> = {
  [WAITER_ORDER_STATUSES.pending]: 'bg-amber-100 text-amber-800',
  [WAITER_ORDER_STATUSES.inPreparation]: 'bg-sky-100 text-sky-800',
  [WAITER_ORDER_STATUSES.ready]: 'bg-emerald-100 text-emerald-800',
  [WAITER_ORDER_STATUSES.delivered]: 'bg-stone-200 text-stone-700',
  [WAITER_ORDER_STATUSES.cancelled]: 'bg-red-100 text-red-700',
};

export const TABLE_STATUS_CLASS: Record<TableStatus, string> = {
  [TABLE_STATUSES.free]: 'bg-emerald-500',
  [TABLE_STATUSES.busy]: 'bg-red-500',
};

export const TABLE_BORDER_CLASS: Record<TableStatus, string> = {
  [TABLE_STATUSES.free]: 'border-emerald-500',
  [TABLE_STATUSES.busy]: 'border-red-500',
};

export const NEXT_ORDER_STATUS: Partial<Record<WaiterOrderStatus, WaiterOrderStatus>> = {
  [WAITER_ORDER_STATUSES.pending]: WAITER_ORDER_STATUSES.inPreparation,
  [WAITER_ORDER_STATUSES.inPreparation]: WAITER_ORDER_STATUSES.ready,
  [WAITER_ORDER_STATUSES.ready]: WAITER_ORDER_STATUSES.delivered,
};