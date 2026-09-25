// Real backend response types live in ./api.ts. This file holds only the UI's own navigation type.

export type ViewMode =
  | 'overview'
  | 'disruptions'
  | 'simulator'
  | 'orchestration'
  | 'decisions'
  | 'inventory'
  | 'logistics'
  | 'sourcing'
  | 'compliance'
  | 'scenarios'
  | 'monitor';
