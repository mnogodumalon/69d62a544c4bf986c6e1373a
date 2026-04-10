import type { Ausruestungszuweisung, Personal, Ausruestungskatalog } from '@/types/app';
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

interface AusruestungszuweisungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Ausruestungszuweisung | null;
  onEdit: (record: Ausruestungszuweisung) => void;
  personalList: Personal[];
  ausruestungskatalogList: Ausruestungskatalog[];
}

export function AusruestungszuweisungViewDialog({ open, onClose, record, onEdit, personalList, ausruestungskatalogList }: AusruestungszuweisungViewDialogProps) {
  function getPersonalDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return personalList.find(r => r.record_id === id)?.fields.personalnummer ?? '—';
  }

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
          <DialogTitle>Ausrüstungszuweisung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Soldat / Mitarbeiter</Label>
            <p className="text-sm">{getPersonalDisplayName(record.fields.zugewiesenes_personal)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausrüstungsgegenstand</Label>
            <p className="text-sm">{getAusruestungskatalogDisplayName(record.fields.zugewiesene_ausruestung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.ausgabedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplantes Rückgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.rueckgabedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status der Zuweisung</Label>
            <Badge variant="secondary">{record.fields.status_zuweisung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausgegebene Menge</Label>
            <p className="text-sm">{record.fields.ausgabe_menge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unterschrift / Empfangsbestätigung</Label>
            {record.fields.unterschrift_empfaenger ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.unterschrift_empfaenger} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen_zuweisung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}