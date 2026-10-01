import { useEffect, useState } from 'react'
import {
  ArrowUp,
  FileText,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import api from '../../services/api'

function Chat() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const suggestions = [
    {
      title: 'Leave Policy',
      description: 'How many annual leaves can I take?',
      icon: FileText,
    },
    {
      title: 'IT Access',
      description: 'How do I request system access?',
      icon: ShieldCheck,
    },
    {
      title: 'Travel Policy',
      description: 'What is the company travel policy?',
      icon: BookOpen,
    },
    {
      title: 'Expenses',
      description: 'How do I submit an expense claim?',
      icon: FileText,
    },
  ]

  useEffect(() => {
    const requestedSessionId = searchParams.get('session_id')

    if (!requestedSessionId) {
      setSessionId(null)
      setMessages([])
      return
    }

    const loadConversation = async () => {
      setIsLoadingHistory(true)

      try {
        const response = await api.get(
          `/api/chat/sessions/${requestedSessionId}`,
        )

        setSessionId(response.data.session.id)

        setMessages(
          response.data.messages.map((message) => ({
            role: message.role,
            content: message.content,
            sources: message.sources || [],
          })),
        )
      } catch (error) {
        setMessages([
          {
            role: 'assistant',
            content:
              'Sorry, I could not load this conversation.',
            sources: [],
            isError: true,
          },
        ])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadConversation()
  }, [searchParams])

  const sendMessage = async (messageText = input) => {
    const message = messageText.trim()

    if (!message || isLoading) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: 'user',
        content: message,
        sources: [],
      },
      {
        role: 'assistant',
        content: '',
        sources: [],
        isStreaming: true,
      },
    ])

    setInput('')
    setIsLoading(true)

    try {
      const accessToken = localStorage.getItem(
        'enterprise_ai_access_token',
      )

      const response = await fetch(
        'http://127.0.0.1:8000/api/chat/stream',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
          }),
        },
      )

      if (!response.ok) {
        let errorMessage =
          'Sorry, I could not process your request. Please try again.'

        try {
          const errorData = await response.json()

          if (errorData.detail) {
            errorMessage = errorData.detail
          }
        } catch (error) {
          // Keep default error message.
        }

        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error(
          'The server did not return a streaming response.',
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let streamedSessionId = sessionId
      let streamedSources = []

      const updateAssistantMessage = (
        content,
        sources = streamedSources,
        isStreaming = true,
      ) => {
        setMessages((currentMessages) => {
          const updatedMessages = [...currentMessages]

          for (
            let index = updatedMessages.length - 1;
            index >= 0;
            index -= 1
          ) {
            if (
              updatedMessages[index].role === 'assistant' &&
              updatedMessages[index].isStreaming
            ) {
              updatedMessages[index] = {
                ...updatedMessages[index],
                ...(content !== undefined
                  ? { content }
                  : {}),
                sources,
                isStreaming,
              }

              break
            }
          }

          return updatedMessages
        })
      }

      const appendAssistantContent = (content) => {
        setMessages((currentMessages) => {
          const updatedMessages = [...currentMessages]

          for (
            let index = updatedMessages.length - 1;
            index >= 0;
            index -= 1
          ) {
            if (
              updatedMessages[index].role === 'assistant' &&
              updatedMessages[index].isStreaming
            ) {
              updatedMessages[index] = {
                ...updatedMessages[index],
                content:
                  updatedMessages[index].content +
                  content,
              }

              break
            }
          }

          return updatedMessages
        })
      }

      const finishAssistantMessage = () => {
        setMessages((currentMessages) => {
          const updatedMessages = [...currentMessages]

          for (
            let index = updatedMessages.length - 1;
            index >= 0;
            index -= 1
          ) {
            if (
              updatedMessages[index].role === 'assistant' &&
              updatedMessages[index].isStreaming
            ) {
              updatedMessages[index] = {
                ...updatedMessages[index],
                sources: streamedSources,
                isStreaming: false,
              }

              break
            }
          }

          return updatedMessages
        })
      }

      const processEvent = (eventText) => {
        const lines = eventText.split('\n')

        let eventName = 'message'
        let dataText = ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line
              .slice(6)
              .trim()
          }

          if (line.startsWith('data:')) {
            dataText += line
              .slice(5)
              .trim()
          }
        }

        if (!dataText) {
          return
        }

        let data

        try {
          data = JSON.parse(dataText)
        } catch (error) {
          return
        }

        if (eventName === 'session') {
          streamedSessionId = data.session_id

          // IMPORTANT:
          // Do not navigate here.
          //
          // The assistant response is still streaming.
          // Navigating here would trigger the conversation-history
          // loader before the assistant message is saved.
          setSessionId(data.session_id)

          return
        }

        if (eventName === 'message') {
          appendAssistantContent(
            data.content || '',
          )

          return
        }

        if (eventName === 'sources') {
          streamedSources = data.sources || []

          updateAssistantMessage(
            undefined,
            streamedSources,
            true,
          )

          return
        }

        if (eventName === 'done') {
          streamedSessionId = data.session_id

          finishAssistantMessage()

          return
        }

        if (eventName === 'error') {
          throw new Error(
            data.message ||
              'The server encountered an error while generating the response.',
          )
        }
      }

      while (true) {
        const { value, done } =
          await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(
          value,
          {
            stream: true,
          },
        )

        const events = buffer.split(
          '\n\n',
        )

        buffer =
          events.pop() || ''

        for (const eventText of events) {
          processEvent(eventText)
        }
      }

      if (buffer.trim()) {
        processEvent(buffer)
      }

      /*
       * Only update the URL after streaming has completely
       * finished and the backend has saved the assistant
       * response.
       */
      if (!searchParams.get('session_id') && streamedSessionId) {
        navigate(
          `/chat?session_id=${streamedSessionId}`,
          {
            replace: true,
          },
        )
      }
    } catch (error) {
      const errorMessage =
        error.message ||
        'Sorry, I could not process your request. Please try again.'

      setMessages((currentMessages) => {
        const updatedMessages = [...currentMessages]

        for (
          let index = updatedMessages.length - 1;
          index >= 0;
          index -= 1
        ) {
          if (
            updatedMessages[index].role === 'assistant' &&
            updatedMessages[index].isStreaming
          ) {
            updatedMessages[index] = {
              ...updatedMessages[index],
              content: errorMessage,
              sources: [],
              isStreaming: false,
              isError: true,
            }

            break
          }
        }

        return updatedMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSessionId(null)

    navigate('/chat')
  }

  const getUniqueSources = (sources) => {
    const uniqueSources = []
    const seenDocuments = new Set()

    sources.forEach((source) => {
      const documentKey = `${source.document_id}-${source.title}-${source.version}`

      if (!seenDocuments.has(documentKey)) {
        seenDocuments.add(documentKey)
        uniqueSources.push(source)
      }
    })

    return uniqueSources
  }

  const showWelcome =
    messages.length === 0 &&
    !isLoadingHistory

  return (
    <div className="flex h-full flex-col">

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto px-6 py-10">

        <div className="mx-auto w-full max-w-4xl">

          {isLoadingHistory ? (
            <div className="flex min-h-full items-center justify-center">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Loading conversation...

              </div>

            </div>
          ) : showWelcome ? (
            <div className="flex min-h-full items-center justify-center">

              <div className="w-full">

                <div className="text-center">

                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <Sparkles size={26} />
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Good evening 👋
                  </h2>

                  <p className="mt-3 text-base text-slate-500">
                    Ask me anything about your company's policies,
                    procedures, and knowledge base.
                  </p>

                </div>

                <div className="mt-10">

                  <div className="mb-4 text-sm font-semibold text-slate-700">
                    Suggested Questions
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    {suggestions.map((suggestion) => {
                      const Icon = suggestion.icon

                      return (
                        <button
                          key={suggestion.title}
                          onClick={() =>
                            sendMessage(
                              suggestion.description,
                            )
                          }
                          disabled={isLoading}
                          className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        >

                          <div className="flex items-start gap-4">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                              <Icon size={20} />
                            </div>

                            <div className="min-w-0">

                              <div className="font-semibold text-slate-800">
                                {suggestion.title}
                              </div>

                              <div className="mt-1 text-sm text-slate-500">
                                {suggestion.description}
                              </div>

                            </div>

                          </div>

                        </button>
                      )
                    })}

                  </div>

                </div>

              </div>

            </div>
          ) : (
            <div className="space-y-6">

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === 'user'
                      ? 'flex justify-end'
                      : 'flex justify-start'
                  }
                >

                  <div
                    className={
                      message.role === 'user'
                        ? 'max-w-2xl rounded-2xl rounded-br-md bg-blue-600 px-5 py-3 text-sm leading-6 text-white shadow-sm'
                        : 'max-w-3xl rounded-2xl rounded-bl-md border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-700 shadow-sm'
                    }
                  >

                    <div className="whitespace-pre-wrap">
                      {message.content}

                      {message.isStreaming && (
                        <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-sm bg-blue-500 align-middle" />
                      )}
                    </div>

                    {message.role === 'assistant' &&
                      message.sources?.length > 0 && (
                        <div className="mt-4 border-t border-slate-200 pt-3">

                          <div className="mb-2 text-xs font-semibold text-slate-500">
                            Sources
                          </div>

                          <div className="space-y-2">

                            {getUniqueSources(
                              message.sources,
                            ).map((source) => (
                              <div
                                key={`${source.document_id}-${source.title}-${source.version}`}
                                className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500"
                              >

                                <FileText
                                  size={16}
                                  className="mt-0.5 shrink-0 text-blue-500"
                                />

                                <div>

                                  <div className="font-medium text-slate-700">
                                    {source.title}
                                  </div>

                                  <div className="mt-1">
                                    {source.department} ·{' '}
                                    {source.category} · Version{' '}
                                    {source.version}
                                  </div>

                                </div>

                              </div>
                            ))}

                          </div>

                        </div>
                      )}

                  </div>

                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">

                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">

                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                    <span>
                      AI is generating a response...
                    </span>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-6 py-5">

        <div className="mx-auto max-w-4xl">

          <form onSubmit={handleSubmit}>

            <div className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">

              <textarea
                rows="1"
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your company..."
                disabled={
                  isLoading ||
                  isLoadingHistory
                }
                className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  isLoading ||
                  isLoadingHistory
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Send message"
              >

                {isLoading ? (
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                ) : (
                  <ArrowUp size={19} />
                )}

              </button>

            </div>

          </form>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-400">

            <span>
              AI responses are based on your organization's knowledge base.
            </span>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Chat