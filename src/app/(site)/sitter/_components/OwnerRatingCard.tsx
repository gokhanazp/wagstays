import { Card } from "@/components/ui";
import { db } from "@/lib/db";
import { splitOwnerNote } from "@/lib/review-rules";
import { RateOwnerForm } from "./RateOwnerForm";

/**
 * Booking detail (sitter): the sitter's own private rating of the pet parent, or the form to leave one
 * once the booking is COMPLETED. Only this sitter's rating for this booking is ever loaded here.
 */
export async function OwnerRatingCard({
  booking,
  sitterId,
}: {
  booking: { id: string; status: string; owner: { firstName: string } };
  sitterId: string;
}) {
  if (booking.status !== "COMPLETED") return null;
  const mine = await db.ownerReview.findFirst({ where: { bookingId: booking.id, sitterId }, select: { rating: true, body: true, hidden: true } });
  const name = booking.owner.firstName;

  if (!mine) {
    return (
      <div className="lg:col-span-2">
        <RateOwnerForm bookingId={booking.id} ownerFirstName={name} />
      </div>
    );
  }
  const { tags, note } = splitOwnerNote(mine.body);
  return (
    <Card className="p-space-lg lg:col-span-2 flex flex-col gap-space-sm">
      <span className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
        <span className="material-symbols-outlined text-base">lock</span>
        Your private rating of {name}
      </span>
      <span aria-label={`${mine.rating} out of 5`} className="font-title-md text-title-md text-tertiary-container">
        {"★".repeat(mine.rating)}
        <span className="text-outline-variant">{"★".repeat(5 - mine.rating)}</span>
      </span>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-space-xs">
          {tags.map((t) => (
            <span className="inline-flex items-center h-8 px-space-sm rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-label-md" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
      {note && <p className="font-body-md text-body-md text-on-surface whitespace-pre-line break-words">{note}</p>}
      {mine.hidden && <p className="font-body-sm text-body-sm text-on-surface-variant">This rating was hidden by WagStays moderators and doesn&apos;t count towards {name}&apos;s reputation.</p>}
    </Card>
  );
}
