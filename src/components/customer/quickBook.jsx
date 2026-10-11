import { BedSingle, ArrowRight, CheckCircle2 } from "lucide-react";
import Card from "./card.jsx";

export default function QuickBook({
  capsules = [],
  onReserve,
  onViewAll,
}) {
  const availableCapsules = capsules
    .filter(
      (capsule) =>
        capsule.status?.toLowerCase() === "available"
    )
    .slice(0, 2);

  return (
    <Card
      title="Available Capsules"
      icon={BedSingle}
      action="View All"
      onAction={onViewAll}
      className="h-full"
    >
    
      <p className="mb-3 text-xs text-[#6F8E7F]">
        Browse available capsules and book your preferred space.
      </p>

   
      <div className="space-y-2.5">
        {availableCapsules.length > 0 ? (
          availableCapsules.map((capsule) => (
            <div
              key={capsule.id}
              className="flex h-[72px] overflow-hidden rounded-xl border border-[#E1ECE6] bg-[#F8FBF9] transition hover:border-[#B8D7C8] hover:shadow-sm"
            >
            
              <div className="relative h-full w-[105px] shrink-0 overflow-hidden bg-[#DDEDE5]">
                {capsule.image ? (
                  <img
                    src={capsule.image}
                    alt={
                      capsule.name ||
                      `Capsule ${capsule.id}`
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#DCEDE4] to-[#BFDCCB]">
                    <BedSingle className="h-8 w-8 text-[#4D8067]" />
                  </div>
                )}

               
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-[#287A4B] shadow-sm">
                  <CheckCircle2 className="h-3 w-3" />
                  Available
                </div>
              </div>

     
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3">

                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-[#0B3B2A]">
                    {capsule.name ||
                      `Capsule ${capsule.id}`}
                  </h4>

                  <p className="mt-0.5 text-[11px] text-[#6F8E7F]">
                    Ready for booking
                  </p>

                  {capsule.price && (
                    <p className="mt-0.5 text-[10px] font-medium text-[#0B4A2E]">
                      ₱{capsule.price}
                      <span className="font-normal text-[#7B9186]">
                        {" "}
                        / hour
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onReserve?.(capsule.id)}
                  className="shrink-0 rounded-lg bg-[#0B4A2E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#09391F]"
                >
                  Book Now
                </button>

              </div>
            </div>
          ))
        ) : (
          <div className="flex h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E7DF] bg-[#F8FBF9] text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#E5F2EB]">
              <BedSingle className="h-4 w-4 text-[#4D8067]" />
            </div>

            <p className="text-sm font-semibold text-[#0B3B2A]">
              No capsules available
            </p>

            <p className="mt-1 text-xs text-[#7A9185]">
              Please check again later.
            </p>
          </div>
        )}
      </div>

      
      <button
        type="button"
        onClick={onViewAll}
        className="mt-3 flex h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-[#D7E7DE] text-xs font-semibold text-[#0B4A2E] transition hover:bg-[#F1F8F4]"
      >
        Browse All Capsules
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </Card>
  );
}