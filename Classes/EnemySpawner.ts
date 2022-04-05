namespace EnemySpawner {
    let spawnTime: number = 1 * Game.frameRate;
    let currentTime: number = spawnTime;

    export function spawnEnemies(): void {
        if (currentTime == spawnTime) {
            Game.graph.addChild(new Enemy.Enemy("Enemy", new Player.Character("bat", new Player.Attributes(10, 5, 2)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2))));
        }
        currentTime--;
        if (currentTime <= 0) {
            currentTime = spawnTime;
        }
    }



    export class EnemySpawnes {
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