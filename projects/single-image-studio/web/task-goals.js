export const TASK_GOALS = Object.freeze([
  Object.freeze({ id: "privacy-share", label: "分享前清理文件信息", detail: "清理 metadata、限制尺寸和体积", taskId: "UT-PRIVACY-SHARE" }),
  Object.freeze({ id: "upload-ready", label: "一次满足上传要求", detail: "尺寸、JPEG 和体积一起处理", taskId: "UT-UPLOAD" }),
  Object.freeze({ id: "too-large", label: "文件太大", detail: "压缩到上传上限", taskId: "UT-COMPRESS" }),
  Object.freeze({ id: "wrong-format", label: "格式不对", detail: "转成 PNG 或 JPEG", taskId: "UT-CONVERT" }),
  Object.freeze({ id: "keep-whole", label: "不想裁掉内容", detail: "加留白适配画布", taskId: "UT-FIT" }),
  Object.freeze({ id: "crop-rotate", label: "裁剪或旋转", detail: "进入基础编辑", taskId: "UT-TUNE" }),
  Object.freeze({ id: "tilted-plane", label: "文档或画面拍歪", detail: "四角裁正", taskId: "UT-RECTIFY" }),
  Object.freeze({ id: "document-attachment", label: "整理成文档附件", detail: "裁正、增强并压缩", taskId: "UT-DOC-ARCHIVE" }),
  Object.freeze({ id: "improve-look", label: "想调亮、降噪或清晰", detail: "自然增强", taskId: "UT-ENHANCE" }),
  Object.freeze({ id: "remove-background", label: "需要去背景", detail: "透明抠图", taskId: "UT-CUTOUT" }),
]);

export function taskGoalEntries(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError("tasks must be an array");
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  return Object.freeze(TASK_GOALS.map((goal) => {
    const task = taskById.get(goal.taskId);
    return Object.freeze({
      ...goal,
      available: task?.runnable === true,
      status: task?.runnable === true ? "直接打开" : task?.statusLabel ?? "当前不可用",
    });
  }));
}
