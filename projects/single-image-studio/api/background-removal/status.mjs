import {
  publicBackgroundRemovalStatus,
  sendNodeError,
  sendNodeJson,
  PublicBackgroundRemovalError,
} from "./_shared.mjs";

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      throw new PublicBackgroundRemovalError(405, "method_not_allowed", "该接口只支持 GET");
    }
    sendNodeJson(response, 200, publicBackgroundRemovalStatus(process.env));
  } catch (error) {
    sendNodeError(response, error);
  }
}
