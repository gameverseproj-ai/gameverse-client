import { signal } from '@angular/core';
import { TennisComponent } from './tennis.component';
import { TennisRealtime } from './tennis-realtime';

// Exercise two independent clients against the same room/ready protocol.
describe('Tennis invitation lifecycle', () => {
  const room = (joined = false) => ({ id: 'court', sport: 'tennis', status: 'waiting',
    serverStatus: joined ? 'ready' : 'waiting', matchId: joined ? 'match' : undefined,
    members: [{ id: 'host', username: 'Host' }, ...(joined ? [{ id: 'guest', username: 'Guest' }] : [])] });
  const setup = (id: string) => Object.assign(Object.create(TennisComponent.prototype), {
    api: { mock: false, realtimeTicket: async () => ({}), playerId: () => id },
    zone: { run: (fn: () => void) => fn() }, disposed: false,
    page: signal('friends'), room: signal<any>(null), sport: signal('tennis'), profile: signal(null),
    busy: signal(false), error: signal(''), invitations: signal([]), copied: signal(false),
    readySent: signal(false), opponentReady: signal(false), link: signal('open'),
    opponentName: signal(''), rewards: signal(null), onlineStatus: signal('connecting'),
    state: signal(null), keys: new Set(), wantsToPlay: false,
    realtime: { status: 'open', playerId: id, send: jasmine.createSpy('send') },
  });
  it('starts both clients after create and accept without a second Play click', async () => {
    const host = setup('host'), guest = setup('guest');
    host.api.createRoom = async () => room();
    guest.api.joinByInvite = async () => room(true);
    await host.openRoom(true);
    await guest.acceptInvitation({ id: 'invite', inviteUrl: '/tennis?invite=token' } as any);
    host.onRoomUpdated({ ...room(true), status: 'ready', players: [{id:'host',username:'Host'}, {id:'guest',username:'Guest'}] });
    for (const client of [host, guest]) {
      expect(client.realtime.send).toHaveBeenCalledWith({ type:'match.ready', matchId:'match' });
      expect(client.readySent()).toBeFalse(); // sending isn't acknowledgement
      client.onMessage({ type:'match.waiting', matchId:'match', readyPlayerId:client.me });
      expect(client.readySent()).toBeTrue();
      client.onMessage({ type:'match.started', roomId:'court', matchId:'match', sport:'tennis',
        players:[{id:'host',side:1,position:{x:0,z:10},stamina:100},
          {id:'guest',side:-1,position:{x:0,z:-10},stamina:100}] });
      expect(client.page()).toBe('online');
      expect(client.online.matchId).toBe('match');
    }
  });
  it('recovers a missed room update by polling', async () => {
    const client = setup('host');
    client.room.set(room()); client.wantsToPlay = true;
    client.api.getRoom = async () => room(true);
    await client.refreshLobby();
    expect(client.roomReady()).toBeTrue();
    expect(client.realtime.send).toHaveBeenCalledWith({type:'match.ready',matchId:'match'});
  });
  it('replays readiness after reconnect while waiting in the lobby', () => {
    const client = setup('host');
    client.room.set(room(true)); client.wantsToPlay = true;
    client.subscribedRoom = 'court'; client.readySent.set(true);
    client.onLink('reconnecting');
    expect(client.readySent()).toBeFalse();
    client.onLink('open');
    expect(client.realtime.send).toHaveBeenCalledWith({type:'room.subscribe',roomId:'court'});
    expect(client.realtime.send).toHaveBeenCalledWith({type:'match.ready',matchId:'match'});
  });
  it('ignores events from an old court and clears old opponent readiness', () => {
    const client = setup('host'); client.room.set(room(true));
    client.onMessage({type:'match.waiting',matchId:'old',readyPlayerId:'guest'});
    client.onMessage({type:'match.started',roomId:'old',matchId:'old'});
    expect(client.page()).toBe('friends'); expect(client.opponentReady()).toBeFalse();
    client.opponentReady.set(true);
    client.onRoomUpdated({...room(),players:[]});
    expect(client.opponentReady()).toBeFalse();
  });
  it('waits for a single connection when readiness races room subscription', async () => {
    const client = setup('host'); client.realtime = undefined;
    let acknowledge!: () => void;
    const connect = spyOn(TennisRealtime.prototype, 'connect').and.callFake(function(this: TennisRealtime) {
      return new Promise<void>(resolve => { acknowledge = () => { this.status = 'open'; resolve(); }; });
    });
    const first = client.ensureRealtime(), second = client.ensureRealtime();
    let resolved = false; void second.then(() => resolved = true);
    await Promise.resolve(); expect(resolved).toBeFalse();
    acknowledge();
    expect(await first).toBe(await second); expect(connect).toHaveBeenCalledTimes(1);
  });
  it('does not restore a court after cancellation while a refresh is in flight', async () => {
    const client = setup('host'); client.room.set(room());
    let resolve!: (value: any) => void;
    client.api.getRoom = () => new Promise(r => resolve = r);
    const refresh = client.refreshLobby(); await Promise.resolve();
    client.clearRoom(); resolve(room(true)); await refresh;
    expect(client.room()).toBeNull(); expect(client.realtime.send).not.toHaveBeenCalled();
  });
});
