import type { FormEvent } from 'react';
import type { RestaurantTable, TodayOrderRow } from './types';
import CreateTableForm from './CreateTableForm';
import TableCard from './TableCard';

interface TablesPanelProps {
  filteredTables: RestaurantTable[];
  pendingOrdersByTable: Map<string, TodayOrderRow[]>;
  freeTablesCount: number;
  busyTablesCount: number;
  errorMessage: string | null;
  flashMessage: string | null;
  tableLabelInput: string;
  tableCapacityInput: number;
  isCreatingTable: boolean;
  busyTableId: string | null;
  onTableLabelChange: (value: string) => void;
  onTableCapacityChange: (value: number) => void;
  onCreateTable: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteTable: (table: RestaurantTable) => void;
  onToggleTableStatus: (table: RestaurantTable) => void;
}

export default function TablesPanel({
  filteredTables,
  pendingOrdersByTable,
  freeTablesCount,
  busyTablesCount,
  errorMessage,
  flashMessage,
  tableLabelInput,
  tableCapacityInput,
  isCreatingTable,
  busyTableId,
  onTableLabelChange,
  onTableCapacityChange,
  onCreateTable,
  onDeleteTable,
  onToggleTableStatus,
}: TablesPanelProps) {
  return (
    <section className="col-span-12 lg:col-span-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight leading-none uppercase">Planta Principal</h2>
          <p className="text-stone-500 mt-2 font-medium tracking-wide">Gestion de disponibilidad en tiempo real</p>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold uppercase tracking-tight">Libre ({freeTablesCount})</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-[11px] font-bold uppercase tracking-tight">Ocupada ({busyTablesCount})</span>
          </div>
        </div>
      </div>

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

      <CreateTableForm
        tableLabelInput={tableLabelInput}
        tableCapacityInput={tableCapacityInput}
        isCreatingTable={isCreatingTable}
        onTableLabelChange={onTableLabelChange}
        onTableCapacityChange={onTableCapacityChange}
        onSubmit={onCreateTable}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {filteredTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            pendingOrdersToday={pendingOrdersByTable.get(table.id) || []}
            isBusy={busyTableId === table.id}
            onDeleteTable={onDeleteTable}
            onToggleTableStatus={onToggleTableStatus}
          />
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-stone-500">No hay mesas para este filtro.</p>
        </div>
      )}
    </section>
  );
}