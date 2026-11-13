import React, { useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  ORG_MANAGEMENTS,
  ORG_UNITS_BY_MANAGEMENT,
  RBAC_GROUPS,
  RBAC_PERMISSION_DEFS,
  ROLE_PERMISSION_PRESETS,
} from '../data/imsData';
import { RbacLevel, RouteId, UserAccount, UserAccountStatus } from '../types/ims';

interface UserDetailPermissionsPageProps {
  users: UserAccount[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  onUpdateUser: (id: string, patch: Partial<UserAccount>, auditAction?: string) => void;
  onDeleteUser: (id: string) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const TAG_TONE_CLASSES: Record<string, string> = {
  primary: 'bg-primary text-white',
  tertiary: 'bg-emerald-50 text-tertiary border border-emerald-200',
  warning: 'bg-amber-50 text-warning-capa border border-amber-200',
  secondary: 'bg-sky-50 text-secondary border border-sky-200',
  critical: 'bg-red-50 text-critical-hse border border-red-200',
};

export const UserDetailPermissionsPage: React.FC<UserDetailPermissionsPageProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  onUpdateUser,
  onDeleteUser,
  onNavigate,
  onNotify,
}) => {
  const user = useMemo(
    () => users.find((u) => u.id === selectedUserId) || users[1] || users[0],
    [users, selectedUserId]
  );

  const [draftPermissions, setDraftPermissions] = useState<string[]>(user?.permissions || []);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    personnelCode: user?.personnelCode || '',
    mobile: user?.mobile || '',
    extension: user?.extension || '',
    management: user?.management || ORG_MANAGEMENTS[0],
    unit: user?.unit || '',
    roleTitle: user?.roleTitle || '',
    directManager: user?.directManager || '',
    directSupervisor: user?.directSupervisor || '',
    rbacLevel: (user?.rbacLevel || 'L4 - Supervisor') as RbacLevel,
    ptwPrivilege: user?.ptwPrivilege || '',
  });

  useEffect(() => {
    if (user) {
      setDraftPermissions(user.permissions);
      setEditForm({
        firstName: user.firstName,
        lastName: user.lastName,
        personnelCode: user.personnelCode,
        mobile: user.mobile,
        extension: user.extension,
        management: user.management,
        unit: user.unit,
        roleTitle: user.roleTitle,
        directManager: user.directManager,
        directSupervisor: user.directSupervisor,
        rbacLevel: user.rbacLevel,
        ptwPrivilege: user.ptwPrivilege,
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-border-hairline p-10 text-center space-y-3">
        <p className="text-sm font-bold text-primary">کاربری برای نمایش یافت نشد.</p>
        <button
          type="button"
          onClick={() => onNavigate('users-list')}
          className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
        >
          بازگشت به فهرست کاربران
        </button>
      </div>
    );
  }

  const isDirty = useMemo(() => {
    if (draftPermissions.length !== user.permissions.length) return true;
    const set = new Set(user.permissions);
    return draftPermissions.some((p) => !set.has(p));
  }, [draftPermissions, user.permissions]);

  const isSuspended = user.accountStatus === 'معلق / غیرفعال';

  const togglePermission = (permId: string) => {
    setDraftPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSelectAll = () => {
    setDraftPermissions(RBAC_PERMISSION_DEFS.map((p) => p.id));
  };

  const handleClearAll = () => {
    setDraftPermissions([]);
  };

  const handleApplyRoleDefault = () => {
    const presetKey =
      user.rbacLevel.startsWith('L5')
        ? 'admin'
        : user.rbacLevel.startsWith('L4')
        ? 'supervisor'
        : user.rbacLevel.startsWith('L3')
        ? 'auditor'
        : user.rbacLevel.startsWith('L2')
        ? 'specialist'
        : 'operator';
    const preset = ROLE_PERMISSION_PRESETS[presetKey];
    setDraftPermissions(preset.permissions);
    onNotify('الگوی پیش‌فرض سمت اعمال شد', `${preset.label} بارگذاری گردید؛ برای ثبت نهایی دکمه ذخیره را بزنید.`, 'info');
  };

  const handleSavePermissions = () => {
    onUpdateUser(
      user.id,
      {
        permissions: draftPermissions,
        lastAccessReview: '۱۴۰۳/۰۸/۲۴ توسط مهران کاظمی',
      },
      `به‌روزرسانی ماتریس سطوح دسترسی RBAC (${draftPermissions.length.toLocaleString('fa-IR')} از ${RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')} مجوز فعال)`
    );
    onNotify(
      'سطوح دسترسی با موفقیت ذخیره شد',
      `تغییرات ماتریس RBAC برای ${user.honorific} ${user.firstName} ${user.lastName} به‌صورت بلادرنگ اعمال گردید.`,
      'success'
    );
  };

  const handleToggleLockAccount = () => {
    const nextStatus: UserAccountStatus = isSuspended ? 'فعال / دارای توکن امنیتی C3' : 'معلق / غیرفعال';
    onUpdateUser(
      user.id,
      { accountStatus: nextStatus },
      isSuspended ? 'رفع قفل موقت و بازگشایی حساب کاربری' : 'قفل موقت حساب کاربری توسط راهبر امنیت IMS'
    );
    onNotify(
      isSuspended ? 'حساب کاربری بازگشایی شد' : 'حساب کاربری موقتاً قفل شد',
      `وضعیت حساب ${user.firstName} ${user.lastName} تغییر یافت.`,
      isSuspended ? 'success' : 'warning'
    );
  };

  const handleResetPassword = () => {
    onUpdateUser(
      user.id,
      { forcePasswordChange: true, securityBadge: 'OTP بازنشانی' },
      'بازنشانی گذرواژه و ابطال نشست‌های قبلی مطابق NIST 800-63B'
    );
    onNotify(
      'گذرواژه کاربر بازنشانی شد',
      `لینک و کد OTP یک‌بارمصرف به شماره ${user.mobile} ارسال و در لاگ امنیتی ثبت گردید.`,
      'info'
    );
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(
      user.id,
      {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        personnelCode: editForm.personnelCode.trim().toUpperCase(),
        mobile: editForm.mobile.trim(),
        extension: editForm.extension.trim(),
        management: editForm.management,
        unit: editForm.unit,
        roleTitle: editForm.roleTitle.trim(),
        directManager: editForm.directManager.trim(),
        directSupervisor: editForm.directSupervisor.trim(),
        rbacLevel: editForm.rbacLevel,
        ptwPrivilege: editForm.ptwPrivilege.trim(),
      },
      'به‌روزرسانی اطلاعات هویتی و زنجیره گزارش‌دهی کاربر'
    );
    setShowEditModal(false);
    onNotify('اطلاعات کاربر ذخیره شد', 'مشخصات پروفایل با موفقیت به‌روزرسانی گردید.', 'success');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb & Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('users-list')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-border-hairline hover:bg-surface-container-low text-xs font-bold text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">arrow_forward</span>
            بازگشت به فهرست کاربران و تنظیمات
          </button>
          <span className="text-outline">/</span>
          <span className="font-label-code text-xs font-bold text-secondary">UID: {user.personnelCode}</span>
          <select
            value={user.id}
            onChange={(e) => onSelectUser(e.target.value)}
            aria-label="تعویض سریع کاربر"
            className="mr-2 px-3 py-1.5 rounded-xl bg-white border border-border-hairline text-xs font-bold text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.honorific} {u.firstName} {u.lastName} ({u.personnelCode})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleLockAccount}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSuspended
                ? 'bg-emerald-50 border-emerald-200 text-tertiary hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-warning-capa hover:bg-amber-100'
            }`}
          >
            <span className="material-symbols-outlined !text-[17px]">
              {isSuspended ? 'lock_open' : 'lock'}
            </span>
            {isSuspended ? 'فعال‌سازی مجدد حساب' : 'قفل موقت حساب'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-critical-hse text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">delete</span>
            حذف کاربر
          </button>

          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px] text-secondary">edit_note</span>
            ویرایش اطلاعات
          </button>

          <button
            type="button"
            onClick={handleSavePermissions}
            className="px-5 py-2 rounded-xl bg-tertiary hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">save</span>
            ذخیره سطوح دسترسی
          </button>
        </div>
      </div>

      {/* Primary User Identity Card */}
      <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border-hairline">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined !text-[32px]">badge</span>
              <span className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-tertiary text-white border-2 border-white flex items-center justify-center">
                <span className="material-symbols-outlined !text-[13px]">verified_user</span>
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-primary">
                  {user.honorific} {user.firstName} {user.lastName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isSuspended
                      ? 'bg-red-50 text-critical-hse border-red-200'
                      : 'bg-emerald-50 text-tertiary border-emerald-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-critical-hse' : 'bg-tertiary'}`} />
                  {user.accountStatus}
                </span>
                <span className="font-label-code px-2.5 py-1 rounded-full bg-secondary-container/70 text-primary text-[11px] font-bold">
                  ID: {user.username}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {user.roleTitle} • {user.management} • {user.siteLocation}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline text-center">
              <div className="text-[10.5px] text-on-surface-variant">مجوزهای فعال</div>
              <div className="text-sm font-extrabold text-primary mt-0.5 tabular-nums">
                {draftPermissions.length.toLocaleString('fa-IR')} از{' '}
                {RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')}
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline text-center">
              <div className="text-[10.5px] text-on-surface-variant">سطح امنیتی RBAC</div>
              <div className="font-label-code text-sm font-extrabold text-secondary mt-0.5">{user.rbacLevel}</div>
            </div>
          </div>
        </div>

        {/* 8 Data Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">نام و نام خانوادگی</div>
            <div className="text-xs sm:text-[13px] font-extrabold text-primary mt-1">
              {user.firstName} {user.lastName}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">شماره پرسنلی پتروشیمی</div>
            <div className="font-label-code text-xs sm:text-[13px] font-extrabold text-primary mt-1">
              {user.personnelCode}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">شماره تماس همراه و داخلی</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-label-code text-xs sm:text-[13px] font-bold text-primary" dir="ltr">
                {user.mobile}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-secondary-container/70 text-[10.5px] font-bold text-secondary tabular-nums">
                داخلی {user.extension}
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">نام کاربری سامانه</div>
            <div className="font-label-code text-xs sm:text-[13px] font-extrabold text-secondary mt-1">
              {user.username}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">حوزه مدیریت کلان</div>
            <div className="text-xs sm:text-[13px] font-bold text-primary mt-1">{user.management}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">واحد فرآیندی مستقر</div>
            <div className="text-xs sm:text-[13px] font-bold text-primary mt-1">{user.unit}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">مدیر مستقیم (سطح ۱)</div>
            <div className="text-xs font-bold text-primary mt-1">{user.directManager}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-hairline">
            <div className="text-[11px] text-on-surface-variant">سرپرست مستقیم شیفت</div>
            <div className="text-xs font-bold text-primary mt-1">{user.directSupervisor}</div>
          </div>
        </div>

        {/* MFA & Password Security Banner */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined !text-[20px]">shield_lock</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-primary">
                  وضعیت گذرواژه و احراز هویت دو مرحله‌ای (MFA)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                    user.mfaEnabled && !user.forcePasswordChange
                      ? 'bg-emerald-100 text-tertiary'
                      : 'bg-amber-100 text-warning-capa'
                  }`}
                >
                  {user.mfaEnabled && !user.forcePasswordChange ? 'انطباق کامل' : 'نیازمند اقدام کاربر'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                آخرین تغییر رمز: ۳۰ روز پیش • رمز قوی مطابق الزام NIST 800-63B • {user.hardwareTokenType}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            className="px-4 py-2 rounded-xl bg-white border border-border-hairline hover:bg-surface-container text-primary text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px] text-secondary">vpn_key</span>
            بازنشانی رمز عبور
          </button>
        </div>
      </section>

      {/* 3 Operational Context Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex items-center gap-3.5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)]">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[22px]">engineering</span>
          </div>
          <div>
            <div className="text-[11px] text-on-surface-variant">مجوز پروانه کار (PTW)</div>
            <div className="text-xs sm:text-[13px] font-extrabold text-primary mt-0.5">{user.ptwPrivilege}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex items-center gap-3.5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)]">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-tertiary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[22px]">verified</span>
          </div>
          <div>
            <div className="text-[11px] text-on-surface-variant">اعتبار امضای دیجیتال IMS</div>
            <div className="text-xs sm:text-[13px] font-extrabold text-primary mt-0.5">
              {user.digitalSignatureValidity}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-4 flex items-center gap-3.5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)]">
          <div className="w-11 h-11 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[22px]">event_available</span>
          </div>
          <div>
            <div className="text-[11px] text-on-surface-variant">آخرین بازنگری دسترسی‌ها</div>
            <div className="text-xs sm:text-[13px] font-extrabold text-primary mt-0.5">{user.lastAccessReview}</div>
          </div>
        </div>
      </section>

      {/* 16-Checkbox RBAC Permissions Matrix */}
      <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined !text-[22px]">admin_panel_settings</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-primary">
                ماتریس مجوزها و سطوح دسترسی به بخش‌ها و فرآیندهای سازمان (RBAC Permissions)
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                کنار هر بخش چک‌باکس فعال/غیرفعال قرار دارد تا بتوانید دسترسی کاربر به فرآیندها، استانداردها و ماژول‌های پتروشیمی آپادانا را اعطا یا سلب نمایید.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg border border-border-hairline bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px] text-tertiary">done_all</span>
              انتخاب همه
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-lg border border-border-hairline bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface-variant flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px]">remove_done</span>
              لغو همه
            </button>
            <button
              type="button"
              onClick={handleApplyRoleDefault}
              className="px-3 py-1.5 rounded-lg border border-secondary/30 bg-secondary-container/40 hover:bg-secondary-container text-xs font-bold text-secondary flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px]">auto_fix_high</span>
              پیش‌فرض سمت سازمانی
            </button>
          </div>
        </div>

        {/* Render Groups A, B, C */}
        <div className="space-y-5">
          {RBAC_GROUPS.map((group) => {
            const perms = RBAC_PERMISSION_DEFS.filter((p) => p.groupId === group.id);
            const activeInGroup = perms.filter((p) => draftPermissions.includes(p.id)).length;

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-border-hairline bg-surface-container-low/35 p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        group.tone === 'tertiary'
                          ? 'bg-emerald-50 text-tertiary'
                          : group.tone === 'secondary'
                          ? 'bg-sky-50 text-secondary'
                          : 'bg-white border border-border-hairline text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined !text-[20px]">{group.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-primary">{group.title}</h3>
                      <p className="text-[11px] text-on-surface-variant">{group.subtitle}</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-white border border-border-hairline text-[11px] font-bold text-primary tabular-nums">
                    {activeInGroup.toLocaleString('fa-IR')} از {perms.length.toLocaleString('fa-IR')} دسترسی فعال
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {perms.map((perm) => {
                    const checked = draftPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                          checked
                            ? 'bg-white border-primary/45 shadow-xs ring-1 ring-primary/10'
                            : 'bg-white/70 border-border-hairline hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-0.5 w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-extrabold text-primary leading-5">{perm.title}</span>
                            {perm.tag && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                  TAG_TONE_CLASSES[perm.tagTone || 'primary']
                                }`}
                              >
                                {perm.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-on-surface-variant mt-1 leading-4">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security Audit Log & Signature Verification */}
      <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary !text-[20px]">history</span>
            <h2 className="text-sm sm:text-base font-extrabold text-primary">
              ثبت لاگ تغییرات دسترسی‌ها و امضای آخرین بازنگری‌کننده (Security Audit Log)
            </h2>
          </div>
          <span className="font-label-code text-[11px] font-semibold text-on-surface-variant">
            SHA-256 Digest: 9e8a...3fc1
          </span>
        </div>

        <div className="overflow-x-auto border border-border-hairline rounded-xl">
          <table className="w-full min-w-[760px] text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[11px] font-extrabold text-primary border-b border-border-hairline">
                <th className="py-3 px-4">تاریخ و ساعت</th>
                <th className="py-3 px-4">عملیات ثبت‌شده</th>
                <th className="py-3 px-4">اقدام‌کننده</th>
                <th className="py-3 px-4">آدرس شبکه / شناسه</th>
                <th className="py-3 px-4 text-center">وضعیت تایید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline text-xs">
              {user.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5 px-4 font-label-code text-[11.5px] text-on-surface-variant whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-primary">{log.action}</td>
                  <td className="py-3.5 px-4 font-bold text-secondary">{log.actor}</td>
                  <td className="py-3.5 px-4 font-label-code text-[11.5px] text-on-surface-variant" dir="ltr">
                    {log.ipOrSource}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${
                        log.statusTone === 'tertiary'
                          ? 'bg-emerald-50 text-tertiary border border-emerald-200'
                          : log.statusTone === 'secondary'
                          ? 'bg-sky-50 text-secondary border border-sky-200'
                          : log.statusTone === 'warning'
                          ? 'bg-amber-50 text-warning-capa border border-amber-200'
                          : 'bg-surface-container-low text-on-surface-variant border border-border-hairline'
                      }`}
                    >
                      {log.statusText}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2 Signature Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-border-hairline flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined !text-[20px]">verified</span>
              </div>
              <div>
                <div className="text-xs font-extrabold text-primary">مهندس مهران کاظمی</div>
                <div className="text-[11px] text-on-surface-variant">مدیر تضمین کیفیت و نماینده مدیریت IMS</div>
              </div>
            </div>
            <span className="font-label-code px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-tertiary text-[11px] font-bold">
              امضا شده [TOKEN_OK]
            </span>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-border-hairline flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined !text-[20px]">draw</span>
              </div>
              <div>
                <div className="text-xs font-extrabold text-primary">مهندس حمید دهداری</div>
                <div className="text-[11px] text-on-surface-variant">معاونت فنی و عملیاتی مجتمع آپادانا</div>
              </div>
            </div>
            <span className="font-label-code px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-tertiary text-[11px] font-bold">
              امضا شده [TOKEN_OK]
            </span>
          </div>
        </div>
      </section>

      {/* Sticky Bottom Save Panel */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-border-hairline shadow-[0px_14px_34px_-10px_rgba(20,44,67,0.2)] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-tertiary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[20px]">verified_user</span>
          </div>
          <div>
            <div className="text-xs font-extrabold text-primary">
              {isDirty ? 'تغییرات جدید آماده ثبت و همگام‌سازی است' : 'آماده اعمال تغییرات سطح دسترسی'}
            </div>
            <div className="text-[11px] text-on-surface-variant">
              تغییرات بلافاصله پس از ذخیره در نشست فعال کاربر در {user.unit} اعمال خواهد شد.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => {
              setDraftPermissions(user.permissions);
              onNotify('تغییرات لغو شد', 'ماتریس به آخرین وضعیت ذخیره‌شده بازگردانده شد.', 'info');
            }}
            className="px-4 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-on-surface-variant cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSavePermissions}
            className="px-5 py-2.5 rounded-xl bg-tertiary hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[18px]">check_circle</span>
            ذخیره و اعمال بلادرنگ دسترسی‌ها
          </button>
        </div>
      </div>

      {/* Inline Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <form
            onSubmit={handleEditSave}
            className="animate-modal-enter w-full max-w-xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 bg-surface-container-low border-b border-border-hairline flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-primary">ویرایش مشخصات هویتی و سازمانی</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">نام</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">نام خانوادگی</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">کد پرسنلی</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={editForm.personnelCode}
                    onChange={(e) => setEditForm({ ...editForm, personnelCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">حوزه مدیریت</label>
                  <select
                    value={editForm.management}
                    onChange={(e) => {
                      const mgmt = e.target.value;
                      const units = ORG_UNITS_BY_MANAGEMENT[mgmt] || ['واحد ستادی'];
                      setEditForm({ ...editForm, management: mgmt, unit: units[0] });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  >
                    {ORG_MANAGEMENTS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">واحد فرآیندی</label>
                  <select
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  >
                    {(ORG_UNITS_BY_MANAGEMENT[editForm.management] || [editForm.unit]).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">سمت سازمانی</label>
                  <input
                    type="text"
                    value={editForm.roleTitle}
                    onChange={(e) => setEditForm({ ...editForm, roleTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">سطح امنیتی RBAC</label>
                  <select
                    value={editForm.rbacLevel}
                    onChange={(e) => setEditForm({ ...editForm, rbacLevel: e.target.value as RbacLevel })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  >
                    <option value="L5 - Admin">L5 - Admin</option>
                    <option value="L4 - Supervisor">L4 - Supervisor</option>
                    <option value="L3 - Lead Auditor">L3 - Lead Auditor</option>
                    <option value="L2 - Specialist">L2 - Specialist</option>
                    <option value="L1 - Operator">L1 - Operator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">شماره همراه</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">داخلی</label>
                  <input
                    type="text"
                    value={editForm.extension}
                    onChange={(e) => setEditForm({ ...editForm, extension: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1">مجوز پروانه کار (PTW)</label>
                <input
                  type="text"
                  value={editForm.ptwPrivilege}
                  onChange={(e) => setEditForm({ ...editForm, ptwPrivilege: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-border-hairline flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                ذخیره اطلاعات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={confirmDeleteOpen}
        tone="danger"
        title={`حذف حساب کاربری ${user.firstName} ${user.lastName}`}
        description={`آیا از حذف کامل حساب کاربری «${user.username}» (${user.personnelCode}) اطمینان دارید؟ این عملیات امضای دیجیتال و تمام مجوزهای فعال کاربر را باطل می‌کند.`}
        confirmLabel="حذف دائمی کاربر"
        cancelLabel="انصراف"
        onConfirm={() => {
          onDeleteUser(user.id);
          setConfirmDeleteOpen(false);
          onNotify('حساب کاربری حذف شد', `کاربر ${user.firstName} ${user.lastName} از سیستم حذف گردید.`, 'warning');
          onNavigate('users-list');
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
