export interface PostedMessage {
  type: string;
  id: string;
  code?: string;
  message?: string;
}

export async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}
