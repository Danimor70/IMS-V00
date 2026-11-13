import React, { useMemo, useState } from 'react';
import { exportToCsv, resolveOperationalConfig } from '../data/imsData';
import { OperationalRow, RouteId } from '../types/ims';

interface OperationalModulePageProps {
  route: RouteId;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const OperationalModulePage: React.FC<OperationalModulePageProps> = ({
  route,
  onNavigate,
  onNotify,
}) => {
  const config = useMemo(() => resolveOperationalConfig(route), [route]);
  const [customRows, setCustomRows] = useState<Record<string, OperationalRow[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '',
    category: 'عملیاتی مجتمع',
    owner: 'مهندس مهران کاظمی',
    priority: 'متوسط' as OperationalRow['priority'],
  });

  const rows = useMemo(() => {
    const combined = [...(customRows[config.id] || []), ...config.rows];
    return combined.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (
        searchQuery.trim() &&
        !r.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [config, customRows, statusFilter, searchQuery]);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) return;
    const item: OperationalRow = {
      id: `op-${Date.now()}`,
      code: `${config.standardCode.split(':')[0]}-${Math.floor(100 + Math.random() * 899)}`,
      title: newForm.title.trim(),
      category: newForm.category,
      owner: newForm.owner,
      dueDate: '۱۴۰۳/۰۹/۱۵',
      priority: newForm.priority,
      status: 'در حال بررسی',
      metric: 'ثبت جدید در سامانه',
    };
    setCustomRows((prev) => ({ ...prev, [config.id]: [item, ...(prev[config.id] || [])] }));
    setNewForm({ ...newForm, title: '' });
    setShowAddModal(false);
    onNotify('رکورد جدید با موفقیت ثبت شد', `${item.code} به فهرست ${config.breadcrumbParent} اضافه گردید.`, 'success');
  };

  const handleExport = () => {
    exportToCsv(
      `apadana-${config.id}.csv`,
      ['کد', 'عنوان', 'دسته‌بندی', 'مسئول', 'تاریخ / مهلت', 'اولویت', 'وضعیت', 'شاخص'],
      rows.map((r) => [r.code, r.title, r.category, r.owner, r.dueDate, r.priority, r.status, r.metric])
    );
    onNotify('خروجی اکسل صادر شد', `${rows.length.toLocaleString('fa-IR')} ردیف ذخیره گردید.`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <button type="button" onClick={() => onNavigate('dashboard')} className="hover:text-primary cursor-pointer">
          داشبورد سیستم مدیریت
        </button>
        <span>/</span>
        <span className="font-bold text-primary">{config.breadcrumbParent}</span>
      </div>

      {/* Main Page Title Section */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 sm:p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)] text-center">
        <h1 className="text-lg sm:text-xl font-extrabold text-primary">{config.title}</h1>
      </section>

      {/* Actions Section */}
      <section className="bg-white rounded-2xl border border-border-hairline px-5 py-4 flex flex-wrap items-center justify-center gap-3 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.04)]">
        <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">download</span>
            خروجی اکسل
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">add_circle</span>
            {config.ctaLabel}
          </button>
        </div>
      </section>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {config.kpis.map((kpi) => {
          const valColor =
            kpi.tone === 'critical'
              ? 'text-critical-hse'
              : kpi.tone === 'warning'
              ? 'text-warning-capa'
              : kpi.tone === 'tertiary'
              ? 'text-tertiary'
              : 'text-primary';

          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-border-hairline p-4">
              <div className="text-xs font-semibold text-on-surface-variant">{kpi.label}</div>
              <div className={`font-label-code text-2xl font-extrabold mt-1.5 ${valColor}`}>{kpi.value}</div>
              <div className="text-[11px] text-outline mt-1">{kpi.note}</div>
            </div>
          );
        })}
      </section>

      {/* Interactive Filter & Records Table */}
      <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden">
        <div className="p-4 border-b border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/40">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در کد یا عنوان..."
            className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white text-xs sm:w-72 focus:outline-none focus:border-secondary"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold text-primary"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="تایید شده">تایید شده</option>
            <option value="در حال بررسی">در حال بررسی</option>
            <option value="نیازمند اقدام">نیازمند اقدام</option>
            <option value="تکمیل شده">تکمیل شده</option>
          </select>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[760px] text-right border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                <th className="py-3 px-4">کد مرجع</th>
                <th className="py-3 px-4">عنوان و شرح مورد</th>
                <th className="py-3 px-3">دسته‌بندی</th>
                <th className="py-3 px-3">مسئول پیگیری</th>
                <th className="py-3 px-3">زمان‌بندی</th>
                <th className="py-3 px-3">اولویت</th>
                <th className="py-3 px-3">وضعیت</th>
                <th className="py-3 px-3">شاخص / ارجاع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3.5 px-4 font-label-code font-bold text-secondary whitespace-nowrap">
                    {row.code}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-primary">{row.title}</td>
                  <td className="py-3.5 px-3 text-on-surface-variant whitespace-nowrap">{row.category}</td>
                  <td className="py-3.5 px-3 text-on-surface whitespace-nowrap">{row.owner}</td>
                  <td className="py-3.5 px-3 font-label-code text-on-surface-variant whitespace-nowrap">
                    {row.dueDate}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        row.priority === 'فوری'
                          ? 'bg-red-50 text-critical-hse'
                          : row.priority === 'بالا'
                          ? 'bg-amber-50 text-warning-capa'
                          : 'bg-slate-100 text-on-surface-variant'
                      }`}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border ${
                        row.status === 'تایید شده' || row.status === 'تکمیل شده'
                          ? 'bg-emerald-50 text-tertiary border-emerald-200'
                          : row.status === 'نیازمند اقدام'
                          ? 'bg-red-50 text-critical-hse border-red-200'
                          : 'bg-sky-50 text-secondary border-sky-200'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-primary whitespace-nowrap">{row.metric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handleAddRecord}
            className="animate-modal-enter w-full max-w-md bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">{config.ctaLabel}</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1">عنوان رکورد</label>
                <input
                  type="text"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="شرح موضوع یا اقدام جدید را وارد کنید..."
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">دسته‌بندی</label>
                  <input
                    type="text"
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">اولویت</label>
                  <select
                    value={newForm.priority}
                    onChange={(e) => setNewForm({ ...newForm, priority: e.target.value as OperationalRow['priority'] })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low"
                  >
                    <option value="فوری">فوری</option>
                    <option value="بالا">بالا</option>
                    <option value="متوسط">متوسط</option>
                    <option value="عادی">عادی</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-primary mb-1">مسئول اجرا / پیگیری</label>
                <input
                  type="text"
                  value={newForm.owner}
                  onChange={(e) => setNewForm({ ...newForm, owner: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                />
              </div>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-border-hairline text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer">
                ثبت در سامانه
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
