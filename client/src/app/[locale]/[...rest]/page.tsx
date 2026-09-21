import { notFound } from "next/navigation";

// Unmatched URLs inside a locale render the locale's not-found page.
export default function CatchAll() {
  notFound();
}
