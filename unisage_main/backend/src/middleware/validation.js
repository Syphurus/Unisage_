/**
 * @fileoverview Request validation middleware factory.
 * Accepts a Joi schema definition object with optional `body`, `params`, and `query`
 * keys and returns Express middleware that validates the corresponding `req` properties.
 */

const { ValidationError } = require("../utils/errors");

/**
 * Creates a validation middleware for the given schema definition.
 *
 * @param {Object} schema - Object with optional `body`, `params`, `query` Joi schemas
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/signup', validate(validators.signup), controller.signup);
 */
function validate(schema) {
  return (req, _res, next) => {
    const errors = {};

    // Validate each key that has a schema defined
    for (const key of ["body", "params", "query"]) {
      if (schema[key]) {
        const { error, value } = schema[key].validate(req[key], {
          abortEarly: false, // collect ALL errors, not just the first
          stripUnknown: true, // remove unknown fields (sanitization)
          convert: true, // coerce types (e.g. string "1" → number 1)
        });

        if (error) {
          errors[key] = error.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
          }));
        } else {
          // Replace req property with the sanitized+coerced value
          req[key] = value;
        }
      }
    }

    // If any validation errors, throw a ValidationError with details
    if (Object.keys(errors).length > 0) {
      const firstMessage = Object.values(errors)[0][0].message;
      const err = new ValidationError(firstMessage, errors);
      return next(err);
    }

    next();
  };
}

module.exports = validate;
