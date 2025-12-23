// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const domain = Deno.env.get("AUTH0_DOMAIN") || Netlify.env.get("AUTH0_DOMAIN");
    const clientId = Deno.env.get("AUTH0_CLIENT_ID") || Netlify.env.get("AUTH0_CLIENT_ID");

    // 1. HANDLE CALLBACK: Catch the login return
    if (url.searchParams.has("code")) {
      // Use a fully qualified absolute URL for the destination
      const destination = "veusdealers.netlify.app";
      
      return new Response(null, {
        status: 302,
        headers: {
          "Location": destination,
          "Set-Cookie": "appSession=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600"
        }
      });
    }

    // 2. PROTECT PORTAL: Check for session
    if (url.pathname.startsWith("/dealer-portal")) {
      const hasSession = request.headers.get("cookie")?.includes("appSession=true");

      if (!hasSession) {
        // MANDATORY: The redirect_uri must be an absolute URL with https://
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
