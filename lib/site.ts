import type { Metadata } from "next";
import { prerender, type View } from "@/lib/prerender";

/**
 * Site-wide SEO settings.
 *
 * SITE_URL is the main public domain, e.g. https://nhahanghamruouvsip.vn (no trailing slash).
 * Set it in the build environment (NEXT_PUBLIC_SITE_URL) or replace the fallback below.
 * While it is empty, absolute-URL features are skipped: canonical links, og:url, og:image,
 * sitemap entries and the Sitemap line in robots.txt.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

/** Facts shown on the website itself; structured data only uses these. */
export const BUSINESS = {
  legalName: "CÔNG TY TNHH NHÀ HÀNG KARAOKE VSIP",
  name: "Nhà Hàng Hầm Rượu & Karaoke VSIP",
  restaurantName: "Nhà Hàng Hầm Rượu VSIP",
  karaokeName: "Karaoke VSIP",
  restaurantPhone: "+84983158159",
  karaokePhone: "+84948158159",
  address: {
    streetAddress: "4/8F Bùi Hữu Nghĩa, Khu Phố Bình Đức 2",
    addressLocality: "Phường Bình Hoà",
    addressRegion: "Hồ Chí Minh",
    addressCountry: "VN",
  },
  facebook: "https://www.facebook.com/profile.php?id=61573448881727",
  logo: "/img/logo-v3.png",
};

export const PATHS: Record<View, string> = { site: "/", restaurant: "/restaurant/", karaoke: "/karaoke/" };
/** The menu section on the restaurant page (id="menu-full" in app/markup.html). */
const MENU_PATH = "/restaurant/#menu-full";
const OG_IMAGE: Record<View, string> = { site: "/og/og-home.jpg", restaurant: "/og/og-restaurant.jpg", karaoke: "/og/og-karaoke.jpg" };
// Real photos of the venue (the hero banners shown on the site), used as images in structured data.
const PHOTO = { restaurant: "/img/hs-hr.jpg", karaoke: "/img/hs-kr.jpg" };

const abs = (p: string) => (SITE_URL ? SITE_URL + p : undefined);

function copy(view: View) {
  const t = prerender(view).text;
  if (view === "restaurant") {
    const count = t.rDishCount || "141 món";
    const from = t.rPriceFrom ? `, giá từ ${t.rPriceFrom}` : "";
    return {
      title: "Thực Đơn Nhà Hàng Hầm Rượu VSIP – Hải Sản, Lẩu, Món Hoa",
      description: `Thực đơn ${count}: món Việt, món Hoa, hải sản tươi sống, lẩu${from}. Sảnh tiệc và phòng VIP cho tiệc sinh nhật, tiếp khách tại VSIP I, Thuận An.`,
    };
  }
  if (view === "karaoke") {
    const from = prerender("karaoke").text.kPriceFrom;
    return {
      title: "Karaoke VSIP – Phòng VIP LED 3D" + (from ? `, Từ ${from}/giờ` : ""),
      description: `Karaoke VSIP phòng VIP màn hình LED 3D${from ? `, giá từ ${from}/giờ` : ""}. Nhận tiệc sinh nhật, liên hoan công ty tại VSIP I, Thuận An. Hotline 0948 158 159.`,
    };
  }
  return {
    title: "Nhà Hàng Hầm Rượu & Karaoke VSIP – Tiệc, Hải Sản, Phòng VIP",
    description:
      "Nhà hàng món Việt – món Trung – hải sản tươi sống và karaoke phòng LED 3D tại VSIP I, Thuận An. Nhận tiệc sinh nhật, liên hoan công ty, tiếp khách.",
  };
}

/** Page titles for every view; site-01.js uses them when switching pages without a reload. */
export function pageTitles(): Record<View, string> {
  return { site: copy("site").title, restaurant: copy("restaurant").title, karaoke: copy("karaoke").title };
}

/** Per-page <head> metadata: title, description, canonical, Open Graph, Twitter Card. */
export function pageMetadata(view: View): Metadata {
  const { title, description } = copy(view);
  const url = abs(PATHS[view]);
  const image = abs(OG_IMAGE[view]);
  return {
    title: { absolute: title },
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: BUSINESS.name,
      title,
      description,
      ...(url ? { url } : {}),
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/** Schema.org JSON-LD for a page. Only information that is published on the site. */
export function jsonLd(view: View): object {
  const address = { "@type": "PostalAddress", ...BUSINESS.address };
  const id = (frag: string) => (SITE_URL ? `${SITE_URL}/#${frag}` : `#${frag}`);
  const org = {
    "@type": "Organization",
    "@id": id("org"),
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    ...(SITE_URL ? { url: SITE_URL + "/", logo: SITE_URL + BUSINESS.logo } : {}),
    sameAs: [BUSINESS.facebook],
  };
  const restaurant = {
    "@type": "Restaurant",
    "@id": id("restaurant"),
    name: BUSINESS.restaurantName,
    parentOrganization: { "@id": id("org") },
    telephone: BUSINESS.restaurantPhone,
    address,
    servesCuisine: ["Món Việt", "Món Hoa", "Hải sản"],
    acceptsReservations: true,
    ...(SITE_URL ? { url: SITE_URL + PATHS.restaurant, image: SITE_URL + PHOTO.restaurant, hasMenu: SITE_URL + MENU_PATH } : {}),
    sameAs: [BUSINESS.facebook],
  };
  const karaoke = {
    "@type": "EntertainmentBusiness",
    "@id": id("karaoke"),
    name: BUSINESS.karaokeName,
    parentOrganization: { "@id": id("org") },
    telephone: BUSINESS.karaokePhone,
    address,
    ...(SITE_URL ? { url: SITE_URL + PATHS.karaoke, image: SITE_URL + PHOTO.karaoke } : {}),
  };

  const graph: object[] = [org];
  if (view === "site") graph.push(restaurant, karaoke);
  if (view === "restaurant") {
    const { dishes, sections } = prerender("restaurant");
    const menu = {
      "@type": "Menu",
      "@id": id("menu"),
      name: "Thực đơn Nhà Hàng Hầm Rượu VSIP",
      inLanguage: "vi",
      ...(SITE_URL ? { url: SITE_URL + MENU_PATH } : {}),
      hasMenuSection: Object.keys(sections)
        .filter((k) => dishes.some((d) => d.sec === k))
        .map((k) => ({
          "@type": "MenuSection",
          name: sections[k],
          hasMenuItem: dishes
            .filter((d) => d.sec === k)
            .map((d) => ({
              "@type": "MenuItem",
              name: d.name,
              ...(d.vi || d.desc ? { description: d.vi || d.desc } : {}),
              ...(d.img && SITE_URL ? { image: SITE_URL + d.img } : {}),
              // only fixed prices; "theo thời giá" and per-kg/per-size prices are left out
              ...(d.price > 0 && !d.unit ? { offers: { "@type": "Offer", price: d.price, priceCurrency: "VND" } } : {}),
            })),
        })),
    };
    graph.push({ ...restaurant, hasMenu: { "@id": id("menu") } }, menu); // on the menu page, link to the full Menu entity
  }
  if (view === "karaoke") graph.push(karaoke);
  if (view !== "site" && SITE_URL) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: view === "restaurant" ? "Nhà hàng" : "Karaoke", item: SITE_URL + PATHS[view] },
      ],
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
