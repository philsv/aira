import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

interface FeedbackData {
  question: string
  answer: string
  comment?: string  // Optional Comment
  rating: number
  helpful: boolean
  timestamp: string
  session_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, answer, comment, rating, helpful, session_id }: FeedbackData = body

    // Validate required fields
    if (!question || !answer || !comment || rating === undefined || helpful === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Create feedback object with timestamp
    const feedbackData: FeedbackData = {
      question,
      answer,
      comment,
      rating,
      helpful,
      timestamp: new Date().toISOString(),
      session_id,
    }

    // Send feedback to backend
    const response = await fetch(`${BACKEND_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...feedbackData,
        is_helpful: feedbackData.helpful,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { error: 'Failed to submit feedback', details: errorText }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}