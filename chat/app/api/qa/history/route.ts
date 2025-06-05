import { NextRequest, NextResponse } from 'next/server';

interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  document_ids: string[];
  confidence_score: number;
  feedback_rating?: number;
}

interface QAHistoryResponse {
  history: QAHistoryItem[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';

    const apiUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/qa/history?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: QAHistoryResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching QA history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QA history' },
      { status: 500 }
    );
  }
}