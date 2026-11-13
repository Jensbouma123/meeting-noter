import Foundation
import Network

final class FrameServer {
    let queue = DispatchQueue(label: "meeting-noter.helper.server")
    var onEvent: ((Event) -> Void)?
    var hello: () -> [String: Any] = { [:] }

    private let port: UInt16
    private let allowOrigin: (String?) -> Bool
    private var listener: NWListener?
    var clients: [ObjectIdentifier: Client] = [:]

    var streamingCount: Int { clients.values.filter(\.streaming).count }
    var micCount: Int { clients.values.filter { $0.streaming && $0.wantsMic }.count }
    var tapCount: Int { clients.values.filter { $0.streaming && $0.wantsSystem }.count }
    var soloMicCount: Int { clients.values.filter { $0.streaming && $0.stream == .mic }.count }

    init(port: UInt16, allowOrigin: @escaping (String?) -> Bool) {
        self.port = port
        self.allowOrigin = allowOrigin
    }

    func start(onFailure: @escaping (Error) -> Void) throws {
        let ws = NWProtocolWebSocket.Options()
        ws.autoReplyPing = true
        ws.setClientRequestHandler(queue) { [weak self] _, headers in
            let origin = headers.first { $0.name.lowercased() == "origin" }?.value
            guard let self, self.allowOrigin(origin) else {
                log("rejected a connection from origin \(origin ?? "(none)")")
                return NWProtocolWebSocket.Response(status: .reject, subprotocol: nil, additionalHeaders: nil)
            }
            return NWProtocolWebSocket.Response(status: .accept, subprotocol: nil, additionalHeaders: nil)
        }
        let params = NWParameters.tcp
        params.defaultProtocolStack.applicationProtocols.insert(ws, at: 0)
        params.allowLocalEndpointReuse = true
        params.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: port)!)
        let listener = try NWListener(using: params)
        listener.stateUpdateHandler = { state in
            switch state {
            case .ready: log("listening on ws://127.0.0.1:\(self.port)")
            case .failed(let error): onFailure(error)
            default: break
            }
        }
        listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
        listener.start(queue: queue)
        self.listener = listener
    }
    func broadcast(_ frame: Data, stream: Stream) {
        queue.async {
            let meta = NWProtocolWebSocket.Metadata(opcode: .binary)
            let context = NWConnection.ContentContext(identifier: "frame", metadata: [meta])
            for client in self.clients.values where client.streaming && client.stream == stream {
                client.connection.send(content: frame, contentContext: context, isComplete: true, completion: .idempotent)
            }
        }
    }
    func send(_ client: Client, _ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message) else { return }
        let meta = NWProtocolWebSocket.Metadata(opcode: .text)
        let context = NWConnection.ContentContext(identifier: "json", metadata: [meta])
        client.connection.send(content: data, contentContext: context, isComplete: true, completion: .idempotent)
    }
    func sendToMicClients(_ message: [String: Any]) {
        for client in clients.values where client.streaming && client.wantsMic { send(client, message) }
    }
    func close(_ client: Client) {
        client.connection.cancel()
    }
}
