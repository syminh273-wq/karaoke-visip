import SitePage from "@/components/SitePage";
import JsonLd from "@/components/JsonLd";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("restaurant");

export default function RestaurantPage() {
  return (
    <>
      <JsonLd view="restaurant" />
      <SitePage view="restaurant" />
    </>
  );
}
