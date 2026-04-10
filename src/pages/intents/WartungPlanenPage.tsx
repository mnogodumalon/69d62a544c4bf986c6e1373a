import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseISO, isBefore, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { AusruestungskatalogDialog } from '@/components/dialogs/AusruestungskatalogDialog';
import { WartungsprotokollDialog } from '@/components/dialogs/WartungsprotokollDialog';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Ausruestungskatalog, Wartungsprotokoll } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconTool,
  IconCheck,
  IconAlertTriangle,
  IconClipboardList,
  IconCalendar,
  IconUser,
  IconCurrencyEuro,
  IconArrowRight,
  IconRefresh,
  IconInfoCircle,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Ausrüstung' },
  { label: 'Wartung erfassen' },
  { label: 'Abschluss' },
];

type FilterMode = 'alle' | 'ueberfaellig' | 'schlechter_zustand';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

function isOverdue(naechste_wartung: string | undefined): boolean {
  if (!naechste_wartung) return false;
  try {
    return isBefore(parseISO(naechste_wartung), new Date());
  } catch {
    return false;
  }
}

export default function WartungPlanenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ausruestungskatalog, wartungsprotokoll, loading, error, fetchAll } = useDashboardData();

  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    if (s >= 1 && s <= 3) return s;
    return 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [filterMode, setFilterMode] = useState<FilterMode>('alle');
  const [selectedItem, setSelectedItem] = useState<Ausruestungskatalog | null>(null);
  const [newProtocol, setNewProtocol] = useState<Wartungsprotokoll | null>(null);
  const [ausruestungDialogOpen, setAusruestungDialogOpen] = useState(false);
  const [wartungsDialogOpen, setWartungsDialogOpen] = useState(false);

  // Deep-linking: preselect equipment from URL
  useEffect(() => {
    const ausruestungId = searchParams.get('ausruestungId');
    if (ausruestungId && ausruestungskatalog.length > 0 && !selectedItem) {
      const found = ausruestungskatalog.find(a => a.record_id === ausruestungId);
      if (found) {
        setSelectedItem(found);
        setCurrentStep(2);
      }
    }
  }, [ausruestungskatalog, searchParams, selectedItem]);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedItem) {
      params.set('ausruestungId', selectedItem.record_id);
    } else {
      params.delete('ausruestungId');
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedItem, searchParams, setSearchParams]);

  // Build map: ausruestung record_id -> latest wartungsprotokoll
  const latestWartungMap = useMemo(() => {
    const map = new Map<string, Wartungsprotokoll>();
    for (const w of wartungsprotokoll) {
      const ausrId = extractRecordId(w.fields.gewartete_ausruestung);
      if (!ausrId) continue;
      const existing = map.get(ausrId);
      if (!existing) {
        map.set(ausrId, w);
      } else {
        // compare by wartungsdatum — keep the latest
        const existingDate = existing.fields.wartungsdatum ?? '';
        const newDate = w.fields.wartungsdatum ?? '';
        if (newDate > existingDate) {
          map.set(ausrId, w);
        }
      }
    }
    return map;
  }, [wartungsprotokoll]);

  // Wartungsprotokolle for selected item
  const itemProtocols = useMemo(() => {
    if (!selectedItem) return [];
    return wartungsprotokoll
      .filter(w => extractRecordId(w.fields.gewartete_ausruestung) === selectedItem.record_id)
      .sort((a, b) => {
        const da = a.fields.wartungsdatum ?? '';
        const db = b.fields.wartungsdatum ?? '';
        return db > da ? 1 : -1;
      });
  }, [wartungsprotokoll, selectedItem]);

  // Filter equipment list
  const filteredAusruestung = useMemo(() => {
    return ausruestungskatalog.filter(a => {
      if (filterMode === 'alle') return true;
      if (filterMode === 'schlechter_zustand') {
        return a.fields.zustand?.key === 'schlecht' || a.fields.zustand?.key === 'reparaturbeduertig' || a.fields.zustand?.key === 'ausser_betrieb';
      }
      if (filterMode === 'ueberfaellig') {
        const latest = latestWartungMap.get(a.record_id);
        if (!latest) return true; // never maintained = overdue
        return isOverdue(latest.fields.naechste_wartung);
      }
      return true;
    });
  }, [ausruestungskatalog, filterMode, latestWartungMap]);

  const handleSelectItem = (id: string) => {
    const found = ausruestungskatalog.find(a => a.record_id === id);
    if (found) {
      setSelectedItem(found);
      setNewProtocol(null);
      setCurrentStep(2);
    }
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleReset = () => {
    setSelectedItem(null);
    setNewProtocol(null);
    setCurrentStep(1);
  };

  // Count filters
  const countOverdue = useMemo(() => ausruestungskatalog.filter(a => {
    const latest = latestWartungMap.get(a.record_id);
    if (!latest) return true;
    return isOverdue(latest.fields.naechste_wartung);
  }).length, [ausruestungskatalog, latestWartungMap]);

  const countSchlechtZustand = useMemo(() => ausruestungskatalog.filter(a =>
    a.fields.zustand?.key === 'schlecht' || a.fields.zustand?.key === 'reparaturbeduertig' || a.fields.zustand?.key === 'ausser_betrieb'
  ).length, [ausruestungskatalog]);

  // Summary stats for selected item
  const totalProtocols = itemProtocols.length;
  const avgKosten = useMemo(() => {
    const costs = itemProtocols
      .map(p => p.fields.kosten_wartung)
      .filter((k): k is number => typeof k === 'number');
    if (costs.length === 0) return null;
    return costs.reduce((sum, c) => sum + c, 0) / costs.length;
  }, [itemProtocols]);

  const ergebnisColor = (key: string | undefined) => {
    if (key === 'bestanden') return 'text-green-700 bg-green-50 border-green-200';
    if (key === 'nicht_bestanden') return 'text-red-700 bg-red-50 border-red-200';
    if (key === 'teilweise_bestanden') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (key === 'ausser_betrieb_gesetzt') return 'text-slate-700 bg-slate-50 border-slate-200';
    return 'text-muted-foreground bg-muted border-muted';
  };

  const zustandColor = (key: string | undefined) => {
    if (key === 'neu') return 'bg-blue-100 text-blue-700';
    if (key === 'gut') return 'bg-green-100 text-green-700';
    if (key === 'gebraucht') return 'bg-yellow-100 text-yellow-700';
    if (key === 'reparaturbeduertig') return 'bg-orange-100 text-orange-700';
    if (key === 'ausser_betrieb') return 'bg-red-100 text-red-700';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="p-4 sm:p-6">
      <IntentWizardShell
        title="Wartung planen"
        subtitle="Plane und dokumentiere Wartungsmaßnahmen für deine Ausrüstung."
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        loading={loading}
        error={error}
        onRetry={fetchAll}
      >
        {/* ─── Step 1: Ausrüstung auswählen ─── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterMode('alle')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filterMode === 'alle'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                Alle ({ausruestungskatalog.length})
              </button>
              <button
                onClick={() => setFilterMode('ueberfaellig')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                  filterMode === 'ueberfaellig'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-card border-border text-muted-foreground hover:border-orange-400'
                }`}
              >
                <IconAlertTriangle size={14} stroke={2} />
                Wartung überfällig ({countOverdue})
              </button>
              <button
                onClick={() => setFilterMode('schlechter_zustand')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                  filterMode === 'schlechter_zustand'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-card border-border text-muted-foreground hover:border-red-400'
                }`}
              >
                <IconTool size={14} stroke={2} />
                Schlechter Zustand ({countSchlechtZustand})
              </button>
            </div>

            <EntitySelectStep
              items={filteredAusruestung.map(a => {
                const latest = latestWartungMap.get(a.record_id);
                const lastMaintenance = latest?.fields.wartungsdatum
                  ? `Letzte Wartung: ${formatDate(latest.fields.wartungsdatum)}`
                  : 'Noch nie gewartet';
                const overdueNote = latest && isOverdue(latest.fields.naechste_wartung)
                  ? `Fällig seit: ${formatDate(latest.fields.naechste_wartung)}`
                  : latest?.fields.naechste_wartung
                  ? `Nächste Wartung: ${formatDate(latest.fields.naechste_wartung)}`
                  : undefined;
                return {
                  id: a.record_id,
                  title: a.fields.artikel_bezeichnung ?? '(Ohne Bezeichnung)',
                  subtitle: [a.fields.hersteller, a.fields.lagerort].filter(Boolean).join(' · '),
                  status: a.fields.zustand
                    ? { key: a.fields.zustand.key, label: a.fields.zustand.label }
                    : undefined,
                  icon: <IconTool size={18} className="text-primary" stroke={1.5} />,
                  stats: [
                    { label: 'Zustand', value: lastMaintenance },
                    ...(overdueNote ? [{ label: 'Fälligkeit', value: overdueNote }] : []),
                  ],
                };
              })}
              onSelect={handleSelectItem}
              searchPlaceholder="Ausrüstung suchen..."
              emptyIcon={<IconTool size={32} stroke={1} />}
              emptyText={
                filterMode === 'ueberfaellig'
                  ? 'Keine überfälligen Wartungen gefunden.'
                  : filterMode === 'schlechter_zustand'
                  ? 'Kein Gerät mit schlechtem Zustand gefunden.'
                  : 'Keine Ausrüstung vorhanden.'
              }
              createLabel="Neue Ausrüstung anlegen"
              onCreateNew={() => setAusruestungDialogOpen(true)}
              createDialog={
                <AusruestungskatalogDialog
                  open={ausruestungDialogOpen}
                  onClose={() => setAusruestungDialogOpen(false)}
                  onSubmit={async (fields) => {
                    await LivingAppsService.createAusruestungskatalogEntry(fields);
                    await fetchAll();
                    setAusruestungDialogOpen(false);
                  }}
                />
              }
            />
          </div>
        )}

        {/* ─── Step 2: Wartung erfassen ─── */}
        {currentStep === 2 && selectedItem && (
          <div className="space-y-5">
            {/* Selected equipment header */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconTool size={20} className="text-primary" stroke={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base truncate">
                    {selectedItem.fields.artikel_bezeichnung ?? '(Ohne Bezeichnung)'}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {selectedItem.fields.hersteller && (
                      <span className="text-xs text-muted-foreground">{selectedItem.fields.hersteller}</span>
                    )}
                    {selectedItem.fields.lagerort && (
                      <span className="text-xs text-muted-foreground">· {selectedItem.fields.lagerort}</span>
                    )}
                    {selectedItem.fields.zustand && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zustandColor(selectedItem.fields.zustand.key)}`}>
                        {selectedItem.fields.zustand.label}
                      </span>
                    )}
                  </div>
                  {selectedItem.fields.seriennummer && (
                    <p className="text-xs text-muted-foreground mt-0.5">S/N: {selectedItem.fields.seriennummer}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedItem(null); setCurrentStep(1); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                >
                  Ändern
                </button>
              </div>
            </div>

            {/* Success card for newly created protocol */}
            {newProtocol && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <IconCheck size={18} className="text-green-700 shrink-0" stroke={2.5} />
                  <span className="font-semibold text-green-800 text-sm">Wartungsprotokoll erfolgreich gespeichert</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {newProtocol.fields.wartungsart && (
                    <div className="flex items-center gap-1.5">
                      <IconClipboardList size={14} className="text-green-700 shrink-0" stroke={1.5} />
                      <span className="text-green-900">{newProtocol.fields.wartungsart.label}</span>
                    </div>
                  )}
                  {newProtocol.fields.wartungsdatum && (
                    <div className="flex items-center gap-1.5">
                      <IconCalendar size={14} className="text-green-700 shrink-0" stroke={1.5} />
                      <span className="text-green-900">{formatDate(newProtocol.fields.wartungsdatum)}</span>
                    </div>
                  )}
                  {newProtocol.fields.ergebnis && (
                    <div className="flex items-center gap-1.5 col-span-2">
                      <IconInfoCircle size={14} className="text-green-700 shrink-0" stroke={1.5} />
                      <span className="text-green-900">Ergebnis: {newProtocol.fields.ergebnis.label}</span>
                    </div>
                  )}
                  {newProtocol.fields.naechste_wartung && (
                    <div className="flex items-center gap-1.5 col-span-2">
                      <IconCalendar size={14} className="text-green-700 shrink-0" stroke={1.5} />
                      <span className="text-green-900">Nächste Wartung: {formatDate(newProtocol.fields.naechste_wartung)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Maintenance history */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <IconClipboardList size={16} stroke={1.5} className="text-muted-foreground" />
                Wartungshistorie
                {itemProtocols.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{itemProtocols.length}</Badge>
                )}
              </h3>
              {itemProtocols.length === 0 ? (
                <div className="text-center py-6 rounded-xl border border-dashed text-muted-foreground text-sm">
                  <IconClipboardList size={24} stroke={1} className="mx-auto mb-2 opacity-40" />
                  Noch kein Wartungsprotokoll vorhanden
                </div>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  {itemProtocols.map(p => (
                    <div
                      key={p.record_id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 rounded-lg border bg-card text-sm overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconCalendar size={14} className="text-muted-foreground shrink-0" stroke={1.5} />
                        <span className="font-medium">{formatDate(p.fields.wartungsdatum)}</span>
                      </div>
                      {p.fields.wartungsart && (
                        <span className="text-muted-foreground truncate">{p.fields.wartungsart.label}</span>
                      )}
                      {(p.fields.techniker_vorname || p.fields.techniker_nachname) && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <IconUser size={13} stroke={1.5} />
                          <span className="truncate">
                            {[p.fields.techniker_vorname, p.fields.techniker_nachname].filter(Boolean).join(' ')}
                          </span>
                        </div>
                      )}
                      {p.fields.ergebnis && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ergebnisColor(p.fields.ergebnis.key)}`}>
                          {p.fields.ergebnis.label}
                        </span>
                      )}
                      {typeof p.fields.kosten_wartung === 'number' && (
                        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                          <IconCurrencyEuro size={13} stroke={1.5} />
                          <span>{p.fields.kosten_wartung.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => setWartungsDialogOpen(true)}
              >
                <IconClipboardList size={16} stroke={2} />
                Wartungsprotokoll anlegen
              </Button>
              <Button
                variant="outline"
                className="sm:w-auto gap-2"
                onClick={() => setCurrentStep(3)}
              >
                Überspringen — nur ansehen
                <IconArrowRight size={15} stroke={1.5} />
              </Button>
            </div>

            {newProtocol && (
              <Button
                className="w-full gap-2"
                onClick={() => setCurrentStep(3)}
              >
                Weiter zur Zusammenfassung
                <IconArrowRight size={15} stroke={2} />
              </Button>
            )}

            <WartungsprotokollDialog
              open={wartungsDialogOpen}
              onClose={() => setWartungsDialogOpen(false)}
              ausruestungskatalogList={ausruestungskatalog}
              defaultValues={{
                gewartete_ausruestung: createRecordUrl(APP_IDS.AUSRUESTUNGSKATALOG, selectedItem.record_id),
              }}
              onSubmit={async (fields) => {
                const result = await LivingAppsService.createWartungsprotokollEntry(fields);
                await fetchAll();
                setWartungsDialogOpen(false);
                // Extract created record from result
                const entries = Object.entries(result as Record<string, unknown>);
                if (entries.length > 0) {
                  const [record_id, recordData] = entries[0];
                  const data = recordData as { fields?: Wartungsprotokoll['fields'] };
                  if (data?.fields) {
                    setNewProtocol({
                      record_id,
                      createdat: new Date().toISOString(),
                      updatedat: null,
                      fields: data.fields,
                    });
                  }
                }
              }}
            />
          </div>
        )}

        {/* ─── Step 3: Abschluss & Zusammenfassung ─── */}
        {currentStep === 3 && selectedItem && (
          <div className="space-y-5">
            {/* Equipment details */}
            <div className="p-4 rounded-xl border bg-card overflow-hidden">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <IconTool size={15} className="text-muted-foreground" stroke={1.5} />
                Ausrüstungsdetails
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Bezeichnung</p>
                  <p className="font-medium truncate">{selectedItem.fields.artikel_bezeichnung ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Seriennummer</p>
                  <p className="font-medium truncate">{selectedItem.fields.seriennummer ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Zustand</p>
                  {selectedItem.fields.zustand ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zustandColor(selectedItem.fields.zustand.key)}`}>
                      {selectedItem.fields.zustand.label}
                    </span>
                  ) : <p className="font-medium">—</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Lagerort</p>
                  <p className="font-medium truncate">{selectedItem.fields.lagerort ?? '—'}</p>
                </div>
                {selectedItem.fields.hersteller && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Hersteller</p>
                    <p className="font-medium truncate">{selectedItem.fields.hersteller}</p>
                  </div>
                )}
                {selectedItem.fields.modell && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Modell</p>
                    <p className="font-medium truncate">{selectedItem.fields.modell}</p>
                  </div>
                )}
              </div>
            </div>

            {/* New protocol highlight */}
            {newProtocol && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 overflow-hidden">
                <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <IconCheck size={15} stroke={2.5} />
                  Neu erstelltes Wartungsprotokoll
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {newProtocol.fields.wartungsart && (
                    <div>
                      <p className="text-xs text-green-700 mb-0.5">Wartungsart</p>
                      <p className="font-medium text-green-900">{newProtocol.fields.wartungsart.label}</p>
                    </div>
                  )}
                  {newProtocol.fields.wartungsdatum && (
                    <div>
                      <p className="text-xs text-green-700 mb-0.5">Datum</p>
                      <p className="font-medium text-green-900">{formatDate(newProtocol.fields.wartungsdatum)}</p>
                    </div>
                  )}
                  {newProtocol.fields.ergebnis && (
                    <div>
                      <p className="text-xs text-green-700 mb-0.5">Ergebnis</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-block ${ergebnisColor(newProtocol.fields.ergebnis.key)}`}>
                        {newProtocol.fields.ergebnis.label}
                      </span>
                    </div>
                  )}
                  {newProtocol.fields.naechste_wartung && (
                    <div>
                      <p className="text-xs text-green-700 mb-0.5">Nächste Wartung</p>
                      <p className="font-medium text-green-900">{formatDate(newProtocol.fields.naechste_wartung)}</p>
                    </div>
                  )}
                  {typeof newProtocol.fields.kosten_wartung === 'number' && (
                    <div>
                      <p className="text-xs text-green-700 mb-0.5">Kosten</p>
                      <p className="font-medium text-green-900">{newProtocol.fields.kosten_wartung.toFixed(2)} €</p>
                    </div>
                  )}
                  {(newProtocol.fields.techniker_vorname || newProtocol.fields.techniker_nachname) && (
                    <div>
                      <p className="text-xs text-green-700 mb-0.5">Techniker</p>
                      <p className="font-medium text-green-900 truncate">
                        {[newProtocol.fields.techniker_vorname, newProtocol.fields.techniker_nachname].filter(Boolean).join(' ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border bg-card overflow-hidden text-center">
                <p className="text-2xl font-bold">{totalProtocols}</p>
                <p className="text-xs text-muted-foreground mt-1">Wartungen gesamt</p>
              </div>
              <div className="p-4 rounded-xl border bg-card overflow-hidden text-center">
                {avgKosten !== null ? (
                  <>
                    <p className="text-2xl font-bold">{avgKosten.toFixed(0)} €</p>
                    <p className="text-xs text-muted-foreground mt-1">Ø Kosten pro Wartung</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                    <p className="text-xs text-muted-foreground mt-1">Ø Kosten pro Wartung</p>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1 gap-2"
                onClick={handleReset}
              >
                <IconRefresh size={16} stroke={2} />
                Weitere Wartung planen
              </Button>
              <a href="/#/" className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full gap-2">
                  Zum Dashboard
                  <IconArrowRight size={15} stroke={1.5} />
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Fallback if step 2 or 3 has no selected item */}
        {(currentStep === 2 || currentStep === 3) && !selectedItem && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-3">Kein Gerät ausgewählt.</p>
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Zurück zur Auswahl
            </Button>
          </div>
        )}
      </IntentWizardShell>
    </div>
  );
}
