import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getWaiterRequestContext } from '@/lib/auth/waiterApi';
import {
  ACTIVE_WAITER_ORDER_STATUSES,
  TABLE_STATUSES,
  isWaiterOrderStatus,
  type WaiterOrderStatus,
} from '@/lib/waiter/constants';

const TABLES_TABLE = 'restaurant_tables';
const ORDERS_TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';
const PRODUCTS_TABLE = 'products';
const ORDER_TABLE_COLUMN = 'table_id';

interface ApiLikeError {
  code?: string;
  message: string;
  details?: string | null;
}

interface OrderRecord {
  id: string;
  table_id: string | null;
}

interface ProductRecord {
  id: string;
  price: number;
  active: boolean;
}

interface UpdateOrderItemInput {
  product_id: string;
  quantity: number;
  notes: string | null;
}

interface UpdateOrderInput {
  status?: WaiterOrderStatus;
  table_id?: string | null;
  customer_name?: string;
  items?: UpdateOrderItemInput[];
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

const parseUpdateInput = (payload: unknown): { data?: UpdateOrderInput; error?: string } => {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Payload invalido.' };
  }

  const body = payload as Record<string, unknown>;
  const updates: UpdateOrderInput = {};

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (!isWaiterOrderStatus(body.status)) {
      return { error: 'Estado de pedido invalido.' };
    }

    updates.status = body.status;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'table_id')) {
    const tableId = sanitizeOptionalString(body.table_id);
    updates.table_id = tableId;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'customer_name')) {
    const customerName = sanitizeString(body.customer_name);
    if (!customerName) {
      return { error: 'El campo customer_name no puede estar vacio.' };
    }

    updates.customer_name = customerName;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'items')) {
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return { error: 'Debes enviar al menos un item para actualizar la comanda.' };
    }

    const parsedItems: UpdateOrderItemInput[] = [];

    for (const rawItem of body.items) {
      if (!rawItem || typeof rawItem !== 'object') {
        return { error: 'Cada item de la comanda debe ser un objeto valido.' };
      }

      const item = rawItem as Record<string, unknown>;
      const productId = sanitizeString(item.product_id);
      const quantity = parseQuantity(item.quantity);

      if (!productId) {
        return { error: 'Cada item debe incluir product_id.' };
      }

      if (quantity === null || quantity <= 0) {
        return { error: 'Todas las cantidades de la comanda deben ser mayores a 0.' };
      }

      parsedItems.push({
        product_id: productId,
        quantity,
        notes: sanitizeOptionalString(item.notes),
      });
    }

    updates.items = parsedItems;
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'No se recibieron campos para actualizar.' };
  }

  return { data: updates };
};

const syncTableStatusByActiveOrders = async (
  serviceClient: SupabaseClient,
  tableId: string
): Promise<{ error: ApiLikeError | null }> => {
  const { count: activeCount, error: countError } = await serviceClient
    .from(ORDERS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq(ORDER_TABLE_COLUMN, tableId)
    .in('status', ACTIVE_WAITER_ORDER_STATUSES);

  if (countError) {
    return { error: countError };
  }

  const nextStatus = (activeCount || 0) > 0
    ? TABLE_STATUSES.busy
    : TABLE_STATUSES.free;

  const { error: updateError } = await serviceClient
    .from(TABLES_TABLE)
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tableId);

  return { error: updateError };
};

const insertOrderItems = async (
  serviceClient: SupabaseClient,
  orderId: string,
  items: Array<{ product_id: string; quantity: number; price_at_purchase: number; notes: string | null }>
): Promise<ApiLikeError | null> => {
  const withNotes = await serviceClient
    .from(ORDER_ITEMS_TABLE)
    .insert(
      items.map((item) => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        notes: item.notes,
      }))
    );

  if (!withNotes.error) {
    return null;
  }

  if (!isMissingSchemaError(withNotes.error)) {
    return withNotes.error;
  }

  const withoutNotes = await serviceClient
    .from(ORDER_ITEMS_TABLE)
    .insert(
      items.map((item) => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      }))
    );

  return withoutNotes.error;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Id de pedido invalido.' }, { status: 400 });
  }

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

  const parsed = parseUpdateInput(requestBody);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error || 'Payload invalido.' }, { status: 400 });
  }

  const { data: currentOrder, error: currentOrderError } = await waiterContext.serviceClient
    .from(ORDERS_TABLE)
    .select(`id, ${ORDER_TABLE_COLUMN}`)
    .eq('id', id)
    .maybeSingle();

  if (currentOrderError) {
    if (isMissingSchemaError(currentOrderError)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading order before patch:', currentOrderError);
    return NextResponse.json({ error: 'No se pudo cargar el pedido.' }, { status: 500 });
  }

  if (!currentOrder) {
    return NextResponse.json({ error: 'No se encontro el pedido indicado.' }, { status: 404 });
  }

  const currentOrderRecord = currentOrder as OrderRecord;

  if (typeof parsed.data.table_id !== 'undefined' && parsed.data.table_id) {
    const { data: tableRecord, error: tableError } = await waiterContext.serviceClient
      .from(TABLES_TABLE)
      .select('id')
      .eq('id', parsed.data.table_id)
      .maybeSingle();

    if (tableError) {
      if (isMissingSchemaError(tableError)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error validating table before order patch:', tableError);
      return NextResponse.json({ error: 'No se pudo validar la mesa del pedido.' }, { status: 500 });
    }

    if (!tableRecord) {
      return NextResponse.json({ error: 'La mesa seleccionada no existe.' }, { status: 404 });
    }
  }

  let totalAmountFromItems: number | null = null;

  if (parsed.data.items) {
    const uniqueProductIds = Array.from(new Set(parsed.data.items.map((item) => item.product_id)));

    const { data: productRows, error: productError } = await waiterContext.serviceClient
      .from(PRODUCTS_TABLE)
      .select('id, price, active')
      .in('id', uniqueProductIds)
      .eq('active', true);

    if (productError) {
      if (isMissingSchemaError(productError)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error loading products before order patch:', productError);
      return NextResponse.json({ error: 'No se pudieron validar los productos de la comanda.' }, { status: 500 });
    }

    const productMap = new Map<string, ProductRecord>(
      ((productRows || []) as ProductRecord[]).map((product) => [product.id, product])
    );

    for (const item of parsed.data.items) {
      if (!productMap.has(item.product_id)) {
        return NextResponse.json(
          { error: 'Uno o mas productos no existen o estan inactivos.' },
          { status: 400 }
        );
      }
    }

    const normalizedItems = parsed.data.items.map((item) => {
      const product = productMap.get(item.product_id) as ProductRecord;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: Number(product.price || 0),
        notes: item.notes,
      };
    });

    totalAmountFromItems = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price_at_purchase,
      0
    );

    const { error: deleteItemsError } = await waiterContext.serviceClient
      .from(ORDER_ITEMS_TABLE)
      .delete()
      .eq('order_id', id);

    if (deleteItemsError) {
      if (isMissingSchemaError(deleteItemsError)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error clearing previous order items before patch:', deleteItemsError);
      return NextResponse.json({ error: 'No se pudo actualizar la comanda del pedido.' }, { status: 500 });
    }

    const insertItemsError = await insertOrderItems(waiterContext.serviceClient, id, normalizedItems);

    if (insertItemsError) {
      if (isMissingSchemaError(insertItemsError)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error inserting updated order items:', insertItemsError);
      return NextResponse.json({ error: 'No se pudo guardar la nueva comanda del pedido.' }, { status: 500 });
    }
  }

  const updatePayload: Record<string, unknown> = {};

  if (typeof parsed.data.status !== 'undefined') {
    updatePayload.status = parsed.data.status;
  }

  if (typeof parsed.data.table_id !== 'undefined') {
    updatePayload.table_id = parsed.data.table_id;
  }

  if (typeof parsed.data.customer_name === 'string') {
    updatePayload.customer_name = parsed.data.customer_name;
  }

  if (totalAmountFromItems !== null) {
    updatePayload.total_amount = totalAmountFromItems;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await waiterContext.serviceClient
      .from(ORDERS_TABLE)
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      if (isMissingSchemaError(updateError)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error updating order fields:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar el pedido.' }, { status: 500 });
    }
  }

  const nextTableId = typeof parsed.data.table_id !== 'undefined'
    ? parsed.data.table_id
    : currentOrderRecord.table_id;

  const tableIdsToSync = new Set<string>();

  if (currentOrderRecord.table_id) {
    tableIdsToSync.add(currentOrderRecord.table_id);
  }

  if (nextTableId) {
    tableIdsToSync.add(nextTableId);
  }

  for (const tableId of tableIdsToSync) {
    const syncResult = await syncTableStatusByActiveOrders(waiterContext.serviceClient, tableId);

    if (syncResult.error) {
      if (isMissingSchemaError(syncResult.error)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error syncing table status after order patch:', syncResult.error);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Id de pedido invalido.' }, { status: 400 });
  }

  const waiterContext = await getWaiterRequestContext();

  if (!waiterContext.ok) {
    return NextResponse.json({ error: waiterContext.error }, { status: waiterContext.status });
  }

  const { data: currentOrder, error: currentOrderError } = await waiterContext.serviceClient
    .from(ORDERS_TABLE)
    .select(`id, ${ORDER_TABLE_COLUMN}`)
    .eq('id', id)
    .maybeSingle();

  if (currentOrderError) {
    if (isMissingSchemaError(currentOrderError)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading waiter order before delete:', currentOrderError);
    return NextResponse.json({ error: 'No se pudo cargar el pedido.' }, { status: 500 });
  }

  if (!currentOrder) {
    return NextResponse.json({ error: 'No se encontro el pedido indicado.' }, { status: 404 });
  }

  const currentOrderRecord = currentOrder as OrderRecord;

  const { error: deleteError } = await waiterContext.serviceClient
    .from(ORDERS_TABLE)
    .delete()
    .eq('id', id);

  if (deleteError) {
    if (isMissingSchemaError(deleteError)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error deleting waiter order:', deleteError);
    return NextResponse.json({ error: 'No se pudo eliminar el pedido.' }, { status: 500 });
  }

  if (currentOrderRecord.table_id) {
    const syncResult = await syncTableStatusByActiveOrders(
      waiterContext.serviceClient,
      currentOrderRecord.table_id
    );

    if (syncResult.error) {
      if (isMissingSchemaError(syncResult.error)) {
        return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
      }

      console.error('Error syncing table status after order delete:', syncResult.error);
    }
  }

  return NextResponse.json({ success: true });
}
