import React, { useEffect, useMemo, useState } from 'react';
import { exportToCsv } from '../data/imsData';
import {
  AuditTrailEntry,
  DistributionMatrixRow,
  ImsDocument,
  PendingDistributionDoc,
  PermissionFlags,
  RevisionItem,
  RouteId,
  UserAccount,
  WorkflowDoc,
} from '../types/ims';

interface DocumentDistributionPageProps {
  documents: ImsDocument[];
  workflowDocs: WorkflowDoc[];
  revisions: RevisionItem[];
  matrixRows: DistributionMatrixRow[];
  auditTrail: AuditTrailEntry[];
  pendingDistributions: PendingDistributionDoc[];
  users: UserAccount[];
  onTogglePermission: (
    rowId: string,
    mode: 'unit' | 'user',
    targetKey: string,
    flag: keyof PermissionFlags
  ) => void;
  onEnsureMatrixRow: (row: DistributionMatrixRow) => void;
  onIssueControlledCopy: (entry: AuditTrailEntry) => void;
  onPublishDistribution: (
    pendingId: string,
    matrixRow: DistributionMatrixRow,
    logEntry: AuditTrailEntry,
    designatedReviser: string,
    publishedSummary: string
  ) => void;
  onRecallObsolete: (
    docCode: string,
    title: string,
    unit: string,
    version: string,
    reason: string
  ) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type ConfChoice = 'C1 - عمومی' | 'C2 - سازمانی' | 'C3 - محرمانه فنی' | 'C4 - فوق‌محرمانه';
type DocFilterTab =
  | 'all'
  | 'ceo-pending'
  | 'new'
  | 'revision-workflow'
  | 'expired'
  | 'published'
  | 'obsolete';
type ConsoleSubTab = 'access' | 'distribute' | 'audit';
type BottomTab = 'matrix' | 'audit';

interface UnifiedDocRecord {
  code: string;
  title: string;
  version: string;
  docGroup: 'SOP' | 'HSE' | 'P&ID' | 'IMS';
  unit: string;
  owner: string;
  registeredAt: string;
  reviewAt: string;
  expiresAt: string;
  isoStandards: string[];
  confidentiality: ConfChoice;
  originType: 'new' | 'revision' | 'active';
  lifecycleCategory: Exclude<DocFilterTab, 'all'>;
  statusLabel: string;
  statusTone: 'tertiary' | 'secondary' | 'warning' | 'critical' | 'neutral';
  isExpiredOrOverdue: boolean;
  isCeoPending: boolean;
  isObsolete: boolean;
  isPublished: boolean;
  workflowStageLabel?: string;
  workflowStageNum?: number;
  workflowActor?: string;
  summary?: string;
  pendingItem?: PendingDistributionDoc;
  docItem?: ImsDocument;
  workflowItem?: WorkflowDoc;
  matrixRow?: DistributionMatrixRow;
}

const CURRENT_PERSIAN_DATE_NUM = 14030824;

const toAsciiDigits = (input: string): string =>
  input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const parsePersianDateNumber = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const ascii = toAsciiDigits(dateStr);
  const match = ascii.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  return y * 10000 + m * 100 + d;
};

const inferGroup = (code: string, docTypeCode?: string): 'SOP' | 'HSE' | 'P&ID' | 'IMS' => {
  const upper = `${code} ${docTypeCode || ''}`.toUpperCase();
  if (upper.includes('HSE') || upper.includes('SAF') || upper.includes('ENV')) return 'HSE';
  if (upper.includes('PID') || upper.includes('DWG')) return 'P&ID';
  if (upper.includes('SOP') || upper.includes('WI') || upper.includes('PR-')) return 'SOP';
  return 'IMS';
};

const normalizeConfidentiality = (raw?: string): ConfChoice => {
  if (!raw) return 'C2 - سازمانی';
  if (raw.includes('C1') || raw.includes('عمومی')) return 'C1 - عمومی';
  if (raw.includes('C3') || raw.includes('محرمانه فنی')) return 'C3 - محرمانه فنی';
  if (raw.includes('C4') || raw.includes('فوق')) return 'C4 - فوق‌محرمانه';
  return 'C2 - سازمانی';
};

const buildDefaultUnitPerms = (conf: ConfChoice): DistributionMatrixRow['unitPermissions'] => {
  if (conf === 'C1 - عمومی') {
    return {
      ops: { R: true, P: true, W: false, A: false },
      hse: { R: true, P: true, W: false, A: false },
      inspection: { R: true, P: true, W: false, A: false },
      qc: { R: true, P: true, W: false, A: false },
    };
  }
  if (conf === 'C2 - سازمانی') {
    return {
      ops: { R: true, P: true, W: false, A: false },
      hse: { R: true, P: false, W: false, A: false },
      inspection: { R: true, P: false, W: false, A: false },
      qc: { R: true, P: true, W: false, A: false },
    };
  }
  if (conf === 'C3 - محرمانه فنی') {
    return {
      ops: { R: true, P: false, W: false, A: false },
      hse: { R: true, P: false, W: false, A: false },
      inspection: { R: true, P: true, W: false, A: false },
      qc: { R: false, P: false, W: false, A: false },
    };
  }
  return {
    ops: { R: false, P: false, W: false, A: false },
    hse: { R: false, P: false, W: false, A: false },
    inspection: { R: true, P: false, W: false, A: false },
    qc: { R: false, P: false, W: false, A: false },
  };
};

const buildDefaultUserPerms = (conf: ConfChoice): DistributionMatrixRow['userPermissions'] => {
  if (conf === 'C1 - عمومی') {
    return {
      kazemi: { R: true, P: true, W: true, A: true },
      nikpey: { R: true, P: true, W: false, A: false },
      hedari: { R: true, P: true, W: false, A: false },
      parsa: { R: true, P: true, W: false, A: false },
    };
  }
  if (conf === 'C2 - سازمانی') {
    return {
      kazemi: { R: true, P: true, W: true, A: true },
      nikpey: { R: true, P: true, W: false, A: false },
      hedari: { R: true, P: false, W: false, A: false },
      parsa: { R: true, P: true, W: false, A: false },
    };
  }
  return {
    kazemi: { R: true, P: true, W: true, A: true },
    nikpey: { R: true, P: false, W: false, A: false },
    hedari: { R: false, P: false, W: false, A: false },
    parsa: { R: false, P: false, W: false, A: false },
  };
};

const UNIT_COLUMNS = [
  { key: 'ops', title: 'مدیریت بهره‌برداری', sub: 'متانول، الفین و یوتیلیتی' },
  { key: 'hse', title: 'مدیریت HSE و آتش‌نشانی', sub: 'ایمنی فرآیند و محیط زیست' },
  { key: 'inspection', title: 'مدیریت فنی و بازرسی', sub: 'بازرسی فنی و نگهداری' },
  { key: 'qc', title: 'آزمایشگاه و کنترل کیفیت', sub: 'آنالیز محصول و کالیبراسیون' },
] as const;

const USER_COLUMNS = [
  { key: 'kazemi', title: 'مهندس مهران کاظمی', sub: 'مدیر تضمین کیفیت (IMS)' },
  { key: 'nikpey', title: 'مهندس سارا نیک‌پی', sub: 'کارشناس ارشد بهره‌برداری' },
  { key: 'hedari', title: 'مهندس حمید دهداری', sub: 'سرپرست HSE و آتش‌نشانی' },
  { key: 'parsa', title: 'دکتر آرش پارسا', sub: 'مسئول آزمایشگاه مرکزی' },
] as const;

const PERM_FLAGS: { k: keyof PermissionFlags; activeCls: string; label: string }[] = [
  { k: 'R', activeCls: 'bg-[#16846B] text-white border-[#16846B]', label: 'مشاهده' },
  { k: 'P', activeCls: 'bg-[#1E5A85] text-white border-[#1E5A85]', label: 'چاپ با واترمارک' },
  { k: 'W', activeCls: 'bg-[#D97706] text-white border-[#D97706]', label: 'ویرایش / بازنگری' },
  { k: 'A', activeCls: 'bg-[#142C43] text-white border-[#142C43]', label: 'تصویب' },
];

export const DocumentDistributionPage: React.FC<DocumentDistributionPageProps> = ({
  documents,
  workflowDocs,
  revisions,
  matrixRows,
  auditTrail,
  pendingDistributions,
  users,
  onTogglePermission,
  onEnsureMatrixRow,
  onIssueControlledCopy,
  onPublishDistribution,
  onRecallObsolete,
  onNavigate,
  onNotify,
}) => {
  const [filterTab, setFilterTab] = useState<DocFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [docGroupFilter, setDocGroupFilter] = useState('');
  const [confFilter, setConfFilter] = useState('');
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [consoleSubTab, setConsoleSubTab] = useState<ConsoleSubTab>('access');
  const [accessViewMode, setAccessViewMode] = useState<'unit' | 'user'>('unit');
  const [bottomTab, setBottomTab] = useState<BottomTab>('matrix');
  const [matrixMode, setMatrixMode] = useState<'unit' | 'user'>('unit');

  const [copyForm, setCopyForm] = useState({
    distType: 'نسخه دیجیتال کنترل‌شده (کارتابل امن)',
    copyNum: 'Copy #05',
    receiver: 'اتاق کنترل واحد متانول (سرپرست شیفت)',
    date: '۱۴۰۳/۰۸/۲۴',
    ackRequired: true,
    note: '',
  });

  const [recallModal, setRecallModal] = useState<{ open: boolean; reason: string }>({
    open: false,
    reason: '',
  });

  const userDirectory = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        label: `${u.honorific ? u.honorific + ' ' : ''}${u.firstName} ${u.lastName} (${u.roleTitle})`,
      })),
    [users]
  );

  const [publishModal, setPublishModal] = useState<{
    open: boolean;
    record: UnifiedDocRecord | null;
    confidentiality: ConfChoice;
    isPublicBroadcast: boolean;
    unitPerms: DistributionMatrixRow['unitPermissions'];
    userPerms: DistributionMatrixRow['userPermissions'];
    extraAuthorizedUsers: string[];
    primaryReviser: string;
    extraRevisers: string[];
    customReviserInput: string;
  }>({
    open: false,
    record: null,
    confidentiality: 'C2 - سازمانی',
    isPublicBroadcast: false,
    unitPerms: buildDefaultUnitPerms('C2 - سازمانی'),
    userPerms: buildDefaultUserPerms('C2 - سازمانی'),
    extraAuthorizedUsers: [],
    primaryReviser: '',
    extraRevisers: [],
    customReviserInput: '',
  });

  // Synthesize the unified master list of ALL documents across documents, workflowDocs, pendingDistributions, and matrixRows
  const unifiedCatalog = useMemo<UnifiedDocRecord[]>(() => {
    const codeOrder: string[] = [];
    const map = new Map<
      string,
      {
        doc?: ImsDocument;
        wf?: WorkflowDoc;
        pending?: PendingDistributionDoc;
        matrix?: DistributionMatrixRow;
        rev?: RevisionItem;
      }
    >();

    const registerCode = (code: string) => {
      if (!map.has(code)) {
        map.set(code, {});
        codeOrder.push(code);
      }
      return map.get(code)!;
    };

    // Priority order: CEO-pending first, then documents, then workflowDocs, then matrixRows
    pendingDistributions.forEach((p) => {
      const slot = registerCode(p.code);
      slot.pending = p;
    });
    documents.forEach((d) => {
      const slot = registerCode(d.code);
      slot.doc = d;
    });
    workflowDocs.forEach((w) => {
      const normalizedCode = w.suggestedCode || w.code;
      const slot = registerCode(normalizedCode);
      slot.wf = w;
    });
    matrixRows.forEach((m) => {
      const slot = registerCode(m.code);
      slot.matrix = m;
    });
    revisions.forEach((r) => {
      const slot = map.get(r.code) || map.get(r.suggestedCode);
      if (slot) slot.rev = r;
    });

    return codeOrder.map((code) => {
      const { doc, wf, pending, matrix, rev } = map.get(code)!;

      const title = pending?.title || doc?.title || wf?.title || matrix?.title || code;
      const version =
        pending?.version ||
        matrix?.version ||
        wf?.targetRev ||
        wf?.version ||
        doc?.version ||
        'Rev 00';
      const docGroup = pending?.docGroup || matrix?.docGroup || inferGroup(code, doc?.docTypeCode);
      const unit =
        pending?.processOwner ||
        doc?.unit ||
        wf?.processOwner ||
        matrix?.subtitle.split('•')[0]?.trim() ||
        'واحد تضمین کیفیت و IMS';
      const owner =
        matrix?.revisionOwners?.[0] ||
        pending?.suggestedReviser ||
        doc?.owner ||
        wf?.currentActor ||
        'مهندس مهران کاظمی';
      const registeredAt = doc?.registeredAt || '۱۴۰۳/۰۸/۲۴';
      const reviewAt = doc?.reviewAt || wf?.nextReviewDate || '۱۴۰۴/۰۸/۲۴';
      const expiresAt = doc?.expiresAt || '۱۴۰۵/۰۸/۲۴';
      const isoStandards = doc?.isoStandards || wf?.standards || ['ISO 9001:2015', 'ISO/IEC 27001:2022'];
      const confidentiality = normalizeConfidentiality(
        matrix?.confidentiality || pending?.defaultConfidentiality || doc?.confidentiality || wf?.confidentiality
      );

      const expNum = parsePersianDateNumber(expiresAt);
      const revNum = parsePersianDateNumber(reviewAt);
      const isDatePast =
        (expNum !== null && expNum <= CURRENT_PERSIAN_DATE_NUM) ||
        (revNum !== null && revNum <= CURRENT_PERSIAN_DATE_NUM);
      const isObsolete = doc?.status === 'منسوخ';
      const isCeoPending = pending?.status === 'pending';
      const isPublished = pending?.status === 'published' || Boolean(matrix);
      const isExpiredOrOverdue =
        !isObsolete &&
        (Boolean(doc?.expiringSoon) ||
          doc?.status === 'نیازمند بازنگری' ||
          Boolean(rev?.overdueDays) ||
          isDatePast);

      const isNewDoc =
        wf?.requestType === 'new' ||
        pending?.requestType === 'new' ||
        (/Rev\s*00\b/i.test(version) && !isPublished && !isObsolete);

      const originType: UnifiedDocRecord['originType'] = isNewDoc
        ? 'new'
        : wf?.requestType === 'revision' || pending?.requestType === 'revision' || Boolean(rev)
        ? 'revision'
        : 'active';

      let lifecycleCategory: UnifiedDocRecord['lifecycleCategory'] = 'published';
      let statusLabel = 'منتشرشده و دارای مجوز دسترسی';
      let statusTone: UnifiedDocRecord['statusTone'] = 'tertiary';

      if (isObsolete) {
        lifecycleCategory = 'obsolete';
        statusLabel = 'منسوخ / نیازمند جمع‌آوری نسخ';
        statusTone = 'critical';
      } else if (isCeoPending) {
        lifecycleCategory = 'ceo-pending';
        statusLabel = 'تایید مدیرعامل — آماده مجوز انتشار';
        statusTone = 'warning';
      } else if (isExpiredOrOverdue) {
        lifecycleCategory = 'expired';
        statusLabel = 'منقضی / سررسید بازنگری گذشته';
        statusTone = 'critical';
      } else if (wf && wf.tabGroup !== 'approved') {
        lifecycleCategory = 'revision-workflow';
        statusLabel = wf.stageLabel || `در گردش تایید (مرحله ${wf.currentStage})`;
        statusTone = 'secondary';
      } else if (doc?.status === 'پیش‌نویس') {
        lifecycleCategory = 'new';
        statusLabel = 'پیش‌نویس / ثبت اولیه';
        statusTone = 'neutral';
      } else if (isNewDoc && !isPublished) {
        lifecycleCategory = 'new';
        statusLabel = 'ثبت جدید (در جریان آماده‌سازی)';
        statusTone = 'secondary';
      } else if (isPublished || doc?.status === 'مصوب') {
        lifecycleCategory = 'published';
        statusLabel = matrix ? 'منتشرشده و فعال در ماتریس' : 'مصوب — آماده ثبت در ماتریس';
        statusTone = 'tertiary';
      } else {
        lifecycleCategory = 'revision-workflow';
        statusLabel = doc?.status || 'در جریان بررسی';
        statusTone = 'secondary';
      }

      return {
        code,
        title,
        version: version.split('(')[0].trim() || version,
        docGroup,
        unit,
        owner,
        registeredAt,
        reviewAt,
        expiresAt,
        isoStandards,
        confidentiality,
        originType,
        lifecycleCategory,
        statusLabel,
        statusTone,
        isExpiredOrOverdue,
        isCeoPending,
        isObsolete,
        isPublished,
        workflowStageLabel: wf?.stageLabel,
        workflowStageNum: wf?.currentStage,
        workflowActor: wf?.currentActor,
        summary: pending?.summary || doc?.summary || wf?.excerptText,
        pendingItem: pending,
        docItem: doc,
        workflowItem: wf,
        matrixRow: matrix,
      };
    });
  }, [pendingDistributions, documents, workflowDocs, matrixRows, revisions]);

  const counts = useMemo(
    () => ({
      all: unifiedCatalog.length,
      ceoPending: unifiedCatalog.filter((d) => d.isCeoPending).length,
      newDocs: unifiedCatalog.filter((d) => d.originType === 'new' || d.lifecycleCategory === 'new').length,
      inWorkflow: unifiedCatalog.filter(
        (d) => d.lifecycleCategory === 'revision-workflow' || d.originType === 'revision'
      ).length,
      expired: unifiedCatalog.filter((d) => d.isExpiredOrOverdue).length,
      published: unifiedCatalog.filter((d) => d.isPublished && !d.isObsolete).length,
      obsolete: unifiedCatalog.filter((d) => d.isObsolete).length,
    }),
    [unifiedCatalog]
  );

  const filteredCatalog = useMemo(() => {
    return unifiedCatalog.filter((item) => {
      if (filterTab === 'ceo-pending' && !item.isCeoPending) return false;
      if (filterTab === 'new' && item.originType !== 'new' && item.lifecycleCategory !== 'new') return false;
      if (
        filterTab === 'revision-workflow' &&
        item.lifecycleCategory !== 'revision-workflow' &&
        item.originType !== 'revision'
      ) {
        return false;
      }
      if (filterTab === 'expired' && !item.isExpiredOrOverdue) return false;
      if (filterTab === 'published' && (!item.isPublished || item.isObsolete)) return false;
      if (filterTab === 'obsolete' && !item.isObsolete) return false;

      if (docGroupFilter && item.docGroup !== docGroupFilter) return false;
      if (confFilter && !item.confidentiality.startsWith(confFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q) ||
          item.owner.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [unifiedCatalog, filterTab, docGroupFilter, confFilter, searchQuery]);

  // Keep selectedCode synced cleanly
  useEffect(() => {
    if (filteredCatalog.length === 0) return;
    const stillVisible = filteredCatalog.some((d) => d.code === selectedCode);
    if (!stillVisible) {
      setSelectedCode(filteredCatalog[0].code);
    }
  }, [filteredCatalog, selectedCode]);

  const selectedDoc = useMemo(
    () =>
      filteredCatalog.find((d) => d.code === selectedCode) ||
      unifiedCatalog.find((d) => d.code === selectedCode) ||
      filteredCatalog[0] ||
      unifiedCatalog[0] ||
      null,
    [filteredCatalog, unifiedCatalog, selectedCode]
  );

  const selectedDocAuditLogs = useMemo(() => {
    if (!selectedDoc) return [];
    const baseCode = selectedDoc.code.toLowerCase();
    return auditTrail.filter(
      (log) =>
        log.docRef.toLowerCase().includes(baseCode) ||
        log.detail.toLowerCase().includes(baseCode)
    );
  }, [auditTrail, selectedDoc]);

  const buildMatrixRowFromRecord = (record: UnifiedDocRecord, conf?: ConfChoice): DistributionMatrixRow => {
    const level = conf || record.confidentiality;
    const confTone: DistributionMatrixRow['confidentialityTone'] =
      level === 'C1 - عمومی'
        ? 'tertiary'
        : level === 'C2 - سازمانی'
        ? 'secondary'
        : level === 'C3 - محرمانه فنی'
        ? 'warning'
        : 'critical';

    const badgeColor: DistributionMatrixRow['badgeColor'] =
      record.docGroup === 'HSE'
        ? 'critical'
        : record.docGroup === 'SOP'
        ? 'secondary'
        : record.docGroup === 'P&ID'
        ? 'primary'
        : 'tertiary';

    return {
      id: `dist-${record.code}-${Date.now()}`,
      badgeCode: record.docGroup,
      badgeColor,
      code: record.code,
      version: record.version,
      title: record.title,
      subtitle: `${record.unit} • تحت کنترل استاندارد ISO 9001 & 27001`,
      confidentiality: level,
      confidentialityTone: confTone,
      docGroup: record.docGroup,
      unitPermissions: buildDefaultUnitPerms(level),
      userPermissions: buildDefaultUserPerms(level),
      revisionOwners: [record.owner],
      authorizedUsers: [],
    };
  };

  const handleInlineTogglePermission = (
    record: UnifiedDocRecord,
    mode: 'unit' | 'user',
    targetKey: string,
    flag: keyof PermissionFlags,
    targetTitle: string,
    flagLabel: string
  ) => {
    if (record.matrixRow) {
      const currentVal = (
        (mode === 'unit'
          ? record.matrixRow.unitPermissions
          : record.matrixRow.userPermissions) as Record<string, PermissionFlags>
      )[targetKey]?.[flag];
      onTogglePermission(record.matrixRow.id, mode, targetKey, flag);
      onNotify(
        `به‌روزرسانی دسترسی ${record.code}`,
        `مجوز ${flagLabel} (${flag}) برای ${targetTitle} ${currentVal ? 'غیرفعال' : 'فعال'} شد.`,
        'info'
      );
      return;
    }

    // Auto-initialize matrix row for this document if it wasn't registered in matrixRows yet
    const seeded = buildMatrixRowFromRecord(record);
    const targetRecord = mode === 'unit' ? seeded.unitPermissions : seeded.userPermissions;
    const currentFlags = (targetRecord as Record<string, PermissionFlags>)[targetKey];
    (targetRecord as Record<string, PermissionFlags>)[targetKey] = {
      ...currentFlags,
      [flag]: !currentFlags[flag],
    };
    onEnsureMatrixRow(seeded);
    onNotify(
      `ماتریس دسترسی برای ${record.code} ایجاد و تنظیم شد`,
      `مجوز ${flagLabel} (${flag}) برای ${targetTitle} فعال/به‌روزرسانی گردید.`,
      'success'
    );
  };

  const openPublishModalForRecord = (record: UnifiedDocRecord) => {
    const existingRow = record.matrixRow;
    const conf = existingRow?.confidentiality || record.confidentiality;
    const suggestedName = existingRow?.revisionOwners?.[0] || record.owner;
    const matchedUser =
      userDirectory.find(
        (u) =>
          u.label === suggestedName ||
          u.label.includes(suggestedName.split('(')[0].trim())
      )?.label ||
      userDirectory[0]?.label ||
      suggestedName;

    setPublishModal({
      open: true,
      record,
      confidentiality: conf,
      isPublicBroadcast: conf === 'C1 - عمومی',
      unitPerms: existingRow
        ? {
            ops: { ...existingRow.unitPermissions.ops },
            hse: { ...existingRow.unitPermissions.hse },
            inspection: { ...existingRow.unitPermissions.inspection },
            qc: { ...existingRow.unitPermissions.qc },
          }
        : buildDefaultUnitPerms(conf),
      userPerms: existingRow
        ? {
            kazemi: { ...existingRow.userPermissions.kazemi },
            nikpey: { ...existingRow.userPermissions.nikpey },
            hedari: { ...existingRow.userPermissions.hedari },
            parsa: { ...existingRow.userPermissions.parsa },
          }
        : buildDefaultUserPerms(conf),
      extraAuthorizedUsers: existingRow?.authorizedUsers || [],
      primaryReviser: matchedUser,
      extraRevisers: (existingRow?.revisionOwners || []).filter((r) => r !== matchedUser),
      customReviserInput: '',
    });
  };

  const applyConfidentialityPreset = (conf: ConfChoice) => {
    setPublishModal((prev) => ({
      ...prev,
      confidentiality: conf,
      isPublicBroadcast: conf === 'C1 - عمومی',
      unitPerms: buildDefaultUnitPerms(conf),
      userPerms: buildDefaultUserPerms(conf),
    }));
  };

  const handleConfirmPublish = (e: React.FormEvent) => {
    e.preventDefault();
    const rec = publishModal.record;
    if (!rec) return;

    const finalReviser =
      publishModal.primaryReviser === '__CUSTOM__'
        ? publishModal.customReviserInput.trim()
        : publishModal.primaryReviser.trim();

    if (!finalReviser) {
      onNotify(
        'تعیین مسئول بازنگری الزامی است',
        'لطفاً مشخص کنید چه فرد یا افرادی مجاز به انجام بازنگری روی این سند هستند.',
        'warning'
      );
      return;
    }

    const allRevisers = Array.from(new Set([finalReviser, ...publishModal.extraRevisers]));
    const updatedUserPerms: DistributionMatrixRow['userPermissions'] = {
      kazemi: { ...publishModal.userPerms.kazemi },
      nikpey: { ...publishModal.userPerms.nikpey },
      hedari: { ...publishModal.userPerms.hedari },
      parsa: { ...publishModal.userPerms.parsa },
    };

    allRevisers.forEach((revName) => {
      if (revName.includes('کاظمی')) updatedUserPerms.kazemi = { ...updatedUserPerms.kazemi, R: true, W: true };
      if (revName.includes('نیک‌پی')) updatedUserPerms.nikpey = { ...updatedUserPerms.nikpey, R: true, W: true };
      if (revName.includes('دهداری')) updatedUserPerms.hedari = { ...updatedUserPerms.hedari, R: true, W: true };
      if (revName.includes('پارسا')) updatedUserPerms.parsa = { ...updatedUserPerms.parsa, R: true, W: true };
    });

    const confTone: DistributionMatrixRow['confidentialityTone'] =
      publishModal.confidentiality === 'C1 - عمومی'
        ? 'tertiary'
        : publishModal.confidentiality === 'C2 - سازمانی'
        ? 'secondary'
        : publishModal.confidentiality === 'C3 - محرمانه فنی'
        ? 'warning'
        : 'critical';

    const badgeColor: DistributionMatrixRow['badgeColor'] =
      rec.docGroup === 'HSE'
        ? 'critical'
        : rec.docGroup === 'SOP'
        ? 'secondary'
        : rec.docGroup === 'P&ID'
        ? 'primary'
        : 'tertiary';

    const newMatrixRow: DistributionMatrixRow = {
      id: rec.matrixRow?.id || `dist-${Date.now()}`,
      badgeCode: rec.docGroup,
      badgeColor,
      code: rec.code,
      version: rec.version,
      title: rec.title,
      subtitle: `${rec.unit} • مجوز انتشار توسط کارشناس فرآیند/ادمین`,
      confidentiality: publishModal.confidentiality,
      confidentialityTone: confTone,
      docGroup: rec.docGroup,
      unitPermissions: publishModal.unitPerms,
      userPermissions: updatedUserPerms,
      revisionOwners: allRevisers,
      authorizedUsers: publishModal.extraAuthorizedUsers,
      publishedBy: 'مهندس مهران کاظمی (کارشناس فرآیند / ادمین سامانه)',
      publishedAt: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
    };

    const accessSummaryText = publishModal.isPublicBroadcast
      ? 'انتشار عمومی برای تمامی واحدها و کاربران (C1)'
      : `دسترسی محدود (${publishModal.confidentiality})`;

    const logEntry: AuditTrailEntry = {
      id: `log-pub-${Date.now()}`,
      type: 'ack',
      title: 'صدور مجوز انتشار و تنظیم دسترسی سند',
      badge: publishModal.isPublicBroadcast ? 'انتشار عمومی' : publishModal.confidentiality,
      docRef: `سند: ${rec.code} ${rec.version}`,
      detail: `${accessSummaryText} | مسئول بازنگری مجاز: ${allRevisers.join('، ')}${
        publishModal.extraAuthorizedUsers.length > 0
          ? ` | کاربران مجاز تکمیلی: ${publishModal.extraAuthorizedUsers.length.toLocaleString('fa-IR')} نفر`
          : ''
      }`,
      timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
      tag: 'ISO 7.5.3 License',
    };

    onPublishDistribution(
      rec.pendingItem?.id || `pdist-direct-${rec.code}`,
      newMatrixRow,
      logEntry,
      finalReviser,
      `${accessSummaryText} • بازنگری: ${allRevisers.join('، ')}`
    );

    setPublishModal((prev) => ({ ...prev, open: false, record: null }));
  };

  const handleSubmitControlledCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    if (selectedDoc.isObsolete) {
      onNotify(
        'ممنوعیت توزیع سند منسوخ (ISO 9001 §7.5.3.2)',
        `سند ${selectedDoc.code} منسوخ شده و امکان صدور نسخه جدید برای آن وجود ندارد.`,
        'error'
      );
      return;
    }

    const newEntry: AuditTrailEntry = {
      id: `log-copy-${Date.now()}`,
      type: 'print',
      title: copyForm.distType.includes('دیجیتال')
        ? 'توزیع نسخه دیجیتال کنترل‌شده'
        : 'چاپ و تحویل نسخه کاغذی تحت کنترل',
      badge: copyForm.ackRequired ? 'با تایید دریافت' : 'ثبت تحویل',
      docRef: `سند: ${selectedDoc.code} ${selectedDoc.version}`,
      detail: `گیرنده: ${copyForm.receiver} (${copyForm.copyNum})${
        copyForm.note.trim() ? ` — ${copyForm.note.trim()}` : ''
      }`,
      timestamp: `${copyForm.date} - هم‌اکنون`,
      tag: `Watermark ${copyForm.copyNum}`,
    };

    onIssueControlledCopy(newEntry);
    setConsoleSubTab('audit');
    onNotify(
      `نسخه تحت کنترل ${selectedDoc.code} توزیع شد`,
      `${copyForm.copyNum} به «${copyForm.receiver}» با مهر امنیتی ابلاغ و در ممیزی ثبت گردید.`,
      'success'
    );
  };

  const handleExportAuditPack = () => {
    exportToCsv(
      'apadana-iso27001-audit-trail.csv',
      ['نوع رویداد', 'وضعیت', 'سند مرتبط', 'جزئیات', 'زمان ثبت', 'شناسه امنیتی'],
      auditTrail.map((a) => [a.title, a.badge, a.docRef, a.detail, a.timestamp, a.tag])
    );
    onNotify('بسته ممیزی ISO 27001 دانلود شد', 'سوابق تغییرناپذیر توزیع و چاپ در فایل CSV ذخیره گردید.', 'success');
  };

  const filteredMatrixRows = useMemo(() => {
    return matrixRows.filter((r) => {
      if (docGroupFilter && r.docGroup !== docGroupFilter) return false;
      if (confFilter && !r.confidentiality.startsWith(confFilter)) return false;
      if (
        searchQuery.trim() &&
        !r.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [matrixRows, docGroupFilter, confFilter, searchQuery]);

  const activeMatrixColumns = accessViewMode === 'unit' ? UNIT_COLUMNS : USER_COLUMNS;
  const bottomMatrixColumns = matrixMode === 'unit' ? UNIT_COLUMNS : USER_COLUMNS;

  return (
    <div className="space-y-5">
      {/* 1. Standards-Aligned Header & Global Actions */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-secondary">
            <span>ISO 9001:2015 بند ۷.۵.۳ (کنترل اطلاعات مدون)</span>
            <span aria-hidden="true" className="text-outline">·</span>
            <span>ISO/IEC 27001:2022 بند A.5.12–5.15 (طبقه‌بندی و کنترل دسترسی)</span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-primary">
            مرکز توزیع، صدور مجوز انتشار و مدیریت دسترسی مستندات
          </h1>
          <p className="text-xs text-on-surface-variant max-w-3xl leading-5">
            تمامی اسناد ثبت‌شده، تاییدشده توسط مدیرعامل، در جریان بازنگری، منقضی‌شده و منسوخ را از فهرست انتخاب کنید تا مجوز انتشار صادر کرده، سطوح دسترسی و مسئول بازنگری را تعیین نمایید یا نسخه جدید تحت کنترل (FORM-IMS-08) توزیع کنید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportAuditPack}
            className="px-3.5 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px] text-secondary">download</span>
            خروجی ممیزی ISO 27001
          </button>
          <button
            type="button"
            onClick={() => onNavigate('access-levels')}
            className="px-3.5 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px] text-amber-600">shield_person</span>
            سطوح دسترسی سازمانی
          </button>
          <button
            type="button"
            onClick={() => onNavigate('documents-archive')}
            className="px-3.5 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px] text-critical-hse">inventory_2</span>
            آرشیو نسخ منسوخ
          </button>
          <button
            type="button"
            onClick={() => onNavigate('documents-approval-workflow')}
            className="px-3.5 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined !text-[17px]">rule</span>
            گردش تاییدات اسناد
          </button>
        </div>
      </section>

      {/* 2. Dynamic Tabular KPI Strip (Computed from Actual State) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className="text-right bg-white rounded-2xl border border-border-hairline p-4 hover:border-secondary transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">کل مستندات رجیستر توزیع</span>
            <span className="material-symbols-outlined text-secondary !text-[20px]">folder_managed</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-label-code tabular-nums text-2xl font-extrabold text-primary">
              {counts.all.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-on-surface-variant">سند یکتا در سامانه</span>
          </div>
          <div className="text-[11px] text-on-surface-variant mt-1">
            شامل ثبت جدید، در جریان، مصوب و منسوخ
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('ceo-pending')}
          className="text-right bg-white rounded-2xl border border-border-hairline p-4 hover:border-warning-capa transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">تایید مدیرعامل (آماده مجوز)</span>
            <span className="material-symbols-outlined text-warning-capa !text-[20px]">admin_panel_settings</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-label-code tabular-nums text-2xl font-extrabold text-warning-capa">
              {counts.ceoPending.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-on-surface-variant">سند در انتظار انتشار ادمین</span>
          </div>
          <div className="text-[11px] text-warning-capa mt-1">
            نیازمند تعیین عمومی/محدود و مسئول بازنگری
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('published')}
          className="text-right bg-white rounded-2xl border border-border-hairline p-4 hover:border-tertiary transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">اسناد منتشرشده در ماتریس RBAC</span>
            <span className="material-symbols-outlined text-tertiary !text-[20px]">verified_user</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-label-code tabular-nums text-2xl font-extrabold text-tertiary">
              {counts.published.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-on-surface-variant">مستند فعال با دسترسی تنظیم‌شده</span>
          </div>
          <div className="text-[11px] text-on-surface-variant mt-1">
            دارای واترمارک پویا و مهر کنترل‌شده SHA-256
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('expired')}
          className="text-right bg-white rounded-2xl border border-border-hairline p-4 hover:border-critical-hse transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">منقضی / سررسید گذشته / منسوخ</span>
            <span className="material-symbols-outlined text-critical-hse !text-[20px]">event_busy</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-label-code tabular-nums text-2xl font-extrabold text-critical-hse">
              {(counts.expired + counts.obsolete).toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-on-surface-variant">سند نیازمند بازنگری یا جمع‌آوری</span>
          </div>
          <div className="text-[11px] text-critical-hse mt-1">
            الزام بند ۷.۵.۳.۲: جلوگیری از استفاده ناخواسته
          </div>
        </button>
      </section>

      {/* 3. Filter Tabs & Search Toolbar */}
      <section className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-border-hairline">
          {(
            [
              { id: 'all', label: 'همه مستندات', count: counts.all },
              { id: 'ceo-pending', label: 'تایید مدیرعامل (آماده مجوز)', count: counts.ceoPending },
              { id: 'new', label: 'ثبت جدید (Rev 00)', count: counts.newDocs },
              { id: 'revision-workflow', label: 'در جریان / بازنگری', count: counts.inWorkflow },
              { id: 'expired', label: 'منقضی / سررسید گذشته', count: counts.expired },
              { id: 'published', label: 'منتشرشده و فعال', count: counts.published },
              { id: 'obsolete', label: 'منسوخ / ابطال‌شده', count: counts.obsolete },
            ] as const
          ).map((t) => {
            const active = filterTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-primary hover:bg-white'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`font-label-code tabular-nums text-[10.5px] px-1.5 py-0.5 rounded ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-primary'
                  }`}
                >
                  {t.count.toLocaleString('fa-IR')}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined !text-[18px] text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با کد سند، عنوان، واحد سازمانی یا مسئول..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs focus:outline-none focus:border-secondary"
            />
          </div>
          <select
            value={docGroupFilter}
            onChange={(e) => setDocGroupFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="">همه گروه‌ها (SOP, HSE, P&ID, IMS)</option>
            <option value="SOP">روش‌های اجرایی (SOP)</option>
            <option value="HSE">دستورالعمل‌های HSE</option>
            <option value="P&ID">نقشه‌های مهندسی (P&ID)</option>
            <option value="IMS">مستندات کیفیت و IMS</option>
          </select>
          <select
            value={confFilter}
            onChange={(e) => setConfFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="">همه سطوح محرمانگی (C1–C4)</option>
            <option value="C1">C1 - عمومی</option>
            <option value="C2">C2 - سازمانی</option>
            <option value="C3">C3 - محرمانه فنی</option>
            <option value="C4">C4 - فوق‌محرمانه</option>
          </select>
        </div>
      </section>

      {/* 4. Master-Detail Workspace: Select Document -> Dedicated Distribution & Access Console */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Right Panel (5 cols): Selectable Master Document Register */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-border-hairline overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 border-b border-border-hairline bg-surface-container-low/60 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-primary">فهرست مستندات سامانه</h2>
              <p className="text-[11px] text-on-surface-variant">
                برای صدور مجوز انتشار، توزیع نسخه یا تنظیم دسترسی، سند را انتخاب کنید
              </p>
            </div>
            <span className="font-label-code tabular-nums text-[11px] font-bold text-secondary">
              {filteredCatalog.length.toLocaleString('fa-IR')} مورد
            </span>
          </div>

          <div className="divide-y divide-border-hairline/80 max-h-[760px] overflow-y-auto custom-scrollbar">
            {filteredCatalog.length === 0 ? (
              <div className="p-8 text-center space-y-2.5">
                <span className="material-symbols-outlined !text-[32px] text-outline">find_in_page</span>
                <div className="text-xs font-bold text-primary">هیچ سندی با این فیلتر یافت نشد</div>
                <p className="text-[11px] text-on-surface-variant">
                  عبارت جستجو یا تب وضعیت را تغییر دهید تا اسناد ثبت‌شده نمایش داده شوند.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterTab('all');
                    setSearchQuery('');
                    setDocGroupFilter('');
                    setConfFilter('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
                >
                  نمایش همه مستندات
                </button>
              </div>
            ) : (
              filteredCatalog.map((item) => {
                const isSelected = selectedDoc?.code === item.code;
                const toneCls =
                  item.statusTone === 'critical'
                    ? 'text-critical-hse bg-red-50 border-red-200'
                    : item.statusTone === 'warning'
                    ? 'text-warning-capa bg-amber-50 border-amber-200'
                    : item.statusTone === 'tertiary'
                    ? 'text-tertiary bg-emerald-50 border-emerald-200'
                    : item.statusTone === 'secondary'
                    ? 'text-secondary bg-sky-50 border-sky-200'
                    : 'text-on-surface-variant bg-slate-100 border-slate-200';

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setSelectedCode(item.code)}
                    className={`w-full text-right p-4 transition-colors cursor-pointer block ${
                      isSelected ? 'bg-sky-50/70' : 'hover:bg-surface-container-low/50 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-label-code tabular-nums font-extrabold text-secondary">
                            {item.code}
                          </span>
                          <span aria-hidden="true" className="text-outline">·</span>
                          <span className="font-label-code tabular-nums font-bold text-primary">
                            {item.version}
                          </span>
                          <span aria-hidden="true" className="text-outline">·</span>
                          <span className="text-[11px] font-semibold text-on-surface-variant">
                            {item.confidentiality}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-extrabold mt-1 leading-5 ${
                            isSelected ? 'text-primary' : 'text-on-surface'
                          }`}
                        >
                          {item.title}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined !text-[18px] text-secondary shrink-0">
                          arrow_back
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-on-surface-variant flex flex-wrap items-center gap-1.5">
                        <span>{item.unit}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {item.originType === 'new'
                            ? 'ثبت جدید'
                            : item.originType === 'revision'
                            ? 'بازنگری'
                            : 'سند جاری'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-label-code tabular-nums">انقضا: {item.expiresAt}</span>
                      </div>

                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${toneCls}`}>
                        {item.statusLabel}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Left Panel (7 cols): Dedicated Command Console for Selected Document */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-border-hairline overflow-hidden">
          {!selectedDoc ? (
            <div className="p-12 text-center space-y-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined !text-[36px] text-outline">description</span>
              <div className="font-bold text-primary">سندی انتخاب نشده است</div>
              <p>یک سند را از فهرست سمت راست انتخاب کنید تا کنسول توزیع و دسترسی آن باز شود.</p>
            </div>
          ) : (
            <div>
              {/* Selected Document Identity Header */}
              <div className="p-5 border-b border-border-hairline bg-surface-container-low/40 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                      <span className="font-label-code tabular-nums font-extrabold text-secondary text-sm">
                        {selectedDoc.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-label-code tabular-nums font-bold text-primary">
                        {selectedDoc.version}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>گروه {selectedDoc.docGroup}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {selectedDoc.originType === 'new'
                          ? 'منشأ: ثبت سند جدید'
                          : selectedDoc.originType === 'revision'
                          ? 'منشأ: درخواست بازنگری'
                          : 'سند استاندارد فعال'}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-primary leading-snug">
                      {selectedDoc.title}
                    </h2>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                      selectedDoc.statusTone === 'critical'
                        ? 'bg-red-50 text-critical-hse border-red-200'
                        : selectedDoc.statusTone === 'warning'
                        ? 'bg-amber-50 text-warning-capa border-amber-200'
                        : selectedDoc.statusTone === 'tertiary'
                        ? 'bg-emerald-50 text-tertiary border-emerald-200'
                        : 'bg-sky-50 text-secondary border-sky-200'
                    }`}
                  >
                    {selectedDoc.statusLabel}
                  </span>
                </div>

                {/* Unboxed Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border-hairline/80 text-xs">
                  <div>
                    <div className="text-[11px] text-on-surface-variant">واحد متولی</div>
                    <div className="font-bold text-primary mt-0.5">{selectedDoc.unit}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-on-surface-variant">سطح محرمانگی</div>
                    <div className="font-bold text-primary mt-0.5">{selectedDoc.confidentiality}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-on-surface-variant">سررسید بازنگری</div>
                    <div className="font-label-code tabular-nums font-bold text-primary mt-0.5">
                      {selectedDoc.reviewAt}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-on-surface-variant">تاریخ انقضای اعتبار</div>
                    <div
                      className={`font-label-code tabular-nums font-bold mt-0.5 ${
                        selectedDoc.isExpiredOrOverdue ? 'text-critical-hse' : 'text-primary'
                      }`}
                    >
                      {selectedDoc.expiresAt}
                    </div>
                  </div>
                </div>

                {/* Contextual ISO Guidance Banner (What can be done right now on this document) */}
                <div
                  className={`p-3.5 rounded-xl border text-xs leading-5 ${
                    selectedDoc.isObsolete
                      ? 'bg-red-50/70 border-red-200 text-critical-hse'
                      : selectedDoc.isCeoPending
                      ? 'bg-amber-50/70 border-amber-200 text-primary'
                      : selectedDoc.isExpiredOrOverdue
                      ? 'bg-red-50/60 border-red-200 text-primary'
                      : 'bg-white border-border-hairline text-primary'
                  }`}
                >
                  <div className="font-extrabold flex items-center gap-1.5">
                    <span className="material-symbols-outlined !text-[17px]">
                      {selectedDoc.isCeoPending
                        ? 'verified'
                        : selectedDoc.isExpiredOrOverdue || selectedDoc.isObsolete
                        ? 'warning'
                        : 'info'}
                    </span>
                    {selectedDoc.isObsolete
                      ? 'این سند منسوخ شده است (الزام بند ۷.۵.۳.۲ استاندارد ISO 9001)'
                      : selectedDoc.isCeoPending
                      ? 'سند تاییدشده توسط مدیرعامل — آماده صدور مجوز انتشار توسط ادمین'
                      : selectedDoc.isExpiredOrOverdue
                      ? 'هشدار انقضا / سررسید بازنگری گذشته — نیازمند تصمیم کنترل انتشار'
                      : selectedDoc.workflowStageLabel && selectedDoc.workflowItem?.tabGroup !== 'approved'
                      ? `وضعیت جاری در گردش تصویب: ${selectedDoc.workflowStageLabel}`
                      : 'وضعیت استاندارد: معتبر و قابل توزیع با مجوز ادمین'}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    {selectedDoc.isObsolete
                      ? 'صدور نسخه جدید برای اسناد منسوخ مسدود است. می‌توانید سوابق جمع‌آوری نسخه‌های فیزیکی و ممیزی ISO 27001 آن را بررسی کنید.'
                      : selectedDoc.isCeoPending
                      ? 'مدیرعامل این سند را تصویب نهایی کرده است. اکنون روی «صدور مجوز انتشار و دسترسی‌ها» کلیک کنید تا عمومی یا محدود بودن، افراد مجاز و مسئول بازنگری آن را تعیین و منتشر کنید.'
                      : selectedDoc.isExpiredOrOverdue
                      ? 'تاریخ اعتبار یا بازنگری این سند سپری شده است. مطابق ISO 9001 باید درخواست بازنگری/تمدید اعتبار ثبت کنید یا با ابطال رسمی، دستور جمع‌آوری نسخه‌های تحت کنترل را صادر نمایید.'
                      : selectedDoc.workflowStageLabel && selectedDoc.workflowItem?.tabGroup !== 'approved'
                      ? `اقدام‌کننده فعلی: ${selectedDoc.workflowActor || 'کمیته تصویب'}. می‌توانید از همین بخش پیش‌تنظیم دسترسی‌های RBAC را آماده کنید یا پس از تایید مدیرعامل مجوز انتشار نهایی بدهید.`
                      : 'دسترسی‌های مشاهده/چاپ/ویرایش این سند در ماتریس فعال است. می‌توانید دسترسی‌ها را ویرایش کنید، مجوز بازنگری را تغییر دهید یا نسخه جدید تحت کنترل (FORM-IMS-08) ابلاغ نمایید.'}
                  </p>
                </div>

                {/* Primary Document-Specific Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!selectedDoc.isObsolete && (
                    <button
                      type="button"
                      onClick={() => openPublishModalForRecord(selectedDoc)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        selectedDoc.isCeoPending
                          ? 'bg-tertiary hover:bg-primary text-white shadow-sm'
                          : 'bg-primary hover:bg-secondary text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined !text-[17px]">admin_panel_settings</span>
                      {selectedDoc.isCeoPending
                        ? 'صدور مجوز انتشار و تنظیم دسترسی‌ها'
                        : 'تنظیم مجوز انتشار، عمومی/محدود و مسئول بازنگری'}
                    </button>
                  )}

                  {!selectedDoc.isObsolete && (
                    <button
                      type="button"
                      onClick={() => setConsoleSubTab('distribute')}
                      className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[17px] text-secondary">send</span>
                      ثبت توزیع نسخه جدید (FORM-IMS-08)
                    </button>
                  )}

                  {(selectedDoc.isExpiredOrOverdue || !selectedDoc.isObsolete) && (
                    <button
                      type="button"
                      onClick={() => onNavigate('documents-revision')}
                      className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[17px] text-warning-capa">
                        edit_calendar
                      </span>
                      ثبت بازنگری / تمدید اعتبار
                    </button>
                  )}

                  {!selectedDoc.isObsolete && (
                    <button
                      type="button"
                      onClick={() =>
                        setRecallModal({
                          open: true,
                          reason: selectedDoc.isExpiredOrOverdue
                            ? 'انقضای دوره اعتبار استاندارد و جمع‌آوری نسخه‌های فیزیکی و دیجیتال از واحدها'
                            : 'ابطال رسمی سند و جمع‌آوری نسخ تحت کنترل مطابق بند ۷.۵.۳.۲ ISO 9001',
                        })
                      }
                      className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-xs font-bold text-critical-hse inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[17px]">delete_sweep</span>
                      ابطال و جمع‌آوری نسخ
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-Navigation Inside Selected Document Console */}
              <div className="px-5 pt-3 border-b border-border-hairline flex flex-wrap items-center gap-1 bg-white">
                {(
                  [
                    { id: 'access', label: 'سطوح دسترسی و مسئول بازنگری این سند', icon: 'lock_person' },
                    { id: 'distribute', label: 'توزیع نسخه تحت کنترل (FORM-IMS-08)', icon: 'verified' },
                    {
                      id: 'audit',
                      label: `سوابق ممیزی این سند (${selectedDocAuditLogs.length.toLocaleString('fa-IR')})`,
                      icon: 'history_edu',
                    },
                  ] as const
                ).map((tab) => {
                  const active = consoleSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setConsoleSubTab(tab.id)}
                      className={`px-3.5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-primary text-primary'
                          : 'border-transparent text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined !text-[16px]">{tab.icon}</span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Sub-Tab 1: Selected Document RBAC Access & Revision Owners */}
              {consoleSubTab === 'access' && (
                <div className="p-5 space-y-4">
                  {/* Revision Owners & Named Personnel Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
                      <div className="text-[11px] font-bold text-on-surface-variant">
                        افراد مجاز به بازنگری آینده روی این سند
                      </div>
                      <div className="font-extrabold text-primary mt-1">
                        {selectedDoc.matrixRow?.revisionOwners && selectedDoc.matrixRow.revisionOwners.length > 0
                          ? selectedDoc.matrixRow.revisionOwners.join('، ')
                          : selectedDoc.owner}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
                      <div className="text-[11px] font-bold text-on-surface-variant">
                        نوع انتشار و کاربران اختصاصی اضافه‌شده
                      </div>
                      <div className="font-extrabold text-primary mt-1">
                        {selectedDoc.confidentiality === 'C1 - عمومی'
                          ? 'انتشار عمومی برای کل سازمان (C1)'
                          : `دسترسی کنترل‌شده (${selectedDoc.confidentiality})`}
                        {selectedDoc.matrixRow?.authorizedUsers &&
                        selectedDoc.matrixRow.authorizedUsers.length > 0
                          ? ` · ${selectedDoc.matrixRow.authorizedUsers.length.toLocaleString('fa-IR')} کاربر اختصاصی`
                          : ''}
                      </div>
                    </div>
                  </div>

                  {/* Unit vs User Toggle for Selected Document */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-extrabold text-primary">
                        تنظیم مستقیم مجوزهای R / P / W / A برای سند {selectedDoc.code}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant">
                        R: مشاهده · P: چاپ با واترمارک · W: ویرایش و بازنگری · A: تصویب نهایی
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl bg-surface-container-low p-1 border border-border-hairline">
                      <button
                        type="button"
                        onClick={() => setAccessViewMode('unit')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          accessViewMode === 'unit' ? 'bg-primary text-white' : 'text-on-surface-variant'
                        }`}
                      >
                        واحدهای عملیاتی
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccessViewMode('user')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          accessViewMode === 'user' ? 'bg-primary text-white' : 'text-on-surface-variant'
                        }`}
                      >
                        کاربران کلیدی
                      </button>
                    </div>
                  </div>

                  {!selectedDoc.matrixRow && (
                    <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-primary font-semibold">
                        این سند هنوز ردیف اختصاصی در ماتریس دسترسی ندارد. با تغییر هر مجوز یا کلیک روی دکمه، ردیف دسترسی آن ایجاد می‌شود.
                      </span>
                      <button
                        type="button"
                        onClick={() => openPublishModalForRecord(selectedDoc)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
                      >
                        پیکربندی کامل مجوز انتشار
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeMatrixColumns.map((col) => {
                      const effectiveRow = selectedDoc.matrixRow || buildMatrixRowFromRecord(selectedDoc);
                      const permSource =
                        accessViewMode === 'unit'
                          ? effectiveRow.unitPermissions
                          : effectiveRow.userPermissions;
                      const flags = (permSource as Record<string, PermissionFlags>)[col.key];
                      const isConfigured = Boolean(selectedDoc.matrixRow);

                      return (
                        <div
                          key={col.key}
                          className="p-3.5 rounded-xl border border-border-hairline bg-white flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-primary truncate">{col.title}</div>
                            <div className="text-[11px] text-on-surface-variant truncate">{col.sub}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {PERM_FLAGS.map((fs) => {
                              const active = isConfigured ? flags?.[fs.k] : false;
                              return (
                                <button
                                  key={fs.k}
                                  type="button"
                                  disabled={selectedDoc.isObsolete}
                                  onClick={() =>
                                    handleInlineTogglePermission(
                                      selectedDoc,
                                      accessViewMode,
                                      col.key,
                                      fs.k,
                                      col.title,
                                      fs.label
                                    )
                                  }
                                  title={`${fs.label} (${col.title})`}
                                  className={`w-7 h-7 rounded-lg font-label-code text-[11px] font-bold border transition-colors ${
                                    selectedDoc.isObsolete
                                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-outline border-border-hairline'
                                      : active
                                      ? `${fs.activeCls} cursor-pointer`
                                      : 'bg-surface-container-low text-outline border-border-hairline hover:border-secondary cursor-pointer'
                                  }`}
                                >
                                  {fs.k}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Controlled Distribution Form (FORM-IMS-08) Pre-Bound to Selected Document */}
              {consoleSubTab === 'distribute' && (
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-hairline">
                    <div>
                      <h3 className="text-sm font-extrabold text-primary">
                        ثبت توزیع نسخه جدید / تحت کنترل برای {selectedDoc.code}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant">
                        این فرم به‌طور اختصاصی برای سند انتخاب‌شده تنظیم شده و هر توزیع در دفتر ممیزی ISO 27001 ثبت می‌شود.
                      </p>
                    </div>
                    <span className="font-label-code text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-hairline text-primary">
                      FORM-IMS-08
                    </span>
                  </div>

                  <form onSubmit={handleSubmitControlledCopy} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-primary mb-1">کد و ویرایش سند انتخاب‌شده</label>
                        <input
                          type="text"
                          readOnly
                          value={`${selectedDoc.code} · ${selectedDoc.version}`}
                          dir="ltr"
                          className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-label-code font-bold text-secondary text-right"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-primary mb-1">نوع توزیع کنترل‌شده</label>
                        <select
                          value={copyForm.distType}
                          onChange={(e) => setCopyForm({ ...copyForm, distType: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-white font-semibold text-primary"
                        >
                          <option value="نسخه دیجیتال کنترل‌شده (کارتابل امن)">
                            نسخه دیجیتال کنترل‌شده (کارتابل امن)
                          </option>
                          <option value="نسخه کاغذی مهرشده با واترمارک (Hardcopy)">
                            نسخه کاغذی مهرشده با واترمارک (Hardcopy)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-primary mb-1">شماره نسخه (Copy No.)</label>
                        <input
                          type="text"
                          value={copyForm.copyNum}
                          onChange={(e) => setCopyForm({ ...copyForm, copyNum: e.target.value })}
                          dir="ltr"
                          className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code font-bold text-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-primary mb-1">تاریخ ابلاغ و تحویل</label>
                        <input
                          type="text"
                          value={copyForm.date}
                          onChange={(e) => setCopyForm({ ...copyForm, date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code"
                        />
                      </div>
                      <label className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer self-end">
                        <span className="font-bold text-tertiary text-[11px]">الزام تاییدیه دریافت (Ack)</span>
                        <input
                          type="checkbox"
                          checked={copyForm.ackRequired}
                          onChange={(e) => setCopyForm({ ...copyForm, ackRequired: e.target.checked })}
                          className="w-4 h-4 accent-tertiary"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-primary mb-1">واحد / ایستگاه / فرد تحویل‌گیرنده *</label>
                        <input
                          type="text"
                          required
                          value={copyForm.receiver}
                          onChange={(e) => setCopyForm({ ...copyForm, receiver: e.target.value })}
                          placeholder="مثلاً: اتاق کنترل واحد متانول - سرپرست شیفت"
                          className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-primary mb-1">یادداشت ابلاغ (اختیاری)</label>
                        <input
                          type="text"
                          value={copyForm.note}
                          onChange={(e) => setCopyForm({ ...copyForm, note: e.target.value })}
                          placeholder="مثلاً: جایگزین نسخه قبلی در زونکن شماره ۲"
                          className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                        />
                      </div>
                    </div>

                    {/* Dynamic Controlled Stamp Preview for Selected Document */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-hairline flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-2 rounded-xl border-2 border-dashed border-critical-hse/60 bg-white text-center text-critical-hse shrink-0">
                          <div className="font-label-code text-[9.5px] font-extrabold">CONTROLLED COPY</div>
                          <div className="font-label-code text-[10px] font-bold text-primary">
                            {selectedDoc.code} · {copyForm.copyNum}
                          </div>
                        </div>
                        <div className="text-[11px]">
                          <div className="font-bold text-primary">پیش‌نمایش واترمارک و مهر کنترل‌شده سند</div>
                          <div className="text-on-surface-variant mt-0.5">
                            سطح: {selectedDoc.confidentiality} · تاریخ انقضای اعتبار سند: {selectedDoc.expiresAt}
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={selectedDoc.isObsolete}
                        className={`px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${
                          selectedDoc.isObsolete
                            ? 'bg-slate-200 text-outline cursor-not-allowed'
                            : 'bg-primary hover:bg-secondary text-white cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined !text-[17px]">task_alt</span>
                        ثبت توزیع رسمی و صدور گواهی
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sub-Tab 3: Audit Trail Specific to Selected Document */}
              {consoleSubTab === 'audit' && (
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-primary">
                      تاریخچه توزیع، صدور مجوز، چاپ و جمع‌آوری سند {selectedDoc.code}
                    </h3>
                    <span className="font-label-code tabular-nums text-[11px] text-outline">
                      {selectedDocAuditLogs.length.toLocaleString('fa-IR')} رویداد ثبت‌شده
                    </span>
                  </div>

                  {selectedDocAuditLogs.length === 0 ? (
                    <div className="p-6 rounded-xl bg-surface-container-low/60 border border-border-hairline text-center space-y-2 text-xs">
                      <div className="font-bold text-primary">
                        هنوز رویداد توزیع یا مجوز انتشاری برای {selectedDoc.code} ثبت نشده است
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        با صدور مجوز انتشار یا ثبت توزیع نسخه تحت کنترل، تمامی سوابق به‌صورت غیرقابل تغییر اینجا نمایش داده می‌شوند.
                      </p>
                      <button
                        type="button"
                        onClick={() => setConsoleSubTab('distribute')}
                        className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
                      >
                        ثبت اولین توزیع نسخه تحت کنترل
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
                      {selectedDocAuditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3.5 rounded-xl bg-surface-container-low/60 border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-bold text-primary flex items-center gap-2">
                              <span>{log.title}</span>
                              <span className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-border-hairline text-secondary">
                                {log.badge}
                              </span>
                            </div>
                            <div className="text-[11px] text-on-surface-variant mt-1">{log.detail}</div>
                          </div>
                          <div className="sm:text-left shrink-0">
                            <div className="font-label-code tabular-nums text-[11px] text-outline">
                              {log.timestamp}
                            </div>
                            <div className="font-label-code text-[10.5px] font-bold text-primary mt-0.5">
                              {log.tag}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 5. Organization-Wide RBAC Matrix & Full ISO 27001 Audit Trail */}
      <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden">
        <div className="p-4 border-b border-border-hairline bg-surface-container-low/50 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-white p-1 border border-border-hairline">
            <button
              type="button"
              onClick={() => setBottomTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                bottomTab === 'matrix' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              ماتریس کلی دسترسی مستندات ({filteredMatrixRows.length.toLocaleString('fa-IR')})
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                bottomTab === 'audit' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              گزارش ممیزی کل سامانه ISO 27001 ({auditTrail.length.toLocaleString('fa-IR')})
            </button>
          </div>

          {bottomTab === 'matrix' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">نمایش بر اساس:</span>
              <div className="inline-flex rounded-xl bg-white p-1 border border-border-hairline">
                <button
                  type="button"
                  onClick={() => setMatrixMode('unit')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    matrixMode === 'unit' ? 'bg-secondary text-white' : 'text-on-surface-variant'
                  }`}
                >
                  واحدهای عملیاتی
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixMode('user')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    matrixMode === 'user' ? 'bg-secondary text-white' : 'text-on-surface-variant'
                  }`}
                >
                  کاربران کلیدی
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleExportAuditPack}
              className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px]">download</span>
              دانلود بسته ممیزی (CSV)
            </button>
          )}
        </div>

        {bottomTab === 'matrix' ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1120px] text-right border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                  <th className="py-3 px-4">مشخصات سند و مسئول بازنگری</th>
                  <th className="py-3 px-3">کد مدرک</th>
                  <th className="py-3 px-3">نسخه</th>
                  <th className="py-3 px-3">سطح محرمانگی</th>
                  {bottomMatrixColumns.map((col) => (
                    <th key={col.key} className="py-3 px-3 text-center">
                      <div className="text-primary">{col.title}</div>
                      <div className="text-[10px] font-normal text-on-surface-variant">{col.sub}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline/70">
                {filteredMatrixRows.map((row) => {
                  const permRecord = matrixMode === 'unit' ? row.unitPermissions : row.userPermissions;
                  const isRowSelected = selectedDoc?.code === row.code;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedCode(row.code)}
                      className={`transition-colors cursor-pointer ${
                        isRowSelected ? 'bg-sky-50/50' : 'hover:bg-surface-container-low/40'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-primary">{row.title}</div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{row.subtitle}</span>
                          {row.revisionOwners && row.revisionOwners.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-warning-capa">
                                مجاز به بازنگری: {row.revisionOwners.join('، ')}
                              </span>
                            </>
                          )}
                          {row.authorizedUsers && row.authorizedUsers.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-secondary">
                                +{row.authorizedUsers.length.toLocaleString('fa-IR')} کاربر اختصاصی
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-label-code tabular-nums font-bold text-secondary whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="py-3.5 px-3 font-label-code tabular-nums font-bold text-primary whitespace-nowrap">
                        {row.version}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-[11px] font-bold text-primary">
                        {row.confidentiality}
                      </td>
                      {bottomMatrixColumns.map((col) => {
                        const flags = (permRecord as Record<string, PermissionFlags>)[col.key];
                        return (
                          <td
                            key={col.key}
                            onClick={(e) => e.stopPropagation()}
                            className="py-3.5 px-3 text-center whitespace-nowrap"
                          >
                            <div className="inline-flex items-center gap-1">
                              {PERM_FLAGS.map((fs) => {
                                const active = flags?.[fs.k];
                                return (
                                  <button
                                    key={fs.k}
                                    type="button"
                                    onClick={() => {
                                      onTogglePermission(row.id, matrixMode, col.key, fs.k);
                                      onNotify(
                                        `تغییر سطح دسترسی ${row.code}`,
                                        `مجوز ${fs.label} (${fs.k}) برای ${col.title} ${active ? 'غیرفعال' : 'فعال'} شد.`,
                                        'info'
                                      );
                                    }}
                                    title={`${fs.label} (${col.title})`}
                                    className={`w-7 h-7 rounded-lg font-label-code text-[11px] font-bold border transition-colors cursor-pointer ${
                                      active
                                        ? fs.activeCls
                                        : 'bg-surface-container-low text-outline border-border-hairline hover:border-secondary'
                                    }`}
                                  >
                                    {fs.k}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar">
            {auditTrail.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-surface-container-low/60 border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-primary">{log.title}</span>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-white border border-border-hairline text-secondary">
                      {log.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-secondary mt-0.5">{log.docRef}</div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">{log.detail}</div>
                </div>
                <div className="sm:text-left shrink-0">
                  <div className="font-label-code tabular-nums text-[10.5px] text-outline">{log.timestamp}</div>
                  <span className="font-label-code inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-border-hairline text-primary">
                    {log.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Admin Publication License & Access Control Modal (Bound to Any Selected Document) */}
      {publishModal.open && publishModal.record && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <form
            onSubmit={handleConfirmPublish}
            className="animate-modal-enter w-full max-w-4xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined">admin_panel_settings</span>
                <div>
                  <h3 className="text-sm font-bold">
                    صدور مجوز انتشار و تنظیم دسترسی‌های اختصاصی سند
                  </h3>
                  <div className="font-label-code text-[11px] text-primary-fixed mt-0.5" dir="ltr">
                    {publishModal.record.code} · {publishModal.record.version}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPublishModal((prev) => ({ ...prev, open: false, record: null }))}
                className="cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto custom-scrollbar flex-1">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-extrabold text-primary text-[13px]">{publishModal.record.title}</div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    واحد متولی: <strong className="text-primary">{publishModal.record.unit}</strong> · وضعیت فعلی:{' '}
                    <strong className="text-primary">{publishModal.record.statusLabel}</strong>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-tertiary text-[11px] font-bold">
                  کنترل دسترسی ISO 27001
                </span>
              </div>

              {/* 1. Public vs Restricted */}
              <div className="space-y-2.5">
                <label className="block font-extrabold text-primary text-xs">
                  ۱. تعیین نوع انتشار (عمومی یا محدود) و سطح محرمانگی
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {(
                    [
                      {
                        val: 'C1 - عمومی',
                        title: 'عمومی (C1 - Public)',
                        desc: 'انتشار همگانی در کل مجتمع؛ مشاهده و چاپ کنترل‌شده برای همه فعال می‌شود.',
                        tone: 'border-emerald-300 bg-emerald-50/70',
                      },
                      {
                        val: 'C2 - سازمانی',
                        title: 'داخلی سازمانی (C2)',
                        desc: 'دسترسی برای واحدها و پرسنل منتخب مجتمع مطابق ماتریس.',
                        tone: 'border-sky-300 bg-sky-50/70',
                      },
                      {
                        val: 'C3 - محرمانه فنی',
                        title: 'محرمانه فنی (C3)',
                        desc: 'محدود به متخصصین فنی و واحدهای بهره‌برداری با توکن C3.',
                        tone: 'border-amber-300 bg-amber-50/70',
                      },
                      {
                        val: 'C4 - فوق‌محرمانه',
                        title: 'فوق‌محرمانه (C4)',
                        desc: 'فقط افراد خاص و مدیران مشخص‌شده با محدودیت چاپ.',
                        tone: 'border-red-300 bg-red-50/70',
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = publishModal.confidentiality === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => applyConfidentialityPreset(opt.val)}
                        className={`p-3 rounded-xl border text-right transition-colors cursor-pointer ${
                          selected
                            ? `${opt.tone} ring-2 ring-secondary/20`
                            : 'border-border-hairline bg-white hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="font-extrabold text-primary">{opt.title}</div>
                        <div className="text-[10.5px] text-on-surface-variant mt-1 leading-4">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Units + Key Users + Named Personnel */}
              <div className="space-y-3 pt-2 border-t border-border-hairline">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-extrabold text-primary text-xs">
                    ۲. تعیین سطوح دسترسی واحدها و افراد (به چه کسی چه دسترسی داده شود)
                  </label>
                  <span className="text-[10.5px] text-outline">
                    R: مشاهده · P: چاپ با واترمارک · W: ویرایش/بازنگری · A: تصویب
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border-hairline bg-surface-container-low/60 p-3.5 space-y-2">
                    <div className="font-bold text-primary">دسترسی واحدهای عملیاتی</div>
                    {UNIT_COLUMNS.map((u) => {
                      const flags = publishModal.unitPerms[u.key];
                      return (
                        <div
                          key={u.key}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-border-hairline"
                        >
                          <span className="font-semibold text-primary">{u.title}</span>
                          <div className="flex items-center gap-1">
                            {(['R', 'P', 'W', 'A'] as (keyof PermissionFlags)[]).map((k) => {
                              const on = flags[k];
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() =>
                                    setPublishModal((prev) => ({
                                      ...prev,
                                      unitPerms: {
                                        ...prev.unitPerms,
                                        [u.key]: { ...prev.unitPerms[u.key], [k]: !on },
                                      },
                                    }))
                                  }
                                  className={`w-7 h-7 rounded-md font-label-code text-[11px] font-bold border cursor-pointer ${
                                    on
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-surface-container-low text-outline border-border-hairline'
                                  }`}
                                >
                                  {k}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-border-hairline bg-surface-container-low/60 p-3.5 space-y-2">
                    <div className="font-bold text-primary">دسترسی کاربران کلیدی ماتریس</div>
                    {USER_COLUMNS.map((u) => {
                      const flags = publishModal.userPerms[u.key];
                      return (
                        <div
                          key={u.key}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-border-hairline"
                        >
                          <span className="font-semibold text-primary">{u.title}</span>
                          <div className="flex items-center gap-1">
                            {(['R', 'P', 'W', 'A'] as (keyof PermissionFlags)[]).map((k) => {
                              const on = flags[k];
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() =>
                                    setPublishModal((prev) => ({
                                      ...prev,
                                      userPerms: {
                                        ...prev.userPerms,
                                        [u.key]: { ...prev.userPerms[u.key], [k]: !on },
                                      },
                                    }))
                                  }
                                  className={`w-7 h-7 rounded-md font-label-code text-[11px] font-bold border cursor-pointer ${
                                    on
                                      ? 'bg-secondary text-white border-secondary'
                                      : 'bg-surface-container-low text-outline border-border-hairline'
                                  }`}
                                >
                                  {k}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border-hairline bg-surface-container-low/40 p-3.5 space-y-2">
                  <div className="font-bold text-primary">افراد مجاز تکمیلی برای دریافت و مشاهده سند:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {userDirectory.map((u) => {
                      const active = publishModal.extraAuthorizedUsers.includes(u.label);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setPublishModal((prev) => ({
                              ...prev,
                              extraAuthorizedUsers: active
                                ? prev.extraAuthorizedUsers.filter((x) => x !== u.label)
                                : [...prev.extraAuthorizedUsers, u.label],
                            }))
                          }
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                            active
                              ? 'bg-sky-50 border-secondary text-secondary'
                              : 'bg-white border-border-hairline text-on-surface-variant hover:text-primary'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {u.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Who Can Revise */}
              <div className="space-y-2.5 pt-2 border-t border-border-hairline">
                <label className="block font-extrabold text-primary text-xs">
                  ۳. تعیین مسئول/افراد مجاز به بازنگری آینده روی این سند *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      مسئول اصلی مجاز به بازنگری (اعطای خودکار دسترسی W)
                    </label>
                    <select
                      value={publishModal.primaryReviser}
                      onChange={(e) => setPublishModal((prev) => ({ ...prev, primaryReviser: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                    >
                      {userDirectory.map((u) => (
                        <option key={u.id} value={u.label}>
                          {u.label}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ درج دستی نام مسئول بازنگری...</option>
                    </select>
                    {publishModal.primaryReviser === '__CUSTOM__' && (
                      <input
                        type="text"
                        value={publishModal.customReviserInput}
                        onChange={(e) =>
                          setPublishModal((prev) => ({ ...prev, customReviserInput: e.target.value }))
                        }
                        placeholder="نام و سمت فرد مجاز به بازنگری..."
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-secondary bg-white text-xs text-primary focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      سایر همکاران مجاز به بازنگری (اختیاری)
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-2 rounded-xl border border-border-hairline bg-surface-container-low/50">
                      {userDirectory
                        .filter((u) => u.label !== publishModal.primaryReviser)
                        .map((u) => {
                          const selected = publishModal.extraRevisers.includes(u.label);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() =>
                                setPublishModal((prev) => ({
                                  ...prev,
                                  extraRevisers: selected
                                    ? prev.extraRevisers.filter((x) => x !== u.label)
                                    : [...prev.extraRevisers, u.label],
                                }))
                              }
                              className={`px-2 py-0.5 rounded-md border text-[10.5px] font-semibold cursor-pointer ${
                                selected
                                  ? 'bg-amber-50 border-warning-capa text-warning-capa'
                                  : 'bg-white border-border-hairline text-on-surface-variant'
                              }`}
                            >
                              {selected ? '✓ ' : '+ '}
                              {u.label.split('(')[0].trim()}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPublishModal((prev) => ({ ...prev, open: false, record: null }))}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-tertiary hover:bg-primary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined !text-[17px]">verified</span>
                صدور مجوز انتشار و اعمال در ماتریس دسترسی
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Obsolete / Recall Confirmation Modal */}
      {recallModal.open && selectedDoc && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-md bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-critical-hse text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">ابطال سند و جمع‌آوری نسخ تحت کنترل</h3>
              <button
                type="button"
                onClick={() => setRecallModal({ open: false, reason: '' })}
                className="cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="font-extrabold text-primary">
                {selectedDoc.code} · {selectedDoc.version}
              </div>
              <p className="text-on-surface-variant leading-5">
                مطابق بند ۷.۵.۳.۲ استاندارد ISO 9001:2015، با تایید این اقدام سند به وضعیت «منسوخ» منتقل شده، دستور جمع‌آوری نسخه‌های کاغذی صادر و رویداد آن در دفتر ممیزی ISO 27001 ثبت می‌شود.
              </p>
              <div>
                <label className="block font-bold text-primary mb-1">علت ابطال / جمع‌آوری نسخ</label>
                <textarea
                  rows={3}
                  value={recallModal.reason}
                  onChange={(e) => setRecallModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs focus:outline-none focus:border-critical-hse"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecallModal({ open: false, reason: '' })}
                  className="px-4 py-2 rounded-xl border border-border-hairline bg-white font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRecallObsolete(
                      selectedDoc.code,
                      selectedDoc.title,
                      selectedDoc.unit,
                      selectedDoc.version,
                      recallModal.reason
                    );
                    setRecallModal({ open: false, reason: '' });
                  }}
                  className="px-4 py-2 rounded-xl bg-critical-hse hover:bg-red-700 text-white font-bold cursor-pointer"
                >
                  تایید ابطال و صدور دستور جمع‌آوری
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
