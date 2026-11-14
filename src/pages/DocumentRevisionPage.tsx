import React, { useEffect, useMemo, useRef, useState } from 'react';
import { exportToCsv } from '../data/imsData';
import { AttachedRevisionFile, ImsDocument, RevisionItem, RouteId, UserAccount, WorkflowStageActor } from '../types/ims';

interface DocumentRevisionPageProps {
  documents: ImsDocument[];
  revisions: RevisionItem[];
  users: UserAccount[];
  onAddRevision: (item: RevisionItem) => void;
  onUpdateRevision: (id: string, patch: Partial<RevisionItem>) => void;
  onExtendDocument?: (
    docId: string,
    nextReviewAt: string,
    nextExpiresAt: string,
    years: number,
    auditNote: string,
    revisionId?: string
  ) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const CURRENT_JALALI_DATE = '۱۴۰۳/۰۸/۲۴';
const REVIEW_WINDOW_DAYS = 60;

const ISO_EXTENSION_CRITERIA = [
  {
    id: 'no-moc',
    clause: 'ISO 9001 (6.3) • ISO 45001 (8.1.3)',
    title: 'عدم تغییر در فرآیند، تجهیزات، مواد یا شرایط عملیاتی (MOC)',
    detail: 'طی دوره اعتبار گذشته هیچ تغییر مهندسی یا عملیاتی مؤثر بر مفاد این مستند ثبت نشده است.',
  },
  {
    id: 'legal-iso',
    clause: 'ISO 14001 / 45001 (6.1.3)',
    title: 'انطباق کامل با آخرین ویرایش استانداردهای ISO و الزامات قانونی',
    detail: 'کلیه ارجاعات قانونی، زیست‌محیطی، ایمنی و استانداردهای مرجع سند همچنان معتبر و به‌روز هستند.',
  },
  {
    id: 'no-capa',
    clause: 'ISO 9001 (10.2)',
    title: 'نبود عدم انطباق باز، ممیزی ردشده یا CAPA مرتبط با مفاد سند',
    detail: 'در ممیزی‌های داخلی/خارجی و تحلیل حوادث، ناکارآمدی یا مغایرتی در متن فعلی گزارش نشده است.',
  },
  {
    id: 'meta-links',
    clause: 'ISO 9001 (7.5.3.2)',
    title: 'صحت مالکیت سازمانی، کدگذاری و ارجاعات بین‌اسنادی',
    detail: 'واحد متولی، مسئولین تصویب و تمامی فرم‌ها و دستورالعمل‌های پیوست معتبر و بدون لینک منسوخ هستند.',
  },
] as const;

const ISO_STANDARD_POLICIES = [
  {
    docGroup: 'خط‌مشی‌ها و نظامنامه‌ها (POL / MN)',
    cycleLabel: 'هر ۳ سال یک‌بار (۳۶ ماه)',
    defaultYears: 3,
    clause: 'ISO 9001:2015 بند ۵.۲ و ۹.۳',
    rule: 'هم‌راستا با بازنگری مدیریت سالانه؛ تمدید فقط با تایید نماینده مدیریت و عدم تغییر خط‌مشی کلان مجتمع.',
  },
  {
    docGroup: 'روش‌های اجرایی و فرآیندها (SOP / PR)',
    cycleLabel: 'هر ۲ سال یک‌بار (۲۴ ماه)',
    defaultYears: 2,
    clause: 'ISO 9001/14001/45001 بند ۷.۵.۳',
    rule: 'بازبینی کامل انطباق فرآیندی و نبود MOC باز؛ تمدید مشروط به تایید مالک فرآیند و تضمین کیفیت.',
  },
  {
    docGroup: 'دستورالعمل‌های عملیاتی و HSE (WI)',
    cycleLabel: 'هر ۱ تا ۲ سال (عملیات بحرانی: سالانه)',
    defaultYears: 2,
    clause: 'ISO 45001:2018 بند ۶.۱.۲ و ۸.۱.۳',
    rule: 'دستورالعمل‌های ایمنی/تجهیزات پرخطر هر ۱۲ ماه و عمومی هر ۲۴ ماه؛ هر تغییر فنی مستلزم ویرایش فوری است.',
  },
  {
    docGroup: 'فرم‌ها و سوابق کنترلی (FRM)',
    cycleLabel: 'هر ۲ سال یا هم‌زمان با SOP بالادست',
    defaultYears: 2,
    clause: 'ISO 9001:2015 بند ۷.۵.۳.۲',
    rule: 'کنترل کاربردی بودن فیلدها، کد فرم و تطابق با فرآیند جاری پیش از تمدید دوره بعدی.',
  },
];

const toEnglishDigits = (input: string): string =>
  input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const toPersianDigits = (input: string | number): string =>
  String(input).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const parseJalaliToDays = (dateStr: string): number | null => {
  const en = toEnglishDigits(dateStr).trim();
  const match = en.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthOffset =
    month <= 6 ? (month - 1) * 31 : 6 * 31 + (month - 7) * 30;
  return year * 365 + monthOffset + day;
};

const addYearsToJalali = (dateStr: string, years: number): string => {
  const en = toEnglishDigits(dateStr).trim();
  const match = en.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return dateStr;
  const nextYear = Number(match[1]) + years;
  const month = match[2].padStart(2, '0');
  const day = match[3].padStart(2, '0');
  return toPersianDigits(`${nextYear}/${month}/${day}`);
};

const getDefaultCycleYears = (docTypeCode: string): number => {
  if (docTypeCode === 'POL' || docTypeCode === 'MN') return 3;
  return 2;
};

const parseRevNumber = (version: string): number => {
  const match = version.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const formatUserActor = (u?: UserAccount): string =>
  u ? `${u.firstName} ${u.lastName} (${u.roleTitle})` : '';

const CANONICAL_WORKFLOW_STEPS = [
  'گام ۱: تهیه‌کننده',
  'گام ۲: تاییدکننده فنی',
  'گام ۳: تصویب‌کننده انطباق',
  'گام ۴: تصویب نهایی',
] as const;

const buildWorkflowFromDocument = (doc: ImsDocument | undefined, users: UserAccount[]): WorkflowStageActor[] => {
  const chain = doc?.signoffChain || [];
  const fallbackActors = [
    doc?.owner || formatUserActor(users[0]) || 'مهندس مهران کاظمی',
    formatUserActor(users[1] || users[0]) || 'مهندس علی رضوانی',
    formatUserActor(users[0]) || 'مهندس مهران کاظمی (مدیر تضمین کیفیت و سرممیز IMS)',
    formatUserActor(users[6] || users[0]) || 'مدیرعامل / مدیر مجتمع',
  ];

  let actors: [string, string, string, string];
  if (chain.length >= 4) {
    actors = [
      chain[0]?.actor || fallbackActors[0],
      chain[1]?.actor || fallbackActors[1],
      chain[2]?.actor || fallbackActors[2],
      chain[3]?.actor || fallbackActors[3],
    ];
  } else if (chain.length === 3) {
    const thirdRole = chain[2]?.role || '';
    const isThirdCompliance = thirdRole.includes('انطباق') || thirdRole.includes('IMS');
    actors = isThirdCompliance
      ? [
          chain[0]?.actor || fallbackActors[0],
          chain[1]?.actor || fallbackActors[1],
          chain[2]?.actor || fallbackActors[2],
          fallbackActors[3],
        ]
      : [
          chain[0]?.actor || fallbackActors[0],
          chain[1]?.actor || fallbackActors[1],
          fallbackActors[2],
          chain[2]?.actor || fallbackActors[3],
        ];
  } else if (chain.length === 2) {
    const secondRole = chain[1]?.role || '';
    const isSecondCompliance = secondRole.includes('انطباق') || secondRole.includes('IMS');
    actors = isSecondCompliance
      ? [
          chain[0]?.actor || fallbackActors[0],
          fallbackActors[1],
          chain[1]?.actor || fallbackActors[2],
          fallbackActors[3],
        ]
      : [
          chain[0]?.actor || fallbackActors[0],
          fallbackActors[1],
          fallbackActors[2],
          chain[1]?.actor || fallbackActors[3],
        ];
  } else if (chain.length === 1) {
    actors = [
      chain[0]?.actor || fallbackActors[0],
      fallbackActors[1],
      fallbackActors[2],
      fallbackActors[3],
    ];
  } else {
    actors = [fallbackActors[0], fallbackActors[1], fallbackActors[2], fallbackActors[3]];
  }

  return CANONICAL_WORKFLOW_STEPS.map((step, idx) => ({
    step,
    actor: actors[idx],
    originalActor: actors[idx],
    replaced: false,
  }));
};

export const DocumentRevisionPage: React.FC<DocumentRevisionPageProps> = ({
  documents,
  revisions,
  users,
  onAddRevision,
  onUpdateRevision,
  onExtendDocument,
  onNavigate,
  onNotify,
}) => {
  const diffSectionRef = useRef<HTMLElement>(null);
  const periodicSectionRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const revisionFileInputRef = useRef<HTMLInputElement>(null);
  const sectionFileInputRef = useRef<HTMLInputElement>(null);

  const [tabFilter, setTabFilter] = useState<'all' | 'overdue' | 'moc' | 'capa'>('all');
  const [codeQuery, setCodeQuery] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [selectedDiffId, setSelectedDiffId] = useState<string>(revisions[0]?.id || 'rev-1');

  const [periodicFilter, setPeriodicFilter] = useState<'all' | 'expired' | 'soon' | 'valid'>('all');
  const [showIsoPolicyGuide, setShowIsoPolicyGuide] = useState(false);
  const [extensionModalState, setExtensionModalState] = useState<{
    open: boolean;
    doc: ImsDocument | null;
    revisionId?: string;
    years: number;
    checks: Record<string, boolean>;
    auditNote: string;
  }>({
    open: false,
    doc: null,
    years: 2,
    checks: {},
    auditNote: '',
  });

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedRevisionFile[]>([]);
  const [replaceOnApproval, setReplaceOnApproval] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummaryDraft, setEditedSummaryDraft] = useState('');

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        label: formatUserActor(u),
      })),
    [users]
  );

  const [workflowActors, setWorkflowActors] = useState<WorkflowStageActor[]>(() =>
    buildWorkflowFromDocument(documents[0], users)
  );
  const [slaDays, setSlaDays] = useState<3 | 5 | 10>(5);
  const [manualStepIndex, setManualStepIndex] = useState<number | null>(null);
  const [manualNameDraft, setManualNameDraft] = useState('');

  const [newForm, setNewForm] = useState(() => {
    const firstDoc = documents[0];
    return {
      code: firstDoc?.code || '',
      currentRevNum: firstDoc ? parseRevNumber(firstDoc.version) : 0,
      title: firstDoc?.title || '',
      dept: firstDoc?.unit || 'مدیریت بهره‌برداری',
      triggerCategory: 'moc' as RevisionItem['triggerCategory'],
      triggerRef: 'MOC-1403-45',
      reasonText: '',
    };
  });

  const selectedBaseDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId) || documents[0],
    [documents, selectedDocId]
  );

  const filteredDropdownDocs = useMemo(() => {
    const q = docSearchQuery.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.unit.toLowerCase().includes(q) ||
        d.management.toLowerCase().includes(q)
    );
  }, [documents, docSearchQuery]);

  const deptOptions = useMemo(() => {
    const set = new Set<string>([
      'مدیریت بهره‌برداری',
      'واحد HSE و آتش‌نشانی',
      'آزمایشگاه مرکزی',
      'حفاظت محیط زیست',
    ]);
    documents.forEach((d) => {
      if (d.unit) set.add(d.unit);
      if (d.management) set.add(d.management);
    });
    if (newForm.dept) set.add(newForm.dept);
    return Array.from(set);
  }, [documents, newForm.dept]);

  useEffect(() => {
    if (!docDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDocDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDocDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => searchInputRef.current?.focus(), 20);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [docDropdownOpen]);

  const handleSelectBaseDoc = (doc: ImsDocument) => {
    setSelectedDocId(doc.id);
    setNewForm((prev) => ({
      ...prev,
      code: doc.code,
      currentRevNum: parseRevNumber(doc.version),
      title: doc.title,
      dept: doc.unit || doc.management || prev.dept,
    }));
    setWorkflowActors(buildWorkflowFromDocument(doc, users));
    setManualStepIndex(null);
    setManualNameDraft('');
    setDocDropdownOpen(false);
    setDocSearchQuery('');
  };

  const detectFileType = (name: string): AttachedRevisionFile['type'] => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx') return 'docx';
    if (ext === 'xls' || ext === 'xlsx') return 'xlsx';
    if (ext === 'dwg') return 'dwg';
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} مگابایت`;
    }
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  };

  const addFilesToRevision = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added: AttachedRevisionFile[] = Array.from(fileList).map((file, idx) => ({
      id: `revfile-${Date.now()}-${idx}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: detectFileType(file.name),
      uploadedAt: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
    }));
    setAttachedFiles((prev) => [...prev, ...added]);
    onNotify(
      `${added.length.toLocaleString('fa-IR')} فایل تغییریافته پیوست شد`,
      'فایل‌های اصلاح‌شده پس از تایید نهایی آماده جایگزینی با ریویژن قبلی خواهند بود.',
      'success'
    );
  };

  const handleRevisionFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFilesToRevision(e.target.files);
    e.target.value = '';
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    addFilesToRevision(e.dataTransfer.files);
  };

  const handleRemoveAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSectionFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !activeDiff) return;
    const added: AttachedRevisionFile[] = Array.from(fileList).map((file, idx) => ({
      id: `revfile-${Date.now()}-${idx}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: detectFileType(file.name),
      uploadedAt: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
    }));
    const nextFiles = [...(activeDiff.attachedFiles || []), ...added];
    onUpdateRevision(activeDiff.id, {
      attachedFiles: nextFiles,
      replaceOnApproval: activeDiff.replaceOnApproval ?? true,
    });
    e.target.value = '';
    onNotify(
      `${added.length.toLocaleString('fa-IR')} فایل به درخواست بازنگری اضافه شد`,
      `فایل‌های تغییریافته برای ${activeDiff.code} ذخیره و در کارتابل تایید قابل مشاهده است.`,
      'success'
    );
  };

  const handleRemoveActiveDiffFile = (fileId: string) => {
    if (!activeDiff) return;
    const nextFiles = (activeDiff.attachedFiles || []).filter((f) => f.id !== fileId);
    onUpdateRevision(activeDiff.id, {
      attachedFiles: nextFiles.length > 0 ? nextFiles : undefined,
    });
    onNotify('فایل پیوست حذف شد', `فایل از لیست پیوست‌های ${activeDiff.code} حذف گردید.`, 'info');
  };

  const openNewRevisionModal = () => {
    const doc = selectedBaseDoc || documents[0];
    if (doc) {
      setSelectedDocId(doc.id);
      setNewForm((prev) => ({
        ...prev,
        code: doc.code,
        currentRevNum: parseRevNumber(doc.version),
        title: doc.title,
        dept: doc.unit || doc.management || prev.dept,
        reasonText: '',
      }));
      setWorkflowActors(buildWorkflowFromDocument(doc, users));
    }
    setManualStepIndex(null);
    setManualNameDraft('');
    setDocDropdownOpen(false);
    setDocSearchQuery('');
    setAttachedFiles([]);
    setReplaceOnApproval(true);
    setIsDragOver(false);
    setShowNewModal(true);
  };

  const filteredRevisions = useMemo(() => {
    return revisions.filter((r) => {
      if (tabFilter !== 'all' && r.triggerCategory !== tabFilter) return false;
      if (codeQuery && !r.code.toLowerCase().includes(codeQuery.toLowerCase()) && !r.title.includes(codeQuery)) return false;
      if (triggerFilter && r.triggerCategory !== triggerFilter) return false;
      if (deptFilter && r.dept !== deptFilter) return false;
      if (stateFilter && !r.workflowState.includes(stateFilter)) return false;
      return true;
    });
  }, [revisions, tabFilter, codeQuery, triggerFilter, deptFilter, stateFilter]);

  const activeDiff = useMemo(
    () => revisions.find((r) => r.id === selectedDiffId) || filteredRevisions[0] || revisions[0],
    [revisions, selectedDiffId, filteredRevisions]
  );

  const handleSelectDiff = (id: string) => {
    setSelectedDiffId(id);
    setIsEditingSummary(false);
    diffSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const startEditSummary = (rev: RevisionItem) => {
    setEditedSummaryDraft(rev.changeSummary || rev.newHighlight || '');
    setIsEditingSummary(true);
  };

  const handleSaveSummaryEdit = (rev: RevisionItem) => {
    const trimmed = editedSummaryDraft.trim();
    if (!trimmed) {
      onNotify('شرح تغییرات نمی‌تواند خالی باشد', 'لطفاً شرح خلاصه تغییرات پیشنهادی را وارد نمایید.', 'warning');
      return;
    }
    onUpdateRevision(rev.id, {
      changeSummary: trimmed,
      newHighlight: trimmed,
    });
    setIsEditingSummary(false);
    onNotify('شرح تغییرات پیشنهادی به‌روزرسانی شد', `توضیحات بازنگری ${rev.code} ذخیره گردید.`, 'success');
  };

  const todayDays = useMemo(() => parseJalaliToDays(CURRENT_JALALI_DATE) || 0, []);

  const periodicWatchlist = useMemo(() => {
    return documents
      .filter((d) => d.status !== 'منسوخ')
      .map((doc) => {
        const reviewDays = parseJalaliToDays(doc.reviewAt);
        const expiresDays = parseJalaliToDays(doc.expiresAt);
        const targetDays =
          reviewDays !== null && expiresDays !== null
            ? Math.min(reviewDays, expiresDays)
            : reviewDays ?? expiresDays ?? todayDays + 365;
        const deltaDays = targetDays - todayDays;
        const bucket: 'expired' | 'soon' | 'valid' =
          deltaDays <= 0 ? 'expired' : deltaDays <= REVIEW_WINDOW_DAYS ? 'soon' : 'valid';
        const isReviewWindowOpen = bucket === 'expired' || bucket === 'soon';
        const cycleYears = getDefaultCycleYears(doc.docTypeCode);
        return {
          doc,
          deltaDays,
          bucket,
          isReviewWindowOpen,
          cycleYears,
        };
      })
      .sort((a, b) => a.deltaDays - b.deltaDays);
  }, [documents, todayDays]);

  const expiredDocsCount = useMemo(
    () => periodicWatchlist.filter((item) => item.bucket === 'expired').length,
    [periodicWatchlist]
  );

  const soonDocsCount = useMemo(
    () => periodicWatchlist.filter((item) => item.bucket === 'soon').length,
    [periodicWatchlist]
  );

  const filteredWatchlist = useMemo(() => {
    if (periodicFilter === 'all') return periodicWatchlist;
    return periodicWatchlist.filter((item) => item.bucket === periodicFilter);
  }, [periodicWatchlist, periodicFilter]);

  const openPeriodicExtensionModal = (doc: ImsDocument, revisionId?: string) => {
    const reviewDays = parseJalaliToDays(doc.reviewAt);
    const expiresDays = parseJalaliToDays(doc.expiresAt);
    const targetDays =
      reviewDays !== null && expiresDays !== null
        ? Math.min(reviewDays, expiresDays)
        : reviewDays ?? expiresDays ?? todayDays + 365;
    const deltaDays = targetDays - todayDays;

    if (deltaDays > REVIEW_WINDOW_DAYS) {
      onNotify(
        'سند هنوز وارد پنجره بازنگری دوره‌ای نشده است',
        `طبق استاندارد کنترل مستندات ISO، تمدید اعتبار دوره‌ای از ${REVIEW_WINDOW_DAYS.toLocaleString('fa-IR')} روز پیش از سررسید (${(deltaDays - REVIEW_WINDOW_DAYS).toLocaleString('fa-IR')} روز دیگر) فعال می‌شود.`,
        'info'
      );
      return;
    }

    const defaultYears = getDefaultCycleYears(doc.docTypeCode);
    setExtensionModalState({
      open: true,
      doc,
      revisionId,
      years: defaultYears,
      checks: {
        'no-moc': false,
        'legal-iso': false,
        'no-capa': false,
        'meta-links': false,
      },
      auditNote: '',
    });
  };

  const openRevisionForDocument = (doc: ImsDocument) => {
    setSelectedDocId(doc.id);
    setNewForm((prev) => ({
      ...prev,
      code: doc.code,
      currentRevNum: parseRevNumber(doc.version),
      title: doc.title,
      dept: doc.unit || doc.management || prev.dept,
      triggerCategory: 'overdue',
      triggerRef: `سررسید بازنگری دوره‌ای (${doc.reviewAt})`,
      reasonText: `بازنگری دوره‌ای مستند ${doc.code} به دلیل فرا رسیدن تاریخ انقضا/سررسید (${doc.reviewAt}) و اعمال اصلاحات مورد نیاز.`,
    }));
    setWorkflowActors(buildWorkflowFromDocument(doc, users));
    setManualStepIndex(null);
    setManualNameDraft('');
    setAttachedFiles([]);
    setReplaceOnApproval(true);
    setShowNewModal(true);
  };

  const allCriteriaChecked = ISO_EXTENSION_CRITERIA.every((c) => Boolean(extensionModalState.checks[c.id]));

  const handleConfirmPeriodicExtension = (e: React.FormEvent) => {
    e.preventDefault();
    const targetDoc = extensionModalState.doc;
    if (!targetDoc) return;
    if (!allCriteriaChecked) {
      onNotify(
        'تایید شرایط استاندارد ISO الزامی است',
        'برای تمدید اعتبار بدون تغییر محتوا، باید هر ۴ شرط استاندارد بازنگری دوره‌ای بررسی و تایید شوند.',
        'warning'
      );
      return;
    }
    const nextReviewAt = addYearsToJalali(CURRENT_JALALI_DATE, extensionModalState.years);
    const nextExpiresAt = addYearsToJalali(CURRENT_JALALI_DATE, extensionModalState.years);
    if (onExtendDocument) {
      onExtendDocument(
        targetDoc.id,
        nextReviewAt,
        nextExpiresAt,
        extensionModalState.years,
        extensionModalState.auditNote,
        extensionModalState.revisionId
      );
    } else if (extensionModalState.revisionId) {
      onUpdateRevision(extensionModalState.revisionId, {
        progress: 100,
        workflowState: `تمدید اعتبار ${extensionModalState.years.toLocaleString('fa-IR')} ساله بدون تغییر (تایید ISO)`,
        overdueDays: undefined,
      });
    }
    setExtensionModalState({
      open: false,
      doc: null,
      years: 2,
      checks: {},
      auditNote: '',
    });
  };

  const handleExportMatrix = () => {
    exportToCsv(
      'apadana-revision-matrix.csv',
      ['کد فعلی', 'کد پیشنهادی', 'عنوان سند', 'نگارش فعلی', 'نگارش آتی', 'منشا بازنگری', 'واحد', 'مسئول', 'پیشرفت'],
      filteredRevisions.map((r) => [
        r.code,
        r.suggestedCode,
        r.title,
        r.currentRev,
        r.targetRev,
        r.triggerLabel,
        r.dept,
        r.owner,
        `${r.progress}%`,
      ])
    );
    onNotify('خروجی ماتریس تغییرات دریافت شد', `${filteredRevisions.length.toLocaleString('fa-IR')} ردیف بازنگری صادر گردید.`, 'success');
  };

  const handleCreateRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.code.trim() || !newForm.title.trim()) {
      onNotify('انتخاب مستند الزامی است', 'لطفاً یک سند را از لیست کشویی کد پایه سند انتخاب نمایید.', 'warning');
      return;
    }
    const baseCode = newForm.code.trim();
    const currStr = String(newForm.currentRevNum).padStart(2, '0');
    const nextStr = String(newForm.currentRevNum + 1).padStart(2, '0');
    const hasTrailingRevDigits = new RegExp(`-${currStr}$`).test(baseCode);
    const currentCode = baseCode;
    const nextCode = hasTrailingRevDigits
      ? baseCode.replace(/-\d{2}$/, `-${nextStr}`)
      : `${baseCode}-${nextStr}`;

    const triggerMap = {
      overdue: 'سررسید ادواری منقضی',
      moc: 'دگرگونی فرآیند (MOC)',
      capa: 'اقدام اصلاحی CAPA',
      iso: 'الزامات استاندارد ISO',
    };
    const replacedCount = workflowActors.filter((w) => w.replaced).length;
    const item: RevisionItem = {
      id: `rev-${Date.now()}`,
      code: currentCode,
      suggestedCode: nextCode,
      title: newForm.title.trim(),
      subtitle: `درخواست بازنگری جدید • ${newForm.dept}`,
      currentRev: `Rev ${currStr}`,
      targetRev: `Rev ${nextStr}`,
      triggerLabel: triggerMap[newForm.triggerCategory],
      triggerRef: newForm.triggerRef || 'ارجاع سیستمی IMS',
      triggerCategory: newForm.triggerCategory,
      dept: newForm.dept,
      owner: workflowActors[0]?.actor || 'مهندس مهران کاظمی',
      ownerRole: 'مدیر تضمین کیفیت و IMS',
      progress: 25,
      workflowState: 'مرحله ۱: تدوین اصلاحیه پیش‌نویس',
      diffSection: 'بخش ۱: دامنه تغییرات پیشنهادی',
      oldRevDate: selectedBaseDoc?.registeredAt || '۱۴۰۱/۰۸/۲۰',
      oldText: 'متن پیشین قبل از اعمال اصلاحیه فنی مطابق ویرایش مصوب قبلی:',
      oldHighlight: 'نیاز به بازبینی مطابق پارامترهای جدید بهره‌برداری',
      newTextPrefix: '',
      newHighlight: newForm.reasonText.trim() || 'به‌روزرسانی دستورالعمل بر اساس تغییرات مهندسی و الزامات ایمنی ۱۴۰۳',
      newTextSuffix: '',
      newNote:
        attachedFiles.length > 0
          ? `${attachedFiles.length.toLocaleString('fa-IR')} فایل سند تغییریافته پیوست شده و با زنجیره ۴ مرحله‌ای تایید ارسال گردید.${
              replacedCount > 0 ? ` (${replacedCount.toLocaleString('fa-IR')} فرد جایگزین به‌روزرسانی شد)` : ''
            }`
          : replacedCount > 0
          ? `ثبت‌شده از کارتابل بازنگری همراه با به‌روزرسانی ${replacedCount.toLocaleString('fa-IR')} نفر در زنجیره تایید.`
          : 'ثبت‌شده از طریق کارتابل درخواست بازنگری جدید.',
      changeSummary:
        newForm.reasonText.trim() || 'به‌روزرسانی و بازنگری سند مطابق درخواست تغییرات ثبت‌شده در کارتابل.',
      sourceDocId: selectedBaseDoc?.id,
      attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
      replaceOnApproval,
      workflowActors,
      slaDays,
    };
    onAddRevision(item);
    setSelectedDiffId(item.id);
    setAttachedFiles([]);
    setReplaceOnApproval(true);
    setShowNewModal(false);
    onNotify(
      'درخواست بازنگری جدید ثبت شد',
      `${item.code} (${item.currentRev}) → ${item.targetRev} با زنجیره تایید ۴ گامی به کارتابل بازنگری و جریان تایید ارسال گردید.`,
      'success'
    );
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onNavigate('dashboard')} className="hover:text-primary cursor-pointer">
            داشبورد سیستم مدیریت
          </button>
          <span>/</span>
          <button type="button" onClick={() => onNavigate('documents-list')} className="hover:text-primary cursor-pointer">
            مدیریت مستندات و سوابق
          </button>
          <span>/</span>
          <span className="font-bold text-primary">بازنگری مستندات و کنترل ویرایش</span>
        </div>
      </div>

      {/* Main Page Title Section */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 sm:p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)] text-center">
        <h1 className="text-lg sm:text-xl font-extrabold text-primary">
          کارتابل بازنگری دوره‌ای و اصلاحی مستندات IMS
        </h1>
      </section>

      {/* Actions Section */}
      <section className="bg-white rounded-2xl border border-border-hairline px-5 py-4 flex flex-wrap items-center justify-center gap-3 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openNewRevisionModal}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">post_add</span>
            ثبت درخواست بازنگری جدید
          </button>
          <button
            type="button"
            onClick={() => periodicSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-950 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined !text-[17px] text-warning-capa">event_repeat</span>
            پایش سررسید و مکانیزم تمدید دوره‌ای
            {(expiredDocsCount + soonDocsCount) > 0 && (
              <span className="font-label-code px-1.5 py-0.5 rounded-full bg-critical-hse text-white text-[10px]">
                {(expiredDocsCount + soonDocsCount).toLocaleString('fa-IR')}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowIsoPolicyGuide((v) => !v);
              periodicSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="px-4 py-2.5 rounded-xl border border-secondary/40 bg-sky-50/70 hover:bg-sky-100 text-xs font-bold text-secondary inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined !text-[17px]">policy</span>
            ضوابط استاندارد ISO بازنگری
          </button>
          <button
            type="button"
            onClick={handleExportMatrix}
            className="px-4 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">download</span>
            خروجی ماتریس تغییرات
          </button>
        </div>
      </section>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold text-primary">مستندات نیازمند بازنگری فوری</div>
              <div className="text-[11px] text-critical-hse mt-0.5">سررسید گذشته یا کمتر از ۳۰ روز</div>
            </div>
            <span className="w-9 h-9 rounded-full bg-red-50 text-critical-hse flex items-center justify-center">
              <span className="material-symbols-outlined !text-[19px]">alarm</span>
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="font-label-code text-2xl font-extrabold text-critical-hse">۱۴</span>
            <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-critical-hse">
              ۳ مورد بحرانی واحد متانول
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold text-primary">در حال بازنگری فعال</div>
              <div className="text-[11px] text-secondary mt-0.5">در چرخه تدوین، بازبینی و صحه‌گذاری</div>
            </div>
            <span className="w-9 h-9 rounded-full bg-sky-50 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[19px]">pending_actions</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-label-code text-2xl font-extrabold text-secondary">
              {(24 + revisions.length).toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-on-surface-variant">۹ مدرک در مرحله تایید نهایی</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold text-primary">بازنگری‌های تکمیل و مصوب</div>
              <div className="text-[11px] text-tertiary mt-0.5">در ۳ ماهه اخیر (توزیع شده در شبکه)</div>
            </div>
            <span className="w-9 h-9 rounded-full bg-emerald-50 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[19px]">verified</span>
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="font-label-code text-2xl font-extrabold text-tertiary">۵۳</span>
            <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-tertiary">
              ۱۰۰٪ با ثبت شناسه تغییرات
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-primary">نرخ تحقق برنامه بازنگری</div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">شاخص انطباق دوره زمانی دوساله</div>
            <div className="text-xs font-extrabold text-primary mt-2">هدف کیفی: ۹۵٪</div>
            <div className="text-[10.5px] text-outline">انحراف مجاز تحت پایش ممیزی</div>
          </div>
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#DDE3E8" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#142C43"
                strokeWidth="6"
                strokeDasharray="163.36"
                strokeDashoffset="9.8"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-label-code absolute text-xs font-extrabold text-primary">۹۴٪</span>
          </div>
        </div>
      </section>

      {/* Overdue Red Alert Banner */}
      <section className="rounded-2xl bg-red-50/90 border border-red-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-white text-critical-hse border border-red-200 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">notification_important</span>
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm font-extrabold text-red-950">
                اخطار انقضای دوره بازنگری ۵ مدرک عملیاتی واحد تولید متانول
              </h2>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-critical-hse text-white">
                مهلت بازنگری گذشته
              </span>
            </div>
            <p className="text-[11.5px] text-red-900/80 mt-1">
              طبق بند ۵-۷ استاندارد مدیریت کیفیت، دستورالعمل‌های عملیاتی بدون تاییدیه عدم تغییر یا ویرایش جدید، پس از تاریخ ۱۵ اردیبهشت از درجه اعتبار خارج تلقی خواهند شد.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onNotify(
              'یادداشت اخطار برای سرپرستان ارسال شد',
              'پیامک و اعلان سیستمی فوری به سرپرستان بهره‌برداری و HSE واحد متانول ابلاغ گردید.',
              'warning'
            )
          }
          className="px-4 py-2 rounded-xl bg-white hover:bg-red-100 border border-red-300 text-xs font-bold text-critical-hse shrink-0 cursor-pointer transition-colors"
        >
          ارسال یادداشت اخطار به سرپرستان واحد
        </button>
      </section>

      {/* Periodic Expiry Monitoring & ISO Review Policy Mechanism */}
      <section
        ref={periodicSectionRef}
        className="bg-white rounded-2xl border border-border-hairline overflow-hidden shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]"
      >
        <div className="p-4 sm:p-5 border-b border-border-hairline bg-surface-container-low/50 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-warning-capa flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">event_repeat</span>
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-primary flex flex-wrap items-center gap-2">
                  مکانیزم پایش سررسید، بازنگری دوره‌ای و تمدید اعتبار مستندات
                  {expiredDocsCount > 0 && (
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-critical-hse border border-red-200">
                      {expiredDocsCount.toLocaleString('fa-IR')} سند سررسید گذشته
                    </span>
                  )}
                  {soonDocsCount > 0 && (
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-warning-capa border border-amber-200">
                      {soonDocsCount.toLocaleString('fa-IR')} سند در آستانه انقضا
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  طبق رویه استاندارد ISO، پنجره مجاز بازنگری و تمدید اعتبار از{' '}
                  <strong className="text-primary">{REVIEW_WINDOW_DAYS.toLocaleString('fa-IR')} روز پیش از تاریخ سررسید/انقضا</strong>{' '}
                  (وضعیت زرد یا قرمز) روشن می‌شود تا از تمدید زودهنگام پیش از موعد جلوگیری گردد.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowIsoPolicyGuide((v) => !v)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showIsoPolicyGuide
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-white border-border-hairline text-secondary hover:bg-sky-50'
                }`}
              >
                <span className="material-symbols-outlined !text-[16px]">gavel</span>
                {showIsoPolicyGuide ? 'بستن ضوابط استاندارد ISO' : 'مشاهده شرایط استاندارد بازدیدها (ISO)'}
              </button>
            </div>
          </div>

          {/* ISO Standard Review Criteria Drawer */}
          {showIsoPolicyGuide && (
            <div className="rounded-2xl border border-sky-200 bg-white p-4 space-y-4 text-xs animate-modal-enter">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-hairline pb-2.5">
                <div className="font-extrabold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary !text-[19px]">verified_user</span>
                  ضوابط و شرایط استاندارد بازنگری دوره‌ای اطلاعات مدون (ISO 9001 • ISO 14001 • ISO 45001)
                </div>
                <span className="font-label-code text-[10.5px] px-2.5 py-0.5 rounded-full bg-sky-50 text-secondary font-bold">
                  Clause 7.5.3 & 8.1.3 (MOC)
                </span>
              </div>

              <div className="rounded-xl bg-sky-50/70 border border-sky-200 p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <span className="material-symbols-outlined !text-[18px] text-secondary">date_range</span>
                  قانون پنجره مجاز بازنگری دوره‌ای (Standard Review Window):
                </div>
                <span className="text-on-surface-variant">
                  شروع پنجره بررسی و تمدید از{' '}
                  <strong className="text-secondary">{REVIEW_WINDOW_DAYS.toLocaleString('fa-IR')} روز پیش از سررسید</strong> (هشدار زرد در ۶۰ روز مانده، وضعیت بحرانی قرمز پس از تاریخ سررسید) تا پیش از آن دکمه تمدید قفل است.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ISO_STANDARD_POLICIES.map((policy) => (
                  <div
                    key={policy.docGroup}
                    className="rounded-xl border border-border-hairline bg-surface-container-low/50 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-primary">{policy.docGroup}</span>
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-secondary font-bold text-[10.5px] shrink-0">
                        {policy.cycleLabel}
                      </span>
                    </div>
                    <div className="font-label-code text-[10.5px] text-tertiary font-bold">{policy.clause}</div>
                    <p className="text-[11px] text-on-surface-variant leading-5">{policy.rule}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 space-y-2">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined !text-[17px] text-warning-capa">checklist_rtl</span>
                  شرایط چهارگانه الزامی پیش از تمدید اعتبار بدون تغییر محتوا (یا الزام به تدوین ویرایش جدید):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ISO_EXTENSION_CRITERIA.map((c, idx) => (
                    <div key={c.id} className="bg-white rounded-lg border border-amber-100 px-3 py-2">
                      <div className="font-bold text-primary">
                        {(idx + 1).toLocaleString('fa-IR')}. {c.title}
                      </div>
                      <div className="text-[10.5px] text-on-surface-variant mt-0.5">{c.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filter Pills for Watchlist */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: `کل اسناد تحت پایش (${periodicWatchlist.length.toLocaleString('fa-IR')})` },
                { id: 'expired', label: `سررسید گذشته / منقضی (${expiredDocsCount.toLocaleString('fa-IR')})` },
                {
                  id: 'soon',
                  label: `پنجره بازنگری ≤ ${REVIEW_WINDOW_DAYS.toLocaleString('fa-IR')} روز (${soonDocsCount.toLocaleString('fa-IR')})`,
                },
                {
                  id: 'valid',
                  label: `دارای اعتبار (${(periodicWatchlist.length - expiredDocsCount - soonDocsCount).toLocaleString('fa-IR')})`,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPeriodicFilter(t.id as typeof periodicFilter)}
                  className={`px-3 py-1.5 rounded-full font-bold transition-colors cursor-pointer ${
                    periodicFilter === t.id
                      ? 'bg-primary text-white'
                      : 'bg-white border border-border-hairline text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-outline">
              تاریخ مبنای پایش سامانه: <strong className="font-label-code text-primary">{CURRENT_JALALI_DATE}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[980px] text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                <th className="py-2.5 px-4">کد و عنوان مستند</th>
                <th className="py-2.5 px-4">دوره استاندارد</th>
                <th className="py-2.5 px-4">تاریخ ثبت / سررسید بازنگری</th>
                <th className="py-2.5 px-4">وضعیت انقضا و بازنگری</th>
                <th className="py-2.5 px-4 text-center">اقدام بازنگری دوره‌ای</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70 text-xs">
              {filteredWatchlist.map(({ doc, deltaDays, bucket, isReviewWindowOpen, cycleYears }) => (
                <tr
                  key={doc.id}
                  className={`hover:bg-surface-container-low/50 transition-colors ${
                    bucket === 'expired' ? 'bg-red-50/35' : bucket === 'soon' ? 'bg-amber-50/25' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-label-code font-extrabold text-primary" dir="ltr">
                        {doc.code}
                      </span>
                      <span className="font-label-code px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-bold text-primary">
                        {doc.version}
                      </span>
                    </div>
                    <div className="font-semibold text-primary mt-0.5 line-clamp-1">{doc.title}</div>
                    <div className="text-[10.5px] text-on-surface-variant">{doc.unit} • مالک: {doc.owner}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-hairline font-bold text-primary text-[11px]">
                      {cycleYears.toLocaleString('fa-IR')} ساله ({doc.docTypeCode})
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-label-code text-[11px]">
                    <div className="text-on-surface-variant">ثبت: {doc.registeredAt}</div>
                    <div className="font-bold text-primary mt-0.5">سررسید بازنگری: {doc.reviewAt}</div>
                    <div className="text-outline">انقضا: {doc.expiresAt}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {bucket === 'expired' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-critical-hse border border-red-200 text-[11px] font-bold">
                        <span className="material-symbols-outlined !text-[14px]">error</span>
                        {Math.abs(deltaDays).toLocaleString('fa-IR')} روز گذشته از سررسید
                      </span>
                    ) : bucket === 'soon' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-warning-capa border border-amber-200 text-[11px] font-bold">
                        <span className="material-symbols-outlined !text-[14px]">schedule</span>
                        {deltaDays.toLocaleString('fa-IR')} روز مانده به بازنگری
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-tertiary border border-emerald-200 text-[11px] font-bold">
                        <span className="material-symbols-outlined !text-[14px]">verified</span>
                        معتبر ({deltaDays.toLocaleString('fa-IR')} روز باقی‌مانده)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        disabled={!isReviewWindowOpen}
                        onClick={() => openPeriodicExtensionModal(doc)}
                        title={
                          isReviewWindowOpen
                            ? 'باز شدن پنجره بررسی استاندارد و تمدید اعتبار'
                            : `فعال‌سازی از ${REVIEW_WINDOW_DAYS.toLocaleString('fa-IR')} روز پیش از سررسید (${(deltaDays - REVIEW_WINDOW_DAYS).toLocaleString('fa-IR')} روز دیگر)`
                        }
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 transition-colors ${
                          isReviewWindowOpen
                            ? 'bg-primary hover:bg-secondary text-white border-primary shadow-xs cursor-pointer'
                            : 'bg-surface-container-low text-outline border-border-hairline opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <span className="material-symbols-outlined !text-[15px]">
                          {isReviewWindowOpen ? 'fact_check' : 'lock_clock'}
                        </span>
                        بررسی دوره‌ای و تمدید اعتبار
                      </button>
                      {!isReviewWindowOpen && (
                        <span className="text-[10px] text-outline">
                          فعال در {(deltaDays - REVIEW_WINDOW_DAYS).toLocaleString('fa-IR')} روز آینده (پنجره ۶۰ روزه)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filter & Revision Table */}
      <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden">
        <div className="p-4 border-b border-border-hairline space-y-3 bg-surface-container-low/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">rule_folder</span>
              <h2 className="text-sm font-bold text-primary">کارتابل اقلام در گردش بازنگری مستندات</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-secondary">
                {filteredRevisions.length.toLocaleString('fa-IR')} سند فعال
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `همه موارد (${(24 + revisions.length).toLocaleString('fa-IR')})` },
                { id: 'overdue', label: 'سررسید گذشته (۱۴)' },
                { id: 'moc', label: 'ناشی از MOC (۷)' },
                { id: 'capa', label: 'ناشی از عدم انطباق CAPA (۵)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTabFilter(t.id as typeof tabFilter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    tabFilter === t.id
                      ? 'bg-primary text-white'
                      : 'bg-white border border-border-hairline text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="جستجوی کد سند یا عنوان (مثال: PR-MIS)..."
              className="px-3 py-2 rounded-xl border border-border-hairline bg-white text-xs focus:outline-none focus:border-secondary"
            />
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border-hairline bg-white text-xs text-primary focus:outline-none"
            >
              <option value="">منشا بازنگری (همه علل)</option>
              <option value="overdue">سررسید ادواری منقضی</option>
              <option value="moc">دگرگونی فرآیند (MOC)</option>
              <option value="capa">اقدام اصلاحی CAPA</option>
              <option value="iso">الزامات استاندارد ISO</option>
            </select>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border-hairline bg-white text-xs text-primary focus:outline-none"
            >
              <option value="">واحد سازمانی (همه دپارتمان‌ها)</option>
              <option value="واحد HSE و آتش‌نشانی">واحد HSE و آتش‌نشانی</option>
              <option value="مدیریت بهره‌برداری">مدیریت بهره‌برداری</option>
              <option value="آزمایشگاه مرکزی">آزمایشگاه مرکزی</option>
              <option value="حفاظت محیط زیست">حفاظت محیط زیست</option>
            </select>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border-hairline bg-white text-xs text-primary focus:outline-none"
            >
              <option value="">وضعیت جریان کار (همه)</option>
              <option value="مرحله ۱">مرحله ۱: تدوین اصلاحیه</option>
              <option value="مرحله ۲">مرحله ۲: بررسی فنی</option>
              <option value="مرحله ۳">مرحله ۳: تایید کمیته</option>
              <option value="مرحله ۴">مرحله ۴: آماده ابلاغ</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[1060px] text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                <th className="py-3 px-4">کد سند فعلی / جدید</th>
                <th className="py-3 px-4">عنوان سند و نگارش</th>
                <th className="py-3 px-4">منشا بازنگری</th>
                <th className="py-3 px-4">واحد و مسئول بازنگری</th>
                <th className="py-3 px-4">وضعیت پیشرفت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70 text-xs">
              {filteredRevisions.map((rev) => (
                <tr
                  key={rev.id}
                  className={`hover:bg-surface-container-low/60 transition-colors ${
                    activeDiff?.id === rev.id ? 'bg-sky-50/40' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-label-code font-extrabold text-primary">{rev.code}</div>
                    <div className="font-label-code text-[11px] text-secondary mt-0.5">
                      پیشنهاد: {rev.suggestedCode}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-primary">{rev.title}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded bg-surface-container text-primary">
                        {rev.currentRev} → {rev.targetRev}
                      </span>
                      {rev.attachedFiles && rev.attachedFiles.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-secondary border border-sky-200">
                          <span className="material-symbols-outlined !text-[13px]">attach_file</span>
                          {rev.attachedFiles.length.toLocaleString('fa-IR')} فایل تغییریافته
                        </span>
                      )}
                      {rev.replaceOnApproval && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                            rev.progress === 100
                              ? 'bg-emerald-50 text-tertiary border border-emerald-200'
                              : 'bg-amber-50 text-warning-capa border border-amber-200'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[13px]">
                            {rev.progress === 100 ? 'verified' : 'swap_horiz'}
                          </span>
                          {rev.progress === 100 ? 'جایگزین ریویژن قبلی شد' : 'جایگزینی خودکار پس از تایید'}
                        </span>
                      )}
                      <span className="text-[11px] text-on-surface-variant">{rev.subtitle}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                        rev.triggerCategory === 'overdue'
                          ? 'bg-red-50 text-critical-hse'
                          : rev.triggerCategory === 'moc'
                          ? 'bg-sky-50 text-secondary'
                          : rev.triggerCategory === 'capa'
                          ? 'bg-amber-50 text-warning-capa'
                          : 'bg-emerald-50 text-tertiary'
                      }`}
                    >
                      {rev.triggerLabel}
                    </span>
                    <div className="text-[10.5px] text-outline mt-1">{rev.triggerRef}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-bold text-primary">{rev.owner}</div>
                    <div className="text-[11px] text-on-surface-variant">{rev.dept}</div>
                  </td>
                  <td className="py-3.5 px-4 min-w-[200px]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-primary">{rev.workflowState}</span>
                      <span className="font-label-code font-bold text-secondary">
                        {rev.progress.toLocaleString('fa-IR')}٪
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-tertiary to-secondary rounded-full transition-all"
                        style={{ width: `${rev.progress}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onNavigate('documents-approval-workflow')}
                        className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-secondary text-white text-[11px] font-bold cursor-pointer"
                      >
                        فرم ویرایش سند
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDiff(rev.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-secondary text-secondary hover:bg-sky-50 text-[11px] font-bold cursor-pointer"
                      >
                        شرح تغییرات
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Revision Proposed Summary & Version Attachments */}
      {activeDiff && (
        <section
          ref={diffSectionRef}
          className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border-hairline pb-3">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">summarize</span>
                شرح تغییرات پیشنهادی و مستندات پیوست ویرایش
              </h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                خلاصه تغییرات ثبت‌شده هنگام درخواست بازنگری به‌همراه وضعیت نسخه مصوب فعلی و فایل‌های اصلاح‌شده
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label-code text-xs font-bold px-3 py-1 rounded-full bg-surface-container-low border border-border-hairline text-primary">
                {activeDiff.code} ({activeDiff.currentRev} → {activeDiff.targetRev})
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-secondary border border-sky-200">
                {activeDiff.triggerLabel}
              </span>
            </div>
          </div>

          {/* Revision Context Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-border-hairline bg-surface-container-low/60 px-3.5 py-2.5">
              <div className="text-[10.5px] text-outline">نگارش مصوب فعلی</div>
              <div className="font-bold text-primary mt-0.5 flex items-center gap-2">
                <span className="font-label-code">{activeDiff.currentRev}</span>
                <span className="text-[10.5px] font-normal text-on-surface-variant">({activeDiff.oldRevDate})</span>
              </div>
            </div>
            <div className="rounded-xl border border-border-hairline bg-surface-container-low/60 px-3.5 py-2.5">
              <div className="text-[10.5px] text-outline">نگارش و کد پیشنهادی</div>
              <div className="font-label-code font-bold text-secondary mt-0.5" dir="ltr">
                {activeDiff.suggestedCode} ({activeDiff.targetRev})
              </div>
            </div>
            <div className="rounded-xl border border-border-hairline bg-surface-container-low/60 px-3.5 py-2.5">
              <div className="text-[10.5px] text-outline">مسئول و واحد متولی</div>
              <div className="font-bold text-primary mt-0.5 truncate">
                {activeDiff.owner} • {activeDiff.dept}
              </div>
            </div>
            <div className="rounded-xl border border-border-hairline bg-surface-container-low/60 px-3.5 py-2.5">
              <div className="text-[10.5px] text-outline">مرجع و وضعیت جاری</div>
              <div className="font-bold text-primary mt-0.5 truncate">
                {activeDiff.triggerRef} ({activeDiff.progress.toLocaleString('fa-IR')}٪)
              </div>
            </div>
          </div>

          {/* Proposed Change Summary Card */}
          <div className="rounded-2xl border border-border-hairline bg-surface-container-low/40 p-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined !text-[18px] text-secondary">edit_note</span>
                شرح تغییرات پیشنهادی کارشناس
              </div>
              {!isEditingSummary ? (
                <button
                  type="button"
                  onClick={() => startEditSummary(activeDiff)}
                  className="px-2.5 py-1 rounded-lg border border-border-hairline bg-white hover:bg-surface-container-low text-[11px] font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined !text-[14px]">edit</span>
                  ویرایش / تکمیل شرح
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingSummary(false)}
                    className="px-2.5 py-1 rounded-lg border border-border-hairline bg-white text-[11px] font-semibold text-on-surface-variant cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSummaryEdit(activeDiff)}
                    className="px-3 py-1 rounded-lg bg-primary text-white text-[11px] font-bold cursor-pointer"
                  >
                    ذخیره شرح
                  </button>
                </div>
              )}
            </div>

            {isEditingSummary ? (
              <textarea
                rows={4}
                value={editedSummaryDraft}
                onChange={(e) => setEditedSummaryDraft(e.target.value)}
                placeholder="شرح کامل یا خلاصه سرفصل‌های تغییر در ویرایش جدید..."
                className="w-full p-3.5 rounded-xl border border-secondary bg-white text-xs text-primary leading-7 focus:outline-none"
              />
            ) : (
              <div className="p-4 rounded-xl bg-white border border-border-hairline leading-7 text-on-surface whitespace-pre-line">
                {activeDiff.changeSummary || activeDiff.newHighlight}
              </div>
            )}

            {activeDiff.newNote && (
              <div className="flex items-start gap-2 text-[11.5px] font-semibold text-tertiary px-1">
                <span className="material-symbols-outlined !text-[16px] shrink-0 mt-0.5">info</span>
                <span>{activeDiff.newNote}</span>
              </div>
            )}
          </div>

          {/* Attached Revised Files & Future File-Level Comparison Groundwork */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-3 text-xs">
            <input
              ref={sectionFileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xlsx,.xls,.dwg"
              onChange={handleSectionFilePick}
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[18px] text-secondary">folder_zip</span>
                اسناد تغییریافته پیوست‌شده ({(activeDiff.attachedFiles?.length || 0).toLocaleString('fa-IR')} مورد)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeDiff.replaceOnApproval && (
                  <span className="px-2.5 py-1 rounded-full bg-white border border-sky-200 text-[10.5px] font-bold text-secondary">
                    {activeDiff.progress === 100
                      ? 'تصویب نهایی انجام و جایگزین ریویژن قبلی شد'
                      : 'آماده جایگزینی با ریویژن قبلی پس از تایید نهایی'}
                  </span>
                )}
                {activeDiff.progress < 100 && (
                  <>
                    <button
                      type="button"
                      onClick={() => sectionFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-sky-100 text-secondary border border-secondary/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined !text-[15px]">upload_file</span>
                      افزودن فایل تغییریافته
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('documents-approval-workflow')}
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-secondary text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[14px]">fact_check</span>
                      رفتن به کارتابل تایید و جایگزینی
                    </button>
                  </>
                )}
              </div>
            </div>

            {activeDiff.attachedFiles && activeDiff.attachedFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeDiff.attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white border border-border-hairline"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-label-code uppercase px-2 py-0.5 rounded bg-sky-50 text-secondary font-bold text-[10px] shrink-0">
                        {file.type}
                      </span>
                      <span className="font-label-code font-semibold text-primary truncate" dir="ltr">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10.5px] text-outline">{file.size}</span>
                      {activeDiff.progress < 100 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveActiveDiffFile(file.id)}
                          className="p-1 rounded-md text-critical-hse hover:bg-red-50 cursor-pointer"
                          title="حذف فایل پیوست"
                        >
                          <span className="material-symbols-outlined !text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-white/80 border border-dashed border-sky-200 px-4 py-3 text-[11.5px] text-on-surface-variant flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined !text-[18px] text-secondary shrink-0">upload_file</span>
                  <span>
                    هنوز فایل تغییریافته‌ای برای این درخواست پیوست نشده است. می‌توانید فایل‌های نسخه اصلاح‌شده را همین‌جا اضافه کنید.
                  </span>
                </div>
                {activeDiff.progress < 100 && (
                  <button
                    type="button"
                    onClick={() => sectionFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-secondary border border-sky-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-[15px]">add</span>
                    انتخاب فایل
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* New Revision Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handleCreateRevision}
            className="animate-modal-enter w-full max-w-3xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-visible"
          >
            <div className="px-6 py-4 bg-primary text-white rounded-t-2xl flex items-center justify-between">
              <h3 className="text-sm font-bold">ثبت درخواست بازنگری و ویرایش جدید</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div
              className={`p-6 space-y-4 text-xs ${
                docDropdownOpen ? 'overflow-visible' : 'max-h-[75vh] overflow-y-auto custom-scrollbar'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                {/* Searchable Base Document Code Dropdown */}
                <div className="sm:col-span-7 relative" ref={dropdownRef}>
                  <label className="block font-bold text-primary mb-1.5">
                    کد پایه سند (انتخاب از فهرست مستندات) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setDocDropdownOpen((v) => !v)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-right flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      docDropdownOpen
                        ? 'border-secondary bg-white ring-2 ring-secondary/15'
                        : 'border-border-hairline bg-surface-container-low hover:border-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined !text-[17px] text-secondary shrink-0">
                        description
                      </span>
                      {newForm.code ? (
                        <span className="font-label-code font-extrabold text-primary truncate" dir="ltr">
                          {newForm.code}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">انتخاب کد مدرک...</span>
                      )}
                      {selectedBaseDoc && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 font-label-code text-[10px] font-bold text-secondary shrink-0">
                          {selectedBaseDoc.version}
                        </span>
                      )}
                    </div>
                    <span
                      className={`material-symbols-outlined !text-[18px] text-on-surface-variant transition-transform shrink-0 ${
                        docDropdownOpen ? 'rotate-180 text-secondary' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  {docDropdownOpen && (
                    <div className="absolute z-40 top-full right-0 left-0 mt-1.5 bg-white rounded-xl border border-border-hairline shadow-[0px_18px_40px_-8px_rgba(20,44,67,0.22)] overflow-hidden animate-modal-enter">
                      {/* Search Bar */}
                      <div className="p-2.5 border-b border-border-hairline bg-surface-container-low/70">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-border-hairline focus-within:border-secondary">
                          <span className="material-symbols-outlined !text-[17px] text-outline">search</span>
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={docSearchQuery}
                            onChange={(e) => setDocSearchQuery(e.target.value)}
                            placeholder="جستجو بر اساس کد مدرک، عنوان یا واحد..."
                            className="w-full bg-transparent text-xs text-primary placeholder:text-outline focus:outline-none"
                          />
                          {docSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setDocSearchQuery('')}
                              className="text-outline hover:text-primary cursor-pointer"
                            >
                              <span className="material-symbols-outlined !text-[15px]">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-border-hairline/50">
                        {filteredDropdownDocs.length === 0 ? (
                          <div className="py-6 px-4 text-center text-[11px] text-on-surface-variant">
                            موردی با عبارت «{docSearchQuery}» در فهرست مستندات یافت نشد.
                          </div>
                        ) : (
                          filteredDropdownDocs.map((doc) => {
                            const isSelected = selectedBaseDoc?.id === doc.id;
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => handleSelectBaseDoc(doc)}
                                className={`w-full text-right px-3.5 py-2.5 transition-colors cursor-pointer flex items-start justify-between gap-2.5 ${
                                  isSelected ? 'bg-secondary-container/35' : 'hover:bg-surface-container-low'
                                }`}
                              >
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-label-code font-extrabold text-primary text-xs" dir="ltr">
                                      {doc.code}
                                    </span>
                                    <span className="font-label-code px-1.5 py-0.5 rounded bg-sky-50 text-secondary border border-sky-200 text-[10px] font-bold">
                                      {doc.version}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        doc.status === 'مصوب'
                                          ? 'bg-emerald-50 text-tertiary'
                                          : doc.status === 'منسوخ'
                                          ? 'bg-red-50 text-critical-hse'
                                          : 'bg-amber-50 text-warning-capa'
                                      }`}
                                    >
                                      {doc.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-semibold text-primary line-clamp-1">
                                    {doc.title}
                                  </div>
                                  <div className="text-[10px] text-on-surface-variant">{doc.unit}</div>
                                </div>
                                {isSelected && (
                                  <span className="material-symbols-outlined !text-[18px] text-tertiary shrink-0 mt-0.5">
                                    check_circle
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-loaded Current Revision & Calculated Next Revision */}
                <div className="sm:col-span-5">
                  <label className="block font-bold text-primary mb-1.5">نگارش فعلی و آتی (خودکار)</label>
                  <div className="px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low flex items-center justify-between gap-2">
                    <span className="font-label-code px-2 py-0.5 rounded-md bg-white border border-border-hairline font-bold text-on-surface-variant">
                      Rev {String(newForm.currentRevNum).padStart(2, '0')}
                    </span>
                    <span className="material-symbols-outlined !text-[16px] text-secondary">arrow_back</span>
                    <span className="font-label-code px-2.5 py-0.5 rounded-md bg-secondary text-white font-extrabold">
                      Rev {String(newForm.currentRevNum + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-primary">عنوان مستند (خوانده‌شده از فهرست مستندات)</label>
                  <span className="text-[10.5px] font-bold text-tertiary inline-flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[14px]">sync</span>
                    بارگذاری خودکار
                  </span>
                </div>
                <input
                  type="text"
                  value={newForm.title}
                  readOnly
                  placeholder="پس از انتخاب کد پایه سند، عنوان به‌صورت خودکار درج می‌شود..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-primary font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1.5">منشا بازنگری</label>
                  <select
                    value={newForm.triggerCategory}
                    onChange={(e) =>
                      setNewForm({ ...newForm, triggerCategory: e.target.value as RevisionItem['triggerCategory'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low"
                  >
                    <option value="moc">دگرگونی فرآیند (MOC)</option>
                    <option value="capa">اقدام اصلاحی CAPA</option>
                    <option value="overdue">سررسید ادواری</option>
                    <option value="iso">الزامات استاندارد ISO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1.5">واحد متولی</label>
                  <select
                    value={newForm.dept}
                    onChange={(e) => setNewForm({ ...newForm, dept: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low"
                  >
                    {deptOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1.5">شرح تغییرات پیشنهادی</label>
                <textarea
                  rows={3}
                  value={newForm.reasonText}
                  onChange={(e) => setNewForm({ ...newForm, reasonText: e.target.value })}
                  placeholder="خلاصه تغییرات مورد نیاز در ویرایش جدید..."
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline focus:outline-none focus:border-secondary"
                />
              </div>

              {/* 4-Step Approval Workflow Chain (inherited from base document with replacement option) */}
              <div className="pt-3 border-t border-border-hairline space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-[18px] text-secondary">account_tree</span>
                      پیکربندی زنجیره تایید ۴ گامی (بارگذاری‌شده از فرمت اولیه سند)
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      افراد ثبت‌شده در شناسنامه اولیه به‌صورت خودکار وارد شده‌اند؛ در صورت خروج فرد از مجتمع می‌توانید نفر جایگزین را انتخاب یا نام جدید وارد نمایید.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-on-surface-variant">سقف SLA:</span>
                    <select
                      value={slaDays}
                      onChange={(e) => setSlaDays(Number(e.target.value) as 3 | 5 | 10)}
                      className="px-2.5 py-1 rounded-lg border border-border-hairline bg-surface-container-low text-[11px] font-bold text-primary"
                    >
                      <option value={3}>۳ روز کاری</option>
                      <option value={5}>۵ روز کاری</option>
                      <option value={10}>۱۰ روز کاری</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {workflowActors.map((item, idx) => {
                    const isChanged = Boolean(item.originalActor && item.actor !== item.originalActor);
                    const isInUserOptions = userOptions.some((opt) => opt.label === item.actor);
                    const isOrigInUserOptions = item.originalActor
                      ? userOptions.some((opt) => opt.label === item.originalActor)
                      : true;
                    const isManualOpen = manualStepIndex === idx;

                    return (
                      <div
                        key={item.step}
                        className={`p-3 rounded-xl border space-y-2 transition-colors ${
                          isChanged
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-surface-container-low border-border-hairline'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-bold text-secondary">{item.step}</span>
                          <div className="flex items-center gap-1">
                            {isChanged ? (
                              <>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-warning-capa">
                                  جایگزین شده
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...workflowActors];
                                    next[idx] = {
                                      ...next[idx],
                                      actor: next[idx].originalActor || next[idx].actor,
                                      replaced: false,
                                    };
                                    setWorkflowActors(next);
                                    if (manualStepIndex === idx) {
                                      setManualStepIndex(null);
                                      setManualNameDraft('');
                                    }
                                  }}
                                  className="text-[10px] font-bold text-secondary hover:underline cursor-pointer"
                                  title="بازگردانی به نفر ثبت‌شده در فرمت اولیه"
                                >
                                  بازگردانی
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-tertiary border border-emerald-200">
                                از فرمت اولیه
                              </span>
                            )}
                          </div>
                        </div>

                        {!isManualOpen ? (
                          <div className="space-y-1.5">
                            <select
                              value={item.actor}
                              onChange={(e) => {
                                if (e.target.value === '__MANUAL__') {
                                  setManualStepIndex(idx);
                                  setManualNameDraft('');
                                  return;
                                }
                                const nextVal = e.target.value;
                                const next = [...workflowActors];
                                next[idx] = {
                                  ...next[idx],
                                  actor: nextVal,
                                  replaced: Boolean(next[idx].originalActor && nextVal !== next[idx].originalActor),
                                };
                                setWorkflowActors(next);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-border-hairline bg-white text-[11px] font-semibold text-primary focus:outline-none focus:border-secondary cursor-pointer"
                            >
                              {item.originalActor && !isOrigInUserOptions && (
                                <option value={item.originalActor}>
                                  {item.originalActor} (ثبت‌شده در فرمت اولیه)
                                </option>
                              )}
                              {!isInUserOptions && item.actor !== item.originalActor && (
                                <option value={item.actor}>
                                  {item.actor} (جایگزین جدید)
                                </option>
                              )}
                              {userOptions.map((opt) => (
                                <option key={opt.id} value={opt.label}>
                                  {opt.label}
                                </option>
                              ))}
                              <option value="__MANUAL__">+ درج دستی نام فرد جدید (خارج از لیست)...</option>
                            </select>

                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              {isChanged && item.originalActor ? (
                                <span className="text-on-surface-variant truncate" title={item.originalActor}>
                                  فرد قبلی: <span className="line-through">{item.originalActor}</span>
                                </span>
                              ) : (
                                <span className="text-outline">منطبق با چرخه اولیه سند</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setManualStepIndex(idx);
                                  setManualNameDraft('');
                                }}
                                className="text-secondary hover:underline font-bold inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                              >
                                <span className="material-symbols-outlined !text-[13px]">person_edit</span>
                                تغییر / نام جدید
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={manualNameDraft}
                              onChange={(e) => setManualNameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const trimmed = manualNameDraft.trim();
                                  if (!trimmed) return;
                                  const next = [...workflowActors];
                                  next[idx] = {
                                    ...next[idx],
                                    actor: trimmed,
                                    replaced: Boolean(next[idx].originalActor && trimmed !== next[idx].originalActor),
                                  };
                                  setWorkflowActors(next);
                                  setManualStepIndex(null);
                                  setManualNameDraft('');
                                }
                              }}
                              placeholder="نام و سمت فرد جدید (مثلاً: مهندس فرهاد شریفی - رئیس واحد)"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-secondary bg-white text-[11px] font-semibold text-primary focus:outline-none"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setManualStepIndex(null);
                                  setManualNameDraft('');
                                }}
                                className="px-2 py-1 rounded-md border border-border-hairline bg-white text-[10.5px] font-semibold text-on-surface-variant cursor-pointer"
                              >
                                انصراف
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = manualNameDraft.trim();
                                  if (!trimmed) {
                                    onNotify('نام فرد جدید را وارد کنید', 'لطفاً نام و سمت فرد جایگزین را بنویسید.', 'warning');
                                    return;
                                  }
                                  const next = [...workflowActors];
                                  next[idx] = {
                                    ...next[idx],
                                    actor: trimmed,
                                    replaced: Boolean(next[idx].originalActor && trimmed !== next[idx].originalActor),
                                  };
                                  setWorkflowActors(next);
                                  setManualStepIndex(null);
                                  setManualNameDraft('');
                                }}
                                className="px-2.5 py-1 rounded-md bg-primary text-white text-[10.5px] font-bold cursor-pointer"
                              >
                                ثبت فرد جایگزین
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modified / Revised Document Files Upload Section */}
              <div className="pt-3 border-t border-border-hairline space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined !text-[18px] text-secondary">upload_file</span>
                    بارگذاری اسناد تغییریافته (نسخه پیشنهادی {`Rev ${String(newForm.currentRevNum + 1).padStart(2, '0')}`})
                  </label>
                  <span className="text-[10.5px] text-outline">فرمت‌های مجاز: PDF، DOCX، XLSX، DWG</span>
                </div>

                <input
                  ref={revisionFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.dwg"
                  onChange={handleRevisionFilePick}
                  className="hidden"
                />

                <div
                  onClick={() => revisionFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDropFiles}
                  className={`rounded-2xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
                    isDragOver
                      ? 'border-secondary bg-sky-50/70'
                      : 'border-border-hairline bg-surface-container-low/70 hover:border-secondary hover:bg-sky-50/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-border-hairline text-secondary mx-auto flex items-center justify-center mb-2 shadow-xs">
                    <span className="material-symbols-outlined !text-[21px]">cloud_upload</span>
                  </div>
                  <div className="font-bold text-primary">
                    فایل‌های اصلاح‌شده سند را اینجا رها کنید یا برای انتخاب کلیک نمایید
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-1">
                    این فایل‌ها در کارتابل تصویب و ابلاغ بررسی شده و پس از تایید نهایی جایگزین ریویژن فعلی می‌شوند.
                  </div>
                </div>

                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-primary">
                      فایل‌های آماده پیوست ({attachedFiles.length.toLocaleString('fa-IR')} مورد):
                    </div>
                    <div className="space-y-1.5">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-container-low border border-border-hairline"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-label-code uppercase px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-secondary font-bold text-[10px] shrink-0">
                              {file.type}
                            </span>
                            <span className="font-label-code font-semibold text-primary truncate" dir="ltr">
                              {file.name}
                            </span>
                            <span className="text-[10.5px] text-outline shrink-0">({file.size})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachedFile(file.id)}
                            className="p-1 rounded-lg text-critical-hse hover:bg-red-50 cursor-pointer shrink-0"
                            title="حذف فایل"
                          >
                            <span className="material-symbols-outlined !text-[16px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceOnApproval}
                    onChange={(e) => setReplaceOnApproval(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-tertiary rounded shrink-0"
                  />
                  <div className="space-y-0.5">
                    <div className="font-bold text-primary">
                      جایگزینی خودکار با ریویژن قبلی در فهرست مستندات پس از تایید نهایی
                    </div>
                    <div className="text-[11px] text-on-surface-variant leading-5">
                      با اتمام فرآیند تصویب در کارتابل گردش کار، فایل‌های جدید جایگزین{' '}
                      <span className="font-label-code font-bold text-primary">
                        Rev {String(newForm.currentRevNum).padStart(2, '0')}
                      </span>{' '}
                      شده و نسخه پیشین به‌صورت خودکار به مخزن اسناد منسوخ منتقل می‌گردد.
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline rounded-b-2xl flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl border border-border-hairline text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer">
                ثبت درخواست بازنگری
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Dedicated Periodic Review & ISO Validity Extension Modal */}
      {extensionModalState.open && extensionModalState.doc && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handleConfirmPeriodicExtension}
            className="animate-modal-enter w-full max-w-2xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">event_repeat</span>
                <div>
                  <h3 className="text-sm font-bold">مکانیزم بررسی دوره‌ای و تمدید اعتبار مستند (طبق استاندارد ISO)</h3>
                  <div className="font-label-code text-[11px] text-primary-fixed mt-0.5" dir="ltr">
                    {extensionModalState.doc.code} • {extensionModalState.doc.version}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtensionModalState((prev) => ({ ...prev, open: false }))}
                className="cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Document Summary */}
              <div className="rounded-xl border border-border-hairline bg-surface-container-low p-3.5 space-y-1.5">
                <div className="font-bold text-primary text-[13px]">{extensionModalState.doc.title}</div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-on-surface-variant">
                  <span>ثبت/بازنگری قبلی: <strong className="font-label-code text-primary">{extensionModalState.doc.registeredAt}</strong></span>
                  <span>سررسید فعلی: <strong className="font-label-code text-critical-hse">{extensionModalState.doc.reviewAt}</strong></span>
                  <span>انقضای فعلی: <strong className="font-label-code text-primary">{extensionModalState.doc.expiresAt}</strong></span>
                </div>
              </div>

              {/* Selectable Extension Period (NOT locked to 2 years) */}
              <div className="space-y-2">
                <label className="block font-bold text-primary">
                  انتخاب دوره تمدید اعتبار جدید (مطابق سطح ریسک و نوع سند)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { years: 1, title: '۱ ساله (۱۲ ماهه)', subtitle: 'عملیات پرریسک HSE' },
                    { years: 2, title: '۲ ساله (۲۴ ماهه)', subtitle: 'استاندارد SOP / WI / FRM' },
                    { years: 3, title: '۳ ساله (۳۶ ماهه)', subtitle: 'خط‌مشی و نظامنامه' },
                    { years: 5, title: '۵ ساله (۶۰ ماهه)', subtitle: 'اسناد مرجع بلندمدت' },
                  ].map((opt) => (
                    <button
                      key={opt.years}
                      type="button"
                      onClick={() => setExtensionModalState((prev) => ({ ...prev, years: opt.years }))}
                      className={`p-2.5 rounded-xl border text-right transition-colors cursor-pointer ${
                        extensionModalState.years === opt.years
                          ? 'border-secondary bg-sky-50/70 ring-2 ring-secondary/15'
                          : 'border-border-hairline bg-white hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="font-extrabold text-primary">{opt.title}</div>
                      <div className="text-[10px] text-on-surface-variant mt-0.5">{opt.subtitle}</div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-[11px]">
                  <span className="text-primary font-semibold">تاریخ سررسید و انقضای محاسبه‌شده جدید:</span>
                  <span className="font-label-code font-extrabold text-tertiary">
                    {addYearsToJalali(CURRENT_JALALI_DATE, extensionModalState.years)}
                  </span>
                </div>
              </div>

              {/* Mandatory ISO Conditions Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-primary">
                    احراز شرایط چهارگانه استاندارد ISO برای تمدید بدون ویرایش *
                  </label>
                  <span className="text-[10.5px] font-bold text-secondary">
                    {Object.values(extensionModalState.checks).filter(Boolean).length.toLocaleString('fa-IR')} از ۴ شرط تایید شده
                  </span>
                </div>
                <div className="space-y-2">
                  {ISO_EXTENSION_CRITERIA.map((criterion) => {
                    const checked = Boolean(extensionModalState.checks[criterion.id]);
                    return (
                      <label
                        key={criterion.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-white border-border-hairline hover:bg-surface-container-low/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setExtensionModalState((prev) => ({
                              ...prev,
                              checks: { ...prev.checks, [criterion.id]: e.target.checked },
                            }))
                          }
                          className="w-4 h-4 mt-0.5 accent-tertiary rounded shrink-0"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-bold text-primary">{criterion.title}</span>
                            <span className="font-label-code text-[10px] font-bold text-secondary">
                              {criterion.clause}
                            </span>
                          </div>
                          <div className="text-[11px] text-on-surface-variant leading-5">{criterion.detail}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Redirect Hint if Conditions Are Not Met */}
              {!allCriteriaChecked && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-amber-950 font-semibold">
                    در صورتی که هر یک از شروط فوق برقرار نیست، سند نباید تمدید شود و باید درخواست ویرایش جدید ثبت گردد:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const target = extensionModalState.doc;
                      setExtensionModalState((prev) => ({ ...prev, open: false }));
                      if (target) openRevisionForDocument(target);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-[14px]">edit_document</span>
                    ایجاد درخواست ویرایش جدید
                  </button>
                </div>
              )}

              <div>
                <label className="block font-bold text-primary mb-1.5">
                  صورت‌جلسه / یادداشت کارشناس بازدید دوره‌ای (ثبت در تاریخچه سند)
                </label>
                <textarea
                  rows={2}
                  value={extensionModalState.auditNote}
                  onChange={(e) =>
                    setExtensionModalState((prev) => ({ ...prev, auditNote: e.target.value }))
                  }
                  placeholder="مثال: بازدید فنی با حضور سرپرست بهره‌برداری انجام و انطباق کامل با خط‌مشی و تجهیزات جاری تایید گردید..."
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setExtensionModalState((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!allCriteriaChecked}
                className={`px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                  allCriteriaChecked
                    ? 'bg-tertiary hover:bg-primary text-white cursor-pointer'
                    : 'bg-surface-container text-outline cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined !text-[16px]">verified</span>
                تایید عدم تغییر و تمدید {extensionModalState.years.toLocaleString('fa-IR')} ساله اعتبار
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
