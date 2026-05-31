import React, { useEffect, useRef } from 'react';
import {
  Bell,
  BellRing,
  X,
  AlertTriangle,
  ArrowRightLeft,
  Package,
  UserPlus,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { useSession } from '../../application/context/SessionContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationCentreProps {
  onNavigate: (
    panel:
      | 'overview'
      | 'inventory'
      | 'transfers'
      | 'sales'
      | 'governance'
      | 'reports'
      | 'purchase-orders'
  ) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type NotificationType =
  | 'low_stock'
  | 'expiry'
  | 'reconciliation'
  | 'pending_transfer'
  | 'po_received'
  | 'new_staff';

function getTypeStyles(type: NotificationType): {
  barColor: string;
  bgTint: string;
  icon: React.ReactNode;
} {
  switch (type) {
    case 'low_stock':
    case 'expiry':
    case 'reconciliation':
      return {
        barColor: 'bg-red-500',
        bgTint: 'bg-red-50',
        icon: <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />,
      };
    case 'pending_transfer':
      return {
        barColor: 'bg-amber-500',
        bgTint: 'bg-amber-50',
        icon: <ArrowRightLeft className="h-4 w-4 text-amber-500 flex-shrink-0" />,
      };
    case 'po_received':
      return {
        barColor: 'bg-blue-500',
        bgTint: 'bg-blue-50',
        icon: <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />,
      };
    case 'new_staff':
      return {
        barColor: 'bg-blue-500',
        bgTint: 'bg-blue-50',
        icon: <UserPlus className="h-4 w-4 text-blue-500 flex-shrink-0" />,
      };
    default:
      return {
        barColor: 'bg-slate-400',
        bgTint: 'bg-slate-50',
        icon: <Bell className="h-4 w-4 text-slate-400 flex-shrink-0" />,
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NotificationCentre: React.FC<NotificationCentreProps> = ({
  onNavigate,
}) => {
  const [open, setOpen] = React.useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllRead,
    dismissNotification,
  } = useSession();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleView = (
    id: string,
    panelTarget?: NotificationCentreProps['onNavigate'] extends (panel: infer P) => void ? P : never
  ) => {
    markNotificationRead(id);
    if (panelTarget) onNavigate(panelTarget);
    setOpen(false);
  };

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Bell trigger button                                                  */}
      {/* ------------------------------------------------------------------ */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            aria-hidden="true"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Overlay                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Drawer panel                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-96 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-slate-800">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
                {badgeLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="ml-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Bell className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  You're all caught up!
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  New alerts will appear here when they arrive.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification: any) => {
                const { barColor, bgTint, icon } = getTypeStyles(
                  notification.type as NotificationType
                );
                const isUnread = !notification.read;

                return (
                  <li
                    key={notification.id}
                    className={`relative flex gap-0 transition-colors ${
                      isUnread ? bgTint : 'bg-white'
                    } hover:brightness-[0.97]`}
                  >
                    {/* Left colored bar */}
                    <div
                      className={`w-1 flex-shrink-0 self-stretch rounded-none ${
                        isUnread ? barColor : 'bg-slate-200'
                      }`}
                      aria-hidden="true"
                    />

                    {/* Content */}
                    <div className="flex flex-1 flex-col gap-1.5 px-4 py-3.5">
                      {/* Top row: icon + title + dismiss */}
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">{icon}</div>
                        <p
                          className={`flex-1 text-sm leading-snug ${
                            isUnread
                              ? 'font-semibold text-slate-800'
                              : 'font-medium text-slate-600'
                          }`}
                        >
                          {notification.title}
                        </p>

                        {/* Dismiss X */}
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          aria-label="Dismiss notification"
                          className="flex-shrink-0 rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-200 hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Message */}
                      {notification.message && (
                        <p className="pl-6 text-xs leading-relaxed text-slate-500">
                          {notification.message}
                        </p>
                      )}

                      {/* Meta row: time + branch */}
                      <div className="flex items-center gap-2 pl-6">
                        <Clock className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <span className="text-[11px] text-slate-400">
                          {relativeTime(notification.createdAt)}
                        </span>
                        {notification.branch && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                              {notification.branch}
                            </span>
                          </>
                        )}
                        {/* Unread dot */}
                        {isUnread && (
                          <span
                            className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500"
                            aria-label="Unread"
                          />
                        )}
                      </div>

                      {/* Action: View button */}
                      {notification.panelTarget && (
                        <div className="pl-6 pt-0.5">
                          <button
                            onClick={() =>
                              handleView(
                                notification.id,
                                notification.panelTarget
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-center">
            <p className="text-xs text-slate-400">
              Showing {notifications.length} notification
              {notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationCentre;
