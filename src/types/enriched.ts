import type { Ausruestungszuweisung, Wartungsprotokoll } from './app';

export type EnrichedAusruestungszuweisung = Ausruestungszuweisung & {
  zugewiesenes_personalName: string;
  zugewiesene_ausruestungName: string;
};

export type EnrichedWartungsprotokoll = Wartungsprotokoll & {
  gewartete_ausruestungName: string;
};
