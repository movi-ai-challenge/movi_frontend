export type RefreshAccessToken = () => Promise<string>;

export function createAuthRefreshCoordinator(
  refreshAccessToken: RefreshAccessToken,
): RefreshAccessToken {
  let activeRefresh: Promise<string> | null = null;

  return () => {
    if (activeRefresh) return activeRefresh;

    const refreshAttempt = Promise.resolve().then(refreshAccessToken);
    const trackedRefresh = refreshAttempt.finally(() => {
      if (activeRefresh === trackedRefresh) {
        activeRefresh = null;
      }
    });

    activeRefresh = trackedRefresh;
    return trackedRefresh;
  };
}
