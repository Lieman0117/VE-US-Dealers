// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // Use Deno.env for Edge Functions (or Netlify.env in latest 2025 runtimes)
    // We'll check both to be safe against your specific environment crash
    const domain = Deno.env.get("AUTH0_DOMAIN") || Netlify?.env?.get("AUTH0_DOMAIN");
    const clientId = Deno.env.get("AUTH0_CLIENT_ID") || Netlify?.env?.get("AUTH0_CLIENT_ID");

    if (!domain || !clientId) {
      console.error("Critical: Auth0 Environment Variables missing.");
      return new Response("Missing Configuration", { status: 500 });
    }

    // A. HANDLE CALLBACK: When returning from Auth0 with a ?code=
    if (url.searchParams.has("code")) {
      const response = Response.redirect(new URL("/dealer-portal/", request.url), 302);
      response.headers.append("Set-Cookie", "appSession=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600");
      return response;
    }

    // B. PROTECT PORTAL: Check if visiting the dealer portal
    if (url.pathname.startsWith("/dealer-portal")) {
      const hasSession = request.headers.get("cookie")?.includes("appSession=true");

      if (!hasSession) {
        // Ensure this EXACT string matches your Auth0 Allowed Callback URL
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
    // This prevents the "Crashed" screen from appearing to the user
    console.error("Edge Function Crash Details:", err);
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
  }
};

export const config = {
  path: "/*", 
};
