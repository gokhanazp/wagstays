import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSitterAvailability } from "@/lib/availability";
import { addDays, todayIn } from "@/lib/availability-core";
import { WeeklyHoursEditor } from "./_components/WeeklyHoursEditor";
import { BookingRulesForm } from "./_components/BookingRulesForm";
import { TimeOffManager } from "./_components/TimeOffManager";
import { AvailabilityPreview } from "./_components/AvailabilityPreview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitter.meta");
  return { title: `${t("availability")}` };
}

const PREVIEW_DAYS = 120;

export default async function SitterAvailabilityPage() {
  const { profile } = await requireSitter();
  const tz = profile.city.timeZone;
  const today = todayIn(tz, new Date().getTime());
  const [hours, timeOff, calendar, t] = await Promise.all([
    db.sitterAvailability.findMany({ where: { sitterId: profile.id }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }),
    db.sitterTimeOff.findMany({ where: { sitterId: profile.id, endDate: { gte: today } }, orderBy: { startDate: "asc" } }),
    getSitterAvailability(profile.id, today, addDays(today, PREVIEW_DAYS)),
    getTranslations("sitter"),
  ]);

  return (
    <>
      <PageHeader
        description={t("availability.description", { city: profile.city.name })}
        eyebrow={t("eyebrow")}
        title={t("meta.availability")}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="schedule" title={t("availability.weeklyHours")} />
            <WeeklyHoursEditor initial={hours.map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute }))} />
          </Card>

        </div>

        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="beach_access" title={t("availability.timeOff")} />
            <TimeOffManager items={timeOff.map(({ id, startDate, endDate, note }) => ({ id, startDate, endDate, note }))} today={today} />
          </Card>
          <Card className="pb-space-lg">
            <CardHeader icon="tune" title={t("availability.bookingRules")} />
            <BookingRulesForm boardingCapacity={profile.boardingCapacity} noticeHours={profile.noticeHours} />
          </Card>
        </div>
      </div>

      <Card className="pb-space-lg">
        <CardHeader icon="calendar_month" title={t("availability.calendarPreview")} />
        <AvailabilityPreview days={calendar?.days.map(({ date, status, ranges, visits, stays }) => ({ date, status, ranges, visits, stays })) ?? []} today={today} />
      </Card>
    </>
  );
}
