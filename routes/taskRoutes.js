const express = require("express");
const {
  validateTaskTitle,
  validateTaskStatus,
  validateTaskDueDate,
  validateMongoIdParam,
} = require("../utils/validators");
const {
  addTask,
  getTasks,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { authMiddleware } = require("../middlewares/Auth");

const router = express.Router();
router.use(authMiddleware);

router.post(
  "/addtask",
  [validateTaskTitle(), validateTaskStatus(), validateTaskDueDate()],
  addTask
);
router.get("/gettasks", getTasks);
router.put(
  "/update/:id",
  [
    validateMongoIdParam(),
    validateTaskTitle(),
    validateTaskStatus(),
    validateTaskDueDate(),
  ],
  updateTask
);
router.delete("/delete/:id", [validateMongoIdParam()], deleteTask);

module.exports = router;
