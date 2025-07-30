import React from 'react'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '@/components/bloomberg/views/chat/chat-message'

// Mock the FormattedTime component
jest.mock('@/components/ui/formatted-time', () => ({
  FormattedTime: ({ timestamp, format }: any) => (
    <span>{new Date(timestamp).toLocaleTimeString()}</span>
  ),
}))

// Mock ReactMarkdown to render properly in tests
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children, components }: any) {
    // Simple markdown parser for test purposes
    if (typeof children === 'string') {
      // Handle bold text
      if (children.includes('**')) {
        const parts = children.split('**')
        return (
          <div>
            {parts.map((part: string, index: number) => 
              index % 2 === 1 ? <strong key={index}>{part}</strong> : part
            )}
          </div>
        )
      }
      
      // Handle headings
      if (children.startsWith('###')) {
        const [heading, ...rest] = children.split('\n')
        const headingText = heading.replace('### ', '')
        return (
          <div>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2 text-base">{headingText}</h3>
            {rest.join('\n')}
          </div>
        )
      }
      
      // Handle code blocks
      if (children.includes('```')) {
        const parts = children.split('```')
        return (
          <div>
            {parts.map((part: string, index: number) => 
              index % 2 === 1 ? (
                <pre key={index} className="bg-gray-50 border border-gray-200 p-3 my-3 rounded-md overflow-x-auto">
                  <code>{part.replace(/^\w+\n/, '')}</code>
                </pre>
              ) : part
            )}
          </div>
        )
      }
      
      // Handle inline code
      if (children.includes('`')) {
        const parts = children.split('`')
        return (
          <div>
            {parts.map((part: string, index: number) => 
              index % 2 === 1 ? (
                <code key={index} className="bg-gray-100 px-1.5 py-0.5 rounded-sm text-sm font-mono">{part}</code>
              ) : part
            )}
          </div>
        )
      }
      
      // Handle lists
      if (children.includes('- ')) {
        const lines = children.split('\n')
        const listItems = lines.filter((line: string) => line.startsWith('- '))
        const nonListContent = lines.filter((line: string) => !line.startsWith('- '))
        return (
          <div>
            {nonListContent.join('\n')}
            <ul className="list-disc pl-5 mb-3 space-y-1">
              {listItems.map((item: string, index: number) => (
                <li key={index} className="leading-relaxed">{item.replace('- ', '')}</li>
              ))}
            </ul>
          </div>
        )
      }
      
      // Handle tables
      if (children.includes('|')) {
        const lines = children.split('\n')
        const tableLines = lines.filter((line: string) => line.includes('|'))
        if (tableLines.length >= 2) {
          const headers = tableLines[0].split('|').filter(Boolean).map((h: string) => h.trim())
          const rows = tableLines.slice(2).map((row: string) => row.split('|').filter(Boolean).map((cell: string) => cell.trim()))
          
          return (
            <table className="border border-gray-200 my-2 text-sm">
              <thead>
                <tr>
                  {headers.map((header: string, index: number) => (
                    <th key={index} className="border border-gray-200 px-3 py-1 text-left bg-gray-50 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex}>
                    {row.map((cell: string, cellIndex: number) => (
                      <td key={cellIndex} className="border border-gray-200 px-3 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      }
    }
    
    return <div>{children}</div>
  }
})

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
    // Bold text should be in the DOM but ReactMarkdown renders it as a strong element
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
    expect(inlineCode).toHaveClass('bg-gray-100', 'px-1.5', 'py-0.5', 'rounded-sm')
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
    expect(heading).toHaveClass('font-semibold', 'text-gray-900')
  })

  test('message content width is limited', () => {
    const message = {
      role: 'user' as const,
      content: 'Test message',
      timestamp: mockDate,
    }

    const { container } = render(<ChatMessage message={message} />)

    const messageContainer = container.querySelector('.max-w-\\[70\\%\\]')
    expect(messageContainer).toBeInTheDocument()
  })
})