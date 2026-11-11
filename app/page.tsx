import SitePage from "@/components/SitePage";
import JsonLd from "@/components/JsonLd";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("site");

export default function Home() {
  return (
    <>
      <JsonLd view="site" />
      <SitePage view="site" />
    </>
  );
}
