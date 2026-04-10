import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Personal, Ausruestungskatalog } from '@/types/app';
import { PersonalDialog } from '@/components/dialogs/PersonalDialog';
import { AusruestungskatalogDialog } from '@/components/dialogs/AusruestungskatalogDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  IconUser,
  IconPackage,
  IconCheck,
  IconLoader2,
  IconArrowRight,
  IconArrowLeft,
  IconPlus,
  IconCircleCheck,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Personal' },
  { label: 'Ausrüstung' },
  { label: 'Details' },
  { label: 'Abschluss' },
];

interface ItemDetail {
  menge: number;
  ausgabedatum: string;
  rueckgabedatum: string;
  bemerkungen: string;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AusruestungAusgebenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { personal, ausruestungskatalog, loading, error, fetchAll } = useDashboardData();

  // Wizard state
  const [step, setStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    return urlStep >= 1 && urlStep <= 4 ? urlStep : 1;
  });

  // Step 1
  const [selectedPerson, setSelectedPerson] = useState<Personal | null>(null);
  const [personalDialogOpen, setPersonalDialogOpen] = useState(false);

  // Step 2
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [ausruestungDialogOpen, setAusruestungDialogOpen] = useState(false);

  // Step 3
  const [itemDetails, setItemDetails] = useState<Map<string, ItemDetail>>(new Map());

  // Step 4
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [assignedItems, setAssignedItems] = useState<{ name: string; menge: number }[]>([]);

  // Deep-linking: pre-select person from URL param
  useEffect(() => {
    const personalId = searchParams.get('personalId');
    if (personalId && personal.length > 0 && !selectedPerson) {
      const found = personal.find(p => p.record_id === personalId);
      if (found) {
        setSelectedPerson(found);
        const urlStep = parseInt(searchParams.get('step') ?? '', 10);
        if (!urlStep || urlStep < 2) {
          handleStepChange(2);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personal]);

  const handleStepChange = useCallback((newStep: number) => {
    setStep(newStep);
    const params = new URLSearchParams(searchParams);
    if (newStep > 1) {
      params.set('step', String(newStep));
    } else {
      params.delete('step');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Initialize item details when entering step 3
  useEffect(() => {
    if (step === 3 && selectedItems.size > 0) {
      setItemDetails(prev => {
        const next = new Map(prev);
        for (const id of selectedItems) {
          if (!next.has(id)) {
            next.set(id, {
              menge: 1,
              ausgabedatum: todayStr(),
              rueckgabedatum: '',
              bemerkungen: '',
            });
          }
        }
        // Remove deselected
        for (const id of next.keys()) {
          if (!selectedItems.has(id)) next.delete(id);
        }
        return next;
      });
    }
  }, [step, selectedItems]);

  const inStockItems = ausruestungskatalog.filter(a => (a.fields.menge ?? 0) > 0);

  const handlePersonSelect = (id: string) => {
    const found = personal.find(p => p.record_id === id) ?? null;
    setSelectedPerson(found);
    // Update URL with personalId
    const params = new URLSearchParams(searchParams);
    if (found) params.set('personalId', id);
    setSearchParams(params, { replace: true });
    handleStepChange(2);
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const updateDetail = (id: string, field: keyof ItemDetail, value: string | number) => {
    setItemDetails(prev => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, [field]: value });
      }
      return next;
    });
  };

  const getItemById = (id: string): Ausruestungskatalog | undefined =>
    ausruestungskatalog.find(a => a.record_id === id);

  const handleAssign = async () => {
    if (!selectedPerson) return;
    setSaving(true);
    setSaveError(null);
    const results: { name: string; menge: number }[] = [];
    try {
      for (const itemId of selectedItems) {
        const detail = itemDetails.get(itemId);
        if (!detail) continue;
        const item = getItemById(itemId);
        const payload: Record<string, unknown> = {
          zugewiesenes_personal: createRecordUrl(APP_IDS.PERSONAL, selectedPerson.record_id),
          zugewiesene_ausruestung: createRecordUrl(APP_IDS.AUSRUESTUNGSKATALOG, itemId),
          ausgabedatum: detail.ausgabedatum,
          status_zuweisung: 'ausgegeben',
          ausgabe_menge: detail.menge,
        };
        if (detail.rueckgabedatum) {
          payload.rueckgabedatum = detail.rueckgabedatum;
        }
        if (detail.bemerkungen) {
          payload.bemerkungen_zuweisung = detail.bemerkungen;
        }
        await LivingAppsService.createAusruestungszuweisungEntry(payload);
        results.push({
          name: item?.fields.artikel_bezeichnung ?? itemId,
          menge: detail.menge,
        });
      }
      setAssignedItems(results);
      await fetchAll();
      handleStepChange(4);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedPerson(null);
    setSelectedItems(new Set());
    setItemDetails(new Map());
    setAssignedItems([]);
    setSaveError(null);
    const params = new URLSearchParams();
    setSearchParams(params, { replace: true });
    setStep(1);
  };

  const personName = selectedPerson
    ? `${selectedPerson.fields.vorname ?? ''} ${selectedPerson.fields.nachname ?? ''}`.trim()
    : '';

  return (
    <IntentWizardShell
      title="Ausrüstung ausgeben"
      subtitle="Weise Personal Ausrüstungsgegenstände zu"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Personal auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Personal auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle die Person aus, der du Ausrüstung zuweisen möchtest.
            </p>
          </div>
          <EntitySelectStep
            items={personal.map(p => ({
              id: p.record_id,
              title: `${p.fields.vorname ?? ''} ${p.fields.nachname ?? ''}`.trim(),
              subtitle: [
                p.fields.dienstgrad?.label,
                p.fields.einheit,
              ].filter(Boolean).join(' · '),
              status: p.fields.standort
                ? { key: 'aktiv', label: p.fields.standort }
                : undefined,
              icon: <IconUser size={20} className="text-primary" />,
            }))}
            onSelect={handlePersonSelect}
            searchPlaceholder="Personal suchen..."
            emptyIcon={<IconUser size={32} />}
            emptyText="Kein Personal gefunden."
            createLabel="Neues Personal anlegen"
            onCreateNew={() => setPersonalDialogOpen(true)}
            createDialog={
              <PersonalDialog
                open={personalDialogOpen}
                onClose={() => setPersonalDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createPersonalEntry(fields);
                  await fetchAll();
                  setPersonalDialogOpen(false);
                }}
              />
            }
          />
        </div>
      )}

      {/* Step 2: Ausrüstung wählen */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Ausrüstung wählen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Wähle die Ausrüstungsgegenstände für{' '}
                <span className="font-medium text-foreground">{personName}</span>.
              </p>
            </div>
            {selectedItems.size > 0 && (
              <Badge className="bg-primary text-primary-foreground shrink-0">
                {selectedItems.size} ausgewählt
              </Badge>
            )}
          </div>

          {/* Multi-select item list */}
          <div className="space-y-2">
            {inStockItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="mb-3 flex justify-center opacity-40">
                  <IconPackage size={32} />
                </div>
                <p className="text-sm">Keine Ausrüstung mit Bestand vorhanden.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAusruestungDialogOpen(true)}
                  className="mt-3 gap-1.5"
                >
                  <IconPlus size={14} />
                  Neue Ausrüstung anlegen
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAusruestungDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <IconPlus size={14} />
                    Neue Ausrüstung anlegen
                  </Button>
                </div>
                {inStockItems.map(item => {
                  const isSelected = selectedItems.has(item.record_id);
                  return (
                    <button
                      key={item.record_id}
                      onClick={() => toggleItemSelection(item.record_id)}
                      className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                        isSelected
                          ? 'bg-primary/5 border-primary ring-1 ring-primary/30'
                          : 'bg-card hover:bg-accent hover:border-primary/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
                      }`}>
                        {isSelected
                          ? <IconCheck size={18} stroke={2.5} />
                          : <IconPackage size={20} className="text-primary" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                            {item.fields.artikel_bezeichnung ?? '—'}
                          </span>
                          {item.fields.zustand && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                              {item.fields.zustand.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[item.fields.hersteller, item.fields.modell, item.fields.kategorie?.label]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Bestand: <span className="font-medium text-foreground">{item.fields.menge ?? 0}</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          <AusruestungskatalogDialog
            open={ausruestungDialogOpen}
            onClose={() => setAusruestungDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createAusruestungskatalogEntry(fields);
              await fetchAll();
              setAusruestungDialogOpen(false);
            }}
          />

          <div className="flex items-center justify-between pt-2 border-t gap-3 flex-wrap">
            <Button variant="outline" onClick={() => handleStepChange(1)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button
              onClick={() => handleStepChange(3)}
              disabled={selectedItems.size === 0}
              className="gap-1.5"
            >
              Weiter
              <IconArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Details & Bestätigung */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Details & Bestätigung</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{selectedItems.size} Artikel</span> für{' '}
              <span className="font-medium text-foreground">{personName}</span> zuweisen.
            </p>
          </div>

          <div className="space-y-4">
            {Array.from(selectedItems).map(itemId => {
              const item = getItemById(itemId);
              const detail = itemDetails.get(itemId);
              if (!detail) return null;
              const maxMenge = item?.fields.menge ?? 99;

              return (
                <div key={itemId} className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 p-4 border-b bg-secondary/30">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconPackage size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item?.fields.artikel_bezeichnung ?? itemId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Verfügbar: {maxMenge}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Menge <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={maxMenge}
                          value={detail.menge}
                          onChange={e => {
                            const val = Math.min(maxMenge, Math.max(1, parseInt(e.target.value) || 1));
                            updateDetail(itemId, 'menge', val);
                          }}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Ausgabedatum <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="date"
                          value={detail.ausgabedatum}
                          onChange={e => updateDetail(itemId, 'ausgabedatum', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Rückgabedatum (optional)
                        </label>
                        <Input
                          type="date"
                          value={detail.rueckgabedatum}
                          onChange={e => updateDetail(itemId, 'rueckgabedatum', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Bemerkungen (optional)
                      </label>
                      <Textarea
                        value={detail.bemerkungen}
                        onChange={e => updateDetail(itemId, 'bemerkungen', e.target.value)}
                        placeholder="Hinweise zur Ausgabe..."
                        rows={2}
                        className="w-full resize-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {saveError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t gap-3 flex-wrap">
            <Button variant="outline" onClick={() => handleStepChange(2)} className="gap-1.5" disabled={saving}>
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button onClick={handleAssign} disabled={saving} className="gap-1.5">
              {saving ? (
                <>
                  <IconLoader2 size={15} className="animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <IconCheck size={15} stroke={2.5} />
                  Zuweisen
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Abschluss */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <IconCircleCheck size={32} className="text-green-600" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Erfolgreich ausgegeben!</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                <span className="font-medium text-foreground">{assignedItems.length} Ausrüstung{assignedItems.length !== 1 ? 'en' : ''}</span>{' '}
                wurde{assignedItems.length !== 1 ? 'n' : ''} erfolgreich an{' '}
                <span className="font-medium text-foreground">{personName}</span> ausgegeben.
              </p>
            </div>
          </div>

          {assignedItems.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-secondary/30">
                <p className="text-sm font-semibold">Zugewiesene Artikel</p>
              </div>
              <div className="divide-y">
                {assignedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <IconCheck size={14} className="text-green-600" stroke={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">
                      × {item.menge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="outline" onClick={handleReset} className="gap-1.5">
              <IconRefresh size={15} />
              Neue Ausgabe starten
            </Button>
            <Button asChild className="gap-1.5">
              <a href="#/">
                Zum Dashboard
              </a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
