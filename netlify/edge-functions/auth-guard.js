// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const domain = Deno.env.get("AUTH0_DOMAIN");
    const clientId = Deno.env.get("AUTH0_CLIENT_ID");

    // 1. HANDLE CALLBACK: Returning from Auth0
    if (url.searchParams.has("code")) {
      // Use a relative path starting with / to prevent domain doubling
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/dealer-portal/",
          "Set-Cookie": "appSession=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600"
        }
      });
    }

    // 2. PROTECT PORTAL: Check for session
    if (url.pathname.startsWith("/dealer-portal")) {
      const hasSession = request.headers.get("cookie")?.includes("appSession=true");

      if (!hasSession) {
        // This is the ONLY place you should use the full URL https://...
        // Ensure this EXACT string matches your Auth0 dashboard (https and /)
        const redirectUri = "https://veusdealers.netlify.app/"; 
        
        const auth0Url = `https://${domain}/authorize?` + 
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=openid%20profile%20email`;
        
        return Response.redirect(auth0Url, 302);
      }
    }

    return;
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};

export const config = { path: "/*" };
