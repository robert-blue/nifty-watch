import { HasRefreshTimeout } from './types.js';

export function parseTokenValue(precision: number, amount: string) {
  const left = amount.substring(0, amount.length - precision);
  const right = amount.substring(amount.length - precision);
  return parseFloat(`${left}.${right}`);
}

export function formatPrice(price: number) {
  return price.toFixed(2);
}

export function formatPercent(value: number) {
  const prefix = value <= 0 ? '' : '+';
  const percentage = Math.floor(value * 100) / 100;
  return `${prefix}${percentage}%`;
}

export function formatTimespan(milliseconds: number) {
  let msec = milliseconds;
  const dd = Math.floor(msec / 1000 / 60 / 60 / 24);
  msec -= dd * 1000 * 60 * 60 * 24;
  const hh = Math.floor(msec / 1000 / 60 / 60);
  msec -= hh * 1000 * 60 * 60;
  const mm = Math.floor(msec / 1000 / 60);
  msec -= mm * 1000 * 60;
  const ss = Math.floor(msec / 1000);

  let output = '';
  if (dd) {
    output = `<span class="day">${dd}d</span>`;
  }

  if (hh) {
    output += `<span class="hour">${hh}h</span>`;
  }

  if (!dd && mm) {
    output += `<span class="minute">${mm}m</span>`;
  }

  if (!dd && !hh && !mm && ss) {
    output = `<span class="second">${ss}s</span>`;
  }

  return output;
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getTemplateRow(templateId: string): HasRefreshTimeout {
  const rowSelector = `#exchangeTable tr[data-template-id="${templateId}"]`;
  return document.querySelector(rowSelector) as HTMLTableRowElement;
}
