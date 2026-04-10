// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Ausruestungszuweisung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    zugewiesenes_personal?: string; // applookup -> URL zu 'Personal' Record
    zugewiesene_ausruestung?: string; // applookup -> URL zu 'Ausruestungskatalog' Record
    ausgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status_zuweisung?: LookupValue;
    ausgabe_menge?: number;
    unterschrift_empfaenger?: string;
    bemerkungen_zuweisung?: string;
  };
}

export interface Personal {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    personalnummer?: string;
    vorname?: string;
    nachname?: string;
    dienstgrad?: LookupValue;
    einheit?: string;
    standort?: string;
    telefon?: string;
    email?: string;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    bemerkungen_personal?: string;
  };
}

export interface Wartungsprotokoll {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gewartete_ausruestung?: string; // applookup -> URL zu 'Ausruestungskatalog' Record
    wartungsart?: LookupValue;
    wartungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    naechste_wartung?: string; // Format: YYYY-MM-DD oder ISO String
    techniker_vorname?: string;
    techniker_nachname?: string;
    ergebnis?: LookupValue;
    kosten_wartung?: number;
    wartungsbericht?: string;
    bemerkungen_wartung?: string;
  };
}

export interface Ausruestungskatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    artikel_bezeichnung?: string;
    seriennummer?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    modell?: string;
    zustand?: LookupValue;
    beschaffungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    beschaffungskosten?: number;
    lagerort?: string;
    menge?: number;
    foto_ausruestung?: string;
    bemerkungen_ausruestung?: string;
  };
}

export const APP_IDS = {
  AUSRUESTUNGSZUWEISUNG: '69d62a2f6a108637ddd7d432',
  PERSONAL: '69d62a28bb93020197f8c86d',
  WARTUNGSPROTOKOLL: '69d62a2f27cfcd7bad02c882',
  AUSRUESTUNGSKATALOG: '69d62a2e5ffe309d11c11a2d',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'ausruestungszuweisung': {
    status_zuweisung: [{ key: "ausgegeben", label: "Ausgegeben" }, { key: "zurueckgegeben", label: "Zurückgegeben" }, { key: "verloren", label: "Verloren" }, { key: "beschaedigt_zurueckgegeben", label: "Beschädigt zurückgegeben" }],
  },
  'personal': {
    dienstgrad: [{ key: "gefreiter", label: "Gefreiter" }, { key: "obergefreiter", label: "Obergefreiter" }, { key: "hauptgefreiter", label: "Hauptgefreiter" }, { key: "stabsgefreiter", label: "Stabsgefreiter" }, { key: "unteroffizier", label: "Unteroffizier" }, { key: "stabsunteroffizier", label: "Stabsunteroffizier" }, { key: "feldwebel", label: "Feldwebel" }, { key: "oberfeldwebel", label: "Oberfeldwebel" }, { key: "hauptfeldwebel", label: "Hauptfeldwebel" }, { key: "stabsfeldwebel", label: "Stabsfeldwebel" }, { key: "oberstabsfeldwebel", label: "Oberstabsfeldwebel" }, { key: "leutnant", label: "Leutnant" }, { key: "oberleutnant", label: "Oberleutnant" }, { key: "hauptmann", label: "Hauptmann" }, { key: "major", label: "Major" }, { key: "oberstleutnant", label: "Oberstleutnant" }, { key: "oberst", label: "Oberst" }, { key: "brigadegeneral", label: "Brigadegeneral" }, { key: "generalmajor", label: "Generalmajor" }, { key: "generalleutnant", label: "Generalleutnant" }, { key: "general", label: "General" }],
  },
  'wartungsprotokoll': {
    wartungsart: [{ key: "routineinspektion", label: "Routineinspektion" }, { key: "reparatur", label: "Reparatur" }, { key: "reinigung", label: "Reinigung" }, { key: "kalibrierung", label: "Kalibrierung" }, { key: "austausch_teile", label: "Austausch von Teilen" }, { key: "hauptinspektion", label: "Hauptinspektion" }, { key: "sonstige_wartung", label: "Sonstige Wartung" }],
    ergebnis: [{ key: "bestanden", label: "Bestanden" }, { key: "nicht_bestanden", label: "Nicht bestanden" }, { key: "teilweise_bestanden", label: "Teilweise bestanden" }, { key: "ausser_betrieb_gesetzt", label: "Außer Betrieb gesetzt" }],
  },
  'ausruestungskatalog': {
    kategorie: [{ key: "werkzeug_technik", label: "Werkzeug & Technik" }, { key: "sonstiges", label: "Sonstiges" }, { key: "schutzausruestung", label: "Schutzausrüstung" }, { key: "handwaffen", label: "Handwaffen" }, { key: "schwere_waffen", label: "Schwere Waffen" }, { key: "munition", label: "Munition" }, { key: "kommunikation", label: "Kommunikation" }, { key: "fahrzeuge", label: "Fahrzeuge" }, { key: "optik_navigation", label: "Optik & Navigation" }, { key: "sanitaetsmaterial", label: "Sanitätsmaterial" }, { key: "bekleidung", label: "Bekleidung" }],
    zustand: [{ key: "neu", label: "Neu" }, { key: "gut", label: "Gut" }, { key: "gebraucht", label: "Gebraucht" }, { key: "reparaturbeduertig", label: "Reparaturbedürftig" }, { key: "ausser_betrieb", label: "Außer Betrieb" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'ausruestungszuweisung': {
    'zugewiesenes_personal': 'applookup/select',
    'zugewiesene_ausruestung': 'applookup/select',
    'ausgabedatum': 'date/date',
    'rueckgabedatum': 'date/date',
    'status_zuweisung': 'lookup/radio',
    'ausgabe_menge': 'number',
    'unterschrift_empfaenger': 'file',
    'bemerkungen_zuweisung': 'string/textarea',
  },
  'personal': {
    'personalnummer': 'string/text',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'dienstgrad': 'lookup/select',
    'einheit': 'string/text',
    'standort': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'eintrittsdatum': 'date/date',
    'bemerkungen_personal': 'string/textarea',
  },
  'wartungsprotokoll': {
    'gewartete_ausruestung': 'applookup/select',
    'wartungsart': 'lookup/select',
    'wartungsdatum': 'date/date',
    'naechste_wartung': 'date/date',
    'techniker_vorname': 'string/text',
    'techniker_nachname': 'string/text',
    'ergebnis': 'lookup/radio',
    'kosten_wartung': 'number',
    'wartungsbericht': 'file',
    'bemerkungen_wartung': 'string/textarea',
  },
  'ausruestungskatalog': {
    'artikel_bezeichnung': 'string/text',
    'seriennummer': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'modell': 'string/text',
    'zustand': 'lookup/radio',
    'beschaffungsdatum': 'date/date',
    'beschaffungskosten': 'number',
    'lagerort': 'string/text',
    'menge': 'number',
    'foto_ausruestung': 'file',
    'bemerkungen_ausruestung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateAusruestungszuweisung = StripLookup<Ausruestungszuweisung['fields']>;
export type CreatePersonal = StripLookup<Personal['fields']>;
export type CreateWartungsprotokoll = StripLookup<Wartungsprotokoll['fields']>;
export type CreateAusruestungskatalog = StripLookup<Ausruestungskatalog['fields']>;