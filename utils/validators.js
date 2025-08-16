const { body, param, query } = require("express-validator");

const validateName = () =>
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters");

const validateEmail = () =>
  body("email").trim().isEmail().withMessage("Please provide a valid email");

const validatePassword = () =>
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters");

const validateTaskTitle = () =>
  body("title")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Task title must be at least 3 characters");

const validateTaskStatus = () =>
  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Invalid status");

const validateTaskDueDate = () =>
  body("dueDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Invalid due date");
const validateTaskTime = () =>
  body("time")
    .exists({ checkFalsy: true })
    .withMessage("Task time is required")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format (HH:mm)");

const validateTaskCategory = () =>
  body("category")
    .optional()
    .isString()
    .trim()
    .withMessage("Category must be a string");

const validateMongoIdParam = (paramName = "id") =>
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ID`);

module.exports = {
  validateName,
  validateEmail,
  validatePassword,
  validateTaskTitle,
  validateTaskStatus,
  validateTaskDueDate,
  validateMongoIdParam,
  validateTaskTime,
  validateTaskCategory,
};
