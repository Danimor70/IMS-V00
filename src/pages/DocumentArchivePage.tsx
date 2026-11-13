import React, { useMemo, useState } from 'react';
import { ARCHIVE_VAULT_IMG, exportToCsv } from '../data/imsData';
import { ObsoleteDocRecord, RouteId } from '../types/ims';

interface DocumentArchivePageProps {
  obsoleteDocs: ObsoleteDocRecord[];
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const DocumentArchivePage: React.FC<DocumentArchivePageProps> = ({
  obsoleteDocs,
  onNavigate,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    rev: true,
    audit: true,
    moc: false,
    insp: false,
  });
  const [inspectRecord, setInspectRecord] = useState<ObsoleteDocRecord | null>(null);
  const [showDopModal, setShowDopModal] = useState(false);
  const [vaultImgFailed, setVaultImgFailed] = useState(false);

  const filteredRecords = useMemo(() => {
    return obsoleteDocs.filter((doc) => {
      if (yearFilter && doc.yearGroup !== yearFilter) return false;
      if (unitFilter && !doc.unit.includes(unitFilter)) return false;
      if (selectedTag && !doc.tags.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !doc.code.toLowerCase().includes(q) &&
          !doc.title.toLowerCase().includes(q) &&
          !doc.reason.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [obsoleteDocs, yearFilter, unitFilter, selectedTag, searchQuery]);

  const handleExportArchive = () => {
    exportToCsv(
      'apadana-obsolete-archive.csv',
      ['کد منسوخ', 'عنوان مستند', 'واحد', 'نگارش', 'تاریخ ابطال', 'سند جایگزین', 'دلیل ابطال', 'SHA-256'],
      filteredRecords.map((r) => [
        r.code,
        r.title,
        r.unit,
        r.rev,
        r.obsoleteDate,
        r.supersededBy,
        r.reason,
        r.sha256,
      ])
    );
    onNotify('خروجی ممیزی آرشیو آماده شد', `${filteredRecords.length.toLocaleString('fa-IR')} پرونده راکد صادر گردید.`, 'success');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setYearFilter('');
    setUnitFilter('');
    setSelectedTag('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="space-y-1.5">
          <div className="font-label-code text-[11px] font-bold text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined !text-[16px]">inventory_2</span>
            سیستم مدیریت اسناد مهندسی (EDMS) • استاندارد ISO 9001 / ISO 27001
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-primary">
              مرکز بایگانی، تاریخچه ویرایش‌ها و مدیریت اسناد منسوخ
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-critical-hse border border-red-200 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-critical-hse" />
              محیط اسناد راکد و سوابق حقوقی
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            آرشیو رسمی نگارش‌های پیشین، رویه‌های ابطال‌شده با برچسب عدم استناد (Obsolete)، سوابق ممیزی‌های مختومه و پایش زمان‌بندی امحای دوره‌ای مطابق مقررات وزارت نفت و شرکت ملی صنایع پتروشیمی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportArchive}
            className="px-4 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">download</span>
            دریافت خروجی ممیزی آرشیو (XLSX)
          </button>
          <button
            type="button"
            onClick={() =>
              onNotify(
                'بررسی یکپارچگی دیجیتال SHA-256 تایید شد',
                'تمامی ۶۳۴ فایل منسوخ و ۸,۲۹۰ رکورد سوابق با امضای رمزنگاری بدون تغییر تطابق دارند.',
                'success'
              )
            }
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">verified_user</span>
            بررسی یکپارچگی هش دیجیتال (SHA-256)
          </button>
        </div>
      </section>

      {/* 4 Left-Border Accented KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border-hairline border-r-4 border-r-primary p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">کل اسناد و مدارک آرشیو شده</span>
            <span className="material-symbols-outlined text-primary">folder_zip</span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-label-code text-2xl font-extrabold text-primary">۱,۴۵۰</span>
            <span className="text-[11px] font-bold text-tertiary">سند ایندکس‌شده</span>
          </div>
          <div className="text-[10.5px] text-outline mt-1">شامل ۱۲ واحد عملیاتی • EDMS v4.2</div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline border-r-4 border-r-critical-hse p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">نسخه‌های منسوخ و جایگزین‌شده</span>
            <span className="material-symbols-outlined text-critical-hse">block</span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-label-code text-2xl font-extrabold text-critical-hse">۶۳۴</span>
            <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded bg-red-50 text-critical-hse">
              Obsolete
            </span>
          </div>
          <div className="flex items-center justify-between text-[10.5px] mt-1">
            <span className="text-outline">دارای واترمارک ابطال</span>
            <span className="font-bold text-critical-hse">غیرقابل استناد</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline border-r-4 border-r-warning-capa p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">سوابق تکمیل‌شده فرم‌ها (Records)</span>
            <span className="material-symbols-outlined text-warning-capa">receipt_long</span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-label-code text-2xl font-extrabold text-primary">۸,۲۹۰</span>
            <span className="text-[11px] font-bold text-secondary">پیوست قانونی</span>
          </div>
          <div className="text-[10.5px] text-outline mt-1">گزارشات ممیزی و MOC • ۱۴۰۰ تا ۱۴۰۳</div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline border-r-4 border-r-tertiary p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">حجم مخزن و پشتیبان ابری</span>
            <span className="material-symbols-outlined text-tertiary">cloud_done</span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-label-code text-2xl font-extrabold text-primary">
              ۴.۱۸ <span className="text-xs font-semibold">ترابایت</span>
            </span>
            <span className="text-[10.5px] font-bold text-tertiary">رمزنگاری AES-256</span>
          </div>
          <div className="text-[10.5px] text-outline mt-1">آخرین بکاپ: امروز ۰۴:۰۰ • ۹۹.۹٪ پایدار</div>
        </div>
      </section>

      {/* Deep Metadata Search Bar */}
      <section className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary">manage_search</span>
            موتور جستجوی فراداده‌ای اسناد منسوخ و سوابق تاریخی
          </h2>
          <span className="text-[11px] text-outline">فیلتر بلادرنگ در کلیه ردیف‌های بایگانی مهندسی</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="مثال: PR-MIS-STP-01 یا روش اجرایی تخلیه کاتالیست یا عنوان..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs focus:outline-none focus:border-secondary"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary"
            >
              <option value="">تمامی دوره‌ها (۱۴۰۰ - ۱۴۰۳)</option>
              <option value="1403">سال ابطال ۱۴۰۳</option>
              <option value="1402">سال ابطال ۱۴۰۲</option>
              <option value="1401">سال ابطال ۱۴۰۱</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary"
            >
              <option value="">تمامی واحدها</option>
              <option value="متانول">واحد متانول</option>
              <option value="HSE">اداره ایمنی (HSE)</option>
              <option value="بازرسی">بازرسی فنی</option>
              <option value="تضمین کیفیت">تضمین کیفیت</option>
              <option value="آزمایشگاه">آزمایشگاه مرکزی</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-on-surface-variant">تگ‌های متداول پتروشیمی:</span>
            {['ISO 45001:2018', 'واحد متانول', 'بویلر و یوتیلیتی', 'تغییرات مهندسی', 'تست‌های غیرمخرب NDT'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag((prev) => (prev === tag ? '' : tag))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-container-low border-border-hairline text-primary hover:border-secondary'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold text-secondary hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[15px]">filter_alt_off</span>
            پاک‌سازی فیلترها
          </button>
        </div>
      </section>

      {/* Main Split: 4-col Archive Tree + 8-col Obsolete Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 4 cols Left/Right Archive Tree + Governance + Vault Photo */}
        <div className="xl:col-span-4 space-y-5">
          <section className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">ساختار درختی بایگانی (Archive Tree)</h3>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-surface-container-low text-primary">
                ۴ بخش اصلی
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              دسترسی طبقه‌بندی‌شده به بسته‌های مستنداتی راکد و سوابق سنواتی بر حسب ماهیت سازمانی
            </p>

            {[
              {
                key: 'rev',
                title: 'بایگانی نگارش‌های پیشین (Revision History)',
                count: '۲۴۸ سند',
                icon: 'history',
                items: [
                  { name: 'دستورالعمل‌ها و روش‌های اجرایی (SOP/PR)', val: '۱۲۲' },
                  { name: 'دستورالعمل‌های کاری اپراتوری (Work Instructions)', val: '۸۶' },
                  { name: 'نقشه‌ها و دیاگرام‌های لوله‌کشی و ابزاردقیق (P&ID)', val: '۴۰' },
                ],
              },
              {
                key: 'audit',
                title: 'سوابق ممیزی‌ها و CAPAهای مختومه',
                count: '۱۹۴ پرونده',
                icon: 'fact_check',
                items: [
                  { name: 'ممیزی‌های خارجی صدور گواهینامه (SGS / DNV)', val: '۱۸' },
                  { name: 'سوابق ممیزی داخلی ادواری پتروشیمی', val: '۹۲' },
                  { name: 'اقدامات اصلاحی تایید اثربخشی‌شده', val: '۸۴' },
                ],
              },
              {
                key: 'moc',
                title: 'بایگانی تغییرات مهندسی (MOC History)',
                count: '۱۰۵ پرونده',
                icon: 'published_with_changes',
                items: [
                  { name: 'تغییرات دائمی فرآیندی (Permanent MOC)', val: '۶۸' },
                  { name: 'تغییرات موقت منقضی‌شده و عودت‌یافته', val: '۳۷' },
                ],
              },
              {
                key: 'insp',
                title: 'سوابق بازرسی فنی و تست مخازن',
                count: '۸۶ پرونده',
                icon: 'engineering',
                items: [
                  { name: 'ضخامت‌سنجی آلتراسونیک مخازن TK-101 تا TK-108', val: '۵۲' },
                  { name: 'کالیبراسیون و تست ترکیدگی شیرهای اطمینان (PSV)', val: '۳۴' },
                ],
              },
            ].map((node) => {
              const open = !!expandedNodes[node.key];
              return (
                <div key={node.key} className="rounded-xl border border-border-hairline overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedNodes((p) => ({ ...p, [node.key]: !p[node.key] }))}
                    className="w-full p-3 bg-surface-container-low/70 hover:bg-surface-container-low flex items-center justify-between gap-2 text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined !text-[18px] text-secondary">{node.icon}</span>
                      <span className="text-xs font-bold text-primary truncate">{node.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-label-code text-[10px] font-bold px-2 py-0.5 rounded bg-white text-secondary border border-border-hairline">
                        {node.count}
                      </span>
                      <span className={`material-symbols-outlined !text-[16px] ${open ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </button>
                  {open && (
                    <div className="p-2.5 space-y-1.5 bg-white text-[11px]">
                      {node.items.map((sub) => (
                        <div
                          key={sub.name}
                          onClick={() => setSearchQuery(sub.name.split(' ')[0])}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer"
                        >
                          <span className="text-on-surface">{sub.name}</span>
                          <span className="font-label-code font-bold text-outline">{sub.val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Governance & Custodian */}
          <section className="bg-white rounded-2xl border border-border-hairline p-4 space-y-3">
            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary">gavel</span>
              حاکمیت اسناد و امانت‌داری EDMS
            </h3>
            <p className="text-xs text-on-surface-variant leading-6">
              کلیه اسناد منسوخ‌شده مطابق بند ۷.۵.۳.۲ استاندارد ISO 9001 به مدت معین حفظ شده و برای جلوگیری از استفاده ناخواسته با مهرهای سیستمی برجسته کدگذاری گردیده‌اند. دسترسی به اصل اسناد نیازمند مجوز رئیس تضمین کیفیت می‌باشد.
            </p>
            <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">مسئول بایگانی فنی:</span>
              <span className="font-bold text-primary">مهندس سارا نیک‌پیام</span>
            </div>
          </section>

          {/* Asaluyeh Vault Photo Card */}
          <section className="bg-white rounded-2xl border border-border-hairline p-4 space-y-2.5">
            <div className="relative rounded-xl overflow-hidden h-40 bg-primary">
              {!vaultImgFailed ? (
                <img
                  src={ARCHIVE_VAULT_IMG}
                  alt="آرشیو مرکزی اسناد مهندسی عسلویه"
                  referrerPolicy="no-referrer"
                  onError={() => setVaultImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/85 bg-gradient-to-br from-primary to-secondary">
                  <span className="material-symbols-outlined !text-[36px]">warehouse</span>
                  <span className="text-xs font-bold mt-1">آرشیو مرکزی اسناد مهندسی عسلویه</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950/85 to-transparent text-white flex items-center justify-between text-[11px] font-bold">
                <span>آرشیو مرکزی اسناد مهندسی عسلویه</span>
                <span className="font-label-code px-2 py-0.5 rounded bg-white/20">Zone-A Archive</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>نسخه‌برداری سخت‌افزاری و بایگانی ضدانفجار</span>
              <span className="font-label-code font-bold text-primary">NFPA 232</span>
            </div>
          </section>
        </div>

        {/* 8 cols Obsolete Documents Table & Watermark Preview */}
        <div className="xl:col-span-8 space-y-5">
          <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden">
            <div className="p-4 border-b border-border-hairline flex flex-wrap items-center justify-between gap-2 bg-surface-container-low/40">
              <div>
                <h2 className="text-sm font-bold text-primary">جدول تفصیلی نگارش‌های منسوخ‌شده (Obsolete Documents)</h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  نمایش سوابق جایگزین‌شده به همراه دلایل تغییرات و لینک نسخه‌های دیجیتال
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-border-hairline text-primary">
                نمایش {filteredRecords.length.toLocaleString('fa-IR')} سند منسوخ
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[820px] text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                    <th className="py-3 px-4">کد و عنوان سند منسوخ</th>
                    <th className="py-3 px-3">نگارش بایگانی</th>
                    <th className="py-3 px-3">تاریخ ابطال</th>
                    <th className="py-3 px-3">سند جایگزین (Superseded by)</th>
                    <th className="py-3 px-3">دلیل ابطال و ارتقا</th>
                    <th className="py-3 px-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline/70">
                  {filteredRecords.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-label-code font-bold text-primary">{doc.code}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-critical-hse border border-red-200">
                            منسوخ / Obsolete
                          </span>
                        </div>
                        <div className="font-bold text-on-surface mt-1">{doc.title}</div>
                        <div className="text-[10.5px] text-on-surface-variant mt-0.5">{doc.unit}</div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-label-code font-bold text-primary">{doc.rev}</span>
                        <div className="text-[10.5px] text-outline mt-0.5">
                          مدت اعتبار: {doc.retentionMonths.toLocaleString('fa-IR')} ماه
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-label-code text-on-surface-variant whitespace-nowrap">
                        {doc.obsoleteDate}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('documents-list')}
                          className="font-label-code font-bold text-secondary hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {doc.supersededBy}
                          <span className="material-symbols-outlined !text-[14px]">open_in_new</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant max-w-[230px] leading-5">{doc.reason}</td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectRecord(doc)}
                            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white text-primary transition-colors cursor-pointer"
                            title="مشاهده شناسنامه و هش SHA-256"
                          >
                            <span className="material-symbols-outlined !text-[17px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onNotify(
                                `دانلود فایل منسوخ ${doc.code}`,
                                'نسخه PDF با مهر سراسری OBSOLETE - غیرقابل استناد برای اجرا صادر شد.',
                                'warning'
                              )
                            }
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-critical-hse hover:text-white text-critical-hse transition-colors cursor-pointer"
                            title="دانلود با واترمارک OBSOLETE"
                          >
                            <span className="material-symbols-outlined !text-[17px]">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-red-50/60 border-t border-red-100 text-[11px] text-red-950">
              هر سند دانلود شده از این بخش شامل مهر دیجیتال «<strong className="font-label-code">OBSOLETE - غیرقابل استناد برای اجرا</strong>» در کلیه صفحات خواهد بود.
            </div>
          </section>

          {/* Obsolete Watermark Security Overlay Preview */}
          <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-critical-hse">security</span>
                نمای پیش‌نمایش و امنیت خروجی PDF اسناد راکد
              </h3>
              <span className="font-label-code text-[10.5px] font-bold px-2.5 py-0.5 rounded bg-red-50 text-critical-hse border border-red-200">
                EDMS Security Overlay
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-red-200 bg-surface-container-low/70 p-8 text-center">
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute inset-0 flex items-center justify-center -rotate-12 text-3xl sm:text-4xl font-extrabold text-critical-hse/15 tracking-widest"
              >
                OBSOLETE - منسوخ
              </div>
              <span className="material-symbols-outlined !text-[32px] text-critical-hse relative z-10">warning</span>
              <h4 className="text-sm font-extrabold text-primary mt-1 relative z-10">هشدار امنیتی و استناد حقوقی</h4>
              <p className="text-xs text-on-surface-variant max-w-xl mx-auto mt-1.5 leading-6 relative z-10">
                استناد عملیاتی به این مدارک در محیط کارگاهی سایت و آزمایشگاه تخلف درجه ۱ ایمنی و کیفیت تلقی می‌گردد. تمام خروجی‌ها با نام کاربر صادرکننده، آی‌پی و تاریخ شمسی/میلادی واترمارک می‌شوند.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* 4-Tier Retention & Disposal Policy */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
          <div>
            <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary">schedule</span>
              سیاست‌های قانونی ماندگاری سوابق و تقویم امحا (Retention & Disposal Policy)
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              مطابق ضوابط مهندسی وزارت نفت، استانداردهای ملی و دستورالعمل‌های امحای اسناد راکد
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-warning-capa border border-amber-200">
            بررسی دوره‌ای بعدی کمیته امحا: ۱۴۰۳/۰۹/۱۵
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
          {[
            {
              tier: 'رده حقوقی A',
              title: 'نگهداری مادام‌العمر (Permanent)',
              badge: 'دائمی',
              desc: 'نقشه‌های ازبیلت (As-Built)، پروانه‌های احداث زیست‌محیطی، شناسنامه ظروف تحت‌فشار و سوابق حوادث منجر به فوت یا جراحت ناتوان‌کننده.',
              foot: 'وضعیت امحا: غیرقابل امحا',
              tone: 'border-primary bg-surface-container-low/50',
            },
            {
              tier: 'رده فنی B',
              title: 'نگهداری ۱۰ ساله (10 Years)',
              badge: '۱۰ سال',
              desc: 'سوابق کامل تغییرات مهندسی (MOC)، گزارش‌های ارزیابی ریسک فرآیندی (HAZOP/SIL) و گواهینامه‌های کالیبراسیون تجهیزات حساس ایمنی.',
              foot: 'تعداد پرونده آماده بررسی: ۴ پرونده (سررسید ۱۴۰۴)',
              tone: 'border-secondary bg-sky-50/40',
            },
            {
              tier: 'رده عملیاتی C',
              title: 'نگهداری ۵ ساله (5 Years)',
              badge: '۵ سال',
              desc: 'سوابق ممیزی‌های داخلی و خارجی، صورتجلسات بازنگری مدیریت، گزارش‌های پایش آلاینده‌های اتمسفری و چک‌لیست‌های ماهانه HSE.',
              foot: 'در صف بازبینی امحا: ۲۶ پرونده',
              tone: 'border-warning-capa bg-amber-50/40',
            },
            {
              tier: 'رده روتین D',
              title: 'نگهداری ۳ ساله (3 Years)',
              badge: '۳ سال',
              desc: 'پروانه‌های کار روزانه (Permit to Work - PTW)، فرم‌های لاگ‌شیت روتین اتاق کنترل و سوابق آزمایش‌های شیمیایی روزمره فاقد مغایرت.',
              foot: 'مجوز امحای الکترونیک: صورتجلسه کمیته',
              tone: 'border-critical-hse bg-red-50/40',
            },
          ].map((policy) => (
            <div key={policy.tier} className={`rounded-2xl border p-4 flex flex-col justify-between ${policy.tone}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-secondary">{policy.tier}</span>
                  <span className="font-label-code text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-white border border-border-hairline text-primary">
                    {policy.badge}
                  </span>
                </div>
                <h3 className="font-extrabold text-primary text-sm mb-1.5">{policy.title}</h3>
                <p className="text-[11px] text-on-surface-variant leading-5">{policy.desc}</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-border-hairline/70 text-[11px] font-bold text-primary">
                {policy.foot}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-on-surface-variant">
            وضعیت بایگانی امن: کلیه رونوشت‌های دیجیتال در ۲ مخزن ذخیره‌سازی مجزا با تفکیک ژئوگرافیک سنکرون شده‌اند.
          </span>
          <button
            type="button"
            onClick={() => setShowDopModal(true)}
            className="font-bold text-secondary hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            مشاهده پروتکل رسمی امحای اسناد راکد (DOP-04)
            <span className="material-symbols-outlined !text-[15px]">arrow_back</span>
          </button>
        </div>
      </section>

      {/* SHA-256 Inspection Modal */}
      {inspectRecord && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-lg bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <div>
                <div className="font-label-code text-xs text-red-200">OBSOLETE ARCHIVE PASSPORT</div>
                <h3 className="text-sm font-bold">{inspectRecord.code}</h3>
              </div>
              <button type="button" onClick={() => setInspectRecord(null)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="font-bold text-primary text-sm">{inspectRecord.title}</div>
              <div className="grid grid-cols-2 gap-3 bg-surface-container-low p-3.5 rounded-xl border border-border-hairline">
                <div>
                  <span className="text-outline block">تاریخ ابطال</span>
                  <span className="font-label-code font-bold text-primary">{inspectRecord.obsoleteDate}</span>
                </div>
                <div>
                  <span className="text-outline block">سند جایگزین</span>
                  <span className="font-label-code font-bold text-secondary">{inspectRecord.supersededBy}</span>
                </div>
                <div>
                  <span className="text-outline block">مخزن فیزیکی / ابری</span>
                  <span className="font-label-code font-bold text-primary">{inspectRecord.vaultZone}</span>
                </div>
                <div>
                  <span className="text-outline block">حجم و بایگان</span>
                  <span className="font-bold text-primary">
                    {inspectRecord.fileSize} • {inspectRecord.archiver}
                  </span>
                </div>
              </div>
              <div>
                <span className="font-bold text-primary block mb-1">اثرانگشت رمزنگاری SHA-256:</span>
                <div className="font-label-code text-[11px] p-2.5 rounded-lg bg-slate-900 text-emerald-300 break-all" dir="ltr">
                  {inspectRecord.sha256}
                </div>
              </div>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end">
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOP-04 Protocol Modal */}
      {showDopModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-lg bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">پروتکل رسمی امحای اسناد راکد (DOP-04)</h3>
              <button type="button" onClick={() => setShowDopModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs text-on-surface-variant leading-6">
              <p>
                مطابق دستورالعمل <strong className="font-label-code text-primary">DOP-04</strong> مصوب کمیته حاکمیت اطلاعات پتروشیمی آپادانا، هرگونه امحای نسخه‌های فیزیکی یا دیجیتال منسوخ تنها پس از طی دوره قانونی نگهداری و صدور صورتجلسه سه‌امضایی (رئیس تضمین کیفیت، مسئول حراست و مدیر واحد متولی) مجاز است.
              </p>
              <p>نسخه‌های کاغذی به‌صورت خردشده و خمیرشده معدوم و کد هش نسخه‌های دیجیتال در دفتر کل WORM بایگانی می‌گردد.</p>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end">
              <button
                type="button"
                onClick={() => setShowDopModal(false)}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
