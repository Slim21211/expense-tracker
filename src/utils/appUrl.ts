// Приложение может жить не в корне сайта (GitHub Pages без своего домена:
// /expense-tracker/), поэтому пути к файлам и ссылки для писем строятся от base.
const BASE = import.meta.env.BASE_URL;

// Файл из public/: assetUrl('logo.png')
export const assetUrl = (file: string) => `${BASE}${file}`;

// Полная ссылка на страницу приложения — для писем Supabase
export const absoluteAppUrl = (path = '') => `${window.location.origin}${BASE}${path}`;

// Путь внутри приложения без base: '/expense-tracker/reset-password' → '/reset-password'
export const appPathname = () =>
  '/' + window.location.pathname.slice(BASE.length).replace(/^\/+/, '');
