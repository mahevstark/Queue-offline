import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
const locales = ['en', 'az'];

export default getRequestConfig(async ({locale}) => {
  if (!locales.includes(locale)) notFound();
  
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "UTC"
  };
});

export {locales};
