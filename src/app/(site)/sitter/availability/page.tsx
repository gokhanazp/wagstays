import type { Metadata } from "next";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSitterAvailability } from "@/lib/availability";
import { addDays, todayIn } from "@/lib/availability-core";
import { WeeklyHoursEditor } from "./_components/WeeklyHoursEditor";
import { BookingRulesForm } from "./_components/BookingRulesForm";
import { TimeOffManager } from "./_components/TimeOffManager";
import { AvailabilityPreview } from "./_components/AvailabilityPreview";

export const metadata: Metadata = { title: "Availability | WagStays" };

const PREVIEW_DAYS = 120;

export default async function SitterAvailabilityPage() {
  const { profile } = await requireSitter();
  const tz = profile.city.timeZone;
  const today = todayIn(tz, new Date().getTime());
  const [hours, timeOff, calendar] = await Promise.all([
    db.sitterAvailability.findMany({ where: { sitterId: profile.id }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }),
    db.sitterTimeOff.findMany({ where: { sitterId: profile.id, endDate: { gte: today } }, orderBy: { startDate: "asc" } }),
    getSitterAvailability(profile.id, today, addDays(today, PREVIEW_DAYS)),
  ]);

  return (
    <>
      <PageHeader
        description={`Set when owners can book you. Times are in ${profile.city.name} time; bookings outside your hours, on time off or beyond your capacity are blocked automatically.`}
        eyebrow="Sitter Dashboard"
        title="Availability"
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="schedule" title="Weekly hours" />
            <WeeklyHoursEditor initial={hours.map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute }))} />
          </Card>

        </div>

        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="beach_access" title="Time off" />
            <TimeOffManager items={timeOff.map(({ id, startDate, endDate, note }) => ({ id, startDate, endDate, note }))} today={today} />
          </Card>
          <Card className="pb-space-lg">
            <CardHeader icon="tune" title="Booking rules" />
            <BookingRulesForm boardingCapacity={profile.boardingCapacity} noticeHours={profile.noticeHours} />
          </Card>
        </div>
      </div>

      <Card className="pb-space-lg">
        <CardHeader icon="calendar_month" title="Calendar preview" />
        <AvailabilityPreview days={calendar?.days.map(({ date, status, ranges, visits, stays }) => ({ date, status, ranges, visits, stays })) ?? []} today={today} />
      </Card>
    </>
  );
}
