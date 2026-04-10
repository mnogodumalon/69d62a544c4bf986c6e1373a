import type { Wartungsprotokoll, Ausruestungskatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface WartungsprotokollViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Wartungsprotokoll | null;
  onEdit: (record: Wartungsprotokoll) => void;
  ausruestungskatalogList: Ausruestungskatalog[];
}

export function WartungsprotokollViewDialog({ open, onClose, record, onEdit, ausruestungskatalogList }: WartungsprotokollViewDialogProps) {
  function getAusruestungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return ausruestungskatalogList.find(r => r.record_id === id)?.fields.artikel_bezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wartungsprotokoll anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausrüstungsgegenstand</Label>
            <p className="text-sm">{getAusruestungskatalogDisplayName(record.fields.gewartete_ausruestung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Art der Wartung</Label>
            <Badge variant="secondary">{record.fields.wartungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wartungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.wartungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste geplante Wartung</Label>
            <p className="text-sm">{formatDate(record.fields.naechste_wartung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Technikers</Label>
            <p className="text-sm">{record.fields.techniker_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Technikers</Label>
            <p className="text-sm">{record.fields.techniker_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ergebnis der Wartung</Label>
            <Badge variant="secondary">{record.fields.ergebnis?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wartungskosten (EUR)</Label>
            <p className="text-sm">{record.fields.kosten_wartung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wartungsbericht (Dokument)</Label>
            {record.fields.wartungsbericht ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.wartungsbericht} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen_wartung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}