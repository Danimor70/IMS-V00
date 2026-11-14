import React, { useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  exportToExcel,
  ORG_MANAGEMENTS,
  ORG_UNITS_BY_MANAGEMENT,
  RBAC_GROUPS,
  RBAC_PERMISSION_DEFS,
  ROLE_PERMISSION_PRESETS,
} from '../data/imsData';
import {
  AccessLevelDefinition,
  OrgAccessAssignment,
  RbacLevel,
  RouteId,
  UserAccount,
  UserAccountStatus,
} from '../types/ims';
import { AccessLevelsPage } from './AccessLevelsPage';
import { UserDetailPermissionsPage } from './UserDetailPermissionsPage';

export type AdminWorkspaceTab = 'directory' | 'general-levels' | 'granular-matrix';

interface UsersManagementPageProps {
  users: UserAccount[];
  accessLevels: AccessLevelDefinition[];
  orgAssignments: OrgAccessAssignment[];
  selectedUserId: string;
  isAdmin: boolean;
  initialTab?: AdminWorkspaceTab;
  openCreateSignal?: number;
  onSelectUser: (id: string) => void;
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (id: string, patch: Partial<UserAccount>, auditAction?: string) => void;
  onDeleteUser: (id: string) => void;
  onSaveAccessLevel: (level: AccessLevelDefinition, isNew: boolean) => void;
  onAssignUsersLevel: (userIds: string[], levelId: string) => void;
  onAssignOrgEntityLevel: (assignmentId: string, levelId: string) => void;
  onAddOrgEntity: (entity: OrgAccessAssignment) => void;
  onCascadeOrgLevelToUsers: (entityType: 'management' | 'unit', entityName: string, levelId: string) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const getUserEffectiveLevelId = (u: UserAccount, levels: AccessLevelDefinition[]): string => {
  if (u.accessLevelId && levels.some((l) => l.id === u.accessLevelId)) {
    return u.accessLevelId;
  }
  const byTier = levels.find((l) => l.code === u.securityLevel || l.baseTier === u.securityLevel);
  return byTier?.id || levels[0]?.id || 'lvl-c1';
};

const STATUS_STYLE_MAP: Record<
  UserAccountStatus,
  { dot: string; text: string; bg: string; label: string }
> = {
  'فعال / برخط': { dot: 'bg-tertiary', text: 'text-tertiary', bg: 'bg-emerald-50', label: 'فعال / برخط' },
  فعال: { dot: 'bg-tertiary', text: 'text-tertiary', bg: 'bg-emerald-50', label: 'فعال' },
  'فعال / سطح کلان': { dot: 'bg-secondary', text: 'text-secondary', bg: 'bg-sky-50', label: 'فعال / کلان' },
  'فعال / دارای توکن امنیتی C3': {
    dot: 'bg-tertiary',
    text: 'text-tertiary',
    bg: 'bg-emerald-50',
    label: 'فعال / توکن C3',
  },
  'انقضای رمز / موقت': {
    dot: 'bg-warning-capa',
    text: 'text-warning-capa',
    bg: 'bg-amber-50',
    label: 'نیازمند تغییر رمز',
  },
  'معلق / غیرفعال': {
    dot: 'bg-critical-hse',
    text: 'text-critical-hse',
    bg: 'bg-red-50',
    label: 'معلق / غیرفعال',
  },
};

interface UserFormState {
  honorific: string;
  firstName: string;
  lastName: string;
  personnelCode: string;
  mobile: string;
  extension: string;
  management: string;
  unit: string;
  roleTitle: string;
  directManager: string;
  directSupervisor: string;
  username: string;
  password: string;
  accessLevelId: string;
  rbacLevel: RbacLevel;
  accountStatus: UserAccountStatus;
  mfaEnabled: boolean;
  forcePasswordChange: boolean;
  ptwPrivilege: string;
  permissions: string[];
}

const buildEmptyForm = (levels: AccessLevelDefinition[]): UserFormState => ({
  honorific: 'مهندس',
  firstName: '',
  lastName: '',
  personnelCode: `AP-${Math.floor(8100 + Math.random() * 1800)}`,
  mobile: '0917-',
  extension: '۲۴۱۰',
  management: ORG_MANAGEMENTS[0],
  unit: ORG_UNITS_BY_MANAGEMENT[ORG_MANAGEMENTS[0]][0],
  roleTitle: '',
  directManager: 'مهندس مهران کاظمی',
  directSupervisor: 'مهندس علی رضوانی',
  username: '',
  password: 'Apadana@1403!',
  accessLevelId: levels[1]?.id || levels[0]?.id || 'lvl-c2',
  rbacLevel: 'L2 - Specialist',
  accountStatus: 'فعال / برخط',
  mfaEnabled: true,
  forcePasswordChange: true,
  ptwPrivilege: 'مشاهده‌گر پروانه‌های کار واحد',
  permissions: ROLE_PERMISSION_PRESETS.specialist.permissions,
});

export const UsersManagementPage: React.FC<UsersManagementPageProps> = ({
  users,
  accessLevels,
  orgAssignments,
  selectedUserId,
  isAdmin,
  initialTab = 'directory',
  openCreateSignal = 0,
  onSelectUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSaveAccessLevel,
  onAssignUsersLevel,
  onAssignOrgEntityLevel,
  onAddOrgEntity,
  onCascadeOrgLevelToUsers,
  onNavigate,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminWorkspaceTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterManagement, setFilterManagement] = useState('all');
  const [filterAccessLevel, setFilterAccessLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [formModalMode, setFormModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(() => buildEmptyForm(accessLevels));
  const [showGranularInCreate, setShowGranularInCreate] = useState(false);

  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setFormModalMode('create');
      setEditingUserId(null);
      setUserForm(buildEmptyForm(accessLevels));
      setShowGranularInCreate(false);
    }
  }, [openCreateSignal, accessLevels]);

  // Admin-Only Guard
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-border-hairline p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-critical-hse flex items-center justify-center">
            <span className="material-symbols-outlined !text-[30px]">gpp_maybe</span>
          </div>
          <h1 className="text-base font-extrabold text-primary">
            دسترسی محدود به ادمین سامانه
          </h1>
          <p className="text-xs text-on-surface-variant leading-6">
            بخش مدیریت کاربران، احراز صلاحیت و تنظیمات سطوح دسترسی منحصراً در اختیار راهبر ارشد سامانه (L5 - Admin) است.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold cursor-pointer"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.personnelCode.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.roleTitle.toLowerCase().includes(q) ||
        u.unit.toLowerCase().includes(q);
      const matchesMgmt = filterManagement === 'all' || u.management === filterManagement;
      const effLvlId = getUserEffectiveLevelId(u, accessLevels);
      const matchesLevel = filterAccessLevel === 'all' || effLvlId === filterAccessLevel;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active'
          ? u.accountStatus.startsWith('فعال')
          : filterStatus === 'temp'
          ? u.accountStatus === 'انقضای رمز / موقت' || u.forcePasswordChange
          : u.accountStatus === 'معلق / غیرفعال');
      return matchesQuery && matchesMgmt && matchesLevel && matchesStatus;
    });
  }, [users, searchQuery, filterManagement, filterAccessLevel, filterStatus, accessLevels]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  // Real metrics derived strictly from users
  const stats = useMemo(() => {
    const active = users.filter((u) => u.accountStatus.startsWith('فعال')).length;
    const mfa = users.filter((u) => u.mfaEnabled).length;
    const attention = users.filter(
      (u) => u.accountStatus === 'انقضای رمز / موقت' || u.accountStatus === 'معلق / غیرفعال' || u.forcePasswordChange
    ).length;
    return { total: users.length, active, mfa, attention };
  }, [users]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterManagement !== 'all' ||
    filterAccessLevel !== 'all' ||
    filterStatus !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterManagement('all');
    setFilterAccessLevel('all');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    exportToExcel(
      'Apadana-IMS-Users.xls',
      'فهرست کاربران',
      [
        'ردیف',
        'وضعیت حساب',
        'نام و نام خانوادگی',
        'شماره پرسنلی',
        'نام کاربری',
        'تلفن همراه',
        'داخلی',
        'مدیریت سازمانی',
        'واحد عملیاتی',
        'سمت سازمانی',
        'مدیر مستقیم',
        'سطح دسترسی کلی',
        'تعداد دسترسی‌های ریز',
        'نقش RBAC',
        'احراز هویت دو مرحله‌ای (MFA)',
      ],
      filteredUsers.map((u, idx) => {
        const effId = getUserEffectiveLevelId(u, accessLevels);
        const lvl = accessLevels.find((l) => l.id === effId);
        return [
          idx + 1,
          u.accountStatus,
          `${u.honorific} ${u.firstName} ${u.lastName}`,
          u.personnelCode,
          u.username,
          u.mobile,
          u.extension,
          u.management,
          u.unit,
          u.roleTitle,
          u.directManager,
          lvl ? `${lvl.code} - ${lvl.name}` : u.securityLevel,
          `${u.permissions.length} از ${RBAC_PERMISSION_DEFS.length}`,
          u.rbacLevel,
          u.mfaEnabled ? 'فعال' : 'غیرفعال',
        ];
      })
    );
    onNotify(
      'فایل اکسل کاربران آماده شد',
      `${filteredUsers.length.toLocaleString('fa-IR')} کاربر با فرمت اکسل استاندارد دانلود گردید.`,
      'success'
    );
  };

  const openCreateModal = () => {
    setFormModalMode('create');
    setEditingUserId(null);
    setUserForm(buildEmptyForm(accessLevels));
    setShowGranularInCreate(false);
  };

  const openEditModal = (u: UserAccount) => {
    setFormModalMode('edit');
    setEditingUserId(u.id);
    setUserForm({
      honorific: u.honorific,
      firstName: u.firstName,
      lastName: u.lastName,
      personnelCode: u.personnelCode,
      mobile: u.mobile,
      extension: u.extension,
      management: u.management,
      unit: u.unit,
      roleTitle: u.roleTitle,
      directManager: u.directManager,
      directSupervisor: u.directSupervisor,
      username: u.username,
      password: 'Apadana@1403!',
      accessLevelId: getUserEffectiveLevelId(u, accessLevels),
      rbacLevel: u.rbacLevel,
      accountStatus: u.accountStatus,
      mfaEnabled: u.mfaEnabled,
      forcePasswordChange: u.forcePasswordChange,
      ptwPrivilege: u.ptwPrivilege,
      permissions: u.permissions,
    });
    setShowGranularInCreate(false);
    setOpenMenuUserId(null);
  };

  const applyPresetToForm = (presetKey: string) => {
    const preset = ROLE_PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    const matchedLvl =
      accessLevels.find((l) => l.baseTier === preset.securityLevel || l.code === preset.securityLevel) ||
      accessLevels[0];
    setUserForm((prev) => ({
      ...prev,
      rbacLevel: preset.rbacLevel,
      accessLevelId: matchedLvl?.id || prev.accessLevelId,
      permissions: preset.permissions,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !userForm.firstName.trim() ||
      !userForm.lastName.trim() ||
      !userForm.personnelCode.trim() ||
      !userForm.username.trim()
    ) {
      onNotify('تکمیل فیلدهای الزامی', 'نام، نام خانوادگی، شماره پرسنلی و نام کاربری الزامی هستند.', 'error');
      return;
    }

    const selectedLevel = accessLevels.find((l) => l.id === userForm.accessLevelId) || accessLevels[0];
    const baseTier = selectedLevel?.baseTier || 'C2';

    if (formModalMode === 'create') {
      const duplicate = users.some(
        (u) =>
          u.personnelCode.toLowerCase() === userForm.personnelCode.trim().toLowerCase() ||
          u.username.toLowerCase() === userForm.username.trim().toLowerCase()
      );
      if (duplicate) {
        onNotify('شناسه تکراری', 'شماره پرسنلی یا نام کاربری قبلاً در سامانه ثبت شده است.', 'error');
        return;
      }

      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        honorific: userForm.honorific,
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        personnelCode: userForm.personnelCode.trim().toUpperCase(),
        mobile: userForm.mobile.trim() || '0917-000-0000',
        extension: userForm.extension.trim() || '۲۱۰۰',
        management: userForm.management,
        unit: userForm.unit,
        roleTitle: userForm.roleTitle.trim() || 'کارشناس واحد سازمانی',
        directManager: userForm.directManager.trim() || 'مهندس مهران کاظمی',
        directSupervisor: userForm.directSupervisor.trim() || '-',
        username: userForm.username.trim().toLowerCase(),
        securityBadge: userForm.mfaEnabled ? '2FA' : 'رمز ایمن',
        securityLevel: baseTier,
        accessLevelId: selectedLevel?.id,
        rbacLevel: userForm.rbacLevel,
        accountStatus: userForm.accountStatus,
        siteLocation: 'عسلویه - فاز ۲',
        ptwPrivilege: userForm.ptwPrivilege.trim() || 'مشاهده‌گر پروانه‌های کار',
        digitalSignatureValidity: 'معتبر تا ۱۴۰۴/۱۲/۲۹ (سطح ۲)',
        lastAccessReview: '۱۴۰۳/۰۸/۲۴ توسط مهران کاظمی',
        mfaEnabled: userForm.mfaEnabled,
        forcePasswordChange: userForm.forcePasswordChange,
        otWifiAllowed: baseTier === 'C3' || baseTier === 'C4',
        hardwareTokenType: userForm.mfaEnabled ? '2FA + توکن نرم‌افزاری' : 'گذرواژه استاندارد NIST',
        permissions: userForm.permissions,
        auditLogs: [
          {
            id: `log-new-${Date.now()}`,
            timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            action: `تعریف دستی کاربر جدید (سطح کلی: ${selectedLevel?.code} · ${userForm.permissions.length.toLocaleString('fa-IR')} مجوز ریز)`,
            actor: 'مهران کاظمی (ادمین IMS)',
            actorRole: 'مدیر تضمین کیفیت و راهبر سامانه',
            ipOrSource: '10.14.80.12 [ADMIN-CONSOLE]',
            statusText: 'امضای دیجیتال معتبر',
            statusTone: 'tertiary',
          },
        ],
      };

      onAddUser(newUser);
      setFormModalMode(null);
      onNotify(
        `کاربر ${newUser.honorific} ${newUser.firstName} ${newUser.lastName} ثبت شد`,
        `کد پرسنلی ${newUser.personnelCode} با سطح «${selectedLevel?.name}» و ${newUser.permissions.length.toLocaleString('fa-IR')} مجوز ریز ایجاد گردید.`,
        'success'
      );
    } else if (formModalMode === 'edit' && editingUserId) {
      onUpdateUser(
        editingUserId,
        {
          honorific: userForm.honorific,
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          personnelCode: userForm.personnelCode.trim().toUpperCase(),
          mobile: userForm.mobile.trim(),
          extension: userForm.extension.trim(),
          management: userForm.management,
          unit: userForm.unit,
          roleTitle: userForm.roleTitle.trim(),
          directManager: userForm.directManager.trim(),
          directSupervisor: userForm.directSupervisor.trim(),
          username: userForm.username.trim().toLowerCase(),
          securityLevel: baseTier,
          accessLevelId: selectedLevel?.id,
          rbacLevel: userForm.rbacLevel,
          accountStatus: userForm.accountStatus,
          mfaEnabled: userForm.mfaEnabled,
          forcePasswordChange: userForm.forcePasswordChange,
          ptwPrivilege: userForm.ptwPrivilege.trim(),
          securityBadge: userForm.mfaEnabled ? '2FA' : 'رمز ایمن',
        },
        'ویرایش مشخصات هویتی، جایگاه سازمانی و سطح دسترسی کاربر'
      );
      setFormModalMode(null);
      onNotify('مشخصات کاربر به‌روزرسانی شد', `${userForm.firstName} ${userForm.lastName} ذخیره گردید.`, 'success');
    }
  };

  const handleToggleSuspend = (u: UserAccount) => {
    const isSuspended = u.accountStatus === 'معلق / غیرفعال';
    const nextStatus: UserAccountStatus = isSuspended ? 'فعال / برخط' : 'معلق / غیرفعال';
    onUpdateUser(
      u.id,
      { accountStatus: nextStatus },
      isSuspended ? 'رفع تعلیق و فعال‌سازی مجدد حساب کاربری' : 'تعلیق موقت دسترسی کاربر توسط ادمین'
    );
    setOpenMenuUserId(null);
    onNotify(
      isSuspended ? 'حساب کاربری فعال شد' : 'حساب کاربری به حالت تعلیق درآمد',
      `وضعیت ${u.firstName} ${u.lastName} تغییر یافت.`,
      isSuspended ? 'success' : 'warning'
    );
  };

  const handleResetPasswordQuick = (u: UserAccount) => {
    onUpdateUser(
      u.id,
      { forcePasswordChange: true, accountStatus: 'انقضای رمز / موقت', securityBadge: 'تغییر رمز' },
      'بازنشانی گذرواژه و ارسال رمز یک‌بارمصرف امنیتی'
    );
    setOpenMenuUserId(null);
    onNotify(
      'دستور بازنشانی رمز صادر شد',
      `پیامک رمز موقت برای ${u.firstName} ${u.lastName} (${u.mobile}) ارسال گردید.`,
      'info'
    );
  };

  const openGranularForUser = (userId: string) => {
    onSelectUser(userId);
    setActiveTab('granular-matrix');
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Unified Clean Header + Segmented Navigation */}
      <section className="bg-white rounded-2xl border border-border-hairline p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl font-extrabold text-primary">
                مدیریت کاربران و تنظیمات دسترسی
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                <span className="material-symbols-outlined !text-[14px]">admin_panel_settings</span>
                فقط در دسترس ادمین
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              لیست جامع کاربران و احراز صلاحیت، تعریف دستی و خروجی اکسل، به همراه مدیریت سطوح دسترسی کلی و جزئی
            </p>
          </div>

          {/* 3 Clear Segmented Tabs */}
          <div className="inline-flex flex-wrap p-1 rounded-xl bg-surface-container-low border border-border-hairline self-start lg:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'directory'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined !text-[17px]">groups</span>
              لیست جامع کاربران
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('general-levels')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'general-levels'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined !text-[17px]">shield_lock</span>
              سطوح دسترسی کلی
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('granular-matrix')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'granular-matrix'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined !text-[17px]">tune</span>
              دسترسی‌های ریز به ریز
            </button>
          </div>
        </div>
      </section>

      {/* TAB 1: User Directory & Qualification */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Quiet Accurate 4-Metric Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-border-hairline px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-on-surface-variant">کل کاربران ثبت‌شده</div>
                <div className="text-2xl font-extrabold text-primary tabular-nums mt-0.5">
                  {stats.total.toLocaleString('fa-IR')}
                </div>
              </div>
              <span className="material-symbols-outlined !text-[24px] text-primary/60">group</span>
            </div>

            <div className="bg-white rounded-2xl border border-border-hairline px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-on-surface-variant">حساب‌های فعال و مجاز</div>
                <div className="text-2xl font-extrabold text-tertiary tabular-nums mt-0.5">
                  {stats.active.toLocaleString('fa-IR')}
                </div>
              </div>
              <span className="material-symbols-outlined !text-[24px] text-tertiary/70">verified_user</span>
            </div>

            <div className="bg-white rounded-2xl border border-border-hairline px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-on-surface-variant">احراز دو مرحله‌ای (MFA)</div>
                <div className="text-2xl font-extrabold text-secondary tabular-nums mt-0.5">
                  {stats.mfa.toLocaleString('fa-IR')}
                </div>
              </div>
              <span className="material-symbols-outlined !text-[24px] text-secondary/70">security</span>
            </div>

            <div className="bg-white rounded-2xl border border-border-hairline px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-on-surface-variant">نیازمند اقدام / معلق</div>
                <div className="text-2xl font-extrabold text-warning-capa tabular-nums mt-0.5">
                  {stats.attention.toLocaleString('fa-IR')}
                </div>
              </div>
              <span className="material-symbols-outlined !text-[24px] text-warning-capa/70">pending_actions</span>
            </div>
          </section>

          {/* Unified Filter + Primary Actions Bar */}
          <section className="bg-white rounded-2xl border border-border-hairline p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
              <div className="relative">
                <span className="material-symbols-outlined !text-[18px] text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="جستجو نام، کد پرسنلی، نام کاربری..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl bg-surface-container-low border border-border-hairline text-xs focus:outline-none focus:bg-white focus:border-secondary"
                />
              </div>

              <select
                value={filterManagement}
                onChange={(e) => {
                  setFilterManagement(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-medium text-primary focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="all">همه مدیریت‌های سازمانی</option>
                {ORG_MANAGEMENTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={filterAccessLevel}
                onChange={(e) => {
                  setFilterAccessLevel(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-medium text-primary focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="all">همه سطوح دسترسی کلی</option>
                {accessLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.code} — {lvl.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-medium text-primary focus:outline-none focus:border-secondary cursor-pointer"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="active">فقط فعال</option>
                  <option value="temp">نیازمند تغییر رمز</option>
                  <option value="suspended">معلق / غیرفعال</option>
                </select>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    title="پاک کردن فیلترها"
                    className="p-2 rounded-xl border border-border-hairline bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-[18px]">filter_alt_off</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-primary text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined !text-[18px] text-tertiary">table_view</span>
                خروجی اکسل
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined !text-[18px]">person_add</span>
                تعریف دستی کاربر
              </button>
            </div>
          </section>

          {/* Clean Users & Qualification Table */}
          <section className="bg-white rounded-2xl border border-border-hairline overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border-hairline flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-primary">
                  فهرست جامع کاربران و احراز صلاحیت
                </h2>
                <span className="text-[11px] font-bold text-secondary tabular-nums">
                  ({filteredUsers.length.toLocaleString('fa-IR')} کاربر)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-on-surface-variant">تعداد در صفحه:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-hairline text-xs font-bold text-primary cursor-pointer"
                >
                  <option value={10}>۱۰</option>
                  <option value={20}>۲۰</option>
                  <option value={50}>۵۰</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[1060px] text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low/80 border-b border-border-hairline text-[11px] font-bold text-primary">
                    <th className="py-3 px-3 text-center w-12">ردیف</th>
                    <th className="py-3 px-3">کاربر و شناسه</th>
                    <th className="py-3 px-3">جایگاه سازمانی و سرپرست</th>
                    <th className="py-3 px-3">تماس / داخلی</th>
                    <th className="py-3 px-3">احراز صلاحیت و وضعیت</th>
                    <th className="py-3 px-3">سطح دسترسی کلی</th>
                    <th className="py-3 px-3">دسترسی‌های ریز</th>
                    <th className="py-3 px-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline/70">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined !text-[32px] text-outline">person_search</span>
                          <p className="font-bold text-primary">کاربری با این مشخصات یافت نشد.</p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={resetFilters}
                              className="px-4 py-1.5 rounded-lg bg-surface-container-low text-secondary font-bold cursor-pointer"
                            >
                              نمایش همه کاربران
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, idx) => {
                      const rowIndex = (safePage - 1) * pageSize + idx + 1;
                      const st = STATUS_STYLE_MAP[u.accountStatus] || STATUS_STYLE_MAP['فعال'];
                      const effLvlId = getUserEffectiveLevelId(u, accessLevels);

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-surface-container-low/45 transition-colors"
                        >
                          <td className="py-3 px-3 text-center font-bold text-on-surface-variant tabular-nums">
                            {rowIndex.toLocaleString('fa-IR')}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-extrabold text-[11px] flex items-center justify-center shrink-0">
                                {u.firstName.charAt(0)}.{u.lastName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openGranularForUser(u.id)}
                                  className="font-bold text-primary hover:text-secondary cursor-pointer text-right block truncate"
                                >
                                  {u.honorific} {u.firstName} {u.lastName}
                                </button>
                                <div className="font-label-code text-[11px] text-on-surface-variant">
                                  <span className="text-secondary font-bold">{u.personnelCode}</span> · {u.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 max-w-[230px]">
                            <div className="font-bold text-primary truncate">{u.roleTitle}</div>
                            <div className="text-[11px] text-on-surface-variant truncate">
                              {u.management} / {u.unit}
                            </div>
                            <div className="text-[10.5px] text-outline truncate">مدیر: {u.directManager}</div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-label-code text-[11.5px] font-semibold text-primary" dir="ltr">
                              {u.mobile}
                            </div>
                            <div className="text-[11px] text-on-surface-variant tabular-nums">
                              داخلی: {u.extension}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${st.bg} ${st.text}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                              <span className="text-[10.5px] text-on-surface-variant">
                                {u.mfaEnabled ? 'MFA فعال' : 'MFA غیرفعال'} · {u.rbacLevel.split(' - ')[0]}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <select
                              value={effLvlId}
                              onChange={(e) => onAssignUsersLevel([u.id], e.target.value)}
                              aria-label={`سطح دسترسی کلی ${u.firstName} ${u.lastName}`}
                              className="px-2.5 py-1.5 rounded-lg border border-border-hairline bg-surface-container-low hover:bg-white text-xs font-bold text-primary focus:outline-none focus:border-secondary cursor-pointer"
                            >
                              {accessLevels.map((lvl) => (
                                <option key={lvl.id} value={lvl.id}>
                                  {lvl.code} · {lvl.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-primary tabular-nums">
                                {u.permissions.length.toLocaleString('fa-IR')} / {RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')}
                              </span>
                              <button
                                type="button"
                                onClick={() => openGranularForUser(u.id)}
                                className="px-2.5 py-1 rounded-lg border border-secondary/30 bg-sky-50 hover:bg-secondary hover:text-white text-secondary text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                تنظیم ریز
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 relative">
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                title="ویرایش مشخصات کاربر"
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low cursor-pointer"
                              >
                                <span className="material-symbols-outlined !text-[18px]">edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setOpenMenuUserId((prev) => (prev === u.id ? null : u.id))}
                                title="عملیات بیشتر"
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low cursor-pointer"
                              >
                                <span className="material-symbols-outlined !text-[18px]">more_vert</span>
                              </button>

                              {openMenuUserId === u.id && (
                                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl border border-border-hairline shadow-xl py-1.5 z-30 animate-modal-enter text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuUserId(null);
                                      openGranularForUser(u.id);
                                    }}
                                    className="w-full text-right px-3.5 py-2 text-xs font-semibold text-primary hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined !text-[16px] text-secondary">tune</span>
                                    ماتریس دسترسی ریز
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResetPasswordQuick(u)}
                                    className="w-full text-right px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined !text-[16px] text-warning-capa">vpn_key</span>
                                    بازنشانی گذرواژه
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSuspend(u)}
                                    className="w-full text-right px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined !text-[16px] text-secondary">
                                      {u.accountStatus === 'معلق / غیرفعال' ? 'lock_open' : 'lock'}
                                    </span>
                                    {u.accountStatus === 'معلق / غیرفعال' ? 'رفع تعلیق حساب' : 'تعلیق موقت حساب'}
                                  </button>
                                  <div className="my-1 border-t border-border-hairline" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuUserId(null);
                                      setConfirmDeleteUser(u);
                                    }}
                                    className="w-full text-right px-3.5 py-2 text-xs font-bold text-critical-hse hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined !text-[16px]">delete</span>
                                    حذف کاربر
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Clean Pagination Footer */}
            <div className="px-5 py-3 bg-surface-container-low/50 border-t border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
              <div className="tabular-nums">
                نمایش{' '}
                <strong className="text-primary">
                  {filteredUsers.length === 0 ? 0 : ((safePage - 1) * pageSize + 1).toLocaleString('fa-IR')}
                </strong>{' '}
                تا{' '}
                <strong className="text-primary">
                  {Math.min(safePage * pageSize, filteredUsers.length).toLocaleString('fa-IR')}
                </strong>{' '}
                از مجموع <strong className="text-primary">{filteredUsers.length.toLocaleString('fa-IR')}</strong> کاربر
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg border border-border-hairline bg-white hover:bg-surface-container disabled:opacity-40 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined !text-[17px]">chevron_right</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold tabular-nums cursor-pointer ${
                      page === safePage
                        ? 'bg-primary text-white'
                        : 'bg-white border border-border-hairline text-primary hover:bg-surface-container-low'
                    }`}
                  >
                    {page.toLocaleString('fa-IR')}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-lg border border-border-hairline bg-white hover:bg-surface-container disabled:opacity-40 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined !text-[17px]">chevron_left</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: General Access Levels (Public, Internal, Confidential, Top Secret & Custom) */}
      {activeTab === 'general-levels' && (
        <AccessLevelsPage
          embedded
          accessLevels={accessLevels}
          orgAssignments={orgAssignments}
          users={users}
          onSaveAccessLevel={onSaveAccessLevel}
          onAssignUsersLevel={onAssignUsersLevel}
          onAssignOrgEntityLevel={onAssignOrgEntityLevel}
          onAddOrgEntity={onAddOrgEntity}
          onCascadeOrgLevelToUsers={onCascadeOrgLevelToUsers}
          onSelectUserForDetail={(uid) => openGranularForUser(uid)}
          onNavigate={onNavigate}
          onNotify={onNotify}
        />
      )}

      {/* TAB 3: Granular Per-User Access Matrix */}
      {activeTab === 'granular-matrix' && (
        <UserDetailPermissionsPage
          embedded
          users={users}
          selectedUserId={selectedUserId}
          accessLevels={accessLevels}
          onSelectUser={onSelectUser}
          onUpdateUser={onUpdateUser}
          onAssignUserAccessLevel={(uid, lvlId) => onAssignUsersLevel([uid], lvlId)}
          onDeleteUser={onDeleteUser}
          onNavigate={onNavigate}
          onBackToDirectory={() => setActiveTab('directory')}
          onNotify={onNotify}
        />
      )}

      {/* Manual Create / Edit User Modal */}
      {formModalMode && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <form
            onSubmit={handleFormSubmit}
            className="animate-modal-enter w-full max-w-3xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="px-6 py-4 bg-surface-container-low border-b border-border-hairline flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-primary">
                  {formModalMode === 'create'
                    ? 'تعریف دستی کاربر جدید و تعیین سطوح دسترسی'
                    : `ویرایش مشخصات: ${userForm.firstName} ${userForm.lastName}`}
                </h3>
                <p className="text-[11px] text-on-surface-variant">
                  اطلاعات هویتی، جایگاه سازمانی، سطح دسترسی کلی و مجوزهای جزئی کاربر
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormModalMode(null)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 text-xs">
              {/* 1. Identity */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-primary border-b border-border-hairline pb-1.5">
                  ۱. مشخصات هویتی و ارتباطی
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-primary mb-1">عنوان</label>
                    <select
                      value={userForm.honorific}
                      onChange={(e) => setUserForm({ ...userForm, honorific: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    >
                      <option value="مهندس">مهندس</option>
                      <option value="دکتر">دکتر</option>
                      <option value="آقای">آقای</option>
                      <option value="خانم">خانم</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">نام *</label>
                    <input
                      type="text"
                      required
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                      placeholder="مثال: فرهاد"
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">نام خانوادگی *</label>
                    <input
                      type="text"
                      required
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                      placeholder="مثال: محمدی"
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">شماره پرسنلی *</label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={userForm.personnelCode}
                      onChange={(e) => setUserForm({ ...userForm, personnelCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-label-code focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-primary mb-1">نام کاربری *</label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      placeholder="f.mohammadi"
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-label-code focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">تلفن همراه</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={userForm.mobile}
                      onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-label-code focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">داخلی</label>
                    <input
                      type="text"
                      value={userForm.extension}
                      onChange={(e) => setUserForm({ ...userForm, extension: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Organizational Placement & Qualification */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-primary border-b border-border-hairline pb-1.5">
                  ۲. جایگاه سازمانی و احراز صلاحیت
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-primary mb-1">مدیریت سازمانی</label>
                    <select
                      value={userForm.management}
                      onChange={(e) => {
                        const mgmt = e.target.value;
                        const units = ORG_UNITS_BY_MANAGEMENT[mgmt] || ['واحد ستادی'];
                        setUserForm({ ...userForm, management: mgmt, unit: units[0] });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    >
                      {ORG_MANAGEMENTS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">واحد عملیاتی</label>
                    <select
                      value={userForm.unit}
                      onChange={(e) => setUserForm({ ...userForm, unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    >
                      {(ORG_UNITS_BY_MANAGEMENT[userForm.management] || [userForm.unit]).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">سمت سازمانی</label>
                    <input
                      type="text"
                      value={userForm.roleTitle}
                      onChange={(e) => setUserForm({ ...userForm, roleTitle: e.target.value })}
                      placeholder="کارشناس ارشد فرآیند"
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-primary mb-1">مدیر مستقیم</label>
                    <input
                      type="text"
                      value={userForm.directManager}
                      onChange={(e) => setUserForm({ ...userForm, directManager: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">مجوز پروانه کار (PTW)</label>
                    <input
                      type="text"
                      value={userForm.ptwPrivilege}
                      onChange={(e) => setUserForm({ ...userForm, ptwPrivilege: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-primary mb-1">وضعیت حساب</label>
                    <select
                      value={userForm.accountStatus}
                      onChange={(e) =>
                        setUserForm({ ...userForm, accountStatus: e.target.value as UserAccountStatus })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white"
                    >
                      <option value="فعال / برخط">فعال / برخط</option>
                      <option value="فعال">فعال</option>
                      <option value="انقضای رمز / موقت">انقضای رمز / موقت</option>
                      <option value="معلق / غیرفعال">معلق / غیرفعال</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.mfaEnabled}
                      onChange={(e) => setUserForm({ ...userForm, mfaEnabled: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span className="font-semibold text-primary">احراز هویت دو مرحله‌ای (MFA)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.forcePasswordChange}
                      onChange={(e) => setUserForm({ ...userForm, forcePasswordChange: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span className="font-semibold text-primary">تغییر اجباری رمز در اولین ورود</span>
                  </label>
                </div>
              </div>

              {/* 3. Dual Access Assignment */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-primary border-b border-border-hairline pb-1.5">
                  ۳. سطوح دسترسی (کلی + جزئی)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-primary mb-1">
                      سطح دسترسی کلی (عمومی، داخلی، محرمانه و...)
                    </label>
                    <select
                      value={userForm.accessLevelId}
                      onChange={(e) => setUserForm({ ...userForm, accessLevelId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-bold text-primary focus:bg-white"
                    >
                      {accessLevels.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.code} — {lvl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-primary mb-1">الگوی نقش و دسترسی‌های ریز</label>
                    <div className="flex gap-2">
                      <select
                        value={userForm.rbacLevel}
                        onChange={(e) => {
                          const val = e.target.value as RbacLevel;
                          const presetKey = val.startsWith('L5')
                            ? 'admin'
                            : val.startsWith('L4')
                            ? 'supervisor'
                            : val.startsWith('L3')
                            ? 'auditor'
                            : val.startsWith('L2')
                            ? 'specialist'
                            : 'operator';
                          applyPresetToForm(presetKey);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-bold text-primary focus:bg-white"
                      >
                        <option value="L5 - Admin">L5 - Admin (راهبر کامل)</option>
                        <option value="L4 - Supervisor">L4 - Supervisor (سرپرست)</option>
                        <option value="L3 - Lead Auditor">L3 - Lead Auditor (سرممیز)</option>
                        <option value="L2 - Specialist">L2 - Specialist (کارشناس)</option>
                        <option value="L1 - Operator">L1 - Operator (اپراتور)</option>
                      </select>
                      {formModalMode === 'create' && (
                        <button
                          type="button"
                          onClick={() => setShowGranularInCreate((v) => !v)}
                          className="px-3 py-2 rounded-xl border border-secondary/30 bg-sky-50 text-secondary font-bold whitespace-nowrap cursor-pointer"
                        >
                          {showGranularInCreate
                            ? 'بستن جزئیات'
                            : `انتخاب ریز (${userForm.permissions.length.toLocaleString('fa-IR')})`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {formModalMode === 'create' && showGranularInCreate && (
                  <div className="p-3.5 rounded-xl border border-border-hairline bg-surface-container-low/40 space-y-3">
                    {RBAC_GROUPS.map((group) => {
                      const perms = RBAC_PERMISSION_DEFS.filter((p) => p.groupId === group.id);
                      return (
                        <div key={group.id} className="space-y-1.5">
                          <div className="text-[11px] font-extrabold text-primary">{group.title}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {perms.map((perm) => {
                              const checked = userForm.permissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white border border-border-hairline cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setUserForm((prev) => ({
                                        ...prev,
                                        permissions: checked
                                          ? prev.permissions.filter((id) => id !== perm.id)
                                          : [...prev.permissions, perm.id],
                                      }))
                                    }
                                    className="w-3.5 h-3.5 accent-primary"
                                  />
                                  <span className="text-[11px] font-semibold text-primary">{perm.title}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-border-hairline flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setFormModalMode(null)}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold text-on-surface-variant cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold cursor-pointer"
              >
                {formModalMode === 'create' ? 'ثبت نهایی کاربر' : 'ذخیره تغییرات'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!confirmDeleteUser}
        tone="danger"
        title={`حذف حساب کاربری ${confirmDeleteUser?.firstName ?? ''} ${confirmDeleteUser?.lastName ?? ''}`}
        description={`آیا از حذف دائمی حساب کاربری «${confirmDeleteUser?.username ?? ''}» (${
          confirmDeleteUser?.personnelCode ?? ''
        }) اطمینان دارید؟`}
        confirmLabel="تایید و حذف کاربر"
        cancelLabel="انصراف"
        onConfirm={() => {
          if (confirmDeleteUser) {
            onDeleteUser(confirmDeleteUser.id);
            onNotify(
              'حساب کاربری حذف شد',
              `کاربر ${confirmDeleteUser.firstName} ${confirmDeleteUser.lastName} حذف گردید.`,
              'warning'
            );
            setConfirmDeleteUser(null);
          }
        }}
        onCancel={() => setConfirmDeleteUser(null)}
      />
    </div>
  );
};
