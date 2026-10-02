export type TimeSlotKey = "morning" | "midday" | "afternoon" | "evening";

export type TimeSlot = {
  key: TimeSlotKey;
  label: string;
  start: string;
  end: string;
};

export const TIME_SLOTS: readonly TimeSlot[] = [
  { key: "morning", label: "9:00 – 10:00 AM (Morning)", start: "09:00", end: "10:00" },
  { key: "midday", label: "11:00 AM – 12:00 PM (Midday)", start: "11:00", end: "12:00" },
  { key: "afternoon", label: "5:00 – 6:00 PM (Afternoon)", start: "17:00", end: "18:00" },
  { key: "evening", label: "7:30 – 8:30 PM (Evening)", start: "19:30", end: "20:30" },
] as const;

export function getTimeSlot(key: string | null | undefined): TimeSlot | undefined {
  return TIME_SLOTS.find((s) => s.key === key);
}
