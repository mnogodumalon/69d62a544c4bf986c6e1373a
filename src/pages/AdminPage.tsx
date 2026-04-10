import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Ausruestungszuweisung, Personal, Wartungsprotokoll, Ausruestungskatalog } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { AusruestungszuweisungDialog } from '@/components/dialogs/AusruestungszuweisungDialog';
import { AusruestungszuweisungViewDialog } from '@/components/dialogs/AusruestungszuweisungViewDialog';
import { PersonalDialog } from '@/components/dialogs/PersonalDialog';
import { PersonalViewDialog } from '@/components/dialogs/PersonalViewDialog';
import { WartungsprotokollDialog } from '@/components/dialogs/WartungsprotokollDialog';
import { WartungsprotokollViewDialog } from '@/components/dialogs/WartungsprotokollViewDialog';
import { AusruestungskatalogDialog } from '@/components/dialogs/AusruestungskatalogDialog';
import { AusruestungskatalogViewDialog } from '@/components/dialogs/AusruestungskatalogViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const AUSRUESTUNGSZUWEISUNG_FIELDS = [
  { key: 'zugewiesenes_personal', label: 'Soldat / Mitarbeiter', type: 'applookup/select', targetEntity: 'personal', targetAppId: 'PERSONAL', displayField: 'personalnummer' },
  { key: 'zugewiesene_ausruestung', label: 'Ausrüstungsgegenstand', type: 'applookup/select', targetEntity: 'ausruestungskatalog', targetAppId: 'AUSRUESTUNGSKATALOG', displayField: 'artikel_bezeichnung' },
  { key: 'ausgabedatum', label: 'Ausgabedatum', type: 'date/date' },
  { key: 'rueckgabedatum', label: 'Geplantes Rückgabedatum', type: 'date/date' },
  { key: 'status_zuweisung', label: 'Status der Zuweisung', type: 'lookup/radio', options: [{ key: 'ausgegeben', label: 'Ausgegeben' }, { key: 'zurueckgegeben', label: 'Zurückgegeben' }, { key: 'verloren', label: 'Verloren' }, { key: 'beschaedigt_zurueckgegeben', label: 'Beschädigt zurückgegeben' }] },
  { key: 'ausgabe_menge', label: 'Ausgegebene Menge', type: 'number' },
  { key: 'unterschrift_empfaenger', label: 'Unterschrift / Empfangsbestätigung', type: 'file' },
  { key: 'bemerkungen_zuweisung', label: 'Bemerkungen', type: 'string/textarea' },
];
const PERSONAL_FIELDS = [
  { key: 'personalnummer', label: 'Personalnummer', type: 'string/text' },
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'dienstgrad', label: 'Dienstgrad', type: 'lookup/select', options: [{ key: 'gefreiter', label: 'Gefreiter' }, { key: 'obergefreiter', label: 'Obergefreiter' }, { key: 'hauptgefreiter', label: 'Hauptgefreiter' }, { key: 'stabsgefreiter', label: 'Stabsgefreiter' }, { key: 'unteroffizier', label: 'Unteroffizier' }, { key: 'stabsunteroffizier', label: 'Stabsunteroffizier' }, { key: 'feldwebel', label: 'Feldwebel' }, { key: 'oberfeldwebel', label: 'Oberfeldwebel' }, { key: 'hauptfeldwebel', label: 'Hauptfeldwebel' }, { key: 'stabsfeldwebel', label: 'Stabsfeldwebel' }, { key: 'oberstabsfeldwebel', label: 'Oberstabsfeldwebel' }, { key: 'leutnant', label: 'Leutnant' }, { key: 'oberleutnant', label: 'Oberleutnant' }, { key: 'hauptmann', label: 'Hauptmann' }, { key: 'major', label: 'Major' }, { key: 'oberstleutnant', label: 'Oberstleutnant' }, { key: 'oberst', label: 'Oberst' }, { key: 'brigadegeneral', label: 'Brigadegeneral' }, { key: 'generalmajor', label: 'Generalmajor' }, { key: 'generalleutnant', label: 'Generalleutnant' }, { key: 'general', label: 'General' }] },
  { key: 'einheit', label: 'Einheit', type: 'string/text' },
  { key: 'standort', label: 'Standort', type: 'string/text' },
  { key: 'telefon', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'eintrittsdatum', label: 'Eintrittsdatum', type: 'date/date' },
  { key: 'bemerkungen_personal', label: 'Bemerkungen', type: 'string/textarea' },
];
const WARTUNGSPROTOKOLL_FIELDS = [
  { key: 'gewartete_ausruestung', label: 'Ausrüstungsgegenstand', type: 'applookup/select', targetEntity: 'ausruestungskatalog', targetAppId: 'AUSRUESTUNGSKATALOG', displayField: 'artikel_bezeichnung' },
  { key: 'wartungsart', label: 'Art der Wartung', type: 'lookup/select', options: [{ key: 'routineinspektion', label: 'Routineinspektion' }, { key: 'reparatur', label: 'Reparatur' }, { key: 'reinigung', label: 'Reinigung' }, { key: 'kalibrierung', label: 'Kalibrierung' }, { key: 'austausch_teile', label: 'Austausch von Teilen' }, { key: 'hauptinspektion', label: 'Hauptinspektion' }, { key: 'sonstige_wartung', label: 'Sonstige Wartung' }] },
  { key: 'wartungsdatum', label: 'Wartungsdatum', type: 'date/date' },
  { key: 'naechste_wartung', label: 'Nächste geplante Wartung', type: 'date/date' },
  { key: 'techniker_vorname', label: 'Vorname des Technikers', type: 'string/text' },
  { key: 'techniker_nachname', label: 'Nachname des Technikers', type: 'string/text' },
  { key: 'ergebnis', label: 'Ergebnis der Wartung', type: 'lookup/radio', options: [{ key: 'bestanden', label: 'Bestanden' }, { key: 'nicht_bestanden', label: 'Nicht bestanden' }, { key: 'teilweise_bestanden', label: 'Teilweise bestanden' }, { key: 'ausser_betrieb_gesetzt', label: 'Außer Betrieb gesetzt' }] },
  { key: 'kosten_wartung', label: 'Wartungskosten (EUR)', type: 'number' },
  { key: 'wartungsbericht', label: 'Wartungsbericht (Dokument)', type: 'file' },
  { key: 'bemerkungen_wartung', label: 'Bemerkungen', type: 'string/textarea' },
];
const AUSRUESTUNGSKATALOG_FIELDS = [
  { key: 'artikel_bezeichnung', label: 'Bezeichnung', type: 'string/text' },
  { key: 'seriennummer', label: 'Seriennummer', type: 'string/text' },
  { key: 'kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'werkzeug_technik', label: 'Werkzeug & Technik' }, { key: 'sonstiges', label: 'Sonstiges' }, { key: 'schutzausruestung', label: 'Schutzausrüstung' }, { key: 'handwaffen', label: 'Handwaffen' }, { key: 'schwere_waffen', label: 'Schwere Waffen' }, { key: 'munition', label: 'Munition' }, { key: 'kommunikation', label: 'Kommunikation' }, { key: 'fahrzeuge', label: 'Fahrzeuge' }, { key: 'optik_navigation', label: 'Optik & Navigation' }, { key: 'sanitaetsmaterial', label: 'Sanitätsmaterial' }, { key: 'bekleidung', label: 'Bekleidung' }] },
  { key: 'hersteller', label: 'Hersteller', type: 'string/text' },
  { key: 'modell', label: 'Modell', type: 'string/text' },
  { key: 'zustand', label: 'Zustand', type: 'lookup/radio', options: [{ key: 'neu', label: 'Neu' }, { key: 'gut', label: 'Gut' }, { key: 'gebraucht', label: 'Gebraucht' }, { key: 'reparaturbeduertig', label: 'Reparaturbedürftig' }, { key: 'ausser_betrieb', label: 'Außer Betrieb' }] },
  { key: 'beschaffungsdatum', label: 'Beschaffungsdatum', type: 'date/date' },
  { key: 'beschaffungskosten', label: 'Beschaffungskosten (EUR)', type: 'number' },
  { key: 'lagerort', label: 'Lagerort', type: 'string/text' },
  { key: 'menge', label: 'Menge', type: 'number' },
  { key: 'foto_ausruestung', label: 'Foto der Ausrüstung', type: 'file' },
  { key: 'bemerkungen_ausruestung', label: 'Bemerkungen', type: 'string/textarea' },
];

const ENTITY_TABS = [
  { key: 'ausruestungszuweisung', label: 'Ausrüstungszuweisung', pascal: 'Ausruestungszuweisung' },
  { key: 'personal', label: 'Personal', pascal: 'Personal' },
  { key: 'wartungsprotokoll', label: 'Wartungsprotokoll', pascal: 'Wartungsprotokoll' },
  { key: 'ausruestungskatalog', label: 'Ausrüstungskatalog', pascal: 'Ausruestungskatalog' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('ausruestungszuweisung');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'ausruestungszuweisung': new Set(),
    'personal': new Set(),
    'wartungsprotokoll': new Set(),
    'ausruestungskatalog': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'ausruestungszuweisung': {},
    'personal': {},
    'wartungsprotokoll': {},
    'ausruestungskatalog': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'ausruestungszuweisung': return (data as any).ausruestungszuweisung as Ausruestungszuweisung[] ?? [];
      case 'personal': return (data as any).personal as Personal[] ?? [];
      case 'wartungsprotokoll': return (data as any).wartungsprotokoll as Wartungsprotokoll[] ?? [];
      case 'ausruestungskatalog': return (data as any).ausruestungskatalog as Ausruestungskatalog[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'ausruestungszuweisung':
        lists.personalList = (data as any).personal ?? [];
        lists.ausruestungskatalogList = (data as any).ausruestungskatalog ?? [];
        break;
      case 'wartungsprotokoll':
        lists.ausruestungskatalogList = (data as any).ausruestungskatalog ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'ausruestungszuweisung' && fieldKey === 'zugewiesenes_personal') {
      const match = (lists.personalList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.personalnummer ?? '—';
    }
    if (entity === 'ausruestungszuweisung' && fieldKey === 'zugewiesene_ausruestung') {
      const match = (lists.ausruestungskatalogList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.artikel_bezeichnung ?? '—';
    }
    if (entity === 'wartungsprotokoll' && fieldKey === 'gewartete_ausruestung') {
      const match = (lists.ausruestungskatalogList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.artikel_bezeichnung ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'ausruestungszuweisung': return AUSRUESTUNGSZUWEISUNG_FIELDS;
      case 'personal': return PERSONAL_FIELDS;
      case 'wartungsprotokoll': return WARTUNGSPROTOKOLL_FIELDS;
      case 'ausruestungskatalog': return AUSRUESTUNGSKATALOG_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'ausruestungszuweisung': return {
        create: (fields: any) => LivingAppsService.createAusruestungszuweisungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAusruestungszuweisungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteAusruestungszuweisungEntry(id),
      };
      case 'personal': return {
        create: (fields: any) => LivingAppsService.createPersonalEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updatePersonalEntry(id, fields),
        remove: (id: string) => LivingAppsService.deletePersonalEntry(id),
      };
      case 'wartungsprotokoll': return {
        create: (fields: any) => LivingAppsService.createWartungsprotokollEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateWartungsprotokollEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteWartungsprotokollEntry(id),
      };
      case 'ausruestungskatalog': return {
        create: (fields: any) => LivingAppsService.createAusruestungskatalogEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAusruestungskatalogEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteAusruestungskatalogEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'ausruestungszuweisung' || dialogState?.entity === 'ausruestungszuweisung') && (
        <AusruestungszuweisungDialog
          open={createEntity === 'ausruestungszuweisung' || dialogState?.entity === 'ausruestungszuweisung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'ausruestungszuweisung' ? handleUpdate : (fields: any) => handleCreate('ausruestungszuweisung', fields)}
          defaultValues={dialogState?.entity === 'ausruestungszuweisung' ? dialogState.record?.fields : undefined}
          personalList={(data as any).personal ?? []}
          ausruestungskatalogList={(data as any).ausruestungskatalog ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Ausruestungszuweisung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Ausruestungszuweisung']}
        />
      )}
      {(createEntity === 'personal' || dialogState?.entity === 'personal') && (
        <PersonalDialog
          open={createEntity === 'personal' || dialogState?.entity === 'personal'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'personal' ? handleUpdate : (fields: any) => handleCreate('personal', fields)}
          defaultValues={dialogState?.entity === 'personal' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Personal']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Personal']}
        />
      )}
      {(createEntity === 'wartungsprotokoll' || dialogState?.entity === 'wartungsprotokoll') && (
        <WartungsprotokollDialog
          open={createEntity === 'wartungsprotokoll' || dialogState?.entity === 'wartungsprotokoll'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'wartungsprotokoll' ? handleUpdate : (fields: any) => handleCreate('wartungsprotokoll', fields)}
          defaultValues={dialogState?.entity === 'wartungsprotokoll' ? dialogState.record?.fields : undefined}
          ausruestungskatalogList={(data as any).ausruestungskatalog ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Wartungsprotokoll']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Wartungsprotokoll']}
        />
      )}
      {(createEntity === 'ausruestungskatalog' || dialogState?.entity === 'ausruestungskatalog') && (
        <AusruestungskatalogDialog
          open={createEntity === 'ausruestungskatalog' || dialogState?.entity === 'ausruestungskatalog'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'ausruestungskatalog' ? handleUpdate : (fields: any) => handleCreate('ausruestungskatalog', fields)}
          defaultValues={dialogState?.entity === 'ausruestungskatalog' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Ausruestungskatalog']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Ausruestungskatalog']}
        />
      )}
      {viewState?.entity === 'ausruestungszuweisung' && (
        <AusruestungszuweisungViewDialog
          open={viewState?.entity === 'ausruestungszuweisung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'ausruestungszuweisung', record: r }); }}
          personalList={(data as any).personal ?? []}
          ausruestungskatalogList={(data as any).ausruestungskatalog ?? []}
        />
      )}
      {viewState?.entity === 'personal' && (
        <PersonalViewDialog
          open={viewState?.entity === 'personal'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'personal', record: r }); }}
        />
      )}
      {viewState?.entity === 'wartungsprotokoll' && (
        <WartungsprotokollViewDialog
          open={viewState?.entity === 'wartungsprotokoll'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'wartungsprotokoll', record: r }); }}
          ausruestungskatalogList={(data as any).ausruestungskatalog ?? []}
        />
      )}
      {viewState?.entity === 'ausruestungskatalog' && (
        <AusruestungskatalogViewDialog
          open={viewState?.entity === 'ausruestungskatalog'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'ausruestungskatalog', record: r }); }}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}