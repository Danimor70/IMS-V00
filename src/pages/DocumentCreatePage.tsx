import React, { useMemo, useRef, useState } from 'react';
import { ImsDocument, RouteId, UserAccount } from '../types/ims';

interface DocumentCreatePageProps {
  documents: ImsDocument[];
  users: UserAccount[];
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

interface CatalogItem {
  code: string;
  nameFa: string;
  nameEn: string;
}

type CatalogKind = 'docType' | 'management' | 'unit' | 'confidentiality' | 'isoStandard';

const INITIAL_DOC_TYPES: CatalogItem[] = [
  { code: 'PR', nameFa: 'فرآیند', nameEn: 'Process' },
  { code: 'SOP', nameFa: 'روش اجرایی', nameEn: 'Standard Operating Procedure' },
  { code: 'MN', nameFa: 'نظامنامه', nameEn: 'Manual' },
  { code: 'POL', nameFa: 'خط‌مشی', nameEn: 'Policy' },
  { code: 'WI', nameFa: 'دستورالعمل', nameEn: 'Work Instruction' },
  { code: 'FRM', nameFa: 'فرم', nameEn: 'Form' },
];

const INITIAL_MANAGEMENTS: CatalogItem[] = [
  { code: 'MIS', nameFa: 'مدیریت مهندسی و بازرسی', nameEn: 'Engineering & Inspection' },
  { code: 'OPS', nameFa: 'مدیریت بهره‌برداری', nameEn: 'Operations Management' },
  { code: 'QMS', nameFa: 'مدیریت تضمین کیفیت', nameEn: 'Quality Management System' },
  { code: 'HSE', nameFa: 'مدیریت HSE و آتش‌نشانی', nameEn: 'Health, Safety & Environment' },
  { code: 'ENG', nameFa: 'مدیریت مهندسی و پروژه‌ها', nameEn: 'Engineering & Projects' },
  { code: 'COM', nameFa: 'مدیریت بازرگانی و تدارکات', nameEn: 'Commercial & Procurement' },
];

const INITIAL_UNITS: CatalogItem[] = [
  { code: 'STP', nameFa: 'واحد بخار و بازرسی فنی', nameEn: 'Steam & Technical Inspection' },
  { code: 'MET', nameFa: 'واحد متانول ۲', nameEn: 'Methanol Unit 2' },
  { code: 'UTL', nameFa: 'یوتیلیتی و آب و برق', nameEn: 'Utilities, Water & Power' },
  { code: 'INS', nameFa: 'ابزاردقیق و کنترل', nameEn: 'Instrumentation & Control' },
  { code: 'LAB', nameFa: 'آزمایشگاه مرکزی', nameEn: 'Central Laboratory' },
];

const INITIAL_CONFIDENTIALITIES: CatalogItem[] = [
  { code: 'C1', nameFa: 'عمومی', nameEn: 'Public' },
  { code: 'C2', nameFa: 'داخلی', nameEn: 'Internal' },
  { code: 'C3', nameFa: 'محرمانه فنی', nameEn: 'Technical Confidential' },
  { code: 'C4', nameFa: 'فوق‌محرمانه', nameEn: 'Top Secret' },
];

const INITIAL_ISO_STANDARDS: CatalogItem[] = [
  { code: 'ISO 9001:2015', nameFa: 'سیستم مدیریت کیفیت', nameEn: 'Quality Management System' },
  { code: 'ISO 14001:2015', nameFa: 'سیستم مدیریت زیست‌محیطی', nameEn: 'Environmental Management System' },
  { code: 'ISO 45001:2018', nameFa: 'ایمنی و بهداشت شغلی', nameEn: 'Occupational Health & Safety' },
  { code: 'ISO 50001:2018', nameFa: 'سیستم مدیریت انرژی', nameEn: 'Energy Management System' },
  { code: 'ISO/IEC 17025', nameFa: 'صلاحیت آزمایشگاه‌ها', nameEn: 'Testing & Calibration Labs' },
];

const formatUserActor = (u?: UserAccount) =>
  u ? `${u.firstName} ${u.lastName} (${u.roleTitle})` : '';

export const DocumentCreatePage: React.FC<DocumentCreatePageProps> = ({
  documents,
  users,
  onAddDocument,
  onNavigate,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docTypes, setDocTypes] = useState<CatalogItem[]>(INITIAL_DOC_TYPES);
  const [managements, setManagements] = useState<CatalogItem[]>(INITIAL_MANAGEMENTS);
  const [units, setUnits] = useState<CatalogItem[]>(INITIAL_UNITS);
  const [confidentialities, setConfidentialities] = useState<CatalogItem[]>(INITIAL_CONFIDENTIALITIES);
  const [isoStandards, setIsoStandards] = useState<CatalogItem[]>(INITIAL_ISO_STANDARDS);

  const [activeCatalogModal, setActiveCatalogModal] = useState<CatalogKind | null>(null);
  const [showCatalogAddForm, setShowCatalogAddForm] = useState(false);
  const [editingCatalogCode, setEditingCatalogCode] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState({ nameFa: '', nameEn: '', code: '' });

  const [docTypeCode, setDocTypeCode] = useState('PR');
  const [mgmtCode, setMgmtCode] = useState('MIS');
  const [unitCode, setUnitCode] = useState('STP');
  const [manualCodeUnlocked, setManualCodeUnlocked] = useState(false);
  const [manualCode, setManualCode] = useState('PR-MIS-STP-03-00');

  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [confidentialityCode, setConfidentialityCode] = useState('C3');
  const [selectedIsos, setSelectedIsos] = useState<string[]>(['ISO 9001:2015', 'ISO 45001:2018']);
  const [reviewCycle, setReviewCycle] = useState<1 | 2 | 3>(2);
  const [slaDays, setSlaDays] = useState<3 | 5 | 10>(5);
  const [justification, setJustification] = useState('');

  const [files, setFiles] = useState<UploadedDraftFile[]>([
    { id: 'f1', name: 'PR-MIS-STP-02-00_draft.docx', size: '۲.۴ مگابایت', type: 'docx' },
    { id: 'f2', name: 'PR-MIS-STP-02-00_PID.pdf', size: '۸.۱ مگابایت', type: 'pdf' },
  ]);

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        label: formatUserActor(u),
      })),
    [users]
  );

  const [workflowActors, setWorkflowActors] = useState(() => [
    { step: 'گام ۱: تهیه‌کننده', actor: formatUserActor(users[0]) },
    { step: 'گام ۲: تاییدکننده فنی', actor: formatUserActor(users[1] || users[0]) },
    { step: 'گام ۳: تصویب‌کننده انطباق', actor: formatUserActor(users[3] || users[0]) },
    { step: 'گام ۴: تصویب نهایی', actor: formatUserActor(users[6] || users[0]) },
  ]);

  const generatedCode = `${docTypeCode || '---'}-${mgmtCode || '---'}-${unitCode || '---'}-03-00`;
  const activeCode = manualCodeUnlocked ? manualCode : generatedCode;

  const isDuplicate = useMemo(
    () => documents.some((d) => d.code.toLowerCase() === activeCode.trim().toLowerCase()),
    [documents, activeCode]
  );

  const selectedMgmtLabel = managements.find((m) => m.code === mgmtCode)?.nameFa || managements[0]?.nameFa || 'نامشخص';
  const selectedUnitLabel = units.find((u) => u.code === unitCode)?.nameFa || units[0]?.nameFa || 'نامشخص';
  const selectedTypeItem = docTypes.find((t) => t.code === docTypeCode) || docTypes[0] || { code: '---', nameFa: 'نامشخص', nameEn: '' };
  const selectedTypeObj = {
    code: selectedTypeItem.code,
    full: `${selectedTypeItem.nameFa} (${selectedTypeItem.code})`,
  };
  const selectedConfidentialityItem =
    confidentialities.find((c) => c.code === confidentialityCode) || confidentialities[0];
  const confidentialityLabel = selectedConfidentialityItem
    ? `${selectedConfidentialityItem.nameFa} (${selectedConfidentialityItem.code})`
    : 'عمومی (C1)';

  const openCatalogModal = (kind: CatalogKind) => {
    setActiveCatalogModal(kind);
    setShowCatalogAddForm(false);
    setEditingCatalogCode(null);
    setCatalogForm({ nameFa: '', nameEn: '', code: '' });
  };

  const startEditCatalogItem = (item: CatalogItem) => {
    setEditingCatalogCode(item.code);
    setCatalogForm({ nameFa: item.nameFa, nameEn: item.nameEn, code: item.code });
    setShowCatalogAddForm(true);
  };

  const handleDeleteCatalogItem = (kind: CatalogKind, targetCode: string) => {
    if (kind === 'docType') {
      const next = docTypes.filter((item) => item.code !== targetCode);
      setDocTypes(next);
      if (docTypeCode === targetCode) setDocTypeCode(next[0]?.code || '');
    } else if (kind === 'management') {
      const next = managements.filter((item) => item.code !== targetCode);
      setManagements(next);
      if (mgmtCode === targetCode) setMgmtCode(next[0]?.code || '');
    } else if (kind === 'unit') {
      const next = units.filter((item) => item.code !== targetCode);
      setUnits(next);
      if (unitCode === targetCode) setUnitCode(next[0]?.code || '');
    } else if (kind === 'confidentiality') {
      const next = confidentialities.filter((item) => item.code !== targetCode);
      setConfidentialities(next);
      if (confidentialityCode === targetCode) setConfidentialityCode(next[0]?.code || '');
    } else {
      const next = isoStandards.filter((item) => item.code !== targetCode);
      setIsoStandards(next);
      setSelectedIsos((prev) => prev.filter((c) => c !== targetCode));
    }

    if (editingCatalogCode === targetCode) {
      setEditingCatalogCode(null);
      setShowCatalogAddForm(false);
      setCatalogForm({ nameFa: '', nameEn: '', code: '' });
    }

    onNotify('مورد از لیست حذف شد', `آیتم با کد «${targetCode}» با موفقیت حذف گردید.`, 'info');
  };

  const handleSaveCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCatalogModal) return;

    const nameFa = catalogForm.nameFa.trim();
    const nameEn = catalogForm.nameEn.trim();
    const code =
      activeCatalogModal === 'isoStandard'
        ? catalogForm.code.trim()
        : catalogForm.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!nameFa || !nameEn || !code) {
      onNotify('تکمیل فیلدهای الزامی', 'نام فارسی، نام لاتین و کد/مخفف هر سه الزامی هستند.', 'error');
      return;
    }

    const currentList =
      activeCatalogModal === 'docType'
        ? docTypes
        : activeCatalogModal === 'management'
        ? managements
        : activeCatalogModal === 'unit'
        ? units
        : activeCatalogModal === 'confidentiality'
        ? confidentialities
        : isoStandards;

    const hasDuplicate = currentList.some(
      (item) =>
        item.code.toLowerCase() === code.toLowerCase() &&
        (editingCatalogCode === null || item.code !== editingCatalogCode)
    );

    if (hasDuplicate) {
      onNotify('کد یا مخفف تکراری است', `مقدار «${code}» قبلاً در این لیست ثبت شده است.`, 'error');
      return;
    }

    const entry: CatalogItem = { code, nameFa, nameEn };

    if (editingCatalogCode !== null) {
      const oldCode = editingCatalogCode;
      if (activeCatalogModal === 'docType') {
        setDocTypes((prev) => prev.map((item) => (item.code === oldCode ? entry : item)));
        if (docTypeCode === oldCode) setDocTypeCode(code);
      } else if (activeCatalogModal === 'management') {
        setManagements((prev) => prev.map((item) => (item.code === oldCode ? entry : item)));
        if (mgmtCode === oldCode) setMgmtCode(code);
      } else if (activeCatalogModal === 'unit') {
        setUnits((prev) => prev.map((item) => (item.code === oldCode ? entry : item)));
        if (unitCode === oldCode) setUnitCode(code);
      } else if (activeCatalogModal === 'confidentiality') {
        setConfidentialities((prev) => prev.map((item) => (item.code === oldCode ? entry : item)));
        if (confidentialityCode === oldCode) setConfidentialityCode(code);
      } else {
        setIsoStandards((prev) => prev.map((item) => (item.code === oldCode ? entry : item)));
        setSelectedIsos((prev) => prev.map((c) => (c === oldCode ? code : c)));
      }

      onNotify('ویرایش با موفقیت انجام شد', `«${nameFa}» (${code}) در لیست به‌روزرسانی گردید.`, 'success');
    } else {
      if (activeCatalogModal === 'docType') {
        setDocTypes((prev) => [...prev, entry]);
        setDocTypeCode(code);
      } else if (activeCatalogModal === 'management') {
        setManagements((prev) => [...prev, entry]);
        setMgmtCode(code);
      } else if (activeCatalogModal === 'unit') {
        setUnits((prev) => [...prev, entry]);
        setUnitCode(code);
      } else if (activeCatalogModal === 'confidentiality') {
        setConfidentialities((prev) => [...prev, entry]);
        setConfidentialityCode(code);
      } else {
        setIsoStandards((prev) => [...prev, entry]);
        setSelectedIsos((prev) => (prev.includes(code) ? prev : [...prev, code]));
      }

      onNotify(
        'مورد جدید با موفقیت اضافه شد',
        `«${nameFa}» (${code}) به لیست اضافه و انتخاب گردید.`,
        'success'
      );
    }

    setCatalogForm({ nameFa: '', nameEn: '', code: '' });
    setEditingCatalogCode(null);
    setShowCatalogAddForm(false);
  };

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
      confidentiality: confidentialityLabel,
      isoStandards: selectedIsos.length > 0 ? selectedIsos : [isoStandards[0]?.code || 'ISO 9001:2015'],
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
          <span className="font-label-code text-[11px] px-3 py-1 rounded-full bg-white border border-border-hairline">
            ۱۴۰۳/۰۸/۲۴ - ۱۰:۴۵
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 sm:p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-primary">فرم ثبت و گردش کار مستند جدید</h1>
          </div>
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
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-primary">۱. نوع مدرک سازمانی</label>
                  <button
                    type="button"
                    onClick={() => openCatalogModal('docType')}
                    className="px-2 py-0.5 rounded-lg bg-secondary-container/60 hover:bg-secondary-container text-[10.5px] font-bold text-primary inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-[14px] text-secondary">playlist_add</span>
                    مدیریت لیست
                  </button>
                </div>
                <select
                  value={docTypeCode}
                  onChange={(e) => setDocTypeCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                >
                  {docTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.nameFa} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-primary">۲. مدیریت متولی</label>
                  <button
                    type="button"
                    onClick={() => openCatalogModal('management')}
                    className="px-2 py-0.5 rounded-lg bg-secondary-container/60 hover:bg-secondary-container text-[10.5px] font-bold text-primary inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-[14px] text-secondary">playlist_add</span>
                    مدیریت لیست
                  </button>
                </div>
                <select
                  value={mgmtCode}
                  onChange={(e) => setMgmtCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                >
                  {managements.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} — {m.nameFa}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-primary">۳. واحد سازمانی</label>
                  <button
                    type="button"
                    onClick={() => openCatalogModal('unit')}
                    className="px-2 py-0.5 rounded-lg bg-secondary-container/60 hover:bg-secondary-container text-[10.5px] font-bold text-primary inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-[14px] text-secondary">playlist_add</span>
                    مدیریت لیست
                  </button>
                </div>
                <select
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                >
                  {units.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code} — {u.nameFa}
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
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-primary">سطح محرمانگی سند</label>
                  <button
                    type="button"
                    onClick={() => openCatalogModal('confidentiality')}
                    className="px-2 py-0.5 rounded-lg bg-secondary-container/60 hover:bg-secondary-container text-[10.5px] font-bold text-primary inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-[14px] text-secondary">playlist_add</span>
                    مدیریت لیست
                  </button>
                </div>
                <select
                  value={confidentialityCode}
                  onChange={(e) => setConfidentialityCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low text-xs font-semibold text-primary focus:outline-none focus:border-secondary"
                >
                  {confidentialities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameFa} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ISO Checkboxes */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-primary">استانداردهای مرجع مرتبط (ISO Mapping)</label>
                <button
                  type="button"
                  onClick={() => openCatalogModal('isoStandard')}
                  className="px-2.5 py-0.5 rounded-lg bg-secondary-container/60 hover:bg-secondary-container text-[10.5px] font-bold text-primary inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined !text-[14px] text-secondary">playlist_add</span>
                  مدیریت لیست
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {isoStandards.map((iso) => {
                  const checked = selectedIsos.includes(iso.code);
                  return (
                    <button
                      key={iso.code}
                      type="button"
                      onClick={() => toggleIso(iso.code)}
                      title={`${iso.nameFa} — ${iso.nameEn}`}
                      className={`font-label-code px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        checked
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-container-low text-on-surface-variant border-border-hairline hover:border-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined !text-[15px]">
                        {checked ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      {iso.code}
                    </button>
                  );
                })}
                {isoStandards.length === 0 && (
                  <span className="text-xs text-on-surface-variant">
                    هیچ استانداردی در لیست وجود ندارد. از دکمه «مدیریت لیست» استاندارد جدید اضافه کنید.
                  </span>
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
                  <div className="text-[11px] text-on-surface-variant">ثبت‌کننده سند</div>
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
              {workflowActors.map((item, idx) => {
                const currentValue = userOptions.some((opt) => opt.label === item.actor)
                  ? item.actor
                  : userOptions[0]?.label || '';
                return (
                  <div key={item.step} className="p-3 rounded-xl bg-surface-container-low border border-border-hairline">
                    <div className="text-[11px] font-bold text-secondary mb-1">{item.step}</div>
                    <select
                      value={currentValue}
                      onChange={(e) => {
                        const next = [...workflowActors];
                        next[idx] = { ...next[idx], actor: e.target.value };
                        setWorkflowActors(next);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border-hairline bg-white text-xs font-semibold text-primary focus:outline-none focus:border-secondary cursor-pointer"
                    >
                      {userOptions.map((opt) => (
                        <option key={opt.id} value={opt.label}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
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
      <div className="sticky bottom-3 z-20 bg-white/95 backdrop-blur-md border border-border-hairline rounded-2xl p-3.5 shadow-[0px_18px_40px_-10px_rgba(20,44,67,0.16)] flex flex-wrap items-center justify-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
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

      {/* In-Page Catalog Management Modal */}
      {activeCatalogModal && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-4xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {(() => {
              const modalMeta =
                activeCatalogModal === 'docType'
                  ? {
                      listTitle: 'لیست نوع مدرک سازمانی',
                      addBtnLabel: 'افزودن نوع مدرک سازمانی جدید',
                      editTitle: 'ویرایش نوع مدرک سازمانی',
                      subtitle: 'مدیریت، ویرایش و حذف انواع اسناد رسمی سامانه و مخفف استاندارد آن‌ها در کد مدرک تولیدی',
                      codeFieldLabel: '۳. مخفف (در کد مدرک تولیدی) *',
                      codeColumnHeader: 'مخفف (کد در شناسه تولیدی)',
                      codePlaceholder: 'e.g. TI',
                      items: docTypes,
                      isMultiSelect: false,
                      isItemSelected: (code: string) => docTypeCode === code,
                      onSelect: (code: string) => {
                        setDocTypeCode(code);
                        setActiveCatalogModal(null);
                      },
                    }
                  : activeCatalogModal === 'management'
                  ? {
                      listTitle: 'لیست مدیریت متولی',
                      addBtnLabel: 'افزودن مدیریت متولی جدید',
                      editTitle: 'ویرایش مدیریت متولی',
                      subtitle: 'مدیریت، ویرایش و حذف مدیریت‌های سازمانی مجتمع و مخفف لاتین آن‌ها در شناسه مدرک',
                      codeFieldLabel: '۳. مخفف (در کد مدرک تولیدی) *',
                      codeColumnHeader: 'مخفف (کد در شناسه تولیدی)',
                      codePlaceholder: 'e.g. ITM',
                      items: managements,
                      isMultiSelect: false,
                      isItemSelected: (code: string) => mgmtCode === code,
                      onSelect: (code: string) => {
                        setMgmtCode(code);
                        setActiveCatalogModal(null);
                      },
                    }
                  : activeCatalogModal === 'unit'
                  ? {
                      listTitle: 'لیست واحد سازمانی',
                      addBtnLabel: 'افزودن واحد سازمانی جدید',
                      editTitle: 'ویرایش واحد سازمانی',
                      subtitle: 'مدیریت، ویرایش و حذف واحدهای عملیاتی/ستادی و کد اختصاری آن‌ها در ساختار کدگذاری',
                      codeFieldLabel: '۳. مخفف (در کد مدرک تولیدی) *',
                      codeColumnHeader: 'مخفف (کد در شناسه تولیدی)',
                      codePlaceholder: 'e.g. PIP',
                      items: units,
                      isMultiSelect: false,
                      isItemSelected: (code: string) => unitCode === code,
                      onSelect: (code: string) => {
                        setUnitCode(code);
                        setActiveCatalogModal(null);
                      },
                    }
                  : activeCatalogModal === 'confidentiality'
                  ? {
                      listTitle: 'لیست سطوح محرمانگی سند',
                      addBtnLabel: 'افزودن سطح محرمانگی جدید',
                      editTitle: 'ویرایش سطح محرمانگی',
                      subtitle: 'مدیریت، ویرایش و حذف سطوح طبقه‌بندی امنیتی اسناد و کد سطح آن‌ها (C1 تا C4 و سطوح جدید)',
                      codeFieldLabel: '۳. مخفف / کد سطح (مثال: C5) *',
                      codeColumnHeader: 'کد سطح',
                      codePlaceholder: 'e.g. C5',
                      items: confidentialities,
                      isMultiSelect: false,
                      isItemSelected: (code: string) => confidentialityCode === code,
                      onSelect: (code: string) => {
                        setConfidentialityCode(code);
                        setActiveCatalogModal(null);
                      },
                    }
                  : {
                      listTitle: 'لیست استانداردهای مرجع مرتبط',
                      addBtnLabel: 'افزودن استاندارد مرجع جدید',
                      editTitle: 'ویرایش استاندارد مرجع',
                      subtitle: 'افزودن، ویرایش و حذف استانداردهای مرجع جهت انتخاب در فرم شناسنامه سند',
                      codeFieldLabel: '۳. مخفف / کد استاندارد *',
                      codeColumnHeader: 'کد استاندارد',
                      codePlaceholder: 'e.g. ISO 27001:2022',
                      items: isoStandards,
                      isMultiSelect: true,
                      isItemSelected: (code: string) => selectedIsos.includes(code),
                      onSelect: (code: string) => toggleIso(code),
                    };

              return (
                <>
                  {/* Modal Header */}
                  <div className="px-6 py-4 bg-primary text-white flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined !text-[22px]">list_alt</span>
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold">{modalMeta.listTitle}</h3>
                        <p className="text-[11px] text-white/80 mt-0.5">{modalMeta.subtitle}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveCatalogModal(null)}
                      className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {/* Top Action Bar inside modal */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold text-on-surface-variant tabular-nums">
                        تعداد کل اقلام تعریف‌شده:{' '}
                        <strong className="text-primary">{modalMeta.items.length.toLocaleString('fa-IR')} مورد</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingCatalogCode !== null) {
                            setEditingCatalogCode(null);
                            setCatalogForm({ nameFa: '', nameEn: '', code: '' });
                            setShowCatalogAddForm(true);
                          } else {
                            setCatalogForm({ nameFa: '', nameEn: '', code: '' });
                            setShowCatalogAddForm((v) => !v);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined !text-[18px]">
                          {showCatalogAddForm && editingCatalogCode === null ? 'expand_less' : 'add_circle'}
                        </span>
                        {modalMeta.addBtnLabel}
                      </button>
                    </div>

                    {/* Inline Add / Edit Form */}
                    {showCatalogAddForm && (
                      <form
                        onSubmit={handleSaveCatalogItem}
                        className="p-4 rounded-2xl bg-surface-container-low border border-secondary/30 space-y-4 animate-modal-enter"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                            <span className="material-symbols-outlined !text-[17px] text-secondary">
                              {editingCatalogCode !== null ? 'edit_note' : 'post_add'}
                            </span>
                            {editingCatalogCode !== null ? modalMeta.editTitle : modalMeta.addBtnLabel}
                          </h4>
                          <span className="text-[11px] text-on-surface-variant">
                            {activeCatalogModal === 'confidentiality'
                              ? 'عنوان و کد سطح در لیست محرمانگی سند نمایش داده می‌شود'
                              : activeCatalogModal === 'isoStandard'
                              ? 'کد استاندارد به‌عنوان گزینه قابل انتخاب در فرم ثبت سند ظاهر می‌شود'
                              : 'مخفف مستقیماً در کد مدرک تولیدی درج می‌شود'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block font-bold text-primary mb-1.5">۱. نام فارسی *</label>
                            <input
                              type="text"
                              required
                              value={catalogForm.nameFa}
                              onChange={(e) => setCatalogForm({ ...catalogForm, nameFa: e.target.value })}
                              placeholder="مثال: روش بازرسی فنی"
                              className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-white focus:outline-none focus:border-secondary"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-primary mb-1.5">۲. نام لاتین *</label>
                            <input
                              type="text"
                              required
                              dir="ltr"
                              value={catalogForm.nameEn}
                              onChange={(e) => setCatalogForm({ ...catalogForm, nameEn: e.target.value })}
                              placeholder="e.g. Technical Inspection"
                              className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-white font-label-code text-left focus:outline-none focus:border-secondary"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-primary mb-1.5">{modalMeta.codeFieldLabel}</label>
                            <input
                              type="text"
                              required
                              dir="ltr"
                              maxLength={activeCatalogModal === 'isoStandard' ? 28 : 6}
                              value={catalogForm.code}
                              onChange={(e) =>
                                setCatalogForm({
                                  ...catalogForm,
                                  code:
                                    activeCatalogModal === 'isoStandard'
                                      ? e.target.value
                                      : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                                })
                              }
                              placeholder={modalMeta.codePlaceholder}
                              className={`w-full px-3 py-2 rounded-xl border border-border-hairline bg-white font-label-code font-bold text-left focus:outline-none focus:border-secondary ${
                                activeCatalogModal === 'isoStandard' ? '' : 'uppercase'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="text-[11px] text-on-surface-variant">
                            {activeCatalogModal === 'confidentiality' ? (
                              <>
                                پیش‌نمایش نمایش در لیست:{' '}
                                <span className="font-bold text-secondary">
                                  {catalogForm.nameFa || 'عنوان'} ({catalogForm.code || 'C5'})
                                </span>
                              </>
                            ) : activeCatalogModal === 'isoStandard' ? (
                              <>
                                پیش‌نمایش گزینه انتخابی در فرم:{' '}
                                <span className="font-label-code font-extrabold text-secondary" dir="ltr">
                                  {catalogForm.code || 'ISO 27001:2022'}
                                </span>
                              </>
                            ) : (
                              <>
                                پیش‌نمایش کد تولیدی با مخفف جدید:{' '}
                                <span className="font-label-code font-extrabold text-secondary" dir="ltr">
                                  {activeCatalogModal === 'docType'
                                    ? `${catalogForm.code || 'XXX'}-${mgmtCode || '---'}-${unitCode || '---'}-03-00`
                                    : activeCatalogModal === 'management'
                                    ? `${docTypeCode || '---'}-${catalogForm.code || 'XXX'}-${unitCode || '---'}-03-00`
                                    : `${docTypeCode || '---'}-${mgmtCode || '---'}-${catalogForm.code || 'XXX'}-03-00`}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCatalogAddForm(false);
                                setEditingCatalogCode(null);
                                setCatalogForm({ nameFa: '', nameEn: '', code: '' });
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-border-hairline bg-white text-xs font-semibold text-on-surface-variant cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-xl bg-tertiary hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                            >
                              {editingCatalogCode !== null ? 'ذخیره تغییرات' : 'ذخیره و افزودن به لیست'}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Table displaying Name FA, Name EN, Abbreviation Code, and Actions (Select / Edit / Delete) */}
                    <div className="border border-border-hairline rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-border-hairline font-extrabold text-primary text-[11px]">
                            <th className="py-3 px-4 w-14 text-center">ردیف</th>
                            <th className="py-3 px-4">نام فارسی</th>
                            <th className="py-3 px-4">نام لاتین</th>
                            <th className="py-3 px-4 text-center">{modalMeta.codeColumnHeader}</th>
                            <th className="py-3 px-4 text-center w-48">انتخاب و عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-hairline/70">
                          {modalMeta.items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-xs text-on-surface-variant">
                                هیچ موردی در این لیست وجود ندارد. از دکمه بالا مورد جدید اضافه کنید.
                              </td>
                            </tr>
                          ) : (
                            modalMeta.items.map((item, idx) => {
                              const isSelected = modalMeta.isItemSelected(item.code);
                              return (
                                <tr
                                  key={item.code}
                                  className={`transition-colors ${
                                    isSelected ? 'bg-secondary-container/25' : 'hover:bg-surface-container-low/50'
                                  }`}
                                >
                                  <td className="py-3 px-4 text-center font-bold text-on-surface-variant tabular-nums">
                                    {(idx + 1).toLocaleString('fa-IR')}
                                  </td>
                                  <td className="py-3 px-4 font-bold text-primary">{item.nameFa}</td>
                                  <td className="py-3 px-4 font-label-code text-on-surface-variant text-left" dir="ltr">
                                    {item.nameEn}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className="font-label-code inline-block px-2.5 py-0.5 rounded-md bg-surface-container-low border border-border-hairline font-extrabold text-secondary"
                                      dir="ltr"
                                    >
                                      {item.code}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="inline-flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => modalMeta.onSelect(item.code)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                          isSelected
                                            ? 'bg-tertiary text-white'
                                            : 'bg-surface-container-low hover:bg-primary hover:text-white text-primary'
                                        }`}
                                      >
                                        {isSelected ? 'انتخاب‌شده' : 'انتخاب'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => startEditCatalogItem(item)}
                                        title="ویرایش"
                                        className="p-1.5 rounded-lg bg-sky-50 hover:bg-secondary text-secondary hover:text-white transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined !text-[15px]">edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCatalogItem(activeCatalogModal, item.code)}
                                        title="حذف"
                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-critical-hse text-critical-hse hover:text-white transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined !text-[15px]">delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveCatalogModal(null)}
                      className="px-5 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold cursor-pointer"
                    >
                      بستن پنجره
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
