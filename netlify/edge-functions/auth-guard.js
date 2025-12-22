// netlify/edge-functions/auth-guard.js
import { auth0 } from "edge.netlify.com"; 

export default async (request, context) => {
  try {
    // 1. Manually check the user session using the imported helper
    const user = await auth0.getUser(request, context);

    if (!user) {
      // 2. If not logged in, trigger the login redirect
      // This sends them to the Auth0-hosted login page
      return auth0.loginRedirect(request, context);
    }

    // 3. User is authenticated, allow them to see /dealer-portal
    return;
  } catch (error) {
    // If you see this in your Netlify logs, the extension isn't linked correctly
    console.error("Auth0 Extension Error:", error);
    
    // Instead of a silent redirect to home, return a clear error for debugging
    return new Response("Auth0 Extension configuration error. Please check Netlify settings.", { status: 500 });
  }
};

export const config = {
  path: "/dealer-portal",
};
