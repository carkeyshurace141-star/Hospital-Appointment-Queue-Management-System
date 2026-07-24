import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isConfigured = Boolean(CLIENT_ID) && !CLIENT_ID.startsWith('replace_with');

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.getElementById('google-identity-script');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In.')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In.'));
    document.head.appendChild(script);
  });
}

function GoogleButton({ onCredential, onError }) {
  const containerRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const { isDark } = useTheme();
  const [failedToLoad, setFailedToLoad] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!isConfigured || !containerRef.current) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        const width = containerRef.current.offsetWidth || 336;
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width,
        });
      })
      .catch((err) => {
        setFailedToLoad(true);
        onErrorRef.current?.(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isDark]);

  if (!isConfigured) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 px-4 py-2.5 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        Google sign-in isn&apos;t configured yet.
      </div>
    );
  }

  if (failedToLoad) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 px-4 py-2.5 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        Google Sign-In couldn&apos;t load. Check your connection and try again.
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}

export default GoogleButton;
