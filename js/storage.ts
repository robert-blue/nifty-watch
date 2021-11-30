function get(key: string, defaultValue?: string): string|undefined {
  return localStorage.getItem(key) || defaultValue;
}

function set(key: string, value: string): void {
  return localStorage.setItem(key, value);
}

export {
  get,
  set,
};
