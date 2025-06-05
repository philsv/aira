import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import remarkGfm from 'remark-gfm'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
        <style jsx>{`
        ul, ol {
          list-style-position: inside !important;
          margin: 0.5rem 0 !important;
          padding-left: 0 !important;
        }
        li {
          display: list-item !important;
          list-style-position: inside !important;
          margin: 0.25rem 0 !important;
          padding-left: 0 !important;
          line-height: 1.5 !important;
        }
        li strong {
          display: inline !important;
          vertical-align: baseline !important;
        }
        li::marker {
          color: rgba(255, 255, 255, 0.6) !important;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-white mb-2 border-b border-white/10 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-white/90 mb-2">
              {children}
            </h3>
          ),
          
          // Text formatting - ensure inline display for bold in lists
          strong: ({ children }) => (
            <strong className="font-semibold text-white inline">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/90 inline">
              {children}
            </em>
          ),
          
          // Lists with simpler styling
          ul: ({ children }) => (
            <ul className="my-2 text-white/80">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 text-white/80">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-white/80 leading-relaxed mb-1">
              {children}
            </li>
          ),
          
          // Code
          code: (props) => {
            const { children, className, node, ref, ...rest } = props
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            
            return isInline ? (
              <code className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ) : (
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  margin: '0.5rem 0',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          },
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-violet-400/50 pl-4 my-2 italic text-white/70 bg-white/5 py-2 rounded-r">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 underline transition-colors"
            >
              {children}
            </a>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border border-white/20 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/10">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-white border-b border-white/20">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-xs text-white/80 border-b border-white/10">
              {children}
            </td>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-white/80 leading-relaxed mb-2 last:mb-0">
              {children}
            </p>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-white/20 my-3" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}