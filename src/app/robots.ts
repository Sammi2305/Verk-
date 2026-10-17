import { appUrl } from "@/lib/runtime-config";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
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
