import React, { useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  INITIAL_ACCESS_LEVELS,
  ORG_MANAGEMENTS,
  ORG_UNITS_BY_MANAGEMENT,
  RBAC_GROUPS,
  RBAC_PERMISSION_DEFS,
  ROLE_PERMISSION_PRESETS,
} from '../data/imsData';
import {
  AccessLevelDefinition,
  RbacLevel,
  RouteId,
  UserAccount,
  UserAccountStatus,
} from '../types/ims';

interface UserDetailPermissionsPageProps {
  users: UserAccount[];
  selectedUserId: string;
  accessLevels?: AccessLevelDefinition[];
  onSelectUser: (id: string) => void;
  onUpdateUser: (id: string, patch: Partial<UserAccount>, auditAction?: string) => void;
  onAssignUserAccessLevel?: (userId: string, levelId: string) => void;
  onDeleteUser: (id: string) => void;
  onNavigate: (route: RouteId) => void;
  onBackToDirectory?: () => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  embedded?: boolean;
}

const getUserEffectiveLevelId = (u: UserAccount, levels: AccessLevelDefinition[]): string => {
  if (u.accessLevelId && levels.some((l) => l.id === u.accessLevelId)) {
    return u.accessLevelId;
  }
  const byTier = levels.find((l) => l.code === u.securityLevel || l.baseTier === u.securityLevel);
  return byTier?.id || levels[0]?.id || 'lvl-c1';
};

export const UserDetailPermissionsPage: React.FC<UserDetailPermissionsPageProps> = ({
  users,
  selectedUserId,
  accessLevels = INITIAL_ACCESS_LEVELS,
  onSelectUser,
  onUpdateUser,
  onAssignUserAccessLevel,
  onDeleteUser,
  onNavigate,
  onBackToDirectory,
  onNotify,
  embedded = false,
}) => {
  const user = useMemo(
    () => users.find((u) => u.id === selectedUserId) || users[0],
    [users, selectedUserId]
  );

  const [draftPermissions, setDraftPermissions] = useState<string[]>(user?.permissions || []);
  const [innerTab, setInnerTab] = useState<'matrix' | 'audit'>('matrix');
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
          onClick={() => (onBackToDirectory ? onBackToDirectory() : onNavigate('users-list'))}
          className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
        >
          بازگشت به لیست کاربران
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
  const currentLevelId = getUserEffectiveLevelId(user, accessLevels);
  const currentLevelObj = accessLevels.find((l) => l.id === currentLevelId) || accessLevels[0];

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
    onNotify('الگوی پیش‌فرض نقش اعمال شد', `${preset.label} بارگذاری شد؛ برای ثبت نهایی دکمه ذخیره را بزنید.`, 'info');
  };

  const handleSavePermissions = () => {
    onUpdateUser(
      user.id,
      {
        permissions: draftPermissions,
        lastAccessReview: '۱۴۰۳/۰۸/۲۴ توسط مهران کاظمی',
      },
      `به‌روزرسانی دسترسی‌های ریز (${draftPermissions.length.toLocaleString('fa-IR')} از ${RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')} مجوز فعال)`
    );
    onNotify(
      'سطوح دسترسی ذخیره شد',
      `مجوزهای دقیق برای ${user.honorific} ${user.firstName} ${user.lastName} اعمال گردید.`,
      'success'
    );
  };

  const handleToggleLockAccount = () => {
    const nextStatus: UserAccountStatus = isSuspended ? 'فعال / برخط' : 'معلق / غیرفعال';
    onUpdateUser(
      user.id,
      { accountStatus: nextStatus },
      isSuspended ? 'رفع تعلیق و فعال‌سازی مجدد حساب کاربری' : 'قفل موقت حساب کاربری توسط ادمین سامانه'
    );
    onNotify(
      isSuspended ? 'حساب کاربری فعال شد' : 'حساب کاربری موقتاً قفل شد',
      `وضعیت حساب ${user.firstName} ${user.lastName} تغییر یافت.`,
      isSuspended ? 'success' : 'warning'
    );
  };

  const handleResetPassword = () => {
    onUpdateUser(
      user.id,
      { forcePasswordChange: true, securityBadge: 'تغییر رمز' },
      'بازنشانی گذرواژه و ابطال نشست‌های قبلی'
    );
    onNotify(
      'گذرواژه بازنشانی شد',
      `کد یک‌بارمصرف به شماره ${user.mobile} ارسال و تغییر رمز در ورود بعدی الزامی شد.`,
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
      'به‌روزرسانی اطلاعات هویتی و جایگاه سازمانی کاربر'
    );
    setShowEditModal(false);
    onNotify('اطلاعات کاربر ذخیره شد', 'مشخصات پروفایل با موفقیت به‌روزرسانی گردید.', 'success');
  };

  const handleGeneralTierChange = (levelId: string) => {
    if (onAssignUserAccessLevel) {
      onAssignUserAccessLevel(user.id, levelId);
      return;
    }
    const target = accessLevels.find((l) => l.id === levelId);
    if (!target) return;
    onUpdateUser(
      user.id,
      {
        accessLevelId: target.id,
        securityLevel: target.baseTier,
        lastAccessReview: '۱۴۰۳/۰۸/۲۴ توسط مهران کاظمی',
      },
      `تغییر سطح دسترسی کلی به «${target.code} - ${target.name}»`
    );
    onNotify('سطح دسترسی کلی تغییر یافت', `سطح «${target.code} · ${target.name}» برای کاربر ثبت شد.`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Top User Selector & Action Strip */}
      <div className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {!embedded && (
            <button
              type="button"
              onClick={() => (onBackToDirectory ? onBackToDirectory() : onNavigate('users-list'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-hairline hover:bg-surface-container-low text-xs font-bold text-primary cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px]">arrow_forward</span>
              لیست کاربران
            </button>
          )}
          <label className="text-xs font-bold text-on-surface-variant">انتخاب کاربر:</label>
          <select
            value={user.id}
            onChange={(e) => onSelectUser(e.target.value)}
            aria-label="انتخاب کاربر جهت تنظیم دسترسی"
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-bold text-primary focus:outline-none focus:border-secondary cursor-pointer min-w-[240px]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.honorific} {u.firstName} {u.lastName} ({u.personnelCode} · {u.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="px-3 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-primary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[16px] text-secondary">edit</span>
            ویرایش مشخصات
          </button>
          <button
            type="button"
            onClick={handleResetPassword}
            className="px-3 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-primary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[16px] text-warning-capa">vpn_key</span>
            بازنشانی رمز
          </button>
          <button
            type="button"
            onClick={handleToggleLockAccount}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              isSuspended
                ? 'bg-emerald-50 border-emerald-200 text-tertiary'
                : 'bg-amber-50 border-amber-200 text-warning-capa'
            }`}
          >
            <span className="material-symbols-outlined !text-[16px]">
              {isSuspended ? 'lock_open' : 'lock'}
            </span>
            {isSuspended ? 'رفع تعلیق' : 'قفل حساب'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-critical-hse text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[16px]">delete</span>
            حذف
          </button>
        </div>
      </div>

      {/* Compact User Qualification Summary */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-hairline">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-extrabold text-sm shrink-0">
              {user.firstName.charAt(0)}.{user.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-primary">
                  {user.honorific} {user.firstName} {user.lastName}
                </h2>
                <span className="font-label-code text-[11px] font-bold text-secondary">
                  {user.personnelCode} · {user.username}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    isSuspended
                      ? 'bg-red-50 text-critical-hse'
                      : 'bg-emerald-50 text-tertiary'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-critical-hse' : 'bg-tertiary'}`} />
                  {user.accountStatus}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                {user.roleTitle} — {user.management} / {user.unit}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <div className="text-center px-3 py-1.5 rounded-xl bg-surface-container-low border border-border-hairline">
              <div className="text-[10.5px] text-on-surface-variant">سطح دسترسی کلی</div>
              <div className="font-bold text-primary mt-0.5">
                {currentLevelObj?.code} · {currentLevelObj?.name}
              </div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-surface-container-low border border-border-hairline">
              <div className="text-[10.5px] text-on-surface-variant">مجوزهای ریز فعال</div>
              <div className="font-extrabold text-tertiary mt-0.5 tabular-nums">
                {draftPermissions.length.toLocaleString('fa-IR')} از {RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')}
              </div>
            </div>
          </div>
        </div>

        {/* Clean Single-Row Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="px-3.5 py-2.5 rounded-xl bg-surface-container-low/60">
            <span className="text-[11px] text-on-surface-variant block">تماس و داخلی</span>
            <span className="font-label-code font-bold text-primary mt-0.5 inline-block" dir="ltr">
              {user.mobile}
            </span>
            <span className="text-[11px] text-secondary font-semibold mr-2">داخلی {user.extension}</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-surface-container-low/60">
            <span className="text-[11px] text-on-surface-variant block">مدیر مستقیم / سرپرست</span>
            <span className="font-semibold text-primary mt-0.5 block truncate">{user.directManager}</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-surface-container-low/60">
            <span className="text-[11px] text-on-surface-variant block">احراز صلاحیت و PTW</span>
            <span className="font-semibold text-primary mt-0.5 block truncate">{user.ptwPrivilege}</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-surface-container-low/60">
            <span className="text-[11px] text-on-surface-variant block">امنیت و امضای دیجیتال</span>
            <span className="font-semibold text-primary mt-0.5 block truncate">
              {user.mfaEnabled ? 'MFA فعال · ' : 'بدون MFA · '}
              {user.digitalSignatureValidity}
            </span>
          </div>
        </div>
      </section>

      {/* Dual Access Level Control Bar (General + Granular) */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4 border-b border-border-hairline">
          {/* 1. General Access Tier */}
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-border-hairline space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[18px] text-secondary">shield_lock</span>
                سطح دسترسی کلی (عمومی، داخلی، محرمانه و...)
              </label>
              <span className="text-[10.5px] text-on-surface-variant">تعیین محرمانگی اسناد قابل مشاهده</span>
            </div>
            <select
              value={currentLevelId}
              onChange={(e) => handleGeneralTierChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-white text-xs font-bold text-primary focus:outline-none focus:border-secondary cursor-pointer"
            >
              {accessLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.code} — {lvl.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Role Preset & Quick Matrix Controls */}
          <div className="p-4 rounded-xl bg-surface-container-low/60 border border-border-hairline space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[18px] text-tertiary">tune</span>
                الگوی نقش و کنترل سریع دسترسی‌های ریز
              </span>
              <span className="font-label-code text-[11px] font-bold text-secondary">{user.rbacLevel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleApplyRoleDefault}
                className="px-3 py-2 rounded-xl border border-secondary/30 bg-white hover:bg-secondary-container/40 text-xs font-bold text-secondary cursor-pointer"
              >
                اعمال پیش‌فرض نقش
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container text-xs font-bold text-primary cursor-pointer"
              >
                انتخاب همه
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                لغو همه
              </button>
            </div>
          </div>
        </div>

        {/* Clean Inner Sub-Tabs: Granular Matrix vs Audit Log */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-surface-container-low border border-border-hairline">
            <button
              type="button"
              onClick={() => setInnerTab('matrix')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                innerTab === 'matrix' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              تعیین جزئی و ریز به ریز دسترسی‌ها ({draftPermissions.length.toLocaleString('fa-IR')})
            </button>
            <button
              type="button"
              onClick={() => setInnerTab('audit')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                innerTab === 'audit' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              تاریخچه تغییرات و ممیزی امنیتی ({user.auditLogs.length.toLocaleString('fa-IR')})
            </button>
          </div>

          {innerTab === 'matrix' && isDirty && (
            <span className="text-[11px] font-bold text-warning-capa">
              تغییرات ذخیره‌نشده دارید
            </span>
          )}
        </div>

        {innerTab === 'matrix' ? (
          <div className="space-y-4">
            {RBAC_GROUPS.map((group) => {
              const perms = RBAC_PERMISSION_DEFS.filter((p) => p.groupId === group.id);
              const activeInGroup = perms.filter((p) => draftPermissions.includes(p.id)).length;

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-border-hairline bg-surface-container-low/30 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined !text-[19px] text-primary">{group.icon}</span>
                      <div>
                        <h3 className="text-xs font-extrabold text-primary">{group.title}</h3>
                        <p className="text-[11px] text-on-surface-variant">{group.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-primary tabular-nums">
                      {activeInGroup.toLocaleString('fa-IR')} / {perms.length.toLocaleString('fa-IR')} فعال
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {perms.map((perm) => {
                      const checked = draftPermissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer select-none ${
                            checked
                              ? 'bg-white border-primary/50 ring-1 ring-primary/10'
                              : 'bg-white/60 border-border-hairline hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(perm.id)}
                            className="mt-0.5 w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-bold text-primary leading-5">{perm.title}</span>
                              {perm.tag && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container-low text-on-surface-variant shrink-0">
                                  {perm.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-4">{perm.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Save Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border-hairline">
              <span className="text-xs text-on-surface-variant">
                تغییرات پس از ذخیره بلافاصله در حساب کاربری <strong className="text-primary">{user.firstName} {user.lastName}</strong> اعمال می‌شوند.
              </span>
              <div className="flex items-center gap-2">
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => setDraftPermissions(user.permissions)}
                    className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-bold text-on-surface-variant cursor-pointer"
                  >
                    بازگردانی
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="px-5 py-2.5 rounded-xl bg-tertiary hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined !text-[17px]">save</span>
                  ذخیره تغییرات دسترسی
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border-hairline rounded-xl">
            <table className="w-full min-w-[680px] text-right border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                  <th className="py-3 px-4">تاریخ و ساعت</th>
                  <th className="py-3 px-4">رویداد ثبت‌شده</th>
                  <th className="py-3 px-4">اقدام‌کننده</th>
                  <th className="py-3 px-4">نشانی شبکه</th>
                  <th className="py-3 px-4 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {user.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low/40">
                    <td className="py-3 px-4 font-label-code text-[11px] text-on-surface-variant whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-bold text-primary">{log.action}</td>
                    <td className="py-3 px-4 font-semibold text-secondary">{log.actor}</td>
                    <td className="py-3 px-4 font-label-code text-[11px] text-on-surface-variant" dir="ltr">
                      {log.ipOrSource}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-md bg-surface-container-low text-[11px] font-bold text-primary">
                        {log.statusText}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                  <label className="block font-bold text-primary mb-1">سطح نقش RBAC</label>
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
          onNotify('حساب کاربری حذف شد', `${user.firstName} ${user.lastName} از سامانه حذف گردید.`, 'warning');
          if (onBackToDirectory) {
            onBackToDirectory();
          } else {
            onNavigate('users-list');
          }
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
