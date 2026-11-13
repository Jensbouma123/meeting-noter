import Network

extension FrameServer {
    final class Client {
        let connection: NWConnection
        var streaming = false
        var wantsMic = false
        var wantsSystem = true
        var stream: Stream { !wantsSystem ? .mic : wantsMic ? .mixed : .system }
        init(connection: NWConnection) {
            self.connection = connection
        }
    }
}
