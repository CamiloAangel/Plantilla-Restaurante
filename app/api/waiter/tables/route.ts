import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getWaiterRequestContext } from '@/lib/auth/waiterApi';
import {
  ACTIVE_WAITER_ORDER_STATUSES,
  TABLE_STATUSES,
} from '@/lib/waiter/constants';

const TABLES_TABLE = 'restaurant_tables';
const ORDERS_TABLE = 'orders';
const ORDER_TABLE_COLUMN = 'table_id';

interface ApiLikeError {
  code?: string;
  message: string;
  details?: string | null;
}

interface RestaurantTableRecord {
  id: string;
  label: string;
  capacity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WaiterOrderRecord {
  id: string;
  table_id: string;
  status: string;
  created_at: string;
}

interface TableWithStats extends RestaurantTableRecord {
  active_orders_count: number;
  active_minutes: number | null;
}

interface CreateTableInput {
  label?: string;
  capacity?: number;
}

const MISSING_SCHEMA_MESSAGE =
  'No existe el esquema de meseros basado en orders. Ejecuta waiter_schema.sql para crear restaurant_tables y la columna orders.table_id.';

const isMissingSchemaError = (error: ApiLikeError | null): boolean => {
  if (!error) {
    return false;
  }

  const searchableMessage = `${error.message} ${error.details || ''}`.toLowerCase();
  return (
    error.code === 'PGRST205'
    || error.code === '42703'
    || searchableMessage.includes('could not find the table')
    || searchableMessage.includes('column') && searchableMessage.includes('table_id')
    || searchableMessage.includes(TABLES_TABLE)
    || searchableMessage.includes(ORDERS_TABLE)
  );
};

const parseCapacity = (value: unknown): number | null => {
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

const normalizeTableLabel = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
};

const calculateTableStats = (
  tables: RestaurantTableRecord[],
  activeOrders: WaiterOrderRecord[]
): TableWithStats[] => {
  const now = Date.now();
  const byTable = new Map<string, WaiterOrderRecord[]>();

  for (const order of activeOrders) {
    const current = byTable.get(order.table_id) || [];
    current.push(order);
    byTable.set(order.table_id, current);
  }

  return tables.map((table) => {
    const tableOrders = byTable.get(table.id) || [];
    const oldestActiveOrder = tableOrders
      .map((order) => Date.parse(order.created_at))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)[0];

    const activeMinutes = typeof oldestActiveOrder === 'number'
      ? Math.max(1, Math.floor((now - oldestActiveOrder) / 60000))
      : null;

    return {
      ...table,
      active_orders_count: tableOrders.length,
      active_minutes: activeMinutes,
    };
  });
};

const getNextTableLabel = async (
  serviceClient: SupabaseClient
): Promise<string | null> => {
  const { data, error } = await serviceClient
    .from(TABLES_TABLE)
    .select('label');

  if (error) {
    console.error('Error loading table labels:', error);
    return null;
  }

  const labels = (data || []) as Array<{ label?: string | null }>;
  const maxNumericLabel = labels.reduce((max, table) => {
    const numeric = Number.parseInt(String(table.label || '').replace(/\D/g, ''), 10);
    if (Number.isNaN(numeric)) {
      return max;
    }

    return numeric > max ? numeric : max;
  }, 0);

  const nextNumber = Math.max(1, maxNumericLabel + 1);
  return String(nextNumber).padStart(2, '0');
};

const parseCreateTableInput = (payload: unknown): { data?: CreateTableInput; error?: string } => {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Payload invalido.' };
  }

  const body = payload as Record<string, unknown>;
  const label = normalizeTableLabel(body.label);
  const capacity = parseCapacity(body.capacity);

  if (capacity !== null && (capacity < 1 || capacity > 20)) {
    return { error: 'La capacidad debe estar entre 1 y 20.' };
  }

  return {
    data: {
      label,
      capacity: capacity ?? 4,
    },
  };
};

export async function GET() {
  const waiterContext = await getWaiterRequestContext();

  if (!waiterContext.ok) {
    return NextResponse.json({ error: waiterContext.error }, { status: waiterContext.status });
  }

  const { data: tableRows, error: tablesError } = await waiterContext.serviceClient
    .from(TABLES_TABLE)
    .select('id, label, capacity, status, created_at, updated_at')
    .order('label', { ascending: true });

  if (tablesError) {
    if (isMissingSchemaError(tablesError)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading waiter tables:', tablesError);
    return NextResponse.json({ error: 'No se pudieron cargar las mesas.' }, { status: 500 });
  }

  const tables = (tableRows || []) as RestaurantTableRecord[];

  if (tables.length === 0) {
    return NextResponse.json({ data: [] as TableWithStats[] });
  }

  const tableIds = tables.map((table) => table.id);

  const { data: orderRows, error: activeOrdersError } = await waiterContext.serviceClient
    .from(ORDERS_TABLE)
    .select(`id, ${ORDER_TABLE_COLUMN}, status, created_at`)
    .in(ORDER_TABLE_COLUMN, tableIds)
    .in('status', ACTIVE_WAITER_ORDER_STATUSES);

  if (activeOrdersError) {
    if (isMissingSchemaError(activeOrdersError)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    console.error('Error loading active waiter orders:', activeOrdersError);
    return NextResponse.json({ error: 'No se pudieron cargar los pedidos activos.' }, { status: 500 });
  }

  const enrichedTables = calculateTableStats(
    tables,
    (orderRows || []) as WaiterOrderRecord[]
  );

  return NextResponse.json({ data: enrichedTables });
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

  const parsed = parseCreateTableInput(requestBody);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error || 'Payload invalido.' }, { status: 400 });
  }

  const nextLabel = parsed.data.label || await getNextTableLabel(waiterContext.serviceClient);

  if (!nextLabel) {
    return NextResponse.json(
      { error: 'No se pudo resolver el nombre de la nueva mesa.' },
      { status: 500 }
    );
  }

  const nowISO = new Date().toISOString();

  const { data, error } = await waiterContext.serviceClient
    .from(TABLES_TABLE)
    .insert([
      {
        label: nextLabel,
        capacity: parsed.data.capacity || 4,
        status: TABLE_STATUSES.free,
        created_at: nowISO,
        updated_at: nowISO,
      },
    ])
    .select('id, label, capacity, status, created_at, updated_at')
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
    }

    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una mesa con ese nombre.' }, { status: 409 });
    }

    console.error('Error creating waiter table:', error);
    return NextResponse.json({ error: 'No se pudo crear la mesa.' }, { status: 500 });
  }

  const createdTable = data as RestaurantTableRecord;

  return NextResponse.json(
    {
      data: {
        ...createdTable,
        active_orders_count: 0,
        active_minutes: null,
      } as TableWithStats,
    },
    { status: 201 }
  );
}
