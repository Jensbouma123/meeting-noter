import Foundation

func isLocalPageOrigin(_ origin: String) -> Bool {
    guard let url = URL(string: origin), let scheme = url.scheme, let host = url.host else { return false }
    return ["http", "https"].contains(scheme) && ["localhost", "127.0.0.1", "::1", "[::1]"].contains(host)
}
