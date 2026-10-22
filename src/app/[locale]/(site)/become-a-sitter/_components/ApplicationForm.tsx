"use client";

import { useLocale, useTranslations } from "next-intl";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { submitApplication } from "@/app/actions/application";
import { Select } from "@/components/forms/Select";
import { MobileStickyBar, STICKY_BAR_BTN } from "@/components/MobileStickyBar";
import { PET_SIZE_LABELS, PET_SIZES, type ServiceType } from "@/lib/constants";
import { SERVICE_PRICE_RULES } from "@/lib/sitter-application";
import { PetKindPicker } from "@/components/PetKinds";
import { isPetKind } from "@/lib/pets";
import { intlLocale } from "@/i18n/routing";
import { FileUploadRow, HomePhotos } from "./Uploads";
import { bool, draftKey, loadDraft, removeDraft, saveDraft, str, type DraftData } from "./draft";

type Prefill = { firstName: string; lastName: string; email: string; phone: string };

type Props = {
  neighbourhoods: { id: string; label: string }[];
  prefill: Prefill;
  isLoggedIn: boolean;
  sidebar: ReactNode;
  /** keys the localStorage draft per account; null = signed-out (anonymous draft) */
  userId?: string | null;
};

const SERVICES: {
  type: ServiceType;
  icon: string;
  iconBox: string;
  defaultOn: boolean;
}[] = [
  { type: "DOG_WALKING", icon: "directions_walk", iconBox: "bg-primary-fixed text-on-primary-fixed", defaultOn: true },
  { type: "BOARDING", icon: "night_shelter", iconBox: "bg-secondary-fixed text-on-secondary-fixed", defaultOn: true },
  { type: "DROP_IN", icon: "cruelty_free", iconBox: "bg-tertiary-fixed text-on-tertiary-fixed", defaultOn: true },
  { type: "DAY_CARE", icon: "wb_sunny", iconBox: "bg-surface-container-highest text-primary", defaultOn: false },
];

const EXPERIENCE = ["1-3", "3-6", "6+", "VET"] as const;

const SIZE_FIELDS = { SMALL: "acceptsSmall", MEDIUM: "acceptsMedium", LARGE: "acceptsLarge", GIANT: "acceptsGiant" } as const;

const CERTS = ["certFirstAid", "certMedication", "certPuppy", "certBehaviour"] as const;

const HOME_TYPES = [
  { value: "HOUSE_WITH_YARD", icon: "fence" },
  { value: "APARTMENT", icon: "apartment" },
  { value: "CONDO_BALCONY", icon: "balcony" },
] as const;

const HOME_CRITERIA = [
  { name: "smokeFree", icon: "smoke_free" },
  { name: "noChildren", icon: "child_friendly" },
  { name: "ownPets", icon: "pets" },
  { name: "fencedYard", icon: "yard" },
] as const;

const STEPS = [
  { key: "personal", icon: "person", anchor: "section-personal" },
  { key: "services", icon: "payments", anchor: "section-services" },
  { key: "experience", icon: "pets", anchor: "section-experience" },
  { key: "verification", icon: "shield", anchor: "section-verification" },
] as const;

const DRAFT_DEBOUNCE_MS = 600;

const initialServices = () =>
  Object.fromEntries(
    SERVICES.map((s) => [s.type, { on: s.defaultOn, price: String(SERVICE_PRICE_RULES[s.type].suggested) }]),
  ) as Record<ServiceType, { on: boolean; price: string }>;
const initialSizes = () => Object.fromEntries(PET_SIZES.map((s) => [s, s !== "GIANT"])) as Record<(typeof PET_SIZES)[number], boolean>;
const initialCerts = () => Object.fromEntries(CERTS.map((c) => [c, false])) as Record<(typeof CERTS)[number], boolean>;
const initialCriteria = () =>
  Object.fromEntries(HOME_CRITERIA.map((c) => [c.name, false])) as Record<(typeof HOME_CRITERIA)[number]["name"], boolean>;

/** Copies the booleans of a restored record onto `base`, ignoring unknown keys and wrong types. */
function pickBools<T extends Record<string, boolean>>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== "object") return base;
  const out = { ...base };
  for (const k of Object.keys(base) as (keyof T & string)[]) {
    const v = (saved as Record<string, unknown>)[k];
    if (bool(v)) (out as Record<string, boolean>)[k] = v;
  }
  return out;
}

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

export function ApplicationForm({ neighbourhoods, prefill, isLoggedIn, sidebar, userId = null }: Props) {
  const t = useTranslations("apply.form");
  const locale = useLocale();
  const tc = useTranslations("common");
  const [state, formAction, pending] = useActionState(submitApplication, undefined);
  const [cleared, setCleared] = useState<Set<string>>(new Set());

  // Controlled fields that drive the step tracker
  const [personal, setPersonal] = useState({ ...prefill, neighbourhood: "" });
  const [services, setServices] = useState(initialServices);
  const [experience, setExperience] = useState("3-6");
  const [kinds, setKinds] = useState<string[]>(["DOG"]);
  const [sizes, setSizes] = useState(initialSizes);
  const [certs, setCerts] = useState(initialCerts);
  const [homeType, setHomeType] = useState("HOUSE_WITH_YARD");
  const [criteria, setCriteria] = useState(initialCriteria);
  const [bio, setBio] = useState("");
  const [idDoc, setIdDoc] = useState("");
  // Storage folder for this form session's uploads (applications/<draftId>/ in the private bucket)
  const [draftId] = useState(() => crypto.randomUUID());
  const [vscDoc, setVscDoc] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAccuracy, setAgreeAccuracy] = useState(false);

  // ── Draft autosave (localStorage) ──────────────────────────────────────────────────────────────────────────
  // Plain values only: no uploads (they can't be restored), no account email, no legal declarations.
  const storageKey = draftKey(userId);
  const draft: DraftData = {
    firstName: personal.firstName,
    lastName: personal.lastName,
    ...(isLoggedIn ? {} : { email: personal.email }),
    phone: personal.phone,
    neighbourhood: personal.neighbourhood,
    services,
    experience,
    kinds,
    sizes,
    certs,
    homeType,
    criteria,
    bio,
  };
  const draftJson = JSON.stringify(draft);
  const [pristineJson] = useState(draftJson);
  const [hydrated, setHydrated] = useState(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  // bumping it remounts the form body, which resets the upload widgets on "Start over"
  const [formKey, setFormKey] = useState(0);
  const lastSaved = useRef(draftJson);
  const pendingJson = useRef<string | null>(null);
  // the first render after a restore shows the saved values: adopt them as "saved" instead of re-saving
  const adoptRestored = useRef(false);

  const flushDraft = useCallback(() => {
    const json = pendingJson.current;
    if (json === null) return;
    pendingJson.current = null;
    lastSaved.current = json;
    if (json === pristineJson) removeDraft(storageKey);
    else saveDraft(storageKey, JSON.parse(json) as DraftData);
  }, [pristineJson, storageKey]);

  // Restore after hydration (localStorage isn't available during SSR), through the same state the
  // progress bar and step tracker compute from.
  useEffect(() => {
    const saved = loadDraft(storageKey);
    if (saved) {
      const d = saved.data as Partial<Record<keyof DraftData, unknown>>;
      const svc = initialServices();
      if (d.services && typeof d.services === "object") {
        for (const s of SERVICES) {
          const v = (d.services as Record<string, { on?: unknown; price?: unknown }>)[s.type];
          if (v && bool(v.on) && str(v.price)) svc[s.type] = { on: v.on, price: v.price };
        }
      }
      const restoredKinds = Array.isArray(d.kinds) ? d.kinds.filter(isPetKind) : null;
      /* eslint-disable react-hooks/set-state-in-effect -- one-off restore from browser storage after hydration */
      setPersonal((p) => ({
        firstName: str(d.firstName) ? d.firstName : p.firstName,
        lastName: str(d.lastName) ? d.lastName : p.lastName,
        email: !isLoggedIn && str(d.email) ? d.email : p.email,
        phone: str(d.phone) ? d.phone : p.phone,
        neighbourhood:
          str(d.neighbourhood) && neighbourhoods.some((n) => n.id === d.neighbourhood) ? d.neighbourhood : p.neighbourhood,
      }));
      setServices(svc);
      if (str(d.experience) && (EXPERIENCE as readonly string[]).includes(d.experience)) setExperience(d.experience);
      if (restoredKinds) setKinds(restoredKinds);
      setSizes(pickBools(initialSizes(), d.sizes));
      setCerts(pickBools(initialCerts(), d.certs));
      if (str(d.homeType) && HOME_TYPES.some((h) => h.value === d.homeType)) setHomeType(d.homeType);
      setCriteria(pickBools(initialCriteria(), d.criteria));
      if (str(d.bio)) setBio(d.bio.slice(0, BIO_MAX));
      setRestoredAt(saved.savedAt);
      adoptRestored.current = true;
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per storage key
  }, [storageKey]);

  // Debounced save while the user types
  useEffect(() => {
    if (!hydrated) return;
    if (adoptRestored.current) {
      adoptRestored.current = false;
      lastSaved.current = draftJson;
    }
    if (draftJson === lastSaved.current) {
      pendingJson.current = null;
      return;
    }
    pendingJson.current = draftJson;
    const id = window.setTimeout(flushDraft, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draftJson, hydrated, flushDraft]);

  // Don't lose the last keystrokes when the tab closes or the user navigates away
  useEffect(() => {
    window.addEventListener("pagehide", flushDraft);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      flushDraft();
    };
  }, [flushDraft]);

  function startOver() {
    pendingJson.current = null;
    lastSaved.current = pristineJson;
    removeDraft(storageKey);
    setPersonal({ ...prefill, neighbourhood: "" });
    setServices(initialServices());
    setExperience("3-6");
    setKinds(["DOG"]);
    setSizes(initialSizes());
    setCerts(initialCerts());
    setHomeType("HOUSE_WITH_YARD");
    setCriteria(initialCriteria());
    setBio("");
    setIdDoc("");
    setVscDoc("");
    setAgreeTerms(false);
    setAgreeAccuracy(false);
    setCleared(new Set());
    setRestoredAt(null);
    setFormKey((k) => k + 1);
  }

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
    [experience !== "", kinds.length > 0, homeType !== "", bio.trim().length >= BIO_MIN],
    [idDoc !== "", agreeTerms, agreeAccuracy],
  ];
  const stepDone = checks.map((c) => c.every(Boolean));
  const total = checks.flat().length;
  const pct = Math.round((checks.flat().filter(Boolean).length / total) * 100);
  const currentStep = stepDone.indexOf(false);
  const stepsLeft = stepDone.filter((d) => !d).length;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    flushDraft();
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
      {restoredAt !== null && (
        <div
          className="mb-space-md flex flex-col sm:flex-row sm:items-center gap-space-sm p-space-md rounded-2xl bg-primary-fixed/60 text-on-surface shadow-xs"
          role="status"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="material-symbols-outlined text-primary text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              history
            </span>
            <div className="min-w-0">
              <p className="font-label-lg text-label-lg text-on-surface">
                {/* en-CA times end in "a.m."/"p.m.": don't double the sentence's closing period */}
                {t("draft.restored", {
                  time: new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(restoredAt),
                }).replace(/\.\.$/, ".")}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{t("draft.filesNote")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              className="px-space-md py-2 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md hover:bg-surface-container transition-colors flex items-center gap-1"
              onClick={startOver}
              type="button"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              {t("draft.startOver")}
            </button>
            <button
              aria-label={t("draft.dismissAria")}
              className="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center"
              onClick={() => setRestoredAt(null)}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}
      <section aria-label={t("stepsAria")} className="mb-space-lg md:mb-space-xl">
        <div className="bg-surface-container-lowest p-space-md md:p-space-lg rounded-2xl shadow-sm">
          {/* Mobile: four compact icon + title tiles in one row; md+: the full cards with status line */}
          <div className="grid grid-cols-4 gap-space-xs md:gap-space-md">
            {STEPS.map((step, i) => {
              const done = stepDone[i];
              const current = i === currentStep;
              const status = t(done ? "stepStatus.done" : current ? "stepStatus.current" : "stepStatus.upNext");
              return (
                <button
                  className={`flex flex-col md:flex-row items-center gap-1 md:gap-space-sm p-space-xs md:p-space-sm rounded-xl text-center md:text-left transition-all ${
                    current
                      ? "bg-surface-container-highest/60 ring-2 ring-secondary shadow-xs"
                      : done
                        ? "bg-surface-container-low/60"
                        : "bg-surface-container-low/30 opacity-70"
                  }`}
                  key={step.key}
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
                  <div className="flex flex-col min-w-0 max-w-full">
                    <span
                      className={`hidden md:inline font-label-sm text-label-sm uppercase ${
                        done ? "text-primary font-bold" : current ? "text-secondary font-bold" : "text-on-surface-variant"
                      }`}
                    >
                      {t("stepLabel", { n: i + 1, status })}
                    </span>
                    <span
                      className={`font-label-sm text-label-sm md:font-label-lg md:text-label-lg leading-tight md:leading-[20px] md:truncate ${
                        done ? "text-on-surface" : current ? "text-on-surface font-extrabold" : "text-on-surface-variant"
                      }`}
                    >
                      {t(`steps.${step.key}`)}
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
            <span>{t("progressLabel")}</span>
            <span className="font-bold text-secondary text-right">
              {t("progressSummary", {
                pct,
                next: stepsLeft === 0 ? t("readyToSubmit") : stepsLeft === 1 ? t("lastStep") : t("stepsToGo", { count: stepsLeft }),
              })}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-xl min-w-0">
          <form
            className="flex flex-col gap-space-xl"
            id="sitterApplicationForm"
            key={formKey}
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
                  <SectionLabel icon="person">{t("personal.label")}</SectionLabel>
                  <h2 className="font-headline-md text-headline-md text-on-surface">{t("personal.title")}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    {t("personal.text")}
                  </p>
                </div>
                {isLoggedIn && (
                  <span className="hidden sm:inline-flex px-3 py-1 bg-surface-container rounded-full text-primary font-label-md text-label-md whitespace-nowrap">
                    {t("personal.fromAccount")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {(
                  [
                    { name: "firstName", label: t("personal.firstName"), type: "text", auto: "given-name", ph: t("personal.firstNamePlaceholder") },
                    { name: "lastName", label: t("personal.lastName"), type: "text", auto: "family-name", ph: t("personal.lastNamePlaceholder") },
                    { name: "email", label: t("personal.email"), type: "email", auto: "email", ph: t("personal.emailPlaceholder") },
                    { name: "phone", label: t("personal.phone"), type: "tel", auto: "tel", ph: t("personal.phonePlaceholder") },
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
                    {t("personal.neighbourhood")}
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
                    placeholder={t("personal.neighbourhoodPlaceholder")}
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
                  <SectionLabel icon="tune">{t("section", { n: 1 })}</SectionLabel>
                  <h2 className="font-headline-md text-headline-md text-on-surface">{t("services.title")}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    {t("services.text")}
                  </p>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 bg-surface-container rounded-full text-primary font-label-md text-label-md whitespace-nowrap">
                  {t("services.badge")}
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
                              {s.type === "DROP_IN" ? t("services.dropInTitle") : tc(`enums.service.${s.type}`)}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">{t(`services.types.${s.type}.blurb`)}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            aria-label={t("services.offerAria", { service: tc(`enums.service.${s.type}`) })}
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
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{t(`services.types.${s.type}.rateLabel`)}</span>
                          <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-xl shadow-xs">
                            <span className="font-label-lg text-label-lg text-secondary">$</span>
                            <input
                              aria-label={t("services.rateAria", { service: tc(`enums.service.${s.type}`) })}
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
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{t(`services.types.${s.type}.unit`)}</span>
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
              <SectionLabel icon="psychology">{t("section", { n: 2 })}</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t("experience.title")}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {t("experience.text")}
                </p>
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="font-title-md text-title-md text-on-surface">
                  {t("experience.yearsQuestion")}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-1">
                  {EXPERIENCE.map((x) => (
                    <label className="cursor-pointer" key={x}>
                      <input
                        checked={experience === x}
                        className="peer sr-only"
                        name="experience"
                        onChange={() => setExperience(x)}
                        type="radio"
                        value={x}
                      />
                      <div className="p-space-sm text-center rounded-2xl bg-surface-container-low text-on-surface-variant font-label-lg text-label-lg peer-checked:bg-primary-container peer-checked:text-on-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary transition-all">
                        {t(`experience.years.${x}`)}
                      </div>
                    </label>
                  ))}
                </div>
                <FieldError msg={err("experience")} />
              </div>
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">{t("experience.petsQuestion")}</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t("experience.petsHint")}
                  {services.DOG_WALKING.on && ` ${t("experience.dogsLocked")}`}
                </p>
                <div className="pt-1">
                  <PetKindPicker
                    locked={services.DOG_WALKING.on ? ["DOG"] : []}
                    lockedHint={t("experience.lockedHint")}
                    name="acceptedKinds"
                    onChange={setKinds}
                    value={kinds}
                  />
                </div>
                <FieldError msg={err("acceptedKinds")} />
              </div>
              <div className={`flex flex-col gap-space-xs pt-space-xs ${kinds.includes("DOG") ? "" : "hidden"}`}>
                <span className="font-title-md text-title-md text-on-surface">{t("experience.sizesTitle")}</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t("experience.sizesHint")}
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
                          checked={sizes[size]}
                          className="w-5 h-5 accent-primary rounded cursor-pointer"
                          name={SIZE_FIELDS[size]}
                          onChange={(e) => setSizes((p) => ({ ...p, [size]: e.target.checked }))}
                          type="checkbox"
                        />
                      </div>
                      <span className="font-label-lg text-label-lg text-on-surface mt-2">
                        {t(`experience.sizes.${size}`)}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {PET_SIZE_LABELS[size].range.replace(" – ", "–")}
                        {size === "GIANT" ? t("experience.giantExample") : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">{t("experience.certsTitle")}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-1">
                  {CERTS.map((c) => (
                    <label
                      className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
                      key={c}
                    >
                      <input
                        checked={certs[c]}
                        className="mt-1 w-5 h-5 accent-primary rounded shrink-0"
                        name={c}
                        onChange={(e) => setCerts((p) => ({ ...p, [c]: e.target.checked }))}
                        type="checkbox"
                      />
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg text-on-surface">{t(`experience.certs.${c}.title`)}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{t(`experience.certs.${c}.blurb`)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* SECTION C: Home & Environment */}
            <fieldset className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg">
              <SectionLabel icon="cottage">{t("section", { n: 3 })}</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t("home.title")}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {t("home.text")}
                </p>
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="font-title-md text-title-md text-on-surface">{t("home.whereTitle")}</span>
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
                        <span className="font-title-md text-title-md">{t(`home.types.${h.value}.title`)}</span>
                        <span className="font-body-sm text-body-sm opacity-80">{t(`home.types.${h.value}.blurb`)}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <FieldError msg={err("homeType")} />
              </div>
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">{t("home.safetyTitle")}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-1">
                  {HOME_CRITERIA.map((c) => (
                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low cursor-pointer" key={c.name}>
                      <input
                        checked={criteria[c.name]}
                        className="w-5 h-5 accent-primary rounded shrink-0"
                        name={c.name}
                        onChange={(e) => setCriteria((p) => ({ ...p, [c.name]: e.target.checked }))}
                        type="checkbox"
                      />
                      <span className="material-symbols-outlined text-primary text-xl">{c.icon}</span>
                      <span className="font-label-lg text-label-lg text-on-surface">{t(`home.criteria.${c.name}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <HomePhotos draftId={draftId} />
            </fieldset>

            {/* SECTION D: Biography */}
            <fieldset className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg">
              <SectionLabel icon="edit_note">{t("section", { n: 4 })}</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t("bio.title")}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {t("bio.text")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <textarea
                    aria-label={t("bio.aria")}
                    className={`w-full p-4 rounded-2xl bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-body-md text-body-md placeholder:text-outline transition-all resize-none shadow-inner ${
                      err("bio") ? errorRing : ""
                    }`}
                    maxLength={BIO_MAX}
                    name="bio"
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t("bio.placeholder")}
                    rows={5}
                    value={bio}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 font-label-sm text-label-sm">
                  {bio.trim().length >= BIO_MIN ? (
                    <span className="text-primary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">sentiment_satisfied</span>
                      {t("bio.great")}
                    </span>
                  ) : (
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">edit</span>
                      {bio.trim().length === 0
                        ? t("bio.aim", { min: BIO_MIN })
                        : t("bio.more", { count: BIO_MIN - bio.trim().length })}
                    </span>
                  )}
                  <span className="text-on-surface-variant whitespace-nowrap">
                    {t("bio.counter", { count: bio.length, max: BIO_MAX })}
                  </span>
                </div>
                <FieldError msg={err("bio")} />
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low">
                <span className="material-symbols-outlined text-tertiary-container text-xl mt-0.5">lightbulb</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t.rich("bio.tip", { b: (c) => <strong className="text-on-surface">{c}</strong> })}
                </p>
              </div>
            </fieldset>

            {/* SECTION E: Identity & Legal Declarations */}
            <fieldset
              className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg scroll-mt-28"
              id="section-verification"
            >
              <SectionLabel icon="security">{t("section", { n: 5 })}</SectionLabel>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t("verification.title")}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {t("verification.text")}
                </p>
              </div>
              <div className="flex flex-col gap-space-md">
                <FileUploadRow
                  buttonIcon="cloud_upload"
                  buttonLabel={t("verification.idButton")}
                  description={t("verification.idDescription")}
                  draftId={draftId}
                  error={err("idDocumentName")}
                  fileField="idDocumentFile"
                  kind="ID_DOCUMENT"
                  icon="badge"
                  iconBox="bg-primary-fixed text-primary"
                  name="idDocumentName"
                  onFile={setIdDoc}
                  title={t("verification.idTitle")}
                  value={idDoc}
                />
                <FileUploadRow
                  buttonIcon="attach_file"
                  buttonLabel={t("verification.vscButton")}
                  description={t("verification.vscDescription")}
                  draftId={draftId}
                  error={err("backgroundCheckName")}
                  fileField="backgroundCheckFile"
                  kind="BACKGROUND_CHECK"
                  icon="policy"
                  iconBox="bg-secondary-fixed text-secondary"
                  name="backgroundCheckName"
                  onFile={setVscDoc}
                  title={t("verification.vscTitle")}
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
                        {t.rich("verification.agreeTerms", {
                          agreement: (c) => (
                            <a className="text-primary font-semibold underline underline-offset-2" href="#">
                              {c}
                            </a>
                          ),
                          standards: (c) => (
                            <a className="text-primary font-semibold underline underline-offset-2" href="#">
                              {c}
                            </a>
                          ),
                        })}
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
                        {t("verification.agreeAccuracy")}
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-sm pb-space-lg" id="application-actions">
              <button
                className="w-full sm:w-auto px-space-xl py-3 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                type="button"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                {t("previousStep")}
              </button>
              <button
                className="w-full sm:w-auto px-space-md sm:px-space-xl py-3.5 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-wait"
                disabled={pending}
                type="submit"
              >
                <span>{pending ? t("submitting") : t("submit")}</span>
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

      {/* Mobile: the submit button is ~5 screens down — keep progress and the next step (or submit) in reach. */}
      <MobileStickyBar targetId="application-actions">
        <div className="flex flex-col min-w-0">
          <span className="font-label-lg text-label-lg text-on-surface">{t("sticky.complete", { pct })}</span>
          <span className="font-label-sm text-label-sm text-secondary font-bold truncate">
            {stepsLeft === 0 ? t("readyToSubmit") : t("sticky.next", { step: t(`steps.${STEPS[currentStep].key}`) })}
          </span>
        </div>
        {stepsLeft === 0 ? (
          <button className={`${STICKY_BAR_BTN} disabled:opacity-70`} disabled={pending} form="sitterApplicationForm" type="submit">
            <span className={`material-symbols-outlined text-lg ${pending ? "animate-spin" : ""}`}>{pending ? "progress_activity" : "rocket_launch"}</span>
            {pending ? t("sticky.submitting") : t("sticky.submit")}
          </button>
        ) : (
          <button className={STICKY_BAR_BTN} onClick={() => scrollTo(STEPS[currentStep].anchor)} type="button">
            {t("sticky.continue")}
            <span className="material-symbols-outlined text-lg">arrow_downward</span>
          </button>
        )}
      </MobileStickyBar>
    </>
  );
}
