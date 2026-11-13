extension FrameServer {
    enum Event {
        case started(Client)
        case stopped(Client)
    }
}
