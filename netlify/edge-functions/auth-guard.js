// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const domain = Deno.env.get("AUTH0_DOMAIN");
    const clientId = Deno.env.get("AUTH0_CLIENT_ID");

    // 1. Handle return from Auth0
    if (url.searchParams.has("code")) {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "veusdealers.netlify.app",
          "Set-Cookie": "appSession=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600"
        }
      });
    }

    // 2. Protect the portal
    if (url.pathname.startsWith("/dealer-portal")) {
      const hasSession = request.headers.get("cookie")?.includes("appSession=true");

      if (!hasSession) {
        // MANUALLY BUILD THE URL TO AVOID ENCODING GLITCHES
        const redirectUri = "https://veusdealers.netlify.app/";
        const auth0Url = `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid%20profile%20email`;
        
        return Response.redirect(auth0Url, 302);
      }
    }

    return;
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};

export const config = { path: "/*" };
