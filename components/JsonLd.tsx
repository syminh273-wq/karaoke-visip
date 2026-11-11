import { jsonLd } from "@/lib/site";
import type { View } from "@/lib/prerender";

/** Schema.org structured data for a page (rendered into the static HTML). */
export default function JsonLd({ view }: { view: View }) {
  // "<" is escaped so dish names can never close the script tag.
  const json = JSON.stringify(jsonLd(view)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
