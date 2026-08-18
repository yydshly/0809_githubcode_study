import {
  executePublicBackgroundRemoval,
  PublicBackgroundRemovalError,
  readNodeJsonBody,
  sendNodeError,
  sendNodeJson,
} from "./_shared.mjs";

export const config = Object.freeze({ maxDuration: 30 });

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      throw new PublicBackgroundRemovalError(405, "method_not_allowed", "该接口只支持 POST");
    }
    const run = await executePublicBackgroundRemoval({
      payload: await readNodeJsonBody(request),
      accessToken: request.headers?.["x-background-removal-access"],
      env: process.env,
    });
    sendNodeJson(response, 200, { run, reused: false }, {
      Location: `/api/background-removal/runs/${run.id}`,
    });
  } catch (error) {
    sendNodeError(response, error);
  }
}
