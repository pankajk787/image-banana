import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const { imageBase64, prompt } = await request.json();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.responses.create({
    model: "gpt-5.4",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          {
            type: "input_image",
            image_url: imageBase64,
            detail: "auto",
          },
        ],
      },
    ],
    tools: [{ type: "image_generation" }],
  });

  const imageData = response.output
    .filter((output) => output.type === "image_generation_call")
    .map((output) => output.result);

  if (imageData.length > 0) {
    const imageBase64 = imageData[0];
    return NextResponse.json({ result: `data:image/png;base64,${imageBase64}` });
    // fs.writeFileSync("gift-basket.png", Buffer.from(imageBase64, "base64"));
  } else {
    console.log(response.output.content);
  }

  return NextResponse.json({ message: "Failed to generate image" });
}
