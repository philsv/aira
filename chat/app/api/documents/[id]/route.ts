import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('DELETE /api/documents/[id] route called')
  console.log('Document ID:', params.id)
  console.log('Backend URL:', BACKEND_URL)
  
  try {
    const { id } = params
    
    if (!id) {
      console.error('No document ID provided')
      return NextResponse.json(
        { error: 'Document ID is required' }, 
        { status: 400 }
      )
    }

    const backendUrl = `${BACKEND_URL}/documents/${id}`
    console.log('Making DELETE request to:', backendUrl)
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Backend response status:', response.status)
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      return NextResponse.json(
        { error: 'Failed to delete document', details: errorText }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Backend success response:', data)
    return NextResponse.json(data)

  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}