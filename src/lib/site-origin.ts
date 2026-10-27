import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

export const getSiteOrigin = createIsomorphicFn()
  .server(() => {
    const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true });
    return url.origin;
  })
  .client(() => window.location.origin);
