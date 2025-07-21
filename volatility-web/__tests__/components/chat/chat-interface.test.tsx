import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatInterface } from '@/components/bloomberg/views/chat/chat-interface'
import { chatAPI } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  chatAPI: {
    sendMessage: jest.fn(),
    getSuggestions: jest.fn(),
  },
}))

const mockChatAPI = chatAPI as jest.Mocked<typeof chatAPI>

describe('ChatInterface', () => {
  let queryClient: QueryClient
  const mockSetMessages = jest.fn()
  const mockOnSendMessage = jest.fn()
  const mockOnSuggestionClick = jest.fn()

  const defaultMessages = [
    {
      id: '1',
      role: 'system' as const,
      content: 'Welcome to the chat!',
      timestamp: new Date(),
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ChatInterface
          messages={defaultMessages}
          onSendMessage={mockOnSendMessage}
          setMessages={mockSetMessages}
          onSuggestionClick={mockOnSuggestionClick}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  test('renders chat interface with initial message', () => {
    renderComponent()
    
    expect(screen.getByText('Welcome to the chat!')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  test('displays input field and submit button', () => {
    renderComponent()
    
    expect(screen.getByPlaceholderText(/ask about your portfolio/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  test('sends message on form submission', async () => {
    const user = userEvent.setup()
    mockChatAPI.sendMessage.mockResolvedValueOnce({
      response: 'Test response',
      timestamp: new Date().toISOString(),
    })

    renderComponent()
    
    const input = screen.getByPlaceholderText(/ask about your portfolio/i)
    const submitButton = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'What is my P&L?')
    await user.click(submitButton)

    expect(mockOnSendMessage).toHaveBeenCalledWith('What is my P&L?')
    expect(mockChatAPI.sendMessage).toHaveBeenCalledWith('What is my P&L?')
  })

  test('clears input after sending message', async () => {
    const user = userEvent.setup()
    mockChatAPI.sendMessage.mockResolvedValueOnce({
      response: 'Test response',
      timestamp: new Date().toISOString(),
    })

    renderComponent()
    
    const input = screen.getByPlaceholderText(/ask about your portfolio/i) as HTMLInputElement
    
    await user.type(input, 'Test message')
    expect(input.value).toBe('Test message')

    await user.click(screen.getByRole('button', { name: /send/i }))
    
    expect(input.value).toBe('')
  })

  test('shows loading state while sending message', async () => {
    const user = userEvent.setup()
    mockChatAPI.sendMessage.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        response: 'Test response',
        timestamp: new Date().toISOString(),
      }), 100))
    )

    renderComponent()
    
    const input = screen.getByPlaceholderText(/ask about your portfolio/i)
    await user.type(input, 'Test message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByText('AI is thinking...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument()
    })
  })

  test('displays error message on API failure', async () => {
    const user = userEvent.setup()
    mockChatAPI.sendMessage.mockRejectedValueOnce(new Error('API Error'))

    renderComponent()
    
    const input = screen.getByPlaceholderText(/ask about your portfolio/i)
    await user.type(input, 'Test message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(mockSetMessages).toHaveBeenCalledWith(expect.any(Function))
      const setMessagesCall = mockSetMessages.mock.calls[0][0]
      const newMessages = setMessagesCall([])
      expect(newMessages[0].content).toContain('Error: API Error')
      expect(newMessages[0].role).toBe('system')
    })
  })

  test('displays suggestions when there is only one message', () => {
    renderComponent()
    
    expect(screen.getByText("What's my current portfolio performance?")).toBeInTheDocument()
    expect(screen.getByText("Show me my positions with highest volatility")).toBeInTheDocument()
    expect(screen.getByText("Analyze my risk exposure")).toBeInTheDocument()
    expect(screen.getByText("What are my top performing trades today?")).toBeInTheDocument()
  })

  test('hides suggestions when there are multiple messages', () => {
    const messages = [
      ...defaultMessages,
      {
        id: '2',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      },
    ]
    
    renderComponent({ messages })
    
    expect(screen.queryByText("What's my current portfolio performance?")).not.toBeInTheDocument()
  })

  test('calls onSuggestionClick when suggestion is clicked', async () => {
    const user = userEvent.setup()
    renderComponent()
    
    await user.click(screen.getByText("What's my current portfolio performance?"))
    
    expect(mockOnSuggestionClick).toHaveBeenCalledWith("What's my current portfolio performance?")
  })

  test('clears chat history when clear button is clicked', async () => {
    const user = userEvent.setup()
    renderComponent()
    
    await user.click(screen.getByText('Clear history'))
    
    expect(mockSetMessages).toHaveBeenCalledWith(expect.any(Function))
    const setMessagesCall = mockSetMessages.mock.calls[0][0]
    const newMessages = setMessagesCall([])
    expect(newMessages).toHaveLength(1)
    expect(newMessages[0].content).toBe('Chat history cleared. How can I help you analyze your portfolio?')
  })

  test('disables input and button while message is being sent', async () => {
    const user = userEvent.setup()
    mockChatAPI.sendMessage.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        response: 'Test response',
        timestamp: new Date().toISOString(),
      }), 100))
    )

    renderComponent()
    
    const input = screen.getByPlaceholderText(/ask about your portfolio/i)
    const button = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test message')
    await user.click(button)

    expect(input).toBeDisabled()
    expect(button).toBeDisabled()
    
    await waitFor(() => {
      expect(input).not.toBeDisabled()
      expect(button).not.toBeDisabled()
    })
  })

  test('prevents empty message submission', async () => {
    const user = userEvent.setup()
    renderComponent()
    
    const button = screen.getByRole('button', { name: /send/i })
    await user.click(button)

    expect(mockOnSendMessage).not.toHaveBeenCalled()
    expect(mockChatAPI.sendMessage).not.toHaveBeenCalled()
  })

  test('scrolls to bottom when new messages are added', async () => {
    const scrollIntoViewMock = jest.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    const { rerender } = renderComponent()
    
    const newMessages = [
      ...defaultMessages,
      {
        id: '2',
        role: 'user' as const,
        content: 'New message',
        timestamp: new Date(),
      },
    ]

    rerender(
      <QueryClientProvider client={queryClient}>
        <ChatInterface
          messages={newMessages}
          onSendMessage={mockOnSendMessage}
          setMessages={mockSetMessages}
          onSuggestionClick={mockOnSuggestionClick}
        />
      </QueryClientProvider>
    )

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  test('displays Claude version info', () => {
    renderComponent()
    
    expect(screen.getByText(/Powered by Claude 3.5/)).toBeInTheDocument()
    expect(screen.getByText(/Context-aware analysis/)).toBeInTheDocument()
  })
})