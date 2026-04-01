import { TABLE_STATUSES } from '@/lib/waiter/constants';
import type { RestaurantTable, TodayOrderRow } from './types';
import { TABLE_BORDER_CLASS, TABLE_STATUS_CLASS } from './uiConstants';
import { formatMinutes, getCapacityIcons } from './utils';

interface TableCardProps {
  table: RestaurantTable;
  pendingOrdersToday: TodayOrderRow[];
  isBusy: boolean;
  onDeleteTable: (table: RestaurantTable) => void;
  onToggleTableStatus: (table: RestaurantTable) => void;
}

const formatClock = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }

  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TableCard({
  table,
  pendingOrdersToday,
  isBusy,
  onDeleteTable,
  onToggleTableStatus,
}: TableCardProps) {
  return (
    <article
      className={`bg-white rounded-xl p-5 shadow-sm group transition-all border-t-4 ${TABLE_BORDER_CLASS[table.status]}`}
    >
      <div className="flex justify-between items-start mb-5">
        <span className="text-4xl font-black text-stone-900">{table.label}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteTable(table);
          }}
          disabled={isBusy}
          className="text-stone-400 hover:text-red-600 transition-colors disabled:opacity-50"
          aria-label={`Eliminar mesa ${table.label}`}
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Capacidad</p>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: getCapacityIcons(table.capacity) }).map((_, index) => (
            <span
              key={`${table.id}-cap-${index}`}
              className="material-symbols-outlined text-stone-900 text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleTableStatus(table);
          }}
          disabled={isBusy}
          className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest text-white disabled:opacity-60 ${TABLE_STATUS_CLASS[table.status]}`}
        >
          {isBusy ? '...' : table.status}
        </button>
        <span className={`text-xs font-bold ${
          table.status === TABLE_STATUSES.busy ? 'text-orange-600' : 'text-stone-400'
        }`}
        >
          {table.status === TABLE_STATUSES.busy
            ? formatMinutes(table.active_minutes)
            : 'Disponible'}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          Pedidos activos: {table.active_orders_count}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-black text-stone-400">Mesa</span>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-stone-600">
          Pendientes de hoy ({pendingOrdersToday.length})
        </p>

        {pendingOrdersToday.length === 0 ? (
          <p className="text-xs text-stone-500">No hay pedidos pendientes hoy en esta mesa.</p>
        ) : (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {pendingOrdersToday.map((order) => (
              <article key={order.id} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                <p className="text-[10px] font-black text-stone-800">
                  #{order.id.slice(0, 8).toUpperCase()} · {formatClock(order.created_at)}
                </p>

                {order.items.length === 0 ? (
                  <p className="text-[11px] text-stone-700">Sin productos.</p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {order.items.map((item, index) => (
                      <p key={`${order.id}-${item.product_id}-${index}`} className="text-[11px] text-stone-800 whitespace-normal break-words">
                        <span className="font-black">{item.quantity}x</span> {item.product_name}
                        {item.notes ? ` - ${item.notes}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}