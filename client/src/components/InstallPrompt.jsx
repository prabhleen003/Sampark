import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt.getTime() < sevenDays) return;
    }

    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    if (isIOSDevice && !isStandalone) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    const handler = event => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 z-50 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-white text-sm font-medium">Add Sampaark to your home screen</p>
          {isIOS ? (
            <p className="text-gray-400 text-xs mt-1">Tap Share, then &quot;Add to Home Screen&quot;</p>
          ) : (
            <p className="text-gray-400 text-xs mt-1">Quick access to your vehicle dashboard</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleDismiss} className="text-gray-400 text-sm px-3 py-2">Later</button>
          {!isIOS && (
            <button onClick={handleInstall} className="bg-teal-500 text-white text-sm px-4 py-2 rounded-lg font-medium">
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
