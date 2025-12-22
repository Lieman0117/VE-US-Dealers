// netlify/edge-functions/auth-guard.js
import { authGuard } from "https://edge.netlify.com/auth/auth0";

export default async (request, context) => {
  try {
    // 1. Check if user is logged in
    const user = await auth0.getUser(request, context);

    if (!user) {
      // 2. If not logged in, redirect to the Auth0 login page
      return auth0.loginRedirect(request, context);
    }

    // 3. User is authenticated, proceed to /dealer-portal
    return;
  } catch (error) {
    console.error("Auth0 Extension Error:", error);
    // Prevents the "Crashed" screen; redirects to home instead
    return Response.redirect(new URL("/", request.url), 302);
  }
};

export const config = {
  path: "/dealer-portal",
};
