import React, { useMemo, useRef, useState } from 'react';
import { exportToCsv } from '../data/imsData';
import { RevisionItem, RouteId } from '../types/ims';

interface DocumentRevisionPageProps {
  revisions: RevisionItem[];
  onAddRevision: (item: RevisionItem) => void;
  onUpdateRevision: (id: string, patch: Partial<RevisionItem>) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const DocumentRevisionPage: React.FC<DocumentRevisionPageProps> = ({
  revisions,
  onAddRevision,
  onUpdateRevision,
  onNavigate,
  onNotify,
}) => {
  const diffSectionRef = useRef<HTMLElement>(null);

  const [tabFilter, setTabFilter] = useState<'all' | 'overdue' | 'moc' | 'capa'>('all');
  const [codeQuery, setCodeQuery] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [selectedDiffId, setSelectedDiffId] = useState<string>(revisions[0]?.id || 'rev-1');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    code: 'SOP-OPS-MTH-19',
    currentRevNum: 2,
    title: '',
    dept: 'مدیریت بهره‌برداری',
    triggerCategory: 'moc' as RevisionItem['triggerCategory'],
    triggerRef: 'MOC-1403-45',
    reasonText: '',
  });

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
    diffSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleExtendWithoutChange = (rev: RevisionItem) => {
    onUpdateRevision(rev.id, {
      progress: 100,
      workflowState: 'تمدید اعتبار ۲ ساله بدون تغییر (تایید شد)',
      overdueDays: undefined,
    });
    onNotify(
      `تمدید اعتبار ۲ ساله ${rev.code}`,
      'وضعیت سند بدون تغییر محتوایی به مدت ۲ سال آینده در مخزن EDMS تمدید شد.',
      'success'
    );
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
    if (!newForm.title.trim()) {
      onNotify('عنوان سند الزامی است', 'لطفاً عنوان مستند مشمول بازنگری را وارد کنید.', 'warning');
      return;
    }
    const currStr = String(newForm.currentRevNum).padStart(2, '0');
    const nextStr = String(newForm.currentRevNum + 1).padStart(2, '0');
    const triggerMap = {
      overdue: 'سررسید ادواری منقضی',
      moc: 'دگرگونی فرآیند (MOC)',
      capa: 'اقدام اصلاحی CAPA',
      iso: 'الزامات استاندارد ISO',
    };
    const item: RevisionItem = {
      id: `rev-${Date.now()}`,
      code: `${newForm.code.trim()}-${currStr}`,
      suggestedCode: `${newForm.code.trim()}-${nextStr}`,
      title: newForm.title.trim(),
      subtitle: `درخواست بازنگری جدید • ${newForm.dept}`,
      currentRev: `Rev ${currStr}`,
      targetRev: `Rev ${nextStr}`,
      triggerLabel: triggerMap[newForm.triggerCategory],
      triggerRef: newForm.triggerRef || 'ارجاع سیستمی IMS',
      triggerCategory: newForm.triggerCategory,
      dept: newForm.dept,
      owner: 'مهندس مهران کاظمی',
      ownerRole: 'مدیر تضمین کیفیت و IMS',
      progress: 25,
      workflowState: 'مرحله ۱: تدوین اصلاحیه پیش‌نویس',
      diffSection: 'بخش ۱: دامنه تغییرات پیشنهادی',
      oldRevDate: '۱۴۰۱/۰۸/۲۰',
      oldText: 'متن پیشین قبل از اعمال اصلاحیه فنی مطابق ویرایش مصوب قبلی:',
      oldHighlight: 'نیاز به بازبینی مطابق پارامترهای جدید بهره‌برداری',
      newTextPrefix: 'اصلاحیه پیشنهادی جدید:',
      newHighlight: newForm.reasonText.trim() || 'به‌روزرسانی دستورالعمل بر اساس تغییرات مهندسی و الزامات ایمنی ۱۴۰۳',
      newTextSuffix: 'جهت طرح در کمیته فنی.',
      newNote: 'ثبت‌شده از طریق کارتابل درخواست بازنگری جدید.',
    };
    onAddRevision(item);
    setSelectedDiffId(item.id);
    setShowNewModal(false);
    setNewForm({ ...newForm, title: '', reasonText: '' });
    onNotify('درخواست بازنگری جدید ثبت شد', `${item.code} → ${item.targetRev} به کارتابل اضافه گردید.`, 'success');
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

      {/* Header */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined">change_circle</span>
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-primary">
              کارتابل بازنگری دوره‌ای و اصلاحی مستندات IMS
            </h1>
            <span className="font-label-code text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-secondary border border-sky-200">
              ISO 9001: 7.5.2
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            مدیریت چرخه‌عمر، پایش سررسید ۲ ساله ادواری، اعمال تغییرات ناشی از مدیریت دگرگونی فرآیندی (MOC) و اقدامات اصلاحی (CAPA) پتروشیمی آپادانا خلیج فارس
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">post_add</span>
            ثبت درخواست بازنگری جدید
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
                        className="px-2.5 py-1.5 rounded-lg border border-secondary text-secondary hover:bg-sky-50 font-label-code text-[11px] font-bold cursor-pointer"
                      >
                        Diff
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendWithoutChange(rev)}
                        className="px-2.5 py-1.5 rounded-lg border border-border-hairline hover:bg-emerald-50 hover:text-tertiary text-on-surface-variant text-[11px] font-semibold cursor-pointer"
                        title="تمدید اعتبار ۲ ساله بدون تغییر"
                      >
                        تمدید ۲ ساله
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inline Comparative Diff Viewer */}
      {activeDiff && (
        <section
          ref={diffSectionRef}
          className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border-hairline pb-3">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">compare</span>
                پیش‌نمایش برخط تطبیق ویرایش‌ها (Document Revision Diff)
              </h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                بررسی خط‌به‌خط تغییرات ویرایش پیشنهادی با نگارش جاری مستند
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label-code text-xs font-bold px-3 py-1 rounded-full bg-surface-container-low border border-border-hairline text-primary">
                {activeDiff.code} ({activeDiff.currentRev} → {activeDiff.targetRev})
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-secondary border border-sky-200">
                {activeDiff.diffSection}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* Old Revision */}
            <div className="rounded-2xl border border-red-200 bg-red-50/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-critical-hse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-critical-hse" />
                  متن نگارش فعلی ({activeDiff.currentRev})
                </span>
                <span className="font-label-code text-[11px] text-outline">تاریخ مصوب: {activeDiff.oldRevDate}</span>
              </div>
              <p className="leading-7 text-on-surface bg-white p-3.5 rounded-xl border border-red-100">
                {activeDiff.oldText}{' '}
                <span className="bg-[#fee2e2] text-red-900 line-through px-1.5 py-0.5 rounded font-semibold">
                  {activeDiff.oldHighlight}
                </span>{' '}
                انجام می‌گیرد.
              </p>
            </div>

            {/* New Revision */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-tertiary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  متن پیشنهادی ویرایش جدید ({activeDiff.targetRev})
                </span>
                <span className="text-[11px] font-bold text-secondary">{activeDiff.triggerRef}</span>
              </div>
              <div className="leading-7 text-on-surface bg-white p-3.5 rounded-xl border border-emerald-100 space-y-2">
                <p>
                  {activeDiff.newTextPrefix}{' '}
                  <span className="bg-[#dcfce7] text-emerald-950 px-1.5 py-0.5 rounded font-bold">
                    {activeDiff.newHighlight}
                  </span>{' '}
                  {activeDiff.newTextSuffix}
                </p>
                <p className="text-[11.5px] font-semibold text-tertiary border-t border-emerald-100 pt-2">
                  {activeDiff.newNote}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* New Revision Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handleCreateRevision}
            className="animate-modal-enter w-full max-w-lg bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">ثبت درخواست بازنگری و ویرایش جدید</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">کد پایه سند</label>
                  <input
                    type="text"
                    value={newForm.code}
                    onChange={(e) => setNewForm({ ...newForm, code: e.target.value })}
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">شماره نگارش فعلی (محاسبه خودکار آتی)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={newForm.currentRevNum}
                      onChange={(e) => setNewForm({ ...newForm, currentRevNum: Number(e.target.value) })}
                      className="w-24 px-3 py-2 rounded-xl border border-border-hairline font-label-code"
                    />
                    <span className="font-label-code font-bold text-secondary">
                      Rev {String(newForm.currentRevNum).padStart(2, '0')} → Rev{' '}
                      {String(newForm.currentRevNum + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1">عنوان مستند</label>
                <input
                  type="text"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="مثال: دستورالعمل بهره‌برداری برج تقطیر واحد متانول"
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">منشا بازنگری</label>
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
                  <label className="block font-bold text-primary mb-1">واحد متولی</label>
                  <select
                    value={newForm.dept}
                    onChange={(e) => setNewForm({ ...newForm, dept: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low"
                  >
                    <option value="مدیریت بهره‌برداری">مدیریت بهره‌برداری</option>
                    <option value="واحد HSE و آتش‌نشانی">واحد HSE و آتش‌نشانی</option>
                    <option value="آزمایشگاه مرکزی">آزمایشگاه مرکزی</option>
                    <option value="حفاظت محیط زیست">حفاظت محیط زیست</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1">شرح تغییرات پیشنهادی</label>
                <textarea
                  rows={3}
                  value={newForm.reasonText}
                  onChange={(e) => setNewForm({ ...newForm, reasonText: e.target.value })}
                  placeholder="خلاصه تغییرات مورد نیاز در ویرایش جدید..."
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                />
              </div>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end gap-2">
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
    </div>
  );
};
