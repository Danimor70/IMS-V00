import React, { useMemo, useState } from 'react';
import {
  AccessLevelDefinition,
  OrgAccessAssignment,
  RouteId,
  UserAccount,
} from '../types/ims';

interface AccessLevelsPageProps {
  accessLevels: AccessLevelDefinition[];
  orgAssignments: OrgAccessAssignment[];
  users: UserAccount[];
  onSaveAccessLevel: (level: AccessLevelDefinition, isNew: boolean) => void;
  onAssignUsersLevel: (userIds: string[], levelId: string) => void;
  onAssignOrgEntityLevel: (assignmentId: string, levelId: string) => void;
  onAddOrgEntity: (entity: OrgAccessAssignment) => void;
  onCascadeOrgLevelToUsers: (entityType: 'management' | 'unit', entityName: string, levelId: string) => void;
  onSelectUserForDetail: (userId: string) => void;
  onNavigate: (route: RouteId) => void;
  onNotify: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  embedded?: boolean;
}

type EntityTab = 'users' | 'managements' | 'units' | 'organizations';

const getUserEffectiveLevelId = (u: UserAccount, levels: AccessLevelDefinition[]): string => {
  if (u.accessLevelId && levels.some((l) => l.id === u.accessLevelId)) {
    return u.accessLevelId;
  }
  const byTier = levels.find((l) => l.code === u.securityLevel || l.baseTier === u.securityLevel);
  return byTier?.id || levels[0]?.id || 'lvl-c1';
};

const TONE_BADGE_MAP: Record<AccessLevelDefinition['tone'], string> = {
  tertiary: 'bg-emerald-50 text-tertiary border-emerald-200',
  secondary: 'bg-sky-50 text-secondary border-sky-200',
  warning: 'bg-amber-50 text-warning-capa border-amber-200',
  critical: 'bg-red-50 text-critical-hse border-red-200',
  primary: 'bg-slate-100 text-primary border-slate-300',
};

export const AccessLevelsPage: React.FC<AccessLevelsPageProps> = ({
  accessLevels,
  orgAssignments,
  users,
  onSaveAccessLevel,
  onAssignUsersLevel,
  onAssignOrgEntityLevel,
  onAddOrgEntity,
  onCascadeOrgLevelToUsers,
  onSelectUserForDetail,
  onNavigate,
  onNotify,
  embedded = false,
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>(accessLevels[0]?.id || 'lvl-c1');
  const [entityTab, setEntityTab] = useState<EntityTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [unitParentFilter, setUnitParentFilter] = useState('all');

  // Bulk user selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkTargetLevelId, setBulkTargetLevelId] = useState<string>(accessLevels[0]?.id || 'lvl-c1');

  // Create/Edit Access Level Modal
  const [levelModal, setLevelModal] = useState<{
    open: boolean;
    isNew: boolean;
    draft: AccessLevelDefinition;
  }>({
    open: false,
    isNew: true,
    draft: {
      id: '',
      code: 'C5',
      name: '',
      baseTier: 'C3',
      description: '',
      tone: 'primary',
      allowPublicDocs: true,
      allowControlledPrint: true,
      requiresMfa: true,
    },
  });

  // Add Organization / Management / Unit Modal
  const [addEntityModal, setAddEntityModal] = useState<{
    open: boolean;
    entityType: 'management' | 'unit' | 'organization';
    name: string;
    parentName: string;
    accessLevelId: string;
  }>({
    open: false,
    entityType: 'organization',
    name: '',
    parentName: '',
    accessLevelId: accessLevels[0]?.id || 'lvl-c1',
  });

  const selectedLevel = useMemo(
    () => accessLevels.find((l) => l.id === selectedLevelId) || accessLevels[0],
    [accessLevels, selectedLevelId]
  );

  // Live roster counts per access level
  const levelStats = useMemo(() => {
    const map = new Map<
      string,
      { users: UserAccount[]; managements: OrgAccessAssignment[]; units: OrgAccessAssignment[]; organizations: OrgAccessAssignment[] }
    >();
    accessLevels.forEach((l) =>
      map.set(l.id, { users: [], managements: [], units: [], organizations: [] })
    );

    users.forEach((u) => {
      const lvlId = getUserEffectiveLevelId(u, accessLevels);
      map.get(lvlId)?.users.push(u);
    });

    orgAssignments.forEach((o) => {
      const bucket = map.get(o.accessLevelId);
      if (!bucket) return;
      if (o.entityType === 'management') bucket.managements.push(o);
      else if (o.entityType === 'unit') bucket.units.push(o);
      else bucket.organizations.push(o);
    });

    return map;
  }, [accessLevels, users, orgAssignments]);

  const selectedLevelRoster = useMemo(
    () =>
      levelStats.get(selectedLevel?.id || '') || {
        users: [],
        managements: [],
        units: [],
        organizations: [],
      },
    [levelStats, selectedLevel]
  );

  const managementNames = useMemo(
    () => orgAssignments.filter((o) => o.entityType === 'management').map((o) => o.name),
    [orgAssignments]
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (!q) return true;
      return (
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.personnelCode.toLowerCase().includes(q) ||
        u.management.toLowerCase().includes(q) ||
        u.unit.toLowerCase().includes(q) ||
        u.roleTitle.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  const filteredOrgEntities = useMemo(() => {
    const typeMap: Record<Exclude<EntityTab, 'users'>, OrgAccessAssignment['entityType']> = {
      managements: 'management',
      units: 'unit',
      organizations: 'organization',
    };
    if (entityTab === 'users') return [];
    const targetType = typeMap[entityTab];
    const q = searchQuery.trim().toLowerCase();

    return orgAssignments.filter((o) => {
      if (o.entityType !== targetType) return false;
      if (entityTab === 'units' && unitParentFilter !== 'all' && o.parentName !== unitParentFilter) {
        return false;
      }
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        (o.parentName || '').toLowerCase().includes(q)
      );
    });
  }, [orgAssignments, entityTab, searchQuery, unitParentFilter]);

  const openNewLevelModal = () => {
    setLevelModal({
      open: true,
      isNew: true,
      draft: {
        id: `lvl-custom-${Date.now()}`,
        code: `C${accessLevels.length + 1}`,
        name: '',
        baseTier: 'C2',
        description: '',
        tone: 'primary',
        allowPublicDocs: true,
        allowControlledPrint: true,
        requiresMfa: true,
      },
    });
  };

  const openEditLevelModal = (lvl: AccessLevelDefinition) => {
    setLevelModal({
      open: true,
      isNew: false,
      draft: { ...lvl },
    });
  };

  const handleSubmitLevelModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelModal.draft.name.trim() || !levelModal.draft.code.trim()) {
      onNotify('اطلاعات ناقص', 'کد و عنوان سطح دسترسی الزامی است.', 'warning');
      return;
    }
    onSaveAccessLevel(
      {
        ...levelModal.draft,
        code: levelModal.draft.code.trim().toUpperCase(),
        name: levelModal.draft.name.trim(),
        description: levelModal.draft.description.trim() || 'سطح دسترسی تعریف‌شده سازمانی',
      },
      levelModal.isNew
    );
    setSelectedLevelId(levelModal.draft.id);
    setLevelModal((prev) => ({ ...prev, open: false }));
  };

  const handleSubmitAddEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEntityModal.name.trim()) {
      onNotify('عنوان الزامی است', 'لطفاً نام سازمان، مدیریت یا واحد را وارد نمایید.', 'warning');
      return;
    }
    const newEntity: OrgAccessAssignment = {
      id: `org-custom-${Date.now()}`,
      entityType: addEntityModal.entityType,
      name: addEntityModal.name.trim(),
      parentName:
        addEntityModal.entityType === 'unit'
          ? addEntityModal.parentName || managementNames[0] || 'ستاد مرکزی'
          : addEntityModal.parentName.trim() || undefined,
      accessLevelId: addEntityModal.accessLevelId,
      updatedAt: '۱۴۰۳/۰۸/۲۴',
      updatedBy: 'مهندس مهران کاظمی',
    };
    onAddOrgEntity(newEntity);
    setAddEntityModal((prev) => ({ ...prev, open: false, name: '', parentName: '' }));
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Section (only in standalone mode; when embedded inside Admin Console show compact action bar) */}
      {!embedded ? (
        <section className="bg-white rounded-2xl border border-border-hairline p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-secondary">
              <span>ISO/IEC 27001:2022 بند A.5.12–5.15</span>
              <span aria-hidden="true" className="text-outline">·</span>
              <span>مدیریت متمرکز سطوح دسترسی و محرمانگی سازمانی</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-primary">
              تعریف و تخصیص یکپارچه سطوح دسترسی (عمومی، داخلی، محرمانه و فوق‌محرمانه)
            </h1>
            <p className="text-xs text-on-surface-variant max-w-3xl leading-5">
              در این بخش تمام سطوح دسترسی سامانه به‌صورت متمرکز تعریف می‌شوند تا دقیقاً مشخص کنید چه کاربران، مدیریت‌ها، واحدها و سازمان‌هایی در هر سطح دسترسی قرار دارند و سطوح جدید دلخواه تعریف نمایید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('documents-distribution')}
              className="px-3.5 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[17px] text-secondary">share</span>
              توزیع و دسترسی مستندات
            </button>
            <button
              type="button"
              onClick={() => onNavigate('users-list')}
              className="px-3.5 py-2.5 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[17px] text-secondary">group</span>
              فهرست کاربران
            </button>
            <button
              type="button"
              onClick={openNewLevelModal}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined !text-[18px]">add_moderator</span>
              تعریف سطح دسترسی جدید
            </button>
          </div>
        </section>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-primary">
              سطوح دسترسی کلی (عمومی، داخلی، محرمانه، فوق‌محرمانه و سطوح سفارشی)
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              تعریف سطوح دسترسی کلان و تخصیص یکپارچه به کاربران، مدیریت‌ها، واحدها و سازمان‌ها
            </p>
          </div>
          <button
            type="button"
            onClick={openNewLevelModal}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined !text-[17px]">add_moderator</span>
            تعریف سطح دسترسی جدید
          </button>
        </div>
      )}

      {/* Section 1: Defined Access Levels Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {accessLevels.map((lvl) => {
          const stats = levelStats.get(lvl.id) || {
            users: [],
            managements: [],
            units: [],
            organizations: [],
          };
          const isSelected = selectedLevel?.id === lvl.id;
          const badgeCls = TONE_BADGE_MAP[lvl.tone] || TONE_BADGE_MAP.primary;

          return (
            <div
              key={lvl.id}
              onClick={() => setSelectedLevelId(lvl.id)}
              className={`bg-white rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/15'
                  : 'border-border-hairline hover:border-secondary'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-label-code tabular-nums text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${badgeCls}`}>
                    {lvl.code} · سطح پایه {lvl.baseTier}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditLevelModal(lvl);
                    }}
                    className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low cursor-pointer"
                    title="ویرایش تعریف سطح دسترسی"
                  >
                    <span className="material-symbols-outlined !text-[17px]">edit</span>
                  </button>
                </div>

                <h2 className="text-sm font-extrabold text-primary">{lvl.name}</h2>
                <p className="text-[11px] text-on-surface-variant leading-5 line-clamp-2">
                  {lvl.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border-hairline grid grid-cols-4 gap-1 text-center text-[10.5px]">
                <div className="p-1.5 rounded-lg bg-surface-container-low">
                  <div className="font-label-code tabular-nums font-extrabold text-primary text-xs">
                    {stats.users.length.toLocaleString('fa-IR')}
                  </div>
                  <div className="text-on-surface-variant">کاربر</div>
                </div>
                <div className="p-1.5 rounded-lg bg-surface-container-low">
                  <div className="font-label-code tabular-nums font-extrabold text-primary text-xs">
                    {stats.managements.length.toLocaleString('fa-IR')}
                  </div>
                  <div className="text-on-surface-variant">مدیریت</div>
                </div>
                <div className="p-1.5 rounded-lg bg-surface-container-low">
                  <div className="font-label-code tabular-nums font-extrabold text-primary text-xs">
                    {stats.units.length.toLocaleString('fa-IR')}
                  </div>
                  <div className="text-on-surface-variant">واحد</div>
                </div>
                <div className="p-1.5 rounded-lg bg-surface-container-low">
                  <div className="font-label-code tabular-nums font-extrabold text-primary text-xs">
                    {stats.organizations.length.toLocaleString('fa-IR')}
                  </div>
                  <div className="text-on-surface-variant">سازمان</div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Section 2: Master-Detail Split: Left Roster of Selected Level + Right Unified Assignment Console */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* 8 cols (RTL Right): Unified Assignment Console for Users, Managements, Units & Organizations */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-border-hairline overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-hairline bg-surface-container-low/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-primary">
                  تخصیص متمرکز سطوح دسترسی به بخش‌ها و افراد
                </h2>
                <p className="text-[11px] text-on-surface-variant">
                  کاربران، مدیریت‌ها، واحدها و سازمان‌ها را مستقیماً در سطوح عمومی، داخلی، محرمانه، فوق‌محرمانه یا سطوح تعریف‌شده قرار دهید.
                </p>
              </div>

              {entityTab !== 'users' && (
                <button
                  type="button"
                  onClick={() =>
                    setAddEntityModal({
                      open: true,
                      entityType:
                        entityTab === 'managements'
                          ? 'management'
                          : entityTab === 'units'
                          ? 'unit'
                          : 'organization',
                      name: '',
                      parentName: managementNames[0] || '',
                      accessLevelId: selectedLevel?.id || accessLevels[0]?.id || 'lvl-c1',
                    })
                  }
                  className="px-3.5 py-2 rounded-xl border border-border-hairline bg-white hover:bg-surface-container-low text-xs font-bold text-primary inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span className="material-symbols-outlined !text-[16px] text-secondary">add</span>
                  {entityTab === 'managements'
                    ? 'افزودن مدیریت جدید'
                    : entityTab === 'units'
                    ? 'افزودن واحد جدید'
                    : 'افزودن سازمان جدید'}
                </button>
              )}
            </div>

            {/* 4-Entity Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-xl border border-border-hairline">
              {(
                [
                  { id: 'users', label: 'کاربران سایت', count: users.length },
                  {
                    id: 'managements',
                    label: 'مدیریت‌ها',
                    count: orgAssignments.filter((o) => o.entityType === 'management').length,
                  },
                  {
                    id: 'units',
                    label: 'واحدها',
                    count: orgAssignments.filter((o) => o.entityType === 'unit').length,
                  },
                  {
                    id: 'organizations',
                    label: 'سازمان‌ها و نهادها',
                    count: orgAssignments.filter((o) => o.entityType === 'organization').length,
                  },
                ] as const
              ).map((tab) => {
                const active = entityTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEntityTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      active ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`font-label-code tabular-nums text-[10.5px] px-1.5 py-0.5 rounded ${
                        active ? 'bg-white/20 text-white' : 'bg-surface-container-low text-primary'
                      }`}
                    >
                      {tab.count.toLocaleString('fa-IR')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Secondary Filter */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <span className="material-symbols-outlined !text-[18px] text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام، کد پرسنلی، مدیریت، واحد یا سازمان..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-border-hairline bg-white text-xs focus:outline-none focus:border-secondary"
                />
              </div>

              {entityTab === 'units' && (
                <select
                  value={unitParentFilter}
                  onChange={(e) => setUnitParentFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold text-primary focus:outline-none"
                >
                  <option value="all">همه مدیریت‌های بالادستی</option>
                  {managementNames.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bulk Assign Bar for Users */}
            {entityTab === 'users' && selectedUserIds.length > 0 && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="font-bold text-primary">
                  {selectedUserIds.length.toLocaleString('fa-IR')} کاربر برای تخصیص گروهی انتخاب شده‌اند
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkTargetLevelId}
                    onChange={(e) => setBulkTargetLevelId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border-hairline bg-white text-xs font-bold text-primary"
                  >
                    {accessLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.code} - {lvl.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      onAssignUsersLevel(selectedUserIds, bulkTargetLevelId);
                      setSelectedUserIds([]);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer"
                  >
                    اعمال سطح دسترسی گروهی
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-border-hairline text-xs cursor-pointer"
                  >
                    لغو انتخاب
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table Content */}
          {entityTab === 'users' ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[760px] text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                    <th className="py-3 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredUsers.length > 0 &&
                          filteredUsers.every((u) => selectedUserIds.includes(u.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(filteredUsers.map((u) => u.id));
                          } else {
                            setSelectedUserIds([]);
                          }
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">نام و نام خانوادگی / سمت</th>
                    <th className="py-3 px-3">کد پرسنلی</th>
                    <th className="py-3 px-3">مدیریت و واحد سازمانی</th>
                    <th className="py-3 px-3">سطح دسترسی فعلی</th>
                    <th className="py-3 px-3">تغییر / تخصیص سطح دسترسی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline/70">
                  {filteredUsers.map((u) => {
                    const currentLvlId = getUserEffectiveLevelId(u, accessLevels);
                    const currentLvl = accessLevels.find((l) => l.id === currentLvlId) || accessLevels[0];
                    const badgeCls = TONE_BADGE_MAP[currentLvl?.tone || 'secondary'];

                    return (
                      <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => onSelectUserForDetail(u.id)}
                            className="font-bold text-primary hover:text-secondary text-right cursor-pointer"
                          >
                            {u.honorific} {u.firstName} {u.lastName}
                          </button>
                          <div className="text-[11px] text-on-surface-variant">{u.roleTitle}</div>
                        </td>
                        <td className="py-3 px-3 font-label-code tabular-nums font-bold text-secondary whitespace-nowrap">
                          {u.personnelCode}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-primary">{u.management}</div>
                          <div className="text-[11px] text-on-surface-variant">{u.unit}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${badgeCls}`}>
                            {currentLvl?.code} · {currentLvl?.name}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={currentLvlId}
                            onChange={(e) => onAssignUsersLevel([u.id], e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-border-hairline bg-white text-xs font-bold text-primary focus:outline-none focus:border-secondary cursor-pointer"
                          >
                            {accessLevels.map((lvl) => (
                              <option key={lvl.id} value={lvl.id}>
                                {lvl.code} - {lvl.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[720px] text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-[11px] font-bold text-primary border-b border-border-hairline">
                    <th className="py-3 px-4">
                      {entityTab === 'managements'
                        ? 'عنوان مدیریت سازمانی'
                        : entityTab === 'units'
                        ? 'عنوان واحد عملیاتی / ستادی'
                        : 'نام سازمان / نهاد'}
                    </th>
                    <th className="py-3 px-3">
                      {entityTab === 'units'
                        ? 'مدیریت بالادستی'
                        : entityTab === 'organizations'
                        ? 'نوع / رده سازمانی'
                        : 'پرسنل ثبت‌شده'}
                    </th>
                    <th className="py-3 px-3">سطح دسترسی فعلی</th>
                    <th className="py-3 px-3">تغییر سطح دسترسی</th>
                    {entityTab !== 'organizations' && (
                      <th className="py-3 px-3 text-center">همگام‌سازی پرسنل</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline/70">
                  {filteredOrgEntities.map((entity) => {
                    const lvl =
                      accessLevels.find((l) => l.id === entity.accessLevelId) || accessLevels[0];
                    const badgeCls = TONE_BADGE_MAP[lvl?.tone || 'secondary'];
                    const matchingUsersCount =
                      entity.entityType === 'management'
                        ? users.filter((u) => u.management === entity.name).length
                        : entity.entityType === 'unit'
                        ? users.filter((u) => u.unit === entity.name).length
                        : 0;

                    return (
                      <tr key={entity.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-primary">{entity.name}</td>
                        <td className="py-3.5 px-3 text-on-surface-variant">
                          {entity.entityType === 'management' ? (
                            <span className="font-label-code tabular-nums">
                              {matchingUsersCount.toLocaleString('fa-IR')} کاربر در سامانه
                            </span>
                          ) : (
                            entity.parentName || '—'
                          )}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${badgeCls}`}>
                            {lvl?.code} · {lvl?.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <select
                            value={entity.accessLevelId}
                            onChange={(e) => onAssignOrgEntityLevel(entity.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-border-hairline bg-white text-xs font-bold text-primary focus:outline-none focus:border-secondary cursor-pointer"
                          >
                            {accessLevels.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.code} - {l.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        {entityTab !== 'organizations' && (
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              disabled={matchingUsersCount === 0}
                              onClick={() =>
                                onCascadeOrgLevelToUsers(
                                  entity.entityType === 'management' ? 'management' : 'unit',
                                  entity.name,
                                  entity.accessLevelId
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                                matchingUsersCount === 0
                                  ? 'bg-slate-100 text-outline border-border-hairline cursor-not-allowed'
                                  : 'bg-sky-50 border-sky-200 text-secondary hover:bg-secondary hover:text-white cursor-pointer'
                              }`}
                            >
                              اعمال به {matchingUsersCount.toLocaleString('fa-IR')} کاربر زیرمجموعه
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4 cols (RTL Left): Live Roster of Who & What is in Selected Access Level */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-border-hairline overflow-hidden">
          <div className="p-4 border-b border-border-hairline bg-surface-container-low/60 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-label-code text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                  TONE_BADGE_MAP[selectedLevel?.tone || 'secondary']
                }`}
              >
                {selectedLevel?.code}
              </span>
              <span className="text-[11px] text-on-surface-variant">فهرست اعضای قرارگرفته در این سطح</span>
            </div>
            <h2 className="text-sm font-extrabold text-primary pt-1">
              اعضای سطح دسترسی «{selectedLevel?.name}»
            </h2>
            <p className="text-[11px] text-on-surface-variant leading-5">
              {selectedLevel?.description}
            </p>
          </div>

          <div className="p-4 space-y-4 max-h-[680px] overflow-y-auto custom-scrollbar text-xs">
            {/* Users in this level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-extrabold text-primary">
                <span>کاربران ({selectedLevelRoster.users.length.toLocaleString('fa-IR')})</span>
              </div>
              {selectedLevelRoster.users.length === 0 ? (
                <div className="p-3 rounded-xl bg-surface-container-low/60 text-[11px] text-on-surface-variant">
                  هیچ کاربری در این سطح دسترسی قرار ندارد.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedLevelRoster.users.map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-xl border border-border-hairline bg-surface-container-low/40 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-primary truncate">
                          {u.honorific} {u.firstName} {u.lastName}
                        </div>
                        <div className="text-[10.5px] text-on-surface-variant truncate">
                          {u.personnelCode} · {u.unit}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectUserForDetail(u.id)}
                        className="text-[11px] font-bold text-secondary hover:underline shrink-0 cursor-pointer"
                      >
                        پروفایل
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Managements in this level */}
            <div className="space-y-2 pt-3 border-t border-border-hairline">
              <div className="font-extrabold text-primary">
                مدیریت‌ها ({selectedLevelRoster.managements.length.toLocaleString('fa-IR')})
              </div>
              {selectedLevelRoster.managements.length === 0 ? (
                <div className="p-3 rounded-xl bg-surface-container-low/60 text-[11px] text-on-surface-variant">
                  مدیریتی در این سطح تعریف نشده است.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedLevelRoster.managements.map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 rounded-xl border border-border-hairline bg-white font-semibold text-primary text-[11.5px]"
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Units in this level */}
            <div className="space-y-2 pt-3 border-t border-border-hairline">
              <div className="font-extrabold text-primary">
                واحدها ({selectedLevelRoster.units.length.toLocaleString('fa-IR')})
              </div>
              {selectedLevelRoster.units.length === 0 ? (
                <div className="p-3 rounded-xl bg-surface-container-low/60 text-[11px] text-on-surface-variant">
                  واحدی در این سطح قرار ندارد.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedLevelRoster.units.map((u) => (
                    <div
                      key={u.id}
                      className="px-3 py-2 rounded-xl border border-border-hairline bg-white"
                    >
                      <div className="font-semibold text-primary text-[11.5px]">{u.name}</div>
                      {u.parentName && (
                        <div className="text-[10.5px] text-on-surface-variant">{u.parentName}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Organizations in this level */}
            <div className="space-y-2 pt-3 border-t border-border-hairline">
              <div className="font-extrabold text-primary">
                سازمان‌ها و نهادها ({selectedLevelRoster.organizations.length.toLocaleString('fa-IR')})
              </div>
              {selectedLevelRoster.organizations.length === 0 ? (
                <div className="p-3 rounded-xl bg-surface-container-low/60 text-[11px] text-on-surface-variant">
                  سازمانی در این سطح قرار ندارد.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedLevelRoster.organizations.map((org) => (
                    <div
                      key={org.id}
                      className="px-3 py-2 rounded-xl border border-border-hairline bg-white"
                    >
                      <div className="font-semibold text-primary text-[11.5px]">{org.name}</div>
                      {org.parentName && (
                        <div className="text-[10.5px] text-on-surface-variant">{org.parentName}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Create / Edit Access Level Modal */}
      {levelModal.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <form
            onSubmit={handleSubmitLevelModal}
            className="animate-modal-enter w-full max-w-lg bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {levelModal.isNew ? 'تعریف سطح دسترسی جدید' : 'ویرایش مشخصات سطح دسترسی'}
              </h3>
              <button
                type="button"
                onClick={() => setLevelModal((prev) => ({ ...prev, open: false }))}
                className="cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">کد سطح *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={levelModal.draft.code}
                    onChange={(e) =>
                      setLevelModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, code: e.target.value },
                      }))
                    }
                    placeholder="C5"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline font-label-code font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-primary mb-1">عنوان سطح دسترسی *</label>
                  <input
                    type="text"
                    required
                    value={levelModal.draft.name}
                    onChange={(e) =>
                      setLevelModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, name: e.target.value },
                      }))
                    }
                    placeholder="مثلاً: محرمانه کمیته بحران / پیمانکاران ویژه"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">هم‌ترازی استاندارد ISO 27001</label>
                  <select
                    value={levelModal.draft.baseTier}
                    onChange={(e) =>
                      setLevelModal((prev) => ({
                        ...prev,
                        draft: {
                          ...prev.draft,
                          baseTier: e.target.value as AccessLevelDefinition['baseTier'],
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-bold text-primary"
                  >
                    <option value="C1">C1 - عمومی</option>
                    <option value="C2">C2 - داخلی سازمانی</option>
                    <option value="C3">C3 - محرمانه فنی</option>
                    <option value="C4">C4 - فوق‌محرمانه</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-primary mb-1">رنگ‌بندی نمایشی</label>
                  <select
                    value={levelModal.draft.tone}
                    onChange={(e) =>
                      setLevelModal((prev) => ({
                        ...prev,
                        draft: {
                          ...prev.draft,
                          tone: e.target.value as AccessLevelDefinition['tone'],
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-bold text-primary"
                  >
                    <option value="tertiary">سبز (عمومی / مجاز)</option>
                    <option value="secondary">آبی (داخلی / سازمانی)</option>
                    <option value="warning">نارنجی (محرمانه فنی)</option>
                    <option value="critical">قرمز (فوق‌محرمانه)</option>
                    <option value="primary">سرمه‌ای (سطح ویژه تعریف‌شده)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1">شرح دامنه و ضوابط دسترسی</label>
                <textarea
                  rows={3}
                  value={levelModal.draft.description}
                  onChange={(e) =>
                    setLevelModal((prev) => ({
                      ...prev,
                      draft: { ...prev.draft, description: e.target.value },
                    }))
                  }
                  placeholder="توضیح دهید این سطح دسترسی شامل چه مستندات و چه ضوابطی است..."
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="p-3 rounded-xl border border-border-hairline bg-surface-container-low/60 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={levelModal.draft.allowControlledPrint}
                    onChange={(e) =>
                      setLevelModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, allowControlledPrint: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="font-bold text-primary">مجوز چاپ با واترمارک کنترل‌شده</span>
                </label>

                <label className="p-3 rounded-xl border border-border-hairline bg-surface-container-low/60 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={levelModal.draft.requiresMfa}
                    onChange={(e) =>
                      setLevelModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, requiresMfa: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="font-bold text-primary">الزام احراز هویت دو مرحله‌ای (2FA)</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLevelModal((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                ذخیره سطح دسترسی
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Management / Unit / Organization Modal */}
      {addEntityModal.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]">
          <form
            onSubmit={handleSubmitAddEntity}
            className="animate-modal-enter w-full max-w-md bg-white rounded-2xl border border-border-hairline shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {addEntityModal.entityType === 'management'
                  ? 'افزودن مدیریت سازمانی جدید'
                  : addEntityModal.entityType === 'unit'
                  ? 'افزودن واحد جدید'
                  : 'افزودن سازمان / نهاد همکار جدید'}
              </h3>
              <button
                type="button"
                onClick={() => setAddEntityModal((prev) => ({ ...prev, open: false }))}
                className="cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1">عنوان *</label>
                <input
                  type="text"
                  required
                  value={addEntityModal.name}
                  onChange={(e) =>
                    setAddEntityModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={
                    addEntityModal.entityType === 'organization'
                      ? 'مثلاً: شرکت مهندسی و نصب پتروشیمی'
                      : addEntityModal.entityType === 'management'
                      ? 'مثلاً: مدیریت فناوری اطلاعات و حراست'
                      : 'مثلاً: واحد کنترل فرآیند پیشرفته (APC)'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                />
              </div>

              {addEntityModal.entityType === 'unit' ? (
                <div>
                  <label className="block font-bold text-primary mb-1">مدیریت بالادستی</label>
                  <select
                    value={addEntityModal.parentName}
                    onChange={(e) =>
                      setAddEntityModal((prev) => ({ ...prev, parentName: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-semibold text-primary"
                  >
                    {managementNames.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              ) : addEntityModal.entityType === 'organization' ? (
                <div>
                  <label className="block font-bold text-primary mb-1">رده‌بندی سازمان (اختیاری)</label>
                  <input
                    type="text"
                    value={addEntityModal.parentName}
                    onChange={(e) =>
                      setAddEntityModal((prev) => ({ ...prev, parentName: e.target.value }))
                    }
                    placeholder="مثلاً: پیمانکار EPC / نهاد ناظر"
                    className="w-full px-3 py-2 rounded-xl border border-border-hairline"
                  />
                </div>
              ) : null}

              <div>
                <label className="block font-bold text-primary mb-1">سطح دسترسی تخصیص‌یافته</label>
                <select
                  value={addEntityModal.accessLevelId}
                  onChange={(e) =>
                    setAddEntityModal((prev) => ({ ...prev, accessLevelId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border-hairline bg-surface-container-low font-bold text-primary"
                >
                  {accessLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.code} - {lvl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-surface-container-low border-t border-border-hairline flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddEntityModal((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl border border-border-hairline bg-white text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                ثبت و تخصیص سطح
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
