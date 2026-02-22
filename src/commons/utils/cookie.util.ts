/**
 * 쿠키 파싱 유틸리티 함수
 * 사파리 등 다양한 브라우저에서 쿠키를 안정적으로 파싱하기 위한 함수
 */

/**
 * 쿠키 헤더를 파싱하여 객체로 변환
 * @param cookieHeader 쿠키 헤더 (string | string[] | undefined)
 * @returns 파싱된 쿠키 객체
 */
export function parseCookies(
  cookieHeader: string | string[] | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};

  // 배열인 경우 합치기 (사파리 등에서 배열로 올 수 있음)
  const cookieString = Array.isArray(cookieHeader)
    ? cookieHeader.join(';')
    : cookieHeader;

  return cookieString.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;

    // 첫 번째 '=' 이후는 모두 값으로 처리 (값에 '='이 포함될 수 있음)
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) return acc;

    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();

    if (key && value) {
      // URL 디코딩 (쿠키 값이 인코딩된 경우)
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        // 디코딩 실패 시 원본 값 사용
        acc[key] = value;
      }
    }

    return acc;
  }, {} as Record<string, string>);
}

/**
 * 쿠키 헤더에서 특정 쿠키 값을 추출
 * @param cookieHeader 쿠키 헤더 (string | string[] | undefined)
 * @param cookieName 쿠키 이름
 * @returns 쿠키 값 또는 null
 */
export function getCookieValue(
  cookieHeader: string | string[] | undefined,
  cookieName: string,
): string | null {
  const cookies = parseCookies(cookieHeader);
  return cookies[cookieName] || null;
}
