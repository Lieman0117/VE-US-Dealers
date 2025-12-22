// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  // 1. Pull settings from Netlify Environment Variables
  const domain = Netlify.env.get("AUTH0_DOMAIN");
  const clientId = Netlify.env.get("AUTH0_CLIENT_ID");

  if (!domain || !clientId) {
    console.error("Missing Auth0 Environment Variables");
    return new Response("Server Configuration Error", { status: 500 });
  }

  // 2. Check for the Auth0 session cookie
  const hasSession = request.headers.get("cookie")?.includes("appSession");

  if (!hasSession) {
    // 3. Build Login URL using the secure variables
    const redirectUri = "https://veusdealers.netlify.app/"; 
    const auth0LoginUrl = `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;

    return Response.redirect(auth0LoginUrl, 302);
  }

  // Session exists, proceed to page
  return;
};

export const config = {
  path: "/dealer-portal",
};
