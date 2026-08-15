/**
 * revdiff-plan-review plugin
 *
 * On session.idle, if the last assistant message was in plan mode (agent
 * "plan"), launches revdiff in a terminal overlay so the user can annotate
 * the plan. Any annotations are injected back as a user message so the AI
 *
 * Requires launch-plan-review.sh in ~/.config/opencode/plugins/ and revdiff
 * on $PATH. Supports tmux, herdr, kitty, wezterm, cmux, ghostty, iTerm2, emacs.
 */
import type { Plugin } from "@mimo-ai/plugin";
import path from "path";
import os from "os";
import fs from "fs/promises";

const LAUNCHER = path.join(
  path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)),
  "launch-plan-review.sh",
);
const EXIT_CODE_ANNOTATIONS = 10;

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function isInstalled(bin: string): Promise<boolean> {
  const p = await Bun.$`which ${bin}`.text().catch((e) => {
    console.error(`revdiff-plan-review: failed to check for ${bin}:`, e);
    return "";
  });
  return p.trim().length > 0;
}

async function getLastPlanContent(
  client: any,
  sessionID: string,
): Promise<string | null> {
  const resp = await client.session.messages({ sessionID });
  const messages = resp.data ?? [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const { info, parts } = messages[i];
    if (info.role !== "assistant") continue;
    if (info.agent !== "plan") continue;

    return parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n");
  }

  return null;
}

async function launchReview(planFile: string): Promise<string> {
  try {
    const result = await Bun.$`bash ${LAUNCHER} ${planFile}`.quiet().nothrow();
    const stdout = new TextDecoder().decode(result.stdout).trim();
    if (isRevdiffSuccess(result.exitCode)) {
      return stdout;
    }

    const stderr = new TextDecoder().decode(result.stderr).trim();
    console.error(
      stderr || `revdiff-plan-review: launcher exited with code ${result.exitCode}`,
    );
    return "";
  } catch (e) {
    console.error("revdiff-plan-review: failed to launch review:", e);
    return "";
  }
}

function isRevdiffSuccess(exitCode: number): boolean {
  return exitCode === 0 || exitCode === EXIT_CODE_ANNOTATIONS;
}

async function injectAnnotations(
  client: any,
  sessionID: string,
  annotations: string,
): Promise<void> {
  await client.session.prompt({
    sessionID,
    agent: "plan",
    parts: [
      {
        type: "text",
        text: `I reviewed the plan and added annotations. Please revise the plan to address each one:\n\n${annotations}`,
      },
    ],
  });
}

export const server: Plugin = async ({ client }) => ({
  event: async ({ event }) => {
    if (event.type !== "session.idle") return;

    const { sessionID } = event.properties;
    if (!sessionID) return;

    if (!(await isExecutable(LAUNCHER))) return;
    if (!(await isInstalled("revdiff"))) return;

    let planContent: string | null;
    try {
      planContent = await getLastPlanContent(client, sessionID);
    } catch (e) {
      console.error("revdiff-plan-review: failed to get plan content:", e);
      return;
    }
    if (!planContent?.trim()) return;

    const safeID = sessionID.replace(/[^A-Za-z0-9._-]/g, "_");
    const planFile = path.join(os.tmpdir(), `revdiff-plan-${safeID}.md`);
    try {
      await Bun.write(planFile, planContent);
    } catch (e) {
      console.error("revdiff-plan-review: failed to write plan file:", e);
      return;
    }

    let annotations: string;
    try {
      annotations = await launchReview(planFile);
    } finally {
      await fs.unlink(planFile).catch(() => {});
    }

    if (!annotations) return;

    try {
      await injectAnnotations(client, sessionID, annotations);
    } catch (e) {
      console.error("revdiff-plan-review: failed to inject annotations:", e);
    }
  },
});
