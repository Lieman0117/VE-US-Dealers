// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  const url = new URL(request.url);
  
  // Use Netlify.env.get for 2025 security compliance
  const domain = Netlify.env.get("AUTH0_DOMAIN");
  const clientId = Netlify.env.get("AUTH0_CLIENT_ID");

  // A. HANDLE CALLBACK: When returning from Auth0 with a ?code=
  // This must catch the code and set the cookie before redirecting to the portal
  if (url.searchParams.has("code")) {
    const response = Response.redirect(new URL("/dealer-portal/", request.url), 302);
    // Setting appSession=true allows the 'if' block below to pass next time
    response.headers.append("Set-Cookie", "appSession=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600");
    return response;
  }

  // B. PROTECT PORTAL: Check if visiting the dealer portal
  if (url.pathname.startsWith("/dealer-portal")) {
    const hasSession = request.headers.get("cookie")?.includes("appSession=true");

    if (!hasSession) {
      // MANDATORY: This string must match your Auth0 dashboard EXACTLY
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
};

export const config = {
  path: "/*", 
};
