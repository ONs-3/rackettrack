import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Redirect target for the short deep link `rackettrack://join/<code>`
 * (04-screens.md) onto the actual route, kept under `squad/` per the folder
 * structure in 01-architecture.md.
 */
export default function JoinRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();

  useEffect(() => {
    if (code) router.replace(`/squad/join/${code}`);
  }, [code]);

  return null;
}
