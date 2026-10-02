import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const img = (n: number) => `/images/img-${String(n).padStart(2, "0")}.${n === 1 || n === 19 ? "png" : "jpg"}`;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

const CITIES = [
  { slug: "toronto", name: "Toronto", province: "Ontario", provinceCode: "ON", taxRateBps: 1300, isActive: true, lat: 43.6532, lng: -79.3832 },
  { slug: "ottawa", name: "Ottawa", province: "Ontario", provinceCode: "ON", taxRateBps: 1300, isActive: false, lat: 45.4215, lng: -75.6972 },
  { slug: "vancouver", name: "Vancouver", province: "British Columbia", provinceCode: "BC", taxRateBps: 1200, isActive: false, lat: 49.2827, lng: -123.1207 },
  { slug: "montreal", name: "Montréal", province: "Quebec", provinceCode: "QC", taxRateBps: 1498, isActive: false, lat: 45.5019, lng: -73.5674 },
  { slug: "calgary", name: "Calgary", province: "Alberta", provinceCode: "AB", taxRateBps: 500, isActive: false, lat: 51.0447, lng: -114.0719 },
];

const HOODS = [
  { slug: "the-beaches", name: "The Beaches", lat: 43.6677, lng: -79.2975 },
  { slug: "leslieville", name: "Leslieville", lat: 43.6626, lng: -79.3326 },
  { slug: "riverside", name: "Riverside", lat: 43.6591, lng: -79.3497 },
  { slug: "upper-beaches", name: "Upper Beaches", lat: 43.68, lng: -79.305 },
  { slug: "east-danforth", name: "East Danforth", lat: 43.684, lng: -79.32 },
  { slug: "the-annex", name: "The Annex", lat: 43.6703, lng: -79.404 },
  { slug: "liberty-village", name: "Liberty Village", lat: 43.6383, lng: -79.4207 },
  { slug: "roncesvalles", name: "Roncesvalles", lat: 43.6466, lng: -79.4485 },
  { slug: "leaside", name: "Leaside", lat: 43.7047, lng: -79.3667 },
  { slug: "kensington-market", name: "Kensington Market", lat: 43.6547, lng: -79.4005 },
  { slug: "high-park", name: "High Park", lat: 43.6465, lng: -79.4637 },
  { slug: "yorkville", name: "Yorkville", lat: 43.6709, lng: -79.3933 },
];

type Svc = { type: string; priceCents: number; unit: string; durationMins?: number; description?: string; extraNote?: string };
type SitterSeed = {
  first: string;
  last: string;
  displayName: string;
  slug: string;
  hood: string;
  offset: [number, number]; // lat/lng nudge from neighbourhood centre
  avatar: string;
  card?: string;
  map?: string;
  headline: string;
  locationNote: string;
  bio: string;
  rating: number;
  reviewCount: number;
  completedBookings: number;
  responseTimeMins: number;
  repeatClientPct: number;
  yearsExperience: number;
  flags: Partial<Record<
    | "isSuperSitter" | "instantBook" | "idVerified" | "backgroundChecked" | "firstAidCertified" | "vetKnowledge"
    | "professionalTrainer" | "hasYard" | "smokeFree" | "hasChildren" | "hasOtherPets"
    | "acceptsSmall" | "acceptsMedium" | "acceptsLarge" | "acceptsGiant" | "featured",
    boolean
  >>;
  extra?: Record<string, unknown>;
  services: Svc[];
  tags: { label: string; icon: string; tone?: string }[];
};

const walk = (dollars: number, extra: Partial<Svc> = {}): Svc => ({ type: "DOG_WALKING", priceCents: dollars * 100, unit: "WALK", durationMins: 60, ...extra });
const board = (dollars: number, extra: Partial<Svc> = {}): Svc => ({ type: "BOARDING", priceCents: dollars * 100, unit: "NIGHT", ...extra });
const daycare = (dollars: number, extra: Partial<Svc> = {}): Svc => ({ type: "DAY_CARE", priceCents: dollars * 100, unit: "DAY", ...extra });
const dropin = (dollars: number, extra: Partial<Svc> = {}): Svc => ({ type: "DROP_IN", priceCents: dollars * 100, unit: "VISIT", durationMins: 30, ...extra });

const SITTERS: SitterSeed[] = [
  {
    first: "Sarah", last: "Mitchell", displayName: "Sarah Mitchell", slug: "sarah-mitchell", hood: "the-beaches", offset: [0.002, 0.004],
    avatar: img(27), card: img(14), map: img(18),
    headline: "Certified Positive Dog Trainer", locationNote: "Woodbine Beach",
    bio: "I live in a detached house with a big fenced yard in The Beaches. Your dog gets at least 3 long, quality walks a day, always with positive-reinforcement training.",
    rating: 4.99, reviewCount: 86, completedBookings: 140, responseTimeMins: 15, repeatClientPct: 95, yearsExperience: 6,
    flags: { isSuperSitter: true, idVerified: true, backgroundChecked: true, firstAidCertified: true, professionalTrainer: true, hasYard: true, smokeFree: true, hasChildren: false, hasOtherPets: true, acceptsSmall: true, acceptsMedium: true, acceptsLarge: true, acceptsGiant: false },
    extra: {
      serviceRadiusKm: 3.5,
      serviceAreaNote: "The Beaches, Upper Beaches, Leslieville, Riverside and East Danforth",
      homeType: "HOUSE_WITH_YARD",
      homeTitle: "Ground-Floor Home with Yard",
      homeNote: "Ground floor with a private, fully fenced 45 m² lawn",
      otherPetsNote: "Spayed, gentle and fully vaccinated female Golden Retriever",
      ratingCommunication: 5, ratingReliability: 5, ratingCare: 5,
    },
    services: [
      walk(32, { description: "Live GPS route tracking, potty report, paw wipe-down and fresh water included.", extraNote: "The Beaches & Nearby" }),
      board(70, { description: "Stays in Sarah's home with a yard, at least 3 walks a day and round-the-clock love and attention.", extraNote: "Cage-Free Home" }),
      daycare(48, { description: "No more lonely workdays. Social play, backyard exercise and nap time.", extraNote: "Max 3 Pets" }),
      dropin(24, { description: "Food and water refresh, litter box cleaning, play and cuddles in your own home.", extraNote: "Ideal for Cats" }),
    ],
    tags: [
      { label: "Large Yard", icon: "yard" },
      { label: "Live GPS Tracking", icon: "location_searching" },
      { label: "Instant Photos & Video", icon: "photo_camera" },
      { label: "95% Repeat Clients", icon: "", tone: "primary" },
    ],
  },
  {
    first: "Liam", last: "Walsh", displayName: "Liam & Priya", slug: "liam-and-priya", hood: "leslieville", offset: [0.001, -0.002],
    avatar: img(15), card: img(15),
    headline: "4th-Year Veterinary Students", locationNote: "Leslieville",
    bio: "We're both veterinary students. We have lots of experience with medical monitoring, regular injections and special care for senior or sensitive pets.",
    rating: 4.95, reviewCount: 54, completedBookings: 96, responseTimeMins: 30, repeatClientPct: 88, yearsExperience: 4,
    flags: { idVerified: true, backgroundChecked: true, vetKnowledge: true, firstAidCertified: true, smokeFree: true, acceptsSmall: true, acceptsMedium: true, acceptsLarge: true },
    services: [walk(30), board(65), dropin(24)],
    tags: [
      { label: "Medication Tracking", icon: "medical_services", tone: "primary" },
      { label: "Smoke-Free Home", icon: "smoke_free" },
      { label: "24/7 Health Monitoring", icon: "monitor_heart" },
    ],
  },
  {
    first: "Linda", last: "Kowalski", displayName: "Linda K.", slug: "linda-k", hood: "the-beaches", offset: [-0.002, -0.003],
    avatar: img(16), card: img(16),
    headline: "Full-Time Animal Lover", locationNote: "Near Kew Beach Public School",
    bio: "I work from home, so I can give your dog uninterrupted attention all day. A calm, loving home, healthy homemade treats and plenty of playtime.",
    rating: 5.0, reviewCount: 41, completedBookings: 77, responseTimeMins: 8, repeatClientPct: 91, yearsExperience: 9,
    flags: { idVerified: true, backgroundChecked: true, smokeFree: true, hasChildren: false, acceptsSmall: true, acceptsMedium: true },
    extra: { highlight: "Fast Response (<10 min)", highlightIcon: "bolt" },
    services: [walk(35), daycare(45), dropin(22)],
    tags: [
      { label: "Child-Free Quiet Home", icon: "child_care" },
      { label: "Flexible Hours", icon: "schedule" },
      { label: "Live Video Calls", icon: "videocam" },
    ],
  },
  {
    first: "Marcus", last: "Bennett", displayName: "Marcus Bennett", slug: "marcus-bennett", hood: "leslieville", offset: [0.004, 0.012],
    avatar: img(17), card: img(17),
    headline: "Active Lifestyle & Running Coach", locationNote: "Near Ashbridges Bay Park",
    bio: "I run brisk walks and controlled jogging sessions on beach and park trails for high-energy dogs that love to run. Water breaks and route logs included.",
    rating: 4.9, reviewCount: 32, completedBookings: 58, responseTimeMins: 25, repeatClientPct: 84, yearsExperience: 3,
    flags: { idVerified: true, backgroundChecked: true, acceptsMedium: true, acceptsLarge: true, acceptsGiant: true },
    services: [walk(28)],
    tags: [
      { label: "High-Tempo Exercise", icon: "directions_run" },
      { label: "Route & Distance Report", icon: "route" },
      { label: "Hydration Tracking", icon: "water_drop" },
    ],
  },
  {
    first: "Olivia", last: "Kim", displayName: "Olivia K.", slug: "olivia-k", hood: "the-annex", offset: [0.001, 0.002],
    avatar: img(7), card: img(7),
    headline: "Vet Technician", locationNote: "The Annex",
    bio: "I've cared for cats and dogs for 7 years. My home has a large, safe balcony and a playroom, and I'm trained to give medication.",
    rating: 4.99, reviewCount: 88, completedBookings: 150, responseTimeMins: 20, repeatClientPct: 90, yearsExperience: 7,
    flags: { idVerified: true, backgroundChecked: true, vetKnowledge: true, firstAidCertified: true, featured: true, acceptsSmall: true, acceptsMedium: true, acceptsLarge: true },
    extra: {
      credential: "Vet Technician", featuredBadge: "ID Verified", featuredBadgeIcon: "verified",
      quote: "I've cared for cats and dogs for 7 years. My home has a large, safe balcony and a playroom, and I'm trained to give medication.",
    },
    services: [board(60), dropin(24), walk(30)],
    tags: [{ label: "🐶 Large & Small Dogs", icon: "" }, { label: "🐱 Cats", icon: "" }],
  },
  {
    first: "Ryan", last: "Scott", displayName: "Ryan S.", slug: "ryan-s", hood: "liberty-village", offset: [0.001, 0.001],
    avatar: img(8), card: img(8),
    headline: "Pet First Aid Certified", locationNote: "Liberty Village",
    bio: "I work from home full-time, so your pup is never alone. Three park walks a day and regular live video check-ins.",
    rating: 5.0, reviewCount: 142, completedBookings: 260, responseTimeMins: 12, repeatClientPct: 93, yearsExperience: 5,
    flags: { isSuperSitter: true, idVerified: true, backgroundChecked: true, firstAidCertified: true, hasYard: true, featured: true, acceptsSmall: true, acceptsMedium: true, acceptsLarge: true },
    extra: {
      credential: "First Aid Certified", featuredBadge: "Super Sitter", featuredBadgeIcon: "local_fire_department",
      quote: "I work from home full-time, so your pup is never alone. Three park walks a day and regular live video check-ins.",
    },
    services: [walk(30), board(68), daycare(46)],
    tags: [{ label: "🐕 Active Dogs", icon: "" }, { label: "🌿 Home with Yard", icon: "" }],
  },
  {
    first: "Chloe", last: "Dubois", displayName: "Chloe & Ethan D.", slug: "chloe-and-ethan-d", hood: "roncesvalles", offset: [0.001, 0.001],
    avatar: img(9), card: img(9),
    headline: "Sitter Duo", locationNote: "Roncesvalles",
    bio: "We specialise in shy and sensitive cats. On every visit your cat feels the love, and we're meticulous about litter and food hygiene.",
    rating: 4.98, reviewCount: 67, completedBookings: 120, responseTimeMins: 18, repeatClientPct: 89, yearsExperience: 6,
    flags: { idVerified: true, backgroundChecked: true, featured: true, acceptsSmall: true },
    extra: {
      credential: "Sitter Duo", featuredBadge: "Cat Expert", featuredBadgeIcon: "pets",
      quote: "We specialise in shy and sensitive cats. On every visit your cat feels the love, and we're meticulous about litter and food hygiene.",
    },
    services: [dropin(24), board(55)],
    tags: [{ label: "🐈 Cat Visits", icon: "" }, { label: "🐇 Rabbits & Hamsters", icon: "" }],
  },
  // Additional Toronto sitters so search, filters and pagination have real data.
  {
    first: "Grace", last: "Liu", displayName: "Grace Liu", slug: "grace-liu", hood: "kensington-market", offset: [0, 0],
    avatar: img(3), card: img(3), headline: "Cat Whisperer & Foster Volunteer", locationNote: "Kensington Market",
    bio: "I've fostered more than 40 kittens with Toronto rescues. Calm drop-ins, playtime and detailed photo updates for every visit.",
    rating: 4.93, reviewCount: 38, completedBookings: 64, responseTimeMins: 22, repeatClientPct: 86, yearsExperience: 5,
    flags: { idVerified: true, backgroundChecked: true, smokeFree: true, acceptsSmall: true },
    services: [dropin(22), board(55)],
    tags: [{ label: "Cat Specialist", icon: "pets" }, { label: "Photo Updates", icon: "photo_camera" }],
  },
  {
    first: "Daniel", last: "Okafor", displayName: "Daniel Okafor", slug: "daniel-okafor", hood: "high-park", offset: [0.002, 0.003],
    avatar: img(4), card: img(4), headline: "Large Breed Specialist", locationNote: "High Park",
    bio: "Big dogs are my favourite. Daily adventures around High Park, structured leash work and lots of belly rubs.",
    rating: 4.88, reviewCount: 29, completedBookings: 51, responseTimeMins: 35, repeatClientPct: 80, yearsExperience: 4,
    flags: { idVerified: true, backgroundChecked: true, hasYard: true, acceptsMedium: true, acceptsLarge: true, acceptsGiant: true },
    services: [walk(29), board(66), daycare(45)],
    tags: [{ label: "Large Yard", icon: "yard" }, { label: "Live GPS Tracking", icon: "location_searching" }],
  },
  {
    first: "Maya", last: "Patel", displayName: "Maya Patel", slug: "maya-patel", hood: "riverside", offset: [0.001, -0.001],
    avatar: img(5), card: img(5), headline: "Small Dog Expert", locationNote: "Riverside",
    bio: "Small and toy breeds get my full attention — cozy naps, short sniffy walks and plenty of lap time.",
    rating: 4.96, reviewCount: 47, completedBookings: 83, responseTimeMins: 14, repeatClientPct: 90, yearsExperience: 6,
    flags: { isSuperSitter: true, idVerified: true, backgroundChecked: true, smokeFree: true, acceptsSmall: true },
    services: [walk(30), board(62), dropin(23)],
    tags: [{ label: "Smoke-Free Home", icon: "smoke_free" }, { label: "Instant Photos & Video", icon: "photo_camera" }],
  },
  {
    first: "Sophie", last: "Tremblay", displayName: "Sophie Tremblay", slug: "sophie-tremblay", hood: "leaside", offset: [0, 0.002],
    avatar: img(23), card: img(23), headline: "Puppy Training Assistant", locationNote: "Leaside",
    bio: "Puppies are my specialty: potty routines, crate comfort and gentle socialisation while you're at work.",
    rating: 4.92, reviewCount: 35, completedBookings: 60, responseTimeMins: 28, repeatClientPct: 85, yearsExperience: 3,
    flags: { idVerified: true, professionalTrainer: true, acceptsSmall: true, acceptsMedium: true },
    services: [daycare(46), walk(30)],
    tags: [{ label: "Puppy Care", icon: "pets" }, { label: "Flexible Hours", icon: "schedule" }],
  },
  {
    first: "Emma", last: "Wilson", displayName: "Emma Wilson", slug: "emma-wilson", hood: "upper-beaches", offset: [0.001, 0.001],
    avatar: img(21), card: img(21), headline: "Golden Retriever Mom of Two", locationNote: "Upper Beaches",
    bio: "My two goldens love company. Your dog joins our pack for beach walks, backyard games and cozy evenings.",
    rating: 4.97, reviewCount: 52, completedBookings: 90, responseTimeMins: 16, repeatClientPct: 92, yearsExperience: 7,
    flags: { idVerified: true, backgroundChecked: true, hasYard: true, hasOtherPets: true, acceptsMedium: true, acceptsLarge: true },
    services: [board(68), daycare(47), walk(31)],
    tags: [{ label: "Large Yard", icon: "yard" }, { label: "Dog-Friendly Pack", icon: "diversity_1" }],
  },
  {
    first: "Jacob", last: "Martin", displayName: "Jacob Martin", slug: "jacob-martin", hood: "east-danforth", offset: [0, 0],
    avatar: img(13), card: img(13), headline: "Group Walk Leader", locationNote: "East Danforth",
    bio: "Small-group adventures for social dogs, with careful matching by size and energy. GPS route shared after every walk.",
    rating: 4.85, reviewCount: 26, completedBookings: 48, responseTimeMins: 40, repeatClientPct: 78, yearsExperience: 2,
    flags: { idVerified: true, acceptsSmall: true, acceptsMedium: true, acceptsLarge: true },
    services: [walk(26), daycare(42)],
    tags: [{ label: "Route & Distance Report", icon: "route" }, { label: "High-Tempo Exercise", icon: "directions_run" }],
  },
  {
    first: "Ava", last: "Nguyen", displayName: "Ava Nguyen", slug: "ava-nguyen", hood: "yorkville", offset: [0.001, 0],
    avatar: img(22), card: img(22), headline: "Senior Pet Companion", locationNote: "Yorkville",
    bio: "Gentle, patient care for senior pets — slow strolls, medication on schedule and a quiet condo to rest in.",
    rating: 4.94, reviewCount: 31, completedBookings: 55, responseTimeMins: 20, repeatClientPct: 87, yearsExperience: 8,
    flags: { idVerified: true, backgroundChecked: true, firstAidCertified: true, smokeFree: true, acceptsSmall: true, acceptsMedium: true },
    services: [dropin(24), walk(32), board(64)],
    tags: [{ label: "Medication Tracking", icon: "medical_services", tone: "primary" }, { label: "Child-Free Quiet Home", icon: "child_care" }],
  },
];

async function main() {
  // wipe (order matters for FKs)
  await db.$transaction([
    db.applicationService.deleteMany(), db.sitterApplication.deleteMany(), db.favorite.deleteMany(),
    db.review.deleteMany(), db.booking.deleteMany(), db.service.deleteMany(), db.sitterPhoto.deleteMany(),
    db.sitterTag.deleteMany(), db.sitterSkill.deleteMany(), db.sitterProfile.deleteMany(), db.petTrait.deleteMany(),
    db.pet.deleteMany(), db.user.deleteMany(), db.neighbourhood.deleteMany(), db.city.deleteMany(),
    db.newsletterSubscriber.deleteMany(),
  ]);

  const cities = await Promise.all(CITIES.map((c) => db.city.create({ data: c })));
  const toronto = cities.find((c) => c.slug === "toronto")!;
  const hoods = Object.fromEntries(
    await Promise.all(
      HOODS.map(async (h) => [h.slug, await db.neighbourhood.create({ data: { ...h, cityId: toronto.id } })] as const),
    ),
  );

  const passwordHash = await bcrypt.hash("wagstays123", 10);

  await db.user.create({
    data: { email: "admin@wagstays.ca", firstName: "Admin", lastName: "WagStays", role: "ADMIN", passwordHash },
  });

  const emily = await db.user.create({
    data: {
      email: "emily@wagstays.ca", firstName: "Emily", lastName: "Young", phone: "+1 (416) 555-0119",
      avatarUrl: img(2), role: "OWNER", wagPointsCents: 700, passwordHash,
      pets: {
        create: [
          {
            name: "Maple", species: "DOG", breed: "Golden Retriever", ageYears: 2.5, size: "LARGE", sex: "MALE",
            neutered: true, rabiesVaccinated: true, microchip: "981098103982", photoUrl: img(36),
            traits: {
              create: [
                { label: "🎾 Tennis Ball Fanatic" },
                { label: "🐾 People-Friendly" },
                { label: "⚠️ Chicken Allergy", tone: "warning" },
              ],
            },
          },
          { name: "Biscuit", species: "CAT", breed: "Tabby", ageYears: 4, size: "SMALL", sex: "FEMALE", neutered: true, rabiesVaccinated: true },
        ],
      },
    },
  });

  const sitterIds: Record<string, string> = {};
  for (const [i, s] of SITTERS.entries()) {
    const hood = hoods[s.hood];
    const user = await db.user.create({
      data: { email: `${s.slug}@wagstays.ca`, firstName: s.first, lastName: s.last, role: "SITTER", avatarUrl: s.avatar, passwordHash },
    });
    const profile = await db.sitterProfile.create({
      data: {
        userId: user.id, slug: s.slug, displayName: s.displayName, headline: s.headline, bio: s.bio,
        cityId: toronto.id, neighbourhoodId: hood.id, locationNote: s.locationNote,
        lat: hood.lat + s.offset[0], lng: hood.lng + s.offset[1],
        avatarUrl: s.avatar, cardPhotoUrl: s.card ?? s.avatar, mapPhotoUrl: s.map ?? s.avatar,
        rating: s.rating, reviewCount: s.reviewCount, completedBookings: s.completedBookings,
        responseTimeMins: s.responseTimeMins, repeatClientPct: s.repeatClientPct, yearsExperience: s.yearsExperience,
        ratingCommunication: s.rating, ratingReliability: s.rating, ratingCare: s.rating,
        ...s.flags,
        ...s.extra,
        createdAt: daysAgo(400 - i * 20),
        services: { create: s.services },
        tags: { create: s.tags.map((t, j) => ({ ...t, sortOrder: j })) },
      },
    });
    sitterIds[s.slug] = profile.id;
  }

  // Sarah's profile extras — gallery and skills
  await db.sitterPhoto.createMany({
    data: [
      { sitterId: sitterIds["sarah-mitchell"], url: img(28), caption: "Woodbine Beach Walks 🐾", sortOrder: 0 },
      { sitterId: sitterIds["sarah-mitchell"], url: img(29), caption: "Cozy Rest Corner", sortOrder: 1 },
      { sitterId: sitterIds["sarah-mitchell"], url: img(30), caption: "Secure Yard", sortOrder: 2 },
      { sitterId: sitterIds["sarah-mitchell"], url: img(31), caption: null, sortOrder: 3 },
    ],
  });
  await db.sitterSkill.createMany({
    data: [
      { label: "Large Breed Experience", emoji: "🐾" },
      { label: "Can Give Oral Medication", emoji: "💊" },
      { label: "Great for High-Energy Dogs", emoji: "🎾" },
      { label: "Puppy Care", emoji: "🎾" },
      { label: "Cat Socialisation", emoji: "🐱" },
    ].map((s, i) => ({ ...s, sitterId: sitterIds["sarah-mitchell"], sortOrder: i })),
  });

  await db.review.createMany({
    data: [
      {
        sitterId: sitterIds["sarah-mitchell"], authorName: "Alex K.", authorAvatar: img(32), petLabel: "Milo (French Bulldog) Parent",
        rating: 5, createdAt: daysAgo(3), walkSummary: "2.8 km · 58 min · Woodbine Beach", walkPhotoUrl: img(33),
        body: "Sarah is simply amazing! Milo is usually shy with strangers, but he loved Sarah's calm energy from the very first minute. She shared the live GPS route step by step, and the video they took at the beach made my day. Milo came home happy and relaxed. We've now booked her 3 days a week!",
      },
      {
        sitterId: sitterIds["sarah-mitchell"], authorName: "Hannah A.", authorAvatar: img(34), petLabel: "Cotton & Caramel (Cats) Parent",
        rating: 5, createdAt: daysAgo(14), verifiedBooking: true,
        body: "She did home visits for the 4 days I was out of town. She gave my cats their medication right on time and even took extra care to keep the place tidy. Travelling without worrying is priceless. Highly recommend.",
      },
      {
        sitterId: sitterIds["sarah-mitchell"], authorName: "David M.", authorAvatar: img(35), petLabel: "Storm (Labrador) Parent",
        rating: 5, createdAt: daysAgo(32), verifiedBooking: true,
        body: "Storm stayed with Sarah for 3 nights. Thanks to her yard and her own dog Luna's calm nature, Storm wasn't stressed at all. It's the first time my dog has come home from boarding this happy. Thank you, Sarah!",
      },
      // Home page testimonials
      {
        sitterId: sitterIds["olivia-k"], authorName: "Jessica Park", authorAvatar: img(10), petLabel: "Maple's Mom (Golden Retriever, 3 yrs) • The Beaches",
        rating: 5, featuredOnHome: true, createdAt: daysAgo(20),
        body: "I left Maple with Olivia for 4 days during a work trip. Dozens of photos every day, running videos and GPS walk maps put my mind completely at ease! Maple honestly didn't want to come home :)",
      },
      {
        sitterId: sitterIds["chloe-and-ethan-d"], authorName: "Michael Brooks", authorAvatar: img(11), petLabel: "Whiskers' Dad (Tabby, 2 yrs) • Liberty Village",
        rating: 5, featuredOnHome: true, createdAt: daysAgo(26),
        body: "Whiskers is very shy with new people. On day one Chloe patiently talked to him from a distance and won him over with treats. Litter and food hygiene were spotless. WagStays is our go-to now.",
      },
      {
        sitterId: sitterIds["ryan-s"], authorName: "Sophie & Noah T.", authorAvatar: img(12), petLabel: "Pebble's Family (Pug, 4 yrs) • Leaside",
        rating: 5, featuredOnHome: true, createdAt: daysAgo(40),
        body: "On busy office days we book walks 3 times a week so our pug Pebble can burn off energy. Watching the live route on my phone is a wonderful luxury.",
      },
    ],
  });

  await db.favorite.create({ data: { userId: emily.id, sitterId: sitterIds["sarah-mitchell"] } });

  console.log(`Seeded ${cities.length} cities, ${HOODS.length} neighbourhoods, ${SITTERS.length} sitters.`);
  console.log("Demo login: emily@wagstays.ca / wagstays123 (admin: admin@wagstays.ca)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
