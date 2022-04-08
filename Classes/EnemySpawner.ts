namespace EnemySpawner {
    let spawnTime: number = 1 * Game.frameRate;
    let currentTime: number = spawnTime;
    let maxEnemies: number = 20;

    export function spawnEnemies(): void {
        if (Game.enemies.length < maxEnemies) {
            // console.log(Game.enemies.length);
            if (currentTime == spawnTime) {
                const ref = Game.enemiesJSON.find(elem => elem.name == "bat");
                Game.graph.addChild(new Enemy.EnemyDumb("Enemy", new Player.Character(ref.name, new Player.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2))));
            }
            currentTime--;
            if (currentTime <= 0) {
                currentTime = spawnTime;
            }
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