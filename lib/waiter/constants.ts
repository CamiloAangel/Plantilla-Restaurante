export const TABLE_STATUSES = {
  free: "libre",
  busy: "ocupada",
} as const;

export type TableStatus = (typeof TABLE_STATUSES)[keyof typeof TABLE_STATUSES];

export const WAITER_ORDER_STATUSES = {
  pending: "pendiente",
  inPreparation: "en_preparacion",
  ready: "listo",
  delivered: "entregado",
  cancelled: "cancelado",
} as const;

export type WaiterOrderStatus =
  (typeof WAITER_ORDER_STATUSES)[keyof typeof WAITER_ORDER_STATUSES];

export const WAITER_ORDER_PRIORITIES = {
  normal: "normal",
  high: "alta",
} as const;

export type WaiterOrderPriority =
  (typeof WAITER_ORDER_PRIORITIES)[keyof typeof WAITER_ORDER_PRIORITIES];

export const ACTIVE_WAITER_ORDER_STATUSES: WaiterOrderStatus[] = [
  WAITER_ORDER_STATUSES.pending,
  WAITER_ORDER_STATUSES.inPreparation,
  WAITER_ORDER_STATUSES.ready,
];

export const FINAL_WAITER_ORDER_STATUSES: WaiterOrderStatus[] = [
  WAITER_ORDER_STATUSES.delivered,
  WAITER_ORDER_STATUSES.cancelled,
];

export const isTableStatus = (value: unknown): value is TableStatus =>
  value === TABLE_STATUSES.free || value === TABLE_STATUSES.busy;

export const isWaiterOrderStatus = (value: unknown): value is WaiterOrderStatus =>
  Object.values(WAITER_ORDER_STATUSES).includes(value as WaiterOrderStatus);

export const isWaiterOrderPriority = (value: unknown): value is WaiterOrderPriority =>
  Object.values(WAITER_ORDER_PRIORITIES).includes(value as WaiterOrderPriority);
