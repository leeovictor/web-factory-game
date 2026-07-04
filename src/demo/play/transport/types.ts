export interface Packet {
  id: number;
  pos: number;
  amount: number;
}

export interface LineState {
  fromEntity: number;
  toEntity: number;
  length: number;
  capacity: number;
  velocity: number;
  packets: Packet[];
  relayBuffer: number;
}