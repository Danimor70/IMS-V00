import React, { useMemo, useState } from 'react';
import { ImsDocument, NotificationItem, RouteId, UserAccount } from '../types/ims';

interface LayoutShellProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
  onLogout: () => void;
  cartableCount: number;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onReadNotification: (id: string, targetRoute: RouteId) => void;
  documents: ImsDocument[];
  users?: UserAccount[];
  currentUser?: UserAccount;
  isAdmin?: boolean;
  onSelectUserForDetail?: (id: string) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  children: React.ReactNode;
}

interface SidebarGroup {
  id: string;
  label: string;
  icon: string;
  route?: RouteId;
  badge?: number;
  children?: { label: string; route: RouteId }[];
}

export const LayoutShell: React.FC<LayoutShellProps> = ({
  currentRoute,
  onNavigate,
  onLogout,
  cartableCount,
  notifications,
  onMarkAllRead,
  onReadNotification,
  documents,
  users = [],
  currentUser,
  isAdmin = true,
  onSelectUserForDetail,
  onNotify,
  children,
}) => {
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    docs: true,
    processes: false,
    risks: false,
    audits: false,
    capa: false,
    kpi: false,
    hse: false,
    settings: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'approval' | 'capa'>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });

  const navGroups: SidebarGroup[] = useMemo(
    () => [
      { id: 'dashboard', label: 'داشبورد سیستم مدیریت', icon: 'dashboard', route: 'dashboard' },
      {
        id: 'cartable',
        label: 'کارتابل اقدامات و مصوبات',
        icon: 'assignment_turned_in',
        route: 'cartable',
        badge: cartableCount,
      },
      {
        id: 'docs',
        label: 'مدیریت مستندات و سوابق',
        icon: 'description',
        children: [
          { label: 'فهرست مستندات', route: 'documents-list' },
          { label: 'ثبت مستند جدید', route: 'documents-create' },
          { label: 'بازنگری مستندات', route: 'documents-revision' },
          { label: 'گردش تایید مستندات', route: 'documents-approval-workflow' },
          { label: 'توزیع و دسترسی به مستندات', route: 'documents-distribution' },
          { label: 'بایگانی و تاریخچه اسناد', route: 'documents-archive' },
        ],
      },
      {
        id: 'processes',
        label: 'مدیریت فرآیندها',
        icon: 'account_tree',
        children: [
          { label: 'شناسنامه فرآیندها', route: 'processes-profile' },
          { label: 'نقشه فرآیندها', route: 'processes-map' },
          { label: 'تعاملات فرآیندی', route: 'processes-interactions' },
        ],
      },
      {
        id: 'risks',
        label: 'مدیریت ریسک و فرصت',
        icon: 'warning',
        children: [
          { label: 'شناسایی ریسک‌ها', route: 'risks-identify' },
          { label: 'ارزیابی ریسک', route: 'risks-assess' },
          { label: 'برنامه‌های کنترلی', route: 'risks-controls' },
          { label: 'فرصت‌های بهبود', route: 'risks-opportunities' },
        ],
      },
      {
        id: 'audits',
        label: 'مدیریت ممیزی',
        icon: 'fact_check',
        children: [
          { label: 'برنامه ممیزی', route: 'audits-program' },
          { label: 'ممیزی داخلی', route: 'audits-internal' },
          { label: 'ممیزی خارجی', route: 'audits-external' },
          { label: 'چک‌لیست‌های ممیزی', route: 'audits-checklists' },
          { label: 'یافته‌های ممیزی', route: 'audits-findings' },
        ],
      },
      {
        id: 'capa',
        label: 'عدم انطباق و اقدامات اصلاحی (CAPA)',
        icon: 'troubleshoot',
        children: [
          { label: 'ثبت عدم انطباق', route: 'capa-nc' },
          { label: 'بررسی علل ریشه‌ای', route: 'capa-rca' },
          { label: 'اقدامات اصلاحی', route: 'capa-corrective' },
          { label: 'ارزیابی اثربخشی', route: 'capa-effectiveness' },
        ],
      },
      {
        id: 'kpi',
        label: 'مدیریت اهداف و شاخص‌ها',
        icon: 'insights',
        children: [
          { label: 'اهداف سازمانی', route: 'kpi-objectives' },
          { label: 'شاخص‌های عملکردی KPI', route: 'kpi-indicators' },
          { label: 'پایش و ارزیابی عملکرد', route: 'kpi-monitoring' },
        ],
      },
      { id: 'moc', label: 'مدیریت تغییرات (MOC)', icon: 'published_with_changes', route: 'moc' },
      {
        id: 'hse',
        label: 'مدیریت بهداشت، ایمنی و محیط زیست (HSE)',
        icon: 'health_and_safety',
        children: [
          { label: 'حوادث و شبه‌حوادث', route: 'hse-incidents' },
          { label: 'بازرسی‌های HSE', route: 'hse-inspections' },
          { label: 'اقدامات اصلاحی HSE', route: 'hse-actions' },
        ],
      },
      { id: 'training', label: 'مدیریت آموزش و شایستگی', icon: 'school', route: 'training' },
      { id: 'legal', label: 'الزامات قانونی و استانداردها', icon: 'gavel', route: 'legal' },
      { id: 'management-review', label: 'جلسات و بازنگری مدیریت', icon: 'groups', route: 'management-review' },
      { id: 'reports', label: 'گزارش‌ها و تحلیل‌های مدیریتی', icon: 'bar_chart', route: 'reports' },
      ...(isAdmin
        ? [
            {
              id: 'settings',
              label: 'مدیریت کاربران و تنظیمات',
              icon: 'admin_panel_settings',
              route: 'users-list' as RouteId,
            },
          ]
        : []),
    ],
    [cartableCount, isAdmin]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const docMatches = documents
      .filter((d) => d.code.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.unit.toLowerCase().includes(q))
      .slice(0, 4)
      .map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: `${d.code} • ${d.unit}`,
        route: (d.status === 'منسوخ' ? 'documents-archive' : 'documents-list') as RouteId,
        icon: 'description',
        userId: undefined as string | undefined,
      }));

    const userMatches = isAdmin
      ? users
          .filter(
            (u) =>
              u.firstName.toLowerCase().includes(q) ||
              u.lastName.toLowerCase().includes(q) ||
              `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
              u.personnelCode.toLowerCase().includes(q) ||
              u.username.toLowerCase().includes(q)
          )
          .slice(0, 4)
          .map((u) => ({
            id: u.id,
            title: `${u.honorific} ${u.firstName} ${u.lastName}`,
            subtitle: `${u.personnelCode} • ${u.roleTitle}`,
            route: 'users-detail' as RouteId,
            icon: 'badge',
            userId: u.id as string | undefined,
          }))
      : [];

    const routeMatches: { id: string; title: string; subtitle: string; route: RouteId; icon: string; userId?: string }[] = [];
    navGroups.forEach((g) => {
      if (g.route && g.label.toLowerCase().includes(q)) {
        routeMatches.push({ id: g.id, title: g.label, subtitle: 'ماژول سامانه', route: g.route, icon: g.icon });
      }
      g.children?.forEach((c) => {
        if (c.label.toLowerCase().includes(q)) {
          routeMatches.push({ id: c.route, title: c.label, subtitle: g.label, route: c.route, icon: g.icon });
        }
      });
    });

    return [...userMatches, ...docMatches, ...routeMatches.slice(0, 3)];
  }, [searchQuery, documents, users, navGroups, isAdmin]);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const filteredNotifs = notifications.filter((n) => notifFilter === 'all' || n.category === notifFilter);

  const toggleGroup = (id: string) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavClick = (route: RouteId) => {
    onNavigate(route);
    setSidebarOpenMobile(false);
    setSearchFocused(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdForm.current || pwdForm.next.length < 6 || pwdForm.next !== pwdForm.confirm) {
      onNotify('خطا در اعتبارسنجی رمز عبور', 'رمز جدید باید حداقل ۶ کاراکتر بوده و با تکرار آن مطابقت داشته باشد.', 'error');
      return;
    }
    setShowPasswordModal(false);
    setPwdForm({ current: '', next: '', confirm: '' });
    onNotify('رمز عبور با موفقیت تغییر یافت', 'توکن امنیتی نشست شما به‌روزرسانی شد.', 'success');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-l border-border-hairline select-none">
      {/* Brand Header */}
      <div className="h-[68px] px-4 border-b border-border-hairline flex items-center justify-between gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 min-w-0 text-right cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined !text-[22px]">precision_manufacturing</span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-primary truncate">پتروشیمی آپادانا</div>
              <div className="text-[10px] font-medium text-secondary truncate">سامانه یکپارچه مدیریت (IMS)</div>
            </div>
          )}
        </button>
        {!sidebarCollapsed && (
          <span className="font-label-code text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-container-low text-primary border border-border-hairline shrink-0">
            A-IMS
          </span>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2.5 space-y-1">
        {navGroups.map((group) => {
          const isSettingsRoute = ['settings', 'users-list', 'users-create', 'users-detail', 'access-levels'].includes(
            currentRoute
          );
          const isGroupActive =
            (group.route && currentRoute === group.route) ||
            (group.id === 'settings' && isSettingsRoute) ||
            (group.children?.some((c) => c.route === currentRoute) ?? false);
          const isExpanded =
            !!expandedGroups[group.id] ||
            (group.id === 'settings' && isSettingsRoute) ||
            (group.children?.some((c) => c.route === currentRoute) ?? false);

          if (!group.children) {
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => group.route && handleNavClick(group.route)}
                title={sidebarCollapsed ? group.label : undefined}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  isGroupActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined !text-[19px] shrink-0">{group.icon}</span>
                  {!sidebarCollapsed && <span className="truncate">{group.label}</span>}
                </div>
                {!sidebarCollapsed && typeof group.badge === 'number' && group.badge > 0 && (
                  <span
                    className={`font-label-code text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isGroupActive ? 'bg-white/20 text-white' : 'bg-secondary-container text-primary'
                    }`}
                  >
                    {group.badge.toLocaleString('fa-IR')}
                  </span>
                )}
              </button>
            );
          }

          return (
            <div key={group.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                title={sidebarCollapsed ? group.label : undefined}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  isGroupActive
                    ? 'bg-surface-container-low text-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined !text-[19px] shrink-0">{group.icon}</span>
                  {!sidebarCollapsed && <span className="truncate">{group.label}</span>}
                </div>
                {!sidebarCollapsed && (
                  <span
                    className={`material-symbols-outlined !text-[17px] transition-transform ${
                      isExpanded ? 'rotate-180 text-primary' : 'text-outline'
                    }`}
                  >
                    expand_more
                  </span>
                )}
              </button>

              {!sidebarCollapsed && isExpanded && (
                <div className="pr-4 mr-3 border-r border-border-hairline space-y-0.5 py-1">
                  {group.children.map((child) => {
                    const active =
                      currentRoute === child.route || (currentRoute === 'settings' && child.route === 'users-list');
                    return (
                      <button
                        key={child.route}
                        type="button"
                        onClick={() => handleNavClick(child.route)}
                        className={`w-full text-right px-3 py-2 rounded-lg text-[11.5px] transition-all cursor-pointer flex items-center justify-between ${
                          active
                            ? 'bg-primary/10 text-primary font-bold border-r-2 border-primary'
                            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary font-medium'
                        }`}
                      >
                        <span className="truncate">{child.label}</span>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-tertiary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Bottom Org Badge */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-border-hairline bg-surface-container-low/60">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              شبکه امن داخلی مجتمع
            </span>
            <span className="font-label-code font-semibold text-primary">v4.2</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface-canvas text-on-surface">
      {/* Desktop Right Sidebar (RTL) */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen z-30 transition-all duration-200 ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[272px]'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={() => setSidebarOpenMobile(false)}
          />
          <div className="relative w-[280px] max-w-[85vw] h-full z-10 shadow-2xl">{renderSidebarContent()}</div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-20 h-[68px] bg-white/95 backdrop-blur-md border-b border-border-hairline px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpenMobile(true)}
              className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
              aria-label="منو"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden lg:flex p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری'}
            >
              <span className="material-symbols-outlined">{sidebarCollapsed ? 'menu_open' : 'menu'}</span>
            </button>

            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-md">
              <div className="flex items-center bg-surface-container-low border border-border-hairline rounded-full px-3.5 py-2 focus-within:border-secondary focus-within:bg-white transition-all">
                <span className="material-symbols-outlined !text-[18px] text-outline ml-2">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در مستندات، کد مدرک و فرآیندها..."
                  className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-outline hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-[16px]">close</span>
                  </button>
                )}
              </div>

              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl border border-border-hairline shadow-[0px_18px_40px_-10px_rgba(20,44,67,0.18)] overflow-hidden z-40">
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-border-hairline/60">
                      {searchResults.map((res) => (
                        <button
                          key={res.id}
                          type="button"
                          onMouseDown={() => {
                            if (res.userId && onSelectUserForDetail) {
                              onSelectUserForDetail(res.userId);
                              setSidebarOpenMobile(false);
                              setSearchFocused(false);
                            } else {
                              handleNavClick(res.route);
                            }
                          }}
                          className="w-full text-right px-4 py-2.5 hover:bg-surface-container-low flex items-center gap-3 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined !text-[18px] text-secondary">{res.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-primary truncate">{res.title}</p>
                            <p className="text-[11px] text-on-surface-variant truncate">{res.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-on-surface-variant">
                      موردی با عبارت «{searchQuery}» یافت نشد.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Left Controls (Help, Notifications, User Profile) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
              title="راهنمای استاندارد IMS"
            >
              <span className="material-symbols-outlined !text-[20px]">help_outline</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications((v) => !v);
                  setShowProfileMenu(false);
                }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                title="اعلان‌های سیستم"
              >
                <span className="material-symbols-outlined !text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-critical-hse ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-border-hairline shadow-[0px_18px_40px_-10px_rgba(20,44,67,0.2)] z-40 overflow-hidden animate-modal-enter">
                  <div className="px-4 py-3 border-b border-border-hairline flex items-center justify-between bg-surface-container-low/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">مرکز اعلان‌های IMS</span>
                      {unreadCount > 0 && (
                        <span className="font-label-code text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-critical-hse text-white">
                          {unreadCount.toLocaleString('fa-IR')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="text-[11px] font-semibold text-secondary hover:underline cursor-pointer"
                    >
                      علامت‌گذاری همه به‌عنوان خوانده‌شده
                    </button>
                  </div>

                  <div className="px-3 pt-2 pb-1.5 border-b border-border-hairline flex gap-1.5">
                    {[
                      { id: 'all', label: 'همه' },
                      { id: 'approval', label: 'تاییدیه‌ها' },
                      { id: 'capa', label: 'عدم انطباق و HSE' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNotifFilter(t.id as 'all' | 'approval' | 'capa')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          notifFilter === t.id
                            ? 'bg-primary text-white'
                            : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-border-hairline/60">
                    {filteredNotifs.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          onReadNotification(n.id, n.targetRoute);
                          setShowNotifications(false);
                        }}
                        className={`w-full text-right p-3.5 hover:bg-surface-container-low transition-colors flex items-start gap-2.5 cursor-pointer ${
                          n.unread ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            n.unread ? 'bg-secondary' : 'bg-outline-variant'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-primary leading-5">{n.title}</p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-4">{n.body}</p>
                          <span className="text-[10px] text-outline mt-1 inline-block">{n.time}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-border-hairline hidden sm:block" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((v) => !v);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2.5 py-1 px-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-primary leading-4">
                    {currentUser ? `${currentUser.honorific} ${currentUser.firstName} ${currentUser.lastName}` : 'مهندس مهران کاظمی'}
                  </div>
                  <div className="text-[10.5px] text-on-surface-variant leading-4">
                    {currentUser ? currentUser.roleTitle : 'مدیر تضمین کیفیت و IMS'}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined !text-[19px]">person</span>
                </div>
                <span className="material-symbols-outlined !text-[16px] text-outline hidden sm:inline">
                  expand_more
                </span>
              </button>

              {showProfileMenu && (
                <div className="absolute left-0 top-full mt-2 w-60 bg-white rounded-2xl border border-border-hairline shadow-[0px_18px_40px_-10px_rgba(20,44,67,0.2)] py-2 z-40 animate-modal-enter">
                  <div className="px-4 py-2.5 border-b border-border-hairline sm:hidden">
                    <div className="text-xs font-bold text-primary">
                      {currentUser ? `${currentUser.honorific} ${currentUser.firstName} ${currentUser.lastName}` : 'مهندس مهران کاظمی'}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      {currentUser ? currentUser.roleTitle : 'مدیر تضمین کیفیت و IMS'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowAccountModal(true);
                    }}
                    className="w-full text-right px-4 py-2.5 text-xs font-medium text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-[18px] text-secondary">badge</span>
                    مشاهده حساب کاربری
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full text-right px-4 py-2.5 text-xs font-medium text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-[18px] text-secondary">vpn_key</span>
                    تغییر رمز عبور
                  </button>
                  <div className="my-1 border-t border-border-hairline" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-right px-4 py-2.5 text-xs font-bold text-critical-hse hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-[18px]">logout</span>
                    خروج از سامانه
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto">{children}</main>

        {/* System Footer */}
        <footer className="mt-auto bg-white border-t border-border-hairline px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined !text-[16px] text-tertiary">verified_user</span>
            <span>سامانه جامع مدیریت یکپارچه پتروشیمی آپادانا خلیج فارس (سهامی عام)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-label-code font-semibold text-primary">IMS Version 3.4.0</span>
            <span>کلیه حقوق مادی و معنوی محفوظ است © ۱۴۰۳</span>
          </div>
        </footer>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-lg bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined">menu_book</span>
                <h3 className="text-sm font-bold">راهنمای استانداردها و کدگذاری A-IMS</h3>
              </div>
              <button type="button" onClick={() => setShowHelpModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs text-on-surface-variant leading-6">
              <p>
                این سامانه بر اساس الزامات یکپارچه استانداردهای{' '}
                <strong className="text-primary font-label-code">ISO 9001:2015</strong>،{' '}
                <strong className="text-primary font-label-code">ISO 14001:2015</strong>،{' '}
                <strong className="text-primary font-label-code">ISO 45001:2018</strong> و{' '}
                <strong className="text-primary font-label-code">ISO 50001:2018</strong> پیاده‌سازی شده است.
              </p>
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-hairline space-y-1.5">
                <div className="font-bold text-primary">الگوی استاندارد کدگذاری مستندات:</div>
                <div className="font-label-code text-secondary font-semibold" dir="ltr">
                  [TYPE]-[DEPT]-[UNIT]-[SERIAL]-[REV] → e.g. PR-MIS-STP-02-00
                </div>
              </div>
              <p>
                جهت ارتباط با میز خدمت مهندسی سیستم‌ها و تضمین کیفیت با داخلی <span className="font-label-code font-bold text-primary">۲۴۱۹ - ۲۴۲۰</span> تماس بگیرید.
              </p>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="animate-modal-enter w-full max-w-md bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-low border-b border-border-hairline flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">مشخصات حساب کاربری پرسنلی</h3>
              <button type="button" onClick={() => setShowAccountModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-border-hairline">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                  {currentUser ? `${currentUser.firstName.charAt(0)}.${currentUser.lastName.charAt(0)}` : 'م.ک'}
                </div>
                <div>
                  <div className="text-sm font-bold text-primary">
                    {currentUser ? `${currentUser.honorific} ${currentUser.firstName} ${currentUser.lastName}` : 'مهندس مهران کاظمی'}
                  </div>
                  <div className="text-on-surface-variant">
                    {currentUser ? currentUser.roleTitle : 'مدیر تضمین کیفیت و نماینده مدیریت (IMS)'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-outline block">کد پرسنلی</span>
                  <span className="font-label-code font-bold text-primary">
                    {currentUser?.personnelCode || 'AP-4082'}
                  </span>
                </div>
                <div>
                  <span className="text-outline block">سطح محرمانگی و نقش</span>
                  <span className="font-bold text-tertiary">
                    {currentUser ? `${currentUser.securityLevel} (${currentUser.rbacLevel})` : 'C4 (L5 - Admin)'}
                  </span>
                </div>
                <div>
                  <span className="text-outline block">واحد سازمانی</span>
                  <span className="font-semibold text-on-surface">
                    {currentUser?.unit || 'تضمین کیفیت و مهندسی سیستم‌ها'}
                  </span>
                </div>
                <div>
                  <span className="text-outline block">امضای سخت‌افزاری</span>
                  <span className="font-semibold text-tertiary">
                    {currentUser?.hardwareTokenType || 'توکن فعال PKI'}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end">
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="px-5 py-2 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handlePasswordSubmit}
            className="animate-modal-enter w-full max-w-md bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-surface-container-low border-b border-border-hairline flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">تغییر کلمه عبور سامانه A-IMS</h3>
              <button type="button" onClick={() => setShowPasswordModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">کلمه عبور فعلی</label>
                <input
                  type="password"
                  value={pwdForm.current}
                  onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border-hairline text-xs focus:outline-none focus:border-secondary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">کلمه عبور جدید</label>
                <input
                  type="password"
                  value={pwdForm.next}
                  onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border-hairline text-xs focus:outline-none focus:border-secondary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">تکرار کلمه عبور جدید</label>
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border-hairline text-xs focus:outline-none focus:border-secondary"
                  required
                />
              </div>
            </div>
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded-lg border border-border-hairline text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer">
                ثبت کلمه عبور جدید
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
