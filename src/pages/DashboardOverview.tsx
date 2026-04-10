import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAusruestungszuweisung, enrichWartungsprotokoll } from '@/lib/enrich';
import type { EnrichedAusruestungszuweisung, EnrichedWartungsprotokoll } from '@/types/enriched';
import type { Ausruestungskatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  IconAlertCircle,
  IconTool,
  IconRefresh,
  IconCheck,
  IconPackage,
  IconUsers,
  IconAlertTriangle,
  IconPlus,
  IconPencil,
  IconTrash,
  IconSearch,
  IconShield,
  IconChevronRight,
  IconCalendar,
  IconClipboardList,
  IconX,
  IconBox,
} from '@tabler/icons-react';
import { AusruestungszuweisungDialog } from '@/components/dialogs/AusruestungszuweisungDialog';
import { WartungsprotokollDialog } from '@/components/dialogs/WartungsprotokollDialog';
import { AusruestungskatalogDialog } from '@/components/dialogs/AusruestungskatalogDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';

const APPGROUP_ID = '69d62a544c4bf986c6e1373a';
const REPAIR_ENDPOINT = '/claude/build/repair';

// ---- Status helpers ----
function zuweisungStatusColor(key: string | undefined) {
  switch (key) {
    case 'ausgegeben': return 'bg-blue-100 text-blue-700';
    case 'zurueckgegeben': return 'bg-green-100 text-green-700';
    case 'verloren': return 'bg-red-100 text-red-700';
    case 'beschaedigt_zurueckgegeben': return 'bg-orange-100 text-orange-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

function zustandColor(key: string | undefined) {
  switch (key) {
    case 'neu': return 'bg-green-100 text-green-700';
    case 'gut': return 'bg-emerald-100 text-emerald-700';
    case 'gebraucht': return 'bg-yellow-100 text-yellow-700';
    case 'reparaturbeduertig': return 'bg-orange-100 text-orange-700';
    case 'ausser_betrieb': return 'bg-red-100 text-red-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

function wartungErgebnisColor(key: string | undefined) {
  switch (key) {
    case 'bestanden': return 'bg-green-100 text-green-700';
    case 'nicht_bestanden': return 'bg-red-100 text-red-700';
    case 'teilweise_bestanden': return 'bg-yellow-100 text-yellow-700';
    case 'ausser_betrieb_gesetzt': return 'bg-red-200 text-red-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

function isOverdue(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function WorkflowNav() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      <a href="#/intents/ausruestung-ausgeben" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
          <IconPackage size={22} className="text-primary" stroke={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">Ausrüstung ausgeben</div>
          <div className="text-xs text-muted-foreground truncate">Personal auswählen &amp; Ausrüstung zuweisen</div>
        </div>
        <IconChevronRight size={18} className="text-muted-foreground flex-shrink-0" stroke={1.5} />
      </a>
      <a href="#/intents/wartung-planen" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
          <IconTool size={22} className="text-primary" stroke={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">Wartung planen</div>
          <div className="text-xs text-muted-foreground truncate">Ausrüstung prüfen &amp; Wartungsprotokoll anlegen</div>
        </div>
        <IconChevronRight size={18} className="text-muted-foreground flex-shrink-0" stroke={1.5} />
      </a>
    </div>
  );
}

export default function DashboardOverview() {
  const {
    ausruestungszuweisung, personal, wartungsprotokoll, ausruestungskatalog,
    personalMap, ausruestungskatalogMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedAusruestungszuweisung = enrichAusruestungszuweisung(ausruestungszuweisung, { personalMap, ausruestungskatalogMap });
  const enrichedWartungsprotokoll = enrichWartungsprotokoll(wartungsprotokoll, { ausruestungskatalogMap });

  // State — ALL hooks before early returns
  const [selectedKatalogId, setSelectedKatalogId] = useState<string | null>(null);
  const [katalogSearch, setKatalogSearch] = useState('');
  const [katalogFilter, setKatalogFilter] = useState<string>('alle');
  const [zuweisungDialogOpen, setZuweisungDialogOpen] = useState(false);
  const [editZuweisung, setEditZuweisung] = useState<EnrichedAusruestungszuweisung | null>(null);
  const [deleteZuweisungTarget, setDeleteZuweisungTarget] = useState<string | null>(null);
  const [wartungDialogOpen, setWartungDialogOpen] = useState(false);
  const [editWartung, setEditWartung] = useState<EnrichedWartungsprotokoll | null>(null);
  const [deleteWartungTarget, setDeleteWartungTarget] = useState<string | null>(null);
  const [katalogDialogOpen, setKatalogDialogOpen] = useState(false);
  const [editKatalog, setEditKatalog] = useState<Ausruestungskatalog | null>(null);
  const [deleteKatalogTarget, setDeleteKatalogTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'zuweisungen' | 'wartung'>('zuweisungen');

  // Derived data
  const selectedKatalog = useMemo(
    () => ausruestungskatalog.find(k => k.record_id === selectedKatalogId) ?? null,
    [ausruestungskatalog, selectedKatalogId]
  );

  const filteredKatalog = useMemo(() => {
    let list = ausruestungskatalog;
    if (katalogFilter !== 'alle') {
      list = list.filter(k => k.fields.kategorie?.key === katalogFilter);
    }
    if (katalogSearch.trim()) {
      const q = katalogSearch.toLowerCase();
      list = list.filter(k =>
        (k.fields.artikel_bezeichnung ?? '').toLowerCase().includes(q) ||
        (k.fields.seriennummer ?? '').toLowerCase().includes(q) ||
        (k.fields.hersteller ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [ausruestungskatalog, katalogFilter, katalogSearch]);

  const zuweisungenFuerArtikel = useMemo(() => {
    if (!selectedKatalogId) return [];
    return enrichedAusruestungszuweisung.filter(z => {
      const id = extractRecordId(z.fields.zugewiesene_ausruestung);
      return id === selectedKatalogId;
    });
  }, [enrichedAusruestungszuweisung, selectedKatalogId]);

  const wartungenFuerArtikel = useMemo(() => {
    if (!selectedKatalogId) return [];
    return enrichedWartungsprotokoll.filter(w => {
      const id = extractRecordId(w.fields.gewartete_ausruestung);
      return id === selectedKatalogId;
    });
  }, [enrichedWartungsprotokoll, selectedKatalogId]);

  // KPI stats
  const ausgegeben = ausruestungszuweisung.filter(z => z.fields.status_zuweisung?.key === 'ausgegeben').length;
  const verloren = ausruestungszuweisung.filter(z => z.fields.status_zuweisung?.key === 'verloren').length;
  const ueberfaelligeRueckgaben = ausruestungszuweisung.filter(
    z => z.fields.status_zuweisung?.key === 'ausgegeben' && isOverdue(z.fields.rueckgabedatum)
  ).length;
  const anstehendeWartungen = wartungsprotokoll.filter(
    w => w.fields.naechste_wartung && !isOverdue(w.fields.naechste_wartung) &&
      new Date(w.fields.naechste_wartung) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ).length;

  // Handlers
  const handleDeleteZuweisung = async () => {
    if (!deleteZuweisungTarget) return;
    await LivingAppsService.deleteAusruestungszuweisungEntry(deleteZuweisungTarget);
    setDeleteZuweisungTarget(null);
    fetchAll();
  };

  const handleDeleteWartung = async () => {
    if (!deleteWartungTarget) return;
    await LivingAppsService.deleteWartungsprotokollEntry(deleteWartungTarget);
    setDeleteWartungTarget(null);
    fetchAll();
  };

  const handleDeleteKatalog = async () => {
    if (!deleteKatalogTarget) return;
    await LivingAppsService.deleteAusruestungskatalogEntry(deleteKatalogTarget);
    setDeleteKatalogTarget(null);
    if (selectedKatalogId === deleteKatalogTarget) setSelectedKatalogId(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      <WorkflowNav />
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Ausrüstungsartikel"
          value={String(ausruestungskatalog.length)}
          description="Im Katalog"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ausgegeben"
          value={String(ausgegeben)}
          description="Aktive Zuweisungen"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Überfällige Rückgaben"
          value={String(ueberfaelligeRueckgaben)}
          description={ueberfaelligeRueckgaben > 0 ? 'Bitte prüfen' : 'Alles OK'}
          icon={<IconAlertTriangle size={18} className={ueberfaelligeRueckgaben > 0 ? 'text-orange-500' : 'text-muted-foreground'} />}
        />
        <StatCard
          title="Wartungen fällig"
          value={String(anstehendeWartungen)}
          description="In den nächsten 30 Tagen"
          icon={<IconTool size={18} className={anstehendeWartungen > 0 ? 'text-yellow-500' : 'text-muted-foreground'} />}
        />
      </div>

      {/* Alerts */}
      {(ueberfaelligeRueckgaben > 0 || verloren > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {ueberfaelligeRueckgaben > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm flex-1">
              <IconAlertTriangle size={16} className="shrink-0 text-orange-500" />
              <span><strong>{ueberfaelligeRueckgaben}</strong> Zuweisung{ueberfaelligeRueckgaben > 1 ? 'en' : ''} mit überfälligem Rückgabedatum</span>
            </div>
          )}
          {verloren > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex-1">
              <IconAlertCircle size={16} className="shrink-0 text-red-500" />
              <span><strong>{verloren}</strong> Artikel als verloren gemeldet</span>
            </div>
          )}
        </div>
      )}

      {/* Main: Inventory + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Ausrüstungskatalog */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <IconBox size={16} className="shrink-0 text-primary" />
              Ausrüstungskatalog
            </h2>
            <Button size="sm" onClick={() => { setEditKatalog(null); setKatalogDialogOpen(true); }}>
              <IconPlus size={14} className="mr-1" />
              Neu
            </Button>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Suchen..."
                value={katalogSearch}
                onChange={e => setKatalogSearch(e.target.value)}
              />
            </div>
            <select
              className="text-sm border rounded-md px-2 h-8 bg-background text-foreground shrink-0"
              value={katalogFilter}
              onChange={e => setKatalogFilter(e.target.value)}
            >
              <option value="alle">Alle</option>
              <option value="handwaffen">Handwaffen</option>
              <option value="schwere_waffen">Schwere Waffen</option>
              <option value="schutzausruestung">Schutzausrüstung</option>
              <option value="kommunikation">Kommunikation</option>
              <option value="fahrzeuge">Fahrzeuge</option>
              <option value="optik_navigation">Optik & Navigation</option>
              <option value="sanitaetsmaterial">Sanitätsmaterial</option>
              <option value="munition">Munition</option>
              <option value="bekleidung">Bekleidung</option>
              <option value="werkzeug_technik">Werkzeug & Technik</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </div>

          {/* List */}
          <div className="border rounded-xl overflow-hidden bg-card">
            {filteredKatalog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <IconPackage size={32} stroke={1.5} />
                <span className="text-sm">Keine Artikel gefunden</span>
              </div>
            ) : (
              <div className="divide-y max-h-[420px] overflow-y-auto">
                {filteredKatalog.map(artikel => {
                  const aktiveZuweisungen = ausruestungszuweisung.filter(z => {
                    const id = extractRecordId(z.fields.zugewiesene_ausruestung);
                    return id === artikel.record_id && z.fields.status_zuweisung?.key === 'ausgegeben';
                  }).length;
                  const isSelected = selectedKatalogId === artikel.record_id;
                  return (
                    <button
                      key={artikel.record_id}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-muted/40'}`}
                      onClick={() => setSelectedKatalogId(isSelected ? null : artikel.record_id)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <IconShield size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{artikel.fields.artikel_bezeichnung ?? '—'}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {artikel.fields.kategorie?.label ?? '—'} · {artikel.fields.seriennummer ?? 'Keine SN'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {aktiveZuweisungen > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{aktiveZuweisungen}</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${zustandColor(artikel.fields.zustand?.key)}`}>
                          {artikel.fields.zustand?.label ?? '—'}
                        </span>
                        <IconChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{filteredKatalog.length} von {ausruestungskatalog.length} Artikeln</div>
        </div>

        {/* RIGHT: Detail Panel */}
        <div className="lg:col-span-3">
          {!selectedKatalog ? (
            <div className="border rounded-xl flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground bg-card h-full min-h-[400px]">
              <IconClipboardList size={40} stroke={1.5} />
              <div className="text-center">
                <p className="font-medium text-foreground">Artikel auswählen</p>
                <p className="text-sm mt-1">Wähle einen Artikel aus dem Katalog, um Details, Zuweisungen und Wartungen zu sehen.</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-card flex flex-col">
              {/* Detail Header */}
              <div className="px-5 py-4 border-b bg-muted/20 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconShield size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{selectedKatalog.fields.artikel_bezeichnung ?? '—'}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedKatalog.fields.kategorie && (
                      <Badge variant="secondary" className="text-xs">{selectedKatalog.fields.kategorie.label}</Badge>
                    )}
                    {selectedKatalog.fields.zustand && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${zustandColor(selectedKatalog.fields.zustand.key)}`}>
                        {selectedKatalog.fields.zustand.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => { setEditKatalog(selectedKatalog); setKatalogDialogOpen(true); }}>
                    <IconPencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteKatalogTarget(selectedKatalog.record_id)}>
                    <IconTrash size={14} className="text-destructive" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedKatalogId(null)}>
                    <IconX size={14} />
                  </Button>
                </div>
              </div>

              {/* Detail Meta */}
              <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 border-b text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Seriennummer</div>
                  <div className="font-medium truncate">{selectedKatalog.fields.seriennummer ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Hersteller</div>
                  <div className="font-medium truncate">{selectedKatalog.fields.hersteller ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Modell</div>
                  <div className="font-medium truncate">{selectedKatalog.fields.modell ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Lagerort</div>
                  <div className="font-medium truncate">{selectedKatalog.fields.lagerort ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Menge</div>
                  <div className="font-medium">{selectedKatalog.fields.menge ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Beschaffungskosten</div>
                  <div className="font-medium">{formatCurrency(selectedKatalog.fields.beschaffungskosten)}</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                <button
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'zuweisungen' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('zuweisungen')}
                >
                  Zuweisungen ({zuweisungenFuerArtikel.length})
                </button>
                <button
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'wartung' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('wartung')}
                >
                  Wartung ({wartungenFuerArtikel.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto max-h-[300px]">
                {activeTab === 'zuweisungen' && (
                  <div>
                    <div className="px-4 py-2 border-b flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Alle Zuweisungen für diesen Artikel</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setEditZuweisung(null); setZuweisungDialogOpen(true); }}
                      >
                        <IconPlus size={12} className="mr-1" />Neue Zuweisung
                      </Button>
                    </div>
                    {zuweisungenFuerArtikel.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                        <IconUsers size={28} stroke={1.5} />
                        <span className="text-sm">Keine Zuweisungen</span>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {zuweisungenFuerArtikel.map(z => (
                          <div key={z.record_id} className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{z.zugewiesenes_personalName || 'Unbekannt'}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${zuweisungStatusColor(z.fields.status_zuweisung?.key)}`}>
                                  {z.fields.status_zuweisung?.label ?? '—'}
                                </span>
                                {z.fields.ausgabedatum && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <IconCalendar size={11} />
                                    {formatDate(z.fields.ausgabedatum)}
                                  </span>
                                )}
                                {z.fields.rueckgabedatum && (
                                  <span className={`text-xs flex items-center gap-1 ${isOverdue(z.fields.rueckgabedatum) && z.fields.status_zuweisung?.key === 'ausgegeben' ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                    <IconCalendar size={11} />
                                    bis {formatDate(z.fields.rueckgabedatum)}
                                    {isOverdue(z.fields.rueckgabedatum) && z.fields.status_zuweisung?.key === 'ausgegeben' && ' (überfällig)'}
                                  </span>
                                )}
                                {z.fields.ausgabe_menge != null && (
                                  <span className="text-xs text-muted-foreground">Menge: {z.fields.ausgabe_menge}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditZuweisung(z); setZuweisungDialogOpen(true); }}>
                                <IconPencil size={13} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteZuweisungTarget(z.record_id)}>
                                <IconTrash size={13} className="text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'wartung' && (
                  <div>
                    <div className="px-4 py-2 border-b flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Wartungshistorie</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setEditWartung(null); setWartungDialogOpen(true); }}
                      >
                        <IconPlus size={12} className="mr-1" />Wartung erfassen
                      </Button>
                    </div>
                    {wartungenFuerArtikel.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                        <IconTool size={28} stroke={1.5} />
                        <span className="text-sm">Keine Wartungseinträge</span>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {wartungenFuerArtikel
                          .sort((a, b) => (b.fields.wartungsdatum ?? '').localeCompare(a.fields.wartungsdatum ?? ''))
                          .map(w => (
                            <div key={w.record_id} className="px-4 py-3 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {w.fields.wartungsart?.label ?? '—'}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {w.fields.ergebnis && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${wartungErgebnisColor(w.fields.ergebnis.key)}`}>
                                      {w.fields.ergebnis.label}
                                    </span>
                                  )}
                                  {w.fields.wartungsdatum && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <IconCalendar size={11} />
                                      {formatDate(w.fields.wartungsdatum)}
                                    </span>
                                  )}
                                  {w.fields.naechste_wartung && (
                                    <span className={`text-xs flex items-center gap-1 ${isOverdue(w.fields.naechste_wartung) ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                      Nächste: {formatDate(w.fields.naechste_wartung)}
                                    </span>
                                  )}
                                  {w.fields.techniker_vorname && (
                                    <span className="text-xs text-muted-foreground">
                                      {w.fields.techniker_vorname} {w.fields.techniker_nachname}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditWartung(w); setWartungDialogOpen(true); }}>
                                  <IconPencil size={13} />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteWartungTarget(w.record_id)}>
                                  <IconTrash size={13} className="text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Personal + Überfällige Zuweisungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Overview */}
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconUsers size={15} className="text-primary shrink-0" />
              Personal ({personal.length})
            </h3>
          </div>
          {personal.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <IconUsers size={28} stroke={1.5} />
              <span className="text-sm">Kein Personal erfasst</span>
            </div>
          ) : (
            <div className="divide-y max-h-[240px] overflow-y-auto">
              {personal.slice(0, 20).map(p => {
                const anzahlArtikel = ausruestungszuweisung.filter(
                  z => extractRecordId(z.fields.zugewiesenes_personal) === p.record_id && z.fields.status_zuweisung?.key === 'ausgegeben'
                ).length;
                return (
                  <div key={p.record_id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary uppercase">
                      {(p.fields.vorname?.[0] ?? '') + (p.fields.nachname?.[0] ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p.fields.dienstgrad?.label ? `${p.fields.dienstgrad.label} ` : ''}{p.fields.vorname} {p.fields.nachname}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{p.fields.einheit ?? '—'}</div>
                    </div>
                    {anzahlArtikel > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">{anzahlArtikel} Artikel</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alle aktuellen Zuweisungen mit Status */}
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconClipboardList size={15} className="text-primary shrink-0" />
              Aktuelle Zuweisungen
            </h3>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedKatalogId(null); setEditZuweisung(null); setZuweisungDialogOpen(true); }}>
              <IconPlus size={12} className="mr-1" />Neu
            </Button>
          </div>
          {enrichedAusruestungszuweisung.filter(z => z.fields.status_zuweisung?.key === 'ausgegeben').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <IconClipboardList size={28} stroke={1.5} />
              <span className="text-sm">Keine aktiven Zuweisungen</span>
            </div>
          ) : (
            <div className="divide-y max-h-[240px] overflow-y-auto">
              {enrichedAusruestungszuweisung
                .filter(z => z.fields.status_zuweisung?.key === 'ausgegeben')
                .sort((a, b) => (a.fields.rueckgabedatum ?? '').localeCompare(b.fields.rueckgabedatum ?? ''))
                .slice(0, 20)
                .map(z => {
                  const overdue = isOverdue(z.fields.rueckgabedatum);
                  return (
                    <div key={z.record_id} className={`px-4 py-2.5 flex items-center gap-3 ${overdue ? 'bg-orange-50/60' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{z.zugewiesene_ausruestungName || '—'}</div>
                        <div className="text-xs text-muted-foreground truncate">{z.zugewiesenes_personalName || 'Unbekannt'}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {z.fields.rueckgabedatum && (
                          <span className={`text-xs ${overdue ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                            {overdue ? '⚠ ' : ''}{formatDate(z.fields.rueckgabedatum)}
                          </span>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditZuweisung(z); setZuweisungDialogOpen(true); }}>
                          <IconPencil size={12} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AusruestungszuweisungDialog
        open={zuweisungDialogOpen}
        onClose={() => { setZuweisungDialogOpen(false); setEditZuweisung(null); }}
        onSubmit={async (fields) => {
          if (editZuweisung) {
            await LivingAppsService.updateAusruestungszuweisungEntry(editZuweisung.record_id, fields);
          } else {
            await LivingAppsService.createAusruestungszuweisungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editZuweisung
          ? editZuweisung.fields
          : selectedKatalogId
          ? { zugewiesene_ausruestung: createRecordUrl(APP_IDS.AUSRUESTUNGSKATALOG, selectedKatalogId) }
          : undefined}
        personalList={personal}
        ausruestungskatalogList={ausruestungskatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Ausruestungszuweisung']}
      />

      <WartungsprotokollDialog
        open={wartungDialogOpen}
        onClose={() => { setWartungDialogOpen(false); setEditWartung(null); }}
        onSubmit={async (fields) => {
          if (editWartung) {
            await LivingAppsService.updateWartungsprotokollEntry(editWartung.record_id, fields);
          } else {
            await LivingAppsService.createWartungsprotokollEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editWartung
          ? editWartung.fields
          : selectedKatalogId
          ? { gewartete_ausruestung: createRecordUrl(APP_IDS.AUSRUESTUNGSKATALOG, selectedKatalogId) }
          : undefined}
        ausruestungskatalogList={ausruestungskatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Wartungsprotokoll']}
      />

      <AusruestungskatalogDialog
        open={katalogDialogOpen}
        onClose={() => { setKatalogDialogOpen(false); setEditKatalog(null); }}
        onSubmit={async (fields) => {
          if (editKatalog) {
            await LivingAppsService.updateAusruestungskatalogEntry(editKatalog.record_id, fields);
          } else {
            await LivingAppsService.createAusruestungskatalogEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editKatalog?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Ausruestungskatalog']}
      />

      <ConfirmDialog
        open={!!deleteZuweisungTarget}
        title="Zuweisung löschen"
        description="Diese Zuweisung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDeleteZuweisung}
        onClose={() => setDeleteZuweisungTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteWartungTarget}
        title="Wartungseintrag löschen"
        description="Diesen Wartungseintrag wirklich löschen?"
        onConfirm={handleDeleteWartung}
        onClose={() => setDeleteWartungTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteKatalogTarget}
        title="Artikel löschen"
        description="Diesen Ausrüstungsartikel wirklich löschen? Alle zugehörigen Daten bleiben erhalten."
        onConfirm={handleDeleteKatalog}
        onClose={() => setDeleteKatalogTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
