const JPEG_TYPES = new Set(["image/jpeg", "image/jpg"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const PDF_TYPE = "application/pdf";

export async function prepareGuestIdUpload(file: File): Promise<{
  buffer: Buffer;
  contentType: string;
  extension: string;
}> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("ID file must be 10 MB or smaller");
  }

  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const isHeic =
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  const input = Buffer.from(await file.arrayBuffer());

  if (isHeic) {
    try {
      const convert = (await import("heic-convert")).default as (opts: {
        buffer: Buffer;
        format: "JPEG" | "PNG";
        quality?: number;
      }) => Promise<ArrayBuffer>;
      const jpeg = await convert({ buffer: input, format: "JPEG", quality: 0.86 });
      return { buffer: Buffer.from(jpeg), contentType: "image/jpeg", extension: "jpg" };
    } catch {
      throw new Error("Could not read that iPhone photo. Please send a JPEG or PDF.");
    }
  }

  if (type === PDF_TYPE || name.endsWith(".pdf")) {
    return { buffer: input, contentType: PDF_TYPE, extension: "pdf" };
  }

  if (JPEG_TYPES.has(type) || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return { buffer: input, contentType: "image/jpeg", extension: "jpg" };
  }

  if (type === "image/png" || name.endsWith(".png")) {
    return { buffer: input, contentType: "image/png", extension: "png" };
  }

  if (type === "image/webp" || name.endsWith(".webp")) {
    return { buffer: input, contentType: "image/webp", extension: "webp" };
  }

  if (IMAGE_TYPES.has(type)) {
    const extension = type.split("/")[1] ?? "jpg";
    return { buffer: input, contentType: type, extension };
  }

  throw new Error("Please upload a JPEG, PNG, WebP, or PDF of your ID");
}
