import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getWaiterRequestContext } from '@/lib/auth/waiterApi';
import {
	ACTIVE_WAITER_ORDER_STATUSES,
	TABLE_STATUSES,
	isTableStatus,
	type TableStatus,
	WAITER_ORDER_STATUSES,
} from '@/lib/waiter/constants';

const TABLES_TABLE = 'restaurant_tables';
const ORDERS_TABLE = 'orders';
const ORDER_TABLE_COLUMN = 'table_id';

interface ApiLikeError {
	code?: string;
	message: string;
	details?: string | null;
}

interface TableRow {
	id: string;
	label: string;
	capacity: number;
	status: TableStatus;
	created_at: string;
	updated_at: string;
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

const getCurrentTable = async (
	id: string,
	serviceClient: SupabaseClient
): Promise<{ data: TableRow | null; error: ApiLikeError | null }> => {
	const { data, error } = await serviceClient
		.from(TABLES_TABLE)
		.select('id, label, capacity, status, created_at, updated_at')
		.eq('id', id)
		.maybeSingle();

	return {
		data: (data || null) as TableRow | null,
		error,
	};
};

const getToggledStatus = (currentStatus: TableStatus): TableStatus =>
	currentStatus === TABLE_STATUSES.free
		? TABLE_STATUSES.busy
		: TABLE_STATUSES.free;

export async function PATCH(
	request: Request,
	context: { params: Promise<{ id: string }> }
) {
	const { id } = await context.params;

	if (!id) {
		return NextResponse.json({ error: 'Id de mesa invalido.' }, { status: 400 });
	}

	const waiterContext = await getWaiterRequestContext();

	if (!waiterContext.ok) {
		return NextResponse.json({ error: waiterContext.error }, { status: waiterContext.status });
	}

	let requestBody: unknown = {};

	try {
		requestBody = await request.json();
	} catch {
		// Permitimos body vacio para toggle por defecto.
	}

	const body = requestBody && typeof requestBody === 'object'
		? (requestBody as Record<string, unknown>)
		: {};

	const incomingStatus = body.status;

	if (typeof incomingStatus !== 'undefined' && !isTableStatus(incomingStatus)) {
		return NextResponse.json({ error: 'Estado de mesa invalido.' }, { status: 400 });
	}

	const currentTableResult = await getCurrentTable(id, waiterContext.serviceClient);

	if (currentTableResult.error) {
		if (isMissingSchemaError(currentTableResult.error)) {
			return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
		}

		console.error('Error loading table before update:', currentTableResult.error);
		return NextResponse.json({ error: 'No se pudo cargar la mesa.' }, { status: 500 });
	}

	if (!currentTableResult.data) {
		return NextResponse.json({ error: 'No se encontro la mesa indicada.' }, { status: 404 });
	}

	const nextStatus: TableStatus = typeof incomingStatus === 'string'
		? incomingStatus
		: getToggledStatus(currentTableResult.data.status);

	const nowISO = new Date().toISOString();

	const { data: updatedTable, error: updateError } = await waiterContext.serviceClient
		.from(TABLES_TABLE)
		.update({
			status: nextStatus,
			updated_at: nowISO,
		})
		.eq('id', id)
		.select('id, label, capacity, status, created_at, updated_at')
		.single();

	if (updateError) {
		if (isMissingSchemaError(updateError)) {
			return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
		}

		console.error('Error updating table status:', updateError);
		return NextResponse.json({ error: 'No se pudo actualizar la mesa.' }, { status: 500 });
	}

	if (nextStatus === TABLE_STATUSES.free) {
		const { error: closeOrdersError } = await waiterContext.serviceClient
			.from(ORDERS_TABLE)
			.update({
				status: WAITER_ORDER_STATUSES.delivered,
			})
			.eq(ORDER_TABLE_COLUMN, id)
			.in('status', ACTIVE_WAITER_ORDER_STATUSES);

		if (closeOrdersError) {
			if (isMissingSchemaError(closeOrdersError)) {
				return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
			}

			console.error('Error closing active table orders:', closeOrdersError);
			return NextResponse.json(
				{ error: 'La mesa se actualizo pero no se pudieron cerrar los pedidos activos.' },
				{ status: 500 }
			);
		}
	}

	return NextResponse.json({
		data: {
			...(updatedTable as TableRow),
			active_orders_count: nextStatus === TABLE_STATUSES.free ? 0 : undefined,
		},
	});
}

export async function DELETE(
	_request: Request,
	context: { params: Promise<{ id: string }> }
) {
	const { id } = await context.params;

	if (!id) {
		return NextResponse.json({ error: 'Id de mesa invalido.' }, { status: 400 });
	}

	const waiterContext = await getWaiterRequestContext();

	if (!waiterContext.ok) {
		return NextResponse.json({ error: waiterContext.error }, { status: waiterContext.status });
	}

	const { count: activeOrderCount, error: activeOrderError } = await waiterContext.serviceClient
		.from(ORDERS_TABLE)
		.select('id', { count: 'exact', head: true })
		.eq(ORDER_TABLE_COLUMN, id)
		.in('status', ACTIVE_WAITER_ORDER_STATUSES);

	if (activeOrderError) {
		if (isMissingSchemaError(activeOrderError)) {
			return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
		}

		console.error('Error checking active orders before deleting table:', activeOrderError);
		return NextResponse.json({ error: 'No se pudo validar los pedidos de la mesa.' }, { status: 500 });
	}

	if ((activeOrderCount || 0) > 0) {
		return NextResponse.json(
			{ error: 'La mesa tiene pedidos activos. Finaliza esos pedidos antes de eliminarla.' },
			{ status: 409 }
		);
	}

	const { error: unlinkOrdersError } = await waiterContext.serviceClient
		.from(ORDERS_TABLE)
		.update({ table_id: null })
		.eq(ORDER_TABLE_COLUMN, id);

	if (unlinkOrdersError) {
		if (isMissingSchemaError(unlinkOrdersError)) {
			return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
		}

		console.error('Error unlinking orders from table before delete:', unlinkOrdersError);
		return NextResponse.json({ error: 'No se pudo desvincular pedidos de la mesa.' }, { status: 500 });
	}

	const { data: deletedTable, error: deleteTableError } = await waiterContext.serviceClient
		.from(TABLES_TABLE)
		.delete()
		.eq('id', id)
		.select('id')
		.maybeSingle();

	if (deleteTableError) {
		if (isMissingSchemaError(deleteTableError)) {
			return NextResponse.json({ error: MISSING_SCHEMA_MESSAGE }, { status: 500 });
		}

		console.error('Error deleting table:', deleteTableError);
		return NextResponse.json({ error: 'No se pudo eliminar la mesa.' }, { status: 500 });
	}

	if (!deletedTable) {
		return NextResponse.json({ error: 'No se encontro la mesa indicada.' }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
