import { useEffect, useRef, useState } from 'react';
import { fetchMe } from '../api/auth';
import { createCheckout } from '../api/payments';
import { useAuth } from '../context/AuthContext';

const BRAND_THEME = {
  light: {
    bgPrimary: '#FAFAF8',
    textPrimary: '#1C1C1E',
    buttonPrimary: '#0F766E',
    buttonPrimaryHover: '#0D9488',
    borderPrimary: '#D1D5DB',
  },
  radius: '8px',
};

// Module-level state so Initialize is called only once
let dodoInitialized = false;
let eventHandler = null;

function ensureDodoInitialized(DodoPayments, mode) {
  if (dodoInitialized) return;
  dodoInitialized = true;
  DodoPayments.Initialize({
    mode,
    displayType: 'overlay',
    onEvent: (event) => {
      if (eventHandler) eventHandler(event);
    },
  });
}

export function useUpgrade() {
  const { updateUser } = useAuth();
  const [state, setState] = useState('idle');
  const pollRef = useRef(null);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    let attempts = 0;
    const MAX_ATTEMPTS = 15;
    stopPolling();
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const data = await fetchMe();
        if (data.user?.plan && data.user.plan !== 'free') {
          stopPolling();
          updateUser(data.user);
          setState('success');
          return;
        }
      } catch {
        // continue polling
      }
      if (attempts >= MAX_ATTEMPTS) {
        stopPolling();
        setState('timeout');
      }
    }, 2000);
  }

  async function startCheckout({ plan, region }) {
    setState('creating');
    let checkoutUrl;

    try {
      const data = await createCheckout({ plan, region });
      checkoutUrl = data.checkoutUrl;
    } catch (err) {
      setState('error');
      return;
    }

    let DodoPayments;
    try {
      const mod = await import('dodopayments-checkout');
      DodoPayments = mod.DodoPayments || mod.default;
      const mode = import.meta.env.VITE_DODO_MODE || 'test';
      ensureDodoInitialized(DodoPayments, mode);
    } catch {
      window.location.href = checkoutUrl;
      return;
    }

    let paymentInitiated = false;

    eventHandler = (event) => {
      switch (event.event_type) {
        case 'checkout.redirect':
          paymentInitiated = true;
          eventHandler = null;
          setState('activating');
          startPolling();
          break;
        case 'checkout.closed':
          eventHandler = null;
          if (paymentInitiated) {
            setState('activating');
            startPolling();
          } else {
            setState('idle');
          }
          break;
        case 'checkout.error':
          eventHandler = null;
          DodoPayments.Checkout.close();
          window.location.href = checkoutUrl;
          break;
        case 'checkout.link_expired':
          eventHandler = null;
          setState('error');
          break;
        default:
          break;
      }
    };

    try {
      setState('overlay');
      DodoPayments.Checkout.open({
        checkoutUrl,
        options: {
          themeConfig: BRAND_THEME,
          showTimer: false,
          showSecurityBadge: true,
        },
      });
    } catch {
      eventHandler = null;
      window.location.href = checkoutUrl;
    }
  }

  function reset() {
    stopPolling();
    setState('idle');
  }

  return { startCheckout, state, reset };
}
