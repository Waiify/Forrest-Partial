import {
  Snowflake,
  Wifi,
  Zap,
  Lightbulb,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";

import capsule2 from "../../assets/capsules/capsule2.png";
import capsule4 from "../../assets/capsules/capsule4.png";
import capsule6 from "../../assets/capsules/capsule6.png";

const spaces = [
  {
    name: "Female Capsule Room",
    description:
      "12 individual capsule beds in a shared female-only room.",
    image: capsule2,
    status: "Available",
    features: [
      { name: "Air-conditioned", icon: Snowflake },
      { name: "Wi-Fi", icon: Wifi },
      { name: "Power socket", icon: Zap },
      { name: "Reading light", icon: Lightbulb },
    ],
  },
  {
    name: "Male Capsule Room",
    description:
      "12 individual capsule beds in a shared male-only room.",
    image: capsule4,
    status: "Available",
    features: [
      { name: "Air-conditioned", icon: Snowflake },
      { name: "Wi-Fi", icon: Wifi },
      { name: "Power socket", icon: Zap },
      { name: "Reading light", icon: Lightbulb },
    ],
  },
  {
    name: "Solo Rooms",
    description:
      "6 private rooms for customers who prefer their own space.",
    image: capsule6,
    status: "Available",
    features: [
      { name: "Private space", icon: LockKeyhole },
      { name: "Air-conditioned", icon: Snowflake },
      { name: "Wi-Fi", icon: Wifi },
      { name: "Power socket", icon: Zap },
    ],
  },
];

function SpaceCard({ space, onViewAvailability }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">

      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={space.image}
          alt={space.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

        {/* Status */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {space.status}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">

        {/* Title */}
        <h3 className="text-base font-bold text-[#0B3B2A]">
          {space.name}
        </h3>

        {/* Description */}
        <p className="mt-2 min-h-[40px] text-xs leading-5 text-gray-500">
          {space.description}
        </p>

        {/* Features */}
        <div className="mt-4 flex min-h-[48px] flex-wrap gap-1.5">
          {space.features.map((feature) => {
            const Icon = feature.icon;

            return (
              <span
                key={feature.name}
                className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1.5 text-[10px] font-medium text-gray-600"
              >
                <Icon className="h-3.5 w-3.5" />
                {feature.name}
              </span>
            );
          })}
        </div>

        {/* Button */}
        <button
  type="button"
  onClick={() => onViewAvailability(space.name)}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#033D22] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0A5A35]"
>
  View Availability
  <ArrowRight className="h-3.5 w-3.5" />
</button>

      </div>
    </div>
  );
}

export default function AvailableSpaces({ onViewAvailability }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">

      {/* Header */}
      <div className="mb-7">
        <p className="text-sm font-semibold text-[#0A5A35]">
          Services Offered
        </p>

        <h1 className="mt-1 text-2xl font-bold text-[#0B3B2A]">
          Our Spaces
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Explore our capsule spaces and private solo rooms.
          Check the features and current status of each space
          before choosing your preferred schedule.
        </p>
      </div>

      {/* Space Cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {spaces.map((space) => (
          <SpaceCard
            key={space.name}
            space={space}
            onViewAvailability={onViewAvailability}
          />
        ))}
      </div>

    </div>
  );
}