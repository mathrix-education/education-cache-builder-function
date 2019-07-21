import Axios from 'axios';
import * as xml2js from 'xml2js-es6-promise';
import {Request, Response} from 'express';
import {TaskQueue} from 'cwait';

const config = {
    sitemap: 'https://api.mathrix.fr/system/sitemap',
    concurrency: 10,
    request: {
        headers: {
            'cache-control': 'no-cache' // override cache
        }
    }
};

exports['education-cache-builder'] = async (req: Request, res: Response) => {
    /*
     * Ignore the non-POST methods, which prevent the non-desirable executions (for example, when the Cloud Function
     * link is exposed through social discussions.
     */
    if (req.method !== 'POST') {
        return;
    }

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

    const progress = (i: number) => {
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
            })
        )
    );

    const end = Date.now();
    const duration = Math.floor((end - start) / 1000) + 1;

    console.log("\n==== Results ====");
    console.log(`Done in ${duration} seconds`);
    console.log(`[${success}/${total}] requests succeeded`);
};
