// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  // 1. Check for the Auth0 session cookie (usually named 'appSession')
  const hasSession = request.headers.get("cookie")?.includes("appSession");

  if (!hasSession) {
    // 2. Build your Auth0 Login URL manually
    const domain = "dev-c48iqffskp7vzvms.auth0.com";
    const clientId = "LUmC8kUGIpxYkQSWN2keGeKYcu0do9dJ";
    const redirectUri = "veusdealers.netlify.app"; // Your site URL
    
    const auth0LoginUrl = `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;

    // 3. Force redirect to Auth0 login
    return Response.redirect(auth0LoginUrl, 302);
  }

  // If session exists, let them through
  return;
};

export const config = {
  path: "/dealer-portal",
};
