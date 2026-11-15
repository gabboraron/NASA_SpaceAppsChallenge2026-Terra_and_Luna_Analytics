import { navigate, ROUTES, usePath } from "../../site/router";

/** After signing in: a gated page shows by itself; the sign-in pages go to the explorer. */
export function useAfterSignIn(): () => void {
  const path = usePath();
  return () => {
    if (path === ROUTES.login || path === ROUTES.register) navigate(ROUTES.app);
  };
}
