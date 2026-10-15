
export default function Card({ title, icon: Icon, action, onAction, className = "", children }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0B3B2A]">
          {Icon && <Icon className="h-4 w-4 text-[#0B4A2E]" />}
          {title}
        </h3>
        {action && (
          <button type="button" onClick={onAction} className="text-xs font-medium text-[#0B4A2E] hover:underline">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
