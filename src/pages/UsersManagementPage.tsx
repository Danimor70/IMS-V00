import React, { useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  exportToCsv,
  ORG_MANAGEMENTS,
  ORG_UNITS_BY_MANAGEMENT,
  RBAC_PERMISSION_DEFS,
} from '../data/imsData';
import {
  RbacLevel,
  RouteId,
  UserAccount,
  UserAccountStatus,
} from '../types/ims';

interface UsersManagementPageProps {
  users: UserAccount[];
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (id: string, patch: Partial<UserAccount>, auditAction?: string) => void;
  onDeleteUser: (id: string) => void;
  onSelectUserForDetail: (id: string) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const STATUS_BADGE_MAP: Record<
  UserAccountStatus,
  { dot: string; bg: string; text: string; border: string; shortLabel: string }
> = {
  'فعال / برخط': {
    dot: 'bg-tertiary',
    bg: 'bg-emerald-50',
    text: 'text-tertiary',
    border: 'border-emerald-200',
    shortLabel: 'فعال / برخط',
  },
  فعال: {
    dot: 'bg-tertiary',
    bg: 'bg-emerald-50',
    text: 'text-tertiary',
    border: 'border-emerald-200',
    shortLabel: 'فعال',
  },
  'فعال / سطح کلان': {
    dot: 'bg-secondary',
    bg: 'bg-sky-50',
    text: 'text-secondary',
    border: 'border-sky-200',
    shortLabel: 'فعال / سطح کلان',
  },
  'فعال / دارای توکن امنیتی C3': {
    dot: 'bg-tertiary',
    bg: 'bg-emerald-50',
    text: 'text-tertiary',
    border: 'border-emerald-200',
    shortLabel: 'فعال / توکن C3',
  },
  'انقضای رمز / موقت': {
    dot: 'bg-warning-capa',
    bg: 'bg-amber-50',
    text: 'text-warning-capa',
    border: 'border-amber-200',
    shortLabel: 'انقضای رمز / موقت',
  },
  'معلق / غیرفعال': {
    dot: 'bg-critical-hse',
    bg: 'bg-red-50',
    text: 'text-critical-hse',
    border: 'border-red-200',
    shortLabel: 'معلق / غیرفعال',
  },
};

interface QuickUserFormState {
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
  securityLevel: UserAccount['securityLevel'];
  rbacLevel: RbacLevel;
  accountStatus: UserAccountStatus;
  mfaEnabled: boolean;
}

const EMPTY_FORM: QuickUserFormState = {
  honorific: 'مهندس',
  firstName: '',
  lastName: '',
  personnelCode: '',
  mobile: '0917-',
  extension: '',
  management: ORG_MANAGEMENTS[0],
  unit: ORG_UNITS_BY_MANAGEMENT[ORG_MANAGEMENTS[0]][0],
  roleTitle: '',
  directManager: 'مهندس مهران کاظمی',
  directSupervisor: 'مهندس رضوانی',
  username: '',
  securityLevel: 'C2',
  rbacLevel: 'L2 - Specialist',
  accountStatus: 'فعال',
  mfaEnabled: true,
};

export const UsersManagementPage: React.FC<UsersManagementPageProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSelectUserForDetail,
  onNavigate,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterManagement, setFilterManagement] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterRbac, setFilterRbac] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const [matrixModalUser, setMatrixModalUser] = useState<UserAccount | null>(null);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<QuickUserFormState>(EMPTY_FORM);

  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserAccount | null>(null);

  // Derived options for dropdowns
  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    users.forEach((u) => {
      if (filterManagement === 'all' || u.management === filterManagement) {
        units.add(u.unit);
      }
    });
    return Array.from(units);
  }, [users, filterManagement]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.personnelCode.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.roleTitle.toLowerCase().includes(q);
      const matchesMgmt = filterManagement === 'all' || u.management === filterManagement;
      const matchesUnit = filterUnit === 'all' || u.unit === filterUnit;
      const matchesRbac = filterRbac === 'all' || u.rbacLevel === filterRbac;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active-all'
          ? u.accountStatus.startsWith('فعال')
          : u.accountStatus === filterStatus);
      return matchesQuery && matchesMgmt && matchesUnit && matchesRbac && matchesStatus;
    });
  }, [users, searchQuery, filterManagement, filterUnit, filterRbac, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  // Dynamic KPIs derived from actual users state
  const activeCount = useMemo(
    () => 339 + users.filter((u) => u.accountStatus.startsWith('فعال')).length,
    [users]
  );
  const onlineCount = useMemo(
    () => 38 + users.filter((u) => u.accountStatus === 'فعال / برخط' || u.accountStatus.includes('توکن')).length,
    [users]
  );
  const supervisorAdminCount = useMemo(
    () =>
      22 +
      users.filter((u) => u.rbacLevel === 'L5 - Admin' || u.rbacLevel === 'L4 - Supervisor').length,
    [users]
  );
  const pendingOrExpiringCount = useMemo(
    () => users.filter((u) => u.accountStatus === 'انقضای رمز / موقت' || u.forcePasswordChange).length + 2,
    [users]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterManagement !== 'all' ||
    filterUnit !== 'all' ||
    filterRbac !== 'all' ||
    filterStatus !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterManagement('all');
    setFilterUnit('all');
    setFilterRbac('all');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    exportToCsv(
      'Apadana-IMS-Users-Directory.csv',
      [
        'ردیف',
        'وضعیت حساب',
        'نام',
        'نام خانوادگی',
        'شماره پرسنلی',
        'تلفن همراه',
        'داخلی',
        'مدیریت سازمانی',
        'واحد عملیاتی',
        'سمت سازمانی',
        'مدیر مستقیم',
        'سرپرست مستقیم',
        'نام کاربری',
        'سطح محرمانگی',
        'سطح RBAC',
      ],
      filteredUsers.map((u, idx) => [
        idx + 1,
        u.accountStatus,
        u.firstName,
        u.lastName,
        u.personnelCode,
        u.mobile,
        u.extension,
        u.management,
        u.unit,
        u.roleTitle,
        u.directManager,
        u.directSupervisor,
        u.username,
        u.securityLevel,
        u.rbacLevel,
      ])
    );
    onNotify(
      'خروجی اکسل پرسنل صادر شد',
      `${filteredUsers.length.toLocaleString('fa-IR')} ردیف کاربر در فایل CSV با کدگذاری UTF-8 دانلود گردید.`,
      'success'
    );
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    onNotify(
      'فایل پرسنلی HR پردازش شد',
      `فایل «${file.name}» با ساختار سازمانی پتروشیمی آپادانا تطبیق داده شد و آماده همگام‌سازی است.`,
      'success'
    );
  };

  const openQuickCreateModal = () => {
    setFormModalMode('create');
    setEditingUserId(null);
    setUserForm({
      ...EMPTY_FORM,
      personnelCode: `AP-${Math.floor(7800 + Math.random() * 2000)}`,
    });
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
      securityLevel: u.securityLevel,
      rbacLevel: u.rbacLevel,
      accountStatus: u.accountStatus,
      mfaEnabled: u.mfaEnabled,
    });
    setOpenMenuUserId(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.personnelCode.trim() || !userForm.username.trim()) {
      onNotify('تکمیل فیلدهای الزامی', 'نام، نام خانوادگی، شماره پرسنلی و نام کاربری الزامی هستند.', 'error');
      return;
    }

    if (formModalMode === 'create') {
      const duplicate = users.some(
        (u) =>
          u.personnelCode.toLowerCase() === userForm.personnelCode.trim().toLowerCase() ||
          u.username.toLowerCase() === userForm.username.trim().toLowerCase()
      );
      if (duplicate) {
        onNotify('کد پرسنلی یا نام کاربری تکراری است', 'لطفاً شماره پرسنلی و شناسه کاربری یکتا وارد نمایید.', 'error');
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
        securityLevel: userForm.securityLevel,
        rbacLevel: userForm.rbacLevel,
        accountStatus: userForm.accountStatus,
        siteLocation: 'عسلویه - فاز ۲',
        ptwPrivilege: userForm.rbacLevel.startsWith('L4') || userForm.rbacLevel.startsWith('L5')
          ? 'صادرکننده مجاز کار گرم و سرد'
          : 'مشاهده‌گر مجوزهای واحد',
        digitalSignatureValidity: 'معتبر تا ۱۴۰۴/۱۲/۲۹ (سطح ۲)',
        lastAccessReview: '۱۴۰۳/۰۸/۲۴ توسط مهران کاظمی',
        mfaEnabled: userForm.mfaEnabled,
        forcePasswordChange: true,
        otWifiAllowed: userForm.securityLevel === 'C3' || userForm.securityLevel === 'C4',
        hardwareTokenType: userForm.mfaEnabled ? '2FA + توکن نرم‌افزاری' : 'گذرواژه استاندارد NIST',
        permissions: ['doc-list', 'doc-create', 'doc-revision', 'iso-quality', 'iso-capa'],
        auditLogs: [
          {
            id: `log-new-${Date.now()}`,
            timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            action: 'ثبت حساب کاربری جدید و تعریف سطوح دسترسی اولیه',
            actor: 'مهران کاظمی (مدیر IMS)',
            actorRole: 'مدیر تضمین کیفیت و نماینده مدیریت IMS',
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
        `کد پرسنلی ${newUser.personnelCode} به فهرست کاربران سامانه اضافه گردید.`,
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
          securityLevel: userForm.securityLevel,
          rbacLevel: userForm.rbacLevel,
          accountStatus: userForm.accountStatus,
          mfaEnabled: userForm.mfaEnabled,
          securityBadge: userForm.mfaEnabled ? '2FA' : 'رمز ایمن',
        },
        'ویرایش مشخصات هویتی و جایگاه سازمانی کاربر'
      );
      setFormModalMode(null);
      onNotify('مشخصات کاربر به‌روزرسانی شد', `${userForm.firstName} ${userForm.lastName} با موفقیت ذخیره گردید.`, 'success');
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
      `وضعیت ${u.firstName} ${u.lastName} به «${nextStatus}» تغییر یافت.`,
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
      'دستور بازنشانی رمز عبور صادر شد',
      `پیامک رمز موقت برای ${u.firstName} ${u.lastName} (${u.mobile}) ارسال گردید.`,
      'info'
    );
  };

  const getIsoSummary = (user: UserAccount) => [
    {
      code: 'ISO 9001:2015',
      title: 'مدیریت کیفیت و کنترل مستندات',
      granted: user.permissions.includes('iso-quality') || user.permissions.includes('doc-approve'),
      level: user.permissions.includes('doc-approve') ? 'تایید و امضا (Approve)' : user.permissions.includes('doc-create') ? 'تدوین و ویرایش' : 'مشاهده',
    },
    {
      code: 'ISO 14001:2015',
      title: 'مدیریت زیست‌محیطی و پساب',
      granted: user.permissions.includes('iso-hse'),
      level: user.permissions.includes('iso-hse') ? 'پایش و ثبت رویداد' : 'بدون دسترسی عملیاتی',
    },
    {
      code: 'ISO 45001:2018',
      title: 'ایمنی، بهداشت حرفه‌ای و PTW',
      granted: user.permissions.includes('iso-ptw') || user.permissions.includes('iso-hse'),
      level: user.permissions.includes('iso-ptw') ? 'صدور / تایید پروانه کار' : user.permissions.includes('iso-hse') ? 'گزارش‌دهی HSE' : 'فقط خواندنی',
    },
    {
      code: 'ISO 50001:2018',
      title: 'مدیریت انرژی و یوتیلیتی',
      granted: user.permissions.includes('iso-energy'),
      level: user.permissions.includes('iso-energy') ? 'ثبت و پایش EnPI' : 'محدودشده',
    },
  ];

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleBulkFileChange}
      />

      {/* Page Header Card */}
      <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="max-w-3xl">
            <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
              مدیریت کاربران، حساب‌ها و تنظیمات دسترسی سامانه IMS
            </h1>
          </div>
        </div>
      </section>

      {/* Dedicated Quick Actions Section */}
      <section className="bg-white rounded-2xl border border-border-hairline px-6 py-4 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl border border-border-hairline bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[18px] text-secondary">upload_file</span>
              بارگذاری دسته‌ای کاربران (اکسل/HR)
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-primary text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[18px] text-tertiary">download</span>
              خروجی اکسل پرسنل
            </button>
            <button
              type="button"
              onClick={() => onNavigate('users-create')}
              className="px-4 py-2.5 rounded-xl border border-primary/25 bg-secondary-container/50 hover:bg-secondary-container text-primary text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[18px] text-primary">assignment_ind</span>
              ثبت دستی کاربر جدید (فرم جامع)
            </button>
            <button
              type="button"
              onClick={openQuickCreateModal}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[18px]">person_add</span>
              افزودن کاربر جدید
            </button>
          </div>
        </div>
      </section>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border-hairline p-5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-on-surface-variant">کل کاربران فعال سامانه</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary tabular-nums">
                {activeCount.toLocaleString('fa-IR')}
              </span>
              <span className="text-xs font-medium text-on-surface-variant">نفر پرسنل</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-tertiary">
              <span className="material-symbols-outlined !text-[15px]">trending_up</span>
              ۹۸.۴٪ تطابق ساختار چارت سازمانی
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[24px]">groups</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-on-surface-variant">کاربران برخط هم‌اکنون</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-tertiary tabular-nums">
                {onlineCount.toLocaleString('fa-IR')}
              </span>
              <span className="text-xs font-medium text-on-surface-variant">نشست فعال</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-tertiary">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              اتصال امن از طریق شبکه صنعتی OT/IT
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-tertiary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[24px]">wifi_tethering</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-on-surface-variant">دسترسی‌های سطح مدیر / سرپرست</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary tabular-nums">
                {supervisorAdminCount.toLocaleString('fa-IR')}
              </span>
              <span className="text-xs font-medium text-on-surface-variant">حساب ویژه</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-secondary">
              <span className="material-symbols-outlined !text-[15px]">verified_user</span>
              احراز هویت دو مرحله‌ای (2FA) فعال
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[24px]">shield_person</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-hairline p-5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-on-surface-variant">درخواست‌های در انتظار فعال‌سازی</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-warning-capa tabular-nums">
                {pendingOrExpiringCount.toLocaleString('fa-IR')}
              </span>
              <span className="text-xs font-medium text-on-surface-variant">مجوز موقت</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-warning-capa">
              <span className="material-symbols-outlined !text-[15px]">pending_actions</span>
              نیازمند تأیید مدیریت HSE و حراست
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-warning-capa flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined !text-[24px]">hourglass_top</span>
          </div>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section className="bg-white rounded-2xl border border-border-hairline p-4 sm:p-5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-center">
          <div className="xl:col-span-4 relative">
            <span className="material-symbols-outlined !text-[19px] text-outline absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجوی سریع بر اساس نام، نام خانوادگی، کد پرسنلی (مثال: AP-4082) یا نام کاربری..."
              className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-white focus:border-secondary transition-all"
            />
          </div>

          <div className="xl:col-span-2">
            <select
              value={filterManagement}
              onChange={(e) => {
                setFilterManagement(e.target.value);
                setFilterUnit('all');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-medium text-on-surface focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">کلیه مدیریت‌های سازمانی</option>
              {ORG_MANAGEMENTS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-2">
            <select
              value={filterUnit}
              onChange={(e) => {
                setFilterUnit(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-medium text-on-surface focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">کلیه واحدهای عملیاتی</option>
              {availableUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-2">
            <select
              value={filterRbac}
              onChange={(e) => {
                setFilterRbac(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-medium text-on-surface focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">نقش / سطح دسترسی</option>
              <option value="L5 - Admin">L5 - مدیر راهبر (Admin)</option>
              <option value="L4 - Supervisor">L4 - سرپرست / رئیس واحد</option>
              <option value="L3 - Lead Auditor">L3 - سرممیز ایزو</option>
              <option value="L2 - Specialist">L2 - کارشناس تخصصی</option>
              <option value="L1 - Operator">L1 - اپراتور / مشاهده‌گر</option>
            </select>
          </div>

          <div className="xl:col-span-2 flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-medium text-on-surface focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">وضعیت حساب (همه)</option>
              <option value="active-all">فقط حساب‌های فعال</option>
              <option value="فعال / برخط">فعال / برخط</option>
              <option value="انقضای رمز / موقت">انقضای رمز / موقت</option>
              <option value="معلق / غیرفعال">معلق / غیرفعال</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
              title="پاک کردن تمام فیلترها"
              className="p-2.5 rounded-xl border border-border-hairline bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined !text-[18px]">filter_alt_off</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-on-surface-variant font-medium">فیلترهای فعال:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low border border-border-hairline text-primary font-semibold">
              موقعیت: عسلویه - فاز ۲
            </span>
            {filterManagement !== 'all' && (
              <button
                type="button"
                onClick={() => setFilterManagement('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-primary font-semibold cursor-pointer"
              >
                مدیریت: {filterManagement}
                <span className="material-symbols-outlined !text-[14px]">close</span>
              </button>
            )}
            {filterUnit !== 'all' && (
              <button
                type="button"
                onClick={() => setFilterUnit('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-primary font-semibold cursor-pointer"
              >
                واحد: {filterUnit}
                <span className="material-symbols-outlined !text-[14px]">close</span>
              </button>
            )}
            {filterRbac !== 'all' && (
              <button
                type="button"
                onClick={() => setFilterRbac('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-primary font-semibold cursor-pointer"
              >
                سطح: {filterRbac}
                <span className="material-symbols-outlined !text-[14px]">close</span>
              </button>
            )}
            {filterStatus !== 'all' && (
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-primary font-semibold cursor-pointer"
              >
                وضعیت: {filterStatus === 'active-all' ? 'فعال' : filterStatus}
                <span className="material-symbols-outlined !text-[14px]">close</span>
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-secondary font-bold hover:underline px-1.5 cursor-pointer"
              >
                بازنشانی همه
              </button>
            )}
          </div>
          <span className="text-on-surface-variant tabular-nums">
            نتیجه فیلتر: <strong className="text-primary">{filteredUsers.length.toLocaleString('fa-IR')}</strong> کاربر
          </span>
        </div>
      </section>

      {/* Double-Click Guidance Banner */}
      <div className="rounded-2xl border border-secondary/20 bg-secondary-container/35 px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white text-secondary border border-secondary/20 flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined !text-[20px]">touch_app</span>
          </div>
          <div className="text-xs leading-6 text-on-surface">
            <strong className="text-primary font-extrabold ml-1">راهنمای هوشمند دسترسی و ویرایش:</strong>
            با <strong className="text-secondary font-bold">دوبار کلیک (Double-Click)</strong> روی هر سطر کاربر، پنجره تخصصی پروفایل و ماتریس دسترسی‌های سازمانی وی به تمامی ماژول‌ها و فرآیندهای IMS پتروشیمی آپادانا باز می‌شود.
          </div>
        </div>
        <span className="font-label-code text-[10.5px] font-bold px-3 py-1 rounded-lg bg-white border border-secondary/25 text-secondary shrink-0 self-end sm:self-center">
          SHORTCUT: DBLCLICK
        </span>
      </div>

      {/* 14-Column Users Table Card */}
      <section className="bg-white rounded-2xl border border-border-hairline shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] overflow-hidden">
        <div className="px-5 py-4 border-b border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-secondary !text-[22px]">manage_accounts</span>
            <h2 className="text-sm sm:text-base font-extrabold text-primary">
              فهرست جامع کاربران سازمانی و احراز صلاحیت
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-surface-container-low text-secondary border border-border-hairline tabular-nums">
              صفحه {safePage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-on-surface-variant">نمایش ردیف:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-border-hairline text-xs font-bold text-primary cursor-pointer"
            >
              <option value={10}>۱۰ کاربر</option>
              <option value={20}>۲۰ کاربر</option>
              <option value={50}>۵۰ کاربر</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[1450px] text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low/80 border-b border-border-hairline text-[11px] font-extrabold text-primary">
                <th className="py-3.5 px-3 text-center w-12">ردیف</th>
                <th className="py-3.5 px-3">وضعیت حساب</th>
                <th className="py-3.5 px-3">نام</th>
                <th className="py-3.5 px-3">نام خانوادگی</th>
                <th className="py-3.5 px-3">شماره پرسنلی</th>
                <th className="py-3.5 px-3">تماس / داخلی</th>
                <th className="py-3.5 px-3">مدیریت سازمانی</th>
                <th className="py-3.5 px-3">واحد عملیاتی</th>
                <th className="py-3.5 px-3">سمت سازمانی</th>
                <th className="py-3.5 px-3">مدیر مستقیم</th>
                <th className="py-3.5 px-3">سرپرست مستقیم</th>
                <th className="py-3.5 px-3">نام کاربری</th>
                <th className="py-3.5 px-3">گذرواژه و امنیت</th>
                <th className="py-3.5 px-3 text-center sticky left-0 bg-surface-container-low/95 backdrop-blur-xs border-r border-border-hairline">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/70 text-xs">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined !text-[34px] text-outline">person_search</span>
                      <p className="font-bold text-primary">هیچ کاربری با فیلترهای انتخابی یافت نشد.</p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-1 px-4 py-1.5 rounded-lg bg-surface-container-low text-secondary font-bold hover:bg-surface-container cursor-pointer"
                      >
                        بازنشانی فیلترها
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const rowIndex = (safePage - 1) * pageSize + idx + 1;
                  const statusMeta = STATUS_BADGE_MAP[u.accountStatus] || STATUS_BADGE_MAP['فعال'];
                  return (
                    <tr
                      key={u.id}
                      onDoubleClick={() => setMatrixModalUser(u)}
                      title="برای مشاهده ماتریس تخصصی دسترسی‌ها دوبار کلیک کنید"
                      className="hover:bg-surface-container-low/55 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-3 text-center font-bold text-on-surface-variant tabular-nums">
                        {rowIndex.toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
                          {statusMeta.shortLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-primary whitespace-nowrap">{u.firstName}</td>
                      <td className="py-3.5 px-3 font-bold text-primary whitespace-nowrap">{u.lastName}</td>
                      <td className="py-3.5 px-3">
                        <span className="font-label-code font-bold text-secondary whitespace-nowrap">
                          {u.personnelCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-label-code text-[11.5px] font-semibold text-on-surface" dir="ltr">
                          {u.mobile}
                        </div>
                        <div className="text-[10.5px] text-secondary font-semibold tabular-nums">
                          داخلی: {u.extension}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-hairline text-[11px] font-semibold text-primary max-w-[140px] leading-5">
                          {u.management}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant max-w-[140px] leading-5">
                        {u.unit}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-primary max-w-[175px] leading-5">
                        {u.roleTitle}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant max-w-[130px] leading-5">
                        {u.directManager}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant max-w-[125px] leading-5">
                        {u.directSupervisor}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-label-code text-[11.5px] font-bold text-primary bg-surface-container-low px-2 py-0.5 rounded-md border border-border-hairline">
                          {u.username}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            u.forcePasswordChange
                              ? 'bg-amber-50 text-warning-capa border-amber-200'
                              : u.mfaEnabled
                              ? 'bg-emerald-50 text-tertiary border-emerald-200'
                              : 'bg-surface-container-low text-on-surface-variant border-border-hairline'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[14px]">
                            {u.forcePasswordChange ? 'key' : u.mfaEnabled ? 'verified_user' : 'lock'}
                          </span>
                          <span className="font-label-code">{u.securityBadge}</span>
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-3 sticky left-0 bg-white group-hover:bg-surface-container-low/95 border-r border-border-hairline"
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1 relative">
                          <button
                            type="button"
                            onClick={() => onSelectUserForDetail(u.id)}
                            title="پروفایل و ماتریس کامل سطوح دسترسی (RBAC)"
                            className="p-1.5 rounded-lg text-secondary hover:bg-secondary-container/60 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined !text-[18px]">lock_person</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            title="ویرایش سریع اطلاعات کاربر"
                            className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined !text-[18px]">edit</span>
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuUserId((prev) => (prev === u.id ? null : u.id))}
                              title="سایر عملیات امنیتی"
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined !text-[18px]">more_vert</span>
                            </button>

                            {openMenuUserId === u.id && (
                              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl border border-border-hairline shadow-xl py-1.5 z-30 animate-modal-enter">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuUserId(null);
                                    onSelectUserForDetail(u.id);
                                  }}
                                  className="w-full text-right px-3.5 py-2 text-xs font-semibold text-primary hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined !text-[16px] text-secondary">
                                    security
                                  </span>
                                  پروفایل و ماتریس RBAC
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetPasswordQuick(u)}
                                  className="w-full text-right px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined !text-[16px] text-warning-capa">
                                    vpn_key
                                  </span>
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
                                  حذف حساب کاربری
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-surface-container-low/50 border-t border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <div className="tabular-nums">
            نمایش ردیف{' '}
            <strong className="text-primary">
              {filteredUsers.length === 0 ? 0 : ((safePage - 1) * pageSize + 1).toLocaleString('fa-IR')}
            </strong>{' '}
            تا{' '}
            <strong className="text-primary">
              {Math.min(safePage * pageSize, filteredUsers.length).toLocaleString('fa-IR')}
            </strong>{' '}
            از مجموع <strong className="text-primary">{activeCount.toLocaleString('fa-IR')}</strong> کاربر شاغل در سایت عسلویه (نمایش پایگاه داده: {filteredUsers.length.toLocaleString('fa-IR')} پروفایل فعال)
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
                    ? 'bg-primary text-white shadow-xs'
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

      {/* Double-Click Matrix Viewer Modal */}
      {matrixModalUser && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-3xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center font-bold text-base">
                  {matrixModalUser.firstName.charAt(0)}.{matrixModalUser.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold">
                    پروفایل و ماتریس دسترسی تخصصی: {matrixModalUser.honorific} {matrixModalUser.firstName}{' '}
                    {matrixModalUser.lastName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/80 mt-0.5">
                    <span className="font-label-code font-bold">{matrixModalUser.personnelCode}</span>
                    <span>•</span>
                    <span>{matrixModalUser.roleTitle}</span>
                    <span>•</span>
                    <span className="font-label-code">ID: {matrixModalUser.username}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMatrixModalUser(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              {/* Quick Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline">
                  <div className="text-[10.5px] text-on-surface-variant">مدیریت سازمانی</div>
                  <div className="text-xs font-bold text-primary mt-1">{matrixModalUser.management}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline">
                  <div className="text-[10.5px] text-on-surface-variant">واحد عملیاتی</div>
                  <div className="text-xs font-bold text-primary mt-1">{matrixModalUser.unit}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline">
                  <div className="text-[10.5px] text-on-surface-variant">سطح RBAC و محرمانگی</div>
                  <div className="font-label-code text-xs font-bold text-secondary mt-1">
                    {matrixModalUser.rbacLevel} ({matrixModalUser.securityLevel})
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline">
                  <div className="text-[10.5px] text-on-surface-variant">مجوزهای فعال ماتریس</div>
                  <div className="text-xs font-extrabold text-tertiary mt-1 tabular-nums">
                    {matrixModalUser.permissions.length.toLocaleString('fa-IR')} از{' '}
                    {RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')} مجوز
                  </div>
                </div>
              </div>

              {/* 4 ISO Standards Access Summary Cards */}
              <div>
                <h4 className="text-xs font-extrabold text-primary mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined !text-[17px] text-tertiary">verified</span>
                  خلاصه دسترسی بر تفکیک استانداردهای یکپارچه ISO
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getIsoSummary(matrixModalUser).map((iso) => (
                    <div
                      key={iso.code}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        iso.granted ? 'bg-emerald-50/50 border-emerald-200' : 'bg-surface-container-low/60 border-border-hairline'
                      }`}
                    >
                      <div>
                        <div className="font-label-code text-xs font-extrabold text-primary">{iso.code}</div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">{iso.title}</div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 ${
                          iso.granted ? 'bg-tertiary text-white' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {iso.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Audit Log */}
              <div>
                <h4 className="text-xs font-extrabold text-primary mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined !text-[17px] text-secondary">history</span>
                  آخرین رویدادهای ثبت شده (Security Audit Trail)
                </h4>
                <div className="border border-border-hairline rounded-xl divide-y divide-border-hairline overflow-hidden">
                  {matrixModalUser.auditLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-primary">{log.action}</div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          اقدام‌کننده: {log.actor} • <span className="font-label-code">{log.ipOrSource}</span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <span className="font-label-code text-[10.5px] font-semibold text-on-surface-variant block">
                          {log.timestamp}
                        </span>
                        <span className="text-[10.5px] font-bold text-tertiary">{log.statusText}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-border-hairline flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMatrixModalUser(null)}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                بستن پیش‌نمایش
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = matrixModalUser.id;
                  setMatrixModalUser(null);
                  onSelectUserForDetail(targetId);
                }}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[18px]">tune</span>
                مشاهده و ویرایش کامل ماتریس ۱۶گانه دسترسی‌ها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create / Edit User Modal */}
      {formModalMode && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <form
            onSubmit={handleFormSubmit}
            className="animate-modal-enter w-full max-w-2xl bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="px-6 py-4 bg-surface-container-low border-b border-border-hairline flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined !text-[20px]">
                    {formModalMode === 'create' ? 'person_add' : 'edit_note'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-primary">
                    {formModalMode === 'create'
                      ? 'افزودن سریع کاربر جدید به سامانه IMS'
                      : `ویرایش مشخصات: ${userForm.firstName} ${userForm.lastName}`}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    تطابق ساختار چارت سازمانی و امنیت ISO/IEC 27001
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormModalMode(null)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
              {formModalMode === 'create' && (
                <div className="p-3 rounded-xl bg-secondary-container/40 border border-secondary/20 flex items-center justify-between gap-2">
                  <span className="text-primary font-medium">
                    برای تنظیم همزمان گذرواژه، توکن امنیتی و ماتریس ۱۶گانه دسترسی‌ها می‌توانید از صفحه ثبت جامع استفاده کنید.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormModalMode(null);
                      onNavigate('users-create');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    فرم ثبت دستی جامع
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-primary mb-1">عنوان</label>
                  <select
                    value={userForm.honorific}
                    onChange={(e) => setUserForm({ ...userForm, honorific: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
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
                    placeholder="مثال: سهراب"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    placeholder="مثال: کریمی"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-primary mb-1">شماره پرسنلی *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={userForm.personnelCode}
                    onChange={(e) => setUserForm({ ...userForm, personnelCode: e.target.value })}
                    placeholder="AP-8012"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-label-code focus:bg-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">نام کاربری سامانه *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="s.karimi"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-label-code focus:bg-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">شماره تماس / داخلی</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      dir="ltr"
                      value={userForm.mobile}
                      onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                      placeholder="0917-xxx-xxxx"
                      className="w-full px-2.5 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-label-code focus:bg-white focus:outline-none focus:border-secondary"
                    />
                    <input
                      type="text"
                      value={userForm.extension}
                      onChange={(e) => setUserForm({ ...userForm, extension: e.target.value })}
                      placeholder="داخلی"
                      className="w-20 px-2.5 py-2 rounded-xl border border-border-hairline bg-surface-container-low text-center focus:bg-white focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-primary mb-1">مدیریت سازمانی</label>
                  <select
                    value={userForm.management}
                    onChange={(e) => {
                      const mgmt = e.target.value;
                      const units = ORG_UNITS_BY_MANAGEMENT[mgmt] || ['واحد ستادی'];
                      setUserForm({ ...userForm, management: mgmt, unit: units[0] });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
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
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  >
                    {(ORG_UNITS_BY_MANAGEMENT[userForm.management] || [userForm.unit]).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-primary mb-1">سمت سازمانی</label>
                  <input
                    type="text"
                    value={userForm.roleTitle}
                    onChange={(e) => setUserForm({ ...userForm, roleTitle: e.target.value })}
                    placeholder="کارشناس ارشد فرآیند"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">مدیر مستقیم</label>
                  <input
                    type="text"
                    value={userForm.directManager}
                    onChange={(e) => setUserForm({ ...userForm, directManager: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">سرپرست مستقیم</label>
                  <input
                    type="text"
                    value={userForm.directSupervisor}
                    onChange={(e) => setUserForm({ ...userForm, directSupervisor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-primary mb-1">سطح امنیتی RBAC</label>
                  <select
                    value={userForm.rbacLevel}
                    onChange={(e) => setUserForm({ ...userForm, rbacLevel: e.target.value as RbacLevel })}
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  >
                    <option value="L5 - Admin">L5 - Admin</option>
                    <option value="L4 - Supervisor">L4 - Supervisor</option>
                    <option value="L3 - Lead Auditor">L3 - Lead Auditor</option>
                    <option value="L2 - Specialist">L2 - Specialist</option>
                    <option value="L1 - Operator">L1 - Operator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">سطح محرمانگی</label>
                  <select
                    value={userForm.securityLevel}
                    onChange={(e) =>
                      setUserForm({ ...userForm, securityLevel: e.target.value as UserAccount['securityLevel'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  >
                    <option value="C1">C1 - عمومی</option>
                    <option value="C2">C2 - داخلی</option>
                    <option value="C3">C3 - محرمانه فنی</option>
                    <option value="C4">C4 - فوق‌محرمانه</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">وضعیت حساب</label>
                  <select
                    value={userForm.accountStatus}
                    onChange={(e) =>
                      setUserForm({ ...userForm, accountStatus: e.target.value as UserAccountStatus })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low focus:bg-white focus:outline-none focus:border-secondary"
                  >
                    <option value="فعال / برخط">فعال / برخط</option>
                    <option value="فعال">فعال</option>
                    <option value="فعال / دارای توکن امنیتی C3">فعال / توکن امنیتی C3</option>
                    <option value="انقضای رمز / موقت">انقضای رمز / موقت</option>
                    <option value="معلق / غیرفعال">معلق / غیرفعال</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-border-hairline cursor-pointer">
                <input
                  type="checkbox"
                  checked={userForm.mfaEnabled}
                  onChange={(e) => setUserForm({ ...userForm, mfaEnabled: e.target.checked })}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="font-bold text-primary">
                  الزام احراز هویت دو مرحله‌ای (2FA / توکن امنیتی) مطابق ISO/IEC 27001
                </span>
              </label>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-border-hairline flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setFormModalMode(null)}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {formModalMode === 'create' ? 'ثبت نهایی کاربر' : 'ذخیره تغییرات کاربر'}
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
        description={`آیا از حذف دائمی حساب کاربری «${confirmDeleteUser?.username ?? ''}» با کد پرسنلی ${
          confirmDeleteUser?.personnelCode ?? ''
        } اطمینان دارید؟ تمامی مجوزهای امضای الکترونیکی وی ابطال خواهد شد.`}
        confirmLabel="تایید و حذف کاربر"
        cancelLabel="انصراف"
        onConfirm={() => {
          if (confirmDeleteUser) {
            onDeleteUser(confirmDeleteUser.id);
            onNotify(
              'حساب کاربری حذف شد',
              `کاربر ${confirmDeleteUser.firstName} ${confirmDeleteUser.lastName} از سامانه حذف گردید.`,
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
