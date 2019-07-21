# Education Cache Builder
Proudly maintained by Mathieu Bour <mathieu@mathrix.fr>.

This is a small Cloud Function will alow to rebuild the entire cache of
Mathrix Education. To do so, it simply download the source map and 
makes GET queries.

Thus, the cache is sitemap-depend, which means that the Cloud Function
will never query non-sitemapped URIs. 

## Building
Since this Cloud Function is written in TypeScript, building is quite
simple. Just run:
```bash
yarn run build
```
This command will, is this order:
1. Remove the `dist/` folder if it exists
2. Build with `tsc` the Cloud Function
3. Copy the package.json in the `dist/` folder, so it is deployment-ready.

## Deployment
Deployment is managed by CloudBuild, which will deploy the Cloud
Function on every commit on the master branch.

## Consuming the Cloud Function
Simply trigger the following URI.
```
POST https://europe-west1-mathrix-education.cloudfunctions.net/education-cache-builder 
```

For example, with curl:
```bash
curl -X POST https://europe-west1-mathrix-education.cloudfunctions.net/education-cache-builder &
```
Note the `&` at the end which allow to return to the current process
without waiting for the Cloud Function result (which can take more than
5 minutes).

**Limitation:** Cloud Functions execution time are limited to 540
seconds ([reference](https://cloud.google.com/sdk/gcloud/reference/functions/deploy#--timeout)).
Thus, an other implementation of the cache builder should be envisaged
if the sitemap goes over 2000 links.  

## References
- [Cloud Functions Documentation](https://cloud.google.com/functions/docs/)
