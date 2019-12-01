import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';
import Axios from 'axios';
import { TaskQueue } from 'cwait';
import * as xml2js from 'xml2js-es6-promise';

if (process.env.SENTRY_DSN) {
  /**
   * Initialize Sentry
   * Provide root file integration global variable
   * @link https://docs.sentry.io/platforms/node/typescript/
   */
  Sentry.init({
    release: process.env.RELEASE ?? 'unknown',
    dsn: process.env.SENTRY_DSN,
    integrations: [new RewriteFrames({
      root: __dirname || process.cwd(),
    })],
  });
}

const config = {
  sitemap: 'https://mathrix.fr/sitemap.xml',
  concurrency: 50,
  request: {
    headers: {
      'cache-control': 'no-cache', // override cache
    },
  },
};

/**
 * Core function body
 */
async function main(): Promise<number> {
  const start = Date.now();
  console.log('Starting cache rebuild');

  // Load a fresh sitemap
  const result = await Axios.get(config.sitemap);
  const sitemap = await xml2js(result.data);
  console.log('Got sitemap, extracting urls');

  // Parse it
  const urls: string [] = sitemap.urlset.url.map(url => url.loc[0]);
  const total = urls.length;
  const length = total.toString(10).length;
  console.log(`${total} urls to query`);

  let iterator = 0;
  let success = 0;

  const progress = (i: number): string => {
    i++;
    let iStr = i.toString(10);
    while (iStr.length < length) {
      iStr = `0${iStr}`;
    }
    return `[${iStr}/${total}]`;
  };

  // Make queue (reference: https://github.com/axios/axios/issues/1010#issuecomment-326172188)
  const queue = new TaskQueue(Promise, config.concurrency);
  console.log(`Starting querying with ${config.concurrency} parallel requests`);

  await Promise.all(
    urls.map(
      queue.wrap(async url => {
        return Axios.get(url, config.request)
          .then(() => {
            process.stdout.write(`${progress(iterator)} [200] ${url}\r`);
            success++;
            iterator++;
          })
          .catch((err) => {
            process.stdout.write(`${progress(iterator)} [${err.status}] ${url}\r`);
            iterator++;
          });
      }),
    ),
  );

  const end = Date.now();
  const duration = Math.floor((end - start) / 1000) + 1;

  console.log('\n==== Results ====');
  console.log(`Done in ${duration} seconds`);
  console.log(`[${success}/${total}] requests succeeded`);

  return 0;
}

/**
 * Sentry wrapper.
 */
exports['education-cache-builder-function'] = async (): Promise<number> => {
  try {
    return await main();
  } catch (error) {
    Sentry.captureException(error);
    await Sentry.flush(2000);
    throw error; // Rethrow error
  }
};
