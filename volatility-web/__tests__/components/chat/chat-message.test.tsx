import React from 'react'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '@/components/bloomberg/views/chat/chat-message'

// Mock the FormattedTime component
jest.mock('@/components/ui/formatted-time', () => ({
  FormattedTime: ({ timestamp, format }: any) => (
    <span>{new Date(timestamp).toLocaleTimeString()}</span>
  ),
}))

describe('ChatMessage', () => {
  const mockDate = new Date('2024-01-15T10:30:00')

  test('renders user message correctly', () => {
    const message = {
      role: 'user' as const,
      content: 'What is my portfolio value?',
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('What is my portfolio value?')).toBeInTheDocument()
    expect(screen.getByText(mockDate.toLocaleTimeString())).toBeInTheDocument()
  })

  test('renders assistant message with markdown', () => {
    const message = {
      role: 'assistant' as const,
      content: '**Your portfolio value** is $100,000',
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('Assistant')).toBeInTheDocument()
    expect(screen.getByText('Your portfolio value')).toBeInTheDocument()
    expect(screen.getByText(/is \$100,000/)).toBeInTheDocument()
  })

  test('renders system message with italic style', () => {
    const message = {
      role: 'system' as const,
      content: 'Chat history cleared',
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('System')).toBeInTheDocument()
    const content = screen.getByText('Chat history cleared')
    expect(content.parentElement).toHaveClass('italic')
  })

  test('renders code blocks with proper formatting', () => {
    const message = {
      role: 'assistant' as const,
      content: 'Here is the SQL query:\n```sql\nSELECT * FROM positions\n```',
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    const codeBlock = screen.getByText('SELECT * FROM positions')
    expect(codeBlock).toBeInTheDocument()
    expect(codeBlock.closest('pre')).toHaveClass('bg-gray-50', 'border', 'border-gray-200')
  })

  test('renders inline code with proper formatting', () => {
    const message = {
      role: 'assistant' as const,
      content: 'Use the `positions` table to query your data',
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    const inlineCode = screen.getByText('positions')
    expect(inlineCode.tagName).toBe('CODE')
    expect(inlineCode).toHaveClass('bg-gray-100', 'px-1', 'py-0.5', 'rounded')
  })

  test('renders lists correctly', () => {
    const message = {
      role: 'assistant' as const,
      content: `Your top positions:
- BTC Call Option
- ETH Put Option
- SOL Future`,
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('Your top positions:')).toBeInTheDocument()
    expect(screen.getByText('BTC Call Option')).toBeInTheDocument()
    expect(screen.getByText('ETH Put Option')).toBeInTheDocument()
    expect(screen.getByText('SOL Future')).toBeInTheDocument()
  })

  test('renders tables correctly', () => {
    const message = {
      role: 'assistant' as const,
      content: `| Position | P&L |
|----------|-----|
| BTC-CALL | $1000 |
| ETH-PUT | -$500 |`,
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('Position')).toBeInTheDocument()
    expect(screen.getByText('P&L')).toBeInTheDocument()
    expect(screen.getByText('BTC-CALL')).toBeInTheDocument()
    expect(screen.getByText('$1000')).toBeInTheDocument()
    expect(screen.getByText('ETH-PUT')).toBeInTheDocument()
    expect(screen.getByText('-$500')).toBeInTheDocument()
  })

  test('handles multi-line content', () => {
    const message = {
      role: 'user' as const,
      content: `Line 1
Line 2
Line 3`,
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    const content = screen.getByText(/Line 1.*Line 2.*Line 3/s)
    expect(content).toHaveClass('whitespace-pre-wrap')
  })

  test('renders headings in markdown', () => {
    const message = {
      role: 'assistant' as const,
      content: '### Portfolio Summary\nYour total value is $100,000',
      timestamp: mockDate,
    }

    render(<ChatMessage message={message} />)

    const heading = screen.getByText('Portfolio Summary')
    expect(heading.tagName).toBe('H3')
    expect(heading).toHaveClass('font-medium', 'text-gray-900')
  })

  test('message content width is limited', () => {
    const message = {
      role: 'user' as const,
      content: 'Test message',
      timestamp: mockDate,
    }

    const { container } = render(<ChatMessage message={message} />)

    const messageContainer = container.querySelector('.max-w-\\[85\\%\\]')
    expect(messageContainer).toBeInTheDocument()
  })
})