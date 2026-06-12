import { validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    // Run each validation schema block
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        location: err.location,
      })),
    });
  };
};
