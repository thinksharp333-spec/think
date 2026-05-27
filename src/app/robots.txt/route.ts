import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host") || "digilibrary.org";
  const proto = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;
  
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /read/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

Sitemap: ${baseUrl}/sitemap.xml`;

  return new NextResponse(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate",
    },
  });
}
