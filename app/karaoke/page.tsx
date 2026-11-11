import SitePage from "@/components/SitePage";
import JsonLd from "@/components/JsonLd";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("karaoke");

export default function KaraokePage() {
  return (
    <>
      <JsonLd view="karaoke" />
      <SitePage view="karaoke" />
    </>
  );
}
