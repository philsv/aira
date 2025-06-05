export const en = {
  // Common UI elements
  common: {
    submit: "Submit",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    documents: "document(s)",
    question: "Question",
    answer: "Answer",
    time: "Time",
  },
  
  // Chat interface
  chat: {
    placeholder: "Ask aira about your documents ...",
    welcome: "How can I help?",
    welcomeSubtitle: "Transform your documents into new Insights.",
    welcomeDescription: "Ask aira about your documents ...",
    send: "Send message",
    thinking: "Let me think...",
    historyTitle: "Chat History",
    historyDescription: "View your previous conversations and AI responses",
  },
  
  // File upload
  fileUpload: {
    title: "Upload Files",
    description: "Upload PDF files to attach to your message",
    clickToBrowse: "Click to browse",
    dragAndDrop: "or drag and drop files here",
    pdfOnly: "Only PDF files are supported",
    uploadingFiles: "Uploading Files",
    availableFiles: "Available Files",
    loadingExisting: "Loading existing files...",
  },
  
  // Feedback modal
  feedback: {
    title: "Submit Feedback",
    description: "Help us improve by rating this response",
    yourQuestion: "Your Question",
    aiAnswer: "AI Answer", 
    yourFeedback: "Your Feedback",
    rating: "Rate this response",
    helpful: "Was this response helpful?",
    yesHelpful: "Yes, helpful",
    notHelpful: "Not helpful",
    submitting: "Submitting...",
    submitFeedback: "Submit Feedback",
    submittedSuccessfully: "Feedback submitted successfully!",
    submissionFailed: "Failed to submit feedback. Please try again."
  },
  
  // Delete confirmation
  deleteConfirmation: {
    title: "Delete File",
    description: "Are you sure you want to remove \"{fileName}\" from your attachments?",
  },
  
  // Command palette
  commands: {
    upload: "Upload Files",
    uploadDescription: "Upload PDF documents",
    feedback: "Submit Feedback",
    noPreviousMessagesNotification: "No previous conversation found for feedback.",
    feedbackDescription: "Submit feedback or suggestions",
  },
  
  // Error messages
  errors: {
    uploadFailed: "Failed to upload {fileName}: {error}",
    invalidFileType: "Only PDF files are allowed. Invalid files: {files}",
    loadDocumentsFailed: "Failed to load existing documents: {error}",
    deleteFailed: "Failed to delete file: {error}",
    feedbackFailed: "Failed to submit feedback. Please try again.",
    serverError: "Server returned invalid response format",
  },
  
  // Success messages
  success: {
    feedbackSubmitted: "Feedback submitted successfully",
    fileUploaded: "File uploaded successfully",
    fileDeleted: "File deleted successfully",
  },

  // Dialog
  dialog: {
    sources: "Sources",
    viewSources: "View the sources used to generate this response"
  },
}

export type TranslationKeys = typeof en