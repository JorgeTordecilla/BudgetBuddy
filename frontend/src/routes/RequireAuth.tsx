import { Navigate, useLocation } from "react-router-dom";
import type { ReactElement } from "react";

type RequireAuthProps = {
  children: ReactElement;
};

export default function RequireAuth({ children }: RequireAuthProps): ReactElement {
  const location = useLocation();
  const authed = false;

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
