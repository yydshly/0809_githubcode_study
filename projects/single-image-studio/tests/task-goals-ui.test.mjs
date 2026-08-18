import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("task page offers problem-first shortcuts without pretending to analyze content", async () => {
  const [index, main, styles, goals] = await Promise.all([
    readFile(new URL("web/index.html", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
    readFile(new URL("web/styles.css", root), "utf8"),
    readFile(new URL("web/task-goals.js", root), "utf8"),
  ]);
  assert.match(index, /按问题快速开始[\s\S]*你现在想解决什么[\s\S]*不会自动分析或处理图片/);
  assert.match(main, /renderTaskGoals[\s\S]*taskGoalEntries\(tasks\)[\s\S]*selectTask\(goal\.taskId\)/);
  assert.match(styles, /\.task-goal-navigator[\s\S]*\.task-goal-button/);
  assert.match(goals, /文件太大[\s\S]*格式不对[\s\S]*不想裁掉内容[\s\S]*文档或画面拍歪[\s\S]*需要去背景/);
});
