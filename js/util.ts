// eslint-disable-next-line import/named
import { TemplateRow, TimeSpan } from './types.js';

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

export function getTimeSpan(firstDate: Date, secondDate: Date = new Date()): TimeSpan {
  let ms: number;
  const start = firstDate.getTime();
  const end = secondDate.getTime();
  if (start >= end) {
    ms = start - end;
  } else {
    ms = end - start;
  }

  const dd = Math.floor(ms / 1000 / 60 / 60 / 24);
  ms -= dd * 1000 * 60 * 60 * 24;
  const hh = Math.floor(ms / 1000 / 60 / 60);
  ms -= hh * 1000 * 60 * 60;
  const mm = Math.floor(ms / 1000 / 60);
  ms -= mm * 1000 * 60;
  const ss = Math.floor(ms / 1000);
  ms -= ss * 1000;

  return {
    days: dd, hours: hh, milliseconds: ms, minutes: mm, seconds: ss,
  };
}

export function formatTimeSpan(timespan: TimeSpan): string {
  let output = '';
  if (timespan.days) {
    output = `<span class="day">${timespan.days}d</span>`;
  }

  if (timespan.hours) {
    output += `<span class="hour">${timespan.hours}h</span>`;
  }

  if (!timespan.days && timespan.minutes) {
    output += `<span class="minute">${timespan.minutes}m</span>`;
  }

  if (!timespan.days && !timespan.hours && !timespan.minutes && timespan.seconds) {
    output = `<span class="second">${timespan.seconds}s</span>`;
  }

  return output;
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getTemplateRow(templateId: string): TemplateRow {
  const rowSelector = `#exchangeTable tr[data-template-id="${templateId}"]`;
  return document.querySelector(rowSelector) as HTMLTableRowElement;
}

export function findParentNode(element: HTMLElement, nodeName: string): HTMLElement {
  let parent = element.parentNode as HTMLElement;
  while (parent && parent.nodeName !== nodeName) {
    parent = parent.parentNode as HTMLElement;
  }

  return parent;
}

export function logEvent(href: string, title: string, type?: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (clicky) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      clicky.log(href, title, type);
    }
  } catch (e) {
    console.error(e);
  }
}
