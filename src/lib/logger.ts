const isDevelopment = process.env.NODE_ENV === 'development'

type LogArgs = unknown[]

function formatArgs(args: LogArgs): LogArgs {
  if (isDevelopment) {
    return args
  }

  if (args.length === 0) {
    return []
  }

  const [first] = args
  if (typeof first === 'string') {
    return [first]
  }

  return ['[log suppressed]']
}

if (!isDevelopment) {
  const originalLog = console.log.bind(console)
  const originalWarn = console.warn.bind(console)
  const originalError = console.error.bind(console)

  console.log = (...args: LogArgs) => {
    const formatted = formatArgs(args)
    if (formatted.length > 0) {
      originalLog(...formatted)
    }
  }

  console.warn = (...args: LogArgs) => {
    const formatted = formatArgs(args)
    if (formatted.length > 0) {
      originalWarn(...formatted)
    }
  }

  console.error = (...args: LogArgs) => {
    const formatted = formatArgs(args)
    if (formatted.length > 0) {
      originalError(...formatted)
    }
  }
}

export const logger = {
  info: (...args: LogArgs) => {
    const formatted = formatArgs(args)
    if (formatted.length > 0) {
      console.log(...formatted)
    }
  },
  warn: (...args: LogArgs) => {
    const formatted = formatArgs(args)
    if (formatted.length > 0) {
      console.warn(...formatted)
    }
  },
  error: (...args: LogArgs) => {
    const formatted = formatArgs(args)
    if (formatted.length > 0) {
      console.error(...formatted)
    }
  },
}
