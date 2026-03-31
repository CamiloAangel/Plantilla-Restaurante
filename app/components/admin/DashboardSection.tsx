'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  today: {
    total: number;
    pendientes: number;
    enPreparacion: number;
    listos: number;
    entregados: number;
    cancelados: number;
    totalVentas: number;
  } | null;
  month: {
    totalVentas: number;
    totalPedidos: number;
  };
  topCategory: {
    name: string;
    sales: number;
  } | null;
}

interface StaffActivity {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  order_items: unknown[];
}

interface WeeklySalesPoint {
  day: string;
  ventas: number;
  pedidos: number;
}

interface MonthlyWeekSalesPoint {
  week: string;
  range: string;
  ventas: number;
  pedidos: number;
  startDate: string;
  endDate: string;
}

interface SemesterSalesPoint {
  month: string;
  sales: number;
  percentage: number;
}

interface MonthlyComparison {
  pedidosChange: number;
  ventasChange: number;
}

interface DashboardOverviewResponse {
  stats?: DashboardData | null;
  activity?: StaffActivity[];
  weekly?: WeeklySalesPoint[];
  monthWeeks?: MonthlyWeekSalesPoint[];
  semester?: SemesterSalesPoint[];
  monthComparison?: MonthlyComparison | null;
  error?: string;
}

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (dateText: string): Date => {
  const dateParts = dateText.split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) {
    return new Date();
  }

  const [year, month, day] = dateParts;
  return new Date(year, month - 1, day);
};

const formatCurrency = (value: number, withCents: boolean = true): string => {
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  });
};

const formatCompactCurrency = (value: number): string => {
  return value.toLocaleString('es-CO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
};

const TODAY_INPUT_DATE = formatDateForInput(new Date());

const readApiErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as DashboardOverviewResponse;
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Si no se puede parsear el body usamos mensaje genérico.
  }

  return `La solicitud falló con estado ${response.status}.`;
};

export default function DashboardSection() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [activity, setActivity] = useState<StaffActivity[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklySalesPoint[]>([]);
  const [monthWeeksData, setMonthWeeksData] = useState<MonthlyWeekSalesPoint[]>([]);
  const [semesterData, setSemesterData] = useState<SemesterSalesPoint[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_INPUT_DATE);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/dashboard?date=${encodeURIComponent(selectedDate)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response));
        }

        const payload = (await response.json()) as DashboardOverviewResponse;

        setStats(payload.stats || null);
        setActivity(payload.activity || []);
        setWeeklyData(payload.weekly || []);
        setMonthWeeksData(payload.monthWeeks || []);
        setSemesterData(payload.semester || []);
        setMonthlyComparison(payload.monthComparison || null);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedDate]);

  const selectedDateObject = parseDateInput(selectedDate);
  const selectedDateLabelText = selectedDateObject.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const selectedDateLabel = selectedDateLabelText.charAt(0).toUpperCase() + selectedDateLabelText.slice(1);
  const selectedDateButtonLabel = selectedDateObject.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const currentWeekIndex = selectedDateObject.getDay() === 0 ? 6 : selectedDateObject.getDay() - 1;
  const currentMonthIndexInSemester = selectedDateObject.getMonth() < 6
    ? selectedDateObject.getMonth()
    : selectedDateObject.getMonth() - 6;

  const getBarHeight = (value: number, maxValue: number) => {
    if (maxValue <= 0) return 8;
    if (value <= 0) return 8;
    return Math.max((value / maxValue) * 100, 12);
  };

  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const weeklyBarsBase = weekDays.map((day, idx) => ({
    day,
    ventas: weeklyData[idx]?.ventas || 0,
    pedidos: weeklyData[idx]?.pedidos || 0,
    isCurrent: idx === currentWeekIndex,
  }));

  const maxWeeklyVentas = Math.max(...weeklyBarsBase.map((item) => item.ventas), 0);
  const weeklyBars = weeklyBarsBase.map((item) => ({
    ...item,
    ventasHeight: getBarHeight(item.ventas, maxWeeklyVentas),
  }));

  const selectedDateTimestamp = selectedDateObject.getTime();
  const monthWeeksBarsBase = monthWeeksData.map((item) => {
    const startDate = new Date(item.startDate).getTime();
    const endDate = new Date(item.endDate).getTime();

    return {
      ...item,
      isCurrent: selectedDateTimestamp >= startDate && selectedDateTimestamp <= endDate,
    };
  });

  const maxMonthWeeksPedidos = Math.max(...monthWeeksBarsBase.map((item) => item.pedidos), 0);
  const monthWeeksBars = monthWeeksBarsBase.map((item) => ({
    ...item,
    pedidosHeight: getBarHeight(item.pedidos, maxMonthWeeksPedidos),
  }));

  const semesterMonthLabels = selectedDateObject.getMonth() < 6
    ? ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN']
    : ['JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const semesterBarsBase = semesterMonthLabels.map((month, idx) => ({
    month: semesterData[idx]?.month || month,
    sales: semesterData[idx]?.sales || 0,
    percentage: semesterData[idx]?.percentage || 0,
    isCurrent: idx === currentMonthIndexInSemester,
  }));

  const maxSemesterSales = Math.max(...semesterBarsBase.map((item) => item.sales), 0);
  const semesterBars = semesterBarsBase.map((item) => ({
    ...item,
    salesHeight: getBarHeight(item.sales, maxSemesterSales),
  }));

  const growthValue = Number((monthlyComparison?.ventasChange || 0).toFixed(1));
  const isPositiveGrowth = growthValue >= 0;
  const isFlatGrowth = growthValue === 0;

  const semesterTotalSales = semesterBars.reduce((sum, item) => sum + item.sales, 0);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center px-4 pt-24 md:pt-8 md:ml-64 md:w-[calc(100%-16rem)] md:px-8">
        <p className="text-black font-headline text-lg">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <main className="w-full min-h-screen bg-stone-50 md:ml-64 md:w-[calc(100%-16rem)]">
      <div className="pt-20 md:pt-8 px-4 md:px-8 pb-8">
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="bg-stone-200 text-black text-xs font-black tracking-widest px-3 py-1 rounded-full uppercase mb-2 inline-block">
              Panel de Control
            </span>
            <h2 className="text-4xl font-black text-black tracking-tighter leading-none mb-2">
              Dashboard Operativo
            </h2>
            <p className="text-stone-700 font-medium">Análisis en tiempo real de tu Street Editorial.</p>
            <p className="text-xs text-stone-500 font-bold mt-2">Fecha seleccionada: {selectedDateLabel}</p>
          </div>
          <div className="flex gap-2 items-start flex-wrap">
            <div className="relative">
              <button
                onClick={() => setIsDatePickerOpen((prev) => !prev)}
                className="bg-white text-black border border-stone-300 px-4 py-2 rounded-lg font-headline font-bold text-sm flex items-center gap-2 hover:bg-stone-100 transition-all"
              >
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                {selectedDate === TODAY_INPUT_DATE ? 'Hoy' : selectedDateButtonLabel}
              </button>

              {isDatePickerOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-300 rounded-lg shadow-lg p-4 z-20">
                  <p className="text-xs font-black uppercase tracking-wider text-stone-700 mb-2">
                    Seleccionar fecha
                  </p>
                  <input
                    type="date"
                    value={selectedDate}
                    max={TODAY_INPUT_DATE}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setSelectedDate(event.target.value);
                      setIsDatePickerOpen(false);
                    }}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm font-bold text-black"
                  />
                  <p className="text-[11px] text-stone-500 font-medium mt-2">
                    Solo puedes elegir días de hoy hacia atrás.
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedDate(TODAY_INPUT_DATE);
                        setIsDatePickerOpen(false);
                      }}
                      className="text-xs font-black text-orange-600 hover:underline"
                    >
                      Ir a hoy
                    </button>
                    <button
                      onClick={() => setIsDatePickerOpen(false)}
                      className="text-xs font-bold text-stone-600 hover:underline"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg font-headline font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-600/30 hover:bg-orange-700 transition-all">
              <span className="material-symbols-outlined text-sm">download</span>
              Reporte
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500 relative overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-stone-600 mb-1">Ventas del Día</p>
            <h3 className="text-2xl font-black text-black">${stats?.today?.totalVentas?.toFixed(2) || '0.00'}</h3>
            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              {stats?.today?.total || 0} pedidos
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-stone-800 relative overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-stone-600 mb-1">Pedidos del Día</p>
            <h3 className="text-2xl font-black text-black">{stats?.today?.total || 0}</h3>
            <p className="text-xs text-stone-600 mt-2">Promedio: {Math.round((stats?.today?.total || 0) / 8)}/hr</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-stone-800 relative overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-stone-600 mb-1">Staff Activo</p>
            <h3 className="text-2xl font-black text-black">8</h3>
            <div className="flex -space-x-2 mt-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-stone-300"></div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-stone-400"></div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-stone-500"></div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-xs text-white font-bold">
                +5
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500 relative overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-stone-600 mb-1">Total Mensual</p>
            <h3 className="text-2xl font-black text-black">${stats?.month?.totalVentas?.toFixed(0) || '0'}</h3>
            <p className="text-xs text-stone-600 mt-2">Meta: 85% alcanzada</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-stone-800 relative overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-stone-600 mb-1">Pedidos Mes</p>
            <h3 className="text-2xl font-black text-black">{stats?.month?.totalPedidos || 0}</h3>
            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-orange-600">
              <span className="material-symbols-outlined text-xs">auto_graph</span>
              Alta demanda
            </div>
          </div>

          <div className="bg-stone-100 p-6 rounded-xl shadow-sm border border-stone-200 relative overflow-hidden col-span-1 flex flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-widest text-stone-600 mb-1">Top Categoría</p>
            <h3 className="text-lg md:text-xl font-black text-black truncate whitespace-nowrap" title={stats?.topCategory?.name || 'N/A'}>
              {stats?.topCategory?.name || 'N/A'}
            </h3>
            <p className="text-xs font-bold text-stone-600 mt-2">{stats?.topCategory?.sales || 0} items vendidos</p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          <div className="lg:col-span-4 bg-white p-8 rounded-xl shadow-sm border border-stone-200">
            <div className="flex justify-between items-start mb-6">
              <h4 className="font-black text-black tracking-tight uppercase text-sm">Rendimiento Semanal</h4>
              <span className="material-symbols-outlined text-black">more_vert</span>
            </div>
            <div className="h-56 flex items-end justify-between gap-2 px-1">
              {weeklyBars.map((item, idx) => (
                <div key={`weekly-${idx}`} className="h-full w-full flex flex-col items-center justify-end gap-1">
                  <span className={`text-[10px] font-black ${item.isCurrent ? 'text-orange-600' : 'text-stone-600'}`}>
                    ${formatCompactCurrency(item.ventas)}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${item.isCurrent ? 'bg-orange-500' : 'bg-yellow-400'}`}
                    style={{ height: `${item.ventasHeight}%` }}
                    title={`${item.day}: $${formatCurrency(item.ventas)}`}
                  />
                  <span className={`text-[10px] font-black uppercase ${item.isCurrent ? 'text-orange-600' : 'text-black'}`}>
                    {item.day.slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-700 font-bold mt-4">
              Total vendido en la semana: ${formatCurrency(weeklyBars.reduce((sum, item) => sum + item.ventas, 0), false)}
            </p>
          </div>

          <div className="lg:col-span-4 bg-white p-8 rounded-xl shadow-sm border border-stone-200">
            <div className="flex justify-between items-start mb-6">
              <h4 className="font-black text-black tracking-tight uppercase text-sm">Flujo Pedidos</h4>
              <span className="text-xs font-black text-black bg-stone-200 px-2 py-1 rounded uppercase">
                {selectedDateObject.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="relative h-56 flex items-end justify-between gap-2 px-1">
              {monthWeeksBars.length > 0 ? (
                monthWeeksBars.map((item, idx) => (
                  <div key={`flow-${idx}`} className="h-full w-full flex flex-col items-center justify-end gap-1">
                    <span className={`text-[10px] font-black ${item.isCurrent ? 'text-orange-600' : 'text-stone-600'}`}>
                      {item.pedidos}
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${item.isCurrent ? 'bg-orange-500' : 'bg-yellow-400'}`}
                      style={{ height: `${item.pedidosHeight}%` }}
                      title={`${item.week} (${item.range}): ${item.pedidos} pedidos`}
                    />
                    <span className={`text-[10px] font-black uppercase ${item.isCurrent ? 'text-orange-600' : 'text-black'}`}>
                      S{idx + 1}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs font-bold text-stone-500">No hay datos de pedidos para el mes seleccionado.</p>
              )}
            </div>
            <div className="mt-4 space-y-1">
              {monthWeeksBars.map((item, idx) => (
                <p
                  key={`range-${idx}`}
                  className={`text-[11px] font-bold ${item.isCurrent ? 'text-orange-600' : 'text-stone-700'}`}
                >
                  {item.week}: {item.range}
                </p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-rows-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <h4 className="font-black text-black tracking-tight uppercase text-xs mb-4">Ventas Semestrales</h4>
              <div className="h-44 flex items-end justify-between gap-2">
                {semesterBars.map((item, idx) => (
                  <div key={`sem-${item.month}-${idx}`} className="h-full w-full flex flex-col items-center justify-end gap-1">
                    <span className={`text-[10px] font-black ${item.isCurrent ? 'text-orange-600' : 'text-stone-600'}`}>
                      ${formatCompactCurrency(item.sales)}
                    </span>
                    <div
                      className={`w-full rounded-sm transition-colors ${item.isCurrent ? 'bg-orange-500' : 'bg-yellow-400'}`}
                      style={{ height: `${item.salesHeight}%` }}
                      title={`${item.month}: $${formatCurrency(item.sales)}`}
                    />
                    <span className={`text-[10px] font-black uppercase ${item.isCurrent ? 'text-orange-600' : 'text-black'}`}>
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-stone-700 font-bold mt-3">
                Total vendido en semestre: ${formatCurrency(semesterTotalSales, false)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <p className="text-xs font-black uppercase text-stone-600 mb-1">vs. Mes Anterior</p>
              <div className={`flex items-baseline gap-2 ${isFlatGrowth ? 'text-stone-700' : isPositiveGrowth ? 'text-emerald-600' : 'text-red-600'}`}>
                <h3 className="text-4xl font-black">
                  {!isFlatGrowth && isPositiveGrowth ? '+' : ''}{growthValue}%
                </h3>
                <span className="material-symbols-outlined">
                  {isFlatGrowth ? 'trending_flat' : isPositiveGrowth ? 'north_east' : 'south_west'}
                </span>
              </div>
              <p className="text-xs font-bold text-stone-600 mt-2">
                {isFlatGrowth ? 'Sin variación frente al mes anterior.' : isPositiveGrowth ? 'Crecimiento sostenido.' : 'Atención requerida.'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center">
              <h4 className="font-black text-black tracking-tight uppercase text-sm">Actividad del Día Seleccionado</h4>
              <button className="text-xs font-bold text-black hover:underline">Ver todo</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-100 text-black font-bold text-xs uppercase tracking-widest border-b border-stone-200">
                    <th className="px-6 py-4">Pedido</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Monto</th>
                    <th className="px-6 py-4">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {activity.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-black">#{item.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-black capitalize">{item.status}</td>
                      <td className="px-6 py-4 font-extrabold text-black">${item.total_amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-stone-600 text-xs">{new Date(item.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {activity.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-stone-500 font-medium">
                        No hay actividad para la fecha seleccionada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-stone-900 rounded-xl overflow-hidden relative h-full min-h-[320px] flex flex-col justify-end p-8 border border-stone-800">
              <div className="relative z-10">
                <span className="text-white font-black text-xs tracking-wider uppercase block mb-2">
                  Cultura Vastago
                </span>
                <h4 className="text-2xl font-black text-white leading-tight mb-3">
                  La excelencia en cada detalle.
                </h4>
                <p className="text-stone-300 text-sm">
                  Mantén el estándar en cada interacción.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}