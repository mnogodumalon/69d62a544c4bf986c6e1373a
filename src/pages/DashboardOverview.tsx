import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardOverview() {
  const { ausruestungszuweisung, personal, wartungsprotokoll, ausruestungskatalog, loading, error } = useDashboardData();

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">Daten werden geladen...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">Fehler: {error.message}</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Ausrüstungszuweisungen</div>
          <div className="text-3xl font-bold">{ausruestungszuweisung.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Personal</div>
          <div className="text-3xl font-bold">{personal.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Wartungsprotokolle</div>
          <div className="text-3xl font-bold">{wartungsprotokoll.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Ausrüstungskatalog</div>
          <div className="text-3xl font-bold">{ausruestungskatalog.length}</div>
        </div>
      </div>
    </div>
  );
}
