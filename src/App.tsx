/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { LayoutShell } from './components/LayoutShell';
import { ToastContainer } from './components/ToastContainer';
import {
  INITIAL_ACCESS_LEVELS,
  INITIAL_AUDIT_TRAIL,
  INITIAL_CAPAS,
  INITIAL_DISTRIBUTION_MATRIX,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_OBSOLETE_DOCS,
  INITIAL_ORG_ACCESS_ASSIGNMENTS,
  INITIAL_REVISIONS,
  INITIAL_USERS,
  INITIAL_WORKFLOW_DOCS,
} from './data/imsData';
import { ApprovalWorkflowPage } from './pages/ApprovalWorkflowPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentArchivePage } from './pages/DocumentArchivePage';
import { DocumentCreatePage } from './pages/DocumentCreatePage';
import { DocumentDistributionPage } from './pages/DocumentDistributionPage';
import { DocumentRevisionPage } from './pages/DocumentRevisionPage';
import { DocumentsListPage } from './pages/DocumentsListPage';
import { LoginPage } from './pages/LoginPage';
import { OperationalModulePage } from './pages/OperationalModulePage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import {
  AccessLevelDefinition,
  AuditTrailEntry,
  DistributionMatrixRow,
  ImsDocument,
  NotificationItem,
  ObsoleteDocRecord,
  OrgAccessAssignment,
  PendingDistributionDoc,
  PermissionFlags,
  RevisionItem,
  RouteId,
  ToastMessage,
  UserAccount,
  WorkflowDoc,
} from './types/ims';

const inferDocGroup = (code: string): 'SOP' | 'HSE' | 'P&ID' | 'IMS' => {
  const upper = code.toUpperCase();
  if (upper.includes('HSE') || upper.includes('SAF') || upper.includes('ENV')) return 'HSE';
  if (upper.includes('PID') || upper.includes('DWG')) return 'P&ID';
  if (upper.includes('SOP') || upper.includes('WI')) return 'SOP';
  return 'IMS';
};

const inferConfidentiality = (
  raw: string
): 'C1 - عمومی' | 'C2 - سازمانی' | 'C3 - محرمانه فنی' | 'C4 - فوق‌محرمانه' => {
  if (raw.includes('C1') || raw.includes('عمومی')) return 'C1 - عمومی';
  if (raw.includes('C3') || raw.includes('محرمانه فنی')) return 'C3 - محرمانه فنی';
  if (raw.includes('C4') || raw.includes('فوق')) return 'C4 - فوق‌محرمانه';
  return 'C2 - سازمانی';
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [route, setRoute] = useState<RouteId>('dashboard');

  const [documents, setDocuments] = useState<ImsDocument[]>(INITIAL_DOCUMENTS);
  const [revisions, setRevisions] = useState<RevisionItem[]>(INITIAL_REVISIONS);
  const [workflowDocs, setWorkflowDocs] = useState<WorkflowDoc[]>(INITIAL_WORKFLOW_DOCS);
  const [obsoleteDocs, setObsoleteDocs] = useState<ObsoleteDocRecord[]>(INITIAL_OBSOLETE_DOCS);
  const [matrixRows, setMatrixRows] = useState<DistributionMatrixRow[]>(INITIAL_DISTRIBUTION_MATRIX);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>(INITIAL_AUDIT_TRAIL);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [accessLevels, setAccessLevels] = useState<AccessLevelDefinition[]>(INITIAL_ACCESS_LEVELS);
  const [orgAccessAssignments, setOrgAccessAssignments] = useState<OrgAccessAssignment[]>(
    INITIAL_ORG_ACCESS_ASSIGNMENTS
  );
  const [pendingDistributions, setPendingDistributions] = useState<PendingDistributionDoc[]>([
    {
      id: 'pdist-wf-5',
      workflowDocId: 'wf-5',
      code: 'SOP-QC-LAB-21-01',
      title: 'روش اجرایی کالیبراسیون تجهیزات رطوبت‌سنجی کارل فیشر',
      version: 'Rev 01 (مصوب)',
      docGroup: 'SOP',
      processOwner: 'آزمایشگاه مرکزی',
      approvedBy: 'مدیرعامل / مدیر مجتمع پتروشیمی',
      approvedAt: '۱۴۰۳/۰۸/۰۸ - ساعت ۱۵:۳۰',
      requestType: 'revision',
      defaultConfidentiality: 'C2 - سازمانی',
      suggestedReviser: 'دکتر آرش پارسا (رئیس آزمایشگاه مرکزی)',
      summary: 'تصویب نهایی در کمیته راهبری و مدیرعامل؛ آماده صدور مجوز انتشار و تعیین دسترسی توسط ادمین سامانه.',
      status: 'pending',
    },
  ]);
  const [currentUserId, setCurrentUserId] = useState<string>('usr-kazemi');
  const [selectedUserId, setSelectedUserId] = useState<string>('usr-rezvani-ali');
  const [openCreateSignal, setOpenCreateSignal] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback(
    (title: string, message?: string, type: ToastMessage['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNavigate = useCallback((nextRoute: RouteId) => {
    if (nextRoute === 'login') {
      setIsAuthenticated(false);
      return;
    }
    if (nextRoute === 'users-create') {
      setOpenCreateSignal((c) => c + 1);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAddDocument = useCallback(
    (newDoc: ImsDocument, asDraft: boolean) => {
      setDocuments((prev) => [newDoc, ...prev]);

      if (!asDraft) {
        const wf: WorkflowDoc = {
          id: `wf-${Date.now()}`,
          code: newDoc.code,
          title: newDoc.title,
          version: `${newDoc.version} (ارسال‌شده)`,
          standards: newDoc.isoStandards,
          priority: 'فوری',
          currentStage: 2,
          stageLabel: 'مرحله ۲: صحه‌گذاری فنی مهندسی',
          currentActor: 'مهندس مهران کاظمی (شما)',
          slaDaysUsed: 1,
          slaDaysTotal: 5,
          slaRemainingText: '۴ روز باقی‌مانده',
          processCode: 'PR-NEW-01',
          processOwner: newDoc.unit,
          confidentiality: newDoc.confidentiality,
          nextReviewDate: newDoc.reviewAt,
          pdfName: `${newDoc.code}_Draft.pdf`,
          pdfSize: '۲.۴ مگابایت',
          pdfPages: 10,
          pdfStandard: newDoc.isoStandards[0] || 'ISO 9001:2015',
          excerptSection: 'بخش ۱.۰ - دامنه کاربرد و الزامات اولیه',
          excerptIsoTag: `منطبق با ${newDoc.isoStandards[0] || 'ISO 9001'}`,
          excerptText: newDoc.summary || newDoc.title,
          validatorNote: 'مستند جدید از فرم ثبت مستندات به گردش کار تایید ارسال گردید.',
          readinessScore: 88,
          checklist: [
            { label: 'فرمت استاندارد سربرگ و پاورقی', status: 'passed', statusText: 'تایید شده' },
            { label: 'شناسایی ریسک و ماتریس HSE', status: 'passed', statusText: 'تایید شده' },
            { label: 'مستندات پیوست کالیبراسیون تجهیزات', status: 'passed', statusText: 'تایید شده' },
            { label: 'کدگذاری واحد بر اساس شیوه‌نامه', status: 'passed', statusText: 'تایید شده' },
          ],
          history: [
            {
              actor: newDoc.owner,
              role: 'تدوین‌کننده',
              date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
              note: 'ثبت مستند جدید و ارسال به جریان تصویب الکترونیکی.',
              type: 'submitted',
            },
          ],
          tabGroup: 'my-inbox',
          requestType: 'new',
          workflowActors: newDoc.signoffChain.slice(0, 4).map((s) => ({
            step: s.role,
            actor: s.actor,
            originalActor: s.actor,
            replaced: false,
          })),
        };
        setWorkflowDocs((prev) => [wf, ...prev]);
        notify(
          `سند ${newDoc.code} ثبت و ارسال شد`,
          'مستند جدید به فهرست مدارک و کارتابل گردش کار اضافه گردید.',
          'success'
        );
      } else {
        notify(`پیش‌نویس ${newDoc.code} ذخیره شد`, 'مستند در فهرست اسناد با وضعیت پیش‌نویس ثبت گردید.', 'info');
      }
    },
    [notify]
  );

  const handleAddRevision = useCallback(
    (item: RevisionItem) => {
      setRevisions((prev) => [item, ...prev]);

      const sourceDoc = documents.find((d) => d.id === item.sourceDocId || d.code === item.code);
      const firstFile = item.attachedFiles?.[0];
      const wfEntry: WorkflowDoc = {
        id: `wf-rev-${Date.now()}`,
        code: item.suggestedCode || item.code,
        title: item.title,
        version: `${item.targetRev} (بازنگری جدید)`,
        standards: sourceDoc?.isoStandards || ['ISO 9001:2015'],
        priority: item.triggerCategory === 'overdue' ? 'بحرانی' : 'فوری',
        currentStage: 3,
        stageLabel: 'مرحله ۳: تایید نهایی و جایگزینی نسخه',
        currentActor: 'مهندس مهران کاظمی (شما)',
        slaDaysUsed: 1,
        slaDaysTotal: item.slaDays || 5,
        slaRemainingText: `${((item.slaDays || 5) - 1).toLocaleString('fa-IR')} روز باقی‌مانده`,
        processCode: item.triggerRef || 'REV-REQ',
        processOwner: item.dept,
        confidentiality: sourceDoc?.confidentiality || 'داخلی (C2)',
        nextReviewDate: '۱۴۰۵/۰۸/۲۴ (ادواری)',
        pdfName: firstFile?.name || `${item.suggestedCode || item.code}_Revised.pdf`,
        pdfSize: firstFile?.size || '۲.۱ مگابایت',
        pdfPages: 12,
        pdfStandard: sourceDoc?.isoStandards?.[0] || 'ISO 9001:2015',
        excerptSection: item.diffSection || 'دامنه تغییرات پیشنهادی',
        excerptIsoTag: item.triggerLabel,
        excerptText: item.newHighlight,
        validatorNote: item.replaceOnApproval
          ? 'پس از تایید نهایی در این کارتابل، فایل‌های پیوست‌شده به‌صورت خودکار جایگزین ریویژن قبلی در فهرست مستندات خواهند شد.'
          : 'درخواست بازنگری از کارتابل مدیریت ویرایش ارسال شده است.',
        readinessScore: 92,
        checklist: [
          { label: 'انطباق کد و شماره ویرایش جدید', status: 'passed', statusText: 'تایید شده' },
          {
            label: 'بارگذاری فایل‌های سند تغییریافته',
            status: item.attachedFiles && item.attachedFiles.length > 0 ? 'passed' : 'warning',
            statusText:
              item.attachedFiles && item.attachedFiles.length > 0
                ? `${item.attachedFiles.length.toLocaleString('fa-IR')} فایل پیوست`
                : 'بدون فایل پیوست',
          },
          { label: 'ارجاع سیستمی و توجیه فنی تغییر', status: 'passed', statusText: 'تایید شده' },
        ],
        history: [
          {
            actor: item.workflowActors?.[0]?.actor || item.owner,
            role: item.ownerRole,
            date: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            note: `ثبت درخواست بازنگری (${item.currentRev} ← ${item.targetRev}) و ارسال جهت تایید نهایی.`,
            type: 'submitted',
          },
        ],
        tabGroup: 'my-inbox',
        requestType: 'revision',
        revisionId: item.id,
        sourceDocId: item.sourceDocId || sourceDoc?.id,
        targetRev: item.targetRev,
        suggestedCode: item.suggestedCode,
        attachedFiles: item.attachedFiles,
        replaceOnApproval: item.replaceOnApproval,
        workflowActors: item.workflowActors,
      };
      setWorkflowDocs((prev) => [wfEntry, ...prev]);
    },
    [documents]
  );

  const handleUpdateRevision = useCallback(
    (id: string, patch: Partial<RevisionItem>) => {
      setRevisions((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

      if ('attachedFiles' in patch || 'replaceOnApproval' in patch) {
        const targetRev = revisions.find((r) => r.id === id);
        setWorkflowDocs((prev) =>
          prev.map((w) => {
            const isMatch =
              w.revisionId === id ||
              (targetRev && (w.code === targetRev.code || w.code === targetRev.suggestedCode));
            if (!isMatch) return w;
            const nextFiles = 'attachedFiles' in patch ? patch.attachedFiles : w.attachedFiles;
            const nextReplace = 'replaceOnApproval' in patch ? patch.replaceOnApproval : w.replaceOnApproval;
            return {
              ...w,
              attachedFiles: nextFiles,
              replaceOnApproval: nextReplace,
              pdfName: nextFiles?.[0]?.name || w.pdfName,
              pdfSize: nextFiles?.[0]?.size || w.pdfSize,
            };
          })
        );
      }
    },
    [revisions]
  );

  const handleExtendDocument = useCallback(
    (
      docId: string,
      nextReviewAt: string,
      nextExpiresAt: string,
      years: number,
      auditNote: string,
      revisionId?: string
    ) => {
      const targetDoc = documents.find((d) => d.id === docId);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                status: 'مصوب',
                reviewAt: nextReviewAt,
                expiresAt: nextExpiresAt,
                expiringSoon: false,
                signoffChain: [
                  ...d.signoffChain,
                  {
                    role: `تمدید اعتبار دوره‌ای (${years.toLocaleString('fa-IR')} ساله)`,
                    actor: 'مهندس مهران کاظمی',
                    date: '۱۴۰۳/۰۸/۲۴',
                    status: 'approved',
                    comment:
                      auditNote.trim() ||
                      `انطباق با چک‌لیست استاندارد ISO تایید و اعتبار سند به مدت ${years.toLocaleString('fa-IR')} سال تا ${nextExpiresAt} تمدید گردید.`,
                  },
                ],
              }
            : d
        )
      );

      if (revisionId) {
        setRevisions((prev) =>
          prev.map((r) =>
            r.id === revisionId
              ? {
                  ...r,
                  progress: 100,
                  workflowState: `تمدید اعتبار ${years.toLocaleString('fa-IR')} ساله بدون تغییر (تایید ISO)`,
                  overdueDays: undefined,
                }
              : r
          )
        );
      } else if (targetDoc) {
        setRevisions((prev) =>
          prev.map((r) =>
            r.code === targetDoc.code
              ? {
                  ...r,
                  progress: 100,
                  workflowState: `تمدید اعتبار ${years.toLocaleString('fa-IR')} ساله بدون تغییر (تایید ISO)`,
                  overdueDays: undefined,
                }
              : r
          )
        );
      }

      notify(
        `تمدید اعتبار ${years.toLocaleString('fa-IR')} ساله ${targetDoc?.code || 'سند'} ثبت شد`,
        `تاریخ سررسید بازنگری بعدی: ${nextReviewAt} | انقضای جدید: ${nextExpiresAt}`,
        'success'
      );
    },
    [documents, notify]
  );

  const handleUpdateWorkflowDoc = useCallback((id: string, patch: Partial<WorkflowDoc>) => {
    setWorkflowDocs((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  const handlePromoteRevision = useCallback(
    (wfDoc: WorkflowDoc) => {
      const targetDoc = documents.find(
        (d) =>
          (wfDoc.sourceDocId && d.id === wfDoc.sourceDocId) ||
          d.code === wfDoc.code ||
          (wfDoc.suggestedCode && d.code === wfDoc.suggestedCode)
      );

      if (targetDoc) {
        const nextCode = wfDoc.suggestedCode || targetDoc.code;
        const nextVersion = wfDoc.targetRev || targetDoc.version;

        const archivedOld: ObsoleteDocRecord = {
          id: `obs-${Date.now()}`,
          code: targetDoc.code,
          title: targetDoc.title,
          unit: targetDoc.unit,
          rev: targetDoc.version,
          retentionMonths: 60,
          obsoleteDate: '۱۴۰۳/۰۸/۲۴',
          supersededBy: `${nextCode} (${nextVersion})`,
          reason: 'جایگزینی خودکار پس از تایید نهایی ویرایش جدید در گردش کار بازنگری',
          yearGroup: '1403',
          tags: ['ابطال ناشی از بازنگری', targetDoc.docTypeCode],
          sha256: `e3b0c44298fc1c149afbf4c8996fb924...${Date.now().toString().slice(-4)}`,
          vaultZone: 'EDMS-ARCHIVE-01',
          fileSize: wfDoc.attachedFiles?.[0]?.size || '۲.۴ مگابایت',
          archiver: 'مهندس مهران کاظمی',
        };

        setObsoleteDocs((prev) => [archivedOld, ...prev]);
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === targetDoc.id
              ? {
                  ...d,
                  code: nextCode,
                  version: nextVersion,
                  status: 'مصوب',
                  registeredAt: '۱۴۰۳/۰۸/۲۴',
                  attachedFiles: wfDoc.attachedFiles && wfDoc.attachedFiles.length > 0 ? wfDoc.attachedFiles : d.attachedFiles,
                  signoffChain:
                    wfDoc.workflowActors && wfDoc.workflowActors.length > 0
                      ? wfDoc.workflowActors.map((wa) => ({
                          role: wa.step,
                          actor: wa.actor,
                          date: '۱۴۰۳/۰۸/۲۴',
                          status: 'approved' as const,
                          comment: wa.replaced
                            ? `جایگزین شده به‌جای ${wa.originalActor || 'فرد قبلی'}`
                            : undefined,
                        }))
                      : d.signoffChain,
                }
              : d
          )
        );

        notify(
          'جایگزینی ریویژن جدید انجام شد',
          `سند ${targetDoc.code} (${targetDoc.version}) به ${nextCode} (${nextVersion}) ارتقا یافت و نسخه قبلی بایگانی شد.`,
          'success'
        );
      }

      if (wfDoc.revisionId) {
        setRevisions((prev) =>
          prev.map((r) =>
            r.id === wfDoc.revisionId
              ? { ...r, progress: 100, workflowState: 'تصویب نهایی و جایگزین ریویژن قبلی شد' }
              : r
          )
        );
      }
    },
    [documents, notify]
  );

  const handleCeoFinalApprove = useCallback(
    (wfDoc: WorkflowDoc) => {
      const nextCode = wfDoc.suggestedCode || wfDoc.code;
      const nextVersion = wfDoc.targetRev || wfDoc.version;
      const reqType: 'new' | 'revision' =
        wfDoc.requestType || (/Rev\s*00\b/i.test(nextVersion) ? 'new' : 'revision');

      const pendingEntry: PendingDistributionDoc = {
        id: `pdist-${wfDoc.id}`,
        workflowDocId: wfDoc.id,
        code: nextCode,
        title: wfDoc.title,
        version: nextVersion,
        docGroup: inferDocGroup(nextCode),
        processOwner: wfDoc.processOwner,
        approvedBy: wfDoc.workflowActors?.[3]?.actor || 'مدیرعامل / مدیر مجتمع پتروشیمی',
        approvedAt: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
        requestType: reqType,
        defaultConfidentiality: inferConfidentiality(wfDoc.confidentiality),
        suggestedReviser: wfDoc.workflowActors?.[0]?.actor || wfDoc.processOwner,
        summary: wfDoc.excerptText,
        status: 'pending',
      };

      setPendingDistributions((prev) => [
        pendingEntry,
        ...prev.filter((item) => item.workflowDocId !== wfDoc.id && item.code !== nextCode),
      ]);

      setDocuments((prev) =>
        prev.map((d) =>
          (wfDoc.sourceDocId && d.id === wfDoc.sourceDocId) || d.code === wfDoc.code || d.code === nextCode
            ? { ...d, status: 'مصوب' }
            : d
        )
      );

      setNotifications((prev) => [
        {
          id: `notif-ceo-${Date.now()}`,
          title: `تایید نهایی مدیرعامل: ${nextCode} آماده انتشار است`,
          body: 'سند وارد صف توزیع و دسترسی مستندات شد. لطفاً مجوز انتشار و سطوح دسترسی را صادر فرمایید.',
          time: 'هم‌اکنون',
          category: 'approval',
          unread: true,
          targetRoute: 'documents-distribution',
        },
        ...prev,
      ]);

      notify(
        `سند ${nextCode} توسط مدیرعامل تصویب و به بخش توزیع ارسال شد`,
        'اکنون می‌توانید در صفحه «توزیع و دسترسی به مستندات» مجوز انتشار، سطح دسترسی عمومی/محدود و مسئول بازنگری را تعیین نمایید.',
        'success'
      );
    },
    [notify]
  );

  const handlePublishDistribution = useCallback(
    (
      pendingId: string,
      matrixRow: DistributionMatrixRow,
      logEntry: AuditTrailEntry,
      designatedReviser: string,
      publishedSummary: string
    ) => {
      setPendingDistributions((prev) => {
        const exists = prev.some((p) => p.id === pendingId || p.code === matrixRow.code);
        if (exists) {
          return prev.map((p) =>
            p.id === pendingId || p.code === matrixRow.code
              ? { ...p, status: 'published', publishedAt: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون', publishedSummary }
              : p
          );
        }
        return [
          {
            id: pendingId,
            workflowDocId: pendingId,
            code: matrixRow.code,
            title: matrixRow.title,
            version: matrixRow.version,
            docGroup: matrixRow.docGroup,
            processOwner: matrixRow.subtitle.split('•')[0]?.trim() || 'واحد متولی فرآیند',
            approvedBy: 'تاییدشده / مجوز مستقیم ادمین سامانه',
            approvedAt: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            requestType: /Rev\s*00\b/i.test(matrixRow.version) ? 'new' : 'revision',
            defaultConfidentiality: matrixRow.confidentiality,
            suggestedReviser: designatedReviser,
            status: 'published',
            publishedAt: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
            publishedSummary,
          },
          ...prev,
        ];
      });

      setMatrixRows((prev) => {
        const idx = prev.findIndex((r) => r.code === matrixRow.code);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...matrixRow, id: prev[idx].id };
          return next;
        }
        return [matrixRow, ...prev];
      });

      setAuditTrail((prev) => [logEntry, ...prev]);

      setDocuments((prev) =>
        prev.map((d) =>
          d.code === matrixRow.code
            ? {
                ...d,
                status: 'مصوب',
                confidentiality: matrixRow.confidentiality,
                owner: designatedReviser || d.owner,
              }
            : d
        )
      );

      notify(
        `مجوز انتشار سند ${matrixRow.code} صادر شد`,
        `سند با سطح «${matrixRow.confidentiality}» و مجوز بازنگری «${designatedReviser}» در ماتریس توزیع ثبت و منتشر گردید.`,
        'success'
      );
    },
    [notify]
  );

  const handleEnsureMatrixRow = useCallback((row: DistributionMatrixRow) => {
    setMatrixRows((prev) => {
      if (prev.some((r) => r.code === row.code)) return prev;
      return [row, ...prev];
    });
  }, []);

  const handleTogglePermission = useCallback(
    (rowId: string, mode: 'unit' | 'user', targetKey: string, flag: keyof PermissionFlags) => {
      setMatrixRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          if (mode === 'unit') {
            const current = (row.unitPermissions as Record<string, PermissionFlags>)[targetKey];
            return {
              ...row,
              unitPermissions: {
                ...row.unitPermissions,
                [targetKey]: { ...current, [flag]: !current[flag] },
              },
            };
          }
          const current = (row.userPermissions as Record<string, PermissionFlags>)[targetKey];
          return {
            ...row,
            userPermissions: {
              ...row.userPermissions,
              [targetKey]: { ...current, [flag]: !current[flag] },
            },
          };
        })
      );
    },
    []
  );

  const handleIssueControlledCopy = useCallback((entry: AuditTrailEntry) => {
    setAuditTrail((prev) => [entry, ...prev]);
  }, []);

  const handleRecallObsolete = useCallback(
    (docCode: string, title: string, unit: string, version: string, reason: string) => {
      setDocuments((prev) =>
        prev.map((d) => (d.code === docCode ? { ...d, status: 'منسوخ' } : d))
      );

      setObsoleteDocs((prev) => {
        if (prev.some((o) => o.code === docCode && o.rev === version)) return prev;
        const nextRec: ObsoleteDocRecord = {
          id: `obs-dist-${Date.now()}`,
          code: docCode,
          title,
          unit,
          rev: version,
          retentionMonths: 60,
          obsoleteDate: '۱۴۰۳/۰۸/۲۴',
          supersededBy: 'ابطال و جمع‌آوری از شبکه توزیع',
          reason: reason || 'پایان دوره اعتبار / ابطال رسمی در مرکز توزیع اسناد (ISO 9001 §7.5.3.2)',
          yearGroup: '1403',
          tags: ['جمع‌آوری نسخ منسوخ', 'ISO 9001 §7.5.3'],
          sha256: `c4ca4238a0b923820dcc509a6f75849b...${Date.now().toString().slice(-4)}`,
          vaultZone: 'EDMS-RECALL-VAULT',
          fileSize: '۲.۱ مگابایت',
          archiver: 'مهندس مهران کاظمی (ادمین سامانه)',
        };
        return [nextRec, ...prev];
      });

      setAuditTrail((prev) => [
        {
          id: `log-recall-${Date.now()}`,
          type: 'recall',
          title: 'ابطال رسمی و دستور جمع‌آوری نسخ تحت کنترل',
          badge: 'جمع‌آوری و ابطال',
          docRef: `سند: ${docCode} ${version}`,
          detail: reason || 'اعلان جمع‌آوری نسخ کاغذی و مسدودسازی دسترسی چاپی در واحدها',
          timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
          tag: 'ISO 9001 Recall',
        },
        ...prev,
      ]);

      notify(
        `سند ${docCode} منسوخ و دستور جمع‌آوری صادر شد`,
        'نسخه‌های توزیع‌شده ابطال و در آرشیو نسخ منسوخ و گزارش ممیزی ISO 27001 ثبت گردید.',
        'warning'
      );
    },
    [notify]
  );

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    notify('اعلان‌ها به‌عنوان خوانده‌شده علامت‌گذاری شدند', undefined, 'info');
  }, [notify]);

  const handleReadNotification = useCallback(
    (id: string, targetRoute: RouteId) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
      handleNavigate(targetRoute);
    },
    [handleNavigate]
  );

  const handleAddUser = useCallback((newUser: UserAccount) => {
    setUsers((prev) => [newUser, ...prev]);
  }, []);

  const handleUpdateUser = useCallback(
    (id: string, patch: Partial<UserAccount>, auditAction?: string) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;
          const nextLogs = auditAction
            ? [
                {
                  id: `log-${Date.now()}`,
                  timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
                  action: auditAction,
                  actor: 'مهران کاظمی (مدیر IMS)',
                  actorRole: 'مدیر تضمین کیفیت و نماینده مدیریت IMS',
                  ipOrSource: '10.14.80.12 [ADMIN-CONSOLE]',
                  statusText: 'امضای دیجیتال معتبر',
                  statusTone: 'tertiary' as const,
                },
                ...u.auditLogs,
              ]
            : u.auditLogs;
          return { ...u, ...patch, auditLogs: nextLogs };
        })
      );
    },
    []
  );

  const handleDeleteUser = useCallback(
    (id: string) => {
      setUsers((prev) => {
        const next = prev.filter((u) => u.id !== id);
        if (selectedUserId === id && next.length > 0) {
          setSelectedUserId(next[0].id);
        }
        return next;
      });
    },
    [selectedUserId]
  );

  const handleSelectUserForDetail = useCallback(
    (id: string) => {
      setSelectedUserId(id);
      handleNavigate('users-detail');
    },
    [handleNavigate]
  );

  const handleSaveAccessLevel = useCallback(
    (level: AccessLevelDefinition, isNew: boolean) => {
      setAccessLevels((prev) =>
        isNew ? [...prev, level] : prev.map((l) => (l.id === level.id ? level : l))
      );
      if (!isNew) {
        setUsers((prev) =>
          prev.map((u) =>
            u.accessLevelId === level.id ? { ...u, securityLevel: level.baseTier } : u
          )
        );
      }
      notify(
        isNew ? `سطح دسترسی «${level.name}» ایجاد شد` : `سطح دسترسی «${level.name}» به‌روزرسانی شد`,
        `کد سطح: ${level.code} (هم‌تراز با ${level.baseTier})`,
        'success'
      );
    },
    [notify]
  );

  const handleAssignUsersLevel = useCallback(
    (userIds: string[], levelId: string) => {
      const targetLevel = accessLevels.find((l) => l.id === levelId);
      if (!targetLevel) return;
      const idSet = new Set(userIds);

      setUsers((prev) =>
        prev.map((u) =>
          idSet.has(u.id)
            ? {
                ...u,
                securityLevel: targetLevel.baseTier,
                accessLevelId: targetLevel.id,
                lastAccessReview: '۱۴۰۳/۰۸/۲۴ توسط مهران کاظمی',
                auditLogs: [
                  {
                    id: `log-lvl-${Date.now()}-${u.id.slice(-3)}`,
                    timestamp: '۱۴۰۳/۰۸/۲۴ - هم‌اکنون',
                    action: `تغییر سطح دسترسی به «${targetLevel.code} - ${targetLevel.name}»`,
                    actor: 'مهران کاظمی (مدیر IMS)',
                    actorRole: 'مدیر تضمین کیفیت و راهبر امنیت',
                    ipOrSource: '10.14.80.12 [ACCESS-LEVELS]',
                    statusText: 'امضای دیجیتال معتبر',
                    statusTone: 'tertiary' as const,
                  },
                  ...u.auditLogs,
                ],
              }
            : u
        )
      );

      notify(
        `سطح دسترسی ${userIds.length.toLocaleString('fa-IR')} کاربر به‌روزرسانی شد`,
        `تخصیص به سطح «${targetLevel.code} · ${targetLevel.name}» انجام گرفت.`,
        'success'
      );
    },
    [accessLevels, notify]
  );

  const handleAssignOrgEntityLevel = useCallback(
    (assignmentId: string, levelId: string) => {
      const targetLevel = accessLevels.find((l) => l.id === levelId);
      setOrgAccessAssignments((prev) =>
        prev.map((o) =>
          o.id === assignmentId
            ? {
                ...o,
                accessLevelId: levelId,
                updatedAt: '۱۴۰۳/۰۸/۲۴',
                updatedBy: 'مهندس مهران کاظمی',
              }
            : o
        )
      );
      if (targetLevel) {
        notify(
          'سطح دسترسی بخش سازمانی تغییر یافت',
          `سطح دسترسی جدید «${targetLevel.code} · ${targetLevel.name}» ثبت شد.`,
          'success'
        );
      }
    },
    [accessLevels, notify]
  );

  const handleAddOrgEntity = useCallback(
    (entity: OrgAccessAssignment) => {
      setOrgAccessAssignments((prev) => [entity, ...prev]);
      notify('نهاد / بخش جدید ثبت شد', `«${entity.name}» به فهرست تخصیص سطوح دسترسی اضافه گردید.`, 'success');
    },
    [notify]
  );

  const handleCascadeOrgLevelToUsers = useCallback(
    (entityType: 'management' | 'unit', entityName: string, levelId: string) => {
      const matchedIds = users
        .filter((u) => (entityType === 'management' ? u.management === entityName : u.unit === entityName))
        .map((u) => u.id);

      if (matchedIds.length === 0) {
        notify('کاربری در این بخش یافت نشد', `هیچ کاربری زیرمجموعه «${entityName}» ثبت نشده است.`, 'info');
        return;
      }
      handleAssignUsersLevel(matchedIds, levelId);
    },
    [users, handleAssignUsersLevel, notify]
  );

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const isAdmin = Boolean(
    currentUser && (currentUser.rbacLevel === 'L5 - Admin' || currentUser.permissions.includes('sys-users'))
  );
  const inboxBadgeCount = workflowDocs.filter((w) => w.tabGroup === 'my-inbox').length + 1;

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage
          onLoginSuccess={(enteredUsername) => {
            const q = enteredUsername.trim().toLowerCase();
            const matched = users.find(
              (u) => u.username.toLowerCase() === q || u.personnelCode.toLowerCase() === q
            );
            setCurrentUserId(matched?.id || 'usr-kazemi');
            setIsAuthenticated(true);
            setRoute('dashboard');
          }}
          onNotify={notify}
        />
      ) : (
        <LayoutShell
          currentRoute={route}
          onNavigate={handleNavigate}
          onLogout={() => {
            setIsAuthenticated(false);
            notify('خروج از نشست کاربری', 'ارتباط شما با سامانه A-IMS به‌صورت ایمن بسته شد.', 'info');
          }}
          cartableCount={inboxBadgeCount}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onReadNotification={handleReadNotification}
          documents={documents}
          users={users}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onSelectUserForDetail={handleSelectUserForDetail}
          onNotify={notify}
        >
          {route === 'dashboard' && (
            <DashboardPage
              documents={documents}
              capas={INITIAL_CAPAS}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-list' && (
            <DocumentsListPage documents={documents} onNavigate={handleNavigate} onNotify={notify} />
          )}

          {route === 'documents-create' && (
            <DocumentCreatePage
              documents={documents}
              users={users}
              onAddDocument={handleAddDocument}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-revision' && (
            <DocumentRevisionPage
              documents={documents}
              revisions={revisions}
              users={users}
              onAddRevision={handleAddRevision}
              onUpdateRevision={handleUpdateRevision}
              onExtendDocument={handleExtendDocument}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-approval-workflow' && (
            <ApprovalWorkflowPage
              workflowDocs={workflowDocs}
              users={users}
              onUpdateWorkflowDoc={handleUpdateWorkflowDoc}
              onPromoteRevision={handlePromoteRevision}
              onCeoFinalApprove={handleCeoFinalApprove}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-distribution' && (
            <DocumentDistributionPage
              documents={documents}
              workflowDocs={workflowDocs}
              revisions={revisions}
              matrixRows={matrixRows}
              auditTrail={auditTrail}
              pendingDistributions={pendingDistributions}
              users={users}
              onTogglePermission={handleTogglePermission}
              onEnsureMatrixRow={handleEnsureMatrixRow}
              onIssueControlledCopy={handleIssueControlledCopy}
              onPublishDistribution={handlePublishDistribution}
              onRecallObsolete={handleRecallObsolete}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-archive' && (
            <DocumentArchivePage
              obsoleteDocs={obsoleteDocs}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {(route === 'users-list' ||
            route === 'settings' ||
            route === 'users-create' ||
            route === 'users-detail' ||
            route === 'access-levels') && (
            <UsersManagementPage
              users={users}
              accessLevels={accessLevels}
              orgAssignments={orgAccessAssignments}
              selectedUserId={selectedUserId}
              isAdmin={isAdmin}
              initialTab={
                route === 'access-levels'
                  ? 'general-levels'
                  : route === 'users-detail'
                  ? 'granular-matrix'
                  : 'directory'
              }
              openCreateSignal={openCreateSignal}
              onSelectUser={setSelectedUserId}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onSaveAccessLevel={handleSaveAccessLevel}
              onAssignUsersLevel={handleAssignUsersLevel}
              onAssignOrgEntityLevel={handleAssignOrgEntityLevel}
              onAddOrgEntity={handleAddOrgEntity}
              onCascadeOrgLevelToUsers={handleCascadeOrgLevelToUsers}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route !== 'dashboard' &&
            route !== 'documents-list' &&
            route !== 'documents-create' &&
            route !== 'documents-revision' &&
            route !== 'documents-approval-workflow' &&
            route !== 'documents-distribution' &&
            route !== 'documents-archive' &&
            route !== 'users-list' &&
            route !== 'users-create' &&
            route !== 'users-detail' &&
            route !== 'access-levels' &&
            route !== 'settings' && (
              <OperationalModulePage route={route} onNavigate={handleNavigate} onNotify={notify} />
            )}
        </LayoutShell>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
