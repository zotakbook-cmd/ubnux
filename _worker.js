// UBnux Cloudflare Pages Advanced Mode worker
// Keeps /in/... SEO URLs in the browser while serving the shared HTML shell.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/in/")) {
      const shellUrl = new URL(url.toString());
      shellUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(shellUrl.toString(), request));
    }

    return env.ASSETS.fetch(request);
  }
};
