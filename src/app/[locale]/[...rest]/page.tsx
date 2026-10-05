import { notFound } from "next/navigation";

// Unmatched URLs inside a language (e.g. /fr/nope) render that language's not-found page.
export default function CatchAll() {
  notFound();
}
