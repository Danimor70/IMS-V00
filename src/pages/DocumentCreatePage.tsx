import React, { useMemo, useRef, useState } from 'react';
import { ImsDocument, RouteId } from '../types/ims';

interface DocumentCreatePageProps {
  documents: ImsDocument[];
  onAddDocument: (doc: ImsDocument, asDraft: boolean) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

interface UploadedDraftFile {
  id: string;
  name: string;
  size: string;
  type: 'docx' | 'pdf' | 'other';
}

const DOC_TYPES = [
  { code: 'PR', label: 'فرآیند (PR)', full: 'فرآیند (PR)' },
  { code: 'SOP', label: 'روش اجرایی (SOP)', full: 'روش اجرایی (SOP)' },
  { code: 'MN', label: 'نظامنامه (MN)', full: 'نظامنامه (MN)' },
  { code: 'POL', label: 'خط‌مشی (POL)', full: 'خط‌مشی (POL)' },
  { code: 'WI', label: 'دستورالعمل (WI)', full: 'دستورالعمل (WI)' },
  { code: 'FRM', label: 'فرم (FRM)', full: 'فرم (FRM)' },
];

const MANAGEMENTS = [
  { code: 'MIS', label: 'مدیریت مهندسی و بازرسی' },
  { code: 'OPS', label: 'مدیریت بهره‌برداری' },
  { code: 'QMS', label: 'مدیریت تضمین کیفیت' },
  { code: 'HSE', label: 'مدیریت HSE و آتش‌نشانی' },
  { code: 'ENG', label: 'مدیریت مهندسی و پروژه‌ها' },
  { code: 'COM', label: 'مدیریت بازرگانی و تدارکات' },
];

const UNITS = [
  { code: 'STP', label: 'واحد بخار و بازرسی فنی' },
  { code: 'MET', label: 'واحد متانول ۲' },
  { code: 'UTL', label: 'یوتیلیتی و آب و برق' },
  { code: 'INS', label: 'ابزاردقیق و کنترل' },
  { code: 'LAB', label: 'آزمایشگاه مرکزی' },
];

export const DocumentCreatePage: React.FC<DocumentCreatePageProps> = ({
  documents,
  onAddDocument,
  onNavigate,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docTypeCode, setDocTypeCode] = useState('PR');
  const [mgmtCode, setMgmtCode] = useState('MIS');
  const [unitCode, setUnitCode] = useState('STP');
  const [manualCodeUnlocked, setManualCodeUnlocked] = useState(false);
  const [manualCode, setManualCode] = useState('PR-MIS-STP-03-00');

  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [confidentiality, setConfidentiality] = useState<ImsDocument['confidentiality']>('محرمانه فنی (C3)');
  const [selectedIsos, setSelectedIsos] = useState<string[]>(['ISO 9001:2015', 'ISO 45001:2018']);
  const [reviewCycle, setReviewCycle] = useState<1 | 2 | 3>(2);
  const [slaDays, setSlaDays] = useState<3 | 5 | 10>(5);
  const [justification, setJustification] = useState('');

  const [files, setFiles] = useState<UploadedDraftFile[]>([
    { id: 'f1', name: 'PR-MIS-STP-02-00_draft.docx', size: '۲.۴ مگابایت', type: 'docx' },
    { id: 'f2', name: 'PR-MIS-STP-02-00_PID.pdf', size: '۸.۱ مگابایت', type: 'pdf' },
  ]);

  const [workflowActors, setWorkflowActors] = useState([
    { step: 'گام ۱: تهیه‌کننده', actor: 'مهندس مهران کاظمی (۹۴۰۲۱)' },
    { step: 'گام ۲: تاییدکننده فنی', actor: 'مهندس علیرضا رضایی (رئیس فرآیند)' },
    { step: 'گام ۳: تصویب‌کننده انطباق', actor: 'مهندس حمید دهداری (سرپرست HSE)' },
    { step: 'گام ۴: تصویب نهایی', actor: 'دکتر مریم کریمی (معاون تضمین کیفیت)' },
  ]);

  const generatedCode = `${docTypeCode}-${mgmtCode}-${unitCode}-03-00`;
  const activeCode = manualCodeUnlocked ? manualCode : generatedCode;

  const isDuplicate = useMemo(
    () => documents.some((d) => d.code.toLowerCase() === activeCode.trim().toLowerCase()),
    [documents, activeCode]
  );

  const selectedMgmtLabel = MANAGEMENTS.find((m) => m.code === mgmtCode)?.label || 'مدیریت مهندسی و بازرسی';
  const selectedUnitLabel = UNITS.find((u) => u.code === unitCode)?.label || 'واحد بخار و بازرسی فنی';
  const selectedTypeObj = DOC_TYPES.find((t) => t.code === docTypeCode) || DOC_TYPES[0];

  const nextReviewDate = reviewCycle === 1 ? '۱۴۰۴/۰۸/۲۴' : reviewCycle === 2 ? '۱۴۰۵/۰۸/۲۴' : '۱۴۰۶/۰۸/۲۴';

  const toggleIso = (iso: string) => {
    setSelectedIsos((prev) => (prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso]));
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;
    const added: UploadedDraftFile[] = Array.from(picked).map((f, idx) => ({
      id: `up-${Date.now()}-${idx}`,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} مگابایت`,
      type: f.name.endsWith('.pdf') ? 'pdf' : f.name.endsWith('.doc') || f.name.endsWith('.docx') ? 'docx' : 'other',
    }));
    setFiles((prev) => [...prev, ...added]);
    onNotify('فایل با موفقیت در صف EDMS Vault قرار گرفت', `${added.length.toLocaleString('fa-IR')} فایل پیوست اضافه شد.`, 'success');
    e.target.value = '';
  };

  const handleSubmit = (asDraft: boolean) => {
    if (!titleFa.trim()) {
      onNotify('تکمیل عنوان فارسی الزامی است', 'لطفاً عنوان کامل مستند جدید را در بخش الف وارد نمایید.', 'warning');
      return;
    }
    if (isDuplicate) {
      onNotify('تداخل کد مدرک سازمانی', `کد ${activeCode} قبلاً در مخزن EDMS ثبت شده است.`, 'error');
      return;
    }

    const newDoc: ImsDocument = {
      id: `doc-${Date.now()}`,
      code: activeCode.trim(),
      docType: selectedTypeObj.full,
      docTypeCode: selectedTypeObj.code,
      title: titleFa.trim(),
      englishTitle: titleEn.trim() || undefined,
      version: 'Rev 00',
      status: asDraft ? 'پیش‌نویس' : 'در جریان بررسی',
      management: selectedMgmtLabel,
      unit: selectedUnitLabel,
      registeredAt: '۱۴۰۳/۰۸/۲۴',
      reviewAt: nextReviewDate,
      expiresAt: nextReviewDate,
      confidentiality,
      isoStandards: selectedIsos.length > 0 ? selectedIsos : ['ISO 9001:2015'],
      owner: 'مهندس مهران کاظمی',
      needsMySignature: !asDraft,
      summary: justification.trim() || 'ثبت شده از طریق فرم یکپارچه ثبت و گردش کار مستند جدید.',
      signoffChain: workflowActors.map((w, idx) => ({
        role: w.step,
        actor: w.actor,
        date: idx === 0 ? '۱۴۰۳/۰۸/۲۴' : 'در انتظار اقدام',
        status: idx === 0 ? 'approved' : 'pending',
      })),
    };

    onAddDocument(newDoc, asDraft);
    onNavigate(asDraft ? 'documents-list' : 'documents-approval-workflow');
  };

  const activeStepperStep = titleFa.trim() ? (files.length > 0 ? 3 : 2) : 1;

  return (
    <div className="space-y-5 pb-20">
      {/* Breadcrumb & Status */}
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
          <span className="font-bold text-primary">ثبت مستند جدید</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-warning-capa border border-amber-200 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-warning-capa animate-pulse" />
            وضعیت جاری: پیش‌نویس موقت
          </span>
          <span className="font-label-code text-[11px] px-3 py-1 rounded-full bg-white border border-border-hairline">
            ۱۴۰۳/۰۸/۲۴ - ۱۰:۴۵
          </span>
        </div>
      </div>

      {/* Hero Header & 4-Step Stepper */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 sm:p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-primary">فرم ثبت و گردش کار مستند جدید</h1>
            <p className="font-label-code text-xs text-secondary font-semibold mt-0.5">
              IMS Document Registration Workflow • Standard ISO 9001: 7.5.2
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-surface-container-low px-4 py-2 rounded-xl border border-border-hairline">
            <span className="text-on-surface-variant">پیش‌نمایش کد یکتا:</span>
            <span className="font-label-code font-extrabold text-primary text-sm" dir="ltr">
              {activeCode}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { num: 1, label: 'اطلاعات پایه و کدگذاری' },
            { num: 2, label: 'مالکیت و چرخه بازبینی' },
            { num: 3, label: 'بارگذاری در EDMS Vault' },
            { num: 4, label: 'تنظیم گردش کار تایید' },
          ].map((s) => {
            const done = activeStepperStep > s.num;
            const current = activeStepperStep === s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors ${
                  current
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : done
                    ? 'bg-emerald-50 border-emerald-200 text-tertiary'
                    : 'bg-surface-container-low border-border-hairline text-on-surface-variant'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full font-label-code text-xs font-bold flex items-center justify-center shrink-0 ${
                    current ? 'bg-white text-primary' : done ? 'bg-tertiary text-white' : 'bg-white text-primary'
                  }`}
                >
                  {done ? '✓' : s.num.toLocaleString('fa-IR')}
                </span>
                <span className="text-xs font-bold truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Grid: 8 cols Form + 4 cols Guidance */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 space-y-5">
          {/* Section A: Standard Code Generator & Identity */}
          <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary text-white font-label-code text-xs flex items-center justify-center">
                  الف
                </span>
                شناسنامه، کدگذاری خودکار و مشخصات استاندارد مستند
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!manualCodeUnlocked) setManualCode(generatedCode);
                  setManualCodeUnlocked((v) => !v);
                }}
                className="text-xs font-bold text-secondary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[16px]">
                  {manualCodeUnlocked ? 'lock_open' : 'lock'}
                </span>
                {manualCodeUnlocked ? 'قفل‌کردن کد خودکار' : 'ویرایش دستی کد'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">۱. نوع مدرک سازمانی</label>
                <select
                  value={docTypeCode}
                  onChange={(e) => setDocTypeCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">۲. مدیریت متولی</label>
                <select
                  value={mgmtCode}
                  onChange={(e) => setMgmtCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                >
                  {MANAGEMENTS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} — {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">۳. واحد سازمانی</label>
                <select
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                >
                  {UNITS.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code} — {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generated Code Banner */}
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-bold text-primary shrink-0">کد مدرک تولیدی:</span>
                {manualCodeUnlocked ? (
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    dir="ltr"
                    className="font-label-code font-bold text-sm px-3 py-1.5 rounded-lg border border-secondary bg-white text-primary w-52"
                  />
                ) : (
                  <span className="font-label-code text-base font-extrabold text-secondary" dir="ltr">
                    {activeCode}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isDuplicate ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-critical-hse text-[11px] font-bold">
                    <span className="material-symbols-outlined !text-[15px]">error</span>
                    کد تکراری است
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-tertiary text-[11px] font-bold">
                    <span className="material-symbols-outlined !text-[15px]">verified</span>
                    اعتبارسنجی یکتایی تایید شد
                  </span>
                )}
              </div>
            </div>

            {/* Titles & Confidentiality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-primary mb-1.5">
                  عنوان کامل فارسی مستند <span className="text-critical-hse">*</span>
                </label>
                <input
                  type="text"
                  value={titleFa}
                  onChange={(e) => setTitleFa(e.target.value)}
                  placeholder="مثال: دستورالعمل تست نشت گاز سنتز و کنترل خطوط فشار قوی واحد متانول"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline text-xs text-primary focus:outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">عنوان انگلیسی (اختیاری)</label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  dir="ltr"
                  placeholder="e.g. Syngas Leak Testing SOP"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline text-xs text-primary text-left focus:outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">سطح محرمانگی سند</label>
                <select
                  value={confidentiality}
                  onChange={(e) => setConfidentiality(e.target.value as ImsDocument['confidentiality'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none"
                >
                  <option value="عمومی (C1)">عمومی (C1)</option>
                  <option value="داخلی (C2)">داخلی (C2)</option>
                  <option value="محرمانه فنی (C3)">محرمانه فنی (C3)</option>
                  <option value="فوق‌محرمانه (C4)">فوق‌محرمانه (C4)</option>
                </select>
              </div>
            </div>

            {/* 5 ISO Checkboxes */}
            <div>
              <label className="block text-xs font-bold text-primary mb-2">استانداردهای مرجع مرتبط (ISO Mapping)</label>
              <div className="flex flex-wrap gap-2">
                {['ISO 9001:2015', 'ISO 14001:2015', 'ISO 45001:2018', 'ISO 50001:2018', 'ISO/IEC 17025'].map(
                  (iso) => {
                    const checked = selectedIsos.includes(iso);
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => toggleIso(iso)}
                        className={`font-label-code px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          checked
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface-container-low text-on-surface-variant border-border-hairline hover:border-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined !text-[15px]">
                          {checked ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        {iso}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* Section B: Ownership & Periodic Review */}
          <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2 border-b border-border-hairline pb-3">
              <span className="w-6 h-6 rounded-lg bg-primary text-white font-label-code text-xs flex items-center justify-center">
                ب
              </span>
              مالکیت سازمانی و زمان‌بندی بازنگری دوره‌ای
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-hairline space-y-2">
                <div className="text-[11px] text-on-surface-variant">واحد و مدیریت پیوندخورده از بخش الف:</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-border-hairline text-xs font-bold text-primary">
                    {selectedMgmtLabel}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-xs font-bold text-secondary">
                    {selectedUnitLabel}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-hairline flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  م.ک
                </div>
                <div>
                  <div className="text-[11px] text-on-surface-variant">تهیه‌کننده و ثبت‌کننده مستند</div>
                  <div className="text-xs font-bold text-primary mt-0.5">
                    مهندس مهران کاظمی | <span className="font-label-code">کد پرسنلی: ۹۴۰۲۱</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-primary ml-2">دوره بازنگری ادواری:</span>
                {[
                  { val: 1, label: '۱ ساله' },
                  { val: 2, label: '۲ ساله (استاندارد)' },
                  { val: 3, label: '۳ ساله' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setReviewCycle(opt.val as 1 | 2 | 3)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      reviewCycle === opt.val
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white border-border-hairline text-on-surface-variant'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="text-xs bg-emerald-50 text-tertiary border border-emerald-200 px-3 py-1.5 rounded-xl font-bold">
                تاریخ بازنگری آتی محاسبه‌شده: <span className="font-label-code">{nextReviewDate}</span>
              </div>
            </div>
          </section>

          {/* Section C: EDMS Vault Upload Zone */}
          <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary text-white font-label-code text-xs flex items-center justify-center">
                  ج
                </span>
                مخزن اسناد مهندسی و پیوست‌ها (EDMS Vault)
              </h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary border border-border-hairline inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[16px]">attach_file</span>
                افزودن فایل پیوست
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xlsx,.dwg"
              onChange={handleFilePick}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-secondary/40 hover:border-secondary bg-surface-container-low/60 rounded-2xl p-6 text-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined !text-[34px] text-secondary">cloud_upload</span>
              <p className="text-xs font-bold text-primary mt-2">
                فایل‌های نسخه ویرایشی (.docx) و نقشه یا نسخه PDF را اینجا رها کنید یا کلیک نمایید
              </p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                حداکثر حجم مجاز ۵۰ مگابایت • ثبت خودکار امضای SHA-256 در مخزن امن EDMS
              </p>
            </div>

            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-border-hairline text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-label-code text-[10px] font-bold shrink-0 ${
                        file.type === 'pdf'
                          ? 'bg-red-50 text-critical-hse'
                          : 'bg-sky-50 text-secondary'
                      }`}
                    >
                      {file.type.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="font-label-code font-bold text-primary truncate" dir="ltr">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-on-surface-variant">{file.size}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onNotify(`پیش‌نمایش فایل ${file.name}`, 'فایل در نمایشگر داخلی EDMS تایید شد.', 'info')}
                      className="p-1.5 rounded-lg hover:bg-white text-secondary cursor-pointer"
                      title="پیش‌نمایش"
                    >
                      <span className="material-symbols-outlined !text-[17px]">visibility</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((x) => x.id !== file.id))}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-critical-hse cursor-pointer"
                      title="حذف فایل"
                    >
                      <span className="material-symbols-outlined !text-[17px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section D: Approval Chain & SLA */}
          <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary text-white font-label-code text-xs flex items-center justify-center">
                  د
                </span>
                پیکربندی زنجیره تایید و مهلت پاسخگویی (SLA)
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-on-surface-variant">سقف SLA هر مرحله:</span>
                <select
                  value={slaDays}
                  onChange={(e) => setSlaDays(Number(e.target.value) as 3 | 5 | 10)}
                  className="px-2.5 py-1 rounded-lg border border-border-hairline bg-surface-container-low font-bold text-primary"
                >
                  <option value={3}>۳ روز کاری</option>
                  <option value={5}>۵ روز کاری</option>
                  <option value={10}>۱۰ روز کاری</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workflowActors.map((item, idx) => (
                <div key={item.step} className="p-3 rounded-xl bg-surface-container-low border border-border-hairline">
                  <div className="text-[11px] font-bold text-secondary mb-1">{item.step}</div>
                  <input
                    type="text"
                    value={item.actor}
                    onChange={(e) => {
                      const next = [...workflowActors];
                      next[idx] = { ...next[idx], actor: e.target.value };
                      setWorkflowActors(next);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border-hairline bg-white text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">
                دامنه کاربرد و توجیه فنی تدوین مستند
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="دلایل نیاز به تدوین مستند، واحدهای مشمول و ارجاعات فنی (MOC یا CAPA) را وارد نمایید..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline text-xs text-primary focus:outline-none focus:border-secondary"
              />
            </div>
          </section>
        </div>

        {/* Right 4-col Guidance & Recent Docs */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-primary text-white rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-fixed">policy</span>
              <h3 className="text-sm font-bold">دستورالعمل کنترل مدارک (IMS-WI-001)</h3>
            </div>
            <ul className="space-y-2 text-xs text-white/85 leading-6 list-disc pr-4">
              <li>تمامی مدارک جدید با نگارش اولیه <span className="font-label-code font-bold text-white">Rev 00</span> ثبت می‌گردند.</li>
              <li>کد مدرک پس از تایید نهایی غیرقابل تغییر بوده و در بایگانی EDMS قفل می‌شود.</li>
              <li>برای مدارک با سطح محرمانگی C3 و C4 پیوست ارزیابی ریسک HSE الزامی است.</li>
            </ul>
            <div className="p-3 rounded-xl bg-white/10 text-xs flex items-center justify-between">
              <span>داخلی پشتیبانی مهندسی سیستم‌ها:</span>
              <span className="font-label-code font-extrabold">۲۴۱۹ - ۲۴۲۰</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border-hairline p-5 space-y-3">
            <h3 className="text-sm font-bold text-primary">آخرین مدارک ثبت شده در شبکه</h3>
            <div className="space-y-2.5">
              {documents.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  onClick={() => onNavigate('documents-list')}
                  className="p-3 rounded-xl bg-surface-container-low border border-border-hairline hover:border-secondary transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label-code text-xs font-bold text-secondary">{d.code}</span>
                    <span className="font-label-code text-[10.5px] text-on-surface-variant">{d.version}</span>
                  </div>
                  <p className="text-xs font-semibold text-primary mt-1 line-clamp-1">{d.title}</p>
                  <div className="flex items-center justify-between text-[10.5px] text-outline mt-1">
                    <span>{d.unit}</span>
                    <span>{d.registeredAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-3 z-20 bg-white/95 backdrop-blur-md border border-border-hairline rounded-2xl p-3.5 shadow-[0px_18px_40px_-10px_rgba(20,44,67,0.16)] flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-on-surface-variant">
          کد فعال: <strong className="font-label-code text-primary">{activeCode}</strong> •{' '}
          <span>{files.length.toLocaleString('fa-IR')} فایل پیوست</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('documents-list')}
            className="px-4 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-on-surface-variant cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 rounded-xl border border-secondary text-secondary hover:bg-sky-50 text-xs font-bold cursor-pointer"
          >
            ذخیره پیش‌نویس
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">send</span>
            ثبت و ارسال به گردش تایید
          </button>
        </div>
      </div>
    </div>
  );
};
