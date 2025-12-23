// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // Safely get environment variables for Deno
    const domain = Deno.env.get("AUTH0_DOMAIN");
    const clientId = Deno.env.get("AUTH0_CLIENT_ID");

    if (!domain || !clientId) {
      console.error("Auth0 environment variables are missing.");
      return; // Fallback: Allow request if config is broken to prevent site-wide crash
    }

    // 1. HANDLE CALLBACK: Returning from Auth0 with a ?code=
    if (url.searchParams.has("code")) {
      // Create a manual redirect to the portal
      const response = new Response(null, {
        status: 302,
        headers: {
          "Location": "veusdealers.netlify.app",
          "Set-Cookie": "appSession=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600"
        }
      });
      return response;
    }

    // 2. PROTECT PORTAL: Check if visiting /dealer-portal
    if (url.pathname.startsWith("/dealer-portal")) {
      const cookie = request.headers.get("cookie") || "";
      const hasSession = cookie.includes("appSession=true");

      if (!hasSession) {
        // EXACT match for Auth0 Dashboard (must have https:// and trailing /)
        const redirectUri = "veusdealers.netlify.app"; 
        
        const auth0Url = `https://${domain}/authorize?` + 
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=openid%20profile%20email`;
        
        return Response.redirect(auth0Url, 302);
      }
    }

    return; // Allow other pages to load normally
  } catch (err) {
    console.error("Critical Edge Error:", err.message);
    // Return a basic error instead of the Netlify "Crashed" screen
    return new Response("Internal Authentication Error", { status: 500 });
  }
};

export const config = {
  path: "/*",
};
