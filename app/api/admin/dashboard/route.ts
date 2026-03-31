import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardStats,
  getMonthlyComparisonStats,
  getMonthlyWeeksSalesData,
  getRecentStaffActivity,
  getSemesterSalesData,
  getWeeklySalesData,
} from "@/lib/supabaseOrders";
import { getAdminRequestContext } from "@/lib/auth/adminApi";

export async function GET(request: NextRequest) {
  const adminContext = await getAdminRequestContext();

  if (!adminContext.ok) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  const referenceDate = request.nextUrl.searchParams.get("date") || undefined;

  try {
    const [stats, activity, weekly, monthWeeks, semester, monthComparison] = await Promise.all([
      getDashboardStats(referenceDate),
      getRecentStaffActivity(10, referenceDate),
      getWeeklySalesData(referenceDate),
      getMonthlyWeeksSalesData(referenceDate),
      getSemesterSalesData(referenceDate),
      getMonthlyComparisonStats(referenceDate),
    ]);

    return NextResponse.json({
      stats: stats || null,
      activity: activity || [],
      weekly: weekly || [],
      monthWeeks: monthWeeks || [],
      semester: semester || [],
      monthComparison: monthComparison?.comparison || null,
    });
  } catch (error) {
    console.error("Error loading dashboard overview in admin API:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la información del dashboard." },
      { status: 500 }
    );
  }
}
