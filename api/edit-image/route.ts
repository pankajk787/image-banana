import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const {imagebase64, prompt } = request.json();
    return NextResponse.json({ message: "OK" })
}