/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { LayoutShell } from './components/LayoutShell';
import { ToastContainer } from './components/ToastContainer';
import {
  INITIAL_AUDIT_TRAIL,
  INITIAL_CAPAS,
  INITIAL_DISTRIBUTION_MATRIX,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_OBSOLETE_DOCS,
  INITIAL_REVISIONS,
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
import {
  AuditTrailEntry,
  DistributionMatrixRow,
  ImsDocument,
  NotificationItem,
  PermissionFlags,
  RevisionItem,
  RouteId,
  ToastMessage,
  WorkflowDoc,
} from './types/ims';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [route, setRoute] = useState<RouteId>('dashboard');

  const [documents, setDocuments] = useState<ImsDocument[]>(INITIAL_DOCUMENTS);
  const [revisions, setRevisions] = useState<RevisionItem[]>(INITIAL_REVISIONS);
  const [workflowDocs, setWorkflowDocs] = useState<WorkflowDoc[]>(INITIAL_WORKFLOW_DOCS);
  const [matrixRows, setMatrixRows] = useState<DistributionMatrixRow[]>(INITIAL_DISTRIBUTION_MATRIX);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>(INITIAL_AUDIT_TRAIL);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
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

  const handleAddRevision = useCallback((item: RevisionItem) => {
    setRevisions((prev) => [item, ...prev]);
  }, []);

  const handleUpdateRevision = useCallback((id: string, patch: Partial<RevisionItem>) => {
    setRevisions((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const handleUpdateWorkflowDoc = useCallback((id: string, patch: Partial<WorkflowDoc>) => {
    setWorkflowDocs((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
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

  const inboxBadgeCount = workflowDocs.filter((w) => w.tabGroup === 'my-inbox').length + 1;

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage
          onLoginSuccess={() => {
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
              onAddDocument={handleAddDocument}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-revision' && (
            <DocumentRevisionPage
              revisions={revisions}
              onAddRevision={handleAddRevision}
              onUpdateRevision={handleUpdateRevision}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-approval-workflow' && (
            <ApprovalWorkflowPage
              workflowDocs={workflowDocs}
              onUpdateWorkflowDoc={handleUpdateWorkflowDoc}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-distribution' && (
            <DocumentDistributionPage
              matrixRows={matrixRows}
              auditTrail={auditTrail}
              onTogglePermission={handleTogglePermission}
              onIssueControlledCopy={handleIssueControlledCopy}
              onNavigate={handleNavigate}
              onNotify={notify}
            />
          )}

          {route === 'documents-archive' && (
            <DocumentArchivePage
              obsoleteDocs={INITIAL_OBSOLETE_DOCS}
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
            route !== 'documents-archive' && (
              <OperationalModulePage route={route} onNavigate={handleNavigate} onNotify={notify} />
            )}
        </LayoutShell>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
