export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Mosques", value: "—", icon: "🕌" },
          { label: "Active Users", value: "—", icon: "👥" },
          { label: "Prayer Schedules", value: "—", icon: "🕐" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-background p-6">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
