
import {
  Bell,
  CheckCircle2,
  Clock3,
  XCircle,
  CalendarClock,
} from "lucide-react";

export default function Notification({
  notifications = [],
}) {
  const getNotificationType = (notification) => {
    const type = notification.type?.toLowerCase();
    const status = notification.status?.toLowerCase();
    const title = notification.title?.toLowerCase();

    if (type === "confirmed" || status === "confirmed") {
      return "confirmed";
    }

    if (type === "cancelled" || status === "cancelled") {
      return "cancelled";
    }

    if (type === "rescheduled" || title?.includes("rescheduled")) {
      return "rescheduled";
    }

    if (
      type === "pending" ||
      status === "pending" ||
      title?.includes("submitted")
    ) {
      return "pending";
    }

    return "default";
  };

  const getNotificationIcon = (notification) => {
    const type = getNotificationType(notification);

    if (type === "confirmed") return CheckCircle2;
    if (type === "cancelled") return XCircle;
    if (type === "rescheduled") return CalendarClock;

    return Clock3;
  };

  const getNotificationIconStyle = (notification) => {
    const type = getNotificationType(notification);

    const styles = {
      confirmed: "bg-green-100 text-green-600",
      pending: "bg-blue-100 text-blue-600",
      cancelled: "bg-red-100 text-red-600",
      rescheduled: "bg-blue-100 text-blue-600",
      default: "bg-[#E8F3ED] text-[#2F9E7A]",
    };

    return styles[type];
  };

  const getStatusStyle = (notification) => {
    const type = getNotificationType(notification);

    const styles = {
      confirmed: "bg-green-100 text-green-700",
      pending: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
      rescheduled: "bg-blue-100 text-blue-700",
      default: "bg-yellow-100 text-yellow-700",
    };

    return styles[type];
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mt-1 text-sm text-[#6F8E7F]">
          Stay updated with your reservation status and
          account activities.
        </p>
      </div>

      <div className="rounded-2xl border border-[#CFE3D9] bg-white shadow-sm">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F3ED]">
              <Bell className="h-7 w-7 text-[#2F9E7A]" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-[#0B4A2E]">
              No notifications yet
            </h3>

            <p className="mt-1 max-w-md text-sm text-[#6F8E7F]">
              You will receive notifications here when
              there are updates regarding your reservations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2EEE8]">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification);

              return (
                <div
                  key={notification.id}
                  className={`flex gap-4 p-5 transition hover:bg-[#F7FBF9] ${
                    !notification.read
                      ? "bg-[#F3FAF6]"
                      : "bg-white"
                  }`}
                >
                  {/* Notification Icon */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${getNotificationIconStyle(
                      notification
                    )}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Notification Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[#0B4A2E]">
                          {notification.title}
                        </h3>

                        {notification.status && (
                          <span
                            className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusStyle(
                              notification
                            )}`}
                          >
                            Status: {notification.status}
                          </span>
                        )}

                        {!notification.read && (
                          <span className="ml-1 mt-1 inline-block rounded-full bg-[#2F9E7A] px-2 py-0.5 text-[10px] font-semibold text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      {notification.timestamp && (
                        <span className="shrink-0 text-xs text-[#8AA196]">
                          {notification.timestamp}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-[#536F62]">
                      {notification.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
