import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { IconFileText, IconUpload } from '@tabler/icons-react';
import { lookupKey } from '@/lib/formatters';

const KLAR_BASE = 'http://localhost:8000/claude';

async function submitPublicForm(fields: Record<string, unknown>) {
  const res = await fetch(`${KLAR_BASE}/public/69d62a544c4bf986c6e1373a/69d62a2f27cfcd7bad02c882/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}

async function publicUploadFile(file: File, _filename?: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file, file.name);
  const res = await fetch(`${KLAR_BASE}/public/69d62a544c4bf986c6e1373a/upload`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url;
}

function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormWartungsprotokoll() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields));
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Wartungsprotokoll — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="wartungsart">Art der Wartung</Label>
            <Select
              value={lookupKey(fields.wartungsart) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, wartungsart: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="wartungsart"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="routineinspektion">Routineinspektion</SelectItem>
                <SelectItem value="reparatur">Reparatur</SelectItem>
                <SelectItem value="reinigung">Reinigung</SelectItem>
                <SelectItem value="kalibrierung">Kalibrierung</SelectItem>
                <SelectItem value="austausch_teile">Austausch von Teilen</SelectItem>
                <SelectItem value="hauptinspektion">Hauptinspektion</SelectItem>
                <SelectItem value="sonstige_wartung">Sonstige Wartung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wartungsdatum">Wartungsdatum</Label>
            <Input
              id="wartungsdatum"
              type="date"
              value={fields.wartungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, wartungsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naechste_wartung">Nächste geplante Wartung</Label>
            <Input
              id="naechste_wartung"
              type="date"
              value={fields.naechste_wartung ?? ''}
              onChange={e => setFields(f => ({ ...f, naechste_wartung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="techniker_vorname">Vorname des Technikers</Label>
            <Input
              id="techniker_vorname"
              value={fields.techniker_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, techniker_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="techniker_nachname">Nachname des Technikers</Label>
            <Input
              id="techniker_nachname"
              value={fields.techniker_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, techniker_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ergebnis">Ergebnis der Wartung</Label>
            <Select
              value={lookupKey(fields.ergebnis) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, ergebnis: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="ergebnis"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="bestanden">Bestanden</SelectItem>
                <SelectItem value="nicht_bestanden">Nicht bestanden</SelectItem>
                <SelectItem value="teilweise_bestanden">Teilweise bestanden</SelectItem>
                <SelectItem value="ausser_betrieb_gesetzt">Außer Betrieb gesetzt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kosten_wartung">Wartungskosten (EUR)</Label>
            <Input
              id="kosten_wartung"
              type="number"
              value={fields.kosten_wartung ?? ''}
              onChange={e => setFields(f => ({ ...f, kosten_wartung: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wartungsbericht">Wartungsbericht (Dokument)</Label>
            {fields.wartungsbericht ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.wartungsbericht}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.wartungsbericht.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await publicUploadFile(file, file.name);
                            setFields(f => ({ ...f, wartungsbericht: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, wartungsbericht: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await publicUploadFile(file, file.name);
                      setFields(f => ({ ...f, wartungsbericht: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkungen_wartung">Bemerkungen</Label>
            <Textarea
              id="bemerkungen_wartung"
              value={fields.bemerkungen_wartung ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkungen_wartung: e.target.value }))}
              rows={3}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting || fileUploading}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
