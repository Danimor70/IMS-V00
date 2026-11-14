import React, { useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { METHANOL_PLANT_IMG } from '../data/imsData';
import { RouteId, UserAccount, WorkflowDoc, WorkflowReferralEntry } from '../types/ims';

interface ApprovalWorkflowPageProps {
  workflowDocs: WorkflowDoc[];
  users?: UserAccount[];
  onUpdateWorkflowDoc: (id: string, patch: Partial<WorkflowDoc>) => void;
  onPromoteRevision?: (doc: WorkflowDoc) => void;
  onCeoFinalApprove?: (doc: WorkflowDoc) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const resolveRequestType = (doc: WorkflowDoc): 'new' | 'revision' => {
  if (doc.requestType) return doc.requestType;
  if (doc.revisionId || doc.targetRev || doc.version.includes('بازنگری') || doc.version.includes('اصلاحیه')) {
    return 'revision';
  }
  return /Rev\s*00\b/i.test(doc.version) ? 'new' : 'revision';
};

const REFERRAL_ACTIONS: WorkflowReferralEntry['actionType'][] = [
  'بررسی و اعلام نظر تخصصی',
  'اصلاح و تکمیل فنی',
  'بازبینی انطباق و HSE',
  'اقدام و تایید جایگزین',
];

export const ApprovalWorkflowPage: React.FC<ApprovalWorkflowPageProps> = ({
  workflowDocs,
  users = [],
  onUpdateWorkflowDoc,
  onPromoteRevision,
  onCeoFinalApprove,
  onNavigate,
  onNotify,
}) => {
  const inspectionRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'my-inbox' | 'referred' | 'approved' | 'all'>('my-inbox');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'new' | 'revision'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(workflowDocs[0]?.id || 'wf-1');
  const [zoom, setZoom] = useState(100);
  const [showFullscreenPdf, setShowFullscreenPdf] = useState(false);
  const [showPrevCompare, setShowPrevCompare] = useState(false);

  const [reviewComment, setReviewComment] = useState('');
  const [attachProfile, setAttachProfile] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  const userDirectory = useMemo(() => {
    const base = users.map((u) => `${u.honorific ? u.honorific + ' ' : ''}${u.firstName} ${u.lastName} (${u.roleTitle})`);
    return base.length > 0
      ? base
      : [
          'مهندس علی رضوانی (رئیس واحد بهره‌برداری متانول)',
          'مهندس حمید دهداری (رئیس ایمنی و HSE)',
          'مهندس سارا نیک‌پی (رئیس مهندسی فرآیند)',
          'دکتر آرش پارسا (رئیس آزمایشگاه مرکزی)',
          'مهندس نیما شریفی (کارشناس حفاظت محیط زیست)',
        ];
  }, [users]);

  const [referralAssignee, setReferralAssignee] = useState<string>(() => userDirectory[0] || '');
  const [referralCustomAssignee, setReferralCustomAssignee] = useState('');
  const [referralActionType, setReferralActionType] = useState<WorkflowReferralEntry['actionType']>(
    'بررسی و اعلام نظر تخصصی'
  );
  const [referralNote, setReferralNote] = useState('');
  const [transferOwnershipOnRefer, setTransferOwnershipOnRefer] = useState(true);

  const [ccCandidate, setCcCandidate] = useState<string>(() => userDirectory[1] || userDirectory[0] || '');
  const [ccCustomRecipient, setCcCustomRecipient] = useState('');

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    action: 'approve' | 'return' | 'reject';
  }>({ open: false, action: 'approve' });

  const myInboxCount = workflowDocs.filter((d) => d.tabGroup === 'my-inbox').length;
  const referredCount = workflowDocs.filter((d) => d.tabGroup === 'referred').length;

  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return workflowDocs.filter((d) => {
      if (activeTab !== 'all' && d.tabGroup !== activeTab) return false;
      if (
        q &&
        !d.code.toLowerCase().includes(q) &&
        !d.title.toLowerCase().includes(q) &&
        !d.processOwner.toLowerCase().includes(q) &&
        !d.currentActor.toLowerCase().includes(q) &&
        !d.standards.some((s) => s.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [workflowDocs, activeTab, searchQuery]);

  const newRequestCount = useMemo(
    () => filteredQueue.filter((d) => resolveRequestType(d) === 'new').length,
    [filteredQueue]
  );

  const revisionRequestCount = useMemo(
    () => filteredQueue.filter((d) => resolveRequestType(d) === 'revision').length,
    [filteredQueue]
  );

  const displayedQueue = useMemo(() => {
    if (requestTypeFilter === 'all') return filteredQueue;
    return filteredQueue.filter((d) => resolveRequestType(d) === requestTypeFilter);
  }, [filteredQueue, requestTypeFilter]);

  const activeDoc = useMemo(
    () => workflowDocs.find((d) => d.id === selectedId) || displayedQueue[0] || filteredQueue[0] || workflowDocs[0],
    [workflowDocs, selectedId, displayedQueue, filteredQueue]
  );

  const handleSaveCommentOnly = () => {
    if (!activeDoc) return;
    const text = reviewComment.trim();
    if (!text) {
      onNotify('متن یادداشت خالی است', 'لطفاً ابتدا نظر یا یادداشت خود را در کادر مربوطه وارد نمایید.', 'warning');
      return;
    }
    const currentCc = activeDoc.ccList || [];
    const ccSuffix = currentCc.length > 0 ? ` [رونوشت به: ${currentCc.join('، ')}]` : '';
    onUpdateWorkflowDoc(activeDoc.id, {
      history: [
        {
          actor: 'مهندس مهران کاظمی',
          role: 'مدیر تضمین کیفیت و IMS',
          date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
          note: `${text}${ccSuffix}`,
          type: 'comment',
        },
        ...activeDoc.history,
      ],
    });
    setReviewComment('');
    onNotify('یادداشت در سوابق سند ثبت شد', `نظر تخصصی شما برای ${activeDoc.code} بدون تغییر مرحله ذخیره گردید.`, 'success');
  };

  const handleAddReferral = () => {
    if (!activeDoc) return;
    const targetPerson =
      referralAssignee === '__CUSTOM__' ? referralCustomAssignee.trim() : referralAssignee.trim();
    if (!targetPerson) {
      onNotify('گیرنده ارجاع مشخص نشده است', 'لطفاً فرد یا واحد دریافت‌کننده ارجاع را انتخاب یا وارد نمایید.', 'warning');
      return;
    }

    const noteText = referralNote.trim() || reviewComment.trim();
    const newEntry: WorkflowReferralEntry = {
      id: `ref-${Date.now()}`,
      assignee: targetPerson,
      actionType: referralActionType,
      note: noteText || undefined,
      date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
      status: 'در انتظار اقدام',
    };

    const nextReferrals = [newEntry, ...(activeDoc.referrals || [])];
    onUpdateWorkflowDoc(activeDoc.id, {
      referrals: nextReferrals,
      ...(transferOwnershipOnRefer
        ? {
            currentActor: targetPerson,
            stageLabel: `ارجاع‌شده: ${referralActionType}`,
            tabGroup: 'referred',
          }
        : {}),
      history: [
        {
          actor: 'مهندس مهران کاظمی',
          role: 'مدیر تضمین کیفیت و IMS',
          date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
          note: `ارجاع به «${targetPerson}» جهت ${referralActionType}${noteText ? ` — ${noteText}` : ''}`,
          type: 'referred',
        },
        ...activeDoc.history,
      ],
    });

    setReferralNote('');
    setReferralCustomAssignee('');
    if (referralAssignee === '__CUSTOM__') {
      setReferralAssignee(userDirectory[0] || '');
    }
    onNotify(
      `سند ${activeDoc.code} ارجاع داده شد`,
      `پرونده برای «${targetPerson}» جهت «${referralActionType}» ارسال گردید.`,
      'success'
    );
  };

  const handleToggleReferralStatus = (refId: string) => {
    if (!activeDoc) return;
    const nextReferrals = (activeDoc.referrals || []).map((r) =>
      r.id === refId
        ? { ...r, status: r.status === 'در انتظار اقدام' ? ('تکمیل شده' as const) : ('در انتظار اقدام' as const) }
        : r
    );
    onUpdateWorkflowDoc(activeDoc.id, { referrals: nextReferrals });
  };

  const handleRemoveReferral = (refId: string) => {
    if (!activeDoc) return;
    const nextReferrals = (activeDoc.referrals || []).filter((r) => r.id !== refId);
    onUpdateWorkflowDoc(activeDoc.id, { referrals: nextReferrals });
    onNotify('مورد از لیست ارجاع حذف شد', undefined, 'info');
  };

  const handleAddCcRecipient = (explicitName?: string) => {
    if (!activeDoc) return;
    const candidate =
      explicitName !== undefined
        ? explicitName.trim()
        : ccCandidate === '__CUSTOM__'
        ? ccCustomRecipient.trim()
        : ccCandidate.trim();

    if (!candidate) {
      onNotify('نام گیرنده رونوشت را وارد کنید', 'لطفاً یک فرد یا واحد برای افزودن به لیست رونوشت مشخص نمایید.', 'warning');
      return;
    }
    const existing = activeDoc.ccList || [];
    if (existing.includes(candidate)) {
      onNotify('در لیست رونوشت وجود دارد', `«${candidate}» پیش‌تر به لیست رونوشت این سند اضافه شده است.`, 'info');
      return;
    }
    onUpdateWorkflowDoc(activeDoc.id, { ccList: [...existing, candidate] });
    if (ccCandidate === '__CUSTOM__') {
      setCcCustomRecipient('');
      setCcCandidate(userDirectory[0] || '');
    }
    onNotify('به لیست رونوشت اضافه شد', `«${candidate}» در رونوشت اطلاع‌رسانی ${activeDoc.code} ثبت گردید.`, 'success');
  };

  const handleRemoveCcRecipient = (name: string) => {
    if (!activeDoc) return;
    onUpdateWorkflowDoc(activeDoc.id, {
      ccList: (activeDoc.ccList || []).filter((c) => c !== name),
    });
  };

  const handleSendCcNotification = () => {
    if (!activeDoc) return;
    const list = activeDoc.ccList || [];
    if (list.length === 0) {
      onNotify('لیست رونوشت خالی است', 'ابتدا حداقل یک نفر را به لیست رونوشت اضافه کنید.', 'warning');
      return;
    }
    onUpdateWorkflowDoc(activeDoc.id, {
      history: [
        {
          actor: 'مهندس مهران کاظمی',
          role: 'مدیر تضمین کیفیت و IMS',
          date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
          note: `رونوشت و اطلاع‌رسانی مشاهده سند برای ${list.length.toLocaleString('fa-IR')} گیرنده ارسال شد: ${list.join('، ')}`,
          type: 'comment',
        },
        ...activeDoc.history,
      ],
    });
    onNotify(
      `رونوشت سند ${activeDoc.code} ارسال شد`,
      `اعلان مشاهده به ${list.length.toLocaleString('fa-IR')} نفر در لیست رونوشت ارسال گردید.`,
      'success'
    );
  };

  const triggerDecision = (action: 'approve' | 'return' | 'reject') => {
    if ((action === 'return' || action === 'reject') && !reviewComment.trim()) {
      onNotify(
        'ثبت یادداشت ممیزی الزامی است',
        'برای عودت یا رد مستند، لطفاً بندهای نیازمند اصلاح یا دلیل فنی را در کادر بازخورد وارد نمایید.',
        'warning'
      );
      return;
    }
    setConfirmState({ open: true, action });
  };

  const executeDecision = () => {
    if (!activeDoc) return;
    const { action } = confirmState;
    const ccSuffix =
      activeDoc.ccList && activeDoc.ccList.length > 0
        ? ` (رونوشت به: ${activeDoc.ccList.join('، ')})`
        : '';
    const commentText =
      (reviewComment.trim() ||
        (action === 'approve'
          ? 'انطباق کامل با بندهای سیستم مدیریت یکپارچه تایید و با امضای سخت‌افزاری PKI ارجاع گردید.'
          : 'مستند نیازمند اصلاحات فنی.')) + ccSuffix;

    if (action === 'approve') {
      const isCeoFinal = activeDoc.currentStage >= 4;
      const nextStage = Math.min(4, activeDoc.currentStage + 1) as 1 | 2 | 3 | 4;
      const ceoActorName = activeDoc.workflowActors?.[3]?.actor || 'مدیرعامل / مدیر مجتمع پتروشیمی';
      const nextStageLabel = isCeoFinal
        ? 'تصویب نهایی مدیرعامل (آماده صدور مجوز انتشار)'
        : nextStage === 4
        ? 'مرحله ۴: در انتظار تصویب نهایی مدیرعامل'
        : nextStage === 3
        ? 'مرحله ۳: انطباق سیستمی IMS'
        : 'مرحله ۲: صحه‌گذاری فنی مهندسی';

      onUpdateWorkflowDoc(activeDoc.id, {
        currentStage: nextStage,
        stageLabel: nextStageLabel,
        currentActor: isCeoFinal
          ? 'کارشناس فرآیند / ادمین توزیع و دسترسی'
          : nextStage === 4
          ? ceoActorName
          : activeDoc.workflowActors?.[nextStage - 1]?.actor || activeDoc.currentActor,
        tabGroup: isCeoFinal ? 'approved' : 'my-inbox',
        readinessScore: isCeoFinal ? 100 : Math.min(98, activeDoc.readinessScore + 5),
        slaRemainingText: isCeoFinal ? 'ارسال‌شده به بخش توزیع' : '۳ روز باقی‌مانده',
        history: [
          {
            actor: isCeoFinal ? ceoActorName : 'مهندس مهران کاظمی',
            role: isCeoFinal ? 'تصویب نهایی مدیرعامل' : 'مدیر تضمین کیفیت و IMS',
            date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            note: isCeoFinal
              ? `تصویب نهایی مدیرعامل و ارسال به کارتابل توزیع و دسترسی مستندات. ${commentText}`
              : commentText,
            type: 'approved',
          },
          ...activeDoc.history,
        ],
      });
      if (isCeoFinal) {
        if (activeDoc.replaceOnApproval && onPromoteRevision) {
          onPromoteRevision(activeDoc);
        }
        if (onCeoFinalApprove) {
          onCeoFinalApprove(activeDoc);
        } else {
          onNotify(
            `سند ${activeDoc.code} توسط مدیرعامل تصویب شد`,
            'مستند وارد بخش توزیع و دسترسی به مستندات گردید.',
            'success'
          );
        }
      } else {
        onNotify(
          `سند ${activeDoc.code} تایید و به مرحله ${nextStage.toLocaleString('fa-IR')} ارسال شد`,
          nextStage === 4
            ? 'مستند اکنون در ایستگاه نهایی (تصویب مدیرعامل) قرار دارد.'
            : 'امضای دیجیتال با کلید سخت‌افزاری ثبت گردید.',
          'success'
        );
      }
    } else if (action === 'return') {
      onUpdateWorkflowDoc(activeDoc.id, {
        currentStage: 1,
        stageLabel: 'عودت جهت اصلاحات تدوین‌کننده',
        tabGroup: 'referred',
        history: [
          {
            actor: 'مهندس مهران کاظمی',
            role: 'مدیر تضمین کیفیت و IMS',
            date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            note: `درخواست اصلاحات: ${commentText}`,
            type: 'returned',
          },
          ...activeDoc.history,
        ],
      });
      onNotify(`سند ${activeDoc.code} عودت داده شد`, 'فرایند جهت اعمال اصلاحات به تهیه‌کننده برگشت.', 'warning');
    } else {
      onUpdateWorkflowDoc(activeDoc.id, {
        stageLabel: 'رد شده / متوقف‌شده',
        tabGroup: 'referred',
        history: [
          {
            actor: 'مهندس مهران کاظمی',
            role: 'مدیر تضمین کیفیت و IMS',
            date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            note: `عدم تایید: ${commentText}`,
            type: 'returned',
          },
          ...activeDoc.history,
        ],
      });
      onNotify(`سند ${activeDoc.code} رد شد`, 'مستند در سوابق گردش کار مختومه گردید.', 'error');
    }

    setReviewComment('');
    setConfirmState({ open: false, action: 'approve' });
  };

  if (!activeDoc) return null;

  const isNewRequest = resolveRequestType(activeDoc) === 'new';
  const activeReferrals = activeDoc.referrals || [];
  const activeCcList = activeDoc.ccList || [];

  return (
    <div className="space-y-5">
      {/* Main Page Title Section */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 sm:p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)] text-center">
        <h1 className="text-lg sm:text-xl font-extrabold text-primary">
          کارتابل و جریان گردش تایید و تصویب اسناد IMS
        </h1>
      </section>

      {/* Status & Quick Actions Section */}
      <section className="bg-white rounded-2xl border border-border-hairline px-5 py-4 flex flex-wrap items-center justify-center gap-3 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-warning-capa flex items-center gap-2">
            <span className="material-symbols-outlined !text-[18px]">assignment_late</span>
            <span>{myInboxCount.toLocaleString('fa-IR')} فقره نیازمند اقدام فوری</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-tertiary flex items-center gap-2">
            <span className="material-symbols-outlined !text-[18px]">verified</span>
            <span>۹۸.۲٪ انطباق با مهلت SLA</span>
          </div>
        </div>
      </section>

      {/* Tabs & Search */}
      <section className="bg-white rounded-2xl border border-border-hairline p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'my-inbox', label: 'کارتابل من (منتظر تایید من)', badge: myInboxCount },
            { id: 'referred', label: 'ارجاع شده توسط من', badge: referredCount },
            { id: 'approved', label: 'تایید شده‌های اخیر' },
            { id: 'all', label: 'کل اسناد در گردش مجتمع' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`font-label-code px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-100 text-critical-hse'
                  }`}
                >
                  {tab.badge.toLocaleString('fa-IR')}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="فیلتر بر اساس کد سند، نام واحد، استاندارد..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs focus:outline-none focus:border-secondary"
            />
            <span className="material-symbols-outlined !text-[17px] text-outline absolute right-2.5 top-2">search</span>
          </div>
        </div>
      </section>

      {/* Main Approval Cartable Table */}
      <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="p-4 sm:p-5 border-b border-border-hairline bg-surface-container-low/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined !text-[18px]">inbox</span>
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-primary flex items-center gap-2">
                  کارتابل اصلی اسناد در جریان تصویب
                  <span className="font-label-code text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-secondary border border-sky-200">
                    {displayedQueue.length.toLocaleString('fa-IR')} سند
                  </span>
                </h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  مدیریت و پیگیری متمرکز اسناد؛ با انتخاب هر ردیف، پیش‌نمایش و ایستگاه تایید آن در بخش زیر باز می‌شود
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'همه درخواست‌ها', count: filteredQueue.length },
              { id: 'new', label: 'ثبت سند جدید', count: newRequestCount },
              { id: 'revision', label: 'بازنگری و ویرایش', count: revisionRequestCount },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRequestTypeFilter(item.id as typeof requestTypeFilter)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  requestTypeFilter === item.id
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-on-surface-variant border-border-hairline hover:text-primary'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`font-label-code px-1.5 py-0.2 rounded-full text-[10px] ${
                    requestTypeFilter === item.id ? 'bg-white/20 text-white' : 'bg-surface-container-low text-primary'
                  }`}
                >
                  {item.count.toLocaleString('fa-IR')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[940px] text-right border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                <th className="py-3 px-4">کد و عنوان سند</th>
                <th className="py-3 px-3">نوع درخواست</th>
                <th className="py-3 px-3">مرحله فعلی گردش کار</th>
                <th className="py-3 px-3">اقدام‌کننده جاری</th>
                <th className="py-3 px-3">اولویت</th>
                <th className="py-3 px-3">مهلت (SLA)</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70">
              {displayedQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-on-surface-variant">
                    هیچ سندی با فیلتر فعلی در این کارتابل یافت نشد.
                  </td>
                </tr>
              ) : (
                displayedQueue.map((doc) => {
                  const isSelected = doc.id === activeDoc.id;
                  const reqType = resolveRequestType(doc);
                  const isNew = reqType === 'new';
                  const slaPct = Math.min(100, Math.round((doc.slaDaysUsed / Math.max(1, doc.slaDaysTotal)) * 100));
                  const isCompleted = doc.tabGroup === 'approved';

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedId(doc.id)}
                      className={`hover:bg-surface-container-low/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50/70 ring-1 ring-inset ring-secondary/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 max-w-[300px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-label-code font-extrabold text-secondary">{doc.code}</span>
                          <span className="font-label-code text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-low border border-border-hairline text-primary">
                            {doc.targetRev || doc.version.split(' ')[0] + ' ' + (doc.version.split(' ')[1] || '')}
                          </span>
                        </div>
                        <div className="font-bold text-primary mt-1 line-clamp-1" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="text-[10.5px] text-outline mt-0.5 truncate">{doc.processOwner}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                            isNew
                              ? 'bg-emerald-50 text-tertiary border-emerald-200'
                              : 'bg-amber-50 text-warning-capa border-amber-200'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[14px]">
                            {isNew ? 'note_add' : 'edit_document'}
                          </span>
                          {isNew ? 'ثبت سند جدید' : 'بازنگری و ویرایش'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-primary">{doc.stageLabel}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((stepNum) => {
                              const done = isCompleted || doc.currentStage > stepNum;
                              const active = !isCompleted && doc.currentStage === stepNum;
                              return (
                                <span
                                  key={stepNum}
                                  className={`h-1.5 w-4 rounded-full ${
                                    done ? 'bg-tertiary' : active ? 'bg-warning-capa' : 'bg-slate-200'
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[10px] font-bold text-on-surface-variant">
                            گام {doc.currentStage.toLocaleString('fa-IR')} از ۴
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-primary">{doc.currentActor}</div>
                        {doc.attachedFiles && doc.attachedFiles.length > 0 && (
                          <div className="text-[10px] text-secondary font-bold mt-0.5 inline-flex items-center gap-0.5">
                            <span className="material-symbols-outlined !text-[13px]">attach_file</span>
                            {doc.attachedFiles.length.toLocaleString('fa-IR')} پیوست تغییریافته
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                            doc.priority === 'بحرانی'
                              ? 'bg-red-100 text-critical-hse'
                              : doc.priority === 'فوری'
                              ? 'bg-amber-100 text-warning-capa'
                              : 'bg-slate-100 text-on-surface-variant'
                          }`}
                        >
                          {doc.priority}
                        </span>
                      </td>

                      <td className="py-3 px-3 min-w-[130px]">
                        <div
                          className={`font-label-code font-bold text-[11px] ${
                            isCompleted
                              ? 'text-tertiary'
                              : slaPct >= 80
                              ? 'text-critical-hse'
                              : 'text-warning-capa'
                          }`}
                        >
                          {doc.slaRemainingText}
                        </div>
                        {!isCompleted && (
                          <div className="w-24 h-1.5 bg-surface-container-low rounded-full overflow-hidden border border-border-hairline mt-1.5">
                            <div
                              className={`h-full rounded-full ${slaPct >= 80 ? 'bg-critical-hse' : 'bg-warning-capa'}`}
                              style={{ width: `${slaPct}%` }}
                            />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(doc.id);
                            inspectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary text-white shadow-xs'
                              : 'border border-border-hairline bg-white text-primary hover:bg-secondary hover:text-white hover:border-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[14px]">
                            {isSelected ? 'visibility' : 'rate_review'}
                          </span>
                          {isSelected ? 'در حال بررسی' : 'بررسی و اقدام'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Main Split: 8-col Inspection Station + 4-col Context Sidebar */}
      <div ref={inspectionRef} className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 8 cols Inspection Station */}
        <div className="xl:col-span-8 space-y-5">
          {/* Document Header, Request-Type-Aware Preview & Referral/CC Decision Station */}
          <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                      isNewRequest
                        ? 'bg-emerald-50 text-tertiary border-emerald-200'
                        : 'bg-amber-50 text-warning-capa border-amber-200'
                    }`}
                  >
                    <span className="material-symbols-outlined !text-[14px]">
                      {isNewRequest ? 'note_add' : 'edit_document'}
                    </span>
                    {isNewRequest ? 'ثبت سند جدید (Rev 00)' : 'بازنگری و ویرایش'}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-critical-hse">
                    اولویت {activeDoc.priority}
                  </span>
                  {activeDoc.standards.map((std) => (
                    <span
                      key={std}
                      className="font-label-code text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-surface-container-low text-primary border border-border-hairline"
                    >
                      {std}
                    </span>
                  ))}
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-primary">{activeDoc.title}</h2>
              </div>

              <div className="text-left shrink-0 bg-surface-container-low px-3.5 py-2 rounded-xl border border-border-hairline">
                <div className="font-label-code text-sm font-extrabold text-secondary">{activeDoc.code}</div>
                <div className="text-[11px] text-on-surface-variant">نسخه جاری: {activeDoc.version}</div>
              </div>
            </div>

            {/* 4-Stage Pipeline */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary">گردش کار چندمرحله‌ای سندی</span>
                <span className="text-secondary font-bold">
                  مرحله {activeDoc.currentStage.toLocaleString('fa-IR')} از ۴ (پیشرفت{' '}
                  {(activeDoc.currentStage * 25).toLocaleString('fa-IR')}٪)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {[
                  { num: 1, title: '۱. تهیه و تدوین سند', sub: 'مهندس مهران کاظمی' },
                  { num: 2, title: '۲. صحه‌گذاری فنی', sub: 'مهندس علیرضا رضایی' },
                  { num: 3, title: '۳. انطباق با IMS', sub: 'مدیریت تضمین کیفیت' },
                  { num: 4, title: '۴. تصویب نهایی مدیریت', sub: 'مدیر مجتمع پتروشیمی' },
                ].map((stage) => {
                  const customStage = activeDoc.workflowActors?.[stage.num - 1];
                  const stageTitle = customStage?.step || stage.title;
                  const stageActor = customStage?.actor || stage.sub;
                  const completed = activeDoc.currentStage > stage.num || activeDoc.tabGroup === 'approved';
                  const current = activeDoc.currentStage === stage.num && activeDoc.tabGroup !== 'approved';
                  return (
                    <div
                      key={stage.num}
                      className={`p-3 rounded-xl border text-xs ${
                        current
                          ? 'bg-amber-50 border-warning-capa text-primary shadow-sm'
                          : completed
                          ? 'bg-emerald-50/70 border-emerald-200 text-primary'
                          : 'bg-surface-container-low border-border-hairline text-on-surface-variant'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <span
                          className={`material-symbols-outlined !text-[16px] ${
                            completed ? 'text-tertiary' : current ? 'text-warning-capa' : 'text-outline'
                          }`}
                        >
                          {completed ? 'check_circle' : current ? 'pending' : 'schedule'}
                        </span>
                        <span className="truncate">{stageTitle}</span>
                      </div>
                      <div className="text-[10.5px] text-on-surface-variant truncate" title={stageActor}>
                        {stageActor}
                      </div>
                      {customStage?.replaced && (
                        <span className="inline-block mt-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-warning-capa">
                          جایگزین شده
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SLA Bar */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-primary">
                    زمان سپری‌شده در این ایستگاه: {activeDoc.slaDaysUsed.toLocaleString('fa-IR')} روز از{' '}
                    {activeDoc.slaDaysTotal.toLocaleString('fa-IR')} روز سقف توافق سطح خدمت (SLA)
                  </span>
                  <span className="font-bold text-warning-capa">
                    {Math.round((activeDoc.slaDaysUsed / Math.max(1, activeDoc.slaDaysTotal)) * 100).toLocaleString(
                      'fa-IR'
                    )}
                    ٪ زمان مهلت
                  </span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-border-hairline">
                  <div
                    className="h-full bg-warning-capa rounded-full"
                    style={{
                      width: `${Math.min(100, (activeDoc.slaDaysUsed / Math.max(1, activeDoc.slaDaysTotal)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Request-Type-Aware Preview & File Controls */}
            <div className="space-y-3 pt-2 border-t border-border-hairline">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">
                      {isNewRequest ? 'description' : 'difference'}
                    </span>
                    {isNewRequest
                      ? 'پیش‌نمایش فایل نسخه صفر (Rev 00) و مشخصات تدوین جدید'
                      : 'پیش‌نمایش نسخه بازنگری‌شده، مقایسه با نگارش قبلی و پیوست‌ها'}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {isNewRequest
                      ? 'این پرونده مربوط به ثبت اولیه سند (Rev 00) است و فاقد نسخه پیشین می‌باشد.'
                      : 'درخواست ویرایش روی سند مصوب قبلی؛ امکان مقایسه متن و دریافت هم‌زمان فایل ریویژن قبلی و جدید فراهم است.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isNewRequest ? (
                    <button
                      type="button"
                      onClick={() => {
                        const rev0File = activeDoc.attachedFiles?.[0]?.name || activeDoc.pdfName;
                        onNotify(
                          `دریافت فایل نسخه صفر (${rev0File})`,
                          'فایل کامل نسخه اولیه (Rev 00) سند جدید با موفقیت دانلود شد.',
                          'success'
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-tertiary border border-emerald-200 hover:bg-emerald-100 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined !text-[15px]">download</span>
                      دانلود فایل ریویژن صفر (Rev 00)
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPrevCompare((v) => !v)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                          showPrevCompare
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-white border-border-hairline text-primary hover:bg-surface-container-low'
                        }`}
                      >
                        مقایسه با نگارش پیشین
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onNotify(
                            `دریافت فایل ریویژن قبلی (${activeDoc.code}_PrevRev.pdf)`,
                            'فایل نسخه مصوب قبلی سند با موفقیت دانلود شد.',
                            'info'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-surface-container-low text-primary border border-border-hairline hover:bg-slate-100 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined !text-[15px]">history</span>
                        دانلود فایل ریویژن قبلی
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newFileName = activeDoc.attachedFiles?.[0]?.name || activeDoc.pdfName;
                          onNotify(
                            `دریافت فایل ریویژن جدید (${newFileName})`,
                            'فایل ریویژن جدید سند با موفقیت دانلود شد.',
                            'success'
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-50 text-secondary border border-sky-200 hover:bg-sky-100 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined !text-[15px]">download</span>
                        دانلود فایل ریویژن جدید
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border-hairline bg-surface-container-low overflow-hidden">
                <div className="px-4 py-2.5 bg-white border-b border-border-hairline flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-label-code px-2 py-0.5 rounded font-bold text-[10px] ${
                        isNewRequest ? 'bg-emerald-50 text-tertiary' : 'bg-red-50 text-critical-hse'
                      }`}
                    >
                      {isNewRequest ? 'REV 00' : 'PDF'}
                    </span>
                    <span className="font-label-code font-bold text-primary truncate" dir="ltr">
                      {activeDoc.pdfName}
                    </span>
                    <span className="text-[11px] text-outline hidden sm:inline">
                      حجم: {activeDoc.pdfSize} | {activeDoc.pdfPages.toLocaleString('fa-IR')} صفحه | استاندارد ارجاع:{' '}
                      {activeDoc.pdfStandard}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(85, z - 10))}
                      className="p-1 rounded hover:bg-surface-container-low cursor-pointer"
                      title="کوچک‌نمایی"
                    >
                      <span className="material-symbols-outlined !text-[17px]">zoom_out</span>
                    </button>
                    <span className="font-label-code text-[11px] font-bold px-1">{zoom}٪</span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(125, z + 10))}
                      className="p-1 rounded hover:bg-surface-container-low cursor-pointer"
                      title="بزرگ‌نمایی"
                    >
                      <span className="material-symbols-outlined !text-[17px]">zoom_in</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFullscreenPdf(true)}
                      className="p-1 rounded hover:bg-surface-container-low cursor-pointer"
                      title="نمایش تمام‌صفحه"
                    >
                      <span className="material-symbols-outlined !text-[17px]">fullscreen</span>
                    </button>
                  </div>
                </div>

                <div
                  className="p-5 bg-white m-3 rounded-xl border border-border-hairline space-y-3 transition-transform origin-top"
                  style={{ fontSize: `${Math.round((zoom / 100) * 12.5)}px` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-secondary">{activeDoc.excerptSection}</span>
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-tertiary">
                      {activeDoc.excerptIsoTag}
                    </span>
                  </div>
                  {!isNewRequest && showPrevCompare && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 line-through text-[11.5px]">
                      متن نگارش پیشین: فشار تست هیدرواستاتیک برابر با ۱.۲۵ برابر فشار طراحی به مدت ۲ ساعت اعمال شود.
                    </div>
                  )}
                  <p className="text-on-surface leading-7">{activeDoc.excerptText}</p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11.5px] flex items-start gap-2">
                    <span className="material-symbols-outlined !text-[17px] text-warning-capa shrink-0 mt-0.5">
                      {isNewRequest ? 'info' : 'warning'}
                    </span>
                    <span>{activeDoc.validatorNote}</span>
                  </div>
                </div>
              </div>

              {activeDoc.attachedFiles && activeDoc.attachedFiles.length > 0 && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-[18px] text-secondary">attach_file</span>
                      {isNewRequest
                        ? `فایل‌های پیوست‌شده سند جدید (${activeDoc.attachedFiles.length.toLocaleString('fa-IR')} فایل)`
                        : `اسناد تغییریافته پیوست‌شده برای جایگزینی (${activeDoc.attachedFiles.length.toLocaleString('fa-IR')} فایل)`}
                    </div>
                    {!isNewRequest && activeDoc.replaceOnApproval && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                          activeDoc.tabGroup === 'approved'
                            ? 'bg-emerald-50 text-tertiary border-emerald-200'
                            : 'bg-white text-secondary border-sky-200'
                        }`}
                      >
                        {activeDoc.tabGroup === 'approved'
                          ? 'تایید نهایی و جایگزین ریویژن قبلی شد'
                          : 'جایگزینی خودکار با ریویژن قبلی پس از تایید نهایی'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeDoc.attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-border-hairline"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-label-code uppercase px-2 py-0.5 rounded bg-sky-50 text-secondary font-bold text-[10px] shrink-0">
                            {file.type}
                          </span>
                          <span className="font-label-code font-semibold text-primary truncate" dir="ltr">
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onNotify(`دریافت فایل ${file.name}`, `فایل با حجم ${file.size} دانلود شد.`, 'success')
                          }
                          className="text-[10.5px] font-bold text-secondary hover:underline inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                        >
                          <span>{file.size}</span>
                          <span className="material-symbols-outlined !text-[14px]">download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audit Note, Referral List, CC List & Decision Hub */}
            <div className="space-y-4 pt-3 border-t border-border-hairline">
              {/* 1. Review Comment & Save Note */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">rate_review</span>
                    یادداشت ممیزی، نظر تخصصی و دستور اقدام
                  </h3>
                  <span className="text-[11px] text-outline">تمامی نظرات، ارجاعات و رونوشت‌ها در سوابق سند ثبت می‌شوند.</span>
                </div>

                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="نظر کارشناسی، اصلاحات مورد نیاز یا دستور پیگیری خود را بنویسید (قابل استفاده برای ثبت یادداشت، ارجاع، عودت یا تایید)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline text-xs text-primary focus:outline-none focus:border-secondary"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachProfile}
                      onChange={(e) => setAttachProfile(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span>الصاق تاییدیه انطباق با فرم‌های شناسنامه فرآیند</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveCommentOnly}
                    className="px-3 py-1.5 rounded-lg border border-secondary/40 bg-sky-50/70 hover:bg-sky-100 text-secondary text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined !text-[15px]">add_comment</span>
                    ثبت نظر در سوابق (بدون تغییر مرحله)
                  </button>
                </div>
              </div>

              {/* 2. Referral List & CC List Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                {/* Referral List Box */}
                <div className="rounded-2xl border border-border-hairline bg-surface-container-low/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-[18px] text-secondary">forward_to_inbox</span>
                      لیست ارجاع تخصصی (کارشناس / واحد)
                    </div>
                    <span className="font-label-code text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-border-hairline text-primary">
                      {activeReferrals.length.toLocaleString('fa-IR')} ارجاع
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10.5px] font-bold text-on-surface-variant mb-1">
                          ارجاع به شخص / کارشناس
                        </label>
                        <select
                          value={referralAssignee}
                          onChange={(e) => setReferralAssignee(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg border border-border-hairline bg-white text-[11px] font-semibold text-primary focus:outline-none focus:border-secondary"
                        >
                          {userDirectory.map((person) => (
                            <option key={person} value={person}>
                              {person}
                            </option>
                          ))}
                          <option value="__CUSTOM__">+ درج دستی نام کارشناس / واحد...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-on-surface-variant mb-1">
                          نوع اقدام درخواستی
                        </label>
                        <select
                          value={referralActionType}
                          onChange={(e) =>
                            setReferralActionType(e.target.value as WorkflowReferralEntry['actionType'])
                          }
                          className="w-full px-2.5 py-2 rounded-lg border border-border-hairline bg-white text-[11px] font-semibold text-primary focus:outline-none focus:border-secondary"
                        >
                          {REFERRAL_ACTIONS.map((act) => (
                            <option key={act} value={act}>
                              {act}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {referralAssignee === '__CUSTOM__' && (
                      <input
                        type="text"
                        value={referralCustomAssignee}
                        onChange={(e) => setReferralCustomAssignee(e.target.value)}
                        placeholder="نام کارشناس یا واحد مقصد (مثلاً: مهندس رحیمی - کارشناس بازرسی فنی)"
                        className="w-full px-2.5 py-2 rounded-lg border border-secondary bg-white text-[11px] text-primary focus:outline-none"
                      />
                    )}

                    <input
                      type="text"
                      value={referralNote}
                      onChange={(e) => setReferralNote(e.target.value)}
                      placeholder="شرح هامش / دستور ارجاع (در صورت خالی بودن از متن یادداشت بالا استفاده می‌شود)..."
                      className="w-full px-2.5 py-2 rounded-lg border border-border-hairline bg-white text-[11px] text-primary focus:outline-none focus:border-secondary"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-on-surface cursor-pointer">
                        <input
                          type="checkbox"
                          checked={transferOwnershipOnRefer}
                          onChange={(e) => setTransferOwnershipOnRefer(e.target.checked)}
                          className="w-3.5 h-3.5 accent-secondary rounded"
                        />
                        <span>انتقال اقدام‌کننده جاری به فرد ارجاع‌شده</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddReferral}
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-secondary text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined !text-[15px]">send</span>
                        افزودن و ارجاع
                      </button>
                    </div>
                  </div>

                  {/* Recorded Referrals List */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pt-1 border-t border-border-hairline/70">
                    {activeReferrals.length === 0 ? (
                      <div className="text-[11px] text-outline py-2 text-center">
                        هنوز ارجاع مستقیمی برای این سند ثبت نشده است.
                      </div>
                    ) : (
                      activeReferrals.map((ref) => (
                        <div
                          key={ref.id}
                          className="p-2.5 rounded-xl bg-white border border-border-hairline flex items-start justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-bold text-primary truncate">{ref.assignee}</div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-secondary font-bold text-[10px]">
                                {ref.actionType}
                              </span>
                              <span className="font-label-code text-[10px] text-outline">{ref.date}</span>
                            </div>
                            {ref.note && <p className="text-[10.5px] text-on-surface-variant">{ref.note}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleReferralStatus(ref.id)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                ref.status === 'تکمیل شده'
                                  ? 'bg-emerald-50 text-tertiary border border-emerald-200'
                                  : 'bg-amber-50 text-warning-capa border border-amber-200'
                              }`}
                              title="تغییر وضعیت ارجاع"
                            >
                              {ref.status}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveReferral(ref.id)}
                              className="p-0.5 text-outline hover:text-critical-hse cursor-pointer"
                              title="حذف از لیست ارجاع"
                            >
                              <span className="material-symbols-outlined !text-[15px]">close</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CC List Box */}
                <div className="rounded-2xl border border-border-hairline bg-surface-container-low/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-[18px] text-tertiary">group_add</span>
                      لیست رونوشت و اطلاع‌رسانی (CC)
                    </div>
                    <span className="font-label-code text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-border-hairline text-primary">
                      {activeCcList.length.toLocaleString('fa-IR')} گیرنده
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <select
                        value={ccCandidate}
                        onChange={(e) => setCcCandidate(e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-border-hairline bg-white text-[11px] font-semibold text-primary focus:outline-none focus:border-secondary"
                      >
                        {userDirectory.map((person) => (
                          <option key={person} value={person}>
                            {person}
                          </option>
                        ))}
                        <option value="__CUSTOM__">+ درج دستی گیرنده رونوشت...</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAddCcRecipient()}
                        className="px-3 py-2 rounded-lg bg-white border border-border-hairline hover:border-secondary text-primary text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined !text-[15px] text-secondary">add</span>
                        افزودن
                      </button>
                    </div>

                    {ccCandidate === '__CUSTOM__' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ccCustomRecipient}
                          onChange={(e) => setCcCustomRecipient(e.target.value)}
                          placeholder="نام فرد یا واحد رونوشت‌گیرنده..."
                          className="flex-1 px-2.5 py-2 rounded-lg border border-secondary bg-white text-[11px] text-primary focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Quick Preset CC Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                      <span className="text-on-surface-variant">افزودن سریع:</span>
                      {[
                        'رئیس ایمنی و بهداشت (HSE)',
                        'سرپرست واحد بهره‌برداری',
                        'نماینده تضمین کیفیت و ممیزی',
                      ].map((preset) => {
                        const already = activeCcList.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              already ? handleRemoveCcRecipient(preset) : handleAddCcRecipient(preset)
                            }
                            className={`px-2 py-0.5 rounded-full border font-semibold cursor-pointer transition-colors ${
                              already
                                ? 'bg-emerald-50 border-emerald-200 text-tertiary'
                                : 'bg-white border-border-hairline text-on-surface-variant hover:text-primary'
                            }`}
                          >
                            {already ? '✓ ' : '+ '}
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active CC Recipients Chips */}
                  <div className="pt-2 border-t border-border-hairline/70 space-y-2.5">
                    {activeCcList.length === 0 ? (
                      <div className="text-[11px] text-outline py-2 text-center">
                        گیرنده‌ای در لیست رونوشت انتخاب نشده است.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                        {activeCcList.map((recipient) => (
                          <span
                            key={recipient}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-border-hairline text-[11px] font-semibold text-primary"
                          >
                            <span className="truncate max-w-[200px]">{recipient}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCcRecipient(recipient)}
                              className="text-outline hover:text-critical-hse cursor-pointer"
                              title="حذف از رونوشت"
                            >
                              <span className="material-symbols-outlined !text-[14px]">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSendCcNotification}
                        disabled={activeCcList.length === 0}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors ${
                          activeCcList.length > 0
                            ? 'bg-tertiary hover:bg-primary text-white cursor-pointer'
                            : 'bg-surface-container text-outline cursor-not-allowed'
                        }`}
                      >
                        <span className="material-symbols-outlined !text-[15px]">notifications_active</span>
                        ارسال رونوشت جهت اطلاع و مشاهده
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Final Decision Buttons */}
              <div className="pt-3 border-t border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-tertiary font-semibold">
                  <span className="material-symbols-outlined !text-[16px]">verified_user</span>
                  <span>امضای دیجیتال با کلید سخت‌افزاری فعال: مهندس کاظمی</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerDecision('reject')}
                    className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-critical-hse text-xs font-bold cursor-pointer"
                  >
                    عدم تایید / رد سند
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDecision('return')}
                    className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-warning-capa text-xs font-bold cursor-pointer"
                  >
                    درخواست اصلاحات و عودت
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDecision('approve')}
                    className="px-4 py-2 rounded-xl bg-success-iso hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-[16px]">check_circle</span>
                    {activeDoc.currentStage >= 4
                      ? 'تصویب نهایی مدیرعامل و ارسال به بخش توزیع'
                      : activeDoc.currentStage === 3
                      ? 'تایید و ارسال برای تصویب مدیرعامل'
                      : 'تایید و ارجاع به مرحله بعد'}
                  </button>
                  {activeDoc.tabGroup === 'approved' && (
                    <button
                      type="button"
                      onClick={() => onNavigate('documents-distribution')}
                      className="px-3.5 py-2 rounded-xl border border-secondary bg-sky-50 hover:bg-sky-100 text-secondary text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[16px]">share</span>
                      صدور مجوز انتشار در بخش توزیع
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 4 cols Context Sidebar */}
        <div className="xl:col-span-4 space-y-5">
          {/* Methanol Plant Photo Card */}
          <div className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[17px] text-secondary">factory</span>
                بستر عملیاتی واحد متانول
              </h3>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-tertiary">
                سایت فعال
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden h-40 bg-primary">
              {!imgFailed ? (
                <img
                  src={METHANOL_PLANT_IMG}
                  alt="واحد متانول شماره ۲ خلیج فارس"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/85 bg-gradient-to-br from-primary to-secondary">
                  <span className="material-symbols-outlined !text-[38px]">precision_manufacturing</span>
                  <span className="text-xs font-bold mt-1">واحد متانول شماره ۲ — خلیج فارس</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950/80 to-transparent text-white text-[11px] font-bold">
                واحد متانول شماره ۲ - خلیج فارس
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">کد فرآیند مرجع:</span>
                <span className="font-label-code font-bold text-primary">{activeDoc.processCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">مالک فرآیند:</span>
                <span className="font-bold text-primary">{activeDoc.processOwner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">سطح محرمانگی:</span>
                <span className="font-bold text-secondary">{activeDoc.confidentiality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">تاریخ سررسید بازنگری دوره‌ای:</span>
                <span className="font-label-code font-bold text-secondary">{activeDoc.nextReviewDate}</span>
              </div>
            </div>
          </div>

          {/* IMS Compliance Checklist */}
          <div className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
            <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-[17px] text-tertiary">checklist</span>
              چک‌لیست کنترل انطباق IMS
            </h3>

            <div className="space-y-2 text-xs">
              {activeDoc.checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-border-hairline"
                >
                  <span className="font-medium text-primary">{item.label}</span>
                  <span
                    className={`text-[10.5px] font-bold shrink-0 ${
                      item.status === 'passed' ? 'text-tertiary' : 'text-warning-capa'
                    }`}
                  >
                    {item.statusText}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="19" fill="none" stroke="#DDE3E8" strokeWidth="5" />
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    fill="none"
                    stroke="#1E5A85"
                    strokeWidth="5"
                    strokeDasharray="119.38"
                    strokeDashoffset={119.38 * (1 - activeDoc.readinessScore / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-label-code absolute text-[11px] font-extrabold text-primary">
                  {activeDoc.readinessScore.toLocaleString('fa-IR')}٪
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-primary">شاخص جامع آمادگی سند</div>
                <div className="text-[11px] text-on-surface-variant">واجد شرایط ارجاع به مدیریت ارشد</div>
              </div>
            </div>
          </div>

          {/* Workflow History */}
          <div className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
            <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-[17px] text-secondary">history</span>
              تاریخچه گردش و نظرات قبلی
            </h3>
            <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
              {activeDoc.history.map((h, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-surface-container-low border border-border-hairline text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-primary">
                      {h.actor} ({h.role})
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-1 leading-5">{h.note}</p>
                  <span className="font-label-code text-[10px] text-outline mt-1 inline-block">{h.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen PDF Modal */}
      {showFullscreenPdf && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="animate-modal-enter w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-primary text-white flex items-center justify-between">
              <span className="font-label-code text-xs font-bold">{activeDoc.pdfName}</span>
              <button type="button" onClick={() => setShowFullscreenPdf(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[75vh] overflow-y-auto text-sm leading-8">
              <div className="flex items-center justify-between border-b border-border-hairline pb-3">
                <span className="font-bold text-primary">{activeDoc.title}</span>
                <span className="font-label-code text-xs text-secondary">{activeDoc.code}</span>
              </div>
              <h4 className="font-bold text-secondary">{activeDoc.excerptSection}</h4>
              <p className="text-on-surface">{activeDoc.excerptText}</p>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs">{activeDoc.validatorNote}</div>
            </div>
          </div>
        </div>
      )}

      {/* Decision ConfirmModal */}
      <ConfirmModal
        open={confirmState.open}
        title={
          confirmState.action === 'approve'
            ? activeDoc.currentStage >= 4
              ? `تصویب نهایی مدیرعامل و ارسال سند ${activeDoc.code} به بخش توزیع`
              : `تایید و امضای الکترونیکی سند ${activeDoc.code}`
            : confirmState.action === 'return'
            ? `عودت سند ${activeDoc.code} جهت اصلاح`
            : `رد و توقف گردش سند ${activeDoc.code}`
        }
        description={
          confirmState.action === 'approve'
            ? activeDoc.currentStage >= 4
              ? 'با تصویب نهایی مدیرعامل، سند به کارتابل بخش «توزیع و دسترسی به مستندات» منتقل می‌شود تا ادمین سامانه مجوز انتشار، سطح دسترسی عمومی/محدود و مسئول بازنگری آن را صادر کند.'
              : 'با تایید این مرحله، امضای دیجیتال PKI شما ثبت شده و مستند به ایستگاه بعدی ارجاع خواهد شد.'
            : 'یادداشت ممیزی شما برای تدوین‌کننده ارسال شده و وضعیت سند در سوابق گردش کار به‌روزرسانی می‌شود.'
        }
        confirmLabel={
          confirmState.action === 'approve' ? 'ثبت امضا و تایید' : confirmState.action === 'return' ? 'ارسال جهت اصلاح' : 'تایید رد سند'
        }
        tone={confirmState.action === 'approve' ? 'success' : confirmState.action === 'return' ? 'warning' : 'danger'}
        onConfirm={executeDecision}
        onCancel={() => setConfirmState({ open: false, action: 'approve' })}
      />
    </div>
  );
};
