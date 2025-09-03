const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [3, "Task title must be at least 3 characters long"],
    },

    time: {
      type: String,
      required: [true, "Task time is required"],
      match: [
        /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
        "Invalid time format (hh:mm AM/PM)",
      ],
    },
    category: {
      type: String,
      trim: true,
      default: null, // optional
    },
    categoryIndex: {
      type: Number,
      trim: true,
      default: 0,
    },

    description: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
    },
    dueDate: { type: Date },
  },
  { timestamps: true }
);



module.exports = mongoose.model("Task", TaskSchema);
