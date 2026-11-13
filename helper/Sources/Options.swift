import Foundation

struct Options {
    var port = defaultPort
    var extraOrigins: Set<String> = []
    var anyOrigin = false
    var clockFromOutput = false
    var disclaim = true
    var verbose = false
}
