import Foundation

func printUsageAndExit() -> Never {
    print("""
    usage: meeting-noter-audio-helper [options]
      --port N              listen on 127.0.0.1:N (default \(defaultPort))
      --allow-origin URL    also accept this page origin (repeatable)
      --allow-any-origin    accept any origin, and clients without one (debugging only)
      --clock-from-output   clock the tap from the default output device
      --no-disclaim         keep the launching terminal responsible for permissions
      --verbose             log levels every 5 s
    """)
    exit(0)
}

func parseOptions() -> Options {
    var options = Options()
    var args = CommandLine.arguments.dropFirst().makeIterator()
    while let arg = args.next() {
        switch arg {
        case "--port":
            guard let value = args.next(), let port = UInt16(value) else { printUsageAndExit() }
            options.port = port
        case "--allow-origin":
            guard let value = args.next() else { printUsageAndExit() }
            options.extraOrigins.insert(value.lowercased())
        case "--allow-any-origin": options.anyOrigin = true
        case "--clock-from-output": options.clockFromOutput = true
        case "--no-disclaim": options.disclaim = false
        case "--verbose": options.verbose = true
        default: printUsageAndExit()
        }
    }
    return options
}
