import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const normalizePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

export const usePersistedPagination = ({
  paramKey = 'page',
  defaultPage = 1,
  replace = true,
  scrollOnChange = true,
} = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = useMemo(() => {
    const rawValue = searchParams.get(paramKey);
    return rawValue === null
      ? defaultPage
      : normalizePage(rawValue, defaultPage);
  }, [defaultPage, paramKey, searchParams]);

  useEffect(() => {
    const rawValue = searchParams.get(paramKey);
    if (rawValue === null) return;

    const normalizedPage = normalizePage(rawValue, defaultPage);
    if (String(normalizedPage) === String(rawValue)) return;

    setSearchParams((prevParams) => {
      const nextParams = new URLSearchParams(prevParams);
      nextParams.set(paramKey, String(normalizedPage));
      return nextParams;
    }, { replace: true });
  }, [defaultPage, paramKey, searchParams, setSearchParams]);

  const goToPage = useCallback(
    (nextPage, options = {}) => {
      const {
        replace: shouldReplace = replace,
        scroll = scrollOnChange,
      } = options;
      const normalizedPage = normalizePage(nextPage, defaultPage);
      setSearchParams((prevParams) => {
        const nextParams = new URLSearchParams(prevParams);
        nextParams.set(paramKey, String(normalizedPage));
        return nextParams;
      }, { replace: shouldReplace });

      if (scroll && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [defaultPage, paramKey, replace, scrollOnChange, setSearchParams]
  );

  return {
    currentPage,
    goToPage,
  };
};

export default usePersistedPagination;
