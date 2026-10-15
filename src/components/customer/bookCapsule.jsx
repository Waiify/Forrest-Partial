import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  BedSingle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export default function BookCapsule({
  capsules = [],
  onBack,
  onSubmit,
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedCapsule, setSelectedCapsule] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  
   /*Ang available nga capsules ra ang ipakita */
   
  const availableCapsules = useMemo(() => {
    return capsules.filter(
      (capsule) =>
        capsule.status?.toLowerCase() === "available"
    );
  }, [capsules]);
  
   /*Error Handling ni kay e prevent niya nga mag select ug past date*/
  const today = new Date().toISOString().split("T")[0];

   /*form validation */
  const validateBooking = () => {
    if (!selectedDate) {
      setError("Please select a date.");
      return false;
    }

    if (!startTime) {
      setError("Please select a check-in time.");
      return false;
    }

    if (!endTime) {
      setError("Please select a check-out time.");
      return false;
    }

    if (!selectedCapsule) {
      setError("Please select a capsule.");
      return false;
    }

    if (endTime <= startTime) {
      setError("Check-out time must be later than check-in time.");
      return false;
    }

    setError("");
    return true;
  };

  
   /*After selecting, e confirm dayon */
  const handleContinue = () => {
    if (!validateBooking()) return;

    setStep(2);
  };

  /* Submit the reservation. Wala pay database*/
  const handleSubmit = () => {
    if (!validateBooking()) return;

    const selected = availableCapsules.find(
      (capsule) => capsule.id === selectedCapsule
    );

    const reservation = {
      date: selectedDate,
      checkIn: startTime,
      checkOut: endTime,
      capsule: selectedCapsule,
      capsuleName:
        selected?.name || `Capsule ${selectedCapsule}`,
      status: "Pending",
    };

    onSubmit?.(reservation);
  };

  return (
    <div className="space-y-5">

      
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#0B4A2E]">
            Book Now
          </h2>

        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-[#D7E7DE] px-4 py-2 text-sm font-medium text-[#0B4A2E] transition hover:bg-[#F1F8F4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

     
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">

        
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              step === 1
                ? "bg-[#0B4A2E] text-white"
                : "bg-[#DCEDE4] text-[#0B4A2E]"
            }`}
          >
            1
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0B3B2A]">
              Select Reservation
            </p>

            <p className="text-xs text-[#7A9185]">
              Choose your date, time, and capsule.
            </p>
          </div>

          <div className="h-px w-10 bg-[#D7E7DE]" />

         
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              step === 2
                ? "bg-[#0B4A2E] text-white"
                : "bg-[#EAF4EE] text-[#6F8E7F]"
            }`}
          >
            2
          </div>

          <div>
            <p className="text-sm font-semibold text-[#0B3B2A]">
              Confirm
            </p>

            <p className="text-xs text-[#7A9185]">
              Review your reservation.
            </p>
          </div>

        </div>
      </div>

      
      {step === 1 && (
        <>
         
          <div className="grid gap-5 lg:grid-cols-2">

           
            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F2EB]">
                  <CalendarDays className="h-5 w-5 text-[#0B4A2E]" />
                </div>

                <div>
                  <h3 className="font-semibold text-[#0B3B2A]">
                    Select Date
                  </h3>

                  <p className="text-xs text-[#7A9185]">
                    When would you like to use the capsule?
                  </p>
                </div>
              </div>

              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setError("");
                }}
                className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-4 py-3 text-sm text-[#16352A] outline-none transition focus:border-[#0B4A2E] focus:ring-2 focus:ring-[#0B4A2E]/10"
              />

            </section>

          
            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F2EB]">
                  <Clock3 className="h-5 w-5 text-[#0B4A2E]" />
                </div>

                <div>
                  <h3 className="font-semibold text-[#0B3B2A]">
                    Select Time
                  </h3>

                  <p className="text-xs text-[#7A9185]">
                    Choose your check-in and check-out time.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#4E6B5D]">
                    Check-in
                  </label>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-3 py-3 text-sm text-[#16352A] outline-none focus:border-[#0B4A2E]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#4E6B5D]">
                    Check-out
                  </label>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-3 py-3 text-sm text-[#16352A] outline-none focus:border-[#0B4A2E]"
                  />
                </div>

              </div>

            </section>
          </div>

          {/* Makita ang available capsules */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F2EB]">
                  <BedSingle className="h-5 w-5 text-[#0B4A2E]" />
                </div>

                <div>
                  <h3 className="font-semibold text-[#0B3B2A]">
                    Available Capsules
                  </h3>

                  <p className="text-xs text-[#7A9185]">
                    Select one capsule for your reservation.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-[#EAF4EE] px-3 py-1 text-xs font-semibold text-[#287A4B]">
                {availableCapsules.length} available
              </span>

            </div>

            {availableCapsules.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {availableCapsules.map((capsule) => {
                  const isSelected =
                    selectedCapsule === capsule.id;

                  return (
                    <button
                      key={capsule.id}
                      type="button"
                      onClick={() => {
                        setSelectedCapsule(capsule.id);
                        setError("");
                      }}
                      className={`group overflow-hidden rounded-xl border text-left transition ${
                        isSelected
                          ? "border-[#0B4A2E] bg-[#F0F8F3] ring-2 ring-[#0B4A2E]/10"
                          : "border-[#DDEAE3] bg-[#F8FBF9] hover:border-[#B8D7C8] hover:shadow-sm"
                      }`}
                    >

                  
                      <div className="relative h-45 overflow-hidden bg-[#DDEDE5]">

                        {capsule.image ? (
                          <img
                            src={capsule.image}
                            alt={
                              capsule.name ||
                              `Capsule ${capsule.id}`
                            }
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#DCEDE4] to-[#BFDCCB]">
                            <BedSingle className="h-12 w-12 text-[#4D8067]" />
                          </div>
                        )}

                        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#287A4B] shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Available
                        </div>

                      </div>

                   
                      <div className="p-4">

                        <div className="flex items-center justify-between gap-2">

                          <h4 className="font-semibold text-[#0B3B2A]">
                            {capsule.name ||
                              `Capsule ${capsule.id}`}
                          </h4>

                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-[#0B4A2E]" />
                          )}

                        </div>

                        <p className="mt-1 text-xs text-[#6F8E7F]">
                          Ready for booking
                        </p>

                        {capsule.price && (
                          <p className="mt-2 text-xs font-semibold text-[#0B4A2E]">
                            ₱{capsule.price}
                            <span className="font-normal text-[#7A9185]">
                              {" "}
                              / hour
                            </span>
                          </p>
                        )}

                      </div>

                    </button>
                  );
                })}

              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#D7E7DE] bg-[#F8FBF9] px-6 py-12 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E5F2EB]">
                  <BedSingle className="h-6 w-6 text-[#4D8067]" />
                </div>

                <p className="mt-3 font-semibold text-[#0B3B2A]">
                  No capsules available
                </p>

                <p className="mt-1 text-sm text-[#7A9185]">
                  Please choose another date or check again later.
                </p>

              </div>
            )}
          </section>

          
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

         
          <div className="flex justify-end">

            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B4A2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#09391F]"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>

          </div>
        </>
      )}

      
      {step === 2 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#0B3B2A]">
              Confirm Reservation
            </h3>

            <p className="mt-1 text-sm text-[#6F8E7F]">
              Review your reservation details before submitting.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">

        
            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Date
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {selectedDate}
              </p>
            </div>

          
            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Reservation Time
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {startTime} - {endTime}
              </p>
            </div>

      
            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Capsule
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {availableCapsules.find(
                  (capsule) =>
                    capsule.id === selectedCapsule
                )?.name ||
                  `Capsule ${selectedCapsule}`}
              </p>
            </div>

           
            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Reservation Status
              </p>

              <p className="mt-1 font-semibold text-[#C58A16]">
                Pending
              </p>
            </div>

          </div>

          <div className="mt-5 rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] p-4">
            <p className="text-sm font-medium text-[#0B3B2A]">
              Reservation Request
            </p>

            <p className="mt-1 text-xs leading-5 text-[#6F8E7F]">
              Your reservation will be submitted for confirmation.
              You will receive an update once the reservation status
              has been processed.
            </p>
          </div>

     
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

         
          <div className="mt-6 flex flex-wrap justify-end gap-3">

            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D7E7DE] px-5 py-3 text-sm font-semibold text-[#4E6B5D] transition hover:bg-[#F5FAF7]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B4A2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#09391F]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Submit Reservation
            </button>

          </div>

        </section>
      )}

    </div>
  );
}