// Replace fox3000foxy with your own subdomain if you have one, or keep it as is to use the public fallback cache (which may be slower and less reliable).
// You can find your subdomain in the "Settings" tab of the website-caches worker
const FALLBACK_BASE = "https://website-caches.fox3000foxy.workers.dev"

// --- Réécriture des liens dans le HTML ---
class LinkRewriter {
  constructor(targetHost, proxyHost) {
    this.TARGET_HOST = targetHost;
    this.PROXY_HOST = proxyHost;
  }
  element(el) {
    for (const attr of ["href", "src", "action"]) {
      const v = el.getAttribute(attr);
      if (!v) continue;
      if (attr === "src" && v.includes("via.placeholder.com")) {
        el.setAttribute(attr, "about:blank");
        continue;
      }
      if (v.includes(this.TARGET_HOST)) {
        el.setAttribute(attr, v.replace(this.TARGET_HOST, this.PROXY_HOST));
      }
    }
  }
}

class MetaRefreshRewriter {
  constructor(targetHost, proxyHost) {
    this.TARGET_HOST = targetHost;
    this.PROXY_HOST = proxyHost;
  }
  element(el) {
    const content = el.getAttribute("content");
    if (!content) return;
    const match = content.match(/url=(.*)/i);
    if (match) {
      let url = match[1].trim();
      if (url.includes(this.TARGET_HOST)) {
        url = url.replace(this.TARGET_HOST, this.PROXY_HOST);
        el.setAttribute("content", content.replace(match[1], url));
      }
    }
  }
}

class ThemeRewriter {
  constructor(theme) {
    this.THEME = theme;
  }
  element(el) {
    el.setAttribute("data-bs-theme", this.THEME)
  }
}

class InlineScriptRewriter {
  constructor(targetHost, proxyHost) {
    this.TARGET_HOST = targetHost;
    this.PROXY_HOST = proxyHost;
  }
  element(el) {
    if (!el.textContent) return;
    el.textContent = el.textContent.replace(new RegExp(this.TARGET_HOST, "g"), this.PROXY_HOST);
  }
}

// --- Test si le domaine est online ---
async function isOnline(url) {
  try {
    // const res = await fetch("https://_." + url, { method: "HEAD" });
    // return res.status === 200;
    const res = await fetch("https://_." + url);
    return res.status === 200;
  } catch {
    return false;
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetHost = url.hostname;
    const proxyHost = targetHost;
    const fullPath = url.pathname + url.search;
    const realDomainUrl = `https://_.${targetHost}${fullPath}`;

    // --- Récupérer le cookie "theme" ---
    let theme = "default"; // valeur par défaut
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map(c => {
        const [k, v] = c.trim().split("=");
        return [k, v];
      })
    );
    if (cookies.theme) theme = cookies.theme;

    if (url.pathname === "/profile/theme" && request.method === "POST") {
      let body = await request.json();

      const theme = body.theme || "default";

      const headers = new Headers();
      headers.append("Set-Cookie", `theme=${theme}; Path=/; SameSite=Lax`);
      return new Response(`Theme set to ${theme}`, { status: 200, headers });
    }

    // --- Sinon proxy normal (GET / login / 2FA / fallback) ---
    let response;
    try {
      const online = await isOnline(url.hostname);
      // const online = false;

      if (online) {
        // return new Response("ONLINE", { status: 200 }); // <-- renvoie "true"
        const headers = new Headers(request.headers);
        headers.set("host", `_.${targetHost}`);

        let body = null;
        if (request.method !== "GET" && request.method !== "HEAD") {
          body = await request.arrayBuffer();
        }

        response = await fetch(realDomainUrl, {
          method: request.method,
          headers,
          body,
          redirect: "manual",
        });

      } else {
        // return new Response("OFFLINE", { status: 200 }); // <-- renvoie "false"
        const fallbackUrl = `${FALLBACK_BASE}/${targetHost}${fullPath}`;
        response = await fetch(fallbackUrl);
      }
    } catch (e) {
      return new Response("Proxy error", { status: 502 });
    }

    // --- Gestion des headers et cookies ---
    const respHeaders = new Headers(response.headers);

    // Set-Cookie → réécriture pour le domaine proxy
    const setCookies = [];
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() === "set-cookie") setCookies.push(value);
    }
    respHeaders.delete("set-cookie");
    for (let cookie of setCookies) {
      cookie = cookie.replace(new RegExp(`Domain=_?${targetHost}`, "gi"), `Domain=${proxyHost}`);
      if (!/samesite=/i.test(cookie)) cookie += "; SameSite=None";
      if (!/secure/i.test(cookie)) cookie += "; Secure";
      respHeaders.append("set-cookie", cookie);
    }

    // Réécriture des headers sensibles (Location / Refresh)
    const rewriteHeaders = ["location", "refresh"];
    for (const headerName of rewriteHeaders) {
      const headerValue = respHeaders.get(headerName);
      if (headerValue && headerValue.includes(`_.${targetHost}`)) {
        respHeaders.set(headerName, headerValue.replace(`_.${targetHost}`, proxyHost));
      }
    }

    const contentType = respHeaders.get("content-type") || "";

    // --- HTMLRewriter uniquement pour les pages HTML ---
    if (contentType.includes("text/html") && request.method === "GET") {
      return new HTMLRewriter()
        .on("body", new ThemeRewriter(theme))
        .on("a", new LinkRewriter(`_.${targetHost}`, proxyHost))
        .on("form", new LinkRewriter(`_.${targetHost}`, proxyHost))
        .on("img", new LinkRewriter(`_.${targetHost}`, proxyHost))
        .on("script", new InlineScriptRewriter(`_.${targetHost}`, proxyHost))
        .on("link", new LinkRewriter(`_.${targetHost}`, proxyHost))
        .on("meta[http-equiv='refresh']", new MetaRefreshRewriter(targetHost, proxyHost))
        .transform(new Response(response.body, { status: response.status, headers: respHeaders }));
    }

    // --- Retour brut pour POST sensibles et autres ---
    return new Response(response.body, { status: response.status, headers: respHeaders });
  },
};
