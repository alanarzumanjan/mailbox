// Request validation with Zod. Parsed values go into req.valid so handlers
// work with coerced types (numbers from the query string and so on).
export const validate = (schemas) => (req, res, next) => {
  req.valid = {};
  for (const part of ["params", "query", "body"]) {
    if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
  }
  next();
};
