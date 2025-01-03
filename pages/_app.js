import '../styles/globals.css';

import PlausibleProvider from 'next-plausible';
function MyApp({ Component, pageProps }) {
  return (
    <>
      <PlausibleProvider domain="flag.rachel.systems">
        <Component {...pageProps} />
      </PlausibleProvider>
    </>
  );
}

export default MyApp;
