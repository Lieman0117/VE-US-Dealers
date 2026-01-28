// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const domain = Deno.env.get("AUTH0_DOMAIN");       // Set this to login.vehicleelectronics.us
    const clientId = Deno.env.get("AUTH0_CLIENT_ID");

    // 1. HANDLE CALLBACK FROM AUTH0
    if (url.searchParams.has("code")) {
      // Auth0 returns ?code=...&state=...
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/dealer-portal/",
          "Set-Cookie": "appSession=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600"
        }
      });
    }

    // 2. PROTECT /dealer-portal AND /order
    if (url.pathname.startsWith("/dealer-portal") || url.pathname.startsWith("/order")) {
      const hasSession = request.headers.get("cookie")?.includes("appSession=true");

      if (!hasSession) {
        const redirectUri = "https://vehicleelectronics.us/dealer-portal/"; // Must match Allowed Callback URLs
        
        const auth0Url = `https://${domain}/authorize?` + 
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=openid%20profile%20email`;
        
        return Response.redirect(auth0Url, 302);
      }
    }

    // Let public paths pass
    return;

  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};

export const config = { path: "/*" };
