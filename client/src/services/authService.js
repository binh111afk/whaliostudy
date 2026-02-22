// Đây là nơi chứa logic gọi API (tách biệt hoàn toàn với giao diện)
import { getFullApiUrl } from '../config/apiConfig';

const withTimeout = (promise, ms = 3500) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

const getBrowserLocationContext = async () => {
  if (!navigator?.geolocation) return {};

  try {
    const position = await withTimeout(
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 5 * 60 * 1000,
        });
      }),
      3500
    );

    const lat = position?.coords?.latitude;
    const lon = position?.coords?.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') return {};

    try {
      const res = await withTimeout(
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`),
        3500
      );
      const data = await res.json();
      const addr = data?.address || {};
      const city = addr.city || addr.town || addr.county || addr.state || '';
      const country = String(addr.country_code || '').toUpperCase();
      return {
        city: city || '',
        country: country || '',
      };
    } catch {
      return {};
    }
  } catch {
    return {};
  }
};

const getDeviceContext = async () => {
  const ua = navigator?.userAgent || '';
  const uaData = navigator?.userAgentData;

  let platform = '';
  let model = '';
  let brand = '';
  let browser = '';

  if (uaData) {
    platform = uaData.platform || '';
    try {
      const high = await uaData.getHighEntropyValues(['model', 'platformVersion', 'uaFullVersionList']);
      model = high?.model || '';
      const brands = high?.uaFullVersionList || [];
      browser = brands?.[0]?.brand || '';
    } catch {
      model = '';
    }
  }

  if (!platform) {
    if (/Windows/i.test(ua)) platform = 'Windows';
    else if (/Mac OS|Macintosh/i.test(ua)) platform = 'macOS';
    else if (/Android/i.test(ua)) platform = 'Android';
    else if (/iPhone|iPad|iOS/i.test(ua)) platform = 'iOS';
    else if (/Linux/i.test(ua)) platform = 'Linux';
  }

  if (!browser) {
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  }

  const deviceLabel = model
    ? [brand, model, platform].filter(Boolean).join(' • ')
    : [platform, browser].filter(Boolean).join(' • ');

  return { device: deviceLabel || '' };
};

const getClientContext = async () => {
  const [deviceCtx, geoCtx] = await Promise.all([
    getDeviceContext(),
    getBrowserLocationContext(),
  ]);

  return {
    ...deviceCtx,
    ...geoCtx,
  };
};

export const authService = {
    startGoogleLogin() {
        window.location.href = getFullApiUrl('/auth/google');
    },

    async login(username, password) {
        try {
            const clientContext = await getClientContext();
            // Sử dụng getFullApiUrl để hỗ trợ cả development (proxy) và production (full URL)
            const response = await fetch(getFullApiUrl('/api/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, clientContext })
            });
            return await response.json();
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    },

    async register(payload) {
        try {
            const response = await fetch(getFullApiUrl('/api/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    },

    async logout(username) {
        try {
            const clientContext = await getClientContext();
            const response = await fetch(getFullApiUrl('/api/logout'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, clientContext })
            });
            return await response.json();
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    }
};
