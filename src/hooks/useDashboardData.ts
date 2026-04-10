import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Ausruestungszuweisung, Personal, Wartungsprotokoll, Ausruestungskatalog } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [ausruestungszuweisung, setAusruestungszuweisung] = useState<Ausruestungszuweisung[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [wartungsprotokoll, setWartungsprotokoll] = useState<Wartungsprotokoll[]>([]);
  const [ausruestungskatalog, setAusruestungskatalog] = useState<Ausruestungskatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [ausruestungszuweisungData, personalData, wartungsprotokollData, ausruestungskatalogData] = await Promise.all([
        LivingAppsService.getAusruestungszuweisung(),
        LivingAppsService.getPersonal(),
        LivingAppsService.getWartungsprotokoll(),
        LivingAppsService.getAusruestungskatalog(),
      ]);
      setAusruestungszuweisung(ausruestungszuweisungData);
      setPersonal(personalData);
      setWartungsprotokoll(wartungsprotokollData);
      setAusruestungskatalog(ausruestungskatalogData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [ausruestungszuweisungData, personalData, wartungsprotokollData, ausruestungskatalogData] = await Promise.all([
          LivingAppsService.getAusruestungszuweisung(),
          LivingAppsService.getPersonal(),
          LivingAppsService.getWartungsprotokoll(),
          LivingAppsService.getAusruestungskatalog(),
        ]);
        setAusruestungszuweisung(ausruestungszuweisungData);
        setPersonal(personalData);
        setWartungsprotokoll(wartungsprotokollData);
        setAusruestungskatalog(ausruestungskatalogData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const personalMap = useMemo(() => {
    const m = new Map<string, Personal>();
    personal.forEach(r => m.set(r.record_id, r));
    return m;
  }, [personal]);

  const ausruestungskatalogMap = useMemo(() => {
    const m = new Map<string, Ausruestungskatalog>();
    ausruestungskatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [ausruestungskatalog]);

  return { ausruestungszuweisung, setAusruestungszuweisung, personal, setPersonal, wartungsprotokoll, setWartungsprotokoll, ausruestungskatalog, setAusruestungskatalog, loading, error, fetchAll, personalMap, ausruestungskatalogMap };
}