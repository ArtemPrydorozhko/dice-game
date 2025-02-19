function buildUrl(url) {
  if (url.startsWith('/')) {
    return `${location.origin}${import.meta.env.BASE_URL}${url.slice(1)}`;
  }
  return new URL(url, `${location.origin}${import.meta.env.BASE_URL}`).href;
}

export default { buildUrl };
