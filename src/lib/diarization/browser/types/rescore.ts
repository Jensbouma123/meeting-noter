/** An embedding window: frames [start, end) of local channel `channel`. */
export interface RescoreWindow {
  channel: number;
  start: number;
  end: number;
}
