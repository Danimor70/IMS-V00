export type RouteId =
  | 'login'
  | 'dashboard'
  | 'cartable'
  | 'documents-list'
  | 'documents-create'
  | 'documents-revision'
  | 'documents-approval-workflow'
  | 'documents-distribution'
  | 'documents-archive'
  | 'processes-profile'
  | 'processes-map'
  | 'processes-interactions'
  | 'risks-identify'
  | 'risks-assess'
  | 'risks-controls'
  | 'risks-opportunities'
  | 'audits-program'
  | 'audits-internal'
  | 'audits-external'
  | 'audits-checklists'
  | 'audits-findings'
  | 'capa-nc'
  | 'capa-rca'
  | 'capa-corrective'
  | 'capa-effectiveness'
  | 'kpi-objectives'
  | 'kpi-indicators'
  | 'kpi-monitoring'
  | 'moc'
  | 'hse-incidents'
  | 'hse-inspections'
  | 'hse-actions'
  | 'training'
  | 'legal'
  | 'management-review'
  | 'reports'
  | 'settings';

export type DocStatus = 'مصوب' | 'در جریان بررسی' | 'نیازمند بازنگری' | 'منسوخ' | 'پیش‌نویس';

export interface DocSignoffStep {
  role: string;
  actor: string;
  date: string;
  status: 'approved' | 'pending' | 'returned';
  comment?: string;
}

export interface ImsDocument {
  id: string;
  code: string;
  docType: string; // روش اجرایی (SOP), خط‌مشی (POL), نظامنامه (MN), دستورالعمل (WI), فرآیند (PR), فرم (FRM)
  docTypeCode: string; // SOP, POL, MN, WI, PR, FRM
  title: string;
  englishTitle?: string;
  version: string;
  status: DocStatus;
  management: string;
  unit: string;
  registeredAt: string;
  reviewAt: string;
  expiresAt: string;
  confidentiality: 'عمومی (C1)' | 'داخلی (C2)' | 'محرمانه فنی (C3)' | 'فوق‌محرمانه (C4)';
  isoStandards: string[];
  owner: string;
  needsMySignature?: boolean;
  expiringSoon?: boolean;
  signoffChain: DocSignoffStep[];
  summary?: string;
}

export interface RevisionItem {
  id: string;
  code: string;
  suggestedCode: string;
  title: string;
  subtitle: string;
  currentRev: string;
  targetRev: string;
  triggerLabel: string;
  triggerRef: string;
  triggerCategory: 'overdue' | 'moc' | 'capa' | 'iso';
  dept: string;
  owner: string;
  ownerRole: string;
  progress: number;
  workflowState: string;
  overdueDays?: number;
  diffSection: string;
  oldRevDate: string;
  oldText: string;
  oldHighlight: string;
  newTextPrefix: string;
  newHighlight: string;
  newTextSuffix: string;
  newNote: string;
}

export interface WorkflowHistoryEntry {
  actor: string;
  role: string;
  date: string;
  note: string;
  type: 'approved' | 'submitted' | 'returned' | 'comment';
}

export interface WorkflowChecklistItem {
  label: string;
  status: 'passed' | 'warning';
  statusText: string;
}

export interface WorkflowDoc {
  id: string;
  code: string;
  title: string;
  version: string;
  standards: string[];
  priority: 'فوری' | 'بحرانی' | 'عادی';
  currentStage: 1 | 2 | 3 | 4;
  stageLabel: string;
  currentActor: string;
  slaDaysUsed: number;
  slaDaysTotal: number;
  slaRemainingText: string;
  processCode: string;
  processOwner: string;
  confidentiality: string;
  nextReviewDate: string;
  pdfName: string;
  pdfSize: string;
  pdfPages: number;
  pdfStandard: string;
  excerptSection: string;
  excerptIsoTag: string;
  excerptText: string;
  validatorNote: string;
  readinessScore: number;
  checklist: WorkflowChecklistItem[];
  history: WorkflowHistoryEntry[];
  tabGroup: 'my-inbox' | 'referred' | 'approved';
}

export type PermissionFlags = {
  R: boolean;
  P: boolean;
  W: boolean;
  A: boolean;
};

export interface DistributionMatrixRow {
  id: string;
  badgeCode: string;
  badgeColor: 'secondary' | 'critical' | 'primary' | 'tertiary';
  code: string;
  version: string;
  title: string;
  subtitle: string;
  confidentiality: 'C1 - عمومی' | 'C2 - سازمانی' | 'C3 - محرمانه فنی' | 'C4 - فوق‌محرمانه';
  confidentialityTone: 'tertiary' | 'secondary' | 'warning' | 'critical';
  docGroup: 'SOP' | 'HSE' | 'P&ID' | 'IMS';
  unitPermissions: {
    ops: PermissionFlags;
    hse: PermissionFlags;
    inspection: PermissionFlags;
    qc: PermissionFlags;
  };
  userPermissions: {
    kazemi: PermissionFlags;
    nikpey: PermissionFlags;
    hedari: PermissionFlags;
    parsa: PermissionFlags;
  };
}

export interface AuditTrailEntry {
  id: string;
  type: 'print' | 'recall' | 'block' | 'ack';
  title: string;
  badge: string;
  docRef: string;
  detail: string;
  timestamp: string;
  tag: string;
}

export interface ObsoleteDocRecord {
  id: string;
  code: string;
  title: string;
  unit: string;
  rev: string;
  retentionMonths: number;
  obsoleteDate: string;
  supersededBy: string;
  reason: string;
  yearGroup: '1403' | '1402' | '1401' | '1400';
  tags: string[];
  sha256: string;
  vaultZone: string;
  fileSize: string;
  archiver: string;
}

export interface CapaItem {
  id: string;
  standard: 'ISO 45001' | 'ISO 14001' | 'ISO 9001' | 'ISO 50001';
  description: string;
  unit: string;
  priority: 'فوری' | 'متوسط' | 'عادی';
  status: 'در حال اقدام' | 'تایید شده' | 'اقدام نهایی' | 'در حال بررسی';
  owner: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  category: 'approval' | 'capa' | 'system';
  unread: boolean;
  targetRoute: RouteId;
}

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface OperationalRow {
  id: string;
  code: string;
  title: string;
  category: string;
  owner: string;
  dueDate: string;
  priority: 'فوری' | 'بالا' | 'متوسط' | 'عادی';
  status: 'تایید شده' | 'در حال بررسی' | 'نیازمند اقدام' | 'تکمیل شده';
  metric: string;
}

export interface OperationalModuleConfig {
  id: RouteId;
  breadcrumbParent: string;
  title: string;
  subtitle: string;
  standardCode: string;
  icon: string;
  ctaLabel: string;
  kpis: { label: string; value: string; note: string; tone: 'primary' | 'tertiary' | 'warning' | 'critical' }[];
  rows: OperationalRow[];
}
