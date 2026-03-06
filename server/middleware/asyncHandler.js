/**
 * asyncHandler — wraps a single async route handler so that any rejected
 * promise is forwarded to Express's next(err) instead of becoming an
 * unhandled rejection.  Required for Express 4 (Express 5 handles this natively).
 *
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 *
 * wrapRouter — convenience helper that wraps every handler already registered
 * on a router in one call.  Call it at the bottom of each route file before
 * the default export:
 *
 *   export default wrapRouter(router);
 */

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Wraps all route-level handlers on an Express Router so rejections are
 * forwarded to next(err).  Must be called *after* all routes are defined.
 */
export function wrapRouter(router) {
  router.stack.forEach(layer => {
    if (!layer.route) return;
    layer.route.stack.forEach(handler => {
      const fn = handler.handle;
      handler.handle = (req, res, next) =>
        Promise.resolve(fn(req, res, next)).catch(next);
    });
  });
  return router;
}
