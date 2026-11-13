import React, { useMemo, useState } from 'react';
import { exportToCsv } from '../data/imsData';
import { CapaItem, ImsDocument, RouteId } from '../types/ims';

interface DashboardPageProps {
  documents: ImsDocument[];
  capas: CapaItem[];
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ documents, capas, onNavigate, onNotify }) => {
  const [standardFilter, setStandardFilter] = useState<string>('همه');
  const [showAllActivities, setShowAllActivities] = useState(false);

  const filteredCapas = useMemo(() => {
    if (standardFilter === 'همه') return capas;
    return capas.filter((c) => c.standard === standardFilter);
  }, [capas, standardFilter]);

  const approvedCount = documents.filter((d) => d.status === 'مصوب').length;
  const pendingCount = documents.filter((d) => d.status === 'در جریان بررسی').length;
  const revisionCount = documents.filter((d) => d.status === 'نیازمند بازنگری').length;

  // Scale realistic enterprise numbers cleanly from baseline + live delta
  const totalDocsDisplay = 1410 + documents.length;
  const approvedDisplay = 1075 + approvedCount;
  const revisionDisplay = 197 + revisionCount;
  const pendingDisplay = 138 + pendingCount;

  const activities = [
    {
      id: 'act-1',
      icon: 'error',
      iconBg: 'bg-red-50 text-critical-hse',
      title: 'ثبت عدم انطباق جدید در واحد الفین',
      module: 'عدم انطباق و CAPA',
      moduleTone: 'bg-red-50 text-critical-hse',
      actor: 'مهندس احمدی (کارشناس ارشد بازرسی)',
      time: 'امروز ۱۴:۲۰',
      status: 'در دست بررسی',
      statusTone: 'bg-sky-50 text-secondary border-sky-200',
      route: 'capa-nc' as RouteId,
    },
    {
      id: 'act-2',
      icon: 'verified',
      iconBg: 'bg-emerald-50 text-tertiary',
      title: 'تصویب و انتشار ویرایش چهارم روش اجرایی مدیریت ریسک',
      module: 'مدیریت مستندات',
      moduleTone: 'bg-slate-100 text-primary',
      actor: 'دکتر شمس (مدیر تضمین کیفیت)',
      time: 'امروز ۱۱:۴۵',
      status: 'تصویب شد',
      statusTone: 'bg-emerald-50 text-tertiary border-emerald-200',
      route: 'documents-list' as RouteId,
    },
    {
      id: 'act-3',
      icon: 'check_circle',
      iconBg: 'bg-emerald-50 text-tertiary',
      title: 'بستن اقدام اصلاحی CAPA-45-090 مرتبط با سنسور LEL',
      module: 'مدیریت HSE',
      moduleTone: 'bg-emerald-50 text-tertiary',
      actor: 'مهندس رضایی (ابزاردقیق)',
      time: 'دیروز ۱۶:۲۰',
      status: 'مختومه',
      statusTone: 'bg-primary text-white border-primary',
      route: 'hse-actions' as RouteId,
    },
    {
      id: 'act-4',
      icon: 'fact_check',
      iconBg: 'bg-sky-50 text-secondary',
      title: 'ثبت یافته‌های ممیزی داخلی واحد یوتیلیتی',
      module: 'مدیریت ممیزی',
      moduleTone: 'bg-sky-50 text-secondary',
      actor: 'مهندس کریمی (ممیز کیفیت)',
      time: 'دیروز ۱۰:۱۵',
      status: 'تکمیل شده',
      statusTone: 'bg-surface-container-low text-on-surface border-border-hairline',
      route: 'audits-findings' as RouteId,
    },
    {
      id: 'act-5',
      icon: 'insights',
      iconBg: 'bg-amber-50 text-warning-capa',
      title: 'به‌روزرسانی شاخص عملکردی EnPI بویلر کمکی',
      module: 'اهداف و شاخص‌ها',
      moduleTone: 'bg-amber-50 text-warning-capa',
      actor: 'مهندس افشار (مدیر انرژی)',
      time: '۲ روز پیش',
      status: 'تایید نهایی',
      statusTone: 'bg-emerald-50 text-tertiary border-emerald-200',
      route: 'kpi-objectives' as RouteId,
    },
    {
      id: 'act-6',
      icon: 'lock',
      iconBg: 'bg-slate-100 text-primary',
      title: 'صدور نسخه کنترل‌شده PR-MET-SOP-014 Rev 04 با واترمارک',
      module: 'توزیع مستندات',
      moduleTone: 'bg-slate-100 text-primary',
      actor: 'مهندس سارا نیک‌پیام (EDMS)',
      time: '۳ روز پیش',
      status: 'ثبت در Audit Trail',
      statusTone: 'bg-surface-container-low text-primary border-border-hairline',
      route: 'documents-distribution' as RouteId,
    },
  ];

  const handleExportCapa = () => {
    exportToCsv(
      'apadana-capa-monitor.csv',
      ['کد پیگیری', 'استاندارد', 'شرح موضوع / عدم انطباق', 'واحد عملیاتی', 'اولویت', 'وضعیت', 'مسئول رسیدگی'],
      filteredCapas.map((c) => [c.id, c.standard, c.description, c.unit, c.priority, c.status, c.owner])
    );
    onNotify('فایل اکسل جدول پایش CAPA دریافت شد', `${filteredCapas.length.toLocaleString('fa-IR')} ردیف با موفقیت خروجی گرفته شد.`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Executive Hero Banner */}
      <section className="bg-white rounded-2xl border border-border-hairline shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-xl sm:text-2xl font-extrabold text-primary leading-snug">
            سامانه جامع مدیریت یکپارچه (IMS) پتروشیمی آپادانا خلیج فارس
          </h1>
          <p className="text-xs sm:text-[13px] text-on-surface-variant leading-6">
            داشبورد جامع نظارت بر عملکرد سیستم مدیریت یکپارچه، مستندات، پایش فرآیندها، ارزیابی ریسک‌ها و فرصت‌ها، ممیزی‌های دوره‌ای و پیگیری اقدامات اصلاحی (CAPA) بر اساس استانداردهای بین‌المللی ISO 9001، ISO 14001، ISO 45001 و ISO 50001 در شرکت پتروشیمی آپادانا خلیج فارس.
          </p>
        </div>

        {/* Maturity & Audit Readiness Summary */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <div className="bg-surface-container-low border border-border-hairline rounded-2xl px-4 py-3.5 flex items-center gap-3 min-w-[200px]">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined !text-[22px]">hub</span>
            </div>
            <div>
              <div className="text-[11px] text-on-surface-variant font-medium">شاخص کل یکپارچگی IMS</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-label-code text-xl font-extrabold text-primary">۹۶.۴٪</span>
                <span className="text-[10.5px] font-bold text-tertiary">بلوغ پیشرفته (L4)</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-border-hairline rounded-2xl px-4 py-3.5 flex items-center gap-3 min-w-[210px]">
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" fill="none" stroke="#DDE3E8" strokeWidth="5" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  fill="none"
                  stroke="#16846B"
                  strokeWidth="5"
                  strokeDasharray="119.38"
                  strokeDashoffset="7.16"
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-label-code absolute text-[11px] font-extrabold text-primary">۹۴٪</span>
            </div>
            <div>
              <div className="text-[11px] text-on-surface-variant font-medium">نرخ انطباق ممیزی‌ها</div>
              <div className="text-xs font-bold text-primary mt-0.5">ممیزی دوره‌ای و انطباق (Grade A)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 1: 4 ISO Pillar Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* ISO 9001 */}
        <div
          onClick={() => onNavigate('audits-program')}
          className="bg-white rounded-2xl border border-border-hairline p-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)] hover:border-secondary transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-code text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-secondary border border-sky-100">
              ISO 9001:2015
            </span>
            <span className="w-8 h-8 rounded-lg bg-sky-50 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[18px]">verified</span>
            </span>
          </div>
          <div className="text-xs text-on-surface-variant font-medium">نرخ انطباق فرآیندهای کیفی</div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="font-label-code text-2xl font-extrabold text-primary">۹۸.۲٪</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-tertiary bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined !text-[14px]">trending_up</span>
              +۱.۴٪
            </span>
          </div>
        </div>

        {/* ISO 45001 */}
        <div
          onClick={() => onNavigate('hse-incidents')}
          className="bg-white rounded-2xl border border-border-hairline p-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)] hover:border-tertiary transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-code text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-critical-hse border border-red-100">
              ISO 45001:2018
            </span>
            <span className="w-8 h-8 rounded-lg bg-red-50 text-critical-hse flex items-center justify-center">
              <span className="material-symbols-outlined !text-[18px]">health_and_safety</span>
            </span>
          </div>
          <div className="text-xs text-on-surface-variant font-medium">ضریب تکرار حوادث ناتوان‌کننده (LTIFR)</div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="font-label-code text-2xl font-extrabold text-primary">۰.۰۰</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-tertiary bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              ایده‌آل صفر
            </span>
          </div>
        </div>

        {/* ISO 14001 */}
        <div
          onClick={() => onNavigate('legal')}
          className="bg-white rounded-2xl border border-border-hairline p-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)] hover:border-tertiary transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-code text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-tertiary border border-emerald-100">
              ISO 14001:2015
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[18px]">eco</span>
            </span>
          </div>
          <div className="text-xs text-on-surface-variant font-medium">پایش آلاینده‌های فلر و پساب</div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="font-label-code text-2xl font-extrabold text-primary">۹۹.۱٪</span>
            <span className="text-[11px] font-bold text-secondary bg-sky-50 px-2 py-0.5 rounded-full">محدوده مجاز</span>
          </div>
        </div>

        {/* ISO 50001 */}
        <div
          onClick={() => onNavigate('kpi-objectives')}
          className="bg-white rounded-2xl border border-border-hairline p-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)] hover:border-primary transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-code text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-primary border border-slate-200">
              ISO 50001:2018
            </span>
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[18px]">bolt</span>
            </span>
          </div>
          <div className="text-xs text-on-surface-variant font-medium">شاخص عملکرد انرژی (EnPI)</div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="font-label-code text-2xl font-extrabold text-primary" dir="ltr">
              4.2 <span className="text-xs font-semibold text-on-surface-variant">MWh/ton</span>
            </span>
            <span className="text-[11px] font-bold text-tertiary bg-emerald-50 px-2 py-0.5 rounded-full">
              -۳.۵٪ بهینه
            </span>
          </div>
        </div>
      </section>

      {/* Row 2: 3 Categorized KPI Rows */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Group 1: Document & Process */}
        <div className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-[17px] text-secondary">folder_managed</span>
              مدیریت مستندات و فرآیندها
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('documents-list')}
              className="text-[11px] font-semibold text-secondary hover:underline cursor-pointer"
            >
              مشاهده فهرست
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('documents-list')}
              className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-right transition-colors cursor-pointer"
            >
              <div className="font-label-code text-lg font-extrabold text-primary">
                {totalDocsDisplay.toLocaleString('fa-IR')}
              </div>
              <div className="text-[11px] text-on-surface-variant mt-0.5">کل مستندات</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('documents-approval-workflow')}
              className="p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/70 text-right border border-amber-200/70 transition-colors cursor-pointer"
            >
              <div className="font-label-code text-lg font-extrabold text-warning-capa">
                {pendingDisplay.toLocaleString('fa-IR')}
              </div>
              <div className="text-[11px] text-amber-800 font-semibold mt-0.5">در انتظار تایید فوری</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('processes-profile')}
              className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-right transition-colors cursor-pointer"
            >
              <div className="font-label-code text-lg font-extrabold text-primary">۵۴</div>
              <div className="text-[11px] text-on-surface-variant mt-0.5">فرآیند سازمان</div>
            </button>
          </div>
        </div>

        {/* Group 2: Risk, NC & Audit */}
        <div className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-[17px] text-critical-hse">shield</span>
              ریسک، عدم انطباق و ممیزی
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('risks-identify')}
              className="text-[11px] font-semibold text-secondary hover:underline cursor-pointer"
            >
              رجیستر ریسک
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-surface-container-low">
              <div className="font-label-code text-base font-extrabold text-primary">۱۸۶</div>
              <div className="text-[10.5px] text-on-surface-variant">ریسک فعال</div>
              <div className="text-[10px] font-bold text-critical-hse mt-0.5">۱۲ بحرانی</div>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-100">
              <div className="font-label-code text-base font-extrabold text-critical-hse">۹</div>
              <div className="text-[10.5px] text-red-900">عدم انطباق باز</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
              <div className="font-label-code text-base font-extrabold text-warning-capa">۱۴</div>
              <div className="text-[10.5px] text-amber-900">اقدام اصلاحی</div>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100">
              <div className="font-label-code text-base font-extrabold text-secondary">۶</div>
              <div className="text-[10.5px] text-sky-900">ممیزی برنامه‌ریزی</div>
            </div>
          </div>
        </div>

        {/* Group 3: Strategic Objectives */}
        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-[17px] text-tertiary">target</span>
              اهداف و بهبود استراتژیک
            </h2>
            <span className="text-[11px] font-bold text-tertiary bg-emerald-50 px-2 py-0.5 rounded-full">
              +۴.۲٪ رشد فصلی
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-label-code text-2xl font-extrabold text-primary">۸۸.۵٪</span>
              <span className="text-[11px] text-on-surface-variant">تحقق کل اهداف از ۳۸ KPI فعال</span>
            </div>
            <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-l from-tertiary to-secondary rounded-full" style={{ width: '88.5%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: Charts Row (8 cols + 4 cols) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 8 cols: CAPA & Audit Trend SVG Chart */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-border-hairline p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary">روند ممیزی‌های دوره‌ای و اقدامات اصلاحی (CAPA)</h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                تحلیل مقایسه‌ای عدم انطباق‌های شناسایی‌شده در برابر بسته‌شده (۴ ماه اخیر ۱۴۰۳)
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-secondary" />
                رفع شده / بسته شده
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary/25" />
                بازنگری جدید
              </span>
            </div>
          </div>

          {/* Crisp Responsive SVG Chart */}
          <div className="w-full h-56 bg-surface-container-low/50 rounded-xl p-4 border border-border-hairline/60 flex items-end justify-between gap-4 relative">
            {/* Horizontal grid lines */}
            <div className="absolute inset-x-4 top-6 bottom-10 flex flex-col justify-between pointer-events-none">
              {[50, 40, 30, 20, 10].map((v) => (
                <div key={v} className="border-b border-dashed border-border-hairline/80 flex items-center">
                  <span className="font-label-code text-[9.5px] text-outline -mt-3 bg-white/70 px-1 rounded">
                    {v.toLocaleString('fa-IR')}
                  </span>
                </div>
              ))}
            </div>

            {[
              { month: 'مهر ۱۴۰۳', closed: 34, opened: 38 },
              { month: 'آبان ۱۴۰۳', closed: 39, opened: 42 },
              { month: 'آذر ۱۴۰۳', closed: 37, opened: 40 },
              { month: 'دی ۱۴۰۳ (هفته ۳)', closed: 32, opened: 34 },
            ].map((bar) => (
              <div key={bar.month} className="relative z-10 flex-1 flex flex-col items-center h-full justify-end">
                <div className="flex items-end gap-2 h-36 w-full justify-center">
                  <div
                    className="w-7 sm:w-9 rounded-t-lg bg-gradient-to-t from-secondary to-[#3a86ba] shadow-sm relative group transition-all"
                    style={{ height: `${(bar.closed / 48) * 100}%` }}
                  >
                    <span className="font-label-code absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary">
                      {bar.closed.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div
                    className="w-7 sm:w-9 rounded-t-lg bg-primary/20 border border-primary/20 relative"
                    style={{ height: `${(bar.opened / 48) * 100}%` }}
                  >
                    <span className="font-label-code absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-on-surface-variant">
                      {bar.opened.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-primary mt-2.5 text-center">{bar.month}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3.5 border-t border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined !text-[18px] text-tertiary">check_circle</span>
              <span>
                تعداد کل CAPAهای مختومه این دوره: <strong className="text-primary">۱۴۲ مورد از ۱۵۴ مورد</strong> اعلامی (۹۲.۲٪ تحقق)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('capa-nc')}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              مشاهده گزارش تفصیلی CAPA
            </button>
          </div>
        </div>

        {/* 4 cols: Active PTW Donut */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-border-hairline p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-primary">پروانه‌های کار فعال (PTW)</h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">توزیع مجوزهای ایمنی شیفت در حال کار</p>
            </div>
            <span className="font-label-code text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface-container-low text-primary border border-border-hairline">
              ۶۸ مجوز
            </span>
          </div>

          <div className="my-4 flex items-center justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-40 h-40 -rotate-90">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#E9EFF4" strokeWidth="16" />
                {/* Hot Work 38% -> 289 * 0.38 = 110 */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="16"
                  strokeDasharray="110 289"
                  strokeDashoffset="0"
                />
                {/* Cold Work 47% -> 136 */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#142C43"
                  strokeWidth="16"
                  strokeDasharray="136 289"
                  strokeDashoffset="-110"
                />
                {/* Confined Space 15% -> 43 */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#1E5A85"
                  strokeWidth="16"
                  strokeDasharray="43 289"
                  strokeDashoffset="-246"
                />
              </svg>
              <div className="absolute text-center">
                <div className="font-label-code text-2xl font-extrabold text-primary">۶۸</div>
                <div className="text-[10.5px] text-on-surface-variant">کل پروانه‌ها</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/70">
              <span className="flex items-center gap-2 font-semibold text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-critical-hse" />
                کار گرم (Hot Work)
              </span>
              <span className="font-label-code font-bold text-primary">۲۶ (۳۸٪)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/70">
              <span className="flex items-center gap-2 font-semibold text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                کار سرد (Cold Work)
              </span>
              <span className="font-label-code font-bold text-primary">۳۲ (۴۷٪)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/70">
              <span className="flex items-center gap-2 font-semibold text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                فضای بسته (Confined Space)
              </span>
              <span className="font-label-code font-bold text-primary">۱۰ (۱۵٪)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Row 4: Secondary Analytics (Document Lifecycle & NC Severity) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Document Lifecycle Donut */}
        <div className="bg-white rounded-2xl border border-border-hairline p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary">وضعیت مستندات بر اساس چرخه تایید و انتشار</h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                تحلیل توزیع {totalDocsDisplay.toLocaleString('fa-IR')} سند ثبت‌شده در سامانه مستندات
              </p>
            </div>
            <span className="font-label-code text-[11px] font-bold px-2.5 py-1 rounded-lg bg-surface-container-low text-secondary border border-border-hairline">
              IMS Docs
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#E9EFF4" strokeWidth="14" />
                <circle cx="60" cy="60" r="46" fill="none" stroke="#16846B" strokeWidth="14" strokeDasharray="220 289" strokeDashoffset="0" />
                <circle cx="60" cy="60" r="46" fill="none" stroke="#D97706" strokeWidth="14" strokeDasharray="40 289" strokeDashoffset="-220" />
                <circle cx="60" cy="60" r="46" fill="none" stroke="#DC2626" strokeWidth="14" strokeDasharray="29 289" strokeDashoffset="-260" />
              </svg>
              <div className="absolute text-center">
                <div className="font-label-code text-xl font-extrabold text-primary">
                  {totalDocsDisplay.toLocaleString('fa-IR')}
                </div>
                <div className="text-[10px] text-on-surface-variant">کل مدارک</div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low">
                <span className="flex items-center gap-2 font-semibold text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                  منتشر شده و مصوب
                </span>
                <span className="font-label-code font-bold text-primary">
                  {approvedDisplay.toLocaleString('fa-IR')} (۷۶٪)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low">
                <span className="flex items-center gap-2 font-semibold text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-warning-capa" />
                  در حال بازنگری دوره‌ای
                </span>
                <span className="font-label-code font-bold text-primary">
                  {revisionDisplay.toLocaleString('fa-IR')} (۱۴٪)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low">
                <span className="flex items-center gap-2 font-semibold text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-critical-hse" />
                  در انتظار تایید مراجع
                </span>
                <span className="font-label-code font-bold text-primary">
                  {pendingDisplay.toLocaleString('fa-IR')} (۱۰٪)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>آخرین به‌روزرسانی بانک مدارک: امروز</span>
            <span className="font-bold text-tertiary">شاخص اعتبار مدارک: ۹۸.۴٪</span>
          </div>
        </div>

        {/* Non-Conformity Severity Stacked Bars */}
        <div className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary">توزیع عدم انطباق‌ها بر اساس شدت و ماژول‌های ISO</h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                تفکیک موارد شناسایی‌شده در ممیزی‌ها و پایش میدانی
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10.5px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-critical-hse" /> بحرانی
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-warning-capa" /> متوسط
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-tertiary" /> جزئی
              </span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {[
              { label: 'کیفیت (ISO 9001)', detail: '۳ مورد (۱ بحرانی، ۲ جزئی)', crit: 33, med: 0, low: 67 },
              { label: 'ایمنی و بهداشت حرفه‌ای (ISO 45001)', detail: '۴ مورد (۲ بحرانی، ۱ متوسط، ۱ جزئی)', crit: 50, med: 25, low: 25 },
              { label: 'محیط زیست (ISO 14001)', detail: '۲ مورد (۱ متوسط، ۱ جزئی)', crit: 0, med: 50, low: 50 },
              { label: 'مدیریت انرژی (ISO 50001)', detail: '۱ مورد (متوسط)', crit: 0, med: 100, low: 0 },
            ].map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">{row.label}</span>
                  <span className="text-[11px] text-on-surface-variant">{row.detail}</span>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                  {row.crit > 0 && <div className="bg-critical-hse h-full" style={{ width: `${row.crit}%` }} />}
                  {row.med > 0 && <div className="bg-warning-capa h-full" style={{ width: `${row.med}%` }} />}
                  {row.low > 0 && <div className="bg-tertiary h-full" style={{ width: `${row.low}%` }} />}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>مجموع کل عدم انطباق‌های باز: ۹ مورد</span>
            <span className="font-bold text-tertiary">نرخ کنترل عدم انطباق: ۹۶٪</span>
          </div>
        </div>
      </section>

      {/* Row 5: Operational Split (CAPA Table + Upcoming Audits) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 8 cols: CAPA Monitor Table */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-border-hairline p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary">جدول پایش اقدامات اصلاحی و رویدادهای اخیر</h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                ثبت عدم انطباق‌ها، ممیزی‌های داخلی و هشدارهای HSE در ۲۴ ساعت گذشته
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={standardFilter}
                onChange={(e) => setStandardFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none cursor-pointer"
              >
                <option value="همه">فیلتر استاندارد (همه)</option>
                <option value="ISO 45001">ISO 45001</option>
                <option value="ISO 14001">ISO 14001</option>
                <option value="ISO 9001">ISO 9001</option>
                <option value="ISO 50001">ISO 50001</option>
              </select>
              <button
                type="button"
                onClick={handleExportCapa}
                className="px-3 py-1.5 rounded-lg border border-border-hairline hover:bg-surface-container-low text-xs font-semibold text-primary inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[16px]">download</span>
                خروجی اکسل
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-surface-container-low text-[11px] text-on-surface-variant border-y border-border-hairline">
                  <th className="py-2.5 px-3 font-bold">کد پیگیری</th>
                  <th className="py-2.5 px-3 font-bold">استاندارد</th>
                  <th className="py-2.5 px-3 font-bold">شرح موضوع / عدم انطباق</th>
                  <th className="py-2.5 px-3 font-bold">واحد عملیاتی</th>
                  <th className="py-2.5 px-3 font-bold">اولویت</th>
                  <th className="py-2.5 px-3 font-bold">وضعیت</th>
                  <th className="py-2.5 px-3 font-bold">مسئول رسیدگی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline/70 text-xs">
                {filteredCapas.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onNavigate('capa-nc')}
                    className="hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-label-code font-bold text-primary whitespace-nowrap">{item.id}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-secondary border border-sky-100">
                        {item.standard}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-on-surface">{item.description}</td>
                    <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">{item.unit}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          item.priority === 'فوری'
                            ? 'bg-red-50 text-critical-hse'
                            : item.priority === 'متوسط'
                            ? 'bg-amber-50 text-warning-capa'
                            : 'bg-slate-100 text-on-surface-variant'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border ${
                          item.status === 'تایید شده'
                            ? 'bg-emerald-50 text-tertiary border-emerald-200'
                            : item.status === 'اقدام نهایی'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface-container-low text-primary border-border-hairline'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">{item.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4 cols: Upcoming Audits */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-border-hairline p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-primary">ممیزی‌های پیش رو</h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">برنامه ممیزی‌های داخلی، ثالث و مراقبتی</p>
              </div>
              <span className="material-symbols-outlined text-secondary">event_upcoming</span>
            </div>

            <div className="space-y-3">
              {[
                {
                  badge: 'ممیزی مراقبتی نوبت دوم',
                  days: '۵ روز مانده',
                  title: 'ممیزی خارجی ISO 9001 و ISO 45001',
                  auditor: 'سرتیمیر شرکت SGS',
                  date: '۲۷ دی‌ماه ۱۴۰۳',
                  scope: 'واحدهای هدف: بهره‌برداری الفین، مخازن صادراتی، HSE سایت',
                  urgent: true,
                },
                {
                  badge: 'ممیزی تمدید گواهینامه',
                  days: '۱۸ روز مانده',
                  title: 'ممیزی جامع محیط زیست ISO 14001',
                  auditor: 'تیم ممیزی توف نورد (TUV)',
                  date: '۱۲ بهمن‌ماه ۱۴۰۳',
                  scope: 'واحدهای هدف: سیستم تصفیه پساب صنعتی، مدیریت پسماند شیمیایی',
                  urgent: false,
                },
                {
                  badge: 'ممیزی داخلی دوره‌ای',
                  days: '۳۲ روز مانده',
                  title: 'ارزیابی انطباق استاندارد انرژی ISO 50001',
                  auditor: 'کمیته انرژی پتروشیمی آپادانا',
                  date: '۲۶ بهمن‌ماه ۱۴۰۳',
                  scope: 'واحدهای هدف: بویلرها و توربین‌های تولید برق',
                  urgent: false,
                },
              ].map((aud) => (
                <div
                  key={aud.title}
                  onClick={() => onNavigate('audits-program')}
                  className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline hover:border-secondary transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10.5px] font-bold text-secondary">{aud.badge}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        aud.urgent ? 'bg-red-50 text-critical-hse' : 'bg-white text-primary border border-border-hairline'
                      }`}
                    >
                      {aud.days}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-primary">{aud.title}</h3>
                  <div className="flex items-center justify-between text-[10.5px] text-on-surface-variant mt-1.5">
                    <span>{aud.auditor}</span>
                    <span>{aud.date}</span>
                  </div>
                  <p className="text-[10.5px] text-outline mt-1 leading-4">{aud.scope}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('audits-program')}
            className="w-full mt-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border-hairline text-xs font-bold text-primary flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">calendar_month</span>
            مشاهده تقویم کامل سالانه ممیزی‌ها
          </button>
        </div>
      </section>

      {/* Row 6: Recent System Activity Log */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-primary">آخرین فعالیت‌های سامانه</h2>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-tertiary bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              ثبت برخط
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAllActivities((v) => !v)}
            className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[16px]">history</span>
            {showAllActivities ? 'نمایش خلاصه فعالیت‌ها' : 'مشاهده آرشیو کامل فعالیت‌ها'}
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-container-low text-[11px] text-on-surface-variant border-y border-border-hairline">
                <th className="py-2.5 px-3 font-bold">شرح فعالیت</th>
                <th className="py-2.5 px-3 font-bold">ماژول مربوطه</th>
                <th className="py-2.5 px-3 font-bold">کاربر انجام‌دهنده</th>
                <th className="py-2.5 px-3 font-bold">تاریخ و ساعت</th>
                <th className="py-2.5 px-3 font-bold">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70 text-xs">
              {(showAllActivities ? activities : activities.slice(0, 5)).map((act) => (
                <tr
                  key={act.id}
                  onClick={() => onNavigate(act.route)}
                  className="hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${act.iconBg}`}>
                        <span className="material-symbols-outlined !text-[16px]">{act.icon}</span>
                      </span>
                      <span className="font-semibold text-primary">{act.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg ${act.moduleTone}`}>
                      {act.module}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">{act.actor}</td>
                  <td className="py-3 px-3 text-on-surface-variant font-label-code">{act.time}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border ${act.statusTone}`}>
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
