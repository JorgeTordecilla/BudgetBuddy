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
  const { isAuthenticated, user, bootstrapSession, isBootstrapping } = useAuth();
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  useEffect(() => {
    if (isAuthenticated || user || bootstrapAttempted || isBootstrapping) {
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
  }, [isAuthenticated, user, bootstrapAttempted, isBootstrapping, bootstrapSession]);

  if (isAuthenticated || user) {
    return children;
  }

  if (isBootstrapping) {
    return <SessionLoader />;
  }

  if (!bootstrapAttempted) {
    return <SessionLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
