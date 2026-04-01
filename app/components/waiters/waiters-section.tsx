'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  WAITER_ORDER_STATUSES,
  isWaiterOrderStatus,
  type WaiterOrderStatus,
  TABLE_STATUSES,
} from '@/lib/waiter/constants';
import { supabase } from '@/lib/supabaseClient';
import OrderEditorModal from './OrderEditorModal';
import {
  createOrder,
  getEmptyDayStats,
  listOrdersByDay,
  updateOrder,
  updateOrderStatus,
  type CreateOrderInput,
} from './services/ordersService';
import { listActiveProducts } from './services/productsService';
import TablesPanel from './TablesPanel';
import TodayOrdersTable from './TodayOrdersTable';
import type {
  DayOrderStats,
  MenuProduct,
  RestaurantTable,
  TodayOrderRow,
  WaitersSectionProps,
} from './types';
import { readApiErrorMessage } from './utils';
import WaitersLoading from './WaitersLoading';

export default function WaitersSection({
  initialView = 'tables',
}: WaitersSectionProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [todayOrders, setTodayOrders] = useState<TodayOrderRow[]>([]);
  const [dayStats, setDayStats] = useState<DayOrderStats>(getEmptyDayStats());
  const [activeProducts, setActiveProducts] = useState<MenuProduct[]>([]);
  const [currentWaiterId, setCurrentWaiterId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const [tableLabelInput, setTableLabelInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState(4);
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [busyTableId, setBusyTableId] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalSession, setOrderModalSession] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<TodayOrderRow | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const isOrdersView = initialView === 'orders';

  const reloadTables = useCallback(async () => {
    const tablesResponse = await fetch('/api/waiter/tables', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!tablesResponse.ok) {
      throw new Error(await readApiErrorMessage(tablesResponse));
    }

    const tablesPayload = (await tablesResponse.json()) as { data?: RestaurantTable[] };
    setTables(tablesPayload.data || []);
  }, []);

  const reloadOrders = useCallback(async () => {
    const { rows, stats } = await listOrdersByDay();
    setTodayOrders(rows);
    setDayStats(stats);

    const inferredWaiterId = rows.find((row) => row.is_current_waiter)?.waiter_id || null;
    if (inferredWaiterId) {
      setCurrentWaiterId((previous) => previous || inferredWaiterId);
    }
  }, []);

  const resolveCurrentWaiterId = useCallback(async () => {
    if (currentWaiterId) {
      return currentWaiterId;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) {
      return null;
    }

    setCurrentWaiterId((previous) => previous || data.user.id);
    return data.user.id;
  }, [currentWaiterId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      await Promise.all([
        reloadTables(),
        reloadOrders(),
      ]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudieron cargar los datos de meseros.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [reloadOrders, reloadTables]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFlashMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  const filteredTables = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return tables;
    }

    return tables.filter((table) => {
      const label = table.label.toLowerCase();
      const status = table.status.toLowerCase();
      return label.includes(normalizedSearch) || status.includes(normalizedSearch);
    });
  }, [search, tables]);

  const pendingOrdersByTable = useMemo(() => {
    const grouped = new Map<string, TodayOrderRow[]>();

    todayOrders.forEach((order) => {
      if (order.status !== WAITER_ORDER_STATUSES.pending || !order.table_id) {
        return;
      }

      const current = grouped.get(order.table_id) || [];
      current.push(order);
      grouped.set(order.table_id, current);
    });

    return grouped;
  }, [todayOrders]);

  const freeTablesCount = tables.filter(
    (table) => table.status === TABLE_STATUSES.free
  ).length;
  const busyTablesCount = tables.length - freeTablesCount;

  const handleCreateTable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsCreatingTable(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/waiter/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: tableLabelInput.trim() || undefined,
          capacity: tableCapacityInput,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response));
      }

      setTableLabelInput('');
      setTableCapacityInput(4);
      setFlashMessage('Mesa creada correctamente.');
      await reloadTables();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la mesa.';
      setErrorMessage(message);
    } finally {
      setIsCreatingTable(false);
    }
  };

  const handleToggleTableStatus = async (table: RestaurantTable) => {
    const nextStatus = table.status === TABLE_STATUSES.free
      ? TABLE_STATUSES.busy
      : TABLE_STATUSES.free;

    setBusyTableId(table.id);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/waiter/tables/${table.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response));
      }

      setFlashMessage(`Mesa ${table.label} ahora esta ${nextStatus}.`);
      await Promise.all([reloadTables(), reloadOrders()]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo actualizar la mesa.';
      setErrorMessage(message);
    } finally {
      setBusyTableId(null);
    }
  };

  const handleDeleteTable = async (table: RestaurantTable) => {
    const confirmed = window.confirm(
      `Se eliminara la mesa ${table.label}. Deseas continuar?`
    );

    if (!confirmed) {
      return;
    }

    setBusyTableId(table.id);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/waiter/tables/${table.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response));
      }

      setFlashMessage(`Mesa ${table.label} eliminada.`);
      await Promise.all([reloadTables(), reloadOrders()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la mesa.';
      setErrorMessage(message);
    } finally {
      setBusyTableId(null);
    }
  };

  const ensureProductsLoaded = useCallback(async () => {
    if (activeProducts.length > 0) {
      return;
    }

    setIsLoadingProducts(true);
    try {
      const products = await listActiveProducts();
      setActiveProducts(products);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [activeProducts.length]);

  const openCreateOrderModal = () => {
    setSelectedOrder(null);
    setOrderModalSession((current) => current + 1);
    setIsOrderModalOpen(true);
    setErrorMessage(null);
    void ensureProductsLoaded();
    void resolveCurrentWaiterId();
  };

  const openEditOrderModal = (order: TodayOrderRow) => {
    setSelectedOrder(order);
    setOrderModalSession((current) => current + 1);
    setIsOrderModalOpen(true);
    setErrorMessage(null);
    void ensureProductsLoaded();
    void resolveCurrentWaiterId();
  };

  const closeOrderModal = () => {
    if (isSavingOrder) {
      return;
    }

    setSelectedOrder(null);
    setIsOrderModalOpen(false);
  };

  const handleSaveOrder = async (payload: CreateOrderInput) => {
    setErrorMessage(null);
    setIsSavingOrder(true);
    try {
      if (selectedOrder) {
        await updateOrder(selectedOrder.id, {
          customer_name: payload.customer_name,
          table_id: payload.table_id,
          items: payload.items,
        });

        setFlashMessage('Pedido actualizado correctamente.');
      } else {
        await createOrder(payload);
        setFlashMessage('Pedido guardado correctamente.');
      }

      setSelectedOrder(null);
      setIsOrderModalOpen(false);
      await Promise.all([reloadOrders(), reloadTables()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el pedido.';
      setErrorMessage(message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleChangeOrderStatus = async (
    order: TodayOrderRow,
    nextStatus: WaiterOrderStatus
  ) => {
    if (!isWaiterOrderStatus(order.status)) {
      setErrorMessage('El estado actual del pedido no es valido.');
      return;
    }

    if (order.status === nextStatus) {
      return;
    }

    setBusyOrderId(order.id);
    setErrorMessage(null);
    try {
      await updateOrderStatus(order.id, nextStatus);
      setFlashMessage(`Estado actualizado a ${nextStatus}.`);
      await Promise.all([reloadOrders(), reloadTables()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el estado del pedido.';
      setErrorMessage(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  if (loading) {
    return <WaitersLoading />;
  }

  return (
    <main className="w-full min-h-screen bg-white md:ml-64 md:w-[calc(100%-16rem)] px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-stone-900">
              {isOrdersView ? 'Pedidos de Hoy' : 'Mesas'}
            </h1>
            <p className="text-sm md:text-base text-stone-500 font-semibold">
              {isOrdersView
                ? 'Gestion operativa de pedidos del dia.'
                : 'Gestion de mesas y disponibilidad en tiempo real.'}
            </p>
          </div>

          {isOrdersView && (
            <button
              type="button"
              onClick={openCreateOrderModal}
              className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-black uppercase tracking-wider"
            >
              Nuevo pedido
            </button>
          )}
        </div>

        {isOrdersView && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-stone-500 font-black">Pedidos</p>
              <p className="text-xl font-black text-stone-900">{dayStats.orders_count}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-stone-500 font-black">Mis pedidos</p>
              <p className="text-xl font-black text-stone-900">{dayStats.my_orders_count}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-stone-500 font-black">Pendientes</p>
              <p className="text-xl font-black text-stone-900">{dayStats.pending_count}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-stone-500 font-black">Total dia</p>
              <p className="text-xl font-black text-stone-900">{new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                maximumFractionDigits: 0,
              }).format(dayStats.revenue_total)}</p>
            </div>
          </div>
        )}

        {!isOrdersView && (
          <div className="max-w-sm">
            <label className="block text-[11px] uppercase tracking-wider font-black text-stone-500 mb-1" htmlFor="waiter-table-search">
              Buscar mesa
            </label>
            <input
              id="waiter-table-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o estado"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {flashMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {flashMessage}
          </div>
        )}

        {isOrdersView ? (
          <TodayOrdersTable
            rows={todayOrders}
            busyOrderId={busyOrderId}
            onChangeStatus={(order, status) => {
              void handleChangeOrderStatus(order, status);
            }}
            onEditOrder={openEditOrderModal}
          />
        ) : (
          <TablesPanel
            filteredTables={filteredTables}
            pendingOrdersByTable={pendingOrdersByTable}
            freeTablesCount={freeTablesCount}
            busyTablesCount={busyTablesCount}
            errorMessage={null}
            flashMessage={null}
            tableLabelInput={tableLabelInput}
            tableCapacityInput={tableCapacityInput}
            isCreatingTable={isCreatingTable}
            busyTableId={busyTableId}
            onTableLabelChange={setTableLabelInput}
            onTableCapacityChange={setTableCapacityInput}
            onCreateTable={(event) => {
              void handleCreateTable(event);
            }}
            onDeleteTable={(table) => {
              void handleDeleteTable(table);
            }}
            onToggleTableStatus={(table) => {
              void handleToggleTableStatus(table);
            }}
          />
        )}
      </div>

      <OrderEditorModal
        key={orderModalSession}
        isOpen={isOrderModalOpen}
        selectedOrder={selectedOrder}
        tables={tables}
        products={activeProducts}
        isLoadingProducts={isLoadingProducts}
        isSaving={isSavingOrder}
        currentWaiterId={currentWaiterId}
        onClose={closeOrderModal}
        onSubmit={handleSaveOrder}
      />
    </main>
  );
}
