import { NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";

async function uploadBufferAsFile(buffer: Buffer, filename: string): Promise<string> {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  const file = new File([arrayBuffer], filename, { type: "image/png" });
  const uploaded = await openai.files.create({ file, purpose: "vision" });
  return uploaded.id;
}

async function uploadBase64AsFile(base64: string, filename: string): Promise<string> {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  return uploadBufferAsFile(buffer, filename);
}

// Parse "16:9" → { w: 16, h: 9 }
function parseRatio(aspectRatio: string) {
  const [w, h] = aspectRatio.split(":").map(Number);
  return { w, h };
}

// Build expanded canvas + mask buffers using Sharp
async function buildExpansionAssets(
  inputBuffer: Buffer,
  aspectRatio: string
): Promise<{ expandedBuffer: Buffer; maskBuffer: Buffer }> {
  const { width: origW, height: origH } = await sharp(inputBuffer).metadata();
  const { w: ratioW, h: ratioH } = parseRatio(aspectRatio);

  // Determine canvas size — fit within 1536x1536
  const MAX = 1536;
  const scaleW = MAX / ratioW;
  const canvasW = Math.round(ratioW * scaleW);
  const canvasH = Math.round(ratioH * scaleW);

  // Scale original to 75% of canvas, preserving its aspect ratio
  const imgScale = Math.min(canvasW / origW!, canvasH / origH!) * 0.75;
  const scaledW = Math.round(origW! * imgScale);
  const scaledH = Math.round(origH! * imgScale);

  // Center offset
  const offsetX = Math.round((canvasW - scaledW) / 2);
  const offsetY = Math.round((canvasH - scaledH) / 2);

  const resizedOriginal = await sharp(inputBuffer)
    .resize(scaledW, scaledH, { fit: "fill" })
    .png()
    .toBuffer();

  // 1. Expanded image: original centered on white canvas
  const expandedBuffer = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 } },
  })
    .composite([{ input: resizedOriginal, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  // 2. Mask: white canvas, black rectangle where original sits
  const blackRect = await sharp({
    create: { width: scaledW, height: scaledH, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 } },
  })
    .png()
    .toBuffer();

  const maskBuffer = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 } },
  })
    .composite([{ input: blackRect, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  return { expandedBuffer, maskBuffer };
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const { imageBase64, prompt, userFiles, aspectRatio, maskBase64 } = await request.json();

  let imageFileId: string;
  let maskFileId: string | undefined;

  if (aspectRatio) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const inputBuffer = Buffer.from(base64Data, "base64");

    const { expandedBuffer, maskBuffer } = await buildExpansionAssets(
      inputBuffer,
      aspectRatio
    );

    // Upload both in parallel
    [imageFileId, maskFileId] = await Promise.all([
      uploadBufferAsFile(expandedBuffer, "expanded.png"),
      uploadBufferAsFile(maskBuffer, "mask.png"),
    ]);

  // ── Brush/selection mode: mask comes from client ────────────────────
  } else if (maskBase64) {
    [imageFileId, maskFileId] = await Promise.all([
      uploadBase64AsFile(imageBase64, "image.png"),
      uploadBase64AsFile(maskBase64, "mask.png"),
    ]);

  // ── Default: generateEdit / applyFilter ────────────────────────────
  } else {
    imageFileId = await uploadBase64AsFile(imageBase64, "image.png");
  }

  const referenceImages =
    userFiles && Array.isArray(userFiles) && userFiles.length
      ? userFiles.map((file: { url: string }) => ({
          type: "input_image" as const,
          image_url: file.url,
          detail: "auto" as const,
        }))
      : [];

  // ── Tool config ─────────────────────────────────────────────────────
  const imageGenTool: { type: "image_generation", quality: "high"} = {
    type: "image_generation",
    quality: "high",
    ...(maskFileId && { input_image_mask: { file_id: maskFileId } }),
  };

  const response = await openai.responses.create({
    model: "gpt-5.4",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", file_id: imageFileId, detail: "auto" },
          ...referenceImages,
        ],
      },
    ],
    tools: [imageGenTool],
  });

  const imageData = response.output
    .filter((output) => output.type === "image_generation_call")
    .map((output) => output.result);

  if (imageData.length > 0) {
    const imageBase64 = imageData[0];
    return NextResponse.json({ result: `data:image/png;base64,${imageBase64}` });
    // fs.writeFileSync("gift-basket.png", Buffer.from(imageBase64, "base64"));
  } else {
    console.log((response.output as unknown as { content: string }).content );
  }

  return NextResponse.json({ message: "Failed to generate image" });
}
