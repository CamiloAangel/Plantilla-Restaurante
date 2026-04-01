import type {
  TableStatus,
} from '@/lib/waiter/constants';

export type WaiterView = 'tables' | 'orders';

export interface WaitersSectionProps {
  initialView?: WaiterView;
}

export interface RestaurantTable {
  id: string;
  label: string;
  capacity: number;
  status: TableStatus;
  created_at: string;
  updated_at: string;
  active_orders_count: number;
  active_minutes: number | null;
}

export interface MenuProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string | null;
  active: boolean;
  stock: number;
}

export interface TodayOrderRow {
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
  items: TodayOrderItem[];
}

export interface TodayOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
}

export interface DayOrderStats {
  orders_count: number;
  revenue_total: number;
  my_orders_count: number;
  pending_count: number;
  in_preparation_count: number;
  ready_count: number;
  delivered_count: number;
  cancelled_count: number;
}