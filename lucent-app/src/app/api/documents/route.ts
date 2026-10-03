// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { documentRepo } from '@/lib/db/repositories';
import { documentProcessor } from '@/services/document-processor';
import { DocumentType } from '@/lib/models/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docs = documentRepo.getAll();
    return NextResponse.json({ success: true, documents: docs });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const category = (formData.get('category') as DocumentType) || 'Other';

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 });
    }

    const processed = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const docType = category !== 'Other' ? category : documentProcessor.detectDocumentType(file.name);

      // Create record
      const doc = await documentRepo.create({
        userId: 'user_1',
        courseId: 'c_ds',
        name: file.name,
        type: docType,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        status: 'Processing',
      });

      // Ingest and extract in background or sync
      const result = await documentProcessor.processDocument(
        doc.id,
        buffer,
        file.name,
        docType
      );

      processed.push(result);
    }

    return NextResponse.json({
      success: true,
      count: processed.length,
      documents: processed.map((p) => p.document),
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
