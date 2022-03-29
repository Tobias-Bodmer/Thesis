namespace Generation {
    export enum ROOMTYPE {
        START,
        NORMAL,
        CHALLENGE,
        BOSS
    }

    export class Room {
        public roomType: ROOMTYPE
        public coordinates: [number, number]; // X Y
        exits: [boolean, boolean, boolean, boolean] // N E S W


        constructor(_coordiantes: [number, number], _exits: [boolean, boolean, boolean, boolean], _roomType: ROOMTYPE) {
            this.coordinates = _coordiantes;
            this.exits = _exits;
            this.roomType = _roomType;
        }
    }
}