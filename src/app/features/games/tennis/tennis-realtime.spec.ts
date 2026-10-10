import { ServerMessage, TennisRealtime } from './tennis-realtime';

class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }
  serverSays(message: ServerMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

describe('Tennis realtime socket', () => {
  const original = window.WebSocket;
  beforeEach(() => {
    FakeSocket.instances = [];
    (window as unknown as { WebSocket: unknown }).WebSocket = FakeSocket;
  });
  afterEach(() => {
    (window as unknown as { WebSocket: unknown }).WebSocket = original;
  });

  it('opens with a fresh ticket and resolves on the server acknowledgement', async () => {
    const received: ServerMessage[] = [];
    const statuses: string[] = [];
    const realtime = new TennisRealtime(
      async () => ({ ticket: 't1', realtimeUrl: '/api/tennis/realtime' }),
      (url, ticket) => `ws://host${url}?ticket=${ticket}`,
      (m) => received.push(m),
      (s) => statuses.push(s),
    );
    const connecting = realtime.connect();
    await Promise.resolve();
    await Promise.resolve();
    const socket = FakeSocket.instances[0];
    expect(socket.url).toBe('ws://host/api/tennis/realtime?ticket=t1');
    socket.readyState = FakeSocket.OPEN;
    socket.serverSays({ type: 'connected', playerId: 'p1' });
    await connecting;
    expect(realtime.playerId).toBe('p1');
    expect(statuses).toEqual(['connecting', 'open']);
    realtime.send({ type: 'room.subscribe', roomId: 'r' });
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'room.subscribe', roomId: 'r' });
    realtime.close();
    expect(statuses[statuses.length - 1]).toBe('closed');
  });

  it('rejects a refused ticket without retrying', async () => {
    const realtime = new TennisRealtime(
      async () => ({ ticket: 'bad', realtimeUrl: '/api/tennis/realtime' }),
      (url, ticket) => `${url}?${ticket}`,
      () => undefined,
      () => undefined,
    );
    const connecting = realtime.connect();
    await Promise.resolve();
    await Promise.resolve();
    FakeSocket.instances[0].onclose?.({ code: 4401 });
    await expectAsync(connecting).toBeRejectedWithError(/ticket expired/);
    expect(FakeSocket.instances.length).toBe(1);
  });
});
