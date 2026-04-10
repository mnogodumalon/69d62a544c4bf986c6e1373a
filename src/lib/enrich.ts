import type { EnrichedAusruestungszuweisung, EnrichedWartungsprotokoll } from '@/types/enriched';
import type { Ausruestungskatalog, Ausruestungszuweisung, Personal, Wartungsprotokoll } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AusruestungszuweisungMaps {
  personalMap: Map<string, Personal>;
  ausruestungskatalogMap: Map<string, Ausruestungskatalog>;
}

export function enrichAusruestungszuweisung(
  ausruestungszuweisung: Ausruestungszuweisung[],
  maps: AusruestungszuweisungMaps
): EnrichedAusruestungszuweisung[] {
  return ausruestungszuweisung.map(r => ({
    ...r,
    zugewiesenes_personalName: resolveDisplay(r.fields.zugewiesenes_personal, maps.personalMap, 'vorname', 'nachname'),
    zugewiesene_ausruestungName: resolveDisplay(r.fields.zugewiesene_ausruestung, maps.ausruestungskatalogMap, 'artikel_bezeichnung'),
  }));
}

interface WartungsprotokollMaps {
  ausruestungskatalogMap: Map<string, Ausruestungskatalog>;
}

export function enrichWartungsprotokoll(
  wartungsprotokoll: Wartungsprotokoll[],
  maps: WartungsprotokollMaps
): EnrichedWartungsprotokoll[] {
  return wartungsprotokoll.map(r => ({
    ...r,
    gewartete_ausruestungName: resolveDisplay(r.fields.gewartete_ausruestung, maps.ausruestungskatalogMap, 'artikel_bezeichnung'),
  }));
}
