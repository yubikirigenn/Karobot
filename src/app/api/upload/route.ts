import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'bot_media');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename preserving extension
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    await fs.writeFile(filepath, buffer);

    // Return the URL path
    const url = `/uploads/bot_media/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
