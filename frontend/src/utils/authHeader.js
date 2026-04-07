const TOKEN_KEY = 'access_token';

export function getAuthHeader() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getCredentials() {
  return 'include';
}

export function getAuthHeaders() {
  return {
    ...getAuthHeader(),
    credentials: getCredentials(),
  };
}
