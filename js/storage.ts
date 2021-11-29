function get(key: string, defaultValue: string) {
  return localStorage.getItem(key) || defaultValue;
}

function set(key: string, value: string) {
  return localStorage.setItem(key, value);
}

export {
  get,
  set,
};
