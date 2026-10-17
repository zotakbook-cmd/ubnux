// UBnux Cloudflare Pages catch-all route handler
export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Keep static assets and the home page untouched.
  if (url.pathname === "/" || !url.pathname.startsWith("/in/")) {
    return context.next();
  }

  // Serve the SPA/SEO shell without changing the browser URL.
  const indexUrl = new URL(url.toString());
  indexUrl.pathname = "/index.html";
  indexUrl.search = "";

  return context.env.ASSETS.fetch(
    new Request(indexUrl.toString(), context.request)
  );
}
