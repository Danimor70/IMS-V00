import React, { useMemo, useState } from 'react';
import {
  ORG_MANAGEMENTS,
  ORG_UNITS_BY_MANAGEMENT,
  RBAC_GROUPS,
  RBAC_PERMISSION_DEFS,
  ROLE_PERMISSION_PRESETS,
} from '../data/imsData';
import { RbacLevel, RouteId, UserAccount, UserAccountStatus } from '../types/ims';

interface UserCreatePageProps {
  users: UserAccount[];
  onAddUser: (user: UserAccount) => void;
  onSelectUserForDetail: (id: string) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const SITE_OPTIONS = [
  'عسلویه - فاز ۲ (سایت متانول)',
  'عسلویه - فاز ۱ (یوتیلیتی و بخار)',
  'عسلویه - ستاد مرکزی',
  'اسکله صادراتی خلیج فارس',
];

export const UserCreatePage: React.FC<UserCreatePageProps> = ({
  users,
  onAddUser,
  onSelectUserForDetail,
  onNavigate,
  onNotify,
}) => {
  const [honorific, setHonorific] = useState('مهندس');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [personnelCode, setPersonnelCode] = useState(() => `AP-${Math.floor(8100 + Math.random() * 900)}`);
  const [mobile, setMobile] = useState('0917-');
  const [extension, setExtension] = useState('۲۴۵۰');
  const [username, setUsername] = useState('');

  const [management, setManagement] = useState(ORG_MANAGEMENTS[1]);
  const [unit, setUnit] = useState(ORG_UNITS_BY_MANAGEMENT[ORG_MANAGEMENTS[1]][0]);
  const [roleTitle, setRoleTitle] = useState('');
  const [siteLocation, setSiteLocation] = useState(SITE_OPTIONS[0]);
  const [directManager, setDirectManager] = useState('مهندس حمید دهداری (معاون فنی)');
  const [directSupervisor, setDirectSupervisor] = useState('مهندس علی رضوانی');

  const [selectedPreset, setSelectedPreset] = useState<string>('specialist');
  const [rbacLevel, setRbacLevel] = useState<RbacLevel>('L2 - Specialist');
  const [securityLevel, setSecurityLevel] = useState<UserAccount['securityLevel']>('C2');
  const [accountStatus, setAccountStatus] = useState<UserAccountStatus>('فعال / برخط');
  const [ptwPrivilege, setPtwPrivilege] = useState('مشاهده‌گر پروانه‌های کار واحد');

  const [password, setPassword] = useState('Apadana@1403!');
  const [showPassword, setShowPassword] = useState(false);
  const [hardwareTokenType, setHardwareTokenType] = useState('احراز هویت دو مرحله‌ای پیامکی (OTP) + رمز عبور');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [otWifiAllowed, setOtWifiAllowed] = useState(false);

  const [permissions, setPermissions] = useState<string[]>(ROLE_PERMISSION_PRESETS.specialist.permissions);

  const isDuplicatePersonnel = useMemo(
    () =>
      personnelCode.trim() !== '' &&
      users.some((u) => u.personnelCode.toLowerCase() === personnelCode.trim().toLowerCase()),
    [users, personnelCode]
  );

  const isDuplicateUsername = useMemo(
    () =>
      username.trim() !== '' &&
      users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase()),
    [users, username]
  );

  const handleApplyPreset = (key: string) => {
    const preset = ROLE_PERMISSION_PRESETS[key];
    if (!preset) return;
    setSelectedPreset(key);
    setPermissions(preset.permissions);
    setRbacLevel(preset.rbacLevel);
    setSecurityLevel(preset.securityLevel);
    if (key === 'admin' || key === 'supervisor') {
      setPtwPrivilege('صادرکننده مجاز کار گرم و سرد');
      setOtWifiAllowed(true);
    } else if (key === 'auditor') {
      setPtwPrivilege('تاییدکننده ایمنی و ممیزی HSE');
    } else {
      setPtwPrivilege('مشاهده‌گر پروانه‌های کار واحد');
    }
  };

  const togglePermission = (id: string) => {
    setPermissions((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'Ap#';
    for (let i = 0; i < 9; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(res);
    setShowPassword(true);
    onNotify('گذرواژه ایمن تولید شد', 'رمز مطابق استاندارد NIST 800-63B ایجاد گردید.', 'info');
  };

  const handleGenerateUsername = () => {
    const cleanCode = personnelCode.replace(/[^0-9]/g, '') || '101';
    const next = `u.${cleanCode}`;
    setUsername(next);
  };

  const handleResetForm = () => {
    setFirstName('');
    setLastName('');
    setPersonnelCode(`AP-${Math.floor(8100 + Math.random() * 900)}`);
    setMobile('0917-');
    setExtension('۲۴۵۰');
    setUsername('');
    setRoleTitle('');
    handleApplyPreset('specialist');
    onNotify('فرم بازنشانی شد', 'فیلدها به حالت اولیه بازگشتند.', 'info');
  };

  const submitUser = (openProfileAfter: boolean) => {
    if (!firstName.trim() || !lastName.trim() || !personnelCode.trim() || !username.trim() || !roleTitle.trim()) {
      onNotify(
        'اطلاعات ناقص است',
        'لطفاً نام، نام خانوادگی، شماره پرسنلی، نام کاربری و سمت سازمانی را تکمیل نمایید.',
        'error'
      );
      return;
    }

    if (isDuplicatePersonnel || isDuplicateUsername) {
      onNotify(
        'شناسه تکراری شناسایی شد',
        'شماره پرسنلی یا نام کاربری واردشده قبلاً در سامانه ثبت شده است.',
        'error'
      );
      return;
    }

    if (password.length < 8) {
      onNotify('گذرواژه ضعیف است', 'گذرواژه اولیه باید حداقل ۸ کاراکتر باشد.', 'error');
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      honorific,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      personnelCode: personnelCode.trim().toUpperCase(),
      mobile: mobile.trim() || '0917-000-0000',
      extension: extension.trim() || '۲۱۰۰',
      management,
      unit,
      roleTitle: roleTitle.trim(),
      directManager: directManager.trim() || '-',
      directSupervisor: directSupervisor.trim() || '-',
      username: username.trim().toLowerCase(),
      securityBadge: forcePasswordChange ? 'تغییر رمز' : mfaEnabled ? `${securityLevel} + MFA` : 'رمز ایمن',
      securityLevel,
      rbacLevel,
      accountStatus,
      siteLocation,
      ptwPrivilege: ptwPrivilege.trim(),
      digitalSignatureValidity:
        securityLevel === 'C4' || securityLevel === 'C3'
          ? 'معتبر تا ۱۴۰۴/۱۲/۲۹ (سطح ۳)'
          : 'معتبر تا ۱۴۰۴/۰۸/۳۰ (سطح ۲)',
      lastAccessReview: '۱۴۰۳/۰۸/۲۴ توسط مهران کاظمی',
      mfaEnabled,
      forcePasswordChange,
      otWifiAllowed,
      hardwareTokenType,
      permissions,
      auditLogs: [
        {
          id: `log-reg-${Date.now()}`,
          timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
          action: `ثبت دستی کاربر جدید در سامانه IMS با ${permissions.length.toLocaleString('fa-IR')} مجوز دسترسی فعال`,
          actor: 'مهران کاظمی (مدیر IMS)',
          actorRole: 'مدیر تضمین کیفیت و نماینده مدیریت IMS',
          ipOrSource: '10.14.80.12 [ADMIN-MANUAL-REG]',
          statusText: 'امضای دیجیتال معتبر',
          statusTone: 'tertiary',
        },
      ],
    };

    onAddUser(newUser);
    onNotify(
      `کاربر ${newUser.honorific} ${newUser.firstName} ${newUser.lastName} با موفقیت ثبت شد`,
      `حساب کاربری ${newUser.username} (${newUser.personnelCode}) در ساختار ${newUser.unit} فعال گردید.`,
      'success'
    );

    if (openProfileAfter) {
      onSelectUserForDetail(newUser.id);
    } else {
      onNavigate('users-list');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb & Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onNavigate('users-list')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-border-hairline hover:bg-surface-container-low text-primary font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[17px]">arrow_forward</span>
            بازگشت به فهرست کاربران
          </button>
          <span className="text-outline">/</span>
          <span className="font-bold text-secondary">ثبت دستی کاربر جدید</span>
        </div>

        <span className="font-label-code px-3 py-1 rounded-full bg-white border border-border-hairline text-[11px] font-bold text-primary">
          FORM-IMS-USR-01 • ISO/IEC 27001 A.9.2.1
        </span>
      </div>

      {/* Hero Summary Banner */}
      <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] flex flex-col items-center justify-center text-center gap-5">
        <div className="space-y-2 max-w-3xl mx-auto text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold text-primary">
            فرم ثبت دستی، احراز صلاحیت و پیکربندی کاربر جدید در سامانه IMS
          </h1>
          <p className="text-xs sm:text-[13px] text-on-surface-variant leading-6">
            مشخصات فردی، کد پرسنلی پتروشیمی آپادانا، زنجیره گزارش‌دهی مستقیم، الزامات رمز عبور ISO 27001 و سطوح دسترسی ۱۶گانه RBAC کاربر جدید را به صورت کامل تعریف نمایید.
          </p>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-border-hairline min-w-[290px] space-y-2.5 shrink-0 flex flex-col items-center text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-extrabold text-sm shrink-0">
              {firstName ? firstName.charAt(0) : 'ک'}.{lastName ? lastName.charAt(0) : 'ج'}
            </div>
            <div className="min-w-0 text-center">
              <div className="text-xs font-extrabold text-primary truncate">
                {firstName || lastName ? `${honorific} ${firstName} ${lastName}` : 'پیش‌نمایش پروفایل کاربر'}
              </div>
              <div className="font-label-code text-[11px] text-secondary font-bold">
                {personnelCode || 'AP-XXXX'} • {username || 'username'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 border-t border-border-hairline w-full text-[11px]">
            <span className="font-label-code font-bold text-primary">{rbacLevel} ({securityLevel})</span>
            <span className="font-bold text-tertiary tabular-nums">
              {permissions.length.toLocaleString('fa-IR')} از {RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')} مجوز فعال
            </span>
          </div>
        </div>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitUser(false);
        }}
        className="space-y-6"
      >
        {/* Section 1: Identity & Contact */}
        <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border-hairline">
            <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-extrabold">
              ۱
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-primary">اطلاعات هویتی، پرسنلی و ارتباطی</h2>
              <p className="text-[11px] text-on-surface-variant">مشخصات ثبت شده در کارگزینی و شبکه داخلی پتروشیمی آپادانا</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-primary mb-1.5">عنوان افتخاری</label>
              <select
                value={honorific}
                onChange={(e) => setHonorific(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                <option value="مهندس">مهندس</option>
                <option value="دکتر">دکتر</option>
                <option value="آقای">آقای</option>
                <option value="خانم">خانم</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">نام *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="مثال: فرهاد"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">نام خانوادگی *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="مثال: محمدی"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">شماره پرسنلی *</label>
              <input
                type="text"
                required
                dir="ltr"
                value={personnelCode}
                onChange={(e) => setPersonnelCode(e.target.value)}
                placeholder="AP-8140"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border font-label-code focus:bg-white focus:outline-none ${
                  isDuplicatePersonnel ? 'border-critical-hse text-critical-hse' : 'border-border-hairline focus:border-secondary'
                }`}
              />
              {isDuplicatePersonnel && (
                <span className="text-[10.5px] text-critical-hse font-bold mt-1 block">
                  این کد پرسنلی قبلاً ثبت شده است.
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">نام کاربری سامانه (Active Directory) *</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="f.mohammadi"
                  className={`flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border font-label-code focus:bg-white focus:outline-none ${
                    isDuplicateUsername ? 'border-critical-hse text-critical-hse' : 'border-border-hairline focus:border-secondary'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleGenerateUsername}
                  title="پیشنهاد خودکار نام کاربری"
                  className="px-3 rounded-xl border border-border-hairline bg-surface-container-low hover:bg-surface-container text-secondary font-bold cursor-pointer"
                >
                  پیشنهاد
                </button>
              </div>
              {isDuplicateUsername && (
                <span className="text-[10.5px] text-critical-hse font-bold mt-1 block">
                  این نام کاربری تکراری است.
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">شماره تلفن همراه (جهت OTP)</label>
              <input
                type="text"
                dir="ltr"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="0917-xxx-xxxx"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline font-label-code focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">تلفن داخلی مجتمع</label>
              <input
                type="text"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                placeholder="۲۴۵۰"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">موقعیت مکانی / سایت</label>
              <select
                value={siteLocation}
                onChange={(e) => setSiteLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                {SITE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 2: Organizational Structure & Chain of Command */}
        <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border-hairline">
            <span className="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center text-xs font-extrabold">
              ۲
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-primary">جایگاه سازمانی، زنجیره گزارش‌دهی و محرمانگی</h2>
              <p className="text-[11px] text-on-surface-variant">تعیین واحد مستقر، مدیر مستقیم، تاییدکننده کارتابل و سطح محرمانگی اسناد</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-primary mb-1.5">مدیریت سازمانی متولی *</label>
              <select
                value={management}
                onChange={(e) => {
                  const mgmt = e.target.value;
                  const units = ORG_UNITS_BY_MANAGEMENT[mgmt] || ['واحد ستادی'];
                  setManagement(mgmt);
                  setUnit(units[0]);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                {ORG_MANAGEMENTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">واحد عملیاتی / فرآیندی *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                {(ORG_UNITS_BY_MANAGEMENT[management] || [unit]).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">سمت سازمانی دقیق *</label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="مثال: کارشناس ارشد کنترل فرآیند متانول"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">مدیر مستقیم (سطح ۱)</label>
              <input
                type="text"
                value={directManager}
                onChange={(e) => setDirectManager(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">سرپرست مستقیم</label>
              <input
                type="text"
                value={directSupervisor}
                onChange={(e) => setDirectSupervisor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">مجوز پروانه کار (PTW)</label>
              <input
                type="text"
                value={ptwPrivilege}
                onChange={(e) => setPtwPrivilege(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">سطح محرمانگی اسناد (ISO 27001)</label>
              <select
                value={securityLevel}
                onChange={(e) => setSecurityLevel(e.target.value as UserAccount['securityLevel'])}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                <option value="C1">C1 - عمومی (دسترسی پایه)</option>
                <option value="C2">C2 - داخلی سازمانی</option>
                <option value="C3">C3 - محرمانه فنی و عملیاتی</option>
                <option value="C4">C4 - فوق‌محرمانه راهبری</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">سطح امنیتی RBAC</label>
              <select
                value={rbacLevel}
                onChange={(e) => setRbacLevel(e.target.value as RbacLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                <option value="L5 - Admin">L5 - Admin (راهبر سیستم)</option>
                <option value="L4 - Supervisor">L4 - Supervisor (رئیس / سرپرست)</option>
                <option value="L3 - Lead Auditor">L3 - Lead Auditor (سرممیز)</option>
                <option value="L2 - Specialist">L2 - Specialist (کارشناس)</option>
                <option value="L1 - Operator">L1 - Operator (اپراتور)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">وضعیت اولیه حساب</label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value as UserAccountStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                <option value="فعال / برخط">فعال / برخط</option>
                <option value="فعال">فعال</option>
                <option value="فعال / دارای توکن امنیتی C3">فعال / دارای توکن امنیتی C3</option>
                <option value="انقضای رمز / موقت">انقضای رمز / موقت (نیازمند تغییر رمز)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Password & ISO 27001 Security Controls */}
        <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border-hairline">
            <span className="w-8 h-8 rounded-xl bg-tertiary text-white flex items-center justify-center text-xs font-extrabold">
              ۳
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-primary">اعتبارسنجی، گذرواژه اولیه و الزامات امنیت سایبری (ISO 27001)</h2>
              <p className="text-[11px] text-on-surface-variant">تعیین رمز موقت مطابق NIST 800-63B و نوع توکن سخت‌افزاری امضای الکترونیکی</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-primary mb-1.5">گذرواژه اولیه سامانه *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline font-label-code focus:bg-white focus:outline-none focus:border-secondary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border-hairline text-primary font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined !text-[17px] text-secondary">password</span>
                  تولید رمز ایمن
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1.5">روش احراز هویت و توکن امضای دیجیتال</label>
              <select
                value={hardwareTokenType}
                onChange={(e) => setHardwareTokenType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-hairline focus:bg-white focus:outline-none focus:border-secondary"
              >
                <option value="احراز هویت دو مرحله‌ای پیامکی (OTP) + رمز عبور">
                  احراز هویت دو مرحله‌ای پیامکی (OTP) + رمز عبور
                </option>
                <option value="توکن سخت‌افزاری C3 + تایید پیامکی OTP">
                  توکن سخت‌افزاری C3 + تایید پیامکی OTP
                </option>
                <option value="کلید سخت‌افزاری FIDO2 / YubiKey">کلید سخت‌افزاری FIDO2 / YubiKey</option>
                <option value="گذرواژه پیچیده NIST بدون توکن سخت‌افزاری">
                  گذرواژه پیچیده NIST بدون توکن سخت‌افزاری
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
            <label className="p-3.5 rounded-xl border border-border-hairline bg-surface-container-low/50 flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={forcePasswordChange}
                onChange={(e) => setForcePasswordChange(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
              <div>
                <div className="font-bold text-primary">تغییر اجباری رمز در اولین ورود</div>
                <div className="text-[10.5px] text-on-surface-variant">انطباق با خط‌مشی رمزنگاری ISO 27001</div>
              </div>
            </label>

            <label className="p-3.5 rounded-xl border border-border-hairline bg-surface-container-low/50 flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={mfaEnabled}
                onChange={(e) => setMfaEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
              <div>
                <div className="font-bold text-primary">احراز هویت دو مرحله‌ای (2FA / OTP)</div>
                <div className="text-[10.5px] text-on-surface-variant">ارسال کد تایید یک‌بارمصرف هنگام ورود</div>
              </div>
            </label>

            <label className="p-3.5 rounded-xl border border-border-hairline bg-surface-container-low/50 flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={otWifiAllowed}
                onChange={(e) => setOtWifiAllowed(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
              <div>
                <div className="font-bold text-primary">مجوز اتصال در شبکه صنعتی OT/IT</div>
                <div className="text-[10.5px] text-on-surface-variant">دسترسی به اتاق کنترل و تبلت‌های سایت</div>
              </div>
            </label>
          </div>
        </section>

        {/* Section 4: Role Preset & Initial 16-Permission Matrix */}
        <section className="bg-white rounded-2xl border border-border-hairline p-6 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border-hairline">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-extrabold">
                ۴
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-primary">الگوی نقش سازمانی و تخصیص دسترسی‌های ۱۶گانه (RBAC)</h2>
                <p className="text-[11px] text-on-surface-variant">
                  یک الگوی آماده نقش انتخاب کنید و سپس چک‌باکس مجوزها را به دلخواه تنظیم نمایید.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-tertiary text-xs font-extrabold tabular-nums">
              {permissions.length.toLocaleString('fa-IR')} از {RBAC_PERMISSION_DEFS.length.toLocaleString('fa-IR')} دسترسی انتخاب‌شده
            </span>
          </div>

          {/* Preset Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {Object.entries(ROLE_PERMISSION_PRESETS).map(([key, preset]) => {
              const active = selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    active
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-container-low/60 border-border-hairline hover:bg-surface-container-low text-primary'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold leading-5">{preset.label}</div>
                    <div
                      className={`text-[10.5px] mt-1 leading-4 ${
                        active ? 'text-white/80' : 'text-on-surface-variant'
                      }`}
                    >
                      {preset.description}
                    </div>
                  </div>
                  <div
                    className={`font-label-code text-[10px] font-bold pt-1 ${
                      active ? 'text-tertiary-fixed' : 'text-secondary'
                    }`}
                  >
                    {preset.permissions.length.toLocaleString('fa-IR')} مجوز پیش‌فرض
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3 Groups Checkboxes */}
          <div className="space-y-4">
            {RBAC_GROUPS.map((group) => {
              const groupPerms = RBAC_PERMISSION_DEFS.filter((p) => p.groupId === group.id);
              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-border-hairline bg-surface-container-low/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-primary">{group.title}</h3>
                    <span className="text-[11px] font-bold text-secondary tabular-nums">
                      {groupPerms.filter((p) => permissions.includes(p.id)).length.toLocaleString('fa-IR')} /{' '}
                      {groupPerms.length.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {groupPerms.map((perm) => {
                      const checked = permissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                            checked ? 'bg-white border-primary/40 shadow-2xs' : 'bg-white/65 border-border-hairline'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(perm.id)}
                            className="mt-0.5 w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-primary">{perm.title}</div>
                            <div className="text-[10.5px] text-on-surface-variant mt-0.5">{perm.description}</div>
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

        {/* Footer Actions */}
        <div className="bg-white rounded-2xl border border-border-hairline p-5 shadow-[0px_10px_30px_-5px_rgba(20,44,67,0.05)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-tertiary !text-[18px]">verified_user</span>
            پس از ثبت، رویداد ایجاد حساب در لاگ امنیتی ISO/IEC 27001 ثبت خواهد شد.
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-on-surface-variant cursor-pointer"
            >
              پاک کردن فرم
            </button>
            <button
              type="button"
              onClick={() => submitUser(true)}
              className="px-4 py-2.5 rounded-xl border border-secondary/30 bg-secondary-container/40 hover:bg-secondary-container text-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[18px] text-secondary">badge</span>
              ثبت و مشاهده پروفایل دسترسی
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[18px]">check_circle</span>
              ثبت کاربر و نمایش در فهرست
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
