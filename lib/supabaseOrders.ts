import { supabase, supabaseAdmin } from "./supabaseClient";

const dbClient = supabaseAdmin ?? supabase;

/**
 * Interfaz para los pedidos (estructura real de BD)
 */
export interface Order {
  id: string;
  client_id: string;
  total_amount: number;
  status: "pendiente" | "en_preparacion" | "listo" | "entregado" | "cancelado";
  created_at: string;
}

/**
 * Interfaz para los items de pedido (estructura real de BD)
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  created_at: string;
}

/**
 * Interfaz extendida para mostrar pedidos con información completa
 */
export interface OrderWithDetails extends Order {
  client?: {
    id: string;
    email: string;
    // Agregar otros campos del perfil de usuario según sea necesario
  };
  items?: Array<OrderItem & {
    product?: {
      id: string;
      name: string;
      price: number;
      category: string;
    };
  }>;
}

/**
 * Interfaz para crear un nuevo pedido
 */
export interface CreateOrderData {
  client_id: string;
  status: Order["status"];
  items: Array<{
    product_id: string;
    quantity: number;
    price_at_purchase: number;
  }>;
}

/**
 * Obtener todos los pedidos con sus items y información de productos
 */
export const getOrders = async (): Promise<OrderWithDetails[] | null> => {
  try {
    const { data: orders, error } = await dbClient
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            price,
            category
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener pedidos:", error);
      return null;
    }

    return orders as OrderWithDetails[];
  } catch (error) {
    console.error("Error en getOrders:", error);
    return null;
  }
};

/**
 * Obtener pedidos del día actual con información completa
 */
export const getTodayOrders = async (): Promise<OrderWithDetails[] | null> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayISO = endOfDay.toISOString();

    const { data: orders, error } = await dbClient
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            price,
            category
          )
        )
      `)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDayISO)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener pedidos de hoy:", error);
      return null;
    }

    return orders as OrderWithDetails[];
  } catch (error) {
    console.error("Error en getTodayOrders:", error);
    return null;
  }
};

/**
 * Obtener pedidos del día actual filtrados por estado
 */
export const getTodayOrdersByStatus = async (status?: Order["status"]): Promise<OrderWithDetails[] | null> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayISO = endOfDay.toISOString();

    let query = dbClient
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            price,
            category
          )
        )
      `)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDayISO);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener pedidos filtrados:", error);
      return null;
    }

    return orders as OrderWithDetails[];
  } catch (error) {
    console.error("Error en getTodayOrdersByStatus:", error);
    return null;
  }
};

/**
 * Obtener un pedido por ID con información completa
 */
export const getOrderById = async (id: string): Promise<OrderWithDetails | null> => {
  try {
    const { data: order, error } = await dbClient
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            price,
            category
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error al obtener pedido:", error);
      return null;
    }

    return order as OrderWithDetails;
  } catch (error) {
    console.error("Error en getOrderById:", error);
    return null;
  }
};

/**
 * Crear un nuevo pedido con sus items
 */
export const createOrder = async (orderData: CreateOrderData): Promise<OrderWithDetails | null> => {
  try {
    console.log("=== CREATE ORDER DEBUG ===");
    console.log("orderData:", JSON.stringify(orderData, null, 2));

    // Si no hay service role (cliente público), exigir sesión de usuario.
    if (!supabaseAdmin) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Error: Usuario no autenticado", authError);
        return null;
      }

      console.log("Usuario autenticado:", user.id);
    } else {
      console.log("Creando pedido con service role (servidor)");
    }

    // Calcular el total
    const total_amount = orderData.items.reduce((sum, item) =>
      sum + (item.quantity * item.price_at_purchase), 0
    );

    console.log("total_amount calculated:", total_amount);

    // Crear el pedido
    const { data: order, error: orderError } = await dbClient
      .from("orders")
      .insert([
        {
          client_id: orderData.client_id,
          total_amount,
          status: orderData.status,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error("Error al crear pedido:", JSON.stringify(orderError, null, 2));
      return null;
    }

    console.log("Order created:", order);

    // Crear los items del pedido (SOLO con campos que existen)
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
      // created_at se crea automáticamente
    }));

    console.log("orderItems to insert:", JSON.stringify(orderItems, null, 2));

    // Insertar order_items
    const { data: insertedItems, error: itemsError } = await dbClient
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error("Error al crear items del pedido:", JSON.stringify(itemsError, null, 2));

      // Limpiar el pedido creado si fallan los items
      await dbClient.from("orders").delete().eq("id", order.id);

      // Información específica sobre el problema RLS
      if (itemsError.code === "42501") {
        console.error("=== FALTA POLÍTICA INSERT EN ORDER_ITEMS ===");
        console.error("SOLUCIÓN: Ejecuta este SQL en Supabase:");
        console.error(`
-- Política para permitir INSERT en order_items a usuarios autenticados
CREATE POLICY "Users can insert order items" ON "public"."order_items"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- O si solo quieres que admins puedan crear order_items:
CREATE POLICY "Admins can insert order items" ON "public"."order_items"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'admin'
  )
);
        `);
        console.error("===============================================");
      }

      return null;
    }

    console.log("Items created:", insertedItems);
    console.log("=== CREATE ORDER SUCCESS ===");

    // Retornar el pedido completo
    return getOrderById(order.id);
  } catch (error) {
    console.error("Error en createOrder:", error);
    return null;
  }
};

/**
 * Actualizar un pedido
 */
export const updateOrder = async (
  id: string,
  updates: Partial<Pick<Order, "status" | "total_amount">>
): Promise<OrderWithDetails | null> => {
  try {
    console.log("Updating order:", id, "with:", updates);

    const { data: order, error } = await dbClient
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar pedido:", JSON.stringify(error, null, 2));
      return null;
    }

    console.log("Order updated successfully:", order);

    return getOrderById(id);
  } catch (error) {
    console.error("Error en updateOrder:", error);
    return null;
  }
};

/**
 * Eliminar un pedido (también elimina automáticamente los items por CASCADE)
 */
export const deleteOrder = async (id: string): Promise<boolean> => {
  try {
    // Los order_items se eliminan automáticamente por CASCADE
    const { error } = await dbClient.from("orders").delete().eq("id", id);

    if (error) {
      console.error("Error al eliminar pedido:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error en deleteOrder:", error);
    return false;
  }
};

/**
 * Cambiar estado del pedido
 */
export const updateOrderStatus = async (
  id: string,
  newStatus: Order["status"]
): Promise<OrderWithDetails | null> => {
  return updateOrder(id, { status: newStatus });
};

const resolveReferenceDate = (referenceDate?: Date | string): Date => {
  if (referenceDate instanceof Date) {
    return new Date(referenceDate.getTime());
  }

  if (typeof referenceDate === "string") {
    const plainDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(referenceDate);
    if (plainDateMatch) {
      const [, year, month, day] = plainDateMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsedDate = new Date(referenceDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return new Date();
};

const getDayRange = (referenceDate?: Date | string) => {
  const baseDate = resolveReferenceDate(referenceDate);
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999);

  return { start, end };
};

const getMonthRange = (referenceDate?: Date | string) => {
  const baseDate = resolveReferenceDate(referenceDate);
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);

  return { start, end, baseDate };
};

/**
 * Obtener estadísticas del mes actual vs mes anterior
 */
export const getMonthlyComparisonStats = async (referenceDate?: Date | string): Promise<{
  currentMonth: {
    pedidos: number;
    totalVentas: number;
  };
  previousMonth: {
    pedidos: number;
    totalVentas: number;
  };
  comparison: {
    pedidosChange: number;
    ventasChange: number;
  };
} | null> => {
  try {
    const baseDate = resolveReferenceDate(referenceDate);

    // Mes actual
    const currentMonthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
    const currentMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Mes anterior
    const previousMonthStart = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1, 0, 0, 0, 0);
    const previousMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0, 23, 59, 59, 999);

    // Datos mes actual
    const { data: currentData, error: currentError } = await dbClient
      .from("orders")
      .select("total_amount")
      .gte("created_at", currentMonthStart.toISOString())
      .lte("created_at", currentMonthEnd.toISOString());

    // Datos mes anterior
    const { data: previousData, error: previousError } = await dbClient
      .from("orders")
      .select("total_amount")
      .gte("created_at", previousMonthStart.toISOString())
      .lte("created_at", previousMonthEnd.toISOString());

    if (currentError || previousError) {
      console.error("Error al obtener estadísticas mensuales:", currentError || previousError);
      return null;
    }

    const currentStats = {
      pedidos: currentData?.length || 0,
      totalVentas: currentData?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
    };

    const previousStats = {
      pedidos: previousData?.length || 0,
      totalVentas: previousData?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
    };

    const comparison = {
      pedidosChange: previousStats.pedidos > 0
        ? ((currentStats.pedidos - previousStats.pedidos) / previousStats.pedidos) * 100
        : 0,
      ventasChange: previousStats.totalVentas > 0
        ? ((currentStats.totalVentas - previousStats.totalVentas) / previousStats.totalVentas) * 100
        : 0,
    };

    return {
      currentMonth: currentStats,
      previousMonth: previousStats,
      comparison,
    };
  } catch (error) {
    console.error("Error en getMonthlyComparisonStats:", error);
    return null;
  }
};

/**
 * Obtener ventas por día de la semana actual (Lunes - Domingo)
 */
export const getWeeklySalesData = async (referenceDate?: Date | string): Promise<Array<{
  day: string;
  ventas: number;
  pedidos: number;
}> | null> => {
  try {
    const salesData: Array<{ day: string; ventas: number; pedidos: number }> = [];
    const baseDate = resolveReferenceDate(referenceDate);

    // Obtener el lunes de esta semana
    const monday = new Date(baseDate);
    const dayOfWeek = baseDate.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(baseDate.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    const daysNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await dbClient
        .from("orders")
        .select("total_amount")
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString());

      if (error) {
        console.error("Error al obtener datos diarios:", error);
        return null;
      }

      salesData.push({
        day: daysNames[i],
        ventas: data?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        pedidos: data?.length || 0,
      });
    }

    return salesData;
  } catch (error) {
    console.error("Error en getWeeklySalesData:", error);
    return null;
  }
};

/**
 * Obtener ventas por semanas del mes actual
 */
export const getMonthlyWeeksSalesData = async (referenceDate?: Date | string): Promise<Array<{
  week: string;
  range: string;
  ventas: number;
  pedidos: number;
  startDate: string;
  endDate: string;
}> | null> => {
  try {
    const { start: monthStart, end: monthEnd } = getMonthRange(referenceDate);

    const salesData: Array<{
      week: string;
      range: string;
      ventas: number;
      pedidos: number;
      startDate: string;
      endDate: string;
    }> = [];

    // Obtener todas las semanas del mes
    const weeks = getWeeksInCurrentMonth(monthStart, monthEnd);

    for (let i = 0; i < weeks.length; i++) {
      const { start, end } = weeks[i];

      const { data, error } = await dbClient
        .from("orders")
        .select("total_amount")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) {
        console.error("Error al obtener datos de semanas del mes:", error);
        return null;
      }

      const startLabel = start.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      });
      const endLabel = end.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      });

      salesData.push({
        week: `Semana ${i + 1}`,
        range: `${startLabel} - ${endLabel}`,
        ventas: data?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        pedidos: data?.length || 0,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    }

    return salesData;
  } catch (error) {
    console.error("Error en getMonthlyWeeksSalesData:", error);
    return null;
  }
};

/**
 * Obtener ventas por meses (últimos 6 meses)
 */
export const getMonthlySalesData = async (): Promise<Array<{
  month: string;
  ventas: number;
  pedidos: number;
}> | null> => {
  try {
    const salesData: Array<{ month: string; ventas: number; pedidos: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const { data, error } = await dbClient
        .from("orders")
        .select("total_amount")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      if (error) {
        console.error("Error al obtener datos mensuales:", error);
        return null;
      }

      // Formatear el nombre del mes
      const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ];
      const monthName = monthNames[monthStart.getMonth()];
      const year = monthStart.getFullYear().toString().slice(-2);

      salesData.push({
        month: `${monthName} '${year}`,
        ventas: data?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        pedidos: data?.length || 0,
      });
    }

    return salesData;
  } catch (error) {
    console.error("Error en getMonthlySalesData:", error);
    return null;
  }
};

/**
 * Obtener productos más vendidos por categorías
 */
export const getCategorySalesData = async (): Promise<Array<{
  category: string;
  ventas: number;
  cantidad: number;
}> | null> => {
  try {
    const { data, error } = await dbClient
      .from("order_items")
      .select(`
        quantity,
        price_at_purchase,
        products (
          name,
          category
        )
      `);

    if (error) {
      console.error("Error al obtener datos de categorías:", error);
      return null;
    }

    const categoryStats: Record<string, { ventas: number; cantidad: number }> = {};

    data?.forEach(item => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;

      if (product) {
        const category = product.category || getCategoryFromProductName(product.name);

        if (!categoryStats[category]) {
          categoryStats[category] = { ventas: 0, cantidad: 0 };
        }

        categoryStats[category].ventas += item.quantity * item.price_at_purchase;
        categoryStats[category].cantidad += item.quantity;
      }
    });

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        ventas: stats.ventas,
        cantidad: stats.cantidad,
      }))
      .sort((a, b) => b.ventas - a.ventas);
  } catch (error) {
    console.error("Error en getCategorySalesData:", error);
    return null;
  }
};

/**
 * Obtener estadísticas de pedidos del día actual
 */
export const getTodayOrdersStats = async (referenceDate?: Date | string): Promise<{
  total: number;
  pendientes: number;
  enPreparacion: number;
  listos: number;
  entregados: number;
  cancelados: number;
  totalVentas: number;
} | null> => {
  try {
    const { start: startOfDay, end: endOfDay } = getDayRange(referenceDate);

    const { data, error } = await dbClient
      .from("orders")
      .select("status, total_amount")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (error) {
      console.error("Error al obtener estadísticas de hoy:", error);
      return null;
    }

    const orders = data || [];

    const stats = orders.reduce(
      (acc, order) => {
        acc.total++;
        acc.totalVentas += order.total_amount;

        switch (order.status) {
          case "pendiente":
            acc.pendientes++;
            break;
          case "en_preparacion":
            acc.enPreparacion++;
            break;
          case "listo":
            acc.listos++;
            break;
          case "entregado":
            acc.entregados++;
            break;
          case "cancelado":
            acc.cancelados++;
            break;
        }

        return acc;
      },
      {
        total: 0,
        pendientes: 0,
        enPreparacion: 0,
        listos: 0,
        entregados: 0,
        cancelados: 0,
        totalVentas: 0,
      }
    );

    return stats;
  } catch (error) {
    console.error("Error en getTodayOrdersStats:", error);
    return null;
  }
};

// Funciones auxiliares
function getWeeksInCurrentMonth(monthStart: Date, monthEnd: Date) {
  const weeks = [];
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const lastDayOfMonth = monthEnd.getDate();
  let startDay = 1;

  while (startDay <= lastDayOfMonth) {
    const endDay = Math.min(startDay + 6, lastDayOfMonth);

    weeks.push({
      start: new Date(year, month, startDay, 0, 0, 0, 0),
      end: new Date(year, month, endDay, 23, 59, 59, 999),
    });

    startDay += 7;
  }

  return weeks;
}

function getCategoryFromProductName(productName: string): string {
  const name = productName.toLowerCase();

  if (name.includes("hamburguesa") || name.includes("burger")) return "Hamburguesas";
  if (name.includes("salchipapa")) return "Salchipapas";
  if (name.includes("picada")) return "Picadas";
  if (name.includes("perro") || name.includes("hot dog")) return "Perros";
  if (name.includes("pizza")) return "Pizzas";
  if (name.includes("lasaña") || name.includes("lasagna")) return "Lasañas";
  if (name.includes("entrada") || name.includes("aperitivo")) return "Entradas";
  if (name.includes("jugo") || name.includes("bebida") || name.includes("refresco")) return "Jugos";

  return "Otros";
}

/**
 * Obtener estadísticas del dashboard (ventas hoy, pedidos, etc)
 */
export const getDashboardStats = async (referenceDate?: Date | string) => {
  try {
    // Obtener stats de hoy
    const todayStats = await getTodayOrdersStats(referenceDate);
    
    // Obtener stats del mes
    const { start: monthStart, end: monthEnd } = getMonthRange(referenceDate);

    const { data: monthOrders } = await dbClient
      .from("orders")
      .select("total_amount")
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    const monthStats = {
      totalVentas: (monthOrders || []).reduce((sum, order) => sum + order.total_amount, 0),
      totalPedidos: monthOrders?.length || 0,
    };

    // Top categoría del mes
    const { data: monthOrdersWithItems } = await dbClient
      .from("orders")
      .select(`
        total_amount,
        order_items (
          quantity,
          products (name, category)
        )
      `)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    const categorySales: Record<string, number> = {};
    const typedOrders = (monthOrdersWithItems || []) as Array<{
      order_items?: Array<{
        quantity: number | null;
        products: {
          category: string | null;
        } | null;
      }> | null;
    }>;

    typedOrders.forEach((order) => {
      order.order_items?.forEach((item) => {
        const category = item.products?.category || "Otros";
        categorySales[category] = (categorySales[category] || 0) + (item.quantity || 0);
      });
    });

    const topCategory = Object.entries(categorySales).sort(([, a], [, b]) => b - a)[0];

    return {
      today: todayStats,
      month: monthStats,
      topCategory: topCategory ? { name: topCategory[0], sales: topCategory[1] } : null,
    };
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    return null;
  }
};

/**
 * Obtener actividad reciente del staff
 */
export const getRecentStaffActivity = async (limit: number = 10, referenceDate?: Date | string) => {
  try {
    let query = dbClient
      .from("orders")
      .select(`
        id,
        created_at,
        status,
        total_amount,
        order_items (
          products (name)
        )
      `);

    if (referenceDate) {
      const { start, end } = getDayRange(referenceDate);
      query = query
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }

    const { data: orders } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    return orders || [];
  } catch (error) {
    console.error("Error en getRecentStaffActivity:", error);
    return null;
  }
};

/**
 * Obtener datos de ventas semestrales
 */
export const getSemesterSalesData = async (referenceDate?: Date | string) => {
  try {
    const baseDate = resolveReferenceDate(referenceDate);
    const currentMonth = baseDate.getMonth();
    const startMonth = currentMonth < 6 ? 0 : 6;
    const endMonth = currentMonth < 6 ? 5 : 11;

    const monthsData = [];

    for (let i = startMonth; i <= endMonth; i++) {
      const monthStart = new Date(baseDate.getFullYear(), i, 1, 0, 0, 0, 0);
      const monthEnd = new Date(baseDate.getFullYear(), i + 1, 0, 23, 59, 59, 999);

      const { data } = await dbClient
        .from("orders")
        .select("total_amount")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      const monthName = monthStart.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();
      const totalVentas = (data || []).reduce((sum, order) => sum + order.total_amount, 0);

      monthsData.push({
        month: monthName,
        sales: totalVentas,
        percentage: 0, // Se calcula después
      });
    }

    // Calcular porcentajes
    const totalSales = monthsData.reduce((sum, m) => sum + m.sales, 0);
    monthsData.forEach(m => {
      m.percentage = totalSales > 0 ? Math.round((m.sales / totalSales) * 100) : 0;
    });

    return monthsData;
  } catch (error) {
    console.error("Error en getSemesterSalesData:", error);
    return null;
  }
};