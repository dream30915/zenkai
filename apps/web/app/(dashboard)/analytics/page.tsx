import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export const metadata = { title: "Analytics — Kaizen" };

export default function AnalyticsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">ภาพรวมการสร้างวิดีโอและประสิทธิภาพระบบ</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
