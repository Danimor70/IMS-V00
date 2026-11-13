import React, { useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { METHANOL_PLANT_IMG } from '../data/imsData';
import { RouteId, WorkflowDoc } from '../types/ims';

interface ApprovalWorkflowPageProps {
  workflowDocs: WorkflowDoc[];
  onUpdateWorkflowDoc: (id: string, patch: Partial<WorkflowDoc>) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ApprovalWorkflowPage: React.FC<ApprovalWorkflowPageProps> = ({
  workflowDocs,
  onUpdateWorkflowDoc,
  onNavigate,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'my-inbox' | 'referred' | 'approved' | 'all'>('my-inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(workflowDocs[0]?.id || 'wf-1');
  const [zoom, setZoom] = useState(100);
  const [showFullscreenPdf, setShowFullscreenPdf] = useState(false);
  const [showPrevCompare, setShowPrevCompare] = useState(false);

  const [reviewComment, setReviewComment] = useState('');
  const [ccHse, setCcHse] = useState(true);
  const [attachProfile, setAttachProfile] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    action: 'approve' | 'return' | 'reject';
  }>({ open: false, action: 'approve' });

  const myInboxCount = workflowDocs.filter((d) => d.tabGroup === 'my-inbox').length;
  const referredCount = workflowDocs.filter((d) => d.tabGroup === 'referred').length;

  const filteredQueue = useMemo(() => {
    return workflowDocs.filter((d) => {
      if (activeTab !== 'all' && d.tabGroup !== activeTab) return false;
      if (
        searchQuery.trim() &&
        !d.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !d.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [workflowDocs, activeTab, searchQuery]);

  const activeDoc = useMemo(
    () => workflowDocs.find((d) => d.id === selectedId) || filteredQueue[0] || workflowDocs[0],
    [workflowDocs, selectedId, filteredQueue]
  );

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
    const commentText =
      reviewComment.trim() ||
      (action === 'approve'
        ? 'انطباق کامل با بندهای سیستم مدیریت یکپارچه تایید و با امضای سخت‌افزاری PKI ارجاع گردید.'
        : 'مستند نیازمند اصلاحات فنی.');

    if (action === 'approve') {
      const nextStage = Math.min(4, activeDoc.currentStage + 1) as 1 | 2 | 3 | 4;
      const isFinal = activeDoc.currentStage >= 3;
      onUpdateWorkflowDoc(activeDoc.id, {
        currentStage: nextStage,
        stageLabel: isFinal ? 'مرحله ۴: تصویب نهایی مدیریت (تکمیل)' : 'مرحله ۴: تصویب نهایی مدیریت',
        tabGroup: isFinal ? 'approved' : 'referred',
        readinessScore: 100,
        slaRemainingText: isFinal ? 'تایید و ابلاغ شد' : '۳ روز باقی‌مانده',
        history: [
          {
            actor: 'مهندس مهران کاظمی',
            role: 'مدیر تضمین کیفیت و IMS',
            date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            note: commentText,
            type: 'approved',
          },
          ...activeDoc.history,
        ],
      });
      onNotify(`سند ${activeDoc.code} تایید و ارجاع شد`, 'امضای دیجیتال با کلید سخت‌افزاری ثبت گردید.', 'success');
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

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-code text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-sky-50 text-secondary border border-sky-200">
              سیستم مدیریت یکپارچه (A-IMS) | DOC-FLOW-SYS-402
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-primary">
            کارتابل و جریان گردش تایید و تصویب اسناد IMS
          </h1>
          <p className="text-xs text-on-surface-variant">
            پایش بلادرنگ، اعتبارسنجی فنی و صدور توشیح الکترونیکی برای روش‌های اجرایی و دستورالعمل‌های عملیاتی مجتمع
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-warning-capa flex items-center gap-2">
            <span className="material-symbols-outlined !text-[18px]">assignment_late</span>
            <span>{myInboxCount.toLocaleString('fa-IR')} فقره نیازمند اقدام فوری</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-tertiary flex items-center gap-2">
            <span className="material-symbols-outlined !text-[18px]">verified</span>
            <span>۹۸.۲٪ انطباق با مهلت SLA</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('documents-create')}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">add_circle</span>
            ثبت و ارسال سند جدید
          </button>
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

      {/* Main Split: 8-col Inspection Station + 4-col Context Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 8 cols Inspection Station */}
        <div className="xl:col-span-8 space-y-5">
          {/* Document Header & Pipeline Stepper */}
          <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-critical-hse">
                    اولویت {activeDoc.priority}
                  </span>
                  {activeDoc.standards.map((std) => (
                    <span
                      key={std}
                      className="font-label-code text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-tertiary border border-emerald-200"
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
                        <span className="truncate">{stage.title}</span>
                      </div>
                      <div className="text-[10.5px] text-on-surface-variant truncate">{stage.sub}</div>
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
                    {Math.round((activeDoc.slaDaysUsed / activeDoc.slaDaysTotal) * 100).toLocaleString('fa-IR')}٪ زمان مهلت
                  </span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-border-hairline">
                  <div
                    className="h-full bg-warning-capa rounded-full"
                    style={{ width: `${Math.min(100, (activeDoc.slaDaysUsed / activeDoc.slaDaysTotal) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* PDF Preview Area */}
            <div className="space-y-3 pt-2 border-t border-border-hairline">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">preview</span>
                  پیش‌نمایش پیش‌نویس فنی و پیوست‌ها
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrevCompare((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                      showPrevCompare
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white border-border-hairline text-primary hover:bg-surface-container-low'
                    }`}
                  >
                    مقایسه با نگارش پیشین (Rev -01)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onNotify(`دریافت فایل ${activeDoc.pdfName}`, 'فایل PDF پیش‌نویس با موفقیت دانلود شد.', 'success')
                    }
                    className="px-3 py-1.5 rounded-lg bg-sky-50 text-secondary border border-sky-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-[15px]">download</span>
                    دریافت فایل کامل (PDF)
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border-hairline bg-surface-container-low overflow-hidden">
                <div className="px-4 py-2.5 bg-white border-b border-border-hairline flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-label-code px-2 py-0.5 rounded bg-red-50 text-critical-hse font-bold text-[10px]">
                      PDF
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
                  {showPrevCompare && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 line-through text-[11.5px]">
                      متن نگارش پیشین: فشار تست هیدرواستاتیک برابر با ۱.۲۵ برابر فشار طراحی به مدت ۲ ساعت اعمال شود.
                    </div>
                  )}
                  <p className="text-on-surface leading-7">{activeDoc.excerptText}</p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11.5px] flex items-start gap-2">
                    <span className="material-symbols-outlined !text-[17px] text-warning-capa shrink-0 mt-0.5">
                      warning
                    </span>
                    <span>{activeDoc.validatorNote}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Form */}
            <div className="space-y-3 pt-2 border-t border-border-hairline">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">rate_review</span>
                  یادداشت ممیزی و بازخورد انطباق سیستمی شما
                </h3>
                <span className="text-[11px] text-outline">این متن در سوابق پایدار سند ثبت می‌گردد.</span>
              </div>

              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="در صورت نیاز به اعمال اصلاحات، بندهای نیازمند تغییر را با ذکر شماره صفحه و دلیل مغایرت با بندهای استاندارد یادداشت نمایید..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline text-xs text-primary focus:outline-none focus:border-secondary"
              />

              <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ccHse}
                    onChange={(e) => setCcHse(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span>ارسال رونوشت به رئیس ایمنی و بهداشت (HSE)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachProfile}
                    onChange={(e) => setAttachProfile(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span>الصاق تاییدیه انطباق با فرم‌های شناسنامه فرآیند</span>
                </label>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    تایید و ارجاع به مرحله بعد
                  </button>
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

      {/* Bottom Queue Table */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-primary">کارتابل سایر اسناد در جریان تصویب (نیازمند رسیدگی)</h2>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              نمایش مستنداتی که در صف بررسی شما یا ارجاع کارگروه تضمین کیفیت قرار دارند
            </p>
          </div>
          <span className="text-xs text-outline">کل اسناد صف: {filteredQueue.length.toLocaleString('fa-IR')} سند</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[820px] text-right border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-y border-border-hairline">
                <th className="py-2.5 px-3">کد و عنوان سند</th>
                <th className="py-2.5 px-3">استاندارد مرتبط</th>
                <th className="py-2.5 px-3">مرحله فعلی گردش کار</th>
                <th className="py-2.5 px-3">اقدام‌کننده جاری</th>
                <th className="py-2.5 px-3">اولویت</th>
                <th className="py-2.5 px-3">مهلت (SLA)</th>
                <th className="py-2.5 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70">
              {filteredQueue.map((doc) => {
                const isSelected = doc.id === activeDoc.id;
                return (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedId(doc.id)}
                    className={`hover:bg-surface-container-low/60 transition-colors cursor-pointer ${
                      isSelected ? 'bg-sky-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-label-code font-bold text-secondary">{doc.code}</div>
                      <div className="font-bold text-primary mt-0.5">{doc.title}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-tertiary">
                        {doc.standards[0]}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-primary">{doc.stageLabel}</td>
                    <td className="py-3 px-3 text-on-surface-variant">{doc.currentActor}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          doc.priority === 'بحرانی' || doc.priority === 'فوری'
                            ? 'bg-red-50 text-critical-hse'
                            : 'bg-slate-100 text-on-surface-variant'
                        }`}
                      >
                        {doc.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-label-code font-semibold text-warning-capa">
                      {doc.slaRemainingText}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(doc.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'border border-border-hairline bg-white text-primary hover:bg-surface-container-low'
                        }`}
                      >
                        {isSelected ? 'در حال بررسی' : 'بررسی سند'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
            ? `تایید و امضای الکترونیکی سند ${activeDoc.code}`
            : confirmState.action === 'return'
            ? `عودت سند ${activeDoc.code} جهت اصلاح`
            : `رد و توقف گردش سند ${activeDoc.code}`
        }
        description={
          confirmState.action === 'approve'
            ? 'با تایید این مرحله، امضای دیجیتال PKI شما ثبت شده و مستند به ایستگاه بعدی ارجاع خواهد شد.'
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
