// UBnux Cloudflare Pages Advanced Mode Worker v2.0.0
// One routing layer only: keep /in/... in the browser and serve index.html.
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    // Every UBnux SEO route is handled by the same HTML shell.
    if (incoming.pathname === "/in" || incoming.pathname.startsWith("/in/")) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/index.html";
      assetUrl.search = "";

      const assetRequest = new Request(assetUrl.toString(), {
        method: "GET",
        headers: request.headers
      });

      const response = await env.ASSETS.fetch(assetRequest);

      // Add a diagnostic header so we can verify that this Worker is the
      // deployed request handler. It does not change the page or URL.
      const headers = new Headers(response.headers);
      headers.set("X-UBnux-Route", "seo-shell");
      headers.set("X-UBnux-Path", incoming.pathname);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return env.ASSETS.fetch(request);
  }
};
