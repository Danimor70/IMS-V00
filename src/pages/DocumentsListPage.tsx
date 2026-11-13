import React, { useMemo, useRef, useState } from 'react';
import { exportToCsv } from '../data/imsData';
import { ImsDocument, RouteId } from '../types/ims';

interface DocumentsListPageProps {
  documents: ImsDocument[];
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const DocumentsListPage: React.FC<DocumentsListPageProps> = ({ documents, onNavigate, onNotify }) => {
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const [preset, setPreset] = useState<'all' | 'approved' | 'my-sign' | 'expiring'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [colFilters, setColFilters] = useState({
    code: '',
    docType: '',
    title: '',
    status: '',
    management: '',
    unit: '',
    registeredAt: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inspectDoc, setInspectDoc] = useState<ImsDocument | null>(null);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (preset === 'approved' && d.status !== 'مصوب') return false;
      if (preset === 'my-sign' && !d.needsMySignature) return false;
      if (preset === 'expiring' && !d.expiringSoon && d.status !== 'نیازمند بازنگری') return false;

      if (colFilters.code && !d.code.toLowerCase().includes(colFilters.code.toLowerCase())) return false;
      if (colFilters.docType && d.docTypeCode !== colFilters.docType) return false;
      if (colFilters.title && !d.title.toLowerCase().includes(colFilters.title.toLowerCase())) return false;
      if (colFilters.status && d.status !== colFilters.status) return false;
      if (colFilters.management && d.management !== colFilters.management) return false;
      if (colFilters.unit && !d.unit.toLowerCase().includes(colFilters.unit.toLowerCase())) return false;
      if (colFilters.registeredAt && !d.registeredAt.includes(colFilters.registeredAt)) return false;
      return true;
    });
  }, [documents, preset, colFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedDocs = filteredDocs.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Dynamic KPIs anchored cleanly to enterprise volume
  const baseTotal = 1410 + documents.length;
  const baseApproved = 1074 + documents.filter((d) => d.status === 'مصوب').length;
  const basePending = 191 + documents.filter((d) => d.status === 'در جریان بررسی').length;
  const baseRevision = 145 + documents.filter((d) => d.status === 'نیازمند بازنگری' || d.status === 'منسوخ').length;

  const allOnPageSelected =
    paginatedDocs.length > 0 && paginatedDocs.every((doc) => selectedIds.includes(doc.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedDocs.some((d) => d.id === id)));
    } else {
      const next = new Set(selectedIds);
      paginatedDocs.forEach((d) => next.add(d.id));
      setSelectedIds(Array.from(next));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setPreset('all');
    setColFilters({ code: '', docType: '', title: '', status: '', management: '', unit: '', registeredAt: '' });
    setPage(1);
    onNotify('فیلترها بازنشانی شد', 'تمامی مستندات مجتمع نمایش داده می‌شوند.', 'info');
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) {
      onNotify('موردی انتخاب نشده است', 'ابتدا حداقل یک سند را از جدول علامت بزنید.', 'warning');
      return;
    }
    const chosen = documents.filter((d) => selectedIds.includes(d.id));
    exportToCsv(
      'apadana-selected-documents.csv',
      ['کد مدرک', 'نوع مدرک', 'عنوان مدرک', 'نگارش', 'وضعیت', 'مدیریت متولی', 'واحد', 'تاریخ ثبت', 'تاریخ انقضا'],
      chosen.map((d) => [d.code, d.docType, d.title, d.version, d.status, d.management, d.unit, d.registeredAt, d.expiresAt])
    );
    onNotify('خروجی موارد انتخابی آماده شد', `${chosen.length.toLocaleString('fa-IR')} سند در قالب اکسل ذخیره گردید.`, 'success');
  };

  const handleExportAllExcel = () => {
    exportToCsv(
      'apadana-all-documents.csv',
      ['کد مدرک', 'نوع مدرک', 'عنوان مدرک', 'نگارش', 'وضعیت', 'مدیریت متولی', 'واحد', 'تاریخ ثبت', 'بازبینی بعدی', 'تاریخ انقضا'],
      filteredDocs.map((d) => [d.code, d.docType, d.title, d.version, d.status, d.management, d.unit, d.registeredAt, d.reviewAt, d.expiresAt])
    );
    onNotify('خروجی Excel کامل صادر شد', `${filteredDocs.length.toLocaleString('fa-IR')} ردیف سند با رمزگذاری UTF-8 دانلود شد.`, 'success');
  };

  const handleExportPdf = () => {
    onNotify('تولید بسته PDF با واترمارک کنترل‌شده', 'فایل چاپی فهرست مستندات مصوب جهت ارائه در ممیزی آماده شد.', 'success');
  };

  const scrollTable = (dir: 'left' | 'right') => {
    if (!tableWrapRef.current) return;
    tableWrapRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb & Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onNavigate('dashboard')} className="hover:text-primary cursor-pointer">
            خانه
          </button>
          <span>/</span>
          <span>مدیریت مستندات و سوابق</span>
          <span>/</span>
          <span className="font-bold text-primary">فهرست مستندات و سوابق مصوب</span>
        </div>
        <span className="font-label-code text-[11px] px-3 py-1 rounded-full bg-white border border-border-hairline text-on-surface-variant">
          به‌روزرسانی مخزن EDMS: ۱۴۰۳/۰۸/۲۴ - ۱۰:۴۵
        </span>
      </div>

      {/* Command Header */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-primary">فهرست جامع مستندات و اطلاعات مدون (Master Document List)</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            جستجوی پیشرفته ستونی، پایش تاریخ بازبینی دوره‌ای و مدیریت نسخه‌های معتبر استانداردهای چهارگانه ISO مجتمع
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportSelected}
            className="px-3.5 py-2 rounded-xl border border-border-hairline bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[16px]">checklist</span>
            خروجی موارد انتخابی
            {selectedIds.length > 0 && (
              <span className="font-label-code px-1.5 py-0.2 rounded-full bg-secondary text-white text-[10px]">
                {selectedIds.length.toLocaleString('fa-IR')}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportAllExcel}
            className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-semibold text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[16px] text-tertiary">table_view</span>
            خروجی Excel کامل
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-semibold text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[16px] text-critical-hse">picture_as_pdf</span>
            خروجی PDF کامل
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="p-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-on-surface-variant cursor-pointer"
            title="پاک‌سازی تمامی فیلترها"
          >
            <span className="material-symbols-outlined !text-[18px]">filter_alt_off</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('documents-create')}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">add_circle</span>
            ثبت مستند جدید
          </button>
        </div>
      </section>

      {/* 4 Color-Bordered KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border-2 border-[#142C43] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">کل مستندات ثبت‌شده</div>
            <div className="font-label-code text-2xl font-extrabold text-primary mt-1">
              {baseTotal.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">در تمامی مدیریت‌ها و واحدها</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#142C43]/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined !text-[24px]">library_books</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-[#16846B] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">مستندات مصوب و معتبر</div>
            <div className="font-label-code text-2xl font-extrabold text-[#16846B] mt-1">
              {baseApproved.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] text-tertiary mt-0.5">قابل استناد در ممیزی رسمی</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined !text-[24px]">verified</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-[#D97706] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">در جریان گردش تایید</div>
            <div className="font-label-code text-2xl font-extrabold text-[#D97706] mt-1">
              {basePending.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">منتظر صحه‌گذاری یا امضای مدیر</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-warning-capa flex items-center justify-center">
            <span className="material-symbols-outlined !text-[24px]">pending_actions</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-[#DC2626] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">نیازمند بازنگری / در شرف انقضا</div>
            <div className="font-label-code text-2xl font-extrabold text-[#DC2626] mt-1">
              {baseRevision.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] text-critical-hse mt-0.5">اقدام فوری در بازه ۳۰ روزه</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-critical-hse flex items-center justify-center">
            <span className="material-symbols-outlined !text-[24px]">event_busy</span>
          </div>
        </div>
      </section>

      {/* Preset Filters & Scroll Controls */}
      <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="p-4 border-b border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/40">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'همه مستندات' },
              { id: 'approved', label: 'صرفاً مصوب معتبر' },
              { id: 'my-sign', label: 'نیازمند امضای من' },
              { id: 'expiring', label: 'انقضا تا ۳۰ روز آینده' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setPreset(tab.id as typeof preset);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  preset === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white border border-border-hairline text-on-surface-variant hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-on-surface-variant hidden md:inline">پیمایش افقی ستون‌ها:</span>
            <button
              type="button"
              onClick={() => scrollTable('right')}
              className="w-8 h-8 rounded-lg bg-white border border-border-hairline hover:bg-surface-container-low flex items-center justify-center cursor-pointer"
              title="حرکت به راست"
            >
              <span className="material-symbols-outlined !text-[18px]">chevron_right</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTable('left')}
              className="w-8 h-8 rounded-lg bg-white border border-border-hairline hover:bg-surface-container-low flex items-center justify-center cursor-pointer"
              title="حرکت به چپ"
            >
              <span className="material-symbols-outlined !text-[18px]">chevron_left</span>
            </button>
          </div>
        </div>

        {/* 12-Column Wide Data Table */}
        <div ref={tableWrapRef} className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[1540px] text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                <th className="py-3 px-3 w-11 text-center">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">کد مدرک</th>
                <th className="py-3 px-3">نوع سند</th>
                <th className="py-3 px-3 min-w-[290px]">عنوان مستند</th>
                <th className="py-3 px-3">نگارش</th>
                <th className="py-3 px-3">وضعیت</th>
                <th className="py-3 px-3">مدیریت متولی</th>
                <th className="py-3 px-3">واحد سازمانی</th>
                <th className="py-3 px-3">تاریخ ثبت</th>
                <th className="py-3 px-3">بازبینی آتی</th>
                <th className="py-3 px-3">تاریخ انقضا</th>
                <th className="py-3 px-3 text-center">عملیات</th>
              </tr>

              {/* Inline Column Filter Row */}
              <tr className="bg-white border-b border-border-hairline text-[11px]">
                <th className="p-2" />
                <th className="p-2">
                  <input
                    type="text"
                    value={colFilters.code}
                    onChange={(e) => {
                      setColFilters({ ...colFilters, code: e.target.value });
                      setPage(1);
                    }}
                    placeholder="فیلتر کد..."
                    className="w-full px-2 py-1 rounded-lg border border-border-hairline bg-surface-container-low/60 font-normal focus:outline-none focus:border-secondary"
                  />
                </th>
                <th className="p-2">
                  <select
                    value={colFilters.docType}
                    onChange={(e) => {
                      setColFilters({ ...colFilters, docType: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-2 py-1 rounded-lg border border-border-hairline bg-surface-container-low/60 font-normal focus:outline-none"
                  >
                    <option value="">همه انواع</option>
                    <option value="SOP">SOP</option>
                    <option value="PR">PR</option>
                    <option value="WI">WI</option>
                    <option value="POL">POL</option>
                    <option value="MN">MN</option>
                    <option value="FRM">FRM</option>
                  </select>
                </th>
                <th className="p-2">
                  <input
                    type="text"
                    value={colFilters.title}
                    onChange={(e) => {
                      setColFilters({ ...colFilters, title: e.target.value });
                      setPage(1);
                    }}
                    placeholder="جستجو در عنوان..."
                    className="w-full px-2 py-1 rounded-lg border border-border-hairline bg-surface-container-low/60 font-normal focus:outline-none focus:border-secondary"
                  />
                </th>
                <th className="p-2" />
                <th className="p-2">
                  <select
                    value={colFilters.status}
                    onChange={(e) => {
                      setColFilters({ ...colFilters, status: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-2 py-1 rounded-lg border border-border-hairline bg-surface-container-low/60 font-normal focus:outline-none"
                  >
                    <option value="">همه</option>
                    <option value="مصوب">مصوب</option>
                    <option value="در جریان بررسی">در جریان بررسی</option>
                    <option value="نیازمند بازنگری">نیازمند بازنگری</option>
                    <option value="منسوخ">منسوخ</option>
                  </select>
                </th>
                <th className="p-2">
                  <select
                    value={colFilters.management}
                    onChange={(e) => {
                      setColFilters({ ...colFilters, management: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-2 py-1 rounded-lg border border-border-hairline bg-surface-container-low/60 font-normal focus:outline-none"
                  >
                    <option value="">همه مدیریت‌ها</option>
                    <option value="مدیریت بهره‌برداری">مدیریت بهره‌برداری</option>
                    <option value="مدیریت HSE و آتش‌نشانی">مدیریت HSE و آتش‌نشانی</option>
                    <option value="مدیریت تضمین کیفیت">مدیریت تضمین کیفیت</option>
                    <option value="مدیریت مهندسی و بازرسی">مدیریت مهندسی و بازرسی</option>
                    <option value="مدیریت کنترل کیفیت">مدیریت کنترل کیفیت</option>
                  </select>
                </th>
                <th className="p-2">
                  <input
                    type="text"
                    value={colFilters.unit}
                    onChange={(e) => {
                      setColFilters({ ...colFilters, unit: e.target.value });
                      setPage(1);
                    }}
                    placeholder="واحد..."
                    className="w-full px-2 py-1 rounded-lg border border-border-hairline bg-surface-container-low/60 font-normal focus:outline-none"
                  />
                </th>
                <th className="p-2">
                  <input
                    type="text"
                    value={colFilters.registeredAt}
                    onChange={(e) => {
                      setColFilters({ ...colFilters, registeredAt: e.target.value });
                      setPage(1);
                    }}
                    placeholder="۱۴۰۳/..."
                    className="w-full px-2 py-1 rounded-lg border border-border-hairline bg-surface-container-low/60 font-normal focus:outline-none"
                  />
                </th>
                <th className="p-2" />
                <th className="p-2" />
                <th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70 text-xs">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-on-surface-variant">
                    هیچ مستندی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => {
                  const statusTone =
                    doc.status === 'مصوب'
                      ? 'bg-emerald-50 text-tertiary border-emerald-200'
                      : doc.status === 'در جریان بررسی'
                      ? 'bg-amber-50 text-warning-capa border-amber-200'
                      : doc.status === 'نیازمند بازنگری'
                      ? 'bg-red-50 text-critical-hse border-red-200'
                      : 'bg-slate-100 text-on-surface-variant border-slate-200';

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-surface-container-low/60 transition-colors ${
                        selectedIds.includes(doc.id) ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(doc.id)}
                          onChange={() => toggleRow(doc.id)}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-label-code font-bold text-secondary whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectDoc(doc)}
                          className="hover:underline cursor-pointer"
                        >
                          {doc.code}
                        </button>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-low border border-border-hairline text-[11px] font-semibold text-primary">
                          {doc.docType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-primary">
                        <div className="line-clamp-1">{doc.title}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.isoStandards.slice(0, 2).map((iso) => (
                            <span
                              key={iso}
                              className="font-label-code text-[9.5px] px-1.5 py-0.2 rounded bg-sky-50 text-secondary"
                            >
                              {iso}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-label-code font-bold text-primary whitespace-nowrap">
                        {doc.version}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${statusTone}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">{doc.management}</td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">{doc.unit}</td>
                      <td className="py-3 px-3 font-label-code text-on-surface-variant whitespace-nowrap">
                        {doc.registeredAt}
                      </td>
                      <td className="py-3 px-3 font-label-code text-on-surface-variant whitespace-nowrap">
                        {doc.reviewAt}
                      </td>
                      <td className="py-3 px-3 font-label-code text-on-surface-variant whitespace-nowrap">
                        {doc.expiresAt}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectDoc(doc)}
                            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white text-primary transition-colors cursor-pointer"
                            title="مشاهده جزئیات و زنجیره امضا"
                          >
                            <span className="material-symbols-outlined !text-[16px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onNotify(
                                `دریافت نسخه PDF ${doc.code}`,
                                'نسخه با واترمارک کنترل‌شده آماده مشاهده است.',
                                'success'
                              )
                            }
                            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-secondary hover:text-white text-secondary transition-colors cursor-pointer"
                            title="دانلود PDF کنترل‌شده"
                          >
                            <span className="material-symbols-outlined !text-[16px]">download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('documents-revision')}
                            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-warning-capa hover:text-white text-warning-capa transition-colors cursor-pointer"
                            title="ارجاع به بازنگری"
                          >
                            <span className="material-symbols-outlined !text-[16px]">edit_document</span>
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant bg-surface-container-low/40">
          <div className="flex items-center gap-3">
            <span>
              نمایش {paginatedDocs.length.toLocaleString('fa-IR')} از {filteredDocs.length.toLocaleString('fa-IR')} مستند
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border border-border-hairline bg-white text-primary font-semibold focus:outline-none"
            >
              <option value={5}>۵ ردیف در صفحه</option>
              <option value={10}>۱۰ ردیف در صفحه</option>
              <option value={20}>۲۰ ردیف در صفحه</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg border border-border-hairline bg-white disabled:opacity-40 flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[17px]">chevron_right</span>
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-label-code font-bold cursor-pointer ${
                  p === safePage
                    ? 'bg-primary text-white'
                    : 'bg-white border border-border-hairline text-primary hover:bg-surface-container-low'
                }`}
              >
                {p.toLocaleString('fa-IR')}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 rounded-lg border border-border-hairline bg-white disabled:opacity-40 flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[17px]">chevron_left</span>
            </button>
          </div>
        </div>
      </section>

      {/* Document Detail & Sign-off History Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-2xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined">description</span>
                <div>
                  <div className="font-label-code text-xs font-bold text-primary-fixed">
                    {inspectDoc.code} • {inspectDoc.version}
                  </div>
                  <h3 className="text-sm font-bold">{inspectDoc.title}</h3>
                </div>
              </div>
              <button type="button" onClick={() => setInspectDoc(null)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low p-4 rounded-xl border border-border-hairline">
                <div>
                  <span className="text-outline block">وضعیت کنونی</span>
                  <span className="font-bold text-primary">{inspectDoc.status}</span>
                </div>
                <div>
                  <span className="text-outline block">سطح محرمانگی</span>
                  <span className="font-bold text-secondary">{inspectDoc.confidentiality}</span>
                </div>
                <div>
                  <span className="text-outline block">مدیریت متولی</span>
                  <span className="font-bold text-primary">{inspectDoc.management}</span>
                </div>
                <div>
                  <span className="text-outline block">مالک مستند</span>
                  <span className="font-bold text-primary">{inspectDoc.owner}</span>
                </div>
              </div>

              {inspectDoc.summary && (
                <div>
                  <h4 className="font-bold text-primary mb-1.5">خلاصه دامنه کاربرد</h4>
                  <p className="text-on-surface-variant leading-6 bg-surface-container-low/60 p-3 rounded-xl">
                    {inspectDoc.summary}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-primary mb-2.5">زنجیره ۳ مرحله‌ای تصویب و تاریخچه امضا</h4>
                <div className="space-y-2.5">
                  {inspectDoc.signoffChain.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border-hairline bg-white"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            step.status === 'approved'
                              ? 'bg-emerald-50 text-tertiary'
                              : 'bg-amber-50 text-warning-capa'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[16px]">
                            {step.status === 'approved' ? 'check' : 'schedule'}
                          </span>
                        </span>
                        <div>
                          <div className="font-bold text-primary">
                            {step.role} — {step.actor}
                          </div>
                          {step.comment && <p className="text-on-surface-variant mt-0.5">{step.comment}</p>}
                        </div>
                      </div>
                      <span className="font-label-code text-[11px] text-outline shrink-0">{step.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onNotify(`پرینت کنترل‌شده ${inspectDoc.code}`, 'نسخه چاپی با درج شناسه کاربری و واترمارک ارسال شد.', 'info');
                }}
                className="px-4 py-2 rounded-lg border border-border-hairline bg-white text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[16px]">print</span>
                چاپ شناسنامه سند
              </button>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="px-5 py-2 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
