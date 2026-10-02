"use client";

import { startTransition, useActionState, useEffect, useState, type ReactNode } from "react";
import { submitApplication } from "@/app/actions/application";
import { Select } from "@/components/forms/Select";
import { PET_SIZE_LABELS, PET_SIZES, SERVICE_LABELS, type ServiceType } from "@/lib/constants";
import { SERVICE_PRICE_RULES } from "@/lib/sitter-application";
import { FileUploadRow, HomePhotos } from "./Uploads";

type Prefill = { firstName: string; lastName: string; email: string; phone: string };

type Props = { neighbourhoods: { id: string; label: string }[]; prefill: Prefill; isLoggedIn: boolean; sidebar: ReactNode };

const SERVICES: {
  type: ServiceType;
  icon: string;
  iconBox: string;
  blurb: string;
  rateLabel: string;
  unit: string;
  defaultOn: boolean;
}[] = [
  { type: "DOG_WALKING", icon: "directions_walk", iconBox: "bg-primary-fixed text-on-primary-fixed", blurb: "45–60 min brisk walk", rateLabel: "Hourly Base Rate:", unit: "/hour", defaultOn: true },
  { type: "BOARDING", icon: "night_shelter", iconBox: "bg-secondary-fixed text-on-secondary-fixed", blurb: "Overnight stays in your home", rateLabel: "Nightly Base Rate:", unit: "/night", defaultOn: true },
  { type: "DROP_IN", icon: "cruelty_free", iconBox: "bg-tertiary-fixed text-on-tertiary-fixed", blurb: "Food, litter & 30–40 min of play", rateLabel: "Per-Visit Rate:", unit: "/visit", defaultOn: true },
  { type: "DAY_CARE", icon: "wb_sunny", iconBox: "bg-surface-container-highest text-primary", blurb: "8:30 AM – 6:30 PM", rateLabel: "Daily Base Rate:", unit: "/day", defaultOn: false },
];

const SERVICE_TITLES: Partial<Record<ServiceType, string>> = { DROP_IN: "Cat & Home Visits" };

const EXPERIENCE = [
  { value: "1-3", label: "1 – 3 Years" },
  { value: "3-6", label: "3 – 6 Years ⭐" },
  { value: "6+", label: "6+ Years" },
  { value: "VET", label: "Vet / Trainer" },
];

const SIZE_FIELDS = { SMALL: "acceptsSmall", MEDIUM: "acceptsMedium", LARGE: "acceptsLarge", GIANT: "acceptsGiant" } as const;

const CERTS = [
  { name: "certFirstAid", title: "Vet / Pet First Aid & CPR Certificate", blurb: "Know exactly what to do in an emergency" },
  { name: "certMedication", title: "Oral & Liquid Medication", blurb: "For pets on a regular medication routine" },
  { name: "certPuppy", title: "Puppy & Kitten Care Specialist", blurb: "House-training and high-energy handling" },
  { name: "certBehaviour", title: "Behaviour / Reactive Dog Training", blurb: "Working with anxious or reactive pets" },
];

const HOME_TYPES = [
  { value: "HOUSE_WITH_YARD", icon: "fence", title: "House with Yard", blurb: "Private space with secure fencing" },
  { value: "APARTMENT", icon: "apartment", title: "Apartment", blurb: "Spacious living room, elevator building" },
  { value: "CONDO_BALCONY", icon: "balcony", title: "Condo with Netted Balcony", blurb: "Cat-safe balcony netting installed" },
];

const HOME_CRITERIA = [
  { name: "smokeFree", icon: "smoke_free", label: "Strictly smoke-free home" },
  { name: "noChildren", icon: "child_friendly", label: "No children aged 0–10 at home" },
  { name: "ownPets", icon: "pets", label: "I have my own friendly pet(s)" },
  { name: "fencedYard", icon: "yard", label: "Fully enclosed, fenced yard" },
];

const STEPS = [
  { title: "Personal Info", icon: "person", anchor: "section-personal" },
  { title: "Services & Pricing", icon: "payments", anchor: "section-services" },
  { title: "Experience & Home", icon: "pets", anchor: "section-experience" },
  { title: "ID & Verification", icon: "shield", anchor: "section-verification" },
];

const BIO_MIN = 80;
const BIO_MAX = 500;

const inputCls =
  "w-full px-4 py-3 rounded-2xl bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-body-md text-body-md placeholder:text-outline transition-all";
const errorRing = "ring-2 ring-error";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="font-label-sm text-label-sm text-error flex items-center gap-1 mt-1" data-field-error role="alert">
      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
        error
      </span>
      {msg}
    </p>
  );
}

function SectionLabel({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
        {icon}
      </span>
      <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">{children}</span>
    </div>
  );
}

const phoneOk = (v: string) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").length === 10;
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function ApplicationForm({ neighbourhoods, prefill, isLoggedIn, sidebar }: Props) {
  const [state, formAction, pending] = useActionState(submitApplication, undefined);
  const [cleared, setCleared] = useState<Set<string>>(new Set());

  // Controlled fields that drive the step tracker
  const [personal, setPersonal] = useState({ ...prefill, neighbourhood: "" });
  const [services, setServices] = useState(() =>
    Object.fromEntries(
      SERVICES.map((s) => [s.type, { on: s.defaultOn, price: String(SERVICE_PRICE_RULES[s.type].suggested) }]),
    ) as Record<ServiceType, { on: boolean; price: string }>,
  );
  const [experience, setExperience] = useState("3-6");
  const [homeType, setHomeType] = useState("HOUSE_WITH_YARD");
  const [bio, setBio] = useState("");
  const [idDoc, setIdDoc] = useState("");
  // Storage folder for this form session's uploads (applications/<draftId>/ in the private bucket)
  const [draftId] = useState(() => crypto.randomUUID());
  const [vscDoc, setVscDoc] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAccuracy, setAgreeAccuracy] = useState(false);

  const err = (name: string) => (cleared.has(name) ? undefined : state?.fieldErrors?.[name]?.[0]);

  // Scroll to the first inline error after a failed submit
  useEffect(() => {
    if (!state?.fieldErrors) return;
    const first = document.querySelector<HTMLElement>("#sitterApplicationForm [data-field-error]");
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const servicesOk = SERVICES.some((s) => services[s.type].on) &&
    SERVICES.every((s) => {
      if (!services[s.type].on) return true;
      const p = Number(services[s.type].price);
      const r = SERVICE_PRICE_RULES[s.type];
      return services[s.type].price !== "" && p >= r.min && p <= r.max;
    });

  const checks = [
    [personal.firstName.trim() !== "", personal.lastName.trim() !== "", emailOk(personal.email), phoneOk(personal.phone), personal.neighbourhood !== ""],
    [servicesOk],
    [experience !== "", homeType !== "", bio.trim().length >= BIO_MIN],
    [idDoc !== "", agreeTerms, agreeAccuracy],
  ];
  const stepDone = checks.map((c) => c.every(Boolean));
  const total = checks.flat().length;
  const pct = Math.round((checks.flat().filter(Boolean).length / total) * 100);
  const currentStep = stepDone.indexOf(false);
  const stepsLeft = stepDone.filter((d) => !d).length;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCleared(new Set());
    startTransition(() => formAction(fd));
  }

  function onChange(e: React.FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    if (!name) return;
    setCleared((prev) => {
      if (prev.has(name) && !name.startsWith("service_")) return prev;
      const next = new Set(prev).add(name);
      if (name.startsWith("service_")) next.add("services");
      return next;
    });
  }

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <section aria-label="Application steps" className="mb-space-xl">
        <div className="bg-surface-container-lowest p-space-md md:p-space-lg rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
            {STEPS.map((step, i) => {
              const done = stepDone[i];
              const current = i === currentStep;
              const status = done ? "Done" : current ? "Current" : "Up Next";
              return (
                <button
                  className={`flex items-center gap-space-sm p-space-sm rounded-xl text-left transition-all ${
                    current
                      ? "bg-surface-container-highest/60 ring-2 ring-secondary shadow-xs"
                      : done
                        ? "bg-surface-container-low/60"
                        : "bg-surface-container-low/30 opacity-70"
                  }`}
                  key={step.title}
                  onClick={() => scrollTo(step.anchor)}
                  type="button"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-primary text-on-primary shadow-sm"
                        : current
                          ? "bg-secondary text-on-secondary shadow-sm animate-pulse"
                          : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-lg"
                      style={current ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {done ? "check" : step.icon}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`font-label-sm text-label-sm uppercase ${
                        done ? "text-primary font-bold" : current ? "text-secondary font-bold" : "text-on-surface-variant"
                      }`}
                    >
                      Step {i + 1} • {status}
                    </span>
                    <span
                      className={`font-label-lg text-label-lg truncate ${
                        done ? "text-on-surface" : current ? "text-on-surface font-extrabold" : "text-on-surface-variant"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="w-full bg-surface-container-high h-2 rounded-full mt-space-md overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary via-primary to-secondary h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between items-center gap-2 mt-2 font-label-sm text-label-sm text-on-surface-variant">
            <span>Application progress</span>
            <span className="font-bold text-secondary text-right">
              {pct}% Complete —{" "}
              {stepsLeft === 0 ? "Ready to submit!" : stepsLeft === 1 ? "Last step!" : `${stepsLeft} steps to go!`}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-xl min-w-0">
          <form
            className="flex flex-col gap-space-xl"
            id="sitterApplicationForm"
            noValidate
            onChange={onChange}
            onSubmit={onSubmit}
          >
            {/* Personal details */}
            <fieldset
              className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg scroll-mt-28"
              id="section-personal"
            >
              <div className="flex items-start justify-between gap-space-md">
                <div>
                  <SectionLabel icon="person">Getting Started</SectionLabel>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Tell Us About You</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    We&apos;ll use these details to set up your sitter profile and reach you about your application.
                  </p>
                </div>
                {isLoggedIn && (
                  <span className="hidden sm:inline-flex px-3 py-1 bg-surface-container rounded-full text-primary font-label-md text-label-md whitespace-nowrap">
                    From your account
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {(
                  [
                    { name: "firstName", label: "First name", type: "text", auto: "given-name", ph: "Megan" },
                    { name: "lastName", label: "Last name", type: "text", auto: "family-name", ph: "Robinson" },
                    { name: "email", label: "Email", type: "email", auto: "email", ph: "you@example.com" },
                    { name: "phone", label: "Mobile phone", type: "tel", auto: "tel", ph: "(416) 555-0123" },
                  ] as const
                ).map((f) => (
                  <div className="flex flex-col gap-space-xs" key={f.name}>
                    <label className="font-label-lg text-label-lg text-on-surface" htmlFor={f.name}>
                      {f.label}
                    </label>
                    <input
                      autoComplete={f.auto}
                      className={`${inputCls} ${err(f.name) ? errorRing : ""}`}
                      id={f.name}
                      name={f.name}
                      onChange={(e) => setPersonal((p) => ({ ...p, [f.name]: e.target.value }))}
                      placeholder={f.ph}
                      type={f.type}
                      value={personal[f.name]}
                    />
                    <FieldError msg={err(f.name)} />
                  </div>
                ))}
                <div className="flex flex-col gap-space-xs sm:col-span-2">
                  <label className="font-label-lg text-label-lg text-on-surface" htmlFor="neighbourhood">
                    Your neighbourhood
                  </label>
                  <Select
                    aria-invalid={!!err("neighbourhood") || undefined}
                    className={`${inputCls} relative h-auto pr-10 text-left cursor-pointer ${err("neighbourhood") ? errorRing : ""}`}
                    id="neighbourhood"
                    name="neighbourhood"
                    onChange={(v) => {
                      setPersonal((p) => ({ ...p, neighbourhood: v }));
                      // the hidden input's change event isn't a React onChange, so clear the error here
                      setCleared((prev) => (prev.has("neighbourhood") ? prev : new Set(prev).add("neighbourhood")));
                    }}
                    options={neighbourhoods.map((n) => {
                      const i = n.label.lastIndexOf(", ");
                      return i > 0 ? { value: n.id, label: n.label, group: n.label.slice(i + 2) } : { value: n.id, label: n.label };
                    })}
                    placeholder="Choose where you'll host and walk…"
                    value={personal.neighbourhood}
                  />
                  <FieldError msg={err("neighbourhood")} />
                </div>
              </div>
            </fieldset>

            {/* SECTION A: Services & Base Rates */}
            <fieldset
              className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg scroll-mt-28"
              id="section-services"
            >
              <div className="flex items-start justify-between gap-space-md">
                <div>
                  <SectionLabel icon="tune">Section 1 / 5</SectionLabel>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Services You&apos;ll Offer & Pricing</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    You can change these anytime. Suggested market rates for your area are filled in.
                  </p>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 bg-surface-container rounded-full text-primary font-label-md text-label-md whitespace-nowrap">
                  Set Your Rates
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {SERVICES.map((s) => {
                  const rule = SERVICE_PRICE_RULES[s.type];
                  const priceErr = err(`price_${s.type}`);
                  return (
                    <div
                      className={`p-space-md rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col justify-between gap-space-md ${
                        priceErr ? errorRing : ""
                      }`}
                      key={s.type}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${s.iconBox}`}>
                            <span className="material-symbols-outlined">{s.icon}</span>
                          </div>
                          <div>
                            <h3 className="font-title-md text-title-md text-on-surface">
                              {SERVICE_TITLES[s.type] ?? SERVICE_LABELS[s.type]}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">{s.blurb}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            aria-label={`Offer ${SERVICE_LABELS[s.type]}`}
                            checked={services[s.type].on}
                            className="sr-only peer"
                            name={`service_${s.type}`}
                            onChange={(e) =>
                              setServices((prev) => ({ ...prev, [s.type]: { ...prev[s.type], on: e.target.checked } }))
                            }
                            type="checkbox"
                          />
                          <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                        </label>
                      </div>
                      <div>
                        <div className="flex items-center justify-between pt-space-xs">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{s.rateLabel}</span>
                          <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-xl shadow-xs">
                            <span className="font-label-lg text-label-lg text-secondary">$</span>
                            <input
                              aria-label={`${SERVICE_LABELS[s.type]} rate in dollars`}
                              className="w-16 font-headline-sm text-headline-sm text-on-surface text-right focus:outline-none bg-transparent"
                              inputMode="numeric"
                              max={rule.max}
                              min={rule.min}
                              name={`price_${s.type}`}
                              onChange={(e) =>
                                setServices((prev) => ({ ...prev, [s.type]: { ...prev[s.type], price: e.target.value } }))
                              }
                              type="number"
                              value={services[s.type].price}
                            />
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{s.unit}</span>
                          </div>
                        </div>
                        <FieldError msg={priceErr} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <FieldError msg={err("services")} />
            </fieldset>

            {/* SECTION B: Experience & Pet Preferences */}
            <fieldset
              className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg scroll-mt-28"
              id="section-experience"
            >
              <SectionLabel icon="psychology">Section 2 / 5</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Experience & Pet Preferences</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Share the expertise that will help pet parents book you with confidence.
                </p>
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="font-title-md text-title-md text-on-surface">
                  How many years of pet care experience do you have?
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-1">
                  {EXPERIENCE.map((x) => (
                    <label className="cursor-pointer" key={x.value}>
                      <input
                        checked={experience === x.value}
                        className="peer sr-only"
                        name="experience"
                        onChange={() => setExperience(x.value)}
                        type="radio"
                        value={x.value}
                      />
                      <div className="p-space-sm text-center rounded-2xl bg-surface-container-low text-on-surface-variant font-label-lg text-label-lg peer-checked:bg-primary-container peer-checked:text-on-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary transition-all">
                        {x.label}
                      </div>
                    </label>
                  ))}
                </div>
                <FieldError msg={err("experience")} />
              </div>
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Dog sizes you can welcome</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Tick the options that suit your home and physical strength.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-1">
                  {PET_SIZES.map((size) => (
                    <label
                      className="relative flex flex-col p-3 rounded-2xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all has-[:checked]:bg-primary-fixed/50 group"
                      key={size}
                    >
                      <div className="flex items-center justify-between">
                        <span className="material-symbols-outlined text-on-surface-variant group-has-[:checked]:text-primary">
                          pets
                        </span>
                        <input
                          className="w-5 h-5 accent-primary rounded cursor-pointer"
                          defaultChecked={size !== "GIANT"}
                          name={SIZE_FIELDS[size]}
                          type="checkbox"
                        />
                      </div>
                      <span className="font-label-lg text-label-lg text-on-surface mt-2">
                        {PET_SIZE_LABELS[size].label} Breed
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {PET_SIZE_LABELS[size].range.replace(" – ", "–")}
                        {size === "GIANT" ? " (Great Dane, etc.)" : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Special Skills & Certifications</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-1">
                  {CERTS.map((c) => (
                    <label
                      className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
                      key={c.name}
                    >
                      <input className="mt-1 w-5 h-5 accent-primary rounded shrink-0" name={c.name} type="checkbox" />
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg text-on-surface">{c.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{c.blurb}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* SECTION C: Home & Environment */}
            <fieldset className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg">
              <SectionLabel icon="cottage">Section 3 / 5</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Home & Living Environment</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  For boarding and day care especially, the details of your home matter a lot to pet parents.
                </p>
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Where Pets Will Stay</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                  {HOME_TYPES.map((h) => (
                    <label className="cursor-pointer" key={h.value}>
                      <input
                        checked={homeType === h.value}
                        className="peer sr-only"
                        name="homeType"
                        onChange={() => setHomeType(h.value)}
                        type="radio"
                        value={h.value}
                      />
                      <div className="h-full p-space-md rounded-2xl bg-surface-container-low peer-checked:bg-primary-container peer-checked:text-on-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary transition-all flex flex-col gap-2">
                        <span className="material-symbols-outlined text-2xl">{h.icon}</span>
                        <span className="font-title-md text-title-md">{h.title}</span>
                        <span className="font-body-sm text-body-sm opacity-80">{h.blurb}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <FieldError msg={err("homeType")} />
              </div>
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Home Safety & Suitability</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-1">
                  {HOME_CRITERIA.map((c) => (
                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low cursor-pointer" key={c.name}>
                      <input className="w-5 h-5 accent-primary rounded shrink-0" name={c.name} type="checkbox" />
                      <span className="material-symbols-outlined text-primary text-xl">{c.icon}</span>
                      <span className="font-label-lg text-label-lg text-on-surface">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <HomePhotos draftId={draftId} />
            </fieldset>

            {/* SECTION D: Biography */}
            <fieldset className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg">
              <SectionLabel icon="edit_note">Section 4 / 5</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Introduce Yourself (Bio)</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Pet parents read this part of your profile first. The warmer and more detailed it is, the faster
                  you&apos;ll land your first booking.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <textarea
                    aria-label="Your bio"
                    className={`w-full p-4 rounded-2xl bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-body-md text-body-md placeholder:text-outline transition-all resize-none shadow-inner ${
                      err("bio") ? errorRing : ""
                    }`}
                    maxLength={BIO_MAX}
                    name="bio"
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. Hi! I grew up with cats and dogs and have been caring for my neighbours' pets for six years. I have a calm, fully vaccinated tabby at home, I send photo and video updates every day, and I'm careful with special diets and medication routines…"
                    rows={5}
                    value={bio}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 font-label-sm text-label-sm">
                  {bio.trim().length >= BIO_MIN ? (
                    <span className="text-primary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">sentiment_satisfied</span>
                      Great bio — pet parents will love it!
                    </span>
                  ) : (
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">edit</span>
                      {bio.trim().length === 0
                        ? `Aim for at least ${BIO_MIN} characters`
                        : `${BIO_MIN - bio.trim().length} more characters to go`}
                    </span>
                  )}
                  <span className="text-on-surface-variant whitespace-nowrap">
                    {bio.length} / {BIO_MAX} characters
                  </span>
                </div>
                <FieldError msg={err("bio")} />
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low">
                <span className="material-symbols-outlined text-tertiary-container text-xl mt-0.5">lightbulb</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  <strong className="text-on-surface">Tip:</strong> Mention how often you can walk each day, your
                  nearest emergency vet and how much time you can give pets during the day — it doubles your approval
                  speed.
                </p>
              </div>
            </fieldset>

            {/* SECTION E: Identity & Legal Declarations */}
            <fieldset
              className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg scroll-mt-28"
              id="section-verification"
            >
              <SectionLabel icon="security">Section 5 / 5</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Verification & Safety Declaration</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  To keep the WagStays community 100% safe, every sitter applicant goes through ID and background
                  screening.
                </p>
              </div>
              <div className="flex flex-col gap-space-md">
                <FileUploadRow
                  buttonIcon="cloud_upload"
                  buttonLabel="Upload Document"
                  description="Encrypted with 256-bit SSL and handled under PIPEDA"
                  draftId={draftId}
                  error={err("idDocumentName")}
                  fileField="idDocumentFile"
                  kind="ID_DOCUMENT"
                  icon="badge"
                  iconBox="bg-primary-fixed text-primary"
                  name="idDocumentName"
                  onFile={setIdDoc}
                  title="Government-Issued Photo ID"
                  value={idDoc}
                />
                <FileUploadRow
                  buttonIcon="attach_file"
                  buttonLabel="Upload PDF"
                  description="Issued by your local police service within the last 6 months"
                  draftId={draftId}
                  error={err("backgroundCheckName")}
                  fileField="backgroundCheckFile"
                  kind="BACKGROUND_CHECK"
                  icon="policy"
                  iconBox="bg-secondary-fixed text-secondary"
                  name="backgroundCheckName"
                  onFile={setVscDoc}
                  title="Police Vulnerable Sector Check"
                  value={vscDoc}
                />
                <div className="flex flex-col gap-3 pt-space-xs">
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        checked={agreeTerms}
                        className="mt-1 w-5 h-5 accent-primary rounded shrink-0"
                        name="agreeTerms"
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                        I have read and agree to the WagStays{" "}
                        <a className="text-primary font-semibold underline underline-offset-2" href="#">
                          Sitter Service Agreement
                        </a>{" "}
                        and{" "}
                        <a className="text-primary font-semibold underline underline-offset-2" href="#">
                          Pet Safety Standards
                        </a>
                        .
                      </span>
                    </label>
                    <FieldError msg={err("agreeTerms")} />
                  </div>
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        checked={agreeAccuracy}
                        className="mt-1 w-5 h-5 accent-primary rounded shrink-0"
                        name="agreeAccuracy"
                        onChange={(e) => setAgreeAccuracy(e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                        I confirm that all the experience and home details I&apos;ve provided are complete and accurate,
                        and I agree to an in-home check if required.
                      </span>
                    </label>
                    <FieldError msg={err("agreeAccuracy")} />
                  </div>
                </div>
              </div>
            </fieldset>

            {state?.error && (
              <div
                className="flex items-start gap-3 p-4 rounded-2xl bg-error-container text-on-error-container font-body-sm text-body-sm"
                role="alert"
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  error
                </span>
                <span>{state.error}</span>
              </div>
            )}

            {/* Bottom Action Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-sm pb-space-lg">
              <button
                className="w-full sm:w-auto px-space-xl py-3 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                type="button"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Previous Step
              </button>
              <button
                className="w-full sm:w-auto px-space-xl py-3.5 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-wait"
                disabled={pending}
                type="submit"
              >
                <span>{pending ? "Submitting your application…" : "Submit Application & Send for Review"}</span>
                <span
                  className={`material-symbols-outlined text-lg transition-transform ${
                    pending ? "animate-spin" : "group-hover:translate-x-1"
                  }`}
                >
                  {pending ? "progress_activity" : "rocket_launch"}
                </span>
              </button>
            </div>
          </form>
        </div>
        {sidebar}
      </div>
    </>
  );
}
