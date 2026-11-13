import Foundation
import Network

extension FrameServer {
    func accept(_ connection: NWConnection) {
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

    func receive(_ client: Client) {
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
                self.handleClientMessage(client, message)
            }
            self.receive(client)
        }
    }

    func handleClientMessage(_ client: Client, _ message: [String: Any]) {
        switch message["type"] as? String {
        case "start":
            if client.streaming { return }
            client.streaming = true
            client.wantsSystem = message["system"] as? Bool ?? true
            client.wantsMic = !client.wantsSystem || (message["mic"] as? Bool ?? false)
            onEvent?(.started(client))
        case "stop":
            if !client.streaming { return }
            client.streaming = false
            client.wantsMic = false
            client.wantsSystem = true
            onEvent?(.stopped(client))
        default:
            break
        }
    }
}
