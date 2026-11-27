// Валидация входа через Zod. Распарсенные значения кладём в req.valid,
// чтобы обработчики работали уже с приведёнными типами (числа из query и т.п.).
export const validate = (schemas) => (req, res, next) => {
  req.valid = {};
  for (const part of ["params", "query", "body"]) {
    if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
  }
  next();
};
