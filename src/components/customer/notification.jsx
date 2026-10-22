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
  const getNotificationIcon = (notification) => {
    if (notification.type === "confirmed") {
      return CheckCircle2;
    }

    if (notification.type === "cancelled") {
      return XCircle;
    }

    if (notification.type === "rescheduled") {
      return CalendarClock;
    }

    return Clock3;
  };

  const getNotificationIconStyle = (notification) => {
    if (notification.type === "confirmed") {
      return "bg-green-100 text-green-600";
    }

    if (notification.type === "cancelled") {
      return "bg-red-100 text-red-600";
    }

    if (notification.type === "rescheduled") {
      return "bg-blue-100 text-blue-600";
    }

    return "bg-[#E8F3ED] text-[#2F9E7A]";
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B4A2E]">
          Notifications
        </h2>

        <p className="mt-1 text-sm text-[#6F8E7F]">
          Stay updated with your reservation status and
          account activities.
        </p>
      </div>

      {/* Notifications List */}
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
              const Icon = getNotificationIcon(
                notification
              );

              return (
                <div
                  key={notification.id}
                  className={`flex gap-4 p-5 transition hover:bg-[#F7FBF9] ${
                    !notification.read
                      ? "bg-[#F3FAF6]"
                      : "bg-white"
                  }`}
                >

                  {/* Icon */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${getNotificationIconStyle(
                      notification
                    )}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <h3 className="text-sm font-semibold text-[#0B4A2E]">
                          {notification.title}
                        </h3>

                        {notification.status && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-semibold text-yellow-700">
                            Status: {notification.status}
                        </span>
                        )}

                        {!notification.read && (
                          <span className="mt-1 inline-block rounded-full bg-[#2F9E7A] px-2 py-0.5 text-[10px] font-semibold text-white">
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