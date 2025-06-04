import { type NextRequest, NextResponse } from "next/server"

interface FeedbackData {
  question: string
  answer: string
  comment: string
  rating: number
  helpful: boolean
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, answer, comment, rating, helpful }: FeedbackData = body

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
    }

    // In a real application, you would save this to a database
    // For now, we'll just log it and return success
    console.log("Feedback received:", feedbackData)

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json(
      {
        success: true,
        message: "Feedback submitted successfully",
        id: `feedback_${Date.now()}`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error processing feedback:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}