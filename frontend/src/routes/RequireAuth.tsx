import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactElement } from "react";

import { useAuth } from "@/auth/useAuth";
import SessionLoader from "@/components/session/SessionLoader";

type RequireAuthProps = {
  children: ReactElement;
};

export default function RequireAuth({ children }: RequireAuthProps): ReactElement {
  const location = useLocation();
  const { isAuthenticated, bootstrapSession, isBootstrapping } = useAuth();
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  useEffect(() => {
    if (isAuthenticated || bootstrapAttempted || isBootstrapping) {
      return;
    }
    let active = true;
    bootstrapSession().finally(() => {
      if (active) {
        setBootstrapAttempted(true);
      }
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated, bootstrapAttempted, isBootstrapping, bootstrapSession]);

  if (isBootstrapping) {
    return <SessionLoader />;
  }

  if (isAuthenticated) {
    return children;
  }

  if (!bootstrapAttempted) {
    return <SessionLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
