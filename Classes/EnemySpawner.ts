namespace Enemy {
    export class EnemySpawner {
        spawnPositions: ƒ.Vector2[] = [];
        numberOfENemies: number;
        spawnOffset: number = 5;


        constructor(_roomSize: number, _numberOfEnemies: number) {
            this.numberOfENemies = _numberOfEnemies;
        }


        getSpawnPositions(_room: Generation.Room): ƒ.Vector2[] {
            return [new ƒ.Vector2(0 + this.spawnOffset, 0 + this.spawnOffset), new ƒ.Vector2(_room.getRoomSize() - this.spawnOffset, _room.getRoomSize() + this.spawnOffset)]
        }
    }
}