import React, { useMemo, useState } from 'react';
import { exportToCsv } from '../data/imsData';
import { AuditTrailEntry, DistributionMatrixRow, PermissionFlags, RouteId } from '../types/ims';

interface DocumentDistributionPageProps {
  matrixRows: DistributionMatrixRow[];
  auditTrail: AuditTrailEntry[];
  onTogglePermission: (
    rowId: string,
    mode: 'unit' | 'user',
    targetKey: string,
    flag: keyof PermissionFlags
  ) => void;
  onIssueControlledCopy: (entry: AuditTrailEntry) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const DocumentDistributionPage: React.FC<DocumentDistributionPageProps> = ({
  matrixRows,
  auditTrail,
  onTogglePermission,
  onIssueControlledCopy,
  onNavigate,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [docGroupFilter, setDocGroupFilter] = useState('');
  const [confFilter, setConfFilter] = useState('');
  const [matrixMode, setMatrixMode] = useState<'unit' | 'user'>('unit');

  const [copyForm, setCopyForm] = useState({
    docCode: 'PR-MIS-STP-02-00 Rev 00',
    distType: 'نسخه دیجیتال (کارتابل امن)',
    copyNum: 'Copy #04',
    receiver: 'اتاق کنترل واحد متانول (سرپرست شیفت - مهندس کاظمی)',
    date: '۱۴۰۳/۰۸/۲۴',
    ackRequired: true,
  });

  const [showQuickModal, setShowQuickModal] = useState(false);

  const filteredRows = useMemo(() => {
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

  const columns =
    matrixMode === 'unit'
      ? [
          { key: 'ops', title: 'مدیریت بهره‌برداری', sub: 'متانول، الفین و یوتیلیتی' },
          { key: 'hse', title: 'مدیریت HSE و آتش‌نشانی', sub: 'ایمنی فرآیند و محیط زیست' },
          { key: 'inspection', title: 'مدیریت فنی و بازرسی', sub: 'بازرسی فنی و نگهداری' },
          { key: 'qc', title: 'آزمایشگاه و کنترل کیفیت', sub: 'آنالیز محصول و کالیبراسیون' },
        ]
      : [
          { key: 'kazemi', title: 'مهندس مهران کاظمی', sub: 'مدیر تضمین کیفیت (IMS)' },
          { key: 'nikpey', title: 'مهندس سارا نیک‌پی', sub: 'کارشناس ارشد بهره‌برداری' },
          { key: 'hedari', title: 'مهندس حمید دهداری', sub: 'سرپرست HSE و آتش‌نشانی' },
          { key: 'parsa', title: 'دکتر آرش پارسا', sub: 'مسئول آزمایشگاه مرکزی' },
        ];

  const handleSubmitControlledCopy = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: AuditTrailEntry = {
      id: `log-${Date.now()}`,
      type: 'print',
      title: copyForm.distType.includes('دیجیتال') ? 'توزیع نسخه دیجیتال کنترل‌شده' : 'چاپ کنترل‌شده با واترمارک',
      badge: 'مجاز',
      docRef: `سند: ${copyForm.docCode}`,
      detail: `گیرنده: ${copyForm.receiver} (${copyForm.copyNum})`,
      timestamp: `${copyForm.date} - هم‌اکنون`,
      tag: `Watermark ${copyForm.copyNum}`,
    };
    onIssueControlledCopy(newEntry);
    onNotify('صدور نسخه کنترل‌شده ثبت گردید', `${copyForm.docCode} با کد ${copyForm.copyNum} ابلاغ شد.`, 'success');
  };

  const handleExportAuditPack = () => {
    exportToCsv(
      'apadana-iso27001-audit-trail.csv',
      ['نوع رویداد', 'وضعیت', 'سند مرتبط', 'جزئیات', 'زمان ثبت', 'شناسه امنیتی'],
      auditTrail.map((a) => [a.title, a.badge, a.docRef, a.detail, a.timestamp, a.tag])
    );
    onNotify('بسته ممیزی ISO 27001 دانلود شد', 'سوابق تغییرناپذیر توزیع و چاپ در فایل CSV ذخیره گردید.', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined !text-[16px]">verified_user</span>
            بند ۷.۵ استانداردهای ISO 9001:2015 و ISO/IEC 27001:2022 (کنترل اطلاعات مدون و سطوح محرمانگی)
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-primary">
            ماتریس توزیع، کنترل سطوح دسترسی و نسخه‌های تحت کنترل اسناد
          </h1>
          <p className="text-xs text-on-surface-variant">
            سامانه نظارت بر نسخ معتبر، صدور پروانه‌های چاپی مهرشده با واترمارک هولوگرافیک و رهگیری گردش امن اسناد پتروشیمی آپادانا
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowQuickModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">send</span>
            ثبت توزیع نسخه جدید / ارسال امن
          </button>
          <button
            type="button"
            onClick={() => onNavigate('documents-archive')}
            className="px-4 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">inventory_2</span>
            بازرسی نسخ منسوخ
          </button>
          <button
            type="button"
            onClick={() => onNotify('آماده‌سازی نسخه چاپی ماتریس دسترسی', 'نسخه چاپی با واترمارک کنترل‌شده ارسال شد.', 'info')}
            className="p-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-primary cursor-pointer"
            title="چاپ ماتریس"
          >
            <span className="material-symbols-outlined !text-[18px]">print</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[19px]">print</span>
            </span>
            <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-surface-container-low text-primary">
              ISO 9001: 7.5.3
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-label-code text-2xl font-extrabold text-primary">۱,۴۸۲</span>
              <span className="text-xs text-on-surface-variant">مستند فعال</span>
            </div>
            <div className="text-xs font-bold text-primary mt-0.5">مستندات دارای نسخه کنترل‌شده</div>
            <div className="text-[11px] text-on-surface-variant mt-1">۱,۲۳۰ دیجیتال رمزنگاری / ۲۵۲ کاغذی مهرشده</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[19px]">groups</span>
            </span>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-tertiary">
              فعال و برخط
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-label-code text-2xl font-extrabold text-tertiary">۳۴۸</span>
              <span className="text-xs text-on-surface-variant">ایستگاه و پرسنل</span>
            </div>
            <div className="text-xs font-bold text-primary mt-0.5">گیرندگان مجاز سازمانی</div>
            <div className="w-full h-1.5 bg-surface-container rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-tertiary rounded-full" style={{ width: '82%' }} />
            </div>
            <div className="text-[10.5px] text-on-surface-variant mt-1">۸۲٪ احراز هویت دو مرحله‌ای</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-red-50 text-critical-hse flex items-center justify-center">
              <span className="material-symbols-outlined !text-[19px]">assignment_return</span>
            </span>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-critical-hse">
              اقدام فوری
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-label-code text-2xl font-extrabold text-critical-hse">۱۴</span>
              <span className="text-xs text-on-surface-variant">نسخه فیزیکی</span>
            </div>
            <div className="text-xs font-bold text-primary mt-0.5">نسخ منسوخ نیازمند جمع‌آوری</div>
            <div className="text-[11px] text-critical-hse mt-1">مهلت امحاء / بازپس‌گیری: ۴۸ ساعت</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-slate-100 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[19px]">shield_lock</span>
            </span>
            <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-primary">
              ISO 27001
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-label-code text-2xl font-extrabold text-primary">۴</span>
              <span className="text-xs text-on-surface-variant">سطح طبقه‌بندی</span>
            </div>
            <div className="text-xs font-bold text-primary mt-0.5 mb-2">پروتکل محرمانگی اسناد</div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-center">
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-tertiary">عمومی (C1)</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-secondary">داخلی (C2)</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-warning-capa">محرمانه فنی (C3)</span>
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-critical-hse">فوق‌محرمانه (C4)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Navy Security Hero Banner */}
      <section className="rounded-2xl bg-[#142C43] text-white p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center shadow-sm">
        <div className="lg:col-span-7 space-y-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            سیستم انحصاری مدیریت دسترسی پویا بر مبنای نقش (Dynamic RBAC)
          </span>
          <h2 className="text-base sm:text-lg font-extrabold leading-snug">
            چاپ اسناد تنها با درج خودکار واترمارک نام شخص، تاریخ و شماره پروانه کنترل‌شده
          </h2>
          <p className="text-xs text-white/80 leading-6">
            مطابق بند ۷.۵.۳ سیستم مدیریت یکپارچه، هرگونه بارگیری یا چاپ نسخه کاغذی فرم‌ها و روش‌های اجرایی (SOP) در بستر شبکه، حامل واترمارک اختصاصی «نسخه تحت کنترل» با تاریخ انقضای ۷۲ ساعته بوده و تکثیر آن غیرمجاز تلقی می‌گردد.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-label-code">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">SHA-256 Digital Signature</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">72-Hour Ephemeral Cache</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">Dynamic Verification QR</span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white/10 border border-white/15 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/15">
            <span className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-[17px] text-emerald-300">verified</span>
              اعتبارسنجی زنده ماتریس توزیع
            </span>
            <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              SECURE 100%
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span>واحد متانول و ریفرمر</span>
            <span className="font-label-code text-emerald-300 font-bold">Full Read (SOPs)</span>
          </div>
          <div className="flex justify-between py-1">
            <span>آتش‌نشانی و ایمنی HSE</span>
            <span className="font-label-code text-amber-300 font-bold">Controlled Print (HAZOP)</span>
          </div>
          <div className="flex justify-between py-1">
            <span>مهندسی عمومی پتروشیمی</span>
            <span className="font-label-code text-sky-200 font-bold">C3 Restricted Rev 04</span>
          </div>
        </div>
      </section>

      {/* Filters & Mode Toggle */}
      <section className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی کد سند، عنوان یا واحد سازمانی..."
            className="px-3.5 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs min-w-[230px] flex-1 focus:outline-none focus:border-secondary"
          />
          <select
            value={docGroupFilter}
            onChange={(e) => setDocGroupFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="">همه گروه‌های مستنداتی (SOP, HSE, P&ID, IMS)</option>
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
            <option value="">سطح طبقه‌بندی: همه سطوح</option>
            <option value="C1">C1 - عمومی</option>
            <option value="C2">C2 - سازمانی</option>
            <option value="C3">C3 - محرمانه فنی</option>
            <option value="C4">C4 - فوق‌محرمانه</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-on-surface-variant">وضعیت نمایش ماتریس:</span>
          <div className="inline-flex rounded-xl bg-surface-container-low p-1 border border-border-hairline">
            <button
              type="button"
              onClick={() => setMatrixMode('unit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                matrixMode === 'unit' ? 'bg-primary text-white' : 'text-on-surface-variant'
              }`}
            >
              واحدهای عملیاتی
            </button>
            <button
              type="button"
              onClick={() => setMatrixMode('user')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                matrixMode === 'user' ? 'bg-primary text-white' : 'text-on-surface-variant'
              }`}
            >
              کاربران کلیدی
            </button>
          </div>
        </div>
      </section>

      {/* Interactive RBAC Matrix Table */}
      <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden">
        <div className="p-4 border-b border-border-hairline flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/40">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">grid_on</span>
            ماتریس مجوزهای دسترسی به تفکیک ساختار پتروشیمی (Distribution Matrix)
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16846B]" /> مشاهده (R)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E5A85]" /> چاپ با واترمارک (P)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> ویرایش پیش‌نویس (W)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#142C43]" /> تصویب نهایی (A)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[1160px] text-right border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                <th className="py-3 px-4">مشخصات سند / گروه فرآیندی</th>
                <th className="py-3 px-3">کد مدرک</th>
                <th className="py-3 px-3">نسخه</th>
                <th className="py-3 px-3">سطح محرمانگی</th>
                {columns.map((col) => (
                  <th key={col.key} className="py-3 px-3 text-center">
                    <div className="text-primary">{col.title}</div>
                    <div className="text-[10px] font-normal text-on-surface-variant">{col.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70">
              {filteredRows.map((row) => {
                const badgeCls =
                  row.badgeColor === 'critical'
                    ? 'bg-red-50 text-critical-hse border-red-200'
                    : row.badgeColor === 'secondary'
                    ? 'bg-sky-50 text-secondary border-sky-200'
                    : row.badgeColor === 'tertiary'
                    ? 'bg-emerald-50 text-tertiary border-emerald-200'
                    : 'bg-slate-100 text-primary border-slate-200';

                const confCls =
                  row.confidentialityTone === 'critical'
                    ? 'bg-red-50 text-critical-hse border-red-200'
                    : row.confidentialityTone === 'warning'
                    ? 'bg-amber-50 text-warning-capa border-amber-200'
                    : row.confidentialityTone === 'secondary'
                    ? 'bg-sky-50 text-secondary border-sky-200'
                    : 'bg-emerald-50 text-tertiary border-emerald-200';

                const permRecord = matrixMode === 'unit' ? row.unitPermissions : row.userPermissions;

                return (
                  <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`font-label-code text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${badgeCls}`}
                        >
                          {row.badgeCode}
                        </span>
                        <div>
                          <div className="font-bold text-primary">{row.title}</div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5">{row.subtitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-label-code font-bold text-secondary whitespace-nowrap">
                      {row.code}
                    </td>
                    <td className="py-3.5 px-3 font-label-code font-bold text-primary whitespace-nowrap">
                      {row.version}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full border ${confCls}`}>
                        {row.confidentiality}
                      </span>
                    </td>
                    {columns.map((col) => {
                      const flags = (permRecord as Record<string, PermissionFlags>)[col.key];
                      const flagSpecs: { k: keyof PermissionFlags; activeCls: string; label: string }[] = [
                        { k: 'R', activeCls: 'bg-[#16846B] text-white border-[#16846B]', label: 'مشاهده' },
                        { k: 'P', activeCls: 'bg-[#1E5A85] text-white border-[#1E5A85]', label: 'چاپ با واترمارک' },
                        { k: 'W', activeCls: 'bg-[#D97706] text-white border-[#D97706]', label: 'ویرایش' },
                        { k: 'A', activeCls: 'bg-[#142C43] text-white border-[#142C43]', label: 'تصویب' },
                      ];
                      return (
                        <td key={col.key} className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {flagSpecs.map((fs) => {
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
                                  className={`w-7 h-7 rounded-lg font-label-code text-[11px] font-bold border transition-all cursor-pointer ${
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
      </section>

      {/* Dual Bottom Split: FORM-IMS-08 + Audit Trail */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 5 cols: Controlled Copy Issue Form */}
        <section className="xl:col-span-5 bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-hairline pb-3">
            <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary">verified</span>
              ثبت توزیع نسخه تحت کنترل (Controlled Copy)
            </h2>
            <span className="font-label-code text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-hairline text-primary">
              FORM-IMS-08
            </span>
          </div>

          <form onSubmit={handleSubmitControlledCopy} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-primary mb-1">سند مصوب آماده توزیع</label>
              <select
                value={copyForm.docCode}
                onChange={(e) => setCopyForm({ ...copyForm, docCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-semibold text-primary"
              >
                <option value="PR-MIS-STP-02-00 Rev 00">PR-MIS-STP-02-00 Rev 00 — روش اجرایی تست هیدرواستاتیک</option>
                <option value="PR-MET-SOP-014 Rev 04">PR-MET-SOP-014 Rev 04 — راه‌اندازی اضطراری ریفرمر</option>
                <option value="HSE-MAN-SOP-003 Rev 07">HSE-MAN-SOP-003 Rev 07 — صدور پروانه کار PTW</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-primary mb-1">نوع توزیع</label>
                <select
                  value={copyForm.distType}
                  onChange={(e) => setCopyForm({ ...copyForm, distType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low"
                >
                  <option value="نسخه دیجیتال (کارتابل امن)">نسخه دیجیتال (کارتابل امن)</option>
                  <option value="نسخه کاغذی مهرشده (Hardcopy)">نسخه کاغذی مهرشده</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-primary mb-1">شماره نسخه چاپی</label>
                <input
                  type="text"
                  value={copyForm.copyNum}
                  onChange={(e) => setCopyForm({ ...copyForm, copyNum: e.target.value })}
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code font-bold text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1">واحد سازمانی / سمت تحویل‌گیرنده</label>
              <input
                type="text"
                value={copyForm.receiver}
                onChange={(e) => setCopyForm({ ...copyForm, receiver: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border-hairline"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block font-bold text-primary mb-1">تاریخ تحویل</label>
                <input
                  type="text"
                  value={copyForm.date}
                  onChange={(e) => setCopyForm({ ...copyForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code"
                />
              </div>
              <label className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                <span className="font-bold text-tertiary text-[11px]">امضای دیجیتال تایید دریافت</span>
                <input
                  type="checkbox"
                  checked={copyForm.ackRequired}
                  onChange={(e) => setCopyForm({ ...copyForm, ackRequired: e.target.checked })}
                  className="w-4 h-4 accent-tertiary"
                />
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-secondary text-white font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[17px]">task_alt</span>
              ثبت توزیع رسمی و صدور گواهی تحویل
            </button>
          </form>

          {/* Controlled Embossed Stamp Preview */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-hairline flex items-center justify-between gap-3">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-critical-hse/60 bg-white flex flex-col items-center justify-center text-critical-hse shrink-0">
              <span className="material-symbols-outlined !text-[20px]">verified</span>
              <span className="font-label-code text-[8.5px] font-extrabold">CONTROLLED</span>
            </div>
            <div className="flex-1 text-[11px]">
              <div className="font-bold text-primary">پیش‌نمایش مهر برجسته و واترمارک</div>
              <p className="text-on-surface-variant mt-0.5 leading-4">
                مهر رسمی کنترل کیفیت بر کلیه برگه‌های پرینت با ابعاد ۶×۳ سانتی‌متر
              </p>
            </div>
            <span className="font-label-code text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-tertiary shrink-0">
              Rev Certified
            </span>
          </div>
        </section>

        {/* 7 cols: Real-time Audit Trail */}
        <section className="xl:col-span-7 bg-white rounded-2xl border border-border-hairline p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-hairline pb-3 mb-4">
              <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary">history_edu</span>
                سوابق بلادرنگ دسترسی‌ها، چاپ‌ها و جمع‌آوری نسخ
              </h2>
              <span className="font-label-code text-[10.5px] font-bold text-outline">
                ISO 27001 Access Audit Trail
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {auditTrail.map((log) => {
                const icon =
                  log.type === 'print'
                    ? 'print'
                    : log.type === 'recall'
                    ? 'delete_sweep'
                    : log.type === 'block'
                    ? 'gpp_maybe'
                    : 'mark_email_read';
                const tone =
                  log.type === 'print'
                    ? 'bg-sky-50 text-secondary'
                    : log.type === 'recall'
                    ? 'bg-red-50 text-critical-hse'
                    : log.type === 'block'
                    ? 'bg-amber-50 text-warning-capa'
                    : 'bg-emerald-50 text-tertiary';

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                        <span className="material-symbols-outlined !text-[18px]">{icon}</span>
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-primary">{log.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{log.badge}</span>
                        </div>
                        <div className="font-semibold text-secondary mt-0.5">{log.docRef}</div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">{log.detail}</div>
                      </div>
                    </div>

                    <div className="sm:text-left shrink-0">
                      <div className="font-label-code text-[10.5px] text-outline">{log.timestamp}</div>
                      <span className="font-label-code inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-border-hairline text-primary">
                        {log.tag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
            <span>سوابق لاگ‌ها مطابق الزامات ممیزی ISO 27001 به مدت ۵ سال بایگانی غیرقابل تغییر (WORM) می‌گردند.</span>
            <button
              type="button"
              onClick={handleExportAuditPack}
              className="px-3.5 py-2 rounded-xl border border-border-hairline bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px]">download</span>
              خروجی لاگ ممیزی (Audit Pack)
            </button>
          </div>
        </section>
      </div>

      {/* Quick Distribution Modal */}
      {showQuickModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-md bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">ارسال امن نسخه جدید به واحدهای سایت</h3>
              <button type="button" onClick={() => setShowQuickModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <p className="text-on-surface-variant leading-6">
                تمامی نسخه‌های توزیع‌شده به‌صورت خودکار با کلید <span className="font-label-code font-bold">SHA-256</span> و کد پرسنلی دریافت‌کننده مهروموم می‌گردند.
              </p>
              <button
                type="button"
                onClick={() => {
                  onIssueControlledCopy({
                    id: `log-${Date.now()}`,
                    type: 'ack',
                    title: 'ابلاغ جمعی نسخه کنترل‌شده از طریق پورتال امن',
                    badge: 'ابلاغ شد',
                    docRef: `سند: ${copyForm.docCode}`,
                    detail: 'ارسال به تمامی سرپرستان شیفت بهره‌برداری و ایمنی سایت',
                    timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
                    tag: 'Batch Secure #914',
                  });
                  setShowQuickModal(false);
                  onNotify('توزیع امن انجام شد', 'گزارش ابلاغ در سوابق ISO 27001 ثبت گردید.', 'success');
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold cursor-pointer"
              >
                تایید و ارسال ابلاغیه امن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
