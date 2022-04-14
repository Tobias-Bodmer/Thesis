namespace EnemySpawner {
    let spawnTime: number = 1 * Game.frameRate;
    let currentTime: number = spawnTime;
    let maxEnemies: number = 40;

    export function spawnEnemies(): void {
        if (Game.enemies.length < maxEnemies) {
            // console.log(Game.enemies.length);
            if (currentTime == spawnTime) {
                spawnByID(Enemy.ENEMYNAME.REDTICK, new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2)));
            }
            currentTime--;
            if (currentTime <= 0) {
                currentTime = spawnTime;
            }
        }
    }

    export function spawnByID(_id: Enemy.ENEMYNAME, _position: ƒ.Vector2, _attributes?: Entity.Attributes, _netID?: number) {
        let enemy: Enemy.Enemy;
        switch (_id) {
            case Enemy.ENEMYNAME.BAT:
                if (_attributes == null && _netID == null) {
                    const bat = Game.enemiesJSON.find(enemy => enemy.name == "bat");
                    enemy = new Enemy.EnemyDumb(Enemy.ENEMYNAME.BAT, new Entity.Attributes(bat.attributes.healthPoints, bat.attributes.attackPoints, bat.attributes.speed, Math.random() * 3 + 0.5), null, null);
                } else {
                    enemy = new Enemy.EnemyDumb(Enemy.ENEMYNAME.BAT, _attributes, _position, _netID);
                }
                break;
            case Enemy.ENEMYNAME.REDTICK:
                if (_attributes == null && _netID == null) {
                    const redtick = Game.enemiesJSON.find(enemy => enemy.name == "redtick");
                    enemy = new Enemy.EnemyDumb(Enemy.ENEMYNAME.REDTICK, new Entity.Attributes(redtick.attributes.healthPoints, redtick.attributes.attackPoints, redtick.attributes.speed, Math.random() * 3 + 0.5), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(Enemy.ENEMYNAME.REDTICK, _attributes, _position, _netID);
                }
                break;
            case Enemy.ENEMYNAME.SMALLTICK:
                break;
            case Enemy.ENEMYNAME.SKELETON:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
        }
    }

    export function networkSpawnById(_id: Enemy.ENEMYNAME, _position: ƒ.Vector2, _attributes: Entity.Attributes, _netID: number) {
        spawnByID(_id, _position, _attributes, _netID);
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