import Foundation
import Network

/// A WebSocket server on 127.0.0.1 only, for the Meeting Noter page.
///
/// Protocol (version 1), all JSON text messages except the frames:
/// - on connect the helper sends `{"type":"hello", version, sampleRate,
///   format: "pcm16", frameSamples, permission}`;
/// - the page sends `{"type":"start"}`, or `{"type":"start","mic":true}`
///   for the default input device mixed in; the helper starts the tap (and
///   the mic) if not running yet and answers `{"type":"started", ...}` or
///   `{"type":"error", message}`. With `mic`, `started` carries `mic`:
///   `"live"`, `"unknown"` (the permission prompt is still up),
///   `"denied"` (no Microphone permission: system audio alone),
///   `"silent"` (open, but delivering only digital silence: macOS withholds
///   the permission, or the input is muted) or `"unavailable"` (no input
///   device; `micError` says why), and `micPermission`;
/// - from then on every binary message is one frame: `frameSamples` mono
///   Int16LE samples at `sampleRate` (100 ms at 16 kHz), of the system audio,
///   or of the system audio plus the mic for a client that asked for it;
/// - a mic client gets `{"type":"mic", mic, micError?, micPermission}`
///   whenever the mic's state changes (device unplugged, another default);
/// - `{"type":"stop"}` or closing the socket ends that client's stream.
///
/// A page that only probes connects, reads the hello and closes, so a probe
/// never starts the tap (and never shows the recording indicator).
///
/// The handshake's `Origin` must be one `allowOrigin` accepts: any web page
/// can open a socket to 127.0.0.1, and only this app's may hear the Mac.
final class FrameServer {
    enum Event {
        case started(Client)
        case stopped(Client)
    }

    final class Client {
        let connection: NWConnection
        var streaming = false
        var wantsMic = false
        init(connection: NWConnection) {
            self.connection = connection
        }
    }

    let queue = DispatchQueue(label: "meeting-noter.helper.server")
    var onEvent: ((Event) -> Void)?
    var hello: () -> [String: Any] = { [:] }

    private let port: UInt16
    private let allowOrigin: (String?) -> Bool
    private var listener: NWListener?
    private var clients: [ObjectIdentifier: Client] = [:]

    var streamingCount: Int { clients.values.filter(\.streaming).count }
    var micCount: Int { clients.values.filter { $0.streaming && $0.wantsMic }.count }

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

    /// Sends one frame to every client that asked to stream, with or without
    /// the mic as `mixed` says. Any queue.
    func broadcast(_ frame: Data, mixed: Bool) {
        queue.async {
            let meta = NWProtocolWebSocket.Metadata(opcode: .binary)
            let context = NWConnection.ContentContext(identifier: "frame", metadata: [meta])
            for client in self.clients.values where client.streaming && client.wantsMic == mixed {
                client.connection.send(content: frame, contentContext: context, isComplete: true, completion: .idempotent)
            }
        }
    }

    /// Sends a JSON message to one client. On `queue`.
    func send(_ client: Client, _ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message) else { return }
        let meta = NWProtocolWebSocket.Metadata(opcode: .text)
        let context = NWConnection.ContentContext(identifier: "json", metadata: [meta])
        client.connection.send(content: data, contentContext: context, isComplete: true, completion: .idempotent)
    }

    /// Sends a JSON message to every client streaming with the mic. On `queue`.
    func sendToMicClients(_ message: [String: Any]) {
        for client in clients.values where client.streaming && client.wantsMic { send(client, message) }
    }

    /// Ends one client's stream and closes its socket. On `queue`.
    func close(_ client: Client) {
        client.connection.cancel()
    }

    private func accept(_ connection: NWConnection) {
        let client = Client(connection: connection)
        let id = ObjectIdentifier(client)
        connection.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            switch state {
            case .ready:
                self.clients[id] = client
                self.send(client, self.hello())
                self.receive(client)
            case .failed, .cancelled:
                if let gone = self.clients.removeValue(forKey: id), gone.streaming {
                    gone.streaming = false
                    self.onEvent?(.stopped(gone))
                }
            default:
                break
            }
        }
        connection.start(queue: queue)
    }

    private func receive(_ client: Client) {
        client.connection.receiveMessage { [weak self] content, context, _, error in
            guard let self else { return }
            if error != nil {
                client.connection.cancel()
                return
            }
            let meta = context?.protocolMetadata(definition: NWProtocolWebSocket.definition) as? NWProtocolWebSocket.Metadata
            if meta?.opcode == .close {
                client.connection.cancel()
                return
            }
            if meta?.opcode == .text, let content,
               let message = try? JSONSerialization.jsonObject(with: content) as? [String: Any] {
                self.handle(client, message)
            }
            self.receive(client)
        }
    }

    private func handle(_ client: Client, _ message: [String: Any]) {
        switch message["type"] as? String {
        case "start":
            if client.streaming { return }
            client.streaming = true
            client.wantsMic = message["mic"] as? Bool ?? false
            onEvent?(.started(client))
        case "stop":
            if !client.streaming { return }
            client.streaming = false
            client.wantsMic = false
            onEvent?(.stopped(client))
        default:
            break
        }
    }
}
