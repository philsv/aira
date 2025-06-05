import type { TranslationKeys } from './en'

export const de: TranslationKeys = {
  // Common UI elements
  common: {
    submit: "Absenden",
    cancel: "Abbrechen",
    close: "Schließen",
    delete: "Löschen",
    loading: "Lädt...",
    error: "Fehler",
    success: "Erfolgreich",
    documents: "Dokument(e)",
    question: "Frage",
    answer: "Antwort",
    time: "Zeit",
  },
  
  // Chat interface
  chat: {
    placeholder: "Frage aira zu deinen Dokumenten ...",
    welcome: "Wie kann ich helfen?",
    welcomeSubtitle: "Verwandeln Sie Ihre Dokumente in neue Erkenntnisse.",
    welcomeDescription: "Frage aira zu deinen Dokumenten ...",
    send: "Nachricht senden",
    thinking: "Hmm mal sehen...",
    historyTitle: "Chatverlauf",
    historyDescription: "Sehen Sie sich Ihre vorherigen Gespräche und KI-Antworten an",
    noChatHistory: "Noch kein Chatverlauf",
    noChatHistoryDescription: "Starten Sie ein Gespräch, um Ihren Chatverlauf hier zu sehen",
  },
  
  // File upload
  fileUpload: {
    title: "Dateien hochladen",
    description: "Laden Sie PDF-Dateien hoch, um sie an Ihre Nachricht anzuhängen",
    clickToBrowse: "Klicken Sie zum Durchsuchen",
    dragAndDrop: "oder ziehen Sie Dateien hierher",
    pdfOnly: "Nur PDF-Dateien werden unterstützt",
    uploadingFiles: "Dateien werden hochgeladen",
    availableFiles: "Verfügbare Dateien",
    loadingExisting: "Vorhandene Dateien werden geladen...",
  },
  
  // Feedback modal
  feedback: {
    title: "Feedback abgeben",
    description: "Helfen Sie uns, uns zu verbessern, indem Sie diese Antwort bewerten",
    yourQuestion: "Ihre Frage",
    aiAnswer: "KI-Antwort",
    yourFeedback: "Ihr Feedback (optional)", 
    rating: "Bewerten Sie diese Antwort",
    helpful: "War diese Antwort hilfreich?",
    yesHelpful: "Ja, hilfreich",
    notHelpful: "Nicht hilfreich",
    submitting: "Wird übermittelt...",
    submitFeedback: "Feedback abgeben",
    submittedSuccessfully: "Feedback erfolgreich übermittelt!",
    submissionFailed: "Fehler beim Übermitteln des Feedbacks. Bitte versuchen Sie es erneut."
  },
  
  // Delete confirmation
  deleteConfirmation: {
    title: "Datei löschen",
    description: "Sind Sie sicher, dass Sie \"{fileName}\" aus Ihren Anhängen entfernen möchten?",
  },
  
  // Command palette
  commands: {
    upload: "Dateien hochladen",
    uploadDescription: "PDF-Dokumente hochladen",
    feedback: "Feedback abgeben",
    noPreviousMessagesNotification: "Keine vorherige Konversation für Feedback gefunden.",
    feedbackDescription: "Feedback oder Vorschläge abgeben",
  },
  
  // Error messages
  errors: {
    uploadFailed: "Hochladen von {fileName} fehlgeschlagen: {error}",
    invalidFileType: "Nur PDF-Dateien sind erlaubt. Ungültige Dateien: {files}",
    loadDocumentsFailed: "Laden vorhandener Dokumente fehlgeschlagen: {error}",
    deleteFailed: "Löschen der Datei fehlgeschlagen: {error}",
    feedbackFailed: "Feedback konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
    serverError: "Server hat ungültiges Antwortformat zurückgegeben",
  },
  
  // Success messages
  success: {
    feedbackSubmitted: "Feedback erfolgreich gesendet",
    fileUploaded: "Datei erfolgreich hochgeladen",
    fileDeleted: "Datei erfolgreich gelöscht",
  },

  // Dialog
  dialog: {
    sources: "Quellen",
    viewSources: "Zeigen Sie die Quellen an, die zur Generierung dieser Antwort verwendet wurden"
  }
}