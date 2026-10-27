export default function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-3" aria-label="DAFTAR | دفتر">
      <svg
        width={big ? 48 : 32}
        height={big ? 48 : 32}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <rect x="6" y="4" width="32" height="40" rx="6" fill="#191E25" stroke="#303740" strokeWidth="2" />
        <path d="M14 4v40" stroke="#D6FF3F" strokeWidth="3" strokeLinecap="round" />
        <path d="M21 16h11M21 24h11M21 32h7" stroke="#A0A7B2" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <div className={`font-bold tracking-wide ${big ? "text-2xl" : "text-lg"}`} dir="ltr">
          DAFTAR
        </div>
        <div className={`text-muted ${big ? "text-sm" : "text-xs"}`}>دفتر</div>
      </div>
    </div>
  );
}
