const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
const reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;

function JSONDateParser(_: string, value: unknown) {
  if (typeof value === 'string') {
    let a = reISO.exec(value);
    if (a) return new Date(value);
    a = reMsAjax.exec(value);
    if (a) {
      const b = a[1].split(/[-+,.]/);
      return new Date(b[0] ? +b[0] : 0 - +b[1]);
    }
  }
  return value;
}

function getString(key: string, defaultValue?: string): string | undefined {
  return localStorage.getItem(key) || defaultValue;
}

function setString(key: string, value: string) {
  return localStorage.setItem(key, value);
}

function get<T>(key: string, defaultValue?: T): T | undefined {
  console.debug('get', key);
  const value = localStorage.getItem(key);
  if (value === undefined || value === null) {
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(value, JSONDateParser) as T;
    console.debug('get', key, parsed);
    return parsed || defaultValue;
  } catch (e) {
    console.error(e);
  }

  return defaultValue;
}

function set<T>(key: string, value: T): void {
  console.debug('set', key, value);
  return localStorage.setItem(key, JSON.stringify(value));
}

function remove(key: string): void {
  console.debug('remove', key);
  localStorage.removeItem(key);
}

export {
  get,
  set,
  remove,
  getString,
  setString,
};
