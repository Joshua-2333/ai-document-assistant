// client/src/components/DocumentChat.jsx

import { useEffect, useRef, useState } from "react";
import { askDocumentQuestion } from "../services/documentService";

function DocumentChat({ selectedDocument, originalName }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Track requests to avoid displaying outdated answers
  const latestRequestId = useRef(0);

  useEffect(() => {
    return () => {
      latestRequestId.current += 1;
    };
  }, [selectedDocument]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedDocument || !question.trim() || loading) {
      return;
    }

    const requestId = ++latestRequestId.current;
    const currentQuestion = question.trim();

    // Capture previous messages before adding the new question
    // Limit history to the last 20 messages
    const conversationHistory = messages.slice(-20);

    setLoading(true);
    setError("");
    setQuestion("");

    // Add the user's question to conversation history
    setMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        content: currentQuestion,
      },
    ]);

    try {
      // Send the question and previous messages to Qwen3
      const response = await askDocumentQuestion(
        selectedDocument,
        currentQuestion,
        conversationHistory
      );

      if (requestId !== latestRequestId.current) {
        return;
      }

      // Add Qwen3's answer to conversation history
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content: response,
        },
      ]);
    } catch (err) {
      if (requestId !== latestRequestId.current) {
        return;
      }

      setError(err.message);

      // Remove the unanswered question from conversation history
      setMessages((previousMessages) =>
        previousMessages.slice(0, -1)
      );
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }

  if (!selectedDocument) {
    return null;
  }

  return (
    <section
      className="document-chat-section"
      aria-labelledby="document-chat-heading"
    >
      <h2 id="document-chat-heading">
        Ask AI About This Document
      </h2>

      <p className="document-chat-selected">
        Selected document:{" "}
        <strong>{originalName || selectedDocument}</strong>
      </p>

      <form
        className="document-chat-form"
        onSubmit={handleSubmit}
      >
        <label htmlFor="document-question">
          Ask a question about this document
        </label>

        <textarea
          id="document-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What is this document about?"
          rows={3}
        />

        <button
          type="submit"
          disabled={loading || !question.trim()}
        >
          {loading ? "Generating answer..." : "Ask AI"}
        </button>
      </form>

      {loading && (
        <p role="status">Qwen3 is generating an answer...</p>
      )}

      {error && <p role="alert">{error}</p>}

      {messages.length > 0 && (
        <div
          className="document-chat-history"
          aria-live="polite"
        >
          <h3>Conversation History</h3>

          <ol className="chat-messages">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <li
                  key={index}
                  className={`chat-message ${
                    isUser
                      ? "chat-message-user"
                      : "chat-message-assistant"
                  }`}
                >
                  <div className="chat-message-bubble">
                    <strong className="chat-message-sender">
                      {isUser ? "You" : "Qwen3"}
                    </strong>

                    <span className="chat-message-content">
                      {message.content}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

export default DocumentChat;
