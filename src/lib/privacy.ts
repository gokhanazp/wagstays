import "server-only";
import { db } from "./db";
import { FALLBACK_AVATAR } from "./sitter-approval";
import { STORAGE_BUCKETS, createSupabaseAdminClient } from "./supabase/admin";
import { deleteUpload } from "./uploads";
import { changePoints } from "./wagpoints";

// PIPEDA self-service: "download my data" (access) and "close my account" (erasure).
// Bookings, payments and the WagPoints ledger are kept as a legal/financial record but point to an anonymised user.

export const EXPORT_COOLDOWN_MS = 60_000;
export const deletedEmail = (userId: string) => `deleted+${userId}@deleted.wagstays.ca`;

const hostOf = (endpoint: string) => {
  try {
    return new URL(endpoint).host;
  } catch {
    return null;
  }
};

/** Seconds until this user may download another export (rate-limited through the audit log), or 0. */
export async function exportCooldownSeconds(userId: string) {
  const last = await db.auditLog.findFirst({
    where: { actorId: userId, action: "user.data_export", createdAt: { gt: new Date(Date.now() - EXPORT_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last ? Math.max(1, Math.ceil((last.createdAt.getTime() + EXPORT_COOLDOWN_MS - Date.now()) / 1000)) : 0;
}

const bookingPrice = {
  quantity: true,
  petCount: true,
  subtotalCents: true,
  extrasCents: true,
  priceLines: true,
  protectionFeeCents: true,
  serviceFeeCents: true,
  discountCents: true,
  taxCents: true,
  totalCents: true,
} as const;

/** Every pet of a booking (primary first); older bookings without BookingPet rows list their single pet. */
function exportPetNames(primary: string, rows: { pet: { name: string } }[]) {
  const names = rows.map((r) => r.pet.name);
  return names.length ? [primary, ...names.filter((n, i) => n !== primary || names.indexOf(n) !== i)] : [primary];
}

/** Everything WagStays holds about a user, as a plain JSON-serialisable object. */
export async function buildDataExport(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      suspended: true,
      wagPointsCents: true,
      referralCode: true,
      referredBy: { select: { firstName: true } },
      _count: { select: { referrals: true } },
      createdAt: true,
      sitter: { select: { id: true } },
    },
  });
  const sitterId = user.sitter?.id ?? null;

  const [
    pets,
    ownerBookings,
    sitterProfile,
    sitterBookings,
    reviewsWritten,
    reviewsReceived,
    ownerReviewsReceived,
    conversations,
    messagesSent,
    favourites,
    ledger,
    applications,
    tickets,
    pushSubscriptions,
    newsletter,
  ] = await Promise.all([
    db.pet.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        species: true,
        speciesOther: true,
        breed: true,
        ageYears: true,
        size: true,
        sex: true,
        neutered: true,
        rabiesVaccinated: true,
        microchip: true,
        photoUrl: true,
        archivedAt: true,
        createdAt: true,
        traits: { select: { label: true, icon: true, tone: true } },
      },
    }),
    db.booking.findMany({
      where: { ownerId: userId },
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        recurringWeekly: true,
        seriesId: true,
        meetAndGreet: true,
        service: { select: { type: true, unit: true } },
        sitter: { select: { displayName: true } },
        pet: { select: { name: true } },
        pets: { select: { pet: { select: { name: true } } } },
        meetingAddress: true,
        leashPreference: true,
        otherAnimalsReaction: true,
        feedingRules: true,
        notes: true,
        gpsUpdates: true,
        emergencyName: true,
        emergencyPhone: true,
        vetClinic: true,
        vetPhone: true,
        ...bookingPrice,
        cardBrand: true,
        cardLast4: true,
        confirmedAt: true,
        completedAt: true,
        cancelledAt: true,
        cancelledBy: true,
        cancelReason: true,
        sitterNote: true,
        createdAt: true,
      },
    }),
    sitterId
      ? db.sitterProfile.findUnique({
          where: { id: sitterId },
          select: {
            slug: true,
            displayName: true,
            headline: true,
            bio: true,
            about: true,
            status: true,
            city: { select: { name: true } },
            neighbourhood: { select: { name: true } },
            locationNote: true,
            serviceAreaNote: true,
            avatarUrl: true,
            cardPhotoUrl: true,
            homeType: true,
            homeTitle: true,
            homeNote: true,
            rating: true,
            reviewCount: true,
            completedBookings: true,
            services: { select: { type: true, priceCents: true, unit: true, active: true } },
            photos: { select: { url: true, caption: true } },
            availability: { select: { weekday: true, startMinute: true, endMinute: true } },
            timeOff: { select: { startDate: true, endDate: true, note: true } },
            createdAt: true,
          },
        })
      : null,
    sitterId
      ? db.booking.findMany({
          where: { sitterId },
          orderBy: { startAt: "desc" },
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            service: { select: { type: true, unit: true } },
            owner: { select: { firstName: true } },
            pet: { select: { name: true } },
            pets: { select: { pet: { select: { name: true } } } },
            ...bookingPrice,
            sitterNote: true,
            confirmedAt: true,
            completedAt: true,
            cancelledAt: true,
            cancelledBy: true,
            createdAt: true,
          },
        })
      : [],
    db.review.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, sitter: { select: { displayName: true } }, bookingId: true, authorName: true, petLabel: true, rating: true, body: true, hidden: true, sitterReply: true, createdAt: true },
    }),
    sitterId
      ? db.review.findMany({
          where: { sitterId },
          orderBy: { createdAt: "desc" },
          select: { id: true, authorName: true, rating: true, body: true, hidden: true, sitterReply: true, createdAt: true },
        })
      : [],
    db.ownerReview.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      select: { bookingId: true, rating: true, body: true, createdAt: true },
    }),
    db.conversation.findMany({
      where: { OR: [{ ownerId: userId }, ...(sitterId ? [{ sitterId }] : [])] },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        owner: { select: { id: true, firstName: true } },
        sitter: { select: { userId: true, displayName: true } },
        createdAt: true,
        lastMessageAt: true,
        _count: { select: { messages: true } },
      },
    }),
    db.message.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, conversationId: true, body: true, createdAt: true },
    }),
    db.favorite.findMany({ where: { userId }, select: { sitter: { select: { displayName: true, slug: true } }, createdAt: true } }),
    db.wagPointsEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { amountCents: true, reason: true, note: true, bookingId: true, createdAt: true },
    }),
    db.sitterApplication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        trackingCode: true,
        status: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        neighbourhood: true,
        experience: true,
        homeType: true,
        bio: true,
        acceptsSmall: true,
        acceptsMedium: true,
        acceptsLarge: true,
        acceptsGiant: true,
        certFirstAid: true,
        certMedication: true,
        certPuppy: true,
        certBehaviour: true,
        smokeFree: true,
        noChildren: true,
        ownPets: true,
        fencedYard: true,
        meetGreetAt: true,
        reviewedAt: true,
        services: { select: { type: true, priceCents: true } },
        files: { select: { kind: true, fileName: true, contentType: true, sizeBytes: true, createdAt: true } },
        createdAt: true,
      },
    }),
    db.supportTicket.findMany({
      where: { openedById: userId },
      orderBy: { createdAt: "desc" },
      select: {
        reference: true,
        category: true,
        subject: true,
        status: true,
        bookingId: true,
        resolution: true,
        resolvedAt: true,
        createdAt: true,
        messages: {
          where: { internal: false },
          orderBy: { createdAt: "asc" },
          select: { body: true, createdAt: true, author: { select: { id: true, firstName: true } } },
        },
      },
    }),
    db.pushSubscription.findMany({ where: { userId }, select: { endpoint: true, userAgent: true, createdAt: true } }),
    db.newsletterSubscriber.findUnique({ where: { email: user.email }, select: { createdAt: true } }),
  ]);

  return {
    format: "wagstays-data-export/v1",
    generatedAt: new Date().toISOString(),
    note: "All personal information WagStays holds about your account. Amounts are in cents (CAD). Uploaded document contents are not included — only file names.",
    profile: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      suspended: user.suspended,
      wagPointsBalanceCents: user.wagPointsCents,
      referralCode: user.referralCode,
      referredBy: user.referredBy?.firstName ?? null,
      friendsReferred: user._count.referrals,
      newsletterSubscribedAt: newsletter?.createdAt ?? null,
      createdAt: user.createdAt,
    },
    pets,
    bookingsAsOwner: ownerBookings.map(({ sitter, pet, pets, service, ...b }) => ({
      ...b,
      sitter: sitter.displayName,
      pet: pet.name,
      pets: exportPetNames(pet.name, pets),
      service: service.type,
      unit: service.unit,
    })),
    sitterProfile,
    bookingsAsSitter: sitterBookings.map(({ owner, pet, pets, service, ...b }) => ({
      ...b,
      owner: owner.firstName,
      pet: pet.name,
      pets: exportPetNames(pet.name, pets),
      service: service.type,
      unit: service.unit,
    })),
    reviewsWritten: reviewsWritten.map(({ sitter, ...r }) => ({ ...r, sitter: sitter.displayName })),
    reviewsReceived,
    ownerReviewsReceived,
    conversations: conversations.map((c) => ({
      id: c.id,
      with: c.owner.id === userId ? c.sitter.displayName : c.owner.firstName,
      role: c.owner.id === userId ? "OWNER" : "SITTER",
      messageCount: c._count.messages,
      createdAt: c.createdAt,
      lastMessageAt: c.lastMessageAt,
    })),
    messagesSent,
    favourites: favourites.map((f) => ({ sitter: f.sitter.displayName, slug: f.sitter.slug, createdAt: f.createdAt })),
    wagPointsLedger: ledger,
    sitterApplications: applications,
    supportTickets: tickets.map((t) => ({
      ...t,
      messages: t.messages.map((m) => ({ from: m.author.id === userId ? "you" : "WagStays support", body: m.body, createdAt: m.createdAt })),
    })),
    pushSubscriptions: pushSubscriptions.map((p) => ({ endpointHost: hostOf(p.endpoint), userAgent: p.userAgent, createdAt: p.createdAt })),
  };
}

/** PENDING / CONFIRMED bookings that haven't ended yet, as owner or as sitter. These block account closure. */
export async function deletionBlockers(userId: string) {
  const bookings = await db.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      endAt: { gt: new Date() },
      OR: [{ ownerId: userId }, { sitter: { userId } }],
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      status: true,
      startAt: true,
      ownerId: true,
      service: { select: { type: true } },
      sitter: { select: { displayName: true } },
      owner: { select: { firstName: true } },
      pet: { select: { name: true } },
    },
  });
  return bookings.map((b) => ({
    id: b.id,
    status: b.status,
    startAt: b.startAt,
    service: b.service.type,
    asOwner: b.ownerId === userId,
    counterpart: b.ownerId === userId ? b.sitter.displayName : b.owner.firstName,
    pet: b.pet.name,
  }));
}
export type DeletionBlocker = Awaited<ReturnType<typeof deletionBlockers>>[number];

/**
 * Anonymises the account in one transaction, then removes the user's files from Storage.
 * The caller verifies the password and blockers, signs the user out and deletes the Supabase auth user.
 */
export async function anonymiseAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true,
      avatarUrl: true,
      wagPointsCents: true,
      pets: { select: { photoUrl: true } },
      sitter: { select: { id: true, avatarUrl: true, cardPhotoUrl: true, mapPhotoUrl: true, photos: { select: { url: true } }, neighbourhood: { select: { lat: true, lng: true } } } },
    },
  });
  const sitter = user.sitter;
  const applications = await db.sitterApplication.findMany({
    where: { OR: [{ userId }, ...(sitter ? [{ sitterProfileId: sitter.id }] : [])] },
    select: { id: true, files: { select: { path: true } } },
  });
  const applicationIds = applications.map((a) => a.id);
  const documentPaths = applications.flatMap((a) => a.files.map((f) => f.path));
  const mediaUrls = [
    user.avatarUrl,
    ...user.pets.map((p) => p.photoUrl),
    ...(sitter ? [sitter.avatarUrl, sitter.cardPhotoUrl, sitter.mapPhotoUrl, ...sitter.photos.map((p) => p.url)] : []),
  ].filter((u): u is string => !!u);
  const now = new Date();
  const anonEmail = deletedEmail(userId);

  const counts = await db.$transaction(
    async (tx) => {
      if (user.wagPointsCents > 0) {
        await changePoints(tx, { userId, amountCents: -user.wagPointsCents, reason: "ADMIN", note: "Forfeited when the account was closed" });
      }
      await tx.user.update({
        where: { id: userId },
        data: { email: anonEmail, firstName: "Deleted", lastName: "User", phone: null, avatarUrl: null, referralCode: null, deletedAt: now },
      });
      await tx.pet.updateMany({ where: { ownerId: userId, archivedAt: null }, data: { archivedAt: now } });
      const pets = await tx.pet.updateMany({ where: { ownerId: userId }, data: { photoUrl: null, microchip: null } });
      const favourites = await tx.favorite.deleteMany({ where: { userId } });
      const push = await tx.pushSubscription.deleteMany({ where: { userId } });
      const messages = await tx.message.updateMany({ where: { senderId: userId }, data: { body: "Message deleted" } });
      const reviews = await tx.review.updateMany({ where: { authorId: userId }, data: { authorName: "Former member", authorAvatar: null, petLabel: null } });
      // Contact details given to sitters for past bookings; prices and dates stay as the financial record.
      await tx.booking.updateMany({
        where: { ownerId: userId },
        data: { meetingAddress: null, emergencyName: null, emergencyPhone: null, vetClinic: null, vetPhone: null },
      });
      if (sitter) {
        await tx.sitterProfile.update({
          where: { id: sitter.id },
          data: {
            displayName: "Former sitter",
            slug: `former-sitter-${sitter.id}`,
            status: "PAUSED",
            featured: false,
            headline: "",
            bio: "",
            about: null,
            quote: null,
            residentPetName: null,
            locationNote: null,
            serviceAreaNote: null,
            homeNote: null,
            otherPetsNote: null,
            avatarUrl: FALLBACK_AVATAR,
            cardPhotoUrl: null,
            mapPhotoUrl: null,
            lat: sitter.neighbourhood.lat,
            lng: sitter.neighbourhood.lng,
          },
        });
        await tx.sitterPhoto.deleteMany({ where: { sitterId: sitter.id } });
        await tx.favorite.deleteMany({ where: { sitterId: sitter.id } });
      }
      if (applicationIds.length) {
        await tx.applicationFile.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.sitterApplication.updateMany({
          where: { id: { in: applicationIds } },
          data: { firstName: "Deleted", lastName: "User", email: anonEmail, phone: null, bio: "", idDocumentName: null, backgroundCheckName: null },
        });
      }
      await tx.newsletterSubscriber.deleteMany({ where: { email: user.email } });
      const summary = {
        pets: pets.count,
        favourites: favourites.count,
        pushSubscriptions: push.count,
        messages: messages.count,
        reviews: reviews.count,
        sitterProfile: !!sitter,
        applicationFiles: documentPaths.length,
        mediaFiles: mediaUrls.length,
        wagPointsForfeitedCents: Math.max(0, user.wagPointsCents),
      };
      await tx.auditLog.create({ data: { actorId: userId, action: "user.self_delete", entityType: "User", entityId: userId, details: JSON.stringify(summary) } });
      return summary;
    },
    { timeout: 20_000 },
  );

  // Storage isn't transactional: remove files once the database changes are committed (best effort).
  await Promise.allSettled(mediaUrls.map((u) => deleteUpload(u)));
  if (documentPaths.length) {
    await createSupabaseAdminClient().storage.from(STORAGE_BUCKETS.documents).remove(documentPaths).catch(() => null);
  }
  return counts;
}

/** How long records of a closed account (support tickets, chats, ratings, points history) are kept before purge. */
export const CLOSED_ACCOUNT_RETENTION_DAYS = 180;

/**
 * Permanently deletes the remaining records of accounts closed more than CLOSED_ACCOUNT_RETENTION_DAYS ago:
 * support tickets they opened and their ticket messages, conversations and messages, private ratings about them,
 * and their WagPoints history. Bookings/payments stay (anonymised) as financial records. Idempotent.
 * Runs nightly from /api/cron/purge-closed-accounts.
 */
export async function purgeClosedAccounts(now = new Date()) {
  const cutoff = new Date(now.getTime() - CLOSED_ACCOUNT_RETENTION_DAYS * 86_400_000);
  const users = await db.user.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, sitter: { select: { id: true } } },
  });
  const totals = { accounts: 0, tickets: 0, ticketMessages: 0, conversations: 0, messages: 0, ownerReviews: 0, pointsEntries: 0 };
  for (const u of users) {
    const sitterId = u.sitter?.id;
    const r = await db.$transaction([
      db.supportTicketMessage.deleteMany({ where: { authorId: u.id } }),
      db.supportTicket.deleteMany({ where: { openedById: u.id } }),
      db.message.deleteMany({ where: { senderId: u.id } }),
      db.conversation.deleteMany({ where: { OR: [{ ownerId: u.id }, ...(sitterId ? [{ sitterId }] : [])] } }),
      db.ownerReview.deleteMany({ where: { ownerId: u.id } }),
      db.wagPointsEntry.deleteMany({ where: { userId: u.id } }),
    ]);
    const [ticketMessages, tickets, messages, conversations, ownerReviews, pointsEntries] = r.map((x) => x.count);
    if (ticketMessages + tickets + messages + conversations + ownerReviews + pointsEntries === 0) continue;
    totals.accounts++;
    totals.ticketMessages += ticketMessages;
    totals.tickets += tickets;
    totals.messages += messages;
    totals.conversations += conversations;
    totals.ownerReviews += ownerReviews;
    totals.pointsEntries += pointsEntries;
    await db.auditLog.create({
      data: { actorId: u.id, action: "user.purge_closed", entityType: "User", entityId: u.id, details: JSON.stringify({ ticketMessages, tickets, messages, conversations, ownerReviews, pointsEntries }) },
    });
  }
  return totals;
}
