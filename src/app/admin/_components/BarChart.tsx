/**
 * Single-series daily bar chart in pure SVG/CSS (no chart library).
 * Each bar has a hover tooltip; a visually hidden table provides the data to screen readers.
 */
export function BarChart({ data, label, unit = "bookings" }: { data: { key: string; label: string; short: string; value: number }[]; label: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const ticks = [0, nice / 2, nice];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <figure className="flex flex-col gap-space-sm">
      <div className="flex gap-space-sm">
        <div aria-hidden className="relative w-6 shrink-0 h-44 font-label-sm text-label-sm text-on-surface-variant">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / nice) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div aria-hidden className="relative flex-1 h-44">
          {ticks.map((t) => (
            <span key={t} className="absolute inset-x-0 border-t border-[#EFE7DE]" style={{ top: `${100 - (t / nice) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d) => (
              <div key={d.key} className="group relative flex-1 h-full flex items-end justify-center">
                <div
                  className="w-full max-w-[18px] rounded-t-[4px] bg-primary-container group-hover:bg-primary transition-colors"
                  style={{ height: d.value ? `${(d.value / nice) * 100}%` : 0, minHeight: d.value ? 3 : 0 }}
                />
                <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center whitespace-nowrap px-space-sm py-1 rounded-lg bg-inverse-surface text-inverse-on-surface font-label-sm text-label-sm z-10">
                  <span>{d.label}</span>
                  <span className="font-label-md text-label-md">
                    {d.value} {d.value === 1 ? unit.replace(/s$/, "") : unit}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className="flex gap-space-sm">
        <span className="w-6 shrink-0" />
        <div className="flex-1 flex justify-between font-label-sm text-label-sm text-on-surface-variant">
          <span>{data[0]?.short}</span>
          <span className="hidden sm:inline">{data[Math.floor(data.length / 2)]?.short}</span>
          <span>{data[data.length - 1]?.short}</span>
        </div>
      </div>
      <figcaption className="font-body-sm text-body-sm text-on-surface-variant">
        {label}: {total} {unit} in total.
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
