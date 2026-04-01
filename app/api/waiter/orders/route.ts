import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getWaiterRequestContext } from '@/lib/auth/waiterApi';
import {
  TABLE_STATUSES,
  WAITER_ORDER_STATUSES,
  isWaiterOrderStatus,
  type WaiterOrderStatus,
} from '@/lib/waiter/constants';

const TABLES_TABLE = 'restaurant_tables';
const ORDERS_TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';
const PRODUCTS_TABLE = 'products';
const ORDER_TABLE_COLUMN = 'table_id';
type ServiceClient = SupabaseClient;

interface ApiLikeError {
  code?: string;
  message: string;
  details?: string | null;
}

interface OrderRecord {
  id: string;
  client_id: string;
  waiter_id: string | null;
  customer_name: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  table_id: string | null;
}

interface ProductRecord {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  notes: string | null;
}

interface CreateOrderInput {
  customer_name: string;
  table_id: string | null;
  status: WaiterOrderStatus;
  items: CreateOrderItemInput[];
}

interface OrderItemRow {
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  notes?: string | null;
  products?:
    | {
      id: string;
      name: string;
    }
    | Array<{
      id: string;
      name: string;
    }>
    | null;
}

interface ResponseOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
}

interface ResponseOrderRow {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  table_id: string | null;
  table_label: string | null;
  client_id: string;
  waiter_id: string;
  client_name: string | null;
  display_target: string;
  is_current_waiter: boolean;
  items_count: number;
  items: ResponseOrderItem[];
}

interface DayStats {
  orders_count: number;
  revenue_total: number;
  my_orders_count: number;
  pending_count: number;
  in_preparation_count: number;
  ready_count: number;
  delivered_count: number;
  cancelled_count: number;
}

const MISSING_SCHEMA_MESSAGE =
  'Falta el esquema actualizado de pedidos para meseros. Ejecuta waiter_schema.sql para agregar orders.table_id, orders.customer_name, orders.waiter_id y order_items.notes.';

const isMissingSchemaError = (error: ApiLikeError | null): boolean => {
  if (!error) {
    return false;
  }

  const searchableMessage = `${error.message} ${error.details || ''}`.toLowerCase();
  return (
    error.code === 'PGRST205'
    || error.code === '42703'
    || searchableMessage.includes('could not find the table')
    || searchableMessage.includes(TABLES_TABLE)
    || searchableMessage.includes(ORDERS_TABLE)
    || searchableMessage.includes(ORDER_ITEMS_TABLE)
    || searchableMessage.includes(PRODUCTS_TABLE)
    || searchableMessage.includes('table_id')
    || searchableMessage.includes('customer_name')
    || searchableMessage.includes('waiter_id')
    || searchableMessage.includes('notes')
  );
};

const sanitizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const sanitizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseQuantity = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
};

const resolveDayRange = (dateParam: string | null): { startISO: string; endISO: string } => {
  if (dateParam) {
    const plainDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam.trim());

    if (plainDateMatch) {
      const [, year, month, day] = plainDateMatch;
      const start = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
      const end = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
      return {
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      };
    }
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
};

const parseCreateOrderInput = (payload: unknown): { data?: CreateOrderInput; error?: string } => {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Payload invalido.' };
  }

  const body = payload as Record<string, unknown>;
  const customerName = sanitizeString(body.customer_name);
  const tableId = sanitizeOptionalString(body.table_id);
  const rawStatus = body.status;
  const rawItems = Array.isArray(body.items) ? body.items : null;

  if (!customerName) {
    return { error: 'El nombre del cliente es obligatorio.' };
  }

  if (!rawItems || rawItems.length === 0) {
    return { error: 'Debes agregar al menos un producto al pedido.' };
  }

  const status = isWaiterOrderStatus(rawStatus)
    ? rawStatus
    : WAITER_ORDER_STATUSES.pending;

  const items: CreateOrderItemInput[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') {
      return { error: 'Cada item del pedido debe ser un objeto valido.' };
    }

    const itemBody = item as Record<string, unknown>;
    const productId = sanitizeString(itemBody.product_id);
    const quantity = parseQuantity(itemBody.quantity);

    if (!productId) {
      return { error: 'Cada item debe incluir un producto valido.' };
    }

    if (quantity === null || quantity <= 0) {
      return { error: 'Todas las cantidades deben ser mayores a 0.' };
    }

    items.push({
      product_id: productId,
      quantity,
      notes: sanitizeOptionalString(itemBody.notes),
    });
  }

  return {
    data: {
      customer_name: customerName,
      table_id: tableId,
      status,
      items,
    },
  };
};

const getProductNameFromRelation = (
  relation: OrderItemRow['products']
): string => {
  if (Array.isArray(relation)) {
    return relation[0]?.name || 'Producto';
  }

  return relation?.name || 'Producto';
};

const buildStats = (rows: ResponseOrderRow[]): DayStats => ({
  orders_count: rows.length,
  revenue_total: rows.reduce((sum, row) => sum + row.total_amount, 0),
  my_orders_count: rows.filter((row) => row.is_current_waiter).length,
  pending_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.pending).length,
  in_preparation_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.inPreparation).length,
  ready_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.ready).length,
  delivered_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.delivered).length,
  cancelled_count: rows.filter((row) => row.status === WAITER_ORDER_STATUSES.cancelled).length,
});

const fetchOrdersByRange = async (
  serviceClient: ServiceClient,
  startISO: string,
  endISO: string
): Promise<{ data: OrderRecord[]; error: ApiLikeError | null }> => {
  const fullSelect = await serviceClient
    .from(ORDERS_TABLE)
    .select(`id, client_id, waiter_id, customer_name, total_amount, status, created_at, ${ORDER_TABLE_COLUMN}`)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false });

  if (!fullSelect.error) {
    return {
      data: (fullSelect.data || []) as OrderRecord[],
      error: null,
    };
  }

  if (!isMissingSchemaError(fullSelect.error)) {
    return {
      data: [],
      error: fullSelect.error,
    };
  }

  const fallbackSelect = await serviceClient
    .from(ORDERS_TABLE)
    .select(`id, client_id, total_amount, status, created_at, ${ORDER_TABLE_COLUMN}`)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false });

  if (fallbackSelect.error) {
    return {
      data: [],
      error: fallbackSelect.error,
    };
  }

  const mappedFallback = ((fallbackSelect.data || []) as Array<{
    id: string;
    client_id: string;
    total_amount: number;
    status: string;
    created_at: string;
    table_id: string | null;
  }>).map((row) => ({
    ...row,
    waiter_id: row.client_id,
    customer_name: null,
  }));

  return {
    data: mappedFallback,
    error: null,
  };
};

const fetchOrderItemsForOrders = async (
  serviceClient: ServiceClient,
  orderIds: string[]
): Promise<{ data: OrderItemRow[]; error: ApiLikeError | null }> => {
  if (orderIds.length === 0) {
    return { data: [], error: null };
  }

  const withNotes = await serviceClient
    .from(ORDER_ITEMS_TABLE)
    .select(`
      order_id,
      product_id,
      quantity,
      price_at_purchase,
      notes,
      products (
        id,
        name
      )
    `)
    .in('order_id', orderIds);

  if (!withNotes.error) {
    return {
      data: (withNotes.data || []) as OrderItemRow[],
      error: null,
    };
  }

  const withoutNotes = await serviceClient
    .from(ORDER_ITEMS_TABLE)
    .select(`
      order_id,
      product_id,
      quantity,
      price_at_purchase,
      products (
        id,
        name
      )
    `)
    .in('order_id', orderIds);

  if (withoutNotes.error) {
    return {
      data: [],
      error: withoutNotes.error,
    };
  }

  const mapped = ((withoutNotes.data || []) as OrderItemRow[]).map((row) => ({
    ...row,
    notes: null,
  }));

  return {
    data: mapped,
    error: null,
  };
};

const buildOrderRows = (
  orders: OrderRecord[],
  tableMap: Map<string, string>,
  groupedItems: Map<string, ResponseOrderItem[]>,
  currentWaiterId: string
): ResponseOrderRow[] => {
  return orders.map((order) => {
    const items = groupedItems.get(order.id) || [];
    const computedTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tableLabel = order.table_id ? tableMap.get(order.table_id) || null : null;
    const customerName = order.customer_name || null;
    const waiterId = order.waiter_id || order.client_id;

    return {
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      total_amount: computedTotal > 0 ? computedTotal : Number(order.total_amount || 0),
      table_id: order.table_id,
      table_label: tableLabel,
      client_id: order.client_id,
      waiter_id: waiterId,
      client_name: customerName,
      display_target: customerName || (tableLabel ? `Mesa ${tableLabel}` : 'Sin mesa'),
      is_current_waiter: waiterId === currentWaiterId,
      items_count: items.length,
      items,
    };
  });
};

export async function GET(request: NextRequest) {
  const waiterContext = await getWaiterRequestContext();

  if (!waiterContext.ok) {
    return NextResponse.json({ error: waiterContext.error }, { status: waiterContext.status });
  }

  const dateParam = request.nextUrl.searchParams.get('date');
  const { startISO, endISO } = resolveDayRange(dateParam);

  const ordersResult = await fetchOrdersByRange(waiterContext.serviceClient, startISO, endISO);

  if (ordersResult.error) {
    if (isMissingSchemaError(ordersResult.error)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading waiter orders by date:', ordersResult.error);
    return NextResponse.json({ error: 'No se pudieron cargar los pedidos del dia.' }, { status: 500 });
  }

  const orders = ordersResult.data;

  if (orders.length === 0) {
    return NextResponse.json({
      data: [] as ResponseOrderRow[],
      stats: buildStats([]),
    });
  }

  const tableIds = Array.from(
    new Set(orders.map((order) => order.table_id).filter((tableId): tableId is string => Boolean(tableId)))
  );

  const orderIds = orders.map((order) => order.id);

  const [tableRowsResult, itemRowsResult] = await Promise.all([
    tableIds.length > 0
      ? waiterContext.serviceClient
        .from(TABLES_TABLE)
        .select('id, label')
        .in('id', tableIds)
      : Promise.resolve({ data: [], error: null }),
    fetchOrderItemsForOrders(waiterContext.serviceClient, orderIds),
  ]);

  if (tableRowsResult.error) {
    if (isMissingSchemaError(tableRowsResult.error)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading table labels for waiter order list:', tableRowsResult.error);
    return NextResponse.json({ error: 'No se pudieron resolver las mesas de los pedidos.' }, { status: 500 });
  }

  if (itemRowsResult.error) {
    if (isMissingSchemaError(itemRowsResult.error)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading order items for waiter list:', itemRowsResult.error);
    return NextResponse.json({ error: 'No se pudieron cargar los productos por pedido.' }, { status: 500 });
  }

  const tableMap = new Map<string, string>(
    ((tableRowsResult.data || []) as Array<{ id: string; label: string }>).map((table) => [table.id, table.label])
  );

  const groupedItems = new Map<string, ResponseOrderItem[]>();
  itemRowsResult.data.forEach((itemRow) => {
    const current = groupedItems.get(itemRow.order_id) || [];
    const quantity = Number.isFinite(itemRow.quantity) ? itemRow.quantity : 0;
    const unitPrice = Number.isFinite(itemRow.price_at_purchase) ? itemRow.price_at_purchase : 0;

    current.push({
      product_id: itemRow.product_id,
      product_name: getProductNameFromRelation(itemRow.products),
      quantity,
      unit_price: unitPrice,
      subtotal: quantity * unitPrice,
      notes: typeof itemRow.notes === 'string' ? itemRow.notes : null,
    });

    groupedItems.set(itemRow.order_id, current);
  });

  const rows = buildOrderRows(orders, tableMap, groupedItems, waiterContext.userId);

  return NextResponse.json({
    data: rows,
    stats: buildStats(rows),
  });
}

export async function POST(request: Request) {
  const waiterContext = await getWaiterRequestContext();

  if (!waiterContext.ok) {
    return NextResponse.json({ error: waiterContext.error }, { status: waiterContext.status });
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalido en el body.' }, { status: 400 });
  }

  const parsed = parseCreateOrderInput(requestBody);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error || 'Payload invalido.' }, { status: 400 });
  }

  if (parsed.data.table_id) {
    const { data: tableRecord, error: tableError } = await waiterContext.serviceClient
      .from(TABLES_TABLE)
      .select('id')
      .eq('id', parsed.data.table_id)
      .maybeSingle();

    if (tableError) {
      if (isMissingSchemaError(tableError)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error validating table before order creation:', tableError);
      return NextResponse.json({ error: 'No se pudo validar la mesa del pedido.' }, { status: 500 });
    }

    if (!tableRecord) {
      return NextResponse.json({ error: 'La mesa seleccionada no existe.' }, { status: 404 });
    }
  }

  const uniqueProductIds = Array.from(new Set(parsed.data.items.map((item) => item.product_id)));

  const { data: productRows, error: productError } = await waiterContext.serviceClient
    .from(PRODUCTS_TABLE)
    .select('id, name, price, active')
    .in('id', uniqueProductIds)
    .eq('active', true);

  if (productError) {
    if (isMissingSchemaError(productError)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading products before order creation:', productError);
    return NextResponse.json({ error: 'No se pudieron validar los productos del pedido.' }, { status: 500 });
  }

  const products = (productRows || []) as ProductRecord[];
  const productMap = new Map<string, ProductRecord>(products.map((product) => [product.id, product]));

  for (const item of parsed.data.items) {
    if (!productMap.has(item.product_id)) {
      return NextResponse.json(
        { error: 'Uno o mas productos no existen o estan inactivos.' },
        { status: 400 }
      );
    }
  }

  const itemsForInsert = parsed.data.items.map((item) => {
    const product = productMap.get(item.product_id) as ProductRecord;
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: Number(product.price || 0),
      notes: item.notes,
    };
  });

  const totalAmount = itemsForInsert.reduce(
    (sum, item) => sum + item.quantity * item.price_at_purchase,
    0
  );

  const { data: createdOrder, error: createOrderError } = await waiterContext.serviceClient
    .from(ORDERS_TABLE)
    .insert([
      {
        client_id: waiterContext.userId,
        waiter_id: waiterContext.userId,
        customer_name: parsed.data.customer_name,
        total_amount: totalAmount,
        status: parsed.data.status,
        table_id: parsed.data.table_id,
      },
    ])
    .select(`id, client_id, waiter_id, customer_name, total_amount, status, created_at, ${ORDER_TABLE_COLUMN}`)
    .single();

  if (createOrderError || !createdOrder) {
    if (isMissingSchemaError(createOrderError || null)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error creating order header for waiter:', createOrderError);
    return NextResponse.json({ error: 'No se pudo crear el pedido.' }, { status: 500 });
  }

  const { error: createItemsError } = await waiterContext.serviceClient
    .from(ORDER_ITEMS_TABLE)
    .insert(
      itemsForInsert.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        notes: item.notes,
      }))
    );

  if (createItemsError) {
    await waiterContext.serviceClient.from(ORDERS_TABLE).delete().eq('id', createdOrder.id);

    if (isMissingSchemaError(createItemsError)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error creating order items for waiter:', createItemsError);
    return NextResponse.json({ error: 'No se pudieron guardar los productos del pedido.' }, { status: 500 });
  }

  if (parsed.data.table_id) {
    const { error: tableUpdateError } = await waiterContext.serviceClient
      .from(TABLES_TABLE)
      .update({
        status: TABLE_STATUSES.busy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.table_id);

    if (tableUpdateError && !isMissingSchemaError(tableUpdateError)) {
      console.error('Error syncing table status after order creation:', tableUpdateError);
    }
  }

  const tableLabel = parsed.data.table_id
    ? (await waiterContext.serviceClient
      .from(TABLES_TABLE)
      .select('label')
      .eq('id', parsed.data.table_id)
      .maybeSingle()).data?.label || null
    : null;

  const responseItems: ResponseOrderItem[] = itemsForInsert.map((item) => {
    const product = productMap.get(item.product_id) as ProductRecord;
    return {
      product_id: item.product_id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: item.price_at_purchase,
      subtotal: item.quantity * item.price_at_purchase,
      notes: item.notes,
    };
  });

  return NextResponse.json(
    {
      data: {
        id: createdOrder.id,
        created_at: createdOrder.created_at,
        status: createdOrder.status,
        total_amount: totalAmount,
        table_id: createdOrder.table_id,
        table_label: tableLabel,
        client_id: createdOrder.client_id,
        waiter_id: createdOrder.waiter_id || createdOrder.client_id,
        client_name: createdOrder.customer_name,
        display_target: createdOrder.customer_name || (tableLabel ? `Mesa ${tableLabel}` : 'Sin mesa'),
        is_current_waiter: true,
        items_count: responseItems.length,
        items: responseItems,
      } satisfies ResponseOrderRow,
    },
    { status: 201 }
  );
}