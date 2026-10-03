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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const category = (formData.get('category') as DocumentType) || 'Other';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files were selected for upload. Please select a file to continue.' },
        { status: 400 }
      );
    }

    const processed = [];
    const errors: string[] = [];
    const allFeedback: string[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await documentProcessor.processUpload(
          file.name,
          buffer,
          file.type,
          category !== 'Other' ? category : undefined
        );

        processed.push(result);
        if (result.feedback && result.feedback.length > 0) {
          allFeedback.push(...result.feedback);
        }
      } catch (fileErr: any) {
        console.error(`Error processing file ${file.name}:`, fileErr);
        errors.push(fileErr.message || `Failed to process ${file.name}`);
      }
    }

    if (processed.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors[0],
          errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      count: processed.length,
      documents: processed.map((p) => p.document),
      feedback: allFeedback,
      results: processed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Document upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while processing your upload.',
      },
      { status: 500 }
    );
  }
}
