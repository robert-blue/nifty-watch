function get(key, defaultValue) {
  return localStorage.getItem(key) || defaultValue;
}

function set(key, value) {
  return localStorage.setItem(key, value);
}

export {
  get,
  set,
};
