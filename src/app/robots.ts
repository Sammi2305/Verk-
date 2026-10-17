import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/minar-sidur", "/fagadili", "/stjornbord", "/bokanir", "/verkbeidni", "/tilkynningar", "/dev/", "/innskraning", "/nyskraning/stadfesta", "/stadfesta-netfang", "/endurstilla-lykilord"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
